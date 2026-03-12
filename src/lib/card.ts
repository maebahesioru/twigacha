import type { Element, Rarity, TwitterCard } from "@/types";
import { getSkill } from "@/lib/skill";

const ELEMENTS: Element[] = ["🔥", "💧", "🌿", "⚡", "✨", "🌑", "🌙", "❄️"];

export function isBirthday(joined: string): boolean {
  if (!joined) return false;
  const d = new Date(joined);
  const today = new Date();
  return d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
}



const STAT_MAX = 9999;
const s = (v: unknown) => Math.min(Math.max(0, Math.round(Number(v) || 0)), STAT_MAX);
export function sanitizeCard(c: TwitterCard): TwitterCard {
  return { ...c, atk: s(c.atk), def: s(c.def), spd: s(c.spd), hp: s(c.hp), int: s(c.int), luk: s(c.luk) };
}
export function sanitizeTeamCards(team: unknown): TwitterCard[] {
  return (Array.isArray(team) ? team : []).slice(0, 5).map(c => sanitizeCard(c as TwitterCard));
}
export function sanitizeCollection(data: unknown): TwitterCard[] {
  return (Array.isArray(data) ? data : []).map(c => sanitizeCard(c as TwitterCard));
}


/** 対数スケール（上限なし、refで999になる基準値） */
function logScale(val: number, ref: number): number {
  if (val <= 0) return 0;
  return Math.round((Math.log(val + 1) / Math.log(ref + 1)) * 999);
}

function accountAgeYears(joined: string): number {
  if (!joined) return 0;
  return Math.max(0, (Date.now() - new Date(joined).getTime()) / (1000 * 60 * 60 * 24 * 365));
}

function calcRarity(base: Record<string, number>, verified: boolean): Rarity {
  const vals = Object.values(base);
  const total = vals.reduce((a, b) => a + b, 0);
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  // バランス型: 最小値が最大値の70%以上（高ステ同士でも厳しい条件）
  const isBalanced = max > 0 && min / max >= 0.7;
  // スペシャリスト: 参考値999の1.5倍以上かつバランス型でない
  const isSpecialist = max >= 1500 && !isBalanced;

  let score = total;
  if (verified)    score += 300;
  if (isBalanced)  score += 300; // スペシャリストと同値（難易度が高い分は閾値で調整）
  if (isSpecialist) score += 300;
  if (base.luk >= 800)                    score += 150;
  if (base.spd >= 800 && base.int >= 800) score += 120;

  if (score >= 6500) return "LR";
  if (score >= 5500) return "UR";
  if (score >= 4500) return "SSR";
  if (score >= 3500) return "SR";
  if (score >= 2500) return "R";
  if (score >= 1500) return "N";
  return "C";
}

export function buildCard(user: {
  id: string; screen_name: string; name: string; avatar: string;
  description: string; followers: number; following: number;
  statuses: number; likes: number; media_count: number; joined: string;
  verified: boolean; verification_type?: string;
  username_changes?: number; location?: string; website?: string;
}): TwitterCard {
  const ageYears = accountAgeYears(user.joined);
  // joined不明(0)はツイート数から年齢を逆算（1日10ツイート想定、最大10年）
  const estimatedDays = user.joined
    ? Math.max(ageYears * 365, 1)
    : Math.min(user.statuses / 10, 3650);
  const tweetsPerDay = user.statuses / Math.max(estimatedDays, 1);
  const engagementRate = user.statuses >= 10 ? user.likes / user.statuses : user.likes / 100;
  // FF比: 対数スケールで区別できるよう上限撤廃（爆発はlogScaleで吸収）
  const ffRatio = user.following > 0
    ? user.followers / user.following
    : (user.followers > 0 ? 10 : 1);
  // 画像率: ツイート0は0（デフォルト値ボーナスを廃止）
  const mediaRatio = user.statuses > 0 ? Math.min(user.media_count / user.statuses, 1) : 0;

  const base = {
    // ATK: フォロワー（対数）
    atk: logScale(user.followers, 1_000_000),

    // DEF: メディア数（対数、参考値を5万に上げて高メディア数でも抑制）
    def: logScale(user.media_count, 50_000),

    // SPD: 1日ツイート数（対数）
    spd: logScale(tweetsPerDay, 100),

    // HP: アカウント年齢（√スケール）
    hp: Math.round(Math.sqrt(Math.min(ageYears, 20) / 20) * 999),

    // INT: エンゲージメント率（対数）+ FF比（参考値500、上限999）
    int: Math.min(logScale(engagementRate, 500) + logScale(ffRatio, 1_000), 999),

    // LUK: プロフィール充実度 + ベース値200（空プロフでも最低限出る）
    luk: 200 + Math.round(Math.min(
      (user.description ? 20 : 0)
      + (user.location ? 15 : 0)
      + (user.website ? 25 : 0)
      + (user.verified ? 30 : 0)
      + Math.min(ffRatio * 1.0, 20),
      110
    ) / 110 * 799),
  };

  const rarity = calcRarity(base, user.verified);
  // LRとURの倍率差を縮小
  const rarityBonus = { C: 0.9, N: 1, R: 1.15, SR: 1.4, SSR: 1.7, UR: 2.0, LR: 2.4 }[rarity];

  const card: TwitterCard = {
    id: user.id, username: user.screen_name, displayName: user.name,
    avatar: user.avatar, bio: user.description,
    followers: user.followers, following: user.following,
    tweets: user.statuses, likes: user.likes,
    mediaCount: user.media_count, joined: user.joined, verified: user.verified,
    rarity,
    element: ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)],
    atk: Math.round(base.atk * rarityBonus),
    def: Math.round(base.def * rarityBonus),
    spd: Math.round(base.spd * rarityBonus),
    hp:  Math.round(base.hp  * rarityBonus),
    int: Math.round(base.int * rarityBonus),
    luk: Math.round(base.luk * rarityBonus),
    pulledAt: Date.now(),
  };
  card.skill = getSkill(card);
  return card;
}

export const RARITY_STYLE: Record<Rarity, string> = {
  C:   "from-stone-400 to-stone-600 shadow-stone-500/40",
  N:   "from-gray-400 to-gray-600 shadow-gray-500/50",
  R:   "from-blue-400 to-blue-700 shadow-blue-500/60",
  SR:  "from-purple-400 to-purple-700 shadow-purple-500/60",
  SSR: "from-yellow-300 to-amber-600 shadow-yellow-400/70",
  UR:  "from-pink-400 via-purple-400 to-cyan-400 shadow-pink-400/80",
  LR:  "from-red-400 via-yellow-300 via-green-400 via-cyan-400 to-purple-500 shadow-white/60",
};

export const RARITY_LABEL: Record<Rarity, string> = {
  C: "C", N: "N", R: "R", SR: "SR", SSR: "SSR", UR: "UR", LR: "LR",
};
