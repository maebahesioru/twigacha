import { NextRequest, NextResponse } from "next/server";

const HKM_API = process.env.HKM_API_URL || "https://hikakinmaniacoin.hikamer.f5.si";
const HKM_API_KEY = process.env.HKM_API_KEY || "";

// HKMでガチャを購入するエンドポイント
// POST /api/gacha/hkm
// body: { discordId, type: "normal" | "ssr" }
export async function POST(req: NextRequest) {
  const { discordId, type } = await req.json() as { discordId: string; type: "normal" | "ssr" };

  if (!discordId || !type) {
    return NextResponse.json({ error: "discordId and type are required" }, { status: 400 });
  }

  const cost = type === "ssr" ? 700 : 500;
  const count = type === "ssr" ? 1 : 5;

  // 1. HKMを消費
  const deductRes = await fetch(`${HKM_API}/api/external`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": HKM_API_KEY },
    body: JSON.stringify({
      discordId,
      amount: String(cost),
      action: "deduct",
      memo: `TwiGacha ${type === "ssr" ? "SSR確定1枚" : "カードパック5枚"}`,
    }),
  });

  if (!deductRes.ok) {
    const err = await deductRes.json();
    return NextResponse.json({ error: err.error || "HKM残高不足" }, { status: 400 });
  }

  // 2. ガチャを実行（既存のガチャAPIを内部呼び出し）
  const gachaRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/gacha`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ count, forceSSR: type === "ssr" }),
  });

  if (!gachaRes.ok) {
    // ガチャ失敗時はHKMを返金
    await fetch(`${HKM_API}/api/external`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": HKM_API_KEY },
      body: JSON.stringify({
        discordId,
        amount: String(cost),
        action: "grant",
        memo: "TwiGachaガチャ失敗返金",
      }),
    });
    return NextResponse.json({ error: "ガチャ実行に失敗しました" }, { status: 500 });
  }

  const cards = await gachaRes.json();
  return NextResponse.json({ cards, cost, count });
}
