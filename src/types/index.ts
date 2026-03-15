export type Rarity = "C" | "N" | "R" | "SR" | "SSR" | "UR" | "LR";
export type Element = "🔥" | "💧" | "🌿" | "⚡" | "✨" | "🌑" | "🌙" | "❄️";

export interface TwitterCard {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  followers: number;
  following: number;
  tweets: number;
  likes: number;
  mediaCount: number;
  joined: string;
  verified: boolean;
  rarity: Rarity;
  element: Element;
  atk: number;
  def: number;
  spd: number;
  hp: number;
  int: number;
  luk: number;
  pulledAt: number;
  skill?: string | null;
  enhance?: number; // 0-6
  ultimates?: { text: string; score: number; effect?: string }[];
  signature?: string;
  platform?: string;
}

export interface BattleState {
  playerCard: TwitterCard;
  enemyCard: TwitterCard;
  log: string[];
  winner: "player" | "enemy" | null;
}
