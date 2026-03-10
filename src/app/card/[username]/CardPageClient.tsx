"use client";
import { useState } from "react";
import Link from "next/link";
import TcgCard from "@/components/TcgCard";
import { useT } from "@/hooks/useT";
import { simulateBattle } from "@/lib/battle";
import type { TwitterCard } from "@/types";

export default function CardPageClient({ username, initialCard }: { username: string; initialCard: TwitterCard | null }) {
  const t = useT();
  const [card] = useState<TwitterCard | null>(initialCard);
  const [simResult, setSimResult] = useState<{ winner: string; turns: number } | null>(null);
  const [simCard, setSimCard] = useState<TwitterCard | null>(null);

  async function simulate() {
    if (!card) return;
    setSimResult(null);
    setSimCard(null);
    try {
      const res = await fetch("/api/gacha?count=1");
      const data = await res.json();
      const player: TwitterCard = Array.isArray(data) ? data[0] : data;
      if (!player || (player as unknown as { error?: string }).error) return;
      const result = simulateBattle(player, card);
      setSimResult({ winner: result.winner, turns: result.turns });
      setSimCard(player);
    } catch {}
  }

  const b = t.battle;

  if (!card) return (
    <div className="min-h-dvh bg-gray-950 text-white flex flex-col items-center justify-center gap-4 px-4">
      <p className="text-gray-400">{t.cardSearch.notFound(username)}</p>
      <Link href="/" className="text-pink-400 hover:underline">{t.battle.cardPageBack}</Link>
    </div>
  );

  return (
    <div className="min-h-dvh bg-gray-950 text-white flex flex-col items-center py-10 px-4 gap-6">
      <Link href="/" className="text-gray-400 hover:text-white text-sm transition">{t.battle.cardPageBack}</Link>

      <h1 className="text-2xl font-black text-pink-400">{t.battle.cardPageTitle(card.displayName)}</h1>

      <div className="w-56">
        <TcgCard card={card} size="lg" />
      </div>

      {/* シェアボタン */}
      <div className="flex gap-3">
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(t.battle.cardPageShareText(card.displayName, card.rarity, card.username))}`}
          target="_blank" rel="noopener noreferrer"
          className="px-4 py-2 bg-black hover:bg-gray-900 border border-gray-700 rounded-xl font-bold text-sm transition flex items-center gap-2"
        >
          {t.battle.cardPageShareX}
        </a>
        <a
          href={`https://bsky.app/intent/compose?text=${encodeURIComponent(t.battle.cardPageShareText(card.displayName, card.rarity, card.username))}`}
          target="_blank" rel="noopener noreferrer"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-sm transition flex items-center gap-2"
        >
          {t.battle.cardPageShareBsky}
        </a>
      </div>

      {/* バトルシミュレーション */}
      <div className="w-full max-w-sm bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <h2 className="font-black text-lg mb-1">{t.battle.cardPageSim}</h2>
          <p className="text-gray-400 text-sm mb-4">{t.battle.cardPageSimDesc}</p>
          <button
            onClick={(e) => { e.preventDefault(); simulate(); }}
            className="w-full py-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl font-bold hover:opacity-90 transition"
          >
            {t.battle.cardPageSimBtn}
          </button>
          {simResult && simCard && (
            <div className="mt-4 text-center min-h-[120px]">
              <div className="flex justify-center gap-4 mb-3">
                <div className="w-24"><TcgCard card={simCard} size="sm" /></div>
                <div className="flex items-center text-gray-400 font-black">VS</div>
                <div className="w-24"><TcgCard card={card} size="sm" /></div>
              </div>
              <p className={`font-black text-lg ${simResult.winner === 'player' ? 'text-yellow-400' : 'text-red-400'}`}>
                {t.battle.cardPageSimResult(simResult.winner, simResult.turns)}
              </p>
            </div>
          )}
        </div>

      <Link href="/" className="py-3 px-8 bg-pink-600 hover:bg-pink-500 rounded-xl font-bold transition">
        {t.cardSearch.playNow}
      </Link>
    </div>
  );
}
