"use client";

import AdMaxSlot from "@/components/AdMaxSlot";

/** PC 幅のみ（md 以上）。ナビ直下の 728×90 インライン */
export default function AdMaxDesktop728() {
  return (
    <div className="hidden md:flex justify-center w-full py-2 bg-gray-950 border-b border-gray-800/60 overflow-x-auto">
      <AdMaxSlot slot="belowToolbar" width={728} height={90} className="max-w-full shrink-0" />
    </div>
  );
}
