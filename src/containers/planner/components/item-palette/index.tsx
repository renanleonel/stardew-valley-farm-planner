import { useEffect, useRef, useState } from "react";
import {
  Building2,
  Flower2,
  PanelLeftClose,
  Search,
  Shapes,
  Sprout,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ItemKind, Season } from "@/containers/planner/domain/enums/planner";
import type { CatalogItem } from "@/containers/planner/domain/schemas/assets";
import { loadImage } from "@/containers/planner/lib/render-map";

enum PaletteTab {
  BUILDINGS = "Buildings",
  CROPS = "Crops",
  PLACEABLES = "Placeables",
  DECOR = "Decor",
}
const tabs = [
  { id: PaletteTab.BUILDINGS, icon: Building2 },
  { id: PaletteTab.CROPS, icon: Sprout },
  { id: PaletteTab.PLACEABLES, icon: Flower2 },
  { id: PaletteTab.DECOR, icon: Shapes },
];

function category(item: CatalogItem) {
  if (item.kind === ItemKind.BUILDING) return PaletteTab.BUILDINGS;
  if (item.kind === ItemKind.CROP || item.kind === ItemKind.SOIL)
    return PaletteTab.CROPS;
  if (item.kind === ItemKind.TREE || item.kind === ItemKind.OBJECT)
    return PaletteTab.PLACEABLES;
  return PaletteTab.DECOR;
}

