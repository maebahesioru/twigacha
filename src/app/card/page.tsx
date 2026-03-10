"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/hooks/useT";

export default function CardSearchPage() {
  const [input, setInput] = useState("");
  const router = useRouter();
  const t = useT();

  function go() {
    const username = input.replace(/^@/, "").trim();
    if (username) router.push(`/card/${username}`);
  }

  return (
    <div className="min-h-dvh bg-gray-950 text-white flex flex-col items-center justify-center px-4 gap-6">
      <h1 className="text-2xl font-black text-pink-400">{t.nav.cardSearch}</h1>
      <p className="text-gray-400 text-sm">{t.cardSearch.hint}</p>
      <div className="flex gap-2 w-full max-w-sm">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && go()}
          placeholder={t.cardSearch.hint}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
        />
        <button
          onClick={go}
          disabled={!input.trim()}
          className="px-5 py-3 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 rounded-xl font-bold transition"
        >
          GO
        </button>
      </div>
    </div>
  );
}
