# ADR-005: Small CSS Design System

## Status
Accepted

## Decision
The app uses a small CSS design system in `src/styles.css`, guided by `design-system/MASTER.md`.

No Tailwind, component framework, CSS modules, or theme framework is introduced for v0.1.x. One narrow exception applies: `lucide-react` is used as a bundled SVG **icon** set. It is not a UI-component or layout framework — icons are tree-shaken React components with no runtime network requests, so they are CSP-safe (ADR-008) and do not introduce styling/theme conventions that compete with the design system.

Fonts are handled in two tiers:

- **UI text** uses the operating system font stack (`--font-ui`: `-apple-system`, `Segoe UI`, `Roboto`, `system-ui`, `sans-serif`). No sans-serif font is bundled.
- **Numeric/score text** uses `@fontsource/fira-code` (`--font-num`), bundled locally rather than loaded from a CDN.

Bundling the numeric font locally and using the system stack for UI text keeps runtime third-party network requests at zero, prevents `Referer` header leakage to font services, and keeps the Content-Security-Policy free of external allowlist entries — while minimizing bundled font payload.

## Consequences
- UI changes should reuse existing tokens, spacing, and panel patterns.
- The design system should describe durable constraints, not every possible future enhancement.
- Outdoor readability and courtside touch ergonomics take priority over decorative UI.
- Icons come from `lucide-react`; do not add a second icon set or promote it into a broader UI-component dependency without a new/updated ADR.
- Introducing a new external asset source (font, icon CDN, etc.) is not a drop-in change — it requires a deliberate policy update and a note in ADR-008.
