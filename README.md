# 🌿 Green Carbon HRツールパッケージ

Green Carbon の人事業務を支援するWebベースのHRツール集です。
バックエンド不要のHTMLツールとして動作し、Vercelに静的サイトとしてデプロイできます。

## 📦 パッケージ構成

```
gc_package/
├── index.html                    # メインランチャー
├── package-info.html             # パッケージ情報・ツール一覧
├── vercel.json                   # Vercel設定
├── README.md                     # このファイル
├── tools/
│   ├── gc_recruiting.html        # 採用管理（ローカル版）
│   ├── gc_recruiting_backend.html # 採用管理（GASバックエンド版）
│   ├── retention_risk_monitor.html # 離職リスクモニター
│   ├── oneonone_manager.html     # 1on1マネージャー
│   ├── onboarding_checklist.html # オンボーディングチェックリスト
│   ├── offer_letter_generator.html # オファーレター生成
│   ├── gc_wiki.html              # 社内Wiki
│   ├── gc_hr_portal.html         # HRポータル（ダッシュボード）
│   ├── gc_directory.html         # 社員名簿
│   └── gc_orgchart.html          # 組織図
└── guides/
    ├── backend_setup_guide.html  # GASバックエンドセットアップガイド
    └── deploy_guide.html         # Vercelデプロイガイド
```

## 🚀 デプロイ方法

### 最速（ドラッグ&ドロップ）
1. [vercel.com/new](https://vercel.com/new) を開く
2. `gc_package` フォルダをドラッグ
3. プロジェクト名を入力して Deploy

### GitHub連携（推奨）
```bash
cd gc_package
git init && git add . && git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_ORG/gc-hr-tools.git
git push -u origin main
```
→ Vercelでリポジトリをインポートするだけで自動デプロイ

### Vercel CLI
```bash
npm install -g vercel
cd gc_package
vercel --prod
```

## 💾 データ保存について

| モード | 保存先 | チーム共有 |
|--------|--------|----------|
| ローカルモード（標準） | ブラウザのlocalStorage | ❌ 個人のみ |
| GASバックエンド接続後 | Google Sheets | ✅ チーム全員 |

チーム共有には `gc_recruiting_backend.html` + GASバックエンドのセットアップが必要です。
→ [GASセットアップガイド](./guides/backend_setup_guide.html)

## 🛠️ 技術スタック

- **フロントエンド**: Pure HTML/CSS/JavaScript（フレームワーク不要）
- **データ**: localStorage（ローカル）/ Google Sheets via GAS（チーム共有）
- **ホスティング**: Vercel（静的サイト）
- **外部依存**: なし（CDN不使用、完全オフライン動作可）

## 📞 サポート

担当: 野村 裕太 (y.nomura@green-carbon.inc)
