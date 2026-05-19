// Deterministic Americano rota generator. Pipeline:
//   1. calculateRotationLowerBound — theoretical minimum rotations from pair-coverage and play-share constraints.
//   2. generateSitOutPlans — modular-arithmetic seeds, filtered for fairness (max-min sit-out count delta ≤ 1) and pair-coactivity.
//   3. buildGroupPartitions — for each rotation, anchor-by-lowest enumerate 4-player groups per court; memoized.
//   4. chooseBestSplit — for each group, pick the 1-of-3 partner split that minimizes repeated partners then opponents.
//   5. searchForScheduleWithSitOutPlan — beam search across rotations; state ranked by
//      (uncovered pairs, repeated partners, sit-out fairness, repeated opponents, repeated court composition).
//   6. generateTechnicalRotas — iterative deepening on rotationCount from the lower bound, with
//      expanding beam widths and sit-out plan counts until the first fully covered schedule is found.
//
// shouldPruneState drops states whose remaining capacity can no longer cover the still-uncovered pairs.
// The courtCount >= 5 branches halve every search budget to keep mobile generation under a second.

import type { Player, Rota } from "./types";

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

export type SitOutPlan = number[][];

export type RotationCandidate = {
  courts: TechnicalCourt[];
  sharedPairIndexes: number[];
  partnerPairIndexes: number[];
  opponentPairIndexes: number[];
  courtCompositionKeys: string[];
  rank: RankingKey;
  signature: string;
};

export type RankingKey = {
  values: readonly number[];
  signature: string;
};

type PairIndex = number[][];

type GeneratorContext = {
  playerCount: number;
  courtCount: number;
  totalPairs: number;
  pairIndex: PairIndex;
  allPairs: TechnicalPair[];
  splitOptionsCache: Map<string, SplitOption[]>;
};

type SplitOption = {
  leftPair: TechnicalPair;
  rightPair: TechnicalPair;
  partnerPairIndexes: number[];
  opponentPairIndexes: number[];
  rankSignature: string;
};

export type ScheduleState = {
  sharedCounts: Uint16Array;
  partnerCounts: Uint16Array;
  opponentCounts: Uint16Array;
  courtCompositionCounts: Map<string, number>;
  rotas: TechnicalRota[];
  uncoveredSharedPairsRemaining: number;
  repeatedPartnerPairCount: number;
  repeatedOpponentEncounterCount: number;
  repeatedCourtCompositionCount: number;
  sitOutFairnessPenalty: number;
  lexicographicSignature: string;
};

type SearchPrecompute = {
  futurePlayCounts: number[][];
  futurePairCoactive: Uint8Array[];
};

// Search budgets. Higher = better coverage but slower; tuned for 12–28 players on phone-class CPUs.
// Raise BEAM_WIDTHS / ROTATION_EXPANSION_LIMIT if generation throws "could not generate" or returns
// rotation counts noticeably above the lower bound. Raise PARTITION_LIMIT / GROUP_CANDIDATE_LIMIT if
// rotas show many repeated court compositions. SITOUT_PLAN_LIMIT rarely needs raising because plans
// are already filtered for fairness and pair-coactivity.
const BEAM_WIDTHS = [100, 300, 1000] as const;
const SITOUT_PLAN_LIMIT = 16;
const GROUP_CANDIDATE_LIMIT = 12;
const PARTITION_LIMIT = 8;
// Per-state candidate fan-out inside the beam. Two is enough to escape local minima without
// exploding the beam; raise only if beam diversity is collapsing on hard inputs.
const ROTATION_EXPANSION_LIMIT = 2;

function groupCandidateLimit(context: GeneratorContext): number {
  return context.courtCount >= 5 ? 6 : GROUP_CANDIDATE_LIMIT;
}

function partitionLimit(context: GeneratorContext): number {
  return context.courtCount >= 5 ? 4 : PARTITION_LIMIT;
}

function rotationExpansionLimit(context: GeneratorContext): number {
  return context.courtCount >= 5 ? 1 : ROTATION_EXPANSION_LIMIT;
}

