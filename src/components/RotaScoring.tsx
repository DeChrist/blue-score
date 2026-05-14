import { useEffect, useState } from "react";
import { Check, Edit3 } from "lucide-react";
import { applyOrReplaceRotaResult } from "../scoring";
import type { CourtScore, RotaResult, Session } from "../types";
import { combineValidation, validateCourtScore } from "../validation";

interface Props {
  session: Session;
  selectedRotaNumber: number;
  onSessionChange: (session: Session) => void;
}

export function RotaScoring({ session, selectedRotaNumber, onSessionChange }: Props) {
  const rota = session.rotas.find((item) => item.rotaNumber === selectedRotaNumber) ?? session.rotas[0];
  const existingResult = session.results.find((result) => result.rotaNumber === rota?.rotaNumber);
  const playerName = (id: string) => session.players.find((player) => player.id === id)?.displayName ?? id;
  const [scores, setScores] = useState<CourtScore[]>(() =>
    existingResult?.scores ??
    rota?.courts.map((court) => ({ courtNumber: court.courtNumber, leftScore: 12, rightScore: 12 })) ??
    [],
  );

  useEffect(() => {
    setScores(
      existingResult?.scores ??
        rota?.courts.map((court) => ({ courtNumber: court.courtNumber, leftScore: 12, rightScore: 12 })) ??
        [],
    );
  }, [existingResult, rota]);

  if (!rota) {
    return (
      <section className="panel hero-panel">
        <h2>No rota loaded</h2>
        <p>Import rotas in setup before scoring.</p>
      </section>
    );
  }

  const validation = combineValidation(scores.map((score) => validateCourtScore(score, session.pointsPerCourt)));
  const isSubmitted = Boolean(existingResult);

  function updateScore(courtNumber: number, side: "leftScore" | "rightScore", value: string) {
    const parsed = value === "" ? Number.NaN : Number(value);
    setScores((current) =>
      current.map((score) => (score.courtNumber === courtNumber ? { ...score, [side]: parsed } : score)),
    );
  }

  function submit() {
    if (!validation.valid) return;
    const result: RotaResult = {
      rotaNumber: rota.rotaNumber,
      scores,
      submittedAt: new Date().toISOString(),
    };
    onSessionChange(applyOrReplaceRotaResult(session, result));
  }

  return (
    <section className="panel score-panel">
      <div className="section-title">
        <div>
          <h2>Rota {rota.rotaNumber}</h2>
          <p className="muted">{isSubmitted ? "Editing submitted rota" : "Enter each court result"}</p>
        </div>
        <span className={isSubmitted ? "status edited" : "status"}>{isSubmitted ? "Submitted" : "Open"}</span>
      </div>

      <div className="courts">
        {rota.courts.map((court) => {
          const score = scores.find((item) => item.courtNumber === court.courtNumber) ?? {
            courtNumber: court.courtNumber,
            leftScore: 0,
            rightScore: 0,
          };
          const courtValidation = validateCourtScore(score, session.pointsPerCourt);
          return (
            <article className="court-card" key={court.courtNumber}>
              <div className="court-head">
                <strong>Court {court.courtNumber}</strong>
                <span>{session.pointsPerCourt} total</span>
              </div>
              <div className="score-row">
                <div className="pair left-pair">
                  <span>{playerName(court.leftPair.player1Id)}</span>
                  <span>{playerName(court.leftPair.player2Id)}</span>
                  <input
                    aria-label={`Court ${court.courtNumber} left score`}
                    inputMode="numeric"
                    type="number"
                    min="0"
                    value={Number.isNaN(score.leftScore) ? "" : score.leftScore}
                    onChange={(event) => updateScore(court.courtNumber, "leftScore", event.target.value)}
                  />
                </div>
                <div className="versus">vs</div>
                <div className="pair right-pair">
                  <span>{playerName(court.rightPair.player1Id)}</span>
                  <span>{playerName(court.rightPair.player2Id)}</span>
                  <input
                    aria-label={`Court ${court.courtNumber} right score`}
                    inputMode="numeric"
                    type="number"
                    min="0"
                    value={Number.isNaN(score.rightScore) ? "" : score.rightScore}
                    onChange={(event) => updateScore(court.courtNumber, "rightScore", event.target.value)}
                  />
                </div>
              </div>
              {!courtValidation.valid && <p className="error">{courtValidation.errors.join(" ")}</p>}
            </article>
          );
        })}
      </div>

      <div className="sit-outs">
        <strong>Sit-outs</strong>
        <span>{rota.sitOutPlayerIds.map(playerName).join(", ")}</span>
      </div>

      <button className="primary submit" type="button" disabled={!validation.valid} onClick={submit}>
        {isSubmitted ? <Edit3 size={18} /> : <Check size={18} />}
        {isSubmitted ? "Replace rota result" : "Submit rota"}
      </button>
      {!validation.valid && <p className="error prominent">{validation.errors[0]}</p>}
    </section>
  );
}
