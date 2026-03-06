# Netlify デプロイ手順ガイド

このアプリはフロントエンド（Expo Web）とバックエンドサーバー（Node.js）の2つで構成されています。
「全サイト更新」機能（DataForSEO / Google PageSpeed API）を使うには、両方のデプロイが必要です。

---

## 構成の概要

| 役割 | 技術 | デプロイ先 |
|------|------|-----------|
| フロントエンド（画面） | Expo Web（静的HTML） | Netlify（無料） |
| バックエンド（API） | Node.js / Express | Render.com（無料） |

---

## STEP 1: プロジェクトをダウンロード

1. Manus の Management UI → **「Code」パネル** を開く
2. **「Download all files」** をクリックしてZIPをダウンロード
3. ZIPを解凍してフォルダを開く

---

## STEP 2: バックエンドを Render.com にデプロイ

バックエンドサーバーは **Render.com**（無料プランあり）に先にデプロイします。

### 2-1. GitHubにプッシュ

```bash
cd competitor_analysis_app
git init
git add .
git commit -m "initial commit"
# GitHubで新しいリポジトリを作成してからpush
git remote add origin https://github.com/あなたのユーザー名/competitor-analysis.git
git push -u origin main
```

### 2-2. Render.com でサービスを作成

1. [render.com](https://render.com) にアクセスしてアカウント作成（無料）
2. **「New +」→「Web Service」** をクリック
3. GitHubリポジトリを選択して接続
4. 以下の設定を入力：

| 項目 | 値 |
|------|-----|
| **Name** | competitor-analysis-api |
| **Runtime** | Node |
| **Build Command** | `npm install -g pnpm && pnpm install && pnpm build` |
| **Start Command** | `pnpm start` |
| **Instance Type** | Free |

5. **「Environment Variables」** に以下を追加：

| 変数名 | 値 |
|--------|-----|
| `DATAFORSEO_LOGIN` | DataForSEOのログインメール |
| `DATAFORSEO_PASSWORD` | DataForSEOのパスワード |
| `GOOGLE_API_KEY` | Google PageSpeed APIキー |
| `NODE_ENV` | production |

6. **「Create Web Service」** をクリック
7. デプロイ完了後、発行されたURLをメモ（例: `https://competitor-analysis-api.onrender.com`）

---

## STEP 3: フロントエンドをビルド

ローカルPC（またはManus内）でWebビルドを実行します。

### 3-1. 依存パッケージのインストール

```bash
cd competitor_analysis_app
npm install -g pnpm
pnpm install
```

### 3-2. 環境変数ファイルを作成

プロジェクトルートに `.env.production` ファイルを作成：

```
EXPO_PUBLIC_API_BASE_URL=https://competitor-analysis-api.onrender.com
```

> ※ STEP 2-7 でメモしたRenderのURLを入力してください

### 3-3. Webビルドを実行

```bash
npx expo export --platform web
```

ビルドが完了すると **`dist/`** フォルダが生成されます。

### 3-4. リダイレクト設定ファイルを追加

`dist/` フォルダ内に `_redirects` ファイルを作成（拡張子なし）：

```
/*  /index.html  200
```

> ※ これがないとページ更新時に404エラーになります

---

## STEP 4: Netlify にデプロイ

### 方法A: ドラッグ＆ドロップ（最も簡単）

1. [app.netlify.com](https://app.netlify.com) にアクセスしてアカウント作成（無料）
2. ログイン後、**「Sites」** タブを開く
3. 画面下部の **「Deploy manually」** エリアに `dist/` フォルダをドラッグ＆ドロップ
4. 数秒でデプロイ完了。URLが発行されます（例: `https://amazing-app-123.netlify.app`）

### 方法B: Netlify CLI（コマンドライン）

```bash
# Netlify CLIをインストール
npm install -g netlify-cli

# ログイン
netlify login

# デプロイ
netlify deploy --prod --dir dist
```

---

## STEP 5: 動作確認

1. Netlifyから発行されたURLをブラウザで開く
2. ダッシュボードが表示されることを確認
3. サイトを追加して **「全サイト更新」** を押し、データが取得できることを確認

---

## よくある問題

| 症状 | 原因 | 解決方法 |
|------|------|---------|
| ページ更新で404 | `_redirects`ファイルがない | `dist/_redirects`を作成 |
| 「全サイト更新」でエラー | `EXPO_PUBLIC_API_BASE_URL`が未設定 | `.env.production`を確認してリビルド |
| Renderが起動しない | Build Commandが間違っている | Renderのログを確認 |
| APIキーエラー | Renderの環境変数が未設定 | Render Dashboard → Environment で確認 |

---

## Render.com 無料プランの注意点

Renderの無料プランは **15分間アクセスがないとサーバーがスリープ**します。
スリープ後の最初のリクエストは30秒ほど待つ場合があります。
頻繁に使う場合は有料プラン（$7/月）への移行をご検討ください。

---

## まとめ

```
ユーザー
  ↓ ブラウザでアクセス
Netlify（フロントエンド）
  ↓ APIリクエスト
Render.com（バックエンド）
  ↓ 外部API呼び出し
DataForSEO / Google PageSpeed
```

デプロイ後のURLをご友人に共有するだけで、アプリのインストール不要でご利用いただけます。
