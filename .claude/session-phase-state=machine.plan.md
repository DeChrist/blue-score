Here is the complete revised plan, self-contained for a fresh agent.

---

# Implementation Plan: Session Phase Machine + `Session.courtCount`

## Context

Repository: `blue-score` — local-first React/TypeScript Padel Americano scoring app. Key boundaries per `.github/copilot-instructions.md`:
- `App.tsx` owns session state and persists via `storage.ts`
- `scoring.ts` is pure utilities
- `validation.ts` handles JSON parsing + domain validation
- `rotaGenerator.ts` / `rotaProvider.ts` are pure rota generation
- Lint enforces `--max-warnings 0`; CI runs lint, tests, build

All commands: `npm run lint`, `npm test`, `npm run build`, `npx vitest run <file>`.

## Branch

`feat/session-phase-machine` off current `main`.

## Model

Three phases, all derived from existing `Session` data. No new persisted phase field.

| Phase      | Derivation                                           | Setup panel               | Scoring                              |
| ---------- | ---------------------------------------------------- | ------------------------- | ------------------------------------ |
| `setup`    | `rotas.length === 0`                                 | Fully editable            | "No rota loaded" hero                |
| `scoring`  | `rotas.length > 0 && results.length < rotas.length`  | Read-only summary + Reset | Sequential tab access                |
| `complete` | `rotas.length > 0 && results.length >= rotas.length` | Collapsed + Reset         | All tabs accessible; re-edit allowed |

Phase is derived once in `App.tsx`; passed as context where needed. Children do not re-derive.

---

## File-by-file Changes

### 1. NEW `src/sessionPhase.ts`

Export three items:

**`SessionPhase` type:**
```ts
export type SessionPhase = "setup" | "scoring" | "complete";
```

**`deriveSessionPhase(session: Session): SessionPhase`:**
```ts
if (session.rotas.length === 0) return "setup";
if (session.results.length >= session.rotas.length) return "complete";
return "scoring";
```
Edge: `rotas.length === 0` with non-empty results (corrupt state) → `"setup"`. Rotas are authoritative.

**`isRotaAccessible(rota: Rota, allRotas: Rota[], results: RotaResult[]): boolean`:**

A rota is accessible if it has a submitted result, OR its array index ≤ the index of the first unsubmitted rota in `allRotas` array order (not by `rotaNumber` value — imported identifiers may be non-consecutive or non-ascending).

```ts
export function isRotaAccessible(rota: Rota, allRotas: Rota[], results: RotaResult[]): boolean {
  const isSubmitted = results.some(r => r.rotaNumber === rota.rotaNumber);
  if (isSubmitted) return true;
  const firstUnsubmittedIndex = allRotas.findIndex(
    r => !results.some(res => res.rotaNumber === r.rotaNumber)
  );
  const thisIndex = allRotas.findIndex(r => r.rotaNumber === rota.rotaNumber);
  return firstUnsubmittedIndex !== -1 && thisIndex <= firstUnsubmittedIndex;
}
```

Note: do NOT use `rotaNumber <= session.currentRotaNumber` — that predicate breaks for imported rotas with non-ascending identifiers (e.g. `[5, 3, 1]`).

---

### 2. NEW `src/sessionPhase.test.ts`

Required by the project rule: "new module with exported pure functions → matching test in same PR."

Cover:
- `deriveSessionPhase`: setup (no rotas), scoring (partial results), complete (all results match), complete (results > rotas — corrupt but ≥ wins), setup when rotas empty even if results present
- `isRotaAccessible`:
  - Submitted rota is always accessible
  - First unsubmitted rota in array is accessible
  - Second unsubmitted rota in array is locked
  - Non-consecutive identifiers: rotas `[{rotaNumber:5}, {rotaNumber:3}, {rotaNumber:1}]` — after submitting `5`, only `3` is accessible
  - Non-ascending identifiers: same array, same result
  - Complete phase (all submitted): all rotas accessible
  - Empty results: only first rota in array is accessible

---

### 3. MODIFIED `src/types.ts`

Add `courtCount: number` to `Session`, between `pointsPerCourt` and `players`:

```ts
courtCount: number;
```

---

### 4. MODIFIED `src/validation.ts`

**a) New helper** — add after `readOptionalString`, following the same pattern:

```ts
function readOptionalInteger(record: UnknownRecord, key: string, path: string, errors: string[]): number | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value)) {
    errors.push(`${path}.${key} must be an integer when provided.`);
    return undefined;
  }
  return value;
}
```

**b) `parseImportedSession`** — add `courtCount` with migration default:

```ts
courtCount: readOptionalInteger(input, "courtCount", "session", errors) ?? 3,
```

Sessions stored before this change will parse successfully with `courtCount: 3`.

