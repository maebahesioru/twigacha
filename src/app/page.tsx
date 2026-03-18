"use client";
import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, LayoutGrid, Layers, Star, Copy, Share2, PackageOpen } from "lucide-react";
import TcgCard from "@/components/TcgCard";
import { useGameStore } from "@/store/useGameStore";
import { useT } from "@/hooks/useT";
import type { TwitterCard } from "@/types";
import Confetti from "@/components/Confetti";
import { playMissionComplete } from "@/lib/audio";
import LoginBonus from "@/components/LoginBonus";

const LOADING_MSGS = [
  "🔮 運命のカードを探しています...", "✨ 星の配置を確認中...", "🎴 カードを召喚中...",
  "⚡ エネルギーを収束中...", "🌀 次元の扉を開いています...", "🎲 運命を決定中...",
  "🔥 レアカードの気配...", "💫 宇宙の意志に問いかけ中...", "🃏 デッキをシャッフル中...",
  "🌟 奇跡を引き寄せています...",
];
const POWER_MSGS = ["念を込めてタップ！", "もっと！", "いい感じ！", "レアが近い...！", "MAX念力！！"];

function LoadingPack({ packSrc }: { packSrc: string }) {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * LOADING_MSGS.length));
  const [taps, setTaps] = useState(0);
  const [sparks, setSparks] = useState<{ id: number; x: number; y: number }[]>([]);
  const [glow, setGlow] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % LOADING_MSGS.length), 900);
    return () => clearInterval(t);
  }, []);
  const handleTap = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now() + Math.random();
    setSparks(s => [...s, { id, x, y }]);
    setTimeout(() => setSparks(s => s.filter(sp => sp.id !== id)), 600);
    setTaps(t => t + 1);
    setGlow(true);
    setTimeout(() => setGlow(false), 200);
  };
  const powerLevel = Math.min(Math.floor(taps / 3), POWER_MSGS.length - 1);
  return (
    <div className="flex flex-col items-center gap-2 cursor-pointer select-none" onClick={handleTap}>
      <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-[32rem]">
        <img src={packSrc} alt="" className="w-full drop-shadow-2xl"
          style={{ clipPath: "inset(10% 0 0 0)", filter: glow ? "brightness(1.5) saturate(2)" : "none", transition: "filter 0.1s" }} />
        {sparks.map(sp => (
          <div key={sp.id} className="pointer-events-none absolute text-yellow-300 text-xl font-black animate-ping"
            style={{ left: sp.x, top: sp.y, transform: "translate(-50%,-50%)" }}>✨</div>
        ))}
      </div>
      {taps > 0 && <p className="text-yellow-400 text-xs font-bold">{POWER_MSGS[powerLevel]} ({taps})</p>}
      <p className="text-gray-400 text-sm animate-pulse">{LOADING_MSGS[idx]}</p>
    </div>
  );
}
export default function GachaPage() {
  const [cards, setCards] = useState<TwitterCard[]>([]);
  const [revealed, setRevealed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tearing, setTearing] = useState(false);
  const [flipState, setFlipState] = useState<'idle'|'out'|'in'>('idle');
  const [flipDir, setFlipDir] = useState<'next'|'prev'>('next');

  const [soundOn, setSoundOn] = useState(true);
  const [viewMode, setViewMode] = useState<'flip'|'grid'>('flip');
  const [flash, setFlash] = useState<'none'|'sr'|'ssr'|'ur'|'lr'>('none');
  const [missionConfetti, setMissionConfetti] = useState(false);
  const prevAllDone = useRef<boolean | null>(null);
  const [isNewCard, setIsNewCard] = useState(false);
  const [particles, setParticles] = useState<{id:number;tx:string;ty:string;color:string}[]>([]);
  const [pickupQuery, setPickupQuery] = useState("");
  const [serialCode, setSerialCode] = useState("");
  const [serialMsg, setSerialMsg] = useState<string | null>(null);

  const touchStartX = useRef(0);

  function playFlip() {
    try {
      const ctx = new AudioContext();
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const gain = ctx.createGain();
      gain.gain.value = 0.3;
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();
    } catch {}
  }

  function playSE(type: 'sr'|'ssr'|'ur'|'lr'|'gacha') {
    try {
      const ctx = new AudioContext();
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      if (type === 'gacha') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(600, t + 0.15);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.start(t); osc.stop(t + 0.3);
      } else if (type === 'sr') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.setValueAtTime(660, t + 0.1);
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.start(t); osc.stop(t + 0.5);
      } else {
        // SSR/UR/LR: 上昇アルペジオ
        const freqs = type === 'lr' ? [523,659,784,1047,1319] : type === 'ur' ? [523,659,784,1047] : [523,659,784];
        freqs.forEach((f, i) => {
          const o2 = ctx.createOscillator();
          const g2 = ctx.createGain();
          o2.connect(g2); g2.connect(ctx.destination);
          o2.type = 'sine'; o2.frequency.value = f;
          const st = t + i * 0.1;
          g2.gain.setValueAtTime(0, st);
          g2.gain.linearRampToValueAtTime(0.4, st + 0.05);
          g2.gain.exponentialRampToValueAtTime(0.001, st + 0.4);
          o2.start(st); o2.stop(st + 0.4);
        });
        return;
      }
    } catch {}
  }

  function flipTo(next: number, dir: 'next'|'prev') {
    if (soundOn) playFlip();
    setFlipDir(dir);
    setFlipState('out');
    setTimeout(() => {
      setRevealed(next);
      setFlipState('in');
      setIsNewCard(true);
      setTimeout(() => setIsNewCard(false), 400);
      const card = cards[next - 1];
      if (card && soundOn) {
        const r = card.rarity;
        if (r === 'LR') { playSE('lr'); setFlash('lr'); }
        else if (r === 'UR') { playSE('ur'); setFlash('ur'); }
        else if (r === 'SSR') { playSE('ssr'); setFlash('ssr'); }
        else if (r === 'SR') { playSE('sr'); setFlash('sr'); }
        else setFlash('none');
        if (['SSR','UR','LR'].includes(r)) {
          const colors = r === 'LR' ? ['#ffd700','#ff6b6b','#a78bfa','#34d399'] : r === 'UR' ? ['#c084fc','#f472b6','#60a5fa'] : ['#fbbf24','#f59e0b','#fcd34d'];
          const ps = Array.from({length: 12}, (_, i) => ({
            id: Date.now() + i,
            tx: `${(Math.random() - 0.5) * 200}px`,
            ty: `${-(Math.random() * 150 + 50)}px`,
            color: colors[i % colors.length],
          }));
          setParticles(ps);
          setTimeout(() => setParticles([]), 800);
        }
        if (['SR','SSR','UR','LR'].includes(r)) setTimeout(() => setFlash('none'), 800);
      }
    }, 150);
    setTimeout(() => setFlipState('idle'), 300);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) < 40) return;
    if (dx < 0 && revealed < cards.length) flipTo(revealed + 1, 'next');
    if (dx > 0 && revealed > 1) flipTo(revealed - 1, 'prev');
  }
  const [error, setError] = useState("");
  const { addCard, hasCard, packCount, packDate, openPack, bonusPacks, bonusPackDate, usedBonusPacks, usedBonusDate, srDate, srDone, markSR, twitterDate, twitterDone, markTwitter, shareDate, shareDone, markShare, battleDate, battleDone, raidMissionDate, raidMissionDone, toggleFavorite, favorites, pityCount, addPity, resetPity, setLastPackCards, incrementCardPullCount, totalPackCount, collection, cardPullCounts, quest311Date, quest311Rewarded, claimQuest311 } = useGameStore();
  const t = useT();
  const today = new Date().toDateString();
  const is311 = new Date().getMonth() === 2 && new Date().getDate() === 11;
  const quest311Done = quest311Date === today && quest311Rewarded;
  const DAILY_LIMIT = 10;
  const todayPackCount = packDate === today ? packCount : 0;
  const todayBonus = bonusPackDate === today ? bonusPacks : 0;
  const todayUsed = usedBonusDate === today ? usedBonusPacks : 0;
  const remaining = Math.max(0, DAILY_LIMIT - todayPackCount) + Math.max(0, todayBonus - todayUsed);
  const effectiveLimit = todayPackCount + remaining;
  const todaySR = srDate === today && srDone;
  const todayTwitter = twitterDate === today && twitterDone;
  const todayShare = shareDate === today && shareDone;
  const todayBattle = battleDate === today && battleDone;
  const todayRaid = raidMissionDate === today && raidMissionDone;
  const MISSION_PACKS = 5;
  const allMissionsDone = todayPackCount >= MISSION_PACKS && todaySR && todayTwitter && todayShare && todayBattle && todayRaid;
  useEffect(() => {
    if (prevAllDone.current !== null && allMissionsDone && !prevAllDone.current) { setMissionConfetti(true); setTimeout(() => setMissionConfetti(false), 3000); playMissionComplete(); }
    prevAllDone.current = allMissionsDone;
  }, [allMissionsDone]);

  async function pull(count: 5) {
    setLoading(true);
    setError("");
    setCards([]);
    setRevealed(0);
    try {
      const res = await fetch(`/api/gacha?count=${count}`);
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) {
        setError(t.gacha.noCards);
        return;
      }
      const valid = data.filter((c): c is TwitterCard => c && !c.error);
      if (!valid.length) {
        setError(t.gacha.noCards);
      } else {
        // 天井: 10パック連続SR以上なしなら1枚をSRに底上げ
        const hasSR = valid.some(c => ["SR","SSR","UR","LR"].includes(c.rarity));
        const hasSSR = valid.some(c => ["SSR","UR","LR"].includes(c.rarity));
        let finalCards = valid;
        if (!hasSSR && pityCount >= 9) {
          // 最高ステータスのカードをSSRに底上げ（通常SSRと同じ×1.7倍率）
          const totals = valid.map(c => c.atk + c.def + c.spd + c.hp + c.int + c.luk);
          const idx = totals.indexOf(Math.max(...totals));
          const base = valid[idx];
          // rarityBonusを除いた元のステータスに戻してからSSR倍率(1.7)をかける
          const currentBonus = { C: 0.9, N: 1, R: 1.15, SR: 1.4, SSR: 1.7, UR: 2.0, LR: 2.4 }[base.rarity];
          const ssrBonus = 1.7;
          const scale = ssrBonus / currentBonus;
          const target = {
            ...base,
            atk: Math.round(base.atk * scale),
            def: Math.round(base.def * scale),
            spd: Math.round(base.spd * scale),
            hp:  Math.round(base.hp  * scale),
            int: Math.round(base.int * scale),
            luk: Math.round(base.luk * scale),
            rarity: "SSR" as const,
          };
          finalCards = valid.map((c, i) => i === idx ? target : c);
          resetPity();
        } else if (hasSSR) {
          resetPity();
        } else {
          addPity();
        }
        finalCards.forEach(addCard);
        finalCards.forEach(c => incrementCardPullCount(c.id));
        setLastPackCards(finalCards);
        openPack();
        if (!todaySR && finalCards.some(c => ["SSR","UR","LR"].includes(c.rarity))) markSR();
        setCards(finalCards);
        setRevealed(1);
      }
    } finally {
      setLoading(false);
    }
  }

  async function redeemSerial() {
    if (!serialCode.trim()) return;
    setSerialMsg(null);
    const res = await fetch('/api/serial', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: serialCode.trim() }) });
    const data = await res.json();
    if (data.card) {
      addCard(data.card);
      setSerialMsg(t.gacha.serial.success);
      setSerialCode("");
    } else {
      const key = data.error as keyof typeof t.gacha.serial;
      setSerialMsg(t.gacha.serial[key] ?? t.gacha.serial.invalid);
    }
  }

  async function pullPickup(query: string) {
    if (remaining < 5) return;
    setLoading(true); setError(""); setCards([]); setRevealed(0);
    try {
      const [pickupRes, randomRes] = await Promise.all([
        fetch(`/api/gacha?count=5&query=${encodeURIComponent(query)}`),
        fetch(`/api/gacha?count=5`),
      ]);
      const [pickupData, randomData] = await Promise.all([pickupRes.json(), randomRes.json()]);
      const pickup = Array.isArray(pickupData) ? pickupData.filter((c): c is TwitterCard => c && !c.error) : [];
      const random = Array.isArray(randomData) ? randomData.filter((c): c is TwitterCard => c && !c.error) : [];
      if (!pickup.length) { setError(t.gacha.noCards); return; }
      const valid = pickup.map((c, i) => Math.random() < 0.5 ? c : (random[i] ?? c));
      valid.forEach(addCard); valid.forEach(c => incrementCardPullCount(c.id));
      setLastPackCards(valid);
      openPack(); openPack(); openPack(); openPack(); openPack();
      setCards(valid); setRevealed(1);
    } finally { setLoading(false); }
  }

  const current = cards[revealed - 1];
  const hasMore = revealed < cards.length;
  const isDone = cards.length > 0 && revealed >= cards.length;

  return (
    <div className="min-h-dvh bg-gray-950 text-white flex flex-col items-center py-10 px-4 slide-in-up">
      {missionConfetti && <Confetti count={80} />}
      <LoginBonus />
      {process.env.NODE_ENV === "development" && (
        <div className="fixed top-16 right-2 z-50 flex flex-col gap-1 bg-black/80 border border-yellow-500 rounded-lg p-2">
          <p className="text-yellow-400 text-xs font-bold">🛠 DEBUG</p>
          <button onClick={() => useGameStore.setState(s => ({ bonusPacks: (s.bonusPacks ?? 0) + 10, bonusPackDate: new Date().toDateString() }))}
            className="bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded">
            {t.gacha.tenPackLabel}
          </button>
        </div>
      )}

      {/* ガチャボタン (結果表示中は非表示) */}
      {cards.length === 0 && (
        <div className="mb-10 flex flex-col items-center">
          <p className="text-lg font-bold mb-1">
            {t.gacha.todayPack} <span className="text-pink-400">{remaining}</span><span className="text-gray-500"> / {DAILY_LIMIT}</span>
          </p>
          {todayPackCount === 0 && <p className="text-yellow-400 text-sm font-bold animate-pulse mb-3">{t.gacha.packFull}</p>}
          <p className="text-sm mb-1">
            {pityCount >= 9
              ? <span className="text-yellow-300 font-bold animate-pulse">{t.gacha.pityConfirm}</span>
              : pityCount >= 7
              ? <span className="text-orange-400 font-bold">{t.gacha.pityWarn(10 - pityCount)}</span>
              : <span className="text-gray-400">{t.gacha.pityNormal(10 - pityCount)}</span>
            }
          </p>
          <button
            onClick={() => {
              if (tearing || loading || todayPackCount >= effectiveLimit) return;
              const q = pickupQuery.trim();
              if (q && remaining < 5) return;
              if (soundOn) playSE('gacha');
              setTearing(true);
              setTimeout(() => { setTearing(false); q ? pullPickup(q) : pull(5); }, 500);
            }}
            disabled={tearing || loading || todayPackCount >= effectiveLimit}
            className={`hover:scale-105 active:scale-95 transition disabled:opacity-50 ${!loading && !tearing && todayPackCount < effectiveLimit ? 'float' : ''}`}
          >
            {loading ? (
              <LoadingPack packSrc={pityCount >= 9 ? "/pack-sr.png" : "/pack.png"} />
            ) : (
              <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-[32rem]">
                <img src={pityCount >= 9 ? "/pack-sr.png" : "/pack.png"} alt="" className="w-full drop-shadow-2xl"
                  style={{ clipPath: "inset(10% 0 0 0)" }} />
                <img src={pityCount >= 9 ? "/pack-sr.png" : "/pack.png"} alt={t.gacha.tapToOpen} className="w-full absolute top-0 left-0"
                  style={{
                    clipPath: "inset(0 0 90% 0)",
                    ...(tearing ? { animation: "pack-top-fly 0.5s ease-in forwards" } : {}),
                  }} />
              </div>
            )}
          </button>
          {!loading && todayPackCount < effectiveLimit && <p className="text-gray-400 text-sm mt-2 animate-bounce">{t.gacha.tapToOpen}</p>}
          {!loading && todayPackCount >= effectiveLimit && <p className="text-red-400 text-sm mt-2">{t.gacha.limitReached}</p>}

          {/* ピックアップガチャ */}
          <div className="mt-4 w-full max-w-sm bg-gray-800/80 rounded-xl p-3 text-sm">
            <p className="font-bold text-gray-300 mb-2">{t.gacha.pickup.title} <span className="text-yellow-400 text-xs font-normal">{t.gacha.pickup.cost}</span></p>
            <div className="flex gap-2">
              <input
                value={pickupQuery}
                onChange={e => setPickupQuery(e.target.value)}
                placeholder={t.gacha.pickup.placeholder}
                maxLength={5}
                className="w-full bg-gray-700 rounded px-2 py-1 text-white text-xs outline-none"
              />
            </div>
            {remaining < 5 && <p className="text-red-400 text-xs mt-1">{t.gacha.pickup.notEnough}</p>}
          </div>

          {/* シリアルコード */}
          <div className="mt-4 w-full max-w-sm bg-gray-800/80 rounded-xl p-3 text-sm">
            <p className="font-bold text-gray-300 mb-2">{t.gacha.serial.title}</p>
            <div className="flex gap-2">
              <input
                value={serialCode}
                onChange={e => setSerialCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && redeemSerial()}
                placeholder={t.gacha.serial.placeholder}
                className="w-full bg-gray-700 rounded px-2 py-1 text-white text-xs outline-none"
              />
              <button onClick={redeemSerial} className="bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded whitespace-nowrap">{t.gacha.serial.button}</button>
            </div>
            {serialMsg && <p className={`text-xs mt-1 ${serialMsg === t.gacha.serial.success ? 'text-green-400' : 'text-red-400'}`}>{serialMsg}</p>}
          </div>

          {/* デイリーミッション */}
          <div className="mt-4 w-full max-w-xs bg-gray-800/80 rounded-xl p-3 text-sm">
            <p className="font-bold text-gray-300 mb-2">📋 {t.gacha.missions} <span className="text-yellow-400 text-xs font-normal">{t.gacha.missionEach} {t.gacha.missionReward}</span></p>
            <div className="flex items-center justify-between mb-1">
              <span className={todayPackCount >= MISSION_PACKS ? "line-through text-gray-500" : "text-white"}>{t.gacha.missionItems[0]}</span>
              <span className={todayPackCount >= MISSION_PACKS ? "text-green-400 font-bold" : "text-pink-400 font-bold"}>
                {todayPackCount >= MISSION_PACKS ? "✓" : `${todayPackCount}/${MISSION_PACKS}`}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={todaySR ? "line-through text-gray-500" : "text-white"}>{t.gacha.missionItems[1]}</span>
              <span className={todaySR ? "text-green-400 font-bold" : "text-pink-400 font-bold"}>
                {todaySR ? "✓" : "0/1"}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className={todayTwitter ? "line-through text-gray-500" : "text-white"}>{t.gacha.missionItems[2]}</span>
              <span className={todayTwitter ? "text-green-400 font-bold" : "text-pink-400 font-bold"}>
                {todayTwitter ? "✓" : "0/1"}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className={todayShare ? "line-through text-gray-500" : "text-white"}>{t.gacha.missionItems[3]}</span>
              <span className={todayShare ? "text-green-400 font-bold" : "text-pink-400 font-bold"}>
                {todayShare ? "✓" : "0/1"}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className={todayBattle ? "line-through text-gray-500" : "text-white"}>{t.gacha.missionItems[4]}</span>
              <span className={todayBattle ? "text-green-400 font-bold" : "text-pink-400 font-bold"}>
                {todayBattle ? "✓" : "0/1"}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className={todayRaid ? "line-through text-gray-500" : "text-white"}>{t.gacha.missionItems[5]}</span>
              <span className={todayRaid ? "text-green-400 font-bold" : "text-pink-400 font-bold"}>
                {todayRaid ? "✓" : "0/1"}
              </span>
            </div>
          </div>

          {/* 3.11特別クエスト */}
          {is311 && (
            <div className="mt-3 w-full max-w-xs bg-blue-900/60 border border-blue-500/40 rounded-xl p-3 text-sm">
              <p className="font-bold text-blue-300 mb-1">🕯️ {t.gacha.quest311.title}</p>
              <p className="text-gray-300 text-xs mb-2">{t.gacha.quest311.desc}</p>
              {quest311Done ? (
                <p className="text-green-400 font-bold text-center">✓ {t.gacha.quest311.done}</p>
              ) : (
                <a href="https://search.yahoo.co.jp/search?p=3.11" target="_blank" rel="noopener noreferrer"
                  onClick={() => { claimQuest311(); }}
                  className="block w-full text-center bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg transition">
                  {t.gacha.quest311.btn}
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-red-400 mb-6 text-sm bg-red-900/30 px-4 py-2 rounded-lg">{error}</p>
      )}

      {/* めくり表示 */}
      {!loading && cards.length > 0 && (
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-3">
            <p className="text-base font-bold">{t.gacha.todayPack}: <span className="text-pink-400">{remaining}</span><span className="text-gray-500"> / {DAILY_LIMIT}</span> &nbsp;|&nbsp; <span className="text-pink-400">{revealed}</span><span className="text-gray-500"> / {cards.length}</span></p>
            <button onClick={() => setSoundOn(v => !v)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition ${soundOn ? "bg-pink-500/30 text-pink-300" : "bg-gray-700 text-gray-500"}`}>
              {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button onClick={() => setViewMode(v => v === 'flip' ? 'grid' : 'flip')}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition ${viewMode === 'grid' ? "bg-pink-500/30 text-pink-300" : "bg-gray-700 text-gray-500"}`}>
              {viewMode === 'flip' ? <LayoutGrid size={18} /> : <Layers size={18} />}
            </button>
          </div>
          {todayPackCount >= effectiveLimit && <p className="text-red-400 text-sm font-bold animate-pulse">{t.gacha.limitReached}</p>}

          {/* 一覧表示 */}
          {viewMode === 'grid' && (
            <div className="flex flex-wrap gap-4 justify-center">
              {[...cards].sort((a, b) => ['LR','UR','SSR','SR','R','N','C'].indexOf(a.rarity) - ['LR','UR','SSR','SR','R','N','C'].indexOf(b.rarity)).map((card, i) => (
                <div key={card.id} className="relative slide-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                  <TcgCard card={card} size="md" onClick={markTwitter} />
                </div>
              ))}
            </div>
          )}

          {/* めくり表示 */}
          {viewMode === 'flip' && (
          <div className="flex items-center gap-4">
            {/* 戻るボタン */}
            <button
              onClick={() => flipTo(Math.max(1, revealed - 1), 'prev')}
              disabled={revealed <= 1}
              className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-20 transition text-2xl flex items-center justify-center z-10 relative"
            >
              ←
            </button>

            <div className="min-h-80 flex items-center justify-center"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div className="relative w-52 h-[22rem] sm:w-64 sm:h-[26rem]">
                {/* 前のカード（左斜め） */}
                {/* 前のカード（左にずれて傾く） */}
                {cards.slice(0, revealed - 1).slice(-3).reverse().map((_, i) => (
                  <div key={`prev-${i}`}
                    className="absolute inset-0 w-52 h-[22rem] sm:w-64 sm:h-[26rem] bg-gray-800 border border-gray-600 rounded-xl"
                    style={{ transform: `translateX(${-(i + 1) * 18}px) rotate(${-(i + 1) * 5}deg)`, opacity: 0.8 - i * 0.2 }}
                  />
                ))}
                {/* 次のカード（右にずれて傾く） */}
                {cards.slice(revealed).slice(0, 3).reverse().map((_, ri) => {
                  const i = 2 - ri;
                  return (
                    <div key={`next-${i}`}
                      className="absolute inset-0 w-52 h-[22rem] sm:w-64 sm:h-[26rem] bg-gray-800 border border-gray-600 rounded-xl"
                      style={{ transform: `translateX(${(i + 1) * 18}px) rotate(${(i + 1) * 5}deg)`, opacity: 0.8 - i * 0.2 }}
                    />
                  );
                })}
                {/* フラッシュ演出 */}
                {flash !== 'none' && (
                  <div className="absolute inset-0 rounded-xl pointer-events-none z-30 animate-ping"
                    style={{ background: flash === 'lr' ? 'radial-gradient(circle, rgba(255,215,0,0.7) 0%, transparent 70%)' : flash === 'ur' ? 'radial-gradient(circle, rgba(192,132,252,0.7) 0%, transparent 70%)' : flash === 'ssr' ? 'radial-gradient(circle, rgba(251,191,36,0.6) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(96,165,250,0.5) 0%, transparent 70%)' }} />
                )}
                {/* 手前のカード */}
                <div className="absolute inset-0 card-3d" style={{
                  animation: isNewCard
                    ? 'card-reveal 0.35s ease-out forwards'
                    : flipState === 'out'
                    ? `${flipDir === 'next' ? 'to-left-stack' : 'to-right-stack'} 0.15s ease-in forwards`
                    : flipState === 'in'
                    ? `${flipDir === 'next' ? 'from-right-stack' : 'from-left-stack'} 0.15s ease-out forwards`
                    : undefined,
                }}>
                  <TcgCard card={current} size="lg" onClick={markTwitter} />
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(current.id); }}
                    aria-label={favorites.includes(current.id) ? t.gacha.favRemove : t.gacha.favAdd}
                    className="absolute -bottom-3 -right-3 z-20 text-yellow-400"
                  >
                    <Star size={24} fill={favorites.includes(current.id) ? "currentColor" : "none"} />
                  </button>
                </div>
                {/* パーティクル */}
                {particles.map(p => (
                  <div key={p.id} className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full pointer-events-none z-40"
                    style={{ background: p.color, '--tx': p.tx, '--ty': p.ty, animation: 'particle-burst 0.7s ease-out forwards' } as React.CSSProperties} />
                ))}
              </div>
            </div>

            {/* 次へボタン */}
            <button
              onClick={() => flipTo(Math.min(cards.length, revealed + 1), 'next')}
              disabled={revealed >= cards.length}
              className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 disabled:opacity-20 transition text-2xl flex items-center justify-center shadow-lg z-10 relative"
            >
              →
            </button>
          </div>
          )}

          {cards.length > 0 && (
            <div className="flex flex-wrap gap-3 justify-center w-full px-2">
              <button
                onClick={() => { setCards([]); setRevealed(0); }}
                className="px-6 py-3 bg-gray-700 rounded-xl font-bold hover:bg-gray-600 transition flex items-center gap-2"
              >
                <PackageOpen size={18} /> {t.gacha.back}
              </button>
              <button
                onClick={() => {
                  const text = cards.map(c => `${c.rarity} ${c.element} ${c.displayName} (@${c.username})`).join('\n');
                  navigator.clipboard.writeText(text);
                }}
                className="px-6 py-3 bg-gray-700 rounded-xl font-bold hover:bg-gray-600 transition flex items-center gap-2"
              >
                <Copy size={18} /> {t.gacha.copy}
              </button>
              <button
                onClick={() => {
                  const text = cards.map(c => `${c.rarity}${c.element} ${c.displayName}`).join('\n');
                  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(t.gacha.shareText(text))}&url=${encodeURIComponent('https://twigacha.vercel.app')}`;
                  window.open(url, '_blank');
                  markShare();
                }}
                className="px-6 py-3 bg-sky-600 rounded-xl font-bold hover:bg-sky-500 transition flex items-center gap-2"
              >
                <Share2 size={18} /> {t.gacha.share}
              </button>
              <button
                onClick={() => {
                  const text = cards.map(c => `${c.rarity}${c.element} ${c.displayName}`).join('\n');
                  const shareText = t.gacha.shareText(text) + '\nhttps://twigacha.vercel.app';
                  const url = `https://bsky.app/intent/compose?text=${encodeURIComponent(shareText)}`;
                  window.open(url, '_blank');
                  markShare();
                }}
                className="px-6 py-3 bg-blue-500 rounded-xl font-bold hover:bg-blue-400 transition flex items-center gap-2"
              >
                <Share2 size={18} /> Bluesky
              </button>
              <button
                onClick={() => {
                  const text = cards.map(c => `${c.rarity}${c.element} ${c.displayName}`).join('\n');
                  const shareText = t.gacha.shareText(text) + '\nhttps://twigacha.vercel.app';
                  window.open(`https://misskeyshare.link/share.html?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent('https://twigacha.vercel.app')}`, '_blank');
                  markShare();
                }}
                className="px-6 py-3 bg-cyan-600 rounded-xl font-bold hover:bg-cyan-500 transition flex items-center gap-2"
              >
                <Share2 size={18} /> Misskey
              </button>
              <button
                onClick={() => {
                  const text = cards.map(c => `${c.rarity}${c.element} ${c.displayName}`).join('\n');
                  const shareText = t.gacha.shareText(text) + '\nhttps://twigacha.vercel.app';
                  window.open(`https://donshare.net/share.html?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent('https://twigacha.vercel.app')}`, '_blank');
                  markShare();
                }}
                className="px-6 py-3 bg-indigo-600 rounded-xl font-bold hover:bg-indigo-500 transition flex items-center gap-2"
              >
                <Share2 size={18} /> Mastodon
              </button>
            </div>
          )}
        </div>
      )}

      {/* ガチャ統計 */}
      {totalPackCount > 0 && (() => {
        const rarityCount = (r: string) => collection.filter(c => c.rarity === r).length;
        const total = collection.length;
        const maxDupe = Math.max(0, ...Object.values(cardPullCounts));
        const maxDupeCard = collection.find(c => (cardPullCounts[c.id] ?? 1) === maxDupe);
        const srRate = totalPackCount > 0 ? (collection.filter(c => ['SSR','UR','LR'].includes(c.rarity)).length / (totalPackCount * 5) * 100).toFixed(1) : '0';
        const urRate = totalPackCount > 0 ? (collection.filter(c => ['UR','LR'].includes(c.rarity)).length / (totalPackCount * 5) * 100).toFixed(2) : '0';
        const dupeCount = Object.values(cardPullCounts).filter(n => n >= 2).length;
        const topCard = collection.length > 0 ? collection.reduce((a, b) => (a.atk+a.def+a.spd+a.hp+a.int+a.luk) > (b.atk+b.def+b.spd+b.hp+b.int+b.luk) ? a : b) : null;
        const topFollower = collection.length > 0 ? collection.reduce((a, b) => a.followers > b.followers ? a : b) : null;
        const topTweet = collection.length > 0 ? collection.reduce((a, b) => a.tweets > b.tweets ? a : b) : null;
        const avgStats = collection.length > 0 ? Math.round(collection.reduce((s, c) => s + c.atk+c.def+c.spd+c.hp+c.int+c.luk, 0) / collection.length) : 0;
        const verifiedCount = collection.filter(c => c.verified).length;
        const urCount = collection.filter(c => ['UR','LR'].includes(c.rarity)).length;
        const RARITY_SCORE: Record<string,number> = { N:1, C:2, R:3, UC:4, SR:5, SSR:10, UR:20, LR:50 };
        const avgValue = totalPackCount > 0 ? (collection.reduce((s,c) => s+(RARITY_SCORE[c.rarity]??1), 0) / totalPackCount).toFixed(1) : '0';
        const withJoined = collection.filter(c => c.joined && /^\d{4}/.test(c.joined));
        const oldestCard = withJoined.length > 0 ? withJoined.reduce((a,b) => a.joined! < b.joined! ? a : b) : null;
        const newestCard = withJoined.length > 0 ? withJoined.reduce((a,b) => a.joined! > b.joined! ? a : b) : null;
        const pityLeft = 10 - pityCount;
        const elements = collection.map(c => c.element).filter(Boolean);
        const elCounts = elements.reduce((a, e) => ({ ...a, [e]: (a[e] ?? 0) + 1 }), {} as Record<string, number>);
        const topEl = Object.entries(elCounts).sort((a, b) => b[1] - a[1])[0];
        return (
          <div className="w-full max-w-md bg-gray-900/60 rounded-2xl p-5 border border-gray-800 mt-4">
            <h3 className="font-black text-lg mb-3 text-gray-200">📊 {t.collection.stats.gachaStats}</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-gray-800/60 rounded-xl p-3"><div className="text-gray-400 text-xs">{t.collection.stats.totalPulls}</div><div className="font-bold text-white text-lg">{totalPackCount.toLocaleString()}</div></div>
              <div className="bg-gray-800/60 rounded-xl p-3"><div className="text-gray-400 text-xs">{t.collection.stats.ownedCards}</div><div className="font-bold text-white text-lg">{total.toLocaleString()}</div></div>
              <div className="bg-gray-800/60 rounded-xl p-3"><div className="text-gray-400 text-xs">{t.collection.stats.ssrRate}</div><div className="font-bold text-yellow-400 text-lg">{srRate}%</div></div>
              <div className="bg-gray-800/60 rounded-xl p-3"><div className="text-gray-400 text-xs">{t.collection.stats.urRate}</div><div className="font-bold text-purple-400 text-lg">{urRate}%</div></div>
              <div className="bg-gray-800/60 rounded-xl p-3"><div className="text-gray-400 text-xs">{t.collection.stats.maxDupe}</div><div className="font-bold text-pink-400 text-lg">{maxDupe} {maxDupeCard ? `(${maxDupeCard.displayName.slice(0,8)})` : ''}</div></div>
              <div className="bg-gray-800/60 rounded-xl p-3"><div className="text-gray-400 text-xs">{t.collection.stats.dupeCount}</div><div className="font-bold text-pink-300 text-lg">{dupeCount}</div></div>
              <div className="bg-gray-800/60 rounded-xl p-3"><div className="text-gray-400 text-xs">{t.collection.stats.pityLeft}</div><div className={`font-bold text-lg ${pityLeft <= 3 ? 'text-orange-400' : 'text-gray-200'}`}>{pityLeft}</div></div>
              <div className="bg-gray-800/60 rounded-xl p-3"><div className="text-gray-400 text-xs">{t.collection.stats.verified}</div><div className="font-bold text-blue-400 text-lg">🔹 {verifiedCount}</div></div>
              <div className="bg-gray-800/60 rounded-xl p-3"><div className="text-gray-400 text-xs">{t.collection.stats.urCount}</div><div className="font-bold text-purple-300 text-lg">{urCount}</div></div>
              <div className="bg-gray-800/60 rounded-xl p-3"><div className="text-gray-400 text-xs">{t.collection.stats.avgStats}</div><div className="font-bold text-cyan-400 text-lg">{avgStats.toLocaleString()}</div></div>
              <div className="bg-gray-800/60 rounded-xl p-3"><div className="text-gray-400 text-xs">{t.collection.stats.avgValue}</div><div className="font-bold text-yellow-300 text-lg">{avgValue}</div></div>
            </div>
            {topCard && (
              <div className="mt-2 bg-gray-800/60 rounded-xl p-3 text-sm">
                <div className="text-gray-400 text-xs mb-1">{t.collection.stats.topCard}</div>
                <div className="font-bold text-white truncate">{topCard.displayName} <span className="text-gray-400 text-xs">({topCard.atk+topCard.def+topCard.spd+topCard.hp+topCard.int+topCard.luk} total)</span></div>
              </div>
            )}
            {topFollower && (
              <div className="mt-2 bg-gray-800/60 rounded-xl p-3 text-sm">
                <div className="text-gray-400 text-xs mb-1">{t.collection.stats.topFollower}</div>
                <div className="font-bold text-white truncate">{topFollower.displayName} <span className="text-gray-400 text-xs">({topFollower.followers.toLocaleString()})</span></div>
              </div>
            )}
            {topTweet && (
              <div className="mt-2 bg-gray-800/60 rounded-xl p-3 text-sm">
                <div className="text-gray-400 text-xs mb-1">{t.collection.stats.topTweet}</div>
                <div className="font-bold text-white truncate">{topTweet.displayName} <span className="text-gray-400 text-xs">({topTweet.tweets.toLocaleString()})</span></div>
              </div>
            )}
            {oldestCard && newestCard && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="bg-gray-800/60 rounded-xl p-3 text-sm">
                  <div className="text-gray-400 text-xs mb-1">{t.collection.stats.oldestCard}</div>
                  <div className="font-bold text-white truncate text-xs">{oldestCard.displayName} <span className="text-gray-500">({oldestCard.joined?.slice(0,4)})</span></div>
                </div>
                <div className="bg-gray-800/60 rounded-xl p-3 text-sm">
                  <div className="text-gray-400 text-xs mb-1">{t.collection.stats.newestCard}</div>
                  <div className="font-bold text-white truncate text-xs">{newestCard.displayName} <span className="text-gray-500">({newestCard.joined?.slice(0,4)})</span></div>
                </div>
              </div>
            )}
            {Object.keys(elCounts).length > 0 && (
              <div className="mt-2 bg-gray-800/60 rounded-xl p-3 text-sm">
                <div className="text-gray-400 text-xs mb-2">{t.collection.stats.elementDist}</div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(elCounts).sort((a,b) => b[1]-a[1]).map(([el, n]) => (
                    <span key={el} className="text-xs bg-gray-700 rounded-full px-2 py-0.5">{el} {n}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-1">
              {(['LR','UR','SSR','SR','R','N','C'] as const).map(r => (
                <span key={r} className="text-xs bg-gray-800 rounded-full px-2 py-0.5 text-gray-300">{r}: {rarityCount(r)}</span>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
