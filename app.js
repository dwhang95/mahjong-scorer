import { EXAMPLES } from "./examples.js";
import { createManualTileInput } from "./recognition.js";
import { createRuleset } from "./rules.js";
import { scoreHand } from "./scoring.js";
import { TILE_GROUPS, TILE_BY_ID, WINDS, getCounts } from "./tiles.js";

let activeSeat = "east";
let tableHands = Object.fromEntries(WINDS.map((seat) => [seat, []]));
let playerNames = Object.fromEntries(WINDS.map((seat) => [seat, capitalize(seat)]));
let prettyFlowerCounts = Object.fromEntries(WINDS.map((seat) => [seat, 0]));
let meldExposureBySeat = Object.fromEntries(WINDS.map((seat) => [seat, {}]));
let currentMeldGroups = [];

const elements = {
  clearHand: document.querySelector("#clearHand"),
  undoTile: document.querySelector("#undoTile"),
  selectedTiles: document.querySelector("#selectedTiles"),
  tileCount: document.querySelector("#tileCount"),
  tileGroups: document.querySelector("#tileGroups"),
  examples: document.querySelector("#examples"),
  handTitle: document.querySelector("#handTitle"),
  tablePanel: document.querySelector(".table-panel"),
  toggleTableCompact: document.querySelector("#toggleTableCompact"),
  seatWind: document.querySelector("#seatWind"),
  roundWind: document.querySelector("#roundWind"),
  winType: document.querySelector("#winType"),
  selfDraw: document.querySelector("#selfDraw"),
  concealed: document.querySelector("#concealed"),
  minimumFanEnabled: document.querySelector("#minimumFanEnabled"),
  fanCap: document.querySelector("#fanCap"),
  rulesTabs: document.querySelectorAll("[data-rules-tab]"),
  rulesPanels: document.querySelectorAll("[data-rules-panel]"),
  rulesSummaryPanel: document.querySelector("#rulesSummaryPanel"),
  winnerSeat: document.querySelector("#winnerSeat"),
  discarderSeat: document.querySelector("#discarderSeat"),
  basePointUnit: document.querySelector("#basePointUnit"),
  commonTable: document.querySelector("#commonTable"),
  tableNet: document.querySelector("#tableNet"),
  fanTotal: document.querySelector("#fanTotal"),
  limitBadge: document.querySelector("#limitBadge"),
  scoreStatus: document.querySelector("#scoreStatus"),
  assumptionsList: document.querySelector("#assumptionsList"),
  meldBreakdown: document.querySelector("#meldBreakdown"),
  fanBreakdown: document.querySelector("#fanBreakdown"),
};

function addTile(tileId) {
  const tileIds = getActiveTileIds();
  const counts = getCounts(tileIds);
  if (tileIds.length >= getSeatTarget(activeSeat) || counts[tileId] >= 4) return;
  tableHands = {
    ...tableHands,
    [activeSeat]: [...tileIds, tileId],
  };
  pruneMeldExposure(activeSeat);
  render();
}

function removeTile(index) {
  const tileIds = getActiveTileIds();
  if (index < 0 || index >= tileIds.length) return;
  tableHands = {
    ...tableHands,
    [activeSeat]: tileIds.filter((_, tileIndex) => tileIndex !== index),
  };
  pruneMeldExposure(activeSeat);
  render();
}

function undoLastTile() {
  const tileIds = getActiveTileIds();
  if (!tileIds.length) return;
  tableHands = {
    ...tableHands,
    [activeSeat]: tileIds.slice(0, -1),
  };
  pruneMeldExposure(activeSeat);
  render();
}

function renderTilePicker() {
  elements.tileGroups.innerHTML = TILE_GROUPS.map((group) => `
    <div class="tile-group">
      <h3>${group.label}</h3>
      <div class="tile-row">
        ${group.tiles.map((tile) => `
          <button class="tile-button tile tile--${tile.suit}" type="button" data-tile-id="${tile.id}" title="${tile.label}" aria-label="Add ${tile.label}">
            ${renderTileFace(tile)}
          </button>
        `).join("")}
      </div>
    </div>
  `).join("");

  elements.tileGroups.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tile-id]");
    if (!button) return;
    addTile(button.dataset.tileId);
  });
}

