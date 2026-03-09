"use client";
import { useT } from "@/hooks/useT";
export default function PrivacyPage() {
  const t = useT();
  const p = t.privacy;
  return (
    <div className="min-h-screen bg-gray-950 text-white py-10">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-2xl font-black mb-6">{p.title}</h1>
        <p className="text-gray-400 text-sm leading-relaxed">{p.intro}</p>
        <h2 className="text-lg font-bold mt-6 mb-2">{p.infoTitle}</h2>
        <p className="text-gray-400 text-sm leading-relaxed">{p.infoBody}</p>
        <h2 className="text-lg font-bold mt-6 mb-2">{p.storageTitle}</h2>
        <p className="text-gray-400 text-sm leading-relaxed">{p.storageBody}</p>
        <h2 className="text-lg font-bold mt-6 mb-2">{p.pushTitle}</h2>
        <p className="text-gray-400 text-sm leading-relaxed">{p.pushBody}</p>
        <h2 className="text-lg font-bold mt-6 mb-2">{p.aboutTitle}</h2>
        <p className="text-gray-400 text-sm leading-relaxed">
          {p.aboutBody1}<a href="https://wikigacha.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">WikiGacha</a>{p.aboutBody2}<a href="https://x.com/harusugi5" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">@harusugi5</a>{p.aboutBody3}
        </p>
        <p className="text-gray-400 text-sm leading-relaxed">{p.aboutBody4}</p>
      </div>
    </div>
  );
}
