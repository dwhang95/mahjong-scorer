import { scoreHand } from "./scoring.js";
import { FAN_KEYS, RULESET_PRESETS, createRuleset } from "./rules.js";

const DEFAULT_OPTIONS = {
  seatWind: "east",
  roundWind: "south",
  selfDraw: false,
  concealed: false,
  flowerCount: 0,
  minimumFanEnabled: true,
  fanCap: 10,
};

const tests = [
  {
    name: "valid standard 4-meld + pair hand",
    tiles: [
      "dot-1", "dot-2", "dot-3",
      "dot-4", "dot-5", "dot-6",
      "bam-2", "bam-3", "bam-4",
      "char-6", "char-7", "char-8",
      "dot-9", "dot-9",
    ],
    options: { minimumFanEnabled: false },
    assert: (result) => {
      assertEqual(result.isValid, true, "hand should be valid");
      assertEqual(result.arrangement.kind, "standard", "arrangement should be standard");
    },
  },
  {
    name: "Seven Pairs",
    tiles: [
      "dot-1", "dot-1",
      "dot-9", "dot-9",
      "bam-2", "bam-2",
      "bam-8", "bam-8",
      "char-3", "char-3",
      "char-7", "char-7",
      "dragon-white", "dragon-white",
    ],
    assert: (result) => {
      assertFan(result, "Seven Pairs", 4);
      assertEqual(result.arrangement.kind, "sevenPairs", "arrangement should be sevenPairs");
    },
  },
  {
    name: "Full Flush",
    tiles: [
      "dot-1", "dot-2", "dot-3",
      "dot-2", "dot-3", "dot-4",
      "dot-4", "dot-5", "dot-6",
      "dot-7", "dot-8", "dot-9",
      "dot-5", "dot-5",
    ],
    assert: (result) => assertFan(result, "Full Flush", 7),
  },
  {
    name: "Half Flush",
    tiles: [
      "bam-1", "bam-2", "bam-3",
      "bam-4", "bam-5", "bam-6",
      "bam-7", "bam-8", "bam-9",
      "dragon-green", "dragon-green", "dragon-green",
      "wind-south", "wind-south",
    ],
    assert: (result) => assertFan(result, "Half Flush", 3),
  },
  {
    name: "All Pungs",
    tiles: [
      "dot-2", "dot-2", "dot-2",
      "bam-5", "bam-5", "bam-5",
      "char-8", "char-8", "char-8",
      "dragon-red", "dragon-red", "dragon-red",
      "wind-east", "wind-east",
    ],
    assert: (result) => assertFan(result, "All Pungs", 3),
  },
  {
    name: "All Chows",
    tiles: [
      "dot-1", "dot-2", "dot-3",
      "dot-4", "dot-5", "dot-6",
      "bam-2", "bam-3", "bam-4",
      "char-6", "char-7", "char-8",
      "dot-9", "dot-9",
    ],
    options: { minimumFanEnabled: false },
    assert: (result) => assertFan(result, "All Chows", 1),
  },
  {
    name: "Dragon pung fan",
    tiles: [
      "dot-1", "dot-2", "dot-3",
      "bam-2", "bam-3", "bam-4",
      "char-6", "char-7", "char-8",
      "dragon-red", "dragon-red", "dragon-red",
      "dot-9", "dot-9",
    ],
    options: { minimumFanEnabled: false },
    assert: (result) => assertFan(result, "Red Dragon Pung", 1),
  },
  {
    name: "Seat wind fan",
    tiles: [
      "dot-1", "dot-2", "dot-3",
      "bam-2", "bam-3", "bam-4",
      "char-6", "char-7", "char-8",
      "wind-east", "wind-east", "wind-east",
      "dot-9", "dot-9",
    ],
    options: { seatWind: "east", roundWind: "south", minimumFanEnabled: false },
    assert: (result) => assertFan(result, "Seat Wind Pung", 1),
  },
  {
    name: "Round wind fan",
    tiles: [
      "dot-1", "dot-2", "dot-3",
      "bam-2", "bam-3", "bam-4",
      "char-6", "char-7", "char-8",
      "wind-south", "wind-south", "wind-south",
      "dot-9", "dot-9",
    ],
    options: { seatWind: "east", roundWind: "south", minimumFanEnabled: false },
    assert: (result) => assertFan(result, "Round Wind Pung", 1),
  },
  {
    name: "invalid 13-tile hand",
    tiles: [
      "dot-1", "dot-2", "dot-3",
      "dot-4", "dot-5", "dot-6",
      "bam-2", "bam-3", "bam-4",
      "char-6", "char-7", "char-8",
      "dot-9",
    ],
    assert: (result) => {
      assertEqual(result.isValid, false, "13-tile hand should be invalid");
      assertIncludes(result.message, "Select exactly 14 tiles", "message should explain tile count");
    },
  },
  {
    name: "invalid 15-tile hand",
    tiles: [
      "dot-1", "dot-2", "dot-3",
      "dot-4", "dot-5", "dot-6",
      "bam-2", "bam-3", "bam-4",
      "char-6", "char-7", "char-8",
      "dot-9", "dot-9", "bam-9",
    ],
    assert: (result) => {
      assertEqual(result.isValid, false, "15-tile hand should be invalid");
      assertIncludes(result.message, "Select exactly 14 tiles", "message should explain tile count");
    },
  },
  {
    name: "more than 4 copies of same tile",
    tiles: [
      "dot-1", "dot-1", "dot-1", "dot-1", "dot-1",
      "dot-2", "dot-3", "dot-4",
      "bam-2", "bam-3", "bam-4",
      "char-6", "char-7", "char-8",
    ],
    assert: (result) => {
      assertEqual(result.isValid, false, "five copies should be invalid");
      assertIncludes(result.message, "Too many copies", "message should explain duplicate limit");
    },
  },
  {
    name: "new schema matches old scoring for All Chows",
    assert: () => assertNewSchemaMatchesOld(
      [
        "dot-1", "dot-2", "dot-3",
        "dot-4", "dot-5", "dot-6",
        "bam-2", "bam-3", "bam-4",
        "char-6", "char-7", "char-8",
        "dot-9", "dot-9",
      ],
      { seatWind: "east", roundWind: "south", selfDraw: false, concealed: false, minimumFanEnabled: false, fanCap: 10 },
      {
        melds: [
          { type: "chow", tiles: ["dot-1", "dot-2", "dot-3"], exposed: true },
          { type: "chow", tiles: ["dot-4", "dot-5", "dot-6"], exposed: true },
        ],
        winningTile: "dot-9",
        winType: "discard",
      }
    ),
  },
  {
    name: "new schema matches old scoring for self-draw All Pungs",
    assert: () => assertNewSchemaMatchesOld(
      [
        "dot-2", "dot-2", "dot-2",
        "bam-5", "bam-5", "bam-5",
        "char-8", "char-8", "char-8",
        "dragon-red", "dragon-red", "dragon-red",
        "wind-east", "wind-east",
      ],
      { seatWind: "east", roundWind: "south", selfDraw: true, concealed: false, minimumFanEnabled: true, fanCap: 10 },
      {
        melds: [
          { type: "pung", tiles: ["dot-2", "dot-2", "dot-2"], exposed: true },
          { type: "pung", tiles: ["dragon-red", "dragon-red", "dragon-red"], exposed: true },
        ],
        winningTile: "wind-east",
        winType: "self_draw",
      }
    ),
  },
  {
    name: "new schema matches old scoring for Half Flush",
    assert: () => assertNewSchemaMatchesOld(
      [
        "bam-1", "bam-2", "bam-3",
        "bam-4", "bam-5", "bam-6",
        "bam-7", "bam-8", "bam-9",
        "dragon-green", "dragon-green", "dragon-green",
        "wind-south", "wind-south",
      ],
      { seatWind: "west", roundWind: "south", selfDraw: false, concealed: false, minimumFanEnabled: true, fanCap: 10 },
      {
        melds: [
          { type: "chow", tiles: ["bam-1", "bam-2", "bam-3"], exposed: true },
          { type: "pung", tiles: ["dragon-green", "dragon-green", "dragon-green"], exposed: true },
        ],
        winningTile: "wind-south",
        winType: "discard",
      }
    ),
  },
  {
    name: "new schema matches old scoring for Seven Pairs",
    assert: () => assertNewSchemaMatchesOld(
      [
        "dot-1", "dot-1",
        "dot-9", "dot-9",
        "bam-2", "bam-2",
        "bam-8", "bam-8",
        "char-3", "char-3",
        "char-7", "char-7",
        "dragon-white", "dragon-white",
      ],
      { seatWind: "north", roundWind: "east", selfDraw: false, concealed: true, minimumFanEnabled: true, fanCap: 10 },
      {
        melds: [],
        winningTile: "dragon-white",
        winType: "discard",
      }
    ),
  },
  {
    name: "new schema matches old scoring for invalid duplicate hand",
    assert: () => assertNewSchemaMatchesOld(
      [
        "dot-1", "dot-1", "dot-1", "dot-1", "dot-1",
        "dot-2", "dot-3", "dot-4",
        "bam-2", "bam-3", "bam-4",
        "char-6", "char-7", "char-8",
      ],
      { seatWind: "east", roundWind: "south", selfDraw: false, concealed: false, minimumFanEnabled: true, fanCap: 10 },
      {
        melds: [{ type: "kong", tiles: ["dot-1", "dot-1", "dot-1", "dot-1"], exposed: true }],
        winningTile: "dot-1",
        winType: "discard",
      }
    ),
  },
  {
    name: "new schema exposed meld suppresses Concealed Hand",
    assert: () => {
      const result = scoreHand(
        standardChowHandSchema({
          melds: [{ type: "chow", tiles: ["dot-1", "dot-2", "dot-3"], exposed: true }],
          winType: "discard",
        }),
        { concealed: true, minimumFanEnabled: false, fanCap: 10 }
      );

      assertEqual(result.isValid, true, "hand should be valid");
      assertNoFan(result, "Concealed Hand");
    },
  },
  {
    name: "new schema concealed melds add Concealed Hand",
    assert: () => {
      const result = scoreHand(
        standardChowHandSchema({
          melds: [
            { type: "chow", tiles: ["dot-1", "dot-2", "dot-3"], exposed: false },
            { type: "chow", tiles: ["dot-4", "dot-5", "dot-6"], exposed: false },
          ],
          winType: "discard",
        }),
        { concealed: false, minimumFanEnabled: false, fanCap: 10 }
      );

      assertFan(result, "Concealed Hand", 1);
      assertNoFan(result, "Fully Concealed Hand");
    },
  },
  {
    name: "new schema concealed self-draw adds Fully Concealed Hand",
    assert: () => {
      const result = scoreHand(
        standardChowHandSchema({
          melds: [{ type: "chow", tiles: ["dot-1", "dot-2", "dot-3"], exposed: false }],
          winType: "self_draw",
        }),
        { minimumFanEnabled: false, fanCap: 10 }
      );

      assertFan(result, "Self-Draw", 1);
      assertFan(result, "Concealed Hand", 1);
      assertFan(result, "Fully Concealed Hand", 1);
    },
  },
  {
    name: "new schema exposed self-draw does not add concealed fans",
    assert: () => {
      const result = scoreHand(
        standardChowHandSchema({
          melds: [{ type: "chow", tiles: ["dot-1", "dot-2", "dot-3"], exposed: true }],
          winType: "self_draw",
        }),
        { minimumFanEnabled: false, fanCap: 10 }
      );

      assertFan(result, "Self-Draw", 1);
      assertNoFan(result, "Concealed Hand");
      assertNoFan(result, "Fully Concealed Hand");
    },
  },
  {
    name: "new schema rejects winning tile outside hand",
    assert: () => {
      const result = scoreHand(
        standardChowHandSchema({
          melds: [{ type: "chow", tiles: ["dot-1", "dot-2", "dot-3"], exposed: false }],
          winningTile: "dragon-red",
          winType: "discard",
        }),
        { minimumFanEnabled: false, fanCap: 10 }
      );

      assertEqual(result.isValid, false, "hand should be invalid when winning tile is absent");
      assertIncludes(result.message, "Winning tile is not in the hand", "message should explain winning tile validation");
    },
  },
  {
    name: "All Simples positive",
    tiles: [
      "dot-2", "dot-3", "dot-4",
      "dot-3", "dot-4", "dot-5",
      "bam-4", "bam-5", "bam-6",
      "char-6", "char-7", "char-8",
      "bam-8", "bam-8",
    ],
    options: { minimumFanEnabled: false },
    assert: (result) => assertFan(result, "All Simples", 1),
  },
  {
    name: "All Simples negative with terminal",
    tiles: [
      "dot-1", "dot-2", "dot-3",
      "dot-3", "dot-4", "dot-5",
      "bam-4", "bam-5", "bam-6",
      "char-6", "char-7", "char-8",
      "bam-8", "bam-8",
    ],
    options: { minimumFanEnabled: false },
    assert: (result) => {
      assertEqual(result.isValid, true, "hand should be valid");
      assertNoFan(result, "All Simples");
    },
  },
  {
    name: "Pure Straight positive",
    tiles: [
      "dot-1", "dot-2", "dot-3",
      "dot-4", "dot-5", "dot-6",
      "dot-7", "dot-8", "dot-9",
      "bam-2", "bam-3", "bam-4",
      "char-5", "char-5",
    ],
    options: { minimumFanEnabled: false },
    assert: (result) => assertFan(result, "Pure Straight", 1),
  },
  {
    name: "Pure Straight negative when 1-9 is split across suits",
    tiles: [
      "dot-1", "dot-2", "dot-3",
      "dot-4", "dot-5", "dot-6",
      "bam-7", "bam-8", "bam-9",
      "char-2", "char-3", "char-4",
      "char-5", "char-5",
    ],
    options: { minimumFanEnabled: false },
    assert: (result) => {
      assertEqual(result.isValid, true, "hand should be valid");
      assertNoFan(result, "Pure Straight");
    },
  },
  {
    name: "Mixed Straight positive",
    tiles: [
      "dot-1", "dot-2", "dot-3",
      "bam-4", "bam-5", "bam-6",
      "char-7", "char-8", "char-9",
      "dot-4", "dot-5", "dot-6",
      "bam-8", "bam-8",
    ],
    options: { minimumFanEnabled: false },
    assert: (result) => assertFan(result, "Mixed Straight", 1),
  },
  {
    name: "Mixed Straight negative when two ranges share a suit",
    tiles: [
      "dot-1", "dot-2", "dot-3",
      "bam-4", "bam-5", "bam-6",
      "bam-7", "bam-8", "bam-9",
      "char-2", "char-3", "char-4",
      "char-5", "char-5",
    ],
    options: { minimumFanEnabled: false },
    assert: (result) => {
      assertEqual(result.isValid, true, "hand should be valid");
      assertNoFan(result, "Mixed Straight");
    },
  },
  {
    name: "Three Concealed Pungs positive",
    assert: () => {
      const result = scoreHand(
        {
          tiles: [
            "dot-2", "dot-2", "dot-2",
            "bam-3", "bam-3", "bam-3",
            "char-4", "char-4", "char-4",
            "dot-5", "dot-6", "dot-7",
            "bam-8", "bam-8",
          ],
          melds: [
            { type: "pung", tiles: ["dot-2", "dot-2", "dot-2"], exposed: false },
            { type: "pung", tiles: ["bam-3", "bam-3", "bam-3"], exposed: false },
            { type: "pung", tiles: ["char-4", "char-4", "char-4"], exposed: false },
          ],
          winningTile: "bam-8",
          winType: "discard",
          seatWind: "east",
          roundWind: "south",
        },
        { minimumFanEnabled: false, fanCap: 10 }
      );

      assertFan(result, "Three Concealed Pungs", 2);
    },
  },
  {
    name: "Three Concealed Pungs negative with one exposed pung",
    assert: () => {
      const result = scoreHand(
        {
          tiles: [
            "dot-2", "dot-2", "dot-2",
            "bam-3", "bam-3", "bam-3",
            "char-4", "char-4", "char-4",
            "dot-5", "dot-6", "dot-7",
            "bam-8", "bam-8",
          ],
          melds: [
            { type: "pung", tiles: ["dot-2", "dot-2", "dot-2"], exposed: true },
            { type: "pung", tiles: ["bam-3", "bam-3", "bam-3"], exposed: false },
            { type: "pung", tiles: ["char-4", "char-4", "char-4"], exposed: false },
          ],
          winningTile: "bam-8",
          winType: "discard",
          seatWind: "east",
          roundWind: "south",
        },
        { minimumFanEnabled: false, fanCap: 10 }
      );

      assertEqual(result.isValid, true, "hand should be valid");
      assertNoFan(result, "Three Concealed Pungs");
    },
  },
  {
    name: "Thirteen Orphans positive",
    tiles: [
      "dot-1", "dot-9",
      "bam-1", "bam-9",
      "char-1", "char-9",
      "wind-east", "wind-east", "wind-south", "wind-west", "wind-north",
      "dragon-red", "dragon-green", "dragon-white",
    ],
    assert: (result) => {
      assertFan(result, "Thirteen Orphans", 10);
      assertEqual(result.arrangement.kind, "thirteenOrphans", "arrangement should be thirteenOrphans");
    },
  },
  {
    name: "Thirteen Orphans negative with missing orphan",
    tiles: [
      "dot-1", "dot-9",
      "bam-1", "bam-9",
      "char-1", "char-9",
      "wind-east", "wind-east", "wind-south", "wind-west", "wind-north",
      "dragon-red", "dragon-green", "dot-2",
    ],
    assert: (result) => {
      assertEqual(result.isValid, false, "hand should be invalid without all orphan tiles");
      assertNoFan(result, "Thirteen Orphans");
    },
  },
  {
    name: "Nine Gates positive with terminal duplicate",
    tiles: [
      "dot-1", "dot-1", "dot-1", "dot-1",
      "dot-2", "dot-3", "dot-4", "dot-5", "dot-6", "dot-7", "dot-8",
      "dot-9", "dot-9", "dot-9",
    ],
    assert: (result) => {
      assertFan(result, "Nine Gates", 10);
      assertEqual(result.arrangement.kind, "nineGates", "arrangement should be nineGates");
      assertEqual(result.isLimit, true, "Nine Gates should be a limit hand");
    },
  },
  {
    name: "Nine Gates negative with same-suit pungs",
    tiles: [
      "dot-1", "dot-1", "dot-1",
      "dot-2", "dot-2", "dot-2",
      "dot-3", "dot-3", "dot-3",
      "dot-9", "dot-9", "dot-9",
      "dot-5", "dot-5",
    ],
    options: { minimumFanEnabled: false },
    assert: (result) => {
      assertEqual(result.isValid, true, "hand should still be a valid standard shape");
      assertNoFan(result, "Nine Gates");
    },
  },
  {
    name: "All Terminals positive",
    tiles: [
      "dot-1", "dot-1", "dot-1",
      "dot-9", "dot-9", "dot-9",
      "bam-1", "bam-1", "bam-1",
      "bam-9", "bam-9", "bam-9",
      "char-1", "char-1",
    ],
    assert: (result) => {
      assertFan(result, "All Terminals", 10);
      assertEqual(result.isLimit, true, "All Terminals should be a limit hand");
    },
  },
  {
    name: "All Terminals negative with honor",
    tiles: [
      "dot-1", "dot-1", "dot-1",
      "dot-9", "dot-9", "dot-9",
      "bam-1", "bam-1", "bam-1",
      "bam-9", "bam-9", "bam-9",
      "dragon-red", "dragon-red",
    ],
    assert: (result) => {
      assertEqual(result.isValid, true, "hand should be valid with terminal sets and an honor pair");
      assertNoFan(result, "All Terminals");
    },
  },
  {
    name: "Four Concealed Pungs positive when discard wins on pair",
    assert: () => {
      const result = scoreHand(
        {
          tiles: [
            "dot-2", "dot-2", "dot-2",
            "bam-3", "bam-3", "bam-3",
            "char-4", "char-4", "char-4",
            "dot-5", "dot-5", "dot-5",
            "bam-8", "bam-8",
          ],
          melds: [],
          winningTile: "bam-8",
          winType: "discard",
          seatWind: "east",
          roundWind: "south",
        },
        { minimumFanEnabled: false, fanCap: 10 }
      );

      assertFan(result, "Four Concealed Pungs", 10);
      assertEqual(result.isLimit, true, "Four Concealed Pungs should be a limit hand");
    },
  },
  {
    name: "Four Concealed Pungs negative when discard completes a pung",
    assert: () => {
      const result = scoreHand(
        {
          tiles: [
            "dot-2", "dot-2", "dot-2",
            "bam-3", "bam-3", "bam-3",
            "char-4", "char-4", "char-4",
            "dot-5", "dot-5", "dot-5",
            "bam-8", "bam-8",
          ],
          melds: [],
          winningTile: "dot-5",
          winType: "discard",
          seatWind: "east",
          roundWind: "south",
        },
        { minimumFanEnabled: false, fanCap: 10 }
      );

      assertEqual(result.isValid, true, "hand should be valid");
      assertFan(result, "Three Concealed Pungs", 2);
      assertNoFan(result, "Four Concealed Pungs");
    },
  },
  {
    name: "Pretty / flower tiles add fan outside the 14-tile hand",
    tiles: [
      "dot-1", "dot-2", "dot-3",
      "dot-4", "dot-5", "dot-6",
      "bam-2", "bam-3", "bam-4",
      "char-6", "char-7", "char-8",
      "dot-9", "dot-9",
    ],
    options: { flowerCount: 3, minimumFanEnabled: false },
    assert: (result) => {
      assertFan(result, "Pretty / Flower Tiles", 3);
      assertIncludes(
        result.fanItems.find((fanItem) => fanItem.name === "Pretty / Flower Tiles").description,
        "3 pretty/flower",
        "pretty/flower description should include count"
      );
    },
  },
  {
    name: "Pretty / flower tiles can be disabled by ruleset",
    tiles: [
      "dot-1", "dot-2", "dot-3",
      "dot-4", "dot-5", "dot-6",
      "bam-2", "bam-3", "bam-4",
      "char-6", "char-7", "char-8",
      "dot-9", "dot-9",
    ],
    options: {
      flowerCount: 3,
      minimumFanEnabled: false,
      ruleset: createRuleset({
        fans: {
          [FAN_KEYS.prettyFlowers]: { enabled: false },
        },
      }),
    },
    assert: (result) => {
      assertEqual(result.isValid, true, "hand should be valid");
      assertNoFan(result, "Pretty / Flower Tiles");
    },
  },
  {
    name: "HK default ruleset matches legacy options",
    assert: () => assertRulesetMatchesLegacy(RULESET_PRESETS.hk),
  },
  {
    name: "custom default ruleset matches legacy options",
    assert: () => assertRulesetMatchesLegacy(RULESET_PRESETS.custom),
  },
  {
    name: "created custom ruleset matches legacy options when unchanged",
    assert: () => assertRulesetMatchesLegacy(createRuleset({ preset: "custom" })),
  },
];

