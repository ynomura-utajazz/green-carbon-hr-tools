/**
 * /careers
 *
 * 公開求人一覧。is_open === true のポジションのみ表示。
 * Schema.org JobPosting JSON-LD を埋め込み Indeed/Google for Jobs に拾われやすく。
 */

import Link from "next/link";
import { ArrowRight, Sparkles, Globe2 } from "lucide-react";
import { DEMO_POSITIONS } from "@/lib/demo/recruiting";

export const dynamic = "force-static";

export default function CareersIndexPage() {
  const open = DEMO_POSITIONS.filter((p) => p.is_open);

  // Google for Jobs / 検索エンジン向け JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": open.map((p) => ({
      "@type": "JobPosting",
      title: p.title,
      datePosted: new Date().toISOString().slice(0, 10),
      validThrough: new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10),
      employmentType: "FULL_TIME",
      hiringOrganization: {
        "@type": "Organization",
        name: "Green Carbon Inc.",
        sameAs: "https://green-carbon.inc",
      },
      jobLocation: {
        "@type": "Place",
        address: {
          "@type": "PostalAddress",
          addressLocality: p.location,
          addressCountry: "JP",
        },
      },
      description: p.description,
      url: `https://green-carbon.inc/careers/${p.id}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
         
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="space-y-8">
        {/* ヒーロー */}
        <section className="space-y-3 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            気候変動を <span className="text-gc-700">コードで</span> 解決する。
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Green Carbon は東南アジア最大級の自然資本（マングローブ・森林）からカーボンクレジットを生み出す気候テックスタートアップです。
            日本・インドネシア・ベトナム・フィリピンなど 8 拠点、300 名規模のグローバルチームで、
            次の世代に自然を残すプロダクトを作っています。
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border bg-background px-3 py-1">🌱 ICVCM 認証準備中</span>
            <span className="rounded-full border bg-background px-3 py-1">🌐 8 ヶ国にメンバー</span>
            <span className="rounded-full border bg-background px-3 py-1">💚 全社リモート OK</span>
            <span className="rounded-full border bg-background px-3 py-1">📈 シリーズ B 完了</span>
          </div>
        </section>

        {/* 求人一覧 */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight">現在募集中のポジション</h2>
            <span className="text-xs text-muted-foreground tabular-nums">{open.length} 件</span>
          </div>

          {open.length === 0 ? (
            <div className="rounded-md border border-dashed p-12 text-center text-sm text-muted-foreground">
              現在募集中のポジションはありません。
              <br />
              <a href="https://green-carbon.inc" className="mt-2 inline-block text-gc-700 hover:underline">
                タレントプール登録はこちら
              </a>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {open.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/careers/${p.id}`}
                    className="group block rounded-xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-gc-400 hover:shadow-md"
                  >
                    <div className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                      <Sparkles className="size-3 text-gc-600" />
                      {p.department}
                      <span>·</span>
                      <Globe2 className="size-3" />
                      {p.location}
                    </div>
                    <h3 className="text-lg font-bold tracking-tight group-hover:text-gc-700">
                      {p.title}
                    </h3>
                    <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                      {p.description}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {p.required_skills.slice(0, 4).map((s) => (
                        <span key={s} className="rounded-full bg-muted px-2 py-0.5 text-[10px]">
                          {s}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-gc-700 opacity-0 transition-opacity group-hover:opacity-100">
                      詳細を見る
                      <ArrowRight className="size-3.5" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 自己応募導線 */}
        <section className="rounded-xl border bg-gc-50/40 p-6 text-center">
          <h2 className="text-base font-bold">該当するポジションがない場合</h2>
          <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground leading-relaxed">
            あなたのスキルが活きそうなロールが今は無くても、未来のために繋がりたいです。
            プロフィールを送ってください。新しいポジションが生まれた時にご連絡します。
          </p>
          <Link
            href="/careers/talent-pool-apply"
            className="mt-3 inline-flex items-center gap-1 rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent"
          >
            タレントプールに登録 →
          </Link>
        </section>
      </div>
    </>
  );
}
