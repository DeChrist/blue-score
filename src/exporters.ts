import { formatPair, makePlayerNameLookup } from "./playerLookup";
import { calculateStandings } from "./scoring";
import type { Session, StandingRow } from "./types";

function csvValue(value: string | number): string {
  const raw = String(value);
  return /[",\n]/.test(raw) ? `"${raw.replaceAll('"', '""')}"` : raw;
}

function line(values: Array<string | number>): string {
  return values.map(csvValue).join(",");
}

export function exportStandingsCsv(standings: StandingRow[]): string {
  return [
    line(["Rank", "Player", "Total points", "Rotas played", "Rotas sat out", "Average points per rota played"]),
    ...standings.map((row) =>
      line([
        row.rank,
        row.displayName,
        row.totalPoints,
        row.rotasPlayed,
        row.rotasSatOut,
        row.averagePointsWhenPlaying.toFixed(2),
      ]),
    ),
  ].join("\n");
}

export function exportResultsCsv(session: Session): string {
  const playerName = makePlayerNameLookup(session.players);
  const rows = [line(["Rota", "Court", "Left pair", "Left score", "Right pair", "Right score"])];

  session.results.forEach((result) => {
    const rota = session.rotas.find((item) => item.rotaNumber === result.rotaNumber);
    if (!rota) return;

    result.scores.forEach((score) => {
      const court = rota.courts.find((item) => item.courtNumber === score.courtNumber);
      if (!court) return;
      rows.push(
        line([
          result.rotaNumber,
          score.courtNumber,
          formatPair(playerName, court.leftPair),
          score.leftScore,
          formatPair(playerName, court.rightPair),
          score.rightScore,
        ]),
      );
    });
  });

  rows.push("");
  rows.push(line(["Final standings"]));
  rows.push(exportStandingsCsv(calculateStandings(session)));
  return rows.join("\n");
}
