import { EXAMPLES } from "./examples.js";
import { createManualTileInput } from "./recognition.js";
import { scoreHand } from "./scoring.js";
import { TILE_GROUPS, TILE_BY_ID, WINDS, getCounts } from "./tiles.js";

let selectedTileIds = [];

const elements = {
  clearHand: document.querySelector("#clearHand"),
  undoTile: document.querySelector("#undoTile"),
  selectedTiles: document.querySelector("#selectedTiles"),
  tileCount: document.querySelector("#tileCount"),
  tileGroups: document.querySelector("#tileGroups"),
  examples: document.querySelector("#examples"),
  seatWind: document.querySelector("#seatWind"),
  roundWind: document.querySelector("#roundWind"),
  selfDraw: document.querySelector("#selfDraw"),
  concealed: document.querySelector("#concealed"),
  minimumFanEnabled: document.querySelector("#minimumFanEnabled"),
  fanCap: document.querySelector("#fanCap"),
  fanTotal: document.querySelector("#fanTotal"),
  limitBadge: document.querySelector("#limitBadge"),
  scoreStatus: document.querySelector("#scoreStatus"),
  assumptionsList: document.querySelector("#assumptionsList"),
  meldBreakdown: document.querySelector("#meldBreakdown"),
  fanBreakdown: document.querySelector("#fanBreakdown"),
};

function addTile(tileId) {
  const counts = getCounts(selectedTileIds);
  if (selectedTileIds.length >= 14 || counts[tileId] >= 4) return;
  selectedTileIds = [...selectedTileIds, tileId];
  render();
}

function removeTile(index) {
  if (index < 0 || index >= selectedTileIds.length) return;
  selectedTileIds = selectedTileIds.filter((_, tileIndex) => tileIndex !== index);
  render();
}

function undoLastTile() {
  if (!selectedTileIds.length) return;
  selectedTileIds = selectedTileIds.slice(0, -1);
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
    selectedTileIds = [...example.tiles];
    elements.selfDraw.checked = example.options.selfDraw;
    elements.concealed.checked = example.options.concealed;
    elements.seatWind.value = example.options.seatWind;
    elements.roundWind.value = example.options.roundWind;
    render();
  });
}

function render() {
  const counts = getCounts(selectedTileIds);
  elements.tileCount.textContent = `${selectedTileIds.length} / 14`;
  elements.undoTile.disabled = selectedTileIds.length === 0;
  elements.selectedTiles.innerHTML = selectedTileIds.length
    ? selectedTileIds.map((tileId, index) => {
        const tile = TILE_BY_ID[tileId];
        const occurrence = selectedTileIds.slice(0, index + 1).filter((id) => id === tileId).length;
        return `
          <button class="selected-tile tile tile--${tile.suit}" type="button" data-remove-index="${index}" data-count="${occurrence}" title="Remove ${tile.label}" aria-label="Remove ${tile.label}">
            ${renderTileFace(tile)}
          </button>
        `;
      }).join("")
    : `<p class="empty-hand">No tiles selected.</p>`;

  document.querySelectorAll(".tile-button").forEach((button) => {
    button.disabled = selectedTileIds.length >= 14 || counts[button.dataset.tileId] >= 4;
  });

  renderScore(scoreHand(manualInput.parseTiles(), getWinOptions()));
}

function getWinOptions() {
  return {
    seatWind: elements.seatWind.value,
    roundWind: elements.roundWind.value,
    selfDraw: elements.selfDraw.checked,
    concealed: elements.concealed.checked,
    minimumFanEnabled: elements.minimumFanEnabled.checked,
    fanCap: elements.fanCap.value,
  };
}

function renderScore(result) {
  elements.fanTotal.textContent = result.totalFan;
  elements.limitBadge.hidden = !result.isLimit;
  elements.scoreStatus.innerHTML = `
    <strong>${result.message}</strong>
    ${result.feedback?.length ? `<ul>${result.feedback.map((item) => `<li>${item}</li>`).join("")}</ul>` : ""}
  `;
  elements.scoreStatus.classList.toggle("error", (!result.isValid && selectedTileIds.length === 14) || result.meetsMinimum === false);
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
}

function renderAssumptions() {
  const options = getWinOptions();
  const fanCap = normalizeFanCap(options.fanCap);
  return [
    "Hong Kong / Cantonese-style fan patterns supported by this app.",
    options.minimumFanEnabled ? "3 fan minimum is required." : "3 fan minimum is not required.",
    `Fan total is capped at ${fanCap}.`,
    `Seat wind: ${capitalize(options.seatWind)}. Round wind: ${capitalize(options.roundWind)}.`,
    options.selfDraw ? "Self-drawn win is counted." : "Self-drawn win is not counted.",
    options.concealed ? "Concealed hand is counted." : "Concealed hand is not counted.",
  ].map((item) => `<li>${item}</li>`).join("");
}

function normalizeFanCap(value) {
  const fanCap = Number.parseInt(value, 10);
  return Number.isFinite(fanCap) && fanCap > 0 ? fanCap : 10;
}

function renderMeld(group) {
  return `
    <div class="meld-line">
      <span class="meld-label">${group.type}</span>
      ${group.tiles.map((tileId) => {
        const tile = TILE_BY_ID[tileId];
        return `<span class="mini-tile tile tile--${tile.suit}" title="${tile.label}" aria-label="${tile.label}">${renderTileFace(tile, true)}</span>`;
      }).join("")}
    </div>
  `;
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

const manualInput = createManualTileInput(() => selectedTileIds);

elements.clearHand.addEventListener("click", () => {
  selectedTileIds = [];
  render();
});

elements.undoTile.addEventListener("click", undoLastTile);

elements.selectedTiles.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-index]");
  if (!button) return;
  removeTile(Number(button.dataset.removeIndex));
});

[elements.selfDraw, elements.concealed, elements.seatWind, elements.roundWind, elements.minimumFanEnabled, elements.fanCap].forEach((control) => {
  control.addEventListener("change", render);
});

elements.fanCap.addEventListener("input", render);

renderWindSelects();
renderTilePicker();
renderExamples();
render();
