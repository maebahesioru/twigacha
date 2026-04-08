/**
 * Shinobi の `/s/{tag}` が返すインライン用 JS から、document.write なしで
 * `window.admaxbanner` + `st/s.js` を再現するための値を取り出す。
 */
export type ShinobiBannerInline = {
  admaxId: string;
  tagId: string;
  width: number;
  height: number;
};

export function parseShinobiBannerTagScript(js: string): ShinobiBannerInline | null {
  if (!js.includes("admaxbanner")) return null;
  const idMatch = js.match(/id\s*=\s*["'](admax-banner-[^"']+)["']/i);
  const tagIdMatch = js.match(/tag_id\s*:\s*['"]([a-fA-F0-9]{32})['"]/);
  const wMatch = js.match(/(?:^|[^a-z])width\s*:\s*(\d+)/i);
  const hMatch = js.match(/(?:^|[^a-z])height\s*:\s*(\d+)/i);
  if (!idMatch || !tagIdMatch) return null;
  return {
    admaxId: idMatch[1],
    tagId: tagIdMatch[1],
    width: parseInt(wMatch?.[1] ?? "160", 10),
    height: parseInt(hMatch?.[1] ?? "600", 10),
  };
}
