# ADR-012: Data Export Format And Safety

## Status
Accepted

## Context
Results and final standings can be exported for sharing outside the app. Player names are user-entered, untrusted input (ADR-003), and export is the symmetric counterpart to the import trust boundary: input that is safe to store can still be unsafe to emit into another program's format.

## Decision
Export is produced by pure helpers in `src/exporters.ts` as CSV.

- Fields containing a quote, comma, or newline are RFC 4180 quoted, with embedded quotes doubled.
- Fields whose first character is `=`, `+`, `-`, or `@` are neutralized against spreadsheet **formula injection** by prefixing a tab so Excel/Sheets render them as literal text rather than executing them as formulas.
- Export stays fully local (client-side string/Blob download), consistent with local-first (ADR-001). No data leaves the browser.

## Consequences
- Export is a trust boundary: a player name must not be able to break CSV row structure or execute as a formula in a spreadsheet consumer. Changes to name handling or CSV assembly need negative tests in `src/exporters.test.ts`.
- The formula-injection guard lives in the single `csvValue` helper so every exported field is covered uniformly.
- Adding a new export format (JSON, XLSX, PDF, clipboard) requires the same injection/escaping review before it ships.
