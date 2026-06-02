// Global setup for jsdom-based component tests.
// Kept intentionally minimal — see ADR-006 for the RTL placement/constraint rules.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  // Unmount anything rendered this test (also runs effect cleanups, clearing timers).
  cleanup();

  // Reset persisted state so each test starts from a clean browser.
  localStorage.clear();
  sessionStorage.clear();

  // Reset the URL to the app root; the app reads ?mode= via parseAppMode().
  globalThis.history.replaceState(null, "", "/");

  // Undo fake timers and spies so they never leak across tests.
  vi.useRealTimers();
  vi.restoreAllMocks();
});
