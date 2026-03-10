"use client";
import { useEffect, useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { useT } from "@/hooks/useT";
import { ACHIEVEMENTS } from "@/lib/achievements";
import Link from "next/link";

export default function AchievementsPage() {
  const store = useGameStore();
  const { achievements, unlockAchievement, collection, totalPackCount, lastPackCards, cardPullCounts, raidClearCount, battleHistory, teamBattleHistory, favorites, lang } = store;
  const t = useT();

  useEffect(() => {
    const battleWins = battleHistory.filter(b => b.winner === 'player').length;
    const battleLosses = battleHistory.filter(b => b.winner === 'enemy').length;
    const state = { collection, totalPackCount, lastPackCards, cardPullCounts, raidClearCount, achievements, battleWins, battleLosses, teamBattleHistory, battleHistory, favorites };
    for (const a of ACHIEVEMENTS) {
      if (!achievements.includes(a.id) && a.check(state)) {
        unlockAchievement(a.id);
        if (Notification.permission === 'granted') {
          new Notification(`${a.emoji} ${t.achievements.unlocked}`, { body: a.name[lang as 'ja'|'en'] ?? a.name.ja, icon: '/apple-icon.png' });
        }
      }
    }
  }, [collection, totalPackCount, lastPackCards, cardPullCounts, raidClearCount, battleHistory, teamBattleHistory, favorites]);

  const unlocked = achievements.length;
  const total = ACHIEVEMENTS.length;
  const [search, setSearch] = useState("");
  const filtered = ACHIEVEMENTS.filter(a => {
    if (!search) return true;
    const done = achievements.includes(a.id);
    const isHidden = a.hidden && !done;
    if (isHidden) return false;
    const q = search.toLowerCase();
    return a.name[lang].toLowerCase().includes(q) || a.desc[lang].toLowerCase().includes(q);
  });

  return (
    <div className="min-h-dvh bg-gray-950 text-white py-10 px-4 slide-in-up">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-2">
          <Link href="/" className="text-gray-400 hover:text-white text-sm">← {t.nav.gacha}</Link>
        </div>
        <h1 className="text-3xl font-black mb-1">{t.achievements.title}</h1>
        <p className="text-gray-400 text-sm mb-6">
          {t.achievements.progress(unlocked, total)}
          <span className="ml-3 text-gray-600">({Math.round(unlocked / total * 100)}%)</span>
        </p>

        <div className="mb-4">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.achievements.searchPlaceholder} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(a => {
            const done = achievements.includes(a.id);
            const isHidden = a.hidden && !done;
            return (
              <div key={a.id}
                className={`flex items-center gap-3 p-4 rounded-xl border transition ${done ? "bg-gray-800/80 border-yellow-500/40 pulse-glow" : "bg-gray-900/60 border-gray-800 opacity-60"}`}>
                <div className={`text-3xl w-10 text-center shrink-0 ${done ? 'badge-pop' : ''}`}>{isHidden ? t.achievements.locked : a.emoji}</div>
                <div className="min-w-0">
                  <div className={`font-bold text-sm ${done ? "text-white" : "text-gray-500"}`}>
                    {isHidden ? t.achievements.hidden : a.name[lang]}
                    {done && <span className="ml-2 text-xs text-yellow-400">{t.achievements.get}</span>}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{isHidden ? t.achievements.hiddenDesc : a.desc[lang]}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
