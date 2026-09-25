import type {
  Catalog,
  CatalogItem,
  FarmMap,
} from "@/containers/planner/domain/schemas/assets";
import type {
  FarmPlan,
  Placement,
} from "@/containers/planner/domain/schemas/plan";
import { decodeGid, tileKey, tilesetFor } from "@/containers/planner/lib/tiles";
import {
  isBuildableTerrain,
  itemById,
} from "@/containers/planner/lib/placement";
import {
  FloorConnectType,
  ItemKind,
  type Season,
} from "@/containers/planner/domain/enums/planner";

const imagePromises = new Map<string, Promise<HTMLImageElement>>();
// HoeDirt.populateDrawGuide in the installed game, indexed by N/E/S/W mask.
const soilSpriteByMask = [0, 12, 13, 9, 4, 8, 1, 5, 15, 11, 14, 10, 3, 7, 2, 6];
// Flooring.populateDrawGuide uses the same N/E/S/W bits as HoeDirt.
const floorSpriteByMask = [
  0, 48, 49, 33, 16, 32, 1, 17, 51, 35, 50, 34, 3, 19, 2, 18,
];
// Fence.populateFenceDrawGuide keys are decimal sums of W/E/S/N.
const fenceSpriteBySum: Record<number, number> = {
  0: 5,
  10: 9,
  100: 10,
  1000: 3,
  500: 5,
  1010: 8,
  1100: 6,
  1500: 3,
  600: 0,
  510: 2,
  110: 7,
  1600: 0,
  1610: 4,
  1510: 2,
  1110: 7,
  610: 4,
};

function cardinalMask(
  x: number,
  y: number,
  matches: (x: number, y: number) => boolean,
) {
  return (
    (matches(x, y - 1) ? 1 : 0) |
    (matches(x + 1, y) ? 2 : 0) |
    (matches(x, y + 1) ? 4 : 0) |
    (matches(x - 1, y) ? 8 : 0)
  );
}

function paintClosedGate(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  sum: number,
  tileSize: number,
) {
  const draw = (
    sourceY: number,
    width: number,
    height: number,
    offsetX: number,
    offsetY: number,
  ) =>
    ctx.drawImage(
      image,
      0,
      sourceY,
      width,
      height,
      x * tileSize + offsetX,
      y * tileSize + offsetY,
      width,
      height,
    );
  switch (sum) {
    case 10:
      draw(192, 24, 48, -4, -32);
      return true;
    case 100:
      draw(240, 24, 48, -4, -32);
      return true;
    case 110:
      draw(128, 24, 32, -4, -16);
      return true;
    case 1000:
      draw(288, 24, 32, 5, -21);
      return true;
    case 500:
      draw(320, 24, 32, 5, -21);
      return true;
    case 1500:
      draw(160, 16, 16, 5, -21);
      draw(176, 16, 16, 5, -5);
      return true;
    default:
      return false;
  }
}

export function imageUrl(relativePath: string) {
  return `${import.meta.env.BASE_URL}game-assets/${relativePath}`;
}

export function loadImage(relativePath: string): Promise<HTMLImageElement> {
  const existing = imagePromises.get(relativePath);
  if (existing) return existing;
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error(`Image did not load: ${relativePath}`));
    image.src = imageUrl(relativePath);
  });
  imagePromises.set(relativePath, promise);
  void promise.catch(() => {
    if (imagePromises.get(relativePath) === promise)
      imagePromises.delete(relativePath);
  });
  return promise;
}

export function requiredImages(map: FarmMap, catalog: Catalog, season: Season) {
  return [
    ...new Set([
      ...map.tilesets.map((sheet) => sheet.images[season]),
      ...catalog.items.map((item) => item.textures?.[season] ?? item.texture),
      ...catalog.items.flatMap((item) =>
        item.fill ? [item.fill.textures[season]] : [],
      ),
    ]),
  ];
}

