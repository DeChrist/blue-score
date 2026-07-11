import { describe, expect, it } from "vitest";
import type { TechnicalRota } from "./rotaGenerator";
import {
  calculateRotationLowerBound,
  generateTechnicalRotas,
} from "./rotaGenerator";

const LONG_ROTA_TIMEOUT = Number(process.env["ROTA_TEST_TIMEOUT"] ?? 15000);

const cachedRotas = new Map<string, TechnicalRota[]>();

function generateCached(playerCount: number, courtCount: number): TechnicalRota[] {
  const key = `${playerCount}/${courtCount}`;
  const cached = cachedRotas.get(key);
  if (cached) return cached;
  const rotas = generateTechnicalRotas({ playerCount, courtCount, coverageMode: "sharedMatch" });
  cachedRotas.set(key, rotas);
  return rotas;
}

function playersInRota(rota: TechnicalRota): number[] {
  return [
    ...rota.courts.flatMap((court) => [
      court.leftPair[0],
      court.leftPair[1],
      court.rightPair[0],
      court.rightPair[1],
    ]),
    ...rota.sitOutPlayerIndexes,
  ];
}

function courtPlayers(rota: TechnicalRota): number[][] {
  return rota.courts.map((court) => [
    court.leftPair[0],
    court.leftPair[1],
    court.rightPair[0],
    court.rightPair[1],
  ]);
}

function pairKey(left: number, right: number): string {
  return left < right ? `${left}:${right}` : `${right}:${left}`;
}

function coveredSharedPairs(rotas: TechnicalRota[]): Set<string> {
  const covered = new Set<string>();
  rotas.forEach((rota) => {
    courtPlayers(rota).forEach((players) => {
      for (let left = 0; left < players.length; left += 1) {
        for (let right = left + 1; right < players.length; right += 1) {
          covered.add(pairKey(players[left], players[right]));
        }
      }
    });
  });
  return covered;
}

function repeatedPartnerPairCount(rotas: TechnicalRota[]): number {
  const seen = new Set<string>();
  let repeats = 0;

  rotas.forEach((rota) => {
    rota.courts.forEach((court) => {
      [court.leftPair, court.rightPair].forEach((pair) => {
        const key = pairKey(pair[0], pair[1]);
        if (seen.has(key)) repeats += 1;
        seen.add(key);
      });
    });
  });

  return repeats;
}

describe("generateTechnicalRotas", () => {
  it.each([
    [8, 2],
    [12, 2],
    [12, 3],
  ])("generates supported bounds for %i players / %i courts", (playerCount, courtCount) => {
    const rotas = generateCached(playerCount, courtCount);
    expect(rotas.length).toBeGreaterThanOrEqual(calculateRotationLowerBound(playerCount, courtCount));
    expect(rotas[0]?.rotaNumber).toBe(1);
  });

  it("generates supported bounds for 24 players / 6 courts", () => {
    const playerCount = 24;
    const courtCount = 6;
    const rotas = generateCached(playerCount, courtCount);
    expect(rotas.length).toBeGreaterThanOrEqual(calculateRotationLowerBound(playerCount, courtCount));
    expect(rotas[0]?.rotaNumber).toBe(1);
  }, LONG_ROTA_TIMEOUT);

  it("generates supported bounds for 16 players / 3 courts", () => {
    const playerCount = 16;
    const courtCount = 3;
    const rotas = generateCached(playerCount, courtCount);
    expect(rotas.length).toBeGreaterThanOrEqual(calculateRotationLowerBound(playerCount, courtCount));
    expect(rotas[0]?.rotaNumber).toBe(1);
  }, LONG_ROTA_TIMEOUT);

  it("generates supported bounds for 28 players / 6 courts", () => {
    const playerCount = 28;
    const courtCount = 6;
    const rotas = generateCached(playerCount, courtCount);
    expect(rotas.length).toBeGreaterThanOrEqual(calculateRotationLowerBound(playerCount, courtCount));
    expect(rotas[0]?.rotaNumber).toBe(1);
  }, LONG_ROTA_TIMEOUT);

  it.each([
    [7, 2],
    [13, 2],
    [8, 1],
    [28, 7],
  ])("rejects invalid bounds for %i players / %i courts", (playerCount, courtCount) => {
    expect(() => generateTechnicalRotas({ playerCount, courtCount, coverageMode: "sharedMatch" })).toThrow();
  });

  it("is deterministic for repeated calls", () => {
    expect(generateTechnicalRotas({ playerCount: 12, courtCount: 3 })).toEqual(generateTechnicalRotas({ playerCount: 12, courtCount: 3 }));
  });

  it.each([
    [8, 2],
    [12, 2],
    [12, 3],
    [16, 3],
    [24, 6],
    [28, 6],
  ])("uses every player exactly once per rotation for %i players / %i courts", (playerCount, courtCount) => {
    const rotas = generateCached(playerCount, courtCount);

    rotas.forEach((rota) => {
      const players = playersInRota(rota);
      expect(players).toHaveLength(playerCount);
      expect(new Set(players).size).toBe(playerCount);
      expect(rota.courts).toHaveLength(courtCount);
      rota.courts.forEach((court) => {
        const playersOnCourt = [
          court.leftPair[0],
          court.leftPair[1],
          court.rightPair[0],
          court.rightPair[1],
        ];
        expect(new Set(playersOnCourt).size).toBe(4);
      });
    });
  });

  it("does not sit a player out twice in a row", () => {
    const rotas = generateCached(16, 3);

    for (let rotationIndex = 1; rotationIndex < rotas.length; rotationIndex += 1) {
      const previousSitOuts = new Set(rotas[rotationIndex - 1].sitOutPlayerIndexes);
      rotas[rotationIndex].sitOutPlayerIndexes.forEach((playerIndex) => {
        expect(previousSitOuts.has(playerIndex)).toBe(false);
      });
    }
  });

  it("balances sit-outs when sit-outs exist", () => {
    const playerCount = 28;
    const rotas = generateCached(playerCount, 6);
    const counts = Array<number>(playerCount).fill(0);
    rotas.forEach((rota) => {
      rota.sitOutPlayerIndexes.forEach((playerIndex) => {
        counts[playerIndex] += 1;
      });
    });

    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });

  it.each([
    [8, 2],
    [12, 2],
    [12, 3],
    [16, 3],
    [24, 6],
    [28, 6],
  ])("covers every shared-court player pair for %i players / %i courts", (playerCount, courtCount) => {
    const rotas = generateCached(playerCount, courtCount);
    const covered = coveredSharedPairs(rotas);
    expect(covered.size).toBe((playerCount * (playerCount - 1)) / 2);
  });

  it("avoids repeated partner pairs for the stable 8 player / 2 court case", () => {
    expect(repeatedPartnerPairCount(generateCached(8, 2))).toBe(0);
  });

  it("logs performance smoke timings without enforcing brittle thresholds", () => {
    [
      [8, 2],
      [12, 2],
      [12, 3],
      [16, 3],
      [24, 6],
      [28, 6],
    ].forEach(([playerCount, courtCount]) => {
      const start = performance.now();
      const rotas = generateCached(playerCount, courtCount);
      const elapsedMs = Math.round(performance.now() - start);
      console.info(`generateTechnicalRotas ${playerCount}/${courtCount}: ${elapsedMs}ms, ${rotas.length} rotations`);
      expect(rotas.length).toBeGreaterThan(0);
    });
  });
});
