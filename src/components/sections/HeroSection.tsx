"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ContactModal } from "@/components/ui/ContactModal";
import {
  Download,
  Mail,
  Code2,
  Linkedin,
  Github,
  Sparkles,
  MapPin,
  CheckCircle2,
} from "lucide-react";

export function HeroSection({ coreStack }: { coreStack: string[] }) {
  const [isContactOpen, setIsContactOpen] = useState(false);
  const yearsExperience = new Date().getFullYear() - 2022;

  return (
    <section
      id="hero"
      className="relative pt-8 pb-16 md:pt-16 md:pb-12 overflow-hidden"
    >
      {/* Background Ambient Glow & Subtle Grid Overlay */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] sm:w-[40rem] sm:h-[40rem] bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b98108_1px,transparent_1px),linear-gradient(to_bottom,#10b98108_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Headshot Frame with Ambient Glow & Badges */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end relative">
            <div className="relative group">
              {/* Outer Decorative Ring Glow */}
              <div className="absolute -inset-1.5 bg-gradient-to-tr from-emerald-500 via-teal-400 to-indigo-500 rounded-full blur-lg opacity-40 group-hover:opacity-75 transition duration-500" />

              {/* Headshot Card Container */}
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 lg:w-80 lg:h-80 rounded-full p-2 bg-border/90 border border-emerald-500/30 backdrop-blur-md shadow-2xl overflow-hidden flex items-center justify-center">
                {/* Background Glow inside Container */}
                <div className="absolute -inset-50 group-hover:-inset-100 transition-[inset] duration-400 bg-gradient-to-b from-emerald-500/10 via-transparent to-background/80 pointer-events-none z-50" />

                <Image
                  src="/headshot.jpg"
                  alt="Davide Fedele - Front End Developer"
                  width={320}
                  height={320}
                  priority
                  className="w-full h-full object-cover rounded-full transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>

              {/* Floating Badge Top Right */}
              <div className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 bg-surface/90 border border-emerald-500/40 rounded-xl px-3 py-1.5 shadow-xl backdrop-blur-md flex items-center gap-1.5 text-xs font-mono text-emerald-400 animate-bounce duration-1000">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="font-semibold">Enterprise Specialist</span>
              </div>

              {/* Floating Badge Bottom Left */}
              <div className="absolute -bottom-3 -left-3 sm:-bottom-4 sm:-left-4 bg-surface/90 border border-border rounded-xl px-3 py-2 shadow-xl backdrop-blur-md flex items-center gap-2 text-xs font-sans text-text-main">
                <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs">
                    {yearsExperience}+ Yrs Experience
                  </div>
                  <div className="text-[10px] text-text-muted">
                    NTT DATA • HCL • Contrader
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Intro, Headline, Bio, CTAs & Socials */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Status & Location Badges */}
            <div className="flex flex-wrap items-center gap-3">
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
            <div className="space-y-3">
              <span className="text-primary font-mono text-sm sm:text-base font-medium tracking-wide">
                Hi, my name is
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-text-main font-sans leading-[1.1]">
                Davide Fedele
              </h1>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-text-muted font-sans leading-snug">
                I build clean high-performance{" "}
                <div className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                  web applications
                </div>
              </h2>
            </div>

            {/* Impactful & Likable Bio */}
            <p className="text-base sm:text-lg text-text-muted font-sans leading-relaxed max-w-2xl">
              <strong className="text-text-main font-semibold">React</strong>{" "}
              ecosystem expert. I build resilient, high-performance web
              applications for enterprise clients, blending deep technical
              precision with business-driven results.
            </p>

            {/* Action Buttons & Social Links */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <a href="/resume.pdf" download="Davide_Fedele_Resume.pdf">
                <Button
                  variant="primary"
                  size="lg"
                  className="shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/35 transition-all"
                  title="Download CV"
                >
                  <Download className="w-4 h-4" />
                  <span>Download CV</span>
                </Button>
              </a>

              <Button
                variant="secondary"
                size="lg"
                onClick={() => setIsContactOpen(true)}
                title="Get in touch"
              >
                <Mail className="w-4 h-4" />
                <span>Get in Touch</span>
              </Button>

              {/* Social Icon Bar */}
              <div className="flex items-center gap-2 pl-4 border-l border-border/80 ml-1">
                <a
                  href="https://linkedin.com/in/davide-fedele"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn Profile"
                  className="p-2.5 rounded-lg border border-border bg-surface/50 text-text-muted hover:text-primary hover:border-primary/50 transition-all hover:scale-105"
                >
                  <Linkedin className="w-4 h-4" />
                </a>
                <a
                  href="https://github.com/davixx95"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub Profile"
                  className="p-2.5 rounded-lg border border-border bg-surface/50 text-text-muted hover:text-primary hover:border-primary/50 transition-all hover:scale-105"
                >
                  <Github className="w-4 h-4" />
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
