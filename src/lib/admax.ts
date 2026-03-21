import { tagFromShinobiScriptUrl } from "@/lib/shinobiTagScript";

/** AdMax 管理画面で発行した 300×250（インライン）用。未設定時はリポジトリ既定のタグ */
const DEFAULT_MREC = "https://adm.shinobi.jp/s/b421877f7091ffb9ab2701d1037896d8";

function envUrl(key: string, fallback: string): string {
  const v = process.env[key];
  if (typeof v === "string" && v.trim()) return v.trim();
  return fallback;
}

/** 枠キー → Shinobi の `/s/...` URL（`NEXT_PUBLIC_ADMAX_*` で上書き） */
export const admax = {
  mrec: envUrl("NEXT_PUBLIC_ADMAX_MREC", DEFAULT_MREC),
} as const;

export type AdmaxSlotKey = keyof typeof admax;

export function tagIdFromAdmaxUrl(url: string): string | null {
  return tagFromShinobiScriptUrl(url);
}
