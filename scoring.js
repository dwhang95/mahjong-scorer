import { TILES, TILE_BY_ID, getCounts } from "./tiles.js";
import { FAN_KEYS, createRuleset, getRuleset } from "./rules.js";

export function scoreHand(tileIds, options) {
  const input = normalizeInput(tileIds, options);
  const rules = normalizeRules(input.options);
  tileIds = input.tiles;
  options = input.options;

  if (tileIds.length !== 14) {
    return {
      isValid: false,
      isLimit: false,
      totalFan: 0,
      rawFan: 0,
      message: "Select exactly 14 tiles for a completed winning hand.",
      feedback: [
        `${14 - tileIds.length > 0 ? `${14 - tileIds.length} more tile${14 - tileIds.length === 1 ? "" : "s"} needed.` : "Remove extra tiles until the hand has 14 tiles."}`,
        "A winning hand is usually four sets plus a pair, or the special Seven Pairs hand.",
      ],
      arrangement: null,
      fanItems: [],
    };
  }

  if (input.context.usesSchema && input.context.winningTile) {
    if (!TILE_BY_ID[input.context.winningTile]) {
      return invalidResult(
        "Winning tile is not recognized.",
        ["Use one of the supported tile IDs from the tile catalog."]
      );
    }

    if (!tileIds.includes(input.context.winningTile)) {
      return invalidResult(
        "Winning tile is not in the hand.",
        ["The winning tile must also appear in the 14 selected tiles."]
      );
    }
  }

  const counts = getCounts(tileIds);
  if (Object.values(counts).some((count) => count > 4)) {
    return invalidResult(
      "Too many copies of one tile.",
      ["A real Mahjong set only has four of each tile. Remove the extra copy before scoring."]
    );
  }

  const arrangements = findWinningArrangements(counts);
  if (!arrangements.length) {
    return invalidResult(
      "These 14 tiles do not form a recognized winning hand.",
      [
        "For a normal hand, the tiles must split into four sets and one pair.",
        "A set is either three identical tiles or three suited tiles in sequence.",
        "Seven Pairs is also supported, but it must be exactly seven pairs.",
      ]
    );
  }

  const scored = arrangements.map((arrangement) => scoreArrangement(tileIds, arrangement, options, rules));
  scored.sort((a, b) => b.totalFan - a.totalFan);
  const best = scored[0];
  const meetsMinimum = !rules.minimumFan.enabled || best.rawFan >= rules.minimumFan.value;
  return {
    ...best,
    isValid: true,
    meetsMinimum,
    message: rules.minimumFan.enabled
      ? (meetsMinimum
        ? `Valid winning hand. Meets the ${rules.minimumFan.value} fan minimum.`
        : `Valid shape, but below the ${rules.minimumFan.value} fan minimum for this ruleset.`)
      : `Valid winning hand. The ${rules.minimumFan.value} fan minimum is turned off.`,
    feedback: rules.minimumFan.enabled && !meetsMinimum
      ? ["Some tables would not allow this win unless it reaches the minimum. Turn off the minimum only if your table uses that house rule."]
      : [],
  };
}

function normalizeInput(input, options = {}) {
  if (Array.isArray(input)) {
    return {
      tiles: input,
      options,
      context: {
        usesSchema: false,
        melds: [],
        winningTile: null,
        winType: options.selfDraw ? "self_draw" : "discard",
      },
    };
  }

  const melds = Array.isArray(input?.melds) ? input.melds : [];
  const hasExposedMelds = melds.some((meld) => meld.exposed === true);
  const schemaOptions = {};
  if (input?.seatWind) schemaOptions.seatWind = input.seatWind;
  if (input?.roundWind) schemaOptions.roundWind = input.roundWind;
  if (input?.winType) schemaOptions.selfDraw = input.winType === "self_draw";
  if (input?.winningTile) schemaOptions.winningTile = input.winningTile;
  if (input?.winType) schemaOptions.winType = input.winType;
  schemaOptions.concealed = !hasExposedMelds;
  schemaOptions.melds = melds;

  return {
    tiles: input?.tiles || [],
    options: { ...options, ...schemaOptions },
    context: {
      usesSchema: true,
      melds,
      winningTile: input?.winningTile || null,
      winType: input?.winType || (options.selfDraw ? "self_draw" : "discard"),
    },
  };
}

function normalizeRules(options = {}) {
  const rulesetInput = options.ruleset || options.rulesetId || options.preset;
  const rules = typeof rulesetInput === "object" && rulesetInput !== null
    ? createRuleset(rulesetInput)
    : getRuleset(rulesetInput);
  const fanCap = Number.parseInt(options.fanCap, 10);
  if (Number.isFinite(fanCap) && fanCap > 0) rules.fanCap = fanCap;
  if (options.minimumFanEnabled !== undefined) rules.minimumFan.enabled = options.minimumFanEnabled !== false;
  return rules;
}

