"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TwitterCard } from "@/types";
import { getSkill } from "@/lib/skill";

interface GameStore {
  collection: TwitterCard[];
  playerId: string;
  addCard: (card: TwitterCard) => void;
  removeCard: (id: string) => void;
  updateCard: (card: TwitterCard) => void;
  hasCard: (id: string) => boolean;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  packCount: number;
  packDate: string;
  bonusPacks: number;
  bonusPackDate: string;
  usedBonusPacks: number;
  usedBonusDate: string;
  totalPackCount: number;
  pityCount: number;
  addPity: () => void;
  resetPity: () => void;
  openPack: () => void;
  srDate: string;
  srDone: boolean;
  markSR: () => void;
  srRewarded: boolean;
  twitterDate: string;
  twitterDone: boolean;
  markTwitter: () => void;
  twitterRewarded: boolean;
  quest311Date: string;
  quest311Rewarded: boolean;
  claimQuest311: () => void;
  questCleared: number[]; // cleared stage indices
  questBestStreak: number; // endless best streak
  claimQuestReward: (stageIdx: number, reward: number) => void;
  setQuestBestStreak: (n: number) => void;
  birthdayBonusDate: string;
  birthdayBonusCount: number;
  claimBirthdayBonus: () => boolean; // returns true if bonus given
  packMissionDate: string;
  packMissionRewarded: boolean;
  shareDate: string;
  shareDone: boolean;
  markShare: () => void;
  shareRewarded: boolean;
  battleDate: string;
  battleDone: boolean;
  markBattle: () => void;
  battleRewarded: boolean;
  raidMissionDate: string;
  raidMissionDone: boolean;
  markRaidMission: () => void;
  raidMissionRewarded: boolean;
  battleHistory: { winner: 'player'|'enemy'; turns: number; kyu: string; playerCardId: string; opponentName?: string; pHp?: number; ko?: boolean; playerCardRarity?: string; enemyCardRarity?: string; mode?: string; log?: string[]; hpSnaps?: {pHp:number;eHp:number}[]; playerSnap?: TwitterCard; enemySnap?: TwitterCard }[];
  addBattleResult: (r: { winner: 'player'|'enemy'; turns: number; kyu: string; playerCardId: string; opponentName?: string; pHp?: number; ko?: boolean; playerCardRarity?: string; enemyCardRarity?: string; mode?: string; log?: string[]; hpSnaps?: {pHp:number;eHp:number}[]; playerSnap?: TwitterCard; enemySnap?: TwitterCard }) => void;
  teamBattleHistory: { date: string; myTeam: string[]; enemyTeam: string[]; wins: number; losses: number; result: 'win'|'lose'|'draw'; opponentName?: string; kyu?: string; log?: string[]; rounds?: { p: TwitterCard; e: TwitterCard; hpSnaps: {pHp:number;eHp:number}[]; log: string[]; win: boolean }[] }[];
  addTeamBattleResult: (r: { date: string; myTeam: string[]; enemyTeam: string[]; wins: number; losses: number; result: 'win'|'lose'|'draw'; opponentName?: string; kyu?: string; log?: string[]; rounds?: { p: TwitterCard; e: TwitterCard; hpSnaps: {pHp:number;eHp:number}[]; log: string[]; win: boolean }[] }) => void;
  savedTeam: string[];
  setSavedTeam: (ids: string[]) => void;
  savedDecks: { name: string; ids: string[] }[];
  savedeck: (name: string, ids: string[]) => void;
  deleteDeck: (name: string) => void;
  battleSpeed: number;
  setBattleSpeed: (n: number) => void;
  battleSort: "pulledAt"|"rarity"|"name"|"id"|"atk"|"def"|"spd"|"hp"|"int"|"luk";
  setBattleSort: (s: "pulledAt"|"rarity"|"name"|"id"|"atk"|"def"|"spd"|"hp"|"int"|"luk") => void;
  achievements: string[];
  unlockAchievement: (id: string) => void;
  lang: "ja" | "en";
  setLang: (lang: "ja" | "en") => void;
  raidClearCount: number;
  incrementRaidClearCount: () => void;
  lastPackCards: TwitterCard[];
  setLastPackCards: (cards: TwitterCard[]) => void;
  cardPullCounts: Record<string, number>;
  incrementCardPullCount: (id: string) => void;
  loginDate: string;
  loginStreak: number;
  claimLoginBonus: () => number; // returns bonus packs given

