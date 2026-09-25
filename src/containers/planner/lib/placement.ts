import {
  ItemKind,
  PlacementRule,
  Season,
} from "@/containers/planner/domain/enums/planner";
import { PlacementIssue } from "@/containers/planner/domain/enums/placement-issue";
import type {
  Catalog,
  CatalogItem,
  FarmMap,
} from "@/containers/planner/domain/schemas/assets";
import type {
  FarmPlan,
  Placement,
} from "@/containers/planner/domain/schemas/plan";
import { gidAt, tileKey, tileProperties } from "@/containers/planner/lib/tiles";

function isTrue(value: string | undefined) {
  return value === "T" || value?.toLowerCase() === "true";
}

export function isBuildableTerrain(map: FarmMap, x: number, y: number) {
  if (
    x < 0 ||
    y < 0 ||
    x >= map.width ||
    y >= map.height ||
    gidAt(map, "Buildings", x, y)
  )
    return false;
  const back = tileProperties(map, gidAt(map, "Back", x, y));
  return isTrue(back.Buildable) || isTrue(back.Diggable);
}

function overlaps(
  x: number,
  y: number,
  item: CatalogItem,
  placement: Placement,
  placedItem: CatalogItem,
) {
  return (
    x < placement.x + placedItem.footprint.width &&
    x + item.footprint.width > placement.x &&
    y < placement.y + placedItem.footprint.height &&
    y + item.footprint.height > placement.y
  );
}

export function itemById(catalog: Catalog, id: string) {
  return catalog.items.find((item) => item.id === id);
}

export function findPlacementAt(
  plan: FarmPlan,
  catalog: Catalog,
  x: number,
  y: number,
): Placement | undefined {
  const atTile = (placed: Placement) => {
    const item = itemById(catalog, placed.itemId);
    return (
      item &&
      x >= placed.x &&
      x < placed.x + item.footprint.width &&
      y >= placed.y &&
      y < placed.y + item.footprint.height
    );
  };
  return (
    plan.placements.findLast(
      (placed) => atTile(placed) && !itemById(catalog, placed.itemId)?.underlay,
    ) ?? plan.placements.findLast(atTile)
  );
}

export function canPlace(
  plan: FarmPlan,
  map: FarmMap,
  catalog: Catalog,
  item: CatalogItem,
  x: number,
  y: number,
  ignorePlacementIds?: string | ReadonlySet<string>,
): PlacementIssue[] {
  const problems = new Set<PlacementIssue>();
  if (
    item.kind === ItemKind.CROP &&
    item.seasons &&
    !item.seasons.includes(plan.season)
  )
    problems.add(PlacementIssue.SEASON);
  for (let dy = 0; dy < item.footprint.height; dy += 1) {
    for (let dx = 0; dx < item.footprint.width; dx += 1) {
      const tx = x + dx;
      const ty = y + dy;
      if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) {
        problems.add(PlacementIssue.OUT_OF_BOUNDS);
        continue;
      }
      const backGid = gidAt(map, "Back", tx, ty);
      const back = tileProperties(map, backGid);
      const buildingGid = gidAt(map, "Buildings", tx, ty);
      if (item.wallMounted) {
        if (!buildingGid || tx === 0 || tx === map.width - 1 || ty === 0)
          problems.add(PlacementIssue.SURFACE);
      } else if (buildingGid !== 0) problems.add(PlacementIssue.STATIC_BLOCK);
      if (
        item.rule === PlacementRule.BUILDABLE &&
        !isTrue(back.Buildable) &&
        !isTrue(back.Diggable)
      )
        problems.add(PlacementIssue.SURFACE);
      if (item.rule === PlacementRule.DIGGABLE && !isTrue(back.Diggable))
        problems.add(PlacementIssue.SURFACE);
      if (
        item.rule === PlacementRule.TREE_GROUND &&
        (back.CanPlantTrees === "F" ||
          back.CanPlantTrees === "False" ||
          (!isTrue(back.CanPlantTrees) &&
            !isTrue(back.Diggable) &&
            !isTrue(back.Buildable)))
      ) {
        problems.add(PlacementIssue.SURFACE);
      }
      if (
        item.rule === PlacementRule.OPEN_GROUND &&
        (!backGid || isTrue(back.Water) || back.Type === "Stone")
      )
        problems.add(PlacementIssue.SURFACE);
      if (item.rule === PlacementRule.WATER && !isTrue(back.Water))
        problems.add(PlacementIssue.SURFACE);
    }
  }
  if (
    item.kind !== ItemKind.FLOOR &&
    item.kind !== ItemKind.SOIL &&
    !item.underlay
  ) {
    for (const placed of plan.placements) {
      if (
        placed.id === ignorePlacementIds ||
        (ignorePlacementIds instanceof Set && ignorePlacementIds.has(placed.id))
      )
        continue;
      const placedItem = itemById(catalog, placed.itemId);
      if (
        placedItem &&
        !placedItem.underlay &&
        overlaps(x, y, item, placed, placedItem)
      )
        problems.add(PlacementIssue.OCCUPIED);
    }
  }
  return [...problems];
}

export function placeItem(
  plan: FarmPlan,
  map: FarmMap,
  catalog: Catalog,
  item: CatalogItem,
  x: number,
  y: number,
): FarmPlan {
  if (canPlace(plan, map, catalog, item, x, y).length) return plan;
  if (item.kind === ItemKind.FLOOR || item.kind === ItemKind.SOIL) {
    const key = tileKey(x, y);
    if (plan.ground[key] === item.id) return plan;
    return { ...plan, ground: { ...plan.ground, [key]: item.id } };
  }
  const placement: Placement = {
    id: crypto.randomUUID(),
    itemId: item.id,
    x,
    y,
    rotation: 0,
  };
  return { ...plan, placements: [...plan.placements, placement] };
}

export function movePlacement(
  plan: FarmPlan,
  map: FarmMap,
  catalog: Catalog,
  id: string,
  x: number,
  y: number,
): FarmPlan {
  const placed = plan.placements.find((candidate) => candidate.id === id);
  if (!placed) return plan;
  return movePlacements(plan, map, catalog, [id], x - placed.x, y - placed.y);
}

export function movePlacements(
  plan: FarmPlan,
  map: FarmMap,
  catalog: Catalog,
  ids: readonly string[],
  dx: number,
  dy: number,
): FarmPlan {
  if ((!dx && !dy) || !ids.length) return plan;
  const selected = new Set(ids);
  for (const placed of plan.placements) {
    if (!selected.has(placed.id)) continue;
    const item = itemById(catalog, placed.itemId);
    if (
      !item ||
      canPlace(plan, map, catalog, item, placed.x + dx, placed.y + dy, selected)
        .length
    )
      return plan;
  }
  return {
    ...plan,
    placements: plan.placements.map((candidate) =>
      selected.has(candidate.id)
        ? { ...candidate, x: candidate.x + dx, y: candidate.y + dy }
        : candidate,
    ),
  };
}

export function eraseAt(
  plan: FarmPlan,
  catalog: Catalog,
  x: number,
  y: number,
): FarmPlan {
  const placed = findPlacementAt(plan, catalog, x, y);
  if (placed)
    return {
      ...plan,
      placements: plan.placements.filter(
        (candidate) => candidate.id !== placed.id,
      ),
    };
  const key = tileKey(x, y);
  if (!plan.ground[key]) return plan;
  const ground = { ...plan.ground };
  delete ground[key];
  return { ...plan, ground };
}

export function seasonLabel(season: Season) {
  return season.charAt(0).toUpperCase() + season.slice(1);
}
