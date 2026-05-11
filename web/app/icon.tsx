/**
 * 192x192 のアプリアイコン（PNG ランタイム生成）。
 * Next.js 15 の ImageResponse でブランドカラーの "GC" モノグラムを描画。
 */

import { ImageResponse } from "next/og";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #15803d 0%, #16a34a 60%, #4ade80 100%)",
          color: "white",
          fontWeight: 800,
          fontSize: 96,
          letterSpacing: -6,
          fontFamily: "system-ui, sans-serif",
          borderRadius: 32,
        }}
      >
        GC
      </div>
    ),
    { ...size },
  );
}
