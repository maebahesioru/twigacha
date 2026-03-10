"use client";
import { getTodayWeather } from "@/lib/battle";
import type { TwitterCard } from "@/types";

type T = ReturnType<typeof import("@/hooks/useT").useT>;
type BattleEntry = { winner: 'player'|'enemy'; turns: number; kyu: string; playerCardId: string; opponentName?: string; log?: string[]; hpSnaps?: {pHp:number;eHp:number}[]; playerSnap?: TwitterCard; enemySnap?: TwitterCard; playerCardRarity?: string; enemyCardRarity?: string; mode?: string };

type RaidSnap = { cardIdx: number; card: TwitterCard; cardHp: number; bossHp: number };
type RaidHistoryEntry = { date: string; bossName: string; totalDmg: number; cleared: boolean; log?: string[]; snaps?: RaidSnap[] };

interface Props {
  t: T;
  collection: TwitterCard[];
  battleHistory: BattleEntry[];
  raidHistory: RaidHistoryEntry[];
  raidBossCard: TwitterCard | null;
  raidBossMaxHp: number;
  setView: (v: string) => void;
  setSelectFor: (v: 'battle'|'online') => void;
  setPlayerCard: (c: TwitterCard | null) => void;
  setEnemyCard: (c: TwitterCard | null) => void;
  setLog: (l: string[]) => void;
  setResult: (r: null) => void;
  onReplay: (log: string[], cards?: { p: TwitterCard; e: TwitterCard; hpSnaps: {pHp:number;eHp:number}[] }) => void;
  onReplayRaid: (log: string[], snaps?: RaidSnap[], bossCard?: TwitterCard, bossMaxHp?: number) => void;
}