function paintGid(
  ctx: CanvasRenderingContext2D,
  map: FarmMap,
  gidValue: number,
  x: number,
  y: number,
  season: Season,
  images: Map<string, HTMLImageElement>,
) {
  const decoded = decodeGid(gidValue);
  if (!decoded.gid) return;
  const sheet = tilesetFor(map, decoded.gid);
  if (!sheet) return;
  const image = images.get(sheet.images[season]);
  if (!image) return;
  const index = decoded.gid - sheet.firstGid;
  const sx = (index % sheet.columns) * sheet.tileWidth;
  const sy = Math.floor(index / sheet.columns) * sheet.tileHeight;
  const px = x * map.tileSize;
  const py = y * map.tileSize;
  if (
    !decoded.flipHorizontal &&
    !decoded.flipVertical &&
    !decoded.flipDiagonal
  ) {
    ctx.drawImage(
      image,
      sx,
      sy,
      sheet.tileWidth,
      sheet.tileHeight,
      px,
      py,
      map.tileSize,
      map.tileSize,
    );
    return;
  }
  ctx.save();
  ctx.translate(px + map.tileSize / 2, py + map.tileSize / 2);
  ctx.scale(decoded.flipHorizontal ? -1 : 1, decoded.flipVertical ? -1 : 1);
  if (decoded.flipDiagonal) ctx.transform(0, 1, 1, 0, 0, 0);
  ctx.drawImage(
    image,
    sx,
    sy,
    sheet.tileWidth,
    sheet.tileHeight,
    -map.tileSize / 2,
    -map.tileSize / 2,
    map.tileSize,
    map.tileSize,
  );
  ctx.restore();
}

export function makeLayerCanvas(
  map: FarmMap,
  layerName: string,
  season: Season,
  images: Map<string, HTMLImageElement>,
) {
  const canvas = document.createElement("canvas");
  canvas.width = map.width * map.tileSize;
  canvas.height = map.height * map.tileSize;
  const ctx = canvas.getContext("2d");
  const layer = map.layers.find((candidate) => candidate.name === layerName);
  if (!ctx || !layer) return canvas;
  ctx.imageSmoothingEnabled = false;
  layer.gids.forEach((gid, index) => {
    if (gid)
      paintGid(
        ctx,
        map,
        gid,
        index % map.width,
        Math.floor(index / map.width),
        season,
        images,
      );
  });
  return canvas;
}

export function paintItem(
  ctx: CanvasRenderingContext2D,
  item: CatalogItem,
  x: number,
  y: number,
  tileSize: number,
  season: Season,
  images: Map<string, HTMLImageElement>,
  opacity = 1,
  variant?: string,
  rotation = 0,
) {
  const image = images.get(item.textures?.[season] ?? item.texture);
  if (!image) return;
  const sprite =
    item.variants?.find((option) => option.id === variant)?.sprite ??
    item.sprites?.[season] ??
    item.sprite;
  const destinationX =
    (x + item.footprint.width / 2) * tileSize - sprite.width / 2;
  const destinationY = (y + item.footprint.height) * tileSize - sprite.height;
  ctx.save();
  ctx.globalAlpha = opacity;
  if (item.fill) {
    const fillImage = images.get(item.fill.textures[season]);
    if (fillImage) {
      for (let dy = 0; dy < item.footprint.height; dy += 1) {
        for (let dx = 0; dx < item.footprint.width; dx += 1) {
          ctx.drawImage(
            fillImage,
            item.fill.sprite.x,
            item.fill.sprite.y,
            item.fill.sprite.width,
            item.fill.sprite.height,
            (x + dx) * tileSize,
            (y + dy) * tileSize,
            tileSize,
            tileSize,
          );
        }
      }
    }
  }
  if (item.rotatable && rotation) {
    ctx.translate(
      destinationX + sprite.width / 2,
      destinationY + sprite.height / 2,
    );
    ctx.rotate((rotation * Math.PI) / 2);
    ctx.drawImage(
      image,
      sprite.x,
      sprite.y,
      sprite.width,
      sprite.height,
      -sprite.width / 2,
      -sprite.height / 2,
      sprite.width,
      sprite.height,
    );
    ctx.restore();
    return;
  }
  ctx.drawImage(
    image,
    sprite.x,
    sprite.y,
    sprite.width,
    sprite.height,
    destinationX,
    destinationY,
    sprite.width,
    sprite.height,
  );
  ctx.restore();
}

