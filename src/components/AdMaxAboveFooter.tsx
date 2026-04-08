"use client";

import AdMaxSlot from "@/components/AdMaxSlot";

/** 大きめ枠はフッター直前にまとめる（ナビ直下の詰まりを避ける） */
export default function AdMaxAboveFooter() {
  return (
    <div className="w-full border-t border-gray-800/70 bg-gray-950/90">
      <div className="md:hidden flex flex-col items-center gap-3 py-4 px-2 max-w-lg mx-auto">
        <AdMaxSlot slot="banner320x100" width={320} height={100} className="max-w-full rounded-lg" />
        <AdMaxSlot slot="mrecMobile" width={300} height={250} className="max-w-full rounded-lg" />
      </div>
      <div className="hidden md:flex justify-center py-4 px-2">
        <AdMaxSlot slot="mrec" width={300} height={250} className="rounded-lg bg-gray-900/40 max-w-full" />
      </div>
    </div>
  );
}
