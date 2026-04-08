import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** 親フォルダに別の lockfile があると Turbopack が誤った root を推論するのを防ぐ */
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  // CSP / X-Frame-Options は付けない（AdSense・GTM・AdMax が自由に動くようにする）
  reactCompiler: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "pbs.twimg.com" },
      { protocol: "https", hostname: "abs.twimg.com" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/card/:username*",
        destination: "/card/:username*",
      },
    ];
  },
};

export default nextConfig;
