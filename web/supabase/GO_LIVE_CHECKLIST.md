# 本番切替（go-live）チェックリスト — DEMO→実データ

このドキュメントは、DEMO モックで動いている HR Tools を **実データ運用**に切り替える手順。
現状 `NEXT_PUBLIC_DEMO_MODE=true` のため、全ページがデモ表示。以下を順に実施すると
実データに切り替わる。**各ステップは村さん（本番書き込み権限）が実行する。**

---

## 前提

- コードは `isDemoMode()` 分岐済み：フラグ `true` の間はデモ表示のまま（＝いつデプロイしても安全）。
- フラグを `false` にした瞬間、変換済みページが実テーブルを読みに行く。
- 実テーブルが空／未作成でも、各ページは「空状態」を表示（偽データは出さない）。

---

## 手順

### 1. 本番スキーマを確認（読み取り専用）
Supabase SQL Editor で `supabase/diagnostics/check_prod_schema.sql` を実行。
- 対象テーブルの**存在**、参照カラムの**ドリフト**、RLS 有効／ポリシー数、行数を確認。
- 行が返らないテーブル＝本番未作成 → そのページは実データ化できない（下の 2 でスキーマ適用）。

### 2. 未適用マイグレーションを適用（順序厳守）
`supabase/migrations/` を古い順に。特に未適用の可能性が高いもの：
1. `20260508000001_initial_schema.sql` 以降のベーススキーマ（**未適用なら最優先**。health_checks / visa_records / surveys 等が無いのはこれが原因）
2. `20260723000001_fix_action_items_schema_drift.sql` — 1on1 の action_items ドリフト是正
3. `20260723000002_add_missing_rls_policies.sql` — **20テーブルの RLS SELECT ポリシー**（これが無いと RLS 経由で常時 0 件）
4. `20260723000003_talent_pool_table.sql` — talent-pool 用テーブル（任意）

> ⚠️ 2〜4 はいずれも「要レビュー」ドラフト。適用前に SQL の可視範囲（誰が何を見てよいか）を確認すること。特に給与・評価・健康・在留。

### 3. 実データを投入
各ツールで運用開始（アプリから入力）or インポート。空のままでも空状態で表示される。
- **採用（recruiting）**：公開応募フォーム（/api/public/apply）が candidates に書き込むので、応募が来れば自動で溜まる。
- **サーベイ（pulse / stress）**：下の「サーベイ構造の要件」に沿って surveys を作成しないと採点されない。

### 4. コードを main へマージ＋フラグ切替
1. `feat/supabase-keepalive-cron` を `main` へマージ（Vercel が本番デプロイ）。
2. Vercel の環境変数 `NEXT_PUBLIC_DEMO_MODE` を **`false`** に変更。
3. 再デプロイ。

### 5. 確認
hr_admin アカウントで各ページを開き、実データが表示されることを確認。空なら 2・3 を見直す。

---

## ページ別ステータス

| 系統 | ページ | 実データ化 | 備考／既知のギャップ |
|---|---|---|---|
| 採用 | recruiting | ✅ 完全 | 面接履歴/予定は candidate_events の payload 構造確定後。応募経路 source は自由文字列 |
| 採用 | talent-pool | ✅（要テーブル適用） | `talent_pool` テーブル（ドラフト）適用が前提。hr_admin のみ閲覧 |
| 労務 | attendance | ✅ 部分 | 休暇/残業/出勤は実。**有給取得率は付与日数マスタが無く空**。承認/却下は未永続化 |
| 労務 | health-check | ✅ 完全 | 法令チェック（compliance）タブは静的雛形のまま。健診予約日列が無く「未予約」は全件扱い |
| 労務 | visa | ✅ 完全 | visa_status は自由文字列（8種のラベルに一致する値統制が必要） |
| 労務 | stress-check | ✅ 採点実装 | 下記「サーベイ構造の要件」必須。**個人結果は非開示・集団分析のみ（法令準拠）** |
| エンゲージ | retention | ✅ 完全 | level/factors の enum・jsonb キーが型と一致していること |
| エンゲージ | value-award | ✅ 完全 | value_tag は 6 種の値統制が必要 |
| エンゲージ | pulse-survey | ✅ 採点実装 | 下記「サーベイ構造の要件」必須。trend/アクションは実データ源が無く空 |

---

## サーベイ構造の要件（pulse / stress を実データ化する場合）

採点は `surveys.questions` と `survey_responses.answers` の構造に依存する。以下を満たすこと：

- `surveys.questions` = `[{ id, text, kind, dimension, required }]`
  - `kind`: `scale_5` / `scale_10` / `enps` / `text` 等（**表記を厳密に**。`'scale'` 等だと集計対象外）
  - `dimension`:
    - pulse: `engagement` / `manager` / `career` / `compensation` / `work_life` / `psychological_safety` / `enablement` / `diversity`
    - stress: `job_demand` / `social_support` / `job_satisfaction` / `health_risk` / `consultation`（**4件法・素点1〜4**）
- `survey_responses.answers` = `{ "<question_id>": <value> }` または `[{ id, value }]`（どちらも可）
- **stress-check の識別**：`survey_type` enum に `'stress'` が無いため、暫定で **title に「ストレス」を含む**サーベイを対象とする。恒久対応は enum に `'stress'` を追加。

> stress-check の level 判定は**簡便法の目安**。正式な高ストレス者判定・面談要否は実施者/産業医が行う。

---

## 残タスク（実データ源／スキーマが必要）

- `slack_user_id` 列が employees に無い → Slack 連携（名簿同期・リマインド）が動かない
- action_plans テーブルが無い → pulse のアクションプランが空
- 月次トレンドの集計テーブルが無い → pulse の推移グラフが空
- 有給付与日数マスタが無い → attendance の有給取得率が空
- 休暇の承認/却下 API が無い → ボタンは toast のみ（未永続化）