**c) `validateSessionSetup`** — drop the `courts: number` parameter; read from `session.courtCount`. Add `"courtCount"` to the `Pick`. Validate range:

```ts
if (!Number.isInteger(session.courtCount) || session.courtCount < 2 || session.courtCount > 6) {
  errors.push("Court count must be an integer from 2 through 6.");
}
```

Range 2–6 matches `rotaGenerator.validateGeneratorInput` exactly (confirmed at `rotaGenerator.ts:155`).

Update the `minPlayers`/`maxPlayers` check to use `session.courtCount`.

**d) `validateRota` and `validateRotas`** — add uniqueness checks (closes the P1 "Reject ambiguous rota identifiers" TD item; sequential scoring depends on unambiguous identifiers):

In `validateRotas`: reject duplicate `rotaNumber` values across the rota set.
In `validateRota`: reject duplicate `courtNumber` values within a single rota.

---

### 5. MODIFIED `src/storage.ts`

No structural changes. `loadSession` calls `parseImportedSession`, which now defaults `courtCount` to `3` for old sessions.

**Add legacy stale-rota recovery** inside `loadSession`, after `parseImportedSession` succeeds and `validateSessionResults` passes. Run `validateSessionSetup` on the parsed session:

```ts
const setupValidation = validateSessionSetup(importResult.value);
if (!setupValidation.valid && importResult.value.rotas.length > 0) {
  const recovered: Session = {
    ...importResult.value,
    rotas: [],
    results: [],
    currentRotaNumber: 1,
  };
  saveSession(recovered, options);
  return {
    session: recovered,
    warning: "Saved play data was incompatible with the stored player setup and has been cleared. Your players and settings have been kept.",
  };
}
```

This preserves `name`, `players`, `pointsPerCourt`, `courtCount` when rotas become invalid after an app update.

---

### 6. MODIFIED `src/App.tsx`

**Session model:**
- Remove `const COURTS = 3`
- `newSession()`: add `courtCount: 3`
- Replace all `COURTS` references with `session.courtCount`
- `validateSessionSetup(session, COURTS)` → `validateSessionSetup(session)` at all call sites

**Phase derivation** (near top of `App()` render, after `session` is confirmed non-null):
```ts
const phase = deriveSessionPhase(session);
```

**Courts selector** — number input in setup panel, between "Points per court" and "Players", visible in `setup` phase only:
- `min={2}` `max={6}` `type="number"`
- `onChange`: `commitSession({ ...session, courtCount: Number(event.target.value), rotas: [], results: [] })` — changing court count invalidates rotas
- Label: "Court count"

**Phase guards on mutation handlers** — add `if (phase !== "setup") return;` at the top of: `addPlayer`, `removePlayer`, `updatePlayer`, `loadPlayers`, `loadRotas`. Defense-in-depth; primary guard is hiding the UI controls.

**Standard mode "Setup Rotas" button** — rename label to `"Start session"`. This click is the explicit setup-to-scoring transition.

**Advanced mode "Validate setup" button** — remove it entirely. In advanced mode, importing rotas (via `loadRotas`) already transitions to `scoring` phase. The button was unreachable in scoring phase anyway. Validation errors already surface via the `setupErrors` display.

**Advanced full-session import** (`importFullSession`) — add a confirmation guard when currently in `scoring` or `complete` phase:
```ts
if (phase !== "setup" && !window.confirm("Importing a session will replace the current session including all results. Continue?")) return;
```

**Setup panel during `scoring` / `complete`:**
- Render session name, points per court, court count as read-only text values (not inputs)
- Hide: players editor, advanced JSON import `<details>` blocks, setup action buttons, setup errors
- Show: "Reset to setup" button (danger style)
- Collapse `setupOpen` when play starts (when rotas are first generated or imported), when a scoring/complete session is restored, and on session completion — but keep the toggle functional for read-only summary access

**`resetToSetup` handler** (new):
```ts
function resetToSetup() {
  if (!session) return;
  if (!window.confirm("This will clear all rotas and results. Your player list and settings will be kept. Continue?")) return;
  commitSession({ ...session, rotas: [], results: [], currentRotaNumber: 1 });
  setSelectedRotaNumber(1);
  setSetupErrors([]);
  setSetupOpen(true);
}
```

Distinct from "New session" (which clears everything including players).

**Session complete banner** — rendered above `StandingsTable` in `complete` phase:
```jsx
{phase === "complete" && (
  <section className="panel complete-panel">
    <h2>Session complete</h2>
    <p>{session.results.length} rotas played — see standings below.</p>
    <button className="ghost" type="button" disabled title="Coming soon">
      Add rota
    </button>
  </section>
)}
```

**Demo mode** — demo initializes with `rotas: sampleRotas`, so `phase = "scoring"` and setup is locked. Intentional: demo simulates an in-progress session.

