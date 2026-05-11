# 🌿 Green Carbon HR Tools v2

Green Carbon Inc. の社内向け統合 HR プラットフォーム。
旧静的HTML版（`/Users/yutanomura11/Desktop/green-carbon-hr-tools/`）から Next.js + Supabase へ全面移行する v2 です。

---

## 🛠️ 技術スタック

| 役割 | 採用技術 |
|---|---|
| フロント | **Next.js 15 (App Router) + React 19** |
| スタイル | **Tailwind CSS v4** + shadcn/ui (New York / OKLCH トークン) |
| DB / 認証 | **Supabase** (PostgreSQL + RLS + Auth) |
| SSO | **Google Workspace OAuth**（`@green-carbon.inc` ドメイン制限） |
| 状態管理 | TanStack Query + Server Components |
| トースト | sonner |
| グラフ | recharts |
| アイコン | lucide-react |
| i18n | next-intl（Phase 2 で本格対応） |
| ホスティング | Vercel |

## 📂 プロジェクト構成

```
web/
├── app/
│   ├── (app)/                  ← 認証必須エリア（middleware が自動ガード）
│   │   ├── layout.tsx          ← AppShell（サイドバー・ヘッダー・⌘K）
│   │   ├── page.tsx            ← トップ：ツールグリッド
│   │   └── portal/             ← HRポータル（最初の参考実装）
│   ├── login/                  ← ログイン（Google SSO）
│   ├── auth/callback/          ← OAuth コールバック
│   ├── auth/error/             ← OAuth エラー画面
│   ├── globals.css             ← Tailwind v4 + デザイントークン
│   └── layout.tsx              ← ルートレイアウト
├── components/
│   ├── ui/                     ← shadcn/ui プリミティブ
│   ├── app-shell.tsx           ← サイドバー＋トップバー
│   ├── command-palette.tsx     ← ⌘K コマンドパレット
│   └── tool-grid.tsx           ← トップページのカードグリッド
├── lib/
│   ├── supabase/
│   │   ├── client.ts           ← ブラウザ用
│   │   ├── server.ts           ← Server Components / Route Handlers 用
│   │   └── middleware.ts       ← セッション維持＆未認証リダイレクト
│   ├── tools.ts                ← 全ツールのレジストリ（一元管理）
│   └── utils.ts                ← cn / formatDate / initials 等
├── supabase/
│   └── migrations/
│       └── 20260508000001_initial_schema.sql   ← 初期スキーマ
├── middleware.ts               ← Auth ガード（要保護パスを自動判定）
├── next.config.ts
├── tsconfig.json
├── package.json
└── .env.example                ← 環境変数テンプレート
```

---

## 🚀 セットアップ手順

### 0. Node.js を入れる（未導入の場合）

このマシンには Node.js が入っていません。次のいずれかを：

- **公式インストーラ（推奨）**: https://nodejs.org/ja から **LTS (v22)** の `.pkg` を入れる
- **nvm**: `curl -o- https://raw.githubusercontent.com/nvm-sh/install.sh | bash` → `nvm install 22`

`node --version` が `v22.x` を返せばOK。

### 1. 依存パッケージをインストール

```bash
cd web
npm install
```

### 1.5. （任意）デモモードで先にUIだけ確認する

Supabase / Google OAuth セットアップ前に画面を見たいときは、`.env.local` に以下を入れて起動：

```bash
echo "NEXT_PUBLIC_DEMO_MODE=true" > .env.local
npm run dev
```

→ http://localhost:3000 を開くと、認証スキップ＋モックデータで全画面プレビュー可能。
画面上部に黄色の「🟡 デモモード中」バナーが出ます。本番デプロイ時は必ずこのフラグを外してください。

### 2. Supabase プロジェクトを作成

