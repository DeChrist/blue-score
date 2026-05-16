import type { CourtScore, RotaResult, Session, StandingRow } from "./types";

function playersForPair(pair: { player1Id: string; player2Id: string }): string[] {
  return [pair.player1Id, pair.player2Id];
}

/**
 * Initialize court scores for a rota with balanced defaults based on pointsPerCourt.
 * Each court starts at floor(pointsPerCourt / 2) for left, remainder for right.
 */
export function initializeCourtScores(
  courts: { courtNumber: number }[],
  pointsPerCourt: number,
): CourtScore[] {
  const leftStart = Math.floor(pointsPerCourt / 2);
  return courts.map((court) => ({
    courtNumber: court.courtNumber,
    leftScore: leftStart,
    rightScore: pointsPerCourt - leftStart,
  }));
}

/**
 * Update a court score in an array, creating the entry if missing.
 * Ensures leftScore + rightScore = pointsPerCourt by mirroring the opposite side.
 * Returns a new sorted array (by courtNumber).
 */
export function updateCourtScore(
  scores: CourtScore[],
  courtNumber: number,
  side: "leftScore" | "rightScore",
  value: number,
  pointsPerCourt: number,
): CourtScore[] {
  const clamped = Math.max(0, Math.min(pointsPerCourt, value));
  const rightScore = side === "rightScore" ? clamped : pointsPerCourt - clamped;
  const leftScore = side === "leftScore" ? clamped : pointsPerCourt - clamped;

  const index = scores.findIndex((score) => score.courtNumber === courtNumber);
  if (index === -1) {
    return [
      ...scores,
      { courtNumber, leftScore, rightScore },
    ].sort((a, b) => a.courtNumber - b.courtNumber);
  }

  return scores.map((score) =>
    score.courtNumber === courtNumber ? { ...score, leftScore, rightScore } : score,
  );
}

export function applyOrReplaceRotaResult(session: Session, result: RotaResult): Session {
  const results = session.results.filter((existing) => existing.rotaNumber !== result.rotaNumber);
  results.push(result);
  results.sort((a, b) => a.rotaNumber - b.rotaNumber);

  const nextUnsubmitted = session.rotas.find((rota) => !results.some((stored) => stored.rotaNumber === rota.rotaNumber));

  return {
    ...session,
    results,
    currentRotaNumber: nextUnsubmitted?.rotaNumber ?? result.rotaNumber,
  };
}

export function calculateStandings(session: Session): StandingRow[] {
  const rows = new Map<string, Omit<StandingRow, "rank">>();

  session.players.forEach((player) => {
    rows.set(player.id, {
      playerId: player.id,
      displayName: player.displayName,
      totalPoints: 0,
      rotasPlayed: 0,
      rotasSatOut: 0,
      averagePointsWhenPlaying: 0,
    });
  });

  session.results.forEach((result) => {
    const rota = session.rotas.find((item) => item.rotaNumber === result.rotaNumber);
    if (!rota) return;

    const playedThisRota = new Set<string>();

    result.scores.forEach((score) => {
      const court = rota.courts.find((item) => item.courtNumber === score.courtNumber);
      if (!court) return;

      playersForPair(court.leftPair).forEach((playerId) => {
        const row = rows.get(playerId);
        if (!row) return;
        row.totalPoints += score.leftScore;
        playedThisRota.add(playerId);
      });

      playersForPair(court.rightPair).forEach((playerId) => {
        const row = rows.get(playerId);
        if (!row) return;
        row.totalPoints += score.rightScore;
        playedThisRota.add(playerId);
      });
    });

    playedThisRota.forEach((playerId) => {
      const row = rows.get(playerId);
      if (row) row.rotasPlayed += 1;
    });

    rota.sitOutPlayerIds.forEach((playerId) => {
      const row = rows.get(playerId);
      if (row) row.rotasSatOut += 1;
    });
  });

  const sorted = [...rows.values()]
    .map((row) => ({
      ...row,
      averagePointsWhenPlaying: row.rotasPlayed === 0 ? 0 : row.totalPoints / row.rotasPlayed,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints || a.displayName.localeCompare(b.displayName));

  let lastPoints: number | undefined;
  let lastRank = 0;

  return sorted.map((row, index) => {
    if (row.totalPoints !== lastPoints) {
      lastRank = index + 1;
      lastPoints = row.totalPoints;
    }
    return { ...row, rank: lastRank };
  });
}
