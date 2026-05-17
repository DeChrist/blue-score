# Blue Score

Single-page, browser-only React + TypeScript app for running a padel Americano scoring session.

## Current MVP

- Version: `0.2.0`
- Runtime: browser only, no backend, no authentication
- Persistence: full session in `localStorage` under `padel-americano-session-v1`
- Rota source: imported precomputed JSON through `StaticRotaProvider`
- Deployment: GitHub Pages via `.github/workflows/ci-cd.yml`

Rota generation is intentionally not implemented. `PlaceholderGeneratedRotaProvider` is the extension point for a future generated-rota module.

## App Modes

Controlled by the `?mode=` query parameter:

| Mode | Description |
|------|-------------|
| `standard` (default) | Simplified UI; rota generation placeholder |
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

## Architecture

- ADR index: [docs/adr/README.md](docs/adr/README.md)
- Agent instructions: [.github/copilot-instructions.md](.github/copilot-instructions.md)
- Design system: [design-system/MASTER.md](design-system/MASTER.md)

Key source boundaries:

- `src/scoring.ts`: deterministic scoring and standings helpers
- `src/validation.ts`: JSON import parsing and domain validation
- `src/storage.ts`: guarded browser storage reads/writes
- `src/rotaProvider.ts`: rota provider interface and static import provider

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
