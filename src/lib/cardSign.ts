import type { TwitterCard } from "@/types";

const SECRET = process.env.CARD_SIGN_SECRET ?? "twigacha-default-secret";

function statString(card: TwitterCard): string {
  return `${card.id}:${card.atk}:${card.def}:${card.spd}:${card.hp}:${card.int}:${card.luk}:${card.element ?? ""}:${card.skill ?? ""}`;
}

async function hmac(data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function signCard(card: TwitterCard): Promise<TwitterCard> {
  const signature = await hmac(statString(card));
  return { ...card, signature };
}

export async function verifySignature(card: TwitterCard): Promise<boolean> {
  if (!card.signature) return false;
  const expected = await hmac(statString(card));
  return card.signature === expected;
}
