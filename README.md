# TwiGacha 🎴

X（Twitter）・Blueskyのユーザーをカード化してガチャ・バトルで遊ぶブラウザゲーム。

🔗 **[twigacha.vercel.app](https://twigacha.vercel.app)**

## 機能

- **ガチャ** — ランダムまたはキーワードでユーザーカードを排出（C〜LR 7段階レアリティ）
- **ピックアップガチャ** — キーワード検索でX・Bskyユーザーをピックアップ
- **バトル** — 1vs1・チーム5vs5・レイドボス戦
- **パッシブスキル** — フォロワー数・投稿数・属性など80種以上の条件でスキル自動付与
- **属性相性** — 🔥💧🌿⚡✨🌑🌙❄️ の8属性3すくみ
- **コレクション** — お気に入り・カードシェア・OGP対応
- **多言語対応** — 日本語 / English
- **PWA対応** — プッシュ通知・オフライン対応

## 技術スタック

- **Next.js 16** (App Router, Turbopack)
- **Supabase** (オンライン対戦・レイドボス同期)
- **Vercel** (ホスティング)
- **Zustand** (状態管理)
- **Tailwind CSS**

## セットアップ

```bash
pnpm install
cp .env.example .env.local
# .env.local を編集して各種APIキーを設定
pnpm dev
```

## 環境変数

`.env.example` を参照してください。

| 変数 | 説明 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクトURL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名キー |
| `BSKY_IDENTIFIER` | Bluesky ハンドル |
| `BSKY_APP_PASSWORD` | Bluesky アプリパスワード |
| `NEXT_PUBLIC_BASE_URL` | 本番URL（例: https://twigacha.vercel.app） |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push 公開鍵 |
| `VAPID_PRIVATE_KEY` | Web Push 秘密鍵 |

## ライセンス

MIT