let passed = 0;

for (const test of tests) {
  try {
    const result = scoreHand(test.tiles, { ...DEFAULT_OPTIONS, ...test.options });
    test.assert(result);
    passed += 1;
    console.log(`PASS ${test.name}`);
  } catch (error) {
    console.error(`FAIL ${test.name}`);
    console.error(error.message);
  }
}

const failed = tests.length - passed;
console.log(`${passed}/${tests.length} tests passed`);

if (failed > 0) {
  throw new Error(`${failed} test${failed === 1 ? "" : "s"} failed`);
}

function assertFan(result, name, fan) {
  assertEqual(result.isValid, true, "hand should be valid");
  const item = result.fanItems.find((fanItem) => fanItem.name === name);
  if (!item) {
    throw new Error(`Expected fan item "${name}", got [${result.fanItems.map((fanItem) => fanItem.name).join(", ")}]`);
  }
  assertEqual(item.fan, fan, `"${name}" fan value`);
}

function assertNoFan(result, name) {
  const item = result.fanItems.find((fanItem) => fanItem.name === name);
  if (item) {
    throw new Error(`Expected no fan item "${name}"`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(actual, expected, label) {
  if (!actual.includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to include ${JSON.stringify(expected)}`);
  }
}

function assertNewSchemaMatchesOld(tiles, oldOptions, schemaContext) {
  const oldResult = scoreHand(tiles, oldOptions);
  const newResult = scoreHand(
    {
      tiles,
      melds: schemaContext.melds,
      winningTile: schemaContext.winningTile,
      winType: schemaContext.winType,
      seatWind: oldOptions.seatWind,
      roundWind: oldOptions.roundWind,
    },
    {
      concealed: oldOptions.concealed,
      minimumFanEnabled: oldOptions.minimumFanEnabled,
      fanCap: oldOptions.fanCap,
    }
  );

  assertEqual(newResult.isValid, oldResult.isValid, "schema isValid should match old format");
  assertEqual(newResult.totalFan, oldResult.totalFan, "schema totalFan should match old format");
  assertEqual(newResult.rawFan, oldResult.rawFan, "schema rawFan should match old format");
  assertEqual(newResult.isLimit, oldResult.isLimit, "schema isLimit should match old format");
  assertEqual(newResult.message, oldResult.message, "schema message should match old format");
  assertEqual(JSON.stringify(newResult.fanItems), JSON.stringify(oldResult.fanItems), "schema fanItems should match old format");
  assertEqual(
    JSON.stringify(newResult.arrangement),
    JSON.stringify(oldResult.arrangement),
    "schema arrangement should match old format"
  );
}

function assertRulesetMatchesLegacy(ruleset) {
  const cases = [
    {
      tiles: [
        "dot-1", "dot-2", "dot-3",
        "dot-4", "dot-5", "dot-6",
        "bam-2", "bam-3", "bam-4",
        "char-6", "char-7", "char-8",
        "dot-9", "dot-9",
      ],
      options: { minimumFanEnabled: false },
    },
    {
      tiles: [
        "dot-2", "dot-2", "dot-2",
        "bam-5", "bam-5", "bam-5",
        "char-8", "char-8", "char-8",
        "dragon-red", "dragon-red", "dragon-red",
        "wind-east", "wind-east",
      ],
      options: { seatWind: "east", roundWind: "south", selfDraw: true, concealed: false },
    },
    {
      tiles: [
        "dot-1", "dot-9",
        "bam-1", "bam-9",
        "char-1", "char-9",
        "wind-east", "wind-east", "wind-south", "wind-west", "wind-north",
        "dragon-red", "dragon-green", "dragon-white",
      ],
      options: {},
    },
    {
      tiles: [
        "bam-1", "bam-2", "bam-3",
        "bam-4", "bam-5", "bam-6",
        "bam-7", "bam-8", "bam-9",
        "dragon-green", "dragon-green", "dragon-green",
        "wind-south", "wind-south",
      ],
      options: { seatWind: "west", roundWind: "south" },
    },
  ];

  for (const testCase of cases) {
    const legacyResult = scoreHand(testCase.tiles, { ...DEFAULT_OPTIONS, ...testCase.options });
    const rulesetResult = scoreHand(testCase.tiles, { ...DEFAULT_OPTIONS, ...testCase.options, ruleset });
    assertEqual(
      JSON.stringify(serializeScore(rulesetResult)),
      JSON.stringify(serializeScore(legacyResult)),
      `${ruleset.name} ruleset output should match legacy options`
    );
  }
}

function serializeScore(result) {
  return {
    isValid: result.isValid,
    meetsMinimum: result.meetsMinimum,
    isLimit: result.isLimit,
    totalFan: result.totalFan,
    rawFan: result.rawFan,
    message: result.message,
    feedback: result.feedback,
    arrangement: result.arrangement,
    fanItems: result.fanItems,
  };
}

function standardChowHandSchema(overrides = {}) {
  return {
    tiles: [
      "dot-1", "dot-2", "dot-3",
      "dot-4", "dot-5", "dot-6",
      "bam-2", "bam-3", "bam-4",
      "char-6", "char-7", "char-8",
      "dot-9", "dot-9",
    ],
    melds: [],
    winningTile: "dot-9",
    winType: "discard",
    seatWind: "east",
    roundWind: "south",
    ...overrides,
  };
}
