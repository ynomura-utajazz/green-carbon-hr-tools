/**
 * Slack Events API のディスパッチ先ハンドラ群。
 *
 * すべて非同期、失敗しても event_callback の応答（200）は影響しない。
 * Slack は 3 秒以内に 2xx を返さないと再送するので、重い処理は queue に逃がすのが理想だが、
 * 現状は service_role ですぐ書けるため同期的に処理する（DB 1 回書きなら 100ms 以内）。
 */

import { createServiceClient } from "@/lib/supabase/admin";
import { deleteToken, getFirstToken } from "./token-store";
import { postToChannel } from "./slack-api";

type TeamJoinEvent = {
  type: "team_join";
  user: {
    id: string;
    team_id: string;
    name: string;
    real_name?: string;
    profile?: {
      email?: string;
      display_name?: string;
      image_192?: string;
      title?: string;
    };
  };
};

type UserChangeEvent = {
  type: "user_change";
  user: TeamJoinEvent["user"];
};

type AppUninstalledEvent = {
  type: "app_uninstalled";
  team_id?: string;
};

// ── handlers ───────────────────────────────────────────────────

/**
 * team_join: 新規ジョイナーを検知 → HR 通知チャンネルにアラート。
 * 既存 employees レコードと slack_user_id で照合し、未登録なら HR にハンドオフ。
 */
export async function handleTeamJoin(ev: TeamJoinEvent): Promise<void> {
  const sb = createServiceClient();
  if (!sb) return;

  const slackUserId = ev.user.id;
  const email = ev.user.profile?.email;
  const fullName = ev.user.real_name ?? ev.user.name;

  // 既存社員レコードがあるかチェック
  const { data: existing } = await sb
    .from("employees")
    .select("id, full_name")
    .or(
      [
        `slack_user_id.eq.${slackUserId}`,
        email ? `email.eq.${email}` : null,
      ].filter(Boolean).join(","),
    )
    .maybeSingle();

  if (existing) {
    // 既存レコード → slack_user_id を後追いでセット
    await sb
      .from("employees")
      .update({ slack_user_id: slackUserId })
      .eq("id", existing.id);
    return;
  }

  // 未登録 → HR 通知（環境変数 SLACK_HR_ALERT_CHANNEL があれば投稿）
  const hrChannel = process.env.SLACK_HR_ALERT_CHANNEL;
  if (hrChannel) {
    await postToChannel(
      hrChannel,
      `🆕 新しいメンバー <@${slackUserId}>（${fullName}${email ? ` / ${email}` : ""}）が Slack に参加しました。\n` +
        `名簿への登録とオンボーディング開始をお願いします。`,
    );
  }
}

/**
 * user_change: 名前・メール・アイコンが更新されたら employees に upsert。
 * 既存の slack_user_id がない場合はスキップ（team_join と二重処理を避ける）。
 */
export async function handleUserChange(ev: UserChangeEvent): Promise<void> {
  const sb = createServiceClient();
  if (!sb) return;

  const updates: Record<string, unknown> = {};
  if (ev.user.real_name) updates.full_name = ev.user.real_name;
  if (ev.user.profile?.email) updates.email = ev.user.profile.email;
  if (ev.user.profile?.image_192) updates.avatar_url = ev.user.profile.image_192;
  if (ev.user.profile?.title) updates.job_title = ev.user.profile.title;
  if (Object.keys(updates).length === 0) return;

  await sb
    .from("employees")
    .update(updates)
    .eq("slack_user_id", ev.user.id);
}

/**
 * app_uninstalled: 該当ワークスペースの bot トークンを削除。
 * これ以降はチェック関数が disconnected を返すようになる。
 */
export async function handleAppUninstalled(ev: AppUninstalledEvent): Promise<void> {
  if (!ev.team_id) {
    // team_id が無い場合は最新 1 件を消す（singleton 想定）
    const t = await getFirstToken("slack", "workspace");
    if (t) await deleteToken("slack", "workspace", t.owner_id);
    return;
  }
  await deleteToken("slack", "workspace", ev.team_id);
}
