import React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverable?: boolean;
}

export function Card({
  children,
  hoverable = true,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "bg-surface border border-border rounded-xl p-6 transition-all duration-200",
        hoverable &&
          "hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
