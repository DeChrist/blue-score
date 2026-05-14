import type { Session } from "../types";

interface Props {
  session: Session;
  onSelectRota: (rotaNumber: number) => void;
}

export function SessionHistory({ session, onSelectRota }: Props) {
  const playerName = (id: string) => session.players.find((player) => player.id === id)?.displayName ?? id;

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
                      <span>Court {score.courtNumber}</span>
                      <span>
                        {court
                          ? `${playerName(court.leftPair.player1Id)} / ${playerName(court.leftPair.player2Id)}`
                          : "Left pair"}{" "}
                        <strong>{score.leftScore}</strong>
                      </span>
                      <span>
                        {court
                          ? `${playerName(court.rightPair.player1Id)} / ${playerName(court.rightPair.player2Id)}`
                          : "Right pair"}{" "}
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
