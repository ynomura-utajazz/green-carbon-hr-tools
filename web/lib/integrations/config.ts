/**
 * 連携サービスの設定読み込み（サーバ専用）
 *
 * 各 integration が必要とする env を読み、未設定なら null を返す。
 * 呼び出し側で null チェック → デモ動作にフォールバック、というパターンで使う。
 */

// このファイルは process.env.* を直接読むのでサーバ環境専用。
// Client Component から import しないこと（その場合 env 値は undefined）。

export type SlackConfig = {
  botToken: string;
  signingSecret: string;
  appId?: string;
};

export type GoogleConfig = {
  clientId: string;
  clientSecret: string;
  workspaceDomain?: string;
};

export type FreeeConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  /** 永続化されたアクセストークン（サーバサイド DB or KV から復元） */
  accessToken?: string;
};

const required = (v: string | undefined): v is string =>
  typeof v === "string" && v.length > 0;

export function getSlackConfig(): SlackConfig | null {
  const botToken = process.env.SLACK_BOT_TOKEN;
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!required(botToken) || !required(signingSecret)) return null;
  return {
    botToken,
    signingSecret,
    appId: process.env.SLACK_APP_ID,
  };
}

export function getGoogleConfig(): GoogleConfig | null {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!required(clientId) || !required(clientSecret)) return null;
  return {
    clientId,
    clientSecret,
    workspaceDomain: process.env.GOOGLE_WORKSPACE_DOMAIN,
  };
}

export function getFreeeConfig(): FreeeConfig | null {
  const clientId = process.env.FREEE_CLIENT_ID;
  const clientSecret = process.env.FREEE_CLIENT_SECRET;
  const redirectUri = process.env.FREEE_REDIRECT_URI;
  if (!required(clientId) || !required(clientSecret) || !required(redirectUri)) return null;
  return {
    clientId,
    clientSecret,
    redirectUri,
    accessToken: process.env.FREEE_ACCESS_TOKEN, // 暫定。本番では DB 永続化
  };
}
