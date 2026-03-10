"use client";
import React from "react";
import Image from "next/image";
import { Sword, Shield, Zap, Heart, Brain, Clover } from "lucide-react";
import type { TwitterCard } from "@/types";
import { useT } from "@/hooks/useT";
import { RARITY_STYLE } from "@/lib/card";
import { PASSIVE_SKILLS } from "@/lib/battle";

interface Props {
  card: TwitterCard;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  selected?: boolean;
}

const SIZE = {
  sm: { wrap: "w-32 h-56 text-[10px]", avatar: 80, stat: "text-[9px]" },
  md: { wrap: "w-48 h-80 text-xs", avatar: 120, stat: "text-[10px]" },
  lg: { wrap: "w-52 h-[22rem] sm:w-64 sm:h-[26rem] text-xs sm:text-sm", avatar: 160, stat: "text-[10px] sm:text-xs" },
};

export default function TcgCard({ card, size = "md", onClick, selected }: Props) {
  const t = useT();
  const s = SIZE[size];
  const gradient = RARITY_STYLE[card.rarity];

  return (
    <div
      onClick={() => { const url = card.username.includes('.') ? `https://bsky.app/profile/${card.username}` : `https://twitter.com/${card.username}`; window.open(url, '_blank', 'noopener,noreferrer'); if (onClick) onClick(); }}
      className={`
        ${s.wrap} relative flex flex-col rounded-xl cursor-pointer select-none
        bg-gradient-to-b ${gradient}
        border-2 ${selected ? "border-white scale-105" : "border-white/30"}
        shadow-lg transition-all duration-200 hover:shadow-2xl card-3d
        overflow-hidden p-1.5 gap-1
      `}
    >
      {/* ヘッダー: レアリティ + 名前/ID + エレメント */}
      <div className="flex justify-between items-center px-1">
        <span className="font-black text-white drop-shadow">{card.rarity}{(card.enhance ?? 0) > 0 && <span className="text-yellow-300 text-xs ml-0.5">+{card.enhance}</span>}</span>
        <div className="text-center flex-1 px-1 min-w-0">
          <p className="font-bold text-white truncate leading-tight text-[0.75rem]">{card.displayName} <span className="text-white/60 font-normal">(@{card.username})</span></p>
        </div>
        <span>{card.element}</span>
      </div>

      {/* アバター */}
      <div className="flex justify-center px-1">
        <div className="rounded-lg overflow-hidden border-2 border-white/40 bg-black/20 w-full">
          {card.avatar ? (
            <Image
              key={card.avatar}
              src={card.avatar}
              alt={card.displayName}
              width={s.avatar}
              height={s.avatar}
              className="object-cover w-full h-full"
              unoptimized
              onLoad={e => (e.currentTarget as HTMLImageElement).style.opacity = "1"}
              style={{ opacity: 0, transition: "opacity 0.3s" }}
            />
          ) : (
            <div
              style={{ height: s.avatar }}
              className="bg-white/20 flex items-center justify-center text-4xl w-full"
            >
              👤
            </div>
          )}
        </div>
      </div>

      {/* bio */}
      {size !== "sm" && card.bio && (
      <div className="text-center px-1">
          <p className="text-white/60 mt-0.5 leading-tight line-clamp-5 [display:-webkit-box] [-webkit-line-clamp:5] [-webkit-box-orient:vertical] overflow-hidden" style={{ fontSize: "0.65rem" }}>{card.bio}</p>
      </div>
      )}

      {/* ステータス */}
      <div className={`${s.stat} grid grid-cols-2 gap-0.5 px-1 mt-auto`}>
        {(
          [
            [<Sword size={10} />, "ATK", card.atk],
            [<Shield size={10} />, "DEF", card.def],
            [<Zap size={10} />, "SPD", card.spd],
            [<Heart size={10} />, "HP", card.hp],
            [<Brain size={10} />, "INT", card.int],
            [<Clover size={10} />, "LUK", card.luk],
          ] as [React.ReactNode, string, number][]
        ).map(([icon, label, val]) => (
          <div key={label} className="bg-black/30 rounded px-1 py-0.5 flex justify-between items-center gap-1">
            <span className="text-white/80 flex items-center gap-0.5">{icon}{label}</span>
            <span className="font-bold text-white">{val}</span>
          </div>
        ))}
      </div>

      {/* スキル */}
      {(() => { const sk = card.skill; return sk ? (
        <div className="text-center px-1">
          <span className="text-yellow-300 font-bold" style={{ fontSize: "0.6rem" }}>⚡ {sk}：{PASSIVE_SKILLS[sk]?.desc}</span>
        </div>
      ) : null; })()}
      {card.ultimates && card.ultimates.length > 0 && size !== "sm" && (
        <div className="text-center px-1 mt-0.5">
          <span className="text-red-300 font-bold" style={{ fontSize: "0.6rem" }}>{t.battle.ultimateBadge(card.ultimates.length)}</span>
        </div>
      )}

      {/* UR ホログラム効果 */}
      {card.rarity === "UR" && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/10 pointer-events-none animate-pulse" />
      )}
    </div>
  );
}
