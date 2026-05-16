# Blue Score Design System

Durable UI guidance for the courtside scoring app. Page-specific notes live in `design-system/pages/`.

## Product Context

- Single-purpose padel Americano scoring utility.
- Used outdoors, phone-held, often one-handed.
- One browser-only SPA with setup, scoring, standings/history, and import/export panels.

## Principles

- Outdoor-readable first: light mode, high contrast, no decorative low-contrast effects.
- Touch-first controls: interactive targets should be at least 44x44px; score controls stay larger.
- Stable left/right team identity: left uses green, right uses amber.
- Numeric stability: scores and standings use tabular numeric styling.
- Minimal chrome: panels, borders, and clear actions over marketing-style layout.

## Core Tokens

| Token | Value | Use |
| --- | --- | --- |
| `--color-bg` | `#f5f7f2` | Page background |
| `--color-surface` | `#ffffff` | Panels and inputs |
| `--color-fg` | `#17201b` | Primary text |
| `--color-fg-muted` | `#66736b` | Secondary text |
| `--color-border` | `#dce4df` | Main borders |
| `--color-primary` | `#176b4d` | Primary actions |
| `--color-left-bg` | `#eef7f1` | Left pair background |
| `--color-right-bg` | `#fff5e6` | Right pair background |
| `--color-danger` | `#982a1f` | Destructive labels and errors |

Typography:

- UI font: Fira Sans with system fallback.
- Numeric font: Fira Code with tabular figures.
- Body text should remain at least 16px on mobile.

## Layout

- Mobile-first, single column below 980px.
- Desktop layout uses three practical columns: setup, scoring/standings/history, export.
- Cards are for repeated items and panels only; avoid nested decorative cards.
- Do not introduce router-driven screens for v0.1.x.

## Accessibility

- Keep visible labels for form fields.
- Preserve focus-visible rings.
- Icon-only buttons need `aria-label`.
- Do not convey meaning by color alone.
- Respect `prefers-reduced-motion`.

## Anti-Patterns

- No dark mode for this product phase.
- No hero sections, gradients, glass effects, charts, or decorative animation.
- No hover-only affordances.
- No Tailwind or component-library adoption without a new ADR.
