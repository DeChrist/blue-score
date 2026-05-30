import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, KeyboardEvent, ReactNode, SetStateAction } from "react";
import { CheckCircle, GripVertical } from "lucide-react";
import { makePlayerNameLookup } from "../playerLookup";
import { applyOrReplaceRotaResult, initializeCourtScores, updateCourtScore } from "../scoring";
import {
  canSubmitRota,
  findCourtScore,
  findNextOpenRota,
  formatPendingCourtDetail,
  getCourtName,
  getLeadingSide,
  getPendingCourts,
  getRecordedCourtCount,
  isCourtRecorded,
} from "../scoreUiState";
import type { LeadingSide, ScoreSide } from "../scoreUiState";
import type { Court, CourtMatch, CourtScore, RotaResult, Session } from "../types";

interface Props {
  readonly session: Session;
  readonly selectedRotaNumber: number;
  readonly onSessionChange: (session: Session) => void;
  readonly onRotaChange: (rotaNumber: number) => void;
  readonly clubCourts: readonly Court[];
}

interface UndoState {
  readonly session: Session;
  readonly rotaNumber: number;
  readonly message: string;
  readonly expiresAt: number;
}

interface UndoContextValue {
  readonly undoState: UndoState | null;
  readonly setUndoState: Dispatch<SetStateAction<UndoState | null>>;
}

const RotaScoringUndoContext = createContext<UndoContextValue | null>(null);

interface RotaScoringUndoProviderProps {
  readonly children: ReactNode;
}

export function RotaScoringUndoProvider({ children }: RotaScoringUndoProviderProps) {
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const value = useMemo(() => ({ undoState, setUndoState }), [undoState]);

  return (
    <RotaScoringUndoContext.Provider value={value}>
      {children}
    </RotaScoringUndoContext.Provider>
  );
}

