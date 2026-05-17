# Codex Prompt — Deterministic Browser-Safe Americano Rota Generator

## Context

The app currently supports static imported rotas and has a placeholder generated rota provider. Replace the placeholder with a deterministic in-app rota generator.

The first implementation attempt ran into performance issues because it expanded too broadly over:

```text
sit-out choices × court partitions × pair-vs-pair splits
```

This prompt intentionally avoids that design. The generator must use a **structured deterministic search** with separate sit-out planning, bounded court construction, lean schedule expansion, and fast pruning.

---
# Objective

Implement an in-app deterministic Americano rota generator that:

1. Runs fully in the browser.
2. Uses no randomness, no precomputed files, no backend, and no network calls.
3. Keeps the existing `Rota[]` JSON shape.
4. Uses numeric player indexes internally.
5. Maps back to existing `Player.id` values at the provider boundary.
6. Passes the existing `validateRotas()` function.
7. Supports:

   * `courtCount` from **2 to 6**
   * `playerCount` from `courtCount * 4` through `courtCount * 4 + 4`
8. Generates a rota where every player has shared a court with every other player at least once, if found within the bounded deterministic search.

Important wording: the generator should **attempt minimum rotations** via iterative deepening. Because the search is beam-based and bounded, do **not** claim the rotation count is mathematically guaranteed to be the minimum unless all possible configurations have been exhaustively searched.

---
## High-level architecture flow

Implement the generator in this dependency order, one phase at a time. Do **not** start with the full beam search. Complete and test each phase before moving to the next one.

```mermaid
flowchart TD
    A[Input: playerCount, courtCount] --> B[Validate bounds]
    B --> C[Precompute technical helpers]
    C --> C1[pairIndex matrix]
    C --> C2[all unordered player pairs]
    C --> C3[court group shared-pair masks]
    C --> C4[3 pair-vs-pair split options per court group]

    B --> D[Calculate rotation lower bound]
    D --> E[Iterative deepening over rotationCount]

    E --> F[Generate complete sit-out plans]
    F --> F1[Validate sit-out count per rotation]
    F --> F2[Validate no consecutive sit-outs]
    F --> F3[Validate final sit-out fairness]

    F --> G[For each fixed sit-out plan]
    G --> H[Beam search over rotations]

    H --> I[Expand one partial schedule state]
    I --> J[Fast pruning]
    J --> J1[Coverage capacity prune]
    J --> J2[Per-player future coverage prune]
    J --> J3[Pair co-activity prune]

    J --> K[Construct current rotation]
    K --> L[Determine active players from sit-out plan]
    L --> M[Partition active players into courts of 4]
    M --> N[For each court, choose best pair split]
    N --> O[Score rotation candidate]
    O --> P[Update schedule state]

    P --> Q[Trim to beam width]
    Q --> H

    H --> R{Full coverage achieved?}
    R -- yes --> S[Return TechnicalRota[]]
    R -- no --> T[Try next sit-out plan / beam width / rotationCount]

    S --> U[Map technical indexes to Player.id]
    U --> V[Validate with validateRotas]
    V --> W[Return Rota[]]
```

---

## Implementation order

Implement phase by phase in the dependency order above. Do not jump directly to the full generator. Each phase must have a small pure function surface and tests before it is used by the next phase.

### Phase 1 — Pure validation and helpers

Implement first:

```ts
validateGeneratorInput(playerCount, courtCount)
calculateRotationLowerBound(playerCount, courtCount)
createPairIndex(playerCount)
pairKey / pairIndex lookup helpers
court group mask helpers
pair split option helpers
```

Acceptance for Phase 1:

* invalid bounds throw clear errors;
* lower bound is deterministic;
* pair indexes are unique and stable.

---

### Phase 2 — Sit-out plan generation

Implement:

```ts
generateSitOutPlans({
  playerCount,
  courtCount,
  rotationCount,
  limit,
}): SitOutPlan[]
```

This phase must not know anything about courts or pair splits.

Hard rules:

* exactly `sitOutsPerRotation` per rotation;
* no consecutive sit-outs;
* final sit-out count per player is between `minSitOuts` and `maxSitOuts`;
* final spread is `<= 1`;
* deterministic output order.

Acceptance for Phase 2:

* returns one empty plan when no sit-outs exist;
* returns balanced plans for sit-out cases;
* no player sits out twice in a row.

---

### Phase 3 — Court construction for one rotation

Implement:

```ts
buildRotationCandidates({
  activePlayers,
  state,
  courtCount,
  limit,
}): RotationCandidate[]
```

