import { describe, expect, it } from "vitest";
import type { Rota, RotaResult, Session } from "./types";
import { deriveSessionPhase, isRotaAccessible } from "./sessionPhase";

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: "s1",
    name: "Test",
    createdAt: "2026-05-16T10:00:00.000Z",
    pointsPerCourt: 24,
    courtCount: 3,
    players: [],
    rotas: [],
    results: [],
    currentRotaNumber: 1,
    ...overrides,
  };
}

function makeRota(rotaNumber: number): Rota {
  return { rotaNumber, courts: [], sitOutPlayerIds: [] };
}

function makeResult(rotaNumber: number): RotaResult {
  return { rotaNumber, scores: [], submittedAt: "2026-05-16T10:05:00.000Z" };
}

describe("deriveSessionPhase", () => {
  it("returns setup when rotas is empty", () => {
    expect(deriveSessionPhase(makeSession({ rotas: [] }))).toBe("setup");
  });

  it("returns scoring when some results are missing", () => {
    const rotas = [makeRota(1), makeRota(2), makeRota(3)];
    const results = [makeResult(1)];
    expect(deriveSessionPhase(makeSession({ rotas, results }))).toBe("scoring");
  });

  it("returns complete when all results match rotas", () => {
    const rotas = [makeRota(1), makeRota(2)];
    const results = [makeResult(1), makeResult(2)];
    expect(deriveSessionPhase(makeSession({ rotas, results }))).toBe("complete");
  });

  it("returns complete when results count exceeds rotas count (corrupt but >= wins)", () => {
    const rotas = [makeRota(1)];
    const results = [makeResult(1), makeResult(2)];
    expect(deriveSessionPhase(makeSession({ rotas, results }))).toBe("complete");
  });

  it("returns setup when rotas empty even if results are present (corrupt → rotas authoritative)", () => {
    const results = [makeResult(1)];
    expect(deriveSessionPhase(makeSession({ rotas: [], results }))).toBe("setup");
  });
});

describe("isRotaAccessible", () => {
  it("submitted rota is always accessible", () => {
    const rotas = [makeRota(1), makeRota(2), makeRota(3)];
    const results = [makeResult(1)];
    expect(isRotaAccessible(rotas[0], rotas, results)).toBe(true);
  });

  it("first unsubmitted rota in array is accessible", () => {
    const rotas = [makeRota(1), makeRota(2), makeRota(3)];
    const results = [makeResult(1)];
    expect(isRotaAccessible(rotas[1], rotas, results)).toBe(true);
  });

  it("second unsubmitted rota in array is locked", () => {
    const rotas = [makeRota(1), makeRota(2), makeRota(3)];
    const results = [makeResult(1)];
    expect(isRotaAccessible(rotas[2], rotas, results)).toBe(false);
  });

  it("non-consecutive identifiers: after submitting first, only second in array is accessible", () => {
    const rotas = [makeRota(5), makeRota(3), makeRota(1)];
    const results = [makeResult(5)];
    expect(isRotaAccessible(rotas[0], rotas, results)).toBe(true); // submitted
    expect(isRotaAccessible(rotas[1], rotas, results)).toBe(true);  // first unsubmitted
    expect(isRotaAccessible(rotas[2], rotas, results)).toBe(false); // locked
  });

  it("non-ascending identifiers: array order governs, not rotaNumber value", () => {
    const rotas = [makeRota(5), makeRota(3), makeRota(1)];
    const results: RotaResult[] = [];
    expect(isRotaAccessible(rotas[0], rotas, results)).toBe(true);  // first in array, no results
    expect(isRotaAccessible(rotas[1], rotas, results)).toBe(false); // locked
    expect(isRotaAccessible(rotas[2], rotas, results)).toBe(false); // locked
  });

  it("complete phase: all submitted, all rotas accessible", () => {
    const rotas = [makeRota(1), makeRota(2), makeRota(3)];
    const results = [makeResult(1), makeResult(2), makeResult(3)];
    rotas.forEach((rota) => {
      expect(isRotaAccessible(rota, rotas, results)).toBe(true);
    });
  });

  it("empty results: only first rota in array is accessible", () => {
    const rotas = [makeRota(1), makeRota(2), makeRota(3)];
    expect(isRotaAccessible(rotas[0], rotas, [])).toBe(true);
    expect(isRotaAccessible(rotas[1], rotas, [])).toBe(false);
    expect(isRotaAccessible(rotas[2], rotas, [])).toBe(false);
  });
});
