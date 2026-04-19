import { TILES, TILE_BY_ID, getCounts } from "./tiles.js";

const DEFAULT_FAN_CAP = 10;
const DEFAULT_MINIMUM_FAN = 3;

export function scoreHand(tileIds, options) {
  const rules = normalizeRules(options);

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
  const meetsMinimum = !rules.minimumFanEnabled || best.rawFan >= DEFAULT_MINIMUM_FAN;
  return {
    ...best,
    isValid: true,
    meetsMinimum,
    message: rules.minimumFanEnabled
      ? (meetsMinimum
        ? `Valid winning hand. Meets the ${DEFAULT_MINIMUM_FAN} fan minimum.`
        : `Valid shape, but below the ${DEFAULT_MINIMUM_FAN} fan minimum for this ruleset.`)
      : "Valid winning hand. The 3 fan minimum is turned off.",
    feedback: rules.minimumFanEnabled && !meetsMinimum
      ? ["Some tables would not allow this win unless it reaches the minimum. Turn off the minimum only if your table uses that house rule."]
      : [],
  };
}

function normalizeRules(options = {}) {
  const fanCap = Number.parseInt(options.fanCap, 10);
  return {
    fanCap: Number.isFinite(fanCap) && fanCap > 0 ? fanCap : DEFAULT_FAN_CAP,
    minimumFanEnabled: options.minimumFanEnabled !== false,
  };
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
  const pungs = groups.filter((group) => group.type === "pung");
  const pair = groups.find((group) => group.type === "pair");
  const suits = new Set(tileIds.map((tileId) => TILE_BY_ID[tileId].suit).filter((suit) => ["dot", "bam", "char"].includes(suit)));
  const hasHonors = tileIds.some((tileId) => ["wind", "dragon"].includes(TILE_BY_ID[tileId].suit));

  if (arrangement.kind === "sevenPairs") {
    addFan(fanItems, "Seven Pairs", 4, "Seven distinct pairs.");
  }

  if (arrangement.kind === "standard" && melds.length === 4 && melds.every((group) => group.type === "chow")) {
    addFan(fanItems, "All Chows", 1, "Four chows with a pair.");
  }

  if (arrangement.kind === "standard" && pungs.length === 4) {
    addFan(fanItems, "All Pungs", 3, "Four pungs or kong-equivalent sets plus a pair.");
  }

  if (suits.size === 1 && !hasHonors) {
    addFan(fanItems, "Full Flush", 7, "All tiles are from one suit.");
  } else if (suits.size === 1 && hasHonors) {
    addFan(fanItems, "Half Flush", 3, "One suit mixed with honor tiles.");
  } else if (suits.size === 2) {
    addFan(fanItems, "Voided Suit", 2, "One numbered suit is absent.");
  }

  for (const pung of pungs) {
    const tile = TILE_BY_ID[pung.tiles[0]];
    if (tile.suit === "dragon") {
      addFan(fanItems, `${capitalize(tile.rank)} Dragon Pung`, 1, "Pung of dragons.");
    }
    if (tile.suit === "wind" && tile.rank === options.seatWind) {
      addFan(fanItems, "Seat Wind Pung", 1, `Pung of ${capitalize(options.seatWind)} wind.`);
    }
    if (tile.suit === "wind" && tile.rank === options.roundWind) {
      addFan(fanItems, "Round Wind Pung", 1, `Pung of ${capitalize(options.roundWind)} wind.`);
    }
  }

  addDragonPatternFan(fanItems, pungs, pair);
  addWindPatternFan(fanItems, pungs, pair);
  addLimitPatterns(fanItems, tileIds);

  if (options.selfDraw) addFan(fanItems, "Self-Draw", 1, "Winning tile drawn from the wall.");
  if (options.concealed) addFan(fanItems, "Concealed Hand", 1, "No exposed calls marked for this hand.");

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

function addDragonPatternFan(fanItems, pungs, pair) {
  const dragonPungs = new Set(
    pungs
      .map((group) => TILE_BY_ID[group.tiles[0]])
      .filter((tile) => tile.suit === "dragon")
      .map((tile) => tile.rank)
  );
  const pairTile = pair ? TILE_BY_ID[pair.tiles[0]] : null;
  if (dragonPungs.size === 3) {
    addFan(fanItems, "Big Three Dragons", 8, "Pungs of all three dragons.", true);
  } else if (dragonPungs.size === 2 && pairTile?.suit === "dragon") {
    addFan(fanItems, "Small Three Dragons", 5, "Two dragon pungs and a pair of the third dragon.");
  }
}

function addWindPatternFan(fanItems, pungs, pair) {
  const windPungs = new Set(
    pungs
      .map((group) => TILE_BY_ID[group.tiles[0]])
      .filter((tile) => tile.suit === "wind")
      .map((tile) => tile.rank)
  );
  const pairTile = pair ? TILE_BY_ID[pair.tiles[0]] : null;
  if (windPungs.size === 4) {
    addFan(fanItems, "Big Four Winds", 10, "Pungs of all four winds.", true);
  } else if (windPungs.size === 3 && pairTile?.suit === "wind") {
    addFan(fanItems, "Small Four Winds", 8, "Three wind pungs and a pair of the fourth wind.", true);
  }
}

function addLimitPatterns(fanItems, tileIds) {
  const allHonors = tileIds.every((tileId) => ["wind", "dragon"].includes(TILE_BY_ID[tileId].suit));
  if (allHonors) {
    addFan(fanItems, "All Honors", 10, "Every tile is a wind or dragon.", true);
  }

  const terminalOrHonor = tileIds.every((tileId) => {
    const tile = TILE_BY_ID[tileId];
    return ["wind", "dragon"].includes(tile.suit) || tile.rank === 1 || tile.rank === 9;
  });
  if (terminalOrHonor) {
    addFan(fanItems, "Terminals and Honors", 10, "Every tile is a terminal or honor.", true);
  }
}

function addFan(fanItems, name, fan, description, limit = false) {
  fanItems.push({ name, fan, description, limit });
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
