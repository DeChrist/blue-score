# Padel Americano Scoring

Single-page, browser-only React + TypeScript app for running a padel Americano scoring session.

## Run

```bash
npm install
npm run dev
```

## Test

```bash
npm test
```

The app stores the full session in `localStorage` under `padel-americano-session-v1`, with guarded read/write/clear handling.

Rota generation is intentionally not implemented. `StaticRotaProvider` imports precomputed rota JSON, while `PlaceholderGeneratedRotaProvider` defines the future provider boundary.

## Architecture Decisions (ADR Snapshot)

This section captures current architecture decisions that guide future changes.

1. **ADR-001: Keep React + Vite SPA architecture**
- Single-page, browser-only app.
- No router and no external state-management library at this stage.
- `App.tsx` remains the root state owner for `Session`.

2. **ADR-002: Keep domain logic pure and isolated**
- Scoring logic stays in `src/scoring.ts` as pure utilities.
- Validation and import parsing live in `src/validation.ts`.
- UI components consume these boundaries instead of duplicating rules.

3. **ADR-003: Local-first persistence**
- Session data is stored in browser `localStorage` only.
- Persistence key remains `padel-americano-session-v1`.
- No network sync or tracking by default.

4. **ADR-004: Preserve design-system-driven CSS**
- Keep styling in `src/styles.css` guided by `design-system/MASTER.md`.
- Do not adopt Tailwind at this stage.

5. **ADR-005: Step 1 quality gates (implemented)**
- ESLint v9 flat config is active via `eslint.config.js`.
- CI enforces `npm run lint`, `npm test`, and `npm run build` on PRs and `main`.
- Lint warnings fail the build (`--max-warnings 0`).

6. **ADR-006: Step 2 import trust boundary (implemented)**
- Import parsing (`parseImported*` functions) in `validation.ts` defends against malformed external data.
- Boundary tests live in `validation.imports.test.ts`.

7. **ADR-007: Do not use React Testing Library (RTL) at this stage**

_Rationale:_ The codebase is young and single-file in core logic. Pure-function tests (scoring, validation) deliver high coverage and fast feedback without the overhead of DOM mocking and component test setup.

_When RTL becomes valuable:_ Add RTL when we encounter regression patterns that pure-function tests cannot catch:
- **State synchronization bugs** (e.g., when props change and local state gets out of sync with no logic to re-sync). Example: regression where score UI failed to initialize after rotas were imported because state was captured before data arrived.
  - *Test case:* Render RotaScoring with no rotas, then async-load rotas, assert scores initialize with balanced defaults.
- **Multi-component orchestration** (e.g., if App.tsx logic becomes too complex to test via session mutations alone).
- **Touch/wheel interaction edge cases** in ScoreSpinner (currently manual testing; RTL would automate).
- **Accessibility regressions** in keyboard navigation or ARIA labels.

_Cost:* Adding RTL requires `@testing-library/react`, test utilities, and time investment in DOM debugging. Pure functions remain the first line of defense.

8. **ADR-008: Test strategy is incremental, not over-scaffolded**
- Tests remain close to current needs and grow as features demand.
- Current high-value boundaries are covered first (scoring and import parsing).

9. **ADR-009: Step 3 pure-function coverage expansion (implemented)**
- Expanded pure-domain tests in `src/scoring.test.ts` for non-obvious scoring behavior:
	- `currentRotaNumber` advancement,
	- all-rotas-submitted fallback,
	- ignored orphan results,
	- tie rank/average behavior.
- Added `src/validation.test.ts` for session/player/rota validation edge cases and happy paths.
- Kept test growth incremental without broad folder scaffolding changes.

10. **ADR-010: Step 4 storage hardening (implemented)**
- `src/storage.ts` now uses explicit result types (`LoadSessionResult`, `StorageActionResult`) instead of silent failures.
- Stored session loads are shape-validated through import parsing; corrupted/invalid payloads are reset.
- Save and clear operations are guarded against unavailable or failing browser storage and return user-facing warnings.
- `src/App.tsx` now commits session updates through storage-aware persistence flow, surfacing storage warnings in notices.
- Added `src/storage.test.ts` to cover corrupted data handling and storage failure paths.

11. **ADR-011: Scoring regression guardrails (implemented)**
- Keep score initialization and score update rules as pure helpers in `src/scoring.ts`.
- `RotaScoring.tsx` should consume those helpers instead of re-implementing score math in UI handlers.
- Any scoring behavior change should include targeted tests in `src/scoring.test.ts` for:
	- balanced initialization from `pointsPerCourt`,
	- upsert behavior when a court score row is missing,
	- mirrored/clamped score updates.

## Mobile Testing From Local Dev

Use this section to test quickly on a real iPhone without CI/CD.

### Option A: Same Wi-Fi (fastest)

1. Start Vite:

```bash
npm run dev
```

2. Find your machine LAN IP:

```bash
hostname -I
```

3. Open on iPhone Safari (same network):

```text
http://<LAN_IP>:5173
```

### Option B: Cloudflare quick tunnel (works across networks)

1. Start Vite:

```bash
npm run dev
```

2. Start tunnel:

```bash
npx cloudflared tunnel --url http://localhost:5173
```

3. Open the provided URL (example):

```text
https://random-name.trycloudflare.com
```

### Cloudflare tunnel notes

- Vite is configured to allow `*.trycloudflare.com` hosts in dev (`server.allowedHosts`).
- The quick tunnel URL changes each run; if needed, restart `cloudflared` to get a fresh URL.
- Keep both `npm run dev` and `cloudflared tunnel` running during testing.

