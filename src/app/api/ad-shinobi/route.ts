import { NextRequest } from "next/server";

/**
 * iframe 内で `document.write` が効く同一オリジン HTML を返す（Shinobi タグ用）。
 * クエリ: `tag` = 32 文字の hex（`/s/{tag}` の部分）
 */
export async function GET(request: NextRequest) {
  const tag = request.nextUrl.searchParams.get("tag");
  if (!tag || !/^[a-f0-9]{32}$/i.test(tag)) {
    return new Response("Invalid or missing tag", { status: 400 });
  }
  const safe = tag.toLowerCase();
  const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}</style></head><body><script src="https://adm.shinobi.jp/s/${safe}"></script></body></html>`;
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, max-age=300",
    },
  });
}
