"use client";

import { useState, useEffect, useRef } from "react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { ContactModal } from "@/components/ui/ContactModal";
import { Menu, X, Terminal, Mail, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function Header() {
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mdDetectorRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      // Hooked up to Tailwind configuration via the hidden md:block element
      if (mdDetectorRef.current) {
        const isDesktop =
          window.getComputedStyle(mdDetectorRef.current).display !== "none";
        if (isDesktop) setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const navLinks = [
    { label: "About", href: "#hero" },
    { label: "Metrics", href: "#metrics" },
    { label: "Experience", href: "#experience" },
    { label: "Skills", href: "#skills" },
    { label: "Projects", href: "#projects" },
  ];

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    e.preventDefault();
    const targetId = href.replace("#", "");
    const elem = document.getElementById(targetId);

    if (elem) {
      // Close menu first, then wait for animation to finish before scrolling
      setIsMobileMenuOpen(false);
      setTimeout(() => {
        const headerHeight = headerRef.current?.offsetHeight ?? 64;
        window.scrollTo({
          behavior: "smooth",
          top: elem.offsetTop - headerHeight,
        });
      }, 200); // 200ms allows the menu to animate out smoothly
    }
  };

  return (
    <>
      {/* Breakpoint detector hooked up to Tailwind's 'md' media query */}
      <div
        ref={mdDetectorRef}
        className="hidden md:block absolute w-0 h-0 invisible pointer-events-none"
        aria-hidden="true"
      />
      <header
        ref={headerRef}
        className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-md border-b border-border transition-colors"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between relative z-50">
          {/* Logo / Brand */}
          <a
            href="#hero"
            onClick={(e) => handleNavClick(e, "#hero")}
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
                onClick={(e) => handleNavClick(e, link.href)}
                className="text-xs font-mono text-text-muted hover:text-primary transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Actions & Toggle */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            <a href="/resume.pdf" download="Davide_Fedele_Resume.pdf">
              <Button
                variant="primary"
                size="md"
                className="shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/35 transition-all"
                title="Download CV"
              >
                <Download className="w-4 h-4" />
                CV
              </Button>
            </a>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setIsContactOpen(true)}
              title="Get in touch"
            >
              <Mail className="w-4 h-4" />
            </Button>

            {/* Mobile Menu Toggle */}
            <Button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
              className="md:hidden p-2 rounded-lg text-text-muted hover:text-text-main border border-border bg-surface relative z-50"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="md:hidden overflow-hidden border-b border-border bg-surface space-y-3 relative z-40 shadow-xl"
            >
              <nav className="flex flex-col gap-3 p-4">
                {navLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link.href)}
                    className="text-sm font-mono text-text-muted hover:text-primary transition-colors py-1"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Backdrop for mobile menu (click outside to close) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Contact Dialog */}
      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />
    </>
  );
}
