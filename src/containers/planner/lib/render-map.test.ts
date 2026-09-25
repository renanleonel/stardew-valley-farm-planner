import { describe, expect, it } from "vitest";
import {
  FloorConnectType,
  ItemKind,
  MapId,
  PlacementRule,
} from "@/containers/planner/domain/enums/planner";
import { createPlan } from "@/containers/planner/domain/entities/plan";
import type {
  Catalog,
  FarmMap,
} from "@/containers/planner/domain/schemas/assets";
import {
  paintGround,
  paintPlacements,
} from "@/containers/planner/lib/render-map";

const texture = "images/TerrainFeatures/hoeDirt.png";
const sprite = { x: 0, y: 0, width: 16, height: 16 };
const catalog: Catalog = {
  sources: [],
  items: [
    {
      id: "soil:dry",
      name: "Tilled soil",
      kind: ItemKind.SOIL,
      texture,
      sprite,
      footprint: { width: 1, height: 1 },
      rule: PlacementRule.DIGGABLE,
    },
    {
      id: "soil:watered",
      name: "Watered soil",
      kind: ItemKind.SOIL,
      texture,
      sprite: { ...sprite, x: 64 },
      footprint: { width: 1, height: 1 },
      rule: PlacementRule.DIGGABLE,
    },
    {
      id: "floor:wood",
      name: "Wood floor",
      kind: ItemKind.FLOOR,
      texture,
      sprite,
      connectType: FloorConnectType.DEFAULT,
      cornerSize: 4,
      footprint: { width: 1, height: 1 },
      rule: PlacementRule.OPEN_GROUND,
    },
    {
      id: "floor:stone",
      name: "Stone floor",
      kind: ItemKind.FLOOR,
      texture,
      sprite: { ...sprite, x: 64 },
      connectType: FloorConnectType.DEFAULT,
      cornerSize: 4,
      footprint: { width: 1, height: 1 },
      rule: PlacementRule.OPEN_GROUND,
    },
    {
      id: "floor:random",
      name: "Random path",
      kind: ItemKind.FLOOR,
      texture,
      sprite: { ...sprite, x: 80, y: 144 },
      connectType: FloorConnectType.RANDOM,
      footprint: { width: 1, height: 1 },
      rule: PlacementRule.OPEN_GROUND,
    },
    {
      id: "floor:path",
      name: "Brick path",
      kind: ItemKind.FLOOR,
      texture,
      sprite: { ...sprite, x: 64, y: 64 },
      connectType: FloorConnectType.PATH,
      cornerSize: 4,
      footprint: { width: 1, height: 1 },
      rule: PlacementRule.OPEN_GROUND,
    },
    {
      id: "floor:decorated",
      name: "Decorated floor",
      kind: ItemKind.FLOOR,
      texture,
      sprite: { ...sprite, y: 192 },
      connectType: FloorConnectType.CORNER_DECORATED,
      cornerSize: 6,
      footprint: { width: 1, height: 1 },
      rule: PlacementRule.OPEN_GROUND,
    },
    {
      id: "fence:wood",
      name: "Wood fence",
      kind: ItemKind.FENCE,
      texture,
      sprite: { x: 32, y: 32, width: 16, height: 32 },
      footprint: { width: 1, height: 1 },
      rule: PlacementRule.OPEN_GROUND,
    },
    {
      id: "fence:stone",
      name: "Stone fence",
      kind: ItemKind.FENCE,
      texture,
      sprite: { x: 32, y: 32, width: 16, height: 32 },
      footprint: { width: 1, height: 1 },
      rule: PlacementRule.OPEN_GROUND,
    },
    {
      id: "object:325",
      name: "Gate",
      kind: ItemKind.FENCE,
      texture,
      sprite: { x: 32, y: 160, width: 16, height: 32 },
      footprint: { width: 1, height: 1 },
      rule: PlacementRule.OPEN_GROUND,
    },
  ],
};
const map = { tileSize: 16, width: 5, height: 5 } as FarmMap;

function drawGround(ground: Record<string, string>) {
  const draws: number[][] = [];
  const context = {
    save() {},
    restore() {},
    drawImage(_image: unknown, ...args: number[]) {
      draws.push(args);
    },
  } as unknown as CanvasRenderingContext2D;
  paintGround(
    context,
    { ...createPlan(MapId.STANDARD), ground },
    catalog,
    map,
    new Map([[texture, {} as HTMLImageElement]]),
  );
  return draws;
}

function drawPlacements(
  itemIds: string[],
  rotation = 0,
  cells = itemIds.map((_, index) => [index + 1, 1]),
) {
  const draws: number[][] = [];
  const context = {
    save() {},
    restore() {},
    drawImage(_image: unknown, ...args: number[]) {
      draws.push(args);
    },
  } as unknown as CanvasRenderingContext2D;
  paintPlacements(
    context,
    {
      ...createPlan(MapId.STANDARD),
      placements: itemIds.map((itemId, index) => ({
        id: String(index),
        itemId,
        x: cells[index][0],
        y: cells[index][1],
        rotation,
      })),
    },
    catalog,
    map,
    new Map([[texture, {} as HTMLImageElement]]),
  );
  return draws;
}

