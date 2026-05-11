/**
 * /careers/* — 公開ランディングのレイアウト。
 *
 * AppShell（ログイン後 UI）を経由せず、独立したシンプルレイアウトに。
 * SEO 最適化（OGP・JobPosting JSON-LD）も別途。
 */

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "採用情報 | Green Carbon",
  description:
    "Green Carbon は東南アジア最大級の自然資本（マングローブ・森林）からカーボンクレジットを生み出す気候テックスタートアップです。気候変動を「コードで」解決する仲間を募集中。",
  openGraph: {
    title: "採用情報 | Green Carbon",
    description: "気候テック × グローバル × 技術深耕。仲間を募集中。",
    type: "website",
    locale: "ja_JP",
    siteName: "Green Carbon Careers",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default function CareersLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gc-50/30 via-background to-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/careers" className="flex items-center gap-2 font-bold tracking-tight">
            <span className="flex size-7 items-center justify-center rounded-md bg-gc-700 text-white text-xs">GC</span>
            Green Carbon Careers
          </Link>
          <nav className="flex items-center gap-3 text-xs text-muted-foreground">
            <a href="https://green-carbon.inc" className="hover:text-foreground" target="_blank" rel="noopener noreferrer">
              会社サイト
            </a>
            <Link href="/careers" className="hover:text-foreground">求人一覧</Link>
            <Link href="/careers/track" className="hover:text-foreground">選考状況確認</Link>
            <Link href="/careers/feedback" className="hover:text-foreground">フィードバック</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      <footer className="border-t bg-muted/20 py-6">
        <div className="mx-auto max-w-5xl px-4 text-xs text-muted-foreground">
          © Green Carbon Inc. — 多様性を尊重し、性別・年齢・国籍による差別なく採用活動を行っています。
        </div>
      </footer>
    </div>
  );
}
