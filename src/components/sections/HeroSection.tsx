"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ContactModal } from "@/components/ui/ContactModal";
import { HERO_COMPUTER_HEIGHT } from "@/components/three/HeroComputerPoster";
import { Download, Mail, Code2, MapPin } from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/ui/BrandIcons";

// three.js is ~600 KB, so the 3D computer loads client-side in its own chunk.
// The empty box has the same footprint, so nothing shifts when it arrives;
// the canvas then fades in once its first frame has rendered.
const HeroComputer = dynamic(() => import("@/components/three/HeroComputer"), {
  ssr: false,
  loading: () => (
    <div className="relative">
      <div className={`relative ${HERO_COMPUTER_HEIGHT}`} />
      <div className="mt-2 min-h-8 [@media(pointer:coarse)]:hidden" />
    </div>
  ),
});

export function HeroSection({ coreStack }: { coreStack: string[] }) {
  const [isContactOpen, setIsContactOpen] = useState(false);

  return (
    <section
      id="hero"
      className="relative pt-8 pb-16 md:pt-16 md:pb-12 overflow-clip"
    >
      {/* Subtle Grid Overlay (the ambient glow lives with the computer below) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b98108_1px,transparent_1px),linear-gradient(to_bottom,#10b98108_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-10 items-center">
          {/*
            Left Column: Intro, Headline, Bio, CTAs & Socials.
            Below lg it's `display: contents`, so its children join the grid and
            the computer can sit between the headline and the bio (order-*).
          */}
          <div className="contents lg:block lg:col-span-6 lg:space-y-6 text-left">
            {/* Status & Location Badges */}
            <div className="order-1 lg:order-none flex flex-wrap items-center gap-3">
              <Badge variant="status-active" className="py-1 px-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse mr-2" />
                AVAILABLE FOR NEW PROJECTS & ROLES
              </Badge>
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-text-muted bg-surface/60 border border-border px-3 py-1 rounded-full backdrop-blur-sm">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span>Rome, Italy (Remote)</span>
              </div>
            </div>

            {/* Main Greeting & Name Heading */}
            <div className="order-2 lg:order-none space-y-3">
              <span className="text-primary font-mono text-sm sm:text-base font-medium tracking-wide">
                Hi, my name is
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-text-main font-sans leading-[1.1]">
                Davide Fedele
              </h1>
              <h2 className="text-[1.375rem] sm:text-3xl lg:text-4xl font-bold tracking-tight text-text-muted font-sans leading-snug">
                I build clean high-performance{" "}
                <div className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                  web applications
                </div>
              </h2>
            </div>

            {/* Impactful & Likable Bio */}
            <p className="order-4 lg:order-none text-base sm:text-lg text-text-muted font-sans leading-relaxed max-w-2xl">
              <strong className="text-text-main font-semibold">React</strong>{" "}
              ecosystem expert. I build resilient, high-performance web
              applications for enterprise clients, blending deep technical
              precision with business-driven results.
            </p>

            {/* Action Buttons & Social Links */}
            <div className="order-5 lg:order-none lg:pt-2 flex sm:gap-4 gap-2 flex-wrap items-center flex-col items-start">
              <div className="flex sm:gap-4 gap-3">
                <a href="/resume.pdf" download="Davide_Fedele_Resume.pdf">
                  <Button
                    variant="primary"
                    size="lg"
                    className="px-4 sm:px-6 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/35 transition-all"
                    title="Download CV"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download CV</span>
                  </Button>
                </a>

                <Button
                  variant="secondary"
                  size="lg"
                  className="px-4 sm:px-6"
                  onClick={() => setIsContactOpen(true)}
                  title="Get in touch"
                >
                  <Mail className="w-4 h-4" />
                  <span>Get in Touch</span>
                </Button>
              </div>

              <hr className="w-75 text-border/80" />

              {/* Social Icon Bar */}
              <div className="flex items-center gap-2 border-border/80">
                <a
                  href="https://linkedin.com/in/davide-fedele"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn Profile"
                  className="p-2.5 rounded-lg border border-border bg-surface/50 text-text-muted hover:text-primary hover:border-primary/50 transition-all hover:scale-105"
                >
                  <LinkedinIcon className="w-4 h-4" />
                </a>
                <a
                  href="https://github.com/davixx95"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub Profile"
                  className="p-2.5 rounded-lg border border-border bg-surface/50 text-text-muted hover:text-primary hover:border-primary/50 transition-all hover:scale-105"
                >
                  <GithubIcon className="w-4 h-4" />
                </a>
                <a
                  href="mailto:davide@fedele.dev"
                  aria-label="Send Email"
                  className="p-2.5 rounded-lg border border-border bg-surface/50 text-text-muted hover:text-primary hover:border-primary/50 transition-all hover:scale-105"
                >
                  <Mail className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: interactive 3D computer */}
          <div className="relative order-3 lg:order-none lg:col-span-6 lg:-mr-6">
            {/*
              Ambient glow, centred on the computer's canvas box (not the
              section), so it stays on the computer at any viewport width.
              The section's overflow-clip trims whatever spills past its edges.
            */}
            <div
              aria-hidden
              className={`absolute inset-x-0 top-0 ${HERO_COMPUTER_HEIGHT} pointer-events-none -z-10`}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] sm:w-[40rem] sm:h-[40rem] bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl" />
            </div>
            <HeroComputer onContact={() => setIsContactOpen(true)} />
          </div>
        </div>

        {/* Quick Tech Highlights Pill Ribbon at Bottom */}
        <div className="mt-12 pt-6 border-t border-border/60 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-mono text-text-muted cursor-default">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <Code2 className="w-4 h-4 text-primary" />
            <span>CORE STACK:</span>
          </div>
          {coreStack.map((skill, index) => (
            <React.Fragment key={skill}>
              <span className="hover:text-primary transition-colors">
                {skill}
              </span>
              {index < coreStack.length - 1 && (
                <span className="text-border">/</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Contact Modal Dialog */}
      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />
    </section>
  );
}
