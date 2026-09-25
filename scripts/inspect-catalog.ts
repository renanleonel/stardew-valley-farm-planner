import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("local-assets/unpacked");
const data = JSON.parse(
  await readFile(path.join(root, "Data/BigCraftables.json"), "utf8"),
) as Record<
  string,
  {
    Name?: string;
    SpriteIndex?: number;
    CanBePlacedOutdoors?: boolean;
    Texture?: string | null;
  }
>;

const selected =
  /Fence|Scarecrow|Bee House|Keg|Sprinkler|Chest|Torch|Garden Pot|Mayonnaise Machine|Preserves Jar|Crystalarium|Lightning Rod|Tapper|Seed Maker|Oil Maker|Mushroom Log/;
for (const [id, item] of Object.entries(data)) {
  if (item.Name && selected.test(item.Name)) {
    console.log(
      `${id}\t${item.Name}\t${item.SpriteIndex}\t${item.CanBePlacedOutdoors}\t${item.Texture ?? "Craftables"}`,
    );
  }
}

const objects = JSON.parse(
  await readFile(path.join(root, "Data/Objects.json"), "utf8"),
) as Record<
  string,
  {
    Name?: string;
    SpriteIndex?: number;
    Texture?: string | null;
  }
>;
for (const [id, item] of Object.entries(objects)) {
  if (
    item.Name &&
    /Sprinkler|Wood Path|Gravel Path|Cobblestone Path|Stepping Stone Path/.test(
      item.Name,
    )
  ) {
    console.log(
      `${id}\t${item.Name}\t${item.SpriteIndex}\t${item.Texture ?? "springobjects"}`,
    );
  }
}

const buildings = JSON.parse(
  await readFile(path.join(root, "Data/Buildings.json"), "utf8"),
) as Record<
  string,
  {
    Texture?: string | null;
    Size?: { X: number; Y: number };
    SourceRect?: { X: number; Y: number; Width: number; Height: number };
    IndoorMap?: string | null;
  }
>;
for (const [name, building] of Object.entries(buildings)) {
  if (!building.Texture || !building.Size) continue;
  const texture = `${building.Texture.replaceAll("\\", "/")}.png`;
  const bytes = await readFile(path.join(root, texture));
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  console.log(
    `${name}\t${building.Size.X}x${building.Size.Y}\t${building.SourceRect?.Width}x${building.SourceRect?.Height}\t${width}x${height}\t${texture}\t${building.IndoorMap ?? ""}`,
  );
}

const crops = JSON.parse(
  await readFile(path.join(root, "Data/Crops.json"), "utf8"),
) as Record<
  string,
  {
    Seasons?: string[];
    SpriteIndex?: number;
    Texture?: string | null;
    HarvestItemId?: string;
  }
>;
const cropTextures = new Map<string, number>();
for (const [id, crop] of Object.entries(crops)) {
  const texture = crop.Texture ?? "TileSheets/crops";
  cropTextures.set(texture, (cropTextures.get(texture) ?? 0) + 1);
  if (crop.SpriteIndex === undefined || !crop.Seasons?.length)
    console.log(
      `Crop needs review\t${id}\t${crop.HarvestItemId}\t${crop.SpriteIndex}\t${crop.Seasons}`,
    );
}
console.log("Crops:", Object.keys(crops).length, "Textures:", [
  ...cropTextures,
]);

for (const sheet of ["tree1", "tree2", "tree3", "tree8"]) {
  for (const season of ["spring", "summer", "fall", "winter"]) {
    const filename = path.join(root, `TerrainFeatures/${sheet}_${season}.png`);
    try {
      const bytes = await readFile(filename);
      console.log(
        `Tree ${sheet}_${season}\t${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`,
      );
    } catch {
      console.log(`Tree ${sheet}_${season}\tmissing`);
    }
  }
}
