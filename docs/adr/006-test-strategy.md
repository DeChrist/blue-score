# ADR-006: Focused Test Strategy

## Status
Accepted

## Decision
Tests stay close to current risk.

Pure-function tests cover scoring, validation, import parsing, and storage behavior. React Testing Library is not added until repeated UI-state or accessibility regressions justify the dependency and setup cost.

## Consequences
- New domain behavior needs unit tests in the same change.
- Import and storage trust-boundary changes need negative tests.
- Manual browser/mobile checks remain useful for courtside interaction details.
