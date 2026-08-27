# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page personal portfolio site for Davide Fedele, built with Next.js 15 (App Router), React 19, Tailwind CSS v4, and Framer Motion, in TypeScript. It's statically exported and deployed to Cloudflare Pages.

## Critical: command execution environment

Node.js/npm are **not** on the global `PATH` — this project runs under WSL via Nix (`devenv`/`direnv`). Every node/npm/npx command must be prefixed:

```bash
wsl direnv exec . <command>
```

Fallback if `direnv` isn't set up: `wsl nix develop --impure -c <command>`

If you see `command not found: node`/`npm`, you forgot this prefix.

## Commands

```bash
wsl direnv exec . npm run dev      # start dev server (run in background; don't block on it)
wsl direnv exec . npm run build    # production build (static export to ./out)
wsl direnv exec . npm run lint     # next lint (flat config in eslint.config.mjs)
wsl direnv exec . npm run deploy   # build + wrangler pages deploy
```

There is no test suite configured in this repo.

For UI changes, don't rely on a successful build alone — run the dev server and verify visually in a browser (or via the `/browser` tool / Chrome DevTools MCP if available).

## Architecture

**Static export, no backend.** `next.config.ts` sets `output: "export"` and `images.unoptimized: true` — this is a pure static site (output goes to `./out`), deployed to Cloudflare Pages via `wrangler.json` (`pages_build_output_dir: "out"`). There are no Next.js API routes / route handlers in this repo.

**Contact form posts to an external service.** `ContactModal.tsx` submits form data via `fetch` to a separate Cloudflare Worker (`https://contact-form-handler.fedele-davide.workers.dev/`), not to anything in this repo. The `resend` package in `package.json` is not used anywhere in `src/` — it's a leftover/reference for that external worker's implementation, not wired up here.

**Content is data-driven via JSON, not CMS/DB.** `src/app/page.tsx` imports typed JSON files from `src/data/` (`experience.json`, `skills.json`, `projects.json`, `metrics.json`, `stack.json`) and casts them to interfaces from `src/types/index.ts`, then passes them as props into section components. To change site content (experience entries, skills, projects, metrics), edit the JSON in `src/data/`, not the components — the shapes are enforced by the `WorkExperience`, `SkillCategory`, `Project`, and `Metric` interfaces.

**Single-page, section-based layout.** `page.tsx` composes `Header`, `HeroSection`, `MetricsSection`, `ExperienceSection`, `SkillsSection`, `ProjectsSection`, `Footer` in order. Navigation (in `Header.tsx`) is anchor-based scrolling to section IDs (`#hero`, `#metrics`, etc.) — `handleNavClick` intercepts anchor clicks, manually does `history.pushState` (not `router.push`, since this is a static SPA-style scroll site) and smooth-scrolls, offsetting by the sticky header's height.

**Styling: Tailwind v4 with CSS custom properties for theming.** Theme tokens (`--background`, `--surface`, `--primary`, `--text-main`, etc.) are defined as CSS variables in `src/app/globals.css` under `:root` (light) and `.dark` (dark), and mapped into Tailwind's `@theme` block — components then use semantic classes like `bg-background`, `text-text-main`, `border-border` rather than raw color values. Theme switching is handled by `next-themes` (`ThemeProvider` in `layout.tsx`, default dark, no system-preference following) plus `ThemeToggle.tsx`.

**`src/components/ui/`** holds generic, reusable primitives (`Button`, `Card`, `Badge`, `ContactModal`, `CustomScrollbar`, `ThemeToggle`) — variant-driven via `cn()` (`clsx` + `tailwind-merge`, in `src/lib/utils.ts`). **`src/components/sections/`** and **`src/components/layout/`** hold page-specific composition that consumes the `ui/` primitives and the typed JSON data.

**Path alias:** `@/*` maps to `src/*` (see `tsconfig.json`).

## Agent skills

`.agents/skills/` contains a large generic third-party skill library (planning, TDD, code review, domain modeling, etc., mirrored per-agent in `agents/openai.yaml` files). These aren't project-specific — treat them as available general-purpose workflows, not documentation about this codebase.
