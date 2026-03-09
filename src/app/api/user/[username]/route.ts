import { buildCard } from "@/lib/card";
import { NextResponse } from "next/server";
import { rateLimit, getIp } from "@/lib/rateLimit";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  if (!rateLimit(getIp(req), 30, 60_000))
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { username: raw } = await params;
  const username = raw.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 50);
  if (!username) return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  const res = await fetch(`https://api.fxtwitter.com/${username}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const data = await res.json();
  const user = data?.user;
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const card = buildCard({
    id: user.id ?? username,
    screen_name: user.screen_name ?? username,
    name: user.name ?? username,
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

  return NextResponse.json(card);
}
