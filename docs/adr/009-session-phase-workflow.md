# ADR-009: Session Phase Workflow

## Status
Accepted

## Decision
Session workflow is modelled as three phases — `setup`, `scoring`, `complete` — derived entirely from existing `Session` data. No phase field is persisted.

```
setup:    rotas.length === 0
scoring:  rotas.length > 0 AND results.length < rotas.length
complete: rotas.length > 0 AND results.length >= rotas.length
```

Rotas are authoritative: if rotas is empty, the phase is always `setup` regardless of any results present.

Phase derivation and rota accessibility live in `src/sessionPhase.ts` as pure, side-effect-free exports.

## Phase Rules

- **Setup** — all session configuration is editable (players, court count, points per court, name). Rotas may be generated or imported. Generating or importing rotas is the explicit session-start action and immediately transitions to `scoring`.
- **Scoring** — setup is immutable. All mutation handlers (`addPlayer`, `removePlayer`, `updatePlayer`, `loadPlayers`, `loadRotas`) return early. Only `Reset to setup` (destructive, confirmed) can return to `setup`. Rotas are played in array order; only submitted rotas and the first unsubmitted rota are accessible via `isRotaAccessible`.
- **Complete** — all rotas have results. Setup remains locked. Submitted scores may still be edited; re-editing keeps all results present and the session stays `complete`.

## Storage and Backward Compatibility

`courtCount` is the only field added to `Session` in this decision. Legacy sessions stored without it default to `3`. On restore, if a stored session's rotas fail setup validation (e.g. player list changed since the rotas were generated), rotas and results are cleared and the player list is preserved — avoiding data loss on app update.

## Consequences

- Phase derivation is cheap and stateless; any component can call `deriveSessionPhase` without coordination.
- The stale-setup-data bug (scoring against rotas generated from a different player list) is closed by the phase lock rather than by per-handler clearing logic.
- Sequential play is enforced by `isRotaAccessible` using array index, not `rotaNumber` value, so imported rotas with non-consecutive or non-ascending identifiers are handled correctly.
- Future work — player replacement mid-rota, adding rotas after completion, Club-driven `courtCount` — must fit within or extend this phase model. The model is intentionally minimal; do not add persisted phase fields or timestamps without a new ADR.
