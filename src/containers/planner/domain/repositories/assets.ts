import axios from "axios";
import {
  CatalogSchema,
  MapIndexSchema,
  MapSchema,
} from "@/containers/planner/domain/schemas/assets";
import type { MapId } from "@/containers/planner/domain/enums/planner";

const base = `${import.meta.env.BASE_URL}game-assets`;

export const AssetRepository = {
  async index() {
    const response = await axios.get<unknown>(`${base}/index.json`);
    return MapIndexSchema.parse(response.data);
  },
  async catalog() {
    const response = await axios.get<unknown>(`${base}/catalog.json`);
    return CatalogSchema.parse(response.data);
  },
  async map(id: MapId) {
    const response = await axios.get<unknown>(`${base}/maps/${id}.json`);
    return MapSchema.parse(response.data);
  },
  async interior(id: string) {
    const response = await axios.get<unknown>(`${base}/interiors/${id}.json`);
    return MapSchema.parse(response.data);
  },
};
