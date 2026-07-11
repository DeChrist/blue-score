# ADR-011: URL-Driven App Modes

## Status
Accepted

## Decision
The app selects one of three modes from the `?mode=` query parameter, parsed by `src/appMode.ts` into `AppMode` (`standard` | `demo` | `advanced`). `App.tsx` reads the mode once at module level.

Mode is entry/presentation configuration, not domain state. It is never persisted in `Session`, never included in import/export JSON, and never affects scoring math or standings.

- **standard** (default) — normal play; rotas come from the in-browser generator (ADR-007).
- **demo** — loads bundled sample data (`src/sampleData.ts`) for showcase and manual testing.
- **advanced** — exposes JSON rota import through `StaticRotaProvider` (ADR-002, ADR-007).

Unknown or missing `mode` values fall back to `standard`.

## Consequences
- Like Club config (ADR-010), mode is a startup/entry boundary and is deliberately excluded from portable session data.
- The fallback-to-`standard` rule keeps unknown URLs fail-safe rather than erroring.
- Adding a mode means extending the `AppMode` union and `parseAppMode`, with a matching case in `src/appMode.test.ts`.
- Feature gating belongs at the mode boundary in `App.tsx`, not scattered through domain modules — scoring/validation/provider code stays mode-agnostic.