function invalidResult(message, feedback = []) {
  return {
    isValid: false,
    isLimit: false,
    totalFan: 0,
    rawFan: 0,
    message,
    feedback,
    arrangement: null,
    fanItems: [],
  };
}

function findWinningArrangements(counts) {
  const arrangements = [];
  const pairIds = Object.keys(counts).filter((tileId) => counts[tileId] >= 2);

  if (isThirteenOrphans(counts)) {
    const pairId = THIRTEEN_ORPHANS_IDS.find((tileId) => counts[tileId] === 2);
    arrangements.push({
      kind: "thirteenOrphans",
      groups: [
        { type: "pair", tiles: [pairId, pairId] },
        ...THIRTEEN_ORPHANS_IDS.filter((tileId) => tileId !== pairId).map((tileId) => ({ type: "single", tiles: [tileId] })),
      ],
    });
  }

  if (isNineGates(counts)) {
    arrangements.push({
      kind: "nineGates",
      groups: Object.keys(counts).map((tileId) => ({ type: "single", tiles: [tileId] })),
    });
  }

  if (Object.values(counts).filter((count) => count === 2).length === 7) {
    arrangements.push({
      kind: "sevenPairs",
      groups: Object.keys(counts).map((tileId) => ({ type: "pair", tiles: [tileId, tileId] })),
    });
  }

  for (const pairId of pairIds) {
    const remaining = { ...counts, [pairId]: counts[pairId] - 2 };
    const melds = findMelds(remaining);
    for (const meldSet of melds) {
      arrangements.push({
        kind: "standard",
        groups: [{ type: "pair", tiles: [pairId, pairId] }, ...meldSet],
      });
    }
  }

  return arrangements;
}

function findMelds(counts) {
  const firstTileId = TILES.map((tile) => tile.id).find((tileId) => counts[tileId] > 0);
  if (!firstTileId) return [[]];

  const results = [];
  if (counts[firstTileId] >= 3) {
    const nextCounts = { ...counts, [firstTileId]: counts[firstTileId] - 3 };
    for (const rest of findMelds(nextCounts)) {
      results.push([{ type: "pung", tiles: [firstTileId, firstTileId, firstTileId] }, ...rest]);
    }
  }

  const firstTile = TILE_BY_ID[firstTileId];
  if (["dot", "bam", "char"].includes(firstTile.suit) && firstTile.rank <= 7) {
    const secondId = `${firstTile.suit}-${firstTile.rank + 1}`;
    const thirdId = `${firstTile.suit}-${firstTile.rank + 2}`;
    if (counts[secondId] > 0 && counts[thirdId] > 0) {
      const nextCounts = {
        ...counts,
        [firstTileId]: counts[firstTileId] - 1,
        [secondId]: counts[secondId] - 1,
        [thirdId]: counts[thirdId] - 1,
      };
      for (const rest of findMelds(nextCounts)) {
        results.push([{ type: "chow", tiles: [firstTileId, secondId, thirdId] }, ...rest]);
      }
    }
  }

  return results;
}

