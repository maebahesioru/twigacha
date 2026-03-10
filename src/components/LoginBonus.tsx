"use client";
import { useEffect, useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { useT } from "@/hooks/useT";

const REWARDS = [1, 1, 1, 1, 2, 2, 3]; // day 1-7

export default function LoginBonus() {
  const { claimLoginBonus, loginStreak, loginDate } = useGameStore();
  const t = useT();
  const [bonus, setBonus] = useState(0);

  useEffect(() => {
    const today = new Date().toDateString();
    if (loginDate !== today) {
      const b = claimLoginBonus();
      if (b > 0) setBonus(b);
    }
  }, []);

  if (!bonus) return null;

  const lb = t.gacha.loginBonus;
  const todayIdx = ((loginStreak - 1) % 7); // 0-indexed

  return (
    <div className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 p-4 pt-16">
      <div className="bg-gray-900 border border-yellow-500/50 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl shadow-yellow-500/20">
        <h2 className="text-xl font-black text-yellow-400 mb-1">{lb.title}</h2>
        <p className="text-gray-400 text-xs mb-4">{lb.streak(loginStreak)}</p>

        {/* スタンプグリッド */}
        <div className="grid grid-cols-7 gap-1 mb-5">
          {REWARDS.map((r, i) => {
            const isPast = i < todayIdx;
            const isToday = i === todayIdx;
            return (
              <div key={i} className={`flex flex-col items-center rounded-xl py-2 px-1 border transition
                ${isToday ? "border-yellow-400 bg-yellow-500/20 scale-110" : isPast ? "border-gray-700 bg-gray-800 opacity-60" : "border-gray-700 bg-gray-800"}`}>
                <span className="text-lg">{isPast ? "✅" : isToday ? "🎁" : "🔒"}</span>
                <span className={`text-xs font-bold mt-1 ${isToday ? "text-yellow-300" : "text-gray-400"}`}>+{r}</span>
                <span className="text-[10px] text-gray-500">{t.gacha.loginBonus.day(i + 1)}</span>
              </div>
            );
          })}
        </div>

        <p className="text-3xl font-black text-white mb-4">{lb.reward(bonus)}</p>
        <button
          onClick={() => setBonus(0)}
          className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-xl transition"
        >
          {lb.close}
        </button>
      </div>
    </div>
  );
}
