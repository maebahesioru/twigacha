# AdMax（Shinobi）広告の貼り付け方

このドキュメントは **narikitter** における **AdMax（adm.shinobi.jp）** の組み込み方をまとめたものです。ルート直下の `public/ads.txt` は SSP 向けの公開ファイルであり、**タグの埋め込み手順**とは別です。

---

## 1. 全体像

| 項目 | 内容 |
|------|------|
| 設定の集約 | `lib/admax.ts` の `admax` オブジェクト |
| 環境変数 | `NEXT_PUBLIC_ADMAX_*`（`.env.local` 参照。`.env.example` に一覧） |
| バナー枠の表示 | 主に **`AdMaxSlot`** → **iframe** の `src` に **`/api/ad-shinobi?tag=...`** |
| スクリプトの中身取得 | タグ種別判定用に **`/api/shinobi-s-tag?tag=...`**（CORS 回避のプロキシ） |
| 右側 160×600（sticky） | **`AdMaxRightRail`** が **バナー / sticky** を分岐（後述） |

**Google AdSense** 用の `adsbygoogle.js` は `app/layout.tsx` の `next/script` で読み込んでおり、AdMax の **iframe 方式とは独立**です。

---

## 2. なぜ「公式の `<script src>` だけ」では足りないか

1. **React / Next.js** では、マウント後に `appendChild` した script だけでは、Shinobi タグが **`document.write`** に依存している場合に **広告が出ない**ことがある。
2. そのため **バナー枠**は、同じオリジンで **`document.write` が有効な HTML** を `iframe` で読む **`/api/ad-shinobi`** を経由する。
3. **`sticky.right` 型の「アクション枠」** は、Shinobi の `st/s.js` 内で **`in_iframe === true` のとき配信処理がスキップ**されるため、**iframe だけでは表示されない**。その場合は **親ページ**で `window.admaxaction` を設定してから `st/s.js` を読む（`AdMaxRightRail` の実装）。

---

## 3. タグの種類（バナー vs 固定 / sticky）

| 種類 | スクリプト先頭の目安 | このアプリでの扱い |
|------|---------------------|-------------------|
| **バナー枠** | `window.admaxbanner` / `type:'b'` など | **`AdMaxSlot` + `/api/ad-shinobi` の iframe** で表示可能 |
| **アクション枠（例: sticky.right）** | `window.admaxaction` / `action:'sticky.right'` など | **iframe 内では配信されない** → **`AdMaxRightRail` が親ページで `st/s.js` を読み込む** |

**ダッシュボードの選び方の目安**

- **実装が単純**にしたい → **PC「インライン」160×600** など **バナー枠**を発行し、`rightSide160` に設定。
- **右端に常時固定**の公式挙動にしたい → **「右サイド 160×600」固定表示**（多く sticky 系）。**今の sticky 挙動に合う**が、ページ側の CSS 調整が入ることがある。

---

## 4. 枠一覧（`lib/admax.ts` のキーと UI 上の位置）

| キー | 環境変数 | 主な表示場所 | 備考 |
|------|-----------|--------------|------|
| `belowToolbar` | `NEXT_PUBLIC_ADMAX_BELOW_TOOLBAR` | `/chat` メイン列・ツールバー直下（**PC 幅**） | `AdMaxHeader` → 728×90 |
| `headerMobile` | `NEXT_PUBLIC_ADMAX_HEADER_MOBILE` | 同上（**幅 md 未満**） | 320×50 |
| `aboveToolbar` | `NEXT_PUBLIC_ADMAX_ABOVE_TOOLBAR` | ページ最上部（トップバーより上） | **未設定なら非表示** |
| `sidebar` | `NEXT_PUBLIC_ADMAX_SIDEBAR` | 会話サイドバー内 | `ConversationSidebar` 経由 260×250 想定 |
| `mrec` | `NEXT_PUBLIC_ADMAX_MREC` | チャット中・メイン列スクロールエリア下部（入力欄直上付近） | 300×250 |
| `overlayMobile` | `NEXT_PUBLIC_ADMAX_OVERLAY_MOBILE` | **スマホのみ**画面下固定 | `AdMaxOverlay` 320×50。メインの `pb-[50px]` と連動 |
| `banner320x100` | `NEXT_PUBLIC_ADMAX_BANNER_320X100` | ユーザー未選択画面・会話 0 件時のサジェスト下など | 320×100 |
| `rightSide160` | `NEXT_PUBLIC_ADMAX_RIGHT_SIDE_160` | **PC（`lg` 以上）右端 160×600** | `AdMaxRightRail`（バナーは iframe / sticky は親注入） |

