"use client";
import Link from "next/link";
import { useT } from "@/hooks/useT";

export default function Footer() {
  const t = useT();
  return (
    <footer className="bg-gray-950 text-gray-600 text-xs py-4 border-t border-gray-800">
      <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center px-4">
        <Link href="/help" className="hover:text-gray-400 transition">{t.footer.rulebook}</Link>
        <Link href="/privacy" className="hover:text-gray-400 transition">{t.footer.privacy}</Link>
        <Link href="/terms" className="hover:text-gray-400 transition">{t.footer.terms}</Link>
        <Link href="/contact" className="hover:text-gray-400 transition">{t.footer.contact}</Link>
      </div>
    </footer>
  );
}
