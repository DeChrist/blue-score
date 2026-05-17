# ADR-003: Import And Result Validation Trust Boundary

## Status
Accepted

## Decision
All JSON imported from users or restored from browser storage is untrusted.

Parsing functions accept `unknown`, validate shape, and return typed values only after field-level checks. Submitted `Session.results` also need domain validation against the session rotas and `pointsPerCourt`.

## Consequences
- Full session import must validate both setup and submitted results.
- Storage restore may load incomplete draft setup sessions, but submitted results must be internally consistent.
- Invalid stored sessions are cleared with a user-facing warning rather than silently used.
