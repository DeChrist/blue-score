import { useMemo, useState } from "react";
import { Clipboard, Download, FileDown, Plus, RotateCcw, Save, Trash2, Upload } from "lucide-react";
import { SessionHistory } from "./components/SessionHistory";
import { StandingsTable } from "./components/StandingsTable";
import { RotaScoring } from "./components/RotaScoring";
import { exportResultsCsv, exportStandingsCsv } from "./exporters";
import { StaticRotaProvider } from "./rotaProvider";
import { calculateStandings } from "./scoring";
import { samplePlayers, sampleRotas } from "./sampleData";
import { clearSession, loadSession, saveSession } from "./storage";
import type { Player, Session } from "./types";
import { parseImportedPlayers, parseImportedRotas, parseImportedSession, validatePlayers, validateSessionSetup } from "./validation";

const COURTS = 3;

function newSession(): Session {
  return {
    id: crypto.randomUUID(),
    name: "Padel Americano",
    createdAt: new Date().toISOString(),
    pointsPerCourt: 24,
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

function parseJsonInput(text: string, label: string): { value: unknown | null; error: string | null } {
  try {
    return { value: JSON.parse(text), error: null };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown JSON parsing error.";
    return { value: null, error: `Could not parse ${label} JSON: ${detail}` };
  }
}

export default function App() {
  const [storedAtLoad] = useState(() => loadSession());
  const [session, setSession] = useState<Session | null>(storedAtLoad.session ? null : newSession());
  const [setupErrors, setSetupErrors] = useState<string[]>([]);
  const [playerJson, setPlayerJson] = useState(JSON.stringify(samplePlayers, null, 2));
  const [rotaJson, setRotaJson] = useState(JSON.stringify(sampleRotas, null, 2));
  const [sessionJson, setSessionJson] = useState("");
  const [selectedRotaNumber, setSelectedRotaNumber] = useState(1);
  const [notice, setNotice] = useState(storedAtLoad.warning ?? "");

  const standings = useMemo(() => (session ? calculateStandings(session) : []), [session]);

  function setStorageWarning(warning?: string) {
    if (warning) setNotice(warning);
  }

  // Most callers only need side effects; a few branch on saveResult.ok for success messaging.
  function commitSession(next: Session) {
    const saveResult = saveSession(next);
    setStorageWarning(saveResult.warning);
    setSession(next);
    return saveResult;
  }

  function updateSession(next: Session) {
    commitSession(next);
    setSelectedRotaNumber(next.currentRotaNumber);
  }

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setNotice(`${label} copied.`);
  }

  function loadPlayers() {
    if (!session) return;
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
      const rotas = await provider.getRotas({ players: session.players, courts: COURTS, pointsPerCourt: session.pointsPerCourt });
      commitSession({ ...session, rotas, results: [], currentRotaNumber: rotas[0]?.rotaNumber ?? 1 });
      setSelectedRotaNumber(rotas[0]?.rotaNumber ?? 1);
      setSetupErrors([]);
    } catch (error) {
      setSetupErrors([error instanceof Error ? error.message : "Could not import rotas."]);
    }
  }

  function startScoring() {
    if (!session) return;
    const validation = validateSessionSetup(session, COURTS);
    setSetupErrors(validation.errors);
    if (validation.valid) {
      setSelectedRotaNumber(session.currentRotaNumber);
      setNotice("Session ready.");
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

    const validation = validateSessionSetup(importedSession.value, COURTS);
    if (!validation.valid) {
      setSetupErrors(validation.errors);
      return;
    }

    const saveResult = commitSession(importedSession.value);
    setSelectedRotaNumber(importedSession.value.currentRotaNumber);
    setSetupErrors([]);
    if (saveResult.ok) {
      setNotice("Session imported.");
    }
  }

  function addPlayer() {
    if (!session) return;
    commitSession({
      ...session,
      players: [...session.players, { id: `player-${session.players.length + 1}`, displayName: "" }],
    });
  }

  function updatePlayer(index: number, patch: Partial<Player>) {
    if (!session) return;
    commitSession({
      ...session,
      players: session.players.map((player, playerIndex) => (playerIndex === index ? { ...player, ...patch } : player)),
    });
  }

  function removePlayer(index: number) {
    if (!session) return;
    commitSession({ ...session, players: session.players.filter((_, playerIndex) => playerIndex !== index), results: [] });
  }

  if (!session && storedAtLoad.session) {
    const restoredSession = storedAtLoad.session;
    const storedText = JSON.stringify(restoredSession, null, 2);
    return (
      <main className="app-shell">
        <section className="panel restore-panel">
          <h1>Padel Americano</h1>
          <p>There is an existing session in this browser.</p>
          <div className="actions">
            <button
              className="primary"
              type="button"
              onClick={() => {
                commitSession(restoredSession);
                setSelectedRotaNumber(restoredSession.currentRotaNumber);
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

  const setupValidation = validateSessionSetup(session, COURTS);
  const fullSessionJson = JSON.stringify(session, null, 2);
  const standingsCsv = exportStandingsCsv(standings);
  const resultsCsv = exportResultsCsv(session);
  const selectedRota = session.rotas.find((rota) => rota.rotaNumber === selectedRotaNumber);
  const selectedRotaKey = `${selectedRotaNumber}-${selectedRota?.courts.length ?? 0}-${session.pointsPerCourt}`;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>Padel Americano</h1>
          <p>{session.results.length} of {session.rotas.length} rotas submitted</p>
        </div>
        <button
          className="danger"
          type="button"
          onClick={() => {
            const clearResult = clearSession();
            setStorageWarning(clearResult.warning);
            const saveResult = commitSession(newSession());
            setSelectedRotaNumber(1);
            if (clearResult.ok && saveResult.ok) {
              setNotice("Started a fresh session.");
            }
          }}
        >
          <RotateCcw size={18} /> New
        </button>
      </header>

      {notice && <div className="notice">{notice}</div>}

      <section className="grid">
        <section className="panel setup-panel">
          <div className="section-title">
            <h2>Session setup</h2>
            <span>{setupValidation.valid ? "Ready" : "Needs setup"}</span>
          </div>
          <label>
            Session name
            <input value={session.name} onChange={(event) => commitSession({ ...session, name: event.target.value })} />
          </label>
          <label>
            Points per court
            <input
              type="number"
              min="1"
              value={session.pointsPerCourt}
              onChange={(event) => commitSession({ ...session, pointsPerCourt: Number(event.target.value), results: [] })}
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
              <div className="player-row" key={`${player.id}-${index}`}>
                <input aria-label="Player id" value={player.id} onChange={(event) => updatePlayer(index, { id: event.target.value })} />
                <input
                  aria-label="Display name"
                  value={player.displayName}
                  onChange={(event) => updatePlayer(index, { displayName: event.target.value })}
                />
                <button className="icon danger" type="button" title="Remove player" onClick={() => removePlayer(index)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <details>
            <summary>Import players JSON</summary>
            <textarea value={playerJson} onChange={(event) => setPlayerJson(event.target.value)} />
            <button type="button" onClick={loadPlayers}>
              <Upload size={16} /> Import players
            </button>
          </details>

          <details open>
            <summary>Import rotas JSON</summary>
            <textarea value={rotaJson} onChange={(event) => setRotaJson(event.target.value)} />
            <button type="button" onClick={loadRotas}>
              <Upload size={16} /> Import rotas
            </button>
          </details>

          <button className="primary wide" type="button" disabled={!setupValidation.valid} onClick={startScoring}>
            <Save size={18} /> Validate setup
          </button>

          {[...setupErrors, ...setupValidation.errors].filter(Boolean).slice(0, 8).map((error) => (
            <p className="error" key={error}>
              {error}
            </p>
          ))}
        </section>

        <section className="main-stack">
          <RotaScoring
            key={`${selectedRotaKey}-${session.results.find((result) => result.rotaNumber === selectedRotaNumber)?.submittedAt ?? "open"}`}
            session={session}
            selectedRotaNumber={selectedRotaNumber}
            onSessionChange={updateSession}
          />

          <section className="panel rota-jump">
            <div className="section-title">
              <h2>Rotas</h2>
              <span>Review or edit</span>
            </div>
            <div className="rota-buttons">
              {session.rotas.map((rota) => (
                <button
                  className={selectedRotaNumber === rota.rotaNumber ? "selected" : ""}
                  key={rota.rotaNumber}
                  type="button"
                  onClick={() => setSelectedRotaNumber(rota.rotaNumber)}
                >
                  {rota.rotaNumber}
                </button>
              ))}
            </div>
          </section>

          <StandingsTable standings={standings} />
          <SessionHistory session={session} onSelectRota={setSelectedRotaNumber} />
        </section>

        <section className="panel export-panel">
          <div className="section-title">
            <h2>Import / export</h2>
          </div>
          <div className="actions vertical">
            <button type="button" onClick={() => downloadText("padel-americano-session.json", fullSessionJson, "application/json")}>
              <FileDown size={18} /> Export session JSON
            </button>
            <button type="button" onClick={() => copy(fullSessionJson, "Session JSON")}>
              <Clipboard size={18} /> Copy session JSON
            </button>
            <button type="button" onClick={() => downloadText("standings.csv", standingsCsv, "text/csv")}>
              <FileDown size={18} /> Export standings CSV
            </button>
            <button type="button" onClick={() => downloadText("results-history.csv", resultsCsv, "text/csv")}>
              <FileDown size={18} /> Export results CSV
            </button>
          </div>
          <details>
            <summary>Import full session JSON</summary>
            <textarea value={sessionJson} onChange={(event) => setSessionJson(event.target.value)} />
            <button type="button" onClick={importFullSession}>
              <Upload size={16} /> Import session
            </button>
          </details>
        </section>
      </section>
    </main>
  );
}
