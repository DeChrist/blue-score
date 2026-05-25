# Copilot Instructions

Guidance for AI coding agents working in this repository.

## Commands

```bash
npm run dev           
npm run dev:demo      
npm run dev:advanced  
npm run mobile-test
npm run lint
npm test
npm run test:coverage
npm run build
npx vitest run src/scoring.test.ts
```

CI/CD runs in `.github/workflows/ci-cd.yml` on Node 24. It enforces lint, `test:coverage` (uploads a coverage artifact), and build before GitHub Pages deployment, then runs an automated `release` job on pushes to `main`.

## Architecture

Read the ADR index first for durable decisions: `docs/adr/README.md`.

Important boundaries:

- `App.tsx` owns the current `Session` and persists changes through `storage.ts`.
- `scoring.ts` contains pure scoring utilities and standings calculation.
- `validation.ts` contains JSON shape parsing plus domain validation for players, rotas, scores, and submitted results.
- `rotaGenerator.ts` contains pure deterministic Americano rota generation using numeric player indexes internally.
- `rotaProvider.ts` defines the rota provider interface, maps generated technical rotas back to domain `Player.id` values, and preserves static import support.
- `sessionPhase.ts` derives `SessionPhase` (`setup` | `scoring` | `complete`) from session data and exports `isRotaAccessible` for sequential tab gating; no side effects.
- `appMode.ts` parses `?mode=` into `AppMode` (`standard` | `demo` | `advanced`); `App.tsx` reads it at module level.
- `styles.css` is guided by `design-system/MASTER.md`; do not add Tailwind or a component framework.

## Quality Guide

`docs/technical-debt-backlog.md` tracks known quality work with priority, required action, and an `Agent` column marking items `OK` (safe to action autonomously) or `Design↑` (needs a human decision before writing code).

On any plan, or any change that touches more than one module or changes exported/public function or type signatures, consult the backlog. Also consult the backlog for any change touching a P1 area — imports, session setup, scoring state — even when confined to a single module. Surface the relevant item and invite the user to address it before or alongside the change. If the user explicitly acknowledges a `Design↑` item and chooses to proceed without addressing it, respect that decision and note it in the backlog's Agent Notes.
The backlog is a living document: update it when a finding is dispositioned, a fix is landed, or the user declines a suggestion worth recording.

The project is monitored by [SonarCloud](https://sonarcloud.io/project/overview?id=DeChrist_blue-score) (public, no auth — OSS project). A subset of Sonar findings are also enforced by ESLint; see [`docs/sonar-eslint-mapping.md`](../docs/sonar-eslint-mapping.md) for the full mapping. When a static analyser flags a pattern that is functionally correct, a brief inline disposition comment is lower-risk than auto-refactoring; the backlog's Agent Notes section explains this.

## Testing Rules

- Keep warnings at zero; lint uses `--max-warnings 0`. 
- If lint or tests fail after your change, fix them before presenting the result. If a fix is non-obvious or would require a design decision, present the failure and ask the user.
- When adding a new module with exported pure functions, add a matching `*.test.ts` in the same PR.
- When changing scoring behavior, update `src/scoring.test.ts`.
- When changing import or storage trust boundaries, update `validation.imports.test.ts` or `storage.test.ts`.
- When changing generated rota behavior, update `src/rotaGenerator.test.ts` and provider coverage in `src/rotaProvider.test.ts`.

## Commit Rules

- Commit messages should follow conventional commit format (see https://www.conventionalcommits.org/en/v1.0.0/) and include a `+semver:` directive in the body to influence release versioning (e.g., `+semver: patch`).

## Design Rules should follow the architecture and quality guidance above, but in general:

- Prefer small, explicit helpers over broad refactors. `App.tsx` and `validation.ts` are known large files, but splitting them is not required for ordinary changes.
- Preserve local-first behavior: no backend, no auth, no network persistence.
- Do not introduce external CDN, font service, or analytics dependencies; all assets must be bundled. Adding any external origin requires a deliberate update to the CSP policy in `vite.config.ts` (see ADR-005, ADR-008).
- Do not describe generated rotation counts as proven globally optimal. The generator returns the minimum found by bounded deterministic search from the theoretical lower bound.
