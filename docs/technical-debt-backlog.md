# Technical Debt (TD) Backlog

Living list of quality work, not an architecture decision. Priorities are an initial assessment and may be revised.

## Current Baseline

- Small local-first React/TypeScript app with clear domain boundaries and ADRs.
- CI enforces lint, tests, and build on Node 24.
- Latest assessed validation run: [CI-CD #46](https://github.com/DeChrist/blue-score/actions/runs/26333141027) passed with 93 tests on 2026-05-23.
- [SonarCloud open issues](https://sonarcloud.io/project/issues?issueStatuses=OPEN%2CCONFIRMED&id=DeChrist_blue-score) reviewed on 2026-05-24: 32 issues, estimated effort 2h 59min.
- Strongest coverage is in scoring, validation, storage, export, and deterministic rota generation.
- Main risk areas are imported-data ambiguity, setup/scoring state transitions, and browser responsiveness.

## SonarCloud Summary

| Impact | Aggregated finding | Take |
| --- | --- | --- |
| High | 1 [security finding](https://sonarcloud.io/project/issues?open=AZ5U58IpqJQ-O8gW3-05&id=DeChrist_blue-score) in `storage.ts` | Triage first; initial review suggests this may need documented disposition rather than a behavior change. |
| High | 2 reliability findings in `validation.ts` ([first finding](https://sonarcloud.io/project/issues?open=AZ5U58H4qJQ-O8gW3-0r&id=DeChrist_blue-score)) | Fixed in #23; pending SonarCloud refresh. |
| High | 2 cognitive-complexity findings in `rotaGenerator.ts` ([first finding](https://sonarcloud.io/project/issues?open=AZ5U58I1qJQ-O8gW3-07&id=DeChrist_blue-score)) | Address carefully alongside generator runtime work. |
| Medium | 3 readability/rendering findings in React code ([first finding](https://sonarcloud.io/project/issues?open=AZ5U58IeqJQ-O8gW3-03&id=DeChrist_blue-score)) | Small cleanup batch, not urgent. |
| Low | 26 convention/readability findings across app, components, export, generator, provider, and validation code ([first finding](https://sonarcloud.io/project/issues?open=AZ5U58IeqJQ-O8gW3-0y&id=DeChrist_blue-score)) | Batch opportunistically; do not drive design changes. |

Issue links identify the current SonarCloud findings; resolved or removed issues may no longer appear at these open-issue URLs. For the ESLint rule mapping see [sonar-eslint-mapping.md](sonar-eslint-mapping.md).

## Prioritized Backlog

| Priority | TD | Why it matters | Likely action | Agent |
| --- | --- | --- | --- | --- |
| P1 | Disposition SonarCloud security finding in `storage.ts` | SonarCloud flags the `localStorage` read; current code passes all values through explicit `readRequired*` helpers — no untrusted keys are spread onto domain objects. | Confirm no injection sink exists, then mark the finding appropriately in SonarCloud. | OK |
| — | ~~SonarCloud reliability findings in `validation.ts`~~ | ~~Two bare `.sort()` calls without a comparator (S2871).~~ | Fixed in #23; pending SonarCloud refresh. | — |
| — | ~~Reject ambiguous rota identifiers~~ | ~~Duplicate `rotaNumber` values across rotas, or duplicate `courtNumber` within a rota, make result lookup silently wrong.~~ | Resolved in `feat/session-phase-machine`: uniqueness checks added to `validateRota` and `validateRotas`; negative tests added to `validation.imports.test.ts`. | — |
| — | ~~Prevent scoring against stale setup data~~ | ~~Three roster-change paths leave stale rotas in place.~~ | Resolved in `feat/session-phase-machine`: phase lock prevents mutations in scoring/complete phase; legacy session recovery clears stale rotas on load and preserves players/settings. | — |
| P2 | React Testing Library workflow coverage | Setup lock, reset, import confirmation, sequential tab behaviour, and legacy recovery warning are not covered by automated UI tests. | Add focused component/browser tests for these critical flows. | OK |
| P2 | Reduce rota-generator risk and runtime | Generation is synchronous; the 16-player/3-court CI case took about 4.7 seconds, and SonarCloud flags two complex functions. | Set a phone runtime target; simplify hotspots without weakening invariant tests. | Design↑ |
| P3 | Verify production security output in CI | CSP injection is a build-time control but is not asserted by a dedicated test. | Check built `index.html` for the expected CSP and referrer policy. | OK |
| P3 | Review bundled font payload | The mobile-first app ships multiple font files and weights. | Keep only required fonts, weights, and subsets if load size is material. | Design↑ |
| P3 | Batch low-value SonarCloud cleanup | Most remaining findings are convention or readability items. | Handle only in scoped cleanup work or when touching nearby code. | OK |
| P3 | `Session.courtCount` as groundwork for Club config | `courtCount` is now a per-session field. Future work: pre-fill from a Club entity or shared config. | Deferred — no immediate action needed. | Design↑ |

## Agent Notes

**Fix vs. disposition:** AI-generated code often produces patterns that are functionally correct but flagged by static analysers on naming or convention grounds. Before refactoring, check whether the finding is a real correctness issue or just a mismatch (e.g., a function named `fail` that can return `valid: true` when called with an empty array — correct at every callsite, but confusing by name). For the latter, a brief inline comment explaining the intent is lower-risk than a broad refactor.

**Agent column key:** `OK` — self-contained and testable, safe to action autonomously. `Design↑` — requires a human decision on scope or behaviour before writing code.

## Working Rule

Resolve or disposition P1 items before expanding features around imports or session setup.
