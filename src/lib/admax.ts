import { tagFromShinobiScriptUrl } from "@/lib/shinobiTagScript";

/** AdMax 管理画面で発行した 300×250（インライン）用。未設定時はリポジトリ既定のタグ */
const DEFAULT_MREC = "https://adm.shinobi.jp/s/b421877f7091ffb9ab2701d1037896d8";
/** スマホ・インライン 320×50 */
const DEFAULT_HEADER_MOBILE = "https://adm.shinobi.jp/s/ca4039e236bdd046e2afff4dfbc470d7";
/** PC・インライン 728×90 */
const DEFAULT_BELOW_TOOLBAR = "https://adm.shinobi.jp/s/561e352e0ba0cdefddbb1737fe9f15e1";
/** スマホ・インライン 320×100 */
const DEFAULT_BANNER_320X100 = "https://adm.shinobi.jp/s/6391cce9a8aec15685a5b82f21d69dd8";
/** スマホ・インライン 300×250（`mrec` とは別タグ） */
const DEFAULT_MREC_MOBILE = "https://adm.shinobi.jp/s/af2a630698c570c3da224666a9fdbdea";
/** スマホ・固定オーバーレイ 320×100 */
const DEFAULT_OVERLAY_MOBILE = "https://adm.shinobi.jp/s/3124e5f0dbc4ab53ee285cc8cc995de6";
/** PC 右列 160×600（`lg` 以上） */
const DEFAULT_RIGHT_SIDE_160 = "https://adm.shinobi.jp/s/d1f607a6d4ed16ad174697dc2b893590";

function envUrl(key: string, fallback: string): string {
  const v = process.env[key];
  if (typeof v === "string" && v.trim()) {
    const t = v.trim();
    if (tagFromShinobiScriptUrl(t)) return t;
  }
  return fallback;
}

/** 枠キー → Shinobi の `/s/...` URL（`NEXT_PUBLIC_ADMAX_*` で上書き） */
export const admax = {
  mrec: envUrl("NEXT_PUBLIC_ADMAX_MREC", DEFAULT_MREC),
  headerMobile: envUrl("NEXT_PUBLIC_ADMAX_HEADER_MOBILE", DEFAULT_HEADER_MOBILE),
  belowToolbar: envUrl("NEXT_PUBLIC_ADMAX_BELOW_TOOLBAR", DEFAULT_BELOW_TOOLBAR),
  banner320x100: envUrl("NEXT_PUBLIC_ADMAX_BANNER_320X100", DEFAULT_BANNER_320X100),
  mrecMobile: envUrl("NEXT_PUBLIC_ADMAX_MREC_MOBILE", DEFAULT_MREC_MOBILE),
  overlayMobile: envUrl("NEXT_PUBLIC_ADMAX_OVERLAY_MOBILE", DEFAULT_OVERLAY_MOBILE),
  rightSide160: envUrl("NEXT_PUBLIC_ADMAX_RIGHT_SIDE_160", DEFAULT_RIGHT_SIDE_160),
} as const;

export type AdmaxSlotKey = keyof typeof admax;

export function tagIdFromAdmaxUrl(url: string): string | null {
  return tagFromShinobiScriptUrl(url);
}
