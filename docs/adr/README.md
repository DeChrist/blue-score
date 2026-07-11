# Architecture Decisions

Compact ADRs for decisions that should guide future changes.

Quality follow-up items are tracked separately in the [Technical Debt (TD) Backlog](../technical-debt-backlog.md).

| ADR | Decision |
| --- | --- |
| [ADR-001](001-spa-local-first.md) | React + Vite SPA, local-first browser storage |
| [ADR-002](002-domain-and-rota-boundaries.md) | Keep scoring/validation/provider boundaries explicit |
| [ADR-003](003-import-and-result-validation.md) | Treat imported sessions and results as trust boundaries |
| [ADR-004](004-quality-gates-and-deploy.md) | Enforce CI quality gates and deploy GitHub Pages from CI/CD |
| [ADR-005](005-design-system-css.md) | Use a small CSS design system, not a UI framework |
| [ADR-006](006-test-strategy.md) | Prefer focused pure-function tests until UI regressions justify DOM tests |
| [ADR-007](007-deterministic-rota-generation.md) | Generate Americano rotas in-browser with bounded deterministic search |
| [ADR-008](008-browser-security-hardening.md) | Apply layered browser security controls: production-only CSP, referrer policy, self-contained assets |
| [ADR-009](009-session-phase-workflow.md) | Derive session phase (setup/scoring/complete) from data; phase gates setup mutations and sequential play |
| [ADR-010](010-club-configuration.md) | Load one app-bundled Club config for title branding, court labels, and setup court-count cap |
| [ADR-011](011-app-modes.md) | Select app mode (standard/demo/advanced) from `?mode=`; mode is entry config, not session data |
| [ADR-012](012-data-export.md) | Export results/standings as local CSV with RFC-4180 quoting and formula-injection guarding |
