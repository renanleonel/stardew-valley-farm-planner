import { useSuspenseQuery } from "@tanstack/react-query";
import { AssetRepository } from "@/containers/planner/domain/repositories/assets";
import type { MapId } from "@/containers/planner/domain/enums/planner";

export const MAP_INDEX_QUERY_KEY = "planner-map-index" as const;
export const CATALOG_QUERY_KEY = "planner-catalog" as const;
export const MAP_QUERY_KEY = "planner-map" as const;

export function useMapIndexSuspense() {
  return useSuspenseQuery({
    queryKey: [MAP_INDEX_QUERY_KEY],
    queryFn: AssetRepository.index,
    staleTime: Infinity,
  });
}

export function useCatalogSuspense() {
  return useSuspenseQuery({
    queryKey: [CATALOG_QUERY_KEY],
    queryFn: AssetRepository.catalog,
    staleTime: Infinity,
  });
}

export function useMapSuspense(id: MapId) {
  return useSuspenseQuery({
    queryKey: [MAP_QUERY_KEY, id],
    queryFn: () => AssetRepository.map(id),
    staleTime: Infinity,
  });
}

export function useSceneMapSuspense(mapId: MapId, interiorId?: string) {
  return useSuspenseQuery({
    queryKey: [
      MAP_QUERY_KEY,
      interiorId ? "interior" : "farm",
      interiorId ?? mapId,
    ],
    queryFn: () =>
      interiorId
        ? AssetRepository.interior(interiorId)
        : AssetRepository.map(mapId),
    staleTime: Infinity,
  });
}