**`setupGeneratedRotas` inline validation** — replace `COURTS` with `session.courtCount`. Do not refactor the inline duplication with `validateSessionSetup` (out of scope).

---

### 7. MODIFIED `src/components/RotaScoring.tsx`

No `phase` prop needed — App owns phase-specific rendering. `RotaScoring` only needs rota accessibility.

**Tab buttons** — use the `isRotaAccessible` helper:
```ts
import { isRotaAccessible } from "../sessionPhase";
// in the tab map:
disabled={!isRotaAccessible(r, session.rotas, session.results)}
```

**Complete phase behavior** — no structural change. Submit/replace remains enabled; editing a submitted rota in complete phase keeps all results present → stays complete.

---

### 8. `src/storage.ts`

No key/version change. Recovery logic is added inline in `loadSession` as described in §5.

---

### 9. `src/sampleData.ts`

Check if any exported session-shaped objects need `courtCount: 3` added. (Demo uses `newSession()` spread so it inherits automatically; check whether sampleData exports any standalone Session objects.)

---

## Test Changes

### NEW `src/sessionPhase.test.ts`
All cases listed in §2.

### MODIFIED `src/validation.imports.test.ts`
- Update the "parses a valid full session import" fixture to include `courtCount: 3`
- Add: session without `courtCount` defaults to `3`
- Add: `courtCount: 5` parses correctly
- Add: `courtCount: 1` fails validation (below 2)
- Add: `courtCount: 7` fails validation (above 6)
- Add: `courtCount: 2.5` fails validation (non-integer)
- Add: duplicate `rotaNumber` values rejected by `validateRotas`
- Add: duplicate `courtNumber` within a rota rejected by `validateRota`

### MODIFIED `src/storage.test.ts`
- Add: stored session without `courtCount` loads with `courtCount: 3`
- Add: stored session with stale rotas (fails `validateSessionSetup`) recovers — returns session with rotas/results cleared, players preserved, warning message set

### Update all typed `Session` fixtures across all test files
Any object literal typed as `Session` or passed where `Session` is expected needs `courtCount` added.

---

## Decisions Taken

1. **Phase is derived, not persisted.** `Session` gains only `courtCount: number`. No `startedAt`, `phase`, or `closedRotaNumbers`.
2. **"Start session" = generating rotas** (standard) or importing rotas (advanced). No second confirmation step. The generate/import click is already explicit and cannot happen accidentally.
3. **Array order governs sequential play**, not `rotaNumber` value ordering. `currentRotaNumber` remains a cursor for the current selection, not the authorization rule for tab access. `isRotaAccessible` uses array index.
4. **`validateSessionSetup` drops `courts` parameter.** `courtCount` read from `session.courtCount`. `Pick` expanded to include `"courtCount"`.
5. **Advanced "Validate setup" button removed.** Dead code once rotas-import is the transition trigger.
6. **Re-editing submitted scores allowed in `scoring` and `complete`.** `applyOrReplaceRotaResult` handles replacement; no phase restriction on edits.
7. **Sequential tab gate:** `isRotaAccessible` — submitted always accessible; future unsubmitted locked; only the first unsubmitted in array order is open.
8. **Demo mode is `scoring` phase.** Correct: simulates in-progress session.
9. **Legacy recovery:** stale stored rotas → preserve players/settings, clear rotas/results, display warning. Avoids player data loss on app update.
10. **Uniqueness validation in this PR.** Sequential scoring depends on unambiguous identifiers; both P1 TD items closed together. Changes confined to `validateRota`/`validateRotas` with negative tests.
11. **No React Testing Library dependency introduced.** UI workflow coverage tracked as new P2 TD item.
12. **Full-session import when scoring/complete** requires destructive confirmation.

---

## TD Backlog Updates (same PR, `docs/technical-debt-backlog.md`)

- Mark P1 "Prevent scoring against stale setup data": resolved by phase lock + legacy session recovery.
- Mark P1 "Reject ambiguous rota identifiers": resolved by uniqueness checks in `validateRota`/`validateRotas`.
- Note `Session.courtCount` as groundwork for future Club configuration.
- Add new P2 item: "React Testing Library workflow coverage — setup lock, reset, import confirmation, sequential tab behavior, legacy recovery warning."

---

## Out of Scope

- Player replacement mid-rota
- Adding rotas after session complete (disabled stub only)
- Club entity / pre-filling `courtCount` from club config
- `setupGeneratedRotas` deduplication with `validateSessionSetup`
- App.tsx split

---

## Completion Checklist

- [ ] `npm run lint` — zero warnings
- [ ] `npm test` — all pass including new and updated tests
- [ ] `npm run build` — clean
- [ ] Manual UI: standard start/reset, advanced rota import start, import-over-active confirmation, read-only collapsed setup, sequential tabs, complete view, re-edit submitted score, demo mode, legacy recovery warning on old session