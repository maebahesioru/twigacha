"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import TcgCard from "@/components/TcgCard";
import { useGameStore } from "@/store/useGameStore";
import { useT } from "@/hooks/useT";
import type { TwitterCard } from "@/types";
import { KYU_CONFIG, generateEnemy, simulateBattle, calcDamage, applySkill, type Kyu } from "@/lib/battle";
import { VsIdScreen } from "./VsIdScreen";
import { OnlineBattleView } from "./OnlineViews";
import { TeamBattleView } from "./TeamBattleView";
import { playAttack, playVictory, playDefeat } from "@/lib/audio";
import { playRaidHit } from "@/lib/audio";
import Confetti from "@/components/Confetti";

function BattlePageInner() {
  const { collection, markBattle, addBattleResult, battleHistory,
    raidDate, raidBossMaxHp, raidBossHp, raidBossCard, raidCleared, raidDeck, raidUsedCards,
    setRaidDeck, damageRaidBoss, addRaidUsedCards, initRaid, clearRaid, incrementRaidClearCount, raidHistory, addRaidHistory,
    teamBattleHistory, addTeamBattleResult, savedTeam, setSavedTeam, savedDecks, savedeck, deleteDeck,
    battleSpeed, setBattleSpeed, battleSort, setBattleSort, updateCard } = useGameStore();
  const battleSpeedRef = useRef(battleSpeed);
  useEffect(() => { battleSpeedRef.current = battleSpeed; }, [battleSpeed]);
  const t = useT();
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code') ?? '';
  const [view, setView] = useState<'menu' | 'select' | 'rarity' | 'battle' | 'result' | 'raid' | 'raid-battle' | 'raid-result' | 'vs-id' | 'team' | 'online'>('menu');
  const [kyu, setKyu] = useState<Kyu>("R");
  const [search, setSearch] = useState("");
  const [rarityFilter, setRarityFilter] = useState<"ALL"|"LR"|"UR"|"SSR"|"SR"|"R"|"N"|"C">("ALL");
  const [selectFor, setSelectFor] = useState<'battle'|'online'>('battle');

  const RARITY_ORDER = ["LR","UR","SSR","SR","R","N","C"];
  function sortBattle(cards: TwitterCard[]) {
    return [...cards].sort((a, b) => {
      if (battleSort === "rarity") return RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
      if (battleSort === "name") return a.displayName.localeCompare(b.displayName);
      if (battleSort === "id") return a.username.localeCompare(b.username);
      if (battleSort === "pulledAt") return b.pulledAt - a.pulledAt;
      return (b[battleSort] as number) - (a[battleSort] as number);
    });
  }
  const [playerCard, setPlayerCard] = useState<TwitterCard | null>(null);
  const [enemyCard, setEnemyCard] = useState<TwitterCard | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [result, setResult] = useState<{ winner: string; pHp: number; eHp: number; turns: number; ko: boolean } | null>(null);
  const [battling, setBattling] = useState(false);
  const [shake, setShake] = useState<'player'|'enemy'|null>(null);
  const [dmgPop, setDmgPop] = useState<{side:'player'|'enemy';val:number;key:number}|null>(null);
  const [hpFlash, setHpFlash] = useState<'player'|'enemy'|null>(null);
  const [precomputedBattle, setPrecomputedBattle] = useState<{ winner: string; pHp: number; eHp: number; turns: number; ko: boolean; hpSnaps: {pHp:number;eHp:number}[]; log: string[] } | null>(null);
  const [onlineNames, setOnlineNames] = useState<{ my: string; opponent: string } | null>(null);
  const [pHpLive, setPHpLive] = useState(0);
  const [eHpLive, setEHpLive] = useState(0);
  const [selectMode, setSelectMode] = useState<"player" | "enemy" | null>(null);

  // レイド用state
  const [raidLog, setRaidLog] = useState<string[]>([]);
  const [raidRunning, setRaidRunning] = useState(false);
  const [raidTotalDmg, setRaidTotalDmg] = useState(0);
  const [raidResult, setRaidResult] = useState<{ cleared: boolean; totalDmg: number; turns: number } | null>(null);
  const [raidBossHpLive, setRaidBossHpLive] = useState(0);
  const [raidHpFlash, setRaidHpFlash] = useState(false);
  const [raidCurrentCard, setRaidCurrentCard] = useState<TwitterCard | null>(null);
  const [raidCurrentCardHp, setRaidCurrentCardHp] = useState(0);
  const [raidBossLoading, setRaidBossLoading] = useState(false);

  const todayStr = new Date().toDateString();

  const loadRaidBoss = useCallback(async () => {
    if (raidDate === todayStr && raidBossCard) return;
    setRaidBossLoading(true);
    try {
      const res = await fetch('/api/gacha?count=1');
      const data = await res.json();
      const card: TwitterCard = Array.isArray(data) ? data[0] : data;
      if (!card || (card as unknown as { error?: string }).error) return;
      // {t.battle.raid.bossHp}はカードの10倍
      const maxHp = card.hp * 10;
      const boss: TwitterCard = { ...card, hp: maxHp, rarity: "LR" };
      initRaid(todayStr, boss, maxHp);
    } finally {
      setRaidBossLoading(false);
    }
  }, [raidDate, raidBossCard, todayStr]);

  const startBattle = useCallback(async () => {
    if (!playerCard || !enemyCard) return;
    setBattling(true);
    setLog([]);
    setResult(null);
    setPHpLive(playerCard.hp);
    setEHpLive(enemyCard.hp);
    await new Promise((r) => setTimeout(r, 300));
    const { log: battleLog, hpSnaps, winner, pHp, eHp, turns, ko } = precomputedBattle ?? simulateBattle(playerCard, enemyCard, useGameStore.getState().lang);
    setPrecomputedBattle(null);
    let prevPHp = playerCard.hp, prevEHp = enemyCard.hp;
    for (let i = 0; i < battleLog.length; i++) {
      await new Promise((r) => setTimeout(r, battleSpeedRef.current));
      setLog((prev) => [...prev, battleLog[i]]);
      const snap = hpSnaps[i];
      if (snap.eHp < prevEHp) {
        const dmg = prevEHp - snap.eHp;
        setShake('enemy'); setTimeout(() => setShake(null), 400);
        setHpFlash('enemy'); setTimeout(() => setHpFlash(null), 300);
        setDmgPop({ side: 'enemy', val: dmg, key: Date.now() });
        playAttack();
      }
      if (snap.pHp < prevPHp) {
        const dmg = prevPHp - snap.pHp;
        setShake('player'); setTimeout(() => setShake(null), 400);
        setHpFlash('player'); setTimeout(() => setHpFlash(null), 300);
        setDmgPop({ side: 'player', val: dmg, key: Date.now() + 1 });
      }
      prevPHp = snap.pHp; prevEHp = snap.eHp;
      setPHpLive(snap.pHp);
      setEHpLive(snap.eHp);
    }
    setResult({ winner, pHp, eHp, turns, ko });
    setBattling(false);
    markBattle();
    addBattleResult({ winner: winner as 'player' | 'enemy', turns, kyu, playerCardId: playerCard.id, opponentName: onlineNames?.opponent, pHp, ko, playerCardRarity: playerCard.rarity, enemyCardRarity: enemyCard.rarity, mode: selectFor === 'battle' && !onlineNames ? 'random' : 'other' });
    const ultimateCount = battleLog.filter(l => l.includes("⚡必殺") && l.includes(`@${playerCard.username}`) === false && winner === 'player' ? false : l.includes("⚡必殺")).length;
    fetch('/api/ranking', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ card_id: playerCard.id, username: playerCard.username, display_name: playerCard.displayName, avatar: playerCard.avatar, rarity: playerCard.rarity, atk: playerCard.atk, element: playerCard.element, won: winner === 'player', ko_win: winner === 'player' && ko, ultimate_count: ultimateCount }) }).catch(() => {});
    winner === 'player' ? playVictory() : playDefeat();
    setTimeout(() => setView('result'), 1500);
  }, [playerCard, enemyCard, precomputedBattle]);

  // バトル画面に入ってenemyCardが揃ったら自動開始
  useEffect(() => {
    if (view === 'battle' && playerCard && enemyCard && !battling && !result) {
      startBattle();
    }
  }, [view, enemyCard]);

  useEffect(() => {
    if (view === 'raid') loadRaidBoss();
  }, [view]);

  // レイドバトル開始
  const startRaidBattle = useCallback(async () => {
    if (raidRunning || raidDeck.length === 0 || !raidBossCard) return;
    setRaidRunning(true);
    setRaidLog([]);
    setRaidResult(null);
    setRaidTotalDmg(0);

    const deck = raidDeck.map(id => collection.find(c => c.id === id)).filter(Boolean) as TwitterCard[];
    let bossHp = raidBossHp > 0 ? raidBossHp : raidBossCard.hp;
    setRaidBossHpLive(bossHp);

    let totalDmg = 0;
    let totalTurns = 0;
    const boss = { ...raidBossCard, hp: bossHp };

    for (let ci = 0; ci < deck.length && bossHp > 0; ci++) {
      const rawCard = deck[ci];
      setRaidCurrentCard(rawCard);
      const card = applySkill(rawCard);
      setRaidCurrentCardHp(card.hp);
      await new Promise(r => setTimeout(r, battleSpeedRef.current));
      setRaidLog(prev => [...prev, t.battle.raidSortie(card.element, card.username)]);
      let cardHp = card.hp;
      let turn = 1;
      while (cardHp > 0 && bossHp > 0 && turn <= 30) {
        await new Promise(r => setTimeout(r, battleSpeedRef.current));
        const { dmg: d1, isCrit: c1, isType: t1, isWeak: w1 } = calcDamage(card.atk, boss.def, card.int, card.luk, card.element, boss.element);
        bossHp = Math.max(0, bossHp - d1);
        totalDmg += d1;
        setRaidBossHpLive(bossHp);
        setRaidHpFlash(true); setTimeout(() => setRaidHpFlash(false), 300);
        playRaidHit();
        setRaidLog(prev => [...prev, `Turn ${turn}: ${t.battle.raid.bossDmg(card.username, d1, c1, t1, w1)}`]);
        if (bossHp <= 0) break;
        const { dmg: d2, isCrit: c2, isType: t2, isWeak: w2 } = calcDamage(boss.atk, card.def, boss.int, boss.luk, boss.element, card.element);
        cardHp = Math.max(0, cardHp - d2);
        setRaidCurrentCardHp(cardHp);
        setRaidLog(prev => [...prev, `Turn ${turn}: ${t.battle.raid.bossAtk(card.username, d2, c2, t2, w2)}`]);
        turn++;
        totalTurns++;
      }
      if (cardHp <= 0) setRaidLog(prev => [...prev, `💀 @${card.username} defeated...`]);
    }

    setRaidTotalDmg(totalDmg);
    damageRaidBoss(totalDmg);
    addRaidUsedCards(deck.map(c => c.id));
    const cleared = bossHp <= 0;
    if (cleared) { clearRaid(); incrementRaidClearCount(); }
    addRaidHistory({ date: new Date().toLocaleDateString(), bossName: raidBossCard.displayName, totalDmg, cleared });
    // カードランキングに各カードの結果を送信
    deck.forEach(card => {
      fetch('/api/ranking', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ card_id: card.id, username: card.username, display_name: card.displayName, avatar: card.avatar, rarity: card.rarity, atk: card.atk, element: card.element, won: cleared, ko_win: false, ultimate_count: 0 }) }).catch(() => {});
    });
    setRaidResult({ cleared, totalDmg, turns: totalTurns });
    setRaidRunning(false);
    setView('raid-result');
  }, [raidDeck, collection, raidBossHp, raidDate, todayStr]);

  if (collection.length < 1) {
    return (
      <div className="min-h-dvh bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">{t.common.noCards}</p>
      </div>
    );
  }

  // メニュー画面
  if (view === 'menu') {
    const KYU_LIST: Kyu[] = ["LR","UR","SSR","SR","R","N","C"];
    const total = battleHistory.length;
    const wins = battleHistory.filter(b => b.winner === 'player').length;
    const losses = battleHistory.filter(b => b.winner === 'enemy').length;
    const draws = total - wins - losses;
    const winRate = total > 0 ? (wins / total * 100).toFixed(1) : "0.0";
    const avgTurns = total > 0 ? (battleHistory.reduce((s, b) => s + b.turns, 0) / total).toFixed(1) : "0.0";
    // {t.battle.streak}
    let maxStreak = 0, curStreak = 0;
    for (const b of battleHistory) { if (b.winner === 'player') { curStreak++; maxStreak = Math.max(maxStreak, curStreak); } else curStreak = 0; }
    const currentStreak = curStreak;
    // 級別
    const kyuStats = KYU_LIST.map(k => {
      const ks = battleHistory.filter(b => b.kyu === k);
      const kw = ks.filter(b => b.winner === 'player').length;
      const kl = ks.filter(b => b.winner === 'enemy').length;
      return { k, total: ks.length, wins: kw, losses: kl, draws: ks.length - kw - kl,
        winRate: ks.length > 0 ? (kw / ks.length * 100).toFixed(1) : "0.0",
        avgTurns: ks.length > 0 ? (ks.reduce((s, b) => s + b.turns, 0) / ks.length).toFixed(1) : "0.0" };
    });
    // カード{t.battle.winRate}ランキング（3戦以上優先）
    const cardMap = new Map<string, { wins: number; total: number; card: typeof collection[0] | undefined }>();
    for (const b of battleHistory) {
      const c = collection.find(c => c.id === b.playerCardId);
      if (!cardMap.has(b.playerCardId)) cardMap.set(b.playerCardId, { wins: 0, total: 0, card: c });
      const e = cardMap.get(b.playerCardId)!;
      e.total++; if (b.winner === 'player') e.wins++;
    }
    const cardRankings = KYU_LIST.map(k => ({
      k,
      cards: [...cardMap.entries()]
        .filter(([, v]) => v.card?.rarity === k)
        .map(([id, v]) => ({ id, ...v, winRate: v.total > 0 ? v.wins / v.total * 100 : 0,
          wl: `${v.wins}-${v.total - v.wins}-0` }))
        .sort((a, b) => (b.total >= 3 ? 1 : -1) - (a.total >= 3 ? 1 : -1) || b.winRate - a.winRate)
    })).filter(r => r.cards.length > 0);

    return (
      <div className="min-h-dvh bg-gray-950 text-white py-10 px-4 flex flex-col items-center gap-6 slide-in-up">
        <h1 className="text-2xl sm:text-4xl font-black bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">{ t.battle.title}</h1>
        <div className="grid grid-cols-2 gap-3 w-full max-w-2xl">
          <button
            onClick={() => { setSelectFor('battle'); setView('select'); setPlayerCard(null); setEnemyCard(null); setLog([]); setResult(null); }}
            className="ripple-btn flex-1 py-4 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl font-bold text-lg hover:opacity-90 transition shadow-lg shadow-red-500/30 text-left px-5"
          >
            <div className="flex items-center gap-2 mb-1">{t.battle.random}</div>
            <div className="text-xs text-red-100 font-normal opacity-90">{t.battle.randomDesc}</div>
          </button>
          <button onClick={() => setView('raid')}
            className="ripple-btn flex-1 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl font-bold text-lg hover:opacity-90 transition shadow-lg shadow-blue-500/30 text-left px-5">
            <div className="flex items-center gap-2 mb-1">{t.battle.raid.title}</div>
            <div className="text-xs text-blue-100 font-normal opacity-90">{t.battle.raidDesc}</div>
          </button>
          <button onClick={() => setView('team')}
            className="ripple-btn flex-1 py-4 bg-gradient-to-r from-green-600 to-teal-600 rounded-2xl font-bold text-lg hover:opacity-90 transition shadow-lg shadow-green-500/30 text-left px-5">
            <div className="flex items-center gap-2 mb-1">{t.battle.team.title}</div>
            <div className="text-xs text-green-100 font-normal opacity-90">{t.battle.team.subtitle}</div>
          </button>
          <button onClick={() => { setSelectFor('online'); setView('select'); setPlayerCard(null); setEnemyCard(null); setLog([]); setResult(null); }}
            className="ripple-btn flex-1 py-4 bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl font-bold text-lg hover:opacity-90 transition shadow-lg shadow-violet-500/30 text-left px-5">
            <div className="flex items-center gap-2 mb-1">{t.battle.online}</div>
            <div className="text-xs text-violet-100 font-normal opacity-90">{t.battle.onlineDesc}</div>
          </button>
        </div>
        <p className="text-gray-600 text-sm">{t.common.cards(collection.length)}</p>

        {/* {t.battle.stats} */}
        <div className="w-full max-w-2xl space-y-4">
          <h2 className="text-lg font-bold text-gray-300">📊 {t.battle.stats}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            {[[t.battle.totalBattles, total],[t.battle.winRate, `${winRate}%`],[t.battle.avgTurns, avgTurns],[t.battle.streak, maxStreak],
              [t.battle.wins, wins],[t.battle.losses, losses],[t.battle.draws, draws],[t.battle.currentStreak, currentStreak]].map(([label, val]) => (
              <div key={label as string} className="bg-gray-800 rounded-xl p-3">
                <div className="text-xs text-gray-400 mb-1">{label}</div>
                <div className="text-xl font-bold">{val}</div>
              </div>
            ))}
          </div>

          {/* 級別成績 */}
          <h2 className="text-lg font-bold text-gray-300">{t.battle.kyuStats}</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] text-sm text-center">
              <thead><tr className="text-gray-400 border-b border-gray-700">
                {t.battle.kyuHeaders.map(h => <th key={h} className="py-2 px-2">{h}</th>)}
              </tr></thead>
              <tbody>
                {kyuStats.map(({ k, total: t, wins: w, losses: l, draws: d, winRate: wr, avgTurns: at }) => (
                  <tr key={k} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="py-2 px-2 font-bold">{k}</td>
                    <td>{t}</td><td className="text-green-400">{w}</td>
                    <td className="text-red-400">{l}</td><td>{d}</td>
                    <td>{wr}%</td><td>{at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* カード{t.battle.winRate}ランキング */}
          {cardRankings.length > 0 && (
            <>
              <h2 className="text-lg font-bold text-gray-300">{t.battle.cardRanking}</h2>
              {cardRankings.map(({ k, cards }) => (
                <div key={k} className="bg-gray-800/60 rounded-xl p-3">
                  <div className="font-bold text-sm mb-2">{k} <span className="text-gray-400 font-normal">{t.battle.kyuHeaders[1]}: {cards.reduce((s, c) => s + c.total, 0)}</span></div>
                  <ol className="space-y-1">
                    {cards.map((c, i) => (
                      <li key={c.id} className="flex justify-between text-sm">
                        <span className="text-gray-300">{i + 1}. {c.card?.displayName ?? c.id} <span className="text-gray-500 text-xs">#{c.id.slice(0,6)} / {c.wl}</span></span>
                        <span className={`font-bold ${c.total >= 3 ? "text-yellow-400" : "text-gray-300"}`}>{c.winRate.toFixed(1)}%</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </>
          )}

          {/* オンライン対戦履歴 */}
          {battleHistory.filter(b => b.opponentName).length > 0 && (
            <>
              <h2 className="text-lg font-bold text-gray-300">{t.battle.onlineHistoryTitle}</h2>
              <div className="space-y-1">
                {[...battleHistory].reverse().filter(b => b.opponentName).slice(0, 10).map((b, i) => (
                  <div key={i} className="flex justify-between items-center bg-gray-800/60 rounded-lg px-3 py-2 text-sm">
                    <span className="text-gray-300">vs {b.opponentName}</span>
                    <span className={`font-bold ${b.winner === 'player' ? 'text-green-400' : 'text-red-400'}`}>
                      {b.winner === 'player' ? t.battle.result.win : t.battle.result.lose}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // カード選択画面
  if (view === 'select') {
    const filtered = sortBattle(collection.filter(c =>
      (rarityFilter === "ALL" || c.rarity === rarityFilter) &&
      (!search || c.username.includes(search) || c.displayName.includes(search))
    ));
    return (
      <div className="min-h-dvh bg-gray-950 text-white py-10 px-4">
        <div className="flex items-center gap-4 mb-6 justify-center">
          <button onClick={() => setView('menu')} className="text-gray-400 hover:text-white transition text-sm">{ t.battle.back}</button>
          <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">{ t.battle.selectTitle}</h1>
        </div>

        <div className="flex flex-wrap gap-2 justify-center items-center mb-2">
          <span className="text-gray-400 text-sm font-bold">{ t.collection.sort}</span>
          {(Object.entries(t.collection.sortKeys) as [string, string][]).filter(([k]) => ["pulledAt","rarity","name","id","atk","def","spd","hp","int","luk"].includes(k)).map(([key, label]) => (
            <button key={key} onClick={() => setBattleSort(key as typeof battleSort)}
              className={`px-3 py-1 rounded-full text-sm font-bold transition ${battleSort === key ? "bg-pink-500 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex justify-center mb-6">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t.collection.search}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm w-full max-w-xs focus:outline-none focus:border-purple-500" />
        </div>

        <div className="flex justify-center gap-3 mb-4 flex-wrap">
          {selectFor === 'battle' ? (<>
          <button
            disabled={!playerCard}
            onClick={() => setView('rarity')}
            className="px-8 py-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl font-bold text-lg hover:opacity-90 disabled:opacity-40 transition"
          >
            {t.battle.randomBattle}
          </button>
          <button
            disabled={!playerCard}
            onClick={() => setView('vs-id')}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-lg hover:opacity-90 disabled:opacity-40 transition"
          >
            {t.battle.vsIdBattle}
          </button>
          </>) : (
          <button
            disabled={!playerCard}
            onClick={() => setView('online')}
            className="px-8 py-3 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl font-bold text-lg hover:opacity-90 disabled:opacity-40 transition"
          >
            {t.battle.online}
          </button>
          )}
        </div>
        <div className="flex flex-wrap gap-4 justify-center">
          {filtered.map(card => (
            <div key={card.id}
              onClick={async (e) => {
                e.preventDefault(); e.stopPropagation(); setPlayerCard(card);
                if (!card.ultimates?.length) {
                  try {
                    const data = await fetch(`/api/gacha?username=${encodeURIComponent(card.username)}`).then(r => r.json());
                    if (data.ultimates?.length) { const updated = { ...card, ultimates: data.ultimates }; updateCard(updated); setPlayerCard(updated); }
                  } catch {}
                }
              }}
              className={`cursor-pointer transition hover:scale-105 rounded-xl ${playerCard?.id === card.id ? "ring-4 ring-pink-500 scale-105" : ""}`}
              style={{ pointerEvents: 'auto' }}
            >
              <div style={{ pointerEvents: 'none' }}>
                <TcgCard card={card} size="lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ID指定対戦画面
  if (view === 'vs-id') {
    return <VsIdScreen playerCard={playerCard} onBattle={(enemy) => { setEnemyCard(enemy); setLog([]); setResult(null); setOnlineNames({ my: '', opponent: enemy.displayName }); setView('battle'); }} onBack={() => setView('select')} />;
  }

  // レアリティ選択画面
  if (view === 'rarity') {
    return (
      <div className="min-h-dvh bg-gray-950 text-white flex flex-col items-center justify-center gap-6 px-4">
        <div className="flex items-center gap-4">
          <button onClick={() => setView('select')} className="text-gray-400 hover:text-white transition text-sm">{ t.battle.back}</button>
          <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">{ t.battle.rarityTitle}</h1>
        </div>
        {playerCard && <TcgCard card={playerCard} size="lg" />}
        <div className="flex flex-wrap gap-3 justify-center">
          {(Object.keys(KYU_CONFIG) as Kyu[]).map(k => (
            <button key={k} onClick={() => setKyu(k)}
              className={`px-3 py-2 sm:px-5 sm:py-3 text-sm sm:text-base rounded-xl font-bold transition ${kyu === k ? "bg-pink-500 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
              {k}
            </button>
          ))}
        </div>
        <button
          onClick={async () => {
            setView('battle');
            setLog([]);
            setResult(null);
            setEnemyCard(null);
            const kyuHistory = battleHistory.filter(b => b.kyu === kyu);
            const winRate = kyuHistory.length >= 3 ? kyuHistory.filter(b => b.winner === 'player').length / kyuHistory.length : 0.5;
            const b = 0.8 + winRate * 0.8; // 勝率0%→0.8倍、50%→1.2倍、100%→1.6倍
            const boosted = (c: TwitterCard) => ({ ...c,
              atk: Math.round(c.atk * b), def: Math.round(c.def * b),
              spd: Math.round(c.spd * b), hp: Math.round(c.hp * b),
              int: Math.round(c.int * b), luk: Math.round(c.luk * b),
            });
            try {
              const res = await fetch('/api/gacha?count=5');
              const data = await res.json();
              const cards: TwitterCard[] = data.filter((c: { error?: string }) => c && !c.error) as TwitterCard[];
              const exact = cards.find(c => c.rarity === kyu);
              const fetchUlts = async (username: string) => {
                try { const d = await fetch(`/api/gacha?username=${encodeURIComponent(username)}`).then(r => r.json()); return d.ultimates ?? []; } catch { return []; }
              };
              if (exact) {
                const ults = await fetchUlts(exact.username);
                setEnemyCard(boosted({ ...exact, ultimates: ults }));
              } else if (cards[0]) {
                const { min, max } = KYU_CONFIG[kyu];
                const target = Math.round((min + max) / 2) * 6;
                const base = cards[0];
                const total = base.atk + base.def + base.spd + base.hp + base.int + base.luk;
                const r = target / Math.max(total, 1);
                const ults = await fetchUlts(base.username);
                setEnemyCard(boosted({ ...base, rarity: kyu,
                  atk: Math.round(base.atk * r), def: Math.round(base.def * r),
                  spd: Math.round(base.spd * r), hp: Math.round(base.hp * r),
                  int: Math.round(base.int * r), luk: Math.round(base.luk * r),
                  ultimates: ults,
                }));
              } else {
                setEnemyCard(boosted(generateEnemy(kyu)));
              }
            } catch {
              setEnemyCard(boosted(generateEnemy(kyu)));
            }
          }}
          className="w-full sm:w-auto px-10 py-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl font-bold text-lg hover:opacity-90 transition"
        >
          {t.battle.startBattle}
        </button>
      </div>
    );
  }

  // リザルト画面
  if (view === 'result' && result && playerCard && enemyCard) {
    const win = result.winner === 'player';
    // 現在の連勝数（カードのレアリティ以上の級での勝利のみ）
    const KYU_ORDER = ["C","N","R","SR","SSR","UR","LR"];
    let curStreak = 0;
    for (let i = battleHistory.length - 1; i >= 0; i--) {
      const b = battleHistory[i];
      const kyuIdx = KYU_ORDER.indexOf(b.kyu);
      const rarityIdx = KYU_ORDER.indexOf(b.playerCardRarity ?? "C");
      if (b.winner === 'player' && kyuIdx >= rarityIdx && KYU_ORDER.indexOf(b.enemyCardRarity ?? "C") >= rarityIdx && b.opponentName !== battleHistory[i-1]?.opponentName && (b.mode === 'random' || b.mode === 'team')) curStreak++;
      else break;
    }
    const streakBonusTriggered = win && curStreak > 0 && curStreak % 3 === 0;
    const copyText = t.battle.result.copyText(playerCard.displayName, enemyCard.displayName, win, kyu, result.ko, result.turns, result.pHp, playerCard.hp, result.eHp, enemyCard.hp, playerCard.atk, playerCard.def, enemyCard.atk, enemyCard.def);
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(copyText)}&url=${encodeURIComponent('https://twigacha.vercel.app')}`;

    const HpBar = ({ current, max, isWin }: { current: number; max: number; isWin: boolean }) => (
      <div className="w-full">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">HP</span>
          <span className={isWin ? "text-green-400" : "text-red-400"}>{current} / {max}</span>
        </div>
        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${isWin ? "bg-green-500" : "bg-red-500"}`}
            style={{ width: `${Math.max(0, current / max * 100)}%` }} />
        </div>
      </div>
    );

    return (
      <>
      {win && <Confetti />}
      <div className="min-h-dvh bg-gray-950 text-white flex flex-col items-center gap-6 px-4 py-10 slide-in-up">
        <div className={`text-3xl sm:text-5xl font-black ${win ? "text-yellow-400" : "text-red-400"}`}>
          {win ? `🏆 ${t.battle.result.win}！` : `💀 ${t.battle.result.lose}`}
        </div>
        {streakBonusTriggered && (
          <div className="bg-orange-500/20 border border-orange-400/50 rounded-xl px-4 py-2 text-orange-300 font-bold text-sm animate-pulse">
            {t.battle.streakBonus(curStreak)}
          </div>
        )}

        {/* カード＋HPバー */}
        <div className="flex gap-4 sm:gap-8 flex-wrap justify-center items-start">
          <div className="flex flex-col items-center gap-2 w-52 sm:w-64">
            <span className="text-sm text-blue-400 font-bold">{ (onlineNames?.my || playerCard?.displayName) ?? t.battle.you}</span>
            <TcgCard card={playerCard} size="lg" />
            <HpBar current={result.pHp} max={playerCard.hp} isWin={win} />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-gray-600 sm:mt-20">VS</div>
          <div className="flex flex-col items-center gap-2 w-52 sm:w-64">
            <span className="text-sm text-red-400 font-bold">{onlineNames?.opponent ?? enemyCard?.displayName ?? t.battle.enemy(enemyCard?.rarity ?? kyu)}</span>
            <TcgCard card={enemyCard} size="lg" />
            <HpBar current={result.eHp} max={enemyCard.hp} isWin={!win} />
          </div>
        </div>

        {/* 詳細 */}
        <div className="bg-gray-800/80 rounded-2xl p-4 w-full max-w-2xl space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-400">{t.battle.result.win}/{t.battle.result.lose}</span><span className={`font-bold ${win ? "text-yellow-400" : "text-red-400"}`}>{win ? t.battle.result.win : t.battle.result.lose}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">{t.battle.result.decision}</span><span className="font-bold">{result.ko ? t.battle.result.ko : t.battle.result.timeout}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">{t.battle.result.turns}</span><span className="font-bold">{result.turns}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">{t.battle.result.kyu}</span><span className="font-bold">{enemyCard.rarity}</span></div>
          <div className="flex justify-between text-xs"><span className="text-gray-400">{t.battle.result.remainHp}</span><span className="font-bold">{playerCard.displayName} {result.pHp}/{playerCard.hp} | {enemyCard.displayName} {result.eHp}/{enemyCard.hp}</span></div>
        </div>

        {/* バトルログ */}
        {log.length > 0 && (
          <details className="w-full max-w-2xl bg-gray-800/80 rounded-2xl p-4">
            <summary className="cursor-pointer text-sm text-gray-400 hover:text-white">{t.battle.result.battleLog(log.length)}</summary>
            <div className="mt-3 space-y-1 max-h-60 overflow-y-auto text-xs text-gray-300 font-mono">
              {log.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          </details>
        )}

        {/* アクションボタン */}
        <div className="grid grid-cols-3 gap-2 w-full max-w-2xl">
          <button onClick={() => navigator.clipboard.writeText(copyText)}
            className="px-3 py-2 sm:px-5 sm:py-3 text-sm sm:text-base bg-blue-700 rounded-xl font-bold hover:bg-blue-600 transition">{ t.battle.result.copyBtn}</button>
          <button onClick={() => { setLog([]); setResult(null); setView('battle'); }}
            className="px-3 py-2 sm:px-5 sm:py-3 text-sm sm:text-base bg-green-700 rounded-xl font-bold hover:bg-green-600 transition">{t.battle.result.rematch}</button>
          <button onClick={() => { setEnemyCard(null); setLog([]); setResult(null); setView('rarity'); }}
            className="px-3 py-2 sm:px-5 sm:py-3 text-sm sm:text-base bg-gray-600 rounded-xl font-bold hover:bg-gray-500 transition">{t.battle.result.changeKyu}</button>
          <button onClick={() => window.open(shareUrl, '_blank')}
            className="px-3 py-2 sm:px-5 sm:py-3 text-sm sm:text-base bg-sky-600 rounded-xl font-bold hover:bg-sky-500 transition">{ t.battle.result.shareBtn}</button>
          <button onClick={() => { setEnemyCard(null); setLog([]); setResult(null); setView('rarity'); }}
            className="px-3 py-2 sm:px-5 sm:py-3 text-sm sm:text-base bg-green-700 rounded-xl font-bold hover:bg-green-600 transition">{t.battle.result.sameKyu}</button>
          <button onClick={() => { setLog([]); setResult(null); setView('select'); }}
            className="px-3 py-2 sm:px-5 sm:py-3 text-sm sm:text-base bg-gray-600 rounded-xl font-bold hover:bg-gray-500 transition">{t.battle.result.changeCard}</button>
          <button onClick={() => window.open(`https://bsky.app/intent/compose?text=${encodeURIComponent(copyText)}`, '_blank')}
            className="px-3 py-2 sm:px-5 sm:py-3 text-sm sm:text-base bg-blue-600 rounded-xl font-bold hover:bg-blue-500 transition">Bluesky</button>
          <button onClick={() => { setEnemyCard(null); setLog([]); setResult(null); setView('select'); }}
            className="px-3 py-2 sm:px-5 sm:py-3 text-sm sm:text-base bg-green-700 rounded-xl font-bold hover:bg-green-600 transition">{t.battle.result.sameKyuNewCard}</button>
          <button onClick={() => setView('menu')}
            className="px-3 py-2 sm:px-5 sm:py-3 text-sm sm:text-base bg-gray-800 rounded-xl font-bold hover:bg-gray-700 transition text-gray-400">{ t.battle.result.menu}</button>
        </div>
      </div>
      </>
    );
  }

  // レイド{t.battle.raid.deckSelect}画面
  if (view === 'raid') {
    if (raidBossLoading || !raidBossCard) {
      return (
        <div className="min-h-dvh bg-gray-950 text-white flex flex-col items-center justify-center gap-4">
          <div className="text-gray-400 animate-pulse text-lg">🔥 {t.battle.raid.loading}...</div>
          <button onClick={() => setView('menu')} className="text-gray-500 text-sm hover:text-white">{ t.battle.back}</button>
        </div>
      );
    }
    const currentBossHp = raidBossHp > 0 ? raidBossHp : raidBossCard.hp;
    const currentBossMaxHp = raidBossMaxHp > 0 ? raidBossMaxHp : raidBossCard.hp;
    const cleared = raidDate === todayStr && raidCleared;
    const hpPct = currentBossMaxHp > 0 ? Math.max(0, currentBossHp / currentBossMaxHp * 100) : 100;
    const deck = raidDeck.filter(id => collection.find(c => c.id === id));
    const toggleDeck = (id: string) => {
      if (deck.includes(id)) setRaidDeck(deck.filter(x => x !== id));
      else if (deck.length < 10) setRaidDeck([...deck, id]);
    };
    return (
      <div className="min-h-dvh bg-gray-950 text-white py-10 px-4 flex flex-col items-center gap-6">
        <div className="flex items-center gap-4 w-full max-w-2xl">
          <button onClick={() => setView('menu')} className="text-gray-400 hover:text-white text-sm">{ t.battle.back}</button>
          <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">{t.battle.raid.title}</h1>
        </div>
        {/* ボス情報 */}
        <div className="w-full max-w-2xl bg-gray-800/60 rounded-2xl p-5 border border-orange-500/30">
          <div className="flex flex-col sm:flex-row gap-4 items-start mb-3">
            <div style={{ pointerEvents: 'none' }}>
              <TcgCard card={raidBossCard} size="lg" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-orange-400 font-bold mb-1">{t.battle.raid.todayBoss}</div>
              {cleared && <div className="text-green-400 font-bold mb-2">✅ {t.battle.raid.cleared}</div>}
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">{t.battle.raid.bossHp}</span>
                <span className="font-bold">{currentBossHp.toLocaleString()} / {currentBossMaxHp.toLocaleString()}</span>
              </div>
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-500"
                  style={{ width: `${hpPct}%` }} />
              </div>
              <button
                onClick={() => { setRaidLog([]); setRaidResult(null); setView('raid-battle'); startRaidBattle(); }}
                disabled={deck.length === 0 || cleared}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl font-bold text-lg hover:opacity-90 disabled:opacity-40 transition"
              >
                {cleared ? t.battle.raid.clearedBtn : deck.length === 0 ? t.battle.raid.noCards : t.battle.raid.challenge(deck.length)}
              </button>
            </div>
          </div>
        </div>
        {/* {t.battle.raid.deckSelect} */}
        <div className="w-full max-w-4xl">
          <div className="flex justify-between items-center mb-3">
            <span className="font-bold text-gray-300">{t.battle.raid.deckSelect} <span className="text-gray-500 text-sm">({deck.length}/10)</span></span>
            {deck.length > 0 && <button onClick={() => setRaidDeck([])} className="text-xs text-gray-500 hover:text-red-400">{ t.battle.raid.deckClear}</button>}
          </div>
          <div className="flex flex-wrap gap-2 justify-center items-center mb-2">
            <span className="text-gray-400 text-sm font-bold">{ t.collection.sort}</span>
            {(Object.entries(t.collection.sortKeys) as [string, string][]).filter(([k]) => ["pulledAt","rarity","name","atk","def","spd","hp","int","luk"].includes(k)).map(([key, label]) => (
              <button key={key} onClick={() => setBattleSort(key as typeof battleSort)}
                className={`px-3 py-1 rounded-full text-sm font-bold transition ${battleSort === key ? "bg-orange-500 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex justify-center mb-4">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t.collection.search}
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm w-full max-w-xs focus:outline-none focus:border-orange-500" />
          </div>
          <div className="flex flex-wrap gap-4 justify-center">
            {sortBattle(collection.filter(c => !search || c.username.includes(search) || c.displayName.includes(search))).map(card => {
              const selected = deck.includes(card.id);
              const used = raidDate === todayStr && raidUsedCards.includes(card.id);
              const idx = deck.indexOf(card.id);
              return (
                <div key={card.id} onClick={() => !used && toggleDeck(card.id)}
                  className={`transition rounded-xl relative ${used ? "opacity-30 cursor-not-allowed" : "cursor-pointer hover:scale-105"} ${selected ? "ring-4 ring-orange-500 scale-105" : ""}`}>
                  <div style={{ pointerEvents: 'none' }}>
                    <TcgCard card={card} size="lg" />
                  </div>
                  {selected && (
                    <div className="absolute -top-2 -right-2 w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center text-white font-black text-sm z-10">
                      {idx + 1}
                    </div>
                  )}
                  {used && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                      <span className="bg-gray-900/80 text-gray-400 text-xs font-bold px-2 py-1 rounded-lg">{t.battle.raid.used}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // レイドバトル画面
  if (view === 'raid-battle') {
    if (!raidBossCard) return null;
    const currentBossHp = raidBossHp > 0 ? raidBossHp : raidBossCard.hp;
    const currentBossMaxHp = raidBossMaxHp > 0 ? raidBossMaxHp : raidBossCard.hp;
    const hpPct = currentBossMaxHp > 0 ? Math.max(0, currentBossHp / currentBossMaxHp * 100) : 100;
    const deck = raidDeck.map(id => collection.find(c => c.id === id)).filter(Boolean) as TwitterCard[];
    return (
      <div className="min-h-dvh bg-gray-950 text-white py-10 px-4">
        <div className="flex items-center justify-center gap-4 mb-6">
          <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">{t.battle.raid.battleTitle}</h1>
        </div>

        {/* カード表示 */}
        <div className="flex justify-center items-start gap-4 sm:gap-8 mb-8 flex-wrap">
          {/* 現在戦闘中カード */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm text-blue-400 font-bold">{ (onlineNames?.my || playerCard?.displayName) ?? t.battle.you}</span>
            {raidCurrentCard && <TcgCard card={raidCurrentCard} size="lg" />}
            <div className="w-full max-w-[16rem]">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">HP</span>
                <span className="text-white font-bold">{raidCurrentCardHp} / {raidCurrentCard?.hp ?? 0}</span>
              </div>
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${raidCurrentCard ? Math.max(0, raidCurrentCardHp / raidCurrentCard.hp * 100) : 100}%` }} />
              </div>
            </div>
          </div>

          <div className="text-2xl sm:text-4xl font-black text-gray-600 sm:mt-20">VS</div>

          {/* ボス */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm text-red-400 font-bold">{t.battle.raid.boss}</span>
            <TcgCard card={raidBossCard} size="lg" />
            <div className="w-full max-w-[16rem]">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">{t.battle.raid.bossHp}</span>
                <span className="text-orange-400 font-bold">{raidBossHpLive.toLocaleString()} / {(raidBossMaxHp > 0 ? raidBossMaxHp : raidBossCard.hp).toLocaleString()}</span>
              </div>
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-500 ${raidHpFlash ? 'hp-flash' : ''}`}
                  style={{ width: `${Math.max(0, raidBossHpLive / (raidBossMaxHp > 0 ? raidBossMaxHp : raidBossCard.hp) * 100)}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* 速度スライダー */}
        <div className="flex items-center gap-3 text-sm justify-center mb-4">
          <span className="text-gray-400">{t.battle.speed}</span>
          <span className="text-xs text-gray-500">{ t.battle.slow}</span>
          <input type="range" aria-label={t.battle.speedAriaLabel} min={100} max={1200} step={100} value={1300 - battleSpeed}
            onChange={e => setBattleSpeed(1300 - Number(e.target.value))}
            className="w-32 accent-orange-500" />
          <span className="text-xs text-gray-500">{ t.battle.fast}</span>
        </div>

        {/* ログ */}
        <div className="max-w-lg mx-auto bg-gray-900 rounded-xl p-4 space-y-1 max-h-40 sm:max-h-64 overflow-y-auto overscroll-contain">
          {raidLog.map((l, i) => (
            <div key={i} className={`text-sm ${l.startsWith("━━") ? "text-orange-400 font-bold" : l.includes("defeated") ? "text-red-400" : "text-gray-300"}`}>{l}</div>
          ))}
          {raidRunning && <div className="text-gray-500 animate-pulse text-sm">{t.battle.raid.battling}</div>}
        </div>
      </div>
    );
  }

  // レイドリザルト画面
  if (view === 'raid-result' && raidResult && raidBossCard) {
    const currentBossHp = raidBossHp;
    const currentBossMaxHp = raidBossMaxHp;
    const hpPct = currentBossMaxHp > 0 ? Math.max(0, currentBossHp / currentBossMaxHp * 100) : 0;
    const copyText = t.battle.raid.copyText(raidResult.cleared, raidBossCard.displayName, raidResult.totalDmg, currentBossHp, currentBossMaxHp, raidResult.turns);
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(copyText)}`;
    return (
      <div className={`min-h-dvh bg-gray-950 text-white py-10 px-4 flex flex-col items-center gap-6 slide-in-up ${raidResult.cleared ? 'raid-clear-flash' : ''}`}>
        {raidResult.cleared && <Confetti count={60} />}

        <div className="flex items-center justify-center gap-4">
          <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">{t.battle.raid.resultTitle}</h1>
        </div>

        <div className={`text-2xl sm:text-3xl font-black ${raidResult.cleared ? "text-yellow-400" : "text-orange-400"}`}>
          {raidResult.cleared ? t.battle.raid.success : t.battle.raid.end}
        </div>

        <TcgCard card={raidBossCard} size="lg" />

        <div className="bg-gray-800/80 rounded-2xl p-4 w-full max-w-2xl space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-400">{t.battle.raid.resultLabel}</span><span className={`font-bold ${raidResult.cleared ? "text-yellow-400" : "text-orange-400"}`}>{raidResult.cleared ? t.battle.raid.success : t.battle.raid.end}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">{t.battle.raid.dmg}</span><span className="font-bold">{raidResult.totalDmg.toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">{t.battle.raid.totalTurns}</span><span className="font-bold">{raidResult.turns}</span></div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">{t.battle.raid.remainBossHp}</span>
            <span className="font-bold">{currentBossHp.toLocaleString()} / {currentBossMaxHp.toLocaleString()}</span>
          </div>
          <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-500"
              style={{ width: `${hpPct}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-2xl">
          <button onClick={() => navigator.clipboard.writeText(copyText)}
            className="px-5 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 transition">{ t.battle.result.copyBtn}</button>
          <button onClick={() => window.open(shareUrl, '_blank')}
            className="px-5 py-3 bg-sky-500 rounded-xl font-bold hover:bg-sky-400 transition">{ t.battle.result.shareBtn}</button>
          <button onClick={() => window.open(`https://bsky.app/intent/compose?text=${encodeURIComponent(copyText)}`, '_blank')}
            className="px-5 py-3 bg-blue-500 rounded-xl font-bold hover:bg-blue-400 transition">Bluesky</button>
          <button onClick={() => { setRaidLog([]); setRaidResult(null); setView('raid'); }}
            className="px-5 py-3 bg-orange-600 rounded-xl font-bold hover:bg-orange-500 transition">{t.battle.raid.retry}</button>
          <div /><div />
          <button onClick={() => setView('menu')}
            className="px-5 py-3 bg-gray-700 rounded-xl font-bold hover:bg-gray-600 transition text-gray-300">{ t.battle.result.menu}</button>
        </div>

        {raidHistory.length > 0 && (
          <div className="w-full max-w-2xl">
            <h2 className="text-sm font-bold text-gray-400 mb-2">{t.battle.raidHistoryTitle}</h2>
            <div className="space-y-1">
              {raidHistory.slice(0, 10).map((h, i) => (
                <div key={i} className="flex justify-between items-center bg-gray-800/60 rounded-lg px-3 py-2 text-xs">
                  <span className="text-gray-400">{h.date}</span>
                  <span className="text-gray-300 truncate mx-2">{h.bossName}</span>
                  <span className="text-gray-300">{h.totalDmg.toLocaleString()}dmg</span>
                  <span className={`font-bold ml-2 ${h.cleared ? 'text-yellow-400' : 'text-orange-400'}`}>{h.cleared ? t.battle.raid.defeatedLabel : t.battle.raid.challengeLabel}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // オンライン対戦画面
  if (view === 'online') {
    return <OnlineBattleView playerCard={playerCard} onBack={() => setView('select')} t={t} initialCode={initialCode}
      onMatchResult={(enemyCard, precomputed, isHost, myName, opponentName) => {
        const adjusted = isHost ? precomputed : { ...precomputed, winner: precomputed.winner === 'player' ? 'enemy' : 'player', pHp: precomputed.eHp, eHp: precomputed.pHp, hpSnaps: precomputed.hpSnaps.map((s: {pHp:number;eHp:number}) => ({ pHp: s.eHp, eHp: s.pHp })), log: precomputed.log };
        setEnemyCard(enemyCard);
        setLog([]);
        setResult(null);
        setPrecomputedBattle(adjusted);
        setOnlineNames({ my: myName, opponent: opponentName });
        setView('battle');
      }}
    />;
  }

  // 団体戦画面
  if (view === 'team') {
    return <TeamBattleView
      collection={collection}
      teamBattleHistory={teamBattleHistory}
      addTeamBattleResult={addTeamBattleResult}
      addBattleResult={addBattleResult}
      onBack={() => setView('menu')}
      t={t}
      battleSpeed={battleSpeed}
      setBattleSpeed={setBattleSpeed}
      battleSort={battleSort}
      setBattleSort={setBattleSort}
      savedTeam={savedTeam}
      setSavedTeam={setSavedTeam}
      savedDecks={savedDecks}
      savedeck={savedeck}
      deleteDeck={deleteDeck}
    />;
  }

  return (
    <div className="min-h-dvh bg-gray-950 text-white py-10 px-4">
      <div className="flex items-center justify-center gap-4 mb-6">
        <button onClick={() => setView('rarity')} className="text-gray-400 hover:text-white transition text-sm">{ t.battle.back}</button>
        <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">{t.battle.randomTitle(kyu)}</h1>
      </div>

      {/* カード選択 */}
      <div className="flex justify-center items-start gap-4 sm:gap-8 mb-8 flex-wrap">
        {/* プレイヤー */}
        <div className={`flex flex-col items-center gap-2 relative ${shake === 'player' ? 'screen-shake' : ''}`}>
          <span className="text-sm text-blue-400 font-bold">{ (onlineNames?.my || playerCard?.displayName) ?? t.battle.you}</span>
          {playerCard && <TcgCard card={playerCard} size="lg" onClick={() => setSelectMode("player")} />}
          {dmgPop?.side === 'player' && <div key={dmgPop.key} className="dmg-pop absolute top-8 left-1/2 -translate-x-1/2 text-2xl font-black text-red-400 pointer-events-none z-10">-{dmgPop.val}</div>}
          {/* HPバー */}
          <div className="w-full max-w-[16rem]">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">HP</span>
              <span className={result ? (result.winner === "player" ? "text-green-400" : "text-red-400") : "text-white"}>
                {pHpLive} / {playerCard?.hp ?? 0}
              </span>
            </div>
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${hpFlash === 'player' ? 'hp-flash' : ''}`}
                style={{ width: `${playerCard ? Math.max(0, pHpLive / playerCard.hp * 100) : 100}%`, background: playerCard && pHpLive / playerCard.hp < 0.25 ? '#ef4444' : playerCard && pHpLive / playerCard.hp < 0.5 ? '#f59e0b' : '#22c55e' }} />
            </div>
          </div>
        </div>

        <div className="text-2xl sm:text-4xl font-black text-gray-600 sm:mt-20">VS</div>

        {/* 敵 */}
        <div className={`flex flex-col items-center gap-2 relative ${shake === 'enemy' ? 'screen-shake' : ''}`}>
          <span className="text-sm text-red-400 font-bold">{onlineNames?.opponent ?? enemyCard?.displayName ?? t.battle.enemy(enemyCard?.rarity ?? kyu)}</span>
          {enemyCard
            ? <TcgCard card={enemyCard} size="lg" />
            : <div className="w-48 sm:w-64 h-[22rem] sm:h-[26rem] bg-gray-800 rounded-xl flex items-center justify-center text-gray-500 animate-pulse">{t.battle.raid.loading}</div>
          }
          {dmgPop?.side === 'enemy' && <div key={dmgPop.key} className="dmg-pop absolute top-8 left-1/2 -translate-x-1/2 text-2xl font-black text-red-400 pointer-events-none z-10">-{dmgPop.val}</div>}
          {/* HPバー */}
          <div className="w-full max-w-[16rem]">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">HP</span>
              <span className={result ? (result.winner === "enemy" ? "text-green-400" : "text-red-400") : "text-white"}>
                {eHpLive} / {enemyCard?.hp ?? 0}
              </span>
            </div>
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${hpFlash === 'enemy' ? 'hp-flash' : ''}`}
                style={{ width: `${enemyCard ? Math.max(0, eHpLive / enemyCard.hp * 100) : 100}%`, background: enemyCard && eHpLive / enemyCard.hp < 0.25 ? '#ef4444' : enemyCard && eHpLive / enemyCard.hp < 0.5 ? '#f59e0b' : '#22c55e' }} />
            </div>
          </div>
        </div>
      </div>

      {/* 速度スライダー */}
      <div className="flex items-center gap-3 text-sm justify-center mb-4">
        <span className="text-gray-400">{t.battle.speed}</span>
        <span className="text-xs text-gray-500">{ t.battle.slow}</span>
        <input type="range" aria-label={t.battle.speedAriaLabel} min={100} max={1200} step={100} value={1300 - battleSpeed}
          onChange={e => setBattleSpeed(1300 - Number(e.target.value))}
          className="w-32 accent-pink-500" />
        <span className="text-xs text-gray-500">{ t.battle.fast}</span>
      </div>

      {/* バトルログ */}
      {log.length > 0 && (
        <div className="max-w-lg mx-auto bg-gray-900 rounded-xl p-4 space-y-1 max-h-40 sm:max-h-64 overflow-y-auto overscroll-contain">
          {log.map((line, i) => (
            <p
              key={i}
              style={{ animationDelay: `${i * 30}ms` }}
              className={`text-sm slide-in-up ${
                line.includes("🏆") ? "text-yellow-400 font-bold text-base" :
                line.includes("💀") ? "text-red-400 font-bold text-base" :
                "text-gray-300"
              }`}
            >
              {line}
            </p>
          ))}
        </div>
      )}

      {selectMode && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectMode(null)}>
          <div className="bg-gray-900 rounded-2xl p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto overscroll-contain" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">{t.battle.selectTitle}</h2>
            <div className="flex flex-wrap gap-3 justify-center">
              {collection.map((card) => (
                <TcgCard key={card.id} card={card} size="sm"
                  onClick={() => { setPlayerCard(card); setSelectMode(null); setLog([]); setResult(null); }} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BattlePage() {
  return (
    <Suspense>
      <BattlePageInner />
    </Suspense>
  );
}
