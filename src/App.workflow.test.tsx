import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock ONLY the rota-generation boundary so `Start session` is deterministic
// and fast. Everything else (scoring helpers, session-phase logic, storage
// validation, standings/history rendering) runs for real. The mock is kept
// local to this file per ADR-006.
vi.mock("./rotaProvider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./rotaProvider")>();
  const { sampleRotas } = await import("./sampleData");
  return {
    ...actual,
    GeneratedRotaProvider: class {
      async getRotas() {
        return sampleRotas;
      }
    },
  };
});

import App from "./App";
import { sampleRotas, samplePlayers } from "./sampleData";
import { STORAGE_KEY } from "./storage";
import type { Rota, RotaResult, Session } from "./types";

// ----- Fixtures -------------------------------------------------------------

function baseSession(overrides: Partial<Session> = {}): Session {
  return {
    id: "test-session",
    name: "Test Session",
    createdAt: "2026-01-01T00:00:00.000Z",
    pointsPerCourt: 24,
    courtCount: 3,
    players: samplePlayers,
    rotas: [],
    results: [],
    currentRotaNumber: 1,
    ...overrides,
  };
}

// A valid, reloadable result: every court present, each pair totalling 24.
function resultFor(rota: Rota): RotaResult {
  return {
    rotaNumber: rota.rotaNumber,
    scores: rota.courts.map((court) => ({ courtNumber: court.courtNumber, leftScore: 13, rightScore: 11 })),
    submittedAt: "2026-01-02T00:00:00.000Z",
  };
}

