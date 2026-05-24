# Technical Debt (TD) Backlog

Living list of quality work, not an architecture decision. Priorities are an initial assessment and may be revised.

## Current Baseline

- Small local-first React/TypeScript app with clear domain boundaries and ADRs.
- CI enforces lint, tests, and build on Node 24.
- Latest assessed validation run: [CI-CD #46](https://github.com/DeChrist/blue-score/actions/runs/26333141027) passed with 93 tests on 2026-05-23.
- Strongest coverage is in scoring, validation, storage, export, and deterministic rota generation.
- Main risk areas are imported-data ambiguity, setup/scoring state transitions, and browser responsiveness.

## Prioritized Backlog

| Priority | TD | Why it matters | Likely action |
| --- | --- | --- | --- |
| P1 | Reject ambiguous imported rota identifiers | Duplicate rota or court numbers can make result entry and lookup ambiguous. | Validate unique rota numbers and unique valid court numbers; add negative import tests. |
| P1 | Prevent scoring against stale setup data | Changing players or player ids can leave existing rotas/results visible even when the setup is no longer valid. | Invalidate dependent data or block scoring until setup is valid; add regression coverage. |
| P2 | Add thin UI workflow coverage | Restore/new session, editing submitted scores, import, and setup invalidation rely on untested React state transitions. | Add focused component/browser tests for critical flows only. |
| P2 | Set a rota-generation responsiveness target | Generation is synchronous; the 16-player/3-court CI case took about 4.7 seconds. | Measure on target phones; optimize or move generation off the main thread if needed. |
| P3 | Verify production security output in CI | CSP injection is a build-time control but is not asserted by a dedicated test. | Check built `index.html` for the expected CSP and referrer policy. |
| P3 | Review bundled font payload | The mobile-first app ships multiple font files and weights. | Keep only required fonts, weights, and subsets if load size is material. |

## Working Rule

Treat P1 items as correctness work before expanding features around imports or session setup.
