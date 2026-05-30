import type { Rota, RotaResult, Session } from "./types";

export type SessionPhase = "setup" | "scoring" | "complete";

export function deriveSessionPhase(session: Session): SessionPhase {
  if (session.rotas.length === 0) return "setup";
  if (session.results.length >= session.rotas.length) return "complete";
  return "scoring";
}

export function isRotaAccessible(rota: Rota, allRotas: readonly Rota[], results: readonly RotaResult[]): boolean {
  const isSubmitted = results.some((r) => r.rotaNumber === rota.rotaNumber);
  if (isSubmitted) return true;
  const firstUnsubmittedIndex = allRotas.findIndex(
    (r) => !results.some((res) => res.rotaNumber === r.rotaNumber),
  );
  const thisIndex = allRotas.findIndex((r) => r.rotaNumber === rota.rotaNumber);
  if (thisIndex === -1) return false;
  return firstUnsubmittedIndex !== -1 && thisIndex <= firstUnsubmittedIndex;
}
