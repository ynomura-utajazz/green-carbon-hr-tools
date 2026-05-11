/**
 * /careers/[id]
 *
 * 求人詳細 + 応募フォーム。
 * SSG（is_open のポジションを generateStaticParams で生成）。
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Briefcase, Wallet } from "lucide-react";
import { DEMO_POSITIONS } from "@/lib/demo/recruiting";
import { ApplyForm } from "./apply-form";

export async function generateStaticParams() {
  return DEMO_POSITIONS.filter((p) => p.is_open).map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pos = DEMO_POSITIONS.find((p) => p.id === id);
  if (!pos) return { title: "求人 | Green Carbon" };
  return {
    title: `${pos.title} | Green Carbon`,
    description: pos.description,
    openGraph: {
      title: pos.title,
      description: pos.description,
      type: "website",
    },
  };
}

export default async function PositionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pos = DEMO_POSITIONS.find((p) => p.id === id && p.is_open);
  if (!pos) return notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: pos.title,
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
        addressLocality: pos.location,
        addressCountry: "JP",
      },
    },
    description: pos.description,
    skills: pos.required_skills.join(", "),
  };

  return (
    <>
      <script
        type="application/ld+json"
         
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="space-y-6">
        <Link
          href="/careers"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          求人一覧に戻る
        </Link>

        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="rounded-full bg-gc-50 px-2 py-0.5 text-gc-800">{pos.department}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{pos.level}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{pos.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{pos.location}</span>
            <span className="inline-flex items-center gap-1"><Briefcase className="size-3" />{pos.job_grade}</span>
            <span className="inline-flex items-center gap-1"><Wallet className="size-3" />年収応相談</span>
          </div>
        </header>

        <section className="rounded-xl border bg-card p-5 text-sm leading-relaxed">
          <p>{pos.description}</p>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border bg-card p-5">
            <h3 className="mb-2 text-sm font-semibold">必須スキル</h3>
            <ul className="space-y-1 text-sm">
              {pos.required_skills.map((s) => (
                <li key={s} className="flex items-start gap-2">
                  <span className="mt-1.5 size-1 rounded-full bg-gc-600" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          {pos.nice_to_have && pos.nice_to_have.length > 0 && (
            <div className="rounded-xl border bg-card p-5">
              <h3 className="mb-2 text-sm font-semibold">歓迎条件</h3>
              <ul className="space-y-1 text-sm">
                {pos.nice_to_have.map((s) => (
                  <li key={s} className="flex items-start gap-2">
                    <span className="mt-1.5 size-1 rounded-full bg-amber-500" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* 応募フォーム */}
        <section className="rounded-xl border bg-card p-5" id="apply">
          <h2 className="mb-1 text-lg font-bold">このポジションに応募する</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            まずはカジュアル面談からでも OK です。お気軽にご応募ください。
          </p>
          <ApplyForm positionId={pos.id} positionTitle={pos.title} />
        </section>
      </div>
    </>
  );
}
