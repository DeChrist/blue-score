# Scoring Panel Notes

Applies to the `RotaScoring` panel and score controls.

## Current Accepted Behavior

- One court card per court, stacked vertically.
- Court headings use Club display metadata: `Court N` when the configured court name is empty, or `Court N - Name` when present.
- Score controls mirror the opposite side so each court totals `pointsPerCourt`.
- Left/right pair colors stay stable regardless of who is leading.
- Submitted rota results can be replaced explicitly.
- Sit-outs are shown below the court cards.

## Keep

- Score controls large enough for courtside use.
- Explicit submit action; no auto-submit on valid totals.
- Inline court errors for invalid scores.
- Rota chips remain visible for review/edit navigation.

## Future Backlog Candidates

- Lucide `Minus`/`Plus` icons instead of text glyphs in stepper buttons.
- Disable accidental wheel score changes unless the control is focused.
- Submitted indicators on rota chips.
- `aria-live` announcements for score changes and submissions.
