import { expect, it } from "vitest";
import { MapId } from "@/containers/planner/domain/enums/planner";
import {
  createPlan,
  editInterior,
  interiorScenePlan,
} from "@/containers/planner/domain/entities/plan";
import { PlanSchema } from "@/containers/planner/domain/schemas/plan";

it("loads a version 1 plan saved before interiors were added", () => {
  const { interiors: _interiors, ...oldPlan } = createPlan(MapId.STANDARD);
  const loaded = PlanSchema.parse(oldPlan);
  expect(loaded.interiors).toEqual({});
  expect(loaded.placements).toEqual(oldPlan.placements);
});

it("keeps interior edits with their building and preserves the outdoor plan", () => {
  const plan = createPlan(MapId.STANDARD);
  const edited = editInterior(plan, "default-farmhouse", (scene) => ({
    ...scene,
    ground: { "4,5": "floor:wood" },
    placements: [
      { id: "chair-1", itemId: "furniture:0", x: 4, y: 5, rotation: 0 },
    ],
  }));
  expect(edited.placements).toEqual(plan.placements);
  expect(edited.ground).toEqual({});
  expect(
    interiorScenePlan(edited, "default-farmhouse").placements,
  ).toHaveLength(1);
  expect(interiorScenePlan(edited, "another-building").placements).toEqual([]);
  expect(
    PlanSchema.parse(edited).interiors["default-farmhouse"].ground,
  ).toEqual({
    "4,5": "floor:wood",
  });
});
