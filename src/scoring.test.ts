import { describe, expect, it } from "vitest";
import { applyOrReplaceRotaResult, calculateStandings } from "./scoring";
import type { Session } from "./types";
import { validateCourtScore, validateRota } from "./validation";

// Fixture map for this file:
// - One session with pointsPerCourt = 24.
// - One rota (rotaNumber 1) with three courts.
// - Each court has a left pair and right pair (2 players per side).
// - Four players sit out in this rota (p13-p16).
// Tests either submit scores for this rota or validate intentionally broken rota data.
const players = [
  { id: "p1", displayName: "Ada" },
  { id: "p2", displayName: "Bea" },
  { id: "p3", displayName: "Cy" },
  { id: "p4", displayName: "Dee" },
  { id: "p5", displayName: "Eli" },
  { id: "p6", displayName: "Flo" },
  { id: "p7", displayName: "Gia" },
  { id: "p8", displayName: "Hal" },
  { id: "p9", displayName: "Ira" },
  { id: "p10", displayName: "Jae" },
  { id: "p11", displayName: "Kim" },
  { id: "p12", displayName: "Lou" },
  { id: "p13", displayName: "Mia" },
  { id: "p14", displayName: "Noa" },
  { id: "p15", displayName: "Oli" },
  { id: "p16", displayName: "Paz" },
];

const baseSession: Session = {
  id: "s1",
  name: "Test",
  createdAt: "2026-01-01T00:00:00.000Z",
  pointsPerCourt: 24,
  players,
  currentRotaNumber: 1,
  results: [],
  rotas: [
    {
      rotaNumber: 1,
      courts: [
        { courtNumber: 1, leftPair: { player1Id: "p1", player2Id: "p2" }, rightPair: { player1Id: "p3", player2Id: "p4" } },
        { courtNumber: 2, leftPair: { player1Id: "p5", player2Id: "p6" }, rightPair: { player1Id: "p7", player2Id: "p8" } },
        { courtNumber: 3, leftPair: { player1Id: "p9", player2Id: "p10" }, rightPair: { player1Id: "p11", player2Id: "p12" } },
      ],
      sitOutPlayerIds: ["p13", "p14", "p15", "p16"],
    },
  ],
};

describe("scoring", () => {
  it("awards a 15-9 court score to both players on each side", () => {
    // Apply one full rota result with three courts.
    const session = applyOrReplaceRotaResult(baseSession, {
      rotaNumber: 1,
      submittedAt: "2026-01-01T00:01:00.000Z",
      scores: [
        { courtNumber: 1, leftScore: 15, rightScore: 9 },
        { courtNumber: 2, leftScore: 12, rightScore: 12 },
        { courtNumber: 3, leftScore: 24, rightScore: 0 },
      ],
    });

    // Standings should award the side score to both players in that pair.
    const standings = calculateStandings(session);
    // Court 1 left pair (p1, p2) should each get 15.
    expect(standings.find((row) => row.playerId === "p1")?.totalPoints).toBe(15);
    expect(standings.find((row) => row.playerId === "p2")?.totalPoints).toBe(15);
    // Court 1 right pair (p3, p4) should each get 9.
    expect(standings.find((row) => row.playerId === "p3")?.totalPoints).toBe(9);
    expect(standings.find((row) => row.playerId === "p4")?.totalPoints).toBe(9);
  });

  it("keeps sit-outs at zero for that rota", () => {
    // Same scored rota: p13 is listed in sitOutPlayerIds for rota 1.
    const session = applyOrReplaceRotaResult(baseSession, {
      rotaNumber: 1,
      submittedAt: "2026-01-01T00:01:00.000Z",
      scores: [
        { courtNumber: 1, leftScore: 15, rightScore: 9 },
        { courtNumber: 2, leftScore: 12, rightScore: 12 },
        { courtNumber: 3, leftScore: 24, rightScore: 0 },
      ],
    });

    // Sit-out players accrue a sit-out count, but no points from that rota.
    const row = calculateStandings(session).find((item) => item.playerId === "p13");
    expect(row?.totalPoints).toBe(0);
    expect(row?.rotasSatOut).toBe(1);
  });

  it("replaces an edited rota instead of double-counting", () => {
    // First submission for rota 1.
    const first = applyOrReplaceRotaResult(baseSession, {
      rotaNumber: 1,
      submittedAt: "2026-01-01T00:01:00.000Z",
      scores: [
        { courtNumber: 1, leftScore: 15, rightScore: 9 },
        { courtNumber: 2, leftScore: 12, rightScore: 12 },
        { courtNumber: 3, leftScore: 24, rightScore: 0 },
      ],
    });
    // Edited submission for the same rota number should replace, not append.
    const edited = applyOrReplaceRotaResult(first, {
      rotaNumber: 1,
      submittedAt: "2026-01-01T00:02:00.000Z",
      scores: [
        { courtNumber: 1, leftScore: 10, rightScore: 14 },
        { courtNumber: 2, leftScore: 12, rightScore: 12 },
        { courtNumber: 3, leftScore: 24, rightScore: 0 },
      ],
    });

    // p1 reflects edited court 1 score (10), proving no double-counting.
    expect(calculateStandings(edited).find((row) => row.playerId === "p1")?.totalPoints).toBe(10);
    // Only one stored result should exist for rota 1.
    expect(edited.results).toHaveLength(1);
  });
});

describe("validation", () => {
  it("rejects scores that do not total the points per court", () => {
    // 15 + 8 != 24, so this court score is invalid.
    expect(validateCourtScore({ courtNumber: 1, leftScore: 15, rightScore: 8 }, 24).valid).toBe(false);
  });

  it("rejects duplicate player usage in one rota", () => {
    // Construct a rota where p1 appears twice on the same court (invalid).
    const rota = {
      ...baseSession.rotas[0],
      courts: [
        { courtNumber: 1, leftPair: { player1Id: "p1", player2Id: "p1" }, rightPair: { player1Id: "p3", player2Id: "p4" } },
        ...baseSession.rotas[0].courts.slice(1),
      ],
    };
    expect(validateRota(rota, players, 3).valid).toBe(false);
  });

  it("rejects unknown player ids in a rota", () => {
    // Construct a rota with a player id that does not exist in the session player list.
    const rota = {
      ...baseSession.rotas[0],
      courts: [
        { courtNumber: 1, leftPair: { player1Id: "missing", player2Id: "p2" }, rightPair: { player1Id: "p3", player2Id: "p4" } },
        ...baseSession.rotas[0].courts.slice(1),
      ],
    };
    expect(validateRota(rota, players, 3).valid).toBe(false);
  });
});
