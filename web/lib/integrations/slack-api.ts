/**
 * Slack Web API クライアント（fetch ベース、SDK 不要）
 *
 * https://api.slack.com/methods
 *
 * Bot Token (xoxb-...) で動作。必要な OAuth scope:
 *   - chat:write           （DM・チャンネル投稿）
 *   - im:write             （DM チャンネル開設）
 *   - users:read           （ユーザー情報取得）
 *   - users:read.email     （email でルックアップ）
 *   - team:read            （ワークスペース情報・auth.test）
 */

// サーバ専用：BOT トークンを直接使うので Client Component から呼ばないこと。
import { resolveSlackBotToken } from "./token-resolver";
import type { SendDmInput, SendDmResult, ServiceStatus } from "./types";

const SLACK_API = "https://slack.com/api";

type SlackOk<T> = T & { ok: true };
type SlackErr = { ok: false; error: string };
type SlackResponse<T> = SlackOk<T> | SlackErr;

async function slackFetch<T>(
  method: string,
  body: Record<string, unknown> | null,
  token: string,
): Promise<SlackResponse<T>> {
  const init: RequestInit = {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  };
  const res = await fetch(`${SLACK_API}/${method}`, init);
  return (await res.json()) as SlackResponse<T>;
}

/**
 * ワークスペース接続テスト（auth.test）
 * DB 永続化トークン → env トークンの順で解決し、どちらも無ければ disconnected。
 */
export async function checkSlack(): Promise<ServiceStatus> {
  const base: Pick<ServiceStatus, "id" | "name" | "checkedAt"> = {
    id: "slack",
    name: "Slack",
    checkedAt: new Date().toISOString(),
  };
  const token = await resolveSlackBotToken();
  if (!token) return { ...base, status: "disconnected" };

  const t0 = Date.now();
  try {
    const r = await slackFetch<{ team: string; team_id: string; user: string }>(
      "auth.test",
      null,
      token,
    );
    const latencyMs = Date.now() - t0;
    if (!r.ok) return { ...base, status: "error", error: r.error, latencyMs };
    return {
      ...base,
      status: "connected",
      connectedAs: `${r.team}（@${r.user}）`,
      latencyMs,
    };
  } catch (e) {
    return { ...base, status: "error", error: (e as Error).message };
  }
}

/** email でユーザー検索 → Slack User ID を返す */
export async function lookupSlackUserByEmail(email: string): Promise<string | null> {
  const token = await resolveSlackBotToken();
  if (!token) return null;
  const r = await slackFetch<{ user: { id: string } }>(
    `users.lookupByEmail?email=${encodeURIComponent(email)}`,
    null,
    token,
  );
  return r.ok ? r.user.id : null;
}

/** DM チャンネルを開設（既存ならそれを返す） */
async function openDm(userId: string, token: string): Promise<string | null> {
  const r = await slackFetch<{ channel: { id: string } }>(
    "conversations.open",
    { users: userId },
    token,
  );
  return r.ok ? r.channel.id : null;
}

/**
 * DM 送信。slackUserId 優先、なければ email でルックアップ。
 * 設定なし／失敗時は { ok: false } を返すので、呼び出し側で URL ハック等にフォールバックする。
 */
export async function sendSlackDm(input: SendDmInput): Promise<SendDmResult> {
  const token = await resolveSlackBotToken();
  if (!token) return { ok: false, error: "slack-not-configured" };

  let userId = input.slackUserId ?? null;
  if (!userId && input.email) {
    userId = await lookupSlackUserByEmail(input.email);
  }
  if (!userId) return { ok: false, error: "user-not-found" };

  const channelId = await openDm(userId, token);
  if (!channelId) return { ok: false, error: "open-dm-failed" };

  const r = await slackFetch<{ ts: string }>(
    "chat.postMessage",
    {
      channel: channelId,
      text: input.text,
      ...(input.blocks ? { blocks: input.blocks } : {}),
    },
    token,
  );
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, channelId, ts: r.ts };
}

/** チャンネルへ投稿（#hr-announce など） */
export async function postToChannel(
  channel: string,
  text: string,
  blocks?: unknown[],
): Promise<SendDmResult> {
  const token = await resolveSlackBotToken();
  if (!token) return { ok: false, error: "slack-not-configured" };
  const r = await slackFetch<{ ts: string; channel: string }>(
    "chat.postMessage",
    { channel, text, ...(blocks ? { blocks } : {}) },
    token,
  );
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, channelId: r.channel, ts: r.ts };
}
