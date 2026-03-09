import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HtmlLang from "@/components/HtmlLang";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";

const BASE_URL = "https://twigacha.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "TwiGacha — TwitterアカウントをTCGカード化してガチャ＆バトル！",
    template: "%s | TwiGacha",
  },
  description: "Twitterアカウントをリアルタイムで解析してTCGカードを生成。ガチャ・コレクション・バトルが楽しめるブラウザゲーム。",
  keywords: ["TwiGacha", "Twitter", "TCG", "カードゲーム", "ガチャ", "バトル", "ブラウザゲーム"],
  authors: [{ name: "TwiGacha" }],
  openGraph: {
    type: "website",
    url: BASE_URL,
    siteName: "TwiGacha",
    title: "TwiGacha — TwitterアカウントをTCGカード化してガチャ＆バトル！",
    description: "Twitterアカウントをリアルタイムで解析してTCGカードを生成。ガチャ・コレクション・バトルが楽しめるブラウザゲーム。",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "TwiGacha — TwitterアカウントをTCGカード化してガチャ＆バトル！",
    description: "Twitterアカウントをリアルタイムで解析してTCGカードを生成。ガチャ・コレクション・バトルが楽しめるブラウザゲーム。",
  },
  icons: { icon: "/favicon.svg" },
  manifest: "/manifest.json",
  robots: { index: true, follow: true },
  alternates: {
    canonical: BASE_URL,
    languages: { "ja": BASE_URL, "en": BASE_URL },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "TwiGacha",
  url: BASE_URL,
  description: "Twitterアカウントをリアルタイムで解析してTCGカードを生成。ガチャ・コレクション・バトルが楽しめるブラウザゲーム。",
  applicationCategory: "GameApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
};

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "TwiGachaとは何ですか？", acceptedAnswer: { "@type": "Answer", text: "TwitterアカウントをTCGカード化してガチャ・バトルが楽しめる無料ブラウザゲームです。" } },
    { "@type": "Question", name: "無料で遊べますか？", acceptedAnswer: { "@type": "Answer", text: "はい、完全無料です。アカウント登録も不要です。" } },
    { "@type": "Question", name: "データはどこに保存されますか？", acceptedAnswer: { "@type": "Answer", text: "ブラウザのローカルストレージに保存されます。サーバーには送信されません。" } },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <meta name="google-adsense-account" content="ca-pub-9868361167191737" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      </head>
      <body className="bg-gray-950 min-h-screen flex flex-col">
        <noscript dangerouslySetInnerHTML={{ __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-MGWGZWXH" height="0" width="0" style="display:none;visibility:hidden"></iframe>` }} />
        <HtmlLang />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <Analytics />
        <Script id="gtm" strategy="afterInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-MGWGZWXH');`}</Script>
        <Script src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9868361167191737" strategy="afterInteractive" crossOrigin="anonymous" />
      </body>
    </html>
  );
}
