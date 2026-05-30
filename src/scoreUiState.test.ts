import { describe, expect, it } from "vitest";
import {
  canSubmitRota,
  findCourtScore,
  findNextOpenRota,
  formatPendingCourtDetail,
  getLeadingSide,
  getPendingCourts,
  getRecordedCourtCount,
  isCourtRecorded,
} from "./scoreUiState";
import type { CourtMatch, Rota, RotaResult } from "./types";

const courts: CourtMatch[] = [
  {
    courtNumber: 1,
    leftPair: { player1Id: "p1", player2Id: "p2" },
    rightPair: { player1Id: "p3", player2Id: "p4" },
  },
  {
    courtNumber: 2,
    leftPair: { player1Id: "p5", player2Id: "p6" },
    rightPair: { player1Id: "p7", player2Id: "p8" },
  },
  {
    courtNumber: 3,
    leftPair: { player1Id: "p9", player2Id: "p10" },
    rightPair: { player1Id: "p11", player2Id: "p12" },
  },
];

const rotas: Rota[] = [
  { rotaNumber: 1, courts, sitOutPlayerIds: [] },
  { rotaNumber: 2, courts, sitOutPlayerIds: [] },
  { rotaNumber: 3, courts, sitOutPlayerIds: [] },
];

function resultFor(rotaNumber: number): RotaResult {
  return {
    rotaNumber,
    submittedAt: `2026-01-01T00:0${rotaNumber}:00.000Z`,
    scores: courts.map((court) => ({
      courtNumber: court.courtNumber,
      leftScore: 13,
      rightScore: 11,
    })),
  };
}

describe("score UI state", () => {
  it("falls back to a balanced default score for untracked courts", () => {
    expect(findCourtScore([], 2, 24)).toEqual({ courtNumber: 2, leftScore: 12, rightScore: 12 });
    expect(findCourtScore([], 2, 25)).toEqual({ courtNumber: 2, leftScore: 12, rightScore: 13 });
  });

  it("uses touched state, not score equality, to decide whether a court is recorded", () => {
    const touched = new Set([1]);
    const untappedTwelveAll = { courtNumber: 1, leftScore: 12, rightScore: 12 };

    expect(getLeadingSide(untappedTwelveAll)).toBeNull();
    expect(isCourtRecorded(1, touched, false)).toBe(true);
    expect(isCourtRecorded(2, touched, false)).toBe(false);
  });

  it("treats all courts as recorded when reviewing a submitted rota", () => {
    const touched = new Set<number>();

    expect(getRecordedCourtCount(courts, touched, true)).toBe(3);
    expect(getPendingCourts(courts, touched, true)).toEqual([]);
    expect(canSubmitRota(courts, touched, true)).toBe(false);
  });

  it("counts pending and recorded courts from the touched set for open rotas", () => {
    const touched = new Set([1, 3]);

    expect(getRecordedCourtCount(courts, touched, false)).toBe(2);
    expect(getPendingCourts(courts, touched, false).map((court) => court.courtNumber)).toEqual([2]);
    expect(canSubmitRota(courts, touched, false)).toBe(false);
    expect(canSubmitRota(courts, new Set([1, 2, 3]), false)).toBe(true);
  });

  it("formats pending court detail with configured names where available", () => {
    expect(formatPendingCourtDetail([courts[0], courts[1]], [{ name: "Center" }, { name: "Back Court" }]))
      .toBe("Center, Back Court still pending");
    expect(formatPendingCourtDetail([courts[2]], [{ name: "Center" }, { name: "" }, { name: "" }]))
      .toBe("Court 3 still pending");
    expect(formatPendingCourtDetail([], [])).toBe("");
  });

  it("finds the next sequential open rota after submit", () => {
    expect(findNextOpenRota(rotas, [])?.rotaNumber).toBe(1);
    expect(findNextOpenRota(rotas, [resultFor(1)])?.rotaNumber).toBe(2);
    expect(findNextOpenRota(rotas, [resultFor(1), resultFor(2), resultFor(3)])).toBeUndefined();
  });

  it("detects the leading side from the coupled score", () => {
    expect(getLeadingSide({ courtNumber: 1, leftScore: 14, rightScore: 10 })).toBe("left");
    expect(getLeadingSide({ courtNumber: 1, leftScore: 9, rightScore: 15 })).toBe("right");
    expect(getLeadingSide({ courtNumber: 1, leftScore: 12, rightScore: 12 })).toBeNull();
  });
});
