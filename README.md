# CalendárioFR

![MVP foundation in progress](https://img.shields.io/badge/MVP-foundation%20in%20progress-yellow)

A handwritten-style planner web app. Bullet-journal aesthetic, built on a solid monorepo foundation.

## Docs

- [Macro spec](docs/specs/2026-05-08-mvp-overview.md)
- [CLAUDE.md](CLAUDE.md) — commands, architecture, invariants

## Quick start

```bash
npm install
npm run dev
```

| Service       | URL                   |
| ------------- | --------------------- |
| Web (Vite)    | http://localhost:3000 |
| API (Fastify) | http://localhost:3003 |
| Storybook     | http://localhost:6006 |

## Common commands

```bash
npm run typecheck        # tsc --noEmit across all workspaces
npm run lint             # ESLint flat config v9 (type-checked)
npm run format:check     # Prettier check
npm test                 # Jest unit + integration (jsdom + MSW)
npm run test:coverage    # Jest with coverage report → coverage/
npm run test:e2e:smoke   # Playwright smoke (requires dev server running)
npm run storybook        # Storybook 8 on :6006
npm run build            # Vite production build (web)
npm run build-storybook  # Storybook static build → storybook-static/
```

## Workspaces

- `web/` — React 19 + Vite 5 frontend
- `server/` — Fastify 5 companion API
- `test-utils/` — shared Jest test utilities (render helpers, MSW server, factories)
- `e2e/` — Playwright end-to-end specs (smoke + real)