function renderWindSelects() {
  const options = WINDS.map((wind) => `<option value="${wind}">${capitalize(wind)}</option>`).join("");
  elements.seatWind.innerHTML = options;
  elements.roundWind.innerHTML = options;
  elements.winnerSeat.innerHTML = options;
  elements.discarderSeat.innerHTML = options;
  elements.winnerSeat.value = elements.seatWind.value;
  elements.discarderSeat.value = getNextSeat(elements.winnerSeat.value);
}

function renderExamples() {
  elements.examples.innerHTML = EXAMPLES.map((example, index) => `
    <button class="example-button" type="button" data-example-index="${index}">
      <strong>${example.name}</strong>
      <span>${example.note}</span>
    </button>
  `).join("");

  elements.examples.addEventListener("click", (event) => {
    const button = event.target.closest("[data-example-index]");
    if (!button) return;
    const example = EXAMPLES[Number(button.dataset.exampleIndex)];
    tableHands = {
      ...tableHands,
      [activeSeat]: [...example.tiles],
    };
    meldExposureBySeat = {
      ...meldExposureBySeat,
      [activeSeat]: {},
    };
    setWinType(example.options.winType || (example.options.selfDraw ? "self_draw" : "discard"));
    elements.concealed.checked = example.options.concealed;
    elements.seatWind.value = example.options.seatWind;
    elements.winnerSeat.value = activeSeat;
    if (elements.discarderSeat.value === elements.winnerSeat.value) {
      elements.discarderSeat.value = getNextSeat(elements.winnerSeat.value);
    }
    elements.roundWind.value = example.options.roundWind;
    render();
  });
}

function render() {
  const activeTileIds = getActiveTileIds();
  const counts = getCounts(activeTileIds);
  const scoreResult = scoreHand(getScoreInput(), getWinOptions());
  elements.handTitle.textContent = `${getPlayerName(activeSeat)}'s hand`;
  elements.tileCount.textContent = `${activeTileIds.length} / ${getSeatTarget(activeSeat)}`;
  elements.undoTile.disabled = activeTileIds.length === 0;
  elements.selectedTiles.innerHTML = activeTileIds.length
    ? activeTileIds.map((tileId, index) => {
        const tile = TILE_BY_ID[tileId];
        const occurrence = activeTileIds.slice(0, index + 1).filter((id) => id === tileId).length;
        return `
          <button class="selected-tile tile tile--${tile.suit}" type="button" data-remove-index="${index}" data-count="${occurrence}" title="Remove ${tile.label}" aria-label="Remove ${tile.label}">
            ${renderTileFace(tile)}
          </button>
        `;
      }).join("")
    : `<p class="empty-hand">No tiles selected.</p>`;

  document.querySelectorAll(".tile-button").forEach((button) => {
    button.disabled = activeTileIds.length >= getSeatTarget(activeSeat) || counts[button.dataset.tileId] >= 4;
  });

  renderRulesSummary();
  renderCommonTable(scoreResult);
  renderScore(scoreResult);
}

function getWinOptions() {
  const winType = getWinType();
  return {
    seatWind: elements.seatWind.value,
    roundWind: elements.roundWind.value,
    winType,
    selfDraw: winType === "self_draw",
    winningTile: winType === "discard" ? getAssumedWinningTile(getWinnerTileIds()) : null,
    concealed: elements.concealed.checked,
    flowerCount: getSeatPrettyFlowerCount(elements.winnerSeat.value),
    minimumFanEnabled: elements.minimumFanEnabled.checked,
    fanCap: elements.fanCap.value,
    melds: getSubmittedMelds(),
  };
}

function getScoreInput() {
  const tiles = getWinnerTileIds();
  const options = getWinOptions();
  if (!options.melds.length) return tiles;

  return {
    tiles,
    seatWind: options.seatWind,
    roundWind: options.roundWind,
    winType: options.winType,
    winningTile: options.winType === "discard" ? getAssumedWinningTile(tiles) : null,
    flowerCount: options.flowerCount,
    melds: options.melds,
  };
}

