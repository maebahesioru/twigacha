"use client";
import { useState, useEffect, useRef } from "react";
import TcgCard from "@/components/TcgCard";
import type { TwitterCard } from "@/types";
import { KYU_CONFIG, generateEnemy, simulateBattle, type Kyu } from "@/lib/battle";
import { useGameStore } from "@/store/useGameStore";
import { sanitizeTeamCards } from "@/lib/card";
import { TeamOnlineView } from "./OnlineViews";
import type { Translations } from "@/lib/i18n";
import Confetti from "@/components/Confetti";
import { playAttack, playVictory, playDefeat } from "@/lib/audio";

type BattleSort = "pulledAt"|"rarity"|"name"|"id"|"atk"|"def"|"spd"|"hp"|"int"|"luk";
type TeamView = "top"|"select"|"kyu"|"battle"|"result"|"online";
type PrecomputedRound = { winner: string; pHp: number; eHp: number; turns: number; ko: boolean; log: string[]; hpSnaps: { pHp: number; eHp: number }[] };

const RARITY_ORDER = ["LR","UR","SSR","SR","R","N","C"];

function sortCards(cards: TwitterCard[], battleSort: BattleSort) {
  return [...cards].sort((a, b) => {
    if (battleSort === "rarity") return RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
    if (battleSort === "name") return a.displayName.localeCompare(b.displayName);
    if (battleSort === "id") return a.username.localeCompare(b.username);
    if (battleSort === "pulledAt") return b.pulledAt - a.pulledAt;
    return (b[battleSort] as number) - (a[battleSort] as number);
  });
}

async function deriveKey(pass: string, salt: Uint8Array) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: salt.buffer as ArrayBuffer, iterations: 100000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function encryptTeam(data: string, pass: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pass, salt);
  const enc = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(data));
  const buf = new Uint8Array(salt.length + iv.length + enc.byteLength);
  buf.set(salt, 0); buf.set(iv, 16); buf.set(new Uint8Array(enc), 28);
  return btoa(String.fromCharCode(...buf));
}
async function decryptTeam(b64: string, pass: string) {
  const buf = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const salt = buf.slice(0, 16), iv = buf.slice(16, 28), data = buf.slice(28);
  const key = await deriveKey(pass, salt);
  const dec = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(dec);
}

const Header = ({ title, back, backLabel }: { title: string; back: () => void; backLabel: string }) => (
  <div className="flex items-center gap-4 w-full max-w-2xl mb-2">
    <button onClick={back} className="text-gray-400 hover:text-white transition text-sm">{backLabel}</button>
    <h1 className="text-2xl font-black bg-gradient-to-r from-green-400 to-teal-400 bg-clip-text text-transparent">{title}</h1>
  </div>
);

