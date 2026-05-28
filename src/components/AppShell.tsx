import type { ReactNode } from "react";
import {
  ClipboardList,
  History as HistoryIcon,
  MoreHorizontal,
  Trophy,
} from "lucide-react";
import { isRotaAccessible } from "../sessionPhase";
import type { Rota, RotaResult } from "../types";

/**
 * App shell — top app bar + rota strip + tabbed body + bottom tab bar.
 *
 * Scope: chrome only. The body slot receives whatever surface is currently
 * active (Score / Standings / History / More) and the shell does not own
 * that content. Court-card visuals, sticky submit bar, standings-list
 * redesign, etc. are PR3+.
 *
 * Layout:
 *  - Phone (<1080 px): single column; tab bar sticky at the bottom;
 *    app bar + rota strip sticky at the top.
 *  - Desktop (>=1080 px): tab bar moves to a horizontal row directly
 *    under the rota strip; an optional 320 px side rail rides along to
 *    the right of the main column.
 */

export type ShellTab = "score" | "standings" | "history" | "more";

interface RotaStripProps {
  readonly rotas: Rota[];
  readonly results: RotaResult[];
  readonly currentRotaNumber: number;
  readonly selectedRotaNumber: number;
  readonly onSelect: (rotaNumber: number) => void;
}

type RotaStatus = "submitted" | "current" | "open" | "locked";

function deriveRotaStatus(
  rota: Rota,
  currentRotaNumber: number,
  rotas: Rota[],
  results: RotaResult[],
): RotaStatus {
  if (results.some((r) => r.rotaNumber === rota.rotaNumber)) return "submitted";
  if (!isRotaAccessible(rota, rotas, results)) return "locked";
  if (rota.rotaNumber === currentRotaNumber) return "current";
  return "open";
}

function rotaStatusLabel(status: RotaStatus): string {
  if (status === "submitted") return "Done";
  if (status === "current") return "Scoring";
  if (status === "locked") return "Locked";
  return "Open";
}

export function RotaStrip({
  rotas,
  results,
  currentRotaNumber,
  selectedRotaNumber,
  onSelect,
}: RotaStripProps) {
  if (rotas.length === 0) return null;
  return (
    <nav className="shell-rota-strip" aria-label="Rotations">
      {rotas.map((rota) => {
        const status = deriveRotaStatus(rota, currentRotaNumber, rotas, results);
        const isSelected = rota.rotaNumber === selectedRotaNumber;
        const className = [
          "rota-step",
          status,
          isSelected ? "selected" : "",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <button
            key={rota.rotaNumber}
            type="button"
            className={className}
            aria-current={isSelected ? "step" : undefined}
            disabled={status === "locked"}
            onClick={() => onSelect(rota.rotaNumber)}
          >
            <span className="dot" aria-hidden="true" />
            <span className="num">{rota.rotaNumber}</span>
            <span className="state">{rotaStatusLabel(status)}</span>
          </button>
        );
      })}
    </nav>
  );
}

interface AppShellProps {
  readonly sessionName: string;
  readonly meta: string;
  readonly leadingAction?: ReactNode;
  readonly trailingAction?: ReactNode;
  readonly rotaStrip?: ReactNode;
  readonly notice?: ReactNode;
  readonly sideRail?: ReactNode;
  readonly activeTab: ShellTab;
  readonly onTabChange: (tab: ShellTab) => void;
  readonly children: ReactNode;
}

const TAB_DEFS: { id: ShellTab; label: string; render: () => ReactNode }[] = [
  { id: "score", label: "Score", render: () => <ClipboardList size={22} aria-hidden="true" /> },
  { id: "standings", label: "Standings", render: () => <Trophy size={22} aria-hidden="true" /> },
  { id: "history", label: "History", render: () => <HistoryIcon size={22} aria-hidden="true" /> },
  { id: "more", label: "More", render: () => <MoreHorizontal size={22} aria-hidden="true" /> },
];

export function AppShell({
  sessionName,
  meta,
  leadingAction,
  trailingAction,
  rotaStrip,
  notice,
  sideRail,
  activeTab,
  onTabChange,
  children,
}: AppShellProps) {
  return (
    <div className="bs-shell" data-active-tab={activeTab}>
      <header className="shell-app-bar">
        <div className="shell-app-bar__lead">{leadingAction}</div>
        <div className="shell-app-bar__title">
          <div className="session-name">{sessionName}</div>
          {meta && <div className="session-progress">{meta}</div>}
        </div>
        <div className="shell-app-bar__trail">{trailingAction}</div>
      </header>

      {rotaStrip}

        <div className="shell-tab-bar" aria-label="App sections" role="tablist">
        {TAB_DEFS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`shell-panel-${tab.id}`}
              id={`shell-tab-${tab.id}`}
              className={isActive ? "tab current" : "tab"}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.render()}
              <span>{tab.label}</span>
            </button>
          );
        })}
        </div>

      {notice && <div className="shell-notice">{notice}</div>}

      <div className="shell-body">
        <main
          className="shell-main"
          role="tabpanel"
          id={`shell-panel-${activeTab}`}
          aria-labelledby={`shell-tab-${activeTab}`}
        >
          {children}
        </main>
        {sideRail && <aside className="shell-rail" aria-label="Live standings">{sideRail}</aside>}
      </div>
    </div>
  );
}