function renderScore(result) {
  currentMeldGroups = result.arrangement?.groups.filter((group) => group.type !== "pair" && group.type !== "single") || [];
  elements.fanTotal.textContent = result.totalFan;
  elements.limitBadge.hidden = !result.isLimit;
  elements.scoreStatus.innerHTML = `
    <strong>${result.message}</strong>
    ${result.feedback?.length ? `<ul>${result.feedback.map((item) => `<li>${item}</li>`).join("")}</ul>` : ""}
  `;
  elements.scoreStatus.classList.toggle("error", (!result.isValid && getWinnerTileIds().length === 14) || result.meetsMinimum === false);
  elements.assumptionsList.innerHTML = renderAssumptions();

  elements.meldBreakdown.innerHTML = result.arrangement
    ? `
      <h3>Hand structure</h3>
      <div class="breakdown-list">
        ${result.arrangement.groups.map(renderMeld).join("")}
      </div>
    `
    : "";

  elements.fanBreakdown.innerHTML = result.fanItems.length
    ? `
      <h3>Fan breakdown</h3>
      <ul class="breakdown-list">
        ${result.fanItems.map((item) => `
          <li>
            <div>
              <strong>${item.name}</strong>
              <span>${item.description}</span>
            </div>
            <strong>${item.fan}</strong>
          </li>
        `).join("")}
      </ul>
    `
    : "";

  renderTableNet(result);
}

function renderAssumptions() {
  const options = getWinOptions();
  const fanCap = normalizeFanCap(options.fanCap);
  return [
    "Shared table is local to this browser session; it does not sync across devices.",
    `${getPlayerName(elements.winnerSeat.value)}'s hand is used for scoring and settlement.`,
    "Winner submits 14 tiles. Every non-winner submits 13 tiles.",
    "Hong Kong / Cantonese-style fan patterns supported by this app.",
    options.minimumFanEnabled ? "3 fan minimum is required." : "3 fan minimum is not required.",
    `Fan total is capped at ${fanCap}.`,
    `Seat wind: ${capitalize(options.seatWind)}. Round wind: ${capitalize(options.roundWind)}.`,
    options.winType === "self_draw" ? "Win type: self draw." : "Win type: discard.",
    options.winType === "discard" ? "Discard winning tile is assumed to be the last selected tile." : null,
    options.concealed ? "Concealed hand is counted." : "Concealed hand is not counted.",
    options.flowerCount > 0 ? `${getPlayerName(elements.winnerSeat.value)} has ${options.flowerCount} pretty/flower bonus tile${options.flowerCount === 1 ? "" : "s"} counted.` : `${getPlayerName(elements.winnerSeat.value)} has no pretty/flower bonus tiles counted.`,
    `Table net uses ${getBasePointUnit()} base point${getBasePointUnit() === 1 ? "" : "s"} x 2^fan.`,
    options.winType === "self_draw" ? "Self draw: all three other seats pay the winner." : "Discard: only the discarder pays the winner.",
    hasMeldExposureOverrides()
      ? `${getExposedMeldCount()} exposed meld${getExposedMeldCount() === 1 ? "" : "s"} marked.`
      : "No meld exposure overrides are marked.",
  ].filter(Boolean).map((item) => `<li>${item}</li>`).join("");
}

function renderRulesSummary() {
  const rules = getActiveRuleset();
  const enabledFans = Object.values(rules.fans).filter((fan) => fan.enabled !== false);
  const disabledFans = Object.values(rules.fans).filter((fan) => fan.enabled === false);
  const limitFans = enabledFans.filter((fan) => fan.limit);
  const regularFans = enabledFans.filter((fan) => !fan.limit);

  elements.rulesSummaryPanel.innerHTML = `
    <div class="rules-summary">
      <dl class="rules-stats">
        <div>
          <dt>Preset</dt>
          <dd>${rules.name}</dd>
        </div>
        <div>
          <dt>Minimum</dt>
          <dd>${rules.minimumFan.enabled ? `${rules.minimumFan.value} fan` : "Off"}</dd>
        </div>
        <div>
          <dt>Cap</dt>
          <dd>${rules.fanCap} fan</dd>
        </div>
        <div>
          <dt>Enabled</dt>
          <dd>${enabledFans.length}</dd>
        </div>
      </dl>
      ${renderRuleGroup("Limit patterns", limitFans)}
      ${renderRuleGroup("Regular patterns", regularFans)}
      ${disabledFans.length ? renderRuleGroup("Disabled patterns", disabledFans) : ""}
    </div>
  `;
}

