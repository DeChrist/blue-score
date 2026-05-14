import type { StandingRow } from "../types";

interface Props {
  standings: StandingRow[];
}

export function StandingsTable({ standings }: Props) {
  return (
    <section className="panel">
      <div className="section-title">
        <h2>Standings</h2>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Points</th>
              <th>Played</th>
              <th>Sat out</th>
              <th>Avg</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row) => (
              <tr key={row.playerId}>
                <td data-label="Rank">{row.rank}</td>
                <td data-label="Player">{row.displayName}</td>
                <td data-label="Points" className="numeric strong">
                  {row.totalPoints}
                </td>
                <td data-label="Played">{row.rotasPlayed}</td>
                <td data-label="Sat out">{row.rotasSatOut}</td>
                <td data-label="Avg">{row.averagePointsWhenPlaying.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
