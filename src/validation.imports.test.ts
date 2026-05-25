import { describe, expect, it } from "vitest";
import { samplePlayers, sampleRotas } from "./sampleData";
import { parseImportedPlayers, parseImportedRotas, parseImportedSession, validateRotas, validateRota, validateSessionResults } from "./validation";

describe("import parsers", () => {
  it("parses valid players JSON", () => {
    const result = parseImportedPlayers(samplePlayers);
    expect(result.value).not.toBeNull();
    expect(result.errors).toHaveLength(0);
    expect(result.value?.length).toBe(16);
  });

  it("rejects invalid players JSON shape", () => {
    const result = parseImportedPlayers([{ id: "p1", displayName: 42 }]);
    expect(result.value).toBeNull();
    expect(result.errors).toContain("players[0].displayName must be a string.");
  });

  it("parses valid rotas JSON", () => {
    const result = parseImportedRotas(sampleRotas);
    expect(result.value).not.toBeNull();
    expect(result.errors).toHaveLength(0);
    expect(result.value?.length).toBe(3);
  });

  it("rejects invalid rotas JSON shape", () => {
    const result = parseImportedRotas([
      {
        rotaNumber: 1,
        courts: [{ courtNumber: "one", leftPair: { player1Id: "p1", player2Id: "p2" }, rightPair: { player1Id: "p3", player2Id: "p4" } }],
        sitOutPlayerIds: ["p5", "p6", "p7", "p8"],
      },
    ]);

    expect(result.value).toBeNull();
    expect(result.errors).toContain("rotas[0].courts[0].courtNumber must be an integer.");
  });

  it("parses a valid full session import", () => {
    const result = parseImportedSession({
      id: "session-1",
      name: "Session",
      createdAt: "2026-05-16T10:00:00.000Z",
      pointsPerCourt: 24,
      courtCount: 3,
      players: samplePlayers,
      rotas: sampleRotas,
      results: [
        {
          rotaNumber: 1,
          submittedAt: "2026-05-16T10:05:00.000Z",
          scores: [
            { courtNumber: 1, leftScore: 12, rightScore: 12 },
            { courtNumber: 2, leftScore: 13, rightScore: 11 },
            { courtNumber: 3, leftScore: 9, rightScore: 15 },
          ],
        },
      ],
      currentRotaNumber: 1,
    });

    expect(result.value).not.toBeNull();
    expect(result.errors).toHaveLength(0);
    expect(result.value?.players.length).toBe(16);
  });

  it("collects nested and scalar session errors together", () => {
    const result = parseImportedSession({
      id: 123,
      name: true,
      createdAt: 42,
      pointsPerCourt: "24",
      players: "not-an-array",
      rotas: "not-an-array",
      results: "not-an-array",
      currentRotaNumber: "1",
    });

    expect(result.value).toBeNull();
    expect(result.errors).toContain("Players JSON must be an array.");
    expect(result.errors).toContain("Rotas JSON must be an array.");
    expect(result.errors).toContain("session.results must be an array.");
    expect(result.errors).toContain("session.id must be a string.");
    expect(result.errors).toContain("session.currentRotaNumber must be an integer.");
  });

  it("rejects invalid session results instead of returning partial values", () => {
    const result = parseImportedSession({
      id: "session-1",
      name: "Session",
      createdAt: "2026-05-16T10:00:00.000Z",
      pointsPerCourt: 24,
      players: samplePlayers,
      rotas: sampleRotas,
      results: [
        {
          rotaNumber: "1",
          submittedAt: 5,
          scores: [{ courtNumber: 1, leftScore: "12", rightScore: 12 }],
        },
      ],
      currentRotaNumber: 1,
    });

    expect(result.value).toBeNull();
    expect(result.errors).toContain("session.results[0].rotaNumber must be an integer.");
    expect(result.errors).toContain("session.results[0].submittedAt must be a string.");
    expect(result.errors).toContain("session.results[0].scores[0].leftScore must be an integer.");
  });

  it("rejects imported session results with invalid score totals", () => {
    const result = parseImportedSession({
      id: "session-1",
      name: "Session",
      createdAt: "2026-05-16T10:00:00.000Z",
      pointsPerCourt: 24,
      players: samplePlayers,
      rotas: sampleRotas,
      results: [
        {
          rotaNumber: 1,
          submittedAt: "2026-05-16T10:05:00.000Z",
          scores: [
            { courtNumber: 1, leftScore: 15, rightScore: 8 },
            { courtNumber: 2, leftScore: 13, rightScore: 11 },
            { courtNumber: 3, leftScore: 9, rightScore: 15 },
          ],
        },
      ],
      currentRotaNumber: 1,
    });

    expect(result.value).not.toBeNull();
    const validation = validateSessionResults(result.value!);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain("Court 1: scores must total 24.");
  });

  it("rejects duplicate results for the same rota", () => {
    const result = parseImportedSession({
      id: "session-1",
      name: "Session",
      createdAt: "2026-05-16T10:00:00.000Z",
      pointsPerCourt: 24,
      players: samplePlayers,
      rotas: sampleRotas,
      results: [
        {
          rotaNumber: 1,
          submittedAt: "2026-05-16T10:05:00.000Z",
          scores: [
            { courtNumber: 1, leftScore: 12, rightScore: 12 },
            { courtNumber: 2, leftScore: 13, rightScore: 11 },
            { courtNumber: 3, leftScore: 9, rightScore: 15 },
          ],
        },
        {
          rotaNumber: 1,
          submittedAt: "2026-05-16T10:08:00.000Z",
          scores: [
            { courtNumber: 1, leftScore: 10, rightScore: 14 },
            { courtNumber: 2, leftScore: 12, rightScore: 12 },
            { courtNumber: 3, leftScore: 16, rightScore: 8 },
          ],
        },
      ],
      currentRotaNumber: 1,
    });

    expect(result.value).not.toBeNull();
    const validation = validateSessionResults(result.value!);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain("Session has duplicate result for rota 1.");
  });

  it("rejects imported session results with missing court scores", () => {
    const result = parseImportedSession({
      id: "session-1",
      name: "Session",
      createdAt: "2026-05-16T10:00:00.000Z",
      pointsPerCourt: 24,
      players: samplePlayers,
      rotas: sampleRotas,
      results: [
        {
          rotaNumber: 1,
          submittedAt: "2026-05-16T10:05:00.000Z",
          scores: [
            { courtNumber: 1, leftScore: 12, rightScore: 12 },
            { courtNumber: 2, leftScore: 13, rightScore: 11 },
          ],
        },
      ],
      currentRotaNumber: 1,
    });

    expect(result.value).not.toBeNull();
    const validation = validateSessionResults(result.value!);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain("Result for rota 1 is missing score for court 3.");
  });

  it("rejects imported session results for unknown rota numbers", () => {
    const result = parseImportedSession({
      id: "session-1",
      name: "Session",
      createdAt: "2026-05-16T10:00:00.000Z",
      pointsPerCourt: 24,
      players: samplePlayers,
      rotas: sampleRotas,
      results: [
        {
          rotaNumber: 99,
          submittedAt: "2026-05-16T10:05:00.000Z",
          scores: [{ courtNumber: 1, leftScore: 12, rightScore: 12 }],
        },
      ],
      currentRotaNumber: 1,
    });

    expect(result.value).not.toBeNull();
    const validation = validateSessionResults(result.value!);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain("Result for rota 99 references an unknown rota.");
  });

  it("session without courtCount defaults to 3", () => {
    const result = parseImportedSession({
      id: "session-1",
      name: "Session",
      createdAt: "2026-05-16T10:00:00.000Z",
      pointsPerCourt: 24,
      players: [],
      rotas: [],
      results: [],
      currentRotaNumber: 1,
    });
    expect(result.value).not.toBeNull();
    expect(result.value?.courtCount).toBe(3);
  });

  it("courtCount: 5 parses correctly", () => {
    const result = parseImportedSession({
      id: "session-1",
      name: "Session",
      createdAt: "2026-05-16T10:00:00.000Z",
      pointsPerCourt: 24,
      courtCount: 5,
      players: [],
      rotas: [],
      results: [],
      currentRotaNumber: 1,
    });
    expect(result.value).not.toBeNull();
    expect(result.value?.courtCount).toBe(5);
  });

  it("courtCount: 2.5 fails parsing (non-integer)", () => {
    const result = parseImportedSession({
      id: "session-1",
      name: "Session",
      createdAt: "2026-05-16T10:00:00.000Z",
      pointsPerCourt: 24,
      courtCount: 2.5,
      players: [],
      rotas: [],
      results: [],
      currentRotaNumber: 1,
    });
    expect(result.value).toBeNull();
    expect(result.errors).toContain("session.courtCount must be an integer when provided.");
  });

  it("rejects duplicate rotaNumber values across rota set", () => {
    const rotasWithDuplicate = [
      { ...sampleRotas[0], rotaNumber: 1 },
      { ...sampleRotas[1], rotaNumber: 1 },
    ];
    const result = validateRotas(rotasWithDuplicate, samplePlayers, 3);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Duplicate rota number: 1.");
  });

  it("rejects duplicate courtNumber within a single rota", () => {
    const players16 = Array.from({ length: 16 }, (_, i) => ({ id: `p${i + 1}`, displayName: `Player ${i + 1}` }));
    const rotaWithDuplicateCourt = {
      rotaNumber: 1,
      courts: [
        { courtNumber: 1, leftPair: { player1Id: "p1", player2Id: "p2" }, rightPair: { player1Id: "p3", player2Id: "p4" } },
        { courtNumber: 1, leftPair: { player1Id: "p5", player2Id: "p6" }, rightPair: { player1Id: "p7", player2Id: "p8" } },
        { courtNumber: 3, leftPair: { player1Id: "p9", player2Id: "p10" }, rightPair: { player1Id: "p11", player2Id: "p12" } },
      ],
      sitOutPlayerIds: ["p13", "p14", "p15", "p16"],
    };
    const result = validateRota(rotaWithDuplicateCourt, players16, 3);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Rota 1 has duplicate court number: 1.");
  });
});
