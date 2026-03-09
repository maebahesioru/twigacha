import type { Element, Rarity, TwitterCard } from "@/types";
import { PASSIVE_SKILLS, getSkill } from "@/lib/skill";

export const ELEMENTS: Element[] = ["🔥", "💧", "🌿", "⚡", "✨", "🌑", "🌙", "❄️"];

export type Kyu = "C" | "N" | "R" | "SR" | "SSR" | "UR" | "LR";

export const KYU_CONFIG: Record<Kyu, { min: number; max: number; rarity: Rarity }> = {
  "C":   { min: 50,   max: 150,  rarity: "C"   },
  "N":   { min: 100,  max: 300,  rarity: "N"   },
  "R":   { min: 250,  max: 500,  rarity: "R"   },
  "SR":  { min: 450,  max: 800,  rarity: "SR"  },
  "SSR": { min: 700,  max: 1200, rarity: "SSR" },
  "UR":  { min: 1100, max: 1800, rarity: "UR"  },
  "LR":  { min: 1600, max: 2500, rarity: "LR"  },
};

export const TYPE_ADVANTAGE: Record<string, string> = {
  "🔥": "🌿", "🌿": "💧", "💧": "🔥",   // 自然3すくみ
  "✨": "🌑", "🌑": "🌙", "🌙": "✨",   // 神秘3すくみ
  "⚡": "💧", "❄️": "🌿",               // クロス補完
};

export { PASSIVE_SKILLS, getSkill } from "@/lib/skill";

export function applySkill(c: TwitterCard): TwitterCard {
  const skillName = c.skill ?? getSkill(c);
  if (!skillName) return c;
  const skill = PASSIVE_SKILLS[skillName];
  if (!skill) return c;
  const m = skill.effect.mult;
  const multiAll = ["バランス型", "伝説", "LR持ち", "超人", "完璧な均衡", "1111"];
  if (multiAll.includes(skillName))
    return { ...c, atk: Math.round(c.atk*m), def: Math.round(c.def*m), spd: Math.round(c.spd*m), hp: Math.round(c.hp*m), int: Math.round(c.int*m), luk: Math.round(c.luk*m) };
  if (skillName === "速攻型")
    return { ...c, atk: Math.round(c.atk*m), spd: Math.round(c.spd*m) };
  if (skillName === "不沈艦")
    return { ...c, def: Math.round(c.def*m), hp: Math.round(c.hp*m) };
  if (skillName === "謎のアカウント")
    return { ...c, atk: Math.round(c.atk*m), luk: Math.round(c.luk*m) };
  return { ...c, [skill.effect.stat]: Math.round(c[skill.effect.stat] * m) };
}

export function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateEnemy(kyu: Kyu): TwitterCard {
  const { min, max, rarity } = KYU_CONFIG[kyu];
  const names = ["Mystery User", "Rival", "Challenger", "Legend", "Unknown"];
  const ids = ["mystery_user", "rival_x", "challenger", "legend_acc", "unknown_one"];
  const idx = Math.floor(Math.random() * names.length);
  return {
    id: `enemy_${Date.now()}`,
    username: ids[idx],
    displayName: `${kyu}の${names[idx]}`,
    avatar: "", bio: "",
    followers: 0, following: 0, tweets: 0, likes: 0, mediaCount: 0,
    joined: "", verified: false,
    rarity,
    element: ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)],
    atk: randInt(min, max), def: randInt(min, max), spd: randInt(min, max),
    hp: randInt(min, max), int: randInt(min, max), luk: randInt(min, max),
    pulledAt: Date.now(),
  };
}

export function calcDamage(atk: number, def: number, int: number, luk: number, atkEl: string, defEl: string) {
  const isCrit = Math.random() < Math.min(luk / 5000, 0.2);
  const isStrong = TYPE_ADVANTAGE[atkEl] === defEl;
  const isWeak = TYPE_ADVANTAGE[defEl] === atkEl;
  const typeMult = isStrong ? 1.5 : isWeak ? 0.75 : 1;
  const base = Math.max(1, Math.round(atk * (100 / (100 + def)) * (0.8 + Math.random() * 0.4) * (1 + int / 3000) * typeMult));
  return { dmg: isCrit ? Math.round(base * 1.5) : base, isCrit, isType: isStrong, isWeak };
}

export function simulateBattle(p: TwitterCard, e: TwitterCard) {
  p = applySkill(p);
  e = applySkill(e);
  const log: string[] = [];
  const hpSnaps: { pHp: number; eHp: number }[] = [];
  let pHp = p.hp, eHp = e.hp, turn = 1;
  const pFirst = p.spd >= e.spd;
  while (pHp > 0 && eHp > 0 && turn <= 50) {
    const [first, second] = pFirst ? [p, e] : [e, p];
    const { dmg: dmg1, isCrit: crit1, isType: type1, isWeak: weak1 } = calcDamage(first.atk, second.def, first.int, first.luk, first.element, second.element);
    if (pFirst) eHp -= dmg1; else pHp -= dmg1;
    log.push(`Turn ${turn}: ${first.element}@${first.username} → ${dmg1} ダメージ${crit1 ? " 💥クリティカル！" : ""}${type1 ? " 🔺効果抜群！" : ""}${weak1 ? " 🔻いまひとつ…" : ""}`);
    hpSnaps.push({ pHp: Math.max(0, pHp), eHp: Math.max(0, eHp) });
    if (pHp <= 0 || eHp <= 0) break;
    const { dmg: dmg2, isCrit: crit2, isType: type2, isWeak: weak2 } = calcDamage(second.atk, first.def, second.int, second.luk, second.element, first.element);
    if (pFirst) pHp -= dmg2; else eHp -= dmg2;
    log.push(`Turn ${turn}: ${second.element}@${second.username} → ${dmg2} ダメージ${crit2 ? " 💥クリティカル！" : ""}${type2 ? " 🔺効果抜群！" : ""}${weak2 ? " 🔻いまひとつ…" : ""}`);
    hpSnaps.push({ pHp: Math.max(0, pHp), eHp: Math.max(0, eHp) });
    turn++;
  }
  const winner = pHp > 0 ? "player" : "enemy";
  const ko = pHp <= 0 || eHp <= 0;
  log.push(winner === "player" ? `🏆 @${p.username} の勝利！` : `💀 @${e.username} の勝利！`);
  hpSnaps.push({ pHp: Math.max(0, pHp), eHp: Math.max(0, eHp) });
  return { log, hpSnaps, winner, pHp: Math.max(0, pHp), eHp: Math.max(0, eHp), turns: turn - 1, ko };
}

export function simulateTeamBattle(hostTeam: TwitterCard[], guestTeam: TwitterCard[]) {
  const n = Math.min(hostTeam.length, guestTeam.length, 5);
  let wins = 0, losses = 0;
  const rounds = [];
  for (let i = 0; i < n; i++) {
    const r = simulateBattle(hostTeam[i], guestTeam[i]);
    if (r.winner === "player") wins++; else losses++;
    rounds.push({ winner: r.winner, pHp: r.pHp, eHp: r.eHp, turns: r.turns, ko: r.ko, log: r.log, hpSnaps: r.hpSnaps });
  }
  const result: "win" | "lose" | "draw" = wins > losses ? "win" : wins < losses ? "lose" : "draw";
  return { wins, losses, result, rounds };
}
