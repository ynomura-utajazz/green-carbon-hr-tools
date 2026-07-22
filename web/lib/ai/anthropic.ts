/**
 * Anthropic Messages API クライアント（fetch ベース、SDK 不要）。
 *
 * https://docs.anthropic.com/claude/reference/messages_post
 *
 * - ストリーミング（text/event-stream）と非ストリーミング両対応
 * - ANTHROPIC_API_KEY 未設定時は null を返し、呼び出し側でデモ応答にフォールバック
 */

// サーバ専用：API キーを直接使うので Client Component から呼ばないこと

const API = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

export type ClaudeModel =
  | "claude-sonnet-4-5"
  | "claude-haiku-4-5"
  | "claude-opus-4-8";

// temperature を受け付けないモデル（Opus 4.7/4.8 系は送ると 400）。
// 4.5 系（Sonnet/Haiku）は従来どおり temperature を送る。
const SAMPLING_UNSUPPORTED = new Set<string>(["claude-opus-4-8"]);

/** モデルに応じて temperature を含めた/除いたリクエストボディを組み立てる。 */
function buildBody(opts: GenerateOptions, extra: Record<string, unknown> = {}) {
  const model = opts.model ?? "claude-sonnet-4-5";
  const body: Record<string, unknown> = {
    model,
    max_tokens: opts.maxTokens ?? 1024,
    system: opts.system,
    messages: opts.messages,
    ...extra,
  };
  if (!SAMPLING_UNSUPPORTED.has(model)) {
    body.temperature = opts.temperature ?? 0.5;
  }
  return body;
}

export type Message = {
  role: "user" | "assistant";
  content: string;
};

export type GenerateOptions = {
  system: string;
  messages: Message[];
  model?: ClaudeModel;
  maxTokens?: number;
  temperature?: number;
};

export type GenerateResult =
  | { ok: true; text: string; stopReason: string; inputTokens: number; outputTokens: number }
  | { ok: false; error: string };

function getApiKey(): string | null {
  return process.env.ANTHROPIC_API_KEY ?? null;
}

export function isAnthropicConfigured(): boolean {
  return Boolean(getApiKey());
}

/** 非ストリーミング生成。要約系の短い出力に向いている。 */
export async function generate(opts: GenerateOptions): Promise<GenerateResult> {
  const key = getApiKey();
  if (!key) return { ok: false, error: "anthropic-not-configured" };

  const body = buildBody(opts);

  try {
    const res = await fetch(API, {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": API_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      return {
        ok: false,
        error: (j as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`,
      };
    }

    const j = (await res.json()) as {
      content: { type: string; text: string }[];
      stop_reason: string;
      usage: { input_tokens: number; output_tokens: number };
    };

    const text = j.content.filter((c) => c.type === "text").map((c) => c.text).join("");
    return {
      ok: true,
      text,
      stopReason: j.stop_reason,
      inputTokens: j.usage.input_tokens,
      outputTokens: j.usage.output_tokens,
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * SSE ストリーミング生成。長文や思考過程を逐次表示したいとき用。
 * 戻り値は ReadableStream で、各 chunk は `data: {...}\n\n` 形式。
 * クライアント側は EventSource もしくは fetch + getReader で読む。
 */
export async function generateStream(opts: GenerateOptions): Promise<Response | null> {
  const key = getApiKey();
  if (!key) return null;

  const body = buildBody(opts, { stream: true });

  return fetch(API, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": API_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
}
