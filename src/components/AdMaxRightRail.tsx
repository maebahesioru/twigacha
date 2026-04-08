"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { admax, tagIdFromAdmaxUrl } from "@/lib/admax";
import type { ShinobiBannerInline } from "@/lib/parseShinobiBannerTag";
import { parseShinobiBannerTagScript } from "@/lib/parseShinobiBannerTag";
import AdMaxSlot from "@/components/AdMaxSlot";

type Mode = "pending" | "inline" | "iframe";

/**
 * md 以上・右列: 160×600。親ドキュメントで `admaxbanner` → `st/s.js`。
 * fetch/パース失敗時は iframe（eager）にフォールバック。
 */
export default function AdMaxRightRail() {
  const mountRef = useRef<HTMLDivElement>(null);
  const parsedRef = useRef<ShinobiBannerInline | null>(null);
  const [mode, setMode] = useState<Mode>("pending");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tag = tagIdFromAdmaxUrl(admax.rightSide160);
        if (!tag) {
          setMode("iframe");
          return;
        }
        const res = await fetch(`/api/shinobi-s-tag?tag=${encodeURIComponent(tag)}`);
        if (cancelled) return;
        if (!res.ok) {
          setMode("iframe");
          return;
        }
        const js = await res.text();
        if (cancelled) return;
        const parsed = parseShinobiBannerTagScript(js);
        if (!parsed) {
          setMode("iframe");
          return;
        }
        parsedRef.current = parsed;
        setMode("inline");
      } catch {
        if (!cancelled) setMode("iframe");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useLayoutEffect(() => {
    if (mode !== "inline" || !mountRef.current || !parsedRef.current) return;
    const el = mountRef.current;
    const p = parsedRef.current;

    el.innerHTML = "";
    const slot = document.createElement("div");
    slot.id = p.admaxId;
    el.appendChild(slot);

    type Win = Window & {
      admaxbanner?: {
        admax_id: string;
        tag_id: string;
        type: string;
        width: number;
        height: number;
      };
    };
    (window as Win).admaxbanner = {
      admax_id: p.admaxId,
      tag_id: p.tagId,
      type: "b",
      width: p.width,
      height: p.height,
    };

    const s = document.createElement("script");
    s.type = "text/javascript";
    s.charset = "utf-8";
    s.src = "https://adm.shinobi.jp/st/s.js";
    s.async = false;
    document.head.appendChild(s);

    return () => {
      el.innerHTML = "";
      s.remove();
    };
  }, [mode]);

  return (
    <div className="sticky top-20 py-2 pr-1 w-[160px] min-h-[600px]">
      {mode === "pending" ? (
        <div
          className="h-[600px] w-[160px] rounded-lg bg-gray-900/40 border border-gray-800/60"
          aria-hidden
        />
      ) : null}
      {mode === "iframe" ? (
        <AdMaxSlot
          slot="rightSide160"
          width={160}
          height={600}
          loading="eager"
          className="rounded-lg overflow-hidden max-w-[160px]"
        />
      ) : null}
      {mode === "inline" ? <div ref={mountRef} className="min-h-[600px] w-[160px]" /> : null}
    </div>
  );
}
