import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Clipboard,
  Download,
  FileDown,
  ListChecks,
  // Menu, -- future improvement
  MoreHorizontal,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { parseAppMode } from "./appMode";
import { activeClub, formatAppTitle } from "./club";
import { AppShell, RotaStrip, type ShellTab } from "./components/AppShell";
import { SessionHistory } from "./components/SessionHistory";
import { StandingsTable } from "./components/StandingsTable";
import { RotaScoring, RotaScoringUndoProvider } from "./components/RotaScoring";
import { exportResultsCsv, exportStandingsCsv } from "./exporters";
import { GeneratedRotaProvider, StaticRotaProvider } from "./rotaProvider";
import { calculateStandings } from "./scoring";
import { samplePlayers, sampleRotas } from "./sampleData";
import { deriveSessionPhase } from "./sessionPhase";
import { clearSession, loadSession, saveSession } from "./storage";
import type { Player, Session, StandingRow } from "./types";
import {
  parseImportedPlayers,
  parseImportedRotas,
  parseImportedSession,
  validateCourtCount,
  validatePlayers,
  validateSessionResults,
  validateSessionSetup,
} from "./validation";

const mode = parseAppMode(globalThis.location.search);
const appTitle = formatAppTitle(activeClub);
const clubCourtLimit = activeClub.courts.length;

function newSession(): Session {
  return {
    id: crypto.randomUUID(),
    name: "Padel Americano",
    createdAt: new Date().toISOString(),
    pointsPerCourt: 24,
    courtCount: 3,
    players: [],
    rotas: [],
    results: [],
    currentRotaNumber: 1,
  };
}

function downloadText(filename: string, text: string, type = "text/plain") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function parseJsonInput(text: string, label: string): { value: unknown; error: string | null } {
  try {
    return { value: JSON.parse(text), error: null };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown JSON parsing error.";
    return { value: null, error: `Could not parse ${label} JSON: ${detail}` };
  }
}

function sessionHasData(session: Session): boolean {
  return session.players.length > 0 || session.rotas.length > 0 || session.results.length > 0;
}

function setupStatusLabel(phase: "setup" | "scoring" | "complete", setupValid: boolean): string {
  if (phase === "setup") return setupValid ? "Ready" : "Needs setup";
  if (phase === "scoring") return "In progress";
  return "Complete";
}

function formatRotaProgress(resultsCount: number, rotaCount: number): string {
  return `${resultsCount} of ${rotaCount} rotas played.`;
}

function sessionStartNotice(source: "generated" | "imported", rotaCount: number): string {
  if (source === "generated") {
    return `Generated ${rotaCount} rotas. Session started.`;
  }
  return `Imported ${rotaCount} rotas. Session started.`;
}

function clipboardNotice(kind: "unavailable" | "copied" | "denied", label: string): string {
  if (kind === "unavailable") {
    return `Clipboard is unavailable in this browser. Use Export to download ${label.toLowerCase()} instead.`;
  }
  if (kind === "copied") {
    return `${label} copied.`;
  }
  return `Could not copy ${label.toLowerCase()}. Browser denied clipboard access; try Export instead.`;
}

function appFlowNotice(kind: "generatingRotas" | "sessionImported" | "freshSessionStarted"): string {
  if (kind === "generatingRotas") return "Generating rotas...";
  if (kind === "sessionImported") return "Session imported.";
  return "Started a fresh session.";
}

function validateCourtCountForClub(courtCount: number): string | null {
  return validateCourtCount(courtCount, clubCourtLimit).errors[0] ?? null;
}

function sessionUpdateNotice(previousSession: Session | null, nextSession: Session): string | null {
  const previousPhase = previousSession ? deriveSessionPhase(previousSession) : "setup";
  const nextPhase = deriveSessionPhase(nextSession);

  if (previousSession) {
    const addedResult = nextSession.results.find((nextResult) =>
      !previousSession.results.some((existing) => existing.rotaNumber === nextResult.rotaNumber),
    );
    if (addedResult) {
      if (nextPhase === "complete") {
        return `Rota ${addedResult.rotaNumber} submitted. Session complete - ${formatRotaProgress(nextSession.results.length, nextSession.rotas.length)}`;
      }
      return `Rota ${addedResult.rotaNumber} submitted. ${formatRotaProgress(nextSession.results.length, nextSession.rotas.length)}`;
    }

    const updatedResult = nextSession.results.find((nextResult) => {
      const previousResult = previousSession.results.find((existing) => existing.rotaNumber === nextResult.rotaNumber);
      return previousResult && previousResult.submittedAt !== nextResult.submittedAt;
    });
    if (updatedResult) {
      return `Rota ${updatedResult.rotaNumber} updated. Standings refreshed.`;
    }
  }

  if (previousPhase !== "complete" && nextPhase === "complete") {
    return `Session complete - ${formatRotaProgress(nextSession.results.length, nextSession.rotas.length)}`;
  }

  return null;
}

