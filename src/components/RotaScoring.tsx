import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent, TouchEvent } from "react";
import { Minus, Plus } from "lucide-react";
import { makePlayerNameLookup } from "../playerLookup";
import { applyOrReplaceRotaResult, initializeCourtScores, updateCourtScore } from "../scoring";
import { isRotaAccessible } from "../sessionPhase";
import type { Court, CourtMatch, CourtScore, RotaResult, Session } from "../types";

interface Props {
  readonly session: Session;
  readonly selectedRotaNumber: number;
  readonly onSessionChange: (session: Session) => void;
  readonly onRotaChange: (rotaNumber: number) => void;
  readonly clubCourts: readonly Court[];
}

type ScoreSide = "leftScore" | "rightScore";
type LeadingSide = "left" | "right" | null;

interface UndoState {
  readonly session: Session;
  readonly rotaNumber: number;
  readonly message: string;
  readonly expiresAt: number;
}

let pendingUndoState: UndoState | null = null;

function readPendingUndoState(): UndoState | null {
  if (pendingUndoState && pendingUndoState.expiresAt <= Date.now()) {
    pendingUndoState = null;
  }
  return pendingUndoState;
}

export function RotaScoring({ session, selectedRotaNumber, onSessionChange, onRotaChange, clubCourts }: Props) {
  const rota = session.rotas.find((item) => item.rotaNumber === selectedRotaNumber) ?? session.rotas[0];
  const existingResult = session.results.find((result) => result.rotaNumber === rota?.rotaNumber);
  const isSubmitted = Boolean(existingResult);
  const playerName = makePlayerNameLookup(session.players);
  const [scores, setScores] = useState<CourtScore[]>(() =>
    existingResult?.scores ?? (rota ? initializeCourtScores(rota.courts, session.pointsPerCourt) : []),
  );
  const [undoState, setUndoState] = useState<UndoState | null>(() => readPendingUndoState());
  const undoTimerRef = useRef<number | null>(null);
  const toastMessage = undoState?.message ?? "";

  useEffect(() => {
    if (!undoState) return undefined;

    const remainingMs = Math.max(0, undoState.expiresAt - Date.now());
    undoTimerRef.current = globalThis.setTimeout(() => {
      if (pendingUndoState === undoState) pendingUndoState = null;
      setUndoState(null);
      undoTimerRef.current = null;
    }, remainingMs);

    return () => {
      if (undoTimerRef.current !== null) globalThis.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    };
  }, [undoState]);

  const defaultLeftScore = Math.floor(session.pointsPerCourt / 2);
  const defaultRightScore = session.pointsPerCourt - defaultLeftScore;

  const getScore = useCallback(
    (courtNumber: number): CourtScore => {
      return scores.find((item) => item.courtNumber === courtNumber) ?? {
        courtNumber,
        leftScore: defaultLeftScore,
        rightScore: defaultRightScore,
      };
    },
    [defaultLeftScore, defaultRightScore, scores],
  );

  const isCourtPending = useCallback(
    (score: CourtScore): boolean => score.leftScore === defaultLeftScore && score.rightScore === defaultRightScore,
    [defaultLeftScore, defaultRightScore],
  );

  const changeScore = useCallback(
    (courtNumber: number, side: ScoreSide, value: number) => {
      if (isSubmitted) return;
      setScores((current) => updateCourtScore(current, courtNumber, side, value, session.pointsPerCourt));
    },
    [isSubmitted, session.pointsPerCourt],
  );

  const recordedCount = rota
    ? rota.courts.filter((court) => isSubmitted || !isCourtPending(getScore(court.courtNumber))).length
    : 0;
  const courtCount = rota?.courts.length ?? 0;
  const pendingCourts = rota?.courts.filter((court) => !isSubmitted && isCourtPending(getScore(court.courtNumber))) ?? [];
  const canSubmit = Boolean(rota) && !isSubmitted && courtCount > 0 && recordedCount === courtCount;

  const submit = useCallback(() => {
    if (!rota || !canSubmit) return;

    const result: RotaResult = {
      rotaNumber: rota.rotaNumber,
      scores: rota.courts.map((court) => getScore(court.courtNumber)),
      submittedAt: new Date().toISOString(),
    };
    const nextSession = applyOrReplaceRotaResult(session, result);
    const nextOpenRota = nextSession.rotas.find(
      (item) =>
        !nextSession.results.some((stored) => stored.rotaNumber === item.rotaNumber) &&
        isRotaAccessible(item, nextSession.rotas, nextSession.results),
    );

    const nextUndoState: UndoState = {
      session,
      rotaNumber: rota.rotaNumber,
      message: `Rota ${rota.rotaNumber} submitted`,
      expiresAt: Date.now() + 4000,
    };
    pendingUndoState = nextUndoState;
    setUndoState(nextUndoState);
    onSessionChange(nextSession);
    if (nextOpenRota) onRotaChange(nextOpenRota.rotaNumber);
  }, [canSubmit, getScore, onRotaChange, onSessionChange, rota, session]);

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
    if (pendingUndoState === undoState) pendingUndoState = null;
    setUndoState(null);
  }

  const pendingDetail = formatPendingCourts(pendingCourts, clubCourts);

  return (
    <>
      <section className="panel score-panel">
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {toastMessage}
        </div>

        <div className="courts score-courts">
          {rota.courts.map((court) => {
            const score = getScore(court.courtNumber);
            const isPending = !isSubmitted && isCourtPending(score);
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
          <div className="sit-outs court-sitouts">
            <strong>Sitting out this rota:</strong>
            <div className="court-sitouts__chips">
              {rota.sitOutPlayerIds.map((playerId) => (
                <span className="player-chip" key={playerId}>
                  {playerName(playerId)}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="submit-bar">
        <div className="submit-bar__meta">
          <div className="submit-bar__title">
            {recordedCount} of {courtCount} matches recorded
          </div>
          {pendingDetail && <div className="submit-bar__detail">{pendingDetail}</div>}
        </div>
        {undoState ? (
          <div className="submit-toast">
            <span>{toastMessage}</span>
            <button className="ghost" type="button" onClick={undoSubmit}>
              Undo
            </button>
          </div>
        ) : (
          <div className="submit-bar__cta">
            <button className="primary" type="button" disabled={!canSubmit} onClick={submit}>
              {isSubmitted ? `Rota ${rota.rotaNumber} submitted` : `Submit Rota ${rota.rotaNumber}`}
            </button>
            <kbd className="submit-bar__hint">⌘↵</kbd>
          </div>
        )}
      </div>
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
  const statusText = isSubmitted ? "Done" : "Recorded";
  const courtLabel = courtName ? `Court ${court.courtNumber} · ${courtName}` : `Court ${court.courtNumber}`;

  return (
    <article className={`court-score ${stateClass}`}>
      <div className="court-card">
        <div className="court-card__head">
          <strong className="court-card__id">{courtLabel}</strong>
          {!isPending && <span className="status court-card__pill">{statusText}</span>}
        </div>
        <CourtPair
          className="court-card__pair"
          courtNumber={court.courtNumber}
          disabled={isSubmitted}
          isPending={isPending}
          leading={leading === "left"}
          pairSide="left"
          playerIds={[court.leftPair.player1Id, court.leftPair.player2Id]}
          playerName={playerName}
          pointsPerCourt={pointsPerCourt}
          score={score.leftScore}
          onChange={(value) => onChangeScore(court.courtNumber, "leftScore", value)}
        />
        <CourtPair
          className="court-card__pair"
          courtNumber={court.courtNumber}
          disabled={isSubmitted}
          isPending={isPending}
          leading={leading === "right"}
          pairSide="right"
          playerIds={[court.rightPair.player1Id, court.rightPair.player2Id]}
          playerName={playerName}
          pointsPerCourt={pointsPerCourt}
          score={score.rightScore}
          onChange={(value) => onChangeScore(court.courtNumber, "rightScore", value)}
        />
        {isPending && <div className="court-card__pending-hint">Tap a score to record this match</div>}
      </div>

      <div className="court-row">
        <div className="court-row__tag">
          <strong>{court.courtNumber}</strong>
          <span className="court-row__tag-name">{courtName}</span>
        </div>
        <div className="court-row__versus">
          <CourtPair
            className="court-row__pair"
            courtNumber={court.courtNumber}
            disabled={isSubmitted}
            isPending={isPending}
            leading={leading === "left"}
            pairSide="left"
            playerIds={[court.leftPair.player1Id, court.leftPair.player2Id]}
            playerName={playerName}
            pointsPerCourt={pointsPerCourt}
            score={score.leftScore}
            onChange={(value) => onChangeScore(court.courtNumber, "leftScore", value)}
          />
          <span className="court-row__vs">VS</span>
          <CourtPair
            className="court-row__pair"
            courtNumber={court.courtNumber}
            disabled={isSubmitted}
            isPending={isPending}
            leading={leading === "right"}
            pairSide="right"
            playerIds={[court.rightPair.player1Id, court.rightPair.player2Id]}
            playerName={playerName}
            pointsPerCourt={pointsPerCourt}
            score={score.rightScore}
            onChange={(value) => onChangeScore(court.courtNumber, "rightScore", value)}
          />
        </div>
        <div className="court-row__status">
          {isPending ? <span>Not entered</span> : <span className="status">{statusText}</span>}
        </div>
      </div>
    </article>
  );
}

interface CourtPairProps {
  readonly className: string;
  readonly courtNumber: number;
  readonly disabled: boolean;
  readonly isPending: boolean;
  readonly leading: boolean;
  readonly pairSide: "left" | "right";
  readonly playerIds: readonly string[];
  readonly playerName: (playerId: string) => string;
  readonly pointsPerCourt: number;
  readonly score: number;
  readonly onChange: (value: number) => void;
}

function CourtPair({
  className,
  courtNumber,
  disabled,
  isPending,
  leading,
  pairSide,
  playerIds,
  playerName,
  pointsPerCourt,
  score,
  onChange,
}: CourtPairProps) {
  const sideLabel = pairSide === "left" ? "left" : "right";
  const pairClass = [
    "pair",
    `${pairSide}-pair`,
    className,
    isPending ? "pending" : "",
    leading ? "leading" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={pairClass} aria-label={leading ? "Leading pair" : undefined}>
      <div className="court-pair__players">
        {playerIds.map((playerId) => (
          <div className="player-chip" key={playerId}>
            {playerName(playerId)}
          </div>
        ))}
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

interface ScoreSpinnerProps {
  readonly value: number;
  readonly max: number;
  readonly label: string;
  readonly disabled: boolean;
  readonly onChange: (value: number) => void;
}

function ScoreSpinner({ value, max, label, disabled, onChange }: ScoreSpinnerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const touchStartY = useRef<number | null>(null);
  const latestValueRef = useRef(value);

  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  function clamp(nextValue: number) {
    return Math.max(0, Math.min(max, nextValue));
  }

  function step(delta: number) {
    if (disabled) return;
    onChange(clamp(latestValueRef.current + delta));
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (disabled) return;
    touchStartY.current = event.touches[0].clientY;
  }

  function handleTouchMove(event: TouchEvent<HTMLDivElement>) {
    if (disabled || touchStartY.current === null) return;
    const delta = touchStartY.current - event.touches[0].clientY;
    if (Math.abs(delta) >= 18) {
      step(delta > 0 ? 1 : -1);
      touchStartY.current = event.touches[0].clientY;
    }
  }

  function handleTouchEnd() {
    touchStartY.current = null;
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (disabled) return;
    const parsed = event.target.value === "" ? 0 : Number(event.target.value);
    if (!Number.isNaN(parsed)) onChange(clamp(parsed));
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      step(1);
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      step(-1);
    }
  }

  function handleInputFocus() {
    const input = inputRef.current;
    if (!input || disabled) return;

    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      step(event.deltaY < 0 ? 1 : -1);
    }

    input.addEventListener("wheel", handleWheel, { passive: false });
    input.addEventListener("blur", () => input.removeEventListener("wheel", handleWheel), { once: true });
  }

  return (
    <div
      className="score-spinner"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <button
        type="button"
        className="stepper-btn"
        aria-label={`Decrease ${label}`}
        disabled={disabled || value <= 0}
        onClick={() => step(-1)}
      >
        <Minus size={18} aria-hidden="true" />
      </button>
      <input
        ref={inputRef}
        aria-label={label}
        inputMode="numeric"
        type="number"
        min="0"
        max={max}
        value={Number.isNaN(value) ? "" : value}
        disabled={disabled}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onKeyDown={handleInputKeyDown}
      />
      <button
        type="button"
        className="stepper-btn"
        aria-label={`Increase ${label}`}
        disabled={disabled || value >= max}
        onClick={() => step(1)}
      >
        <Plus size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

function getLeadingSide(score: CourtScore): LeadingSide {
  if (score.leftScore > score.rightScore) return "left";
  if (score.rightScore > score.leftScore) return "right";
  return null;
}

function getCourtName(courtNumber: number, courts: readonly Court[]): string {
  return courts[courtNumber - 1]?.name.trim() ?? "";
}

function formatPendingCourts(courts: readonly CourtMatch[], clubCourts: readonly Court[]): string {
  if (courts.length === 0) return "";
  const labels = courts.map((court) => getCourtName(court.courtNumber, clubCourts) || `Court ${court.courtNumber}`);
  return `${labels.join(", ")} still pending`;
}
