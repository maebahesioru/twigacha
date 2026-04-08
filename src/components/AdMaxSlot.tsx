"use client";

import { admax, tagIdFromAdmaxUrl, type AdmaxSlotKey } from "@/lib/admax";

type Props = {
  slot: AdmaxSlotKey;
  width: number;
  height: number;
  className?: string;
  /** 既定 lazy。右レール等は eager で即読み込み */
  loading?: "lazy" | "eager";
};

export default function AdMaxSlot({ slot, width, height, className, loading = "lazy" }: Props) {
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
      loading={loading}
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}
