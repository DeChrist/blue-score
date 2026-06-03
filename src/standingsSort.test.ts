import { describe, expect, it } from "vitest";
import type { StandingRow } from "./types";
import { sortStandings } from "./standingsSort";

function row(overrides: Partial<StandingRow> = {}): StandingRow {
  return {
    playerId: "p",
    displayName: "Player",
    rank: 1,
    totalPoints: 0,
    rotasPlayed: 0,
    rotasSatOut: 0,
    averagePointsWhenPlaying: 0,
    ...overrides,
  };
}

const ana = row({ playerId: "a", displayName: "Ana", rank: 2, totalPoints: 20, averagePointsWhenPlaying: 5 });
const ben = row({ playerId: "b", displayName: "Ben", rank: 1, totalPoints: 30, averagePointsWhenPlaying: 6 });
const cleo = row({ playerId: "c", displayName: "Cleo", rank: 3, totalPoints: 20, averagePointsWhenPlaying: 10 });

describe("sortStandings", () => {
  it("orders by total points descending, then rank, then name", () => {
    const result = sortStandings([ana, ben, cleo], "points");
    // Ben (30) first; Ana & Cleo tie at 20, broken by rank (Ana=2 before Cleo=3).
    expect(result.map((r) => r.playerId)).toEqual(["b", "a", "c"]);
  });

  it("orders by average points when playing, descending", () => {
    const result = sortStandings([ana, ben, cleo], "avg");
    expect(result.map((r) => r.playerId)).toEqual(["c", "b", "a"]);
  });

  it("orders alphabetically by display name", () => {
    const result = sortStandings([cleo, ana, ben], "name");
    expect(result.map((r) => r.displayName)).toEqual(["Ana", "Ben", "Cleo"]);
  });

  it("does not mutate the input array", () => {
    const input = [ana, ben, cleo];
    const snapshot = [...input];
    sortStandings(input, "points");
    expect(input).toEqual(snapshot);
    expect(input[0]).toBe(ana);
  });
});
