import type { Metadata } from "next";
import CardPageClient from "./CardPageClient";
import type { TwitterCard } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `@${username}のTCGカード | TwiGacha`,
    description: `@${username}のTwiGachaカードを見る・バトルシミュレーション`,
    openGraph: {
      title: `@${username}のTCGカード | TwiGacha`,
      description: `@${username}のTwiGachaカードを見る・バトルシミュレーション`,
      images: [`${BASE_URL}/card/${username}/opengraph-image`],
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function CardPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  let card: TwitterCard | null = null;
  try {
    const res = await fetch(`${BASE_URL}/api/gacha?username=${encodeURIComponent(username)}`, { next: { revalidate: 3600 } });
    if (res.ok) card = await res.json();
  } catch {}
  return <CardPageClient username={username} initialCard={card} />;
}
