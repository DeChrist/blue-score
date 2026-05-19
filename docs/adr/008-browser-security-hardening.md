# ADR-008: Browser Security Hardening

## Status
Accepted

## Context
Blue Score is a hobby app, but it runs in a shared browser environment and is deployed publicly on GitHub Pages. Players enter their own names and score data. Even without a backend, XSS, clickjacking, and referrer leakage are meaningful risks: a compromised script could exfiltrate localStorage data, and a third-party font CDN can observe page navigation via the `Referer` header.

GitHub Pages does not support custom HTTP response headers without a proxy, which constrains which security controls are achievable.

## Decision
The app applies a layered set of browser security controls proportionate to a privacy-conscious hobby SPA.

**Content-Security-Policy (production only)**
A strict CSP `<meta>` tag is injected into `dist/index.html` by a Vite `transformIndexHtml` plugin at build time (`vite.config.ts`). It is absent in development so Vite's inline style and script injection is not blocked.

Production policy:
```
default-src 'self'; base-uri 'self'; form-action 'self';
```

- `default-src 'self'` — scripts, styles, fonts, images, and connections are restricted to same-origin, blocking the most common XSS exfiltration vectors.
- `base-uri 'self'` — prevents `<base href>` injection attacks.
- `form-action 'self'` — constrains form submissions (defensive in depth; the app has no traditional forms).
- `'unsafe-inline'` is intentionally omitted; adding it would neuter XSS protection.
- `connect-src ws:/wss:` allowances are intentionally absent from the production policy; they are not needed because the deployed app makes no WebSocket calls.

**Referrer policy**
`<meta name="referrer" content="strict-origin-when-cross-origin">` is present in `index.html` unconditionally. It limits the `Referer` header to the origin only (no path or query string) when navigating to a cross-origin URL.

**Self-contained assets**
Fonts are bundled via `@fontsource` packages (see ADR-005). No third-party CDN, font service, or analytics endpoint is loaded at runtime, which eliminates all associated network privacy leaks and keeps the CSP free of any external allowlist entries.

## Consequences
- `frame-ancestors 'none'` (clickjacking protection) cannot be enforced via `<meta>` — browsers ignore it there. It requires an HTTP response header, which GitHub Pages does not support without a proxy. This is a known accepted limitation.
- The production build step is the enforcement point for CSP injection; see ADR-004. Any CI failure that skips the build would also skip CSP injection.
- Any new external asset source (font, icon CDN, analytics, etc.) requires a deliberate review of this ADR and a corresponding update to the CSP policy. It is not a drop-in change.
- Vite's React Fast Refresh preamble may log a CSP violation in the browser console in development if the CSP is accidentally re-added to `index.html`. Production builds contain no inline scripts.
