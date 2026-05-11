# Green Carbon HR — モバイル

Expo（React Native）製の社員向けモバイルアプリ。

## できること（v0.1）

- **1on1**：今日の予定確認 + メモ作成 → Web 版の AI 議事録 → アクション抽出に転送
- **サーベイ**：パルスサーベイへの匿名回答（5 段階 × 5 問）
- **ウェルビーイング**：睡眠・ストレス・運動・ムードを 1 タップ記録

## セットアップ

```bash
cd mobile
npm install
npx expo start
```

`i` で iOS シミュレーター、`a` で Android、`w` で Web プレビュー。

実機で確認する場合は **Expo Go** アプリで QR コードを読み取り。

## API 接続

`app.json` の `extra.apiBaseUrl` に Web 版 Next.js のホストを指定。

ログインフローは Supabase Auth の `signInWithPassword` / マジックリンクを想定（実装は次フェーズ）。
トークンは `expo-secure-store` で iOS Keychain / Android Keystore に格納。

## ディレクトリ

- `app/` — expo-router のファイルベース ルート
- `lib/api.ts` — Web 版 API ラッパー（Authorization ヘッダ自動付与）
- `components/` — 再利用 UI（今後拡張）
- `assets/` — アイコン・スプラッシュ画像（要差し替え）

## 今後の拡張

- 音声入力（Web で実装済の Whisper API へ録音アップロード）
- プッシュ通知（1on1 リマインダー / サーベイ催促）
- オフライン対応（メモ・wellbeing 記録の SQLite キャッシュ）
- iOS / Android ネイティブビルド（EAS Build）
