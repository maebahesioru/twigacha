import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://twigacha.vercel.app";
  return [
    { url: base, priority: 1.0, changeFrequency: "daily" },
    { url: `${base}/collection`, priority: 0.8, changeFrequency: "weekly" },
    { url: `${base}/battle`, priority: 0.8, changeFrequency: "weekly" },
    { url: `${base}/achievements`, priority: 0.7, changeFrequency: "weekly" },
    { url: `${base}/help`, priority: 0.6, changeFrequency: "monthly" },
    { url: `${base}/privacy`, priority: 0.3, changeFrequency: "yearly" },
    { url: `${base}/terms`, priority: 0.3, changeFrequency: "yearly" },
    { url: `${base}/contact`, priority: 0.4, changeFrequency: "yearly" },
  ];
}
