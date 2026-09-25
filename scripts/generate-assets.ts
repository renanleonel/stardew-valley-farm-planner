import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { XMLParser } from "fast-xml-parser";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "local-assets", "unpacked");
const output = path.join(root, "public", "game-assets");
const seasons = ["spring", "summer", "fall", "winter"] as const;
// These 1.6.15 outdoors sheet tiles are diggable dirt with baked-in stones,
// sprouts, or marks. The plain dirt tile is 716 in the Standard Farm tileset.
const dirtyGroundIndices = new Set(
  [335, 336, 360, 592, 617, 642, 689, 693, 714, 718, 743].map(
    (gid) => gid - 129,
  ),
);
const cleanDirtIndex = 716 - 129;
const maps = [
  ["standard", "Standard Farm", "Farm.tmx"],
  ["riverland", "Riverland Farm", "Farm_Fishing.tmx"],
  ["forest", "Forest Farm", "Farm_Foraging.tmx"],
  ["hilltop", "Hill-top Farm", "Farm_Mining.tmx"],
  ["wilderness", "Wilderness Farm", "Farm_Combat.tmx"],
  ["four-corners", "Four Corners Farm", "Farm_FourCorners.tmx"],
  ["beach", "Beach Farm", "Farm_Island.tmx"],
  ["meadowlands", "Meadowlands Farm", "Farm_Ranching.tmx"],
] as const;
const interiors = [
  ["coop", "Coop interior", "Coop.tmx"],
  ["coop2", "Big Coop interior", "Coop2.tmx"],
  ["coop3", "Deluxe Coop interior", "Coop3.tmx"],
  ["barn", "Barn interior", "Barn.tmx"],
  ["barn2", "Big Barn interior", "Barn2.tmx"],
  ["barn3", "Deluxe Barn interior", "Barn3.tmx"],
  ["shed", "Shed interior", "Shed.tmx"],
  ["shed2", "Big Shed interior", "Shed2.tmx"],
  ["slimehutch", "Slime Hutch interior", "SlimeHutch.tmx"],
  ["greenhouse", "Greenhouse interior", "Greenhouse.tmx"],
  ["farmhouse", "Farmhouse interior", "FarmHouse.tmx"],
  ["farmhouse1", "Farmhouse kitchen interior", "FarmHouse1.tmx"],
  ["farmhouse2", "Farmhouse final interior", "FarmHouse2.tmx"],
] as const;

type XmlNode = Record<string, unknown>;
type TileProperties = Record<string, string>;
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
});
const report = {
  maps: [] as string[],
  interiors: [] as string[],
  copied: new Set<string>(),
  warnings: [] as string[],
};

function nodes(value: unknown): XmlNode[] {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value]) as XmlNode[];
}

function node(value: unknown): XmlNode {
  if (!value || typeof value !== "object") throw new Error("Invalid TMX node");
  return value as XmlNode;
}

function attr(value: XmlNode, name: string): string {
  const result = value[`@_${name}`];
  if (result === undefined) throw new Error(`Missing TMX attribute: ${name}`);
  return String(result);
}

function properties(value: unknown): TileProperties {
  const props: TileProperties = {};
  for (const entry of nodes(node(value ?? {}).property)) {
    props[attr(entry, "name")] = String(
      entry["@_value"] ?? entry["#text"] ?? "",
    );
  }
  return props;
}

async function copyImage(relative: string): Promise<string> {
  const normalized = relative.replace(/\\+/g, "/").replace(/\.png$/i, "");
  const from = path.resolve(source, `${normalized}.png`);
  if (!from.startsWith(`${source}${path.sep}`))
    throw new Error(`Unsafe image path: ${relative}`);
  const toRelative = `images/${normalized}.png`;
  if (!report.copied.has(toRelative)) {
    const to = path.join(output, toRelative);
    await mkdir(path.dirname(to), { recursive: true });
    await copyFile(from, to);
    report.copied.add(toRelative);
  }
  return toRelative.replaceAll("\\", "/");
}

