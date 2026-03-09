import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "TwiGacha";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f0f1a 0%, #1a0a2e 50%, #0a1a2e 100%)",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* 背景の光 */}
        <div style={{
          position: "absolute", width: 600, height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(236,72,153,0.15) 0%, transparent 70%)",
          top: -100, left: -100,
        }} />
        <div style={{
          position: "absolute", width: 500, height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)",
          bottom: -100, right: -100,
        }} />

        {/* カードっぽい装飾 */}
        {[
          { left: 60, top: 80, rotate: -15, rarity: "LR", color: "#f472b6" },
          { left: 180, top: 120, rotate: -8, rarity: "UR", color: "#a78bfa" },
          { right: 60, top: 80, rotate: 15, rarity: "SSR", color: "#fb923c" },
          { right: 180, top: 120, rotate: 8, rarity: "SR", color: "#facc15" },
        ].map((c, i) => (
          <div key={i} style={{
            position: "absolute",
            ...(c.left !== undefined ? { left: c.left } : { right: (c as any).right }),
            top: c.top,
            width: 120, height: 170,
            borderRadius: 12,
            border: `2px solid ${c.color}`,
            background: "rgba(255,255,255,0.05)",
            transform: `rotate(${c.rotate}deg)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            fontWeight: "bold",
            color: c.color,
          }}>
            {c.rarity}
          </div>
        ))}

        {/* メインタイトル */}
        <div style={{
          fontSize: 96,
          fontWeight: 900,
          background: "linear-gradient(90deg, #f472b6, #a78bfa, #60a5fa)",
          backgroundClip: "text",
          color: "transparent",
          letterSpacing: "-2px",
          marginBottom: 16,
        }}>
          TwiGacha
        </div>

        {/* サブタイトル */}
        <div style={{
          fontSize: 32,
          color: "rgba(255,255,255,0.7)",
          marginBottom: 48,
          letterSpacing: "1px",
        }}>
          TwitterアカウントをTCGカード化してガチャ＆バトル！
        </div>

        {/* バッジ */}
        <div style={{ display: "flex", gap: 16 }}>
          {["🎴 ガチャ", "📦 コレクション", "⚔️ バトル", "🏆 実績"].map(label => (
            <div key={label} style={{
              padding: "10px 24px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "white",
              fontSize: 22,
              fontWeight: "bold",
            }}>
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
