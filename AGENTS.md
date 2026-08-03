# AGENTS.md

**Tech Stack**: Next.js 15 (App Router), React 19, Tailwind CSS v4, Framer Motion, TypeScript 5.7.

## 🚨 CRITICAL RULE: Command Execution

Node.js and npm are NOT in the global `PATH`. This project is accessed via WSL.
**All node/npm/npx commands MUST be prefixed with:**
```bash
wsl direnv exec . <command>
```
*(Fallback: `wsl nix develop --impure -c <command>`)*

## 💡 Agent Guidelines

- **`command not found: node/npm`**: You forgot the `wsl direnv exec .` prefix.
- **Dev Servers**: Run `npm run dev` in background tasks so execution isn't blocked.
- **Visual Verification**: DO NOT rely solely on successful builds. Use browser tools (Chrome DevTools MCP or `/browser`) to verify UI changes.
