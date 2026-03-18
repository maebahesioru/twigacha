import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { rateLimit, getIp } from '@/lib/rateLimit';
import { buildCard } from '@/lib/card';
import { signCard } from '@/lib/cardSign';

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

async function fetchFxUser(username: string) {
  const res = await fetch(`https://api.fxtwitter.com/status/${username}`, {
    headers: { 'User-Agent': UA },
    next: { revalidate: 3600 },
  }).catch(() => null);
  if (!res?.ok) return null;
  const data = await res.json().catch(() => null);
  return data?.user ?? null;
}

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

  const user = await fetchFxUser(data.username);
  if (!user) return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });

  const card = buildCard({
    id: user.id ?? user.screen_name,
    screen_name: user.screen_name,
    name: user.name ?? user.screen_name,
    avatar: (user.avatar_url ?? user.avatar?.url ?? "").replace("_normal.", "_400x400."),
    description: user.description ?? "",
    followers: user.followers ?? 0,
    following: user.following ?? 0,
    statuses: user.tweets ?? user.statuses ?? 0,
    likes: user.likes ?? 0,
    media_count: user.media_count ?? 0,
    joined: user.joined ?? "",
    verified: user.verification?.verified ?? user.verified ?? false,
    verification_type: user.verification?.type,
    username_changes: user.about_account?.username_changes?.count ?? 0,
    location: user.location || undefined,
    website: user.website?.url || user.website || undefined,
  });

  return NextResponse.json(await signCard(card));
}
