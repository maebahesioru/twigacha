"use client";
import { useEffect } from "react";
import { useGameStore } from "@/store/useGameStore";

export default function HtmlLang() {
  const lang = useGameStore(s => s.lang);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return null;
}
