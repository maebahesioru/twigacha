import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "バトル",
  description: "TwitterカードでCPUやオンライン対戦。レイドボス討伐・団体戦も楽しめる。",
};
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
