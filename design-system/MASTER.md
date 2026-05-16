# Padel Americano — Design System (MASTER)

> Global source of truth. Page-specific rules in `design-system/pages/<page>.md` **override** these.
> Always read this file first when generating or modifying UI.

## Product context

- **Product type**: Single-purpose courtside utility (scoring tool for a padel Americano session)
- **Usage context**: Outdoor / mixed lighting, phone-held, often one-handed between rotations, occasionally wet/sweaty hands
- **Audience**: The session organizer + occasional shared-screen use among players
- **Stack**: React 19 + TypeScript + Vite, browser-only, `localStorage` persistence, `lucide-react` icons
- **Not a landing page, not a CMS, not a multi-screen app** — one screen, three panels (Setup / Scoring / Export). Avoid hero/marketing patterns.

## Core principles

1. **Outdoor-readable first** — light mode default with high contrast. A dark scheme would lose to direct sunlight on a court.
2. **Tabular figures everywhere a digit appears** — scores, standings, points-for/against. Width-stable numbers prevent layout jitter when scores change.
3. **Big touch targets, never less than 44×44px** — usable with one thumb. The existing ScoreSpinner (74px height) is the floor, not the ceiling.
4. **Two-team color anchor** — every score row has a stable Left/Right visual identity (green vs amber). Players orient by side, not by reading names.
5. **Zero decoration** — no shadows-for-shadow's-sake, no gradients, no animation beyond pressed state and score change feedback.

## Style

- **Name**: Light, high-contrast utility (sage-tinted)
- **Mode**: Light-only (no dark mode — outdoor use case overrides typical preference)
- **Vibe**: Sport-functional, calm, instrument-like. Think referee tablet, not consumer app.
- **Effects**: Flat surfaces, 1px borders, single soft shadow on top-level panels only (`0 10px 30px rgba(23,32,27,0.06)`). No glass, no neumorphism, no blur.

## Color tokens

| Token | Value | Use |
|-------|-------|-----|
| `--color-bg` | `#f5f7f2` | Page background (warm sage) |
| `--color-surface` | `#ffffff` | Panels, cards, inputs |
| `--color-fg` | `#17201b` | Primary text |
| `--color-fg-muted` | `#66736b` | Labels, meta, "vs", table headers |
| `--color-border` | `#dce4df` | Panel + input borders |
| `--color-border-soft` | `#e6ece8` | Table rules, internal dividers |
| `--color-primary` | `#176b4d` | Primary CTA (Validate / Submit), active rota chip text-on-dark fallback `#17201b` |
| `--color-on-primary` | `#ffffff` | Text on `--color-primary` |
| `--color-left-bg` | `#eef7f1` | Left team pair background |
| `--color-left-border` | `#abd4bd` | Left team pair border |
| `--color-right-bg` | `#fff5e6` | Right team pair background |
| `--color-right-border` | `#e0bb78` | Right team pair border |
| `--color-success-bg` | `#e7f5ee` | Notice banner |
| `--color-success-border` | `#9fcdb7` | Notice banner |
| `--color-danger` | `#982a1f` | Destructive button label / icons |
| `--color-danger-bg` | `#fff0ed` | Error banner |
| `--color-danger-border` | `#e7a39a` | Error banner |
| `--color-info-bg` | `#eef2ff` | Status chip (default) |
| `--color-info-fg` | `#31428f` | Status chip text |

**Contrast targets** (WCAG AA, verify before changing):
- `--color-fg` on `--color-surface` → ~14.5:1 ✓
- `--color-fg` on `--color-bg` → ~13.6:1 ✓
- `--color-on-primary` on `--color-primary` → ~6.4:1 ✓
- `--color-fg` on `--color-left-bg` / `--color-right-bg` → both ≥12:1 ✓

**Never** convey meaning by color alone. Left/Right pair colors are an *aid*, not the source of truth — pair labels still spell out the player names.

## Typography

- **Heading + UI**: `Fira Sans` (400, 500, 700, 900) — slightly humanist sans, sturdier than Inter for outdoor reading
- **Numbers + monospaced data**: `Fira Code` (400, 500, 700) — tabular figures, no kerning surprises on changing scores
- **Fallback stack**: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- **CSS import**: `@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;700&family=Fira+Sans:wght@400;500;700;900&display=swap');`

### Type scale

| Token | Size | Weight | Use |
|-------|------|--------|-----|
| `--text-display` | `clamp(1.8rem, 4vw, 3rem)` | 900 | Page title (h1) |
| `--text-h2` | `1.25rem` | 700 | Panel headers (h2) |
| `--text-h3` | `1rem` | 700 | Sub-section headers |
| `--text-body` | `1rem` (16px) | 400 | Default body |
| `--text-label` | `0.85rem` | 700 | Form labels |
| `--text-meta` | `0.78rem` | 500 uppercase | Table headers, "vs" |
| `--text-score` | `2.3rem` | 900 Fira Code | Score input digits |
| `--text-standing-num` | `1.05rem` | 700 Fira Code | Standings numeric cells |