export function RotaScoring({ session, selectedRotaNumber, onSessionChange, onRotaChange, clubCourts }: Props) {
  const rota = session.rotas.find((item) => item.rotaNumber === selectedRotaNumber) ?? session.rotas[0];
  const existingResult = session.results.find((result) => result.rotaNumber === rota?.rotaNumber);
  const isSubmitted = Boolean(existingResult);
  const playerName = makePlayerNameLookup(session.players);
  const [scores, setScores] = useState<CourtScore[]>(() =>
    existingResult?.scores ?? (rota ? initializeCourtScores(rota.courts, session.pointsPerCourt) : []),
  );
  const [touchedCourtNumbers, setTouchedCourtNumbers] = useState<ReadonlySet<number>>(() => new Set());
  const localUndoState = useState<UndoState | null>(null);
  const undoContext = useContext(RotaScoringUndoContext);
  const [undoState, setUndoState] = undoContext
    ? [undoContext.undoState, undoContext.setUndoState]
    : localUndoState;
  const undoTimerRef = useRef<number | null>(null);
  const toastMessage = undoState?.message ?? "";

  useEffect(() => {
    const nextScores = existingResult?.scores ?? (rota ? initializeCourtScores(rota.courts, session.pointsPerCourt) : []);
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      setScores(nextScores);
      setTouchedCourtNumbers(new Set());
    });

    return () => {
      cancelled = true;
    };
  }, [existingResult?.scores, existingResult?.submittedAt, rota, session.pointsPerCourt]);

  useEffect(() => {
    if (!undoState) return undefined;

    const remainingMs = Math.max(0, undoState.expiresAt - Date.now());
    undoTimerRef.current = globalThis.setTimeout(() => {
      setUndoState((current) => (current === undoState ? null : current));
      undoTimerRef.current = null;
    }, remainingMs);

    return () => {
      if (undoTimerRef.current !== null) globalThis.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    };
  }, [setUndoState, undoState]);

  const getScore = useCallback(
    (courtNumber: number): CourtScore => {
      return findCourtScore(scores, courtNumber, session.pointsPerCourt);
    },
    [scores, session.pointsPerCourt],
  );

  const changeScore = useCallback(
    (courtNumber: number, side: ScoreSide, value: number) => {
      if (isSubmitted) return;
      setTouchedCourtNumbers((current) => new Set(current).add(courtNumber));
      setScores((current) => updateCourtScore(current, courtNumber, side, value, session.pointsPerCourt));
    },
    [isSubmitted, session.pointsPerCourt],
  );

  const recordedCount = rota ? getRecordedCourtCount(rota.courts, touchedCourtNumbers, isSubmitted) : 0;
  const courtCount = rota?.courts.length ?? 0;
  const pendingCourts = rota ? getPendingCourts(rota.courts, touchedCourtNumbers, isSubmitted) : [];
  const canSubmit = Boolean(rota) && canSubmitRota(rota.courts, touchedCourtNumbers, isSubmitted);

  const submit = useCallback(() => {
    if (!rota || !canSubmit) return;

    const result: RotaResult = {
      rotaNumber: rota.rotaNumber,
      scores: rota.courts.map((court) => getScore(court.courtNumber)),
      submittedAt: new Date().toISOString(),
    };
    const nextSession = applyOrReplaceRotaResult(session, result);
    const nextOpenRota = findNextOpenRota(nextSession.rotas, nextSession.results);

    const nextUndoState: UndoState = {
      session,
      rotaNumber: rota.rotaNumber,
      message: `Rota ${rota.rotaNumber} submitted`,
      expiresAt: Date.now() + 4000,
    };
    setUndoState(nextUndoState);
    onSessionChange(nextSession);
    if (nextOpenRota) onRotaChange(nextOpenRota.rotaNumber);
  }, [canSubmit, getScore, onRotaChange, onSessionChange, rota, session, setUndoState]);

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== "Enter" || (!event.metaKey && !event.ctrlKey)) return;
      if (!canSubmit) return;
      event.preventDefault();
      submit();
    }

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [canSubmit, submit]);

  if (!rota) {
    return (
      <section className="panel hero-panel">
        <h2>No rota loaded</h2>
        <p>Import rotas in setup before scoring.</p>
      </section>
    );
  }

  function undoSubmit() {
    if (!undoState) return;
    if (undoTimerRef.current !== null) {
      globalThis.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    onSessionChange(undoState.session);
    onRotaChange(undoState.rotaNumber);
    setUndoState(null);
  }

  const pendingDetail = formatPendingCourtDetail(pendingCourts, clubCourts);

  return (
    <>
      <section className="panel score-panel">
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {toastMessage}
        </div>

        <div className="score-courts">
          {rota.courts.map((court) => {
            const score = getScore(court.courtNumber);
            const isPending = !isCourtRecorded(court.courtNumber, touchedCourtNumbers, isSubmitted);
            const leading = getLeadingSide(score);
            const courtName = getCourtName(court.courtNumber, clubCourts);
            return (
              <CourtScoreItem
                key={court.courtNumber}
                court={court}
                courtName={courtName}
                isPending={isPending}
                isSubmitted={isSubmitted}
                leading={leading}
                playerName={playerName}
                score={score}
                pointsPerCourt={session.pointsPerCourt}
                onChangeScore={changeScore}
              />
            );
          })}
        </div>

        {rota.sitOutPlayerIds.length > 0 && (
          <div className="sit-outs">
            <h3>Sitting out this rota</h3>
            <div className="chip-row">
              {rota.sitOutPlayerIds.map((playerId) => (
                <span className="chip" key={playerId}>
                  {playerName(playerId)}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="submit-bar">
        <div className="submit-meta">
          <div className="title">
            {recordedCount} of {courtCount} matches recorded
          </div>
          {pendingDetail && <div className="sub">{pendingDetail}</div>}
        </div>
        <button className="cta" type="button" disabled={!canSubmit} onClick={submit}>
          {isSubmitted ? `Rota ${rota.rotaNumber} submitted` : `Submit Rota ${rota.rotaNumber}`}
        </button>
      </div>

      {undoState && (
        <div className="submit-toast">
          <CheckCircle className="icon" size={18} aria-hidden="true" />
          <span>{toastMessage}</span>
          <button className="undo" type="button" onClick={undoSubmit}>
            Undo
          </button>
        </div>
      )}
    </>
  );
}

interface CourtScoreItemProps {
  readonly court: CourtMatch;
  readonly courtName: string;
  readonly isPending: boolean;
  readonly isSubmitted: boolean;
  readonly leading: LeadingSide;
  readonly playerName: (playerId: string) => string;
  readonly score: CourtScore;
  readonly pointsPerCourt: number;
  readonly onChangeScore: (courtNumber: number, side: ScoreSide, value: number) => void;
}

function CourtScoreItem({
  court,
  courtName,
  isPending,
  isSubmitted,
  leading,
  playerName,
  score,
  pointsPerCourt,
  onChangeScore,
}: CourtScoreItemProps) {
  const stateClass = isPending ? "is-pending" : "is-recorded";
  const cardStateClass = [
    "court-card",
    isPending ? "pending" : "",
    isSubmitted ? "submitted" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const rowStateClass = [
    "d-court-row",
    isPending ? "pending" : "",
    isSubmitted ? "submitted" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const statusText = isSubmitted ? "Done" : "Recorded";

  return (
    <article className={`court-score ${stateClass}`}>
      <div className={cardStateClass}>
        <header className="court-card__head">
          <div className="court-num">
            <span className="label">Court</span>
            <span className="n">{court.courtNumber}</span>
            {courtName && <span className="court-name">· {courtName}</span>}
          </div>
          {isPending ? (
            <span className="court-state">Not entered</span>
          ) : (
            <span className="pill success"><span className="dot" />{statusText}</span>
          )}
        </header>
        <PairRow
          courtNumber={court.courtNumber}
          disabled={isSubmitted}
          leading={leading === "left"}
          pairSide="left"
          playerIds={[court.leftPair.player1Id, court.leftPair.player2Id]}
          playerName={playerName}
          pointsPerCourt={pointsPerCourt}
          variant="phone"
          score={score.leftScore}
          onChange={(value) => onChangeScore(court.courtNumber, "leftScore", value)}
        />
        <PairRow
          courtNumber={court.courtNumber}
          disabled={isSubmitted}
          leading={leading === "right"}
          pairSide="right"
          playerIds={[court.rightPair.player1Id, court.rightPair.player2Id]}
          playerName={playerName}
          pointsPerCourt={pointsPerCourt}
          variant="phone"
          score={score.rightScore}
          onChange={(value) => onChangeScore(court.courtNumber, "rightScore", value)}
        />
      </div>

      <div className={rowStateClass}>
        <div className="court-tag">
          <span className="label">Court</span>
          <span className="n">{court.courtNumber}</span>
          {courtName && <span className="court-name">{courtName}</span>}
        </div>
        <div className="versus-block">
          <PairRow
            courtNumber={court.courtNumber}
            disabled={isSubmitted}
            leading={leading === "left"}
            pairSide="left"
            playerIds={[court.leftPair.player1Id, court.leftPair.player2Id]}
            playerName={playerName}
            pointsPerCourt={pointsPerCourt}
            variant="desktop"
            score={score.leftScore}
            onChange={(value) => onChangeScore(court.courtNumber, "leftScore", value)}
          />
          <span className="d-versus">VS</span>
          <PairRow
            courtNumber={court.courtNumber}
            disabled={isSubmitted}
            leading={leading === "right"}
            pairSide="right"
            playerIds={[court.rightPair.player1Id, court.rightPair.player2Id]}
            playerName={playerName}
            pointsPerCourt={pointsPerCourt}
            variant="desktop"
            score={score.rightScore}
            onChange={(value) => onChangeScore(court.courtNumber, "rightScore", value)}
          />
        </div>
        <div className="d-court-status">
          {isPending ? (
            <span className="pending-hint">Not entered</span>
          ) : (
            <span className="pill success"><span className="dot" />{statusText}</span>
          )}
        </div>
      </div>
    </article>
  );
}

interface PairRowProps {
  readonly courtNumber: number;
  readonly disabled: boolean;
  readonly leading: boolean;
  readonly pairSide: "left" | "right";
  readonly playerIds: readonly string[];
  readonly playerName: (playerId: string) => string;
  readonly pointsPerCourt: number;
  readonly score: number;
  readonly variant: "phone" | "desktop";
  readonly onChange: (value: number) => void;
}

function PairRow({
  courtNumber,
  disabled,
  leading,
  pairSide,
  playerIds,
  playerName,
  pointsPerCourt,
  score,
  variant,
  onChange,
}: PairRowProps) {
  const sideLabel = pairSide === "left" ? "left" : "right";
  const pairClass = [variant === "desktop" ? "d-pair" : "pair-row", pairSide, leading ? "leading" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={pairClass} aria-label={leading ? "Leading pair" : undefined}>
      <div className="pair-names">
        <PlayerNameChips playerIds={playerIds} playerName={playerName} />
      </div>
      <ScoreSpinner
        label={`Court ${courtNumber} ${sideLabel} score`}
        value={score}
        max={pointsPerCourt}
        disabled={disabled}
        onChange={onChange}
      />
    </div>
  );
}

interface PlayerNameChipsProps {
  readonly playerIds: readonly string[];
  readonly playerName: (playerId: string) => string;
}

function PlayerNameChips({ playerIds, playerName }: PlayerNameChipsProps) {
  return (
    <>
      {playerIds.map((playerId) => (
        <span className="pair-chip" key={playerId}>
          <GripVertical className="grip" size={14} aria-hidden="true" />
          {playerName(playerId)}
        </span>
      ))}
    </>
  );
}

interface ScoreSpinnerProps {
  readonly value: number;
  readonly max: number;
  readonly label: string;
  readonly disabled: boolean;
  readonly onChange: (value: number) => void;
}

function ScoreSpinner({ value, max, label, disabled, onChange }: ScoreSpinnerProps) {
  const outputRef = useRef<HTMLOutputElement>(null);
  const latestValueRef = useRef(value);
  const wheelCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  useEffect(() => {
    return () => {
      wheelCleanupRef.current?.();
      wheelCleanupRef.current = null;
    };
  }, []);

  function clamp(nextValue: number) {
    return Math.max(0, Math.min(max, nextValue));
  }

  function step(delta: number) {
    if (disabled) return;
    onChange(clamp(latestValueRef.current + delta));
  }

  function handleOutputKeyDown(event: KeyboardEvent<HTMLOutputElement>) {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      step(1);
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      step(-1);
    }
  }

  function handleOutputFocus() {
    const output = outputRef.current;
    if (!output || disabled) return;
    if (wheelCleanupRef.current) return;

    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      step(event.deltaY < 0 ? 1 : -1);
    }

    output.addEventListener("wheel", handleWheel, { passive: false });
    wheelCleanupRef.current = () => output.removeEventListener("wheel", handleWheel);
  }

  function handleOutputBlur() {
    wheelCleanupRef.current?.();
    wheelCleanupRef.current = null;
  }

  return (
    <div className="stepper">
      <button
        type="button"
        className="step minus"
        aria-label={`Decrease ${label}`}
        aria-disabled={disabled ? "true" : undefined}
        disabled={disabled || value <= 0}
        onClick={() => step(-1)}
      >
        −
      </button>
      {/* eslint-disable jsx-a11y/no-noninteractive-element-to-interactive-role -- Rev 2 requires output.score to expose spinbutton keyboard behavior. */}
      <output
        ref={outputRef}
        className="score"
        role="spinbutton"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-readonly={disabled ? "true" : undefined}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        onBlur={handleOutputBlur}
        onFocus={handleOutputFocus}
        onKeyDown={handleOutputKeyDown}
      >
        {value}
      </output>
      {/* eslint-enable jsx-a11y/no-noninteractive-element-to-interactive-role */}
      <button
        type="button"
        className="step plus"
        aria-label={`Increase ${label}`}
        aria-disabled={disabled ? "true" : undefined}
        disabled={disabled || value >= max}
        onClick={() => step(1)}
      >
        +
      </button>
    </div>
  );
}
