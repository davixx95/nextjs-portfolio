# davide.fedele.dev

Source of my personal portfolio, live at **[davide.fedele.dev](https://davide.fedele.dev)**.

I'm a Frontend Engineer working mainly with React and Next.js, and I'm growing toward full-stack work. This site is where I try things out: a Three.js computer in the hero with an interactive terminal on its screen, and a contact form that runs through a small Cloudflare Worker.

## Stack

- **Next.js 15** (App Router), **React 19**, **TypeScript**
- **Tailwind CSS v4** with CSS-variable theme tokens, `next-themes` for light/dark
- **Three.js** via `@react-three/fiber` and `drei` for the hero computer, **Framer Motion** for transitions
- **Cloudflare Pages** for hosting, plus a **Cloudflare Worker** for the contact form

## Architecture

```
Browser ──static files──▶ Cloudflare Pages   (next build → ./out)
   │
   └─ contact form + Turnstile token ──▶ contact-form-handler Worker
                                             ├─ validate fields
                                             ├─ Turnstile siteverify (success, action, hostname)
                                             └─ Resend HTTP API ──▶ my inbox
```

- **Static export, no server.** `next.config.ts` sets `output: "export"`. The build output in `out/` is uploaded to Cloudflare Pages with `wrangler pages deploy`.
- **Content is JSON.** Experience, skills, projects, metrics and the hero stack live in [`src/data/`](src/data). Their shapes are typed in [`src/types/index.ts`](src/types/index.ts), and the section components only render what's there.
- **Contact form.** [`ContactModal.tsx`](src/components/ui/ContactModal.tsx) renders a Turnstile widget and posts the form to the Worker in [`workers/contact-form-handler/`](workers/contact-form-handler). The Worker:
  - allows CORS only for the origins I list;
  - checks the token with siteverify, including the action and hostname, and rejects the request if siteverify fails or doesn't answer;
  - sends the email through Resend.

  Secrets are stored as Worker secrets and never committed. `EMAIL_DRY_RUN` makes local runs log the email instead of sending it.
- **Hero computer.** [`HeroComputer.tsx`](src/components/three/HeroComputer.tsx) loads an optimized glTF model. The terminal ([`src/components/terminal/`](src/components/terminal)) is regular DOM laid over the screen with a projective `matrix3d`, so it stays selectable and accessible.

## Running it locally

The dev environment is a Nix flake (`devenv` + `direnv`), so Node comes from the flake. Any Node 22 install works too.

```bash
npm ci
npm run dev        # http://localhost:3000
npm run lint
npm run build      # static export to ./out
```

To try the contact form locally, copy `workers/contact-form-handler/.dev.vars.example` to `.dev.vars` and run the Worker:

```bash
npx wrangler dev --config workers/contact-form-handler/wrangler.jsonc --port 8787
```

`.env.development` already points `next dev` at Turnstile's test sitekey and at `http://localhost:8787/`.

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs lint and build on every push and pull request to `main`.

## Working with Claude Code

I built most of this site with [Claude Code](https://claude.com/claude-code), the same way I work on client projects:

1. I scope the change.
2. The agent implements it.
3. I review the diff and check the result in the browser before committing.

[`CLAUDE.md`](CLAUDE.md) holds the project context the agent works from. Commits co-authored with Claude carry a `Co-Authored-By` trailer.

## Credits

- "Vintage Terminal" 3D model by NoMoreFeelings ([Sketchfab](https://sketchfab.com/3d-models/vintage-terminal-847c174b86e24d868d25217ca2297886)), licensed CC BY 4.0. It was optimized with [`scripts/optimize-terminal-model.mjs`](scripts/optimize-terminal-model.mjs).
- Brand icon paths from [Simple Icons](https://simpleicons.org) (CC0).
