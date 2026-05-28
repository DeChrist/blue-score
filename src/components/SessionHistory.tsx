import { activeClub, formatCourtTitle } from "../club";
import { formatPair, makePlayerNameLookup } from "../playerLookup";
import type { Session } from "../types";

interface Props {
  readonly session: Session;
  readonly onSelectRota: (rotaNumber: number) => void;
}

export function SessionHistory({ session, onSelectRota }: Props) {
  const playerName = makePlayerNameLookup(session.players);

  return (
    <section className="panel">
      <div className="section-title">
        <h2>History</h2>
        <span>{session.results.length} submitted</span>
      </div>
      {session.results.length === 0 ? (
        <p className="muted">Submitted rotas will appear here.</p>
      ) : (
        <div className="history-list">
          {session.results.map((result) => {
            const rota = session.rotas.find((item) => item.rotaNumber === result.rotaNumber);
            return (
              <article className="history-item" key={result.rotaNumber}>
                <div className="history-head">
                  <strong>Rota {result.rotaNumber}</strong>
                  <button className="ghost" type="button" onClick={() => onSelectRota(result.rotaNumber)}>
                    Review / edit
                  </button>
                </div>
                {result.scores.map((score) => {
                  const court = rota?.courts.find((item) => item.courtNumber === score.courtNumber);
                  return (
                    <div className="history-score" key={score.courtNumber}>
                      <span>{formatCourtTitle(score.courtNumber, activeClub.courts)}</span>
                      <span>
                        {court ? formatPair(playerName, court.leftPair) : "Left pair"}{" "}
                        <strong>{score.leftScore}</strong>
                      </span>
                      <span>
                        {court ? formatPair(playerName, court.rightPair) : "Right pair"}{" "}
                        <strong>{score.rightScore}</strong>
                      </span>
                    </div>
                  );
                })}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
