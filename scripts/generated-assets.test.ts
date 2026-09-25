import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CatalogSchema,
  MapIndexSchema,
  MapSchema,
} from "@/containers/planner/domain/schemas/assets";
import { decodeGid, tilesetFor } from "@/containers/planner/lib/tiles";
import {
  FloorConnectType,
  ItemKind,
  MapId,
} from "@/containers/planner/domain/enums/planner";
import { createPlan } from "@/containers/planner/domain/entities/plan";
import { canPlace } from "@/containers/planner/lib/placement";

const output = path.resolve("public/game-assets");
const generated = existsSync(path.join(output, "index.json"));
const json = (relative: string) =>
  JSON.parse(readFileSync(path.join(output, relative), "utf8")) as unknown;
const pngSize = (relative: string) => {
  const bytes = readFileSync(path.join(output, relative));
  expect(bytes.toString("ascii", 1, 4)).toBe("PNG");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
};

describe.skipIf(!generated)("generated game assets", () => {
  it("retains the eight vanilla map dimensions and ordered TMX layers", () => {
    const index = MapIndexSchema.parse(json("index.json"));
    expect(index.maps).toHaveLength(8);
    expect(index.maps.find((entry) => entry.id === "standard")).toMatchObject({
      width: 80,
      height: 65,
      sourcePath: "Maps/Farm.tmx",
    });
    expect(index.maps.find((entry) => entry.id === "beach")).toMatchObject({
      width: 110,
      height: 110,
    });
    expect(
      index.maps.find((entry) => entry.id === "four-corners"),
    ).toMatchObject({ width: 80, height: 80 });
    for (const entry of index.maps) {
      const map = MapSchema.parse(json(`maps/${entry.id}.json`));
      expect(map.layers[0].name).toBe("Back");
      expect(
        map.layers.findIndex((layer) => layer.name === "Buildings"),
      ).toBeGreaterThan(0);
      for (const layer of map.layers) {
        expect(layer.gids).toHaveLength(map.width * map.height);
        for (const raw of layer.gids) {
          const gid = decodeGid(raw).gid;
          if (gid)
            expect(
              tilesetFor(map, gid),
              `${entry.id}/${layer.name} GID ${gid}`,
            ).toBeDefined();
        }
      }
      for (const tileset of map.tilesets) {
        for (const relative of Object.values(tileset.images))
          expect(existsSync(path.join(output, relative))).toBe(true);
      }
    }
  });

  it("removes farm debris tiles without clearing other Paths-layer art", () => {
    const index = MapIndexSchema.parse(json("index.json"));
    const dirtyGroundIndices = new Set(
      [335, 336, 360, 592, 617, 642, 689, 693, 714, 718, 743].map(
        (gid) => gid - 129,
      ),
    );
    for (const entry of index.maps) {
      const map = MapSchema.parse(json(`maps/${entry.id}.json`));
      const paths = map.layers.find((layer) => layer.name === "Paths");
      const back = map.layers.find((layer) => layer.name === "Back");
      expect(paths).toBeDefined();
      expect(back).toBeDefined();
      for (const raw of paths?.gids ?? []) {
        const gid = decodeGid(raw).gid;
        if (!gid) continue;
        expect(
          tilesetFor(map, gid)?.images.spring.endsWith("/paths.png"),
          `${entry.id} still contains a debris tile`,
        ).toBe(false);
      }
      for (const raw of back?.gids ?? []) {
        const gid = decodeGid(raw).gid;
        if (!gid) continue;
        const sheet = tilesetFor(map, gid);
        if (sheet?.images.spring.endsWith("/spring_outdoorsTileSheet.png")) {
          expect(
            dirtyGroundIndices.has(gid - sheet.firstGid),
            `${entry.id} still contains a dirty ground tile`,
          ).toBe(false);
        }
      }
      if (entry.id === "meadowlands") {
        expect(paths?.gids.some((gid) => gid !== 0)).toBe(true);
      }
    }
  });

  it("has real source images and in-bounds sprite rectangles for catalog items", () => {
    const catalog = CatalogSchema.parse(json("catalog.json"));
    expect(catalog.items.length).toBeGreaterThan(900);
    expect(catalog.sources).toContain("Data/Buildings.json");
    expect(catalog.sources).toContain("Data/Furniture.json");
    expect(catalog.sources).toContain("Data/Fences.json");
    expect(new Set(catalog.items.map((item) => item.id)).size).toBe(
      catalog.items.length,
    );
    expect(
      catalog.items.filter((item) => item.id.startsWith("floor:")),
    ).toHaveLength(13);
    expect(
      catalog.items.filter(
        (item) => item.connectType === FloorConnectType.DEFAULT,
      ),
    ).toHaveLength(6);
    expect(
      catalog.items.filter(
        (item) => item.connectType === FloorConnectType.PATH,
      ),
    ).toHaveLength(5);
    expect(
      catalog.items.filter(
        (item) => item.connectType === FloorConnectType.RANDOM,
      ),
    ).toHaveLength(1);
    expect(
      catalog.items.filter(
        (item) => item.connectType === FloorConnectType.CORNER_DECORATED,
      ),
    ).toHaveLength(1);
    expect(
      catalog.items.find((item) => item.id === "object:325"),
    ).toMatchObject({
      kind: ItemKind.FENCE,
      texture: "images/LooseSprites/Fence1.png",
      sprite: { x: 32, y: 160, width: 16, height: 32 },
    });
    expect(
      catalog.items.filter((item) => item.id.startsWith("crop:")),
    ).toHaveLength(50);
    expect(
      catalog.items.filter((item) => item.id.startsWith("soil:")),
    ).toHaveLength(2);
    expect(catalog.items.find((item) => item.id === "soil:dry")).toMatchObject({
      name: "Tilled soil",
      rule: "diggable",
      sprite: { x: 0, y: 0, width: 16, height: 16 },
    });
    expect(
      catalog.items.find((item) => item.id === "soil:watered"),
    ).toMatchObject({
      name: "Watered soil",
      rule: "diggable",
      sprite: { x: 64, y: 0, width: 16, height: 16 },
      fill: { sprite: { x: 0, y: 0, width: 16, height: 16 } },
    });
    expect(
      catalog.items.filter((item) => item.id.startsWith("tree:")),
    ).toHaveLength(9);
    expect(
      catalog.items.filter((item) => item.id.startsWith("object:")),
    ).toHaveLength(17);
    for (const item of catalog.items) {
      expect(existsSync(path.join(output, item.texture)), item.id).toBe(true);
      for (const relative of new Set([
        item.texture,
        ...Object.values(item.textures ?? {}),
      ])) {
        expect(existsSync(path.join(output, relative)), item.id).toBe(true);
        const size = pngSize(relative);
        for (const sprite of [
          item.sprite,
          ...Object.values(item.sprites ?? {}),
          ...(item.variants?.map((variant) => variant.sprite) ?? []),
        ]) {
          expect(
            sprite.x + sprite.width,
            `${item.id} sprite in ${relative}`,
          ).toBeLessThanOrEqual(size.width);
          expect(
            sprite.y + sprite.height,
            `${item.id} sprite in ${relative}`,
          ).toBeLessThanOrEqual(size.height);
        }
      }
      if (item.fill) {
        for (const relative of Object.values(item.fill.textures)) {
          expect(existsSync(path.join(output, relative)), item.id).toBe(true);
          const size = pngSize(relative);
          expect(
            item.fill.sprite.x + item.fill.sprite.width,
          ).toBeLessThanOrEqual(size.width);
          expect(
            item.fill.sprite.y + item.fill.sprite.height,
          ).toBeLessThanOrEqual(size.height);
        }
      }
    }
  });

  const sourceFiles = [
    "Furniture.json",
    "Buildings.json",
    "BigCraftables.json",
    "FruitTrees.json",
  ];
  it.skipIf(
    !sourceFiles.every((name) =>
      existsSync(path.resolve("local-assets/unpacked/Data", name)),
    ),
  )("matches item IDs from the local game extraction", () => {
    const catalog = CatalogSchema.parse(json("catalog.json"));
    const sourceJson = (name: string) =>
      JSON.parse(
        readFileSync(path.resolve("local-assets/unpacked/Data", name), "utf8"),
      ) as Record<string, unknown>;
    const sourceIds = {
      furniture: Object.keys(sourceJson("Furniture.json")),
      building: Object.keys(sourceJson("Buildings.json")),
      craftable: Object.keys(sourceJson("BigCraftables.json")),
      "fruit-tree": Object.keys(sourceJson("FruitTrees.json")),
    };
    for (const [kind, ids] of Object.entries(sourceIds)) {
      expect(
        catalog.items.filter((item) => item.id.startsWith(`${kind}:`)),
      ).toHaveLength(ids.length);
      for (const id of ids)
        expect(catalog.items.some((item) => item.id === `${kind}:${id}`)).toBe(
          true,
        );
    }
  });

  it("generates linked interior maps with valid layers and textures", () => {
    const catalog = CatalogSchema.parse(json("catalog.json"));
    const report = json("generation-report.json") as { interiors: string[] };
    expect(report.interiors).toHaveLength(13);
    const interiorIds = report.interiors.map((entry) => entry.split(":", 1)[0]);
    for (const entry of report.interiors) {
      const id = entry.split(":", 1)[0];
      const map = MapSchema.parse(json(`interiors/${id}.json`));
      expect(map.layers[0].name).toBe("Back");
      for (const layer of map.layers) {
        expect(layer.gids).toHaveLength(map.width * map.height);
      }
      for (const tileset of map.tilesets) {
        for (const image of Object.values(tileset.images)) {
          expect(existsSync(path.join(output, image))).toBe(true);
        }
      }
    }
    for (const item of catalog.items) {
      if (item.interior) expect(interiorIds).toContain(item.interior);
    }
  });

  it("offers valid tiles for representative new placeable types", () => {
    const catalog = CatalogSchema.parse(json("catalog.json"));
    const farm = MapSchema.parse(json("maps/standard.json"));
    const coop = MapSchema.parse(json("interiors/coop.json"));
    const plan = createPlan(MapId.STANDARD);
    for (const [id, map] of [
      ["building:Fish Pond", farm],
      ["fruit-tree:628", farm],
      ["object:710", farm],
      ["object:297", farm],
      ["furniture:192", coop],
      ["furniture:1228", coop],
      ["furniture:1402", coop],
    ] as const) {
      const item = catalog.items.find((candidate) => candidate.id === id);
      expect(item, id).toBeDefined();
      const positions = Array.from(
        { length: map.width * map.height },
        (_, index) => ({
          x: index % map.width,
          y: Math.floor(index / map.width),
        }),
      );
      expect(
        positions.some(
          ({ x, y }) => !canPlace(plan, map, catalog, item!, x, y).length,
        ),
        id,
      ).toBe(true);
    }
    const pot = catalog.items.find((item) => item.id === "object:710")!;
    const keg = catalog.items.find((item) => item.id === "craftable:12")!;
    expect(canPlace(plan, farm, catalog, pot, 71, 30)).toEqual([]);
    expect(canPlace(plan, farm, catalog, keg, 71, 30).length).toBeGreaterThan(
      0,
    );
    expect(canPlace(plan, farm, catalog, pot, 49, 7).length).toBeGreaterThan(0);
    const calendar = catalog.items.find(
      (item) => item.id === "furniture:1402",
    )!;
    expect(canPlace(plan, coop, catalog, calendar, 2, 1)).toEqual([]);
    expect(
      canPlace(plan, coop, catalog, calendar, 2, 5).length,
    ).toBeGreaterThan(0);
    const bench = catalog.items.find((item) => item.id === "furniture:192")!;
    const rug = catalog.items.find((item) => item.id === "furniture:1228")!;
    const withBench = {
      ...plan,
      placements: [{ id: "bench", itemId: bench.id, x: 1, y: 3, rotation: 0 }],
    };
    expect(canPlace(withBench, coop, catalog, rug, 1, 3)).toEqual([]);
    const withRug = {
      ...plan,
      placements: [{ id: "rug", itemId: rug.id, x: 1, y: 3, rotation: 0 }],
    };
    expect(canPlace(withRug, coop, catalog, bench, 1, 3)).toEqual([]);
  });

  it("reports no unresolved or unsupported assets", () => {
    const report = json("generation-report.json") as {
      warnings: string[];
      copiedImages: number;
    };
    expect(report.warnings).toEqual([]);
    expect(report.copiedImages).toBeGreaterThan(40);
  });
});