async function pngSize(relative: string) {
  const bytes = await readFile(path.join(source, relative));
  if (bytes.toString("ascii", 1, 4) !== "PNG")
    throw new Error(`Not a PNG: ${relative}`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

async function makeMap(
  id: string,
  name: string,
  filename: string,
  folder: "maps" | "interiors" = "maps",
) {
  const xml = await readFile(path.join(source, "Maps", filename), "utf8");
  const map = node(parser.parse(xml).map);
  const width = Number(attr(map, "width"));
  const height = Number(attr(map, "height"));
  const tileSize = Number(attr(map, "tilewidth"));
  if (Number(attr(map, "tileheight")) !== tileSize)
    throw new Error(`${filename}: rectangular tiles unsupported`);
  const tilesets = [];
  for (const sheet of nodes(map.tileset)) {
    const imageSource = attr(node(sheet.image), "source").replaceAll("\\", "/");
    const images: Record<string, string> = {};
    for (const season of seasons) {
      const seasonalName = imageSource.startsWith("spring_")
        ? `${season}_${imageSource.slice("spring_".length)}`
        : imageSource;
      try {
        images[season] = await copyImage(`Maps/${seasonalName}`);
      } catch (error) {
        if (season === "spring") throw error;
        images[season] = images.spring;
        report.warnings.push(
          `${filename}: using spring image for ${seasonalName}`,
        );
      }
    }
    const tileProperties: Record<number, TileProperties> = {};
    for (const tile of nodes(sheet.tile)) {
      tileProperties[Number(attr(tile, "id"))] = properties(tile.properties);
    }
    tilesets.push({
      firstGid: Number(attr(sheet, "firstgid")),
      tileCount: Number(attr(sheet, "tilecount")),
      columns: Number(attr(sheet, "columns")),
      tileWidth: Number(attr(sheet, "tilewidth")),
      tileHeight: Number(attr(sheet, "tileheight")),
      images,
      tileProperties,
    });
  }
  const layers = nodes(map.layer).map((layer) => {
    const data = node(layer.data);
    if (attr(data, "encoding") !== "csv")
      throw new Error(`${filename}: expected CSV tile layer`);
    const text = String(data["#text"] ?? "");
    const gids = text
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map(Number);
    if (
      gids.length !== width * height ||
      gids.some((gid) => !Number.isSafeInteger(gid))
    ) {
      throw new Error(
        `${filename}: bad layer ${attr(layer, "name")} (${gids.length} cells)`,
      );
    }
    const layerName = attr(layer, "name");
    if (folder === "maps" && (layerName === "Paths" || layerName === "Back")) {
      for (let index = 0; index < gids.length; index += 1) {
        const rawGid = gids[index];
        const gid = rawGid & 0x0fffffff;
        const sheet = tilesets.find(
          (candidate) =>
            gid >= candidate.firstGid &&
            gid < candidate.firstGid + candidate.tileCount,
        );
        if (!sheet) continue;
        if (
          layerName === "Paths" &&
          sheet.images.spring.endsWith("/paths.png")
        ) {
          // This tilesheet contains the farms' starting debris. Other art on
          // the layer, including Meadowlands details, remains intact.
          gids[index] = 0;
        }
        if (
          layerName === "Back" &&
          sheet.images.spring.endsWith("/spring_outdoorsTileSheet.png") &&
          dirtyGroundIndices.has(gid - sheet.firstGid) &&
          sheet.tileProperties[gid - sheet.firstGid]?.Diggable === "T"
        ) {
          gids[index] = sheet.firstGid + cleanDirtIndex;
        }
      }
    }
    return { name: layerName, gids };
  });
  if (layers.length === 0) throw new Error(`${filename}: no tile layers`);
  if (nodes(map.imagelayer).length || nodes(map.group).length) {
    report.warnings.push(`${filename}: extra TMX layer type needs review`);
  }
  const result = { id, name, width, height, tileSize, layers, tilesets };
  await mkdir(path.join(output, folder), { recursive: true });
  await writeFile(
    path.join(output, folder, `${id}.json`),
    JSON.stringify(result),
  );
  report[folder].push(
    `${id}: ${width}x${height}, ${layers.length} layers, ${tilesets.length} sheets`,
  );
  return { id, name, width, height, sourcePath: `Maps/${filename}` };
}

async function makeCatalog() {
  const buildings = JSON.parse(
    await readFile(path.join(source, "Data", "Buildings.json"), "utf8"),
  ) as Record<
    string,
    {
      Texture?: string;
      Size?: { X: number; Y: number };
      SourceRect?: { X: number; Y: number; Width: number; Height: number };
      IndoorMap?: string | null;
    }
  >;
  const crops = JSON.parse(
    await readFile(path.join(source, "Data", "Crops.json"), "utf8"),
  ) as Record<
    string,
    {
      Seasons?: string[];
      HarvestItemId?: string;
      Texture?: string;
      SpriteIndex?: number;
    }
  >;
  const objects = JSON.parse(
    await readFile(path.join(source, "Data", "Objects.json"), "utf8"),
  ) as Record<
    string,
    {
      Name?: string;
      SpriteIndex?: number;
      Texture?: string | null;
    }
  >;
  const bigCraftables = JSON.parse(
    await readFile(path.join(source, "Data", "BigCraftables.json"), "utf8"),
  ) as Record<
    string,
    {
      Name?: string;
      SpriteIndex?: number;
      CanBePlacedOutdoors?: boolean;
      CanBePlacedIndoors?: boolean;
      Texture?: string | null;
    }
  >;
  const floors = JSON.parse(
    await readFile(path.join(source, "Data", "FloorsAndPaths.json"), "utf8"),
  ) as Record<
    string,
    {
      ItemId: string;
      Texture: string;
      Corner: { X: number; Y: number };
      WinterTexture?: string | null;
      WinterCorner?: { X: number; Y: number } | null;
      CornerSize: number;
      ConnectType?: "Default" | "Path" | "CornerDecorated" | "Random";
    }
  >;
  const fences = JSON.parse(
    await readFile(path.join(source, "Data", "Fences.json"), "utf8"),
  ) as Record<string, { Texture: string }>;
  const fruitTrees = JSON.parse(
    await readFile(path.join(source, "Data", "FruitTrees.json"), "utf8"),
  ) as Record<
    string,
    {
      Texture: string;
      TextureSpriteRow: number;
      Fruit?: { ItemId?: string }[];
    }
  >;
  const wildTrees = JSON.parse(
    await readFile(path.join(source, "Data", "WildTrees.json"), "utf8"),
  ) as Record<
    string,
    {
      SeedItemId?: string;
      SeedPlantable?: boolean;
      Textures?: { Season?: string | null; Texture: string }[];
    }
  >;
  const items = [];

  const buildingFrames: Record<
    string,
    {
      x?: number;
      y?: number;
      width: number;
      height: number;
      variants?: {
        id: string;
        name: string;
        sprite: { x: number; y: number; width: number; height: number };
      }[];
    }
  > = {
    Farmhouse: {
      width: 160,
      height: 144,
      variants: [
        {
          id: "starter",
          name: "Starter",
          sprite: { x: 0, y: 0, width: 160, height: 144 },
        },
        {
          id: "kitchen",
          name: "Kitchen upgrade",
          sprite: { x: 0, y: 144, width: 160, height: 144 },
        },
        {
          id: "final",
          name: "Final upgrade",
          sprite: { x: 0, y: 288, width: 160, height: 144 },
        },
      ],
    },
    Greenhouse: {
      y: 160,
      width: 112,
      height: 160,
      variants: [
        {
          id: "repaired",
          name: "Repaired",
          sprite: { x: 0, y: 160, width: 112, height: 160 },
        },
        {
          id: "ruined",
          name: "Ruined",
          sprite: { x: 0, y: 0, width: 112, height: 160 },
        },
      ],
    },
    "Shipping Bin": { width: 32, height: 32 },
    "Earth Obelisk": { width: 48, height: 128 },
    "Water Obelisk": { width: 48, height: 128 },
    "Desert Obelisk": { width: 48, height: 128 },
    "Island Obelisk": { width: 48, height: 128 },
    "Gold Clock": { width: 48, height: 80 },
    Mill: { width: 64, height: 128 },
    Cabin: { width: 80, height: 112 },
    "Pet Bowl": { width: 32, height: 32 },
    Stable: { width: 64, height: 96 },
    "Big Shed": { width: 112, height: 128 },
    Coop: { width: 96, height: 80 },
    "Big Coop": { width: 96, height: 80 },
    "Deluxe Coop": { width: 96, height: 80 },
    Barn: { width: 112, height: 80 },
    "Big Barn": { width: 112, height: 80 },
    "Deluxe Barn": { width: 112, height: 80 },
    Silo: { width: 48, height: 128 },
    Well: { width: 48, height: 80 },
    Shed: { width: 112, height: 128 },
    "Slime Hutch": { width: 112, height: 96 },
    "Junimo Hut": { width: 64, height: 64 },
    "Fish Pond": { width: 80, height: 80 },
  };
  for (const [name, frame] of Object.entries(buildingFrames)) {
    const data = buildings[name];
    if (!data?.Texture || !data.Size) {
      report.warnings.push(`Missing building definition: ${name}`);
      continue;
    }
    const sourcePath = `${data.Texture.replaceAll("\\", "/")}.png`;
    const image = await copyImage(sourcePath);
    const size = await pngSize(sourcePath);
    const sourceRect =
      data.SourceRect && data.SourceRect.Width > 0 && data.SourceRect.Height > 0
        ? data.SourceRect
        : undefined;
    const sprite = sourceRect
      ? {
          x: sourceRect.X,
          y: sourceRect.Y,
          width: sourceRect.Width,
          height: sourceRect.Height,
        }
      : {
          x: frame.x ?? 0,
          y: frame.y ?? 0,
          width: frame.width,
          height: frame.height,
        };
    if (
      sprite.x + sprite.width > size.width ||
      sprite.y + sprite.height > size.height ||
      frame.variants?.some(
        (variant) =>
          variant.sprite.x + variant.sprite.width > size.width ||
          variant.sprite.y + variant.sprite.height > size.height,
      )
    )
      throw new Error(`Invalid curated sprite rectangle: ${name}`);
    // GID 1409 is a water interior tile in the installed Standard Farm TMX.
    const fill =
      name === "Fish Pond"
        ? {
            textures: Object.fromEntries(
              await Promise.all(
                seasons.map(async (season) => [
                  season,
                  await copyImage(`Maps/${season}_outdoorsTileSheet`),
                ]),
              ),
            ),
            sprite: { x: 80, y: 816, width: 16, height: 16 },
          }
        : undefined;
    items.push({
      id: `building:${name}`,
      name,
      kind: "building",
      texture: image,
      sprite,
      variants: frame.variants,
      interior:
        name === "Farmhouse"
          ? "farmhouse"
          : (data.IndoorMap?.toLowerCase() ?? undefined),
      footprint: { width: data.Size.X, height: data.Size.Y },
      rule: "buildable",
      fill,
    });
  }

  const legacyFloorIds: Record<string, string> = {
    "0": "wood",
    "1": "stone",
    "6": "brick",
  };
  for (const [id, data] of Object.entries(floors)) {
    const connectType = data.ConnectType ?? "Default";
    if (!["Default", "Path", "CornerDecorated", "Random"].includes(connectType))
      throw new Error(`Unsupported floor connection type: ${id}`);
    const sourcePath = data.Texture.replace(/\\+/g, "/");
    const winterPath = (data.WinterTexture || data.Texture).replace(
      /\\+/g,
      "/",
    );
    const texture = await copyImage(sourcePath);
    const winterTexture = await copyImage(winterPath);
    const size = await pngSize(`${sourcePath}.png`);
    const winterSize = await pngSize(`${winterPath}.png`);
    const sprite = {
      x: data.Corner.X + (connectType === "Random" ? 16 : 0),
      y: data.Corner.Y + (connectType === "Random" ? 16 : 0),
      width: 16,
      height: 16,
    };
    const winterCorner = data.WinterCorner ?? data.Corner;
    const winterSprite = {
      x: winterCorner.X + (connectType === "Random" ? 16 : 0),
      y: winterCorner.Y + (connectType === "Random" ? 16 : 0),
      width: 16,
      height: 16,
    };
    if (
      sprite.x + (connectType === "Random" ? 16 : 64) > size.width ||
      sprite.y + (connectType === "Random" ? 16 : 64) > size.height ||
      winterSprite.x + (connectType === "Random" ? 16 : 64) >
        winterSize.width ||
      winterSprite.y + (connectType === "Random" ? 16 : 64) > winterSize.height
    )
      throw new Error(`Floor sprite outside sheet: ${id}`);
    const object = objects[data.ItemId];
    if (!object?.Name)
      throw new Error(`Missing floor object name: ${data.ItemId}`);
    items.push({
      id: `floor:${legacyFloorIds[id] ?? id}`,
      name: object.Name,
      kind: "floor",
      texture,
      textures: {
        spring: texture,
        summer: texture,
        fall: texture,
        winter: winterTexture,
      },
      sprite,
      sprites: {
        spring: sprite,
        summer: sprite,
        fall: sprite,
        winter: winterSprite,
      },
      connectType,
      cornerSize: data.CornerSize,
      footprint: { width: 1, height: 1 },
      rule: "open-ground",
    });
  }

  const soilTexture = await copyImage("TerrainFeatures/hoeDirt");
  const winterSoilTexture = await copyImage("TerrainFeatures/hoeDirtSnow");
  for (const [id, name] of [
    ["dry", "Tilled soil"],
    ["watered", "Watered soil"],
  ] as const) {
    items.push({
      id: `soil:${id}`,
      name,
      kind: "soil",
      texture: soilTexture,
      textures: {
        spring: soilTexture,
        summer: soilTexture,
        fall: soilTexture,
        winter: winterSoilTexture,
      },
      sprite: { x: id === "watered" ? 64 : 0, y: 0, width: 16, height: 16 },
      ...(id === "watered"
        ? {
            fill: {
              textures: {
                spring: soilTexture,
                summer: soilTexture,
                fall: soilTexture,
                winter: winterSoilTexture,
              },
              sprite: { x: 0, y: 0, width: 16, height: 16 },
            },
          }
        : {}),
      footprint: { width: 1, height: 1 },
      rule: "diggable",
    });
  }

  const cropTexture = await copyImage("TileSheets/crops");
  const cropSheetSize = await pngSize("TileSheets/crops.png");
  for (const [id, data] of Object.entries(crops)) {
    if (data.SpriteIndex === undefined || !data.Seasons?.length)
      throw new Error(`Incomplete crop: ${id}`);
    if (data.Texture?.replaceAll("\\", "/") !== "TileSheets/crops")
      throw new Error(`Unsupported crop texture: ${id}`);
    const name = objects[data.HarvestItemId ?? ""]?.Name ?? `Crop ${id}`;
    const cropSprite = {
      x: (data.SpriteIndex % 2) * 128 + 80,
      y: Math.floor(data.SpriteIndex / 2) * 32,
      width: 16,
      height: 32,
    };
    if (
      cropSprite.x + cropSprite.width > cropSheetSize.width ||
      cropSprite.y + cropSprite.height > cropSheetSize.height
    )
      throw new Error(`Crop sprite outside sheet: ${id}`);
    items.push({
      id: `crop:${id}`,
      name,
      kind: "crop",
      texture: cropTexture,
      sprite: cropSprite,
      footprint: { width: 1, height: 1 },
      rule: "diggable",
      seasons: (data.Seasons ?? []).map((season) => season.toLowerCase()),
    });
  }

  const legacyTreeIds: Record<string, string> = {
    "1": "oak",
    "2": "maple",
    "3": "pine",
    "8": "mahogany",
  };
  for (const [id, data] of Object.entries(wildTrees)) {
    if (!data.SeedPlantable) continue;
    const fallback = data.Textures?.find((entry) => !entry.Season);
    if (!fallback) throw new Error(`Missing default wild tree texture: ${id}`);
    const seedId = data.SeedItemId?.replace(/^\(O\)/, "");
    const seedName = objects[seedId ?? ""]?.Name;
    const name = legacyTreeIds[id]
      ? `${legacyTreeIds[id][0].toUpperCase()}${legacyTreeIds[id].slice(1)} tree`
      : seedName
        ? seedName.replace(/ (Seed|Seeds)$/i, "") + " tree"
        : `Wild tree ${id}`;
    const treeImages: Record<string, string> = {};
    for (const season of seasons) {
      const entry =
        data.Textures?.find(
          (texture) => texture.Season?.toLowerCase() === season,
        ) ?? fallback;
      const relative = entry.Texture.replace(/\\+/g, "/");
      const size = await pngSize(`${relative}.png`);
      if (size.width < 48 || size.height < 96)
        throw new Error(`Tree sheet too small: ${relative}`);
      treeImages[season] = await copyImage(relative);
    }
    items.push({
      id: `tree:${legacyTreeIds[id] ?? id}`,
      name,
      kind: "tree",
      texture: treeImages.spring,
      textures: treeImages,
      sprite: { x: 0, y: 0, width: 48, height: 96 },
      footprint: { width: 1, height: 1 },
      rule: "tree-ground",
    });
  }

  for (const [id, data] of Object.entries(fruitTrees)) {
    const relative = data.Texture.replace(/\\+/g, "/");
    const image = await copyImage(relative);
    const size = await pngSize(`${relative}.png`);
    const fruitId = data.Fruit?.[0]?.ItemId?.replace(/^\(O\)/, "");
    const fruitName = objects[fruitId ?? ""]?.Name;
    if (!fruitName) throw new Error(`Missing fruit tree name: ${id}`);
    const y = data.TextureSpriteRow * 80;
    const sprites = {
      spring: { x: 192, y, width: 48, height: 80 },
      summer: { x: 240, y, width: 48, height: 80 },
      fall: { x: 288, y, width: 48, height: 80 },
      winter: { x: 336, y, width: 48, height: 80 },
    };
    if (
      Object.values(sprites).some(
        (sprite) =>
          sprite.x + sprite.width > size.width ||
          sprite.y + sprite.height > size.height,
      )
    )
      throw new Error(`Fruit tree sprite outside sheet: ${id}`);
    items.push({
      id: `fruit-tree:${id}`,
      name: `${fruitName} tree`,
      kind: "tree",
      texture: image,
      sprite: sprites.spring,
      sprites,
      footprint: { width: 1, height: 1 },
      rule: "tree-ground",
    });
  }

  const craftablesTexture = await copyImage("TileSheets/Craftables");
  const craftablesSize = await pngSize("TileSheets/Craftables.png");
  const craftableNameCounts = Object.values(bigCraftables).reduce<
    Record<string, number>
  >((counts, data) => {
    if (data.Name) counts[data.Name] = (counts[data.Name] ?? 0) + 1;
    return counts;
  }, {});
  for (const [id, data] of Object.entries(bigCraftables)) {
    if (!data.CanBePlacedOutdoors && !data.CanBePlacedIndoors) continue;
    const name = data.Name;
    if (!name) throw new Error(`Missing craftable name: ${id}`);
    if (data.SpriteIndex === undefined || data.Texture)
      throw new Error(`Unsupported craftable texture: ${name} (${id})`);
    const x = (data.SpriteIndex % (craftablesSize.width / 16)) * 16;
    const y = Math.floor(data.SpriteIndex / (craftablesSize.width / 16)) * 32;
    if (x + 16 > craftablesSize.width || y + 32 > craftablesSize.height)
      throw new Error(`Craftable sprite outside sheet: ${name} (${id})`);
    const coverage =
      name === "Scarecrow"
        ? { shape: "circle", radius: 8 }
        : name === "Deluxe Scarecrow"
          ? { shape: "circle", radius: 16 }
          : name === "Rarecrow"
            ? { shape: "circle", radius: 8 }
            : undefined;
    items.push({
      id: `craftable:${id}`,
      name: craftableNameCounts[name] > 1 ? `${name} (${id})` : name,
      kind: "object",
      texture: craftablesTexture,
      sprite: { x, y, width: 16, height: 32 },
      footprint: { width: 1, height: 1 },
      rule: "open-ground",
      coverage,
      indoor: data.CanBePlacedIndoors === true,
      outdoor: data.CanBePlacedOutdoors === true,
    });
  }

  const furniture = JSON.parse(
    await readFile(path.join(source, "Data", "Furniture.json"), "utf8"),
  ) as Record<string, string>;
  // These are the 1.6.15 defaults in Furniture.getDefaultSourceRectForType
  // and getDefaultBoundingBoxForType, read from the installed game assembly.
  const defaultFurnitureSizes: Record<
    string,
    { sprite: [number, number]; footprint: [number, number] }
  > = {
    chair: { sprite: [1, 2], footprint: [1, 1] },
    bench: { sprite: [2, 2], footprint: [2, 1] },
    couch: { sprite: [3, 2], footprint: [3, 1] },
    armchair: { sprite: [2, 2], footprint: [2, 1] },
    dresser: { sprite: [2, 2], footprint: [2, 1] },
    "long table": { sprite: [5, 3], footprint: [5, 2] },
    painting: { sprite: [2, 2], footprint: [2, 2] },
    lamp: { sprite: [1, 2], footprint: [1, 1] },
    decor: { sprite: [1, 3], footprint: [1, 1] },
    other: { sprite: [1, 2], footprint: [1, 1] },
    bookcase: { sprite: [2, 3], footprint: [2, 1] },
    table: { sprite: [2, 3], footprint: [2, 2] },
    rug: { sprite: [3, 2], footprint: [3, 2] },
    window: { sprite: [1, 2], footprint: [1, 2] },
    fireplace: { sprite: [2, 5], footprint: [2, 1] },
    bed: { sprite: [1, 2], footprint: [1, 1] },
    torch: { sprite: [1, 2], footprint: [1, 1] },
    sconce: { sprite: [1, 2], footprint: [1, 2] },
  };
  const furnitureNameCounts = Object.values(furniture).reduce<
    Record<string, number>
  >((counts, value) => {
    const name = value.split("/")[0];
    counts[name] = (counts[name] ?? 0) + 1;
    return counts;
  }, {});
  const furnitureSizeCache = new Map<
    string,
    { width: number; height: number }
  >();
  function furnitureDimensions(
    value: string,
    fallback: [number, number],
    id: string,
  ): [number, number] {
    if (value === "-1") return fallback;
    const match = /^(\d+) (\d+)$/.exec(value);
    if (!match)
      throw new Error(`Invalid furniture dimensions: ${id} (${value})`);
    return [Number(match[1]), Number(match[2])];
  }
  for (const [id, record] of Object.entries(furniture)) {
    const fields = record.split("/");
    const [rawName, type] = fields;
    const defaults = defaultFurnitureSizes[type];
    const explicit = fields[2] !== "-1" && fields[3] !== "-1";
    if (!defaults && !explicit)
      throw new Error(
        `Unknown furniture type without dimensions: ${type} (${id})`,
      );
    const [spriteWidth, spriteHeight] = furnitureDimensions(
      fields[2],
      defaults?.sprite ?? [1, 1],
      id,
    );
    const [footprintWidth, footprintHeight] = furnitureDimensions(
      fields[3],
      defaults?.footprint ?? [1, 1],
      id,
    );
    const sourcePath = (fields[9] || "TileSheets/furniture").replace(
      /\\+/g,
      "/",
    );
    const texture = await copyImage(sourcePath);
    let size = furnitureSizeCache.get(sourcePath);
    if (!size) {
      size = await pngSize(`${sourcePath}.png`);
      furnitureSizeCache.set(sourcePath, size);
    }
    const index = Number(fields[8] || id);
    if (!Number.isInteger(index) || index < 0)
      throw new Error(`Invalid furniture sprite index: ${id}`);
    const columns = size.width / 16;
    const sprite = {
      x: (index % columns) * 16,
      y: Math.floor(index / columns) * 16,
      width: spriteWidth * 16,
      height: spriteHeight * 16,
    };
    if (
      sprite.x + sprite.width > size.width ||
      sprite.y + sprite.height > size.height
    )
      throw new Error(`Furniture sprite outside sheet: ${rawName} (${id})`);
    const restriction = fields[6];
    if (!["-1", "0", "1", "2"].includes(restriction))
      throw new Error(`Unknown furniture placement restriction: ${id}`);
    const defaultOutdoor =
      ["chair", "bench", "table", "long table", "decor", "torch"].includes(
        type,
      ) && !rawName.includes("TV");
    const outdoor =
      restriction === "1" ||
      restriction === "2" ||
      (restriction === "-1" && defaultOutdoor);
    items.push({
      id: `furniture:${id}`,
      name: furnitureNameCounts[rawName] > 1 ? `${rawName} (${id})` : rawName,
      kind: "furniture",
      texture,
      sprite,
      footprint: { width: footprintWidth, height: footprintHeight },
      rule: "open-ground",
      indoor: restriction !== "1",
      outdoor,
      underlay: type === "rug",
      wallMounted: ["painting", "window", "sconce"].includes(type),
      group: type,
    });
  }

  const objectsTexture = await copyImage("Maps/springobjects");
  const objectsSize = await pngSize("Maps/springobjects.png");
  for (const [name, shape, radius] of [
    ["Sprinkler", "cross", 1],
    ["Quality Sprinkler", "square", 1],
    ["Iridium Sprinkler", "square", 2],
  ] as const) {
    const matching = Object.entries(objects).find(
      ([, data]) => data.Name === name,
    );
    if (!matching) throw new Error(`Missing sprinkler definition: ${name}`);
    const [id, data] = matching;
    if (data.SpriteIndex === undefined || data.Texture)
      throw new Error(`Unsupported sprinkler texture: ${name}`);
    const columns = objectsSize.width / 16;
    const x = (data.SpriteIndex % columns) * 16;
    const y = Math.floor(data.SpriteIndex / columns) * 16;
    if (x + 16 > objectsSize.width || y + 16 > objectsSize.height)
      throw new Error(`Sprinkler sprite outside sheet: ${name}`);
    items.push({
      id: `object:${id}`,
      name,
      kind: "object",
      texture: objectsTexture,
      sprite: { x, y, width: 16, height: 16 },
      footprint: { width: 1, height: 1 },
      rule: "open-ground",
      coverage: { shape, radius },
      indoor: true,
    });
  }

  const groundDecorIds = [
    "93",
    "94",
    "251",
    "297",
    "325",
    "461",
    "463",
    "464",
    "710",
    "746",
    "926",
    "927",
    "929",
    "BlueGrassStarter",
  ];
  const grassTexture = await copyImage("TerrainFeatures/grass");
  const grassSize = await pngSize("TerrainFeatures/grass.png");
  for (const id of groundDecorIds) {
    const data = objects[id];
    if (!data?.Name || data.SpriteIndex === undefined)
      throw new Error(`Missing placeable object: ${id}`);
    if (id === "325") {
      const gatePath = fences[id]?.Texture.replace(/\\+/g, "/");
      if (gatePath !== "LooseSprites/Fence1")
        throw new Error("Unsupported gate texture");
      const gateTexture = await copyImage(gatePath);
      const gateSize = await pngSize(`${gatePath}.png`);
      if (gateSize.width !== 48 || gateSize.height < 352)
        throw new Error("Unsupported gate sheet size");
      items.push({
        id: `object:${id}`,
        name: data.Name,
        kind: "fence",
        texture: gateTexture,
        sprite: { x: 32, y: 160, width: 16, height: 32 },
        footprint: { width: 1, height: 1 },
        rule: "open-ground",
        indoor: false,
      });
      continue;
    }
    const grass = id === "297" || id === "BlueGrassStarter";
    const sourcePath = (data.Texture || "Maps/springobjects").replace(
      /\\+/g,
      "/",
    );
    const texture = grass ? grassTexture : await copyImage(sourcePath);
    const size = grass ? grassSize : await pngSize(`${sourcePath}.png`);
    const columns = Math.floor(size.width / 16);
    const sprite = grass
      ? { x: 0, y: id === "297" ? 0 : 160, width: 16, height: 16 }
      : {
          x: (data.SpriteIndex % columns) * 16,
          y: Math.floor(data.SpriteIndex / columns) * 16,
          width: 16,
          height: 16,
        };
    if (
      sprite.x + sprite.width > size.width ||
      sprite.y + sprite.height > size.height
    )
      throw new Error(`Placeable object sprite outside sheet: ${id}`);
    items.push({
      id: `object:${id}`,
      name: data.Name,
      kind: grass ? "floor" : id === "251" ? "tree" : "object",
      texture,
      sprite,
      footprint: { width: 1, height: 1 },
      rule:
        id === "710" ? "water" : id === "251" ? "tree-ground" : "open-ground",
      indoor: !grass && id !== "251" && id !== "710",
    });
  }

  for (const [id, name, sheetName, objectId] of [
    ["wood", "Wood fence", "Fence1", "322"],
    ["stone", "Stone fence", "Fence2", "323"],
    ["iron", "Iron fence", "Fence3", "324"],
    ["hardwood", "Hardwood fence", "Fence5", "298"],
  ] as const) {
    if (
      fences[objectId]?.Texture.replace(/\\+/g, "/") !==
      `LooseSprites/${sheetName}`
    )
      throw new Error(`Unsupported fence texture: ${id}`);
    const texture = await copyImage(`LooseSprites/${sheetName}`);
    const size = await pngSize(`LooseSprites/${sheetName}.png`);
    if (size.width !== 48 || size.height < 352)
      throw new Error(`Unsupported fence sheet size: ${sheetName}`);
    items.push({
      id: `fence:${id}`,
      name,
      kind: "fence",
      texture,
      sprite: { x: 32, y: 32, width: 16, height: 32 },
      footprint: { width: 1, height: 1 },
      rule: "open-ground",
    });
  }

  await writeFile(
    path.join(output, "catalog.json"),
    JSON.stringify({
      sources: [
        "Data/Buildings.json",
        "Data/Crops.json",
        "Data/Objects.json",
        "Data/BigCraftables.json",
        "Data/Furniture.json",
        "Data/FloorsAndPaths.json",
        "Data/Fences.json",
        "Data/FruitTrees.json",
        "Data/WildTrees.json",
      ],
      items,
    }),
  );
  return items.length;
}

await mkdir(output, { recursive: true });
const availableMaps = [];
for (const [id, name, filename] of maps)
  availableMaps.push(await makeMap(id, name, filename));
for (const [id, name, filename] of interiors)
  await makeMap(id, name, filename, "interiors");
const itemCount = await makeCatalog();
const gameManifest = JSON.parse(
  (
    await readFile(path.join(root, "local-assets", "manifest.json"), "utf8")
  ).replace(/^\uFEFF/, ""),
) as { gameVersion: string };
const gameVersion = gameManifest.gameVersion.split(",")[0].trim();
await writeFile(
  path.join(output, "index.json"),
  JSON.stringify({ gameVersion, maps: availableMaps }),
);
await writeFile(
  path.join(output, "generation-report.json"),
  JSON.stringify(
    {
      gameVersion,
      sourceVersion: gameManifest.gameVersion,
      maps: report.maps,
      interiors: report.interiors,
      copiedImages: report.copied.size,
      items: itemCount,
      warnings: report.warnings,
    },
    null,
    2,
  ),
);
console.log(
  `Generated ${availableMaps.length} farm maps, ${itemCount} catalog items, and ${report.copied.size} images.`,
);
for (const warning of report.warnings) console.warn(`Warning: ${warning}`);