1. https://app.supabase.com で新規プロジェクト作成（リージョンは `Northeast Asia (Tokyo)` 推奨）
2. **Project Settings → API** から以下をコピー
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY`（サーバ側のみ）
3. **Authentication → Providers → Google** を有効化
   - `Authorized Client ID` と `Client Secret` は次のステップで取得

### 3. Google OAuth（Workspace SSO）を設定

1. https://console.cloud.google.com/apis/credentials へ
2. `OAuth 2.0 クライアントID` を作成（種別: Web アプリケーション）
3. **承認済みのリダイレクトURI** に以下を追加：
   - `https://<supabase-project-ref>.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback`（開発用）
   - `https://<your-vercel-domain>/auth/callback`（本番用）
4. `クライアントID` と `クライアントシークレット` を Supabase の Google プロバイダ設定に貼付け
5. Workspace 管理者でドメイン制限を実施: `Authentication → URL Configuration` で問題なし

### 4. DB スキーマを適用

```bash
# Supabase CLI をインストール（未インストールの場合）
npm install -g supabase

# プロジェクトとリンク
npx supabase link --project-ref <your-project-ref>

# マイグレーション適用
npx supabase db push
```

または Supabase ダッシュボードの **SQL Editor** で
`supabase/migrations/20260508000001_initial_schema.sql` の内容をそのまま実行してもOK。

### 5. 環境変数を設定

```bash
cp .env.example .env.local
# .env.local を開いて値を埋める
```

### 6. 開発サーバを起動

```bash
npm run dev
```

→ http://localhost:3000 を開く。未認証だと `/login` に飛ばされ、Google でログインすると `/` に戻ってきます。

### 7. 自分を社員レコードに登録

初回は `employees` テーブルが空なので、Supabase ダッシュボードの **Table Editor** から自分のレコードを追加してください：

```sql
insert into employees (organization_id, employee_code, email, full_name)
values (
  (select id from organizations limit 1),
  'GC001',
  'y.nomura@green-carbon.inc',
  '野村 裕太'
);

insert into employee_roles (employee_id, role)
select id, 'hr_admin' from employees where email = 'y.nomura@green-carbon.inc';
```

---

## 🗺️ 移行ロードマップ

**Phase 0 ✅** 旧HTML版の緊急パッチ（破損修正、認証ハッシュ化、カード統一）

**Phase 1 ✅** Next.js 15 + Tailwind v4 + Supabase スケルトン、認証フロー、AppShell

**Phase 2 ✅** 31 ツール 全 ready 化（demo モード で全画面動作）

| カテゴリ | 実装ツール |
|---|---|
| ダッシュボード | HRポータル / HRダッシュボード |
| 採用・入退社 | 採用管理 (ATS) / オファーレター生成 / オンボーディング / オフボーディング |
| 社員・組織 | 社員名簿 / 組織図 / アルムナイ管理 / 組織管理 |
| 契約・委託 | 業務委託管理 (+ 委託先セルフポータル) |
| 評価・人材戦略 | 1on1 / MBO×OKR / チーム管理 / リスク連動1on1 / サクセションプランニング |
| エンゲージメント | 離職リスク / パルスサーベイ / バリューアワード / 研修・スキル / 社内Wiki |
| 労務・コンプラ | 勤怠 / 在留資格 / 健康診断 / ストレスチェック / 資格・免許 / 海外赴任 |
| 報酬 | 給与帯 / 賞与 / ストックオプション |
| サポート | HRヘルプデスク / 目安箱 |

**Phase 3** 外部連携の API 接続化（現状は URL deep-link のみ）
- Slack Bot OAuth → 実 DM 送信・チャンネル投稿・サーベイ配信
- Google Calendar API → イベント作成・更新の自動化
- freee 人事労務 API → 社員マスタ・在留資格・給与の双方向同期

**Phase 4** 実データ移行
- Supabase プロジェクト作成・マイグレーション適用
- Google Workspace SSO 接続（@green-carbon.inc ドメイン制限）
- DEMO_MODE オフ → 実データで運用開始
- 初期データインポート（既存社員リスト・組織図・契約書）

**Phase 5** AI Copilot（Claude API）
- 離職リスクの自動分析・対応提案
- 1on1 メモから次回アジェンダを自動生成
- オファーレターの英訳・日訳
- サーベイ自由記述の自動カテゴリ化

**Phase 6** グローバル展開
- next-intl で UI を ja / en 対応
- 海外100名へロールアウト
- タイムゾーン対応

