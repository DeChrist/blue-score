# ADR-006: Focused Test Strategy

## Status
Accepted

## Decision
Tests stay close to current risk.

Pure-function tests cover scoring, validation, import parsing, storage behavior, rota generation, and rota provider mapping. React Testing Library is not added until repeated UI-state or accessibility regressions justify the dependency and setup cost.

Coverage is collected on every CI run via `@vitest/coverage-v8` (v8 provider; text, HTML, and lcov reporters). `src/main.tsx` and `src/sampleData.ts` are excluded from coverage — they are entry/fixture files with no domain logic. `App.tsx` and React components are included in the coverage scope but will read 0% until UI tests are added; that gap is tracked in the TD backlog.

## Consequences
- New domain behavior needs unit tests in the same change.
- Import and storage trust-boundary changes need negative tests.
- Manual browser/mobile checks remain useful for courtside interaction details.
- A `coverage-report` artifact (HTML + lcov) is uploaded on every CI run for inspection.
