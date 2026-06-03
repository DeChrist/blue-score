import { useMemo, useState } from "react";
import type { StandingRow } from "../types";
import { sortStandings, type SortKey } from "../standingsSort";

interface Props {
  readonly standings: StandingRow[];
}

const SORT_OPTIONS: ReadonlyArray<{ key: SortKey; label: string }> = [
  { key: "points", label: "Points" },
  { key: "avg", label: "Avg" },
  { key: "name", label: "Name" },
];

export function StandingsTable({ standings }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("points");
  const sorted = useMemo(() => sortStandings(standings, sortKey), [standings, sortKey]);

  if (standings.length === 0) {
    return (
      <section className="panel empty-state">
        <h2>No standings yet</h2>
        <p className="muted">Submit a rota to see results.</p>
      </section>
    );
  }

  return (
    <section className="panel standings-panel">
      <div className="section-title">
        <h2>Standings</h2>
        <div className="standings-sort" role="group" aria-label="Sort standings">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={option.key === sortKey ? "is-selected" : undefined}
              aria-pressed={option.key === sortKey}
              onClick={() => setSortKey(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Phone/tablet: native list (Rank · Name · Points). */}
      <ol className="standings-list" aria-label="Standings list">
        {sorted.map((row) => (
          <li key={row.playerId} className="standings-row">
            <span className="standings-row__rank">{row.rank}</span>
            <span className="standings-row__player">{row.displayName}</span>
            <span className="standings-row__points">{row.totalPoints}</span>
          </li>
        ))}
      </ol>

      {/* Desktop: full table. */}
      <div className="table-wrap">
        <table className="standings-table" aria-label="Standings table">
          <thead>
            <tr>
              <th scope="col">Rank</th>
              <th scope="col">Player</th>
              <th scope="col">Points</th>
              <th scope="col">Played</th>
              <th scope="col">Sat out</th>
              <th scope="col">Avg</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.playerId}>
                <th scope="row" data-label="Rank">
                  {row.rank}
                </th>
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
