import { describe, expect, it } from "vitest";
import { applyOrReplaceRotaResult, calculateStandings } from "./scoring";
import type { Session } from "./types";
import { validateCourtScore, validateRota } from "./validation";

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
    const session = applyOrReplaceRotaResult(baseSession, {
      rotaNumber: 1,
      submittedAt: "2026-01-01T00:01:00.000Z",
      scores: [
        { courtNumber: 1, leftScore: 15, rightScore: 9 },
        { courtNumber: 2, leftScore: 12, rightScore: 12 },
        { courtNumber: 3, leftScore: 24, rightScore: 0 },
      ],
    });

    const standings = calculateStandings(session);
    expect(standings.find((row) => row.playerId === "p1")?.totalPoints).toBe(15);
    expect(standings.find((row) => row.playerId === "p2")?.totalPoints).toBe(15);
    expect(standings.find((row) => row.playerId === "p3")?.totalPoints).toBe(9);
    expect(standings.find((row) => row.playerId === "p4")?.totalPoints).toBe(9);
  });

  it("keeps sit-outs at zero for that rota", () => {
    const session = applyOrReplaceRotaResult(baseSession, {
      rotaNumber: 1,
      submittedAt: "2026-01-01T00:01:00.000Z",
      scores: [
        { courtNumber: 1, leftScore: 15, rightScore: 9 },
        { courtNumber: 2, leftScore: 12, rightScore: 12 },
        { courtNumber: 3, leftScore: 24, rightScore: 0 },
      ],
    });

    const row = calculateStandings(session).find((item) => item.playerId === "p13");
    expect(row?.totalPoints).toBe(0);
    expect(row?.rotasSatOut).toBe(1);
  });

  it("replaces an edited rota instead of double-counting", () => {
    const first = applyOrReplaceRotaResult(baseSession, {
      rotaNumber: 1,
      submittedAt: "2026-01-01T00:01:00.000Z",
      scores: [
        { courtNumber: 1, leftScore: 15, rightScore: 9 },
        { courtNumber: 2, leftScore: 12, rightScore: 12 },
        { courtNumber: 3, leftScore: 24, rightScore: 0 },
      ],
    });
    const edited = applyOrReplaceRotaResult(first, {
      rotaNumber: 1,
      submittedAt: "2026-01-01T00:02:00.000Z",
      scores: [
        { courtNumber: 1, leftScore: 10, rightScore: 14 },
        { courtNumber: 2, leftScore: 12, rightScore: 12 },
        { courtNumber: 3, leftScore: 24, rightScore: 0 },
      ],
    });

    expect(calculateStandings(edited).find((row) => row.playerId === "p1")?.totalPoints).toBe(10);
    expect(edited.results).toHaveLength(1);
  });
});

describe("validation", () => {
  it("rejects scores that do not total the points per court", () => {
    expect(validateCourtScore({ courtNumber: 1, leftScore: 15, rightScore: 8 }, 24).valid).toBe(false);
  });

  it("rejects duplicate player usage in one rota", () => {
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
