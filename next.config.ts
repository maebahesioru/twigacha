import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** 親フォルダに別の lockfile があると Turbopack が誤った root を推論するのを防ぐ */
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/**
 * AdMax iframe + AdSense（layout）+ GTM。script-src に載せないとブロックされる。
 * frame-ancestors は他サイトへの埋め込み拒否（プレビュー用ツールで iframe する場合は別途調整）
 */
const csp = [
  "default-src 'self'",
  [
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "https://adm.shinobi.jp",
    "https://pagead2.googlesyndication.com",
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
    "https://www.googletagservices.com",
    "https://googleads.g.doubleclick.net",
    "https://tpc.googlesyndication.com",
    "https://securepubads.g.doubleclick.net",
  ].join(" "),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "connect-src 'self' https:",
  "frame-src 'self' https:",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'Content-Security-Policy', value: csp },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    }];
  },
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
