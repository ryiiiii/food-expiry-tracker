# 🥬 食品期限管理アプリ

食品の消費期限・賞味期限を管理し、期限1日前にLINEで通知するWebアプリです。

## 機能

- ✅ 食品の追加・編集・削除
- ✅ 消費期限 / 賞味期限の区別
- ✅ 期限日までの残り日数をカラーバッジで表示
- ✅ フィルター（すべて / 期限近い / 期限切れ）
- ✅ 期限1日前にLINE通知（Vercel Cron Jobs で毎日9時 JST に実行）

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フロントエンド | Next.js 16 (App Router) + Tailwind CSS v4 |
| バックエンド | Next.js API Routes |
| DB | SQLite (libsql) + Prisma 7 |
| 通知 | LINE Messaging API |
| スケジュール | Vercel Cron Jobs |

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local` を作成し、以下を設定します：

```bash
cp .env.example .env.local
```

| 変数名 | 説明 |
|---|---|
| `DATABASE_URL` | SQLiteファイルパス（例: `file:./prisma/dev.db`） |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging API のチャネルアクセストークン（長期） |
| `LINE_USER_IDS` | 通知を受け取る人の LINE ユーザーID（カンマ区切り） |
| `CRON_SECRET` | Cronエンドポイントの認証トークン（任意） |

### 3. LINE 通知の準備

LINE Notify は 2025年3月に終了したため、LINE公式アカウントの Messaging API で送ります（無料枠は月200通まで。送信先の人数ぶん数えられます）。

1. [LINE Developers コンソール](https://developers.line.biz/console/) でプロバイダーを作り、「Messaging API チャネル」を作成
2. LINE公式アカウントの設定で、応答メッセージ・あいさつメッセージをオフにする
3. チャネルの「Messaging API 設定」で「チャネルアクセストークン（長期）」を発行し、`LINE_CHANNEL_ACCESS_TOKEN` に設定
4. 通知を受け取る人が、公式アカウントを友だち追加する（Messaging API 設定の QR コード）
5. 各自のユーザーID（`U` で始まる33文字）を調べ、`LINE_USER_IDS` にカンマ区切りで設定
   - Webhook URL に使い捨ての受信URL（webhook.site など）を設定し、友だち追加後に1通送ると、届いたイベントの `source.userId` で分かります
   - 調べ終わったら Webhook を無効にし、使い捨てURLを削除してください（このアプリには Webhook の受信口はありません）

### 4. データベースの初期化

```bash
npx prisma migrate dev
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

→ http://localhost:3000 にアクセス

## Vercelへのデプロイ

> ⚠️ **注意**: SQLiteはVercelのエフェメラルファイルシステム上では永続化されません。
> 本番環境では [Turso](https://turso.tech)（libsql互換のホスト型SQLite）の使用を推奨します。

### Tursoを使う場合

```bash
# Turso CLIインストール
brew install tursodatabase/tap/turso

# ログイン
turso auth login

# DBを作成
turso db create food-expiry-tracker

# 接続情報を取得
turso db show food-expiry-tracker --url
turso db tokens create food-expiry-tracker
```

Vercelの環境変数に設定：
- `DATABASE_URL` = `libsql://your-db.turso.io`
- `DATABASE_AUTH_TOKEN` = 上で取得したトークン

`lib/prisma.ts` をTurso対応に変更：

```typescript
const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});
```

### Vercel Cron Jobsの設定

`vercel.json` により、毎日 0:00 UTC（9:00 JST）に `/api/cron/notify` が自動実行されます。

```json
{
  "crons": [
    {
      "path": "/api/cron/notify",
      "schedule": "0 0 * * *"
    }
  ]
}
```

## API仕様

| メソッド | エンドポイント | 説明 |
|---|---|---|
| GET | `/api/foods` | 食品一覧取得 |
| POST | `/api/foods` | 食品追加 |
| PUT | `/api/foods/[id]` | 食品更新 |
| DELETE | `/api/foods/[id]` | 食品削除 |
| GET | `/api/cron/notify` | LINE通知実行（Cronから呼ばれる） |

## 開発コマンド

```bash
npm run dev       # 開発サーバー起動
npm run build     # 本番ビルド
npm run lint      # ESLint実行
npx prisma studio # DB管理UI起動
```
