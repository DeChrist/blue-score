# ADR-003: Import And Result Validation Trust Boundary

## Status
Accepted

## Decision
All JSON imported from users or restored from browser storage is untrusted.

Parsing functions accept `unknown`, validate shape, and return typed values only after field-level checks. Submitted `Session.results` also need domain validation against the session rotas and `pointsPerCourt`.

App-bundled Club JSON is also parsed from `unknown` at startup through `src/club.ts`, but it is not a user import format and is not stored in `Session`.

## Consequences
- Full session import must validate both setup and submitted results.
- App callers pass the active Club court-count cap into setup validation, so imported sessions cannot start scoring with more courts than the configured Club exposes.
- Storage restore may load incomplete draft setup sessions, but submitted results must be internally consistent.
- Invalid stored sessions are cleared with a user-facing warning rather than silently used.
