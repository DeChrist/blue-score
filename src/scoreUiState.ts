import { isRotaAccessible } from "./sessionPhase";
import type { Court, CourtMatch, CourtScore, Rota, RotaResult } from "./types";

export type LeadingSide = "left" | "right" | null;
export type ScoreSide = "leftScore" | "rightScore";

export function getDefaultCourtScore(courtNumber: number, pointsPerCourt: number): CourtScore {
  const leftScore = Math.floor(pointsPerCourt / 2);
  return {
    courtNumber,
    leftScore,
    rightScore: pointsPerCourt - leftScore,
  };
}

export function findCourtScore(
  scores: readonly CourtScore[],
  courtNumber: number,
  pointsPerCourt: number,
): CourtScore {
  return scores.find((item) => item.courtNumber === courtNumber) ?? getDefaultCourtScore(courtNumber, pointsPerCourt);
}

export function isCourtRecorded(
  courtNumber: number,
  touchedCourtNumbers: ReadonlySet<number>,
  isSubmitted: boolean,
): boolean {
  return isSubmitted || touchedCourtNumbers.has(courtNumber);
}

export function getRecordedCourtCount(
  courts: readonly CourtMatch[],
  touchedCourtNumbers: ReadonlySet<number>,
  isSubmitted: boolean,
): number {
  return courts.filter((court) => isCourtRecorded(court.courtNumber, touchedCourtNumbers, isSubmitted)).length;
}

export function getPendingCourts(
  courts: readonly CourtMatch[],
  touchedCourtNumbers: ReadonlySet<number>,
  isSubmitted: boolean,
): CourtMatch[] {
  if (isSubmitted) return [];
  return courts.filter((court) => !isCourtRecorded(court.courtNumber, touchedCourtNumbers, false));
}

export function canSubmitRota(
  courts: readonly CourtMatch[],
  touchedCourtNumbers: ReadonlySet<number>,
  isSubmitted: boolean,
): boolean {
  return !isSubmitted && courts.length > 0 && getRecordedCourtCount(courts, touchedCourtNumbers, false) === courts.length;
}

export function getLeadingSide(score: CourtScore): LeadingSide {
  if (score.leftScore > score.rightScore) return "left";
  if (score.rightScore > score.leftScore) return "right";
  return null;
}

export function getCourtName(courtNumber: number, courts: readonly Court[]): string {
  return courts[courtNumber - 1]?.name.trim() ?? "";
}

export function formatPendingCourtDetail(courts: readonly CourtMatch[], clubCourts: readonly Court[]): string {
  if (courts.length === 0) return "";
  const labels = courts.map((court) => getCourtName(court.courtNumber, clubCourts) || `Court ${court.courtNumber}`);
  return `${labels.join(", ")} still pending`;
}

export function findNextOpenRota(
  rotas: Rota[],
  results: RotaResult[],
): Rota | undefined {
  return rotas.find(
    (rota) =>
      !results.some((stored) => stored.rotaNumber === rota.rotaNumber) &&
      isRotaAccessible(rota, rotas, results),
  );
}