describe("hoed soil rendering", () => {
  it("joins neighboring dry tiles instead of stamping the isolated tile", () => {
    expect(drawGround({ "0,0": "soil:dry" })).toEqual([
      [0, 0, 16, 16, 0, 0, 16, 16],
    ]);
    expect(drawGround({ "0,0": "soil:dry", "1,0": "soil:dry" })).toEqual([
      [16, 48, 16, 16, 0, 0, 16, 16],
      [48, 48, 16, 16, 16, 0, 16, 16],
    ]);
  });

  it("joins dirt across dry and watered tiles while joining water only to water", () => {
    expect(drawGround({ "0,0": "soil:dry", "1,0": "soil:watered" })).toEqual([
      [16, 48, 16, 16, 0, 0, 16, 16],
      [48, 48, 16, 16, 16, 0, 16, 16],
      [64, 0, 16, 16, 16, 0, 16, 16],
    ]);
  });
});

describe("connected floor and fence rendering", () => {
  it("joins matching floors and leaves different or random floors separate", () => {
    expect(drawGround({ "1,1": "floor:wood" })).toEqual([
      [0, 0, 16, 16, 16, 16, 16, 16],
    ]);
    expect(drawGround({ "1,1": "floor:wood", "2,1": "floor:wood" })).toEqual([
      [16, 48, 16, 16, 16, 16, 16, 16],
      [48, 48, 16, 16, 32, 16, 16, 16],
    ]);
    expect(drawGround({ "1,1": "floor:wood", "2,1": "floor:stone" })).toEqual([
      [0, 0, 16, 16, 16, 16, 16, 16],
      [64, 0, 16, 16, 32, 16, 16, 16],
    ]);
    expect(
      drawGround({ "1,1": "floor:random", "2,1": "floor:random" }),
    ).toEqual([
      [80, 144, 16, 16, 16, 16, 16, 16],
      [80, 144, 16, 16, 32, 16, 16, 16],
    ]);
  });

  it("joins matching fences and leaves different fence materials separate", () => {
    expect(drawPlacements(["fence:wood"])).toEqual([
      [32, 32, 16, 32, 16, 0, 16, 32],
    ]);
    expect(drawPlacements(["fence:wood", "fence:wood"])).toEqual([
      [16, 96, 16, 32, 16, 0, 16, 32],
      [0, 96, 16, 32, 32, 0, 16, 32],
    ]);
    expect(drawPlacements(["fence:wood", "fence:wood"], 1)).toEqual(
      drawPlacements(["fence:wood", "fence:wood"]),
    );
    expect(drawPlacements(["fence:wood", "fence:stone"])).toEqual([
      [32, 32, 16, 32, 16, 0, 16, 32],
      [32, 32, 16, 32, 32, 0, 16, 32],
    ]);
    expect(
      drawPlacements(
        Array.from({ length: 5 }, () => "fence:wood"),
        0,
        [
          [2, 2],
          [2, 1],
          [3, 2],
          [2, 3],
          [1, 2],
        ],
      ),
    ).toContainEqual([16, 32, 16, 32, 32, 16, 16, 32]);
  });

  it("fills missing inner corners for floors that support them", () => {
    expect(
      drawGround({
        "1,1": "floor:wood",
        "2,1": "floor:wood",
        "1,2": "floor:wood",
      }),
    ).toEqual([
      [16, 0, 16, 16, 16, 16, 16, 16],
      [16, 0, 4, 4, 28, 28, 4, 4],
      [48, 48, 16, 16, 32, 16, 16, 16],
      [0, 48, 16, 16, 16, 32, 16, 16],
    ]);
    expect(
      drawGround({
        "1,1": "floor:path",
        "2,1": "floor:path",
        "1,2": "floor:path",
      }),
    ).toHaveLength(3);
    expect(
      drawGround({
        "1,1": "floor:decorated",
        "2,1": "floor:decorated",
        "1,2": "floor:decorated",
      })[1],
    ).toEqual([16, 192, 6, 6, 26, 26, 6, 6]);
  });

  it("orients a closed gate between different fence materials", () => {
    expect(drawPlacements(["object:325"])).toEqual([
      [32, 160, 16, 32, 16, 0, 16, 32],
    ]);
    expect(drawPlacements(["fence:wood", "object:325", "fence:stone"])).toEqual(
      [
        [32, 32, 16, 32, 16, 0, 16, 32],
        [0, 128, 24, 32, 28, 0, 24, 32],
        [32, 32, 16, 32, 48, 0, 16, 32],
      ],
    );
  });
});
