/**
 * Anthropic SSE → クライアント向け SSE への中継ヘルパ。
 *
 * Anthropic の `messages` API は streaming=true で SSE を返す。
 * 各イベント形式：
 *   event: content_block_delta
 *   data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"..."}}
 *
 * 我々は単純化して、フロントには
 *   data: {"text":"..."}\n\n     # 部分テキスト（差分）
 *   data: {"done":true,"usage":{...}}\n\n
 *   data: {"error":"..."}\n\n
 * の 3 種類だけを送る。
 */

export function createSseStream(upstream: Response): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      if (!upstream.ok || !upstream.body) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: `upstream-${upstream.status}` })}\n\n`,
          ),
        );
        controller.close();
        return;
      }

      const reader = upstream.body.getReader();
      let buffer = "";
      let inputTokens = 0;
      let outputTokens = 0;

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";

          for (const ev of events) {
            const dataLine = ev.split("\n").find((l) => l.startsWith("data: "));
            if (!dataLine) continue;
            const json = dataLine.slice("data: ".length).trim();
            if (json === "[DONE]") continue;

            try {
              const parsed = JSON.parse(json) as {
                type: string;
                delta?: { type: string; text?: string };
                message?: { usage?: { input_tokens: number } };
                usage?: { output_tokens: number };
              };

              if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
                const text = parsed.delta.text ?? "";
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text })}\n\n`),
                );
              } else if (parsed.type === "message_start") {
                inputTokens = parsed.message?.usage?.input_tokens ?? 0;
              } else if (parsed.type === "message_delta") {
                outputTokens = parsed.usage?.output_tokens ?? outputTokens;
              }
            } catch {
              /* malformed event ignore */
            }
          }
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ done: true, usage: { input: inputTokens, output: outputTokens } })}\n\n`,
          ),
        );
      } catch (e) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: (e as Error).message })}\n\n`),
        );
      } finally {
        controller.close();
      }
    },
  });
}

/** デモモード用の擬似ストリーム（テキストを 8〜30ms 間隔で吐き出す） */
export function createDemoStream(text: string, usage = { input: 200, output: 280 }): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const chunks = text.split(/(\s+)/); // 単語+空白で分割
      for (const c of chunks) {
        if (!c) continue;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: c })}\n\n`));
        await new Promise((r) => setTimeout(r, 12 + Math.random() * 18));
      }
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ done: true, demo: true, usage })}\n\n`),
      );
      controller.close();
    },
  });
}
