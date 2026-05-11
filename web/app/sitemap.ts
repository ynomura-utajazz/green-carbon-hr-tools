/**
 * /sitemap.xml — 検索エンジン向け。
 * 公開ルート（/careers）のみを含める。社内ツールは含めない。
 */

import type { MetadataRoute } from "next";
import { DEMO_POSITIONS } from "@/lib/demo/recruiting";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://green-carbon.inc";
  const open = DEMO_POSITIONS.filter((p) => p.is_open);
  const now = new Date();

  return [
    {
      url: `${base}/careers`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...open.map((p) => ({
      url: `${base}/careers/${p.id}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
