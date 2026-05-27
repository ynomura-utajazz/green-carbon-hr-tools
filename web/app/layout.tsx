import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { SwRegister } from "@/components/sw-register";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-noto-jp",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Green Carbon HR Tools",
    template: "%s | Green Carbon HR",
  },
  description: "採用・オンボーディング・評価・1on1・サーベイをワンプラットフォームで",
  // Next 15 はファイル規約（app/icon.tsx 等）から自動で metadata を組むので
  // icons プロパティ明示は不要。
  // manifest は public/manifest.json を直接配信（PWA validators / Chrome devtools が
  // /manifest.json を期待するケースがあるため静的ファイル化）。
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GC HR",
  },
  applicationName: "Green Carbon HR Tools",
  authors: [{ name: "Green Carbon Inc." }],
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#16a34a" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning className={`${inter.variable} ${notoJp.variable}`}>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
          <Toaster richColors position="top-right" closeButton />
          <SwRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
