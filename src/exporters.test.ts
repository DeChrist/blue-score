import { describe, expect, it } from "vitest";
import { exportResultsCsv, exportStandingsCsv } from "./exporters";
import type { Session, StandingRow } from "./types";

function makeStanding(displayName: string, totalPoints: number, rank: number): StandingRow {
  return { playerId: displayName, displayName, rank, totalPoints, rotasPlayed: 1, rotasSatOut: 0, averagePointsWhenPlaying: totalPoints };
}

describe("CSV escaping", () => {
  it("wraps standings names containing commas, doubles embedded quotes, and quotes names with newlines", () => {
    const csv = exportStandingsCsv([
      makeStanding('Smith, "Bob"', 24, 1),
      makeStanding("Plain Name", 18, 2),
      makeStanding("Line\nBreak", 12, 3),
    ]);

    // Inner double-quote is doubled, then the whole field is wrapped.
    expect(csv).toContain('"Smith, ""Bob"""');
    // No special chars → no quoting.
    expect(csv).toContain(",Plain Name,");
    // Newline-containing fields must be quoted so consumers don't split mid-row.
    expect(csv).toContain('"Line\nBreak"');
  });

  it("quotes results-CSV pair cells when a player name contains a comma", () => {
    const session: Session = {
      id: "s1",
      name: "Session",
      createdAt: "2026-05-20T00:00:00.000Z",
      pointsPerCourt: 24,
      courtCount: 3,
      currentRotaNumber: 1,
      players: [
        { id: "p1", displayName: "Smith, Bob" },
        { id: "p2", displayName: "Alice" },
        { id: "p3", displayName: "Carol" },
        { id: "p4", displayName: "Dan" },
      ],
      rotas: [
        {
          rotaNumber: 1,
          courts: [
            { courtNumber: 1, leftPair: { player1Id: "p1", player2Id: "p2" }, rightPair: { player1Id: "p3", player2Id: "p4" } },
          ],
          sitOutPlayerIds: [],
        },
      ],
      results: [
        {
          rotaNumber: 1,
          submittedAt: "2026-05-20T00:01:00.000Z",
          scores: [{ courtNumber: 1, leftScore: 15, rightScore: 9 }],
        },
      ],
    };

    const csv = exportResultsCsv(session);

    // The joined pair string "Smith, Bob / Alice" contains a comma, so the cell must be quoted.
    expect(csv).toContain('"Smith, Bob / Alice"');
    // The clean pair stays unquoted.
    expect(csv).toContain("Carol / Dan");
    expect(csv).not.toContain('"Carol / Dan"');
  });
});
