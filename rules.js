export const DEFAULT_RULESET_ID = "hk";

export const FAN_KEYS = {
  thirteenOrphans: "thirteenOrphans",
  nineGates: "nineGates",
  sevenPairs: "sevenPairs",
  allChows: "allChows",
  allPungs: "allPungs",
  allSimples: "allSimples",
  pureStraight: "pureStraight",
  mixedStraight: "mixedStraight",
  threeConcealedPungs: "threeConcealedPungs",
  fourConcealedPungs: "fourConcealedPungs",
  fullFlush: "fullFlush",
  halfFlush: "halfFlush",
  voidedSuit: "voidedSuit",
  dragonPung: "dragonPung",
  seatWindPung: "seatWindPung",
  roundWindPung: "roundWindPung",
  bigThreeDragons: "bigThreeDragons",
  smallThreeDragons: "smallThreeDragons",
  bigFourWinds: "bigFourWinds",
  smallFourWinds: "smallFourWinds",
  allHonors: "allHonors",
  allTerminals: "allTerminals",
  terminalsAndHonors: "terminalsAndHonors",
  selfDraw: "selfDraw",
  concealedHand: "concealedHand",
  fullyConcealedHand: "fullyConcealedHand",
  prettyFlowers: "prettyFlowers",
};

const HK_DEFAULT_RULESET = {
  id: DEFAULT_RULESET_ID,
  name: "Hong Kong default",
  fanCap: 10,
  minimumFan: {
    enabled: true,
    value: 3,
  },
  fans: {
    [FAN_KEYS.thirteenOrphans]: {
      enabled: true,
      fan: 10,
      name: "Thirteen Orphans",
      description: "One of each terminal and honor tile, plus one duplicate.",
      limit: true,
    },
    [FAN_KEYS.nineGates]: {
      enabled: true,
      fan: 10,
      name: "Nine Gates",
      description: "1112345678999 plus any extra tile in the same suit.",
      limit: true,
    },
    [FAN_KEYS.sevenPairs]: {
      enabled: true,
      fan: 4,
      name: "Seven Pairs",
      description: "Seven distinct pairs.",
      limit: false,
    },
    [FAN_KEYS.allChows]: {
      enabled: true,
      fan: 1,
      name: "All Chows",
      description: "Four chows with a pair.",
      limit: false,
    },
    [FAN_KEYS.allPungs]: {
      enabled: true,
      fan: 3,
      name: "All Pungs",
      description: "Four pungs or kong-equivalent sets plus a pair.",
      limit: false,
    },
    [FAN_KEYS.allSimples]: {
      enabled: true,
      fan: 1,
      name: "All Simples",
      description: "Every tile is a suited tile from 2 through 8.",
      limit: false,
    },
    [FAN_KEYS.pureStraight]: {
      enabled: true,
      fan: 1,
      name: "Pure Straight",
      description: "Chows of 1-2-3, 4-5-6, and 7-8-9 in one suit.",
      limit: false,
    },
    [FAN_KEYS.mixedStraight]: {
      enabled: true,
      fan: 1,
      name: "Mixed Straight",
      description: "Chows of 1-2-3, 4-5-6, and 7-8-9 across all three suits.",
      limit: false,
    },
    [FAN_KEYS.threeConcealedPungs]: {
      enabled: true,
      fan: 2,
      name: "Three Concealed Pungs",
      description: "Three pungs marked as concealed.",
      limit: false,
    },
    [FAN_KEYS.fourConcealedPungs]: {
      enabled: true,
      fan: 10,
      name: "Four Concealed Pungs",
      description: "Four concealed pungs or kong-equivalent sets.",
      limit: true,
    },
    [FAN_KEYS.fullFlush]: {
      enabled: true,
      fan: 7,
      name: "Full Flush",
      description: "All tiles are from one suit.",
      limit: false,
    },
    [FAN_KEYS.halfFlush]: {
      enabled: true,
      fan: 3,
      name: "Half Flush",
      description: "One suit mixed with honor tiles.",
      limit: false,
    },
    [FAN_KEYS.voidedSuit]: {
      enabled: true,
      fan: 2,
      name: "Voided Suit",
      description: "One numbered suit is absent.",
      limit: false,
    },
    [FAN_KEYS.dragonPung]: {
      enabled: true,
      fan: 1,
      name: "Dragon Pung",
      description: "Pung of dragons.",
      limit: false,
    },
    [FAN_KEYS.seatWindPung]: {
      enabled: true,
      fan: 1,
      name: "Seat Wind Pung",
      description: "Pung of the player's seat wind.",
      limit: false,
    },
    [FAN_KEYS.roundWindPung]: {
      enabled: true,
      fan: 1,
      name: "Round Wind Pung",
      description: "Pung of the current round wind.",
      limit: false,
    },
    [FAN_KEYS.bigThreeDragons]: {
      enabled: true,
      fan: 8,
      name: "Big Three Dragons",
      description: "Pungs of all three dragons.",
      limit: true,
    },
    [FAN_KEYS.smallThreeDragons]: {
      enabled: true,
      fan: 5,
      name: "Small Three Dragons",
      description: "Two dragon pungs and a pair of the third dragon.",
      limit: false,
    },
    [FAN_KEYS.bigFourWinds]: {
      enabled: true,
      fan: 10,
      name: "Big Four Winds",
      description: "Pungs of all four winds.",
      limit: true,
    },
    [FAN_KEYS.smallFourWinds]: {
      enabled: true,
      fan: 8,
      name: "Small Four Winds",
      description: "Three wind pungs and a pair of the fourth wind.",
      limit: true,
    },
    [FAN_KEYS.allHonors]: {
      enabled: true,
      fan: 10,
      name: "All Honors",
      description: "Every tile is a wind or dragon.",
      limit: true,
    },
    [FAN_KEYS.allTerminals]: {
      enabled: true,
      fan: 10,
      name: "All Terminals",
      description: "Every tile is a suited 1 or 9.",
      limit: true,
    },
    [FAN_KEYS.terminalsAndHonors]: {
      enabled: true,
      fan: 10,
      name: "Terminals and Honors",
      description: "Every tile is a terminal or honor.",
      limit: true,
    },
    [FAN_KEYS.selfDraw]: {
      enabled: true,
      fan: 1,
      name: "Self-Draw",
      description: "Winning tile drawn from the wall.",
      limit: false,
    },
    [FAN_KEYS.concealedHand]: {
      enabled: true,
      fan: 1,
      name: "Concealed Hand",
      description: "No exposed calls marked for this hand.",
      limit: false,
    },
    [FAN_KEYS.fullyConcealedHand]: {
      enabled: true,
      fan: 1,
      name: "Fully Concealed Hand",
      description: "No exposed calls and the winning tile was self-drawn.",
      limit: false,
    },
    [FAN_KEYS.prettyFlowers]: {
      enabled: true,
      fan: 1,
      name: "Pretty / Flower Tiles",
      description: "Bonus tiles kept outside the 14-tile winning hand.",
      limit: false,
    },
  },
};

export const RULESET_PRESETS = {
  [DEFAULT_RULESET_ID]: HK_DEFAULT_RULESET,
  custom: {
    ...cloneRuleset(HK_DEFAULT_RULESET),
    id: "custom",
    name: "Custom",
  },
};

export function getRuleset(preset = DEFAULT_RULESET_ID) {
  return cloneRuleset(RULESET_PRESETS[preset] || RULESET_PRESETS[DEFAULT_RULESET_ID]);
}

export function createRuleset(overrides = {}) {
  const base = getRuleset(overrides.preset || overrides.id || DEFAULT_RULESET_ID);
  return mergeRulesets(base, overrides);
}

function mergeRulesets(base, overrides) {
  const merged = {
    ...base,
    ...overrides,
    minimumFan: {
      ...base.minimumFan,
      ...overrides.minimumFan,
    },
    fans: {
      ...base.fans,
    },
  };

  if (overrides.fans) {
    for (const [key, fanConfig] of Object.entries(overrides.fans)) {
      merged.fans[key] = {
        ...base.fans[key],
        ...fanConfig,
      };
    }
  }

  return merged;
}

function cloneRuleset(ruleset) {
  return JSON.parse(JSON.stringify(ruleset));
}
