import { describe, expect, it } from "vitest";
import { formatPair, makePlayerNameLookup } from "./playerLookup";
import type { Pair } from "./types";

const players = [
  { id: "p1", displayName: "Alice" },
  { id: "p2", displayName: "Bob" },
  { id: "p3", displayName: "Carol" },
];

describe("makePlayerNameLookup", () => {
  it("returns the displayName for a known id", () => {
    const playerName = makePlayerNameLookup(players);
    expect(playerName("p1")).toBe("Alice");
    expect(playerName("p3")).toBe("Carol");
  });

  it("falls back to the raw id for an unknown id", () => {
    const playerName = makePlayerNameLookup(players);
    expect(playerName("unknown-id")).toBe("unknown-id");
  });

  it("returns an empty-string fallback when id is an empty string", () => {
    const playerName = makePlayerNameLookup(players);
    expect(playerName("")).toBe("");
  });

  it("returns the raw id when the players array is empty", () => {
    const playerName = makePlayerNameLookup([]);
    expect(playerName("p1")).toBe("p1");
  });
});

describe("formatPair", () => {
  it("formats two known players as 'Name1 / Name2'", () => {
    const playerName = makePlayerNameLookup(players);
    const pair: Pair = { player1Id: "p1", player2Id: "p2" };
    expect(formatPair(playerName, pair)).toBe("Alice / Bob");
  });

  it("falls back to the raw id for unknown players in a pair", () => {
    const playerName = makePlayerNameLookup(players);
    const pair: Pair = { player1Id: "p1", player2Id: "ghost" };
    expect(formatPair(playerName, pair)).toBe("Alice / ghost");
  });
});
