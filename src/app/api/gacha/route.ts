import { buildCard } from "@/lib/card";
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

// ピックアップガチャ用
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

function shuffle<T>(arr: T[]): T[] {
  return arr.sort(() => Math.random() - 0.5);
}

export async function GET(req: Request) {
  if (!rateLimit(getIp(req), 60, 60_000))
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const count = Math.min(parseInt(searchParams.get("count") ?? "5"), 10);
  const rawUsername = searchParams.get("username");
  const isBsky = rawUsername ? rawUsername.includes(".") : false;
  const username = rawUsername
    ? isBsky
      ? rawUsername.replace(/^@/, "").slice(0, 100)
      : rawUsername.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 50)
    : null;

  const rawQuery = searchParams.get("query");
  const query = rawQuery ? sanitizeQuery(rawQuery) : null;

  // ピックアップガチャ
  if (query) {
    try {
      const [usernames, bskyUsers] = await Promise.all([
        fetchPickupUsernames(query),
        fetchPickupBskyUsers(query, Math.ceil(count / 2)),
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
      const cards = shuffle([...twitterCards, ...bskyUsers.map(buildBskyCard)]).slice(0, count);
      if (!cards.length) return NextResponse.json({ error: "カードを取得できませんでした" }, { status: 404 });
      return NextResponse.json(cards);
    } catch (e) {
      console.error(e);
      return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
    }
  }


  if (username) {
    try {
      if (isBsky) {
        const u = await fetchBskyUser(username);
        if (!u) return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
        const bskyCard = buildBskyCard(u);
        return NextResponse.json(bskyCard);
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
      return NextResponse.json(card);
    } catch {
      return NextResponse.json({ error: "取得失敗" }, { status: 500 });
    }
  }

  try {
    // Twitter と Bsky を並列取得してシャッフル
    const [usernames, bskyUsers] = await Promise.all([
      fetchUsernames(),
      fetchRandomBskyUsers(Math.ceil(count / 2)),
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
    const cards = shuffle([...twitterCards, ...bskyCards]).slice(0, count);

    if (!cards.length) {
      return NextResponse.json({ error: "カードを取得できませんでした" }, { status: 404 });
    }

    return NextResponse.json(cards);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
