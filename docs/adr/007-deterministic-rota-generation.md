# ADR-007: Deterministic Rota Generation

## Status
Accepted

## Decision
Blue Score generates Americano rotas inside the browser app for standard mode.

Generation is implemented in `src/rotaGenerator.ts` as a pure technical module that uses numeric player indexes internally. `GeneratedRotaProvider` maps those indexes back to domain `Player.id` values, validates the resulting `Rota[]`, and returns the same JSON shape used by imported rotas.

Advanced JSON import remains supported through `StaticRotaProvider`.

The generator is deterministic and bounded:

- no randomness
- no precomputed rota files
- no backend
- no network calls
- iterative deepening starts from the theoretical lower bound
- complete sit-out plans are generated before court construction
- court construction uses anchored grouping, local pair-split selection, beam search, and fast pruning

## Consequences
Generated rotation counts are the minimum found by deterministic bounded search from the theoretical lower bound. They are not a proof of global optimality because the beam search and sit-out plan search are intentionally bounded for browser runtime safety.

The provider boundary remains the trust point for mapping and validation, so UI code consumes the existing `Rota[]` shape regardless of whether rotas were generated or imported.
