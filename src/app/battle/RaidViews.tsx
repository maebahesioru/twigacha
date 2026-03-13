"use client";
import TcgCard from "@/components/TcgCard";
import Confetti from "@/components/Confetti";
import type { TwitterCard } from "@/types";

type T = ReturnType<typeof import("@/hooks/useT").useT>;
type RaidSnap = { cardIdx: number; card: import("@/types").TwitterCard; cardHp: number; bossHp: number };
type RaidHistory = { date: string; bossName: string; totalDmg: number; cleared: boolean; log?: string[]; snaps?: RaidSnap[] };

interface RaidProps {
  t: T;
  view: string;
  setView: (v: 'rarity' | 'team' | 'result' | 'battle' | 'online' | 'raid' | 'select' | 'menu' | 'raid-battle' | 'raid-result' | 'vs-id' | 'replay') => void;
  raidBossLoading: boolean;
  raidBossCard: TwitterCard | null;
  raidBossHp: number;
  raidBossMaxHp: number;
  raidCleared: boolean;
  raidDeck: string[];
  setRaidDeck: (d: string[]) => void;
  raidUsedCards: string[];
  raidLog: string[];
  raidRunning: boolean;
  raidResult: { cleared: boolean; totalDmg: number; turns: number } | null;
  raidBossHpLive: number;
  raidHpFlash: boolean;
  raidCurrentCard: TwitterCard | null;
  raidCurrentCardHp: number;
  raidHistory: RaidHistory[];
  collection: TwitterCard[];
  battleSpeed: number;
  setBattleSpeed: (v: number) => void;
  battleSort: 'atk' | 'def' | 'spd' | 'hp' | 'int' | 'luk' | 'rarity' | 'id' | 'name' | 'pulledAt';
  setBattleSort: (v: 'atk' | 'def' | 'spd' | 'hp' | 'int' | 'luk' | 'rarity' | 'id' | 'name' | 'pulledAt') => void;
  search: string;
  setSearch: (v: string) => void;
  sortBattle: (cards: TwitterCard[]) => TwitterCard[];
  onlineNames: { my: string; opponent: string } | null;
  playerCard: TwitterCard | null;
  todayStr: string;
  startRaidBattle: () => void;
  setRaidLog: (fn: (p: string[]) => string[]) => void;
  setRaidResult: (r: null) => void;
  onReplay: (log: string[], snaps?: RaidSnap[], bossCard?: import("@/types").TwitterCard, bossMaxHp?: number) => void;
}