This phase receives **fixed active players**. It must not choose sit-outs.

Responsibilities:

* partition active players into courts of 4;
* use anchored deterministic grouping;
* cap group candidates;
* choose best pair-vs-pair split per court;
* return only top bounded rotation candidates.

Acceptance for Phase 3:

* every active player appears exactly once;
* each court has 4 distinct players;
* pair split is deterministic;
* candidates are sorted lower-is-better.

---

### Phase 4 — Schedule beam search for one sit-out plan

Implement:

```ts
searchForScheduleWithSitOutPlan({
  sitOutPlan,
  playerCount,
  courtCount,
  rotationCount,
  beamWidth,
}): TechnicalRota[] | null
```

Responsibilities:

* maintain schedule state;
* apply fast pruning;
* expand each rotation using `buildRotationCandidates`;
* trim to beam width;
* return only if full shared-court coverage is achieved.

Acceptance for Phase 4:

* deterministic;
* no duplicate player per rotation;
* full coverage when successful;
* bounded runtime.

---

### Phase 5 — Iterative deepening orchestrator

Implement:

```ts
generateTechnicalRotas(input): TechnicalRota[]
```

Responsibilities:

* validate input;
* compute lower bound;
* loop over `rotationCount`;
* loop over beam widths `[100, 300, 1000]`;
* loop over sit-out plans;
* return first successful rota;
* throw clear error if none found within upper bound.

Acceptance for Phase 5:

* supported smoke cases return;
* repeated calls produce identical output.

---

### Phase 6 — Domain mapping and provider integration

Implement:

```ts
mapTechnicalRotasToDomainRotas(technicalRotas, players)
GeneratedRotaProvider.getRotas(input)
PlaceholderGeneratedRotaProvider extends GeneratedRotaProvider
```

Acceptance for Phase 6:

* generated rotas preserve existing `Rota[]` shape;
* generated rotas pass `validateRotas`;
* domain IDs are preserved;
* static import provider remains unchanged.

---

# Existing Provider Code

```ts
import type { GetRotasInput, Rota, RotaProvider } from "./types";
import { validateRotas } from "./validation";

export class StaticRotaProvider implements RotaProvider {
  constructor(private readonly importedRotas: unknown) {}

  async getRotas(input: GetRotasInput): Promise<Rota[]> {
    if (!Array.isArray(this.importedRotas)) {
      throw new Error("Imported rotas JSON must be an array.");
    }

    const rotas = this.importedRotas as Rota[];
    const validation = validateRotas(rotas, input.players, input.courts);
    if (!validation.valid) {
      throw new Error(validation.errors.join("\n"));
    }
    return rotas;
  }
}

export class PlaceholderGeneratedRotaProvider implements RotaProvider {
  async getRotas(): Promise<Rota[]> {
    throw new Error("Generated rota provider is not implemented. Import precomputed rotas for this version.");
  }
}
```

Replace the placeholder behavior, but keep compatibility.

---

# Required Provider Design

Add a real provider:

```ts
export class GeneratedRotaProvider implements RotaProvider {
  async getRotas(input: GetRotasInput): Promise<Rota[]> {
    // generate technical rotas
    // map to domain Rota[]
    // validate
    // return
  }
}
```

Keep compatibility:

```ts
export class PlaceholderGeneratedRotaProvider extends GeneratedRotaProvider {}
```

Do not change `StaticRotaProvider`.

---

# Existing Rota Shape to Preserve

Generated output must remain compatible with the existing `Rota[]` shape:

```ts
type Rota = {
  rotaNumber: number;
  courts: {
    courtNumber: number;
    leftPair: { player1Id: string; player2Id: string };
    rightPair: { player1Id: string; player2Id: string };
  }[];
  sitOutPlayerIds: string[];
};
```

Assumption in this repo:

```ts
GetRotasInput.courts
```

is a **number**, not an array. Use `input.courts`.

---

# Technical Generator API

Create a new module:

```ts
src/rotaGenerator.ts
```

Expose domain-independent technical types:

```ts
export type TechnicalPair = readonly [number, number];

export type TechnicalCourt = {
  courtNumber: number;
  leftPair: TechnicalPair;
  rightPair: TechnicalPair;
};

export type TechnicalRota = {
  rotaNumber: number;
  courts: TechnicalCourt[];
  sitOutPlayerIndexes: number[];
};

export type GenerateTechnicalRotasInput = {
  playerCount: number;
  courtCount: number;
  coverageMode?: "sharedMatch";
};

export function generateTechnicalRotas(
  input: GenerateTechnicalRotasInput
): TechnicalRota[];

export function calculateRotationLowerBound(
  playerCount: number,
  courtCount: number
): number;

export function mapTechnicalRotasToDomainRotas(
  technicalRotas: TechnicalRota[],
  players: Player[]
): Rota[];
```

