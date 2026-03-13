"use client";
import TcgCard from "@/components/TcgCard";
import { useT } from "@/hooks/useT";
import type { TwitterCard } from "@/types";

interface Props {
  playerCard: TwitterCard;
  enemyCard: TwitterCard | null;
  pHpLive: number;
  eHpLive: number;
  shake: "player" | "enemy" | null;
  dmgPop: { side: "player" | "enemy"; val: number; key: number } | null;
  hpFlash: "player" | "enemy" | null;
  log: string[];
  localSpeed: number;
  setLocalSpeed: (v: number) => void;
  kyu: string;
  onlineNames: { my: string; opponent: string } | null;
  result: { winner: string } | null;
  selectMode: "player" | "enemy" | null;
  setSelectMode: (v: "player" | "enemy" | null) => void;
  collection: TwitterCard[];
  onSelectCard: (c: TwitterCard) => void;
}

function HpBar({ current, max, flash, winner }: { current: number; max: number; flash: boolean; winner?: boolean }) {
  const r = max > 0 ? Math.max(0, current / max) : 1;
  return (
    <div className="w-full max-w-[16rem]">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">HP</span>
        <span className={winner !== undefined ? (winner ? "text-green-400" : "text-red-400") : "text-white"}>{current} / {max}</span>
      </div>
      <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${flash ? "hp-flash" : ""}`}
          style={{ width: `${r * 100}%`, background: r < 0.25 ? "#ef4444" : r < 0.5 ? "#f59e0b" : "#22c55e" }} />
      </div>
    </div>
  );
}

export function BattleView({ playerCard, enemyCard, pHpLive, eHpLive, shake, dmgPop, hpFlash, log, localSpeed, setLocalSpeed, kyu, onlineNames, result, selectMode, setSelectMode, collection, onSelectCard }: Props) {
  const t = useT();
  return (
    <div className="min-h-dvh bg-gray-950 text-white py-10 px-4">
      <div className="flex justify-center items-start gap-4 sm:gap-8 mb-8 flex-wrap">
        <div className={`flex flex-col items-center gap-2 relative ${shake === "player" ? "screen-shake" : ""}`}>
          <span className="text-sm text-blue-400 font-bold">{onlineNames?.my || playerCard.displayName}</span>
          <TcgCard card={playerCard} size="lg" onClick={() => setSelectMode("player")} />
          {dmgPop?.side === "player" && <div key={dmgPop.key} className="dmg-pop absolute top-8 left-1/2 -translate-x-1/2 text-2xl font-black text-red-400 pointer-events-none z-10">-{dmgPop.val}</div>}
          <HpBar current={pHpLive} max={playerCard.hp} flash={hpFlash === "player"} winner={result ? result.winner === "player" : undefined} />
        </div>
        <div className="text-2xl sm:text-4xl font-black text-gray-600 sm:mt-20">VS</div>
        <div className={`flex flex-col items-center gap-2 relative ${shake === "enemy" ? "screen-shake" : ""}`}>
          <span className="text-sm text-red-400 font-bold">{onlineNames?.opponent ?? enemyCard?.displayName ?? t.battle.enemy(enemyCard?.rarity ?? kyu)}</span>
          {enemyCard
            ? <TcgCard card={enemyCard} size="lg" />
            : <div className="w-48 sm:w-64 h-[22rem] sm:h-[26rem] bg-gray-800 rounded-xl flex items-center justify-center text-gray-500 animate-pulse">{t.battle.raid.loading}</div>
          }
          {dmgPop?.side === "enemy" && <div key={dmgPop.key} className="dmg-pop absolute top-8 left-1/2 -translate-x-1/2 text-2xl font-black text-red-400 pointer-events-none z-10">-{dmgPop.val}</div>}
          <HpBar current={eHpLive} max={enemyCard?.hp ?? 0} flash={hpFlash === "enemy"} winner={result ? result.winner === "enemy" : undefined} />
        </div>
      </div>
      <div className="flex items-center gap-3 text-sm justify-center mb-4">
        <span className="text-gray-400">{t.battle.speed}</span>
        <span className="text-xs text-gray-500">{t.battle.slow}</span>
        <input type="range" aria-label={t.battle.speedAriaLabel} min={100} max={1200} step={100} defaultValue={1300 - localSpeed}
          onInput={e => setLocalSpeed(1300 - Number((e.target as HTMLInputElement).value))} className="w-32 accent-pink-500" />
        <span className="text-xs text-gray-500">{t.battle.fast}</span>
      </div>
      {log.length > 0 && (
        <div className="max-w-lg mx-auto bg-gray-900 rounded-xl p-4 space-y-1 max-h-40 sm:max-h-64 overflow-y-auto overscroll-contain">
          {log.map((line, i) => (
            <p key={i} style={{ animationDelay: `${i * 30}ms` }}
              className={`text-sm slide-in-up ${line.includes("🏆") ? "text-yellow-400 font-bold text-base" : line.includes("💀") ? "text-red-400 font-bold text-base" : "text-gray-300"}`}>
              {line}
            </p>
          ))}
        </div>
      )}
      {selectMode && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectMode(null)}>
          <div className="bg-gray-900 rounded-2xl p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto overscroll-contain" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">{t.battle.selectTitle}</h2>
            <div className="flex flex-wrap gap-3 justify-center">
              {collection.map(card => <TcgCard key={card.id} card={card} size="sm" onClick={() => onSelectCard(card)} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
