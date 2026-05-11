"use client";

/**
 * ブラウザ録音 + Whisper API 書き起こし。
 *
 * 使い方：
 *   <VoiceRecorder onTranscript={(text) => setNotes((n) => n + "\n" + text)} />
 *
 * 動作：
 *  1. Mic 許可 → MediaRecorder で webm 録音
 *  2. 停止時に audio Blob を /api/ai/transcribe に POST
 *  3. 戻り値の text を onTranscript に渡す
 *
 * ブラウザ要件：MediaRecorder + webm 対応（Chrome/Edge/Safari 14+）。
 */

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  onTranscript: (text: string) => void;
  /** 言語ヒント（例: "ja"） */
  language?: string;
};

type State =
  | { kind: "idle" }
  | { kind: "recording"; startedAt: number }
  | { kind: "transcribing" }
  | { kind: "error"; message: string };

export function VoiceRecorder({ onTranscript, language = "ja" }: Props) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // 録音中の秒数表示
  useEffect(() => {
    if (state.kind !== "recording") return;
    const id = setInterval(() => {
      setSeconds(Math.floor((Date.now() - state.startedAt) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [state]);

  const start = async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setState({ kind: "error", message: "このブラウザは録音をサポートしていません" });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime });
        await transcribe(blob);
      };
      recorder.start();
      recorderRef.current = recorder;
      setSeconds(0);
      setState({ kind: "recording", startedAt: Date.now() });
    } catch (e) {
      setState({ kind: "error", message: `マイクへのアクセスを許可してください: ${(e as Error).message}` });
    }
  };

  const stop = () => {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
      setState({ kind: "transcribing" });
    }
  };

  const transcribe = async (blob: Blob) => {
    try {
      const form = new FormData();
      form.append("audio", blob, "recording.webm");
      if (language) form.append("language", language);
      const res = await fetch("/api/ai/transcribe", { method: "POST", body: form });
      const json = (await res.json()) as
        | { ok: true; text: string; demo?: boolean }
        | { ok: false; error: string };
      if (json.ok) {
        onTranscript(json.text);
        setState({ kind: "idle" });
      } else {
        setState({ kind: "error", message: json.error });
      }
    } catch (e) {
      setState({ kind: "error", message: (e as Error).message });
    }
  };

  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="flex items-center gap-2">
        {state.kind === "idle" && (
          <Button onClick={() => void start()} size="sm" variant="outline" className="h-8 gap-1.5 px-3">
            <Mic className="size-3.5" />
            録音開始
          </Button>
        )}
        {state.kind === "recording" && (
          <>
            <Button onClick={stop} size="sm" className="h-8 gap-1.5 px-3 bg-red-600 hover:bg-red-700">
              <Square className="size-3.5 fill-current" />
              停止
            </Button>
            <span className="inline-flex items-center gap-1.5 text-sm">
              <span className="size-2 animate-pulse rounded-full bg-red-600" />
              録音中
              <span className="font-mono tabular-nums text-muted-foreground">
                {String(Math.floor(seconds / 60)).padStart(2, "0")}:
                {String(seconds % 60).padStart(2, "0")}
              </span>
            </span>
          </>
        )}
        {state.kind === "transcribing" && (
          <span className="inline-flex items-center gap-1.5 text-sm text-gc-700">
            <Loader2 className="size-3.5 animate-spin" />
            音声をテキスト化中...
          </span>
        )}
      </div>
      {state.kind === "error" && (
        <div className="mt-2 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <span>{state.message}</span>
        </div>
      )}
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        Whisper API で日本語書き起こし。録音は保存されず、Whisper にのみ送信されます。
      </p>
    </div>
  );
}
