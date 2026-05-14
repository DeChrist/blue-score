import type { CourtScore, Player, Rota, Session, ValidationResult } from "./types";

const ok = (): ValidationResult => ({ valid: true, errors: [] });
const fail = (errors: string[]): ValidationResult => ({ valid: errors.length === 0, errors });

export function combineValidation(results: ValidationResult[]): ValidationResult {
  return fail(results.flatMap((result) => result.errors));
}

export function validatePlayers(players: Player[]): ValidationResult {
  const errors: string[] = [];
  const seen = new Set<string>();

  players.forEach((player, index) => {
    if (!player.id.trim()) errors.push(`Player ${index + 1} needs an id.`);
    if (!player.displayName.trim()) errors.push(`Player ${player.id || index + 1} needs a display name.`);
    if (seen.has(player.id)) errors.push(`Duplicate player id: ${player.id}.`);
    seen.add(player.id);
  });

  return fail(errors);
}

export function validateCourtScore(score: CourtScore, pointsPerCourt: number): ValidationResult {
  const errors: string[] = [];
  if (!Number.isInteger(score.leftScore)) errors.push(`Court ${score.courtNumber}: left score must be an integer.`);
  if (!Number.isInteger(score.rightScore)) errors.push(`Court ${score.courtNumber}: right score must be an integer.`);
  if (score.leftScore < 0) errors.push(`Court ${score.courtNumber}: left score cannot be negative.`);
  if (score.rightScore < 0) errors.push(`Court ${score.courtNumber}: right score cannot be negative.`);
  if (Number.isInteger(score.leftScore) && Number.isInteger(score.rightScore) && score.leftScore + score.rightScore !== pointsPerCourt) {
    errors.push(`Court ${score.courtNumber}: scores must total ${pointsPerCourt}.`);
  }
  return fail(errors);
}

export function validateRota(rota: Rota, players: Player[], courts: number): ValidationResult {
  const errors: string[] = [];
  const knownPlayerIds = new Set(players.map((player) => player.id));
  const activeIds: string[] = [];

  if (rota.courts.length !== courts) {
    errors.push(`Rota ${rota.rotaNumber} must contain exactly ${courts} courts.`);
  }

  rota.courts.forEach((court) => {
    const ids = [
      court.leftPair?.player1Id,
      court.leftPair?.player2Id,
      court.rightPair?.player1Id,
      court.rightPair?.player2Id,
    ];

    if (ids.some((id) => !id || typeof id !== "string")) {
      errors.push(`Rota ${rota.rotaNumber}, court ${court.courtNumber} must have two players per side.`);
    }

    ids.forEach((id) => {
      if (typeof id !== "string") return;
      activeIds.push(id);
      if (!knownPlayerIds.has(id)) {
        errors.push(`Rota ${rota.rotaNumber}, court ${court.courtNumber} references unknown player id: ${id}.`);
      }
    });
  });

  if (activeIds.length !== courts * 4) {
    errors.push(`Rota ${rota.rotaNumber} must have exactly ${courts * 4} active player slots.`);
  }

  const activeSet = new Set<string>();
  activeIds.forEach((id) => {
    if (activeSet.has(id)) errors.push(`Rota ${rota.rotaNumber} uses player ${id} more than once.`);
    activeSet.add(id);
  });

  rota.sitOutPlayerIds.forEach((id) => {
    if (!knownPlayerIds.has(id)) errors.push(`Rota ${rota.rotaNumber} references unknown sit-out player id: ${id}.`);
  });

  const expectedSitOuts = players.map((player) => player.id).filter((id) => !activeSet.has(id)).sort();
  const actualSitOuts = [...rota.sitOutPlayerIds].sort();
  if (expectedSitOuts.join("|") !== actualSitOuts.join("|")) {
    errors.push(`Rota ${rota.rotaNumber} sit-outs must exactly match players not active in that rota.`);
  }

  return fail(errors);
}

export function validateRotas(rotas: Rota[], players: Player[], courts: number): ValidationResult {
  if (rotas.length === 0) return fail(["Import at least one rota before scoring."]);
  return combineValidation(rotas.map((rota) => validateRota(rota, players, courts)));
}

export function validateSessionSetup(session: Pick<Session, "name" | "players" | "rotas" | "pointsPerCourt">, courts: number): ValidationResult {
  const errors: string[] = [];
  if (!session.name.trim()) errors.push("Session name is required.");
  if (!Number.isInteger(session.pointsPerCourt) || session.pointsPerCourt <= 0) errors.push("Points per court must be a positive integer.");
  if (session.players.length !== 16) errors.push("Default Americano setup expects exactly 16 players.");
  return combineValidation([fail(errors), validatePlayers(session.players), validateRotas(session.rotas, session.players, courts)]);
}

export { ok };
