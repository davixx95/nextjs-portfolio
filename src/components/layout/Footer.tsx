"use client";

import React from "react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    e.preventDefault();

    const url = new URL(window.location.href);
    url.hash = href;
    window.history.pushState({}, "", url);

    window.scrollTo({
      behavior: "smooth",
      top: 0,
    });
  };

  return (
    <footer className="w-full border-t border-border bg-background py-8 transition-colors">
      <div className="max-w-6xl mx-auto px-4 text-center space-y-2">
        <p className="text-xs font-mono text-text-muted">
          © {currentYear} Davide Fedele. Engineered with Next.js 15 & Tailwind
          CSS.
        </p>
        <div className="flex items-center justify-center gap-4 text-xs font-mono text-text-muted">
          <a
            href="https://github.com/davixx95"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            GitHub
          </a>
          <span>•</span>
          <a
            href="https://linkedin.com/in/davide-fedele"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            LinkedIn
          </a>
          <span>•</span>
          <a
            href="#hero"
            onClick={(e) => handleNavClick(e, "#hero")}
            className="hover:text-primary transition-colors cursor-pointer"
          >
            Back to Top ↑
          </a>
        </div>
        <p className="text-[10px] font-mono text-text-muted/70">
          3D model:{" "}
          <a
            href="https://poly.pizza/m/Bw55oYsbp8"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-primary transition-colors"
          >
            &ldquo;Computer 90s&rdquo; by Charlie
          </a>{" "}
          via Poly Pizza (CC BY)
        </p>
      </div>
    </footer>
  );
}
