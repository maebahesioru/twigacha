import type { TwitterCard } from "@/types";

type SkillEffect = { stat: 'atk' | 'def' | 'spd' | 'hp' | 'int' | 'luk'; mult: number };

export const PASSIVE_SKILLS: Record<string, { cond: (c: TwitterCard) => boolean; effect: SkillEffect; desc: string }> = {
  // 超レア
  "伝説":              { cond: c => c.followers > 10_000_000,                     effect: { stat: 'atk', mult: 1.2  }, desc: "全ステ+20%" },
  "新星":              { cond: c => { const d = (Date.now() - new Date(c.joined).getTime()) / 86400000; return d <= 30 && c.joined !== ""; }, effect: { stat: 'atk', mult: 1.4 }, desc: "ATK+40%" },
  "超インフルエンサー": { cond: c => c.followers > 1_000_000,                    effect: { stat: 'atk', mult: 1.3  }, desc: "ATK+30%" },
  "廃人":              { cond: c => c.spd > 1000,                                effect: { stat: 'spd', mult: 1.35 }, desc: "SPD+35%" },
  // 複合条件
  "バランス型":        { cond: c => Math.min(c.atk,c.def,c.spd,c.hp,c.int,c.luk) >= 500, effect: { stat: 'atk', mult: 1.1 }, desc: "全ステ+10%" },
  "ガラスキャノン":    { cond: c => c.atk > 900 && c.hp < 300,                   effect: { stat: 'atk', mult: 1.25 }, desc: "ATK+25%" },
  "鉄壁":              { cond: c => c.def > 900 && c.atk < 300,                   effect: { stat: 'def', mult: 1.3  }, desc: "DEF+30%" },
  "速攻型":            { cond: c => c.atk > 700 && c.spd > 700,                   effect: { stat: 'atk', mult: 1.1  }, desc: "ATK・SPD+10%" },
  "魔法使い":          { cond: c => c.int > 700 && c.luk > 700,                   effect: { stat: 'int', mult: 1.15 }, desc: "INT+15%" },
  "不沈艦":            { cond: c => c.def > 700 && c.hp > 700,                    effect: { stat: 'def', mult: 1.1  }, desc: "DEF・HP+10%" },
  // FF比系
  "カリスマ":          { cond: c => c.following > 0 && c.followers / c.following > 10, effect: { stat: 'luk', mult: 1.2 }, desc: "LUK+20%" },
  "相互フォロー":      { cond: c => c.following > 0 && c.followers / c.following >= 0.8 && c.followers / c.following <= 1.2, effect: { stat: 'int', mult: 1.15 }, desc: "INT+15%" },
  "フォロワー乞食":    { cond: c => c.followers > 0 && c.following > c.followers * 2, effect: { stat: 'spd', mult: 1.15 }, desc: "SPD+15%" },
  // 面白系
  "謎の人物":          { cond: c => !c.bio || c.bio.trim() === "",                 effect: { stat: 'luk', mult: 1.3  }, desc: "LUK+30%" },
  "無言フォロワー":    { cond: c => c.tweets < 10,                                 effect: { stat: 'def', mult: 1.2  }, desc: "DEF+20%" },
  "ツイ廃":            { cond: c => c.tweets > 10000,                              effect: { stat: 'spd', mult: 1.25 }, desc: "SPD+25%" },
  // 属性連動
  "炎の加護":          { cond: c => c.element === "🔥",                           effect: { stat: 'atk', mult: 1.1  }, desc: "ATK+10%" },
  "水の加護":          { cond: c => c.element === "💧",                           effect: { stat: 'def', mult: 1.1  }, desc: "DEF+10%" },
  "草の加護":          { cond: c => c.element === "🌿",                           effect: { stat: 'hp',  mult: 1.1  }, desc: "HP+10%"  },
  "雷の加護":          { cond: c => c.element === "⚡",                           effect: { stat: 'spd', mult: 1.1  }, desc: "SPD+10%" },
  "光の加護":          { cond: c => c.element === "✨",                           effect: { stat: 'luk', mult: 1.1  }, desc: "LUK+10%" },
  "闇の加護":          { cond: c => c.element === "🌑",                           effect: { stat: 'int', mult: 1.1  }, desc: "INT+10%" },
  "月の加護":          { cond: c => c.element === "🌙",                           effect: { stat: 'luk', mult: 1.1  }, desc: "LUK+10%" },
  "氷の加護":          { cond: c => c.element === "❄️",                           effect: { stat: 'def', mult: 1.1  }, desc: "DEF+10%" },
  // アカウント年齢
  "古参":              { cond: c => { const y = new Date().getFullYear() - new Date(c.joined).getFullYear(); return y >= 5 && c.joined !== ""; }, effect: { stat: 'hp', mult: 1.25 }, desc: "HP+25%" },
  "新参者":            { cond: c => { const y = new Date().getFullYear() - new Date(c.joined).getFullYear(); return y <= 1 && c.joined !== ""; }, effect: { stat: 'spd', mult: 1.2 }, desc: "SPD+20%" },
  // 通常
  "インフルエンサー":  { cond: c => c.followers > 10000,                          effect: { stat: 'atk', mult: 1.15 }, desc: "ATK+15%" },
  "多投稿":            { cond: c => c.spd > 500,                                  effect: { stat: 'spd', mult: 1.2  }, desc: "SPD+20%" },
  "堅守":              { cond: c => c.def > 800,                                  effect: { stat: 'def', mult: 1.15 }, desc: "DEF+15%" },
  "長寿アカ":          { cond: c => c.hp > 700,                                   effect: { stat: 'hp',  mult: 1.2  }, desc: "HP+20%"  },
  "幸運児":            { cond: c => c.luk > 700,                                  effect: { stat: 'luk', mult: 1.25 }, desc: "LUK+25%" },
  "知将":              { cond: c => c.int > 700,                                  effect: { stat: 'int', mult: 1.2  }, desc: "INT+20%" },
  // フォロワー段階
  "一般人":            { cond: c => c.followers < 100,                            effect: { stat: 'luk', mult: 1.2  }, desc: "LUK+20%" },
  "マイクロインフル":  { cond: c => c.followers >= 1000 && c.followers < 10000,   effect: { stat: 'atk', mult: 1.1  }, desc: "ATK+10%" },
  // ツイート段階
  "無口":              { cond: c => c.tweets > 0 && c.tweets < 100,               effect: { stat: 'def', mult: 1.15 }, desc: "DEF+15%" },
  "雄弁家":            { cond: c => c.tweets >= 5000 && c.tweets < 10000,         effect: { stat: 'int', mult: 1.15 }, desc: "INT+15%" },
  // いいね系
  "いいね魔":          { cond: c => c.tweets > 0 && c.likes > c.tweets * 10,      effect: { stat: 'luk', mult: 1.2  }, desc: "LUK+20%" },
  "無感情":            { cond: c => c.likes === 0,                                effect: { stat: 'def', mult: 1.25 }, desc: "DEF+25%" },
  // フォロー系
  "孤高":              { cond: c => c.following < 10,                             effect: { stat: 'atk', mult: 1.2  }, desc: "ATK+20%" },
  "社交家":            { cond: c => c.following > 1000,                           effect: { stat: 'int', mult: 1.1  }, desc: "INT+10%" },
  // ステータス極端系
  "紙装甲":            { cond: c => c.hp < 100,                                   effect: { stat: 'spd', mult: 1.3  }, desc: "SPD+30%" },
  "鈍足巨人":          { cond: c => c.spd < 100,                                  effect: { stat: 'hp',  mult: 1.3  }, desc: "HP+30%"  },
  "運頼み":            { cond: c => c.luk > 900,                                  effect: { stat: 'luk', mult: 1.4  }, desc: "LUK+40%" },
  // レアリティ連動
  "C使い":             { cond: c => c.rarity === "C",                             effect: { stat: 'luk', mult: 1.5  }, desc: "LUK+50%" },
  "LR持ち":            { cond: c => c.rarity === "LR",                            effect: { stat: 'atk', mult: 1.05 }, desc: "全ステ+5%" },
  // mediaCount系
  "写真家":            { cond: c => c.mediaCount > 1000,                          effect: { stat: 'def', mult: 1.15 }, desc: "DEF+15%" },
  "テキスト派":        { cond: c => c.mediaCount === 0,                           effect: { stat: 'int', mult: 1.2  }, desc: "INT+20%" },
  // joined不明
  "謎のアカウント":    { cond: c => !c.joined || c.joined === "",                  effect: { stat: 'luk', mult: 1.15 }, desc: "ATK・LUK+15%" },
  // ステータス合計系
  "超人":              { cond: c => c.atk+c.def+c.spd+c.hp+c.int+c.luk > 4000,   effect: { stat: 'atk', mult: 1.05 }, desc: "全ステ+5%" },
  "凡人":              { cond: c => c.atk+c.def+c.spd+c.hp+c.int+c.luk < 1000,   effect: { stat: 'luk', mult: 1.35 }, desc: "LUK+35%" },
  // フォロワー/ツイート比
  "バズり屋":          { cond: c => c.tweets > 0 && c.followers / c.tweets > 100, effect: { stat: 'atk', mult: 1.2  }, desc: "ATK+20%" },
  "地道な努力":        { cond: c => c.tweets > 0 && c.followers / c.tweets < 1,   effect: { stat: 'int', mult: 1.2  }, desc: "INT+20%" },
  // 時間帯・曜日系
  "深夜勢":            { cond: c => { const h = new Date(c.pulledAt).getHours(); return h >= 0 && h < 5; }, effect: { stat: 'luk', mult: 1.25 }, desc: "LUK+25%" },
  "週末戦士":          { cond: c => { const d = new Date(c.pulledAt).getDay(); return d === 0 || d === 6; }, effect: { stat: 'atk', mult: 1.15 }, desc: "ATK+15%" },
  // ユーザー名系
  "数字ユーザー":      { cond: c => (c.username.match(/\d/g) ?? []).length >= 4,   effect: { stat: 'def', mult: 1.15 }, desc: "DEF+15%" },
  "長名":              { cond: c => c.username.length >= 15,                       effect: { stat: 'int', mult: 1.1  }, desc: "INT+10%" },
  "短名":              { cond: c => c.username.length <= 4,                        effect: { stat: 'atk', mult: 1.15 }, desc: "ATK+15%" },
  // bio長さ系
  "饒舌":              { cond: c => c.bio.length >= 100,                           effect: { stat: 'int', mult: 1.15 }, desc: "INT+15%" },
  "一言":              { cond: c => c.bio.length >= 1 && c.bio.length <= 20,       effect: { stat: 'luk', mult: 1.15 }, desc: "LUK+15%" },
  // following系
  "完全孤立":          { cond: c => c.following === 0,                             effect: { stat: 'atk', mult: 1.25 }, desc: "ATK+25%" },
  "完璧な均衡":        { cond: c => c.following > 0 && Math.abs(c.followers - c.following) / Math.max(c.followers, c.following) <= 0.05, effect: { stat: 'atk', mult: 1.08 }, desc: "全ステ+8%" },
  // 属性×ステータス複合
  "炎の剣士":          { cond: c => c.element === "🔥" && c.atk > 800,            effect: { stat: 'atk', mult: 1.2  }, desc: "ATK+20%" },
  "氷の守護者":        { cond: c => c.element === "❄️" && c.def > 800,            effect: { stat: 'def', mult: 1.2  }, desc: "DEF+20%" },
  "雷の疾風":          { cond: c => c.element === "⚡" && c.spd > 800,            effect: { stat: 'spd', mult: 1.2  }, desc: "SPD+20%" },
  // レアリティ×ステータス
  "SSR覚醒":           { cond: c => c.rarity === "SSR" && c.atk+c.def+c.spd+c.hp+c.int+c.luk > 3000, effect: { stat: 'atk', mult: 1.15 }, desc: "ATK+15%" },
  "UR解放":            { cond: c => c.rarity === "UR" && c.luk > 600,             effect: { stat: 'luk', mult: 1.2  }, desc: "LUK+20%" },
  // ユーザー名文字種
  "アンダースコア":    { cond: c => c.username.includes('_'),                      effect: { stat: 'def', mult: 1.1  }, desc: "DEF+10%" },
  // ステータス=0系
  "無ATK":             { cond: c => c.atk < 10,                                   effect: { stat: 'def', mult: 1.4  }, desc: "DEF+40%" },
  "無DEF":             { cond: c => c.def < 10,                                   effect: { stat: 'atk', mult: 1.4  }, desc: "ATK+40%" },
  // キリ番
  "キリ番":            { cond: c => c.followers > 0 && c.followers % 1000 === 0,  effect: { stat: 'luk', mult: 1.3  }, desc: "LUK+30%" },
  // 語呂合わせ
  "777":               { cond: c => c.luk === 777,                                effect: { stat: 'luk', mult: 1.77 }, desc: "LUK+77%" },
  "1111":              { cond: c => c.followers === 1111,                          effect: { stat: 'atk', mult: 1.11 }, desc: "全ステ+11%" },
};

export function getSkill(c: TwitterCard): string | null {
  const matched = Object.entries(PASSIVE_SKILLS).filter(([, s]) => s.cond(c)).map(([k]) => k);
  if (!matched.length) return null;
  return matched[Math.floor(Math.random() * matched.length)];
}
