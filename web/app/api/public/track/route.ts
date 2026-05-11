/**
 * POST /api/public/track
 *
 * Body: { application_id: string, email: string }
 *
 * 候補者本人が選考状況を見るための照会エンドポイント。
 * 応募 ID + 登録メールが一致した時だけステータスを返す（簡易認証）。
 *
 * 本番ではマジックリンク（メールに OTP）を推奨。デモは email 直接突合。
 */

import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo/mock-data";
import { DEMO_CANDIDATES, DEMO_POSITIONS, STAGE_ORDER, STAGE_LABEL, type CandidateStage } from "@/lib/demo/recruiting";
import { DEMO_EMPLOYEES } from "@/lib/demo/employees";
import { createServiceClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { application_id?: string; email?: string };

export type TrackResponse = {
  ok: true;
  candidate: {
    full_name: string;
    position_title: string;
    current_stage: CandidateStage;
    stage_label: string;
    /** 0..1 */
    progress: number;
    next_step: string;
    interviews: { round: number; scheduled_at?: string; status: string }[];
    contact_name?: string;
    contact_email?: string;
    last_update: string;
    timeline: { stage: CandidateStage; reached: boolean; current: boolean }[];
  };
};

const NEXT_STEP_HINTS: Partial<Record<CandidateStage, string>> = {
  applied:     "書類選考中です。3 営業日以内に結果をお知らせします。",
  screening:   "書類選考結果を確認中です。担当者からご連絡します。",
  interview_1: "1 次面接が予定されています。詳細はメールをご確認ください。",
  interview_2: "2 次面接フェーズです。担当からスケジュール調整のご連絡が届きます。",
  final:       "最終面接フェーズです。経営層との面談を準備中です。",
  offer:       "条件提示の準備を進めています。詳細メールをお待ちください。",
  hired:       "採用決定 🎉 オンボーディング担当からまもなくご連絡します。",
  rejected:    "今回はご縁がないとの判断となりました。今後ともお願いいたします。",
  withdrawn:   "ご辞退として処理いたしました。",
};

function buildTimeline(current: CandidateStage) {
  const idx = STAGE_ORDER.indexOf(current);
  return STAGE_ORDER
    .filter((s) => !["rejected", "withdrawn"].includes(s))
    .map((s) => {
      const i = STAGE_ORDER.indexOf(s);
      return {
        stage: s,
        reached: i <= idx,
        current: i === idx,
      };
    });
}

export async function POST(req: Request) {
  let body: Body;
  try { body = (await req.json()) as Body; }
  catch { return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 }); }

  if (!body.application_id || !body.email) {
    return NextResponse.json({ ok: false, error: "missing-fields" }, { status: 400 });
  }

  const norm = body.email.trim().toLowerCase();

  // ── デモ照合 ────────────────────────────────
  if (isDemoMode()) {
    // デモでは demo- prefix の応募 ID または既存 cand-N のどちらでも返す
    let cand = DEMO_CANDIDATES.find((c) => c.id === body.application_id);
    if (!cand && body.application_id?.startsWith("demo-")) {
      // demo 応募の場合は適当な候補者を返す（デモ性向上のため）
      cand = DEMO_CANDIDATES[0];
    }
    if (!cand) {
      return NextResponse.json({ ok: false, error: "応募 ID が見つかりません" }, { status: 404 });
    }
    if (cand.email.toLowerCase() !== norm && !body.application_id?.startsWith("demo-")) {
      return NextResponse.json({ ok: false, error: "メールアドレスが一致しません" }, { status: 401 });
    }

    const pos = DEMO_POSITIONS.find((p) => p.id === cand.position_id);
    const stageIdx = STAGE_ORDER.indexOf(cand.stage);
    const progress = stageIdx / Math.max(1, STAGE_ORDER.length - 3);
    const owner = DEMO_EMPLOYEES.find((e) => e.id === "e6"); // 塚本リクルーター

    const resp: TrackResponse = {
      ok: true,
      candidate: {
        full_name: cand.full_name,
        position_title: pos?.title ?? "—",
        current_stage: cand.stage,
        stage_label: STAGE_LABEL[cand.stage] ?? cand.stage,
        progress: Math.min(1, Math.max(0, progress)),
        next_step: NEXT_STEP_HINTS[cand.stage] ?? "担当者にお問い合わせください。",
        interviews: [], // demo: 簡略化
        contact_name: owner?.full_name,
        contact_email: owner?.email,
        last_update: cand.updated_at,
        timeline: buildTimeline(cand.stage),
      },
    };
    return NextResponse.json(resp);
  }

  // ── 本番：DB 照合 ───────────────────────────
  const sb = createServiceClient();
  if (!sb) return NextResponse.json({ ok: false, error: "service-unavailable" }, { status: 503 });

  const { data, error } = await sb
    .from("candidates")
    .select("id, full_name, email, stage, position_id, updated_at")
    .eq("id", body.application_id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: "応募 ID が見つかりません" }, { status: 404 });
  }
  if ((data.email as string).toLowerCase() !== norm) {
    return NextResponse.json({ ok: false, error: "メールアドレスが一致しません" }, { status: 401 });
  }

  const stage = data.stage as CandidateStage;
  const stageIdx = STAGE_ORDER.indexOf(stage);
  const progress = stageIdx / Math.max(1, STAGE_ORDER.length - 3);

  const resp: TrackResponse = {
    ok: true,
    candidate: {
      full_name: data.full_name as string,
      position_title: "—", // join 省略（必要なら追加）
      current_stage: stage,
      stage_label: STAGE_LABEL[stage] ?? stage,
      progress: Math.min(1, Math.max(0, progress)),
      next_step: NEXT_STEP_HINTS[stage] ?? "担当者にお問い合わせください。",
      interviews: [],
      last_update: data.updated_at as string,
      timeline: buildTimeline(stage),
    },
  };
  return NextResponse.json(resp);
}