function renderRuleGroup(title, fans) {
  return `
    <section class="rule-group" aria-label="${title}">
      <h3>${title}</h3>
      <div class="rule-list">
        ${fans.map((fan) => `
          <article class="rule-row">
            <div>
              <strong>${fan.name || "Pattern"}</strong>
              <span>${fan.description || "House rule pattern."}</span>
            </div>
            <output>${fan.fan}</output>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function getActiveRuleset() {
  return createRuleset({
    preset: "hk",
    fanCap: normalizeFanCap(elements.fanCap.value),
    minimumFan: {
      enabled: elements.minimumFanEnabled.checked,
    },
  });
}

function renderTableNet(result) {
  const settlement = getSettlement(result);
  elements.tableNet.innerHTML = WINDS.map((seat) => {
    const delta = settlement.deltas[seat] || 0;
    const role = getSeatRole(seat, settlement);
    const deltaClass = delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral";
    return `
      <article class="seat-card ${role.className}">
        <div>
          <span class="seat-wind">${capitalize(seat)}</span>
          <strong>${getPlayerName(seat)} · ${role.label}</strong>
        </div>
        <output class="net-points ${deltaClass}">${formatSignedNumber(delta)}</output>
      </article>
    `;
  }).join("");
}

function renderCommonTable(result) {
  const settlement = getSettlement(result);
  const seatMarkup = WINDS.map((seat) => {
    const tileCount = getSeatTileIds(seat).length;
    const target = getSeatTarget(seat);
    const delta = settlement.deltas[seat] || 0;
    const deltaClass = delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral";
    const isActive = seat === activeSeat;
    const isWinner = seat === elements.winnerSeat.value;
    return `
      <article class="table-seat table-seat--${seat} ${isActive ? "is-active" : ""} ${isWinner ? "is-winner" : ""}" data-seat="${seat}">
        <div class="table-seat__top">
          <div>
            <span class="seat-wind">${capitalize(seat)}</span>
            <strong>${getTableSeatRole(seat)}</strong>
          </div>
          <span class="seat-count ${getSeatCountClass(tileCount, target)}">${tileCount}/${target}</span>
        </div>
        <label>
          <span>Player</span>
          <input type="text" value="${escapeAttribute(getPlayerName(seat))}" data-player-name="${seat}" maxlength="24" aria-label="${capitalize(seat)} player name">
        </label>
        <label>
          <span>Pretty / flowers</span>
          <input type="number" min="0" max="8" step="1" value="${getSeatPrettyFlowerCount(seat)}" data-pretty-flower-count="${seat}" aria-label="${capitalize(seat)} pretty and flower tile count">
        </label>
        <div class="table-seat__tiles" aria-label="${capitalize(seat)} hand preview">
          ${renderSeatPreview(seat)}
        </div>
        <output class="table-seat__net net-points ${deltaClass}">${formatSignedNumber(delta)}</output>
        <div class="table-seat__actions">
          <button class="seat-action" type="button" data-edit-seat="${seat}">${isActive ? "Editing" : "Edit hand"}</button>
          <button class="seat-action" type="button" data-winner-seat="${seat}">${isWinner ? "Winner" : "Set winner"}</button>
        </div>
      </article>
    `;
  }).join("");

  elements.commonTable.innerHTML = `
    <div class="table-center" aria-hidden="true">
      <span>Round ${capitalize(elements.roundWind.value)}</span>
      <strong>${getWinType() === "self_draw" ? "Self draw" : "Discard win"}</strong>
      <small>${allHandTargetsMet() ? `${getBasePointUnit()} base x 2^fan` : "Fill 14/13 tile targets"}</small>
    </div>
    ${seatMarkup}
  `;
}

function getTableSeatRole(seat) {
  if (seat === elements.winnerSeat.value) return "Winner";
  if (getWinType() === "discard" && seat === elements.discarderSeat.value) return "Discarder";
  return seat === activeSeat ? "Editing now" : "Player";
}

function renderSeatPreview(seat) {
  const tileIds = getSeatTileIds(seat);
  if (!tileIds.length) return `<span class="seat-empty">No tiles</span>`;
  return tileIds.map((tileId) => {
    const tile = TILE_BY_ID[tileId];
    return `<span class="table-mini-tile tile tile--${tile.suit}" title="${tile.label}" aria-label="${tile.label}">${renderTileFace(tile, true)}</span>`;
  }).join("");
}

function getSettlement(result) {
  const deltas = Object.fromEntries(WINDS.map((seat) => [seat, 0]));
  const winner = elements.winnerSeat.value;
  const winType = getWinType();
  const discarder = getDiscarderSeat(winner);
  const canSettle = result.isValid && result.meetsMinimum !== false && allHandTargetsMet();
  if (!canSettle) {
    return { deltas, winner, discarder, winType, handValue: 0 };
  }

  const handValue = getHandPointValue(result.totalFan);
  if (winType === "self_draw") {
    WINDS.filter((seat) => seat !== winner).forEach((seat) => {
      deltas[seat] -= handValue;
      deltas[winner] += handValue;
    });
  } else {
    deltas[discarder] -= handValue;
    deltas[winner] += handValue;
  }

  return { deltas, winner, discarder, winType, handValue };
}

function getSeatRole(seat, settlement) {
  if (seat === settlement.winner) {
    return { label: "Winner", className: "is-winner" };
  }
  if (settlement.winType === "discard" && seat === settlement.discarder) {
    return { label: "Discarder", className: "is-payer" };
  }
  if (settlement.winType === "self_draw") {
    return { label: "Pays self draw", className: "is-payer" };
  }
  return { label: "Not involved", className: "" };
}

function getDiscarderSeat(winner) {
  return elements.discarderSeat.value === winner
    ? getNextSeat(winner)
    : elements.discarderSeat.value;
}

function getHandPointValue(fan) {
  return getBasePointUnit() * (2 ** Math.max(0, fan));
}

function getBasePointUnit() {
  const value = Number.parseInt(elements.basePointUnit.value, 10);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function allHandTargetsMet() {
  return WINDS.every((seat) => getSeatTileIds(seat).length === getSeatTarget(seat));
}

function getSeatTarget(seat) {
  return seat === elements.winnerSeat.value ? 14 : 13;
}

function getSeatCountClass(count, target) {
  if (count === target) return "is-complete";
  if (count > target) return "is-over";
  return "";
}

function formatSignedNumber(value) {
  if (value > 0) return `+${value}`;
  return `${value}`;
}

function normalizeFanCap(value) {
  const fanCap = Number.parseInt(value, 10);
  return Number.isFinite(fanCap) && fanCap > 0 ? fanCap : 10;
}

function normalizePrettyFlowerCount(value) {
  const count = Number.parseInt(value, 10);
  return Number.isFinite(count) && count > 0 ? Math.min(count, 8) : 0;
}

function renderMeld(group) {
  const key = getMeldKey(group);
  const isMeld = group.type !== "pair" && group.type !== "single";
  const exposed = getMeldExposure()[key] === true;
  return `
    <div class="meld-line" data-meld-key="${key}">
      <div class="meld-tiles">
        <span class="meld-label">${group.type}</span>
        ${group.tiles.map((tileId) => {
          const tile = TILE_BY_ID[tileId];
          return `<span class="mini-tile tile tile--${tile.suit}" title="${tile.label}" aria-label="${tile.label}">${renderTileFace(tile, true)}</span>`;
        }).join("")}
      </div>
      ${isMeld ? `
        <label class="exposure-toggle">
          <input type="checkbox" data-meld-exposure="${key}" ${exposed ? "checked" : ""}>
          <span>Exposed</span>
        </label>
      ` : ""}
    </div>
  `;
}

function getDeclaredMelds() {
  const groups = currentMeldGroups.length
    ? currentMeldGroups
    : Object.keys(getMeldExposure()).map(parseMeldKey).filter(Boolean);

  return groups.map((group) => {
    const key = getMeldKey(group);
    const exposed = getMeldExposure()[key] === true;
    return {
      type: group.type,
      tiles: group.tiles,
      exposed,
    };
  });
}

function parseMeldKey(key) {
  const [type, tilesValue] = key.split(":");
  if (!type || !tilesValue) return null;
  return {
    type,
    tiles: tilesValue.split(","),
  };
}

function hasMeldExposureOverrides() {
  return Object.keys(getMeldExposure()).length > 0;
}

function getExposedMeldCount() {
  return Object.values(getMeldExposure()).filter(Boolean).length;
}

function removeMeldExposure(key) {
  const winner = elements.winnerSeat.value;
  const nextExposure = { ...getMeldExposure() };
  delete nextExposure[key];
  meldExposureBySeat = {
    ...meldExposureBySeat,
    [winner]: nextExposure,
  };
}

function getSubmittedMelds() {
  if (!hasMeldExposureOverrides()) return [];
  return getDeclaredMelds();
}

function getMeldKey(group) {
  return `${group.type}:${group.tiles.join(",")}`;
}

function getAssumedWinningTile(tiles) {
  return tiles.length ? tiles[tiles.length - 1] : null;
}

function getActiveTileIds() {
  return getSeatTileIds(activeSeat);
}

function getWinnerTileIds() {
  return getSeatTileIds(elements.winnerSeat.value);
}

function getSeatTileIds(seat) {
  return tableHands[seat] || [];
}

function getSeatPrettyFlowerCount(seat) {
  return normalizePrettyFlowerCount(prettyFlowerCounts[seat]);
}

function getMeldExposure() {
  return meldExposureBySeat[elements.winnerSeat.value] || {};
}

function getPlayerName(seat) {
  return playerNames[seat]?.trim() || capitalize(seat);
}

function escapeAttribute(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function getWinType() {
  return elements.winType.value || (elements.selfDraw.checked ? "self_draw" : "discard");
}

function setWinType(winType) {
  elements.winType.value = winType === "self_draw" ? "self_draw" : "discard";
  elements.selfDraw.checked = elements.winType.value === "self_draw";
  elements.discarderSeat.disabled = elements.winType.value === "self_draw";
}

function getNextSeat(seat) {
  const currentIndex = WINDS.indexOf(seat);
  return WINDS[(currentIndex + 1) % WINDS.length] || "south";
}

function pruneMeldExposure(seat = elements.winnerSeat.value) {
  const counts = getCounts(getSeatTileIds(seat));
  meldExposureBySeat = {
    ...meldExposureBySeat,
    [seat]: Object.fromEntries(
      Object.entries(meldExposureBySeat[seat] || {}).filter(([key]) => {
        const [, tilesValue] = key.split(":");
        const meldCounts = getCounts(tilesValue.split(","));
        return Object.entries(meldCounts).every(([tileId, count]) => counts[tileId] >= count);
      })
    ),
  };
}

function renderTileFace(tile, compact = false) {
  const face = getTileFace(tile);
  return `
    <span class="tile-face${compact ? " tile-face--compact" : ""}" aria-hidden="true">
      <img src="${getTileImageSrc(tile)}" alt="" loading="lazy" decoding="async" onerror="this.hidden=true; this.nextElementSibling.hidden=false;">
      <span class="tile-face__fallback" hidden>
        <span class="tile-face__rank">${face.rank}</span>
        <span class="tile-face__suit">${face.suit}</span>
      </span>
    </span>
  `;
}

function getTileImageSrc(tile) {
  return window.TILE_ASSET_URLS?.[tile.id] || `assets/tiles/${tile.id}.svg`;
}

function getTileFace(tile) {
  if (["dot", "bam", "char"].includes(tile.suit)) {
    return {
      rank: tile.rank,
      suit: {
        dot: "DOT",
        bam: "BAM",
        char: "CHR",
      }[tile.suit],
    };
  }

  if (tile.suit === "wind") {
    return {
      rank: tile.rank.charAt(0).toUpperCase(),
      suit: "WIND",
    };
  }

  return {
    rank: {
      red: "R",
      green: "G",
      white: "W",
    }[tile.rank],
    suit: "DRG",
  };
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const manualInput = createManualTileInput(() => getWinnerTileIds());

elements.clearHand.addEventListener("click", () => {
  tableHands = {
    ...tableHands,
    [activeSeat]: [],
  };
  pruneMeldExposure(activeSeat);
  render();
});

elements.undoTile.addEventListener("click", undoLastTile);

elements.selectedTiles.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-index]");
  if (!button) return;
  removeTile(Number(button.dataset.removeIndex));
});

elements.toggleTableCompact.addEventListener("click", () => {
  const compact = !elements.tablePanel.classList.contains("is-compact");
  elements.tablePanel.classList.toggle("is-compact", compact);
  elements.toggleTableCompact.setAttribute("aria-pressed", compact ? "true" : "false");
  elements.toggleTableCompact.textContent = compact ? "Expand" : "Compact";
});

elements.commonTable.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit-seat]");
  if (editButton) {
    activeSeat = editButton.dataset.editSeat;
    render();
    return;
  }

  const winnerButton = event.target.closest("[data-winner-seat]");
  if (winnerButton) {
    elements.winnerSeat.value = winnerButton.dataset.winnerSeat;
    elements.seatWind.value = elements.winnerSeat.value;
    if (elements.discarderSeat.value === elements.winnerSeat.value) {
      elements.discarderSeat.value = getNextSeat(elements.winnerSeat.value);
    }
    render();
  }
});

