import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "standard" | "status-active" | "status-dev" | "status-planned";
  children: React.ReactNode;
}

export function Badge({
  variant = "standard",
  className,
  children,
  ...props
}: BadgeProps) {
  const baseStyles =
    "inline-flex items-center px-2.5 py-1 rounded text-xs font-mono transition-colors duration-200 border";

  const variants = {
    primary: "text-primary bg-primary/10 border-primary/20",
    standard:
      "text-text-muted bg-slate-800/40 dark:bg-slate-800/60 bg-slate-100 border-border",
    "status-active": "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    "status-dev": "text-amber-400 bg-amber-500/10 border-amber-500/30",
    "status-planned": "text-sky-400 bg-sky-500/10 border-sky-500/30",
  };

  return (
    <span
      className={cn(baseStyles, variants[variant], className)}
      {...props}
    >
      {children}
    </span>
  );
}
