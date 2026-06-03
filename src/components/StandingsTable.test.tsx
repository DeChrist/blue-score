import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { StandingRow } from "../types";
import { StandingsTable } from "./StandingsTable";

// jsdom ignores responsive CSS, so BOTH the mobile <ol> and the desktop <table>
// render. Every duplicate-prone query is scoped to one surface via these.
const list = () => screen.getByRole("list", { name: "Standings list" });
const table = () => screen.getByRole("table", { name: "Standings table" });
const listNames = () => within(list()).getAllByRole("listitem").map((li) => li.textContent ?? "");

function row(overrides: Partial<StandingRow> = {}): StandingRow {
  return {
    playerId: "p",
    displayName: "Player",
    rank: 1,
    totalPoints: 0,
    rotasPlayed: 0,
    rotasSatOut: 0,
    averagePointsWhenPlaying: 0,
    ...overrides,
  };
}

const ana = row({ playerId: "a", displayName: "Ana", rank: 2, totalPoints: 20, averagePointsWhenPlaying: 5 });
const ben = row({ playerId: "b", displayName: "Ben", rank: 1, totalPoints: 30, averagePointsWhenPlaying: 6 });
const cleo = row({ playerId: "c", displayName: "Cleo", rank: 3, totalPoints: 20, averagePointsWhenPlaying: 10 });

describe("StandingsTable", () => {
  it("renders a defensive empty state with no list or table", () => {
    render(<StandingsTable standings={[]} />);

    expect(screen.getByText("No standings yet")).toBeInTheDocument();
    expect(screen.getByText("Submit a rota to see results.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("defaults to highest points first", () => {
    render(<StandingsTable standings={[ana, ben, cleo]} />);

    const names = listNames();
    expect(names[0]).toContain("Ben"); // 30
    expect(names[1]).toContain("Ana"); // 20, rank 2
    expect(names[2]).toContain("Cleo"); // 20, rank 3
    expect(screen.getByRole("button", { name: "Points" })).toHaveAttribute("aria-pressed", "true");
  });

  it("reorders by average when the Avg sort is selected", async () => {
    const user = userEvent.setup();
    render(<StandingsTable standings={[ana, ben, cleo]} />);

    await user.click(screen.getByRole("button", { name: "Avg" }));

    const names = listNames();
    expect(names[0]).toContain("Cleo"); // 10
    expect(names[1]).toContain("Ben"); // 6
    expect(names[2]).toContain("Ana"); // 5
    expect(screen.getByRole("button", { name: "Avg" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Points" })).toHaveAttribute("aria-pressed", "false");
  });

  it("reorders alphabetically when the Name sort is selected", async () => {
    const user = userEvent.setup();
    render(<StandingsTable standings={[cleo, ben, ana]} />);

    await user.click(screen.getByRole("button", { name: "Name" }));

    const names = listNames();
    expect(names[0]).toContain("Ana");
    expect(names[1]).toContain("Ben");
    expect(names[2]).toContain("Cleo");
  });

  it("exposes the full numeric columns on the desktop table", () => {
    render(<StandingsTable standings={[ana, ben, cleo]} />);

    for (const heading of ["Rank", "Player", "Points", "Played", "Sat out", "Avg"]) {
      expect(within(table()).getByRole("columnheader", { name: heading })).toBeInTheDocument();
    }
    // Rank stays a plain numeric row header — no trophy/decoration.
    const benRow = within(table()).getByText("Ben").closest("tr") as HTMLElement;
    expect(within(benRow).getByRole("rowheader")).toHaveTextContent("1");
  });
});