elements.commonTable.addEventListener("input", (event) => {
  const nameInput = event.target.closest("[data-player-name]");
  if (nameInput) {
    playerNames = {
      ...playerNames,
      [nameInput.dataset.playerName]: nameInput.value,
    };
    renderScore(scoreHand(getScoreInput(), getWinOptions()));
    return;
  }

  const prettyFlowerInput = event.target.closest("[data-pretty-flower-count]");
  if (!prettyFlowerInput) return;
  prettyFlowerCounts = {
    ...prettyFlowerCounts,
    [prettyFlowerInput.dataset.prettyFlowerCount]: normalizePrettyFlowerCount(prettyFlowerInput.value),
  };
  render();
});

[elements.concealed, elements.roundWind, elements.minimumFanEnabled, elements.fanCap, elements.basePointUnit].forEach((control) => {
  control.addEventListener("change", render);
});

elements.seatWind.addEventListener("change", () => {
  elements.winnerSeat.value = elements.seatWind.value;
  activeSeat = elements.winnerSeat.value;
  if (elements.discarderSeat.value === elements.winnerSeat.value) {
    elements.discarderSeat.value = getNextSeat(elements.winnerSeat.value);
  }
  render();
});

elements.winnerSeat.addEventListener("change", () => {
  elements.seatWind.value = elements.winnerSeat.value;
  activeSeat = elements.winnerSeat.value;
  if (elements.discarderSeat.value === elements.winnerSeat.value) {
    elements.discarderSeat.value = getNextSeat(elements.winnerSeat.value);
  }
  render();
});

