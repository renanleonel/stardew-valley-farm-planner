import { readFileSync } from "node:fs";
import { MapId, Season } from "@/containers/planner/domain/enums/planner";
import { createPlan } from "@/containers/planner/domain/entities/plan";
import {
  CatalogSchema,
  MapSchema,
} from "@/containers/planner/domain/schemas/assets";
import { canPlace } from "@/containers/planner/lib/placement";

const catalog = CatalogSchema.parse(
  JSON.parse(readFileSync("public/game-assets/catalog.json", "utf8")),
);
const farm = MapSchema.parse(
  JSON.parse(readFileSync("public/game-assets/maps/standard.json", "utf8")),
);
const house = MapSchema.parse(
  JSON.parse(
    readFileSync("public/game-assets/interiors/farmhouse2.json", "utf8"),
  ),
);
const missing: string[] = [];
for (const item of catalog.items) {
  const plan = {
    ...createPlan(MapId.STANDARD),
    season: item.seasons?.[0] ?? Season.SPRING,
  };
  const scenes =
    item.outdoor === false ? [house] : item.indoor ? [farm, house] : [farm];
  let valid = false;
  for (const map of scenes) {
    for (let y = 0; y < map.height && !valid; y++) {
      for (let x = 0; x < map.width; x++) {
        if (!canPlace(plan, map, catalog, item, x, y).length) {
          valid = true;
          break;
        }
      }
    }
    if (valid) break;
  }
  if (!valid) missing.push(`${item.id} ${item.name}`);
}
console.log(
  JSON.stringify(
    {
      total: catalog.items.length,
      placeable: catalog.items.length - missing.length,
      missing,
    },
    null,
    2,
  ),
);
if (missing.length) process.exitCode = 1;
