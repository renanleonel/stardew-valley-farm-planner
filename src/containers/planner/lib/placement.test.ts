import { describe, expect, it } from "vitest";
import {
  ItemKind,
  MapId,
  PlacementRule,
  Season,
} from "@/containers/planner/domain/enums/planner";
import { PlacementIssue } from "@/containers/planner/domain/enums/placement-issue";
import { createPlan } from "@/containers/planner/domain/entities/plan";
import type {
  Catalog,
  CatalogItem,
  FarmMap,
} from "@/containers/planner/domain/schemas/assets";
import {
  canPlace,
  eraseAt,
  movePlacement,
  movePlacements,
  placeItem,
} from "@/containers/planner/lib/placement";

const coop: CatalogItem = {
  id: "building:Coop",
  name: "Coop",
  kind: ItemKind.BUILDING,
  texture: "",
  sprite: { x: 0, y: 0, width: 48, height: 48 },
  footprint: { width: 2, height: 2 },
  rule: PlacementRule.BUILDABLE,
};
const crop: CatalogItem = {
  id: "crop:example",
  name: "Spring crop",
  kind: ItemKind.CROP,
  texture: "",
  sprite: { x: 0, y: 0, width: 16, height: 16 },
  footprint: { width: 1, height: 1 },
  rule: PlacementRule.DIGGABLE,
  seasons: [Season.SPRING],
};
const floor: CatalogItem = {
  id: "floor:wood",
  name: "Wood floor",
  kind: ItemKind.FLOOR,
  texture: "",
  sprite: { x: 0, y: 0, width: 16, height: 16 },
  footprint: { width: 1, height: 1 },
  rule: PlacementRule.OPEN_GROUND,
};
const drySoil: CatalogItem = {
  id: "soil:dry",
  name: "Tilled soil",
  kind: ItemKind.SOIL,
  texture: "",
  sprite: { x: 16, y: 16, width: 16, height: 16 },
  footprint: { width: 1, height: 1 },
  rule: PlacementRule.DIGGABLE,
};
const wateredSoil: CatalogItem = {
  ...drySoil,
  id: "soil:watered",
  name: "Watered soil",
  sprite: { x: 64, y: 16, width: 16, height: 16 },
};
const catalog: Catalog = {
  sources: [],
  items: [coop, crop, floor, drySoil, wateredSoil],
};
const map: FarmMap = {
  id: MapId.STANDARD,
  name: "Fixture",
  width: 5,
  height: 5,
  tileSize: 16,
  layers: [
    {
      name: "Back",
      gids: Array.from({ length: 25 }, (_, index) => (index === 12 ? 2 : 1)),
    },
    {
      name: "Buildings",
      gids: Array.from({ length: 25 }, (_, index) => (index === 4 ? 3 : 0)),
    },
  ],
  tilesets: [
    {
      firstGid: 1,
      tileCount: 3,
      columns: 3,
      tileWidth: 16,
      tileHeight: 16,
      images: { spring: "", summer: "", fall: "", winter: "" },
      tileProperties: {
        "0": { Buildable: "T", Diggable: "T" },
        "1": { Type: "Water" },
        "2": {},
      },
    },
  ],
};

describe("placement rules and edit operations", () => {
  it("rejects a building at map edges, water, and fixed map structures", () => {
    const plan = createPlan(MapId.STANDARD);
    expect(canPlace(plan, map, catalog, coop, 0, 0)).toEqual([]);
    expect(canPlace(plan, map, catalog, coop, 4, 3)).toContain(
      PlacementIssue.OUT_OF_BOUNDS,
    );
    expect(canPlace(plan, map, catalog, coop, 1, 1)).toContain(
      PlacementIssue.SURFACE,
    );
    expect(canPlace(plan, map, catalog, coop, 3, 0)).toContain(
      PlacementIssue.STATIC_BLOCK,
    );
  });

  it("accepts dirt that is diggable even without an explicit Buildable property", () => {
    const dirtMap: FarmMap = {
      ...map,
      tilesets: [
        {
          ...map.tilesets[0],
          tileProperties: {
            ...map.tilesets[0].tileProperties,
            "0": { Diggable: "T", Type: "Dirt" },
          },
        },
      ],
    };
    expect(
      canPlace(createPlan(MapId.STANDARD), dirtMap, catalog, coop, 0, 0),
    ).toEqual([]);
  });

  it("prevents overlap and allows a move without colliding with itself", () => {
    const first = placeItem(
      createPlan(MapId.STANDARD),
      map,
      catalog,
      coop,
      0,
      0,
    );
    const placedCoop = first.placements.find(
      (placed) => placed.itemId === coop.id,
    );
    expect(placedCoop).toBeDefined();
    expect(canPlace(first, map, catalog, crop, 1, 0)).toContain(
      PlacementIssue.OCCUPIED,
    );
    expect(placeItem(first, map, catalog, coop, 0, 0)).toBe(first);
    const moved = movePlacement(first, map, catalog, placedCoop!.id, 0, 1);
    expect(
      moved.placements.find((placed) => placed.id === placedCoop!.id)?.y,
    ).toBe(1);
  });

  it("handles crop season, floor paint, and erasing", () => {
    const plan = createPlan(MapId.STANDARD);
    expect(
      canPlace({ ...plan, season: Season.WINTER }, map, catalog, crop, 0, 0),
    ).toContain(PlacementIssue.SEASON);
    const painted = placeItem(plan, map, catalog, floor, 0, 0);
    expect(painted.ground["0,0"]).toBe(floor.id);
    expect(eraseAt(painted, catalog, 0, 0).ground["0,0"]).toBeUndefined();
  });

  it("paints dry or watered soil beneath crops on diggable tiles", () => {
    const planted = placeItem(
      createPlan(MapId.STANDARD),
      map,
      catalog,
      crop,
      0,
      0,
    );
    const dry = placeItem(planted, map, catalog, drySoil, 0, 0);
    expect(dry.ground["0,0"]).toBe(drySoil.id);
    expect(dry.placements).toEqual(planted.placements);
    const watered = placeItem(dry, map, catalog, wateredSoil, 0, 0);
    expect(watered.ground["0,0"]).toBe(wateredSoil.id);
    expect(watered.placements).toEqual(planted.placements);
    expect(placeItem(watered, map, catalog, drySoil, 2, 2)).toBe(watered);
    expect(placeItem(watered, map, catalog, drySoil, 4, 0)).toBe(watered);
  });

  it("moves a selected group together and rejects collisions with unselected items", () => {
    const first = placeItem(
      createPlan(MapId.STANDARD),
      map,
      catalog,
      crop,
      0,
      0,
    );
    const second = placeItem(first, map, catalog, crop, 1, 0);
    const ids = second.placements
      .filter((placed) => placed.itemId === crop.id)
      .map((placed) => placed.id);
    const moved = movePlacements(second, map, catalog, ids, 1, 1);
    expect(
      moved.placements
        .filter((placed) => ids.includes(placed.id))
        .map((placed) => [placed.x, placed.y]),
    ).toEqual([
      [1, 1],
      [2, 1],
    ]);
    const blocked = placeItem(second, map, catalog, crop, 2, 1);
    expect(movePlacements(blocked, map, catalog, ids, 1, 1)).toBe(blocked);
  });
});
