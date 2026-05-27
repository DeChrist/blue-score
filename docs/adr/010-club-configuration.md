# ADR-010: Club Configuration

## Status
Accepted

## Decision
Blue Score supports one app-bundled `Club` configuration loaded at startup from `src/clubConfig.json` and validated through `src/club.ts`.

The Club is application configuration, not session data. It is deliberately excluded from exported/imported `Session` JSON so sessions remain portable across club builds.

The current Club fields are:

- `name` — required display name, max 32 characters.
- `logoSvg` — required SVG string, stored for future icon/app-icon use but not rendered in the UI yet.
- `courts` — ordered array of 2 through 6 courts; array position maps to court number.
- `courts[].name` — optional display name, max 32 characters.
- `websiteUrl` — optional; omitted/empty in JSON or absolute `http(s)` URL.

The visible app title and browser document title render as `{Club name} - Padel Americano`. If `websiteUrl` is present, the visible club name links to it.

## Court Count Rules

Fresh sessions still default to `courtCount: 3`.

During setup, the active Club's court count caps the maximum selectable and valid `Session.courtCount`. This cap applies to generated rotas, imported rotas, and full-session import validation. The domain generator still supports 2 through 6 courts; a particular app build may expose fewer courts through Club configuration.

## Court Labels

Scoring uses Club court names for court headings:

- empty name: `Court 2`
- configured name: `Court 2 - Center`

Court names are display metadata only. They are not persisted in sessions, exported in results, or used by rota generation.

## Consequences

- `src/club.ts` is the startup trust boundary for app-bundled Club JSON.
- `src/validation.ts` keeps a default 2-through-6 setup limit for generic/session callers, while app callers pass the active Club court cap.
- Future favicon/app-icon work can use `logoSvg`, but must remain compatible with the existing production CSP.
