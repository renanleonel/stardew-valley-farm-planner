import { describe, expect, it } from "vitest";
import {
  decodeGid,
  rasterLine,
  tilesetFor,
} from "@/containers/planner/lib/tiles";
import type { FarmMap } from "@/containers/planner/domain/schemas/assets";

describe("TMX tile geometry", () => {
  it("decodes all flip flags without changing the tile ID", () => {
    expect(decodeGid(0xe0000000 | 17)).toEqual({
      gid: 17,
      flipHorizontal: true,
      flipVertical: true,
      flipDiagonal: true,
    });
    expect(decodeGid(0)).toEqual({
      gid: 0,
      flipHorizontal: false,
      flipVertical: false,
      flipDiagonal: false,
    });
  });

  it("keeps fast brush movement connected across crossed cells", () => {
    expect(rasterLine({ x: 1, y: 1 }, { x: 5, y: 3 })).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 5, y: 3 },
    ]);
  });

  it("uses the correct sheet at a first GID boundary", () => {
    const map = {
      tilesets: [
        { firstGid: 1, tileCount: 10 },
        { firstGid: 11, tileCount: 10 },
      ],
    } as FarmMap;
    expect(tilesetFor(map, 10)?.firstGid).toBe(1);
    expect(tilesetFor(map, 11)?.firstGid).toBe(11);
    expect(tilesetFor(map, 21)).toBeUndefined();
  });
});
