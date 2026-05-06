# GAS セットアップガイド
## Green Carbon HR Tools — スプレッドシート連携

所要時間: 約15分

---

## Step 1: Google スプレッドシートを作成

1. Google ドライブを開く
2. **「＋ 新規」→「Google スプレッドシート」** をクリック
3. ファイル名を「Green Carbon HR Tools DB」などに変更

---

## Step 2: Apps Script を設定

1. スプレッドシートのメニューから **「拡張機能」→「Apps Script」**
2. 左側の「ファイル」パネルで:
   - `コード.gs` を削除（または中身を全消し）
   - **「＋ ファイルを追加」→「スクリプト」** で以下2ファイルを作成:
     - `visa_manager` → `gas/visa_manager.gs` の内容を貼り付け
     - `freee_sync`   → `gas/freee_sync.gs` の内容を貼り付け

3. **「💾 保存」** をクリック

---

## Step 3: シートを初期化

1. Apps Script エディタで関数を `initSheets` に変更
2. **「▶ 実行」** をクリック
3. 初回は「権限の承認」ダイアログが表示される → 承認する
4. スプレッドシートに以下のシートが作成されることを確認:
   - `社員マスタ`
   - `書類ステータス`
   - `メモ`
   - `在留情報`

---

## Step 4: ウェブアプリとしてデプロイ

1. Apps Script エディタ右上の **「デプロイ」→「新しいデプロイ」**
2. ⚙️ アイコン → **「ウェブアプリ」** を選択
3. 設定:

| 項目 | 設定値 |
|------|--------|
| 説明 | Green Carbon HR Tools |
| 次のユーザーとして実行 | 自分 |
| アクセスできるユーザー | 全員 |

4. **「デプロイ」** をクリック
5. 表示された **ウェブアプリの URL** をコピー

---

## Step 5: HTML に URL を設定

`tools/visa_manager.html` を開き、上部の `GAS_URL` を編集:

```javascript
var GAS_URL = "https://script.google.com/macros/s/AKfycbxxxx/exec";
```

---

## Step 6: 動作確認

ブラウザで以下の URL にアクセスして `{"ok":true}` が返ることを確認:

```
https://script.google.com/macros/s/AKfycbxxxx/exec?action=ping
```

---

## CSV インポート 列名対応表

| ビザ管理の列 | freee 列名 | 一般的な列名 |
|------------|-----------|------------|
| 社員番号 | 従業員番号 | id |
| 氏名 | 表示名 | name |
| 国籍 | 国籍 | nationality |
| 部署 | 所属部門名 | department |
| 生年月日 | 生年月日 | birthday |
| 入社日 | 入社年月日 | entry_date |
| 在留資格 | 在留資格（在留カード記載） | residence_status |
| 在留カード番号 | 在留カード番号 | residence_card_number |
| 在留期限 | 在留期間の満了日 | date_of_expiration |

---

## トラブルシューティング

### 「承認が必要」エラー
→ Apps Script を再デプロイ（「既存のデプロイを管理」→ 新バージョンを作成）

### CORS エラー
→ デプロイ設定の「アクセスできるユーザー」が「全員」になっているか確認

### データが反映されない
→ 「デプロイを管理」→ 新しいバージョンとしてデプロイし直す
（コード変更後は必ず再デプロイが必要）

### 「このアプリは確認されていません」
→ 「詳細」→「安全でないページに移動」でアクセス可能
（社内利用のため問題なし）
