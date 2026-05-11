/**
 * 連携サービスのセットアップ状態（env / DB）を一覧化する。
 * /admin/integrations のチェックリスト表示用。
 */

import { getFreeeConfig, getGoogleConfig, getSlackConfig } from "./config";
import { isServiceClientAvailable } from "@/lib/supabase/admin";

export type EnvCheckItem = {
  key: string;
  label: string;
  required: boolean;
  ok: boolean;
  hint?: string;
};

export type ServiceEnvCheck = {
  service: "supabase" | "slack" | "google" | "freee";
  name: string;
  /** サービス全体としての準備完了度 0–100 */
  readiness: number;
  items: EnvCheckItem[];
};

const has = (k: string) => Boolean(process.env[k]);

export function checkAllEnv(): ServiceEnvCheck[] {
  const _slackCfg = getSlackConfig();
  const googleCfg = getGoogleConfig();
  const freeeCfg = getFreeeConfig();
  const supaOk = isServiceClientAvailable();

  const supabase: ServiceEnvCheck = {
    service: "supabase",
    name: "Supabase（永続化基盤）",
    readiness: supaOk ? 100 : 0,
    items: [
      { key: "NEXT_PUBLIC_SUPABASE_URL", label: "Supabase URL", required: true, ok: has("NEXT_PUBLIC_SUPABASE_URL") },
      { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", label: "Supabase anon key", required: true, ok: has("NEXT_PUBLIC_SUPABASE_ANON_KEY") },
      { key: "SUPABASE_SERVICE_ROLE_KEY", label: "Service role key（OAuth トークン保存に必須）", required: true, ok: has("SUPABASE_SERVICE_ROLE_KEY") },
    ],
  };

  const slackItems: EnvCheckItem[] = [
    { key: "SLACK_CLIENT_ID", label: "OAuth Client ID（インストールフロー）", required: true, ok: has("SLACK_CLIENT_ID") || has("SLACK_APP_ID") },
    { key: "SLACK_CLIENT_SECRET", label: "OAuth Client Secret", required: true, ok: has("SLACK_CLIENT_SECRET") },
    { key: "SLACK_SIGNING_SECRET", label: "Signing Secret（Events API 検証）", required: true, ok: has("SLACK_SIGNING_SECRET") },
    { key: "SLACK_BOT_TOKEN", label: "Bot Token（OAuth 未使用時のフォールバック）", required: false, ok: has("SLACK_BOT_TOKEN") },
    { key: "SLACK_HR_ALERT_CHANNEL", label: "HR 通知チャンネル（team_join イベント受信先）", required: false, ok: has("SLACK_HR_ALERT_CHANNEL") },
  ];
  const slackReadyCount = slackItems.filter((i) => i.required && i.ok).length;
  const slackReqCount = slackItems.filter((i) => i.required).length;

  const slack: ServiceEnvCheck = {
    service: "slack",
    name: "Slack",
    readiness: Math.round((slackReadyCount / slackReqCount) * 100),
    items: slackItems,
  };

  const googleItems: EnvCheckItem[] = [
    { key: "GOOGLE_OAUTH_CLIENT_ID", label: "OAuth Client ID", required: true, ok: has("GOOGLE_OAUTH_CLIENT_ID") },
    { key: "GOOGLE_OAUTH_CLIENT_SECRET", label: "OAuth Client Secret", required: true, ok: has("GOOGLE_OAUTH_CLIENT_SECRET") },
    { key: "GOOGLE_WORKSPACE_DOMAIN", label: "ワークスペースドメイン（社外アカウント拒否）", required: false, ok: has("GOOGLE_WORKSPACE_DOMAIN") },
  ];
  const google: ServiceEnvCheck = {
    service: "google",
    name: "Google Workspace",
    readiness: googleCfg ? 100 : 0,
    items: googleItems,
  };

  const freeeItems: EnvCheckItem[] = [
    { key: "FREEE_CLIENT_ID", label: "OAuth Client ID", required: true, ok: has("FREEE_CLIENT_ID") },
    { key: "FREEE_CLIENT_SECRET", label: "OAuth Client Secret", required: true, ok: has("FREEE_CLIENT_SECRET") },
    { key: "FREEE_REDIRECT_URI", label: "Redirect URI", required: true, ok: has("FREEE_REDIRECT_URI") },
  ];
  const freee: ServiceEnvCheck = {
    service: "freee",
    name: "freee 人事労務",
    readiness: freeeCfg ? 100 : 0,
    items: freeeItems,
  };

  return [supabase, slack, google, freee];
}
