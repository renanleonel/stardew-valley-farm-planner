import { useEffect, useId, useRef, useState } from "react";
import { Check, ListFilter, PanelLeftClose, Search, X } from "lucide-react";
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
  { id: PaletteTab.BUILDINGS, label: "Build", previewId: "building:Coop" },
  { id: PaletteTab.CROPS, label: "Crops", previewId: "crop:431" },
  { id: PaletteTab.PLACEABLES, label: "Objects", previewId: "craftable:8" },
  { id: PaletteTab.DECOR, label: "Decor", previewId: "furniture:192" },
];

function category(item: CatalogItem) {
  if (item.kind === ItemKind.BUILDING) return PaletteTab.BUILDINGS;
  if (item.kind === ItemKind.CROP || item.kind === ItemKind.SOIL)
    return PaletteTab.CROPS;
  if (item.kind === ItemKind.TREE || item.kind === ItemKind.OBJECT)
    return PaletteTab.PLACEABLES;
  return PaletteTab.DECOR;
}

const buildingFilters = [
  "All",
  "Animal",
  "Production",
  "Storage",
  "Utility",
  "Luxury",
  "Cabins",
  "Structures",
];
const buildingOrder = [
  "Coop",
  "Big Coop",
  "Deluxe Coop",
  "Barn",
  "Big Barn",
  "Deluxe Barn",
  "Slime Hutch",
  "Mill",
  "Fish Pond",
  "Shed",
  "Big Shed",
  "Silo",
  "Well",
  "Stable",
  "Shipping Bin",
  "Junimo Hut",
  "Pet Bowl",
  "Earth Obelisk",
  "Water Obelisk",
  "Desert Obelisk",
  "Island Obelisk",
  "Gold Clock",
  "Cabin",
  "Farmhouse",
  "Greenhouse",
];
function buildingFilter(item: CatalogItem) {
  const name = item.name.toLowerCase();
  if (/coop|barn|stable|pet bowl/.test(name)) return "Animal";
  if (/mill|fish pond|slime hutch|junimo hut/.test(name)) return "Production";
  if (/shed|silo|shipping bin/.test(name)) return "Storage";
  if (/obelisk|gold clock/.test(name)) return "Luxury";
  if (/cabin/.test(name)) return "Cabins";
  if (/farmhouse|greenhouse/.test(name)) return "Structures";
  return "Utility";
}
function filtersFor(tab: PaletteTab) {
  if (tab === PaletteTab.BUILDINGS) return buildingFilters;
  if (tab === PaletteTab.CROPS) return ["All", "Crops", "Soil"];
  if (tab === PaletteTab.PLACEABLES) return ["All", "Trees", "Objects"];
  return ["All", "Paths", "Fences", "Furniture"];
}
function matchesFilter(item: CatalogItem, tab: PaletteTab, filter: string) {
  if (filter === "All") return true;
  if (tab === PaletteTab.BUILDINGS) return buildingFilter(item) === filter;
  if (tab === PaletteTab.CROPS)
    return filter === "Soil"
      ? item.kind === ItemKind.SOIL
      : item.kind === ItemKind.CROP;
  if (tab === PaletteTab.PLACEABLES)
    return filter === "Trees"
      ? item.kind === ItemKind.TREE
      : item.kind === ItemKind.OBJECT;
  if (filter === "Paths") return item.kind === ItemKind.FLOOR;
  if (filter === "Fences") return item.kind === ItemKind.FENCE;
  return item.kind === ItemKind.FURNITURE;
}

