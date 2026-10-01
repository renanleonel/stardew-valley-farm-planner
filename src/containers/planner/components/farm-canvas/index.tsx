import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { KeyboardEvent, PointerEvent, WheelEvent } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Eraser,
  Hand,
  MousePointer2,
  Move,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tool } from "@/containers/planner/domain/enums/planner";
import type {
  Catalog,
  CatalogItem,
  FarmMap,
} from "@/containers/planner/domain/schemas/assets";
import type { FarmPlan } from "@/containers/planner/domain/schemas/plan";
import {
  canPlace,
  findPlacementAt,
  itemById,
  movePlacements,
} from "@/containers/planner/lib/placement";
import {
  makeLayerCanvas,
  loadImage,
  paintBuildableOverlay,
  paintCoverageOverlay,
  paintGround,
  paintItem,
  paintPlacements,
  requiredImages,
} from "@/containers/planner/lib/render-map";
import { rasterLine } from "@/containers/planner/lib/tiles";

type Tile = { x: number; y: number };
type View = { zoom: number; panX: number; panY: number };

function fittedView(map: FarmMap, width: number, height: number): View {
  const zoom = Math.max(
    0.1,
    Math.min(
      width / (map.width * map.tileSize),
      height / (map.height * map.tileSize),
    ) * 0.99,
  );
  return {
    zoom,
    panX: (width - map.width * map.tileSize * zoom) / 2,
    panY: (height - map.height * map.tileSize * zoom) / 2,
  };
}
function initialView(map: FarmMap, width: number, height: number): View {
  const fitted = fittedView(map, width, height);
  if (window.matchMedia("(min-width: 1024px)").matches) return fitted;
  const zoom = Math.min(
    fitted.zoom * 2,
    (height * 0.72) / (map.height * map.tileSize),
  );
  if (zoom <= fitted.zoom) return fitted;
  return {
    zoom,
    panX: (width - map.width * map.tileSize * zoom) / 2,
    panY: (height - map.height * map.tileSize * zoom) / 2,
  };
}
type Drag =
  | { kind: "pan"; x: number; y: number }
  | { kind: "brush"; last: Tile }
  | {
      kind: "move";
      id: string;
      ids: string[];
      grab: Tile;
      start: { x: number; y: number };
    }
  | null;
type MovePreview = { ids: string[]; dx: number; dy: number; valid: boolean };

export type FarmCanvasHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
  exportPng: () => void;
};

type Props = {
  map: FarmMap;
  catalog: Catalog;
  plan: FarmPlan;
  tool: Tool;
  activeItem?: CatalogItem;
  selectedIds: string[];
  grid: boolean;
  buildableOverlay: boolean;
  coverageOverlay: boolean;
  onBeginStroke: () => void;
  onEndStroke: () => void;
  onEditAt: (tile: Tile) => void;
  onSelect: (id?: string, mode?: "replace" | "toggle" | "preserve") => void;
  onCancelSelection: () => void;
  onMove: (id: string, tile: Tile) => void;
};

