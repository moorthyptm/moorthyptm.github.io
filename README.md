# moorthyptm.github.io

Thirumoorthy Ponnusamy's personal portfolio site — Vite 8 + TypeScript + Tailwind CSS v4, deployed to GitHub Pages.

## Stack

- Node 20+, pnpm 10+
- Vite 8 (dev server, HMR, production bundling, asset hashing)
- TypeScript (vanilla DOM, no framework)
- Tailwind CSS v4 via `@tailwindcss/vite`
- Optional chat widget streaming from an external A2A agent

## Quick start

```bash
pnpm install
pnpm dev          # Vite dev server on http://localhost:5173
pnpm build        # Production build → packages/portfolio/dist/
pnpm preview      # Preview the built bundle on http://localhost:4173
pnpm --filter @moorthyptm/portfolio typecheck   # tsc --noEmit
```

## Layout

```
.
├── packages/
│   └── portfolio/                # static site (HTML + TS + Tailwind)
│       ├── src/
│       │   ├── index.html        # entry (Vite root: src/)
│       │   ├── script.ts         # site interactions
│       │   ├── chat.ts           # chat widget (reads <meta name="agent-url">)
│       │   ├── styles.css        # Tailwind v4 entry
│       │   ├── chat.css
│       │   └── assets/
│       ├── vite.config.ts
│       ├── tsconfig.json
│       └── package.json
├── .github/workflows/
│   └── deploy.yml                # Pages deploy (push to master)
├── .prettierrc.json
├── .prettierignore
├── pnpm-workspace.yaml
└── .npmrc
```

## Chat widget

The chat widget posts to an external agent over SSE. The origin is configured in `index.html`:

```html
<meta name="agent-url" content="https://agent.moorthyptm.com" />
```

Remove the meta tag (or leave the `content` empty) to disable the widget at build time.

## Deploy

Pushes to `master` trigger [`deploy.yml`](.github/workflows/deploy.yml). Vite handles asset hashing during `vite build`; the workflow uploads `packages/portfolio/dist/` to GitHub Pages.
