import { MapId, Season, Tool } from "@/containers/planner/domain/enums/planner";
import {
  createPlan,
  currentPlan,
  withPlan,
} from "@/containers/planner/domain/entities/plan";
import type {
  FarmPlan,
  PlanStore,
} from "@/containers/planner/domain/schemas/plan";

type HistoryEntry = { before: FarmPlan; after: FarmPlan };
export type EditorState = {
  store: PlanStore;
  tool: Tool;
  activeItemId: string;
  selectedIds: string[];
  grid: boolean;
  buildableOverlay: boolean;
  coverageOverlay: boolean;
  past: HistoryEntry[];
  future: HistoryEntry[];
  gestureBefore?: FarmPlan;
};

export type EditorAction =
  | { type: "tool"; tool: Tool }
  | { type: "item"; id: string }
  | { type: "cancel-selection" }
  | { type: "select"; id?: string; mode?: "replace" | "toggle" | "preserve" }
  | { type: "map"; id: MapId }
  | { type: "season"; season: Season }
  | { type: "grid" }
  | { type: "overlay" }
  | { type: "coverage" }
  | { type: "begin" }
  | { type: "edit"; update: (plan: FarmPlan) => FarmPlan }
  | { type: "end" }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "load"; store: PlanStore };

function replaceCurrent(state: EditorState, plan: FarmPlan): EditorState {
  return { ...state, store: withPlan(state.store, plan) };
}

function pushHistory(
  state: EditorState,
  before: FarmPlan,
  after: FarmPlan,
): EditorState {
  return {
    ...state,
    past: [...state.past.slice(-99), { before, after }],
    future: [],
  };
}

export function editorReducer(
  state: EditorState,
  action: EditorAction,
): EditorState {
  switch (action.type) {
    case "tool":
      return {
        ...state,
        tool: action.tool,
        selectedIds: action.tool === Tool.SELECT ? state.selectedIds : [],
      };
    case "item":
      return {
        ...state,
        activeItemId: action.id,
        tool: Tool.PLACE,
        selectedIds: [],
      };
    case "cancel-selection":
      return {
        ...state,
        activeItemId: "",
        selectedIds: [],
        tool: Tool.SELECT,
      };
    case "select": {
      if (!action.id) return { ...state, selectedIds: [], tool: Tool.SELECT };
      const alreadySelected = state.selectedIds.includes(action.id);
      const selectedIds =
        action.mode === "toggle"
          ? alreadySelected
            ? state.selectedIds.filter((id) => id !== action.id)
            : [...state.selectedIds, action.id]
          : action.mode === "preserve" && alreadySelected
            ? state.selectedIds
            : [action.id];
      return { ...state, selectedIds, tool: Tool.SELECT };
    }
    case "map":
      return {
        ...state,
        store: {
          activeMapId: action.id,
          plans: {
            ...state.store.plans,
            [action.id]: state.store.plans[action.id] ?? createPlan(action.id),
          },
        },
        selectedIds: [],
        past: [],
        future: [],
        gestureBefore: undefined,
      };
    case "season": {
      const before = currentPlan(state.store);
      if (before.season === action.season) return state;
      const after = { ...before, season: action.season };
      return pushHistory(replaceCurrent(state, after), before, after);
    }
    case "grid":
      return { ...state, grid: !state.grid };
    case "overlay":
      return { ...state, buildableOverlay: !state.buildableOverlay };
    case "coverage":
      return { ...state, coverageOverlay: !state.coverageOverlay };
    case "begin":
      return { ...state, gestureBefore: currentPlan(state.store) };
    case "edit": {
      const before = currentPlan(state.store);
      const after = action.update(before);
      if (after === before) return state;
      const changed = replaceCurrent(state, after);
      return state.gestureBefore
        ? changed
        : pushHistory(changed, before, after);
    }
    case "end": {
      const after = currentPlan(state.store);
      const before = state.gestureBefore;
      const ended = { ...state, gestureBefore: undefined };
      return before && before !== after
        ? pushHistory(ended, before, after)
        : ended;
    }
    case "undo": {
      const entry = state.past.at(-1);
      if (!entry) return state;
      return {
        ...replaceCurrent(state, entry.before),
        past: state.past.slice(0, -1),
        future: [...state.future, entry],
        selectedIds: [],
      };
    }
    case "redo": {
      const entry = state.future.at(-1);
      if (!entry) return state;
      return {
        ...replaceCurrent(state, entry.after),
        past: [...state.past, entry],
        future: state.future.slice(0, -1),
        selectedIds: [],
      };
    }
    case "load":
      return {
        ...state,
        store: action.store,
        selectedIds: [],
        past: [],
        future: [],
        gestureBefore: undefined,
      };
  }
}