export function BattleMenuView({ t, collection, battleHistory, raidHistory, raidBossCard, raidBossMaxHp, setView, setSelectFor, setPlayerCard, setEnemyCard, setLog, setResult, onReplay, onReplayRaid }: Props) {
  const KYU_LIST = ["LR","UR","SSR","SR","R","N","C"];
  const total = battleHistory.length;
  const wins = battleHistory.filter(b => b.winner === 'player').length;
  const losses = battleHistory.filter(b => b.winner === 'enemy').length;
  const draws = total - wins - losses;
  const winRate = total > 0 ? (wins / total * 100).toFixed(1) : "0.0";
  const avgTurns = total > 0 ? (battleHistory.reduce((s, b) => s + b.turns, 0) / total).toFixed(1) : "0.0";
  let maxStreak = 0, curStreak = 0;
  for (const b of battleHistory) { if (b.winner === 'player') { curStreak++; maxStreak = Math.max(maxStreak, curStreak); } else curStreak = 0; }
  const currentStreak = curStreak;
  const kyuStats = KYU_LIST.map(k => {
    const ks = battleHistory.filter(b => b.kyu === k);
    const kw = ks.filter(b => b.winner === 'player').length;
    const kl = ks.filter(b => b.winner === 'enemy').length;
    return { k, total: ks.length, wins: kw, losses: kl, draws: ks.length - kw - kl,
      winRate: ks.length > 0 ? (kw / ks.length * 100).toFixed(1) : "0.0",
      avgTurns: ks.length > 0 ? (ks.reduce((s, b) => s + b.turns, 0) / ks.length).toFixed(1) : "0.0" };
  });
  const cardMap = new Map<string, { wins: number; total: number; card: TwitterCard | undefined }>();
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
      .map(([id, v]) => ({ id, ...v, winRate: v.total > 0 ? v.wins / v.total * 100 : 0, wl: `${v.wins}-${v.total - v.wins}-0` }))
      .sort((a, b) => (b.total >= 3 ? 1 : -1) - (a.total >= 3 ? 1 : -1) || b.winRate - a.winRate)
  })).filter(r => r.cards.length > 0);

  return (
    <div className="min-h-dvh bg-gray-950 text-white py-10 px-4 flex flex-col items-center gap-6 slide-in-up">
      <h1 className="text-2xl sm:text-4xl font-black bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">{t.battle.title}</h1>
      <div className="text-sm font-bold px-4 py-2 rounded-xl bg-sky-900/60 border border-sky-500/40 text-sky-300">{t.battle.weather(getTodayWeather())}</div>
      <div className="grid grid-cols-2 gap-3 w-full max-w-2xl">
        <button onClick={() => { setSelectFor('battle'); setView('select'); setPlayerCard(null); setEnemyCard(null); setLog([]); setResult(null); }}
          className="ripple-btn flex-1 py-4 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl font-bold text-lg hover:opacity-90 transition shadow-lg shadow-red-500/30 text-left px-5">
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
        <h2 className="text-lg font-bold text-gray-300">{t.battle.kyuStats}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[400px] text-sm text-center">
            <thead><tr className="text-gray-400 border-b border-gray-700">
              {t.battle.kyuHeaders.map(h => <th key={h} className="py-2 px-2">{h}</th>)}
            </tr></thead>
            <tbody>
              {kyuStats.map(({ k, total: tot, wins: w, losses: l, draws: d, winRate: wr, avgTurns: at }) => {
                const lastEntry = [...battleHistory].reverse().find(b => b.kyu === k);
                return (
                  <tr key={k} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="py-2 px-2 font-bold">{k}</td>
                    <td>{tot}</td><td className="text-green-400">{w}</td>
                    <td className="text-red-400">{l}</td><td>{d}</td>
                    <td>{wr}%</td><td>{at}</td>
                    <td>{lastEntry?.hpSnaps && lastEntry.playerSnap && lastEntry.enemySnap &&
                      <button onClick={() => onReplay(lastEntry.log!, { p: lastEntry.playerSnap!, e: lastEntry.enemySnap!, hpSnaps: lastEntry.hpSnaps! })}
                        className="text-xs px-2 py-1 bg-purple-700 rounded-lg hover:bg-purple-600 transition">▶</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
        {battleHistory.filter(b => b.opponentName).length > 0 && (
          <>
            <h2 className="text-lg font-bold text-gray-300">{t.battle.onlineHistoryTitle}</h2>
            <div className="space-y-1">
              {[...battleHistory].reverse().filter(b => b.opponentName).slice(0, 10).map((b, i) => (
                <div key={i} className="flex justify-between items-center bg-gray-800/60 rounded-lg px-3 py-2 text-sm">
                  <span className="text-gray-300">vs {b.opponentName}</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${b.winner === 'player' ? 'text-green-400' : 'text-red-400'}`}>
                      {b.winner === 'player' ? t.battle.result.win : t.battle.result.lose}
                    </span>
                    {b.hpSnaps && b.playerSnap && b.enemySnap && (
                      <button onClick={() => onReplay(b.log!, { p: b.playerSnap!, e: b.enemySnap!, hpSnaps: b.hpSnaps! })}
                        className="text-xs px-2 py-1 bg-purple-700 rounded-lg hover:bg-purple-600 transition">▶</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {raidHistory.filter(h => h.log).length > 0 && (
          <>
            <h2 className="text-lg font-bold text-gray-300">{t.battle.raidHistoryTitle}</h2>
            <div className="space-y-1">
              {raidHistory.slice(0, 10).map((h, i) => (
                <div key={i} className="flex justify-between items-center bg-gray-800/60 rounded-lg px-3 py-2 text-xs">
                  <span className="text-gray-400">{h.date}</span>
                  <span className="text-gray-300 truncate mx-2">{h.bossName}</span>
                  <span className="text-gray-300">{h.totalDmg.toLocaleString()}dmg</span>
                  <span className={`font-bold ml-2 ${h.cleared ? 'text-yellow-400' : 'text-orange-400'}`}>{h.cleared ? t.battle.raid.defeatedLabel : t.battle.raid.challengeLabel}</span>
                  {h.log && <button onClick={() => onReplayRaid(h.log!, h.snaps, raidBossCard ?? undefined, raidBossMaxHp)} className="ml-2 px-2 py-1 bg-purple-700 rounded-lg hover:bg-purple-600 transition">▶</button>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