**同一のタグ URL を複数箇所に使わない**こと（運用・審査の両面で推奨）。

---

## 5. 設定手順

1. [AdMax の管理画面](https://admax.shinobi.jp/) で **枠ごとに別タグ**を発行する。
2. プロジェクトルートに `.env.local` を置き、各 `NEXT_PUBLIC_ADMAX_*` に  
   `https://adm.shinobi.jp/s/（32文字のタグID）`  
   を設定する。
3. 未設定のキーは `lib/admax.ts` の **デフォルト URL** にフォールバックする（空文字の env は無視してデフォルトに戻す実装）。
4. 本番では **公開ドメイン**で配信・審査を確認する（localhost では配信ゼロや挙動差があり得る）。

---

## 6. 主要コンポーネント・API

| ファイル | 役割 |
|----------|------|
| `lib/admax.ts` | URL 定義・env フォールバック |
| `lib/shinobiTagScript.ts` | `/s/...` 本文のパース、`tagFromShinobiScriptUrl` |
| `app/components/AdMaxSlot.tsx` | iframe で `/api/ad-shinobi` を読む汎用枠 |
| `app/components/AdMaxHeader.tsx` | PC/スマホで別タグを出すヘッダー帯 |
| `app/components/AdMaxOverlay.tsx` | スマホ下部オーバーレイ |
| `app/components/AdMaxRightRail.tsx` | 右 160×600（sticky / バナー分岐） |
| `app/api/ad-shinobi/route.ts` | iframe 用 HTML（`document.write` 可能） |
| `app/api/shinobi-s-tag/route.ts` | タグスクリプト本文のプロキシ（CORS 回避） |
| `app/chat/ChatPageClient.tsx` | 各枠の配置・右レール時の `lg:pr-[160px]`（バナー iframe のときのみ） |
| `app/globals.css` | sticky.right の縦位置調整（`.admax-official-overlap-close` 付近） |

---

## 7. 右カラム（`rightSide160`）の挙動

1. `lg`（1024px）以上でのみ処理を行う。
2. `/api/shinobi-s-tag` でタグ本文を取得し解析する。
3. **`sticky.*`（アクション）** → `window.admaxaction` を設定し、`https://adm.shinobi.jp/st/s.js` を `head` に追加（二重インジェクト防止用のグローバルフラグあり）。
4. **バナー** → 従来どおり **`AdMaxSlot`**（iframe）。
5. **バナー iframe** のときだけ、`ChatPageClient` が **`lg:pr-[160px]`** を付けて本文と重ならないようにする。sticky のときは Shinoobi 側のレイアウトに任せる。

**sticky.right** は `position: fixed` で **下寄せ**になりやすいため、`app/globals.css` で **縦中央**寄せの上書きをしている（`div:has(> .admax-official-overlap-close)` など）。

---

## 8. トラブルシューティング

| 現象 | 確認すること |
|------|----------------|
| 枠が真っ白 | `/api/ad-shinobi?tag=...` が 200 か。iframe 内の Network で `adm.shinobi.jp` の JS が読めているか。 |
| sticky だけ出ない | タグが **iframe 非対応のアクション枠**になっていないか。親ページ注入のコンソールエラー。 |
| 右側 160×600 の縦位置がおかしい | `globals.css` の sticky 用オーバーライドが当たっているか、DevTools で `style` 属性の表記を確認。 |
| ハイドレーション警告 | テーマ用は `public/theme-init.js` + `<script src>` 利用。AdSense は `next/script`。 |

---

## 9. 関連ファイル

- `public/ads.txt` — 広告関連のドメイン宣言（**別作業**）。本ドキュメントの埋め込み手順とは別。
- `.env.example` — 環境変数テンプレート。

---

## 10. 変更履歴メモ

実装・仕様変更時は **本ファイル**と **`lib/admax.ts` のコメント** を揃えると、運用時の齟齬が減ります。
