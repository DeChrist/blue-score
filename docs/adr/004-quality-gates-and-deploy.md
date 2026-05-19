# ADR-004: Quality Gates And GitHub Pages Deploy

## Status
Accepted

## Decision
CI/CD is the source of truth for release readiness.

`.github/workflows/ci-cd.yml` runs on pull requests and `main`, using Node 24. It enforces:

- `npm run lint`
- `npm test`
- `npm run build`

Pushes to `main` deploy the Vite build to GitHub Pages.

## Consequences
- Local checks should mirror CI before finalizing changes.
- GitHub Actions permissions stay minimal and explicit.
- Deployment configuration belongs in CI, not in manual release notes.
- The production build step is also where browser security hardening is applied: `vite.config.ts` injects a strict Content-Security-Policy `<meta>` tag via `transformIndexHtml` only during `build`, so the CSP does not interfere with Vite dev tooling.
