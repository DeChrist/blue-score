import type { CourtMatch, CourtScore, Pair, Player, Rota, RotaResult, Session, ValidationResult } from "./types";

const ok = (): ValidationResult => ({ valid: true, errors: [] });
const fail = (errors: string[]): ValidationResult => ({ valid: errors.length === 0, errors });

export interface ParseImportResult<T> {
  value: T | null;
  errors: string[];
}

type UnknownRecord = Record<string, unknown>;

const parseOk = <T>(value: T): ParseImportResult<T> => ({ value, errors: [] });
const parseFail = <T>(errors: string[]): ParseImportResult<T> => ({ value: null, errors });

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredString(record: UnknownRecord, key: string, path: string, errors: string[]): string {
  const value = record[key];
  if (typeof value !== "string") {
    errors.push(`${path}.${key} must be a string.`);
    return "";
  }
  return value;
}

function readOptionalString(record: UnknownRecord, key: string, path: string, errors: string[]): string | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    errors.push(`${path}.${key} must be a string when provided.`);
    return undefined;
  }
  return value;
}

function readRequiredInteger(record: UnknownRecord, key: string, path: string, errors: string[]): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isInteger(value)) {
    errors.push(`${path}.${key} must be an integer.`);
    return 0;
  }
  return value;
}

function readStringArray(value: unknown, path: string, errors: string[]): string[] {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array of strings.`);
    return [];
  }

  const values: string[] = [];
  value.forEach((item, index) => {
    if (typeof item !== "string") {
      errors.push(`${path}[${index}] must be a string.`);
      return;
    }
    values.push(item);
  });
  return values;
}

function parsePair(value: unknown, path: string, errors: string[]): Pair | null {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object.`);
    return null;
  }

  return {
    player1Id: readRequiredString(value, "player1Id", path, errors),
    player2Id: readRequiredString(value, "player2Id", path, errors),
  };
}

function parseCourtMatch(value: unknown, path: string, errors: string[]): CourtMatch | null {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object.`);
    return null;
  }

  const leftPair = parsePair(value.leftPair, `${path}.leftPair`, errors);
  const rightPair = parsePair(value.rightPair, `${path}.rightPair`, errors);
  if (!leftPair || !rightPair) return null;

  return {
    courtNumber: readRequiredInteger(value, "courtNumber", path, errors),
    leftPair,
    rightPair,
  };
}

function parseRota(value: unknown, path: string): ParseImportResult<Rota> {
  if (!isRecord(value)) {
    return parseFail([`${path} must be an object.`]);
  }

  const errors: string[] = [];

  const rawCourts = value.courts;
  const courts: CourtMatch[] = [];
  if (!Array.isArray(rawCourts)) {
    errors.push(`${path}.courts must be an array.`);
  } else {
    rawCourts.forEach((court, index) => {
      const parsedCourt = parseCourtMatch(court, `${path}.courts[${index}]`, errors);
      if (parsedCourt) courts.push(parsedCourt);
    });
  }

  const rota: Rota = {
    rotaNumber: readRequiredInteger(value, "rotaNumber", path, errors),
    courts,
    sitOutPlayerIds: readStringArray(value.sitOutPlayerIds, `${path}.sitOutPlayerIds`, errors),
  };

  if (errors.length > 0) return parseFail(errors);
  return parseOk(rota);
}

function parseCourtScore(value: unknown, path: string, errors: string[]): CourtScore | null {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object.`);
    return null;
  }

  return {
    courtNumber: readRequiredInteger(value, "courtNumber", path, errors),
    leftScore: readRequiredInteger(value, "leftScore", path, errors),
    rightScore: readRequiredInteger(value, "rightScore", path, errors),
  };
}

function parseRotaResult(value: unknown, path: string): ParseImportResult<RotaResult> {
  if (!isRecord(value)) {
    return parseFail([`${path} must be an object.`]);
  }

  const errors: string[] = [];

  const rawScores = value.scores;
  const scores: CourtScore[] = [];
  if (!Array.isArray(rawScores)) {
    errors.push(`${path}.scores must be an array.`);
  } else {
    rawScores.forEach((score, index) => {
      const parsedScore = parseCourtScore(score, `${path}.scores[${index}]`, errors);
      if (parsedScore) scores.push(parsedScore);
    });
  }

  const result: RotaResult = {
    rotaNumber: readRequiredInteger(value, "rotaNumber", path, errors),
    scores,
    submittedAt: readRequiredString(value, "submittedAt", path, errors),
  };

  if (errors.length > 0) return parseFail(errors);
  return parseOk(result);
}

function parseRotaResults(value: unknown, path: string): ParseImportResult<RotaResult[]> {
  if (!Array.isArray(value)) {
    return parseFail([`${path} must be an array.`]);
  }

  const errors: string[] = [];
  const results: RotaResult[] = [];
  value.forEach((result, index) => {
    const parsedResult = parseRotaResult(result, `${path}[${index}]`);
    errors.push(...parsedResult.errors);
    if (parsedResult.value) results.push(parsedResult.value);
  });

  if (errors.length > 0) return parseFail(errors);
  return parseOk(results);
}

