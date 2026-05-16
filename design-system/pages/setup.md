# Setup screen — page override

> Overrides `design-system/MASTER.md` for the left-column `Session setup` panel: session name, points per court, player editor, JSON import accordions, validate button.
> If a rule isn't listed here, fall back to MASTER.

## Scope

Everything inside `<section class="panel setup-panel">` plus its sticky behavior on desktop.

## Layout

- **Desktop (≥980px)**: sticky to top of viewport, internal scroll if it overflows. Width column: `0.85fr` (~310–360px) — narrower than scoring, wider than export.
- **Mobile**: full-width, ordered **second** below the scoring section (scoring always comes first when a session is active). Setup is collapsed by default once the session is `valid`; expose with a `Settings` chip in the topbar.
- **Player editor** scroll cap: 340px (current) on desktop, `60vh` on mobile so the JSON import accordions remain reachable.

## Density

- Form rows are tighter than scoring: `0.5rem` vertical gap (vs `0.7–1rem` in scoring).
- Inputs at 42px height — meets touch min, conserves vertical space. **Do not** apply the 74px score-input height here.

## Player row

- 3 columns: `id` (compact) / `displayName` (flex) / remove button (42px square).
- On mobile: `id` and `displayName` share `1fr 1fr` (current). Consider hiding `id` behind a "Show IDs" toggle if user feedback says IDs are noise — IDs only matter for JSON round-tripping.
- **Add player** button: ghost style, full-width, dashed border to read as a placeholder slot — visually different from primary actions.
- **Remove player** button: `aria-label="Remove player <name|index>"`. Confirmation **not** required during setup (results are always empty during setup). It **is** required if removing a player who has rotas referencing them — but block this at the validation layer, not at the click.

## JSON import accordions

- Use `<details>` (current pattern, accessible by default).
- `Import players JSON` collapsed by default; `Import rotas JSON` open by default during initial setup (rotas are the harder thing to provide and the bigger textarea is the productive workspace).
- Textarea: monospace (`Fira Code`), `min-height: 170px`, `resize: vertical`. Show a small `Validate JSON` link beside `Import` that runs `JSON.parse` and reports the parse error inline before attempting the domain validation.

## Validate button

- Full-width, primary (`--color-primary`). Disabled state: opacity 0.55, cursor `not-allowed` (current).
- Label changes with state:
  - Setup incomplete → `Validate setup` (current)
  - Setup valid, scoring not started → `Validate setup` (re-validate, idempotent)
  - Already validated, no setup change → `Setup ready ✓` (`<Check>` icon, disabled-look but interactive — clicking re-runs validation)

## Error display

- One `<p class="error">` per validation error, listed below the Validate button (current).
- Cap at 8 errors visible (current); if more, show `…and N more` with an "Expand" disclosure.
- Each error should reference the offending field by name when possible (e.g., "Player 3: displayName cannot be empty"). The field's input gets `aria-invalid="true"` and a 2px `--color-danger-border` ring until corrected.

## Accessibility additions (beyond MASTER)

- The Setup panel has `aria-labelledby` pointing to its `<h2>`.
- The Validate button announces result via the shared `aria-live="polite"` region: `"Setup valid. 8 players, 3 courts, 24 points per court."` or `"3 errors found."`.
- `<details>` summaries already keyboard-accessible; ensure focus ring is visible on them (currently relies on default — keep).

## Anti-patterns (page-specific)

- ❌ Auto-validating on every keystroke (noisy; validate on Validate-button or on blur of the last required field only)
- ❌ Auto-saving and overwriting `localStorage` on every player edit if setup is invalid — only persist once `Validate` succeeds (prevents corrupting a good prior session by half-typing changes)
- ❌ Putting `Import session JSON` in the Setup panel — it belongs in Export panel (separation of "build this session" from "load a different session")
- ❌ Replacing JSON textareas with a custom GUI editor — the textareas are the escape hatch when something goes wrong; keep them
