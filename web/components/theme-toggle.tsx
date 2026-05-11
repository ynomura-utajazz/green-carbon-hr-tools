"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-label="テーマ切替">
        <Sun className="size-4" />
      </Button>
    );
  }

  const cycleTheme = () => {
    if (theme === "system") setTheme("light");
    else if (theme === "light") setTheme("dark");
    else setTheme("system");
  };

  const Icon = theme === "system" ? Monitor : resolvedTheme === "dark" ? Moon : Sun;
  const label = theme === "system" ? "システム" : resolvedTheme === "dark" ? "ダーク" : "ライト";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`テーマ切替（現在: ${label}）`}
      onClick={cycleTheme}
      className="relative"
      title={`テーマ: ${label}（クリックで切替）`}
    >
      <Icon className="size-4" />
    </Button>
  );
}
