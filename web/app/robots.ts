/**
 * /robots.txt — 公開ルートのみクロール許可。
 */

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://green-carbon.inc";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/careers", "/careers/*"],
        // 社内ツールはインデックス禁止
        disallow: [
          "/api/",
          "/admin/",
          "/portal",
          "/directory",
          "/oneonone",
          "/retention",
          "/hr-dashboard",
          "/recruiting",
          "/recruiting-strategy",
          "/recruiting-funnel",
          "/recruiting-referral",
          "/recruiting-kpi",
          "/recruiting-branding",
          "/talent-pool",
          "/interview-assistant",
          "/interview-calibration",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
