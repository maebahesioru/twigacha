"use client";
import TcgCard from "@/components/TcgCard";
import { useT } from "@/hooks/useT";
import type { TwitterCard } from "@/types";
import { playAttack, playVictory, playDefeat, playRaidHit } from "@/lib/audio";
import { useEffect } from "react";

type ViewType = "menu"|"select"|"rarity"|"battle"|"result"|"raid"|"raid-battle"|"raid-result"|"vs-id"|"team"|"online"|"replay"|"quest";

interface Props {
  replayCards: { p: TwitterCard; e: TwitterCard; hpSnaps: { pHp: number; eHp: number }[] } | null;
  replayRaidSnaps: { cardIdx: number; card: TwitterCard; cardHp: number; bossHp: number }[] | null;
  replayBossCard: TwitterCard | null;
  replayBossMaxHp: number;
  replayIdx: number;
  setReplayIdx: (fn: (i: number) => number) => void;
  replayPHp: number;
  setReplayPHp: (v: number) => void;
  replayEHp: number;
  setReplayEHp: (v: number) => void;
  replayRaidCard: TwitterCard | null;
  setReplayRaidCard: (c: TwitterCard) => void;
  replayRaidCardHp: number;
  setReplayRaidCardHp: (v: number) => void;
  replayRaidBossHp: number;
  setReplayRaidBossHp: (v: number) => void;
  replayShake: "player" | "enemy" | null;
  setReplayShake: (v: "player" | "enemy" | null) => void;
  replayDmgPop: { side: "player" | "enemy"; val: number; key: number } | null;
  setReplayDmgPop: (v: { side: "player" | "enemy"; val: number; key: number } | null) => void;
  replayHpFlash: "player" | "enemy" | null;
  setReplayHpFlash: (v: "player" | "enemy" | null) => void;
  replayRounds: { p: TwitterCard; e: TwitterCard; hpSnaps: { pHp: number; eHp: number }[]; log: string[] }[] | null;
  replayRoundIdx: number;
  setReplayRoundIdx: (fn: (i: number) => number) => void;
  setReplayCards: (c: { p: TwitterCard; e: TwitterCard; hpSnaps: { pHp: number; eHp: number }[] } | null) => void;
  setReplayPHpDirect: (v: number) => void;
  setReplayEHpDirect: (v: number) => void;
  log: string[];
  localSpeed: number;
  setLocalSpeed: (v: number) => void;
  replayFrom: ViewType;
  setView: (v: ViewType) => void;
}

