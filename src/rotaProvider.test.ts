import { describe, expect, it } from "vitest";
import { GeneratedRotaProvider, StaticRotaProvider } from "./rotaProvider";
import type { GetRotasInput, Player, Rota } from "./types";
import { validateRotas } from "./validation";

function makePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `player-${index + 1}`,
    displayName: `Player ${index + 1}`,
  }));
}

function makeInput(playerCount = 12, courts = 3): GetRotasInput {
  return {
    players: makePlayers(playerCount),
    courts,
    pointsPerCourt: 24,
  };
}

function allRotaPlayerIds(rotas: Rota[]): Set<string> {
  const ids = new Set<string>();
  rotas.forEach((rota) => {
    rota.courts.forEach((court) => {
      ids.add(court.leftPair.player1Id);
      ids.add(court.leftPair.player2Id);
      ids.add(court.rightPair.player1Id);
      ids.add(court.rightPair.player2Id);
    });
    rota.sitOutPlayerIds.forEach((id) => ids.add(id));
  });
  return ids;
}

describe("GeneratedRotaProvider", () => {
  it("returns domain rotas that pass validation", async () => {
    const input = makeInput();
    const rotas = await new GeneratedRotaProvider().getRotas(input);

    expect(rotas.length).toBeGreaterThan(0);
    expect(validateRotas(rotas, input.players, input.courts).valid).toBe(true);
  });

  it("preserves domain player ids", async () => {
    const input = makeInput();
    const rotas = await new GeneratedRotaProvider().getRotas(input);
    const generatedIds = allRotaPlayerIds(rotas);

    input.players.forEach((player) => {
      expect(generatedIds.has(player.id)).toBe(true);
    });
  });

});

describe("StaticRotaProvider", () => {
  it("keeps static import behavior unchanged", async () => {
    const input = makeInput(8, 2);
    const importedRotas: Rota[] = [
      {
        rotaNumber: 1,
        courts: [
          { courtNumber: 1, leftPair: { player1Id: "player-1", player2Id: "player-2" }, rightPair: { player1Id: "player-3", player2Id: "player-4" } },
          { courtNumber: 2, leftPair: { player1Id: "player-5", player2Id: "player-6" }, rightPair: { player1Id: "player-7", player2Id: "player-8" } },
        ],
        sitOutPlayerIds: [],
      },
    ];

    await expect(new StaticRotaProvider(importedRotas).getRotas(input)).resolves.toEqual(importedRotas);
  });
});
