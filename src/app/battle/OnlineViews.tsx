"use client";
import { useState, useRef, useEffect } from "react";
import TcgCard from "@/components/TcgCard";
import { useT } from "@/hooks/useT";
import type { TwitterCard } from "@/types";
import { simulateBattle } from "@/lib/battle";
import { useGameStore } from "@/store/useGameStore";

type OnlineResult = { wins: number; losses: number; result: "win"|"lose"|"draw"; rounds: { winner: string; pHp: number; eHp: number; turns: number; ko: boolean; log: string[]; hpSnaps: {pHp:number;eHp:number}[] }[] };

function getUid() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("twigacha-uid") ?? (() => { const id = Math.random().toString(36).slice(2); localStorage.setItem("twigacha-uid", id); return id; })();
}

function getDisplayName() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("twigacha-name") ?? "";
}

function NameInput({ onSave }: { onSave: (name: string) => void }) {
  const [val, setVal] = useState(getDisplayName());
  const t = useT();
  const save = (v: string) => { localStorage.setItem("twigacha-name", v); onSave(v); };
  return (
    <input value={val} onChange={e => { setVal(e.target.value); save(e.target.value); }} maxLength={20}
      placeholder={t.battle.onlineNamePlaceholder}
      className="w-full max-w-sm bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-violet-500" />
  );
}

