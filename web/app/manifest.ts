/**
 * Web App Manifest（PWA）。
 *
 * これだけで「ホーム画面に追加」「スタンドアロンウィンドウで起動」
 * が機能するようになる。オフライン対応はサービスワーカが必要だが、
 * 別途 public/sw.js を追加して連携させる想定（将来拡張）。
 */

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Green Carbon HR Tools",
    short_name: "GC HR",
    description: "Green Carbon の社内 HR 統合ツール（採用・1on1・労務・グローバル人事）",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#16a34a", // gc-600 相当（ブランドのグリーン）
    lang: "ja",
    orientation: "portrait-primary",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icon",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-large",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-large",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "1on1",
        url: "/oneonone",
        description: "今日の 1on1 を確認",
      },
      {
        name: "社員名簿",
        url: "/directory",
        description: "全社員を検索",
      },
      {
        name: "HR ダッシュボード",
        url: "/hr-dashboard",
        description: "経営層向け統合分析",
      },
    ],
  };
}
