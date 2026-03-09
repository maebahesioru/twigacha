"use client";
import { useT } from "@/hooks/useT";
export default function ContactPage() {
  const t = useT();
  return (
    <div className="min-h-screen bg-gray-950 text-white py-10">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-2xl font-black mb-6">{t.contact.title}</h1>
        <p className="text-gray-400 text-sm leading-relaxed mb-4">{t.contact.body}</p>
        <a
          href="https://x.com/maebahesioru2"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-6 py-3 bg-sky-600 rounded-xl font-bold hover:bg-sky-500 transition"
        >
          𝕏 @maebahesioru2
        </a>
        <a
          href="https://bsky.app/profile/maebahesioru.bsky.social"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block ml-3 px-6 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 transition"
        >
          🦋 Bluesky
        </a>
      </div>
    </div>
  );
}