- **Body minimum on mobile**: 16px (avoids iOS auto-zoom on focus)
- **Line height**: 1.5 for body, 1.2 for display
- **Tabular figures**: always set `font-variant-numeric: tabular-nums` on `.numeric`, `.score`, and any cell that mutates

## Spacing & layout

- **8px rhythm**: `0.5 / 0.7 / 1 / 1.5 / 2 / 3` rem
- **Border radius**: `8px` everywhere except chips/pills (`999px`). No mixed radii.
- **Panel padding**: `1rem` (mobile) → `1rem` (desktop). Resist enlarging on desktop; the data, not the chrome, should fill the new space.
- **Max width**: `1440px` shell. Three-column layout at `≥980px`: setup `0.85fr` / scoring `1.45fr` / export `0.7fr`. Below: single column, scoring first.
- **Mobile breakpoints**: `680px` (collapses score-row to single column, tables to stacked cards), `980px` (3-column grid). Mobile-first.

## Touch & interaction

- **Minimum tap target**: 44×44px. Floor for any in-court control is 48px; the score stepper buttons sit at 48px wide × 74px tall — keep them at least that.
- **Pressed feedback**: 80–150ms opacity dip to 0.85 + 1px border darken. No scale transform on the spinner (would shift adjacent score).
- **Hover**: desktop only — never the *only* state cue. Use focus-visible rings (2px `--color-primary`).
- **No hover-only affordances**. Every action discoverable on first touch.
- **Disable score-row pointer-events during result submit** to prevent double-fire; show inline spinner instead of replacing the score.
- **Wet-finger tolerance**: `touch-action: none` on score stepper (already in place) prevents scroll-conflict; do NOT add swipe gestures elsewhere that might compete.

## Forms & feedback

- **Labels always visible** (current pattern — keep). Never placeholder-only.
- **Errors inline below the field** for setup inputs; for cross-field issues use the existing error banner under the panel CTA.
- **Notice banner** auto-dismisses after 4s; preserve it for success only. Errors persist until user acts.
- **Number inputs** (`pointsPerCourt`, score spinner) use `inputmode="numeric"` to summon the numeric keyboard on mobile.
- **Confirmation required** for `New session` and `Remove player` only when data exists. Keep the existing `clearSession()` flow but add a `confirm()` step before wiping a session with results.

## Iconography

- **Source**: `lucide-react` only (already in deps). No emoji as icons.
- **Stroke width**: 1.75 (Lucide default). Don't mix with other sets.
- **Sizes**: 16px in buttons with text, 18px in primary CTAs, 20px standalone. No arbitrary sizes.
- **Icon-only buttons** require `aria-label` (e.g., the `<Trash2>` remove-player button currently uses `title=` — switch to `aria-label` for SR).

## Motion

- **150–200ms** for state changes (hover, pressed, panel open).
- **Score change**: brief 250ms ease-out flash of `--color-left-bg`/`--color-right-bg` on the cell that changed. Skip if `prefers-reduced-motion: reduce`.
- **No page transitions**, no parallax, no staggered list reveals — this is an instrument panel.

## Accessibility (non-negotiable)

- Body text ≥16px on mobile, contrast ≥4.5:1.
- Focus rings visible on all interactive elements (don't suppress `:focus-visible`).
- All icon-only buttons have `aria-label`.
- Score inputs labeled `aria-label="<team> score"` describing the pair.
- Score change announces via `aria-live="polite"` region (single shared region; debounce ≥500ms).
- Tab order follows visual order: Setup → Scoring courts top-to-bottom → Export.
- Respect `prefers-reduced-motion` and `prefers-contrast: more` (the latter can swap border tokens to higher-contrast variants).

## Anti-patterns (do not introduce)

- ❌ Dark mode (loses to outdoor sunlight; not the use case)
- ❌ Hero / marketing / CTA-bento patterns (utility tool, no landing page)
- ❌ Emoji icons (use Lucide)
- ❌ Decorative gradients, glass blur, neumorphism, neon glow
- ❌ Animating score input scale or position (causes mis-taps mid-score)
- ❌ Hover-only states (touch-first device)
- ❌ Pie/donut charts in standings (use ranked table; current pattern is correct)
- ❌ Auto-advancing the current rota on submit without a visible confirmation
- ❌ Hidden destructive actions in overflow menus (`Reset session` stays visibly destructive-colored)
- ❌ Custom non-numeric keyboards on score fields

## Pre-delivery checklist

- [ ] Tested at 360px width (small Android), 390px (iPhone 14), 768px (tablet portrait), 1280px (laptop)
- [ ] Score input is operable with thumb only — buttons + scroll wheel + swipe all work
- [ ] No layout shift when a score goes 0→9→10 (tabular-nums in place)
- [ ] Focus ring visible on every interactive control via keyboard tab
- [ ] All Lucide icons in icon-only buttons have `aria-label`
- [ ] `prefers-reduced-motion` disables score-flash animation
- [ ] Contrast verified at AA for both panel surfaces (white) and page bg (sage)
- [ ] No `console.log` or dev-only error banners shipped
- [ ] Tested in direct sunlight or simulated 1000 nit max-brightness (open camera + screen side-by-side test)