function SpritePreview({
  item,
  season,
  compact = false,
}: {
  item: CatalogItem;
  season: Season;
  compact?: boolean;
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
        context.clearRect(0, 0, 56, 56);
        context.imageSmoothingEnabled = false;
        const sprite = item.sprites?.[season] ?? item.sprite;
        const scale = Math.min(48 / sprite.width, 48 / sprite.height, 2);
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
                (56 - width) / 2 + x * 16 * scale,
                (56 - height) / 2 + y * 16 * scale,
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
          (56 - width) / 2,
          (56 - height) / 2,
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
      width={56}
      height={56}
      aria-hidden="true"
      className={compact ? "size-10" : "size-14"}
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
  const [filter, setFilter] = useState("All");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(72);
  const searchId = useId();
  const scrollContainer = useRef<HTMLDivElement>(null);
  const loadMore = useRef<HTMLDivElement>(null);
  const filterRegion = useRef<HTMLDivElement>(null);
  const filterButton = useRef<HTMLButtonElement>(null);
  const visibleTabs = interior
    ? tabs.filter(
        ({ id }) => id === PaletteTab.PLACEABLES || id === PaletteTab.DECOR,
      )
    : tabs;
  const query = search.trim().toLocaleLowerCase();
  const filtered = items.filter((item) =>
    query
      ? item.name.toLocaleLowerCase().includes(query) ||
        item.group?.toLocaleLowerCase().includes(query)
      : category(item) === tab && matchesFilter(item, tab, filter),
  );
  if (!query && tab === PaletteTab.BUILDINGS)
    filtered.sort(
      (first, second) =>
        buildingOrder.indexOf(first.name) - buildingOrder.indexOf(second.name),
    );
  useEffect(() => {
    if (!filtersOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!filterRegion.current?.contains(event.target as Node))
        setFiltersOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setFiltersOpen(false);
        filterButton.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [filtersOpen]);
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
    <div className="flex h-full min-h-0 bg-bark-900 text-parchment">
      <div className="flex w-[4.5rem] shrink-0 flex-col items-center border-r border-bark-700 bg-forest-950 py-3 text-parchment">
        <button
          type="button"
          onClick={onClose ?? onCollapse}
          title="Collapse item library"
          aria-label="Collapse item library"
          className="grid size-10 place-items-center rounded-lg text-mist hover:bg-forest-800 hover:text-parchment focus-visible:outline-2 focus-visible:outline-amber-300"
        >
          <PanelLeftClose aria-hidden="true" className="size-5" />
        </button>
        <nav className="mt-4 flex w-full flex-col" aria-label="Item categories">
          {visibleTabs.map(({ id, label, previewId }) => {
            const preview =
              items.find((item) => item.id === previewId) ??
              items.find((item) => category(item) === id);
            return (
              <button
                key={id}
                type="button"
                title={id}
                aria-label={label === id ? id : `${label} (${id})`}
                aria-pressed={tab === id && !query}
                onClick={() => {
                  setTab(id);
                  setSearch("");
                  setFilter("All");
                  setFiltersOpen(false);
                  resetResults();
                }}
                className={`palette-tab flex min-h-18 w-full flex-col items-center justify-center gap-0.5 border-b border-forest-700/60 border-l px-0.5 text-xs leading-tight focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-amber-300 ${tab === id && !query ? "border-l-amber-400 bg-bark-900 font-semibold text-amber-200" : "border-l-transparent text-mist hover:bg-forest-800 hover:text-parchment"}`}
              >
                {preview && (
                  <SpritePreview item={preview} season={season} compact />
                )}
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-bark-700 px-3 pb-3 pt-4">
          <h2 className="font-display text-[1.5rem] font-bold leading-none">
            Inventory
          </h2>
          <p className="mt-1 text-xs text-mist" aria-live="polite">
            {query ? "Search results" : filter === "All" ? tab : filter} ·{" "}
            {filtered.length} {filtered.length === 1 ? "item" : "items"}
          </p>
          <div ref={filterRegion} className="relative mt-3">
            <div className="flex gap-1.5">
              <div className="relative min-w-0 flex-1">
                <label htmlFor={searchId} className="sr-only">
                  Search items
                </label>
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-2.5 top-3 size-4 text-mist"
                />
                <input
                  id={searchId}
                  className="h-10 w-full rounded-lg border border-bark-600 bg-bark-950 pl-8 pr-8 text-base text-parchment placeholder:text-mist focus-visible:outline-2 focus-visible:outline-amber-300 sm:text-sm"
                  placeholder="Find items"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    if (event.target.value) setFilter("All");
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
                    className="absolute right-1 top-1 grid size-8 place-items-center rounded-md text-mist hover:text-parchment focus-visible:outline-2 focus-visible:outline-amber-300"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
              <button
                ref={filterButton}
                type="button"
                aria-label={
                  filter === "All" ? "Filter items" : `Filter items: ${filter}`
                }
                aria-expanded={filtersOpen}
                aria-controls="item-filters"
                onClick={() => setFiltersOpen((open) => !open)}
                className={`palette-filter grid size-10 shrink-0 place-items-center rounded-lg border focus-visible:outline-2 focus-visible:outline-amber-300 ${filtersOpen || filter !== "All" ? "border-amber-400 bg-bark-700 text-parchment" : "border-bark-600 bg-bark-800 text-mist hover:bg-bark-700 hover:text-parchment"}`}
              >
                <ListFilter aria-hidden="true" className="size-4" />
              </button>
            </div>
            {filtersOpen && (
              <div
                id="item-filters"
                className="palette-filter-menu absolute inset-x-0 top-full z-20 mt-2 grid max-h-[calc(100dvh-9rem)] grid-cols-1 gap-0.5 overflow-y-auto rounded-xl border border-bark-600 bg-bark-800 p-1.5 shadow-lg"
                role="group"
                aria-label={`${tab} filters`}
              >
                {filtersFor(tab).map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={filter === option}
                    onClick={() => {
                      setFilter(option);
                      setSearch("");
                      setFiltersOpen(false);
                      resetResults();
                    }}
                    className={`palette-chip flex min-h-9 items-center justify-between gap-1 rounded-md px-2 text-left text-xs focus-visible:outline-2 focus-visible:outline-amber-300 ${filter === option ? "bg-amber-400/25 font-semibold text-parchment" : "text-mist hover:bg-bark-700 hover:text-parchment"}`}
                  >
                    <span>{option}</span>
                    {filter === option && (
                      <Check
                        aria-hidden="true"
                        className="size-3.5 shrink-0 text-amber-200"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div
          ref={scrollContainer}
          className="palette-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-3"
        >
          <div className="grid grid-cols-3 gap-2">
            {filtered.slice(0, visibleCount).map((item) => (
              <button
                key={item.id}
                type="button"
                title={item.name}
                aria-label={item.name}
                aria-pressed={activeId === item.id}
                onClick={() => {
                  setFiltersOpen(false);
                  onChoose(item.id);
                  onClose?.();
                }}
                className={`palette-item grid aspect-square min-w-0 place-items-center rounded-lg border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${activeId === item.id ? "border-amber-400 bg-amber-400/20" : "border-bark-600/70 bg-bark-800 hover:border-amber-300/70 hover:bg-bark-700"}`}
              >
                <SpritePreview item={item} season={season} />
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
                  setFilter("All");
                  resetResults();
                }}
                className="mt-2 font-semibold text-amber-200 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-amber-300"
              >
                Clear search and filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
