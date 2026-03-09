"use client";
import { useState } from "react";
import { useT } from "@/hooks/useT";
import type { TwitterCard } from "@/types";

export function VsIdScreen({ playerCard, onBattle, onBack }: { playerCard: TwitterCard | null; onBattle: (enemy: TwitterCard) => void; onBack: () => void }) {
  const [enemyId, setEnemyId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const t = useT();

  const handleStart = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/gacha?username=${encodeURIComponent(enemyId.replace(/^@/, ""))}`);
      const data = await res.json();
      if (data.error) { setError(t.battle.vsIdError); return; }
      onBattle(data);
    } catch { setError(t.battle.vsIdError); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6 px-4">
      <div className="flex items-center gap-4 w-full max-w-sm">
        <button onClick={onBack} className="text-gray-400 hover:text-white text-sm">{t.battle.back}</button>
        <h1 className="text-2xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">{t.battle.vsId}</h1>
      </div>
      {playerCard && <div className="text-sm text-gray-400">{t.battle.you}: <span className="text-white font-bold">{playerCard.displayName}</span></div>}
      <div className="flex gap-2 w-full max-w-sm">
        <input value={enemyId} onChange={e => setEnemyId(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleStart()}
          placeholder={t.battle.vsIdPlaceholder}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-purple-500" />
        <button onClick={handleStart} disabled={!enemyId || loading}
          className="px-5 py-3 bg-purple-600 rounded-lg font-bold hover:bg-purple-500 disabled:opacity-40 transition">
          {loading ? "..." : t.battle.vsIdBtn}
        </button>
      </div>
      {error && <div className="text-red-400 text-sm">{error}</div>}
    </div>
  );
}

export function VsIdForm({ collection, onStart }: { collection: TwitterCard[]; onStart: (player: TwitterCard, enemy: TwitterCard) => void }) {
  const [enemyId, setEnemyId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const t = useT();

  const handleStart = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/gacha?username=${encodeURIComponent(enemyId.replace(/^@/, ""))}`);
      const data = await res.json();
      if (data.error) { setError(t.battle.vsIdError); setLoading(false); return; }
      const myCard = collection[Math.floor(Math.random() * collection.length)];
      onStart(myCard, data);
    } catch { setError(t.battle.vsIdError); }
    finally { setLoading(false); }
  };

  return (
    <div className="w-full max-w-2xl bg-gray-800/60 rounded-2xl p-4 border border-gray-700">
      <div className="text-sm font-bold text-gray-300 mb-3">{t.battle.vsId}</div>
      <div className="flex gap-2">
        <input value={enemyId} onChange={e => setEnemyId(e.target.value)} placeholder={t.battle.vsIdPlaceholder}
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500" />
        <button onClick={handleStart} disabled={!enemyId || loading}
          className="px-4 py-2 bg-purple-600 rounded-lg font-bold text-sm hover:bg-purple-500 disabled:opacity-40 transition">
          {loading ? t.battle.vsIdLoading : t.battle.vsIdBtn}
        </button>
      </div>
      {error && <div className="text-red-400 text-xs mt-2">{error}</div>}
    </div>
  );
}
