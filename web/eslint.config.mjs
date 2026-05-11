import { FlatCompat } from "@eslint/eslintrc";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

/**
 * Next.js 推奨ルール（core-web-vitals + typescript）をベースに最小限のオーバーライドのみ。
 *
 * 開発体験 > 厳密性 のスタンス：
 *  - `react/no-unescaped-entities` は日本語混在の JSX で過剰検知するため OFF
 *  - `@typescript-eslint/no-explicit-any` は warn（lib 層では避けるが UI 層では現実的に許容）
 *  - generated / build 出力は除外
 */
const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      ".node22/**",            // ローカル Node 22 LTS バイナリ
      "supabase/dbt/**",       // dbt SQL は対象外
      "playwright-report/**",
      "test-results/**",
      "types/database.ts",      // 自動生成
      "next-env.d.ts",          // 自動生成（Next.js）
    ],
  },
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];

export default config;