function scoreArrangement(tileIds, arrangement, options, rules) {
  const fanItems = [];
  const groups = arrangement.groups;
  const melds = groups.filter((group) => group.type !== "pair");
  const chows = groups.filter((group) => group.type === "chow");
  const pungs = groups.filter((group) => group.type === "pung");
  const pair = groups.find((group) => group.type === "pair");
  const suits = new Set(tileIds.map((tileId) => TILE_BY_ID[tileId].suit).filter((suit) => ["dot", "bam", "char"].includes(suit)));
  const hasHonors = tileIds.some((tileId) => ["wind", "dragon"].includes(TILE_BY_ID[tileId].suit));

  if (arrangement.kind === "thirteenOrphans") {
    addFan(fanItems, rules, FAN_KEYS.thirteenOrphans);
  }

  if (arrangement.kind === "nineGates") {
    addFan(fanItems, rules, FAN_KEYS.nineGates);
  }

  if (arrangement.kind === "sevenPairs") {
    addFan(fanItems, rules, FAN_KEYS.sevenPairs);
  }

  if (arrangement.kind === "standard" && melds.length === 4 && melds.every((group) => group.type === "chow")) {
    addFan(fanItems, rules, FAN_KEYS.allChows);
  }

  if (arrangement.kind === "standard" && pungs.length === 4) {
    addFan(fanItems, rules, FAN_KEYS.allPungs);
  }

  if (tileIds.every(isSimpleTile)) {
    addFan(fanItems, rules, FAN_KEYS.allSimples);
  }

  if (hasPureStraight(chows)) {
    addFan(fanItems, rules, FAN_KEYS.pureStraight);
  }

  if (hasMixedStraight(chows)) {
    addFan(fanItems, rules, FAN_KEYS.mixedStraight);
  }

  if (countConcealedPungs(pungs, options) >= 3) {
    addFan(fanItems, rules, FAN_KEYS.threeConcealedPungs);
  }

  if (countConcealedPungs(pungs, options) >= 4) {
    addFan(fanItems, rules, FAN_KEYS.fourConcealedPungs);
  }

  if (suits.size === 1 && !hasHonors) {
    addFan(fanItems, rules, FAN_KEYS.fullFlush);
  } else if (suits.size === 1 && hasHonors) {
    addFan(fanItems, rules, FAN_KEYS.halfFlush);
  } else if (suits.size === 2) {
    addFan(fanItems, rules, FAN_KEYS.voidedSuit);
  }

  for (const pung of pungs) {
    const tile = TILE_BY_ID[pung.tiles[0]];
    if (tile.suit === "dragon") {
      addFan(fanItems, rules, FAN_KEYS.dragonPung, { name: `${capitalize(tile.rank)} Dragon Pung` });
    }
    if (tile.suit === "wind" && tile.rank === options.seatWind) {
      addFan(fanItems, rules, FAN_KEYS.seatWindPung, { description: `Pung of ${capitalize(options.seatWind)} wind.` });
    }
    if (tile.suit === "wind" && tile.rank === options.roundWind) {
      addFan(fanItems, rules, FAN_KEYS.roundWindPung, { description: `Pung of ${capitalize(options.roundWind)} wind.` });
    }
  }

  addDragonPatternFan(fanItems, rules, pungs, pair);
  addWindPatternFan(fanItems, rules, pungs, pair);
  addLimitPatterns(fanItems, rules, tileIds);

  if (options.selfDraw) addFan(fanItems, rules, FAN_KEYS.selfDraw);
  if (options.concealed) addFan(fanItems, rules, FAN_KEYS.concealedHand);
  if (options.selfDraw && options.concealed) {
    addFan(fanItems, rules, FAN_KEYS.fullyConcealedHand);
  }

  const rawFan = fanItems.reduce((sum, item) => sum + item.fan, 0);
  const isLimit = fanItems.some((item) => item.limit) || rawFan >= rules.fanCap;
  return {
    totalFan: Math.min(rawFan, rules.fanCap),
    rawFan,
    isLimit,
    arrangement,
    fanItems,
  };
}

function addDragonPatternFan(fanItems, rules, pungs, pair) {
  const dragonPungs = new Set(
    pungs
      .map((group) => TILE_BY_ID[group.tiles[0]])
      .filter((tile) => tile.suit === "dragon")
      .map((tile) => tile.rank)
  );
  const pairTile = pair ? TILE_BY_ID[pair.tiles[0]] : null;
  if (dragonPungs.size === 3) {
    addFan(fanItems, rules, FAN_KEYS.bigThreeDragons);
  } else if (dragonPungs.size === 2 && pairTile?.suit === "dragon") {
    addFan(fanItems, rules, FAN_KEYS.smallThreeDragons);
  }
}

function addWindPatternFan(fanItems, rules, pungs, pair) {
  const windPungs = new Set(
    pungs
      .map((group) => TILE_BY_ID[group.tiles[0]])
      .filter((tile) => tile.suit === "wind")
      .map((tile) => tile.rank)
  );
  const pairTile = pair ? TILE_BY_ID[pair.tiles[0]] : null;
  if (windPungs.size === 4) {
    addFan(fanItems, rules, FAN_KEYS.bigFourWinds);
  } else if (windPungs.size === 3 && pairTile?.suit === "wind") {
    addFan(fanItems, rules, FAN_KEYS.smallFourWinds);
  }
}

function addLimitPatterns(fanItems, rules, tileIds) {
  const allHonors = tileIds.every((tileId) => ["wind", "dragon"].includes(TILE_BY_ID[tileId].suit));
  if (allHonors) {
    addFan(fanItems, rules, FAN_KEYS.allHonors);
  }

  const allTerminals = tileIds.every((tileId) => isTerminalTile(tileId));
  if (allTerminals) {
    addFan(fanItems, rules, FAN_KEYS.allTerminals);
  }

  const terminalOrHonor = tileIds.every((tileId) => {
    const tile = TILE_BY_ID[tileId];
    return ["wind", "dragon"].includes(tile.suit) || tile.rank === 1 || tile.rank === 9;
  });
  if (terminalOrHonor) {
    addFan(fanItems, rules, FAN_KEYS.terminalsAndHonors);
  }
}

