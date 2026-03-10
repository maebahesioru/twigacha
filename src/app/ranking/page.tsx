"use client";
import { useEffect, useState } from "react";
import { RARITY_STYLE } from "@/lib/card";

type Row = { card_id: string; username: string; display_name: string; avatar: string; rarity: string; atk: number; element: string; wins: number; losses: number; streak: number; max_streak: number; ko_wins: number; ultimate_count: number };
type Tab = "wins" | "rate" | "battles" | "streak" | "ko" | "ultimate" | "atk";
type Filter = "all" | string;

const TABS: { key: Tab; label: string }[] = [
  { key: "wins", label: "🏆 勝利数" },
  { key: "rate", label: "📊 勝率" },
  { key: "battles", label: "⚔️ 対戦数" },
  { key: "streak", label: "🔥 最大連勝" },
  { key: "ko", label: "💀 KO勝利" },
  { key: "ultimate", label: "⚡ 必殺技" },
  { key: "atk", label: "💪 ATK" },
];

const RARITIES = ["LR", "UR", "SSR", "SR", "R", "N", "C"];
const ELEMENTS = ["🔥", "💧", "🌿", "⚡", "✨", "🌑", "🌙", "❄️"];

export default function RankingPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [tab, setTab] = useState<Tab>("wins");
  const [rarityFilter, setRarityFilter] = useState<Filter>("all");
  const [elementFilter, setElementFilter] = useState<Filter>("all");

  useEffect(() => {
    fetch("/api/ranking").then(r => r.json()).then(setRows).catch(() => {});
  }, []);

  const filtered = rows
    .filter(r => rarityFilter === "all" || r.rarity === rarityFilter)
    .filter(r => elementFilter === "all" || r.element === elementFilter)
    .filter(r => tab === "rate" ? r.wins + r.losses >= 5 : true);

  const sorted = [...filtered].sort((a, b) => {
    if (tab === "wins") return b.wins - a.wins;
    if (tab === "rate") return (b.wins / (b.wins + b.losses)) - (a.wins / (a.wins + a.losses));
    if (tab === "battles") return (b.wins + b.losses) - (a.wins + a.losses);
    if (tab === "streak") return b.max_streak - a.max_streak;
    if (tab === "ko") return b.ko_wins - a.ko_wins;
    if (tab === "ultimate") return b.ultimate_count - a.ultimate_count;
    if (tab === "atk") return b.atk - a.atk;
    return 0;
  }).slice(0, 50);

  const MEDAL = ["🥇", "🥈", "🥉"];

  const getValue = (row: Row) => {
    if (tab === "wins") return <span className="text-yellow-400 font-bold">{row.wins}勝</span>;
    if (tab === "rate") { const r = Math.round(row.wins / (row.wins + row.losses) * 100); return <span className="text-green-400 font-bold">{r}%</span>; }
    if (tab === "battles") return <span className="text-blue-400 font-bold">{row.wins + row.losses}戦</span>;
    if (tab === "streak") return <span className="text-orange-400 font-bold">🔥{row.max_streak}</span>;
    if (tab === "ko") return <span className="text-red-400 font-bold">💀{row.ko_wins}</span>;
    if (tab === "ultimate") return <span className="text-purple-400 font-bold">⚡{row.ultimate_count}</span>;
    if (tab === "atk") return <span className="text-pink-400 font-bold">ATK {row.atk}</span>;
  };

  return (
    <div className="min-h-dvh bg-gray-950 text-white py-10 px-4 flex flex-col items-center gap-4">
      <h1 className="text-2xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">🏆 カードランキング</h1>

      {/* タブ */}
      <div className="flex gap-2 flex-wrap justify-center">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${tab === t.key ? "bg-yellow-500 text-black" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* フィルター */}
      <div className="flex gap-2 flex-wrap justify-center">
        <select value={rarityFilter} onChange={e => setRarityFilter(e.target.value)}
          className="bg-gray-800 text-white text-xs px-3 py-1.5 rounded-xl border border-gray-600">
          <option value="all">全レアリティ</option>
          {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={elementFilter} onChange={e => setElementFilter(e.target.value)}
          className="bg-gray-800 text-white text-xs px-3 py-1.5 rounded-xl border border-gray-600">
          <option value="all">全属性</option>
          {ELEMENTS.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      {tab === "rate" && <p className="text-xs text-gray-500">※5戦以上のカードのみ表示</p>}

      <div className="w-full max-w-lg space-y-2">
        {sorted.map((row, i) => {
          const rarityStyle = (RARITY_STYLE as Record<string, string>)[row.rarity] ?? "from-gray-400 to-gray-600";
          return (
            <div key={row.card_id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-800/80">
              <span className="text-lg font-black w-8 text-center">{i < 3 ? MEDAL[i] : <span className="text-gray-400 text-sm">{i + 1}</span>}</span>
              {row.avatar && <img src={row.avatar} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{row.display_name}</div>
                <div className="text-xs text-gray-400">{row.element} @{row.username}</div>
              </div>
              <span className={`text-xs font-black px-2 py-0.5 rounded-full bg-gradient-to-r ${rarityStyle} text-white flex-shrink-0`}>{row.rarity}</span>
              <div className="text-right text-sm flex-shrink-0">
                {getValue(row)}
                <div className="text-xs text-gray-500">{row.wins}勝{row.losses}敗</div>
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && <p className="text-gray-500 text-center py-10">まだデータがありません</p>}
      </div>
    </div>
  );
}
