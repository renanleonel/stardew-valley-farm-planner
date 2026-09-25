import { StorageKey } from "@/containers/planner/domain/enums/planner";
import { createPlanStore } from "@/containers/planner/domain/entities/plan";
import { PlanStoreSchema } from "@/containers/planner/domain/schemas/plan";
import type { PlanStore } from "@/containers/planner/domain/schemas/plan";

export class InvalidSavedPlanError extends Error {
  constructor() {
    super(
      "The saved plan could not be read. Download a copy before resetting your local plans.",
    );
    this.name = "InvalidSavedPlanError";
  }
}

export const PlanRepository = {
  load(): PlanStore {
    const raw = localStorage.getItem(StorageKey.PLANNER);
    if (!raw) return createPlanStore();
    try {
      return PlanStoreSchema.parse(JSON.parse(raw));
    } catch {
      throw new InvalidSavedPlanError();
    }
  },
  save(store: PlanStore) {
    localStorage.setItem(
      StorageKey.PLANNER,
      JSON.stringify(PlanStoreSchema.parse(store)),
    );
  },
  import(text: string) {
    return PlanStoreSchema.parse(JSON.parse(text));
  },
};