  raidDate: string;
  raidBossMaxHp: number;
  raidBossHp: number;
  raidBossCard: import("@/types").TwitterCard | null;
  raidCleared: boolean;
  raidDeck: string[];
  raidUsedCards: string[];
  raidHistory: { date: string; bossName: string; totalDmg: number; cleared: boolean; log?: string[]; snaps?: { cardIdx: number; card: TwitterCard; cardHp: number; bossHp: number }[] }[];
  addRaidHistory: (r: { date: string; bossName: string; totalDmg: number; cleared: boolean; log?: string[]; snaps?: { cardIdx: number; card: TwitterCard; cardHp: number; bossHp: number }[] }) => void;
  setRaidDeck: (ids: string[]) => void;
  damageRaidBoss: (dmg: number) => void;
  addRaidUsedCards: (ids: string[]) => void;
  initRaid: (date: string, card: import("@/types").TwitterCard, maxHp: number) => void;
  clearRaid: () => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      collection: [],
      playerId: crypto.randomUUID().replace(/-/g, ''),
      addCard: (card) =>
        set((s) => ({
          collection: [get().hasCard(card.id) ? { ...card, id: `${card.id}_${Date.now()}` } : card, ...s.collection],
        })),
      removeCard: (id) =>
        set((s) => ({ collection: s.collection.filter((c) => c.id !== id) })),
      updateCard: (card) =>
        set((s) => ({ collection: s.collection.map((c) => c.id === card.id ? card : c) })),
      hasCard: (id) => get().collection.some((c) => c.id === id),
      favorites: [],
      toggleFavorite: (id) => {
        const favs = get().favorites;
        set({ favorites: favs.includes(id) ? favs.filter(f => f !== id) : [...favs, id] });
      },
      isFavorite: (id) => get().favorites.includes(id),
      packCount: 0,
      packDate: "",
      bonusPacks: 0,
      bonusPackDate: "",
      usedBonusPacks: 0,
      usedBonusDate: "",
      totalPackCount: 0,
      pityCount: 0,
      addPity: () => set(s => ({ pityCount: s.pityCount + 1 })),
      resetPity: () => set({ pityCount: 0 }),
      openPack: () => {
        const today = new Date().toDateString();
        const { packDate, packCount, packMissionDate, packMissionRewarded, totalPackCount, bonusPackDate, bonusPacks, usedBonusDate, usedBonusPacks } = get();
        const newCount = packDate === today ? packCount + 1 : 1;
        const currentBonus = bonusPackDate === today ? bonusPacks : 0;
        const currentUsed = usedBonusDate === today ? usedBonusPacks : 0;
        const DAILY_LIMIT = 10;
        // 通常枠を超えていたらボーナス消費
        const usingBonus = newCount > DAILY_LIMIT;
        const missionDone = newCount >= 5;
        const alreadyRewarded = packMissionDate === today && packMissionRewarded;
        set({
          packCount: newCount,
          packDate: today,
          totalPackCount: totalPackCount + 1,
          bonusPacks: missionDone && !alreadyRewarded ? currentBonus + 2 : currentBonus,
          bonusPackDate: today,
          usedBonusPacks: usingBonus ? currentUsed + 1 : currentUsed,
          usedBonusDate: today,
          packMissionDate: missionDone ? today : packMissionDate,
          packMissionRewarded: missionDone ? true : (packMissionDate === today ? packMissionRewarded : false),
        });
      },
      srDate: "",
      srDone: false,
      srRewarded: false,
      markSR: () => {
        const today = new Date().toDateString();
        const { srDate, srRewarded, bonusPacks, bonusPackDate } = get();
        const alreadyRewarded = srDate === today && srRewarded;
        const current = bonusPackDate === today ? bonusPacks : 0;
        set({ srDone: true, srDate: today, srRewarded: true, bonusPacks: alreadyRewarded ? current : current + 2, bonusPackDate: today });
      },
      twitterDate: "",
      twitterDone: false,
      twitterRewarded: false,
      markTwitter: () => {
        const today = new Date().toDateString();
        const { twitterDate, twitterRewarded, bonusPacks, bonusPackDate } = get();
        const alreadyRewarded = twitterDate === today && twitterRewarded;
        const current = bonusPackDate === today ? bonusPacks : 0;
        set({ twitterDone: true, twitterDate: today, twitterRewarded: true, bonusPacks: alreadyRewarded ? current : current + 2, bonusPackDate: today });
      },
      packMissionDate: "",
      packMissionRewarded: false,
      quest311Date: "",
      quest311Rewarded: false,
      claimQuest311: () => {
        const { quest311Date, quest311Rewarded, bonusPacks, bonusPackDate } = get();
        const today = new Date().toDateString();
        if (quest311Date === today && quest311Rewarded) return;
        const current = bonusPackDate === today ? bonusPacks : 0;
        set({ quest311Date: today, quest311Rewarded: true, bonusPacks: current + 10, bonusPackDate: today });
      },
      questCleared: [],
      questBestStreak: 0,
      claimQuestReward: (stageIdx, reward) => set(s => {
        const today = new Date().toDateString();
        const current = s.bonusPackDate === today ? s.bonusPacks : 0;
        return {
          questCleared: s.questCleared.includes(stageIdx) ? s.questCleared : [...s.questCleared, stageIdx],
          bonusPacks: current + reward,
          bonusPackDate: today,
        };
      }),
      setQuestBestStreak: (n) => set(s => ({ questBestStreak: Math.max(s.questBestStreak, n) })),
      birthdayBonusDate: "",
      birthdayBonusCount: 0,
      claimBirthdayBonus: () => {
        const { birthdayBonusDate, birthdayBonusCount, bonusPacks, bonusPackDate } = get();
        const today = new Date().toDateString();
        const count = birthdayBonusDate === today ? birthdayBonusCount : 0;
        if (count >= 5) return false;
        const current = bonusPackDate === today ? bonusPacks : 0;
        set({ birthdayBonusDate: today, birthdayBonusCount: count + 1, bonusPacks: current + 1, bonusPackDate: today });
        return true;
      },
      shareDate: "",
      shareDone: false,
      shareRewarded: false,
      markShare: () => {
        const today = new Date().toDateString();
        const { shareDate, shareRewarded, bonusPacks, bonusPackDate } = get();
        const alreadyRewarded = shareDate === today && shareRewarded;
        const current = bonusPackDate === today ? bonusPacks : 0;
        set({ shareDone: true, shareDate: today, shareRewarded: true, bonusPacks: alreadyRewarded ? current : current + 2, bonusPackDate: today });
      },
      battleDate: "",
      battleDone: false,
      battleRewarded: false,
      markBattle: () => {
        const today = new Date().toDateString();
        const { battleDate, battleRewarded, bonusPacks, bonusPackDate } = get();
        const alreadyRewarded = battleDate === today && battleRewarded;
        const current = bonusPackDate === today ? bonusPacks : 0;
        set({ battleDone: true, battleDate: today, battleRewarded: true, bonusPacks: alreadyRewarded ? current : current + 2, bonusPackDate: today });
      },
      raidMissionDate: "",
      raidMissionDone: false,
      raidMissionRewarded: false,
      markRaidMission: () => {
        const today = new Date().toDateString();
        const { raidMissionDate, raidMissionRewarded, bonusPacks, bonusPackDate } = get();
        const alreadyRewarded = raidMissionDate === today && raidMissionRewarded;
        const current = bonusPackDate === today ? bonusPacks : 0;
        set({ raidMissionDone: true, raidMissionDate: today, raidMissionRewarded: true, bonusPacks: alreadyRewarded ? current : current + 2, bonusPackDate: today });
      },
      battleHistory: [],
      addBattleResult: (r) => set((s) => {
        const newHistory = [...s.battleHistory, r];
        // 連勝カウント（カードのレアリティ以上の級での勝利のみ）
        const KYU_ORDER = ["C","N","R","SR","SSR","UR","LR"];
        let streak = 0;
        for (let i = newHistory.length - 1; i >= 0; i--) {
          const b = newHistory[i];
          const kyuIdx = KYU_ORDER.indexOf(b.kyu);
          const rarityIdx = KYU_ORDER.indexOf(b.playerCardRarity ?? "C");
          if (b.winner === 'player' && kyuIdx >= rarityIdx && (b.mode === 'random' || b.mode === 'team')) streak++;
          else break;
        }
        const bonus = streak > 0 && streak % 3 === 0 ? 1 : 0;
        const today = new Date().toDateString();
        const currentBonus = s.bonusPackDate === today ? s.bonusPacks : 0;
        const todayPackCount = s.packDate === today ? s.packCount : 0;
        const todayUsed = s.usedBonusDate === today ? s.usedBonusPacks : 0;
        const DAILY_LIMIT = 10;
        const remaining = Math.max(0, DAILY_LIMIT - todayPackCount) + Math.max(0, currentBonus - todayUsed);
        const canAdd = remaining < 10; // ボーナス上限10パックまで
        return {
          battleHistory: newHistory.slice(-20),
          ...(bonus > 0 && canAdd ? { bonusPacks: currentBonus + bonus, bonusPackDate: today } : {}),
        };
      }),
      teamBattleHistory: [],
      addTeamBattleResult: (r) => set((s) => ({ teamBattleHistory: [...s.teamBattleHistory, r] })),
      savedTeam: [],
      setSavedTeam: (ids) => set({ savedTeam: ids }),
      savedDecks: [],
      savedeck: (name, ids) => set(s => ({
        savedDecks: s.savedDecks.some(d => d.name === name)
          ? s.savedDecks.map(d => d.name === name ? { name, ids } : d)
          : [...s.savedDecks, { name, ids }]
      })),
      deleteDeck: (name) => set(s => ({ savedDecks: s.savedDecks.filter(d => d.name !== name) })),
      battleSpeed: 600,
      setBattleSpeed: (n) => set({ battleSpeed: n }),
      battleSort: 'pulledAt',
      setBattleSort: (s) => set({ battleSort: s }),
      achievements: [],
      unlockAchievement: (id) => set((s) => ({ achievements: s.achievements.includes(id) ? s.achievements : [...s.achievements, id] })),
      lang: "ja",
      setLang: (lang) => set({ lang }),
      raidClearCount: 0,
      incrementRaidClearCount: () => set((s) => ({ raidClearCount: s.raidClearCount + 1 })),
      lastPackCards: [],
      setLastPackCards: (cards) => set({ lastPackCards: cards }),
      cardPullCounts: {},
      incrementCardPullCount: (id) => set((s) => ({ cardPullCounts: { ...s.cardPullCounts, [id]: (s.cardPullCounts[id] ?? 0) + 1 } })),
      loginDate: "",
      loginStreak: 0,
      claimLoginBonus: () => {
        const today = new Date().toDateString();
        const { loginDate, loginStreak, bonusPacks, bonusPackDate } = get();
        if (loginDate === today) return 0; // already claimed today
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        const newStreak = loginDate === yesterday ? loginStreak + 1 : 1;
        const bonus = newStreak % 7 === 0 ? 3 : 1;
        const currentBonus = bonusPackDate === today ? bonusPacks : 0;
        set({ loginDate: today, loginStreak: newStreak, bonusPacks: currentBonus + bonus, bonusPackDate: today });
        return bonus;
      },
      raidDate: "",
      raidBossMaxHp: 0,
      raidBossHp: 0,
      raidBossCard: null,
      raidCleared: false,
      raidDeck: [],
      raidUsedCards: [],
      raidHistory: [],
      addRaidHistory: (r) => set((s) => ({ raidHistory: [r, ...s.raidHistory].slice(0, 30) })),
      setRaidDeck: (ids) => set({ raidDeck: ids }),
      damageRaidBoss: (dmg) => set((s) => ({ raidBossHp: Math.max(0, s.raidBossHp - dmg) })),
      addRaidUsedCards: (ids) => set((s) => ({ raidUsedCards: [...new Set([...s.raidUsedCards, ...ids])] })),
      initRaid: (date, card, maxHp) => set({ raidDate: date, raidBossCard: card, raidBossMaxHp: maxHp, raidBossHp: maxHp, raidCleared: false, raidUsedCards: [] }),
      clearRaid: () => set({ raidCleared: true, raidBossHp: 0 }),
    }),
    { name: "twigacha-collection",
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const migrated = state.collection.map(c => c.skill !== undefined ? c : { ...c, skill: getSkill(c) });
        if (migrated.some((c, i) => c !== state.collection[i])) state.collection = migrated;
      },
    }
  )
);
