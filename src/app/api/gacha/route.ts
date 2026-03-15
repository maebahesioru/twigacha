import { buildCard } from "@/lib/card";
import { signCard } from "@/lib/cardSign";
import { NextResponse } from "next/server";
import { rateLimit, getIp } from "@/lib/rateLimit";

const QUERY = "(あ い う え お か き く け こ さ し す せ そ た ち つ て と な に ぬ ね の は ひ ふ へ ほ ま み む め も や ゆ よ ら り る れ ろ わ を ん が ぎ ぐ げ ご ざ じ ず ぜ ぞ だ ぢ づ で ど ば び ぶ べ ぼ ぱ ぴ ぷ ぺ ぽ ア イ ウ エ オ カ キ ク ケ コ サ シ ス セ ソ タ チ ツ テ ト ナ ニ ヌ ネ ノ ハ ヒ フ ヘ ホ マ ミ ム メ モ ヤ ユ ヨ ラ リ ル レ ロ ワ ヲ ン a b c d e f g h i j k l m n o p q r s t u v w x y z A B C D E F G H I J K L M N O P Q R S T U V W X Y Z 0 1 2 3 4 5 6 7 8 9)";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

let bskyToken: { jwt: string; exp: number } | null = null;
async function getBskyToken() {
  if (bskyToken && bskyToken.exp > Date.now()) return bskyToken.jwt;
  const res = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: process.env.BSKY_IDENTIFIER, password: process.env.BSKY_APP_PASSWORD }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  bskyToken = { jwt: data.accessJwt, exp: Date.now() + 60 * 60 * 1000 };
  return data.accessJwt;
}

async function fetchUsernames(): Promise<string[]> {
  const url = `https://search.yahoo.co.jp/realtime/api/v1/pagination?p=${encodeURIComponent(QUERY)}&rkf=3&results=40`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
      "Referer": "https://search.yahoo.co.jp/realtime/search",
      "Origin": "https://search.yahoo.co.jp",
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const entries: { screenName?: string }[] = data?.timeline?.entry ?? [];
  return entries.map((e) => e.screenName).filter((n): n is string => !!n);
}

function getUltimateEffect(text: string, rank: number): string {
  const emojiCount = (text.match(/\p{Emoji}/gu) ?? []).length;
  if (text.includes("?") || text.includes("？")) return "confuse";
  if (emojiCount >= 3) return "boost";
  if (/[!！]{2,}/.test(text)) return "multi";
  if (/死|終|消|闇|呪|hate|kill|die/i.test(text)) return "poison";
  if (/love|好き|ありがとう|感謝|嬉し/i.test(text)) return "drain";
  if (/冷|寒|氷|cold|ice|freeze/i.test(text)) return "freeze";
  if (/弱|負|lose|weak|ダメ/i.test(text)) return "debuff";
  if (/回復|治|recover|regen/i.test(text)) return "regen";
  if (/反|返|counter|back|リプ/i.test(text)) return "counter";
  if (/爆|bomb|nuke/i.test(text)) return "nuke";
  if (/黙|静|silent|quiet/i.test(text)) return "silence";
  if (/充|溜|charge|power|力/i.test(text)) return "charge";
  if (/運|luck|ガチャ|random/i.test(text)) return "random";
  if (/\d/.test(text)) return "crit";
  if (text.length > 20) return "pierce";
  if (rank === 0) return "damage";
  if (rank === 1) return "shield";
  return "heal";
}

