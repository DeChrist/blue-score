import type { GetRotasInput, Rota, RotaProvider } from "./types";
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

export class PlaceholderGeneratedRotaProvider implements RotaProvider {
  async getRotas(): Promise<Rota[]> {
    // TODO: delegate rota generation to a separate prompt/module instead of implementing balancing here.
    throw new Error("Generated rota provider is not implemented. Import precomputed rotas for this version.");
  }
}
