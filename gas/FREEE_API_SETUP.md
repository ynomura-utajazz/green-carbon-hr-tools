# freee API 連携セットアップガイド
## Green Carbon HR Tools — freee人事労務 直接連携

所要時間: 約20分

---

## 事前確認

- freee人事労務 の管理者権限があること
- GAS スクリプト (visa_manager.gs + freee_sync.gs) がデプロイ済みであること
- GAS のデプロイ URL をメモしておくこと  
  例: `https://script.google.com/macros/s/AKfycbxxxx/exec`

---

## Step 1: freee Developer Console でアプリを作成

1. https://app.secure.freee.co.jp/developers/applications を開く
2. **「新しいアプリケーション」** をクリック
3. 以下を入力:

| 項目 | 設定値 |
|------|--------|
| アプリ名 | Green Carbon HR Tools |
| アプリの種類 | **Webアプリ** |
| 利用用途 | 社内利用 |
| コールバックURL | GAS デプロイ URL（例: `https://script.google.com/macros/s/AKfycbxxxx/exec`） |

4. **「作成」** をクリック
5. 表示された **Client ID** と **Client Secret** をコピーしておく

---

## Step 2: GAS に認証情報を設定

1. Google スプレッドシートを開く
2. メニュー **「拡張機能」→「Apps Script」**
3. エディタ上部のコンソール（▶ 実行ボタン右側）で以下を実行:

```javascript
setFreeeCredentials("あなたのClientID", "あなたのClientSecret")
```

4. 「実行ログ」に `freee 認証情報を保存しました` が表示されることを確認

---

## Step 3: OAuth 認証を完了する

### 方法 A: ビザ管理ツールから認証
1. ビザ管理ツール (visa_manager.html) を開く
2. ヘッダーの **「📡 freee同期」** ボタンをクリック
3. モーダルで **「freee に接続する」** ボタンをクリック
4. freee ログイン画面が開く → freee の ID/パスワードでログイン
5. 「連携を許可する」をクリック
6. 「✅ freee 認証が完了しました」画面が表示されたらタブを閉じる
7. ビザ管理ツールに戻り、ステータスが「接続済み」になることを確認

### 方法 B: スプレッドシートメニューから認証
1. スプレッドシートのメニュー **「🛂 ビザ管理」→「freee 認証 URL を表示」**
2. 表示された URL をブラウザで開く
3. freee でログイン → 連携を許可
4. 「認証完了」画面が表示されたら完了

---

## Step 4: 初回同期を実行

### 方法 A: ビザ管理ツールから
1. **「📡 freee同期」** ボタンをクリック
2. **「今すぐ同期」** をクリック
3. 同期結果（外国籍社員数）が表示されることを確認

### 方法 B: スプレッドシートメニューから
1. **「🛂 ビザ管理」→「freee から今すぐ同期」**

---

## Step 5: 自動同期を設定（推奨）

毎日 AM 3:00 に freee から自動同期するトリガーを設定できます。

### 設定方法
スプレッドシートメニュー **「🛂 ビザ管理」→「freee 毎日自動同期 ON」**

または GAS エディタで:
```javascript
setupDailySync()
```

### 停止方法
**「🛂 ビザ管理」→「freee 毎日自動同期 OFF」**

---

## freee API フィールドマッピング

| freee フィールド | ビザ管理項目 | 備考 |
|--------------|-----------|------|
| `num` / `employee_num` | 社員番号 (ID) | GC-XXXX 形式に変換 |
| `last_name` + `first_name` | 氏名 | 全角スペースで結合 |
| `last_name_kana` + `first_name_kana` | 氏名カナ | |
| `department.name` | 部署 | |
| `job_title.name` | 役職 | |
| `email` | メールアドレス | |
| `birthday` | 生年月日 | |
| `entry_date` | 入社日 | |
| `nationality_code` | 国籍 | 国コード→表示名に変換 |
| `residence_card.residence_card_number` | 在留カード番号 | |
| `residence_card.residence_status` | 在留資格 | コード→表示名に変換 |
| `residence_card.date_of_expiration` | 在留期限 | |
| `residence_card.period_of_stay` | 在留期間 | |

**同期対象**: 国籍コードが JPN（日本）以外の社員のみ

---

## 注意事項

### freee API の権限スコープ
freee Developer Console でアプリを作成すると、デフォルトで人事労務の「読み取り」権限が付与されます。  
追加で「write」権限は不要です（ビザ管理ツールは freee への書き戻しをしません）。

### データの方向
```
freee人事労務 → (OAuth2 API) → GAS スプレッドシート → ビザ管理ツール
```
ビザ管理ツールで編集した在留資格・在留期限・書類ステータスは **freee には書き戻しません**。  
これらはビザ管理ツール（GASスプレッドシート）が管理します。

### API レート制限
freee API には1時間あたりのリクエスト制限があります。  
社員数が500名を超える場合は、同期間隔を長めに設定してください。

### トークンの有効期限
- アクセストークン: 24時間（自動リフレッシュ対応）
- リフレッシュトークン: 30日（期限切れの場合は再認証が必要）

---

## トラブルシューティング

### 「FREEE_CLIENT_ID が設定されていません」
→ Step 2 の `setFreeeCredentials()` を実行してください

### 「state 不一致」エラー
→ もう一度 `?action=freeeAuth` から認証をやり直してください

### 「トークンリフレッシュ失敗」
→ リフレッシュトークンの期限（30日）が切れています。再認証が必要です。  
→ Step 3 からやり直してください

### 社員が同期されない
→ freee の在留情報が未入力の可能性があります  
→ freee人事労務の社員マスタで「在留管理」情報を確認してください

### 同期はされるが国籍が空
→ freee側の `nationality_code` フィールドが未設定です  
→ freee人事労務でマスタを確認・更新してください

---

## セキュリティ

- Client Secret は GAS の PropertiesService（スクリプトプロパティ）に暗号化保存されます
- アクセストークン・リフレッシュトークンも同様に PropertiesService に保存されます
- スプレッドシートには保存されません
- GAS のスクリプトプロパティはスクリプトオーナーのみが閲覧できます
