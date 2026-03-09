import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "ルールブック",
  description: "TwiGachaの遊び方・仕様まとめ。ガチャ・バトル・レイド・実績の詳細を解説。",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
