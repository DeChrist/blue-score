# ADR-002: Domain And Rota Boundaries

## Status
Accepted

## Decision
Pure scoring and validation rules live outside UI components.

- `src/scoring.ts` owns deterministic scoring helpers and standings calculation.
- `src/validation.ts` owns import parsing and domain validation.
- `src/rotaGenerator.ts` owns deterministic technical rota generation using numeric player indexes.
- `src/rotaProvider.ts` defines the `RotaProvider` interface, the generated provider, and the static import provider.

Generated rotas are mapped back to domain `Player.id` values at the provider boundary. Advanced JSON import remains available through `StaticRotaProvider`. `PlaceholderGeneratedRotaProvider` remains as a compatibility subclass of `GeneratedRotaProvider`.

## Consequences
- UI components should call domain helpers instead of duplicating score math.
- Rota balancing, fairness, and optimization stay outside UI components.
- Changes to domain behavior require targeted unit tests.
