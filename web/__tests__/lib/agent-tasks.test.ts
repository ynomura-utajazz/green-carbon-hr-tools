import { describe, it, expect } from "vitest";
import {
  summarizeRuns, approveStep, DEMO_AGENT_RUNS,
  type AgentTaskRun,
} from "@/lib/ai/agent-tasks";

const NOW = new Date("2026-05-10T12:00:00Z");

const SAMPLE: AgentTaskRun[] = [
  {
    id: "r-ok",  kind: "candidate_research", title: "ok run",
    initiated_by: "u1", initiated_at: NOW.toISOString(), status: "ok",
    steps: [
      { seq: 1, description: "s1", status: "ok" },
      { seq: 2, description: "s2", status: "ok" },
    ],
    total_tokens: { input: 1_000, output: 500 },
  },
  {
    id: "r-paused", kind: "onboarding_kickoff", title: "paused run",
    initiated_by: "u2", initiated_at: NOW.toISOString(), status: "paused",
    steps: [
      { seq: 1, description: "s1", status: "ok" },
      { seq: 2, description: "s2 needs HR approval", status: "awaiting_approval" },
      { seq: 3, description: "s3", status: "pending" },
    ],
    total_tokens: { input: 800, output: 200 },
  },
  {
    id: "r-error", kind: "compile_brief", title: "error run",
    initiated_by: "u3", initiated_at: NOW.toISOString(), status: "error",
    steps: [
      { seq: 1, description: "s1", status: "ok" },
      { seq: 2, description: "s2", status: "error", error_message: "rate limit" },
    ],
    total_tokens: { input: 500, output: 300 },
  },
];

describe("summarizeRuns", () => {
  it("status 別カウント", () => {
    const s = summarizeRuns(SAMPLE);
    expect(s.total).toBe(3);
    expect(s.byStatus).toEqual({ queued: 0, running: 0, ok: 1, error: 1, paused: 1 });
  });

  it("awaiting_approval を持つ run の数を pendingApproval に", () => {
    expect(summarizeRuns(SAMPLE).pendingApproval).toBe(1);
  });

  it("token 合計（total_tokens 未設定の run はゼロ加算）", () => {
    const withMissing = [...SAMPLE, {
      ...SAMPLE[0], id: "r-no-tokens", total_tokens: undefined,
    }];
    const s = summarizeRuns(withMissing);
    expect(s.totalInputTokens).toBe(2_300);   // 1000 + 800 + 500
    expect(s.totalOutputTokens).toBe(1_000);  // 500 + 200 + 300
  });

  it("successRate = ok / (ok + error)（paused/running は分母外）", () => {
    expect(summarizeRuns(SAMPLE).successRate).toBeCloseTo(0.5, 5); // 1 / 2
  });

  it("確定状態が 0 件なら successRate=0（ゼロ除算しない）", () => {
    const onlyPaused: AgentTaskRun[] = [{ ...SAMPLE[1] }];
    expect(summarizeRuns(onlyPaused).successRate).toBe(0);
  });

  it("空配列でも壊れない", () => {
    const s = summarizeRuns([]);
    expect(s.total).toBe(0);
    expect(s.pendingApproval).toBe(0);
    expect(s.totalInputTokens).toBe(0);
    expect(s.successRate).toBe(0);
  });
});

describe("approveStep", () => {
  it("該当ステップを ok に倒し、finished_at を now にセット", () => {
    const r = approveStep(SAMPLE[1], 2, NOW);
    const target = r.steps.find((s) => s.seq === 2)!;
    expect(target.status).toBe("ok");
    expect(target.finished_at).toBe(NOW.toISOString());
  });

  it("唯一の awaiting_approval を承認すると親 run が paused→running に戻る", () => {
    const r = approveStep(SAMPLE[1], 2, NOW);
    expect(r.status).toBe("running");
  });

  it("他の awaiting_approval が残っていれば paused のまま", () => {
    const multi: AgentTaskRun = {
      ...SAMPLE[1],
      steps: [
        ...SAMPLE[1].steps,
        { seq: 4, description: "another approval", status: "awaiting_approval" },
      ],
    };
    expect(approveStep(multi, 2, NOW).status).toBe("paused");
  });

  it("存在しない seq を指定しても元の run を壊さない", () => {
    const r = approveStep(SAMPLE[0], 999, NOW);
    expect(r.steps).toEqual(SAMPLE[0].steps);
    expect(r.status).toBe(SAMPLE[0].status);
  });

  it("non-awaiting ステップは状態を変えない", () => {
    // SAMPLE[2] (error run) の seq=2 はすでに error
    const r = approveStep(SAMPLE[2], 2, NOW);
    const s2 = r.steps.find((s) => s.seq === 2)!;
    expect(s2.status).toBe("error");
  });
});

describe("DEMO_AGENT_RUNS の妥当性チェック", () => {
  it("status=paused の run には awaiting_approval ステップが 1 つ以上ある", () => {
    for (const r of DEMO_AGENT_RUNS) {
      if (r.status === "paused") {
        expect(r.steps.some((s) => s.status === "awaiting_approval")).toBe(true);
      }
    }
  });

  it("step.seq は run 内でユニーク", () => {
    for (const r of DEMO_AGENT_RUNS) {
      const seqs = r.steps.map((s) => s.seq);
      expect(new Set(seqs).size).toBe(seqs.length);
    }
  });

  it("status=error の run には少なくとも 1 つ error ステップがある", () => {
    for (const r of DEMO_AGENT_RUNS) {
      if (r.status === "error") {
        expect(r.steps.some((s) => s.status === "error")).toBe(true);
      }
    }
  });
});