function SpritePreview({
  item,
  season,
}: {
  item: CatalogItem;
  season: Season;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let active = true;
    Promise.all([
      loadImage(item.textures?.[season] ?? item.texture),
      item.fill ? loadImage(item.fill.textures[season]) : Promise.resolve(null),
    ])
      .then(([image, fillImage]) => {
        if (!active || !canvas.current) return;
        const context = canvas.current.getContext("2d");
        if (!context) return;
        context.clearRect(0, 0, 52, 52);
        context.imageSmoothingEnabled = false;
        const sprite = item.sprites?.[season] ?? item.sprite;
        const scale = Math.min(44 / sprite.width, 44 / sprite.height, 2);
        const width = sprite.width * scale;
        const height = sprite.height * scale;
        if (fillImage && item.fill) {
          for (let y = 0; y < item.footprint.height; y += 1) {
            for (let x = 0; x < item.footprint.width; x += 1) {
              context.drawImage(
                fillImage,
                item.fill.sprite.x,
                item.fill.sprite.y,
                item.fill.sprite.width,
                item.fill.sprite.height,
                (52 - width) / 2 + x * 16 * scale,
                (52 - height) / 2 + y * 16 * scale,
                16 * scale,
                16 * scale,
              );
            }
          }
        }
        context.drawImage(
          image,
          sprite.x,
          sprite.y,
          sprite.width,
          sprite.height,
          (52 - width) / 2,
          (52 - height) / 2,
          width,
          height,
        );
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [item, season]);
  return (
    <canvas
      ref={canvas}
      width={52}
      height={52}
      aria-hidden="true"
      className="size-13"
    />
  );
}

export function ItemPalette({
  items,
  season,
  activeId,
  onChoose,
  onClose,
  onCollapse,
  interior = false,
}: {
  items: CatalogItem[];
  season: Season;
  activeId: string;
  onChoose: (id: string) => void;
  onClose?: () => void;
  onCollapse?: () => void;
  interior?: boolean;
}) {
  const [tab, setTab] = useState(
    interior ? PaletteTab.PLACEABLES : PaletteTab.BUILDINGS,
  );
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(72);
  const scrollContainer = useRef<HTMLDivElement>(null);
  const loadMore = useRef<HTMLDivElement>(null);
  const visibleTabs = interior
    ? tabs.filter(
        ({ id }) => id === PaletteTab.PLACEABLES || id === PaletteTab.DECOR,
      )
    : tabs;
  const query = search.trim().toLowerCase();
  const filtered = items.filter((item) =>
    query
      ? item.name.toLowerCase().includes(query) ||
        item.group?.toLowerCase().includes(query)
      : category(item) === tab,
  );
  useEffect(() => {
    const root = scrollContainer.current;
    const target = loadMore.current;
    if (!root || !target || visibleCount >= filtered.length) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting)
          setVisibleCount((count) => Math.min(count + 72, filtered.length));
      },
      { root, rootMargin: "0px 0px 160px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [filtered.length, visibleCount]);
  const resetResults = () => {
    setVisibleCount(72);
    if (scrollContainer.current) scrollContainer.current.scrollTop = 0;
  };
  return (
    <div className="flex h-full min-h-0 flex-col bg-forest-900 text-parchment">
      <div className="border-b border-forest-700 px-4 pb-4 pt-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-display text-2xl font-bold leading-none">
              Item library
            </h2>
            <p className="mt-2 text-xs text-mist">
              {interior ? "Furnish this room" : "Choose what goes on the farm"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="compact"
            onClick={onClose ?? onCollapse}
            title="Collapse item library"
            aria-label="Collapse item library"
          >
            <PanelLeftClose className="size-4" />
          </Button>
        </div>
        <label className="mt-5 block text-xs font-semibold text-parchment">
          Search items
          <span className="relative mt-2 block">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-3 size-4 text-mist"
            />
            <Input
              className="pr-10 pl-9 text-base sm:text-sm"
              placeholder="Name or type"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                resetResults();
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  resetResults();
                }}
                aria-label="Clear search"
                className="absolute right-1 top-1 grid size-8 place-items-center rounded-md text-mist hover:bg-forest-700 hover:text-parchment focus-visible:outline-2 focus-visible:outline-amber-300"
              >
                <X className="size-4" />
              </button>
            )}
          </span>
        </label>
      </div>
      <div
        className="grid grid-cols-2 gap-2 border-b border-forest-700 p-3"
        role="group"
        aria-label="Item categories"
      >
        {visibleTabs.map(({ id, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={!query && tab === id}
            onClick={() => {
              setTab(id);
              setSearch("");
              resetResults();
            }}
            className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 text-left text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${!query && tab === id ? "border-amber-300/60 bg-forest-700 text-amber-200" : "border-forest-700 text-mist hover:border-forest-500 hover:text-parchment"}`}
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            {id}
          </button>
        ))}
      </div>
      <div
        ref={scrollContainer}
        className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-3"
      >
        <div className="mb-3 flex items-center justify-between gap-2 px-1 text-xs text-mist">
          <span
            className="min-w-0 truncate"
            title={query ? search.trim() : undefined}
          >
            {query ? `Results for “${search.trim()}”` : tab}
          </span>
          <span className="shrink-0 tabular-nums">{filtered.length} items</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {filtered.slice(0, visibleCount).map((item) => (
            <button
              key={item.id}
              type="button"
              title={item.name}
              aria-pressed={activeId === item.id}
              onClick={() => {
                onChoose(item.id);
                onClose?.();
              }}
              className={`flex min-h-27 flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${activeId === item.id ? "border-amber-300 bg-forest-700" : "border-forest-700 bg-forest-800/50 hover:border-forest-500 hover:bg-forest-800"}`}
            >
              <SpritePreview item={item} season={season} />
              <span className="line-clamp-2 text-xs font-medium leading-4 text-parchment">
                {item.name}
              </span>
              {activeId === item.id && (
                <span className="text-xs font-semibold text-amber-200">
                  Selected
                </span>
              )}
            </button>
          ))}
        </div>
        {filtered.length > visibleCount && (
          <div ref={loadMore} aria-hidden="true" className="h-1" />
        )}
        {filtered.length === 0 && (
          <div className="py-10 text-center text-sm text-mist">
            <p>No matching items.</p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                resetResults();
              }}
              className="mt-2 font-semibold text-amber-200 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-amber-300"
            >
              Clear search
            </button>
          </div>
        )}
      </div>
      <div className="border-t border-forest-700 px-4 py-3 text-xs text-mist">
        <span className="font-semibold text-parchment">Tip</span> · Right-click
        the map to stop placing.
      </div>
    </div>
  );
}
