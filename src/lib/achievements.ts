import type { TwitterCard } from "@/types";

export interface Achievement {
  id: string;
  emoji: string;
  name: { ja: string; en: string };
  desc: { ja: string; en: string };
  hidden?: boolean;
  check: (state: AchievementState) => boolean;
}

export interface AchievementState {
  collection: TwitterCard[];
  totalPackCount: number;
  lastPackCards: TwitterCard[];
  cardPullCounts: Record<string, number>;
  raidClearCount: number;
  achievements: string[];
  battleWins: number;
  battleLosses: number;
  teamBattleHistory: { result: 'win'|'lose'|'draw'; kyu?: string }[];
  battleHistory: { winner: 'player'|'enemy'; kyu: string; turns?: number; pHp?: number; ko?: boolean }[];
  favorites: string[];
}

const maxStreak = (history: { winner: string }[]) => {
  let max = 0, cur = 0;
  for (const h of history) { cur = h.winner === 'player' ? cur + 1 : 0; max = Math.max(max, cur); }
  return max;
};

export const ACHIEVEMENTS: Achievement[] = [
  // ガチャ回数
  { id: "beginner",   emoji: "🐣", name: { ja: "ビギナーズラック", en: "Beginner's Luck" },   desc: { ja: "初めてガチャを回した",        en: "Drew gacha for the first time" },        check: s => s.totalPackCount >= 1 },
  { id: "addict10",   emoji: "💊", name: { ja: "ガチャ中毒",       en: "Gacha Addict" },       desc: { ja: "ガチャを10回回した",          en: "Drew gacha 10 times" },                  check: s => s.totalPackCount >= 10 },
  { id: "daily100",   emoji: "📅", name: { ja: "日課",             en: "Daily Routine" },      desc: { ja: "ガチャを100回回した",         en: "Drew gacha 100 times" },                 check: s => s.totalPackCount >= 100 },
  { id: "whale1000",  emoji: "🐋", name: { ja: "廃課金勢",         en: "Whale" },              desc: { ja: "ガチャを1,000回回した",       en: "Drew gacha 1,000 times" },               check: s => s.totalPackCount >= 1000 },
  { id: "whale10000", emoji: "🐲", name: { ja: "課金中毒",         en: "Mega Whale" },         desc: { ja: "ガチャを10,000回回した",      en: "Drew gacha 10,000 times" },              check: s => s.totalPackCount >= 10000 },
  { id: "pity",       emoji: "🎯", name: { ja: "天井到達",         en: "Pity Triggered" },     desc: { ja: "天井システムを発動させた",    en: "Triggered the pity system" },            check: s => s.totalPackCount >= 10 },

  // コレクション数
  { id: "collector50",  emoji: "📂", name: { ja: "コレクター",       en: "Collector" },          desc: { ja: "50種類のカードを集めた",    en: "Collected 50 cards" },    check: s => s.collection.length >= 50 },
  { id: "museum500",    emoji: "🏛️", name: { ja: "博物館の館長",     en: "Museum Curator" },     desc: { ja: "500種類のカードを集めた",   en: "Collected 500 cards" },   check: s => s.collection.length >= 500 },
  { id: "museum1000",   emoji: "🗺️", name: { ja: "大図書館",         en: "Grand Library" },      desc: { ja: "1000種類のカードを集めた",  en: "Collected 1,000 cards" }, check: s => s.collection.length >= 1000 },
  { id: "museum2000",   emoji: "🌐", name: { ja: "世界遺産",         en: "World Heritage" },     desc: { ja: "2000種類のカードを集めた",  en: "Collected 2,000 cards" }, check: s => s.collection.length >= 2000 },
  { id: "world5000",    emoji: "🌍", name: { ja: "世界有数の蒐集家", en: "World Collector" },    desc: { ja: "5,000種類のカードを集めた", en: "Collected 5,000 cards" }, check: s => s.collection.length >= 5000 },
  { id: "common1000",   emoji: "🧹", name: { ja: "塵も積もれば",     en: "Dust Collector" },     desc: { ja: "C(コモン)カードを1,000枚集めた", en: "Collected 1,000 Common cards" }, check: s => s.collection.filter(c => c.rarity === "C").length >= 1000 },

  // レアリティ初取得
  { id: "first_sr",  emoji: "✨", name: { ja: "光るもの",     en: "Shiny" },          desc: { ja: "初めてSRを獲得した",  en: "Got your first SR" },  check: s => s.collection.some(c => c.rarity === "SR") },
  { id: "first_ssr", emoji: "🌟", name: { ja: "赤の輝き",     en: "Red Glow" },       desc: { ja: "初めてSSRを獲得した", en: "Got your first SSR" }, check: s => s.collection.some(c => c.rarity === "SSR") },
  { id: "first_ur",  emoji: "💎", name: { ja: "強運の持ち主", en: "Lucky One" },      desc: { ja: "初めてURを獲得した",  en: "Got your first UR" },  check: s => s.collection.some(c => c.rarity === "UR") },
  { id: "first_lr",  emoji: "👑", name: { ja: "生ける伝説",   en: "Living Legend" },  desc: { ja: "初めてLRを獲得した",  en: "Got your first LR" },  check: s => s.collection.some(c => c.rarity === "LR") },

  // パック結果
  { id: "all_common", emoji: "🧟", name: { ja: "物欲センサー",         en: "Bad Luck" },           desc: { ja: "1回のガチャで全てC(コモン)だった",           en: "All 5 cards were Common" },              check: s => s.lastPackCards.length === 5 && s.lastPackCards.every(c => c.rarity === "C") },
  { id: "two_ssr",    emoji: "⚡", name: { ja: "神の気まぐれ",         en: "Divine Whim" },        desc: { ja: "1回のガチャでSSR以上が2枚以上出た",          en: "Got 2+ SSR or higher in one pull" },     check: s => s.lastPackCards.filter(c => ["SSR","UR","LR"].includes(c.rarity)).length >= 2 },
  { id: "two_ur",     emoji: "🌈", name: { ja: "ダブルレインボー",     en: "Double Rainbow" },     desc: { ja: "1回のガチャでUR以上が2枚以上出た",           en: "Got 2+ UR or higher in one pull" },      check: s => s.lastPackCards.filter(c => ["UR","LR"].includes(c.rarity)).length >= 2 },
  { id: "two_lr",     emoji: "🌠", name: { ja: "奇跡",                 en: "Miracle" },            desc: { ja: "1回のガチャでLRが2枚以上出た",               en: "Got 2+ LR in one pull" },                check: s => s.lastPackCards.filter(c => c.rarity === "LR").length >= 2 },
  { id: "rainbow",    emoji: "🎨", name: { ja: "虹色の輝き",           en: "Rainbow" },            desc: { ja: "1回のガチャで5枚全て異なるレアリティだった", en: "All 5 cards had different rarities" },   check: s => s.lastPackCards.length === 5 && new Set(s.lastPackCards.map(c => c.rarity)).size === 5 },
  { id: "fullhouse",  emoji: "🏠", name: { ja: "フルハウス",           en: "Full House" },         desc: { ja: "1回のガチャで同じレアリティが3枚＋別の2枚だった", en: "3+2 of the same rarity in one pull" }, check: s => { const cnt = Object.values(s.lastPackCards.reduce((a, c) => ({ ...a, [c.rarity]: (a[c.rarity as string] ?? 0) + 1 }), {} as Record<string, number>)); return cnt.includes(3) && cnt.includes(2); } },
  { id: "all_n",      emoji: "🍀", name: { ja: "アンコモン・スクワッド", en: "Uncommon Squad" },   desc: { ja: "1回のガチャで全てNが出た",                   en: "All 5 cards were N rarity" },            check: s => s.lastPackCards.length === 5 && s.lastPackCards.every(c => c.rarity === "N") },

  // 重複
  { id: "dupe2",  emoji: "👯",   name: { ja: "被ったあああああ", en: "Duplicate!" },  desc: { ja: "同じカードが2枚になった",  en: "Got 2 of the same card" },  check: s => Object.values(s.cardPullCounts).some(n => n >= 2) },
  { id: "dupe3",  emoji: "👯♀️", name: { ja: "逆に幸運",       en: "Triple!" },     desc: { ja: "同じカードが3枚になった",  en: "Got 3 of the same card" },  check: s => Object.values(s.cardPullCounts).some(n => n >= 3) },
  { id: "dupe5",  emoji: "🤪",   name: { ja: "確率の偏り",     en: "Quintuple!" },  desc: { ja: "同じカードが5枚になった",  en: "Got 5 of the same card" },  check: s => Object.values(s.cardPullCounts).some(n => n >= 5) },
  { id: "dupe10", emoji: "😱",   name: { ja: "呪われてる",     en: "Cursed!" },     desc: { ja: "同じカードが10枚になった", en: "Got 10 of the same card" }, check: s => Object.values(s.cardPullCounts).some(n => n >= 10) },

  // LR所持数
  { id: "lr5",  emoji: "⚔️", name: { ja: "精鋭部隊",     en: "Elite Squad" },    desc: { ja: "LRを5枚以上所持している",  en: "Own 5+ LR cards" },  check: s => s.collection.filter(c => c.rarity === "LR").length >= 5 },
  { id: "lr10", emoji: "🏰", name: { ja: "伝説の宝物庫", en: "Legendary Vault" }, desc: { ja: "LRを10枚以上所持している", en: "Own 10+ LR cards" }, check: s => s.collection.filter(c => c.rarity === "LR").length >= 10 },

  // カードステータス
  { id: "glass_cannon", emoji: "⚔️", name: { ja: "ガラスの大砲",       en: "Glass Cannon" },   desc: { ja: "ATK1500以上かつDEF300以下のカードを獲得",  en: "Got a card with ATK≥1500 and DEF≤300" },  check: s => s.collection.some(c => c.atk >= 1500 && c.def <= 300) },
  { id: "fortress",     emoji: "🛡️", name: { ja: "要塞",               en: "Fortress" },       desc: { ja: "DEF1500以上かつATK300以下のカードを獲得",  en: "Got a card with DEF≥1500 and ATK≤300" },  check: s => s.collection.some(c => c.def >= 1500 && c.atk <= 300) },
  { id: "oneshot",      emoji: "🥊", name: { ja: "一撃必殺",           en: "One Shot" },       desc: { ja: "ATKが2,000を超えるカードを獲得した",      en: "Got a card with ATK over 2,000" },        check: s => s.collection.some(c => c.atk > 2000) },
  { id: "ironwall",     emoji: "🛡️", name: { ja: "鉄壁の守り",         en: "Iron Wall" },      desc: { ja: "DEFが2,000を超えるカードを獲得した",      en: "Got a card with DEF over 2,000" },        check: s => s.collection.some(c => c.def > 2000) },
  { id: "perfect",      emoji: "👽", name: { ja: "完全なる存在",       en: "Perfect Being" },  desc: { ja: "全ステータスが1000以上のカードを獲得した",  en: "Got a card with all stats ≥1000" },        check: s => s.collection.some(c => c.atk >= 1000 && c.def >= 1000 && c.spd >= 1000 && c.hp >= 1000 && c.int >= 1000 && c.luk >= 1000) },
  { id: "zero_score",   emoji: "🍂", name: { ja: "枯れ木も山の賑わい", en: "Weakling" },       desc: { ja: "全ステータスが100以下のカードを獲得した",   en: "Got a card with all stats ≤100" },         check: s => s.collection.some(c => c.atk <= 100 && c.def <= 100 && c.spd <= 100 && c.hp <= 100 && c.int <= 100 && c.luk <= 100) },
  { id: "weakest",      emoji: "🔫", name: { ja: "最弱の戦士",         en: "Weakest Warrior" }, desc: { ja: "ATKが100未満のカードを獲得した",           en: "Got a card with ATK under 100" },          check: s => s.collection.some(c => c.atk < 100) },

  // Twitterステータス
  { id: "millionaire",  emoji: "🐦", name: { ja: "フォロワー長者", en: "Millionaire" },    desc: { ja: "フォロワー100万人以上のカードを獲得した",   en: "Got a card with 1M+ followers" },   check: s => s.collection.some(c => c.followers >= 1000000) },
  { id: "tweetaholic",  emoji: "💬", name: { ja: "ツイ廃",         en: "Tweet Addict" },   desc: { ja: "ツイート数10万以上のカードを獲得した",      en: "Got a card with 100K+ tweets" },    check: s => s.collection.some(c => c.tweets >= 100000) },
  { id: "all_elements", emoji: "🌐", name: { ja: "全属性制覇",     en: "All Elements" },   desc: { ja: "8種類全ての属性のカードを集めた",           en: "Collected all 8 element types" },   check: s => new Set(s.collection.map(c => c.element)).size >= 8 },

  // バトル
  { id: "first_win",    emoji: "🗡️", name: { ja: "初勝利",         en: "First Win" },      desc: { ja: "バトルで初めて勝利した",    en: "Won your first battle" },    check: s => s.battleWins >= 1 },
  { id: "battle10",     emoji: "⚔️", name: { ja: "バトルマスター", en: "Battle Master" },  desc: { ja: "バトルで10回勝利した",      en: "Won 10 battles" },            check: s => s.battleWins >= 10 },
  { id: "battle50",     emoji: "🏆", name: { ja: "覇者",           en: "Champion" },       desc: { ja: "バトルで50回勝利した",      en: "Won 50 battles" },            check: s => s.battleWins >= 50 },
  { id: "first_loss",   emoji: "💀", name: { ja: "敗北の味",       en: "Taste of Defeat" }, desc: { ja: "バトルで初めて敗北した",   en: "Lost your first battle" },   check: s => s.battleLosses >= 1 },

  // レイド
  { id: "raid1",  emoji: "🗡️", name: { ja: "レイド入門",   en: "Raid Beginner" },  desc: { ja: "日替わりレイドボスを1体討伐した",  en: "Defeated 1 raid boss" },  check: s => s.raidClearCount >= 1 },
  { id: "raid3",  emoji: "⚔️", name: { ja: "レイド常連",   en: "Raid Regular" },   desc: { ja: "日替わりレイドボスを3体討伐した",  en: "Defeated 3 raid bosses" }, check: s => s.raidClearCount >= 3 },
  { id: "raid5",  emoji: "🛡️", name: { ja: "レイド討伐隊", en: "Raid Squad" },     desc: { ja: "日替わりレイドボスを5体討伐した",  en: "Defeated 5 raid bosses" }, check: s => s.raidClearCount >= 5 },
  { id: "raid10",  emoji: "👑", name: { ja: "レイド覇者",  en: "Raid Champion" }, desc: { ja: "日替わりレイドボスを10体討伐した",  en: "Defeated 10 raid bosses" },  check: s => s.raidClearCount >= 10 },
  { id: "raid50",  emoji: "🔱", name: { ja: "レイド伝説",  en: "Raid Legend" },   desc: { ja: "日替わりレイドボスを50体討伐した",  en: "Defeated 50 raid bosses" },  check: s => s.raidClearCount >= 50 },
  { id: "raid100", emoji: "🌟", name: { ja: "レイド神",    en: "Raid God" },      desc: { ja: "日替わりレイドボスを100体討伐した", en: "Defeated 100 raid bosses" }, check: s => s.raidClearCount >= 100 },

  // 連勝
  { id: "streak3",  emoji: "🔥",  name: { ja: "3連勝",    en: "3 Win Streak" },  desc: { ja: "バトルで3連勝した",  en: "Won 3 battles in a row" },  check: s => maxStreak(s.battleHistory) >= 3 },
  { id: "streak5",  emoji: "💥",  name: { ja: "5連勝",    en: "5 Win Streak" },  desc: { ja: "バトルで5連勝した",  en: "Won 5 battles in a row" },  check: s => maxStreak(s.battleHistory) >= 5 },
  { id: "streak10",  emoji: "🌋", name: { ja: "10連勝",  en: "10 Win Streak" },  desc: { ja: "バトルで10連勝した",  en: "Won 10 battles in a row" },  check: s => maxStreak(s.battleHistory) >= 10 },
  { id: "streak50",  emoji: "🚀", name: { ja: "50連勝",  en: "50 Win Streak" },  desc: { ja: "バトルで50連勝した",  en: "Won 50 battles in a row" },  check: s => maxStreak(s.battleHistory) >= 50 },
  { id: "streak100", emoji: "👹", name: { ja: "100連勝", en: "100 Win Streak" }, desc: { ja: "バトルで100連勝した", en: "Won 100 battles in a row" }, check: s => maxStreak(s.battleHistory) >= 100 },

  // 全級制覇
  { id: "all_kyu",      emoji: "🎖️", name: { ja: "全級制覇",      en: "All Ranks Clear" },      desc: { ja: "C〜LR全ての級でバトルに勝利した",      en: "Won battles at all ranks from C to LR" },      check: s => ["C","UC","R","SR","SSR","UR","LR"].every(k => s.battleHistory.some(h => h.winner === 'player' && h.kyu === k)) },
  { id: "all_team_kyu", emoji: "🏅", name: { ja: "団体戦全級制覇", en: "All Team Ranks Clear" }, desc: { ja: "団体戦でC〜LR全ての級に勝利した", en: "Won team battles at all ranks from C to LR" }, check: s => ["C","UC","R","SR","SSR","UR","LR"].every(k => s.teamBattleHistory.some(h => h.result === 'win' && h.kyu === k)) },

  // 団体戦MIX
  { id: "team_mix", emoji: "🎲", name: { ja: "団体戦 MIX制覇", en: "Team MIX Clear" }, desc: { ja: "団体戦でMIX級に勝利した", en: "Won a team battle at MIX rank" }, check: s => s.teamBattleHistory.some(h => h.result === 'win' && h.kyu === 'MIX') },

  // 団体戦
  { id: "team_c",   emoji: "🥉", name: { ja: "団体戦 C級制覇",   en: "Team C Clear" },   desc: { ja: "団体戦でC級に勝利した",   en: "Won a team battle at C rank" },   check: s => s.teamBattleHistory.some(h => h.result === 'win' && h.kyu === 'C') },
  { id: "team_uc",  emoji: "🥈", name: { ja: "団体戦 UC級制覇",  en: "Team UC Clear" },  desc: { ja: "団体戦でUC級に勝利した",  en: "Won a team battle at UC rank" },  check: s => s.teamBattleHistory.some(h => h.result === 'win' && h.kyu === 'UC') },
  { id: "team_r",   emoji: "🥇", name: { ja: "団体戦 R級制覇",   en: "Team R Clear" },   desc: { ja: "団体戦でR級に勝利した",   en: "Won a team battle at R rank" },   check: s => s.teamBattleHistory.some(h => h.result === 'win' && h.kyu === 'R') },
  { id: "team_sr",  emoji: "⚔️", name: { ja: "団体戦 SR級制覇",  en: "Team SR Clear" },  desc: { ja: "団体戦でSR級に勝利した",  en: "Won a team battle at SR rank" },  check: s => s.teamBattleHistory.some(h => h.result === 'win' && h.kyu === 'SR') },
  { id: "team_ssr", emoji: "🛡️", name: { ja: "団体戦 SSR級制覇", en: "Team SSR Clear" }, desc: { ja: "団体戦でSSR級に勝利した", en: "Won a team battle at SSR rank" }, check: s => s.teamBattleHistory.some(h => h.result === 'win' && h.kyu === 'SSR') },
  { id: "team_ur",  emoji: "💎", name: { ja: "団体戦 UR級制覇",  en: "Team UR Clear" },  desc: { ja: "団体戦でUR級に勝利した",  en: "Won a team battle at UR rank" },  check: s => s.teamBattleHistory.some(h => h.result === 'win' && h.kyu === 'UR') },
  { id: "team_lr",  emoji: "👑", name: { ja: "団体戦 LR級制覇",  en: "Team LR Clear" },  desc: { ja: "団体戦でLR級に勝利した",  en: "Won a team battle at LR rank" },  check: s => s.teamBattleHistory.some(h => h.result === 'win' && h.kyu === 'LR') },

  // バトル詳細
  { id: "oneshot_win",  emoji: "⚡", name: { ja: "電光石火",       en: "Lightning" },       desc: { ja: "1ターンで勝利した",           en: "Won in 1 turn" },               check: s => s.battleHistory.some(h => h.winner === 'player' && h.turns === 1) },
  { id: "marathon_win", emoji: "🏃", name: { ja: "長期戦",         en: "Marathon" },        desc: { ja: "10ターン以上かかって勝利した", en: "Won after 10+ turns" },         check: s => s.battleHistory.some(h => h.winner === 'player' && (h.turns ?? 0) >= 10) },
  { id: "clutch_win",   emoji: "❤️", name: { ja: "ギリギリ",       en: "Clutch" },          desc: { ja: "HP1で勝利した",               en: "Won with 1 HP remaining" },     check: s => s.battleHistory.some(h => h.winner === 'player' && h.pHp === 1) },
  { id: "lose10",       emoji: "💔", name: { ja: "10連敗",         en: "10 Loss Streak" },  desc: { ja: "バトルで10連敗した",          en: "Lost 10 battles in a row" },    check: s => { let cur = 0; for (const h of s.battleHistory) { cur = h.winner === 'enemy' ? cur + 1 : 0; if (cur >= 10) return true; } return false; } },

  // コレクション詳細
  { id: "fav10",  emoji: "⭐", name: { ja: "お気に入り10枚",  en: "10 Favorites" },  desc: { ja: "お気に入りを10枚登録した",  en: "Added 10 favorites" },  check: s => s.favorites.length >= 10 },
  { id: "fav50",  emoji: "🌟", name: { ja: "お気に入り50枚",  en: "50 Favorites" },  desc: { ja: "お気に入りを50枚登録した",  en: "Added 50 favorites" },  check: s => s.favorites.length >= 50 },
  { id: "fav100", emoji: "💫", name: { ja: "お気に入り100枚", en: "100 Favorites" }, desc: { ja: "お気に入りを100枚登録した", en: "Added 100 favorites" }, check: s => s.favorites.length >= 100 },
  { id: "all_el_fav", emoji: "🌈", name: { ja: "全属性お気に入り", en: "All Element Favs" }, desc: { ja: "8種類全ての属性をお気に入り登録した", en: "Favorited all 8 element types" },         check: s => new Set(s.collection.filter(c => s.favorites.includes(c.id)).map(c => c.element)).size >= 8 },

  // 時間・数字ネタ（隠し）
  { id: "midnight",  emoji: "🌙", name: { ja: "夜更かし",   en: "Night Owl" },      desc: { ja: "深夜0〜4時にガチャを回した",             en: "Drew gacha between midnight and 4am" }, hidden: true, check: s => s.totalPackCount > 0 && new Date().getHours() < 4 },
  { id: "newyear",   emoji: "🎍", name: { ja: "謹賀新年",   en: "Happy New Year" }, desc: { ja: "元旦にプレイした",                       en: "Played on New Year's Day" },            hidden: true, check: () => { const d = new Date(); return d.getMonth() === 0 && d.getDate() === 1; } },
  { id: "lucky777",    emoji: "🎰", name: { ja: "ラッキー777",  en: "Lucky 777" },      desc: { ja: "フォロワー数がぴったり777のカードを獲得した",  en: "Got a card with exactly 777 followers" },  hidden: true, check: s => s.collection.some(c => c.followers === 777) },
  { id: "tweet1000",   emoji: "💬", name: { ja: "ちょうど1000", en: "Exactly 1000" },   desc: { ja: "ツイート数がぴったり1000のカードを獲得した",   en: "Got a card with exactly 1000 tweets" },    hidden: true, check: s => s.collection.some(c => c.tweets === 1000) },
  { id: "follower0",   emoji: "👻", name: { ja: "幽霊アカウント", en: "Ghost Account" }, desc: { ja: "フォロワー数0のカードを獲得した",              en: "Got a card with 0 followers" },            hidden: true, check: s => s.collection.some(c => c.followers === 0) },
  { id: "follower100k",emoji: "📣", name: { ja: "10万フォロワー", en: "100K Followers" },desc: { ja: "フォロワー10万以上のカードを獲得した",          en: "Got a card with 100K+ followers" },        hidden: true, check: s => s.collection.some(c => c.followers >= 100000) },
  { id: "follower500k",emoji: "🦁", name: { ja: "50万フォロワー", en: "500K Followers" },desc: { ja: "フォロワー50万以上のカードを獲得した",          en: "Got a card with 500K+ followers" },        hidden: true, check: s => s.collection.some(c => c.followers >= 500000) },
  { id: "tweet100k",   emoji: "📝", name: { ja: "ツイ廃の極み",  en: "Tweet Machine" },  desc: { ja: "ツイート数10万以上のカードを獲得した",         en: "Got a card with 100K+ tweets" },           hidden: true, check: s => s.collection.some(c => c.tweets >= 100000) },
  { id: "all_same_stat",emoji: "🔮",name: { ja: "完全均等",      en: "Perfect Balance" },desc: { ja: "ATK・DEF・SPD・HP・INT・LUKが全て同じ値のカードを獲得した", en: "Got a card with all stats equal" }, hidden: true, check: s => s.collection.some(c => c.atk === c.def && c.def === c.spd && c.spd === c.hp && c.hp === c.int && c.int === c.luk) },

  // 隠し実績
  { id: "hidden1", emoji: "0️⃣", name: { ja: "ゼロツイーター",       en: "Zero Tweeter" },       desc: { ja: "ツイート数0のカードを獲得した",          en: "Got a card with 0 tweets" },          hidden: true, check: s => s.collection.some(c => c.tweets === 0) },
  { id: "hidden2", emoji: "🎰", name: { ja: "大当たり",             en: "Jackpot" },             desc: { ja: "1回のガチャでSSR以上が3枚以上出た",      en: "Got 3+ SSR or higher in one pull" },  hidden: true, check: s => s.lastPackCards.filter(c => ["SSR","UR","LR"].includes(c.rarity)).length >= 3 },
  { id: "hidden3", emoji: "📜", name: { ja: "常連さん",             en: "Regular" },             desc: { ja: "ガチャを50回回した",                     en: "Drew gacha 50 times" },               hidden: true, check: s => s.totalPackCount >= 50 },
  { id: "hidden4", emoji: "🔹", name: { ja: "認証済みハンター",     en: "Verified Hunter" },     desc: { ja: "認証済みアカウントのカードを獲得した",   en: "Got a verified account card" },       hidden: true, check: s => s.collection.some(c => c.verified) },
  { id: "hidden5", emoji: "ア", name: { ja: "古参ユーザー",         en: "OG User" },             desc: { ja: "2015年以前にTwitterを始めたカードを獲得した", en: "Got a card that joined Twitter before 2016" }, hidden: true, check: s => s.collection.some(c => c.joined && parseInt(c.joined) <= 2015) },
  { id: "hidden6", emoji: "🪞", name: { ja: "属性かぶり",           en: "Element Overlap" },     desc: { ja: "同じ属性のカードを2枚以上持った",        en: "Own 2+ cards with the same element" }, hidden: true, check: s => { const els = s.collection.map(c => c.element); return new Set(els).size < els.length; } },
  { id: "hidden7", emoji: "🪜", name: { ja: "実績コレクター",       en: "Achievement Hunter" },  desc: { ja: "10個の実績を解除した",                   en: "Unlocked 10 achievements" },          hidden: true, check: s => s.achievements.length >= 10 },
];
