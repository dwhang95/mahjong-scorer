export const EXAMPLES = [
  {
    name: "All Chows",
    note: "Simple four sequences",
    tiles: ["dot-1", "dot-2", "dot-3", "dot-4", "dot-5", "dot-6", "bam-2", "bam-3", "bam-4", "char-6", "char-7", "char-8", "dot-9", "dot-9"],
    options: { selfDraw: false, concealed: true, seatWind: "east", roundWind: "east" },
  },
  {
    name: "All Pungs",
    note: "Triplets plus a pair",
    tiles: ["dot-2", "dot-2", "dot-2", "bam-5", "bam-5", "bam-5", "char-8", "char-8", "char-8", "dragon-red", "dragon-red", "dragon-red", "wind-east", "wind-east"],
    options: { selfDraw: true, concealed: false, seatWind: "east", roundWind: "south" },
  },
  {
    name: "Half Flush",
    note: "One suit with honors",
    tiles: ["bam-1", "bam-2", "bam-3", "bam-4", "bam-5", "bam-6", "bam-7", "bam-8", "bam-9", "dragon-green", "dragon-green", "dragon-green", "wind-south", "wind-south"],
    options: { selfDraw: false, concealed: false, seatWind: "west", roundWind: "south" },
  },
  {
    name: "Seven Pairs",
    note: "Special pair hand",
    tiles: ["dot-1", "dot-1", "dot-9", "dot-9", "bam-2", "bam-2", "bam-8", "bam-8", "char-3", "char-3", "char-7", "char-7", "dragon-white", "dragon-white"],
    options: { selfDraw: false, concealed: true, seatWind: "north", roundWind: "east" },
  },
];
