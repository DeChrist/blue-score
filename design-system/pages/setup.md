# Setup Panel Notes

Applies to the `Session setup` panel.

## Current Accepted Behavior

- Session name and points-per-court fields stay visible.
- Player editor supports add, edit, and remove before scoring.
- Player and rota JSON imports use native `<details>` plus textareas.
- Setup validation errors appear below the validation action and are capped in the UI.
- Draft setup edits may persist to `localStorage`; this is intentional for refresh safety.

## Keep

- Compact rows and practical density.
- Monospace JSON textareas.
- Import session JSON belongs in the export/import panel, not setup.
- Remove-player icon buttons need accessible labels.

## Future Backlog Candidates

- Field-level `aria-invalid` for setup errors.
- A lightweight “validate JSON” action beside import buttons.
- Collapse setup by default on small screens after a session is ready.