async function fetchXUltimates(username: string): Promise<{ text: string; score: number; effect: string }[]> {
  try {
    const res = await fetch(`https://syndication.twitter.com/srv/timeline-profile/screen-name/${username}?count=20`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      next: { revalidate: 86400 },
    });
    const html = await res.text();
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!match) return [];
    const data = JSON.parse(match[1]);
    const entries: Record<string, unknown>[] = data?.props?.pageProps?.timeline?.entries ?? [];
    return entries
      .map((e) => {
        const t = (e as { content?: { tweet?: Record<string, unknown> } }).content?.tweet ?? {};
        const text = ((t.full_text as string) ?? "").replace(/https?:\/\/\S+/g, "").trim();
        const score = Number(t.favorite_count ?? 0) + Number(t.retweet_count ?? 0) * 3 + Number(t.reply_count ?? 0) * 2;
        return { text: text.slice(0, 30), score };
      })
      .filter(u => u.text.length > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((u, i) => ({ ...u, effect: getUltimateEffect(u.text, i) }));
  } catch { return []; }
}

async function fetchMisskeyUltimates(userId: string): Promise<{ text: string; score: number; effect: string }[]> {
  try {
    const res = await fetch(`${MISSKEY_BASE}/api/users/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, limit: 20 }),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    const notes = await res.json();
    if (!Array.isArray(notes)) return [];
    return notes
      .map((n: { text?: string; reactions?: Record<string, number> }) => {
        const text = (n.text ?? "").replace(/https?:\/\/\S+/g, "").trim();
        const score = Object.values(n.reactions ?? {}).reduce((a, b) => a + b, 0);
        return { text: text.slice(0, 30), score };
      })
      .filter(u => u.text.length > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((u, i) => ({ ...u, effect: getUltimateEffect(u.text, i) }));
  } catch { return []; }
}

async function fetchMastodonUltimates(accountId: string, instance: string): Promise<{ text: string; score: number; effect: string }[]> {
  try {
    const res = await fetch(`https://${instance}/api/v1/accounts/${accountId}/statuses?limit=20`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    const statuses = await res.json();
    if (!Array.isArray(statuses)) return [];
    return statuses
      .map((s: { content?: string; favourites_count?: number; reblogs_count?: number; replies_count?: number }) => {
        const text = (s.content ?? "").replace(/<[^>]+>/g, "").replace(/https?:\/\/\S+/g, "").trim();
        const score = Number(s.favourites_count ?? 0) + Number(s.reblogs_count ?? 0) * 3 + Number(s.replies_count ?? 0) * 2;
        return { text: text.slice(0, 30), score };
      })
      .filter(u => u.text.length > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((u, i) => ({ ...u, effect: getUltimateEffect(u.text, i) }));
  } catch { return []; }
}

async function fetchBskyUltimates(handle: string): Promise<{ text: string; score: number; effect: string }[]> {
  try {
    const res = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(handle)}&limit=20`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.feed ?? [])
      .map((item: Record<string, unknown>) => {
        const post = (item as { post?: Record<string, unknown> }).post ?? {};
        const text = ((post.record as Record<string, unknown>)?.text as string ?? "").replace(/https?:\/\/\S+/g, "").trim();
        const score = Number(post.likeCount ?? 0) + Number(post.repostCount ?? 0) * 3 + Number(post.replyCount ?? 0) * 2;
        return { text: text.slice(0, 30), score };
      })
      .filter((u: { text: string; score: number }) => u.text.length > 0)
      .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
      .slice(0, 3)
      .map((u: { text: string; score: number }, i: number) => ({ ...u, effect: getUltimateEffect(u.text, i) }));
  } catch { return []; }
}

async function fetchFxUser(username: string) {
  const res = await fetch(`https://api.fxtwitter.com/${username}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.user ?? null;
}

async function fetchBskyUser(handle: string) {
  const res = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(handle)}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;
  return res.json();
}

function buildBskyCard(u: Record<string, unknown>) {
  return buildCard({
    id: String(u.did ?? u.handle),
    screen_name: String(u.handle),
    name: String(u.displayName ?? u.handle),
    avatar: String(u.avatar ?? ""),
    description: String(u.description ?? ""),
    followers: Number(u.followersCount ?? 0),
    following: Number(u.followsCount ?? 0),
    statuses: Number(u.postsCount ?? 0),
    likes: Number(u.followersCount ?? 0),
    media_count: Number(u.postsCount ?? 0) + Number((u.associated as Record<string, number> | undefined)?.lists ?? 0),
    joined: String(u.createdAt ?? ""),
    verified: false,
    username_changes: 0,
  });
}

async function fetchRandomBskyUsers(count: number) {
  const cursor = Math.floor(Math.random() * 8_000_000) + 1;
  const res = await fetch(`https://bsky.network/xrpc/com.atproto.sync.listRepos?limit=${count * 3}&cursor=${cursor}`, {
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const dids: string[] = (data.repos ?? [])
    .filter((r: { active?: boolean }) => r.active)
    .map((r: { did: string }) => r.did)
    .slice(0, 25);
  const token = await getBskyToken();
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const params = dids.map(d => `actors=${encodeURIComponent(d)}`).join('&');
  const bulk = await fetch(`https://bsky.social/xrpc/app.bsky.actor.getProfiles?${params}`, { headers, next: { revalidate: 0 } });
  if (!bulk.ok) return [];
  const bulkData = await bulk.json();
  return (bulkData.profiles ?? [])
    .filter((u: Record<string, unknown>) => Number(u.followersCount ?? 0) >= 10)
    .slice(0, count);
}

async function fetchPickupMisskeyUsers(query: string, count: number) {
  try {
    const res = await fetch(`${MISSKEY_BASE}/api/notes/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit: count * 4 }),
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const notes = await res.json();
    if (!Array.isArray(notes)) return [];
    const seen = new Set<string>();
    const users: { username: string; host: string | null }[] = [];
    for (const note of notes) {
      const u = note?.user;
      if (!u?.username) continue;
      const key = `${u.username}@${u.host ?? "misskey.io"}`;
      if (seen.has(key)) continue;
      seen.add(key);
      users.push({ username: u.username, host: u.host ?? null });
    }
    const details = await Promise.all(users.slice(0, count).map(u =>
      fetch(`${MISSKEY_BASE}/api/users/show`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u.username, host: u.host || undefined }),
        next: { revalidate: 0 },
      }).then(r => r.ok ? r.json() : null).catch(() => null)
    ));
    return details.filter(Boolean);
  } catch { return []; }
}


function sanitizeQuery(q: string) {
  return q
    .replace(/id:\S+/gi, '')
    .replace(/url:\S+/gi, '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[@#]/g, '')
    .replace(/[()]/g, '')
    .replace(/-\S+/g, '')
    .trim()
    .slice(0, 5);
}

async function fetchPickupBskyUsers(query: string, count: number) {
  const token = await getBskyToken();
  if (!token) return [];
  const res = await fetch(
    `https://bsky.social/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(query)}&limit=${count * 3}&sort=latest`,
    { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 0 } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  const handles = [...new Set((data.posts ?? []).map((p: { author: { handle: string } }) => p.author.handle))].slice(0, count * 2) as string[];
  const profiles = await Promise.all(handles.map(fetchBskyUser));
  return profiles.filter((u) => u && (u.followersCount ?? 0) >= 10).slice(0, count);
}

async function fetchPickupUsernames(query: string): Promise<string[]> {
  const url = `https://search.yahoo.co.jp/realtime/api/v1/pagination?p=${encodeURIComponent(query)}&rkf=3&results=40`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept": "application/json, text/plain, */*", "Accept-Language": "ja,en-US;q=0.9,en;q=0.8", "Referer": "https://search.yahoo.co.jp/realtime/search", "Origin": "https://search.yahoo.co.jp" },
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data?.timeline?.entry ?? []).map((e: { screenName?: string }) => e.screenName).filter((n: string | undefined): n is string => !!n);
}

async function fetchRandomMisskeyUsers(count: number) {
  try {
    const res = await fetch(`${MISSKEY_BASE}/api/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: count * 4 }),
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const notes = await res.json();
    if (!Array.isArray(notes)) return [];
    const seen = new Set<string>();
    const users = [];
    for (const note of notes) {
      const u = note?.user;
      if (!u?.username) continue;
      const key = `${u.username}@${u.host ?? "misskey.io"}`;
      if (seen.has(key)) continue;
      seen.add(key);
      users.push(u);
      if (users.length >= count * 2) break;
    }
    const details = await Promise.all(users.slice(0, count).map(u =>
      fetch(`${MISSKEY_BASE}/api/users/show`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u.username, host: u.host || undefined }),
        next: { revalidate: 0 },
      }).then(r => r.ok ? r.json() : null).catch(() => null)
    ));
    return details.filter(Boolean);
  } catch { return []; }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildMisskeyCard(u: any) {
  const host = u.host ?? "misskey.io";
  const fieldsCount = (u.fields ?? []).length;
  const rolesCount = (u.roles ?? []).length;
  const card = buildCard({
    id: `msky_${u.id}`,
    screen_name: u.host ? `${u.username}@${host}` : u.username,
    name: (u.name || u.username).replace(/:[a-zA-Z0-9_]+:/g, "").trim() || u.username,
    avatar: u.avatarUrl ?? "",
    description: u.description ?? "",
    followers: u.followersCount ?? 0,
    following: u.followingCount ?? 0,
    statuses: u.notesCount ?? 0,
    likes: 0,
    media_count: fieldsCount * 100, // fieldsをmedia_countに流用してDEFに反映
    joined: u.birthday ?? u.createdAt ?? "", // birthdayを誕生日判定に使用
    verified: (u.badgeRoles ?? []).some((r: { name: string }) => r.name === "Verified"),
    location: u.location || undefined,
  });
  // isCat → LUK+200, isBot → ATK+150, isLocked → DEF+150, onlineStatus=online/active → SPD+100/50, roles → LUK+50each
  const lukBonus = (u.isCat ? 200 : 0) + rolesCount * 50
    + (u.followersVisibility === "public" && u.followingVisibility === "public" ? 80 : 0)
    + ((u.followersCount ?? 0) > (u.followingCount ?? 0) * 10 ? 150 : 0)
    + (u.verifiedLinks ?? []).length * 50;
  const atkBonus = (u.isBot ? 150 : 0) + ((u.alsoKnownAs ?? []).length > 0 ? 100 : 0)
    + (u.isBot && (u.notesCount ?? 0) > 10000 ? 200 : 0)
    + ((u.notesCount ?? 0) > (u.followersCount ?? 0) ? 100 : 0);
  const defBonus = (u.isLocked ? 150 : 0) + (u.pinnedNoteIds ?? []).length * 30
    + (u.bannerUrl ? 80 : 0)
    + ((u.followingCount ?? 0) === 0 ? 120 : 0);
  const spdBonus = (u.onlineStatus === "online" ? 100 : u.onlineStatus === "active" ? 50 : 0)
    + (u.updatedAt && (Date.now() - new Date(u.updatedAt).getTime()) < 7 * 86400000 ? 80 : 0);
  const intBonus = (u.publicReactions ? 100 : 0) + (u.mutualLinkSections ?? []).length * 40;
  const hpBonus = new Date(u.createdAt ?? "").getFullYear() <= 2017 ? 200 : 0;
  const ghostMultiplier = (u.followersCount ?? 0) === 0 ? 0.5 : 1;
  const movedPenalty = u.movedTo ? 200 : 0;
  const silencePenalty = u.isSilenced ? 100 : 0;
  const limitedSpdPenalty = u.isLimited ? 100 : 0;
  const chatDefBonus = u.chatScope === "mutual" ? 50 : 0;
  return {
    ...card,
    luk: Math.min(Math.max(0, Math.round((card.luk + lukBonus - movedPenalty - silencePenalty) * ghostMultiplier)), 9999),
    atk: Math.min(Math.max(0, Math.round((card.atk + atkBonus - movedPenalty - silencePenalty) * ghostMultiplier)), 9999),
    def: Math.min(Math.max(0, Math.round((card.def + defBonus + chatDefBonus - movedPenalty - silencePenalty) * ghostMultiplier)), 9999),
    spd: Math.min(Math.max(0, Math.round((card.spd + spdBonus - movedPenalty - silencePenalty - limitedSpdPenalty) * ghostMultiplier)), 9999),
    int: Math.min(Math.max(0, Math.round((card.int + intBonus - movedPenalty - silencePenalty) * ghostMultiplier)), 9999),
    hp:  Math.min(Math.max(0, Math.round((card.hp + hpBonus - movedPenalty - silencePenalty) * ghostMultiplier)), 9999),
    platform: "misskey",
  };
}

const MISSKEY_BASE = "https://misskey.io";

// Mastodonサーバーキャッシュ（起動時1回取得）
let mastodonServers: string[] = [];
async function getMastodonServers(): Promise<string[]> {
  if (mastodonServers.length > 0) return mastodonServers;
  try {
    const res = await fetch("https://api.joinmastodon.org/servers", { next: { revalidate: 86400 } });
    if (!res.ok) return ["mastodon.social"];
    const data = await res.json();
    mastodonServers = (data as { domain: string }[]).map(s => s.domain);
    return mastodonServers;
  } catch { return ["mastodon.social"]; }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildMastodonCard(u: any, instance: string) {
  const card = buildCard({
    id: `mdon_${instance}_${u.id}`,
    screen_name: u.acct?.includes("@") ? u.acct : `${u.username}@${instance}`,
    name: u.display_name || u.username,
    avatar: u.avatar ?? "",
    description: u.note?.replace(/<[^>]+>/g, "") ?? "",
    followers: u.followers_count ?? 0,
    following: u.following_count ?? 0,
    statuses: u.statuses_count ?? 0,
    likes: 0,
    media_count: (u.fields ?? []).length * 100,
    joined: u.created_at ?? "",
    verified: (u.fields ?? []).some((f: { verified_at: string | null }) => f.verified_at),
    location: undefined,
    website: u.url || undefined,
  });
  const defBonus = (u.locked ? 150 : 0) + (u.header ? 80 : 0);
  const atkBonus = u.bot ? 150 : 0;
  const lukBonus = (u.fields ?? []).filter((f: { verified_at: string | null }) => f.verified_at).length * 50;
  return {
    ...card,
    atk: Math.min(card.atk + atkBonus, 9999),
    def: Math.min(card.def + defBonus, 9999),
    luk: Math.min(card.luk + lukBonus, 9999),
    platform: "mastodon",
  };
}

async function fetchRandomMastodonUsers(count: number) {
  try {
    const servers = await getMastodonServers();
    const domain = servers[Math.floor(Math.random() * servers.length)];
    const res = await fetch(`https://${domain}/api/v1/directory?local=true&order=active&limit=40`, { next: { revalidate: 0 } });
    if (!res.ok) return [];
    const users = await res.json();
    if (!Array.isArray(users)) return [];
    return shuffle(users).slice(0, count).map((u: unknown) => buildMastodonCard(u, domain));
  } catch { return []; }
}

async function fetchPickupMastodonUsers(query: string, count: number) {
  try {
    const res = await fetch(`https://mastodon.social/api/v2/search?q=${encodeURIComponent(query)}&type=accounts&limit=${count * 4}&resolve=false`, { next: { revalidate: 0 } });
    if (!res.ok) return [];
    const data = await res.json();
    const accounts = (data.accounts ?? []) as { acct: string; [key: string]: unknown }[];
    // nodeinfoでmastodonのみに絞る（キャッシュ付き）
    const instanceCache = new Map<string, boolean>();
    const isMastodon = async (acct: string) => {
      const instance = acct.includes("@") ? acct.split("@")[1] : "mastodon.social";
      if (instanceCache.has(instance)) return instanceCache.get(instance)!;
      try {
        const ni = await fetch(`https://${instance}/.well-known/nodeinfo`, { next: { revalidate: 86400 } }).then(r => r.ok ? r.json() : null);
        const href = ni?.links?.[0]?.href;
        if (!href) { instanceCache.set(instance, false); return false; }
        const info = await fetch(href, { next: { revalidate: 86400 } }).then(r => r.ok ? r.json() : null);
        const result = info?.software?.name === "mastodon";
        instanceCache.set(instance, result);
        return result;
      } catch { instanceCache.set(instance, false); return false; }
    };
    const filtered = (await Promise.all(accounts.map(async u => (await isMastodon(u.acct)) ? u : null))).filter(Boolean);
    return filtered.slice(0, count).map((u: unknown) => {
      const acc = u as { acct: string; [key: string]: unknown };
      const instance = acc.acct.includes("@") ? acc.acct.split("@")[1] : "mastodon.social";
      return buildMastodonCard(acc, instance);
    });
  } catch { return []; }
}

async function fetchMastodonUser(username: string, instance: string) {
  try {
    const res = await fetch(`https://${instance}/api/v1/accounts/lookup?acct=${encodeURIComponent(username)}`, { next: { revalidate: 0 } });
    if (!res.ok) return null;
    const u = await res.json();
    return buildMastodonCard(u, instance);
  } catch { return null; }
}

function shuffle<T>(arr: T[]): T[] {
  return arr.sort(() => Math.random() - 0.5);
}

export async function GET(req: Request) {
  if (!rateLimit(getIp(req), 60, 60_000))
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const count = Math.min(parseInt(searchParams.get("count") ?? "5"), 10);
  const rawUsername = searchParams.get("username");
  if (rawUsername && (rawUsername.length > 150 || /[<>"'`]/.test(rawUsername)))
    return NextResponse.json({ error: "invalid username" }, { status: 400 });
  const platform = searchParams.get("platform"); // "mastodon" の場合はMastodon指定
  const isMastodonUser = platform === "mastodon" || (rawUsername?.includes("@") && rawUsername.split("@").length === 2 && platform !== "misskey");
  const isBsky = rawUsername ? (!rawUsername.includes("@") && rawUsername.includes(".")) : false;
  const username = rawUsername
    ? isBsky
      ? rawUsername.replace(/^@/, "").slice(0, 100)
      : rawUsername.replace(/^@/, "").slice(0, 100)
    : null;

  const rawQuery = searchParams.get("query");
  if (rawQuery && rawQuery.length > 200)
    return NextResponse.json({ error: "invalid query" }, { status: 400 });
  const query = rawQuery ? sanitizeQuery(rawQuery) : null;

  // ピックアップガチャ
  if (query) {
    try {
      const [usernames, bskyUsers, misskeyUsers, mastodonUsers] = await Promise.all([
        fetchPickupUsernames(query),
        fetchPickupBskyUsers(query, Math.ceil(count / 4)),
        fetchPickupMisskeyUsers(query, Math.ceil(count / 4)),
        fetchPickupMastodonUsers(query, Math.ceil(count / 4)),
      ]);
      const twitterCards = await Promise.all(
        shuffle([...new Set(usernames)]).slice(0, count).map(fetchFxUser)
      ).then(users => users.filter(Boolean).map((user) => buildCard({
        id: user.id ?? user.screen_name, screen_name: user.screen_name,
        name: user.name ?? user.screen_name,
        avatar: (user.avatar_url ?? user.avatar?.url ?? "").replace("_normal.", "_400x400."),
        description: user.description ?? "", followers: user.followers ?? 0,
        following: user.following ?? 0, statuses: user.tweets ?? user.statuses ?? 0,
        likes: user.likes ?? 0, media_count: user.media_count ?? 0,
        joined: user.joined ?? "", verified: user.verification?.verified ?? user.verified ?? false,
        verification_type: user.verification?.type,
        username_changes: user.about_account?.username_changes?.count ?? 0,
        location: user.location || undefined, website: user.website?.url || user.website || undefined,
      })));
      const cards = shuffle([...twitterCards, ...bskyUsers.map(buildBskyCard), ...misskeyUsers.map(buildMisskeyCard), ...mastodonUsers]).slice(0, count);
      if (!cards.length) return NextResponse.json({ error: "カードを取得できませんでした" }, { status: 404 });
      return NextResponse.json(await Promise.all(cards.map(signCard)));
    } catch (e) {
      console.error(e);
      return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
    }
  }


  if (username) {
    try {
      // Mastodon: user@instance 形式 + platform=mastodon
      if (isMastodonUser && username.includes("@")) {
        const [mUser, mInstance] = username.split("@");
        // nodeinfoでMastodonか確認、失敗したらMisskeyにフォールバック
        let isMastodonInstance = platform === "mastodon";
        if (!isMastodonInstance) {
          try {
            const ni = await fetch(`https://${mInstance}/.well-known/nodeinfo`, { next: { revalidate: 86400 } }).then(r => r.ok ? r.json() : null);
            const href = ni?.links?.[0]?.href;
            if (href) {
              const info = await fetch(href, { next: { revalidate: 86400 } }).then(r => r.ok ? r.json() : null);
              isMastodonInstance = info?.software?.name === "mastodon";
            }
          } catch { /* fallthrough to Misskey */ }
        }
        if (isMastodonInstance) {
          const card = await fetchMastodonUser(mUser, mInstance || "mastodon.social");
          if (!card) return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
          // Mastodon ultimates: account IDはidフィールドから取得
          const rawId = card.id.replace(`mdon_${mInstance || "mastodon.social"}_`, "");
          const ultimates = await fetchMastodonUltimates(rawId, mInstance || "mastodon.social");
          return NextResponse.json(await signCard({ ...card, ultimates }));
        }
      }
      // Misskey: user@instance 形式
      if (username.includes("@")) {
        const [mUser, mHost] = username.split("@");
        const u = await fetch(`${MISSKEY_BASE}/api/users/show`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: mUser, host: mHost || undefined }),
          next: { revalidate: 0 },
        }).then(r => r.ok ? r.json() : null).catch(() => null);
        if (!u) return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
        const misskeyCard = buildMisskeyCard(u);
        const ultimates = await fetchMisskeyUltimates(u.id);
        return NextResponse.json(await signCard({ ...misskeyCard, ultimates }));
      }
      if (isBsky) {
        const u = await fetchBskyUser(username);
        if (!u) return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
        return NextResponse.json(await signCard(buildBskyCard(u)));
      }
      const user = await fetchFxUser(username);
      if (!user) return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
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
    } catch {
      return NextResponse.json({ error: "取得失敗" }, { status: 500 });
    }
  }

  try {
    // Twitter・Bsky・Misskey・Mastodonを並列取得してシャッフル
    const [usernames, bskyUsers, misskeyUsers, mastodonUsers] = await Promise.all([
      fetchUsernames(),
      fetchRandomBskyUsers(Math.ceil(count / 4)),
      fetchRandomMisskeyUsers(Math.ceil(count / 4)),
      fetchRandomMastodonUsers(Math.ceil(count / 4)),
    ]);

    const twitterCards = await Promise.all(
      shuffle([...new Set(usernames)]).slice(0, count).map(fetchFxUser)
    ).then(users => users.filter(Boolean).map((user) => buildCard({
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
    })));

    const bskyCards = bskyUsers.map(buildBskyCard);
    const misskeyCards = misskeyUsers.map(buildMisskeyCard);
    const cards = shuffle([...twitterCards, ...bskyCards, ...misskeyCards, ...mastodonUsers]).slice(0, count);

    if (!cards.length) {
      return NextResponse.json({ error: "カードを取得できませんでした" }, { status: 404 });
    }

    return NextResponse.json(await Promise.all(cards.map(signCard)));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
