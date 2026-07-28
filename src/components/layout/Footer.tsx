import React from "react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-border bg-background py-8 transition-colors">
      <div className="max-w-6xl mx-auto px-4 text-center space-y-2">
        <p className="text-xs font-mono text-text-muted">
          © {currentYear} Davide Fedele. Engineered with Next.js 15 & Tailwind CSS.
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
          <a href="#hero" className="hover:text-primary transition-colors">
            Back to Top ↑
          </a>
        </div>
      </div>
    </footer>
  );
}
