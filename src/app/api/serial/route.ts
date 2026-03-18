import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { rateLimit, getIp } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  if (!rateLimit(getIp(req), 10, 60_000))
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const { code } = await req.json();
  if (!code || typeof code !== 'string')
    return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const { data, error } = await supabase
    .from('serial_codes')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .single();

  if (error || !data) return NextResponse.json({ error: 'invalid' }, { status: 404 });
  if (data.expires_at && new Date(data.expires_at) < new Date())
    return NextResponse.json({ error: 'expired' }, { status: 410 });

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://twigacha.vercel.app';
  const res = await fetch(`${base}/api/gacha?username=${encodeURIComponent(data.username)}`);
  if (!res.ok) return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  const card = await res.json();
  return NextResponse.json({ card });
}
