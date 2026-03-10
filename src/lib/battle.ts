import type { Element, Rarity, TwitterCard } from "@/types";
import { PASSIVE_SKILLS, getSkill } from "@/lib/skill";

export const ELEMENTS: Element[] = ["🔥", "💧", "🌿", "⚡", "✨", "🌑", "🌙", "❄️"];

/** 今日の天気属性（日付ハッシュで毎日変わる） */
export function getTodayWeather(): Element {
  const d = new Date();
  const key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  return ELEMENTS[key % ELEMENTS.length];
}
/** 天気ボーナス倍率（その属性のATK+20%） */
export const WEATHER_BONUS = 1.2;

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

function getUltimateEffectLocal(text: string, rank: number): string {
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

export function calcDamage(atk: number, def: number, int: number, luk: number, atkEl: string, defEl: string) {
  const isCrit = Math.random() < Math.min(luk / 5000, 0.2);
  const isStrong = TYPE_ADVANTAGE[atkEl] === defEl;
  const isWeak = TYPE_ADVANTAGE[defEl] === atkEl;
  const typeMult = isStrong ? 1.5 : isWeak ? 0.75 : 1;
  const base = Math.max(1, Math.round(atk * (100 / (100 + def)) * (0.8 + Math.random() * 0.4) * (1 + int / 3000) * typeMult));
  return { dmg: isCrit ? Math.round(base * 1.5) : base, isCrit, isType: isStrong, isWeak };
}

const MSG = {
  ja: {
    dmg: "ダメージ", crit: "💥クリティカル！", typeGood: "🔺効果抜群！", typeWeak: "🔻いまひとつ…",
    poison: (u: string, d: number) => `☠️ ${u} 毒ダメージ ${d}！`,
    regen: (u: string, h: number) => `🌿 ${u} 再生 HP+${h}！`,
    confused: (u: string) => `🌀 ${u} は混乱して攻撃できない！`,
    frozen: (u: string) => `❄️ ${u} は凍結して動けない！`,
    charge: (u: string) => `⚡ ${u} チャージ発動！`,
    counter: (u: string, d: number) => `🔄 ${u} がカウンター！ ${d} ダメージ反射！`,
    silence: (u: string) => `🔇 ${u} は沈黙中で必殺技が使えない！`,
    win: (u: string) => `🏆 @${u} の勝利！`,
    lose: (u: string) => `💀 @${u} の勝利！`,
    ult: (text: string, label: string, dmg: number, heal: number) => `⚡必殺「${text}」${label}${dmg > 0 ? ` → ${dmg} ダメージ` : ""}${heal > 0 ? ` HP+${heal}` : ""}！`,
    effects: { damage:"💥大ダメージ", shield:"🛡防御強化", heal:"❤️HP回復", confuse:"🌀混乱", boost:"✨全ステUP", crit:"🎯必中クリティカル", poison:"☠️毒", drain:"🩸吸収", pierce:"🗡貫通", multi:"🎲2回攻撃", freeze:"❄️凍結", debuff:"📉デバフ", regen:"🌿再生", counter:"🔄カウンター", nuke:"💣自爆", silence:"🔇沈黙", charge:"⚡チャージ", random:"🎰ランダム" },
  },
  en: {
    dmg: "damage", crit: "💥Critical!", typeGood: "🔺Super effective!", typeWeak: "🔻Not very effective...",
    poison: (u: string, d: number) => `☠️ ${u} poison damage ${d}!`,
    regen: (u: string, h: number) => `🌿 ${u} regen HP+${h}!`,
    confused: (u: string) => `🌀 ${u} is confused and can't attack!`,
    frozen: (u: string) => `❄️ ${u} is frozen and can't move!`,
    charge: (u: string) => `⚡ ${u} charge activated!`,
    counter: (u: string, d: number) => `🔄 ${u} counters! ${d} damage reflected!`,
    silence: (u: string) => `🔇 ${u} is silenced and can't use ultimates!`,
    win: (u: string) => `🏆 @${u} wins!`,
    lose: (u: string) => `💀 @${u} wins!`,
    ult: (text: string, label: string, dmg: number, heal: number) => `⚡Ultimate「${text}」${label}${dmg > 0 ? ` → ${dmg} damage` : ""}${heal > 0 ? ` HP+${heal}` : ""}!`,
    effects: { damage:"💥Big damage", shield:"🛡Defense up", heal:"❤️HP heal", confuse:"🌀Confuse", boost:"✨All stats UP", crit:"🎯Sure crit", poison:"☠️Poison", drain:"🩸Drain", pierce:"🗡Pierce", multi:"🎲Double hit", freeze:"❄️Freeze", debuff:"📉Debuff", regen:"🌿Regen", counter:"🔄Counter", nuke:"💣Nuke", silence:"🔇Silence", charge:"⚡Charge", random:"🎰Random" },
  },
};

export function simulateBattle(p: TwitterCard, e: TwitterCard, lang: "ja" | "en" = "ja") {
  const m = MSG[lang];
  // ultimatesがない場合はbio/usernameから生成
  const ensureUlts = (card: TwitterCard) => {
    if (card.ultimates?.length) return card;
    const src = card.bio || card.username;
    const chunks = [src.slice(0, 30), src.slice(10, 40), src.slice(20, 50)].filter(s => s.length > 3);
    const texts = chunks.length ? chunks : [card.username.slice(0, 20)];
    return { ...card, ultimates: texts.map((text, i) => ({ text, score: card.atk * (3 - i) * 100, effect: getUltimateEffectLocal(text, i) })) };
  };
  p = ensureUlts(p);
  e = ensureUlts(e);
  p = applySkill(p);
  e = applySkill(e);
  // 天気ボーナス
  const weather = getTodayWeather();
  if (p.element === weather) p = { ...p, atk: Math.round(p.atk * WEATHER_BONUS) };
  if (e.element === weather) e = { ...e, atk: Math.round(e.atk * WEATHER_BONUS) };
  const log: string[] = [];
  const hpSnaps: { pHp: number; eHp: number }[] = [];
  let pHp = p.hp, eHp = e.hp, turn = 1;
  const pFirst = p.spd >= e.spd;
  let pShield = false, eShield = false, pConfused = false, eConfused = false, pPoison = 0, ePoison = 0;
  let pFreeze = 0, eFreeze = 0, pRegen = 0, eRegen = 0, pCounter = false, eCounter = false;
  let pDebuff = false, eDebuff = false, pSilence = 0, eSilence = 0, pCharge = false, eCharge = false;
  const SIMPLE_EFFECTS = ["damage","shield","heal","confuse","boost","crit","multi","poison","drain","pierce","freeze","debuff","regen","counter","nuke","silence","charge"];
  const EFFECT_LABEL = m.effects;
  const tryUltimate = (attacker: TwitterCard, isPlayer: boolean): { dmg: number; heal: number; text: string; effect: string } | null => {
    if (!attacker.ultimates?.length || Math.random() > 0.25) return null;
    if (isPlayer ? pSilence > 0 : eSilence > 0) { if (isPlayer) pSilence--; else eSilence--; log.push(`Turn ${turn}: ${m.silence(attacker.username)}`); return null; }
    const u = attacker.ultimates[Math.floor(Math.random() * attacker.ultimates.length)];
    const mult = Math.min(1.5, 1 + u.score / 100000);
    let effect = u.effect ?? "damage";
    if (effect === "random") effect = SIMPLE_EFFECTS[Math.floor(Math.random() * SIMPLE_EFFECTS.length)];
    const baseDmg = Math.round(attacker.atk * mult);
    const dmg = effect === "damage" ? baseDmg
      : effect === "crit" ? Math.round(attacker.atk * 1.5)
      : effect === "confuse" ? Math.round(attacker.atk * 0.5)
      : effect === "boost" ? Math.round(attacker.atk * 1.2)
      : effect === "drain" ? Math.round(attacker.atk * 0.8)
      : effect === "pierce" ? Math.round(attacker.atk * 1.0)
      : effect === "multi" ? Math.round(attacker.atk * 0.6) * 2
      : effect === "freeze" ? Math.round(attacker.atk * 0.3)
      : effect === "debuff" ? Math.round(attacker.atk * 0.4)
      : effect === "nuke" ? Math.round(attacker.atk * 1.0)
      : 0;
    const heal = effect === "heal" ? Math.round(attacker.atk * 0.5) : effect === "drain" ? Math.round(attacker.atk * 0.4) : 0;
    if (effect === "shield") { if (isPlayer) pShield = true; else eShield = true; }
    if (effect === "confuse") { if (isPlayer) eConfused = true; else pConfused = true; }
    if (effect === "boost") { attacker.atk = Math.round(attacker.atk * 1.2); attacker.def = Math.round(attacker.def * 1.2); }
    if (effect === "poison") { if (isPlayer) ePoison = 3; else pPoison = 3; }
    if (effect === "freeze") { if (isPlayer) eFreeze = 2; else pFreeze = 2; }
    if (effect === "debuff") { if (isPlayer) eDebuff = true; else pDebuff = true; }
    if (effect === "regen") { if (isPlayer) pRegen = 3; else eRegen = 3; }
    if (effect === "counter") { if (isPlayer) pCounter = true; else eCounter = true; }
    if (effect === "silence") { if (isPlayer) eSilence = 2; else pSilence = 2; }
    if (effect === "charge") { if (isPlayer) pCharge = true; else eCharge = true; }
    if (effect === "nuke") { if (isPlayer) pHp -= dmg; else eHp -= dmg; } // 自分もダメージ
    return { dmg, heal, text: u.text, effect };
  };
  const applyUlt = (ult: { dmg: number; heal: number; text: string; effect: string }, isAttackerPlayer: boolean) => {
    const pierce = ult.effect === "pierce";
    const shielded = !pierce && (isAttackerPlayer ? eShield : pShield);
    const actualDmg = shielded ? Math.round(ult.dmg * 0.5) : ult.dmg;
    if (isAttackerPlayer) { eHp -= actualDmg; pHp += ult.heal; if (!pierce) eShield = false; }
    else { pHp -= actualDmg; eHp += ult.heal; if (!pierce) pShield = false; }
    log.push(`Turn ${turn}: ${m.ult(ult.text, (EFFECT_LABEL as Record<string, string>)[ult.effect] ?? "💥", actualDmg, ult.heal)}`);
  };
  while (pHp > 0 && eHp > 0 && turn <= 50) {
    // 毒ティック
    if (pPoison > 0) { const dmg = Math.round(p.atk * 0.15); pHp -= dmg; pPoison--; log.push(`Turn ${turn}: ${m.poison(p.username, dmg)}`); }
    if (ePoison > 0) { const dmg = Math.round(e.atk * 0.15); eHp -= dmg; ePoison--; log.push(`Turn ${turn}: ${m.poison(e.username, dmg)}`); }
    // 再生ティック
    if (pRegen > 0) { const h = Math.round(p.atk * 0.1); pHp += h; pRegen--; log.push(`Turn ${turn}: ${m.regen(p.username, h)}`); }
    if (eRegen > 0) { const h = Math.round(e.atk * 0.1); eHp += h; eRegen--; log.push(`Turn ${turn}: ${m.regen(e.username, h)}`); }
    if (pHp <= 0 || eHp <= 0) break;
    const [first, second] = pFirst ? [p, e] : [e, p];
    const ult1 = tryUltimate(first, pFirst);
    if (ult1) {
      applyUlt(ult1, pFirst);
    } else {
      const firstFrozen = pFirst ? pFreeze > 0 : eFreeze > 0;
      if (pFirst ? pConfused : eConfused) {
        log.push(`Turn ${turn}: ${m.confused(first.username)}`);
        if (pFirst) pConfused = false; else eConfused = false;
      } else if (firstFrozen) {
        log.push(`Turn ${turn}: ${m.frozen(first.username)}`);
        if (pFirst) pFreeze--; else eFreeze--;
      } else {
        const atkMod = ((pFirst ? pDebuff : eDebuff) ? 0.8 : 1) * ((pFirst ? pCharge : eCharge) ? 2 : 1);
        if (pFirst ? pCharge : eCharge) { if (pFirst) pCharge = false; else eCharge = false; log.push(`Turn ${turn}: ${m.charge(first.username)}`); }
        const { dmg: dmg1, isCrit: crit1, isType: type1, isWeak: weak1 } = calcDamage(Math.round(first.atk * atkMod), second.def, first.int, first.luk, first.element, second.element);
        if (pFirst ? eDebuff : pDebuff) { if (pFirst) eDebuff = false; else pDebuff = false; }
        const shielded = pFirst ? eShield : pShield;
        // カウンター判定
        const countered = pFirst ? eCounter : pCounter;
        if (countered) {
          pHp -= dmg1; if (pFirst) eCounter = false; else pCounter = false;
          log.push(`Turn ${turn}: ${m.counter(second.username, dmg1)}`);
        } else {
          const actualDmg1 = shielded ? Math.round(dmg1 * 0.5) : dmg1;
          if (pFirst) { eHp -= actualDmg1; eShield = false; } else { pHp -= actualDmg1; pShield = false; }
          log.push(`Turn ${turn}: ${first.element}@${first.username} → ${actualDmg1} ${m.dmg}${crit1 ? " "+m.crit : ""}${type1 ? " "+m.typeGood : ""}${weak1 ? " "+m.typeWeak : ""}`);
        }
      }
    }
    hpSnaps.push({ pHp: Math.max(0, pHp), eHp: Math.max(0, eHp) });
    if (pHp <= 0 || eHp <= 0) break;
    const ult2 = tryUltimate(second, !pFirst);
    if (ult2) {
      applyUlt(ult2, !pFirst);
    } else {
      const secondFrozen = pFirst ? eFreeze > 0 : pFreeze > 0;
      if (pFirst ? eConfused : pConfused) {
        log.push(`Turn ${turn}: ${m.confused(second.username)}`);
        if (pFirst) eConfused = false; else pConfused = false;
      } else if (secondFrozen) {
        log.push(`Turn ${turn}: ${m.frozen(second.username)}`);
        if (pFirst) eFreeze--; else pFreeze--;
      } else {
        const atkMod = ((pFirst ? eDebuff : pDebuff) ? 0.8 : 1) * ((pFirst ? eCharge : pCharge) ? 2 : 1);
        if (pFirst ? eCharge : pCharge) { if (pFirst) eCharge = false; else pCharge = false; log.push(`Turn ${turn}: ${m.charge(second.username)}`); }
        const { dmg: dmg2, isCrit: crit2, isType: type2, isWeak: weak2 } = calcDamage(Math.round(second.atk * atkMod), first.def, second.int, second.luk, second.element, first.element);
        if (pFirst ? eDebuff : pDebuff) { if (pFirst) eDebuff = false; else pDebuff = false; }
        const shielded = pFirst ? pShield : eShield;
        const countered = pFirst ? pCounter : eCounter;
        if (countered) {
          eHp -= dmg2; if (pFirst) pCounter = false; else eCounter = false;
          log.push(`Turn ${turn}: ${m.counter(first.username, dmg2)}`);
        } else {
          const actualDmg2 = shielded ? Math.round(dmg2 * 0.5) : dmg2;
          if (pFirst) { pHp -= actualDmg2; pShield = false; } else { eHp -= actualDmg2; eShield = false; }
          log.push(`Turn ${turn}: ${second.element}@${second.username} → ${actualDmg2} ${m.dmg}${crit2 ? " "+m.crit : ""}${type2 ? " "+m.typeGood : ""}${weak2 ? " "+m.typeWeak : ""}`);
        }
      }
    }
    hpSnaps.push({ pHp: Math.max(0, pHp), eHp: Math.max(0, eHp) });
    turn++;
  }
  const winner = pHp > 0 ? "player" : "enemy";
  const ko = pHp <= 0 || eHp <= 0;
  log.push(winner === "player" ? m.win(p.username) : m.lose(e.username));
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