function AppTitle() {
  return (
    <h1>
      {activeClub.websiteUrl ? (
        <a className="club-title-link" href={activeClub.websiteUrl} rel="noreferrer" target="_blank">
          {activeClub.name}
        </a>
      ) : (
        activeClub.name
      )}
      {" - Padel Americano"}
    </h1>
  );
}

function shellMeta(session: Session, phase: "setup" | "scoring" | "complete"): string {
  if (phase === "setup") {
    return `${session.players.length} players · ${session.courtCount} courts`;
  }
  return `${session.results.length} of ${session.rotas.length} rotas played · ${session.players.length} players`;
}

interface EmptyStateProps {
  readonly title: string;
  readonly hint: string;
}
function EmptyState({ title, hint }: EmptyStateProps) {
  return (
    <section className="panel empty-state">
      <h2>{title}</h2>
      <p className="muted">{hint}</p>
    </section>
  );
}

interface SideRailProps {
  readonly standings: StandingRow[];
  readonly resultCount: number;
  readonly rotaCount: number;
}
function SideRail({ standings, resultCount, rotaCount }: SideRailProps) {
  const top = standings.slice(0, 8);
  return (
    <>
      <section className="side-card">
        <h3>Live standings</h3>
        {top.length === 0 ? (
          <p className="muted">No results yet.</p>
        ) : (
          <ol className="mini-stand">
            {top.map((row) => (
              <li key={row.playerId} className="row">
                <span className="rk">{row.rank}</span>
                <span className="name">{row.displayName}</span>
                <span className="points">{row.totalPoints}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
      <section className="side-card">
        <h3>Session</h3>
        <p className="muted">{resultCount} of {rotaCount} rotas played</p>
      </section>
    </>
  );
}

export default function App() {
  useEffect(() => {
    document.title = appTitle;
  }, []);

  const [storedAtLoad] = useState(() => loadSession());
  const [session, setSession] = useState<Session | null>(() => {
    if (mode.kind === "demo") {
      return { ...newSession(), players: samplePlayers, rotas: sampleRotas, currentRotaNumber: sampleRotas[0]?.rotaNumber ?? 1 };
    }
    if (storedAtLoad.session) return null;
    return newSession();
  });
  const [setupErrors, setSetupErrors] = useState<string[]>([]);
  const [playerJson, setPlayerJson] = useState(JSON.stringify(samplePlayers, null, 2));
  const [rotaJson, setRotaJson] = useState(JSON.stringify(sampleRotas, null, 2));
  const [sessionJson, setSessionJson] = useState("");
  const [selectedRotaNumber, setSelectedRotaNumber] = useState(1);
  const [setupOpen, setSetupOpen] = useState(() => !session || session.rotas.length === 0);
  const [notice, setNotice] = useState(storedAtLoad.warning ?? "");
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<ShellTab>("score");

  const standings = useMemo(() => (session ? calculateStandings(session) : []), [session]);

  function setStorageWarning(warning?: string) {
    if (warning) setNotice(warning);
  }

  function commitSession(next: Session) {
    const saveResult = saveSession(next);
    setStorageWarning(saveResult.warning);
    setSession(next);
    return saveResult;
  }

  function updateSession(next: Session) {
    const noticeMessage = sessionUpdateNotice(session, next);
    commitSession(next);
    setSelectedRotaNumber(next.currentRotaNumber);
    if (noticeMessage) setNotice(noticeMessage);
  }

  async function copy(text: string, label: string) {
    if (!navigator.clipboard?.writeText) {
      setNotice(clipboardNotice("unavailable", label));
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setNotice(clipboardNotice("copied", label));
    } catch {
      setNotice(clipboardNotice("denied", label));
    }
  }

  function loadPlayers() {
    if (!session) return;
    if (phase !== "setup") return;
    const parsedJson = parseJsonInput(playerJson, "players");
    if (parsedJson.error) {
      setSetupErrors([parsedJson.error]);
      return;
    }

    const importedPlayers = parseImportedPlayers(parsedJson.value);
    if (!importedPlayers.value) {
      setSetupErrors(importedPlayers.errors);
      return;
    }

    const playerValidation = validatePlayers(importedPlayers.value);
    if (!playerValidation.valid) {
      setSetupErrors(playerValidation.errors);
      return;
    }

    commitSession({ ...session, players: importedPlayers.value, results: [] });
    setSetupErrors([]);
  }

  async function loadRotas() {
    if (!session) return;
    if (phase !== "setup") return;
    const courtCountError = validateCourtCountForClub(session.courtCount);
    if (courtCountError) {
      setSetupErrors([courtCountError]);
      return;
    }

    const parsedJson = parseJsonInput(rotaJson, "rotas");
    if (parsedJson.error) {
      setSetupErrors([parsedJson.error]);
      return;
    }

    const importedRotas = parseImportedRotas(parsedJson.value);
    if (!importedRotas.value) {
      setSetupErrors(importedRotas.errors);
      return;
    }

    try {
      const provider = new StaticRotaProvider(importedRotas.value);
      const rotas = await provider.getRotas({ players: session.players, courts: session.courtCount, pointsPerCourt: session.pointsPerCourt });
      const saveResult = commitSession({ ...session, rotas, results: [], currentRotaNumber: rotas[0]?.rotaNumber ?? 1 });
      setSelectedRotaNumber(rotas[0]?.rotaNumber ?? 1);
      setSetupErrors([]);
      setSetupOpen(false);
      if (saveResult.ok) {
        setNotice(sessionStartNotice("imported", rotas.length));
      }
    } catch (error) {
      setSetupErrors([error instanceof Error ? error.message : "Could not import rotas."]);
    }
  }

  async function setupGeneratedRotas() {
    if (!session || generating) return;
    if (phase !== "setup") return;

    const errors: string[] = [];
    const courtCountError = validateCourtCountForClub(session.courtCount);
    if (courtCountError) {
      setSetupErrors([courtCountError]);
      return;
    }
    const minPlayers = session.courtCount * 4;
    const maxPlayers = minPlayers + 4;
    if (!session.name.trim()) errors.push("Session name is required.");
    if (!Number.isInteger(session.pointsPerCourt) || session.pointsPerCourt <= 0) errors.push("Points per court must be a positive integer.");
    if (session.players.length < minPlayers || session.players.length > maxPlayers) {
      errors.push(`Americano setup expects between ${minPlayers} and ${maxPlayers} players for ${session.courtCount} courts.`);
    }
    errors.push(...validatePlayers(session.players).errors);
    if (errors.length > 0) {
      setSetupErrors(errors);
      return;
    }

    setGenerating(true);
    try {
      setNotice(appFlowNotice("generatingRotas"));
      await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 0));
      const provider = new GeneratedRotaProvider();
      const rotas = await provider.getRotas({ players: session.players, courts: session.courtCount, pointsPerCourt: session.pointsPerCourt });
      commitSession({ ...session, rotas, results: [], currentRotaNumber: rotas[0]?.rotaNumber ?? 1 });
      setSelectedRotaNumber(rotas[0]?.rotaNumber ?? 1);
      setSetupErrors([]);
      setSetupOpen(false);
      setNotice(sessionStartNotice("generated", rotas.length));
    } catch (error) {
      setSetupErrors([error instanceof Error ? error.message : "Could not generate rotas."]);
      setNotice("");
    } finally {
      setGenerating(false);
    }
  }

  function importFullSession() {
    const parsedJson = parseJsonInput(sessionJson, "session");
    if (parsedJson.error) {
      setSetupErrors([parsedJson.error]);
      return;
    }

    const importedSession = parseImportedSession(parsedJson.value);
    if (!importedSession.value) {
      setSetupErrors(importedSession.errors);
      return;
    }

    if (phase !== "setup" && !globalThis.confirm("Importing a session will replace the current session including all results. Continue?")) return;

    const validation = validateSessionSetup(importedSession.value, { maxCourtCount: clubCourtLimit });
    const resultsValidation = validateSessionResults(importedSession.value);
    const errors = [...validation.errors, ...resultsValidation.errors];
    if (errors.length > 0) {
      setSetupErrors(errors);
      return;
    }

    const saveResult = commitSession(importedSession.value);
    setSelectedRotaNumber(importedSession.value.currentRotaNumber);
    setSetupErrors([]);
    if (saveResult.ok) {
      setNotice(appFlowNotice("sessionImported"));
    }
  }

  function addPlayer() {
    if (!session) return;
    if (phase !== "setup") return;
    commitSession({
      ...session,
      players: [...session.players, { id: crypto.randomUUID(), displayName: "" }],
    });
  }

  function updatePlayer(index: number, patch: Partial<Player>) {
    if (!session) return;
    if (phase !== "setup") return;
    commitSession({
      ...session,
      players: session.players.map((player, playerIndex) => (playerIndex === index ? { ...player, ...patch } : player)),
    });
  }

  function removePlayer(index: number) {
    if (!session) return;
    if (phase !== "setup") return;
    commitSession({ ...session, players: session.players.filter((_, playerIndex) => playerIndex !== index), results: [] });
  }

  function resetToSetup() {
    if (!session) return;
    if (!globalThis.confirm("This will clear all rotas and results. Your player list and settings will be kept. Continue?")) return;
    commitSession({ ...session, rotas: [], results: [], currentRotaNumber: 1 });
    setSelectedRotaNumber(1);
    setSetupErrors([]);
    setSetupOpen(true);
    setActiveTab("score");
  }

  function startNewSession() {
    if (!session) return;
    if (sessionHasData(session) && !globalThis.confirm("Start a new session and replace the current one?")) return;
    const clearResult = clearSession();
    setStorageWarning(clearResult.warning);
    const saveResult = commitSession(newSession());
    setSelectedRotaNumber(1);
    setSetupOpen(true);
    setSetupErrors([]);
    setSessionJson("");
    setActiveTab("score");
    if (clearResult.ok && saveResult.ok) {
      setNotice(appFlowNotice("freshSessionStarted"));
    }
  }

  // ----- Restore screen (no shell) -----
  if (!session && storedAtLoad.session) {
    const restoredSession = storedAtLoad.session;
    const storedText = JSON.stringify(restoredSession, null, 2);
    return (
      <main className="app-shell">
        <section className="panel restore-panel">
          <AppTitle />
          <p>There is an existing session in this browser.</p>
          <div className="actions">
            <button
              className="primary"
              type="button"
              onClick={() => {
                commitSession(restoredSession);
                setSelectedRotaNumber(restoredSession.currentRotaNumber);
                setSetupOpen(false);
              }}
            >
              Continue existing session
            </button>
            <button type="button" onClick={() => downloadText("padel-americano-session.json", storedText, "application/json")}>
              <Download size={18} /> Export session JSON
            </button>
            <button
              className="danger"
              type="button"
              onClick={() => {
                if (sessionHasData(restoredSession) && !globalThis.confirm("Start a new session and replace the saved one?")) return;
                setStorageWarning(clearSession().warning);
                commitSession(newSession());
                setSelectedRotaNumber(1);
              }}
            >
              <RotateCcw size={18} /> Start new session
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!session) return null;

  const phase = deriveSessionPhase(session);
  const setupValidation = validateSessionSetup(session, { maxCourtCount: clubCourtLimit });
  const fullSessionJson = JSON.stringify(session, null, 2);
  const standingsCsv = exportStandingsCsv(standings);
  const resultsCsv = exportResultsCsv(session);
  const selectedRota = session.rotas.find((rota) => rota.rotaNumber === selectedRotaNumber);
  const selectedRotaKey = `${selectedRotaNumber}-${selectedRota?.courts.length ?? 0}-${session.pointsPerCourt}`;

  // ----- Panels (rendered into shell body by activeTab) -----

  const setupPanel = (
    <section className="panel setup-panel">
      <div className="section-title">
        <h2>Session setup</h2>
        <div className="setup-title-actions">
          <span>{setupStatusLabel(phase, setupValidation.valid)}</span>
          {session.rotas.length > 0 && (
            <button
              type="button"
              className="ghost icon setup-toggle"
              aria-label={setupOpen ? "Collapse setup" : "Expand setup"}
              aria-expanded={setupOpen}
              onClick={() => setSetupOpen((v) => !v)}
            >
              {setupOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
        </div>
      </div>
      <div className={setupOpen ? "setup-body" : "setup-body setup-body--collapsed"}>
        {phase === "setup" ? (
          <>
            <label>
              Session name{" "}
              <input value={session.name} onChange={(event) => commitSession({ ...session, name: event.target.value })} />
            </label>
            <label>
              Points per court{" "}
              <input
                type="number"
                min="1"
                value={session.pointsPerCourt}
                onChange={(event) => commitSession({ ...session, pointsPerCourt: Number(event.target.value), results: [] })}
              />
            </label>
            <label>
              Court count{" "}
              <input
                type="number"
                min={2}
                max={clubCourtLimit}
                value={session.courtCount}
                onChange={(event) => {
                  const v = event.target.valueAsNumber;
                  if (Number.isFinite(v)) commitSession({ ...session, courtCount: v, rotas: [], results: [] });
                }}
              />
            </label>

            <div className="section-title compact-title">
              <h3>Players</h3>
              <button type="button" onClick={addPlayer}>
                <Plus size={16} /> Add
              </button>
            </div>
            <div className="player-editor">
              {session.players.map((player, index) => (
                <div
                  className={mode.kind === "advanced" ? "player-row" : "player-row player-row--no-id"}
                  key={`${player.id}-${index}`}
                >
                  {mode.kind === "advanced" && (
                    <input aria-label={`Player ${index + 1} id`} value={player.id} onChange={(event) => updatePlayer(index, { id: event.target.value })} />
                  )}
                  <input
                    aria-label={`Player ${index + 1} display name`}
                    placeholder={`Player ${index + 1}`}
                    value={player.displayName}
                    onChange={(event) => updatePlayer(index, { displayName: event.target.value })}
                  />
                  <button
                    aria-label={`Remove player ${player.displayName || index + 1}`}
                    className="icon danger"
                    type="button"
                    onClick={() => removePlayer(index)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            {mode.kind === "advanced" && (
              <details>
                <summary>Import players JSON</summary>
                <textarea value={playerJson} onChange={(event) => setPlayerJson(event.target.value)} />
                <button type="button" onClick={loadPlayers}>
                  <Upload size={16} /> Import players
                </button>
              </details>
            )}

            {mode.kind === "advanced" && (
              <details open>
                <summary>Import rotas JSON</summary>
                <textarea value={rotaJson} onChange={(event) => setRotaJson(event.target.value)} />
                <button type="button" onClick={loadRotas}>
                  <Upload size={16} /> Import rotas
                </button>
              </details>
            )}

            {mode.kind !== "advanced" && (
              <button
                className="primary wide"
                type="button"
                onClick={setupGeneratedRotas}
                disabled={generating}
                aria-busy={generating}
              >
                <Save size={18} /> {generating ? "Generating rotas..." : "Start session"}
              </button>
            )}

            {Array.from(new Set([...setupErrors, ...setupValidation.errors])).filter(Boolean).slice(0, 8).map((error) => (
              <p className="error" key={error}>
                {error}
              </p>
            ))}
          </>
        ) : (
          <>
            <p><strong>Session:</strong> {session.name}</p>
            <p><strong>Points per court:</strong> {session.pointsPerCourt}</p>
            <p><strong>Court count:</strong> {session.courtCount}</p>
          </>
        )}
      </div>
    </section>
  );

  const scorePanel = (
    <RotaScoringUndoProvider>
      <RotaScoring
        key={`${selectedRotaKey}-${session.results.find((result) => result.rotaNumber === selectedRotaNumber)?.submittedAt ?? "open"}`}
        session={session}
        selectedRotaNumber={selectedRotaNumber}
        onSessionChange={updateSession}
        onRotaChange={setSelectedRotaNumber}
        clubCourts={activeClub.courts}
      />
      {phase === "complete" && (
        <section className="panel complete-panel">
          <h2>Session complete</h2>
          <p>{session.results.length} rotas played — see standings tab.</p>
        </section>
      )}
    </RotaScoringUndoProvider>
  );

  const morePanel = (
    <section className="panel more-panel">
      <div className="section-title">
        <h2>Session</h2>
        <span>{setupStatusLabel(phase, setupValidation.valid)}</span>
      </div>

      <dl className="session-info">
        <div><dt>Name</dt><dd>{session.name}</dd></div>
        <div><dt>Points per court</dt><dd>{session.pointsPerCourt}</dd></div>
        <div><dt>Courts</dt><dd>{session.courtCount}</dd></div>
        <div><dt>Players</dt><dd>{session.players.length}</dd></div>
        <div><dt>Rotas played</dt><dd>{session.results.length} of {session.rotas.length}</dd></div>
      </dl>

      <div className="section-title compact-title">
        <h3>Export</h3>
      </div>
      <div className="actions vertical">
        <button type="button" onClick={() => downloadText("padel-americano-session.json", fullSessionJson, "application/json")}>
          <FileDown size={18} /> Export session JSON
        </button>
        <button type="button" onClick={() => downloadText("standings.csv", standingsCsv, "text/csv")}>
          <FileDown size={18} /> Export standings CSV
        </button>
        <button type="button" onClick={() => downloadText("results-history.csv", resultsCsv, "text/csv")}>
          <FileDown size={18} /> Export results CSV
        </button>
      </div>

      {mode.kind === "advanced" && (
        <>
          <div className="section-title compact-title">
            <h3>Advanced</h3>
          </div>
          <div className="actions vertical">
            <button type="button" onClick={() => copy(fullSessionJson, "Session JSON")}>
              <Clipboard size={18} /> Copy session JSON
            </button>
          </div>
          <details>
            <summary>Import full session JSON</summary>
            <textarea value={sessionJson} onChange={(event) => setSessionJson(event.target.value)} />
            <button type="button" onClick={importFullSession}>
              <Upload size={16} /> Import session
            </button>
          </details>
        </>
      )}

      <div className="section-title compact-title">
        <h3>Danger zone</h3>
      </div>
      <div className="actions vertical">
        {phase !== "setup" && (
          <button className="danger wide" type="button" onClick={resetToSetup}>
            <RotateCcw size={18} /> Reset to setup
          </button>
        )}
        <button className="danger wide" type="button" onClick={startNewSession}>
          <RotateCcw size={18} /> Start new session
        </button>
      </div>
    </section>
  );

  // ----- Tab routing -----
  // During setup phase, the Score tab takes over and shows the Setup panel;
  // Standings/History render an empty state until rotas exist.
  // (See design-system/MASTER.md "During setup phase, Setup takes the home position.")

  let scoreTabContent;
  if (phase === "setup") {
    scoreTabContent = setupPanel;
  } else {
    scoreTabContent = scorePanel;
  }

  let standingsTabContent;
  if (phase === "setup") {
    standingsTabContent = (
      <EmptyState
        title="Standings appear once scoring starts"
        hint="Finish setup on the Score tab to generate rotas."
      />
    );
  } else {
    standingsTabContent = <StandingsTable standings={standings} />;
  }

  let historyTabContent;
  if (phase === "setup") {
    historyTabContent = (
      <EmptyState
        title="No history yet"
        hint="Submitted rotas will appear here."
      />
    );
  } else {
    historyTabContent = (
      <SessionHistory
        session={session}
        onSelectRota={(rotaNumber) => {
          setSelectedRotaNumber(rotaNumber);
          setActiveTab("score");
        }}
      />
    );
  }

  let tabContent;
  if (activeTab === "score") {
    tabContent = scoreTabContent;
  } else if (activeTab === "standings") {
    tabContent = standingsTabContent;
  } else if (activeTab === "history") {
    tabContent = historyTabContent;
  } else {
    tabContent = morePanel;
  }

  // const leadingAction = ( for future improvement 
  //   <button
  //     className="icon-btn"
  //     type="button"
  //     aria-label="Open session menu"
  //     onClick={() => setActiveTab("more")}
  //   >
  //     <Menu size={22} />
  //   </button>
  // );

  const trailingAction = (
    <button
      className="icon-btn"
      type="button"
      aria-label="More actions"
      onClick={() => setActiveTab("more")}
    >
      <MoreHorizontal size={22} />
    </button>
  );

  const rotaStrip = (
    <RotaStrip
      rotas={session.rotas}
      results={session.results}
      currentRotaNumber={session.currentRotaNumber}
      selectedRotaNumber={selectedRotaNumber}
      onSelect={(rotaNumber) => {
        setSelectedRotaNumber(rotaNumber);
        setActiveTab("score");
      }}
    />
  );

  // Side rail is desktop-only via CSS; we always provide content when there
  // are rotas, and let the layout decide whether to show it.
  const sideRail = session.rotas.length > 0 ? (
    <SideRail
      standings={standings}
      resultCount={session.results.length}
      rotaCount={session.rotas.length}
    />
  ) : null;

  return (
    <AppShell
      sessionName={appTitle}
      meta={shellMeta(session, phase)}
      // leadingAction={leadingAction}
      trailingAction={trailingAction}
      rotaStrip={rotaStrip}
      sideRail={sideRail}
      notice={notice ? <div className="notice shell-notice-body" role="status"><ListChecks size={16} aria-hidden="true" />{notice}</div> : null}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {tabContent}
    </AppShell>
  );
}