export function TeamBattleView({ collection, teamBattleHistory, addTeamBattleResult, addBattleResult, onBack, t, battleSpeed, setBattleSpeed, battleSort, setBattleSort, savedTeam, setSavedTeam, savedDecks, savedeck, deleteDeck }: {
  collection: TwitterCard[];
  teamBattleHistory: { date: string; myTeam: string[]; enemyTeam: string[]; wins: number; losses: number; result: "win"|"lose"|"draw"; opponentName?: string }[];
  addTeamBattleResult: (r: { date: string; myTeam: string[]; enemyTeam: string[]; wins: number; losses: number; result: "win"|"lose"|"draw"; opponentName?: string; kyu?: string }) => void;
  addBattleResult: (r: { winner: 'player'|'enemy'; turns: number; kyu: string; playerCardId: string; pHp?: number; ko?: boolean; playerCardRarity?: string; mode?: string }) => void;
  onBack: () => void;
  t: Translations;
  battleSpeed: number;
  setBattleSpeed: (n: number) => void;
  battleSort: BattleSort;
  setBattleSort: (s: BattleSort) => void;
  savedTeam: string[];
  setSavedTeam: (ids: string[]) => void;
  savedDecks: { name: string; ids: string[] }[];
  savedeck: (name: string, ids: string[]) => void;
  deleteDeck: (name: string) => void;
}) {
  const [myTeam, setMyTeamRaw] = useState<TwitterCard[]>(() =>
    savedTeam.map(id => collection.find(c => c.id === id)).filter(Boolean) as TwitterCard[]
  );
  const setMyTeam = (team: TwitterCard[]) => { setMyTeamRaw(team); setSavedTeam(team.map(c => c.id)); };
  const [enemyTeamDisplay, setEnemyTeamDisplay] = useState<TwitterCard[]>([]);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [roundResults, setRoundResults] = useState<{ p: TwitterCard; e: TwitterCard; win: boolean; pHp: number; eHp: number; turns: number; ko: boolean }[]>([]);
  const [currentRound, setCurrentRound] = useState<{ p: TwitterCard; e: TwitterCard; pHp: number; eHp: number } | null>(null);
  const [battleResult, setBattleResult] = useState<{ wins: number; losses: number; result: "win"|"lose"|"draw"; enemyTeam: TwitterCard[] } | null>(null);
  const [running, setRunning] = useState(false);
  const [search, setSearch] = useState("");
  const [teamKyu, setTeamKyu] = useState<Kyu | "MIX" | null>(null);
  const [teamView, setTeamView] = useState<TeamView>("top");
  const [onlineNames, setOnlineNames] = useState<{ my: string; opponent: string } | null>(null);
  const battleSpeedRef = useRef(battleSpeed);
  useEffect(() => { battleSpeedRef.current = battleSpeed; }, [battleSpeed]);
  const runningRef = useRef(false);

  const toggle = (card: TwitterCard) => {
    if (myTeam.find(c => c.id === card.id)) setMyTeam(myTeam.filter(c => c.id !== card.id));
    else if (myTeam.length < 5) setMyTeam([...myTeam, card]);
  };

  const runTeamBattle = async (enemyTeam: TwitterCard[], rounds5 = 5, precomputed?: PrecomputedRound[]) => {
    if (runningRef.current) return;
    const n = Math.min(myTeam.length, enemyTeam.length, rounds5);
    runningRef.current = true;
    setRunning(true); setBattleLog([]); setBattleResult(null); setEnemyTeamDisplay(enemyTeam); setRoundResults([]); setCurrentRound(null);
    setTeamView("battle");
    const logs: string[] = [];
    const rounds: { p: TwitterCard; e: TwitterCard; win: boolean; pHp: number; eHp: number; turns: number; ko: boolean }[] = [];
    let wins = 0, losses = 0;
    for (let i = 0; i < n; i++) {
      const p = myTeam[i], e = enemyTeam[i];
      setCurrentRound({ p, e, pHp: p.hp, eHp: e.hp });
      await new Promise(r => setTimeout(r, battleSpeedRef.current * 0.5));
      const { winner, pHp, eHp, turns, ko, hpSnaps, log: turnLog } = precomputed ? precomputed[i] : simulateBattle(p, e, useGameStore.getState().lang);
      logs.push(`━━ ${t.battle.team.round(i + 1)}: ${p.displayName} vs ${e.displayName} ━━`);
      setBattleLog([...logs]);
      for (let s = 0; s < hpSnaps.length; s++) {
        setCurrentRound({ p, e, pHp: hpSnaps[s].pHp, eHp: hpSnaps[s].eHp });
        if (s % 2 === 0) playAttack();
        if (turnLog[s] && s < hpSnaps.length - 1) { logs.push(turnLog[s]); setBattleLog([...logs]); }
        await new Promise(r => setTimeout(r, battleSpeedRef.current));
      }
      const win = winner === "player";
      if (win) wins++; else losses++;
      rounds.push({ p, e, win, pHp, eHp, turns, ko });
      setRoundResults([...rounds]);
      logs.push(win ? t.battle.team.roundWin(p.displayName) : t.battle.team.roundLose(e.displayName));
      setBattleLog([...logs]);
      await new Promise(r => setTimeout(r, battleSpeedRef.current));
    }
    setCurrentRound(null);
    const result: "win"|"lose"|"draw" = wins > losses ? "win" : wins < losses ? "lose" : "draw";
    setBattleResult({ wins, losses, result, enemyTeam });
    result === "win" ? playVictory() : result === "lose" ? playDefeat() : null;
    addTeamBattleResult({ date: new Date().toLocaleDateString(), myTeam: myTeam.map(c => c.id), enemyTeam: enemyTeam.map(c => c.id), wins, losses, result, opponentName: onlineNames?.opponent, kyu: teamKyu ?? undefined });
    // カードランキングに各カードの結果を送信
    rounds.forEach(r => {
      fetch('/api/ranking', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ card_id: r.p.id, username: r.p.username, display_name: r.p.displayName, avatar: r.p.avatar, rarity: r.p.rarity, atk: r.p.atk, element: r.p.element, won: r.win, ko_win: r.win && r.ko, ultimate_count: 0 }) }).catch(() => {});
    });
    // 連勝ボーナス用に個人戦履歴にも記録（mode:'team'）
    if (!onlineNames) {
      const winner = result === 'win' ? 'player' : result === 'lose' ? 'enemy' : null;
      if (winner) addBattleResult({ winner, turns: 0, kyu: teamKyu ?? 'C', playerCardId: myTeam[0]?.id ?? '', playerCardRarity: myTeam[0]?.rarity, mode: 'team' });
    }
    setRunning(false);
    runningRef.current = false;
    setTeamView("result");
  };

  const startRandom = async () => {
    if (myTeam.length !== 5 || !teamKyu || runningRef.current) return;
    const scale = (base: TwitterCard, kyu: Kyu): TwitterCard => {
      const { min, max } = KYU_CONFIG[kyu];
      const target = Math.round((min + max) / 2) * 6;
      const total = base.atk + base.def + base.spd + base.hp + base.int + base.luk;
      const ratio = target / Math.max(total, 1);
      return { ...base, rarity: kyu, atk: Math.round(base.atk*ratio), def: Math.round(base.def*ratio), spd: Math.round(base.spd*ratio), hp: Math.round(base.hp*ratio), int: Math.round(base.int*ratio), luk: Math.round(base.luk*ratio) };
    };
    const mixRarities: Kyu[] = ["R","SR","SSR","UR","LR"];
    const kyuList: Kyu[] = teamKyu === "MIX" ? mixRarities : Array(5).fill(teamKyu as Kyu);
    let enemy: TwitterCard[];
    try {
      const res = await fetch("/api/gacha?count=20");
      const data: TwitterCard[] = (await res.json()).filter((c: TwitterCard & { error?: string }) => c && !c.error);
      const used = new Set<string>();
      enemy = kyuList.map((kyu, i) => {
        const exact = data.find(c => c.rarity === kyu && !used.has(c.id));
        if (exact) { used.add(exact.id); return exact; }
        const fallback = data.find(c => !used.has(c.id));
        if (fallback) { used.add(fallback.id); return scale(fallback, kyu); }
        return { ...generateEnemy(kyu), id: `enemy_${Date.now()}_${i}` };
      });
    } catch {
      enemy = kyuList.map((kyu, i) => ({ ...generateEnemy(kyu), id: `enemy_${Date.now()}_${i}` }));
    }
    await runTeamBattle(enemy);
  };

  const exportTeam = async () => {
    const pass = prompt(t.battle.team.passphraseExport);
    if (!pass || pass.length < 8) { alert(t.battle.passphraseMin); return; }
    if (pass !== prompt(t.battle.passphraseConfirm)) { alert(t.battle.passphraseMismatch); return; }
    const encrypted = await encryptTeam(JSON.stringify(myTeam), pass);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([encrypted], { type: "application/octet-stream" }));
    a.download = "team.wgteam"; a.click(); URL.revokeObjectURL(a.href);
  };

  const importAndBattle = async () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".wgteam";
    input.onchange = async () => {
      const file = input.files?.[0]; if (!file) return;
      const text = await file.text();
      const pass = prompt(t.battle.team.passphraseImport); if (!pass) return;
      try {
        const enemy: TwitterCard[] = sanitizeTeamCards(JSON.parse(await decryptTeam(text.trim(), pass)));
        if (enemy.length !== 5) { alert("Invalid team data"); return; }
        if (myTeam.length !== 5) { alert(t.battle.team.selectFive); return; }
        await runTeamBattle(enemy);
      } catch { alert(t.battle.decryptFailed); }
    };
    input.click();
  };

  const filtered = sortCards(collection.filter(c => !search || c.displayName.includes(search) || c.username.includes(search)), battleSort);
  const total = teamBattleHistory.length;
  const tbWins = teamBattleHistory.filter(h => h.result === "win").length;
  const tbLosses = teamBattleHistory.filter(h => h.result === "lose").length;
  const winRate = total > 0 ? (tbWins / total * 100).toFixed(1) : "0.0";

  if (teamView === "top") return (
    <div className="min-h-dvh bg-gray-950 text-white py-10 px-4 flex flex-col items-center gap-6 slide-in-up">
      <Header title={t.battle.team.top} back={onBack} backLabel={t.battle.back} />
      <div className="w-full max-w-2xl flex flex-col gap-3">
        <button onClick={() => setTeamView("select")} className="py-4 bg-gradient-to-r from-green-600 to-teal-600 rounded-2xl font-bold text-lg hover:opacity-90 transition text-left px-5">
          <div>{t.battle.team.build}</div><div className="text-xs text-green-100 font-normal opacity-90 mt-1">{t.battle.team.buildHint}</div>
        </button>
        <button onClick={() => setTeamView(myTeam.length === 5 ? "kyu" : "select")} className="py-4 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl font-bold text-lg hover:opacity-90 transition text-left px-5">
          <div>{t.battle.team.random}</div><div className="text-xs text-red-100 font-normal opacity-90 mt-1">{myTeam.length === 5 ? t.battle.team.teamBuilt(myTeam.map(c=>c.displayName).join(", ").slice(0,40)) : t.battle.team.teamNotBuilt}</div>
        </button>
        <button onClick={importAndBattle} className="py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl font-bold text-lg hover:opacity-90 transition text-left px-5">
          <div>{t.battle.team.importEnemy}</div><div className="text-xs text-purple-100 font-normal opacity-90 mt-1">{t.battle.team.importEnemyDesc}</div>
        </button>
        <button onClick={() => setTeamView("online")} disabled={myTeam.length !== 5} className="py-4 bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl font-bold text-lg hover:opacity-90 disabled:opacity-40 transition text-left px-5">
          <div>{t.battle.online}</div><div className="text-xs text-violet-100 font-normal opacity-90 mt-1">{myTeam.length === 5 ? t.battle.onlineDesc : t.battle.team.teamNotBuilt5}</div>
        </button>
        <button onClick={exportTeam} disabled={myTeam.length !== 5} className="py-4 bg-gray-700 rounded-2xl font-bold text-lg hover:bg-gray-600 disabled:opacity-40 transition text-left px-5">
          <div>{t.battle.team.export}</div><div className="text-xs text-gray-400 font-normal mt-1">{t.battle.team.exportDesc}</div>
        </button>
      </div>
      <div className="w-full max-w-2xl space-y-4">
        <h2 className="text-lg font-bold text-gray-300">📊 {t.battle.team.stats}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          {[[t.battle.totalBattles, total],[t.battle.winRate, `${winRate}%`],[t.battle.wins, tbWins],[t.battle.losses, tbLosses]].map(([label, val]) => (
            <div key={label as string} className="bg-gray-800 rounded-xl p-3"><div className="text-xs text-gray-400 mb-1">{label}</div><div className="text-xl font-bold">{val}</div></div>
          ))}
        </div>
        <h2 className="text-lg font-bold text-gray-300">{t.battle.team.history}</h2>
        {teamBattleHistory.length === 0 ? <p className="text-gray-500 text-sm">{t.battle.team.noHistory}</p> : (
          <div className="space-y-2">
            {[...teamBattleHistory].reverse().slice(0, 10).map((h, i) => (
              <div key={i} className="flex justify-between items-center bg-gray-800/60 rounded-xl px-4 py-2 text-sm">
                <span className="text-gray-400">{h.opponentName ? `vs ${h.opponentName}` : h.date}</span>
                <span className={`font-bold ${h.result === "win" ? "text-yellow-400" : h.result === "lose" ? "text-red-400" : "text-gray-400"}`}>
                  {h.result === "win" ? t.battle.team.win : h.result === "lose" ? t.battle.team.lose : t.battle.team.draw}
                </span>
                <span className="text-gray-300">{t.battle.team.result(h.wins, h.losses)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (teamView === "select") return (
    <div className="min-h-dvh bg-gray-950 text-white py-10 px-4 flex flex-col items-center gap-6 slide-in-up">
      <Header title={t.battle.team.build} back={() => setTeamView("top")} backLabel={t.battle.team.top} />
      <div className="w-full max-w-2xl bg-gray-800/60 rounded-2xl p-4 border border-green-500/30">
        <div className="font-bold text-gray-300 mb-2">{t.battle.team.build} <span className="text-gray-500 text-sm">({myTeam.length}/5)</span></div>
        <p className="text-xs text-gray-500 mb-3">{t.battle.team.buildHint}</p>
        <div className="flex gap-2 flex-wrap mb-4">
          {myTeam.map((c, i) => (
            <div key={c.id} className="relative flex flex-col items-center gap-1">
              <div className="flex gap-1">
                <button onClick={() => { if (i === 0) return; const tm = [...myTeam]; [tm[i-1], tm[i]] = [tm[i], tm[i-1]]; setMyTeam(tm); }} disabled={i === 0} className="text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-20 rounded px-1">↑</button>
                <button onClick={() => { if (i === myTeam.length-1) return; const tm = [...myTeam]; [tm[i], tm[i+1]] = [tm[i+1], tm[i]]; setMyTeam(tm); }} disabled={i === myTeam.length-1} className="text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-20 rounded px-1">↓</button>
              </div>
              <div className="relative cursor-pointer" onClick={() => toggle(c)}>
                <div style={{ pointerEvents: "none" }}><TcgCard card={c} size="sm" /></div>
                <div className="absolute -top-1 -left-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-black">{i+1}</div>
              </div>
            </div>
          ))}
          {Array.from({ length: 5 - myTeam.length }).map((_, i) => (
            <div key={i} className="w-32 h-56 bg-gray-700/40 rounded-xl border-2 border-dashed border-gray-600 flex items-center justify-center text-gray-600 text-2xl">{i + myTeam.length + 1}</div>
          ))}
        </div>
        <button onClick={() => setTeamView("top")} disabled={myTeam.length !== 5} className="w-full py-3 bg-gradient-to-r from-green-600 to-teal-600 rounded-xl font-bold hover:opacity-90 disabled:opacity-40 transition">
          {myTeam.length === 5 ? t.battle.team.buildDone : t.battle.team.buildRemain(5 - myTeam.length)}
        </button>
        {/* デッキ保存・読み込み */}
        <div className="mt-3 border-t border-gray-700 pt-3">
          <div className="flex gap-2 mb-2">
            <input id="deck-name-input" placeholder={t.battle.team.deckNamePlaceholder} className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-green-500" />
            <button onClick={() => {
              const name = (document.getElementById('deck-name-input') as HTMLInputElement).value.trim();
              if (!name || myTeam.length !== 5) return;
              savedeck(name, myTeam.map(c => c.id));
              (document.getElementById('deck-name-input') as HTMLInputElement).value = '';
            }} disabled={myTeam.length !== 5} className="px-3 py-1.5 bg-green-600 rounded-lg text-sm font-bold hover:bg-green-500 disabled:opacity-40 transition">{t.battle.team.deckSave}</button>
          </div>
          {savedDecks.length > 0 && (
            <div className="flex flex-col gap-1">
              {savedDecks.map(d => (
                <div key={d.name} className="flex items-center gap-2 bg-gray-900 rounded-lg px-3 py-1.5">
                  <span className="flex-1 text-sm text-gray-300 truncate">{d.name}</span>
                  <button onClick={() => setMyTeam(d.ids.map(id => collection.find(c => c.id === id)).filter(Boolean) as TwitterCard[])}
                    className="text-xs px-2 py-1 bg-blue-600 rounded hover:bg-blue-500 transition">{t.battle.team.deckLoad}</button>
                  <button onClick={() => deleteDeck(d.name)}
                    className="text-xs px-2 py-1 bg-red-800 rounded hover:bg-red-700 transition">{t.battle.team.deckDelete}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="w-full max-w-4xl">
        <div className="flex gap-2 justify-center mb-4 flex-wrap">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.collection.search} className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-green-500" />
          <select aria-label={t.battle.team.sortAriaLabel} value={battleSort} onChange={e => setBattleSort(e.target.value as BattleSort)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500">
            {(t.battle.team.sortLabels as [string,string][]).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          {filtered.map(card => {
            const idx = myTeam.findIndex(c => c.id === card.id);
            return (
              <div key={card.id} onClick={() => toggle(card)} className={`cursor-pointer transition hover:scale-105 rounded-xl relative ${idx !== -1 ? "ring-4 ring-green-500 scale-105" : ""}`}>
                <div style={{ pointerEvents: "none" }}><TcgCard card={card} size="sm" /></div>
                {idx !== -1 && <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-black">{idx+1}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (teamView === "kyu") return (
    <div className="min-h-dvh bg-gray-950 text-white py-10 px-4 flex flex-col items-center gap-6 slide-in-up">
      <Header title={t.battle.team.kyuSelect} back={() => setTeamView("select")} backLabel={t.battle.back} />
      <div className="w-full max-w-2xl">
        <div className="flex gap-2 flex-wrap mb-6 justify-center">
          {myTeam.map((c, i) => (
            <div key={c.id} className="relative">
              <div style={{ pointerEvents: "none" }}><TcgCard card={c} size="sm" /></div>
              <div className="absolute -top-1 -left-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-black">{i+1}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 justify-center mb-6">
          {(t.battle.team.kyuLabels as [string,string][]).map(([k, label]) => (
            <button key={k} onClick={() => setTeamKyu(k as Kyu | "MIX")} className={`px-3 py-2 sm:px-5 sm:py-3 text-sm sm:text-base rounded-xl font-bold transition ${teamKyu === k ? "bg-green-500 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>{label}</button>
          ))}
        </div>
        {teamKyu === "MIX" && <p className="text-center text-xs text-gray-500 mb-4">{t.battle.team.mixHint}</p>}
        <div className="flex items-center gap-3 text-sm justify-center mb-6">
          <span className="text-gray-400">{t.battle.speed}</span>
          <span className="text-xs text-gray-500">{t.battle.slow}</span>
          <input type="range" aria-label={t.battle.speedAriaLabel} min={100} max={1200} step={100} value={1300 - battleSpeed} onChange={e => setBattleSpeed(1300 - Number(e.target.value))} className="w-32 accent-green-500" />
          <span className="text-xs text-gray-500">{t.battle.fast}</span>
        </div>
        <button onClick={startRandom} disabled={!teamKyu || running} className="w-full py-4 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl font-bold text-xl hover:opacity-90 disabled:opacity-40 transition">{t.battle.team.startRandom}</button>
      </div>
    </div>
  );

  if (teamView === "battle") return (
    <div className="min-h-dvh bg-gray-950 text-white py-10 px-4 flex flex-col items-center gap-6 slide-in-up">
      <h1 className="text-2xl font-black bg-gradient-to-r from-green-400 to-teal-400 bg-clip-text text-transparent">{t.battle.team.title}</h1>
      <div className="flex gap-4 w-full max-w-4xl justify-center flex-wrap">
        <div className="bg-gray-800/60 rounded-2xl p-3 border border-blue-500/30">
          <div className="text-xs text-blue-400 font-bold mb-2 text-center">{t.battle.team.myTeam(onlineNames?.my)}</div>
          <div className="flex gap-2 flex-wrap justify-center">
            {myTeam.map((c, i) => (
              <div key={`my-${i}`} className="relative">
                <div style={{ pointerEvents: "none" }}><TcgCard card={c} size="sm" /></div>
                <div className="absolute -top-1 -left-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-black">{i+1}</div>
              </div>
            ))}
          </div>
        </div>
        {enemyTeamDisplay.length > 0 && (
          <div className="bg-gray-800/60 rounded-2xl p-3 border border-red-500/30">
            <div className="text-xs text-red-400 font-bold mb-2 text-center">{t.battle.team.enemyTeam(onlineNames?.opponent)}</div>
            <div className="flex gap-2 flex-wrap justify-center">
              {enemyTeamDisplay.map((c, i) => (
                <div key={`enemy-${i}`} className="relative">
                  <div style={{ pointerEvents: "none" }}><TcgCard card={c} size="sm" /></div>
                  <div className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-black">{i+1}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {currentRound && (
        <div className="w-full max-w-2xl bg-gray-900 rounded-xl p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="text-xs text-blue-400 font-bold mb-1 truncate">{currentRound.p.displayName}</div>
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${Math.max(0, currentRound.pHp / currentRound.p.hp * 100)}%` }} /></div>
              <div className="text-xs text-gray-400 mt-0.5">{currentRound.pHp} / {currentRound.p.hp}</div>
            </div>
            <div className="text-gray-500 font-black">VS</div>
            <div className="flex-1">
              <div className="text-xs text-red-400 font-bold mb-1 truncate text-right">{currentRound.e.displayName}</div>
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden"><div className="h-full bg-red-500 rounded-full transition-all duration-500 ml-auto" style={{ width: `${Math.max(0, currentRound.eHp / currentRound.e.hp * 100)}%` }} /></div>
              <div className="text-xs text-gray-400 mt-0.5 text-right">{currentRound.eHp} / {currentRound.e.hp}</div>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center gap-3 text-sm justify-center">
        <span className="text-gray-400">{t.battle.speed}</span>
        <span className="text-xs text-gray-500">{t.battle.slow}</span>
        <input type="range" aria-label={t.battle.speedAriaLabel} min={100} max={1200} step={100} value={1300 - battleSpeed} onChange={e => setBattleSpeed(1300 - Number(e.target.value))} className="w-32 accent-green-500" />
        <span className="text-xs text-gray-500">{t.battle.fast}</span>
      </div>
      <div className="max-w-2xl w-full bg-gray-900 rounded-xl p-4 space-y-1 max-h-64 overflow-y-auto overscroll-contain">
        {battleLog.map((l, i) => (
          <div key={i} style={{ animationDelay: `${i * 25}ms` }} className={`text-sm slide-in-up ${l.startsWith("━━") ? "text-orange-400 font-bold" : l.includes("🏆") ? "text-yellow-400 font-bold" : l.includes("💀") ? "text-red-400 font-bold" : l.includes("💥") ? "text-pink-400" : l.includes("🔺") ? "text-green-400" : "text-gray-300"}`}>{l}</div>
        ))}
        {running && <div className="text-gray-500 animate-pulse text-sm">...</div>}
      </div>
    </div>
  );

  if (teamView === "online") return (
    <TeamOnlineView myTeam={myTeam} onBack={() => setTeamView("top")} onResult={(res, hostTeam, guestTeam, isHost, myName, opponentName) => {
      const enemyTeam = isHost ? guestTeam : hostTeam;
      const precomputed = res.rounds.map(r =>
        isHost ? r : { ...r, winner: r.winner === "player" ? "enemy" : "player", pHp: r.eHp, eHp: r.pHp, hpSnaps: r.hpSnaps.map(s => ({ pHp: s.eHp, eHp: s.pHp })) }
      );
      setOnlineNames({ my: myName, opponent: opponentName });
      runTeamBattle(enemyTeam, 5, precomputed);
    }} t={t} />
  );

  if (teamView === "result" && battleResult) return (
    <>
    {battleResult.result === "win" && <Confetti />}
    <div className="min-h-dvh bg-gray-950 text-white py-10 px-4 flex flex-col items-center gap-6 slide-in-up">
      <div className={`text-3xl sm:text-5xl font-black ${battleResult.result === "win" ? "text-yellow-400" : battleResult.result === "lose" ? "text-red-400" : "text-gray-400"}`}>
        {battleResult.result === "win" ? `🏆 ${t.battle.team.win}！` : battleResult.result === "lose" ? `💀 ${t.battle.team.lose}` : `🤝 ${t.battle.team.draw}`}
      </div>
      {onlineNames?.opponent && <div className="text-gray-400 text-sm">vs {onlineNames.opponent}</div>}
      <div className="text-xl font-bold text-gray-300">{t.battle.team.result(battleResult.wins, battleResult.losses)}</div>
      {battleLog.length > 0 && (
        <div className="max-w-2xl w-full bg-gray-900 rounded-xl p-4 space-y-1 max-h-48 overflow-y-auto overscroll-contain">
          {battleLog.map((l, i) => (
            <div key={i} style={{ animationDelay: `${i * 25}ms` }} className={`text-sm slide-in-up ${l.startsWith("━━") ? "text-orange-400 font-bold" : l.includes("🏆") ? "text-yellow-400 font-bold" : l.includes("💀") ? "text-red-400 font-bold" : l.includes("💥") ? "text-pink-400" : l.includes("🔺") ? "text-green-400" : "text-gray-300"}`}>{l}</div>
          ))}
        </div>
      )}
      <div className="w-full max-w-2xl space-y-2">
        {roundResults.map((r, i) => (
          <div key={i} className={`bg-gray-800/80 rounded-xl p-3 border-l-4 ${r.win ? "border-green-500" : "border-red-500"}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-400">{t.battle.team.round(i + 1)}</span>
              <span className={`text-xs font-bold ${r.win ? "text-green-400" : "text-red-400"}`}>{r.win ? t.battle.team.win : t.battle.team.lose}{r.ko ? " KO" : ""} ({r.turns}T)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <div className="text-xs text-blue-400 truncate mb-1">{r.p.displayName}</div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden"><div className={`h-full rounded-full ${r.win ? "bg-blue-500" : "bg-gray-500"}`} style={{ width: `${Math.max(0, r.pHp / r.p.hp * 100)}%` }} /></div>
                <div className="text-xs text-gray-500">{r.pHp}/{r.p.hp}</div>
              </div>
              <span className="text-gray-600 text-xs">vs</span>
              <div className="flex-1">
                <div className="text-xs text-red-400 truncate mb-1 text-right">{r.e.displayName}</div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden"><div className={`h-full rounded-full ml-auto ${!r.win ? "bg-red-500" : "bg-gray-500"}`} style={{ width: `${Math.max(0, r.eHp / r.e.hp * 100)}%` }} /></div>
                <div className="text-xs text-gray-500 text-right">{r.eHp}/{r.e.hp}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-2xl">
        <button onClick={() => setTeamView("kyu")} className="ripple-btn py-3 bg-gradient-to-r from-green-600 to-teal-600 rounded-xl font-bold hover:opacity-90 transition">{t.battle.result.rematch}</button>
        <button onClick={() => setTeamView("select")} className="ripple-btn py-3 bg-gray-700 rounded-xl font-bold hover:bg-gray-600 transition">{t.battle.result.changeCard}</button>
        <button onClick={() => setTeamView("top")} className="ripple-btn py-3 bg-gray-700 rounded-xl font-bold hover:bg-gray-600 transition text-gray-300">{t.battle.result.menu}</button>
        {(() => {
          const resultLabel = battleResult.result === "win" ? t.battle.team.win : battleResult.result === "lose" ? t.battle.team.lose : t.battle.team.draw;
          const copyText = t.battle.team.copyText(battleResult.wins, battleResult.losses, teamKyu ?? "", onlineNames?.opponent);
          return (<>
            <button onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(copyText)}`, '_blank')} className="ripple-btn py-3 bg-sky-600 rounded-xl font-bold hover:bg-sky-500 transition">{t.battle.result.shareBtn}</button>
            <button onClick={() => window.open(`https://bsky.app/intent/compose?text=${encodeURIComponent(copyText)}`, '_blank')} className="ripple-btn py-3 bg-blue-500 rounded-xl font-bold hover:bg-blue-400 transition">Bluesky</button>
          </>);
        })()}
      </div>
    </div>
    </>
  );

  return null;
}
