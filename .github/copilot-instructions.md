# Copilot Instructions

This file provides coding guidance for AI coding agents working in this repository.

## Commands

```bash
npm run dev          # Start dev server (binds 0.0.0.0:5173 for LAN access)
npm run mobile-test  # Dev server + Cloudflare tunnel for mobile device testing
npm run lint         # ESLint v9 flat-config linting (warnings fail)
npm run build        # Type-check (tsc -b) then bundle with Vite
npm test             # Run Vitest suite (vitest run, not watch)
npx vitest run src/scoring.test.ts  # Run a single test file
```

## Quality gates

- Linting uses ESLint v9 flat config in `eslint.config.js`.
- CI runs in `.github/workflows/ci.yml` and enforces: `npm run lint`, `npm test`, and `npm run build` on PRs and `main`.
- Keep warnings at zero (`--max-warnings 0`) so regressions are surfaced early during refactors.
- Import-boundary parser tests live in `src/validation.imports.test.ts` and should stay green when changing parsing rules.

## Architecture

Single-page React 19 + Vite + TypeScript app. No router, no state management library. All state lives in `App.tsx` as a single `Session` object, auto-saved to `localStorage` via `storage.ts`.

Core data flow:
- `Session` (in `types.ts`) is the root data model: players, rotas (match schedules), and results (submitted scores).
- `App.tsx` owns session state. It passes the session down as props and receives updated sessions via `onSessionChange` callbacks.
- `scoring.ts` contains two pure functions: `applyOrReplaceRotaResult` (upserts a scored rota into the session) and `calculateStandings` (derives `StandingRow[]` from session data). Both are tested in `scoring.test.ts`.
- `validation.ts` validates players, individual court scores, rotas, and full session setup. It also owns import parsing for players, rotas, and full sessions using `unknown` input plus shape checks.
- JSON import flow in `App.tsx` is: JSON parse -> shape parse (`parseImported*`) -> domain validation -> state update.

Key domain concepts:
- A Rota is one round of matches: 3 courts, each with a left pair and right pair. With 16 players and 3 courts, 4 players sit out per rota.
- Court scores always sum to `session.pointsPerCourt` (default 24). `changeScore` in `RotaScoring.tsx` enforces this by mirroring: setting left to N automatically sets right to `pointsPerCourt - N`.
- Rotas are imported externally as JSON (no generation logic in the app). `rotaProvider.ts` houses the `RotaProvider` interface and `StaticRotaProvider` (the only live implementation). `PlaceholderGeneratedRotaProvider` exists as a stub.

Module map:
- `types.ts`: all shared interfaces, no logic
- `scoring.ts`: pure score calculation
- `validation.ts`: import parsing + validation, returns `ValidationResult` (`{ valid, errors }`) and `ParseImportResult<T>` for import boundaries
- `storage.ts`: thin `localStorage` wrapper (`STORAGE_KEY = "padel-americano-session-v1"`)
- `exporters.ts`: CSV export (standings + full results)
- `rotaProvider.ts`: rota import and validation
- `sampleData.ts`: 16 sample players + 3 sample rotas (pre-loaded into the JSON import textareas)
- `components/RotaScoring.tsx`: scoring panel + `ScoreSpinner` (scroll wheel + touch swipe + stepper buttons)
- `components/StandingsTable.tsx`: live standings
- `components/SessionHistory.tsx`: submitted rota history
- `validation.imports.test.ts`: trust-boundary tests for malformed and valid import payloads

## Design system

`design-system/MASTER.md` is the source of truth for visual decisions. Page-specific overrides live in `design-system/pages/*.md`. Read `MASTER.md` first when touching CSS or UI.

Key constraints from the design system:
- Light mode only (outdoor use in sunlight)
- Color palette: sage-tinted background (`#f5f7f2`), green primary (`#176b4d`), green/amber left/right team identity
- Typography: `Fira Sans` for headings/UI, `Fira Code` for all numeric data (tabular figures prevent layout jitter when scores update)
- Touch targets: minimum 44x44 px. `ScoreSpinner` stepper buttons are 48x74 px
- All CSS lives in `src/styles.css` (no CSS modules, no Tailwind)

## Constants

- `COURTS = 3` is hardcoded in `App.tsx:14`. Changing court count requires updating validation (which checks `rota.courts.length !== courts`) and the sample data.
- Default `pointsPerCourt` is 24, but is user-configurable per session.
- `validateSessionSetup` enforces exactly 16 players (Americano format assumption).
