import { z } from "zod";
import { MapId, Season } from "@/containers/planner/domain/enums/planner";

export const PlacementSchema = z.object({
  id: z.string().min(1),
  itemId: z.string().min(1),
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  rotation: z.number().int().min(0).max(3).default(0),
  variant: z.string().optional(),
});
export type Placement = z.infer<typeof PlacementSchema>;

export const InteriorPlanSchema = z.object({
  ground: z.record(z.string(), z.string()),
  placements: z.array(PlacementSchema),
});
export type InteriorPlan = z.infer<typeof InteriorPlanSchema>;

export const PlanSchema = z.object({
  schemaVersion: z.literal(1),
  mapId: z.enum(MapId),
  season: z.enum(Season),
  ground: z.record(z.string(), z.string()),
  placements: z.array(PlacementSchema),
  interiors: z.record(z.string(), InteriorPlanSchema).default({}),
});
export type FarmPlan = z.infer<typeof PlanSchema>;

export const PlanStoreSchema = z.object({
  activeMapId: z.enum(MapId),
  plans: z.partialRecord(z.enum(MapId), PlanSchema),
});
export type PlanStore = z.infer<typeof PlanStoreSchema>;
