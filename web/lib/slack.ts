/**
 * Slack ディープリンク／メッセージプリフィルのヘルパ。
 * デスクトップアプリ優先、Web フォールバック。
 *
 * 本番では Slack Bot OAuth でサーバ側から DM・チャンネル投稿を行う。
 * 現時点（demo）では URL ベースで「DMを開く」「チャンネルを開く」を提供し、
 * 「リマインダー送信」等の能動的アクションは toast でシミュレート。
 */

const TEAM_ID = process.env.NEXT_PUBLIC_SLACK_TEAM_ID ?? "T01GREENCARBON";

/** 個人 DM を開く（slack:// アプリ起動） */
export function slackDmUrl(slackUserId: string): string {
  return `slack://user?team=${TEAM_ID}&id=${slackUserId}`;
}

/** Web 版 Slack で DM を開く */
export function slackDmWebUrl(slackUserId: string): string {
  return `https://app.slack.com/client/${TEAM_ID}/${slackUserId}`;
}

/** チャンネルを開く */
export function slackChannelUrl(channelId: string): string {
  return `slack://channel?team=${TEAM_ID}&id=${channelId}`;
}

/**
 * Slack DM を開く（アプリ → 失敗時 Web）。クリックハンドラ用。
 * 既存ユーザーの slack:// が機能しない場合のフォールバックを内蔵。
 */
export function openSlackDm(slackUserId: string): void {
  if (typeof window === "undefined") return;
  const start = Date.now();
  window.location.href = slackDmUrl(slackUserId);
  setTimeout(() => {
    if (document.hasFocus() && Date.now() - start < 1500) {
      window.open(slackDmWebUrl(slackUserId), "_blank", "noopener,noreferrer");
    }
  }, 600);
}

/**
 * リマインダー DM 送信。
 *
 * 動作モード：
 *  1. Slack Bot 接続済み（env に SLACK_BOT_TOKEN）→ /api/integrations/slack/dm を叩いて
 *     サーバ側で chat.postMessage を実行。確実に届く。
 *  2. 未接続 or デモモード → URL ハック（クリップボード + slack:// 起動）にフォールバック。
 *
 * 戻り値: { delivered: boolean, mode: "api" | "fallback" }
 *  - delivered=true なら API で確実に送信済み
 *  - delivered=false でも mode="fallback" なら DM が UI で開いている
 */
export async function sendSlackReminder(
  slackUserId: string,
  message: string,
  email?: string,
): Promise<{ delivered: boolean; mode: "api" | "fallback"; error?: string }> {
  if (typeof window === "undefined") return { delivered: false, mode: "fallback" };

  // 1. API ルートにリクエスト（サーバ側で接続状態を判定）
  try {
    const res = await fetch("/api/integrations/slack/dm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slackUserId, email, text: message }),
    });
    const json = (await res.json()) as
      | { ok: true; channelId: string; ts: string }
      | { ok: false; fallback?: "url"; error?: string };

    if (json.ok) {
      return { delivered: true, mode: "api" };
    }
    // fallback: "url" が指定されていれば URL ハックへ
    if (json.fallback !== "url") {
      return { delivered: false, mode: "api", error: json.error };
    }
  } catch {
    /* fetch 失敗 → URL ハックへ */
  }

  // 2. URL フォールバック（既存実装）
  try {
    await navigator.clipboard.writeText(message);
  } catch {
    /* clipboard 権限なくても続行 */
  }
  openSlackDm(slackUserId);
  return { delivered: false, mode: "fallback" };
}
