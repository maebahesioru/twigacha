"use client";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Star, Trash2, Link2 } from "lucide-react";
import TcgCard from "@/components/TcgCard";
import { useGameStore } from "@/store/useGameStore";
import { useT } from "@/hooks/useT";
import type { Rarity, TwitterCard } from "@/types";
import { sanitizeCollection } from "@/lib/card";
import { playFavorite, playDelete } from "@/lib/audio";

type SortKey = "rarity" | "name" | "id" | "atk" | "def" | "spd" | "hp" | "int" | "luk" | "pulledAt" | "enhanceable";

const RARITY_ORDER: Rarity[] = ["LR","UR","SSR","SR","R","N","C"];

function sortCards(cards: TwitterCard[], key: SortKey, all: TwitterCard[] = []): TwitterCard[] {
  return [...cards].sort((a, b) => {
    if (key === "rarity") return RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
    if (key === "name") return a.displayName.localeCompare(b.displayName);
    if (key === "id") return a.username.localeCompare(b.username);
    if (key === "pulledAt") return b.pulledAt - a.pulledAt;
    if (key === "enhanceable") {
      const ae = all.some(c => c.id !== a.id && c.username === a.username) ? 1 : 0;
      const be = all.some(c => c.id !== b.id && c.username === b.username) ? 1 : 0;
      return be - ae;
    }
    return (b[key] as number) - (a[key] as number);
  });
}

