/** `https://adm.shinobi.jp/s/{32hex}` からタグ ID を取り出す */
export function tagFromShinobiScriptUrl(url: string): string | null {
  const m = url.trim().match(/\/s\/([a-f0-9]{32})(?:\?|#|$)/i);
  return m ? m[1].toLowerCase() : null;
}
