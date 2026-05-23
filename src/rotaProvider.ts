import type { GetRotasInput, Rota, RotaProvider } from "./types";
import { generateTechnicalRotas, mapTechnicalRotasToDomainRotas } from "./rotaGenerator";
import { validateRotas } from "./validation";

export class StaticRotaProvider implements RotaProvider {
  constructor(private readonly importedRotas: unknown) {}

  async getRotas(input: GetRotasInput): Promise<Rota[]> {
    if (!Array.isArray(this.importedRotas)) {
      throw new Error("Imported rotas JSON must be an array.");
    }

    const rotas = this.importedRotas as Rota[];
    const validation = validateRotas(rotas, input.players, input.courts);
    if (!validation.valid) {
      throw new Error(validation.errors.join("\n"));
    }
    return rotas;
  }
}

export class GeneratedRotaProvider implements RotaProvider {
  async getRotas(input: GetRotasInput): Promise<Rota[]> {
    const technicalRotas = generateTechnicalRotas({
      playerCount: input.players.length,
      courtCount: input.courts,
      coverageMode: "sharedMatch",
    });
    const rotas = mapTechnicalRotasToDomainRotas(technicalRotas, input.players);
    const validation = validateRotas(rotas, input.players, input.courts);
    if (!validation.valid) {
      throw new Error(validation.errors.join("\n"));
    }
    return rotas;
  }
}
