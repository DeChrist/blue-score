# Setup Panel Notes

Applies to the `Session setup` panel.

## Current Accepted Behavior

- Session name and points-per-court fields stay visible.
- Court count remains editable during setup, defaults to 3 on fresh sessions, and is capped by the active Club's configured courts.
- Player editor supports add, edit, and remove before scoring.
- Player and rota JSON imports use native `<details>` plus textareas.
- Setup validation errors appear below the validation action and are capped in the UI.
- Draft setup edits may persist to `localStorage`; this is intentional for refresh safety.

## Keep

- Compact rows and practical density.
- Monospace JSON textareas.
- Imported rotas and full-session imports must respect the same Club court-count cap as generated rotas.
- Import session JSON belongs in the export/import panel, not setup.
- Remove-player icon buttons need accessible labels.

## Future Backlog Candidates

- Field-level `aria-invalid` for setup errors.
- A lightweight “validate JSON” action beside import buttons.
- Collapse setup by default on small screens after a session is ready.
