import type { Session } from "./types";

export const STORAGE_KEY = "padel-americano-session-v1";

export function loadSession(): Session | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as Session;
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}