export function TeamOnlineView({ myTeam, onBack, onResult, t }: {
  myTeam: TwitterCard[];
  onBack: () => void;
  onResult: (res: OnlineResult, hostTeam: TwitterCard[], guestTeam: TwitterCard[], isHost: boolean, myName: string, opponentName: string) => void;
  t: ReturnType<typeof useT>;
}) {
  const [mode, setMode] = useState<"menu"|"matching"|"host">("menu");
  const [code, setCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [queueId, setQueueId] = useState("");
  const [online, setOnline] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const uid = useRef(getUid());
  const stopPoll = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  useEffect(() => {
    const refresh = () => fetch("/api/challenge").then(r => r.json()).then(d => setOnline(d.online ?? null)).catch(() => {});
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, []);

  const post = (body: object) => fetch("/api/challenge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json());

  const startMatch = async () => {
    setLoading(true); setError("");
    try {
      const data = await post({ action: "team_matchmake", playerId: uid.current, team: myTeam, name: getDisplayName() });
      if (data.error) { setError(t.battle.onlineError); return; }
      if (data.matched) { onResult(data.result, data.hostTeam, myTeam, data.isHost, getDisplayName(), data.isHost ? data.guestName : data.hostName); return; }
      setQueueId(data.queueId); setMode("matching");
      fetch("/api/challenge").then(r => r.json()).then(d => setOnline(d.online ?? null)).catch(() => {});
      pollRef.current = setInterval(async () => {
        const d = await post({ action: "matchmake_poll", queueId: data.queueId });
        if (d.matched) { stopPoll(); onResult(d.result, d.hostTeam ?? d.hostCard, d.guestTeam ?? d.guestCard ?? myTeam, d.isHost, getDisplayName(), d.isHost ? d.guestName : d.hostName); }
        else if (d.cancelled) { stopPoll(); setMode("menu"); }
        else fetch("/api/challenge").then(r => r.json()).then(d => setOnline(d.online ?? null)).catch(() => {});
      }, 3000);
    } catch { setError(t.battle.onlineError); }
    finally { setLoading(false); }
  };

  const createRoom = async () => {
    setLoading(true); setError("");
    try {
      const data = await post({ action: "team_create", hostId: uid.current, hostTeam: myTeam, name: getDisplayName() });
      if (data.error) { setError(t.battle.onlineError); return; }
      setCode(data.id); setMode("host");
      pollRef.current = setInterval(async () => {
        const d = await fetch(`/api/challenge?id=${data.id}`).then(r => r.json());
        if (d.result) { stopPoll(); onResult(d.result, myTeam, d.guest_card, true, getDisplayName(), d.guest_name ?? ''); }
      }, 3000);
    } catch { setError(t.battle.onlineError); }
    finally { setLoading(false); }
  };

  const joinRoom = async () => {
    if (!inputCode) return;
    setLoading(true); setError("");
    try {
      const data = await post({ action: "team_join", id: inputCode.toUpperCase(), guestId: uid.current, guestTeam: myTeam, name: getDisplayName() });
      if (data.error === "not found") { setError(t.battle.onlineNotFound); return; }
      if (data.error) { setError(t.battle.onlineAlreadyJoined); return; }
      onResult(data.result, data.hostTeam, myTeam, false, getDisplayName(), data.hostName ?? '');
    } catch { setError(t.battle.onlineError); }
    finally { setLoading(false); }
  };

  if (mode === "matching") return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6 px-4 slide-in-up">
      <h2 className="text-xl font-bold text-violet-400 animate-pulse">🔍 {t.battle.onlineWaiting}</h2>
      {getDisplayName() && <p className="text-gray-300 text-sm">{t.battle.onlineWaitingAs(getDisplayName())}</p>}
      {online !== null && <p className="text-xs text-green-400">{t.battle.onlineUsersWaiting(online)}</p>}
      <button onClick={async () => { stopPoll(); if (queueId) await post({ action: "matchmake_cancel", queueId }); setMode("menu"); }}
        className="px-6 py-3 bg-gray-700 rounded-xl font-bold hover:bg-gray-600 transition">{t.battle.back}</button>
    </div>
  );

  if (mode === "host") return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6 px-4 slide-in-up">
      <button onClick={() => { stopPoll(); onBack(); }} className="self-start text-gray-400 hover:text-white text-sm ml-4">{t.battle.back}</button>
      <h2 className="text-xl font-bold text-violet-400">{t.battle.onlineCodeLabel}</h2>
      <div className="flex items-center gap-3">
        <span className="text-4xl font-black tracking-widest bg-gray-800 px-6 py-4 rounded-xl">{code}</span>
        <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="px-4 py-2 bg-gray-700 rounded-lg text-sm hover:bg-gray-600 transition">{copied ? t.battle.onlineCodeCopied : t.battle.onlineCodeCopy}</button>
      </div>
      <p className="text-gray-400 text-sm animate-pulse">{t.battle.onlineWaiting}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6 px-4 slide-in-up">
      <div className="flex items-center gap-4 w-full max-w-sm">
        <button onClick={onBack} className="text-gray-400 hover:text-white text-sm">{t.battle.back}</button>
        <h1 className="text-2xl font-black bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">{t.battle.online}</h1>
        {online !== null && <span className="ml-auto text-xs text-green-400">{t.battle.onlineUsersWaiting(online)}</span>}
      </div>
      <NameInput onSave={() => {}} />
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <button onClick={startMatch} disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl font-bold text-lg hover:opacity-90 disabled:opacity-40 transition">
          {loading ? "..." : "🔍 " + t.battle.onlineMatch}
        </button>
        <button onClick={createRoom} disabled={loading}
          className="w-full py-3 bg-gray-700 rounded-xl font-bold hover:bg-gray-600 disabled:opacity-40 transition">
          {t.battle.onlineCreate}
        </button>
        <div className="flex gap-2">
          <input value={inputCode} onChange={e => setInputCode(e.target.value.toUpperCase())} maxLength={6}
            placeholder={t.battle.onlineEnterCode}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-violet-500 uppercase tracking-widest" />
          <button onClick={joinRoom} disabled={loading || !inputCode}
            className="px-5 py-3 bg-violet-600 rounded-lg font-bold hover:bg-violet-500 disabled:opacity-40 transition">
            {t.battle.onlineJoinBtn}
          </button>
        </div>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}

type PrecomputedBattle = { winner: string; pHp: number; eHp: number; turns: number; ko: boolean; hpSnaps: {pHp:number;eHp:number}[]; log: string[] };

export function OnlineBattleView({ playerCard, onBack, t, onMatchResult, initialCode = "" }: {
  playerCard: TwitterCard | null;
  onBack: () => void;
  t: ReturnType<typeof useT>;
  onMatchResult: (enemyCard: TwitterCard, precomputed: PrecomputedBattle, isHost: boolean, myName: string, opponentName: string) => void;
  initialCode?: string;
}) {
  const selectedCard = playerCard;
  const [mode, setMode] = useState<"menu"|"host"|"matching">("menu");
  const [code, setCode] = useState("");
  const [inputCode, setInputCode] = useState(initialCode);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [queueId, setQueueId] = useState("");
  const [online, setOnline] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hostIdRef = useRef(getUid());
  const stopPoll = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  const lang = useGameStore(s => s.lang);

  useEffect(() => {
    const refresh = () => fetch("/api/challenge").then(r => r.json()).then(d => setOnline(d.online ?? null)).catch(() => {});
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, []);

  const post = (body: object) => fetch("/api/challenge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json());

  const startMatchmaking = async () => {
    if (!selectedCard) return;
    setLoading(true); setError("");
    try {
      const data = await post({ action: "matchmake", playerId: hostIdRef.current, card: selectedCard, name: getDisplayName() });
      if (data.error) { setError(t.battle.onlineError); return; }
      if (data.matched) { onMatchResult(data.isHost ? selectedCard : data.hostCard, data.result, data.isHost, getDisplayName(), data.isHost ? data.guestName : data.hostName); return; }
      setQueueId(data.queueId); setMode("matching");
      fetch("/api/challenge").then(r => r.json()).then(d => setOnline(d.online ?? null)).catch(() => {});
      pollRef.current = setInterval(async () => {
        const d = await post({ action: "matchmake_poll", queueId: data.queueId });
        if (d.matched) { stopPoll(); onMatchResult(d.isHost ? d.guestCard : d.hostCard, d.result, d.isHost, getDisplayName(), d.isHost ? d.guestName : d.hostName); }
        else if (d.cancelled) { stopPoll(); setMode("menu"); }
        else fetch("/api/challenge").then(r => r.json()).then(d => setOnline(d.online ?? null)).catch(() => {});
      }, 3000);
    } catch { setError(t.battle.onlineError); }
    finally { setLoading(false); }
  };

  const createChallenge = async () => {
    if (!selectedCard) return;
    setLoading(true); setError("");
    try {
      const data = await post({ action: "create", hostId: hostIdRef.current, hostCard: selectedCard, name: getDisplayName() });
      if (data.error) { setError(t.battle.onlineError); return; }
      setCode(data.id); setMode("host");
      pollRef.current = setInterval(async () => {
        const d = await fetch(`/api/challenge?id=${data.id}`).then(r => r.json());
        if (d.result) { stopPoll(); onMatchResult(d.guest_card, d.result, true, getDisplayName(), d.guest_name ?? ''); }
      }, 3000);
    } catch { setError(t.battle.onlineError); }
    finally { setLoading(false); }
  };

  const joinChallenge = async () => {
    if (!selectedCard || !inputCode) return;
    setLoading(true); setError("");
    try {
      const data = await post({ action: "join", id: inputCode.toUpperCase(), guestId: hostIdRef.current, guestCard: selectedCard, name: getDisplayName() });
      if (data.error === "not found") { setError(t.battle.onlineNotFound); return; }
      if (data.error === "already joined" || data.error === "already finished") { setError(t.battle.onlineAlreadyJoined); return; }
      if (data.error) { setError(t.battle.onlineError); return; }
      onMatchResult(data.hostCard, data.result, false, getDisplayName(), data.hostName ?? '');
    } catch { setError(t.battle.onlineError); }
    finally { setLoading(false); }
  };

  
  // タイムアウト: 30秒でCPU対戦
  useEffect(() => {
    if (mode !== "matching" || !selectedCard) return;
    const timer = setTimeout(async () => {
      stopPoll();
      if (queueId) await post({ action: "matchmake_cancel", queueId }).catch(() => {});
      try {
        const res = await fetch("/api/gacha?count=1");
        const data = await res.json();
        const botCard: TwitterCard = Array.isArray(data) ? data[0] : data;
        if (!botCard || (botCard as { error?: string }).error) { setMode("menu"); return; }
        const result = simulateBattle(selectedCard, botCard, lang as "ja" | "en");
        onMatchResult(botCard, result, true, getDisplayName(), "🤖 CPU");
      } catch { setMode("menu"); }
    }, 30000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

if (mode === "matching") return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6 px-4 slide-in-up">
      <h2 className="text-xl font-bold text-violet-400 animate-pulse">🔍 {t.battle.onlineWaiting}</h2>
      {getDisplayName() && <p className="text-gray-300 text-sm">{t.battle.onlineWaitingAs(getDisplayName())}</p>}
      {online !== null && <p className="text-xs text-green-400">{t.battle.onlineUsersWaiting(online)}</p>}
      {selectedCard && <TcgCard card={selectedCard} size="md" />}
      {(() => {
        const text = t.battle.onlineMatchRecruit;
        return (
          <div className="flex gap-2">
            <button onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank')}
              className="px-4 py-2 bg-sky-600 rounded-lg text-sm font-bold hover:bg-sky-500 transition">{t.battle.onlineRecruitBtn}</button>
            <button onClick={() => window.open(`https://bsky.app/intent/compose?text=${encodeURIComponent(text)}`, '_blank')}
              className="px-4 py-2 bg-blue-500 rounded-lg text-sm font-bold hover:bg-blue-400 transition">🦋 Bluesky</button>
          </div>
        );
      })()}
      <button onClick={async () => { stopPoll(); if (queueId) await post({ action: "matchmake_cancel", queueId }); setMode("menu"); }}
        className="px-6 py-3 bg-gray-700 rounded-xl font-bold hover:bg-gray-600 transition">{t.battle.back}</button>
    </div>
  );

  if (mode === "host") return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6 px-4 slide-in-up">
      <button onClick={onBack} className="self-start text-gray-400 hover:text-white text-sm ml-4">{t.battle.back}</button>
      <h2 className="text-xl font-bold text-green-400">{t.battle.onlineCodeLabel}</h2>
      <div className="flex items-center gap-3">
        <span className="text-4xl font-black tracking-widest text-white bg-gray-800 px-6 py-4 rounded-xl">{code}</span>
        <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="px-4 py-2 bg-gray-700 rounded-lg text-sm hover:bg-gray-600 transition">
          {copied ? t.battle.onlineCodeCopied : t.battle.onlineCodeCopy}
        </button>
      </div>
      <p className="text-gray-400 text-sm animate-pulse">{t.battle.onlineWaiting}</p>
      {selectedCard && <TcgCard card={selectedCard} size="md" />}
      <div className="flex gap-2">
        {(() => {
          const text = t.battle.onlineShareText(code);
          return (<>
            <button onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank')}
              className="px-4 py-2 bg-sky-600 rounded-lg text-sm font-bold hover:bg-sky-500 transition">{t.battle.onlineRecruitBtn}</button>
            <button onClick={() => window.open(`https://bsky.app/intent/compose?text=${encodeURIComponent(text)}`, '_blank')}
              className="px-4 py-2 bg-blue-500 rounded-lg text-sm font-bold hover:bg-blue-400 transition">🦋 Bluesky</button>
          </>);
        })()}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6 px-4 slide-in-up">
      <div className="flex items-center gap-4 w-full max-w-sm">
        <button onClick={onBack} className="text-gray-400 hover:text-white text-sm">{t.battle.back}</button>
        <h1 className="text-2xl font-black bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">{t.battle.online}</h1>
        {online !== null && <span className="ml-auto text-xs text-green-400">{t.battle.onlineUsersWaiting(online)}</span>}
      </div>
      {selectedCard && <TcgCard card={selectedCard} size="md" />}
      <NameInput onSave={() => {}} />
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <button onClick={startMatchmaking} disabled={loading || !selectedCard}
          className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl font-bold text-lg hover:opacity-90 disabled:opacity-40 transition">
          {loading ? "..." : "🔍 " + t.battle.onlineMatch}
        </button>
        <button onClick={createChallenge} disabled={loading || !selectedCard}
          className="w-full py-3 bg-gray-700 rounded-xl font-bold hover:bg-gray-600 disabled:opacity-40 transition">
          {t.battle.onlineCreate}
        </button>
        <div className="flex gap-2">
          <input value={inputCode} onChange={e => setInputCode(e.target.value.toUpperCase())} maxLength={6}
            placeholder={t.battle.onlineEnterCode}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-violet-500 uppercase tracking-widest" />
          <button onClick={joinChallenge} disabled={loading || !inputCode || !selectedCard}
            className="px-5 py-3 bg-violet-600 rounded-lg font-bold hover:bg-violet-500 disabled:opacity-40 transition">
            {t.battle.onlineJoinBtn}
          </button>
        </div>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
