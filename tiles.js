export const TILE_GROUPS = [
  {
    label: "Dots",
    tiles: Array.from({ length: 9 }, (_, index) => ({
      id: `dot-${index + 1}`,
      suit: "dot",
      rank: index + 1,
      label: `${index + 1} Dot`,
      glyph: ["🀙", "🀚", "🀛", "🀜", "🀝", "🀞", "🀟", "🀠", "🀡"][index],
    })),
  },
  {
    label: "Bamboo",
    tiles: Array.from({ length: 9 }, (_, index) => ({
      id: `bam-${index + 1}`,
      suit: "bam",
      rank: index + 1,
      label: `${index + 1} Bamboo`,
      glyph: ["🀐", "🀑", "🀒", "🀓", "🀔", "🀕", "🀖", "🀗", "🀘"][index],
    })),
  },
  {
    label: "Characters",
    tiles: Array.from({ length: 9 }, (_, index) => ({
      id: `char-${index + 1}`,
      suit: "char",
      rank: index + 1,
      label: `${index + 1} Character`,
      glyph: ["🀇", "🀈", "🀉", "🀊", "🀋", "🀌", "🀍", "🀎", "🀏"][index],
    })),
  },
  {
    label: "Honors",
    tiles: [
      { id: "wind-east", suit: "wind", rank: "east", label: "East Wind", glyph: "🀀" },
      { id: "wind-south", suit: "wind", rank: "south", label: "South Wind", glyph: "🀁" },
      { id: "wind-west", suit: "wind", rank: "west", label: "West Wind", glyph: "🀂" },
      { id: "wind-north", suit: "wind", rank: "north", label: "North Wind", glyph: "🀃" },
      { id: "dragon-red", suit: "dragon", rank: "red", label: "Red Dragon", glyph: "🀄" },
      { id: "dragon-green", suit: "dragon", rank: "green", label: "Green Dragon", glyph: "🀅" },
      { id: "dragon-white", suit: "dragon", rank: "white", label: "White Dragon", glyph: "🀆" },
    ],
  },
];

export const TILES = TILE_GROUPS.flatMap((group) => group.tiles);
export const TILE_BY_ID = Object.fromEntries(TILES.map((tile) => [tile.id, tile]));
export const WINDS = ["east", "south", "west", "north"];

export function compareTileIds(a, b) {
  return TILES.findIndex((tile) => tile.id === a) - TILES.findIndex((tile) => tile.id === b);
}

export function getCounts(tileIds) {
  return tileIds.reduce((counts, tileId) => {
    counts[tileId] = (counts[tileId] || 0) + 1;
    return counts;
  }, {});
}