export function paintGround(
  ctx: CanvasRenderingContext2D,
  plan: FarmPlan,
  catalog: Catalog,
  map: FarmMap,
  images: Map<string, HTMLImageElement>,
) {
  const itemsById = new Map(catalog.items.map((item) => [item.id, item]));
  const soilAt = (x: number, y: number) => {
    const item = itemsById.get(plan.ground[tileKey(x, y)]);
    return item?.kind === ItemKind.SOIL ? item : undefined;
  };
  const maskAt = (x: number, y: number, wateredOnly: boolean) => {
    const matches = (nx: number, ny: number) => {
      const item = soilAt(nx, ny);
      return Boolean(item && (!wateredOnly || item.id === "soil:watered"));
    };
    return cardinalMask(x, y, matches);
  };
  for (const [key, id] of Object.entries(plan.ground)) {
    const item = itemsById.get(id);
    if (!item) continue;
    const [x, y] = key.split(",").map(Number);
    if (!Number.isInteger(x) || !Number.isInteger(y)) continue;
    if (
      item.kind === ItemKind.FLOOR &&
      item.connectType &&
      item.connectType !== FloorConnectType.RANDOM
    ) {
      const image = images.get(item.textures?.[plan.season] ?? item.texture);
      if (!image) continue;
      const sprite = item.sprites?.[plan.season] ?? item.sprite;
      const connects = (nx: number, ny: number) =>
        nx < 0 ||
        ny < 0 ||
        nx >= map.width ||
        ny >= map.height ||
        plan.ground[tileKey(nx, ny)] === id;
      const mask = cardinalMask(x, y, connects);
      const position = floorSpriteByMask[mask];
      ctx.drawImage(
        image,
        sprite.x + (position % 16) * 16,
        sprite.y + Math.floor(position / 16) * 16,
        16,
        16,
        x * map.tileSize,
        y * map.tileSize,
        map.tileSize,
        map.tileSize,
      );
      if (item.connectType !== FloorConnectType.PATH) {
        const size = item.cornerSize ?? 4;
        const scale = map.tileSize / 16;
        const drawCorner = (
          required: number,
          diagonalX: number,
          diagonalY: number,
          sourceX: number,
          sourceY: number,
          destinationX: number,
          destinationY: number,
        ) => {
          if ((mask & required) !== required || connects(diagonalX, diagonalY))
            return;
          ctx.drawImage(
            image,
            sprite.x + sourceX,
            sprite.y + sourceY,
            size,
            size,
            x * map.tileSize + destinationX * scale,
            y * map.tileSize + destinationY * scale,
            size * scale,
            size * scale,
          );
        };
        drawCorner(9, x - 1, y - 1, 64 - size, 48 - size, 0, 0);
        drawCorner(3, x + 1, y - 1, 16, 48 - size, 16 - size, 0);
        drawCorner(6, x + 1, y + 1, 16, 0, 16 - size, 16 - size);
        drawCorner(12, x - 1, y + 1, 64 - size, 0, 0, 16 - size);
      }
      continue;
    }
    if (item.kind !== ItemKind.SOIL) {
      paintItem(ctx, item, x, y, map.tileSize, plan.season, images);
      continue;
    }
    const image = images.get(item.textures?.[plan.season] ?? item.texture);
    if (!image) continue;
    const drawSoil = (mask: number, offsetX: number) => {
      const position = soilSpriteByMask[mask];
      ctx.drawImage(
        image,
        offsetX + (position % 4) * 16,
        Math.floor(position / 4) * 16,
        16,
        16,
        x * map.tileSize,
        y * map.tileSize,
        map.tileSize,
        map.tileSize,
      );
    };
    drawSoil(maskAt(x, y, false), 0);
    if (item.id === "soil:watered") drawSoil(maskAt(x, y, true), 64);
  }
}