The core generator must use only numeric player indexes `0..playerCount-1`.

---

# Hard Constraints

Enforce these grouped rules:

## Input validation

1. `courtCount` must be between `2` and `6`.
2. `playerCount` must be between `courtCount * 4` and `courtCount * 4 + 4`.

Example: with `courtCount = 3`, valid `playerCount` is `12..16`.

## Rotation integrity

1. Each rotation has exactly `courtCount` courts.
2. Each court has exactly 4 distinct players.
3. A player appears at most once per rotation.
4. Sit-outs per rotation:

```ts
const sitOutsPerRotation = playerCount - courtCount * 4;
```

Example: with `playerCount = 13` and `courtCount = 3`, each rotation has one sit-out.

## Sit-out fairness

```ts
const totalSitOuts = sitOutsPerRotation * rotationCount;
const minSitOuts = Math.floor(totalSitOuts / playerCount);
const maxSitOuts = Math.ceil(totalSitOuts / playerCount);
```

1. A player must never sit out twice in a row.
2. Final sit-out counts must be balanced according to minSitOuts / maxSitOuts for the candidate rotationCount. The final spread must be <= 1. It will naturally be 0 only when totalSitOuts is divisible by playerCount.

Example: if sit-outs exist, final per-player sit-out totals must be either all equal(or differ by at most 1 if unavoidable)

## Coverage

1. Coverage condition:

   * every unordered player pair `{i,j}` must share a court at least once;
   * sharing a court includes being partners or opponents.

Example: players `2` and `7` must appear on the same court in at least one rotation.

---

# Soft Optimization Goals

Use these for deterministic scoring, not hard failure unless required by the constraints above:

1. Avoid repeated partner pairs first.
2. Minimize repeated opponent encounters.
3. Avoid repeated exact court composition.
4. Use lower numeric player indexes as deterministic tie-breaks.

Define exact repeated court composition as the sorted 4-player set only, independent of pair split or side:

```ts
[1, 4, 7, 9]
```

---

# Rotation Count Strategy

Compute a lower bound:

```ts
const totalPlayerPairs = playerCount * (playerCount - 1) / 2;
const maxNewSharedPairsPerRotation = courtCount * 6;
const coverageLowerBound = Math.ceil(
  totalPlayerPairs / maxNewSharedPairsPerRotation
);

const minPlayRotationsPerPlayer = Math.ceil((playerCount - 1) / 3);
const activeSlotsPerRotation = courtCount * 4;
const playSlotLowerBound = Math.ceil(
  (playerCount * minPlayRotationsPerPlayer) / activeSlotsPerRotation
);

const lowerBound = Math.max(coverageLowerBound, playSlotLowerBound);
```

Then try:

```ts
rotationCount = lowerBound, lowerBound + 1, ..., lowerBound + playerCount + 4
```

For each candidate `rotationCount`, try deterministic beam widths:

```ts
const BEAM_WIDTHS = [100, 300, 1000] as const;
```

Return the first valid fully covered rota found.

Do not claim this is mathematically minimum unless the search for lower rotation counts is exhaustive. It is acceptable to document this as “minimum found by deterministic bounded search from the theoretical lower bound.”

---

# Key Performance Requirement

Do **not** implement broad per-state branching over:

```text
sit-out choices × court partitions × pair split combinations
```

That design already proved too slow for cases like `12 players / 2 courts`.

Instead implement the following structured approach.

---

# Required Search Architecture

## Search Step A — Generate Complete Sit-Out Plans

For each candidate `rotationCount`, generate a small deterministic list of full sit-out plans before building courts.

```ts
type SitOutPlan = number[][];
// length = rotationCount
// each item = sorted sit-out player indexes for that rotation
```

Use a deterministic limit, for example:

```ts
const SITOUT_PLAN_LIMIT = 16;
```

Each sit-out plan must satisfy:

1. Each rotation has exactly `sitOutsPerRotation` sit-outs.
2. No player sits out twice in a row.
3. Final sit-out counts are balanced:

   * each player’s sit-out count is between `minSitOuts` and `maxSitOuts`.
4. Final spread is `<= 1`.
5. For every unordered player pair {a,b}, the sit-out plan contains at least one remaining/future rotation where both a and b are active. Otherwise that pair can never share a court and the sit-out plan must be rejected.

