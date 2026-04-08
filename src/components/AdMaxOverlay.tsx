"use client";

import AdMaxSlot from "@/components/AdMaxSlot";

/** スマホのみ画面下固定（md 未満）。`layout` の `body` の `pb` と高さを揃える */
export default function AdMaxOverlay() {
  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-[60] flex justify-center bg-gray-950/95 border-t border-gray-800/80 pb-[env(safe-area-inset-bottom,0px)]"
      role="complementary"
      aria-label="Advertisement"
    >
      <AdMaxSlot slot="overlayMobile" width={320} height={100} className="max-w-full" />
    </div>
  );
}
