import { useEffect, useRef, useState } from "react";
import { Check, Edit3 } from "lucide-react";
import { formatCourtTitle } from "../club";
import { makePlayerNameLookup } from "../playerLookup";
import { applyOrReplaceRotaResult, initializeCourtScores, updateCourtScore } from "../scoring";
import { isRotaAccessible } from "../sessionPhase";
import type { Court, CourtScore, RotaResult, Session } from "../types";
import { combineValidation, validateCourtScore } from "../validation";

interface Props {
  readonly session: Session;
  readonly selectedRotaNumber: number;
  readonly onSessionChange: (session: Session) => void;
  readonly onRotaChange: (rotaNumber: number) => void;
  readonly clubCourts: readonly Court[];
}

export function RotaScoring({ session, selectedRotaNumber, onSessionChange, onRotaChange, clubCourts }: Props) {
  const rota = session.rotas.find((item) => item.rotaNumber === selectedRotaNumber) ?? session.rotas[0];
  const existingResult = session.results.find((result) => result.rotaNumber === rota?.rotaNumber);
  const playerName = makePlayerNameLookup(session.players);
  const [scores, setScores] = useState<CourtScore[]>(() =>
    existingResult?.scores ?? (rota ? initializeCourtScores(rota.courts, session.pointsPerCourt) : []),
  );

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

  function changeScore(courtNumber: number, side: "leftScore" | "rightScore", value: number) {
    setScores((current) => updateCourtScore(current, courtNumber, side, value, session.pointsPerCourt));
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
      <div className="score-panel-header">
        <div className="score-rota-nav">
          <h2 className="score-rota-label">Rota</h2>
          {session.rotas.map((r) => (
            <button
              key={r.rotaNumber}
              type="button"
              className={r.rotaNumber === rota.rotaNumber ? "rota-tab selected" : "rota-tab"}
              aria-current={r.rotaNumber === rota.rotaNumber ? "true" : undefined}
              disabled={!isRotaAccessible(r, session.rotas, session.results)}
              onClick={() => onRotaChange(r.rotaNumber)}
            >
              {r.rotaNumber}
            </button>
          ))}
        </div>
        <span className={isSubmitted ? "status edited" : "status"}>{isSubmitted ? "Submitted" : "Open"}</span>
      </div>
      <p className="muted">{isSubmitted ? "Editing submitted rota" : "Enter each court result"}</p>

      <div className="courts">
        {rota.courts.map((court) => {
          const score = scores.find((item) => item.courtNumber === court.courtNumber) ?? {
            courtNumber: court.courtNumber,
            leftScore: 0,
            rightScore: 0,
          };
          const courtValidation = validateCourtScore(score, session.pointsPerCourt);
          let leading: "left" | "right" | null = null;
          if (score.leftScore > score.rightScore) leading = "left";
          else if (score.rightScore > score.leftScore) leading = "right";
          return (
            <article className="court-card" key={court.courtNumber}>
              <div className="court-head">
                <strong>{formatCourtTitle(court.courtNumber, clubCourts)}</strong>
              </div>
              <div className="score-row">
                <div
                  className={`pair left-pair${leading === "left" ? " leading" : ""}`}
                  aria-label={leading === "left" ? "Leading pair" : undefined}
                >
                  <div className="player-chip">{playerName(court.leftPair.player1Id)}</div>
                  <div className="player-chip">{playerName(court.leftPair.player2Id)}</div>
                  <ScoreSpinner
                    label={`Court ${court.courtNumber} left score`}
                    value={score.leftScore}
                    max={session.pointsPerCourt}
                    onChange={(v) => changeScore(court.courtNumber, "leftScore", v)}
                  />
                </div>
                <div className="versus">vs</div>
                <div
                  className={`pair right-pair${leading === "right" ? " leading" : ""}`}
                  aria-label={leading === "right" ? "Leading pair" : undefined}
                >
                  <div className="player-chip">{playerName(court.rightPair.player1Id)}</div>
                  <div className="player-chip">{playerName(court.rightPair.player2Id)}</div>
                  <ScoreSpinner
                    label={`Court ${court.courtNumber} right score`}
                    value={score.rightScore}
                    max={session.pointsPerCourt}
                    onChange={(v) => changeScore(court.courtNumber, "rightScore", v)}
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

interface ScoreSpinnerProps {
  readonly value: number;
  readonly max: number;
  readonly label: string;
  readonly onChange: (value: number) => void;
}

function ScoreSpinner({ value, max, label, onChange }: ScoreSpinnerProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);

  // Non-passive wheel listener so we can prevent page scroll while adjusting
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      onChange(Math.max(0, Math.min(max, value + (e.deltaY < 0 ? 1 : -1))));
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [value, max, onChange]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartY.current === null) return;
    const delta = touchStartY.current - e.touches[0].clientY;
    if (Math.abs(delta) >= 18) {
      onChange(Math.max(0, Math.min(max, value + (delta > 0 ? 1 : -1))));
      touchStartY.current = e.touches[0].clientY;
    }
  }

  function handleTouchEnd() {
    touchStartY.current = null;
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const parsed = e.target.value === "" ? 0 : Number(e.target.value);
    if (!Number.isNaN(parsed)) onChange(Math.max(0, Math.min(max, parsed)));
  }

  return (
    <div
      className="score-spinner"
      ref={wrapRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <button
        type="button"
        className="stepper-btn"
        aria-label={`Decrease ${label}`}
        onClick={() => onChange(Math.max(0, value - 1))}
      >
        −
      </button>
      <input
        aria-label={label}
        inputMode="numeric"
        type="number"
        min="0"
        max={max}
        value={Number.isNaN(value) ? "" : value}
        onChange={handleInputChange}
      />
      <button
        type="button"
        className="stepper-btn"
        aria-label={`Increase ${label}`}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        +
      </button>
    </div>
  );
}
