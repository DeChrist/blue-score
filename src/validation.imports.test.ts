import { describe, expect, it } from "vitest";
import { samplePlayers, sampleRotas } from "./sampleData";
import { parseImportedPlayers, parseImportedRotas, parseImportedSession } from "./validation";

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
});
