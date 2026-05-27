import Image from "next/image";
import { cn } from "@/lib/utils";

type Variant = "wordmark" | "mascot" | "icon";

type Props = {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  className?: string;
};

/**
 * Green Carbon のブランドマーク。
 *  - wordmark: テキストロゴ（"green carbon"）。サイドバーやヘッダー向け
 *  - mascot:   Agreen キャラクター込み。空状態・特別画面向け
 *  - icon:     "gc" アイコンのみ。極小スペース向け
 */
export function BrandMark({ variant = "wordmark", size = "md", className }: Props) {
  const dimensions = {
    sm: { wordmark: { w: 96,  h: 24 }, mascot: { w: 120, h: 38 }, icon: { w: 24, h: 24 } },
    md: { wordmark: { w: 140, h: 32 }, mascot: { w: 160, h: 50 }, icon: { w: 32, h: 32 } },
    lg: { wordmark: { w: 200, h: 48 }, mascot: { w: 260, h: 80 }, icon: { w: 48, h: 48 } },
  }[size];

  if (variant === "mascot") {
    return (
      <Image
        src="/brand/agreen-mascot.png"
        alt="Green Carbon — 生命の力で地球を救う"
        width={dimensions.mascot.w}
        height={dimensions.mascot.h}
        priority
        className={cn("h-auto w-auto select-none", className)}
      />
    );
  }
  if (variant === "icon") {
    // wordmark のうち左の "gc" 部分のみ表示するため CSS でクロップ
    return (
      <div
        className={cn("relative shrink-0 overflow-hidden", className)}
        style={{ width: dimensions.icon.w, height: dimensions.icon.h }}
      >
        <Image
          src="/brand/green-carbon-wordmark.png"
          alt="Green Carbon"
          width={1140}
          height={250}
          priority
          // ダークモードで黒字部分が背景と同化するため invert で反転
          className="absolute left-0 top-1/2 -translate-y-1/2 select-none dark:invert"
          style={{ height: dimensions.icon.h * 1.05, width: "auto", maxWidth: "none" }}
        />
      </div>
    );
  }
  return (
    <Image
      src="/brand/green-carbon-wordmark.png"
      alt="Green Carbon"
      width={dimensions.wordmark.w}
      height={dimensions.wordmark.h}
      priority
      // ダークモードで黒字部分が背景と同化するため invert で反転
      className={cn("h-auto w-auto select-none dark:invert", className)}
    />
  );
}
