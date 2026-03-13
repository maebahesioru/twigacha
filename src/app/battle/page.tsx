"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import TcgCard from "@/components/TcgCard";
import { useGameStore } from "@/store/useGameStore";
import { useT } from "@/hooks/useT";
import type { TwitterCard } from "@/types";
import { KYU_CONFIG, generateEnemy, simulateBattle, calcDamage, applySkill, getTodayWeather, type Kyu } from "@/lib/battle";
import { isBirthday } from "@/lib/card";
import { VsIdScreen } from "./VsIdScreen";
import { OnlineBattleView } from "./OnlineViews";
import { TeamBattleView } from "./TeamBattleView";
import { RaidViews } from "./RaidViews";
import QuestView, { getStageFilters, normalizeEnemy, STAGE_ENEMY_SCALE } from "./QuestView";
import { BattleMenuView } from "./BattleMenuView";
import { BattleView } from "./BattleView";
import { ReplayView } from "./ReplayView";
import { ResultView } from "./ResultView";
import { playAttack, playVictory, playDefeat, playRaidHit, playHit } from "@/lib/audio";

function BattlePageInner() {
  const { collection, markBattle, addBattleResult, battleHistory,
    raidDate, raidBossMaxHp, raidBossHp, raidBossCard, raidCleared, raidDeck, raidUsedCards,
    setRaidDeck, damageRaidBoss, addRaidUsedCards, initRaid, clearRaid, incrementRaidClearCount, raidHistory, addRaidHistory,
    teamBattleHistory, addTeamBattleResult, savedTeam, setSavedTeam, savedDecks, savedeck, deleteDeck,
    battleSpeed, setBattleSpeed, battleSort, setBattleSort, updateCard, markRaidMission, claimBirthdayBonus, markShare,
    questCleared, questBestStreak, claimQuestReward, setQuestBestStreak, favorites } = useGameStore();
  const [localSpeed, setLocalSpeed] = useState(battleSpeed);
  const battleSpeedRef = useRef(localSpeed);
  useEffect(() => { battleSpeedRef.current = localSpeed; setBattleSpeed(localSpeed); }, [localSpeed]);
  useEffect(() => { battleSpeedRef.current = battleSpeed; }, [battleSpeed]);
  const t = useT();
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code') ?? '';
  const [view, setView] = useState<'menu' | 'select' | 'rarity' | 'battle' | 'result' | 'raid' | 'raid-battle' | 'raid-result' | 'vs-id' | 'team' | 'online' | 'replay' | 'quest'>('menu');
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
  const [autoRepeat, setAutoRepeat] = useState(false);
  const [repeatCount, setRepeatCount] = useState(0);
  const [replayIdx, setReplayIdx] = useState(0);
  const [replayCards, setReplayCards] = useState<{p: import("@/types").TwitterCard; e: import("@/types").TwitterCard; hpSnaps: {pHp:number;eHp:number}[]} | null>(null);
  const [replayFrom, setReplayFrom] = useState<'rarity' | 'team' | 'result' | 'battle' | 'online' | 'raid' | 'select' | 'menu' | 'raid-battle' | 'raid-result' | 'vs-id' | 'replay' | 'quest'>('menu');
  const [replayRaidSnaps, setReplayRaidSnaps] = useState<{ cardIdx: number; card: import("@/types").TwitterCard; cardHp: number; bossHp: number }[] | null>(null);
  const [replayBossCard, setReplayBossCard] = useState<import("@/types").TwitterCard | null>(null);
  const [replayBossMaxHp, setReplayBossMaxHp] = useState(0);
  const [replayRaidCardHp, setReplayRaidCardHp] = useState(0);
  const [replayRaidBossHp, setReplayRaidBossHp] = useState(0);
  const [replayRaidCard, setReplayRaidCard] = useState<import("@/types").TwitterCard | null>(null);
  const [replayPHp, setReplayPHp] = useState(0);
  const [replayEHp, setReplayEHp] = useState(0);
  const [replayShake, setReplayShake] = useState<'player'|'enemy'|null>(null);
  const [replayDmgPop, setReplayDmgPop] = useState<{side:'player'|'enemy';val:number;key:number}|null>(null);
  const [replayHpFlash, setReplayHpFlash] = useState<'player'|'enemy'|null>(null);
  const [replayRounds, setReplayRounds] = useState<{p: import("@/types").TwitterCard; e: import("@/types").TwitterCard; hpSnaps: {pHp:number;eHp:number}[]; log: string[]}[] | null>(null);
  const [replayRoundIdx, setReplayRoundIdx] = useState(0);
  const [onlineNames, setOnlineNames] = useState<{ my: string; opponent: string } | null>(null);
  const [pHpLive, setPHpLive] = useState(0);
  const [eHpLive, setEHpLive] = useState(0);
  const [selectMode, setSelectMode] = useState<"player" | "enemy" | null>(null);
  const [questStageIdx, setQuestStageIdx] = useState<number | null>(null);
  const [questStreak, setQuestStreak] = useState(0);

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

  const raidReplay = (log: string[], snaps?: { cardIdx: number; card: import("@/types").TwitterCard; cardHp: number; bossHp: number }[], bossCard?: import("@/types").TwitterCard, bossMaxHp?: number) => {
    setLog(log); setReplayCards(null); setReplayRaidSnaps(snaps ?? null);
    setReplayBossCard(bossCard ?? null); setReplayBossMaxHp(bossMaxHp ?? 0);
    setReplayRounds(null); setReplayFrom(view); setReplayIdx(0); setView('replay');
  };

  const loadRaidBoss = useCallback(async () => {
    if (raidDate === todayStr && raidBossCard) return;
    setRaidBossLoading(true);
    try {
      const res = await fetch('/api/gacha?count=1');
      const data = await res.json();
      const card: TwitterCard = Array.isArray(data) ? data[0] : data;
      if (!card || (card as unknown as { error?: string }).error) return;
      // {t.battle.raid.bossHp}はカードの10倍
      const maxHp = Math.max(card.hp * 50, 5000);
      const boss: TwitterCard = { ...card,
        hp: maxHp,
        atk: Math.max(Math.round(card.atk * 3.0), 300),
        def: Math.max(Math.round(card.def * 3.0), 300),
        spd: Math.max(Math.round(card.spd * 1.5), 200),
        int: Math.max(Math.round(card.int * 2.0), 200),
        luk: Math.max(Math.round(card.luk * 1.5), 200),
        rarity: "LR",
      };
      initRaid(todayStr, boss, maxHp);
    } finally {
      setRaidBossLoading(false);
    }
  }, [raidDate, raidBossCard, todayStr]);

  const generateAndSetEnemy = useCallback(async (targetKyu: Kyu) => {
    const kyuHistory = battleHistory.filter(b => b.kyu === targetKyu);
    const winRate = kyuHistory.length >= 3 ? kyuHistory.filter(b => b.winner === 'player').length / kyuHistory.length : 0.5;
    const b = 0.8 + winRate * 0.8;
    const boosted = (c: TwitterCard) => ({ ...c,
      atk: Math.round(c.atk * b), def: Math.round(c.def * b),
      spd: Math.round(c.spd * b), hp: Math.round(c.hp * b),
      int: Math.round(c.int * b), luk: Math.round(c.luk * b),
    });
    const fetchUlts = async (username: string) => {
      try { const d = await fetch(`/api/gacha?username=${encodeURIComponent(username)}`).then(r => r.json()); return d.ultimates ?? []; } catch { return []; }
    };
    try {
      const res = await fetch('/api/gacha?count=5');
      const data = await res.json();
      const cards: TwitterCard[] = data.filter((c: { error?: string }) => c && !c.error) as TwitterCard[];
      const exact = cards.find(c => c.rarity === targetKyu);
      if (exact) {
        const ults = await fetchUlts(exact.username);
        setEnemyCard(boosted({ ...exact, ultimates: ults }));
      } else if (cards[0]) {
        const { min, max } = KYU_CONFIG[targetKyu];
        const target = Math.round((min + max) / 2) * 6;
        const base = cards[0];
        const total = base.atk + base.def + base.spd + base.hp + base.int + base.luk;
        const r = target / Math.max(total, 1);
        const ults = await fetchUlts(base.username);
        setEnemyCard(boosted({ ...base, rarity: targetKyu,
          atk: Math.round(base.atk * r), def: Math.round(base.def * r),
          spd: Math.round(base.spd * r), hp: Math.round(base.hp * r),
          int: Math.round(base.int * r), luk: Math.round(base.luk * r),
          ultimates: ults,
        }));
      } else {
        setEnemyCard(boosted(generateEnemy(targetKyu)));
      }
    } catch {
      setEnemyCard(boosted(generateEnemy(targetKyu)));
    }
  }, [battleHistory]);

  const startBattle = useCallback(async () => {
    if (!playerCard || !enemyCard) return;
    setBattling(true);
    setResult(null);
    const isBday = isBirthday(playerCard.joined);
    const birthdayCard = isBday ? { ...playerCard, atk: Math.round(playerCard.atk * 1.1), def: Math.round(playerCard.def * 1.1), spd: Math.round(playerCard.spd * 1.1), hp: Math.round(playerCard.hp * 1.1), int: Math.round(playerCard.int * 1.1), luk: Math.round(playerCard.luk * 1.1) } : playerCard;
    setPHpLive(birthdayCard.hp);
    setEHpLive(enemyCard.hp);
    await new Promise((r) => setTimeout(r, 300));
    const { log: battleLog, hpSnaps, winner, pHp, eHp, turns, ko } = precomputedBattle ?? simulateBattle(birthdayCard, enemyCard, useGameStore.getState().lang, isBday ? 0.5 : 0.25);
    setPrecomputedBattle(null);
    let prevPHp = playerCard.hp, prevEHp = enemyCard.hp;
    for (let i = 0; i < battleLog.length; i++) {
      await new Promise((r) => setTimeout(r, battleSpeedRef.current));
      setLog((prev) => [...prev, battleLog[i]]);
      const snap = hpSnaps[i] ?? hpSnaps[hpSnaps.length - 1];
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
    addBattleResult({ winner: winner as 'player' | 'enemy', turns, kyu, playerCardId: playerCard.id, opponentName: onlineNames?.opponent, pHp, ko, playerCardRarity: playerCard.rarity, enemyCardRarity: enemyCard.rarity, mode: selectFor === 'battle' && !onlineNames ? 'random' : 'other', log: battleLog, hpSnaps, playerSnap: playerCard, enemySnap: enemyCard });
    if (winner === 'player' && isBday) {
      const given = claimBirthdayBonus();
      if (given) {
        const store = useGameStore.getState();
        const count = store.birthdayBonusDate === new Date().toDateString() ? store.birthdayBonusCount : 1;
        setTimeout(() => alert(t.gacha.birthdayBonus(count, 5)), 1500);
      }
    }
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

  // 周回モード：リザルト表示後に自動で次の敵を生成して再戦
  const autoRepeatRef = useRef(autoRepeat);
  useEffect(() => { autoRepeatRef.current = autoRepeat; }, [autoRepeat]);
  useEffect(() => {
    if (view === 'result' && result && autoRepeatRef.current) {
      const timer = setTimeout(async () => {
        if (!autoRepeatRef.current) return;
        setRepeatCount(n => n + 1);
        setLog([]);
        setResult(null);
        setEnemyCard(null);
        setView('battle');
        await generateAndSetEnemy(kyu);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [view, result]);

  // リプレイ自動再生はReplayView内で処理

  useEffect(() => {
    if (view === 'raid') loadRaidBoss();
  }, [view]);

  // レイドリプレイ自動再生はReplayView内で処理

  // quest result side effects
  useEffect(() => {
    if (view !== 'result' || !result || questStageIdx === null) return;
    const q = t.battle.quest;
    const questStage = q.stages[questStageIdx];
    const win = result.winner === 'player';
    if (win) {
      const newStreak = questStreak + 1;
      setQuestStreak(newStreak);
      if (questStage.wins > 0 && newStreak >= questStage.wins && !questCleared.includes(questStageIdx)) {
        claimQuestReward(questStageIdx, questStage.reward);
      }
    } else if (questStage.wins === 0) {
      setQuestBestStreak(questStreak);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, result]);
  const startRaidBattle = useCallback(async () => {
    if (raidRunning || raidDeck.length === 0 || !raidBossCard) return;
    setRaidRunning(true);
    setRaidLog([]);
    setRaidResult(null);
    setRaidTotalDmg(0);
    const raidLogs: string[] = [];

    const deck = raidDeck.map(id => collection.find(c => c.id === id)).filter(Boolean) as TwitterCard[];
    let bossHp = raidBossHp > 0 ? raidBossHp : raidBossCard.hp;
    setRaidBossHpLive(bossHp);

    let totalDmg = 0;
    let totalTurns = 0;
    const raidSnaps: { cardIdx: number; card: TwitterCard; cardHp: number; bossHp: number }[] = [];
    const boss = { ...raidBossCard, hp: bossHp };

    for (let ci = 0; ci < deck.length && bossHp > 0; ci++) {
      const rawCard = deck[ci];
      setRaidCurrentCard(rawCard);
      const card = applySkill(rawCard);
      setRaidCurrentCardHp(card.hp);
      await new Promise(r => setTimeout(r, battleSpeedRef.current));
      raidLogs.push(t.battle.raidSortie(card.element, card.username)); setRaidLog(prev => [...prev, t.battle.raidSortie(card.element, card.username)]);
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
        raidSnaps.push({ cardIdx: ci, card: rawCard, cardHp, bossHp });
        raidLogs.push(`Turn ${turn}: ${t.battle.raid.bossDmg(card.username, d1, c1, t1, w1)}`); setRaidLog(prev => [...prev, `Turn ${turn}: ${t.battle.raid.bossDmg(card.username, d1, c1, t1, w1)}`]);
        if (bossHp <= 0) break;
        const { dmg: d2, isCrit: c2, isType: t2, isWeak: w2 } = calcDamage(boss.atk, card.def, boss.int, boss.luk, boss.element, card.element);
        cardHp = Math.max(0, cardHp - d2);
        setRaidCurrentCardHp(cardHp);
        playHit();
        raidSnaps.push({ cardIdx: ci, card: rawCard, cardHp, bossHp });
        raidLogs.push(`Turn ${turn}: ${t.battle.raid.bossAtk(card.username, d2, c2, t2, w2)}`); setRaidLog(prev => [...prev, `Turn ${turn}: ${t.battle.raid.bossAtk(card.username, d2, c2, t2, w2)}`]);
        turn++;
        totalTurns++;
      }
      if (cardHp <= 0) raidLogs.push(`💀 @${card.username} defeated...`); setRaidLog(prev => [...prev, `💀 @${card.username} defeated...`]);
    }

    setRaidTotalDmg(totalDmg);
    damageRaidBoss(totalDmg);
    addRaidUsedCards(deck.map(c => c.id));
    setRaidDeck(raidDeck.filter(id => !deck.find(c => c.id === id)));
    const cleared = bossHp <= 0;
    if (cleared) { clearRaid(); incrementRaidClearCount(); }
    addRaidHistory({ date: new Date().toLocaleDateString(), bossName: raidBossCard.displayName, totalDmg, cleared, log: raidLogs, snaps: raidSnaps });
    markRaidMission();
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
    return <BattleMenuView t={t} collection={collection} battleHistory={battleHistory}
      raidHistory={raidHistory} raidBossCard={raidBossCard} raidBossMaxHp={raidBossMaxHp}
      setView={setView} setSelectFor={setSelectFor} setPlayerCard={setPlayerCard}
      setEnemyCard={setEnemyCard} setLog={setLog} setResult={setResult}
      onReplay={(log, cards) => { setLog(log); if (cards) { setReplayCards(cards); setReplayPHp(cards.p.hp); setReplayEHp(cards.e.hp); } else { setReplayCards(null); } setReplayRounds(null); setReplayFrom(view); setReplayIdx(0); setView('replay'); }}
      onReplayRaid={raidReplay}
    />;
  }


  // カード選択画面
  if (view === 'select') {
    const q = t.battle.quest;
    const questStage = questStageIdx !== null ? q.stages[questStageIdx] : null;
    const stageFilters = questStageIdx !== null ? getStageFilters(collection, favorites, questCleared) : null;
    const questFilter = stageFilters && questStageIdx !== null ? stageFilters[questStageIdx] : null;
    const filtered = sortBattle(collection.filter(c =>
      (questFilter ? questFilter(c) : true) &&
      (rarityFilter === "ALL" || c.rarity === rarityFilter) &&
      (!search || c.username.includes(search) || c.displayName.includes(search))
    ));
    return (
      <div className="min-h-dvh bg-gray-950 text-white py-10 px-4">
        <div className="flex items-center gap-4 mb-6 justify-center">
          <button onClick={() => questStageIdx !== null ? setView('quest') : setView('menu')} className="text-gray-400 hover:text-white transition text-sm">{ t.battle.back}</button>
          <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
            {questStage ? questStage.title : t.battle.selectTitle}
          </h1>
        </div>
        {questStage && <p className="text-center text-sm text-gray-400 mb-4">{q.condition}: {questStage.condition}</p>}

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
          {questStageIdx !== null ? (
            <button disabled={!playerCard} onClick={async () => {
              if (!playerCard || questStageIdx === null) return;
              setLog([]); setResult(null); setEnemyCard(null); setView('battle');
              const res = await fetch("/api/gacha?count=1");
              const data = await res.json();
              const raw: TwitterCard = Array.isArray(data) ? data[0] : data;
              if (raw && !(raw as { error?: string }).error) setEnemyCard(normalizeEnemy(raw, STAGE_ENEMY_SCALE[questStageIdx]));
            }} className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl font-bold text-lg hover:opacity-90 disabled:opacity-40 transition">
              {t.battle.startBattle}
            </button>
          ) : selectFor === 'battle' ? (<>
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

  // リプレイ画面
  if (view === 'replay') {
    return <ReplayView
      replayCards={replayCards} replayRaidSnaps={replayRaidSnaps} replayBossCard={replayBossCard}
      replayBossMaxHp={replayBossMaxHp} replayIdx={replayIdx} setReplayIdx={setReplayIdx}
      replayPHp={replayPHp} setReplayPHp={setReplayPHp} replayEHp={replayEHp} setReplayEHp={setReplayEHp}
      replayRaidCard={replayRaidCard} setReplayRaidCard={setReplayRaidCard}
      replayRaidCardHp={replayRaidCardHp} setReplayRaidCardHp={setReplayRaidCardHp}
      replayRaidBossHp={replayRaidBossHp} setReplayRaidBossHp={setReplayRaidBossHp}
      replayShake={replayShake} setReplayShake={setReplayShake}
      replayDmgPop={replayDmgPop} setReplayDmgPop={setReplayDmgPop}
      replayHpFlash={replayHpFlash} setReplayHpFlash={setReplayHpFlash}
      replayRounds={replayRounds} replayRoundIdx={replayRoundIdx} setReplayRoundIdx={setReplayRoundIdx}
      setReplayCards={setReplayCards} setReplayPHpDirect={setReplayPHp} setReplayEHpDirect={setReplayEHp}
      log={log} localSpeed={localSpeed} setLocalSpeed={setLocalSpeed}
      replayFrom={replayFrom} setView={setView}
    />;
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
            setRepeatCount(0);
            await generateAndSetEnemy(kyu);
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
    return <ResultView
      result={result} playerCard={playerCard} enemyCard={enemyCard} kyu={kyu} log={log}
      onlineNames={onlineNames} questStageIdx={questStageIdx} questStreak={questStreak}
      autoRepeat={autoRepeat} setAutoRepeat={setAutoRepeat} repeatCount={repeatCount}
      onRematch={() => { setLog([]); setResult(null); setView('battle'); }}
      onChangeKyu={() => { setEnemyCard(null); setLog([]); setResult(null); setView('rarity'); }}
      onChangeCard={() => { setLog([]); setResult(null); setView('select'); }}
      onMenu={() => setView('menu')}
      onNextEnemy={async () => {
        if (!playerCard || questStageIdx === null) return;
        setLog([]); setResult(null); setEnemyCard(null); setView('battle');
        const res = await fetch("/api/gacha?count=1");
        const data = await res.json();
        const raw: TwitterCard = Array.isArray(data) ? data[0] : data;
        if (raw && !(raw as { error?: string }).error) setEnemyCard(normalizeEnemy(raw, STAGE_ENEMY_SCALE[questStageIdx]));
      }}
      onRetry={() => { setQuestStreak(0); setLog([]); setResult(null); setEnemyCard(null); setView('select'); }}
      onBackToQuest={() => { setQuestStageIdx(null); setQuestStreak(0); setLog([]); setResult(null); setEnemyCard(null); setView('quest'); }}
    />;
  }

  // レイド{t.battle.raid.deckSelect}画面
  // レイド画面群
  if (view === 'raid' || view === 'raid-battle' || view === 'raid-result') {
    return <RaidViews t={t} view={view} setView={setView}
      raidBossLoading={raidBossLoading} raidBossCard={raidBossCard} raidBossHp={raidBossHp}
      raidBossMaxHp={raidBossMaxHp} raidCleared={raidCleared} raidDeck={raidDeck}
      setRaidDeck={setRaidDeck} raidUsedCards={raidUsedCards} raidLog={raidLog}
      raidRunning={raidRunning} raidResult={raidResult} raidBossHpLive={raidBossHpLive}
      raidHpFlash={raidHpFlash} raidCurrentCard={raidCurrentCard} raidCurrentCardHp={raidCurrentCardHp}
      raidHistory={raidHistory} collection={collection} battleSpeed={battleSpeed}
      setBattleSpeed={setBattleSpeed} battleSort={battleSort} setBattleSort={setBattleSort}
      search={search} setSearch={setSearch} sortBattle={sortBattle}
      onlineNames={onlineNames} playerCard={playerCard} todayStr={todayStr}
      startRaidBattle={startRaidBattle}
      setRaidLog={setRaidLog as (fn: (p: string[]) => string[]) => void}
      setRaidResult={setRaidResult as (r: null) => void}
      onReplay={raidReplay}
    />;
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
      onReplay={(log, cards) => { setLog(log); if (cards) { setReplayCards(cards); setReplayPHp(cards.p.hp); setReplayEHp(cards.e.hp); } else { setReplayCards(null); } setReplayRounds(null); setReplayFrom(view); setReplayIdx(0); setView('replay'); }}
      onReplayAll={(rounds) => { const first = rounds[0]; setLog(first.log); setReplayCards(first); setReplayPHp(first.p.hp); setReplayEHp(first.e.hp); setReplayRounds(rounds); setReplayRoundIdx(0); setReplayFrom(view); setReplayIdx(0); setView('replay'); }}
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

  if (view === 'quest') {
    return <QuestView collection={collection} onBack={() => { setQuestStageIdx(null); setView('menu'); }} onSelectStage={async (idx) => {
      setQuestStageIdx(idx); setQuestStreak(0); setLog([]); setResult(null);
      // 第50章: ランダム1枚で即バトル
      const isFinal = t.battle.quest.stages[idx]?.wins === 10 && idx === 50;
      const isSolo = idx === 54; // 第55章: 一騎当千
      if ((isFinal || isSolo) && collection.length > 0) {
        const rand = collection[Math.floor(Math.random() * collection.length)];
        setPlayerCard(rand); setEnemyCard(null); setView('battle');
        const res = await fetch("/api/gacha?count=1");
        const data = await res.json();
        const raw: TwitterCard = Array.isArray(data) ? data[0] : data;
        if (raw && !(raw as { error?: string }).error) setEnemyCard(normalizeEnemy(raw, STAGE_ENEMY_SCALE[idx]));
      } else {
        setPlayerCard(null); setEnemyCard(null); setView('select');
      }
    }} />;
  }

  return (
    <BattleView
      playerCard={playerCard!} enemyCard={enemyCard} pHpLive={pHpLive} eHpLive={eHpLive}
      shake={shake} dmgPop={dmgPop} hpFlash={hpFlash} log={log}
      localSpeed={localSpeed} setLocalSpeed={setLocalSpeed} kyu={kyu}
      onlineNames={onlineNames} result={result} selectMode={selectMode} setSelectMode={setSelectMode}
      collection={collection}
      onSelectCard={(card) => { setPlayerCard(card); setSelectMode(null); setLog([]); setResult(null); }}
    />
  );
}

export default function BattlePage() {
  return (
    <Suspense>
      <BattlePageInner />
    </Suspense>
  );
}
