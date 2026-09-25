import { MapId, Season } from "@/containers/planner/domain/enums/planner";
import type {
  FarmPlan,
  PlanStore,
} from "@/containers/planner/domain/schemas/plan";

export function createPlan(mapId: MapId): FarmPlan {
  return {
    schemaVersion: 1,
    mapId,
    season: Season.SPRING,
    ground: {},
    interiors: {},
    placements:
      mapId === MapId.STANDARD
        ? [
            {
              id: "default-farmhouse",
              itemId: "building:Farmhouse",
              x: 59,
              y: 13,
              rotation: 0,
              variant: "starter",
            },
            {
              id: "default-greenhouse",
              itemId: "building:Greenhouse",
              x: 25,
              y: 6,
              rotation: 0,
              variant: "ruined",
            },
            {
              id: "default-shipping-bin",
              itemId: "building:Shipping Bin",
              x: 71,
              y: 14,
              rotation: 0,
            },
          ]
        : [],
  };
}

export function createPlanStore(): PlanStore {
  return {
    activeMapId: MapId.STANDARD,
    plans: { [MapId.STANDARD]: createPlan(MapId.STANDARD) },
  };
}

export function currentPlan(store: PlanStore): FarmPlan {
  return store.plans[store.activeMapId] ?? createPlan(store.activeMapId);
}

export function withPlan(store: PlanStore, plan: FarmPlan): PlanStore {
  return { ...store, plans: { ...store.plans, [plan.mapId]: plan } };
}

export function interiorScenePlan(
  plan: FarmPlan,
  buildingId: string,
): FarmPlan {
  const interior = plan.interiors[buildingId] ?? { ground: {}, placements: [] };
  return { ...plan, ground: interior.ground, placements: interior.placements };
}

export function editInterior(
  plan: FarmPlan,
  buildingId: string,
  update: (scene: FarmPlan) => FarmPlan,
): FarmPlan {
  const scene = interiorScenePlan(plan, buildingId);
  const after = update(scene);
  if (after === scene) return plan;
  return {
    ...plan,
    interiors: {
      ...plan.interiors,
      [buildingId]: { ground: after.ground, placements: after.placements },
    },
  };
}