export function parseImportedPlayers(input: unknown): ParseImportResult<Player[]> {
  const errors: string[] = [];
  if (!Array.isArray(input)) {
    return parseFail(["Players JSON must be an array."]);
  }

  const players: Player[] = [];
  input.forEach((value, index) => {
    const path = `players[${index}]`;
    if (!isRecord(value)) {
      errors.push(`${path} must be an object.`);
      return;
    }

    const aliases = value.aliases === undefined ? undefined : readStringArray(value.aliases, `${path}.aliases`, errors);

    players.push({
      id: readRequiredString(value, "id", path, errors),
      displayName: readRequiredString(value, "displayName", path, errors),
      firstName: readOptionalString(value, "firstName", path, errors),
      lastName: readOptionalString(value, "lastName", path, errors),
      aliases,
    });
  });

  if (errors.length > 0) return parseFail(errors);
  return parseOk(players);
}

export function parseImportedRotas(input: unknown): ParseImportResult<Rota[]> {
  const errors: string[] = [];
  if (!Array.isArray(input)) {
    return parseFail(["Rotas JSON must be an array."]);
  }

  const rotas: Rota[] = [];
  input.forEach((rota, index) => {
    const parsedRota = parseRota(rota, `rotas[${index}]`);
    errors.push(...parsedRota.errors);
    if (parsedRota.value) rotas.push(parsedRota.value);
  });

  if (errors.length > 0) return parseFail(errors);
  return parseOk(rotas);
}

export function parseImportedSession(input: unknown): ParseImportResult<Session> {
  if (!isRecord(input)) {
    return parseFail(["Session JSON must be an object."]);
  }

  const errors: string[] = [];
  const playersResult = parseImportedPlayers(input.players);
  const rotasResult = parseImportedRotas(input.rotas);
  const resultsResult = parseRotaResults(input.results, "session.results");
  errors.push(...playersResult.errors, ...rotasResult.errors, ...resultsResult.errors);

  const session: Session = {
    id: readRequiredString(input, "id", "session", errors),
    name: readRequiredString(input, "name", "session", errors),
    createdAt: readRequiredString(input, "createdAt", "session", errors),
    pointsPerCourt: readRequiredInteger(input, "pointsPerCourt", "session", errors),
    players: playersResult.value ?? [],
    rotas: rotasResult.value ?? [],
    results: resultsResult.value ?? [],
    currentRotaNumber: readRequiredInteger(input, "currentRotaNumber", "session", errors),
  };

  if (errors.length > 0) return parseFail(errors);
  return parseOk(session);
}

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

export function validateRotaResult(
  result: RotaResult,
  session: Pick<Session, "rotas" | "pointsPerCourt">,
): ValidationResult {
  const errors: string[] = [];
  const rota = session.rotas.find((item) => item.rotaNumber === result.rotaNumber);

  if (!rota) {
    return fail([`Result for rota ${result.rotaNumber} references an unknown rota.`]);
  }

  const expectedCourtNumbers = new Set(rota.courts.map((court) => court.courtNumber));
  const actualCourtNumbers = new Set<number>();

  result.scores.forEach((score) => {
    if (actualCourtNumbers.has(score.courtNumber)) {
      errors.push(`Result for rota ${result.rotaNumber} has duplicate score for court ${score.courtNumber}.`);
    }
    actualCourtNumbers.add(score.courtNumber);

    if (!expectedCourtNumbers.has(score.courtNumber)) {
      errors.push(`Result for rota ${result.rotaNumber} references unknown court ${score.courtNumber}.`);
    }

    errors.push(...validateCourtScore(score, session.pointsPerCourt).errors);
  });

  rota.courts.forEach((court) => {
    if (!actualCourtNumbers.has(court.courtNumber)) {
      errors.push(`Result for rota ${result.rotaNumber} is missing score for court ${court.courtNumber}.`);
    }
  });

  return fail(errors);
}

export function validateSessionResults(
  session: Pick<Session, "rotas" | "results" | "pointsPerCourt">,
): ValidationResult {
  const errors: string[] = [];
  const seenRotaNumbers = new Set<number>();

  session.results.forEach((result) => {
    if (seenRotaNumbers.has(result.rotaNumber)) {
      errors.push(`Session has duplicate result for rota ${result.rotaNumber}.`);
    }
    seenRotaNumbers.add(result.rotaNumber);
    errors.push(...validateRotaResult(result, session).errors);
  });

  return fail(errors);
}

export function validateSessionSetup(session: Pick<Session, "name" | "players" | "rotas" | "pointsPerCourt">, courts: number): ValidationResult {
  const errors: string[] = [];
  const minPlayers = courts * 4;
  const maxPlayers = minPlayers + 4;
  if (!session.name.trim()) errors.push("Session name is required.");
  if (!Number.isInteger(session.pointsPerCourt) || session.pointsPerCourt <= 0) errors.push("Points per court must be a positive integer.");
  if (session.players.length < minPlayers || session.players.length > maxPlayers) {
    errors.push(`Americano setup expects between ${minPlayers} and ${maxPlayers} players for ${courts} courts.`);
  }
  return combineValidation([fail(errors), validatePlayers(session.players), validateRotas(session.rotas, session.players, courts)]);
}

export { ok };
