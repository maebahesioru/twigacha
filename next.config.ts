import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
