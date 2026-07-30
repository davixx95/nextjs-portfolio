# AGENTS.md

This document contains essential environment context, setup instructions, and command execution guidelines for AI coding agents working on this project.

---

## 🚨 CRITICAL RULE: Command Execution Environment

This project runs on **NixOS** using **Nix Flakes** (`flake-parts`), **devenv**, and **direnv** (`nix-direnv`). It is also accessed via WSL from Windows.

> [!CAUTION]
> **Node.js, npm, and npx are NOT installed in the global system `PATH`.**
> When running from a Windows host (like PowerShell), commands must be prefixed with `wsl`, therefore first ascertain the current operating system.
> Attempting to run `npm`, `node`, or `npx` directly in a standard shell invocation will fail with `command not found: node` or `command not found: npm`.

### How to Run Commands

All commands interacting with Node.js, npm, or workspace tooling **MUST** be executed using one of the following wrappers:

#### 1. Recommended Method (Fastest & Cached): `direnv exec .`
`direnv` automatically uses `nix-direnv` cached development shell for instant execution without startup overhead.

```bash
wsl direnv exec . <command>
```

#### 2. Alternative Method: `nix develop --impure -c`
If `direnv` is unavailable or you need an isolated flake subshell:

```bash
wsl nix develop --impure --command <command>
```
*Note: The `--impure` flag is mandatory due to devenv/flake environment configuration.*

---

## 🛠️ Quick Command Cheat Sheet

| Task | Command |
| :--- | :--- |
| **Run Dev Server** | `wsl direnv exec . npm run dev` |
| **Build Project** | `wsl direnv exec . npm run build` |
| **Start Production Server** | `wsl direnv exec . npm start` |
| **Run Linting** | `wsl direnv exec . npm run lint` |
| **Install Dependency** | `wsl direnv exec . npm install <package>` |
| **Execute NPX Tool** | `wsl direnv exec . npx <tool>` |
| **Run Node Script** | `wsl direnv exec . node <script>` |
| **Check Node Version** | `wsl direnv exec . node -v` |

---

## 🏗️ Technical Stack & Project Architecture

- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`)
- **Animation**: Framer Motion
- **Icons & Theme**: Lucide React, Next-Themes
- **Language**: TypeScript 5.7
- **Nix Shell**: `flake.nix` (with `flake-parts` & `devenv` exposing Node.js 22)

---

## 📂 Key Configuration Files

- `flake.nix`: Defines system outputs, flake-parts integration, and devenv module (Node.js 22 shell package).
- `.envrc`: Evaluates flake environment (`use flake . --impure`).
- `package.json`: Project metadata and dependency manifest.
- `next.config.ts`: Next.js application configuration.
- `postcss.config.mjs` & `tailwind.config.ts`: PostCSS and Tailwind CSS styling configurations.

---

## 💡 Troubleshooting & Agent Guidelines

1. **`command not found: node` / `command not found: npm`**:
   - **Cause**: Command was run raw without `wsl direnv exec .` or `wsl nix develop`.
   - **Fix**: Prepend `wsl direnv exec .` to your command (e.g. `wsl direnv exec . npm run build`).

2. **Background Processes**:
   - When launching dev servers (`npm run dev`), launch them asynchronously or in background tasks so execution turns are not blocked.
