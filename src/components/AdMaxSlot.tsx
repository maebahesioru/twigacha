"use client";

import { admax, tagIdFromAdmaxUrl, type AdmaxSlotKey } from "@/lib/admax";

type Props = {
  slot: AdmaxSlotKey;
  width: number;
  height: number;
  className?: string;
};

export default function AdMaxSlot({ slot, width, height, className }: Props) {
  const url = admax[slot];
  const tag = tagIdFromAdmaxUrl(url);
  if (!tag) return null;
  const src = `/api/ad-shinobi?tag=${encodeURIComponent(tag)}`;
  return (
    <iframe
      title="Advertisement"
      width={width}
      height={height}
      className={className}
      src={src}
      style={{ border: 0, maxWidth: "100%" }}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}
