# Blue Score

Single-page, browser-only React + TypeScript app for running a padel Americano scoring session.

## Current MVP

- Versioning: Git tags and GitHub Releases are created by CI on `main`
- Runtime: browser only, no backend, no authentication
- Persistence: full session in `localStorage` under `padel-americano-session-v1`
- Rota source: in-browser deterministic generation in standard mode; imported JSON through `StaticRotaProvider` in advanced mode
- Deployment: GitHub Pages via `.github/workflows/ci-cd.yml`
- Security: all assets self-contained; production build applies a strict Content-Security-Policy via Vite transform (see [ADR-008](docs/adr/008-browser-security-hardening.md))

Rota generation runs fully in the browser with no backend, randomness, precomputed files, or network calls. `GeneratedRotaProvider` maps numeric technical schedules back to the existing domain `Player.id` values.

## App Modes

Controlled by the `?mode=` query parameter:

| Mode | Description |
|------|-------------|
| `standard` (default) | Simplified UI; generates deterministic rotas in the browser |
| `demo` | Pre-loaded sample data for demonstrations |
| `advanced` | Full JSON import/export for power users |

**Public demo:** <https://dechrist.github.io/blue-score/?mode=demo>

## Commands

```bash
npm install
npm run dev           # standard mode
npm run dev:demo      # demo mode (pre-loaded data)
npm run dev:advanced  # advanced mode (import/export)
npm run lint
npm test
npm run build
```

CI uses Node 24 and runs lint, tests, and build before deployment.

On pushes to `main`, the workflow then runs a `release` job after deploy:

- major bump: commits matching `+semver: major`, `BREAKING CHANGE`, or Conventional Commit bang form (for example `feat!:`)
- patch bump: commits matching `+semver: patch` or `fix:` / `fix(scope):`
- minor bump: default when neither major nor patch rules match

The job creates and pushes a `vX.Y.Z` tag and publishes a GitHub Release with generated notes.

## Architecture

- ADR index: [docs/adr/README.md](docs/adr/README.md)
- Agent instructions: [.github/copilot-instructions.md](.github/copilot-instructions.md)
- Design system: [design-system/MASTER.md](design-system/MASTER.md)

Key source boundaries:

- `src/scoring.ts`: deterministic scoring and standings helpers
- `src/validation.ts`: JSON import parsing and domain validation
- `src/storage.ts`: guarded browser storage reads/writes
- `src/rotaGenerator.ts`: deterministic bounded Americano rota generation using numeric player indexes
- `src/rotaProvider.ts`: rota provider interface, generated provider, and static import provider

The generator starts iterative deepening from the theoretical lower bound and returns the first fully covered rota found by bounded deterministic beam search. The rotation count is the minimum found by that search, not a proof of global optimality.

## Mobile Testing

Same Wi-Fi:

```bash
npm run dev
```

Open `http://<LAN_IP>:5173` on the phone.

Cloudflare tunnel:

```bash
npm run mobile-test
```

Open the generated `trycloudflare.com` URL on the phone.