export function paintPlacements(
  ctx: CanvasRenderingContext2D,
  plan: FarmPlan,
  catalog: Catalog,
  map: FarmMap,
  images: Map<string, HTMLImageElement>,
) {
  const fenceByTile = new Map(
    plan.placements
      .filter(
        (placed) => itemById(catalog, placed.itemId)?.kind === ItemKind.FENCE,
      )
      .map((placed) => [tileKey(placed.x, placed.y), placed]),
  );
  const sorted = [...plan.placements].sort((a, b) => {
    const itemA = itemById(catalog, a.itemId);
    const itemB = itemById(catalog, b.itemId);
    return (
      Number(Boolean(itemB?.underlay)) - Number(Boolean(itemA?.underlay)) ||
      a.y +
        (itemA?.footprint.height ?? 0) -
        (b.y + (itemB?.footprint.height ?? 0)) ||
      a.x - b.x
    );
  });
  for (const placement of sorted) {
    const item = itemById(catalog, placement.itemId);
    if (item?.kind === ItemKind.FENCE) {
      const image = images.get(item.textures?.[plan.season] ?? item.texture);
      if (!image) continue;
      const connects = (x: number, y: number) => {
        const neighbor = fenceByTile.get(tileKey(x, y));
        return Boolean(
          neighbor &&
          (placement.itemId === "object:325" ||
            neighbor.itemId === placement.itemId),
        );
      };
      const mask = cardinalMask(placement.x, placement.y, connects);
      const sum =
        (mask & 1 ? 1000 : 0) +
        (mask & 2 ? 100 : 0) +
        (mask & 4 ? 500 : 0) +
        (mask & 8 ? 10 : 0);
      if (
        placement.itemId === "object:325" &&
        paintClosedGate(ctx, image, placement.x, placement.y, sum, map.tileSize)
      )
        continue;
      const index =
        placement.itemId === "object:325" ? 17 : (fenceSpriteBySum[sum] ?? 5);
      ctx.drawImage(
        image,
        (index % 3) * 16,
        Math.floor(index / 3) * 32,
        16,
        32,
        placement.x * map.tileSize,
        (placement.y + 1) * map.tileSize - 32,
        16,
        32,
      );
    } else {
      paintPlacement(ctx, placement, catalog, map, plan.season, images);
    }
  }
}

function paintPlacement(
  ctx: CanvasRenderingContext2D,
  placement: Placement,
  catalog: Catalog,
  map: FarmMap,
  season: Season,
  images: Map<string, HTMLImageElement>,
) {
  const item = itemById(catalog, placement.itemId);
  if (item)
    paintItem(
      ctx,
      item,
      placement.x,
      placement.y,
      map.tileSize,
      season,
      images,
      1,
      placement.variant,
      placement.rotation,
    );
}

export function paintBuildableOverlay(
  ctx: CanvasRenderingContext2D,
  map: FarmMap,
) {
  ctx.save();
  ctx.fillStyle = "rgba(83, 226, 126, 0.2)";
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      if (isBuildableTerrain(map, x, y)) {
        ctx.fillRect(
          x * map.tileSize,
          y * map.tileSize,
          map.tileSize,
          map.tileSize,
        );
      }
    }
  }
  ctx.restore();
}

export function paintCoverageOverlay(
  ctx: CanvasRenderingContext2D,
  map: FarmMap,
  plan: FarmPlan,
  catalog: Catalog,
) {
  ctx.save();
  ctx.fillStyle = "rgba(90, 190, 255, 0.3)";
  for (const placed of plan.placements) {
    const coverage = itemById(catalog, placed.itemId)?.coverage;
    if (!coverage) continue;
    for (let dy = -coverage.radius; dy <= coverage.radius; dy += 1) {
      for (let dx = -coverage.radius; dx <= coverage.radius; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        if (
          coverage.shape === "cross" &&
          Math.abs(dx) + Math.abs(dy) > coverage.radius
        )
          continue;
        if (
          coverage.shape === "circle" &&
          dx * dx + dy * dy > coverage.radius * coverage.radius
        )
          continue;
        const x = placed.x + dx;
        const y = placed.y + dy;
        if (x < 0 || y < 0 || x >= map.width || y >= map.height) continue;
        ctx.fillRect(
          x * map.tileSize,
          y * map.tileSize,
          map.tileSize,
          map.tileSize,
        );
      }
    }
  }
  ctx.restore();
}
