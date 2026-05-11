/**
 * 512x512 のアプリアイコン（PWA Maskable 対応）。
 * Maskable 仕様：周囲 10% を safe-zone として保つ。
 */

import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#16a34a",
          color: "white",
        }}
      >
        <div
          style={{
            width: "78%",
            height: "78%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #15803d 0%, #16a34a 60%, #4ade80 100%)",
            color: "white",
            fontWeight: 800,
            fontSize: 220,
            letterSpacing: -16,
            fontFamily: "system-ui, sans-serif",
            borderRadius: 64,
          }}
        >
          GC
        </div>
      </div>
    ),
    { width: 512, height: 512 },
  );
}
