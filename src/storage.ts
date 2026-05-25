import type { Session } from "./types";
import { parseImportedSession, validateSessionResults, validateSessionSetup } from "./validation";

export const STORAGE_KEY = "padel-americano-session-v1";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

interface StorageOptions {
  storage?: StorageLike;
}

export interface LoadSessionResult {
  session: Session | null;
  warning?: string;
}

export interface StorageActionResult {
  ok: boolean;
  warning?: string;
}

function resolveStorage(options?: StorageOptions): StorageLike | null {
  if (options?.storage) return options.storage;

  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

function clearCorrupted(storage: StorageLike): string {
  try {
    storage.removeItem(STORAGE_KEY);
    return "Stored session data was invalid and has been reset.";
  } catch {
    return "Stored session data is invalid and could not be cleared automatically.";
  }
}

export function loadSession(options?: StorageOptions): LoadSessionResult {
  const storage = resolveStorage(options);
  if (!storage) {
    return { session: null, warning: "Browser storage is unavailable; saved session data cannot be restored." };
  }

  let stored: string | null;
  try {
    stored = storage.getItem(STORAGE_KEY);
  } catch {
    return { session: null, warning: "Stored session data could not be read from this browser." };
  }

  if (!stored) return { session: null };

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    return { session: null, warning: clearCorrupted(storage) };
  }

  const importResult = parseImportedSession(parsed);
  if (!importResult.value) {
    return { session: null, warning: clearCorrupted(storage) };
  }

  const resultsValidation = validateSessionResults(importResult.value);
  if (!resultsValidation.valid) {
    return { session: null, warning: clearCorrupted(storage) };
  }

  const setupValidation = validateSessionSetup(importResult.value);
  if (!setupValidation.valid && importResult.value.rotas.length > 0) {
    const recovered: Session = {
      ...importResult.value,
      rotas: [],
      results: [],
      currentRotaNumber: 1,
    };
    saveSession(recovered, options);
    return {
      session: recovered,
      warning: "Saved play data was incompatible with the stored player setup and has been cleared. Your players and settings have been kept.",
    };
  }

  return { session: importResult.value };
}

export function saveSession(session: Session, options?: StorageOptions): StorageActionResult {
  const storage = resolveStorage(options);
  if (!storage) {
    return { ok: false, warning: "Browser storage is unavailable; session changes cannot be saved locally." };
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(session));
    return { ok: true };
  } catch {
    return { ok: false, warning: "Could not save session locally. Browser storage may be full or unavailable." };
  }
}

export function clearSession(options?: StorageOptions): StorageActionResult {
  const storage = resolveStorage(options);
  if (!storage) {
    return { ok: false, warning: "Browser storage is unavailable; there is no saved session to clear." };
  }

  try {
    storage.removeItem(STORAGE_KEY);
    return { ok: true };
  } catch {
    return { ok: false, warning: "Could not clear stored session data in this browser." };
  }
}
