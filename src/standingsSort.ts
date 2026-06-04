import type { StandingRow } from "./types";

export type SortKey = "points" | "avg" | "name";

type Comparator = (a: StandingRow, b: StandingRow) => number;

const byName: Comparator = (a, b) => a.displayName.localeCompare(b.displayName);
const byRank: Comparator = (a, b) => a.rank - b.rank;

const COMPARATORS: Record<SortKey, Comparator> = {
  // Highest points first; ties fall back to rank, then name for determinism.
  points: (a, b) => b.totalPoints - a.totalPoints || byRank(a, b) || byName(a, b),
  // Best average first; ties fall back to points, then rank, then name.
  avg: (a, b) =>
    b.averagePointsWhenPlaying - a.averagePointsWhenPlaying ||
    b.totalPoints - a.totalPoints ||
    byRank(a, b) ||
    byName(a, b),
  // Alphabetical; ties (duplicate names) fall back to rank.
  name: (a, b) => byName(a, b) || byRank(a, b),
};

/**
 * Returns a new array sorted for presentation. Never mutates `rows`, and always
 * passes an explicit comparator (a bare `.sort()` is a Sonar S2871 finding).
 */
export function sortStandings(rows: StandingRow[], key: SortKey): StandingRow[] {
  return [...rows].sort(COMPARATORS[key]);
}
