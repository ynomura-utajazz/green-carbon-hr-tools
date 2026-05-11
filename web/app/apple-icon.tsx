/**
 * iOS のホーム画面に追加された時のアイコン（180x180 推奨）。
 * Apple は maskable を解さないので、角丸まで含めて完成形で描画する。
 */

import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          fontSize: 86,
          letterSpacing: -5,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        GC
      </div>
    ),
    { ...size },
  );
}