function seed(session: Session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

// A valid stored session loads behind the restore screen; clicking "Continue"
// drops the user into the live shell.
async function renderAndContinue(user: ReturnType<typeof userEvent.setup>) {
  render(<App />);
  await user.click(screen.getByRole("button", { name: /continue existing session/i }));
}

// Touch + record every court in the current rota via the accessible controls.
async function recordEveryCourt(user: ReturnType<typeof userEvent.setup>) {
  for (const courtNumber of [1, 2, 3]) {
    await user.click(screen.getByRole("button", { name: `Increase Court ${courtNumber} left score` }));
  }
}

beforeEach(() => {
  localStorage.clear();
});

// ----- Tests ----------------------------------------------------------------

describe("invalid stored session warning", () => {
  it("surfaces a warning and clears the corrupted value", () => {
    localStorage.setItem(STORAGE_KEY, "{ this is not valid session json");

    render(<App />);

    expect(screen.getByText(/invalid and has been reset/i)).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe("setup locks after a generated session starts", () => {
  it("starts scoring, locks setup editing, and gates reset behind the More flow", async () => {
    const user = userEvent.setup();
    seed(baseSession()); // valid setup, no rotas yet
    await renderAndContinue(user);

    // Setup is editable before starting: name, court count, player fields, Add.
    expect(screen.getByRole("textbox", { name: /session name/i })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: /court count/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /player 1 display name/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /start session/i }));

    // Scoring UI for Rota 1 is shown, with exactly one control per court/side
    // (the PR1 DOM-cleanup acceptance criterion).
    expect(await screen.findByRole("button", { name: "Submit Rota 1" })).toBeInTheDocument();
    expect(screen.getAllByRole("spinbutton", { name: "Court 1 left score" })).toHaveLength(1);

    // Setup controls are no longer editable in the active scoring workflow:
    // name, court count, player fields, and the Add/Remove player actions are gone.
    expect(screen.queryByRole("textbox", { name: /session name/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("spinbutton", { name: /court count/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /player 1 display name/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /remove player/i })).not.toBeInTheDocument();

    // Reset to setup is not exposed in the scoring surface itself...
    expect(screen.queryByRole("button", { name: /reset to setup/i })).not.toBeInTheDocument();
    // ...only via the More / Danger flow.
    await user.click(screen.getByRole("button", { name: "More" }));
    const resetButton = screen.getByRole("button", { name: /reset to setup/i });

    // Cancelling keeps scoring active.
    const confirmSpy = vi.spyOn(globalThis, "confirm").mockReturnValue(false);
    await user.click(resetButton);
    await user.click(screen.getByRole("button", { name: "Score" }));
    expect(screen.getByRole("button", { name: "Submit Rota 1" })).toBeInTheDocument();

    // Accepting returns to setup.
    confirmSpy.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "More" }));
    await user.click(screen.getByRole("button", { name: /reset to setup/i }));
    expect(await screen.findByRole("textbox", { name: /session name/i })).toBeInTheDocument();
  });
});

describe("sequential rota access", () => {
  it("unlocks the next rota only after the current one is submitted", async () => {
    const user = userEvent.setup();
    seed(baseSession({ rotas: sampleRotas }));
    await renderAndContinue(user);

    const rotaButtons = () => within(screen.getByRole("navigation", { name: "Rotations" })).getAllByRole("button");

    // Rota 1 is current/accessible; later rotas are locked.
    expect(rotaButtons()[0]).toBeEnabled();
    expect(rotaButtons()[1]).toBeDisabled();
    expect(rotaButtons()[2]).toBeDisabled();

    await recordEveryCourt(user);
    await user.click(screen.getByRole("button", { name: "Submit Rota 1" }));

    // Rota 2 becomes current; Rota 3 stays locked.
    expect(await screen.findByRole("button", { name: "Submit Rota 2" })).toBeInTheDocument();
    expect(rotaButtons()[0]).toBeEnabled(); // submitted rota stays reviewable
    expect(rotaButtons()[1]).toBeEnabled();
    expect(rotaButtons()[2]).toBeDisabled();
  });
});

describe("score submission happy path", () => {
  it("gates submit until every court is recorded, then updates history and standings", async () => {
    const user = userEvent.setup();
    seed(baseSession({ rotas: sampleRotas }));
    await renderAndContinue(user);

    // Submit is gated until the rota's courts are recorded.
    expect(screen.getByRole("button", { name: "Submit Rota 1" })).toBeDisabled();

    await recordEveryCourt(user);
    expect(screen.getByRole("button", { name: "Submit Rota 1" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Submit Rota 1" }));

    // History shows the submitted rota with its court score details and a
    // Review / edit affordance (reviewability — not editability — is the contract).
    await user.click(screen.getByRole("button", { name: "History" }));
    const history = screen.getByRole("heading", { name: "History" }).closest("section") as HTMLElement;
    const rota1Entry = within(history).getByText("Rota 1").closest("article") as HTMLElement;
    expect(within(rota1Entry).getByRole("button", { name: "Review / edit" })).toBeInTheDocument();
    expect(within(rota1Entry).getAllByText("13").length).toBeGreaterThan(0); // recorded left scores
    expect(within(rota1Entry).getAllByText("11").length).toBeGreaterThan(0); // recorded right scores

    // Standings visibly update — Marcus (Court 1 left pair) now has 13 points.
    // Scope to the standings table; the desktop side rail lists names too.
    await user.click(screen.getByRole("button", { name: "Standings" }));
    const marcusRow = within(screen.getByRole("table")).getByText("Marcus Thompson").closest("tr") as HTMLElement;
    expect(within(marcusRow).getByText("13")).toBeInTheDocument();
  });
});

describe("complete phase", () => {
  it("submitting the final rota completes the session while keeping scores reviewable", async () => {
    const user = userEvent.setup();
    seed(
      baseSession({
        rotas: sampleRotas,
        results: [resultFor(sampleRotas[0]), resultFor(sampleRotas[1])],
        currentRotaNumber: 3,
      }),
    );
    await renderAndContinue(user);

    await recordEveryCourt(user);
    await user.click(screen.getByRole("button", { name: "Submit Rota 3" }));

    // Complete UI appears.
    expect(await screen.findByRole("heading", { name: "Session complete" })).toBeInTheDocument();

    // Final standings render (scope to the table; the side rail lists names too).
    await user.click(screen.getByRole("button", { name: "Standings" }));
    expect(within(screen.getByRole("table")).getByText("Marcus Thompson")).toBeInTheDocument();

    // Setup stays locked.
    expect(screen.queryByRole("textbox", { name: /session name/i })).not.toBeInTheDocument();

    // Submitted scores remain visible/reviewable (editability is out of scope):
    // the final rota's court scores and a Review / edit affordance are present.
    await user.click(screen.getByRole("button", { name: "History" }));
    const history = screen.getByRole("heading", { name: "History" }).closest("section") as HTMLElement;
    const rota3Entry = within(history).getByText("Rota 3").closest("article") as HTMLElement;
    expect(within(rota3Entry).getByRole("button", { name: "Review / edit" })).toBeInTheDocument();
    expect(within(rota3Entry).getAllByText("13").length).toBeGreaterThan(0); // recorded left scores
    expect(within(rota3Entry).getAllByText("11").length).toBeGreaterThan(0); // recorded right scores
  });
});
