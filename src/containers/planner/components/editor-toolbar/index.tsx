import {
  ArrowLeft,
  Bug,
  Eraser,
  Eye,
  Grid3X3,
  Hand,
  Leaf,
  Maximize2,
  MousePointer2,
  PanelRightClose,
  Radar,
  Redo2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanFiles } from "@/containers/planner/components/plan-files";
import { MapId, Season, Tool } from "@/containers/planner/domain/enums/planner";
import type { MapIndex } from "@/containers/planner/domain/schemas/assets";

export function EditorToolbar({
  tool,
  grid,
  overlay,
  coverage,
  canUndo,
  canRedo,
  mapId,
  season,
  mapIndex,
  onTool,
  onGrid,
  onOverlay,
  onCoverage,
  onUndo,
  onRedo,
  onMap,
  onSeason,
  onZoomIn,
  onZoomOut,
  onFit,
  onExportPng,
  onExportJson,
  onImportJson,
  onCollapse,
  reportIssueUrl,
  interiorTitle,
  onBackToFarm,
}: {
  tool: Tool;
  grid: boolean;
  overlay: boolean;
  coverage: boolean;
  canUndo: boolean;
  canRedo: boolean;
  mapId: MapId;
  season: Season;
  mapIndex: MapIndex;
  onTool: (tool: Tool) => void;
  onGrid: () => void;
  onOverlay: () => void;
  onCoverage: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onMap: (map: MapId) => void;
  onSeason: (season: Season) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onExportPng: () => void;
  onExportJson: () => void;
  onImportJson: () => void;
  onCollapse: () => void;
  reportIssueUrl?: string;
  interiorTitle?: string;
  onBackToFarm: () => void;
}) {
  const tools = [
    { tool: Tool.SELECT, icon: MousePointer2, label: "Select", shortcut: "V" },
    { tool: Tool.ERASE, icon: Eraser, label: "Erase", shortcut: "E" },
    { tool: Tool.PAN, icon: Hand, label: "Pan", shortcut: "P" },
  ];
  return (
    <div className="flex h-full min-h-0 flex-col bg-forest-900 text-parchment">
      <div className="flex items-start gap-3 border-b border-forest-700 px-4 pb-4 pt-5">
        <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-forest-700 text-amber-200">
          <Leaf aria-hidden="true" className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-bold leading-none">
            Farm planner
          </h2>
          <p className="mt-2 text-xs text-mist">
            Game {mapIndex.gameVersion.split(",")[0]}
          </p>
        </div>
        <Button
          size="compact"
          variant="ghost"
          onClick={onCollapse}
          title="Collapse tools"
          aria-label="Collapse tools"
        >
          <PanelRightClose className="size-4" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Farm</h2>
          {interiorTitle ? (
            <Button
              variant="secondary"
              className="w-full justify-start text-xs"
              onClick={onBackToFarm}
              aria-label="Back to farm"
              title={interiorTitle}
            >
              <ArrowLeft className="size-4" />
              <span className="truncate text-xs">{interiorTitle}</span>
            </Button>
          ) : (
            <label className="block text-xs font-medium text-mist">
              Map
              <select
                value={mapId}
                onChange={(event) => {
                  const found = mapIndex.maps.find(
                    (entry) => entry.id === event.target.value,
                  );
                  if (found) onMap(found.id);
                }}
                aria-label="Farm map"
                className="mt-1.5 h-10 w-full rounded-lg border border-forest-600 bg-forest-950 px-3 text-base font-medium text-parchment focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 lg:text-sm"
              >
                {mapIndex.maps.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-xs font-medium text-mist">
            Season
            <select
              value={season}
              onChange={(event) => {
                const found = Object.values(Season).find(
                  (option) => option === event.target.value,
                );
                if (found) onSeason(found);
              }}
              aria-label="Season"
              className="mt-1.5 h-10 w-full rounded-lg border border-forest-600 bg-forest-950 px-3 text-base font-medium text-parchment focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 lg:text-sm"
            >
              {Object.values(Season).map((option) => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Edit</h2>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-forest-950 p-1">
            {tools.map(({ tool: option, icon: Icon, label, shortcut }) => (
              <Button
                key={option}
                size="default"
                variant={tool === option ? "selected" : "ghost"}
                onClick={() => onTool(option)}
                title={`${label} (${shortcut})`}
                aria-label={`${label} (${shortcut})`}
                aria-pressed={tool === option}
                className="h-14 flex-col gap-1 px-1 text-xs"
              >
                <Icon aria-hidden="true" className="size-4" />
                {label}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
              className="h-10 text-xs"
            >
              <Undo2 aria-hidden="true" className="size-4" /> Undo
            </Button>
            <Button
              variant="secondary"
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              aria-label="Redo"
              className="h-10 text-xs"
            >
              <Redo2 aria-hidden="true" className="size-4" /> Redo
            </Button>
          </div>
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Display</h2>
          <div className="space-y-1">
            {[
              {
                label: "Tile grid",
                icon: Grid3X3,
                enabled: grid,
                action: onGrid,
              },
              {
                label: "Buildable tiles",
                icon: Eye,
                enabled: overlay,
                action: onOverlay,
              },
              {
                label: "Item coverage",
                icon: Radar,
                enabled: coverage,
                action: onCoverage,
              },
            ].map(({ label, icon: Icon, enabled, action }) => (
              <button
                key={label}
                type="button"
                onClick={action}
                aria-pressed={enabled}
                className="flex min-h-10 w-full items-center gap-3 rounded-lg px-2 text-left text-xs text-mist hover:bg-forest-800 hover:text-parchment focus-visible:outline-2 focus-visible:outline-amber-300"
              >
                <Icon aria-hidden="true" className="size-4" />
                <span className="flex-1">{label}</span>
                <span
                  className={
                    enabled ? "font-semibold text-amber-200" : "text-mist"
                  }
                >
                  {enabled ? "On" : "Off"}
                </span>
              </button>
            ))}
          </div>
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Zoom</h2>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="secondary"
              onClick={onZoomOut}
              title="Zoom out"
              aria-label="Zoom out"
              className="h-10 px-1 text-xs"
            >
              <ZoomOut aria-hidden="true" className="size-4" /> Out
            </Button>
            <Button
              variant="secondary"
              onClick={onFit}
              title="Fit farm to view"
              aria-label="Fit farm to view"
              className="h-10 px-1 text-xs"
            >
              <Maximize2 aria-hidden="true" className="size-4" /> Fit
            </Button>
            <Button
              variant="secondary"
              onClick={onZoomIn}
              title="Zoom in"
              aria-label="Zoom in"
              className="h-10 px-1 text-xs"
            >
              <ZoomIn aria-hidden="true" className="size-4" /> In
            </Button>
          </div>
        </section>
        <PlanFiles
          onExportPng={onExportPng}
          onExportJson={onExportJson}
          onImportJson={onImportJson}
        />
      </div>
      <div className="border-t border-forest-700 px-4 py-3">
        {reportIssueUrl && (
          <Button asChild variant="secondary" className="w-full text-xs">
            <a href={reportIssueUrl}>
              <Bug aria-hidden="true" className="size-4" /> Report issue
            </a>
          </Button>
        )}
        <div className="space-y-1 text-center text-xs text-mist">
          {reportIssueUrl && <p className="mt-2">Opens an email draft</p>}
          <p>Changes save on this device</p>
        </div>
      </div>
    </div>
  );
}
