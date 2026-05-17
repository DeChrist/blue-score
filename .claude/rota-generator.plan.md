# Deterministic Browser-Safe Rota Generation

## Summary
Implement `src/rotaGenerator.ts` as a pure numeric-index generator, then integrate it through `GeneratedRotaProvider` while preserving `StaticRotaProvider` and the existing `Rota[]` shape. Standard mode will generate rotas in-browser for the fixed `COURTS = 3`; advanced mode keeps JSON import/export.

The generator will use bounded deterministic search: complete sit-out plans first, anchored court grouping, local best pair splits, beam search, fast pruning, and iterative deepening from the theoretical lower bound. Results are documented as “minimum found by deterministic bounded search,” not globally proven optimal.

## Key Changes
- Add `src/rotaGenerator.ts` exporting technical types, `calculateRotationLowerBound`, `generateTechnicalRotas`, and `mapTechnicalRotasToDomainRotas`.
- Make every sort/ranking explicitly lower-is-better, with stable comparable tie-break signatures such as joined numeric tuples. No mutable objects as ranking keys.
- Generate bounded batches of sit-out plans per rotation count, but never interpret the first `SITOUT_PLAN_LIMIT = 16` plans as proof that a rotation count is infeasible. If no schedule is found, continue through beam widths and later rotation counts; failure only means bounded search exhausted its configured attempts.
- Update `src/rotaProvider.ts` with `GeneratedRotaProvider`; keep `StaticRotaProvider` unchanged; make `PlaceholderGeneratedRotaProvider extends GeneratedRotaProvider`.
- Update `src/App.tsx` standard `Setup Rotas` path to call `GeneratedRotaProvider`, clear stale results, set `currentRotaNumber`, and report success/errors.
- Audit validation:
  - `validateRotas` / `validateRota` already use the supplied `players` and `courts` parameters and should keep doing so.
  - Replace the old fixed `16` player setup rule in `validateSessionSetup` with `courtCount * 4 <= players.length <= courtCount * 4 + 4`.

## Generator Design
- Helpers:
  - validate `courtCount` in `2..6`
  - validate `playerCount` in `courtCount * 4..courtCount * 4 + 4`
  - compute the prompt’s lower bound exactly
  - precompute pair indexes, unordered pair list, group shared-pair indexes, and three split options for each sorted 4-player group
- Sit-outs:
  - `generateSitOutPlans({ playerCount, courtCount, rotationCount, limit })`
  - one empty plan when no sit-outs exist
  - deterministic cyclic/offset variants when sit-outs exist
  - validate exact sit-outs per rotation, no consecutive sit-outs, final spread `<= 1`, min/max counts, and pair co-activity
- Court construction:
  - `buildRotationCandidates({ activePlayers, state, courtCount, limit })`
  - anchored grouping on lowest remaining active player
  - lower-is-better group ranking: fewer missed new shared pairs, fewer repeated court compositions, lexicographic group signature
  - cap group candidates and full partitions
  - choose each court’s best local split by repeated partners, repeated opponents, then split signature
- Beam search:
  - `searchForScheduleWithSitOutPlan(...)`
  - prune with coverage capacity, per-player future coverage, and pair co-activity
  - expand with only top rotation candidates
  - rank states lower-is-better by `[uncoveredSharedPairsRemaining, repeatedPartnerPairCount, sitOutFairnessPenalty, repeatedOpponentEncounterCount, repeatedCourtCompositionCount, lexicographicSignature]`
- Orchestration:
  - try `rotationCount = lowerBound..lowerBound + playerCount + 4`
  - for each, try beam widths `[100, 300, 1000]`
  - for each, try generated sit-out plans in deterministic order
  - return first fully covered schedule or throw a clear bounded-search error

## Tests
- Add `src/rotaGenerator.test.ts` for valid/invalid bounds, determinism, no duplicate player per rotation, no consecutive sit-outs, fair sit-outs, full shared-court coverage, and known lower-bound cases only where stable.
- Add zero repeated partner assertions only for cases where the implemented deterministic output actually achieves it; do not assert this universally.
- Add/update `src/rotaProvider.test.ts` for generated provider behavior, validation, ID preservation, placeholder compatibility, and static provider preservation.
- Update `src/validation.test.ts` for the new setup bounds.
- Add a lightweight timing smoke test that logs, but does not threshold-fail, `8/2`, `12/2`, `12/3`, `16/3`, `24/6`, and `28/6`.

## Documentation
- Update `README.md`, `.github/copilot-instructions.md`, `docs/adr/002-domain-and-rota-boundaries.md`, and ADR index.
- Add `docs/adr/007-deterministic-rota-generation.md`.
- Document browser-only generation, advanced JSON import, numeric technical indexes, domain ID mapping, deterministic bounded search, and non-proof of global optimality.
