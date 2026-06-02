# ADR-006: Focused Test Strategy

## Status
Accepted

## Decision
Tests stay close to current risk.

Pure-function tests cover scoring, validation, import parsing, storage behavior, rota generation, and rota provider mapping. They remain the default and carry the bulk of coverage.

React Testing Library is now allowed, but **selectively**, for high-value UI regression tests — app wiring and user-visible workflows (session phase transitions, sequential rota gating, submit gating, history/standings updates) that pure-function tests cannot reach. RTL is not a replacement for unit tests: rules already covered by scoring/session/storage unit tests are not re-asserted through the DOM.

Placement and constraint rules for RTL tests:

- **Placement.** App-workflow tests are colocated in `src/` (e.g. `src/App.workflow.test.tsx`), matching the existing test convention. Shared render/fixture helpers live under `src/test/` only when genuinely reused across files; otherwise keep them local to the test. Global jsdom setup lives in `src/test/setup.ts` and stays minimal (jest-dom matchers, DOM cleanup, storage/URL/timer/mock reset).
- **Query by accessibility.** Select elements by role and accessible name (e.g. `getByRole("spinbutton", { name: "Court 1 left score" })`), not by class or test id. This keeps tests honest about the accessibility tree and doubles as a11y regression coverage. Note: jsdom does not apply external CSS, so responsive show/hide cannot be asserted — assert behavior via DOM presence instead.
- **Mock only the rota-generation boundary.** `GeneratedRotaProvider` may be mocked (kept local to the test file) so `Start session` is deterministic and fast. Do not mock UI components, scoring helpers, session-phase logic, storage validation, or standings/history rendering.

Coverage is collected on every CI run via `@vitest/coverage-v8` (v8 provider; text, HTML, and lcov reporters). `src/main.tsx` and `src/sampleData.ts` are excluded from coverage — they are entry/fixture files with no domain logic. With the RTL workflow tests in place, `App.tsx` and the React components are now exercised rather than reading 0%.

## Consequences
- New domain behavior needs unit tests in the same change.
- Import and storage trust-boundary changes need negative tests.
- High-value UI workflow regressions are guarded by selective RTL tests; new such tests follow the placement and constraint rules above.
- Manual browser/mobile checks remain useful for courtside interaction details and for responsive layout (which jsdom cannot verify).
- A `coverage-report` artifact (HTML + lcov) is uploaded on every CI run for inspection.
