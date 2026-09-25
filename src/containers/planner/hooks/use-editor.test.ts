import { expect, it } from "vitest";
import { MapId, Season, Tool } from "@/containers/planner/domain/enums/planner";
import {
  createPlan,
  createPlanStore,
  currentPlan,
} from "@/containers/planner/domain/entities/plan";
import { editorReducer } from "@/containers/planner/domain/entities/editor";
import type { EditorState } from "@/containers/planner/domain/entities/editor";

it("undoes a multi-cell brush stroke as one history entry and redoes it", () => {
  let state: EditorState = {
    store: createPlanStore(),
    tool: Tool.PLACE,
    activeItemId: "floor:wood",
    selectedIds: [],
    grid: false,
    buildableOverlay: false,
    coverageOverlay: false,
    past: [],
    future: [],
  };
  state = editorReducer(state, { type: "begin" });
  for (const cell of ["1,1", "2,1", "3,1"]) {
    state = editorReducer(state, {
      type: "edit",
      update: (plan) => ({
        ...plan,
        ground: { ...plan.ground, [cell]: "floor:wood" },
      }),
    });
  }
  state = editorReducer(state, { type: "end" });
  expect(state.past).toHaveLength(1);
  expect(Object.keys(currentPlan(state.store).ground)).toHaveLength(3);
  state = editorReducer(state, { type: "undo" });
  expect(currentPlan(state.store).ground).toEqual({});
  state = editorReducer(state, { type: "redo" });
  expect(Object.keys(currentPlan(state.store).ground)).toHaveLength(3);
  expect(state.store.activeMapId).toBe(MapId.STANDARD);
});

it("toggles multiple selected items without losing the rest of the selection", () => {
  let state: EditorState = {
    store: createPlanStore(),
    tool: Tool.SELECT,
    activeItemId: "building:Coop",
    selectedIds: [],
    grid: false,
    buildableOverlay: false,
    coverageOverlay: false,
    past: [],
    future: [],
  };
  state = editorReducer(state, { type: "select", id: "one" });
  state = editorReducer(state, { type: "select", id: "two", mode: "toggle" });
  expect(state.selectedIds).toEqual(["one", "two"]);
  state = editorReducer(state, { type: "select", id: "one", mode: "preserve" });
  expect(state.selectedIds).toEqual(["one", "two"]);
  state = editorReducer(state, { type: "select", id: "one", mode: "toggle" });
  expect(state.selectedIds).toEqual(["two"]);
});

it("clears the palette item and placed-item selection together", () => {
  const state: EditorState = {
    store: createPlanStore(),
    tool: Tool.PLACE,
    activeItemId: "building:Coop",
    selectedIds: ["placed-coop"],
    grid: false,
    buildableOverlay: false,
    coverageOverlay: false,
    past: [],
    future: [],
  };
  const cleared = editorReducer(state, { type: "cancel-selection" });
  expect(cleared).toMatchObject({
    tool: Tool.SELECT,
    activeItemId: "",
    selectedIds: [],
  });
  expect(cleared.store).toBe(state.store);
});

it("resets only the active farm and can undo the reset", () => {
  let state: EditorState = {
    store: createPlanStore(),
    tool: Tool.PLACE,
    activeItemId: "floor:wood",
    selectedIds: ["default-farmhouse"],
    grid: false,
    buildableOverlay: false,
    coverageOverlay: false,
    past: [],
    future: [],
  };
  state = editorReducer(state, {
    type: "edit",
    update: (plan) => ({
      ...plan,
      season: Season.SUMMER,
      ground: { "1,1": "floor:wood" },
      interiors: {
        "default-farmhouse": {
          ground: { "2,2": "floor:wood" },
          placements: [],
        },
      },
    }),
  });
  const editedStandard = currentPlan(state.store);
  state = editorReducer(state, { type: "map", id: MapId.FOREST });
  state = editorReducer(state, {
    type: "edit",
    update: (plan) => ({
      ...plan,
      ground: { "3,3": "floor:wood" },
    }),
  });
  state = editorReducer(state, { type: "map", id: MapId.STANDARD });
  state = editorReducer(state, { type: "reset-map" });

  expect(currentPlan(state.store)).toEqual(createPlan(MapId.STANDARD));
  expect(state.store.plans[MapId.FOREST]?.ground).toEqual({
    "3,3": "floor:wood",
  });
  expect(state.tool).toBe(Tool.SELECT);
  expect(state.selectedIds).toEqual([]);
  expect(state.activeItemId).toBe("");
  expect(state.past).toHaveLength(1);

  state = editorReducer(state, { type: "undo" });
  expect(currentPlan(state.store)).toEqual(editedStandard);
  state = editorReducer(state, { type: "redo" });
  expect(currentPlan(state.store)).toEqual(createPlan(MapId.STANDARD));
});
