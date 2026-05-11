# Green Carbon HR — dbt Data Lake

全 60 ツールのデータを Supabase の本体テーブルから集約し、
KPI を時系列で SQL 化するための dbt プロジェクト。

## セットアップ

```bash
pip install dbt-postgres
cd web/supabase/dbt
echo "SUPABASE_DB_PASSWORD=…" > .env
dbt deps
dbt compile
```

`~/.dbt/profiles.yml` に Supabase 接続を設定（`dbt_project.yml` 参照）。

## モデル構成

```
models/
├── staging/         # 生テーブルを正規化（view）
│   ├── stg_employees.sql
│   ├── stg_oneonones.sql
│   └── ... (各ツールの生データ)
├── marts/           # 経営 KPI（table、夜間 build）
│   ├── kpi_attrition_monthly.sql       # 月次離職率（TTM 込）
│   ├── kpi_engagement_by_dept.sql      # 部門別 mood + NPS
│   ├── kpi_recruiting_funnel.sql       # 経路 × ステージ CVR
│   ├── kpi_ai_usage_cost.sql           # AI コスト集計
│   ├── kpi_diversity_pipeline.sql      # 採用ファネル × ダイバーシティ
│   └── kpi_team_health_index.sql       # チーム健康度合成
└── sources.yml      # Supabase 本体テーブル定義
```

## 実行

```bash
dbt run                       # 全モデルを実行
dbt run --select kpi_+        # KPI モデルだけ
dbt test                      # テスト（unique / not_null 等）
dbt docs generate && dbt docs serve  # データカタログ閲覧
```

## 運用

- GitHub Actions で **毎日 03:00 JST** に `dbt run` を実行
- 失敗時は Slack `#data-alerts` チャンネルに通知
- マートは `marts.kpi_*` スキーマに保存され、Web アプリの `/admin/data-lake` から
  プレビューと SQL 実行ができる

## 推奨マートの追加候補（Phase 2）

| KPI | モデル名 | 目的 |
|---|---|---|
| 採用予算 ROI | `kpi_recruiting_roi_by_source.sql` | 経路別実コスト × 365 日 retention |
| OKR 達成度 | `kpi_okr_achievement_quarterly.sql` | 四半期 × 部門のグリッド |
| 学習進捗 | `kpi_learning_progress.sql` | スキルマトリクスの月次変化 |
| ウェルビーイング集約 | `kpi_wellbeing_aggregate.sql` | 部門 × 月（N≥5 で匿名化） |
| 報酬市場ポジション | `kpi_comp_position_drift.sql` | Lead/Match/Lag のグレード推移 |

## BI 連携

mart テーブルを Metabase / Looker / Superset から参照する想定。
本ツール内 `/admin/data-lake` でも基本的な可視化を提供。
