# Copilot Instructions

Guidance for AI coding agents working in this repository.

## Commands

```bash
npm run dev
npm run mobile-test
npm run lint
npm test
npm run build
npx vitest run src/scoring.test.ts
```

CI/CD runs in `.github/workflows/ci-cd.yml` on Node 24. It enforces lint, tests, and build before GitHub Pages deployment.

## Architecture

Read the ADR index first for durable decisions: `docs/adr/README.md`.

Important boundaries:

- `App.tsx` owns the current `Session` and persists changes through `storage.ts`.
- `scoring.ts` contains pure scoring utilities and standings calculation.
- `validation.ts` contains JSON shape parsing plus domain validation for players, rotas, scores, and submitted results.
- `rotaProvider.ts` defines the rota provider interface. Rota generation is not implemented in this app.
- `styles.css` is guided by `design-system/MASTER.md`; do not add Tailwind or a component framework.

## Change Rules

- Keep warnings at zero; lint uses `--max-warnings 0`.
- When changing scoring behavior, update `src/scoring.test.ts`.
- When changing import or storage trust boundaries, update `validation.imports.test.ts` or `storage.test.ts`.
- Prefer small, explicit helpers over broad refactors. `App.tsx` and `validation.ts` are known large files, but splitting them is not required for ordinary changes.
- Preserve local-first behavior: no backend, no auth, no network persistence.
