# ADR-001: React + Vite SPA, Local-First Storage

## Status
Accepted

## Decision
Blue Score remains a browser-only React + TypeScript + Vite single-page app. There is no backend, authentication, router, or external state-management library for v0.1.x.

Session state is stored in `localStorage` under `padel-americano-session-v1`.

## Consequences
- `App.tsx` owns the current `Session` and passes state through props.
- Persistence must stay explicit and guarded through `src/storage.ts`.
- Server sync, accounts, and cross-device recovery are out of scope until a later product decision changes this ADR.
