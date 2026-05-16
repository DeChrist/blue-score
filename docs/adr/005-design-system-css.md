# ADR-005: Small CSS Design System

## Status
Accepted

## Decision
The app uses a small CSS design system in `src/styles.css`, guided by `design-system/MASTER.md`.

No Tailwind, component library, CSS modules, or theme framework is introduced for v0.1.x.

## Consequences
- UI changes should reuse existing tokens, spacing, and panel patterns.
- The design system should describe durable constraints, not every possible future enhancement.
- Outdoor readability and courtside touch ergonomics take priority over decorative UI.
