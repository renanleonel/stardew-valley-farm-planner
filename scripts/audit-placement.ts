import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CatalogSchema,
  MapSchema,
} from "@/containers/planner/domain/schemas/assets";
import { canPlace } from "@/containers/planner/lib/placement";
import { createPlan } from "@/containers/planner/domain/entities/plan";
import { gidAt, tileProperties } from "@/containers/planner/lib/tiles";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "game-assets",
);
const catalog = CatalogSchema.parse(
  JSON.parse(await readFile(path.join(root, "catalog.json"), "utf8")),
);
for (const id of [
  "standard",
  "riverland",
  "forest",
  "hilltop",
  "wilderness",
  "four-corners",
  "beach",
  "meadowlands",
]) {
  const map = MapSchema.parse(
    JSON.parse(await readFile(path.join(root, "maps", `${id}.json`), "utf8")),
  );
  const plan = createPlan(map.id);
  const item = catalog.items.find((entry) => entry.id === "building:Coop");
  if (!item) throw new Error("Coop is missing");
  let valid = 0;
  let example = "";
  const surfaceCounts = new Map<string, number>();
  let staticTiles = 0;
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const back = tileProperties(map, gidAt(map, "Back", x, y));
      const surface = `${back.Type ?? "none"}:${back.Buildable ?? "-"}:${back.Diggable ?? "-"}`;
      surfaceCounts.set(surface, (surfaceCounts.get(surface) ?? 0) + 1);
      if (gidAt(map, "Buildings", x, y)) staticTiles += 1;
      if (canPlace(plan, map, catalog, item, x, y).length === 0) {
        valid += 1;
        if (!example) example = `${x},${y}`;
      }
    }
  }
  console.log(
    `${map.name}: ${valid} valid Coop anchors; first ${example || "none"}`,
  );
  if (id === "standard") {
    console.log(
      "Standard tile 23,24:",
      gidAt(map, "Back", 23, 24),
      tileProperties(map, gidAt(map, "Back", 23, 24)),
    );
    console.log(
      "Static tiles:",
      staticTiles,
      "Surfaces:",
      [...surfaceCounts].sort((a, b) => b[1] - a[1]).slice(0, 12),
    );
    for (const buildingName of ["Farmhouse", "Greenhouse"]) {
      const building = catalog.items.find(
        (entry) => entry.id === `building:${buildingName}`,
      );
      if (!building) throw new Error(`${buildingName} is missing`);
      let first = "none";
      for (let y = 0; y < map.height && first === "none"; y += 1) {
        for (let x = 0; x < map.width; x += 1) {
          if (!canPlace(plan, map, catalog, building, x, y).length) {
            first = `${x},${y}`;
            break;
          }
        }
      }
      console.log(`${buildingName} first valid anchor: ${first}`);
    }
  }
}
