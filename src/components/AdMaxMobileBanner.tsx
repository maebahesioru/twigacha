"use client";

import AdMaxSlot from "@/components/AdMaxSlot";

/** スマホ幅のみ（md 未満）。ナビ直下の 320×50 インライン */
export default function AdMaxMobileBanner() {
  return (
    <div className="md:hidden flex justify-center w-full py-1.5 bg-gray-950 border-b border-gray-800/60">
      <AdMaxSlot slot="headerMobile" width={320} height={50} className="max-w-full" />
    </div>
  );
}