function effectiveBeamWidth(courtCount: number, requestedBeamWidth: number): number {
  return courtCount >= 5 ? 1 : requestedBeamWidth;
}

function compareRanking(a: RankingKey, b: RankingKey): number {
  const max = Math.max(a.values.length, b.values.length);
  for (let index = 0; index < max; index += 1) {
    const diff = (a.values[index] ?? 0) - (b.values[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return a.signature.localeCompare(b.signature);
}

function padIndex(index: number): string {
  return index.toString().padStart(2, "0");
}

function playerSignature(players: readonly number[]): string {
  return players.map(padIndex).join(".");
}

function pairSignature(pair: TechnicalPair): string {
  return `${padIndex(pair[0])}.${padIndex(pair[1])}`;
}

function makeContext(playerCount: number, courtCount: number): GeneratorContext {
  const pairIndex = createPairIndex(playerCount);
  const allPairs = createAllPairs(playerCount);
  return {
    playerCount,
    courtCount,
    totalPairs: allPairs.length,
    pairIndex,
    allPairs,
    splitOptionsCache: new Map<string, SplitOption[]>(),
  };
}

export function validateGeneratorInput(playerCount: number, courtCount: number): void {
  if (!Number.isInteger(courtCount) || courtCount < 2 || courtCount > 6) {
    throw new Error("Rota generation supports courtCount from 2 through 6.");
  }

  const minPlayers = courtCount * 4;
  const maxPlayers = minPlayers + 4;
  if (!Number.isInteger(playerCount) || playerCount < minPlayers || playerCount > maxPlayers) {
    throw new Error(`Rota generation supports playerCount from ${minPlayers} through ${maxPlayers} for ${courtCount} courts.`);
  }
}

export function calculateRotationLowerBound(playerCount: number, courtCount: number): number {
  validateGeneratorInput(playerCount, courtCount);

  const totalPlayerPairs = (playerCount * (playerCount - 1)) / 2;
  const maxNewSharedPairsPerRotation = courtCount * 6;
  const coverageLowerBound = Math.ceil(totalPlayerPairs / maxNewSharedPairsPerRotation);

  const minPlayRotationsPerPlayer = Math.ceil((playerCount - 1) / 3);
  const activeSlotsPerRotation = courtCount * 4;
  const playSlotLowerBound = Math.ceil((playerCount * minPlayRotationsPerPlayer) / activeSlotsPerRotation);

  return Math.max(coverageLowerBound, playSlotLowerBound);
}

export function createPairIndex(playerCount: number): PairIndex {
  const pairIndex = Array.from({ length: playerCount }, () => Array<number>(playerCount).fill(-1));
  let nextIndex = 0;
  for (let left = 0; left < playerCount; left += 1) {
    for (let right = left + 1; right < playerCount; right += 1) {
      pairIndex[left][right] = nextIndex;
      pairIndex[right][left] = nextIndex;
      nextIndex += 1;
    }
  }
  return pairIndex;
}

function createAllPairs(playerCount: number): TechnicalPair[] {
  const pairs: TechnicalPair[] = [];
  for (let left = 0; left < playerCount; left += 1) {
    for (let right = left + 1; right < playerCount; right += 1) {
      pairs.push([left, right]);
    }
  }
  return pairs;
}

function pairIndexOf(pairIndex: PairIndex, left: number, right: number): number {
  const index = pairIndex[left]?.[right] ?? -1;
  if (index < 0) throw new Error(`Invalid player pair ${left}, ${right}.`);
  return index;
}

function sortedPair(left: number, right: number): TechnicalPair {
  return left < right ? [left, right] : [right, left];
}

function courtCompositionKey(players: readonly number[]): string {
  return playerSignature([...players].sort((a, b) => a - b));
}

function courtGroupSharedPairIndexes(group: readonly number[], pairIndex: PairIndex): number[] {
  const indexes: number[] = [];
  for (let left = 0; left < group.length; left += 1) {
    for (let right = left + 1; right < group.length; right += 1) {
      indexes.push(pairIndexOf(pairIndex, group[left], group[right]));
    }
  }
  return indexes;
}

function getSplitOptions(group: readonly number[], context: GeneratorContext): SplitOption[] {
  const sortedGroup = [...group].sort((a, b) => a - b);
  const key = courtCompositionKey(sortedGroup);
  const cached = context.splitOptionsCache.get(key);
  if (cached) return cached;

  const [a, b, c, d] = sortedGroup;
  const rawSplits: readonly [TechnicalPair, TechnicalPair][] = [
    [sortedPair(a, b), sortedPair(c, d)],
    [sortedPair(a, c), sortedPair(b, d)],
    [sortedPair(a, d), sortedPair(b, c)],
  ];

  const options = rawSplits.map(([leftPair, rightPair]) => {
    const partnerPairIndexes = [
      pairIndexOf(context.pairIndex, leftPair[0], leftPair[1]),
      pairIndexOf(context.pairIndex, rightPair[0], rightPair[1]),
    ];
    const opponentPairIndexes = [
      pairIndexOf(context.pairIndex, leftPair[0], rightPair[0]),
      pairIndexOf(context.pairIndex, leftPair[0], rightPair[1]),
      pairIndexOf(context.pairIndex, leftPair[1], rightPair[0]),
      pairIndexOf(context.pairIndex, leftPair[1], rightPair[1]),
    ];
    return {
      leftPair,
      rightPair,
      partnerPairIndexes,
      opponentPairIndexes,
      rankSignature: `${pairSignature(leftPair)}:${pairSignature(rightPair)}`,
    };
  });

  options.sort((left, right) => left.rankSignature.localeCompare(right.rankSignature));
  context.splitOptionsCache.set(key, options);
  return options;
}

function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a;
}

function sitOutStats(playerCount: number, courtCount: number, rotationCount: number) {
  const sitOutsPerRotation = playerCount - courtCount * 4;
  const totalSitOuts = sitOutsPerRotation * rotationCount;
  const minSitOuts = Math.floor(totalSitOuts / playerCount);
  const maxSitOuts = Math.ceil(totalSitOuts / playerCount);
  return { sitOutsPerRotation, totalSitOuts, minSitOuts, maxSitOuts };
}

function validateSitOutPlan(plan: SitOutPlan, playerCount: number, courtCount: number, rotationCount: number): boolean {
  if (plan.length !== rotationCount) return false;

  const { sitOutsPerRotation, minSitOuts, maxSitOuts } = sitOutStats(playerCount, courtCount, rotationCount);
  const counts = Array<number>(playerCount).fill(0);
  const previous = Array<boolean>(playerCount).fill(false);
  const sitOutSets = plan.map((sitOuts) => new Set(sitOuts));

  for (let rotationIndex = 0; rotationIndex < plan.length; rotationIndex += 1) {
    const sitOuts = plan[rotationIndex];
    if (sitOuts.length !== sitOutsPerRotation) return false;

    const sorted = [...sitOuts].sort((a, b) => a - b);
    if (sorted.join("|") !== sitOuts.join("|")) return false;
    if (new Set(sitOuts).size !== sitOuts.length) return false;

    const current = Array<boolean>(playerCount).fill(false);
    for (const playerIndex of sitOuts) {
      if (playerIndex < 0 || playerIndex >= playerCount) return false;
      if (previous[playerIndex]) return false;
      current[playerIndex] = true;
      counts[playerIndex] += 1;
    }
    for (let playerIndex = 0; playerIndex < playerCount; playerIndex += 1) {
      previous[playerIndex] = current[playerIndex];
    }
  }

  const minActual = Math.min(...counts);
  const maxActual = Math.max(...counts);
  if (maxActual - minActual > 1) return false;
  if (counts.some((count) => count < minSitOuts || count > maxSitOuts)) return false;

  for (let left = 0; left < playerCount; left += 1) {
    for (let right = left + 1; right < playerCount; right += 1) {
      const hasCoactiveRotation = sitOutSets.some((sitOutSet) => !sitOutSet.has(left) && !sitOutSet.has(right));
      if (!hasCoactiveRotation) return false;
    }
  }

  return true;
}

export function generateSitOutPlans({
  playerCount,
  courtCount,
  rotationCount,
  limit,
}: {
  playerCount: number;
  courtCount: number;
  rotationCount: number;
  limit: number;
}): SitOutPlan[] {
  validateGeneratorInput(playerCount, courtCount);
  const { sitOutsPerRotation } = sitOutStats(playerCount, courtCount, rotationCount);

  if (sitOutsPerRotation === 0) {
    return [Array.from({ length: rotationCount }, () => [])];
  }

  const stepSeeds = [1, playerCount - 1, 3, 5, 7, 11, 13, 17, 19, 23].filter((step, index, steps) => (
    step > 0 && step < playerCount && gcd(step, playerCount) === 1 && steps.indexOf(step) === index
  ));
  const plans: SitOutPlan[] = [];
  const seen = new Set<string>();

  for (let offset = 0; offset < playerCount && plans.length < limit; offset += 1) {
    for (const step of stepSeeds) {
      if (plans.length >= limit) break;

      const order = Array.from({ length: playerCount }, (_, index) => (offset + index * step) % playerCount);
      const plan = Array.from({ length: rotationCount }, (_, rotationIndex) => {
        const sitOuts = Array.from({ length: sitOutsPerRotation }, (_, sitOutIndex) => order[(rotationIndex * sitOutsPerRotation + sitOutIndex) % playerCount]);
        return sitOuts.sort((a, b) => a - b);
      });
      const signature = plan.map((sitOuts) => playerSignature(sitOuts)).join("|");
      if (seen.has(signature)) continue;
      if (!validateSitOutPlan(plan, playerCount, courtCount, rotationCount)) continue;
      seen.add(signature);
      plans.push(plan);
    }
  }

  return plans;
}

function createInitialState(context: GeneratorContext, sitOutFairnessPenalty: number): ScheduleState {
  return {
    sharedCounts: new Uint16Array(context.totalPairs),
    partnerCounts: new Uint16Array(context.totalPairs),
    opponentCounts: new Uint16Array(context.totalPairs),
    courtCompositionCounts: new Map<string, number>(),
    rotas: [],
    uncoveredSharedPairsRemaining: context.totalPairs,
    repeatedPartnerPairCount: 0,
    repeatedOpponentEncounterCount: 0,
    repeatedCourtCompositionCount: 0,
    sitOutFairnessPenalty,
    lexicographicSignature: "",
  };
}

function scoreSplit(option: SplitOption, state: ScheduleState): RankingKey {
  const repeatedPartners = option.partnerPairIndexes.reduce((total, pairIndex) => total + state.partnerCounts[pairIndex], 0);
  const repeatedOpponents = option.opponentPairIndexes.reduce((total, pairIndex) => total + state.opponentCounts[pairIndex], 0);
  return {
    values: [repeatedPartners, repeatedOpponents],
    signature: option.rankSignature,
  };
}

function chooseBestSplit(group: readonly number[], context: GeneratorContext, state: ScheduleState): SplitOption {
  const options = getSplitOptions(group, context);
  return [...options].sort((left, right) => compareRanking(scoreSplit(left, state), scoreSplit(right, state)))[0];
}

function countNewSharedPairs(pairIndexes: readonly number[], state: ScheduleState): number {
  return pairIndexes.reduce((total, pairIndex) => total + (state.sharedCounts[pairIndex] === 0 ? 1 : 0), 0);
}

function createGroupCandidates(anchor: number, remainingPlayers: readonly number[], context: GeneratorContext, state: ScheduleState) {
  const candidates: { group: number[]; sharedPairIndexes: number[]; rank: RankingKey }[] = [];

  for (let first = 0; first < remainingPlayers.length - 2; first += 1) {
    for (let second = first + 1; second < remainingPlayers.length - 1; second += 1) {
      for (let third = second + 1; third < remainingPlayers.length; third += 1) {
        const group = [anchor, remainingPlayers[first], remainingPlayers[second], remainingPlayers[third]].sort((a, b) => a - b);
        const sharedPairIndexes = courtGroupSharedPairIndexes(group, context.pairIndex);
        const newSharedPairs = countNewSharedPairs(sharedPairIndexes, state);
        const key = courtCompositionKey(group);
        const repeatedCourtComposition = state.courtCompositionCounts.get(key) ?? 0;
        candidates.push({
          group,
          sharedPairIndexes,
          rank: {
            values: [6 - newSharedPairs, repeatedCourtComposition],
            signature: key,
          },
        });
      }
    }
  }

  candidates.sort((left, right) => compareRanking(left.rank, right.rank));
  return candidates.slice(0, groupCandidateLimit(context));
}

function withoutGroup(players: readonly number[], group: readonly number[]): number[] {
  const groupSet = new Set(group);
  return players.filter((playerIndex) => !groupSet.has(playerIndex));
}

function addRankValues(left: readonly number[], right: readonly number[]): number[] {
  const length = Math.max(left.length, right.length);
  return Array.from({ length }, (_, index) => (left[index] ?? 0) + (right[index] ?? 0));
}

function buildGroupPartitions(activePlayers: readonly number[], context: GeneratorContext, state: ScheduleState) {
  type Partition = { groups: number[][]; sharedPairIndexes: number[]; rank: RankingKey };
  const memo = new Map<string, Partition[]>();

  function recurse(players: readonly number[]): Partition[] {
    if (players.length === 0) return [{ groups: [], sharedPairIndexes: [], rank: { values: [0, 0], signature: "" } }];

    const key = playerSignature(players);
    const cached = memo.get(key);
    if (cached) return cached;

    const [anchor, ...remainingPlayers] = players;
    const groupCandidates = createGroupCandidates(anchor, remainingPlayers, context, state);
    const partitions: Partition[] = [];

    for (const groupCandidate of groupCandidates) {
      const nextPlayers = withoutGroup(players, groupCandidate.group);
      const childPartitions = recurse(nextPlayers);
      for (const childPartition of childPartitions) {
        partitions.push({
          groups: [groupCandidate.group, ...childPartition.groups],
          sharedPairIndexes: [...groupCandidate.sharedPairIndexes, ...childPartition.sharedPairIndexes],
          rank: {
            values: addRankValues(groupCandidate.rank.values, childPartition.rank.values),
            signature: [groupCandidate.rank.signature, childPartition.rank.signature].filter(Boolean).join("|"),
          },
        });
      }
    }

    partitions.sort((left, right) => compareRanking(left.rank, right.rank));
    const trimmed = partitions.slice(0, partitionLimit(context));
    memo.set(key, trimmed);
    return trimmed;
  }

  return recurse([...activePlayers].sort((a, b) => a - b));
}

export function buildRotationCandidates({
  activePlayers,
  state,
  courtCount,
  limit,
}: {
  activePlayers: number[];
  state: ScheduleState;
  courtCount: number;
  limit: number;
}): RotationCandidate[] {
  const context = makeContext(statePartnerPlayerCount(state), courtCount);
  return buildRotationCandidatesWithContext({ activePlayers, state, context, limit });
}

// Invert n(n-1)/2 = totalPairs to recover playerCount; only needed because the
// public buildRotationCandidates entry point doesn't take playerCount directly.
function statePartnerPlayerCount(state: ScheduleState): number {
  const totalPairs = state.partnerCounts.length;
  return Math.ceil((1 + Math.sqrt(1 + 8 * totalPairs)) / 2);
}

function buildRotationCandidatesWithContext({
  activePlayers,
  state,
  context,
  limit,
}: {
  activePlayers: number[];
  state: ScheduleState;
  context: GeneratorContext;
  limit: number;
}): RotationCandidate[] {
  const sortedActivePlayers = [...activePlayers].sort((a, b) => a - b);
  if (sortedActivePlayers.length !== context.courtCount * 4) {
    throw new Error(`Expected ${context.courtCount * 4} active players, received ${sortedActivePlayers.length}.`);
  }

  const partitions = buildGroupPartitions(sortedActivePlayers, context, state);
  const candidates = partitions.map((partition) => {
    const courts: TechnicalCourt[] = [];
    const partnerPairIndexes: number[] = [];
    const opponentPairIndexes: number[] = [];
    const courtCompositionKeys: string[] = [];

    partition.groups.forEach((group, groupIndex) => {
      const split = chooseBestSplit(group, context, state);
      courts.push({
        courtNumber: groupIndex + 1,
        leftPair: split.leftPair,
        rightPair: split.rightPair,
      });
      partnerPairIndexes.push(...split.partnerPairIndexes);
      opponentPairIndexes.push(...split.opponentPairIndexes);
      courtCompositionKeys.push(courtCompositionKey(group));
    });

    const repeatedPartnerPairs = partnerPairIndexes.reduce((total, pairIndex) => total + state.partnerCounts[pairIndex], 0);
    const repeatedOpponentEncounters = opponentPairIndexes.reduce((total, pairIndex) => total + state.opponentCounts[pairIndex], 0);
    const repeatedCourtCompositions = courtCompositionKeys.reduce((total, key) => total + (state.courtCompositionCounts.get(key) ?? 0), 0);
    const newSharedPairs = countNewSharedPairs(partition.sharedPairIndexes, state);
    const signature = courts.map((court) => [
      court.courtNumber,
      court.leftPair[0],
      court.leftPair[1],
      court.rightPair[0],
      court.rightPair[1],
    ].map(padIndex).join(".")).join("|");

    return {
      courts,
      sharedPairIndexes: partition.sharedPairIndexes,
      partnerPairIndexes,
      opponentPairIndexes,
      courtCompositionKeys,
      rank: {
        values: [context.courtCount * 6 - newSharedPairs, repeatedPartnerPairs, repeatedOpponentEncounters, repeatedCourtCompositions],
        signature,
      },
      signature,
    };
  });

  candidates.sort((left, right) => compareRanking(left.rank, right.rank));
  return candidates.slice(0, limit);
}

function applyRotation(state: ScheduleState, candidate: RotationCandidate, rotaNumber: number, sitOutPlayerIndexes: readonly number[]): ScheduleState {
  const sharedCounts = new Uint16Array(state.sharedCounts);
  const partnerCounts = new Uint16Array(state.partnerCounts);
  const opponentCounts = new Uint16Array(state.opponentCounts);
  const courtCompositionCounts = new Map(state.courtCompositionCounts);

  let uncoveredSharedPairsRemaining = state.uncoveredSharedPairsRemaining;
  let repeatedPartnerPairCount = state.repeatedPartnerPairCount;
  let repeatedOpponentEncounterCount = state.repeatedOpponentEncounterCount;
  let repeatedCourtCompositionCount = state.repeatedCourtCompositionCount;

  for (const pairIndex of candidate.sharedPairIndexes) {
    if (sharedCounts[pairIndex] === 0) uncoveredSharedPairsRemaining -= 1;
    sharedCounts[pairIndex] += 1;
  }

  for (const pairIndex of candidate.partnerPairIndexes) {
    if (partnerCounts[pairIndex] > 0) repeatedPartnerPairCount += 1;
    partnerCounts[pairIndex] += 1;
  }

  for (const pairIndex of candidate.opponentPairIndexes) {
    if (opponentCounts[pairIndex] > 0) repeatedOpponentEncounterCount += 1;
    opponentCounts[pairIndex] += 1;
  }

  for (const key of candidate.courtCompositionKeys) {
    const previousCount = courtCompositionCounts.get(key) ?? 0;
    if (previousCount > 0) repeatedCourtCompositionCount += 1;
    courtCompositionCounts.set(key, previousCount + 1);
  }

  const rota: TechnicalRota = {
    rotaNumber,
    courts: candidate.courts,
    sitOutPlayerIndexes: [...sitOutPlayerIndexes].sort((a, b) => a - b),
  };

  return {
    sharedCounts,
    partnerCounts,
    opponentCounts,
    courtCompositionCounts,
    rotas: [...state.rotas, rota],
    uncoveredSharedPairsRemaining,
    repeatedPartnerPairCount,
    repeatedOpponentEncounterCount,
    repeatedCourtCompositionCount,
    sitOutFairnessPenalty: state.sitOutFairnessPenalty,
    lexicographicSignature: [state.lexicographicSignature, candidate.signature].filter(Boolean).join("/"),
  };
}

function stateRanking(state: ScheduleState): RankingKey {
  return {
    values: [
      state.uncoveredSharedPairsRemaining,
      state.repeatedPartnerPairCount,
      state.sitOutFairnessPenalty,
      state.repeatedOpponentEncounterCount,
      state.repeatedCourtCompositionCount,
    ],
    signature: state.lexicographicSignature,
  };
}

function activePlayersForRotation(playerCount: number, sitOuts: readonly number[]): number[] {
  const sitOutSet = new Set(sitOuts);
  return Array.from({ length: playerCount }, (_, playerIndex) => playerIndex).filter((playerIndex) => !sitOutSet.has(playerIndex));
}

function calculateSitOutFairnessPenalty(sitOutPlan: SitOutPlan, playerCount: number): number {
  const counts = Array<number>(playerCount).fill(0);
  sitOutPlan.forEach((sitOuts) => {
    sitOuts.forEach((playerIndex) => {
      counts[playerIndex] += 1;
    });
  });
  return Math.max(...counts) - Math.min(...counts);
}

function precomputeSearch(sitOutPlan: SitOutPlan, context: GeneratorContext): SearchPrecompute {
  const rotationCount = sitOutPlan.length;
  const futurePlayCounts = Array.from({ length: rotationCount + 1 }, () => Array<number>(context.playerCount).fill(0));
  const futurePairCoactive = Array.from({ length: rotationCount + 1 }, () => new Uint8Array(context.totalPairs));

  for (let rotationIndex = rotationCount - 1; rotationIndex >= 0; rotationIndex -= 1) {
    futurePlayCounts[rotationIndex] = [...futurePlayCounts[rotationIndex + 1]];
    futurePairCoactive[rotationIndex] = new Uint8Array(futurePairCoactive[rotationIndex + 1]);

    const activePlayers = activePlayersForRotation(context.playerCount, sitOutPlan[rotationIndex]);
    activePlayers.forEach((playerIndex) => {
      futurePlayCounts[rotationIndex][playerIndex] += 1;
    });

    for (let left = 0; left < activePlayers.length; left += 1) {
      for (let right = left + 1; right < activePlayers.length; right += 1) {
        futurePairCoactive[rotationIndex][pairIndexOf(context.pairIndex, activePlayers[left], activePlayers[right])] = 1;
      }
    }
  }

  return { futurePlayCounts, futurePairCoactive };
}

// Drops states that provably cannot finish. A state is dead if any of:
//   - remaining rotations cannot fit the uncovered pair budget (courtCount * 6 new pairs per rotation), or
//   - some uncovered pair has no future rotation where both players are active, or
//   - some player still needs more partners than their remaining play slots can supply
//     (each played rotation contributes 3 distinct partners on that player's court).
function shouldPruneState(state: ScheduleState, rotationIndex: number, context: GeneratorContext, precompute: SearchPrecompute): boolean {
  const remainingRotations = precompute.futurePlayCounts.length - 1 - rotationIndex;
  if (state.uncoveredSharedPairsRemaining > remainingRotations * context.courtCount * 6) return true;

  const uncoveredByPlayer = Array<number>(context.playerCount).fill(0);
  for (const [left, right] of context.allPairs) {
    const index = pairIndexOf(context.pairIndex, left, right);
    if (state.sharedCounts[index] > 0) continue;
    if (precompute.futurePairCoactive[rotationIndex][index] === 0) return true;
    uncoveredByPlayer[left] += 1;
    uncoveredByPlayer[right] += 1;
  }

  return uncoveredByPlayer.some((uncoveredCount, playerIndex) => uncoveredCount > precompute.futurePlayCounts[rotationIndex][playerIndex] * 3);
}

export function searchForScheduleWithSitOutPlan({
  sitOutPlan,
  playerCount,
  courtCount,
  rotationCount,
  beamWidth,
}: {
  sitOutPlan: SitOutPlan;
  playerCount: number;
  courtCount: number;
  rotationCount: number;
  beamWidth: number;
}): TechnicalRota[] | null {
  validateGeneratorInput(playerCount, courtCount);
  if (!validateSitOutPlan(sitOutPlan, playerCount, courtCount, rotationCount)) return null;

  const context = makeContext(playerCount, courtCount);
  const precompute = precomputeSearch(sitOutPlan, context);
  let beam: ScheduleState[] = [createInitialState(context, calculateSitOutFairnessPenalty(sitOutPlan, playerCount))];

  for (let rotationIndex = 0; rotationIndex < rotationCount; rotationIndex += 1) {
    const expandedStates: ScheduleState[] = [];

    for (const state of beam) {
      if (shouldPruneState(state, rotationIndex, context, precompute)) continue;

      const activePlayers = activePlayersForRotation(playerCount, sitOutPlan[rotationIndex]);
      const candidates = buildRotationCandidatesWithContext({
        activePlayers,
        state,
        context,
        limit: rotationExpansionLimit(context),
      });

      for (const candidate of candidates) {
        expandedStates.push(applyRotation(state, candidate, rotationIndex + 1, sitOutPlan[rotationIndex]));
      }
    }

    expandedStates.sort((left, right) => compareRanking(stateRanking(left), stateRanking(right)));
    beam = expandedStates.slice(0, beamWidth);
    if (beam.length === 0) return null;
  }

  const successfulState = beam.find((state) => state.uncoveredSharedPairsRemaining === 0);
  return successfulState?.rotas ?? null;
}

export function generateTechnicalRotas(input: GenerateTechnicalRotasInput): TechnicalRota[] {
  const { playerCount, courtCount, coverageMode = "sharedMatch" } = input;
  if (coverageMode !== "sharedMatch") {
    throw new Error(`Unsupported rota coverage mode: ${coverageMode}.`);
  }

  validateGeneratorInput(playerCount, courtCount);
  const lowerBound = calculateRotationLowerBound(playerCount, courtCount);
  const upperBound = lowerBound + playerCount + 4;

  const sitOutPlanPassLimits = courtCount >= 5 ? [1, SITOUT_PLAN_LIMIT] : [SITOUT_PLAN_LIMIT];
  const attemptedSearches = new Set<string>();

  for (const sitOutPlanPassLimit of sitOutPlanPassLimits) {
    for (let rotationCount = lowerBound; rotationCount <= upperBound; rotationCount += 1) {
      const sitOutPlans = generateSitOutPlans({
        playerCount,
        courtCount,
        rotationCount,
        limit: sitOutPlanPassLimit,
      });

      for (const beamWidth of BEAM_WIDTHS) {
        const resolvedBeamWidth = effectiveBeamWidth(courtCount, beamWidth);
        for (let planIndex = 0; planIndex < sitOutPlans.length; planIndex += 1) {
          const searchKey = `${rotationCount}:${planIndex}:${resolvedBeamWidth}`;
          if (attemptedSearches.has(searchKey)) continue;
          attemptedSearches.add(searchKey);

          const sitOutPlan = sitOutPlans[planIndex];
          const rotas = searchForScheduleWithSitOutPlan({
            sitOutPlan,
            playerCount,
            courtCount,
            rotationCount,
            beamWidth: resolvedBeamWidth,
          });
          if (rotas) return rotas;
        }
      }
    }
  }

  throw new Error(`Could not generate a fully covered rota within bounded deterministic search for ${playerCount} players and ${courtCount} courts.`);
}

export function mapTechnicalRotasToDomainRotas(technicalRotas: TechnicalRota[], players: Player[]): Rota[] {
  return technicalRotas.map((technicalRota, rotaIndex) => ({
    rotaNumber: rotaIndex + 1,
    courts: technicalRota.courts.map((court, courtIndex) => ({
      courtNumber: courtIndex + 1,
      leftPair: {
        player1Id: players[court.leftPair[0]].id,
        player2Id: players[court.leftPair[1]].id,
      },
      rightPair: {
        player1Id: players[court.rightPair[0]].id,
        player2Id: players[court.rightPair[1]].id,
      },
    })),
    sitOutPlayerIds: technicalRota.sitOutPlayerIndexes.map((playerIndex) => players[playerIndex].id),
  }));
}