elements.discarderSeat.addEventListener("change", () => {
  if (elements.discarderSeat.value === elements.winnerSeat.value) {
    elements.discarderSeat.value = getNextSeat(elements.winnerSeat.value);
  }
  render();
});

elements.winType.addEventListener("change", () => {
  setWinType(elements.winType.value);
  render();
});

elements.selfDraw.addEventListener("change", () => {
  setWinType(elements.selfDraw.checked ? "self_draw" : "discard");
  render();
});

elements.meldBreakdown.addEventListener("change", (event) => {
  const toggle = event.target.closest("[data-meld-exposure]");
  if (!toggle) return;
  if (toggle.checked) {
    const winner = elements.winnerSeat.value;
    meldExposureBySeat = {
      ...meldExposureBySeat,
      [winner]: {
        ...getMeldExposure(),
        [toggle.dataset.meldExposure]: true,
      },
    };
  } else {
    removeMeldExposure(toggle.dataset.meldExposure);
  }
  render();
});

elements.rulesTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const activeTab = tab.dataset.rulesTab;
    elements.rulesTabs.forEach((button) => {
      const selected = button.dataset.rulesTab === activeTab;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-selected", selected ? "true" : "false");
    });
    elements.rulesPanels.forEach((panel) => {
      panel.hidden = panel.dataset.rulesPanel !== activeTab;
    });
  });
});

elements.fanCap.addEventListener("input", render);
elements.basePointUnit.addEventListener("input", render);

renderWindSelects();
renderTilePicker();
renderExamples();
render();