const THIRTEEN_ORPHANS_IDS = [
  "dot-1", "dot-9",
  "bam-1", "bam-9",
  "char-1", "char-9",
  "wind-east", "wind-south", "wind-west", "wind-north",
  "dragon-red", "dragon-green", "dragon-white",
];

function isThirteenOrphans(counts) {
  const tileIds = Object.keys(counts);
  if (tileIds.length !== 13) return false;
  return THIRTEEN_ORPHANS_IDS.every((tileId) => counts[tileId] >= 1)
    && THIRTEEN_ORPHANS_IDS.some((tileId) => counts[tileId] === 2)
    && Object.entries(counts).every(([tileId, count]) => THIRTEEN_ORPHANS_IDS.includes(tileId) && (count === 1 || count === 2));
}

function isNineGates(counts) {
  const tileIds = Object.keys(counts);
  const suits = new Set(tileIds.map((tileId) => TILE_BY_ID[tileId].suit));
  if (suits.size !== 1) return false;

  const [suit] = suits;
  if (!["dot", "bam", "char"].includes(suit)) return false;

  const requiredCounts = { 1: 3, 9: 3 };
  for (let rank = 2; rank <= 8; rank += 1) {
    requiredCounts[rank] = 1;
  }

  let extraTiles = 0;
  for (let rank = 1; rank <= 9; rank += 1) {
    const count = counts[`${suit}-${rank}`] || 0;
    if (count < requiredCounts[rank]) return false;
    extraTiles += count - requiredCounts[rank];
  }

  return extraTiles === 1 && tileIds.every((tileId) => TILE_BY_ID[tileId].suit === suit);
}

function isSimpleTile(tileId) {
  const tile = TILE_BY_ID[tileId];
  return ["dot", "bam", "char"].includes(tile.suit) && tile.rank >= 2 && tile.rank <= 8;
}

function isTerminalTile(tileId) {
  const tile = TILE_BY_ID[tileId];
  return ["dot", "bam", "char"].includes(tile.suit) && (tile.rank === 1 || tile.rank === 9);
}

function hasPureStraight(chows) {
  return ["dot", "bam", "char"].some((suit) => {
    const starts = new Set(chows
      .map(getChowDescriptor)
      .filter((chow) => chow.suit === suit)
      .map((chow) => chow.start));
    return starts.has(1) && starts.has(4) && starts.has(7);
  });
}

function hasMixedStraight(chows) {
  const descriptors = chows.map(getChowDescriptor);
  return ["dot", "bam", "char"].some((suit123) => (
    ["dot", "bam", "char"].some((suit456) => (
      suit456 !== suit123
        && ["dot", "bam", "char"].some((suit789) => (
          suit789 !== suit123
            && suit789 !== suit456
            && descriptors.some((chow) => chow.suit === suit123 && chow.start === 1)
            && descriptors.some((chow) => chow.suit === suit456 && chow.start === 4)
            && descriptors.some((chow) => chow.suit === suit789 && chow.start === 7)
        ))
    ))
  ));
}

function getChowDescriptor(chow) {
  const tiles = chow.tiles.map((tileId) => TILE_BY_ID[tileId]);
  return {
    suit: tiles[0].suit,
    start: Math.min(...tiles.map((tile) => tile.rank)),
  };
}

function countConcealedPungs(pungs, options) {
  return pungs.filter((pung) => {
    const declaredMeld = options.melds?.find((meld) => isSamePungMeld(meld, pung));
    if (!declaredMeld && options.winType === "discard" && pung.tiles.includes(options.winningTile)) {
      return false;
    }
    if (declaredMeld) return declaredMeld.exposed !== true;
    return options.concealed;
  }).length;
}

function isSamePungMeld(meld, pung) {
  if (!["pung", "kong"].includes(meld.type)) return false;
  return Array.isArray(meld.tiles)
    && meld.tiles.every((tileId) => tileId === pung.tiles[0])
    && pung.tiles.every((tileId) => tileId === meld.tiles[0]);
}

function addFan(fanItems, rules, key, overrides = {}) {
  const fanConfig = rules.fans[key];
  if (!fanConfig?.enabled) return;
  fanItems.push({
    name: overrides.name || fanConfig.name,
    fan: fanConfig.fan,
    description: overrides.description || fanConfig.description,
    limit: fanConfig.limit === true,
  });
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
