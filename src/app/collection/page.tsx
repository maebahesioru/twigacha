"use client";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Star, Trash2, Link2 } from "lucide-react";
import TcgCard from "@/components/TcgCard";
import { useGameStore } from "@/store/useGameStore";
import { useT } from "@/hooks/useT";
import type { Rarity, TwitterCard } from "@/types";
import { sanitizeCollection, isBirthday } from "@/lib/card";
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
  const { collection, removeCard, updateCard, totalPackCount, toggleFavorite, favorites, markTwitter } = useGameStore();
  const t = useT();

  // joinedが空のカードをバックグラウンドで更新（最大10枚）
  useEffect(() => {
    const targets = collection.filter(c => !c.joined).slice(0, 10);
    if (!targets.length) return;
    targets.forEach(async (card) => {
      try {
        const isBsky = card.id.startsWith('did:');
        const url = isBsky
          ? `/api/gacha?username=${encodeURIComponent(card.username)}`
          : `/api/user/${card.username}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const updated = await res.json();
        const joined = updated?.joined;
        if (joined) updateCard({ ...card, joined });
      } catch { /* silent */ }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [sort, setSort] = useState<SortKey>("pulledAt");
  const [favOnly, setFavOnly] = useState(false);
  const [enhanceOnly, setEnhanceOnly] = useState(false);
  const [birthdayOnly, setBirthdayOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [statFilter, setStatFilter] = useState<{ key: string; max: string }>({ key: "atk", max: "" });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const selectModeRef = useRef(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [enhanceTarget, setEnhanceTargetState] = useState<string | null>(null);
  const enhanceRef = useRef<string | null>(null);
  const setEnhanceTarget = (id: string | null) => { enhanceRef.current = id; setEnhanceTargetState(id); };

  const MAX_ENHANCE = 6;
  const [visibleCount, setVisibleCount] = useState(20);

  useEffect(() => {
    const onScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 300) {
        setVisibleCount(v => v + 20);
      }
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { setVisibleCount(20); }, [search, favOnly, enhanceOnly, birthdayOnly, sort, statFilter]);

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
    const data = {
      collection: localStorage.getItem("twigacha-collection"),
      uid: localStorage.getItem("twigacha-uid"),
      name: localStorage.getItem("twigacha-name"),
    };
    const plain = new TextEncoder().encode(JSON.stringify(data));
    let blob: Blob;
    const pw = prompt(t.collection.backup.pwPrompt);
    if (!pw) { if (pw !== null) alert(t.collection.backup.pwShort); return; }
    if (pw.length < 8) { alert(t.collection.backup.pwShort); return; }
      const pw2 = prompt(t.collection.backup.pwConfirm);
      if (pw2 === null) return;
      if (pw !== pw2) { alert(t.collection.backup.pwMismatch); return; }
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
        await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]),
        { name: "AES-GCM", length: 256 }, false, ["encrypt"]
      );
      const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);
      const b64 = (buf: ArrayBuffer) => { const bytes = new Uint8Array(buf); let s = ""; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s); };
      blob = new Blob([JSON.stringify({ encrypted: true, salt: b64(salt.buffer), iv: b64(iv.buffer), data: b64(cipher) })], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `twigacha-backup-${new Date().toISOString().slice(0,10)}.wgbak`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result as string;
        const parsed = JSON.parse(text);
        let arr: unknown[];
        if (parsed.encrypted) {
          const pw = prompt(t.collection.backup.pwDecrypt);
          if (!pw) return;
          const b64d = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
          const key = await crypto.subtle.deriveKey(
            { name: "PBKDF2", salt: b64d(parsed.salt), iterations: 100000, hash: "SHA-256" },
            await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]),
            { name: "AES-GCM", length: 256 }, false, ["decrypt"]
          );
          let plain: ArrayBuffer;
          try { plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64d(parsed.iv) }, key, b64d(parsed.data)); }
          catch { alert(t.collection.backup.pwWrong); return; }
          arr = JSON.parse(new TextDecoder().decode(plain));
        } else {
          // 暗号化なし：新形式（全キー）または旧形式
          arr = parsed.data ?? parsed;
          if (parsed.checksum) {
            const str = JSON.stringify(parsed.data);
            const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)))).map(b => b.toString(16).padStart(2,"0")).join("");
            if (hash !== parsed.checksum) { alert(t.battle.fileModified); return; }
          }
        }
        // 新形式：{ collection, uid, name }
        if (arr && typeof arr === "object" && !Array.isArray(arr) && "collection" in (arr as object)) {
          const d = arr as { collection?: string; uid?: string; name?: string };
          if (d.collection) localStorage.setItem("twigacha-collection", d.collection);
          if (d.uid) localStorage.setItem("twigacha-uid", d.uid);
          if (d.name) localStorage.setItem("twigacha-name", d.name);
        } else if (arr && typeof arr === "object" && !Array.isArray(arr) && "state" in (arr as object)) {
          // 旧全データ形式
          localStorage.setItem("twigacha-collection", JSON.stringify(arr));
        } else {
          // 旧コレクション配列形式
          if (!Array.isArray(arr)) throw new Error();
          const sanitized = sanitizeCollection(arr as unknown[]);
          const raw = JSON.parse(localStorage.getItem("twigacha-collection") ?? "{}");
          raw.state = { ...(raw.state ?? {}), collection: sanitized };
          localStorage.setItem("twigacha-collection", JSON.stringify(raw));
        }
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
      if (birthdayOnly && !isBirthday(c.joined)) return false;
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
            <input type="file" accept=".wgbak,.json" onChange={handleImport} className="hidden" />
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
        <button onClick={() => setBirthdayOnly(v => !v)}
          className={`px-3 py-1 rounded-full text-sm font-bold transition ${birthdayOnly ? "bg-yellow-500 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
          🎂 {t.collection.birthdayOnly}
        </button>
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-6">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={t.collection.search}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm w-full max-w-xs focus:outline-none focus:border-purple-500" />
      </div>

      {/* 選択モード */}
      <div className="flex flex-wrap gap-2 justify-center items-center mb-4">
        {selectMode && (<>
          {(["LR","UR","SSR","SR","R","N","C"] as Rarity[]).map(r => (
            <button key={r} onClick={() => setSelectedIds(prev => {
              const next = new Set(prev);
              const ids = filtered.filter(c => c.rarity === r).map(c => c.id);
              const allSelected = ids.every(id => next.has(id));
              ids.forEach(id => allSelected ? next.delete(id) : next.add(id));
              return next;
            })} className="px-2 py-1 rounded-full text-xs font-bold bg-gray-700 hover:bg-gray-600 text-white transition">{r}</button>
          ))}
          <button onClick={() => setSelectedIds(new Set(filtered.map(c => c.id)))}
            className="px-3 py-1 rounded-full text-xs font-bold bg-gray-700 hover:bg-gray-600 text-white transition">{t.collection.selectAll}</button>
          <button onClick={() => { setSelectedIds(new Set()); setSelectMode(false); selectModeRef.current = false; }}
            className="px-3 py-1 rounded-full text-xs font-bold bg-gray-700 hover:bg-gray-600 text-white transition">{t.collection.selectNone}</button>
          {selectedIds.size > 0 && (
            <button onClick={() => { if (confirm(t.collection.bulkDeleteConfirm(selectedIds.size))) { selectedIds.forEach(id => removeCard(id)); setSelectedIds(new Set()); setSelectMode(false); selectModeRef.current = false; } }}
              className="px-3 py-1 rounded-full text-sm font-bold bg-red-600 hover:bg-red-500 text-white transition">
              🗑️ {t.collection.bulkDelete(selectedIds.size)}
            </button>
          )}
          <div className="flex items-center gap-1 w-full justify-center mt-1">
            <select value={statFilter.key} onChange={e => setStatFilter(s => ({ ...s, key: e.target.value }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs focus:outline-none">
              {["atk","def","spd","hp","int","luk"].map(k => <option key={k} value={k}>{k.toUpperCase()}</option>)}
            </select>
            <input value={statFilter.max} onChange={e => setStatFilter(s => ({ ...s, max: e.target.value }))}
              placeholder="以下で選択" type="number" min={0}
              className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs w-24 focus:outline-none" />
            <button onClick={() => {
              const max = parseInt(statFilter.max);
              if (isNaN(max)) return;
              setSelectedIds(prev => {
                const next = new Set(prev);
                filtered.forEach(c => { if (((c as unknown as Record<string,number>)[statFilter.key] ?? 0) <= max) next.add(c.id); });
                return next;
              });
            }} className="px-2 py-1 rounded-lg text-xs font-bold bg-gray-700 hover:bg-gray-600 text-white transition">選択</button>
          </div>
        </>)}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-gray-500 mt-20">
          {collection.length === 0 ? t.collection.empty : t.collection.noResults}
        </p>
      ) : (
        <>
        <div className="flex flex-wrap gap-4 justify-center">
          {filtered.slice(0, visibleCount).map((card, i) => (
            <div key={card.id} className={`relative group slide-in-up transition-all duration-300 cursor-pointer ${deletingId === card.id ? 'opacity-0 scale-75' : ''}`} style={{ animationDelay: `${Math.min(i * 30, 600)}ms` }}
              onClick={selectMode ? (e) => { e.preventDefault(); e.stopPropagation(); setSelectedIds(prev => { const next = new Set(prev); next.has(card.id) ? next.delete(card.id) : next.add(card.id); return next; }); } : undefined}>
              <TcgCard card={card} size="lg" onClick={selectMode ? undefined : markTwitter} selected={selectMode && selectedIds.has(card.id)} />
              {isBirthday(card.joined) && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 text-lg" title="🎂 誕生日">🎂</span>
              )}
              {!selectMode && <div className="absolute -bottom-3 -right-3 z-20 flex items-center gap-1">
                <button onClick={(e) => { e.stopPropagation(); const url = `https://twigacha.vercel.app/card/${card.username}`; navigator.clipboard.writeText(url); setCopiedId(card.id); setTimeout(() => setCopiedId(null), 1500); }}
                  className="relative bg-blue-600 hover:bg-blue-500 text-white rounded-full p-1.5 transition-opacity"
                  title={t.collection.cardShare}>
                  <Link2 size={16} />
                  {copiedId === card.id && (
                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-0.5 whitespace-nowrap">Copied!</span>
                  )}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); if (selectMode) { if (confirm(t.collection.bulkDeleteConfirm(selectedIds.size || 1))) { (selectedIds.size ? selectedIds : new Set([card.id])).forEach(id => removeCard(id)); setSelectedIds(new Set()); setSelectMode(false); selectModeRef.current = false; } } else if (confirm(t.collection.deleteConfirm(card.displayName))) { playDelete(); setDeletingId(card.id); setTimeout(() => { removeCard(card.id); setDeletingId(null); }, 300); } }}
                  onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setSelectMode(true); selectModeRef.current = true; setSelectedIds(new Set([card.id])); }}
                  onPointerDown={(e) => { e.stopPropagation(); if (selectModeRef.current) return; const timer = setTimeout(() => { setSelectMode(true); selectModeRef.current = true; setSelectedIds(new Set([card.id])); }, 600); const cancel = () => clearTimeout(timer); window.addEventListener('pointerup', cancel, { once: true }); window.addEventListener('pointermove', cancel, { once: true }); }}
                  aria-label={t.collection.deleteCard}
                  className="bg-red-600 hover:bg-red-500 text-white rounded-full p-1.5 transition-opacity">
                  <Trash2 size={16} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); toggleFavorite(card.id); if (!favorites.includes(card.id)) playFavorite(); }}
                  aria-label={favorites.includes(card.id) ? t.gacha.favRemove : t.gacha.favAdd}
                  className={`text-yellow-400 transition-transform hover:scale-125 ${favorites.includes(card.id) ? 'pulse-glow rounded-full' : ''}`}>
                  <Star size={24} fill={favorites.includes(card.id) ? "currentColor" : "none"} />
                </button>
              </div>}
              {!selectMode && (card.enhance ?? 0) < MAX_ENHANCE && collection.some(c => c.id !== card.id && c.username === card.username) && (
                <button onClick={(e) => { e.stopPropagation(); setEnhanceTarget(card.id); }}
                  className="absolute -top-3 -left-3 z-20 bg-yellow-500 hover:bg-yellow-400 text-white rounded-full p-1 opacity-100 transition-opacity"
                  title={t.collection.enhance.btn}>
                  ⬆️
                </button>
              )}
            </div>
          ))}
        </div>
        </>
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
