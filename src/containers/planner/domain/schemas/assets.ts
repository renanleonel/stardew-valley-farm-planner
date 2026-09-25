import { z } from "zod";
import {
  FloorConnectType,
  ItemKind,
  MapId,
  PlacementRule,
  Season,
} from "@/containers/planner/domain/enums/planner";

const RectSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
});
const SizeSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const CatalogItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(ItemKind),
  texture: z.string(),
  textures: z.record(z.enum(Season), z.string()).optional(),
  sprite: RectSchema,
  sprites: z.record(z.enum(Season), RectSchema).optional(),
  connectType: z.enum(FloorConnectType).optional(),
  cornerSize: z.number().int().positive().optional(),
  variants: z
    .array(z.object({ id: z.string(), name: z.string(), sprite: RectSchema }))
    .optional(),
  rotatable: z.boolean().optional(),
  interior: z.string().optional(),
  indoor: z.boolean().optional(),
  outdoor: z.boolean().optional(),
  underlay: z.boolean().optional(),
  wallMounted: z.boolean().optional(),
  group: z.string().optional(),
  fill: z
    .object({
      textures: z.record(z.enum(Season), z.string()),
      sprite: RectSchema,
    })
    .optional(),
  footprint: SizeSchema,
  rule: z.enum(PlacementRule),
  seasons: z.array(z.enum(Season)).optional(),
  coverage: z
    .object({
      shape: z.enum(["cross", "square", "circle"]),
      radius: z.number().int().positive(),
    })
    .optional(),
});
export type CatalogItem = z.infer<typeof CatalogItemSchema>;
export const CatalogSchema = z.object({
  sources: z.array(z.string()),
  items: z.array(CatalogItemSchema),
});
export type Catalog = z.infer<typeof CatalogSchema>;

const TilesetSchema = z.object({
  firstGid: z.number().int().positive(),
  tileCount: z.number().int().positive(),
  columns: z.number().int().positive(),
  tileWidth: z.number().int().positive(),
  tileHeight: z.number().int().positive(),
  images: z.record(z.enum(Season), z.string()),
  tileProperties: z.record(z.string(), z.record(z.string(), z.string())),
});
export type Tileset = z.infer<typeof TilesetSchema>;

export const MapSchema = z.object({
  id: z.string(),
  name: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  tileSize: z.number().int().positive(),
  layers: z.array(
    z.object({
      name: z.string(),
      gids: z.array(z.number().int().nonnegative()),
    }),
  ),
  tilesets: z.array(TilesetSchema),
});
export type FarmMap = z.infer<typeof MapSchema>;

export const MapIndexSchema = z.object({
  gameVersion: z.string(),
  maps: z.array(
    z.object({
      id: z.enum(MapId),
      name: z.string(),
      width: z.number(),
      height: z.number(),
      sourcePath: z.string(),
    }),
  ),
});
export type MapIndex = z.infer<typeof MapIndexSchema>;