export default function CollectionPage() {
  const { collection, removeCard, updateCard, totalPackCount, toggleFavorite, favorites } = useGameStore();
  const t = useT();
  const [sort, setSort] = useState<SortKey>("pulledAt");
  const [favOnly, setFavOnly] = useState(false);
  const [enhanceOnly, setEnhanceOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [enhanceTarget, setEnhanceTargetState] = useState<string | null>(null);
  const enhanceRef = useRef<string | null>(null);
  const setEnhanceTarget = (id: string | null) => { enhanceRef.current = id; setEnhanceTargetState(id); };

  const MAX_ENHANCE = 6;

  const handleEnhance = (targetId: string, materialId: string) => {
    const target = collection.find(c => c.id === targetId);
    if (!target) return;
    const enh = (target.enhance ?? 0) + 1;
    const m = 1.1;
    updateCard({ ...target, enhance: enh, atk: Math.round(target.atk * m), def: Math.round(target.def * m), spd: Math.round(target.spd * m), hp: Math.round(target.hp * m), int: Math.round(target.int * m), luk: Math.round(target.luk * m) });
    removeCard(materialId);
    setEnhanceTarget(null);
    alert(t.collection.enhance.done(enh));
  };

  const handleExport = async () => {
    const raw = JSON.parse(localStorage.getItem("twigacha-collection") ?? "{}");
    const data = raw?.state?.collection ?? raw ?? [];
    const str = JSON.stringify(data);
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)))).map(b => b.toString(16).padStart(2,"0")).join("");
    const blob = new Blob([JSON.stringify({ data, checksum: hash })], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `twigacha-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result as string;
        const parsed = JSON.parse(text);
        const arr = parsed.data ?? parsed;
        if (!Array.isArray(arr)) throw new Error();
        if (parsed.checksum) {
          const str = JSON.stringify(parsed.data);
          const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)))).map(b => b.toString(16).padStart(2,"0")).join("");
          if (hash !== parsed.checksum) { alert(t.battle.fileModified); return; }
        }
        const sanitized = sanitizeCollection(arr);
        const raw = JSON.parse(localStorage.getItem("twigacha-collection") ?? "{}");
        raw.state = { ...(raw.state ?? {}), collection: sanitized };
        localStorage.setItem("twigacha-collection", JSON.stringify(raw));
        window.location.reload();
      } catch { alert("Invalid file"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const filtered = sortCards(
    collection.filter(c => {
      if (favOnly && !favorites.includes(c.id)) return false;
      if (enhanceOnly && !(collection.some(x => x.id !== c.id && x.username === c.username) && (c.enhance ?? 0) < MAX_ENHANCE)) return false;
      return !search || c.username.includes(search) || c.displayName.includes(search);
    }),
    sort,
    collection
  );

  const SORTS: { key: SortKey; label: string }[] = [
    { key: "pulledAt", label: t.collection.sortKeys.pulledAt },
    { key: "rarity",   label: t.collection.sortKeys.rarity },
    { key: "name",     label: t.collection.sortKeys.name },
    { key: "id",       label: t.collection.sortKeys.id },
    { key: "atk",      label: t.collection.sortKeys.atk },
    { key: "def",      label: t.collection.sortKeys.def },
    { key: "spd",      label: t.collection.sortKeys.spd },
    { key: "hp",       label: t.collection.sortKeys.hp },
    { key: "int",      label: t.collection.sortKeys.int },
    { key: "luk",      label: t.collection.sortKeys.luk },
  ];

  return (
    <div className="min-h-dvh bg-gray-950 text-white py-10 px-4 slide-in-up">
      <h1 className="text-3xl font-black text-center mb-6 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
        📦 {t.collection.title} ({collection.length})
      </h1>

      {/* 収集状況 */}
      <div className="max-w-lg mx-auto bg-gray-800/80 rounded-xl p-4 mb-6 text-sm">
        <p className="font-bold text-gray-300 mb-2">📊 {t.collection.stats.total}</p>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-3">
          {(["LR","UR","SSR","SR","R","N","C"] as Rarity[]).map(r => (
            <div key={r} className="bg-gray-700/60 rounded-lg py-2 flex flex-row items-center justify-center gap-1.5">
              <span className="text-gray-400 text-sm">{r}</span>
              <span className="font-bold text-white text-lg">{collection.filter(c => c.rarity === r).length}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-around text-center border-t border-gray-700 pt-2">
          <div><p className="text-xs text-gray-400">{t.collection.stats.total}</p><p className="font-bold text-pink-400">{collection.length}</p></div>
          <div><p className="text-xs text-gray-400">{ t.collection.stats.gacha}</p><p className="font-bold text-pink-400">{totalPackCount}</p></div>
        </div>
      </div>

      {/* バックアップ */}
      <div className="max-w-lg mx-auto bg-gray-800/60 rounded-xl p-4 mb-6 border border-gray-700">
        <p className="font-bold text-gray-300 mb-1">{t.battle.backupTitle}</p>
        <p className="text-xs text-gray-500 mb-3">{t.battle.backupDesc}</p>
        <div className="flex gap-2">
          <button onClick={handleExport}
            className="flex-1 py-2 bg-blue-700 hover:bg-blue-600 rounded-lg text-sm font-bold transition">
            {t.battle.backupExport}
          </button>
          <label className="flex-1 py-2 bg-green-700 hover:bg-green-600 rounded-lg text-sm font-bold transition cursor-pointer text-center">
            {t.battle.backupImport}
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
        <p className="text-xs text-gray-600 mt-2">{t.battle.backupWarning}</p>
      </div>

      {/* 並び替え */}
      <div className="flex flex-wrap gap-2 justify-center items-center mb-4">
        <span className="text-gray-400 text-sm font-bold">{t.collection.sort}</span>
        {SORTS.map(({ key, label }) => (
          <button key={key} onClick={() => setSort(key)}
            className={`px-3 py-1 rounded-full text-sm font-bold transition ${sort === key ? "bg-pink-500 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
            {label}
          </button>
        ))}
        <button onClick={() => setFavOnly(v => !v)}
          className={`px-3 py-1 rounded-full text-sm font-bold transition flex items-center gap-1 ${favOnly ? "bg-yellow-500 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
          <Star size={12} fill={favOnly ? "currentColor" : "none"} /> {t.collection.favOnly}
        </button>
        <button onClick={() => setEnhanceOnly(v => !v)}
          className={`px-3 py-1 rounded-full text-sm font-bold transition ${enhanceOnly ? "bg-yellow-500 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
          ⬆️ {t.collection.enhance.btn.replace("⬆️ ", "")}
        </button>
      </div>

      <div className="flex justify-center mb-6">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={t.collection.search}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm w-full max-w-xs focus:outline-none focus:border-purple-500" />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-gray-500 mt-20">
          {collection.length === 0 ? t.collection.empty : t.collection.noResults}
        </p>
      ) : (
        <div className="flex flex-wrap gap-4 justify-center">
          {filtered.map((card, i) => (
            <div key={card.id} className={`relative group slide-in-up transition-all duration-300 ${deletingId === card.id ? 'opacity-0 scale-75' : ''}`} style={{ animationDelay: `${Math.min(i * 30, 600)}ms` }}>
              <TcgCard card={card} size="lg" />
              <button onClick={(e) => { e.stopPropagation(); toggleFavorite(card.id); if (!favorites.includes(card.id)) playFavorite(); }}
                aria-label={favorites.includes(card.id) ? "お気に入り解除" : "お気に入り登録"}
                className={`absolute -bottom-3 -right-3 z-20 text-yellow-400 transition-transform hover:scale-125 ${favorites.includes(card.id) ? 'pulse-glow rounded-full' : ''}`}>
                <Star size={24} fill={favorites.includes(card.id) ? "currentColor" : "none"} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); if (confirm(`${card.displayName} を削除しますか？`)) { playDelete(); setDeletingId(card.id); setTimeout(() => { removeCard(card.id); setDeletingId(null); }, 300); } }}
                aria-label="カードを削除"
                className="absolute -bottom-3 -left-3 z-20 bg-red-600 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 size={14} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); const url = `https://twigacha.vercel.app/card/${card.username}`; navigator.clipboard.writeText(url); }}
                className="absolute -top-3 -right-3 z-20 bg-blue-600 hover:bg-blue-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                title={t.collection.cardShare}>
                <Link2 size={14} />
              </button>
              {(card.enhance ?? 0) < MAX_ENHANCE && collection.some(c => c.id !== card.id && c.username === card.username) && (
                <button onClick={(e) => { e.stopPropagation(); setEnhanceTarget(card.id); }}
                  className="absolute -top-3 -left-3 z-20 bg-yellow-500 hover:bg-yellow-400 text-white rounded-full p-1 opacity-100 transition-opacity"
                  title={t.collection.enhance.btn}>
                  ⬆️
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {enhanceTarget && (() => {
        const target = collection.find(c => c.id === enhanceTarget);
        if (!target) return null;
        const materials = collection.filter(c => c.id !== enhanceTarget && c.username === target.username);
        return createPortal(
          <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4" onClick={() => setEnhanceTarget(null)}>
            <div className="bg-gray-900 text-white rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
              <h2 className="font-bold text-lg mb-1">{t.collection.enhance.title}</h2>
              <p className="text-gray-400 text-sm mb-4">{t.collection.enhance.desc(MAX_ENHANCE)}</p>
              {materials.length === 0 ? (
                <p className="text-gray-400 text-sm">{t.collection.enhance.noMaterial}</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                  {materials.map(m => (
                    <button key={m.id} onClick={() => handleEnhance(enhanceTarget, m.id)}
                      className="flex items-center gap-3 bg-gray-800 hover:bg-gray-700 rounded-xl px-4 py-2 text-left transition">
                      <img src={m.avatar} className="w-8 h-8 rounded-full" alt="" />
                      <span className="text-sm">{m.displayName || m.username} <span className="text-gray-400">({m.rarity}{(m.enhance ?? 0) > 0 ? `+${m.enhance}` : ""})</span></span>
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => setEnhanceTarget(null)} className="mt-4 w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-xl text-sm">{t.collection.enhance.cancel}</button>
            </div>
          </div>,
          document.body
        );
      })()}
    </div>
  );
}
