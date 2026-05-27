export interface Player {
  id: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  aliases?: string[];
}

export interface Pair {
  player1Id: string;
  player2Id: string;
}

export interface CourtMatch {
  courtNumber: number;
  leftPair: Pair;
  rightPair: Pair;
}

export interface Court {
  name: string;
}

export interface Club {
  name: string;
  logoSvg: string;
  courts: Court[];
  websiteUrl: string;
}

export interface Rota {
  rotaNumber: number;
  courts: CourtMatch[];
  sitOutPlayerIds: string[];
}

export interface CourtScore {
  courtNumber: number;
  leftScore: number;
  rightScore: number;
}

export interface RotaResult {
  rotaNumber: number;
  scores: CourtScore[];
  submittedAt: string;
}

export interface Session {
  id: string;
  name: string;
  createdAt: string;
  pointsPerCourt: number;
  courtCount: number;
  players: Player[];
  rotas: Rota[];
  results: RotaResult[];
  currentRotaNumber: number;
}

export interface StandingRow {
  playerId: string;
  displayName: string;
  rank: number;
  totalPoints: number;
  rotasPlayed: number;
  rotasSatOut: number;
  averagePointsWhenPlaying: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface RotaProvider {
  getRotas(input: GetRotasInput): Promise<Rota[]>;
}

export interface GetRotasInput {
  players: Player[];
  courts: number;
  pointsPerCourt: number;
  sessionConfig?: Record<string, unknown>;
}
