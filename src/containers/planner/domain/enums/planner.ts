export enum Season {
  SPRING = "spring",
  SUMMER = "summer",
  FALL = "fall",
  WINTER = "winter",
}

export enum MapId {
  STANDARD = "standard",
  RIVERLAND = "riverland",
  FOREST = "forest",
  HILLTOP = "hilltop",
  WILDERNESS = "wilderness",
  FOUR_CORNERS = "four-corners",
  BEACH = "beach",
  MEADOWLANDS = "meadowlands",
}

export enum ItemKind {
  BUILDING = "building",
  FLOOR = "floor",
  SOIL = "soil",
  CROP = "crop",
  TREE = "tree",
  OBJECT = "object",
  FENCE = "fence",
  FURNITURE = "furniture",
}

export enum FloorConnectType {
  DEFAULT = "Default",
  PATH = "Path",
  CORNER_DECORATED = "CornerDecorated",
  RANDOM = "Random",
}

export enum PlacementRule {
  BUILDABLE = "buildable",
  OPEN_GROUND = "open-ground",
  DIGGABLE = "diggable",
  TREE_GROUND = "tree-ground",
  WATER = "water",
}

export enum Tool {
  SELECT = "select",
  PLACE = "place",
  ERASE = "erase",
  PAN = "pan",
}

export enum StorageKey {
  PLANNER = "stardew-farm-planner:v1",
}
