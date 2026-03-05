# 競合分析アプリ - Netlify デプロイガイド

本ガイドでは、競合分析アプリのWeb版をNetlifyに恒久的にデプロイし、誰でもブラウザからアクセスできるようにする手順を説明します。

---

## 前提条件

デプロイを始める前に、以下を準備してください。

| 必要なもの | 説明 |
|-----------|------|
| **Netlifyアカウント** | [netlify.com](https://www.netlify.com/) で無料登録 |
| **Node.js 22以上** | [nodejs.org](https://nodejs.org/) からインストール |
| **pnpm** | `npm install -g pnpm` でインストール |
| **プロジェクトファイル** | Management UIの「Code」パネルからZIPダウンロード |

---

## 重要な注意事項

このアプリは**フロントエンド（Expo Web）**と**バックエンドサーバー（Express + tRPC）**の2つで構成されています。Netlifyは静的サイトホスティングのため、**フロントエンドのみ**をデプロイします。

バックエンドが必要な機能（DataForSEO APIによるライブデータ取得、競合サイト自動検出など）を使う場合は、バックエンドサーバーを別途ホスティングする必要があります。ただし、**プリセットデータによるダッシュボード表示、チャート、CSV/HTMLレポート出力はフロントエンドのみで動作します。**

| 機能 | フロントエンドのみで動作 | バックエンド必要 |
|------|:---:|:---:|
| プリセットデータのダッシュボード表示 | ○ | - |
| 全チャート・グラフ表示 | ○ | - |
| CSV/HTMLレポート出力 | ○ | - |
| サイトの追加・削除（ローカル保存） | ○ | - |
| キーワードフィルタリング | ○ | - |
| DataForSEO ライブデータ取得 | - | ○ |
| Google PageSpeed 分析 | - | ○ |
| 競合サイト自動検出 | - | ○ |

---

## 手順1: プロジェクトファイルのダウンロード

1. Manusの画面右側のManagement UIを開く
2. **「Code」パネル** を選択
3. **「Download all files」** をクリックしてZIPファイルをダウンロード
4. ダウンロードしたZIPを任意のフォルダに展開

---

## 手順2: 依存パッケージのインストール

ターミナル（コマンドプロンプト）を開き、展開したフォルダに移動して依存パッケージをインストールします。

```bash
cd /path/to/competitor_analysis_app
pnpm install
```

---

## 手順3: Webビルドの実行

Expo Webのビルドを実行して、静的ファイルを生成します。

```bash
npx expo export --platform web
```

ビルドが成功すると、`dist/` フォルダに静的ファイル（HTML、JS、CSS、画像など）が生成されます。

---

## 手順4: Netlifyへのデプロイ

デプロイ方法は2つあります。お好みの方法を選んでください。

### 方法A: Netlify CLIを使う（おすすめ）

Netlify CLIをインストールしてデプロイします。

```bash
# Netlify CLIのインストール
npm install -g netlify-cli

# Netlifyにログイン（ブラウザが開きます）
netlify login

# 新しいサイトを作成してデプロイ
netlify deploy --dir=dist --prod
```

初回実行時に以下の質問が表示されます。

| 質問 | 回答 |
|------|------|
| What would you like to do? | **Create & configure a new site** を選択 |
| Team | 自分のチームを選択 |
| Site name | 任意の名前（例: `competitor-analysis`） |

デプロイ完了後、URLが表示されます（例: `https://competitor-analysis.netlify.app`）。

### 方法B: Netlify管理画面からドラッグ＆ドロップ

1. [app.netlify.com](https://app.netlify.com/) にログイン
2. **「Add new site」** → **「Deploy manually」** をクリック
3. ビルドで生成された **`dist/`フォルダ** をブラウザにドラッグ＆ドロップ
4. 数秒でデプロイが完了し、URLが発行されます

---

## 手順5: SPA（シングルページアプリ）のリダイレクト設定

Expo RouterはSPA（シングルページアプリケーション）として動作するため、Netlifyにリダイレクトルールを追加する必要があります。`dist/` フォルダ内に `_redirects` ファイルを作成してください。

```bash
echo "/*    /index.html   200" > dist/_redirects
```

この設定により、どのURLにアクセスしてもアプリが正しく表示されます。設定後、再度デプロイしてください。

```bash
# CLIの場合
netlify deploy --dir=dist --prod
```

> **ヒント:** 毎回手動で `_redirects` を作成するのが面倒な場合は、プロジェクトルートに `public/_redirects` ファイルを作成しておくと、ビルド時に自動的に `dist/` にコピーされます。

---

## 手順6: バックエンドサーバーの設定（オプション）

ライブデータ取得機能を使う場合は、バックエンドサーバーを別途ホスティングする必要があります。

### バックエンド対応のホスティングサービス

| サービス | 無料枠 | 特徴 |
|---------|--------|------|
| **[Railway](https://railway.app/)** | 月$5クレジット | Node.jsサーバーをそのままデプロイ可能 |
| **[Render](https://render.com/)** | 無料枠あり | Webサービスとして簡単にデプロイ |
| **[Fly.io](https://fly.io/)** | 無料枠あり | グローバル分散デプロイ対応 |

### バックエンドデプロイ時の環境変数

バックエンドサーバーには以下の環境変数を設定してください。

| 環境変数 | 説明 |
|---------|------|
| `DATAFORSEO_LOGIN` | DataForSEO APIのログインID |
| `DATAFORSEO_PASSWORD` | DataForSEO APIのパスワード |
| `GOOGLE_API_KEY` | Google PageSpeed Insights APIキー |
| `NODE_ENV` | `production` に設定 |

### フロントエンドからバックエンドへの接続

バックエンドをデプロイしたら、フロントエンド側でAPIのベースURLを設定します。Netlifyの環境変数設定画面で以下を追加してください。

| 環境変数 | 値の例 |
|---------|--------|
| `EXPO_PUBLIC_API_BASE_URL` | `https://your-backend.railway.app` |

設定後、Netlifyで再デプロイすると、ライブデータ取得機能が使えるようになります。

---

## トラブルシューティング

### ビルドエラーが発生する場合

```bash
# キャッシュをクリアしてから再ビルド
rm -rf node_modules/.cache
npx expo export --platform web --clear
```

### 画面が真っ白になる場合

`_redirects` ファイルが正しく設定されているか確認してください。また、ブラウザの開発者ツール（F12）でコンソールエラーを確認してください。

### APIが動作しない場合

フロントエンドのみのデプロイでは、バックエンドAPIは動作しません。プリセットデータによるダッシュボード表示は正常に動作しますが、ライブデータ取得にはバックエンドサーバーが必要です。

---

## まとめ

| ステップ | コマンド / 操作 |
|---------|----------------|
| 1. ダウンロード | Management UI → Code → Download all files |
| 2. インストール | `pnpm install` |
| 3. ビルド | `npx expo export --platform web` |
| 4. リダイレクト設定 | `echo "/*    /index.html   200" > dist/_redirects` |
| 5. デプロイ | `netlify deploy --dir=dist --prod` |

以上の手順で、ご友人にURLを共有するだけで競合分析アプリのWeb版を使ってもらえるようになります。