For a candidate `rotationCount`, compute:

```ts
const totalSitOuts = sitOutsPerRotation * rotationCount;
const minSitOuts = Math.floor(totalSitOuts / playerCount);
const maxSitOuts = Math.ceil(totalSitOuts / playerCount);
```

Generate sit-out plans deterministically:

* primary plan: cyclic / lowest-sit-out-count construction;
* additional variants: deterministic offsets and rotated tie-break orders;
* no randomness.

If `sitOutsPerRotation === 0`, use exactly one sit-out plan containing empty sit-outs for every rotation.

Do not branch sit-outs inside every schedule beam state.

---

## Search Step B — Build Courts for a Fixed Sit-Out Plan

For each sit-out plan, construct courts rotation by rotation.

For a given rotation:

1. Active players are fixed by the sit-out plan.
2. Partition active players into `courtCount` courts of 4.
3. Use anchored deterministic grouping:

   * repeatedly anchor on the lowest remaining active player;
   * choose 3 companions from remaining players;
   * score candidate 4-player groups by:

     1. new shared-court pairs gained;
     2. avoiding repeated sorted court composition;
     3. lexicographic tie-break.
4. Keep only a bounded number of best group candidates per anchor:

```ts
const GROUP_CANDIDATE_LIMIT = 12;
```

5. Build full rotation partitions using bounded recursion.
6. Keep only top full rotation candidates:

```ts
const PARTITION_LIMIT = 8; // or 12 if needed
```

The generator must stay browser-safe for large cases like `28 players / 6 courts`.

---

## Search Step C — Pair Split Per Court

For each 4-player court group, evaluate the 3 possible pair-vs-pair splits.

Choose the locally best split deterministically using lower-is-better ranking:

1. repeated partner pairs;
2. repeated opponent encounters;
3. lexicographic split signature.

Do not broadly branch over all split combinations unless absolutely necessary. The default behavior should choose the best split locally.

---

## Search Step D — Beam Search Over Partial Schedules

Use beam search over schedule states, but keep branching lean.

For each partial schedule state under a fixed sit-out plan:

* expand using only top rotation candidates:

```ts
const ROTATION_EXPANSION_LIMIT = 2; // max 3 if needed
```

* then trim to current beam width.

Use beam widths `[100, 300, 1000]` for diversity rather than large per-state branching.

---

# Required Fast Pruning

Before expanding a partial state, reject it if any of these are true:

## Coverage capacity prune

```ts
uncoveredSharedPairsRemaining > remainingRotations * courtCount * 6
```

## Per-player future coverage prune

For any player:

```ts
uncoveredPlayersForThisPlayer > futurePlayCount[player] * 3
```

Because each future court appearance can introduce that player to at most 3 other players.

## Pair co-activity prune

For any uncovered pair `{a,b}`, if under the fixed sit-out plan they are never both active in the same remaining rotation, reject the state.

## Sit-out fairness prune

Reject if the fixed sit-out plan violates final fairness. Since sit-outs are preplanned, this should be validated before court construction.

---

# Fast Data Structures

Precompute and use fast structures.

Required helpers:

```ts
pairIndex[i][j] // index for unordered pair
allPairIndexes
courtGroupSharedPairMask
three pair-split options for every sorted 4-player group
```

Use arrays, typed arrays, or compact bitsets where practical for:

* shared coverage counts or masks;
* partner counts;
* opponent counts;
* court composition keys;
* sit-out counts;
* last sit-out flags.

Do not represent shared-pair coverage as a single JS number bitmask. For playerCount=28, there are 378 unordered pairs. Use Uint32Array, BigInt-based bitsets, boolean arrays, or another safe deterministic structure.
Avoid heavy object churn in hot loops.

---

# Scoring Convention

Use **lower-is-better** everywhere.

Beam ranking key should be explicit and stable:

```ts
[
  uncoveredSharedPairsRemaining,
  repeatedPartnerPairCount,
  sitOutFairnessPenalty,
  repeatedOpponentEncounterCount,
  repeatedCourtCompositionCount,
  lexicographicSignature,
]
```

`lexicographicSignature` must be a stable comparable string or fixed tuple, not a mutable object.

All sorting must be deterministic.

No use of `Math.random()`.

---

# Domain Mapping

Implement:

```ts
export function mapTechnicalRotasToDomainRotas(
  technicalRotas: TechnicalRota[],
  players: Player[]
): Rota[];
```

Rules:

