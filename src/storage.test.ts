import { describe, expect, it } from "vitest";
import { samplePlayers, sampleRotas } from "./sampleData";
import type { Session } from "./types";
import { STORAGE_KEY, clearSession, loadSession, saveSession } from "./storage";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function createMockStorage(initial: Record<string, string> = {}): {
  storage: StorageLike;
  data: Map<string, string>;
  setThrows: (value: boolean) => void;
  getThrows: (value: boolean) => void;
  removeThrows: (value: boolean) => void;
} {
  const data = new Map<string, string>(Object.entries(initial));
  let throwOnSet = false;
  let throwOnGet = false;
  let throwOnRemove = false;

  const storage: StorageLike = {
    getItem(key: string): string | null {
      if (throwOnGet) throw new Error("getItem failed");
      return data.has(key) ? data.get(key)! : null;
    },
    setItem(key: string, value: string): void {
      if (throwOnSet) throw new Error("setItem failed");
      data.set(key, value);
    },
    removeItem(key: string): void {
      if (throwOnRemove) throw new Error("removeItem failed");
      data.delete(key);
    },
  };

  return {
    storage,
    data,
    setThrows: (value: boolean) => {
      throwOnSet = value;
    },
    getThrows: (value: boolean) => {
      throwOnGet = value;
    },
    removeThrows: (value: boolean) => {
      throwOnRemove = value;
    },
  };
}

const validSession: Session = {
  id: "session-1",
  name: "Test Session",
  createdAt: "2026-05-16T10:00:00.000Z",
  pointsPerCourt: 24,
  courtCount: 3,
  players: [],
  rotas: [],
  results: [],
  currentRotaNumber: 1,
};

describe("storage", () => {
  it("returns null session with no warning on cold start", () => {
    const mock = createMockStorage();
    const result = loadSession({ storage: mock.storage });

    expect(result.session).toBeNull();
    expect(result.warning).toBeUndefined();
  });

  it("loads a valid stored session", () => {
    const mock = createMockStorage({ [STORAGE_KEY]: JSON.stringify(validSession) });
    const result = loadSession({ storage: mock.storage });

    expect(result.session?.id).toBe(validSession.id);
    expect(result.warning).toBeUndefined();
  });

  it("loads a draft setup session without requiring complete setup validation", () => {
    const mock = createMockStorage({ [STORAGE_KEY]: JSON.stringify(validSession) });
    const result = loadSession({ storage: mock.storage });

    expect(result.session?.players).toHaveLength(0);
    expect(result.warning).toBeUndefined();
  });

  it("clears stored sessions with invalid submitted results", () => {
    const invalidSubmittedSession: Session = {
      ...validSession,
      players: samplePlayers,
      rotas: sampleRotas,
      results: [
        {
          rotaNumber: 1,
          submittedAt: "2026-05-16T10:05:00.000Z",
          scores: [
            { courtNumber: 1, leftScore: 15, rightScore: 8 },
            { courtNumber: 2, leftScore: 13, rightScore: 11 },
            { courtNumber: 3, leftScore: 9, rightScore: 15 },
          ],
        },
      ],
    };
    const mock = createMockStorage({ [STORAGE_KEY]: JSON.stringify(invalidSubmittedSession) });
    const result = loadSession({ storage: mock.storage });

    expect(result.session).toBeNull();
    expect(result.warning).toBe("Stored session data was invalid and has been reset.");
    expect(mock.data.has(STORAGE_KEY)).toBe(false);
  });

  it("clears corrupted JSON and returns a warning", () => {
    const mock = createMockStorage({ [STORAGE_KEY]: "{not-valid-json" });
    const result = loadSession({ storage: mock.storage });

    expect(result.session).toBeNull();
    expect(result.warning).toBe("Stored session data was invalid and has been reset.");
    expect(mock.data.has(STORAGE_KEY)).toBe(false);
  });

  it("clears invalid session shape and returns a warning", () => {
    const mock = createMockStorage({ [STORAGE_KEY]: JSON.stringify({ id: "only-id" }) });
    const result = loadSession({ storage: mock.storage });

    expect(result.session).toBeNull();
    expect(result.warning).toBe("Stored session data was invalid and has been reset.");
    expect(mock.data.has(STORAGE_KEY)).toBe(false);
  });

  it("returns warning when storage read fails", () => {
    const mock = createMockStorage();
    mock.getThrows(true);

    const result = loadSession({ storage: mock.storage });
    expect(result.session).toBeNull();
    expect(result.warning).toBe("Stored session data could not be read from this browser.");
  });

  it("returns warning when save fails", () => {
    const mock = createMockStorage();
    mock.setThrows(true);

    const result = saveSession(validSession, { storage: mock.storage });
    expect(result.ok).toBe(false);
    expect(result.warning).toBe("Could not save session locally. Browser storage may be full or unavailable.");
  });

  it("returns warning when clear fails", () => {
    const mock = createMockStorage({ [STORAGE_KEY]: JSON.stringify(validSession) });
    mock.removeThrows(true);

    const result = clearSession({ storage: mock.storage });
    expect(result.ok).toBe(false);
    expect(result.warning).toBe("Could not clear stored session data in this browser.");
  });

  it("loads a session without courtCount and defaults it to 3", () => {
    const sessionWithoutCourtCount = { ...validSession };
    // Remove courtCount to simulate a session stored before this field was added
    const { courtCount: _removed, ...legacySession } = sessionWithoutCourtCount;
    void _removed;
    const mock = createMockStorage({ [STORAGE_KEY]: JSON.stringify(legacySession) });
    const result = loadSession({ storage: mock.storage });

    expect(result.session?.courtCount).toBe(3);
    expect(result.warning).toBeUndefined();
  });

  it("recovers stale rotas: clears rotas/results, preserves players and settings, returns warning", () => {
    const staleSession: Session = {
      ...validSession,
      name: "My Session",
      pointsPerCourt: 24,
      courtCount: 3,
      players: samplePlayers,
      // Rotas have courtCount=3 but session now has courtCount=2 (simulates mismatch after court count change)
      rotas: sampleRotas,
      results: [],
      currentRotaNumber: 1,
    };
    // Force invalid setup by overriding courtCount to 2 (rotas have 3 courts each → mismatch)
    const invalidCourtCountSession = { ...staleSession, courtCount: 2 };
    const mock = createMockStorage({ [STORAGE_KEY]: JSON.stringify(invalidCourtCountSession) });
    const result = loadSession({ storage: mock.storage });

    expect(result.session).not.toBeNull();
    expect(result.session?.rotas).toHaveLength(0);
    expect(result.session?.results).toHaveLength(0);
    expect(result.session?.players).toHaveLength(samplePlayers.length);
    expect(result.session?.name).toBe("My Session");
    expect(result.warning).toBe("Saved play data was incompatible with the stored player setup and has been cleared. Your players and settings have been kept.");
  });
});
