# Scoring screen — page override

> Overrides `design-system/MASTER.md` for the `RotaScoring` panel and the per-court score row.
> If a rule isn't listed here, fall back to MASTER.

## Scope

The center column when a session is validated: court cards, score spinners, sit-outs strip, submit button, rota chips.

## Layout

- **Court card**: one per court (3 by default). Stacked vertically on mobile, never side-by-side — even on tablet/desktop. A player should always see one full court's score row without scrolling sideways.
- **Score row** (one per court): `1fr | auto | 1fr` — Left pair | "vs" | Right pair. Collapses to single column below 680px (already implemented), with the "vs" centered.
- **Sit-outs strip**: full-width pill below the court cards in a given rota, not inside any court card.
- **Submit button**: full-width, sticky-bottom on mobile (`position: sticky; bottom: env(safe-area-inset-bottom)`), inline at the bottom on desktop. Never floating — must visually belong to the form.

## ScoreSpinner specifics

- **Dimensions**: `48px | 1fr | 48px` columns × 74px tall. **Do not shrink.** Even on small screens this is the floor.
- **Stepper button** (`−` / `+`):
  - Label: SVG `Minus` / `Plus` from Lucide, 24px, stroke 1.75. Not text glyphs.
  - `aria-label`: `"Decrease <team> score"` / `"Increase <team> score"`.
  - Press feedback: `:active` darkens background to `--color-border` for 120ms. No scale transform.
  - Repeat on long-press at 150ms interval after 400ms hold (so you can ramp 0→24 quickly).
- **Numeric input**:
  - `inputmode="numeric"`, `pattern="[0-9]*"`, `maxLength={2}`.
  - Selects all on focus so typing replaces instead of appending.
  - `font-variant-numeric: tabular-nums` mandatory.
  - On blur, clamp to `[0, session.pointsPerCourt]` and mirror to the opposing side (existing `changeScore` behavior — preserve it).
- **Wheel + swipe**: keep current 18px-per-step touch threshold. Disable wheel handler when input is **not** focused on desktop (prevents accidental score change while scrolling the page near the spinner). Touch swipe always active inside the spinner bounds.
- **Bounds feedback**: when value is 0, dim the `−` button to 0.4 opacity and set `aria-disabled`. Same for `+` at `pointsPerCourt`. Don't remove the button — just disable.

## Pair color usage

- **Left pair**: `--color-left-bg` background, `--color-left-border` border. Persistent — does not swap when winning.
- **Right pair**: `--color-right-bg` background, `--color-right-border` border.
- Border thickens to 2px (was 1px) when that pair is the leading score in a non-tied rota. **Color alone never indicates winning** — also bold the score number weight 900 → already default, so additionally add a small `▴` glyph (Lucide `ChevronUp` 14px) before the leading score.
- On a tied score: both at default 1px, no glyph, the "vs" label gains weight 900.

## Status chips

- **`Pending`**: `--color-info-bg` / `--color-info-fg` (current default).
- **`Edited`**: `--color-success-bg` / `--color-primary` (current `.status.edited`).
- **`Submitted`**: `--color-primary` background / `--color-on-primary` text. New state — distinguish at-a-glance from `Edited`.
- Chip height: 24px, padding `0 10px`, radius 999px, weight 700, uppercase `.78rem`.

## Rota chip row (below courts)

- Buttons 48×40px minimum, gap 8px, wrap to multiple lines as needed.
- Current selected: filled `--color-fg` / `--color-bg` text (already implemented — keep).
- Submitted rotas: small filled dot `--color-primary` in the bottom-right of the chip. Pending: no dot.
- Tap a non-current rota to jump there; this **does not** discard unsaved scores — the parent should already preserve edits via session state.

## Submission UX

- Pressing `Submit rota` while any court score is incomplete (one side blank or sum ≠ `pointsPerCourt`) → inline error under that court's score row, scroll the first invalid court into view, focus the first invalid input.
- On successful submit: notice banner "Rota N submitted", advance `currentRotaNumber` if it equals the just-submitted one, keep `selectedRotaNumber` on the submitted rota for 1.5s before auto-advancing the view to the new current rota (gives the user visual confirmation before the screen changes).
- Allow re-submit on an already-submitted rota only if `Edited` chip is showing.

## Accessibility additions (beyond MASTER)

- The score row has `role="group"` with `aria-label="Court N score, Left team vs Right team"`.
- A single `aria-live="polite"` region above the courts announces submissions: `"Rota 3 submitted. Court 1: Alice/Bob 18, Carol/Dan 6."`.
- Long-press repeat must be cancellable by `Esc` on keyboard (focus the input first, then Esc).

## Anti-patterns (page-specific)

- ❌ Animating the score number on change (jitter is mistaken for a registered touch elsewhere)
- ❌ Auto-submitting on score completion — must be explicit
- ❌ Hiding the submit button behind a swipe or long-press
- ❌ Putting court cards in a horizontal carousel (lose at-a-glance overview)
- ❌ Removing the "vs" separator — it's the visual anchor between two interactive pairs