1. technical player index `i` maps to `players[i].id`;
2. `rotaNumber` starts at `1`;
3. `courtNumber` starts at `1`;
4. preserve generated pair order as `player1Id`, `player2Id`;
5. preserve generated court side as `leftPair`, `rightPair`;
6. sit-outs become `sitOutPlayerIds`.

Then `GeneratedRotaProvider.getRotas(input)` must:

1. call:

```ts
generateTechnicalRotas({
  playerCount: input.players.length,
  courtCount: input.courts,
  coverageMode: "sharedMatch",
});
```

2. map technical rotas to domain rotas;
3. call:

```ts
validateRotas(rotas, input.players, input.courts)
```

4. throw validation errors if invalid;
5. return rotas.

---

# App Integration

Wire the standard-mode `Setup Rotas` button in `App.tsx` to use `GeneratedRotaProvider`.

Keep advanced JSON import supported via `StaticRotaProvider`.

Update setup validation so player-count rules match generator bounds:

```ts
courtCount * 4 <= playerCount <= courtCount * 4 + 4
```

with `courtCount` from `input.courts`.

The app currently has fixed `COURTS = 3`; do not add a court-count selector in this change.

---

# Tests

Add or update tests.

## Technical generator tests

Create `src/rotaGenerator.test.ts`.

Cover:

1. Valid bounds:

   * `8 players / 2 courts`
   * `12 players / 2 courts`
   * `12 players / 3 courts`
   * `16 players / 3 courts`
   * `24 players / 6 courts`
   * `28 players / 6 courts`

2. Invalid bounds:

   * fewer than `courtCount * 4`
   * more than `courtCount * 4 + 4`
   * fewer than 2 courts
   * more than 6 courts

3. Determinism:

   * two calls with same input return deeply equal rotas.

4. No duplicate player per rotation:

   * each player appears exactly once either on a court or in sit-outs.

5. No consecutive sit-outs.

6. Sit-out fairness:

   * when sit-outs exist, final max sit-out count minus min sit-out count is `<= 1`.

7. Full shared-court coverage:

   * every unordered player pair has shared a court at least once.

8. Partner repeat optimization:

   * assert zero repeated partner pairs only for cases where this is reliably feasible.
   * Do not assert zero repeated partners universally.

9. Known lower-bound cases:

   * assert returned rotation count equals the theoretical lower bound only for known stable cases where the heuristic reliably achieves it.
   * Do not assert theoretical lower-bound optimality for all cases.

## Provider tests

Create or update `src/rotaProvider.test.ts`.

Cover:

1. `GeneratedRotaProvider.getRotas(input)` returns `Rota[]`.
2. Returned rotas pass `validateRotas`.
3. Domain IDs are preserved.
4. `PlaceholderGeneratedRotaProvider` no longer throws and remains compatible.
5. `StaticRotaProvider` remains unchanged.

## Performance smoke tests

Add a lightweight smoke test or script that logs timings for:

```ts
[
  [8, 2],
  [12, 2],
  [12, 3],
  [16, 3],
  [24, 6],
  [28, 6],
]
```

Do not make CI brittle by requiring exact timing thresholds unless the repo already has performance-test conventions. But the generator must return in practical browser/runtime time for these cases.

---

# Documentation

Update:

* `README.md`
* `.github/copilot-instructions.md`
* `docs/adr/ADR-002.md`
* ADR index
* Add `docs/adr/ADR-007-deterministic-rota-generation.md`

Document:

1. rota generation now lives inside the browser app;
2. advanced JSON import remains supported through `StaticRotaProvider`;
3. generator uses numeric technical indexes internally;
4. provider maps back to domain `Player.id`;
5. search is deterministic and bounded;
6. iterative deepening starts from the theoretical lower bound;
7. because beam search is bounded, generated rotation count is “minimum found by deterministic bounded search,” not a proof of global optimality.

---

# Acceptance Criteria

Implementation is accepted when:

1. `GeneratedRotaProvider` works.
2. `PlaceholderGeneratedRotaProvider` remains compatible and no longer throws placeholder error.
3. Generated output preserves existing `Rota[]` shape.
4. Generated output passes `validateRotas`.
5. Generator is deterministic.
6. Supported player/court counts return in practical browser/runtime time:

   * `8/2`
   * `12/2`
   * `12/3`
   * `16/3`
   * `24/6`
   * `28/6`
7. Every player shares a court with every other player at least once in generated rotas.
8. No player sits out twice in a row.
9. Sit-outs are balanced.
10. No precomputed files, randomness, backend, or network calls are introduced.

Implement this from scratch, using the above architecture rather than broad Cartesian branching.
