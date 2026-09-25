import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import type { ReactNode } from "react";
import { Tool } from "@/containers/planner/domain/enums/planner";
import { editorReducer } from "@/containers/planner/domain/entities/editor";
import type {
  EditorAction,
  EditorState,
} from "@/containers/planner/domain/entities/editor";
import { PlanRepository } from "@/containers/planner/domain/repositories/plan";

type EditorContextValue = {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
};
const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(editorReducer, undefined, () => ({
    store: PlanRepository.load(),
    tool: Tool.SELECT,
    activeItemId: "building:Coop",
    selectedIds: [],
    grid: false,
    buildableOverlay: false,
    coverageOverlay: false,
    past: [],
    future: [],
  }));

  useEffect(() => {
    const timer = window.setTimeout(
      () => PlanRepository.save(state.store),
      350,
    );
    return () => window.clearTimeout(timer);
  }, [state.store]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
}

export function useEditor() {
  const value = useContext(EditorContext);
  if (!value) throw new Error("EditorProvider is missing");
  return value;
}
