import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "実績",
  description: "ガチャ・バトル・コレクションで解除できる実績一覧。隠し実績も存在する。",
};
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
