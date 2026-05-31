# Blue Score

[![CI-CD](https://github.com/DeChrist/blue-score/actions/workflows/ci-cd.yml/badge.svg?branch=main&event=push)](https://github.com/DeChrist/blue-score/actions/workflows/ci-cd.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=DeChrist_blue-score&metric=alert_status)](https://sonarcloud.io/dashboard?id=DeChrist_blue-score)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=DeChrist_blue-score&metric=coverage)](https://sonarcloud.io/component_measures?id=DeChrist_blue-score&metric=coverage)

Single-page, browser-only React + TypeScript app for running a padel Americano scoring session. No backend, no authentication, no network calls — everything runs in the browser and persists to `localStorage`.

**Public demo:** <https://dechrist.github.io/blue-score/?mode=demo>

## Quick Start

Requires **Node 24**.

```bash
npm install
npm run dev   # → http://localhost:5173
```

No account, backend, or configuration required — the app runs entirely in the browser.

## App Modes

Controlled by the `?mode=` query parameter:

| Mode | Description |
|------|-------------|
| `standard` (default) | Simplified UI; generates deterministic rotas in the browser |
| `demo` | Pre-loaded sample data for demonstrations |
| `advanced` | Full JSON import/export for power users |

## Architecture

Decisions are recorded as ADRs; read the index before changing anything load-bearing:

| Document | Purpose |
|---|---|
| [docs/adr/README.md](docs/adr/README.md) | ADR index — durable architectural decisions |
| [docs/technical-debt-backlog.md](docs/technical-debt-backlog.md) | Known quality work, agent safety flags |
| [design-system/MASTER.md](design-system/MASTER.md) | UI/CSS rules and component catalogue |
| [.github/copilot-instructions.md](.github/copilot-instructions.md) | Agent and contributor coding guidance |

Key source boundaries:

| File | Responsibility |
|---|---|
| `App.tsx` | Owns the current `Session`; persists changes through `storage.ts` |
| `src/scoring.ts` | Deterministic scoring and standings helpers |
| `src/validation.ts` | JSON import parsing and domain validation |
| `src/club.ts` | App-bundled Club config parsing, app title, court-label helpers |
| `src/storage.ts` | Guarded browser storage reads/writes |
| `src/rotaGenerator.ts` | Deterministic bounded Americano rota generation (numeric indexes) |
| `src/rotaProvider.ts` | Rota provider interface; maps generated rotas back to `Player.id` values |
| `src/sessionPhase.ts` | Derives `SessionPhase` from session data; no side effects |
| `src/appMode.ts` | Parses `?mode=` query param into `AppMode` |
| `src/styles.css` | All styling; governed by `design-system/MASTER.md` |

The rota generator starts iterative deepening from the theoretical lower bound and returns the first fully covered schedule found by bounded deterministic beam search. The rotation count is the minimum found by that search, not a proof of global optimality.

Club configuration (`src/clubConfig.json`) is loaded at startup and kept separate from `Session`. It controls title branding, court labels, and the court-count cap — it is never written into session exports.

---

## Contributor Guide

This project is authored entirely by AI agents under human direction. The guide below applies equally to **humans directing agents** and to **AI agents working directly** in the repository.

### Dev Environment

#### Dev Container — recommended

The repository ships a Dev Container (`.devcontainer/devcontainer.json`) based on `mcr.microsoft.com/devcontainers/javascript-node:24`. It bundles everything needed to develop and run AI-assisted sessions:

- Node 24 + npm
- GitHub CLI (`gh`)
- **Claude Code** (`claude` CLI, via `ghcr.io/anthropics/devcontainer-features/claude-code:1.0`)

**Setup (Mac):**

1. Install the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers).
2. Add `CLAUDE_CODE_OAUTH_TOKEN` to your host shell profile (`~/.zshrc` or `~/.bashrc`). The container forwards it automatically.
3. Open the repository in VS Code and choose **Reopen in Container**.
4. After the container starts, `claude` is available in the integrated terminal alongside the usual `npm` commands.

> **Token security:** `CLAUDE_CODE_OAUTH_TOKEN` grants access to your Claude account. Store it only in your shell profile or a secrets manager — never in `.env` files, commit history, prompts, issues, or shared terminal output. If you suspect exposure, revoke the token at [claude.ai](https://claude.ai) immediately.

The Claude state directory (`/home/node/.claude`) is backed by a named Docker volume so the token and session data survive container rebuilds.

> **Platform note:** Tested on **Mac only**. Windows support is TODO.

#### Local Setup

```bash
node --version   # must be 24.x
npm install
```

### Commands

```bash
npm run dev             # dev server — standard mode
npm run dev:demo        # dev server — demo mode (pre-loaded data)
npm run dev:advanced    # dev server — advanced mode (import/export)
npm run mobile-test     # Cloudflare tunnel for on-device testing
npm run lint            # ESLint with --max-warnings 0
npm test                # Vitest unit tests
npm run test:coverage   # coverage report (HTML + lcov in coverage/)
npm run build           # production build
```

### Mobile Testing

**Same Wi-Fi:** run `npm run dev` and open `http://<LAN_IP>:5173` on the device.

**Cloudflare tunnel:** run `npm run mobile-test` and open the generated `trycloudflare.com` URL.

### CI / CD

CI runs on Node 24 and enforces **lint → test:coverage → build → deploy** before any merge reaches GitHub Pages. Coverage output (HTML + lcov) is uploaded as a `coverage-report` artifact and consumed by SonarCloud.

After a successful deploy to `main`, the `release` job creates a `vX.Y.Z` tag and GitHub Release. Bump rules:

| Trigger | Bump |
|---|---|
| `+semver: major`, `BREAKING CHANGE`, `feat!:` | major |
| `+semver: minor`, `feat:` / `feat(scope):` | minor |
| `+semver: patch`, `fix:` / `fix(scope):` | patch |
| docs/chore only, or no matching pattern | no release |

Always include a `+semver:` directive in the commit body when the change warrants a version bump.

### Working with AI Agents

The primary coding guidance for agents lives in [`.github/copilot-instructions.md`](.github/copilot-instructions.md). Read it before writing any code.

**Recommended start sequence for an agent picking up a task:**

1. `docs/adr/README.md` — understand durable constraints before proposing solutions
2. `docs/technical-debt-backlog.md` — check the `Agent` column; `Design↑` items need a human decision before coding starts
3. Run `npm run lint && npm test` — establish a clean baseline before touching anything
4. `design-system/MASTER.md` — only when the task touches UI or CSS

**Quality gates an agent must not skip:**

- Lint must pass at zero warnings (`--max-warnings 0`).
- Any new module with exported pure functions needs a matching `*.test.ts` in the same PR.
- `vitest` and `@vitest/coverage-v8` must always be bumped to the same version — they are peer-locked.
- Commits must use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) with a `+semver:` directive where applicable.

---

## Security & Community

To report a vulnerability, use [GitHub private advisories](https://github.com/DeChrist/blue-score/security/advisories/new) or see [SECURITY.md](SECURITY.md).

To report a bug or request a feature, [open an issue](https://github.com/DeChrist/blue-score/issues).

`CONTRIBUTING.md` and `CODE_OF_CONDUCT.md` are planned for when the project grows beyond its current structure.

---

## License

Licensed under the [MIT License](LICENSE).
