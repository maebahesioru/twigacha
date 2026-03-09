import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg, #ec4899, #a855f7)",
        borderRadius: 40,
        fontSize: 100,
      }}>
        🃏
      </div>
    ),
    { ...size }
  );
}
