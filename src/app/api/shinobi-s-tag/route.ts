import { NextRequest } from "next/server";

/** タグスクリプト本文をサーバー経由で取得（CORS 回避・将来の種別判定用） */
export async function GET(request: NextRequest) {
  const tag = request.nextUrl.searchParams.get("tag");
  if (!tag || !/^[a-f0-9]{32}$/i.test(tag)) {
    return new Response("Invalid or missing tag", { status: 400 });
  }
  const safe = tag.toLowerCase();
  const res = await fetch(`https://adm.shinobi.jp/s/${safe}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    return new Response("Upstream error", { status: res.status });
  }
  const text = await res.text();
  return new Response(text, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