---

## 🔐 セキュリティ方針

- **全テーブルで RLS 有効**。`current_employee()` / `has_role()` ヘルパで参照権限制御
- **監査ログ** (`audit_logs`) に変更操作を記録
- **論理削除**（`deleted_at`）が基本。物理削除はサービスロールのみ
- **給与・健診** は HR 管理者と本人のみ参照可（RLS で制限）
- **Google Workspace ドメイン制限**: `@green-carbon.inc` 以外を `/auth/callback` で弾く

## 🤝 デプロイ

Vercel に新規プロジェクトを作成し、Root Directory を `web/` に設定。
環境変数は `.env.example` の項目を Vercel ダッシュボードで設定する。

旧静的サイトは現Vercelプロジェクトでそのまま運用継続可能。新サイトが安定したら旧プロジェクトをアーカイブする想定。

## 🧪 テスト

```bash
# 単体テスト（Vitest）
npm test                   # 一発実行
npm run test:watch         # watch モード
npm run test:coverage      # カバレッジ計測

# E2E（Playwright）
npx playwright install --with-deps chromium  # 初回のみ
npm run test:e2e           # 全 E2E（dev サーバ自動起動）
npm run test:e2e:ui        # 対話型 UI モード

# Visual regression（初回のみ：ベースライン作成）
npm run test:e2e -- --update-snapshots
git add e2e/visual.spec.ts-snapshots/
git commit -m "chore: visual baseline"
```

CI（GitHub Actions）：push/PR で typecheck → lint → test → build → e2e の順に実行。
失敗時は `playwright-report` artifact を確認。

## 🤖 AI Copilot 運用

- 環境変数 `ANTHROPIC_API_KEY` を設定すると 4 ユースケース（採用評価／1on1 議事録／離職介入／経営サマリ）が実 API モードで動作
- 未設定時はデモ応答（タイプライタ風 SSE 含む）が返る
- レート制限：env 上書き可能（`AI_LIMIT_PER_USER_HOUR` 等）。デフォルトは 1 人 100/h、全社 5000/日
- `/admin/ai-usage` でトークン消費・概算コスト・ユースケース別ランキングを可視化

## 📱 PWA

- `app/manifest.ts` で Web App Manifest を配信、`app/icon.tsx` 等で動的アイコン生成
- `public/sw.js` でナビゲーション network-first・静的アセット stale-while-revalidate・オフライン時 `/offline.html` 表示
- 本番ビルドのみ Service Worker 登録（dev は HMR 競合のためスキップ）

## 🚢 デプロイ pipeline（Vercel + Playwright）

PR を立てると自動で：
1. Vercel Preview にデプロイ
2. Preview URL に対して Playwright（home + 全ルート、デスクトップ + iPhone）を実行
3. PR コメントに ✅/❌ + Preview URL を投稿

必要な GitHub Secrets：
- `VERCEL_TOKEN` — Vercel CLI 用（[Vercel Account → Tokens](https://vercel.com/account/tokens) で発行）
- リポジトリを Vercel プロジェクトに紐づけ済み（`vercel link` 一度実行）

ファイル：
- `.github/workflows/preview.yml` — preview 用ワークフロー
- `web/playwright.preview.config.ts` — preview 専用 Playwright 設定（webServer 無し）
- `web/vercel.json` — SW・manifest のキャッシュ制御

## 🔐 管理者画面（/admin/*）

すべて HR 管理者のみアクセス可（RLS 設定済）。⌘K から検索可能：

| URL | 内容 |
|---|---|
| `/admin/integrations` | Slack / Google / freee の OAuth・Webhook 設定・接続状態 |
| `/admin/ai-usage` | Copilot のトークン消費・概算コスト・ユースケース別ランキング |
| `/admin/audit-log` | 操作履歴の閲覧、actor/action/resource で絞り込み、CSV エクスポート |
| `/admin/roles` | hr_admin / manager / executive / employee / readonly ロールの付与・剥奪 |

## 📞 連絡先

担当: 野村 裕太 (y.nomura@green-carbon.inc)
