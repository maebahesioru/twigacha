import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getIp } from '@/lib/rateLimit';

// コード→usernameのマスター（サーバー側で管理）
const CODES: Record<string, string> = {
  WIKIGACHA: 'harusugi5',
};

export async function POST(req: NextRequest) {
  if (!rateLimit(getIp(req), 10, 60_000))
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const { code } = await req.json();
  if (!code || typeof code !== 'string')
    return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const username = CODES[code.toUpperCase().trim()];
  if (!username) return NextResponse.json({ error: 'invalid' }, { status: 404 });

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://twigacha.vercel.app';
  const res = await fetch(`${base}/api/gacha?username=${encodeURIComponent(username)}`);
  if (!res.ok) return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  const card = await res.json();
  return NextResponse.json({ card });
}
