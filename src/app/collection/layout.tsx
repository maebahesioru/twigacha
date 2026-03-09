import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "コレクション",
  description: "集めたTwitterカードを管理。レアリティ別フィルター・お気に入り・バックアップ機能付き。",
};
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
