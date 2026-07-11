# Agent Pitfalls

Recurring bug patterns distilled from this repo's fix-commit history. Subordinate to
[`.github/copilot-instructions.md`](../.github/copilot-instructions.md) in the precedence
order; sits alongside the [ADRs](adr/README.md) as reference material, not a restatement
of them.

## Patterns

| ID | Pattern | Rule of thumb | Enforced by |
| --- | --- | --- | --- |
| PIT-1 | IDs derived from array length (`` `player-${length+1}` `` → collisions after delete/re-add) | Never derive IDs from array length; use `crypto.randomUUID()` (current convention in `App.tsx`). | ESLint `no-restricted-syntax` |
| PIT-2 | Validation gaps at trust boundaries (no dup-name check; no trim/normalize before dup detection) | Trim + normalize before duplicate checks; validate at import/entry boundaries (see [ADR-003](adr/003-import-and-result-validation.md)). | Prose only — checked in `/pr` |
| PIT-3 | CSV formula injection (fields starting `= + - @` exported raw) | Fields must go through `csvValue` in `exporters.ts` (see [ADR-012](adr/012-data-export.md)). | Existing test in `exporters.test.ts` |
| PIT-4 | Enum-incomplete guards (`mode.kind === 'standard'` broke demo mode) | Don't gate on one union member when the intent is "not X" — new members silently fall through; compare against the excluded case or use an exhaustive switch. | Prose only — checked in `/pr` |
| PIT-5 | No-op negative assertions | Asymmetric matchers never match inside `toContain` (e.g. `expect(s).not.toContain(expect.stringContaining(...))` always passes); assert on the literal value. | ESLint `no-restricted-syntax` (test files) |

## History

- PIT-1 → 6e42af4, 8a59f38, 8828eff (3 fix commits, one root cause: player-ID recycling)
- PIT-2 → 0331b8f, e2afc5d
- PIT-3 → 6d7ef4a (see ADR-012)
- PIT-4 → 06a9a10
- PIT-5 → a5694d9

<!-- bug-retro:last-analyzed c2aed88ad852e796e880759de326bbf3b59fc811 (2026-07-11) -->
