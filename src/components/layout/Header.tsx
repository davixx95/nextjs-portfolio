"use client";

import { useState } from "react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { ContactModal } from "@/components/ui/ContactModal";
import { Menu, X, Terminal, Mail } from "lucide-react";

export function Header() {
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "About", href: "#hero" },
    { label: "Metrics", href: "#metrics" },
    { label: "Experience", href: "#experience" },
    { label: "Skills", href: "#skills" },
    { label: "Projects", href: "#projects" },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-md border-b border-border transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo / Brand */}
          <a
            href="#hero"
            className="flex items-center gap-2 font-mono font-bold text-text-main hover:text-primary transition-colors text-sm sm:text-base group"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
              <Terminal className="w-4 h-4" />
            </div>
            <span>Davide Fedele</span>
            <span className="text-primary text-xs font-mono font-normal hidden sm:inline-block px-1.5 py-0.5 rounded bg-primary/10">
              dev.v1.0
            </span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-xs font-mono text-text-muted hover:text-primary transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Actions & Toggle */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsContactOpen(true)}
              className="hidden sm:inline-flex"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Get in Touch</span>
            </Button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
              className="md:hidden p-2 rounded-lg text-text-muted hover:text-text-main border border-border bg-surface"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-b border-border bg-surface px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-sm font-mono text-text-muted hover:text-primary transition-colors py-1"
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="pt-2 border-t border-border">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsContactOpen(true);
                }}
                className="w-full justify-center"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Get in Touch</span>
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Contact Dialog */}
      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />
    </>
  );
}
