# Padel Americano Scoring

Single-page, browser-only React + TypeScript app for running a padel Americano scoring session.

## Run

```bash
npm install
npm run dev
```

## Test

```bash
npm test
```

The app stores the full session in `localStorage` under `padel-americano-session-v1`.

Rota generation is intentionally not implemented. `StaticRotaProvider` imports precomputed rota JSON, while `PlaceholderGeneratedRotaProvider` defines the future provider boundary.
