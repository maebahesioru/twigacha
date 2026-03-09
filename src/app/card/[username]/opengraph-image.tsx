import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "TwiGacha Card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const RARITY_GRADIENT: Record<string, string[]> = {
  C:   ["#a8a29e","#78716c"],
  N:   ["#9ca3af","#6b7280"],
  R:   ["#60a5fa","#2563eb"],
  SR:  ["#c084fc","#7c3aed"],
  SSR: ["#fbbf24","#d97706"],
  UR:  ["#f472b6","#a855f7","#60a5fa"],
  LR:  ["#f43f5e","#f59e0b","#34d399","#60a5fa","#a855f7"],
};

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  let card: import("@/types").TwitterCard | null = null;
  try {
    const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
    const res = await fetch(`${base}/api/gacha?username=${encodeURIComponent(username)}`, { next: { revalidate: 3600 } });
    if (res.ok) card = await res.json() as import("@/types").TwitterCard;
  } catch {}

  const rarity = String(card?.rarity ?? "N");
  const colors = RARITY_GRADIENT[rarity] ?? RARITY_GRADIENT.N;
  const grad = colors.length === 1
    ? colors[0]
    : `linear-gradient(135deg, ${colors.join(", ")})`;

  const stats = card ? [
    { label: "ATK", val: card.atk, icon: "⚔️" },
    { label: "DEF", val: card.def, icon: "🛡️" },
    { label: "SPD", val: card.spd, icon: "⚡" },
    { label: "HP",  val: card.hp,  icon: "❤️" },
    { label: "INT", val: card.int, icon: "🧠" },
    { label: "LUK", val: card.luk, icon: "🍀" },
  ] : [];

  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex",
        background: "#0a0a14", fontFamily: "sans-serif",
        alignItems: "center", justifyContent: "center", gap: 64, padding: "40px 80px",
      }}>
        {/* 背景グロー */}
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          background: `radial-gradient(ellipse at 30% 50%, ${colors[0]}22 0%, transparent 60%)`,
        }} />

        {/* カード本体 */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          width: 240, height: 340, borderRadius: 20, flexShrink: 0,
          background: grad, padding: 3,
          boxShadow: `0 0 60px ${colors[0]}88, 0 0 120px ${colors[0]}44`,
        }}>
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            width: "100%", height: "100%", borderRadius: 18,
            background: "linear-gradient(160deg, #1a1a2e 0%, #0d0d1a 100%)",
            overflow: "hidden", gap: 0,
          }}>
            {/* レアリティバー */}
            <div style={{ display: "flex", width: "100%", height: 6, background: grad }} />
            {/* アバター */}
            <div style={{ display: "flex", marginTop: 20 }}>
              {card?.avatar
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={card.avatar as string} width={90} height={90} style={{ borderRadius: "50%", border: `3px solid ${colors[0]}` }} alt="" />
                : <div style={{ display: "flex", width: 90, height: 90, borderRadius: "50%", background: grad, alignItems: "center", justifyContent: "center", fontSize: 36 }}>?</div>
              }
            </div>
            {/* レアリティ */}
            <div style={{ display: "flex", marginTop: 8, fontSize: 13, fontWeight: 900, color: colors[0], letterSpacing: 2 }}>{rarity as string}</div>
            {/* 名前 */}
            <div style={{ display: "flex", marginTop: 4, fontSize: 14, fontWeight: 700, color: "white", textAlign: "center", padding: "0 12px", lineHeight: 1.3 }}>
              {(card?.displayName as string) ?? `@${username}`}
            </div>
            <div style={{ display: "flex", fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>@{(card?.username as string) ?? username}</div>
            {/* 属性 */}
            {card?.element && <div style={{ display: "flex", fontSize: 20, marginTop: 6 }}>{card.element as string}</div>}
            {/* ステータス */}
            <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 8, width: "100%", padding: "0 16px" }}>
              {stats.slice(0, 3).map(s => (
                <div key={s.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
                  <span style={{ display: "flex" }}>{s.icon} {s.label}</span>
                  <span style={{ display: "flex", fontWeight: 700, color: "white" }}>{s.val as number}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右側テキスト */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", fontSize: 14, color: colors[0], fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>TwiGacha Card</div>
            <div style={{ display: "flex", fontSize: 44, fontWeight: 900, color: "white", lineHeight: 1.1 }}>
              {(card?.displayName as string) ?? `@${username}`}
            </div>
            <div style={{ display: "flex", fontSize: 20, color: "rgba(255,255,255,0.4)" }}>@{(card?.username as string) ?? username}</div>
          </div>

          {/* ステータスグリッド */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {stats.map(s => (
              <div key={s.label} style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                background: "rgba(255,255,255,0.07)", borderRadius: 12,
                padding: "10px 18px", border: `1px solid ${colors[0]}44`,
                minWidth: 80,
              }}>
                <div style={{ display: "flex", fontSize: 18 }}>{s.icon}</div>
                <div style={{ display: "flex", fontSize: 20, fontWeight: 900, color: "white" }}>{s.val as number}</div>
                <div style={{ display: "flex", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", fontSize: 16, color: "rgba(255,255,255,0.25)" }}>
            twigacha.vercel.app
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
