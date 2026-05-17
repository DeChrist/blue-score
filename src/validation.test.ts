import { describe, expect, it } from "vitest";
import type { Player, Rota } from "./types";
import { validatePlayers, validateRotas, validateSessionSetup, validateRota } from "./validation";

const players: Player[] = Array.from({ length: 16 }, (_, index) => ({
  id: `p${index + 1}`,
  displayName: `Player ${index + 1}`,
}));

const validRota: Rota = {
  rotaNumber: 1,
  courts: [
    { courtNumber: 1, leftPair: { player1Id: "p1", player2Id: "p2" }, rightPair: { player1Id: "p3", player2Id: "p4" } },
    { courtNumber: 2, leftPair: { player1Id: "p5", player2Id: "p6" }, rightPair: { player1Id: "p7", player2Id: "p8" } },
    { courtNumber: 3, leftPair: { player1Id: "p9", player2Id: "p10" }, rightPair: { player1Id: "p11", player2Id: "p12" } },
  ],
  sitOutPlayerIds: ["p13", "p14", "p15", "p16"],
};

describe("validatePlayers", () => {
  it("rejects missing and duplicate ids", () => {
    const result = validatePlayers([
      { id: "", displayName: "Alpha" },
      { id: "p1", displayName: "Bravo" },
      { id: "p1", displayName: "Charlie" },
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Player 1 needs an id.");
    expect(result.errors).toContain("Duplicate player id: p1.");
  });

  it("rejects missing display names", () => {
    const result = validatePlayers([{ id: "p1", displayName: "" }]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Player p1 needs a display name.");
  });
});

describe("validateRotas and validateRota", () => {
  it("rejects empty rota arrays", () => {
    const result = validateRotas([], players, 3);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Import at least one rota before scoring.");
  });

  it("rejects rota with incorrect number of courts", () => {
    const result = validateRota({ ...validRota, courts: validRota.courts.slice(0, 2) }, players, 3);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Rota 1 must contain exactly 3 courts.");
  });

  it("rejects rota with sit-out mismatch", () => {
    const result = validateRota({ ...validRota, sitOutPlayerIds: ["p1", "p14", "p15", "p16"] }, players, 3);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Rota 1 sit-outs must exactly match players not active in that rota.");
  });
});

describe("validateSessionSetup", () => {
  it("rejects invalid session-level constraints", () => {
    const result = validateSessionSetup(
      {
        name: "",
        pointsPerCourt: 0,
        players: players.slice(0, 11),
        rotas: [validRota],
      },
      3,
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Session name is required.");
    expect(result.errors).toContain("Points per court must be a positive integer.");
    expect(result.errors).toContain("Americano setup expects between 12 and 16 players for 3 courts.");
  });

  it("accepts a valid americano setup", () => {
    const result = validateSessionSetup(
      {
        name: "League Night",
        pointsPerCourt: 24,
        players,
        rotas: [validRota],
      },
      3,
    );

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
