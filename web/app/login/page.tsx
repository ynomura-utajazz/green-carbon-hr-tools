import { Suspense } from "react";
import { LoginButton } from "./login-button";
import { BrandMark } from "@/components/brand-mark";

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* 左：ブランドペイン */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-gc-800 via-gc-600 to-lime-500 p-10 lg:flex lg:flex-col lg:justify-between">
        <div className="rounded-md bg-white/95 px-3 py-2 inline-flex">
          <BrandMark variant="wordmark" size="md" />
        </div>
        <div className="space-y-3 text-white">
          <BrandMark variant="mascot" size="lg" className="mb-3 -ml-2 drop-shadow-xl" />
          <p className="text-3xl font-extrabold leading-tight">
            人と組織の力を、<br />
            最大化するためのプラットフォーム
          </p>
          <p className="max-w-md text-sm text-white/85">
            採用・オンボーディング・評価・1on1・サーベイ・在留資格まで、
            HR業務に必要な機能を一箇所に集約しました。
          </p>
        </div>
        <div className="text-xs text-white/70">
          © {new Date().getFullYear()} Green Carbon Inc. — 生命の力で地球を救う
        </div>
      </div>

      {/* 右：ログイン */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden">
            <BrandMark variant="wordmark" size="md" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">サインイン</h1>
            <p className="text-sm text-muted-foreground">
              社内Googleアカウント（@green-carbon.inc）でログインしてください。
            </p>
          </div>
          <Suspense fallback={<div className="h-11 rounded-md border bg-muted/40" />}>
            <LoginButton />
          </Suspense>
          <p className="text-xs text-muted-foreground">
            ログインに問題がある場合は HR (y.nomura@green-carbon.inc) までご連絡ください。
          </p>
        </div>
      </div>
    </div>
  );
}
