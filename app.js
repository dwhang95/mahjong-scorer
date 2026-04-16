import { EXAMPLES } from "./examples.js";
import { createManualTileInput } from "./recognition.js";
import { scoreHand } from "./scoring.js";
import { TILE_GROUPS, TILE_BY_ID, WINDS, compareTileIds, getCounts } from "./tiles.js";

let selectedTileIds = [];

const elements = {
  clearHand: document.querySelector("#clearHand"),
  selectedTiles: document.querySelector("#selectedTiles"),
  tileCount: document.querySelector("#tileCount"),
  tileGroups: document.querySelector("#tileGroups"),
  examples: document.querySelector("#examples"),
  seatWind: document.querySelector("#seatWind"),
  roundWind: document.querySelector("#roundWind"),
  selfDraw: document.querySelector("#selfDraw"),
  concealed: document.querySelector("#concealed"),
  fanTotal: document.querySelector("#fanTotal"),
  limitBadge: document.querySelector("#limitBadge"),
  scoreStatus: document.querySelector("#scoreStatus"),
  meldBreakdown: document.querySelector("#meldBreakdown"),
  fanBreakdown: document.querySelector("#fanBreakdown"),
};

function addTile(tileId) {
  const counts = getCounts(selectedTileIds);
  if (selectedTileIds.length >= 14 || counts[tileId] >= 4) return;
  selectedTileIds = [...selectedTileIds, tileId].sort(compareTileIds);
  render();
}

function removeTile(tileId) {
  const index = selectedTileIds.indexOf(tileId);
  if (index === -1) return;
  selectedTileIds = selectedTileIds.filter((_, tileIndex) => tileIndex !== index);
  render();
}

function renderTilePicker() {
  elements.tileGroups.innerHTML = TILE_GROUPS.map((group) => `
    <div class="tile-group">
      <h3>${group.label}</h3>
      <div class="tile-row">
        ${group.tiles.map((tile) => `
          <button class="tile-button" type="button" data-tile-id="${tile.id}" title="${tile.label}" aria-label="Add ${tile.label}">
            ${tile.glyph}
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
    selectedTileIds = [...example.tiles].sort(compareTileIds);
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
  elements.selectedTiles.innerHTML = selectedTileIds.length
    ? selectedTileIds.map((tileId, index) => {
        const tile = TILE_BY_ID[tileId];
        const occurrence = selectedTileIds.slice(0, index + 1).filter((id) => id === tileId).length;
        return `
          <button class="selected-tile" type="button" data-remove-tile="${tileId}" data-count="${occurrence}" title="Remove ${tile.label}" aria-label="Remove ${tile.label}">
            ${tile.glyph}
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
  };
}

function renderScore(result) {
  elements.fanTotal.textContent = result.totalFan;
  elements.limitBadge.hidden = !result.isLimit;
  elements.scoreStatus.textContent = result.message;
  elements.scoreStatus.classList.toggle("error", !result.isValid && selectedTileIds.length === 14);

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

function renderMeld(group) {
  return `
    <div class="meld-line">
      <span class="meld-label">${group.type}</span>
      ${group.tiles.map((tileId) => `<span class="mini-tile" title="${TILE_BY_ID[tileId].label}">${TILE_BY_ID[tileId].glyph}</span>`).join("")}
    </div>
  `;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const manualInput = createManualTileInput(() => selectedTileIds);

elements.clearHand.addEventListener("click", () => {
  selectedTileIds = [];
  render();
});

elements.selectedTiles.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-tile]");
  if (!button) return;
  removeTile(button.dataset.removeTile);
});

[elements.selfDraw, elements.concealed, elements.seatWind, elements.roundWind].forEach((control) => {
  control.addEventListener("change", render);
});

renderWindSelects();
renderTilePicker();
renderExamples();
render();
