import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // typedRoutes: 全ツール実装完了後に有効化（現状は未実装ページへの Link が多いため OFF）
  // 型チェックは別途 `npm run typecheck` (`tsc --noEmit`) で実施。
  // Next.js 15.5 内部ワーカーの runTypeCheck バグを避けるため build 時は無効化。
  typescript: { ignoreBuildErrors: true },
  // ESLint は CI で個別実行
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
