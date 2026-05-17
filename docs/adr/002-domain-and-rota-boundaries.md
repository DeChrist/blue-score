# ADR-002: Domain And Rota Boundaries

## Status
Accepted

## Decision
Pure scoring and validation rules live outside UI components.

- `src/scoring.ts` owns deterministic scoring helpers and standings calculation.
- `src/validation.ts` owns import parsing and domain validation.
- `src/rotaProvider.ts` defines the `RotaProvider` interface and the static import provider.

The app does not generate rotas. `PlaceholderGeneratedRotaProvider` marks the future extension point.

## Consequences
- UI components should call domain helpers instead of duplicating score math.
- Rota balancing, fairness, and optimization remain outside this app until a separate generation module exists.
- Changes to domain behavior require targeted unit tests.
