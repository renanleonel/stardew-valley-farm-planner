import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Eraser,
  Eye,
  Grid3X3,
  Hand,
  Maximize2,
  MousePointer2,
  Radar,
  Redo2,
  RotateCcw,
  Settings2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanFiles } from "@/containers/planner/components/plan-files";
import { ReportIssue } from "@/containers/planner/components/report-issue";
import { MapId, Season, Tool } from "@/containers/planner/domain/enums/planner";
import type { MapIndex } from "@/containers/planner/domain/schemas/assets";
import type { ReportIssueContext } from "@/containers/planner/lib/report-issue";

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
  onResetMap,
  reportIssueContext,
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
  onResetMap: () => void;
  reportIssueContext: ReportIssueContext;
  interiorTitle?: string;
  onBackToFarm: () => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const settingsButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!settingsOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setSettingsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setSettingsOpen(false);
        settingsButton.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [settingsOpen]);

  const tools = [
    { id: Tool.SELECT, icon: MousePointer2, label: "Select (V)" },
    { id: Tool.ERASE, icon: Eraser, label: "Erase (E)" },
    { id: Tool.PAN, icon: Hand, label: "Pan (P)" },
  ];
  return (
    <div ref={root} className="absolute right-3 top-3 z-20 text-parchment">
      <div
        className="planner-toolbar flex items-center gap-0.5 rounded-xl border border-forest-700 bg-forest-950/95 p-1 shadow-lg"
        role="toolbar"
        aria-label="Editor tools"
      >
        {tools.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={tool === id}
            onClick={() => onTool(id)}
            className={`planner-toolbar-button grid size-9 place-items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${tool === id ? "bg-forest-700 text-parchment" : "text-mist hover:bg-forest-800 hover:text-parchment"}`}
          >
            <Icon aria-hidden="true" className="size-[18px]" />
          </button>
        ))}
        <span aria-hidden="true" className="mx-1 h-6 w-px bg-forest-700" />
        <button
          type="button"
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
          onClick={onUndo}
          disabled={!canUndo}
          className="planner-toolbar-button grid size-9 place-items-center rounded-lg text-mist hover:bg-forest-800 hover:text-parchment disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-amber-300"
        >
          <Undo2 aria-hidden="true" className="size-[18px]" />
        </button>
        <button
          type="button"
          title="Redo (Ctrl+Y)"
          aria-label="Redo"
          onClick={onRedo}
          disabled={!canRedo}
          className="planner-toolbar-button grid size-9 place-items-center rounded-lg text-mist hover:bg-forest-800 hover:text-parchment disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-amber-300"
        >
          <Redo2 aria-hidden="true" className="size-[18px]" />
        </button>
        <span aria-hidden="true" className="mx-1 h-6 w-px bg-forest-700" />
        <button
          ref={settingsButton}
          type="button"
          title="Farm settings"
          aria-label="Farm settings"
          aria-expanded={settingsOpen}
          aria-controls="farm-settings"
          onClick={() => setSettingsOpen((open) => !open)}
          className={`planner-toolbar-button grid size-9 place-items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${settingsOpen ? "bg-forest-700 text-parchment" : "text-mist hover:bg-forest-800 hover:text-parchment"}`}
        >
          <Settings2 aria-hidden="true" className="size-[18px]" />
        </button>
      </div>
      <div
        id="farm-settings"
        data-open={settingsOpen}
        aria-hidden={!settingsOpen}
        inert={!settingsOpen}
        className="planner-settings absolute right-0 top-full mt-2 max-h-[calc(100dvh-5.5rem)] w-[min(19rem,calc(100vw-1.5rem))] overflow-y-auto rounded-xl border border-forest-700 bg-forest-900 p-4 shadow-xl"
      >
        <h2 className="font-display text-lg font-bold">Farm settings</h2>
        <div className="mt-3 space-y-3">
          {interiorTitle ? (
            <Button
              variant="secondary"
              className="w-full justify-start text-sm"
              onClick={() => {
                onBackToFarm();
                setSettingsOpen(false);
              }}
              title={interiorTitle}
            >
              <ArrowLeft className="size-4" /> Back to farm
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
                className="mt-1.5 h-10 w-full rounded-lg border border-forest-600 bg-forest-950 px-3 text-base text-parchment focus-visible:outline-2 focus-visible:outline-amber-300 sm:text-sm"
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
              className="mt-1.5 h-10 w-full rounded-lg border border-forest-600 bg-forest-950 px-3 text-base text-parchment focus-visible:outline-2 focus-visible:outline-amber-300 sm:text-sm"
            >
              {Object.values(Season).map((option) => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 border-t border-forest-700 pt-3">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-200">
            View
          </h3>
          <div className="flex gap-1.5">
            {[
              { label: "Zoom out", icon: ZoomOut, action: onZoomOut },
              { label: "Fit farm to view", icon: Maximize2, action: onFit },
              { label: "Zoom in", icon: ZoomIn, action: onZoomIn },
            ].map(({ label, icon: Icon, action }) => (
              <button
                key={label}
                type="button"
                title={label}
                aria-label={label}
                onClick={action}
                className="grid size-10 flex-1 place-items-center rounded-lg bg-forest-800 text-mist hover:text-parchment focus-visible:outline-2 focus-visible:outline-amber-300"
              >
                <Icon className="size-4" />
              </button>
            ))}
          </div>
          <div className="mt-2 space-y-1">
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
                aria-pressed={enabled}
                onClick={action}
                className="flex min-h-10 w-full items-center gap-3 rounded-lg px-2 text-left text-sm text-mist hover:bg-forest-800 hover:text-parchment focus-visible:outline-2 focus-visible:outline-amber-300"
              >
                <Icon className="size-4" />
                <span className="flex-1">{label}</span>
                <span className={enabled ? "text-amber-200" : "text-mist"}>
                  {enabled ? "On" : "Off"}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2 border-t border-forest-700">
          <PlanFiles
            onExportPng={onExportPng}
            onExportJson={onExportJson}
            onImportJson={onImportJson}
          />
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={onResetMap}
          >
            <RotateCcw className="size-4" /> Reset current farm
          </Button>
          <div className="mt-3">
            <ReportIssue context={reportIssueContext} />
          </div>
          <p className="mt-3 text-center text-xs text-mist">
            Changes save on this device · Game{" "}
            {mapIndex.gameVersion.split(",")[0]}
          </p>
        </div>
      </div>
    </div>
  );
}