export function RaidViews(p: RaidProps) {
  const { t, view, setView, raidBossLoading, raidBossCard, raidBossHp, raidBossMaxHp, raidCleared,
    raidDeck, setRaidDeck, raidUsedCards, raidLog, raidRunning, raidResult, raidBossHpLive,
    raidHpFlash, raidCurrentCard, raidCurrentCardHp, raidHistory, collection, battleSpeed,
    setBattleSpeed, battleSort, setBattleSort, search, setSearch, sortBattle, onlineNames,
    playerCard, todayStr, startRaidBattle, setRaidLog, setRaidResult, onReplay } = p;

  if (view === 'raid') {
    if (raidBossLoading || !raidBossCard) return (
      <div className="min-h-dvh bg-gray-950 text-white flex flex-col items-center justify-center gap-4">
        <div className="text-gray-400 animate-pulse text-lg">🔥 {t.battle.raid.loading}...</div>
        <button onClick={() => setView('menu')} className="text-gray-500 text-sm hover:text-white">{t.battle.back}</button>
      </div>
    );
    const currentBossHp = raidBossHp > 0 ? raidBossHp : raidBossCard.hp;
    const currentBossMaxHp = raidBossMaxHp > 0 ? raidBossMaxHp : raidBossCard.hp;
    const cleared = raidCleared;
    const hpPct = currentBossMaxHp > 0 ? Math.max(0, currentBossHp / currentBossMaxHp * 100) : 100;
    const deck = raidDeck.filter(id => collection.find(c => c.id === id));
    const toggleDeck = (id: string) => {
      if (raidUsedCards.includes(id)) return;
      if (deck.includes(id)) setRaidDeck(deck.filter(x => x !== id));
      else if (deck.length < 10) setRaidDeck([...deck, id]);
    };
    return (
      <div className="min-h-dvh bg-gray-950 text-white py-10 px-4 flex flex-col items-center gap-6">
        <div className="flex items-center gap-4 w-full max-w-2xl">
          <button onClick={() => setView('menu')} className="text-gray-400 hover:text-white text-sm">{t.battle.back}</button>
          <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">{t.battle.raid.title}</h1>
        </div>
        <div className="w-full max-w-2xl bg-gray-800/60 rounded-2xl p-5 border border-orange-500/30">
          <div className="flex flex-col sm:flex-row gap-4 items-start mb-3">
            <div style={{ pointerEvents: 'none' }}><TcgCard card={raidBossCard} size="lg" /></div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-orange-400 font-bold mb-1">{t.battle.raid.todayBoss}</div>
              {cleared && <div className="text-green-400 font-bold mb-2">✅ {t.battle.raid.cleared}</div>}
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">{t.battle.raid.bossHp}</span>
                <span className="font-bold">{currentBossHp.toLocaleString()} / {currentBossMaxHp.toLocaleString()}</span>
              </div>
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-500" style={{ width: `${hpPct}%` }} />
              </div>
              <button onClick={() => { setRaidLog(() => []); setRaidResult(null); setView('raid-battle'); startRaidBattle(); }}
                disabled={deck.length === 0 || cleared}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl font-bold text-lg hover:opacity-90 disabled:opacity-40 transition">
                {cleared ? t.battle.raid.clearedBtn : deck.length === 0 ? t.battle.raid.noCards : t.battle.raid.challenge(deck.length)}
              </button>
            </div>
          </div>
        </div>
        <div className="w-full max-w-4xl">
          <div className="flex justify-between items-center mb-3">
            <span className="font-bold text-gray-300">{t.battle.raid.deckSelect} <span className="text-gray-500 text-sm">({deck.length}/10)</span></span>
            {deck.length > 0 && <button onClick={() => setRaidDeck([])} className="text-xs text-gray-500 hover:text-red-400">{t.battle.raid.deckClear}</button>}
          </div>
          <div className="flex flex-wrap gap-2 justify-center items-center mb-2">
            <span className="text-gray-400 text-sm font-bold">{t.collection.sort}</span>
            {(Object.entries(t.collection.sortKeys) as [string, string][]).filter(([k]) => ["pulledAt","rarity","name","atk","def","spd","hp","int","luk"].includes(k)).map(([key, label]) => (
              <button key={key} onClick={() => setBattleSort(key as 'atk' | 'def' | 'spd' | 'hp' | 'int' | 'luk' | 'rarity' | 'id' | 'name' | 'pulledAt')}
                className={`px-3 py-1 rounded-full text-sm font-bold transition ${battleSort === key ? "bg-orange-500 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>{label}</button>
            ))}
          </div>
          <div className="flex justify-center mb-4">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.collection.search}
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm w-full max-w-xs focus:outline-none focus:border-orange-500" />
          </div>
          <div className="flex flex-wrap gap-4 justify-center">
            {sortBattle(collection.filter(c => !search || c.username.includes(search) || c.displayName.includes(search))).map(card => {
              const selected = deck.includes(card.id);
              const used = raidUsedCards.includes(card.id);
              return (
                <div key={card.id} onClick={() => !used && toggleDeck(card.id)}
                  className={`transition rounded-xl relative ${used ? "opacity-30 cursor-not-allowed" : "cursor-pointer hover:scale-105"} ${selected ? "ring-4 ring-orange-500 scale-105" : ""}`}>
                  <div style={{ pointerEvents: 'none' }}><TcgCard card={card} size="lg" /></div>
                  {selected && <div className="absolute -top-2 -right-2 w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center text-white font-black text-sm z-10">{deck.indexOf(card.id) + 1}</div>}
                  {used && <div className="absolute inset-0 flex items-center justify-center z-10"><span className="bg-gray-900/80 text-gray-400 text-xs font-bold px-2 py-1 rounded-lg">{t.battle.raid.used}</span></div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'raid-battle') {
    if (!raidBossCard) return null;
    const currentBossMaxHp = raidBossMaxHp > 0 ? raidBossMaxHp : raidBossCard.hp;
    return (
      <div className="min-h-dvh bg-gray-950 text-white py-10 px-4">
        <div className="flex items-center justify-center gap-4 mb-6">
          <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">{t.battle.raid.battleTitle}</h1>
        </div>
        <div className="flex justify-center items-start gap-4 sm:gap-8 mb-8 flex-wrap">
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm text-blue-400 font-bold">{(onlineNames?.my || playerCard?.displayName) ?? t.battle.you}</span>
            {raidCurrentCard && <TcgCard card={raidCurrentCard} size="lg" />}
            <div className="w-full max-w-[16rem]">
              <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">HP</span><span className="text-white font-bold">{raidCurrentCardHp} / {raidCurrentCard?.hp ?? 0}</span></div>
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${raidCurrentCard ? Math.max(0, raidCurrentCardHp / raidCurrentCard.hp * 100) : 100}%` }} />
              </div>
            </div>
          </div>
          <div className="text-2xl sm:text-4xl font-black text-gray-600 sm:mt-20">VS</div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm text-red-400 font-bold">{t.battle.raid.boss}</span>
            <TcgCard card={raidBossCard} size="lg" />
            <div className="w-full max-w-[16rem]">
              <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">{t.battle.raid.bossHp}</span><span className="text-orange-400 font-bold">{raidBossHpLive.toLocaleString()} / {currentBossMaxHp.toLocaleString()}</span></div>
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-500 ${raidHpFlash ? 'hp-flash' : ''}`} style={{ width: `${Math.max(0, raidBossHpLive / currentBossMaxHp * 100)}%` }} />
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm justify-center mb-4">
          <span className="text-gray-400">{t.battle.speed}</span>
          <span className="text-xs text-gray-500">{t.battle.slow}</span>
          <input type="range" aria-label={t.battle.speedAriaLabel} min={100} max={1200} step={100} defaultValue={1300 - battleSpeed} onInput={e => setBattleSpeed(1300 - Number((e.target as HTMLInputElement).value))} className="w-32 accent-orange-500" />
          <span className="text-xs text-gray-500">{t.battle.fast}</span>
        </div>
        <div className="max-w-lg mx-auto bg-gray-900 rounded-xl p-4 space-y-1 max-h-40 sm:max-h-64 overflow-y-auto overscroll-contain">
          {raidLog.map((l, i) => <div key={i} className={`text-sm ${l.startsWith("━━") ? "text-orange-400 font-bold" : l.includes("defeated") ? "text-red-400" : "text-gray-300"}`}>{l}</div>)}
          {raidRunning && <div className="text-gray-500 animate-pulse text-sm">{t.battle.raid.battling}</div>}
        </div>
      </div>
    );
  }

  if (view === 'raid-result' && raidResult && raidBossCard) {
    const currentBossHp = raidBossHp;
    const currentBossMaxHp = raidBossMaxHp;
    const hpPct = currentBossMaxHp > 0 ? Math.max(0, currentBossHp / currentBossMaxHp * 100) : 0;
    const copyText = t.battle.raid.copyText(raidResult.cleared, raidBossCard.displayName, raidResult.totalDmg, currentBossHp, currentBossMaxHp, raidResult.turns);
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(copyText)}`;
    return (
      <div className={`min-h-dvh bg-gray-950 text-white py-10 px-4 flex flex-col items-center gap-6 slide-in-up ${raidResult.cleared ? 'raid-clear-flash' : ''}`}>
        {raidResult.cleared && <Confetti count={60} />}
        <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">{t.battle.raid.resultTitle}</h1>
        <div className={`text-2xl sm:text-3xl font-black ${raidResult.cleared ? "text-yellow-400" : "text-orange-400"}`}>{raidResult.cleared ? t.battle.raid.success : t.battle.raid.end}</div>
        <TcgCard card={raidBossCard} size="lg" />
        <div className="bg-gray-800/80 rounded-2xl p-4 w-full max-w-2xl space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-400">{t.battle.raid.resultLabel}</span><span className={`font-bold ${raidResult.cleared ? "text-yellow-400" : "text-orange-400"}`}>{raidResult.cleared ? t.battle.raid.success : t.battle.raid.end}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">{t.battle.raid.dmg}</span><span className="font-bold">{raidResult.totalDmg.toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">{t.battle.raid.totalTurns}</span><span className="font-bold">{raidResult.turns}</span></div>
          <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">{t.battle.raid.remainBossHp}</span><span className="font-bold">{currentBossHp.toLocaleString()} / {currentBossMaxHp.toLocaleString()}</span></div>
          <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-500" style={{ width: `${hpPct}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-2xl">
          <button onClick={() => navigator.clipboard.writeText(copyText)} className="px-5 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 transition">{t.battle.result.copyBtn}</button>
          <button onClick={() => { window.open(shareUrl, '_blank'); import('@/store/useGameStore').then(m => m.useGameStore.getState().markShare()); }} className="px-5 py-3 bg-sky-500 rounded-xl font-bold hover:bg-sky-400 transition">{t.battle.result.shareBtn}</button>
          <button onClick={() => { window.open(`https://bsky.app/intent/compose?text=${encodeURIComponent(copyText)}`, '_blank'); import('@/store/useGameStore').then(m => m.useGameStore.getState().markShare()); }} className="px-5 py-3 bg-blue-500 rounded-xl font-bold hover:bg-blue-400 transition">Bluesky</button>
          <button onClick={() => { setRaidLog(() => []); setRaidResult(null); setView('raid'); }} className="px-5 py-3 bg-orange-600 rounded-xl font-bold hover:bg-orange-500 transition">{t.battle.raid.retry}</button>
          <div /><div />
          <button onClick={() => setView('menu')} className="px-5 py-3 bg-gray-700 rounded-xl font-bold hover:bg-gray-600 transition text-gray-300">{t.battle.result.menu}</button>
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
                  {h.log && h.log.length > 0 && <button onClick={() => onReplay(h.log!, h.snaps, raidBossCard ?? undefined, raidBossMaxHp)} className="ml-2 text-xs px-2 py-1 bg-purple-700 rounded-lg hover:bg-purple-600 transition">▶</button>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