function HpBar({ current, max, flash }: { current: number; max: number; flash: boolean }) {
  const r = max > 0 ? Math.max(0, current / max) : 1;
  return (
    <div className="w-full max-w-[16rem]">
      <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">HP</span><span className="text-white">{current} / {max}</span></div>
      <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${flash ? "hp-flash" : ""}`}
          style={{ width: `${r * 100}%`, background: r < 0.25 ? "#ef4444" : r < 0.5 ? "#f59e0b" : "#22c55e" }} />
      </div>
    </div>
  );
}

function SpeedSlider({ localSpeed, setLocalSpeed, t }: { localSpeed: number; setLocalSpeed: (v: number) => void; t: ReturnType<typeof useT> }) {
  return (
    <div className="flex items-center gap-3 text-sm justify-center">
      <span className="text-gray-400">{t.battle.speed}</span>
      <span className="text-xs text-gray-500">{t.battle.slow}</span>
      <input type="range" aria-label={t.battle.speedAriaLabel} min={100} max={1200} step={100} defaultValue={1300 - localSpeed}
        onInput={e => setLocalSpeed(1300 - Number((e.target as HTMLInputElement).value))} className="w-32 accent-pink-500" />
      <span className="text-xs text-gray-500">{t.battle.fast}</span>
    </div>
  );
}

export function ReplayView(props: Props) {
  const { replayCards, replayRaidSnaps, replayBossCard, replayBossMaxHp, replayIdx, setReplayIdx,
    replayPHp, setReplayPHp, replayEHp, setReplayEHp, replayRaidCard, setReplayRaidCard,
    replayRaidCardHp, setReplayRaidCardHp, replayRaidBossHp, setReplayRaidBossHp,
    replayShake, setReplayShake, replayDmgPop, setReplayDmgPop, replayHpFlash, setReplayHpFlash,
    replayRounds, replayRoundIdx, setReplayRoundIdx, setReplayCards, setReplayPHpDirect, setReplayEHpDirect,
    log, localSpeed, setLocalSpeed, replayFrom, setView } = props;
  const t = useT();

  // 通常リプレイ自動再生
  useEffect(() => {
    if (!replayCards) return;
    if (replayIdx >= replayCards.hpSnaps.length) {
      if (replayRounds && replayRoundIdx + 1 < replayRounds.length) {
        const timer = setTimeout(() => {
          const next = replayRounds[replayRoundIdx + 1];
          setReplayCards(next);
          setReplayPHpDirect(next.p.hp);
          setReplayEHpDirect(next.e.hp);
          setReplayIdx(() => 0);
          setReplayRoundIdx(i => i + 1);
        }, 1500);
        return () => clearTimeout(timer);
      }
      return;
    }
    const timer = setTimeout(() => {
      const snap = replayCards.hpSnaps[replayIdx];
      const prevP = replayIdx === 0 ? replayCards.p.hp : replayCards.hpSnaps[replayIdx - 1].pHp;
      const prevE = replayIdx === 0 ? replayCards.e.hp : replayCards.hpSnaps[replayIdx - 1].eHp;
      if (snap.eHp < prevE) { setReplayShake("enemy"); setTimeout(() => setReplayShake(null), 400); setReplayHpFlash("enemy"); setTimeout(() => setReplayHpFlash(null), 300); setReplayDmgPop({ side: "enemy", val: prevE - snap.eHp, key: Date.now() }); playAttack(); }
      if (snap.pHp < prevP) { setReplayShake("player"); setTimeout(() => setReplayShake(null), 400); setReplayHpFlash("player"); setTimeout(() => setReplayHpFlash(null), 300); setReplayDmgPop({ side: "player", val: prevP - snap.pHp, key: Date.now() + 1 }); }
      setReplayPHp(snap.pHp);
      setReplayEHp(snap.eHp);
      setReplayIdx(i => i + 1);
      if (replayIdx + 1 >= replayCards.hpSnaps.length) {
        replayCards.hpSnaps[replayCards.hpSnaps.length - 1].pHp > 0 ? playVictory() : playDefeat();
      }
    }, localSpeed);
    return () => clearTimeout(timer);
  }, [replayIdx, replayCards, replayRounds, replayRoundIdx, localSpeed]);

  // レイドリプレイ自動再生
  useEffect(() => {
    if (!replayRaidSnaps || replayCards) return;
    if (replayIdx >= replayRaidSnaps.length) return;
    const timer = setTimeout(() => {
      const snap = replayRaidSnaps[replayIdx];
      const prev = replayRaidSnaps[replayIdx - 1];
      setReplayRaidCard(snap.card);
      setReplayRaidCardHp(snap.cardHp);
      setReplayRaidBossHp(snap.bossHp);
      if (snap.bossHp < (prev?.bossHp ?? replayBossMaxHp)) playRaidHit();
      if (snap.cardHp < (prev?.cardHp ?? snap.card.hp)) playAttack();
      if (replayIdx + 1 >= replayRaidSnaps.length) snap.bossHp <= 0 ? playVictory() : playDefeat();
      setReplayIdx(i => i + 1);
    }, localSpeed);
    return () => clearTimeout(timer);
  }, [replayIdx, replayRaidSnaps, replayCards, replayBossMaxHp, localSpeed]);

  // レイドリプレイ
  if (!replayCards && replayRaidSnaps && replayBossCard) {
    const done = replayIdx >= replayRaidSnaps.length;
    const replayLog = done ? log : log.slice(0, Math.max(1, Math.floor(replayIdx * log.length / replayRaidSnaps.length)));
    return (
      <div className="min-h-dvh bg-gray-950 text-white flex flex-col items-center px-4 py-6 gap-4 slide-in-up">
        <div className="flex items-center justify-between w-full max-w-2xl">
          <button onClick={() => setView(replayFrom)} className="text-gray-400 hover:text-white text-sm">{t.battle.back}</button>
          <h1 className="text-xl font-black text-yellow-400">{t.battle.replay.title}</h1>
          <span className="text-xs text-gray-500">{replayIdx}/{replayRaidSnaps.length}</span>
        </div>
        <div className="flex justify-center items-start gap-4 sm:gap-8 flex-wrap">
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm text-blue-400 font-bold">{replayRaidCard?.displayName ?? "..."}</span>
            {replayRaidCard && <TcgCard card={replayRaidCard} size="lg" />}
            <HpBar current={replayRaidCardHp} max={replayRaidCard?.hp ?? 0} flash={false} />
          </div>
          <div className="text-2xl sm:text-4xl font-black text-gray-600 sm:mt-20">VS</div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm text-red-400 font-bold">{t.battle.raid.boss}</span>
            <TcgCard card={replayBossCard} size="lg" />
            <div className="w-full max-w-[16rem]">
              <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">{t.battle.raid.bossHp}</span><span className="text-orange-400 font-bold">{replayRaidBossHp.toLocaleString()} / {replayBossMaxHp.toLocaleString()}</span></div>
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-500" style={{ width: `${Math.max(0, replayRaidBossHp / replayBossMaxHp * 100)}%` }} />
              </div>
            </div>
          </div>
        </div>
        {done && <div className="text-yellow-400 font-bold">{t.battle.replay.done}</div>}
        <SpeedSlider localSpeed={localSpeed} setLocalSpeed={setLocalSpeed} t={t} />
        {replayLog.length > 0 && (
          <div className="max-w-lg w-full bg-gray-900 rounded-xl p-4 space-y-1 max-h-40 overflow-y-auto">
            {replayLog.map((l, i) => <p key={i} className={`text-sm ${l.startsWith("━━") ? "text-orange-400 font-bold" : l.includes("defeated") ? "text-red-400" : "text-gray-300"}`}>{l}</p>)}
          </div>
        )}
        <button onClick={() => setView(replayFrom)} className="px-6 py-3 bg-gray-700 rounded-xl font-bold hover:bg-gray-600 transition">{t.battle.back}</button>
      </div>
    );
  }

  // ログのみ
  if (!replayCards) return (
    <div className="min-h-dvh bg-gray-950 text-white flex flex-col items-center gap-4 px-4 py-10 slide-in-up">
      <h2 className="text-2xl font-black text-yellow-400">{t.battle.replay.title}</h2>
      <div className="w-full max-w-2xl bg-gray-800/80 rounded-2xl p-4 space-y-1 text-xs font-mono text-gray-300 max-h-[70vh] overflow-y-auto">
        {log.map((l, i) => <div key={i} className={l.includes("🏆") ? "text-yellow-400 font-bold" : l.includes("💀") ? "text-red-400 font-bold" : ""}>{l}</div>)}
      </div>
      <button onClick={() => setView(replayFrom)} className="px-6 py-3 bg-gray-700 rounded-xl font-bold hover:bg-gray-600 transition">{t.battle.back}</button>
    </div>
  );

  const rp = replayCards.p, re = replayCards.e;
  const replayLog = replayCards.hpSnaps.length > 0 ? log.slice(0, replayIdx * Math.ceil(log.length / replayCards.hpSnaps.length)) : log;
  const done = replayIdx >= replayCards.hpSnaps.length;
  return (
    <div className="min-h-dvh bg-gray-950 text-white flex flex-col items-center px-4 py-6 gap-4 slide-in-up">
      <div className="flex items-center justify-between w-full max-w-2xl">
        <button onClick={() => setView(replayFrom)} className="text-gray-400 hover:text-white text-sm">{t.battle.back}</button>
        <h1 className="text-xl font-black text-yellow-400">{t.battle.replay.title}</h1>
        <span className="text-xs text-gray-500">{replayRounds ? `R${replayRoundIdx + 1}/${replayRounds.length} ` : ""}{replayIdx}/{replayCards.hpSnaps.length}</span>
      </div>
      <div className="flex justify-center items-start gap-4 sm:gap-8 flex-wrap">
        <div className={`flex flex-col items-center gap-2 relative ${replayShake === "player" ? "screen-shake" : ""}`}>
          <span className="text-sm text-blue-400 font-bold">{rp.displayName}</span>
          <TcgCard card={rp} size="lg" />
          {replayDmgPop?.side === "player" && <div key={replayDmgPop.key} className="dmg-pop absolute top-8 left-1/2 -translate-x-1/2 text-2xl font-black text-red-400 pointer-events-none z-10">-{replayDmgPop.val}</div>}
          <HpBar current={replayPHp} max={rp.hp} flash={replayHpFlash === "player"} />
        </div>
        <div className="text-2xl sm:text-4xl font-black text-gray-600 sm:mt-20">VS</div>
        <div className={`flex flex-col items-center gap-2 relative ${replayShake === "enemy" ? "screen-shake" : ""}`}>
          <span className="text-sm text-red-400 font-bold">{re.displayName}</span>
          <TcgCard card={re} size="lg" />
          {replayDmgPop?.side === "enemy" && <div key={replayDmgPop.key} className="dmg-pop absolute top-8 left-1/2 -translate-x-1/2 text-2xl font-black text-red-400 pointer-events-none z-10">-{replayDmgPop.val}</div>}
          <HpBar current={replayEHp} max={re.hp} flash={replayHpFlash === "enemy"} />
        </div>
      </div>
      {done && <div className="text-yellow-400 font-bold">{t.battle.replay.done}</div>}
      <SpeedSlider localSpeed={localSpeed} setLocalSpeed={setLocalSpeed} t={t} />
      {replayLog.length > 0 && (
        <div className="max-w-lg w-full bg-gray-900 rounded-xl p-4 space-y-1 max-h-40 overflow-y-auto">
          {replayLog.map((line, i) => (
            <p key={i} className={`text-sm ${line.includes("🏆") ? "text-yellow-400 font-bold" : line.includes("💀") ? "text-red-400 font-bold" : "text-gray-300"}`}>{line}</p>
          ))}
        </div>
      )}
    </div>
  );
}
