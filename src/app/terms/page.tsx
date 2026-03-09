"use client";
import { useT } from "@/hooks/useT";
export default function TermsPage() {
  const t = useT();
  const tm = t.terms;
  return (
    <div className="min-h-screen bg-gray-950 text-white py-10">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-2xl font-black mb-6">{tm.title}</h1>
        <h2 className="text-lg font-bold mt-4 mb-2">{tm.useTitle}</h2>
        <p className="text-gray-400 text-sm leading-relaxed">{tm.useBody}</p>
        <h2 className="text-lg font-bold mt-6 mb-2">{tm.disclaimerTitle}</h2>
        <p className="text-gray-400 text-sm leading-relaxed">{tm.disclaimerBody}</p>
        <h2 className="text-lg font-bold mt-6 mb-2">{tm.prohibitedTitle}</h2>
        <p className="text-gray-400 text-sm leading-relaxed">{tm.prohibitedBody}</p>
        <h2 className="text-lg font-bold mt-6 mb-2">{tm.changesTitle}</h2>
        <p className="text-gray-400 text-sm leading-relaxed">{tm.changesBody}</p>
      </div>
    </div>
  );
}
