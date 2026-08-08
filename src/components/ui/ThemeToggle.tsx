"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "./Button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        aria-label="Toggle dark/light theme"
        className="w-9 h-9 flex items-center justify-center rounded-lg border border-border bg-surface text-text-muted transition-all duration-200"
      >
        <span className="w-4 h-4" />
      </Button>
    );
  }

  const isDark = theme === "dark";

  return (
    <Button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle dark/light theme"
      className="w-9 h-9 flex items-center justify-center rounded-lg border border-border bg-surface text-text-main hover:text-primary hover:border-primary/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40"
    >
      {isDark ? (
        <Sun className="min-w-4 min-h-4 text-emerald-400 transition-transform duration-200 hover:rotate-45" />
      ) : (
        <Moon className="min-w-4 min-h-4 text-slate-700 transition-transform duration-200 hover:-rotate-12" />
      )}
    </Button>
  );
}
