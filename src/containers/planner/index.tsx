import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { PanelLeftOpen, PanelRightOpen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/error-boundary";
import { FarmCanvas } from "@/containers/planner/components/farm-canvas";
import type { FarmCanvasHandle } from "@/containers/planner/components/farm-canvas";
import { EditorToolbar } from "@/containers/planner/components/editor-toolbar";
import { ItemPalette } from "@/containers/planner/components/item-palette";
import { PlannerSkeleton } from "@/containers/planner/components/planner-skeleton";
import { SelectionInspector } from "@/containers/planner/components/selection-inspector";
import { ItemKind, Tool } from "@/containers/planner/domain/enums/planner";
import {
  currentPlan,
  editInterior,
  interiorScenePlan,
} from "@/containers/planner/domain/entities/plan";
import type { FarmPlan } from "@/containers/planner/domain/schemas/plan";
import { PlanRepository } from "@/containers/planner/domain/repositories/plan";
import {
  EditorProvider,
  useEditor,
} from "@/containers/planner/hooks/use-editor";
import {
  eraseAt,
  itemById,
  movePlacements,
  placeItem,
} from "@/containers/planner/lib/placement";
import {
  REPORT_ISSUE_EMAIL,
  reportIssueHref,
} from "@/containers/planner/lib/report-issue";
import {
  useCatalogSuspense,
  useMapIndexSuspense,
  useSceneMapSuspense,
} from "@/containers/planner/queries";

function downloadJson(filename: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function PlannerContent() {
  const { state, dispatch } = useEditor();
  const plan = currentPlan(state.store);
  const { data: index } = useMapIndexSuspense();
  const { data: catalog } = useCatalogSuspense();
  const [inside, setInside] = useState<{
    buildingId: string;
    mapId: string;
    title: string;
  } | null>(null);
  const { data: map } = useSceneMapSuspense(
    state.store.activeMapId,
    inside?.mapId,
  );
  const canvas = useRef<FarmCanvasHandle>(null);
  const input = useRef<HTMLInputElement>(null);
  const leftPanel = useRef<HTMLElement>(null);
  const rightPanel = useRef<HTMLElement>(null);
  const [narrow, setNarrow] = useState(
    () => window.matchMedia("(max-width: 1023px)").matches,
  );
  const [leftOpen, setLeftOpen] = useState(
    () => !window.matchMedia("(max-width: 1023px)").matches,
  );
  const [rightOpen, setRightOpen] = useState(
    () => !window.matchMedia("(max-width: 1023px)").matches,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const closeLeft = useCallback(() => {
    setLeftOpen(false);
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLButtonElement>('[data-panel-trigger="library"]')
        ?.focus(),
    );
  }, []);
  const closeRight = useCallback(() => {
    setRightOpen(false);
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLButtonElement>('[data-panel-trigger="tools"]')
        ?.focus(),
    );
  }, []);
  const trapPanelFocus = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (!narrow || event.key !== "Tab") return;
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        "button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]",
      ),
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  const scenePlan = inside ? interiorScenePlan(plan, inside.buildingId) : plan;
  const paletteItems = inside
    ? catalog.items.filter(
        (item) =>
          item.indoor !== false &&
          (item.indoor || item.kind === ItemKind.FLOOR),
      )
    : catalog.items.filter((item) => item.outdoor !== false);
  const activeItem = paletteItems.find(
    (item) => item.id === state.activeItemId,
  );
  const editScene = useCallback(
    (update: (scene: FarmPlan) => FarmPlan) => {
      dispatch({
        type: "edit",
        update: (previous) =>
          inside
            ? editInterior(previous, inside.buildingId, update)
            : update(previous),
      });
    },
    [dispatch, inside],
  );
  const selected =
    state.selectedIds.length === 1
      ? scenePlan.placements.find(
          (placed) => placed.id === state.selectedIds[0],
        )
      : undefined;
  const selectedItem = selected && itemById(catalog, selected.itemId);
  const selectedInteriorId =
    !inside && selectedItem?.interior
      ? selectedItem.id === "building:Farmhouse"
        ? selected?.variant === "kitchen"
          ? "farmhouse1"
          : selected?.variant === "final"
            ? "farmhouse2"
            : "farmhouse"
        : selectedItem.interior
      : undefined;

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const onChange = () => {
      setNarrow(media.matches);
      setLeftOpen(!media.matches);
      setRightOpen(!media.matches);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!narrow) return;
    const panel = leftOpen
      ? leftPanel.current
      : rightOpen
        ? rightPanel.current
        : null;
    panel?.querySelector<HTMLElement>("button")?.focus();
  }, [narrow, leftOpen, rightOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest('input, select, textarea, [contenteditable="true"]')
      )
        return;
      if (event.ctrlKey || event.metaKey) {
        if (event.key.toLowerCase() === "z") {
          event.preventDefault();
          dispatch({ type: event.shiftKey ? "redo" : "undo" });
        }
        if (event.key.toLowerCase() === "y") {
          event.preventDefault();
          dispatch({ type: "redo" });
        }
        return;
      }
      if (event.key.toLowerCase() === "v")
        dispatch({ type: "tool", tool: Tool.SELECT });
      if (event.key.toLowerCase() === "e")
        dispatch({ type: "tool", tool: Tool.ERASE });
      if (event.key.toLowerCase() === "p")
        dispatch({ type: "tool", tool: Tool.PAN });
      if (event.key.toLowerCase() === "g") dispatch({ type: "grid" });
      if (event.key === "Escape" && narrow) {
        if (leftOpen) closeLeft();
        if (rightOpen) closeRight();
      }
      if (event.key === "Delete" && state.selectedIds.length) {
        const ids = new Set(state.selectedIds);
        editScene((previous) => ({
          ...previous,
          placements: previous.placements.filter(
            (placed) => !ids.has(placed.id),
          ),
        }));
        dispatch({ type: "select" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    closeLeft,
    closeRight,
    dispatch,
    editScene,
    leftOpen,
    narrow,
    rightOpen,
    state.selectedIds,
  ]);

  const editAt = (tile: { x: number; y: number }) => {
    if (state.tool === Tool.ERASE)
      editScene((previous) => eraseAt(previous, catalog, tile.x, tile.y));
    if (state.tool === Tool.PLACE && activeItem) {
      editScene((previous) =>
        placeItem(previous, map, catalog, activeItem, tile.x, tile.y),
      );
    }
  };

  const importJson = async (file: File) => {
    try {
      const store = PlanRepository.import(await file.text());
      dispatch({ type: "load", store });
      setInside(null);
      setNotice("Plan imported");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? `Import failed: ${error.message}`
          : "Import failed",
      );
    }
  };

  return (
    <div className="relative flex h-dvh min-h-0 overflow-hidden bg-forest-950 text-parchment">
      <h1 className="sr-only">Stardew farm planner</h1>
      {narrow && (leftOpen || rightOpen) && (
        <button
          className="fixed inset-0 z-20 bg-black/60"
          onClick={() => {
            if (leftOpen) closeLeft();
            if (rightOpen) closeRight();
          }}
          aria-label="Close side panel"
        />
      )}
      <div className="flex min-h-0 flex-1">
        {leftOpen && (
          <aside
            ref={leftPanel}
            onKeyDown={trapPanelFocus}
            className={
              narrow
                ? "fixed inset-y-0 left-0 z-30 w-[min(21rem,90vw)] border-r border-forest-700 shadow-2xl"
                : "w-76 shrink-0 border-r border-forest-700"
            }
            aria-label="Item library"
          >
            <ItemPalette
              key={inside ? "interior" : "farm"}
              items={paletteItems}
              season={plan.season}
              activeId={state.activeItemId}
              interior={Boolean(inside)}
              onChoose={(id) => dispatch({ type: "item", id })}
              onClose={narrow ? closeLeft : undefined}
              onCollapse={narrow ? undefined : closeLeft}
            />
          </aside>
        )}
        <main
          className="relative min-w-0 flex-1"
          inert={narrow && (leftOpen || rightOpen)}
        >
          <div className="relative h-full min-h-0">
            {!leftOpen && (
              <Button
                variant="secondary"
                className="absolute left-3 top-3 z-10 h-10 bg-forest-950/95 px-3 shadow-lg"
                onClick={() => {
                  if (narrow) setRightOpen(false);
                  setLeftOpen(true);
                }}
                data-panel-trigger="library"
                title="Open item library"
                aria-label="Open item library"
              >
                <PanelLeftOpen aria-hidden="true" className="size-4" />
                Library
              </Button>
            )}
            {!rightOpen && (
              <Button
                variant="secondary"
                className="absolute right-3 top-3 z-10 h-10 bg-forest-950/95 px-3 shadow-lg"
                onClick={() => {
                  if (narrow) setLeftOpen(false);
                  setRightOpen(true);
                }}
                data-panel-trigger="tools"
                title="Open tools"
                aria-label="Open tools"
              >
                Tools
                <PanelRightOpen aria-hidden="true" className="size-4" />
              </Button>
            )}
            {narrow && !leftOpen && !rightOpen && (
              <div className="pointer-events-none absolute left-1/2 top-20 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-forest-950/90 px-3 py-2 text-center text-xs text-parchment shadow-lg">
                <span className="font-semibold">
                  {inside?.title ?? map.name}
                </span>
                <span className="mx-2 text-mist">·</span>
                <span className="capitalize text-mist">{plan.season}</span>
              </div>
            )}
            <FarmCanvas
              ref={canvas}
              map={map}
              catalog={catalog}
              plan={scenePlan}
              tool={state.tool}
              activeItem={activeItem}
              selectedIds={state.selectedIds}
              grid={state.grid}
              buildableOverlay={state.buildableOverlay}
              coverageOverlay={state.coverageOverlay}
              onBeginStroke={() => dispatch({ type: "begin" })}
              onEndStroke={() => dispatch({ type: "end" })}
              onEditAt={editAt}
              onSelect={(id, mode) => dispatch({ type: "select", id, mode })}
              onCancelSelection={() => dispatch({ type: "cancel-selection" })}
              onMove={(id, tile) =>
                editScene((previous) => {
                  const placed = previous.placements.find(
                    (candidate) => candidate.id === id,
                  );
                  if (!placed) return previous;
                  const ids = state.selectedIds.includes(id)
                    ? state.selectedIds
                    : [id];
                  return movePlacements(
                    previous,
                    map,
                    catalog,
                    ids,
                    tile.x - placed.x,
                    tile.y - placed.y,
                  );
                })
              }
            />
            {selected && selectedItem && (
              <SelectionInspector
                placement={selected}
                item={selectedItem}
                onVariant={(variant) =>
                  editScene((previous) => ({
                    ...previous,
                    placements: previous.placements.map((placed) =>
                      placed.id === selected.id
                        ? { ...placed, variant }
                        : placed,
                    ),
                  }))
                }
                onRotate={() =>
                  editScene((previous) => ({
                    ...previous,
                    placements: previous.placements.map((placed) =>
                      placed.id === selected.id
                        ? { ...placed, rotation: (placed.rotation + 1) % 4 }
                        : placed,
                    ),
                  }))
                }
                onEnterInterior={
                  selectedInteriorId
                    ? () => {
                        setInside({
                          buildingId: selected.id,
                          mapId: selectedInteriorId,
                          title: `${selectedItem.name} interior`,
                        });
                        dispatch({ type: "select" });
                      }
                    : undefined
                }
                onRemove={() => {
                  editScene((previous) => ({
                    ...previous,
                    placements: previous.placements.filter(
                      (placed) => placed.id !== selected.id,
                    ),
                  }));
                  dispatch({ type: "select" });
                }}
              />
            )}
            {state.selectedIds.length > 1 && (
              <div className="absolute right-3 top-16 w-56 rounded-xl bg-forest-950/95 p-4 text-parchment shadow-xl">
                <h2 className="font-display text-lg font-bold leading-5">
                  {state.selectedIds.length} items
                </h2>
                <p className="mt-2 text-xs leading-4 text-mist">
                  Drag one to move the group. Shift-click to change the
                  selection.
                </p>
                <Button
                  variant="danger"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => {
                    const ids = new Set(state.selectedIds);
                    editScene((previous) => ({
                      ...previous,
                      placements: previous.placements.filter(
                        (placed) => !ids.has(placed.id),
                      ),
                    }));
                    dispatch({ type: "select" });
                  }}
                >
                  <Trash2 className="size-3.5" /> Remove selected
                </Button>
              </div>
            )}
          </div>
        </main>
        {rightOpen && (
          <aside
            ref={rightPanel}
            onKeyDown={trapPanelFocus}
            className={
              narrow
                ? "fixed inset-y-0 right-0 z-30 w-[min(19rem,90vw)] border-l border-forest-700 shadow-2xl"
                : "w-68 shrink-0 border-l border-forest-700"
            }
            aria-label="Planner tools"
          >
            <EditorToolbar
              tool={state.tool}
              grid={state.grid}
              overlay={state.buildableOverlay}
              coverage={state.coverageOverlay}
              canUndo={state.past.length > 0}
              canRedo={state.future.length > 0}
              mapId={state.store.activeMapId}
              season={plan.season}
              mapIndex={index}
              onTool={(tool) => dispatch({ type: "tool", tool })}
              onGrid={() => dispatch({ type: "grid" })}
              onOverlay={() => dispatch({ type: "overlay" })}
              onCoverage={() => dispatch({ type: "coverage" })}
              onUndo={() => dispatch({ type: "undo" })}
              onRedo={() => dispatch({ type: "redo" })}
              onMap={(id) => {
                setInside(null);
                dispatch({ type: "map", id });
              }}
              onSeason={(season) => dispatch({ type: "season", season })}
              onZoomIn={() => canvas.current?.zoomIn()}
              onZoomOut={() => canvas.current?.zoomOut()}
              onFit={() => canvas.current?.fit()}
              onExportPng={() => canvas.current?.exportPng()}
              onExportJson={() =>
                downloadJson("stardew-farm-plans.json", state.store)
              }
              onImportJson={() => input.current?.click()}
              onResetMap={() => {
                const mapName =
                  index.maps.find(
                    (entry) => entry.id === state.store.activeMapId,
                  )?.name ?? "this farm";
                if (
                  !window.confirm(
                    `Reset ${mapName} to its original layout? This removes all changes to this farm, including interiors. You can undo this action.`,
                  )
                )
                  return;
                setInside(null);
                dispatch({ type: "reset-map" });
              }}
              onCollapse={closeRight}
              reportIssueUrl={reportIssueHref(REPORT_ISSUE_EMAIL, {
                map: state.store.activeMapId,
                season: plan.season,
                location: inside?.title ?? "Farm",
                pageUrl: window.location.href,
              })}
              interiorTitle={inside?.title}
              onBackToFarm={() => {
                setInside(null);
                dispatch({ type: "select" });
              }}
            />
          </aside>
        )}
      </div>
      <input
        ref={input}
        className="hidden"
        type="file"
        accept="application/json,.json"
        aria-label="Import plan JSON"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importJson(file);
          event.target.value = "";
        }}
      />
      {notice && (
        <div
          role="status"
          className="fixed bottom-4 right-4 z-40 max-w-sm rounded-lg bg-forest-800 px-4 py-3 text-sm shadow-xl"
        >
          <div className="flex items-center gap-3">
            <span>{notice}</span>
            <button
              onClick={() => setNotice(null)}
              className="font-bold text-amber-200"
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Planner() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PlannerSkeleton />}>
        <EditorProvider>
          <PlannerContent />
        </EditorProvider>
      </Suspense>
    </ErrorBoundary>
  );
}
