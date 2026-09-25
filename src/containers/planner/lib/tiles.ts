import type {
  FarmMap,
  Tileset,
} from "@/containers/planner/domain/schemas/assets";

const FLIP_HORIZONTAL = 0x80000000;
const FLIP_VERTICAL = 0x40000000;
const FLIP_DIAGONAL = 0x20000000;
const GID_MASK = 0x0fffffff;

export function decodeGid(raw: number) {
  const unsigned = raw >>> 0;
  return {
    gid: unsigned & GID_MASK,
    flipHorizontal: Boolean(unsigned & FLIP_HORIZONTAL),
    flipVertical: Boolean(unsigned & FLIP_VERTICAL),
    flipDiagonal: Boolean(unsigned & FLIP_DIAGONAL),
  };
}

export function tilesetFor(map: FarmMap, gid: number): Tileset | undefined {
  return map.tilesets.findLast(
    (tileset) =>
      gid >= tileset.firstGid && gid < tileset.firstGid + tileset.tileCount,
  );
}

export function tileProperties(
  map: FarmMap,
  rawGid: number,
): Record<string, string> {
  const gid = decodeGid(rawGid).gid;
  const sheet = tilesetFor(map, gid);
  return sheet?.tileProperties[String(gid - sheet.firstGid)] ?? {};
}

export function gidAt(
  map: FarmMap,
  layerName: string,
  x: number,
  y: number,
): number {
  const layer = map.layers.find((candidate) => candidate.name === layerName);
  return layer?.gids[y * map.width + x] ?? 0;
}

export function tileKey(x: number, y: number) {
  return `${x},${y}`;
}

export function rasterLine(
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  const points: { x: number; y: number }[] = [];
  let x = from.x;
  let y = from.y;
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  const sx = from.x < to.x ? 1 : -1;
  const sy = from.y < to.y ? 1 : -1;
  let error = dx - dy;
  while (true) {
    points.push({ x, y });
    if (x === to.x && y === to.y) break;
    const doubled = 2 * error;
    if (doubled > -dy) {
      error -= dy;
      x += sx;
    }
    if (doubled < dx) {
      error += dx;
      y += sy;
    }
  }
  return points;
}
