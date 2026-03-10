"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useGameStore } from "@/store/useGameStore";
import { useT } from "@/hooks/useT";
import { usePushNotification } from "@/hooks/usePushNotification";

export default function Navbar() {
  const path = usePathname();
  const { lang, setLang } = useGameStore();
  const t = useT();
  const [open, setOpen] = useState(false);
  const { state, subscribe } = usePushNotification();

  useEffect(() => {
    const stored = localStorage.getItem("twigacha-collection");
    if (stored) return; // 既存ユーザーは変えない
    if (!navigator.language.startsWith("ja")) setLang("en");
  }, []);
  const NAV = [
    { href: "/", label: t.nav.gacha },
    { href: "/collection", label: t.nav.collection },
    { href: "/battle", label: t.nav.battle },
    { href: "/ranking", label: t.nav.ranking },
    { href: "/achievements", label: t.nav.achievements },
    { href: "/card", label: t.nav.cardSearch },
  ];
  return (
    <nav className="sticky top-0 z-40 bg-gray-900/90 backdrop-blur border-b border-gray-800">
      {/* PC */}
      <div className="hidden sm:flex max-w-5xl mx-auto justify-center items-center gap-1 px-2 py-2">
        {NAV.map(({ href, label }) => (
          <Link key={href} href={href}
            className={`ripple-btn px-3 py-2 rounded-lg text-sm font-bold transition ${path === href ? "bg-pink-500/20 text-pink-400 scale-105 float" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
            {label}
          </Link>
        ))}
        <button onClick={() => setLang(lang === "ja" ? "en" : "ja")}
          className="ml-1 px-2 py-1.5 rounded-lg text-xs font-bold bg-gray-800 text-gray-300 hover:bg-gray-700 transition border border-gray-700">
          {lang === "ja" ? "EN" : "日本語"}
        </button>
        {state !== 'unsupported' && state !== 'granted' && (
          <button onClick={subscribe}
            className="ml-1 px-2 py-1.5 rounded-lg text-xs font-bold bg-gray-800 text-gray-300 hover:bg-gray-700 transition border border-gray-700">
            🔔
          </button>
        )}
      </div>
      {/* モバイル */}
      <div className="sm:hidden flex items-center justify-between px-4 py-2">
        <span className="text-pink-400 font-black text-lg">TwiGacha</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setLang(lang === "ja" ? "en" : "ja")}
            className="px-2 py-1 rounded-lg text-xs font-bold bg-gray-800 text-gray-300 border border-gray-700">
            {lang === "ja" ? "EN" : "日本語"}
          </button>
          {state !== 'unsupported' && state !== 'granted' && (
            <button onClick={subscribe} className="px-2 py-1 rounded-lg text-xs bg-gray-800 text-gray-300 border border-gray-700">🔔</button>
          )}
          <button onClick={() => setOpen(o => !o)} className="p-2 text-gray-300">
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>
      {open && (
        <div className="sm:hidden flex flex-col border-t border-gray-800">
          {NAV.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}
              className={`px-5 py-3 text-sm font-bold border-b border-gray-800/50 ${path === href ? "text-pink-400 bg-pink-500/10" : "text-gray-300"}`}>
              {label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
