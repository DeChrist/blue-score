import { describe, expect, it } from "vitest";
import { applyOrReplaceRotaResult, calculateStandings, initializeCourtScores, updateCourtScore } from "./scoring";
import type { CourtScore, Session } from "./types";
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
  courtCount: 3,
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

const twoRotaSession: Session = {
  ...baseSession,
  rotas: [
    baseSession.rotas[0],
    {
      rotaNumber: 2,
      courts: [
        { courtNumber: 1, leftPair: { player1Id: "p13", player2Id: "p14" }, rightPair: { player1Id: "p15", player2Id: "p16" } },
        { courtNumber: 2, leftPair: { player1Id: "p1", player2Id: "p3" }, rightPair: { player1Id: "p5", player2Id: "p7" } },
        { courtNumber: 3, leftPair: { player1Id: "p2", player2Id: "p4" }, rightPair: { player1Id: "p6", player2Id: "p8" } },
      ],
      sitOutPlayerIds: ["p9", "p10", "p11", "p12"],
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

  it("advances current rota to the first unsubmitted rota", () => {
    const session = applyOrReplaceRotaResult(twoRotaSession, {
      rotaNumber: 1,
      submittedAt: "2026-01-01T00:01:00.000Z",
      scores: [
        { courtNumber: 1, leftScore: 15, rightScore: 9 },
        { courtNumber: 2, leftScore: 12, rightScore: 12 },
        { courtNumber: 3, leftScore: 24, rightScore: 0 },
      ],
    });

    expect(session.currentRotaNumber).toBe(2);
  });

  it("keeps current rota as submitted rota when all rotas are submitted", () => {
    const afterSecond = applyOrReplaceRotaResult(twoRotaSession, {
      rotaNumber: 2,
      submittedAt: "2026-01-01T00:01:00.000Z",
      scores: [
        { courtNumber: 1, leftScore: 12, rightScore: 12 },
        { courtNumber: 2, leftScore: 14, rightScore: 10 },
        { courtNumber: 3, leftScore: 8, rightScore: 16 },
      ],
    });

    expect(afterSecond.currentRotaNumber).toBe(1);

    const afterAllSubmitted = applyOrReplaceRotaResult(afterSecond, {
      rotaNumber: 1,
      submittedAt: "2026-01-01T00:02:00.000Z",
      scores: [
        { courtNumber: 1, leftScore: 15, rightScore: 9 },
        { courtNumber: 2, leftScore: 12, rightScore: 12 },
        { courtNumber: 3, leftScore: 24, rightScore: 0 },
      ],
    });

    expect(afterAllSubmitted.currentRotaNumber).toBe(1);
  });

  it("ignores result rows that reference a missing rota", () => {
    const sessionWithUnknownResult: Session = {
      ...baseSession,
      results: [
        {
          rotaNumber: 99,
          submittedAt: "2026-01-01T00:05:00.000Z",
          scores: [{ courtNumber: 1, leftScore: 24, rightScore: 0 }],
        },
      ],
    };

    const standings = calculateStandings(sessionWithUnknownResult);
    expect(standings.find((row) => row.playerId === "p1")?.totalPoints).toBe(0);
    expect(standings.find((row) => row.playerId === "p13")?.rotasSatOut).toBe(0);
  });

  it("assigns shared rank for tied totals and computes averages from played rotas", () => {
    const tieSession: Session = {
      id: "tie-session",
      name: "Tie Test",
      createdAt: "2026-01-01T00:00:00.000Z",
      pointsPerCourt: 24,
      courtCount: 3,
      players: [
        { id: "a", displayName: "Alex" },
        { id: "b", displayName: "Blair" },
        { id: "c", displayName: "Casey" },
        { id: "d", displayName: "Drew" },
        { id: "e", displayName: "Evan" },
        { id: "f", displayName: "Fin" },
      ],
      rotas: [
        {
          rotaNumber: 1,
          courts: [{ courtNumber: 1, leftPair: { player1Id: "a", player2Id: "b" }, rightPair: { player1Id: "c", player2Id: "d" } }],
          sitOutPlayerIds: ["e", "f"],
        },
      ],
      results: [
        {
          rotaNumber: 1,
          submittedAt: "2026-01-01T00:01:00.000Z",
          scores: [{ courtNumber: 1, leftScore: 14, rightScore: 10 }],
        },
      ],
      currentRotaNumber: 1,
    };

    const standings = calculateStandings(tieSession);
    expect(standings.find((row) => row.playerId === "a")?.rank).toBe(1);
    expect(standings.find((row) => row.playerId === "b")?.rank).toBe(1);
    expect(standings.find((row) => row.playerId === "c")?.rank).toBe(3);
    expect(standings.find((row) => row.playerId === "e")?.averagePointsWhenPlaying).toBe(0);
    expect(standings.find((row) => row.playerId === "a")?.averagePointsWhenPlaying).toBe(14);
  });

  it("initializes court scores balanced based on pointsPerCourt", () => {
    const courts = [{ courtNumber: 1 }, { courtNumber: 2 }, { courtNumber: 3 }];
    const scores = initializeCourtScores(courts, 24);
    expect(scores).toEqual([
      { courtNumber: 1, leftScore: 12, rightScore: 12 },
      { courtNumber: 2, leftScore: 12, rightScore: 12 },
      { courtNumber: 3, leftScore: 12, rightScore: 12 },
    ]);
    scores.forEach((score) => {
      expect(score.leftScore + score.rightScore).toBe(24);
    });
  });

  it("initializes court scores with odd pointsPerCourt (e.g., 25 → 12-13)", () => {
    const courts = [{ courtNumber: 1 }];
    const scores = initializeCourtScores(courts, 25);
    expect(scores[0]).toEqual({ courtNumber: 1, leftScore: 12, rightScore: 13 });
    expect(scores[0].leftScore + scores[0].rightScore).toBe(25);
  });

  it("updates a court score and mirrors the opposite side", () => {
    const initial: CourtScore[] = [{ courtNumber: 1, leftScore: 12, rightScore: 12 }];
    // Update left side to 15 → right should become 9 (total 24)
    const updated = updateCourtScore(initial, 1, "leftScore", 15, 24);
    expect(updated[0]).toEqual({ courtNumber: 1, leftScore: 15, rightScore: 9 });
  });

  it("creates a missing court score when updating", () => {
    const initial: CourtScore[] = [{ courtNumber: 1, leftScore: 12, rightScore: 12 }];
    // Update court 2 which doesn't exist yet → should create it
    const updated = updateCourtScore(initial, 2, "rightScore", 8, 24);
    expect(updated).toHaveLength(2);
    expect(updated.find((s) => s.courtNumber === 2)).toEqual({ courtNumber: 2, leftScore: 16, rightScore: 8 });
  });

  it("clamps score values to [0, pointsPerCourt]", () => {
    const initial: CourtScore[] = [];
    // Try to set left to 100 (exceeds 24) → should clamp to 24
    const updated = updateCourtScore(initial, 1, "leftScore", 100, 24);
    expect(updated[0]).toEqual({ courtNumber: 1, leftScore: 24, rightScore: 0 });
    // Try to set right to -5 → should clamp to 0
    const clamped = updateCourtScore(updated, 1, "rightScore", -5, 24);
    expect(clamped[0]).toEqual({ courtNumber: 1, leftScore: 24, rightScore: 0 });
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