export const FarmCanvas = forwardRef<FarmCanvasHandle, Props>(
  function FarmCanvas(
    {
      map,
      catalog,
      plan,
      tool,
      activeItem,
      selectedIds,
      grid,
      buildableOverlay,
      coverageOverlay,
      onBeginStroke,
      onEndStroke,
      onEditAt,
      onSelect,
      onCancelSelection,
      onMove,
    },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const viewport = useRef<View>({ zoom: 1, panX: 0, panY: 0 });
    const viewMode = useRef<"initial" | "fit" | "manual">("initial");
    const measured = useRef({ width: 0, height: 0 });
    const drag = useRef<Drag>(null);
    const pointers = useRef(new Map<number, { x: number; y: number }>());
    const pinchDistance = useRef<number | null>(null);
    const layers = useRef(new Map<string, HTMLCanvasElement>());
    const [size, setSize] = useState({ width: 1, height: 1 });
    const [revision, setRevision] = useState(0);
    const [hover, setHover] = useState<Tile | null>(null);
    const [images, setImages] = useState(new Map<string, HTMLImageElement>());
    const [imageError, setImageError] = useState<string | null>(null);
    const [imageRetry, setImageRetry] = useState(0);
    const [movePreview, setMovePreview] = useState<MovePreview | null>(null);
    const [cursorVisible, setCursorVisible] = useState(false);
    const cursorRef = useRef<HTMLDivElement>(null);

    const fit = useCallback(
      (initial = false) => {
        const width = canvasRef.current?.clientWidth ?? measured.current.width;
        const height =
          canvasRef.current?.clientHeight ?? measured.current.height;
        if (!width || !height) return;
        viewMode.current = initial ? "initial" : "fit";
        viewport.current = initial
          ? initialView(map, width, height)
          : fittedView(map, width, height);
        setRevision((value) => value + 1);
      },
      [map],
    );

    const zoomAt = (factor: number, x: number, y: number) => {
      const previous = viewport.current;
      const zoom = Math.max(0.1, Math.min(5, previous.zoom * factor));
      const scale = zoom / previous.zoom;
      viewport.current = {
        zoom,
        panX: x - (x - previous.panX) * scale,
        panY: y - (y - previous.panY) * scale,
      };
      viewMode.current = "manual";
      setRevision((value) => value + 1);
    };

    const draw = useCallback(
      (
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number,
        view: View,
        guide: boolean,
        dpr: number,
      ) => {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, width * dpr, height * dpr);
        ctx.fillStyle = "#154134";
        ctx.fillRect(0, 0, width * dpr, height * dpr);
        if (!images.size) return;
        ctx.setTransform(
          dpr * view.zoom,
          0,
          0,
          dpr * view.zoom,
          dpr * view.panX,
          dpr * view.panY,
        );
        ctx.imageSmoothingEnabled = false;

        const drawLayer = (name: string) => {
          const key = `${map.id}:${plan.season}:${name}`;
          let layer = layers.current.get(key);
          if (!layer) {
            layer = makeLayerCanvas(map, name, plan.season, images);
            layers.current.set(key, layer);
          }
          ctx.drawImage(layer, 0, 0);
        };
        for (const layer of map.layers) {
          if (layer.name === "Front" || layer.name.startsWith("AlwaysFront"))
            continue;
          drawLayer(layer.name);
        }
        const moving = guide && movePreview && new Set(movePreview.ids);
        const renderedPlan = moving
          ? {
              ...plan,
              placements: plan.placements.map((placed) =>
                moving.has(placed.id)
                  ? {
                      ...placed,
                      x: placed.x + movePreview.dx,
                      y: placed.y + movePreview.dy,
                    }
                  : placed,
              ),
            }
          : plan;
        paintGround(ctx, plan, catalog, map, images);
        paintPlacements(ctx, renderedPlan, catalog, map, images);
        for (const layer of map.layers) {
          if (layer.name === "Front" || layer.name.startsWith("AlwaysFront"))
            drawLayer(layer.name);
        }

        if (!guide) return;
        if (buildableOverlay) paintBuildableOverlay(ctx, map);
        if (coverageOverlay)
          paintCoverageOverlay(ctx, map, renderedPlan, catalog);
        if (grid) {
          ctx.save();
          ctx.strokeStyle = "rgba(255,255,255,.22)";
          ctx.lineWidth = 1 / view.zoom;
          ctx.beginPath();
          for (let x = 0; x <= map.width; x += 1) {
            ctx.moveTo(x * map.tileSize, 0);
            ctx.lineTo(x * map.tileSize, map.height * map.tileSize);
          }
          for (let y = 0; y <= map.height; y += 1) {
            ctx.moveTo(0, y * map.tileSize);
            ctx.lineTo(map.width * map.tileSize, y * map.tileSize);
          }
          ctx.stroke();
          ctx.restore();
        }
        const selectedPlacements = new Map(
          renderedPlan.placements.map((placed) => [placed.id, placed]),
        );
        for (const selectedId of selectedIds) {
          const selected = selectedPlacements.get(selectedId);
          const item = selected && itemById(catalog, selected.itemId);
          if (selected && item) {
            ctx.save();
            ctx.strokeStyle = movePreview
              ? movePreview.valid
                ? "#8df6a0"
                : "#ff776d"
              : "#fff0a8";
            ctx.lineWidth = 2 / view.zoom;
            ctx.strokeRect(
              selected.x * map.tileSize,
              selected.y * map.tileSize,
              item.footprint.width * map.tileSize,
              item.footprint.height * map.tileSize,
            );
            ctx.restore();
          }
        }
        if (hover && activeItem && tool === Tool.PLACE) {
          const issues = canPlace(
            plan,
            map,
            catalog,
            activeItem,
            hover.x,
            hover.y,
          );
          paintItem(
            ctx,
            activeItem,
            hover.x,
            hover.y,
            map.tileSize,
            plan.season,
            images,
            0.7,
          );
          ctx.save();
          ctx.fillStyle = issues.length
            ? "rgba(234,72,67,.34)"
            : "rgba(75,223,117,.28)";
          ctx.strokeStyle = issues.length ? "#ff776d" : "#8df6a0";
          ctx.lineWidth = 2 / view.zoom;
          const x = hover.x * map.tileSize;
          const y = hover.y * map.tileSize;
          const w = activeItem.footprint.width * map.tileSize;
          const h = activeItem.footprint.height * map.tileSize;
          ctx.fillRect(x, y, w, h);
          ctx.strokeRect(x, y, w, h);
          ctx.restore();
        }
        if (
          hover &&
          hover.x >= 0 &&
          hover.y >= 0 &&
          hover.x < map.width &&
          hover.y < map.height
        ) {
          ctx.save();
          ctx.fillStyle = "rgba(255, 224, 168, .15)";
          ctx.strokeStyle = "#ffe0a8";
          ctx.lineWidth = 1.5 / view.zoom;
          ctx.fillRect(
            hover.x * map.tileSize,
            hover.y * map.tileSize,
            map.tileSize,
            map.tileSize,
          );
          ctx.strokeRect(
            hover.x * map.tileSize,
            hover.y * map.tileSize,
            map.tileSize,
            map.tileSize,
          );
          ctx.restore();
        }
      },
      [
        map,
        catalog,
        plan,
        images,
        selectedIds,
        movePreview,
        hover,
        activeItem,
        tool,
        buildableOverlay,
        coverageOverlay,
        grid,
      ],
    );

    useEffect(() => {
      let active = true;
      setImages(new Map());
      setImageError(null);
      layers.current.clear();
      const paths = requiredImages(map, catalog, plan.season);
      Promise.all(
        paths.map(async (path) => [path, await loadImage(path)] as const),
      )
        .then((loaded) => {
          if (active) {
            layers.current.clear();
            setImages(new Map(loaded));
          }
        })
        .catch((error: unknown) => {
          if (active)
            setImageError(
              error instanceof Error
                ? error.message
                : "Map art could not be loaded",
            );
        });
      return () => {
        active = false;
      };
    }, [map, catalog, plan.season, imageRetry]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const observer = new ResizeObserver(() => {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const previous = measured.current;
        if (width === previous.width && height === previous.height) return;
        if (viewMode.current === "initial")
          viewport.current = initialView(map, width, height);
        else if (viewMode.current === "fit")
          viewport.current = fittedView(map, width, height);
        else {
          viewport.current.panX += (width - previous.width) / 2;
          viewport.current.panY += (height - previous.height) / 2;
        }
        measured.current = { width, height };
        setSize({ width, height });
      });
      observer.observe(canvas);
      return () => observer.disconnect();
    }, [map]);

    useEffect(() => {
      fit(true);
    }, [fit]);

    useEffect(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx || size.width < 1 || size.height < 1) return;
      const dpr = window.devicePixelRatio || 1;
      const pixelWidth = Math.round(size.width * dpr);
      const pixelHeight = Math.round(size.height * dpr);
      if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
      if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
      const frame = requestAnimationFrame(() =>
        draw(ctx, size.width, size.height, viewport.current, true, dpr),
      );
      return () => cancelAnimationFrame(frame);
    }, [draw, size, revision]);

    useImperativeHandle(ref, () => ({
      zoomIn: () => zoomAt(1.25, size.width / 2, size.height / 2),
      zoomOut: () => zoomAt(0.8, size.width / 2, size.height / 2),
      fit,
      exportPng: () => {
        if (!images.size) return;
        const output = document.createElement("canvas");
        output.width = map.width * map.tileSize;
        output.height = map.height * map.tileSize;
        const ctx = output.getContext("2d");
        if (!ctx) return;
        draw(
          ctx,
          output.width,
          output.height,
          { zoom: 1, panX: 0, panY: 0 },
          false,
          1,
        );
        output.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `${map.id}-${plan.season}-farm.png`;
          link.click();
          window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        });
      },
    }));

    const relativePoint = (event: PointerEvent<HTMLCanvasElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const tileAt = (point: { x: number; y: number }): Tile => ({
      x: Math.floor(
        (point.x - viewport.current.panX) /
          viewport.current.zoom /
          map.tileSize,
      ),
      y: Math.floor(
        (point.y - viewport.current.panY) /
          viewport.current.zoom /
          map.tileSize,
      ),
    });
    const positionCursor = (point: { x: number; y: number }) => {
      if (cursorRef.current)
        cursorRef.current.style.transform = `translate3d(${point.x + 12}px, ${point.y + 12}px, 0)`;
    };

    const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
      event.preventDefault();
      if (
        event.button === 2 &&
        (tool === Tool.PLACE || selectedIds.length > 0)
      ) {
        drag.current = null;
        setMovePreview(null);
        onCancelSelection();
        return;
      }
      event.currentTarget.setPointerCapture(event.pointerId);
      const point = relativePoint(event);
      positionCursor(point);
      pointers.current.set(event.pointerId, point);
      if (pointers.current.size > 1) {
        drag.current = null;
        setMovePreview(null);
        onEndStroke();
        const points = [...pointers.current.values()];
        pinchDistance.current = Math.hypot(
          points[0].x - points[1].x,
          points[0].y - points[1].y,
        );
        return;
      }
      const tile = tileAt(point);
      setHover(tile);
      if (tool === Tool.PAN || event.button === 1 || event.button === 2) {
        drag.current = { kind: "pan", ...point };
        return;
      }
      if (tool === Tool.SELECT) {
        const placed = findPlacementAt(plan, catalog, tile.x, tile.y);
        onSelect(
          placed?.id,
          event.shiftKey
            ? "toggle"
            : placed && selectedIds.includes(placed.id)
              ? "preserve"
              : "replace",
        );
        drag.current =
          placed && !event.shiftKey
            ? {
                kind: "move",
                id: placed.id,
                ids: selectedIds.includes(placed.id)
                  ? selectedIds
                  : [placed.id],
                grab: { x: tile.x - placed.x, y: tile.y - placed.y },
                start: point,
              }
            : !placed
              ? { kind: "pan", ...point }
              : null;
        return;
      }
      if (tool === Tool.ERASE || (tool === Tool.PLACE && activeItem)) {
        onBeginStroke();
        onEditAt(tile);
        drag.current = { kind: "brush", last: tile };
      }
    };

    const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
      const point = relativePoint(event);
      positionCursor(point);
      if (pointers.current.has(event.pointerId))
        pointers.current.set(event.pointerId, point);
      if (pointers.current.size > 1) {
        const points = [...pointers.current.values()];
        const distance = Math.hypot(
          points[0].x - points[1].x,
          points[0].y - points[1].y,
        );
        const middle = {
          x: (points[0].x + points[1].x) / 2,
          y: (points[0].y + points[1].y) / 2,
        };
        if (pinchDistance.current && distance > 0)
          zoomAt(distance / pinchDistance.current, middle.x, middle.y);
        pinchDistance.current = distance;
        return;
      }
      const current = drag.current;
      if (current?.kind === "pan") {
        viewport.current.panX += point.x - current.x;
        viewport.current.panY += point.y - current.y;
        drag.current = { kind: "pan", ...point };
        setHover(tileAt(point));
        setRevision((value) => value + 1);
        return;
      }
      const tile = tileAt(point);
      setHover(tile);
      if (current?.kind === "move") {
        if (
          Math.hypot(point.x - current.start.x, point.y - current.start.y) > 3
        ) {
          const placed = plan.placements.find(
            (entry) => entry.id === current.id,
          );
          if (placed) {
            const dx = tile.x - current.grab.x - placed.x;
            const dy = tile.y - current.grab.y - placed.y;
            const valid =
              (!dx && !dy) ||
              movePlacements(plan, map, catalog, current.ids, dx, dy) !== plan;
            setMovePreview((previous) =>
              previous?.ids === current.ids &&
              previous.dx === dx &&
              previous.dy === dy &&
              previous.valid === valid
                ? previous
                : { ids: current.ids, dx, dy, valid },
            );
          }
        }
        return;
      }
      if (
        current?.kind === "brush" &&
        (current.last.x !== tile.x || current.last.y !== tile.y)
      ) {
        for (const crossed of rasterLine(current.last, tile).slice(1))
          onEditAt(crossed);
        drag.current = { kind: "brush", last: tile };
      }
    };

    const onPointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
      const point = relativePoint(event);
      pointers.current.delete(event.pointerId);
      if (pointers.current.size > 0) return;
      pinchDistance.current = null;
      const current = drag.current;
      drag.current = null;
      setMovePreview(null);
      if (current?.kind === "brush") onEndStroke();
      if (
        current?.kind === "move" &&
        Math.hypot(point.x - current.start.x, point.y - current.start.y) > 3
      ) {
        const tile = tileAt(point);
        onMove(current.id, {
          x: tile.x - current.grab.x,
          y: tile.y - current.grab.y,
        });
      }
    };
    const onPointerCancel = (event: PointerEvent<HTMLCanvasElement>) => {
      pointers.current.delete(event.pointerId);
      pinchDistance.current = null;
      if (drag.current?.kind === "brush") onEndStroke();
      drag.current = null;
      setMovePreview(null);
      setCursorVisible(false);
    };

    const onWheel = (event: WheelEvent<HTMLCanvasElement>) => {
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      zoomAt(
        event.deltaY < 0 ? 1.12 : 1 / 1.12,
        event.clientX - rect.left,
        event.clientY - rect.top,
      );
    };

    const issues =
      hover && activeItem && tool === Tool.PLACE
        ? canPlace(plan, map, catalog, activeItem, hover.x, hover.y)
        : [];
    const hoveredPlacement =
      hover && tool === Tool.SELECT
        ? findPlacementAt(plan, catalog, hover.x, hover.y)
        : undefined;
    const nudge = (dx: number, dy: number) => {
      const current = hover ?? {
        x: Math.floor(map.width / 2),
        y: Math.floor(map.height / 2),
      };
      setHover({
        x: Math.max(
          0,
          Math.min(
            map.width - (activeItem?.footprint.width ?? 1),
            current.x + dx,
          ),
        ),
        y: Math.max(
          0,
          Math.min(
            map.height - (activeItem?.footprint.height ?? 1),
            current.y + dy,
          ),
        ),
      });
    };
    const onCanvasKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
      const direction: Record<string, Tile> = {
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
      };
      const step = direction[event.key];
      if (step) {
        event.preventDefault();
        const selected = plan.placements.find(
          (placement) => placement.id === selectedIds[0],
        );
        if (event.shiftKey && tool === Tool.SELECT && selected) {
          onMove(selected.id, {
            x: selected.x + step.x,
            y: selected.y + step.y,
          });
          setHover({ x: selected.x + step.x, y: selected.y + step.y });
        } else {
          nudge(step.x, step.y);
        }
        return;
      }
      if (event.key === "Escape") {
        onCancelSelection();
        return;
      }
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      const tile = hover ?? {
        x: Math.floor(map.width / 2),
        y: Math.floor(map.height / 2),
      };
      if (tool === Tool.SELECT) {
        onSelect(findPlacementAt(plan, catalog, tile.x, tile.y)?.id);
      } else if (tool === Tool.ERASE || (tool === Tool.PLACE && activeItem)) {
        onBeginStroke();
        onEditAt(tile);
        onEndStroke();
      }
    };
    return (
      <div className="relative h-full w-full overflow-hidden bg-forest-900">
        <canvas
          ref={canvasRef}
          tabIndex={0}
          className="planner-map-canvas block h-full w-full touch-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-amber-300"
          aria-label={`${map.name} editor. Arrow keys move the highlighted tile; Enter applies the current tool. Shift and arrow keys move selected items. Escape clears selection. Drag or use the mouse wheel to pan and zoom.`}
          onFocus={() => {
            if (!hover)
              setHover({
                x: Math.floor(map.width / 2),
                y: Math.floor(map.height / 2),
              });
          }}
          onKeyDown={onCanvasKeyDown}
          onContextMenu={(event) => event.preventDefault()}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onPointerEnter={(event) => {
            positionCursor(relativePoint(event));
            setCursorVisible(true);
          }}
          onPointerLeave={() => {
            if (!pointers.current.size) setHover(null);
            setCursorVisible(false);
          }}
          onWheel={onWheel}
        />
        <div
          ref={cursorRef}
          aria-hidden="true"
          className={`planner-tool-cursor pointer-events-none absolute left-0 top-0 z-10 size-7 place-items-center rounded-md border border-amber-300/40 bg-forest-950/95 text-amber-200 shadow-lg ${cursorVisible ? "visible" : "invisible"}`}
        >
          {tool === Tool.ERASE ? (
            <Eraser className="size-4" />
          ) : tool === Tool.PAN ? (
            <Hand className="size-4" />
          ) : tool === Tool.SELECT ? (
            movePreview || hoveredPlacement ? (
              <Move className="size-4" />
            ) : (
              <MousePointer2 className="size-4" />
            )
          ) : (
            <Plus className="size-4" />
          )}
        </div>
        {!images.size &&
          (imageError ? (
            <div
              role="alert"
              className="absolute inset-0 grid place-items-center bg-forest-900 px-5 text-center text-parchment"
            >
              <div className="max-w-sm">
                <h2 className="font-display text-xl font-bold">
                  Map art could not load
                </h2>
                <p className="mt-2 text-sm leading-5 text-mist">{imageError}</p>
                <Button
                  className="mt-4"
                  onClick={() => setImageRetry((value) => value + 1)}
                >
                  Retry map art
                </Button>
              </div>
            </div>
          ) : (
            <div className="pointer-events-none absolute inset-0 grid place-items-center bg-forest-900/80 text-sm text-parchment">
              Loading map art…
            </div>
          ))}
        {tool === Tool.PLACE && activeItem && (
          <div
            className="absolute bottom-16 right-3 grid grid-cols-3 gap-1 rounded-xl bg-forest-950/95 p-2 shadow-xl md:hidden"
            aria-label="Placement nudge controls"
          >
            <span />
            <Button
              size="compact"
              variant="ghost"
              className="size-11"
              onClick={() => nudge(0, -1)}
              aria-label="Move preview up one tile"
            >
              <ArrowUp className="size-5" />
            </Button>
            <span />
            <Button
              size="compact"
              variant="ghost"
              className="size-11"
              onClick={() => nudge(-1, 0)}
              aria-label="Move preview left one tile"
            >
              <ArrowLeft className="size-5" />
            </Button>
            <Button
              size="compact"
              variant="selected"
              className="size-11"
              disabled={!hover || issues.length > 0}
              onClick={() => {
                if (hover) onEditAt(hover);
              }}
              aria-label="Place item at preview"
            >
              <Plus className="size-5" />
            </Button>
            <Button
              size="compact"
              variant="ghost"
              className="size-11"
              onClick={() => nudge(1, 0)}
              aria-label="Move preview right one tile"
            >
              <ArrowRight className="size-5" />
            </Button>
            <span />
            <Button
              size="compact"
              variant="ghost"
              className="size-11"
              onClick={() => nudge(0, 1)}
              aria-label="Move preview down one tile"
            >
              <ArrowDown className="size-5" />
            </Button>
            <span />
          </div>
        )}
        <div
          aria-live="polite"
          className="planner-canvas-hint pointer-events-none absolute bottom-3 left-3 max-w-[min(30rem,calc(100%-1.5rem))] rounded-lg bg-forest-950/95 px-3 py-2 text-xs leading-4 text-parchment shadow-lg"
        >
          {movePreview
            ? `${movePreview.valid ? "Moving" : "Cannot move here"} ${movePreview.ids.length} ${movePreview.ids.length === 1 ? "item" : "items"} · Tile ${hover?.x ?? 0}, ${hover?.y ?? 0}`
            : hover
              ? `${activeItem && tool === Tool.PLACE ? `${activeItem.name} · ` : ""}Tile ${hover.x}, ${hover.y}${issues.length ? ` · ${issues.join("; ")}` : activeItem && tool === Tool.PLACE ? " · Ready to place" : ""}`
              : activeItem && tool === Tool.PLACE
                ? `Placing ${activeItem.name} · Point at a tile`
                : tool === Tool.PAN
                  ? "Drag to move the farm"
                  : tool === Tool.ERASE
                    ? "Point at an item to erase it"
                    : selectedIds.length
                      ? "Drag the selected item to move it"
                      : "Click a placed item to select it"}
        </div>
      </div>
    );
  },
);
