import { mountParticleField } from "../particles.js";
import { initParticleSystem } from "../particle-effects.js";

mountParticleField();

const particleSystem = initParticleSystem({
  palette: ["#f97316", "#38bdf8", "#facc15", "#fb7185"],
  ambientDensity: 0.6,
});

const GRID_SIZE = 5;
const LEVEL_DURATION_MS = 90_000;
const TEMPERATURE_MAX = 100;
const CRITICAL_THRESHOLD = 88;
const BASE_TEMP_RISE_PER_SECOND = 0.55;
const GRIEVANCE_TEMP_RISE_PER_SECOND = 0.85;
const ROUTE_MAX_LENGTH = 4;
const GRIEVANCE_SPAWN_INTERVAL_MS = 4_200;
const OUTBURST_MAX = 100;
const OUTBURST_WAIT_PENALTY = 8;
const OUTBURST_BLOCK_PENALTY = 12;
const OUTBURST_COOL_BONUS = -8;
const ROUTE_COOL_BASE = 6;
const ROUTE_COOL_PER_EXTRA = 2;
const TRASH_CAN_LOCK_MS = 6_000;
const STARTING_TEMPERATURE = 46;

const boardTemplate = [
  { id: "dj-rooftop", label: "DJ Booth Roof", type: "vent", passable: true, initialGrievance: 0 },
  { id: "stoop-a", label: "Brownstone Stoop", type: "stoop", passable: true, initialGrievance: 1 },
  { id: "block-party", label: "Block Party Stage", type: "street", passable: true, initialGrievance: 1 },
  { id: "mural", label: "Bedford Mural", type: "street", passable: true, initialGrievance: 0 },
  { id: "hydrant-north", label: "Burst Hydrant", type: "hydrant", passable: false, initialGrievance: 0 },
  { id: "pizza-window", label: "Slice Shop Window", type: "stoop", passable: true, initialGrievance: 0 },
  { id: "crosswalk", label: "Crosswalk Beat", type: "street", passable: true, initialGrievance: 1 },
  { id: "newsstand", label: "Newsstand Corner", type: "street", passable: true, initialGrievance: 0 },
  { id: "stoop-b", label: "Front Stoop", type: "stoop", passable: true, initialGrievance: 0 },
  { id: "hydrant-east", label: "Barricaded Hydrant", type: "hydrant", passable: false, initialGrievance: 0 },
  { id: "bodega", label: "Slice Shop Queue", type: "street", passable: true, initialGrievance: 1 },
  { id: "open-avenue", label: "Open Avenue", type: "street", passable: true, initialGrievance: 0 },
  { id: "trash-can", label: "Trash Can Stack", type: "trash-can", passable: true, initialGrievance: 2 },
  { id: "park-bench", label: "Community Bench", type: "street", passable: true, initialGrievance: 0 },
  { id: "stoop-c", label: "Window Watch", type: "stoop", passable: true, initialGrievance: 0 },
  { id: "garden", label: "Community Garden", type: "street", passable: true, initialGrievance: 1 },
  { id: "alley", label: "Shaded Alley", type: "street", passable: true, initialGrievance: 0 },
  { id: "roadblock", label: "Police Barricade", type: "hydrant", passable: false, initialGrievance: 0 },
  { id: "record-shop", label: "Record Shop Queue", type: "street", passable: true, initialGrievance: 0 },
  { id: "vent-south", label: "Backlot Vent", type: "vent", passable: true, initialGrievance: 0 },
  { id: "hydrant-south", label: "Ruined Hydrant", type: "hydrant", passable: false, initialGrievance: 0 },
  { id: "alley-south", label: "Alley Shortcut", type: "street", passable: true, initialGrievance: 1 },
  { id: "stoop-d", label: "Community Steps", type: "stoop", passable: true, initialGrievance: 0 },
  { id: "block-crowd", label: "Block Crowd", type: "street", passable: true, initialGrievance: 0 },
  { id: "radio-van", label: "Radio Van", type: "street", passable: true, initialGrievance: 0 },
];

const startDayButton = document.getElementById("start-day");
const resetDayButton = document.getElementById("reset-day");
const holdPositionButton = document.getElementById("hold-position");
const routeFanButton = document.getElementById("route-fan");
const commitRouteButton = document.getElementById("commit-route");
const cancelRouteButton = document.getElementById("cancel-route");
const trashCanButton = document.getElementById("trash-can-toss");
const statusBar = document.getElementById("status-bar");
const temperatureFill = document.getElementById("temperature-fill");
const temperatureReading = document.getElementById("temperature-reading");
const outburstFill = document.getElementById("outburst-fill");
const outburstReading = document.getElementById("outburst-reading");
const timerRemaining = document.getElementById("timer-remaining");
const boardElement = document.getElementById("board");
const lockBanner = document.getElementById("lock-banner");
const logEntries = document.getElementById("log-entries");

const tileElements = [];

const state = {
  playing: false,
  selection: [],
  selecting: false,
  temperature: STARTING_TEMPERATURE,
  outburst: 0,
  timerEnd: 0,
  lastTick: 0,
  lockedUntil: 0,
  locked: false,
  tickTimer: 0,
  spawnTimer: 0,
  cells: [],
};

initializeBoard();
resetState();

startDayButton.addEventListener("click", startDay);
resetDayButton.addEventListener("click", () => {
  resetState();
  logEvent("Day reset. Fresh morning breeze returns.", "warning");
  updateStatus("Day reset. Press Start Day to resume the watch.");
});
holdPositionButton.addEventListener("click", holdPosition);
routeFanButton.addEventListener("click", enterRouteMode);
commitRouteButton.addEventListener("click", commitRoute);
cancelRouteButton.addEventListener("click", exitRouteMode);
trashCanButton.addEventListener("click", trashCanToss);
boardElement.addEventListener("click", handleTileClick);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && state.playing) {
    updateStatus("Heat keeps rising even while you look away.");
  }
});

function initializeBoard() {
  boardElement.innerHTML = "";
  tileElements.length = 0;
  boardTemplate.forEach((cell, index) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "board-tile";
    tile.dataset.index = String(index);
    tile.dataset.type = cell.type;
    tile.dataset.grievance = "0";
    tile.setAttribute("role", "gridcell");
    tile.setAttribute("aria-label", `${cell.label}. No grievances.`);
    tile.innerHTML = `
      <span class="tile-label">${cell.label}</span>
      <span class="grievance-badge">0</span>
    `;
    boardElement.append(tile);
    tileElements.push(tile);
  });
}

function resetState() {
  clearInterval(state.tickTimer);
  clearInterval(state.spawnTimer);
  state.playing = false;
  state.selecting = false;
  state.selection = [];
  state.temperature = STARTING_TEMPERATURE;
  state.outburst = 0;
  state.timerEnd = 0;
  state.lastTick = 0;
  state.locked = false;
  state.lockedUntil = 0;
  state.tickTimer = 0;
  state.spawnTimer = 0;
  state.cells = boardTemplate.map((cell) => ({
    ...cell,
    grievance: cell.initialGrievance,
  }));
  logEntries.innerHTML = "";
  updateBoard();
  updateGauges();
  updateTimerDisplay(LEVEL_DURATION_MS);
  updateStatus("Press Start Day to begin the heat watch.");
  updateButtons();
  updateLockBanner();
}

function startDay() {
  if (state.playing) {
    return;
  }
  resetState();
  state.playing = true;
  state.timerEnd = Date.now() + LEVEL_DURATION_MS;
  state.lastTick = Date.now();
  state.tickTimer = window.setInterval(handleTick, 1_000);
  state.spawnTimer = window.setInterval(spawnGrievances, GRIEVANCE_SPAWN_INTERVAL_MS);
  updateStatus("Heat wave rolling. Route cooling air to keep temp contained.");
  logEvent("Heat wave rolling. Fan routes now active.", "success");
  updateButtons();
}

function holdPosition() {
  if (!state.playing || state.locked) {
    return;
  }
  changeTemperature(1.5);
  adjustOutburst(OUTBURST_WAIT_PENALTY);
  updateStatus("Holding position. The block sweats and pressure builds.");
  logEvent("Hold position. Pressure creeps up while the heat sticks.", "warning");
}

function enterRouteMode() {
  if (!state.playing || state.locked) {
    return;
  }
  state.selecting = true;
  state.selection = [];
  updateStatus("Route mode active. Click up to four connected tiles to sweep cooling air.");
  updateTileHighlights();
  updateButtons();
}

function commitRoute() {
  if (!state.selecting || state.selection.length === 0 || state.locked) {
    updateStatus("Select connected tiles before committing the route.");
    return;
  }
  let blocked = false;
  let cleared = 0;
  state.selection.forEach((index) => {
    const cell = state.cells[index];
    if (!cell.passable) {
      blocked = true;
      return;
    }
    if (cell.grievance > 0) {
      cell.grievance -= 1;
      cleared += 1;
    }
  });
  if (blocked) {
    adjustOutburst(OUTBURST_BLOCK_PENALTY);
    logEvent("Cooling route hits a barricade—pressure surges.", "danger");
  }
  if (cleared > 0) {
    const reduction = ROUTE_COOL_BASE + (cleared - 1) * ROUTE_COOL_PER_EXTRA;
    changeTemperature(-reduction);
    adjustOutburst(OUTBURST_COOL_BONUS);
    updateStatus(`Cooling fan clears ${cleared} grievance block${cleared > 1 ? "s" : ""}.`);
    logEvent(`Cooling fan clears ${cleared} grievance block${cleared > 1 ? "s" : ""}.`, "success");
  } else if (!blocked) {
    adjustOutburst(OUTBURST_WAIT_PENALTY);
    updateStatus("The route swept clean stoops. No relief, pressure grows.");
    logEvent("Cooling route misses grievances—tensions simmer.", "warning");
  }
  exitRouteMode();
  updateBoard();
  updateGauges();
}

function exitRouteMode() {
  state.selecting = false;
  state.selection.forEach((index) => {
    const tile = tileElements[index];
    if (tile) {
      tile.classList.remove("selected");
      tile.setAttribute("aria-selected", "false");
    }
  });
  state.selection = [];
  updateTileHighlights();
  updateButtons();
}

function handleTileClick(event) {
  const tile = event.target.closest(".board-tile");
  if (!tile) {
    return;
  }
  const index = Number.parseInt(tile.dataset.index ?? "-1", 10);
  if (Number.isNaN(index)) {
    return;
  }
  if (!state.playing) {
    updateStatus("Heat cycle hasn't started yet. Press Start Day.");
    return;
  }
  if (state.locked) {
    updateStatus("Board locked—cooling controls offline during the outburst aftermath.");
    return;
  }
  if (!state.selecting) {
    updateStatus("Enter Route Mode to chart a cooling path.");
    return;
  }
  const cell = state.cells[index];
  if (!cell.passable) {
    adjustOutburst(OUTBURST_BLOCK_PENALTY / 2);
    updateStatus("Hydrant blocks the airflow—the crew bristles.");
    logEvent("Hydrant blocks the attempted route.", "warning");
    return;
  }
  if (state.selection.length > 0) {
    const lastIndex = state.selection[state.selection.length - 1];
    if (!areNeighbors(lastIndex, index)) {
      updateStatus("Routes must stay connected. Choose a tile adjacent to your last pick.");
      return;
    }
  }
  if (state.selection.includes(index)) {
    updateStatus("Tile already in the path. Pick a different neighbor.");
    return;
  }
  if (state.selection.length >= ROUTE_MAX_LENGTH) {
    updateStatus("Route maxed out. Commit or cancel before adding more.");
    return;
  }
  state.selection.push(index);
  tile.classList.add("selected");
  tile.setAttribute("aria-selected", "true");
  updateButtons();
}

function areNeighbors(a, b) {
  const rowA = Math.floor(a / GRID_SIZE);
  const colA = a % GRID_SIZE;
  const rowB = Math.floor(b / GRID_SIZE);
  const colB = b % GRID_SIZE;
  return Math.abs(rowA - rowB) + Math.abs(colA - colB) === 1;
}

function trashCanToss() {
  if (!state.playing || state.outburst < OUTBURST_MAX || state.locked) {
    return;
  }
  exitRouteMode();
  changeTemperature(-26);
  state.outburst = 0;
  state.locked = true;
  state.lockedUntil = Date.now() + TRASH_CAN_LOCK_MS;
  updateStatus("Trash can arcs—heat crashes but chaos locks the board.");
  logEvent("Trash can toss erupts, cooling the block but freezing controls.", "warning");
  updateGauges();
  updateButtons();
  updateLockBanner();
}

function handleTick() {
  if (!state.playing) {
    return;
  }
  const now = Date.now();
  const secondsElapsed = (now - state.lastTick) / 1_000;
  state.lastTick = now;
  if (state.locked && now >= state.lockedUntil) {
    state.locked = false;
    updateStatus("Crew regroups. Cooling controls back online.");
    logEvent("Cooling controls restored after the outburst.", "success");
    updateButtons();
    updateLockBanner();
  }
  const grievances = totalGrievances();
  const tempRise = BASE_TEMP_RISE_PER_SECOND * secondsElapsed + GRIEVANCE_TEMP_RISE_PER_SECOND * grievances * secondsElapsed;
  changeTemperature(tempRise);
  const remaining = Math.max(state.timerEnd - now, 0);
  updateTimerDisplay(remaining);
  updateGauges();
  if (state.temperature >= TEMPERATURE_MAX) {
    endDay(false, "Temperature hits the boiling point. The block erupts.");
    return;
  }
  if (remaining <= 0) {
    endDay(true, "Day cools without boiling over. Peace holds on the block.");
  }
}

function spawnGrievances() {
  if (!state.playing) {
    return;
  }
  const candidates = state.cells
    .map((cell, index) => ({ cell, index }))
    .filter(({ cell }) => cell.passable);
  if (candidates.length === 0) {
    return;
  }
  const spawnCount = state.temperature > CRITICAL_THRESHOLD ? 3 : 2;
  const pool = [...candidates];
  const chosen = new Set();
  while (pool.length > 0 && chosen.size < spawnCount) {
    const choiceIndex = Math.floor(Math.random() * pool.length);
    const [{ index }] = pool.splice(choiceIndex, 1);
    chosen.add(index);
  }
  if (chosen.size === 0) {
    return;
  }
  chosen.forEach((index) => {
    const cell = state.cells[index];
    cell.grievance = Math.min(cell.grievance + 1, 3);
  });
  updateBoard();
  const message = `${chosen.size} grievance block${chosen.size > 1 ? "s" : ""} flare in the heat.`;
  logEvent(message, state.locked ? "danger" : "warning");
  updateStatus("New grievances flare up—keep the fans moving.");
}

function totalGrievances() {
  return state.cells.reduce((sum, cell) => sum + cell.grievance, 0);
}

function changeTemperature(delta) {
  state.temperature = Math.max(0, Math.min(TEMPERATURE_MAX, state.temperature + delta));
}

function adjustOutburst(amount) {
  const wasMaxed = state.outburst >= OUTBURST_MAX;
  const next = Math.max(0, Math.min(OUTBURST_MAX, state.outburst + amount));
  state.outburst = next;
  if (state.outburst >= OUTBURST_MAX && !wasMaxed) {
    updateStatus("Outburst meter primed. Trash can toss ready when you call it.");
    logEvent("Outburst meter maxed—trash can toss armed.", "warning");
  }
  updateButtons();
  updateGauges();
}

function updateBoard() {
  state.cells.forEach((cell, index) => {
    const tile = tileElements[index];
    if (!tile) {
      return;
    }
    tile.dataset.grievance = String(cell.grievance);
    tile.dataset.type = cell.type;
    const badge = tile.querySelector(".grievance-badge");
    if (badge) {
      badge.textContent = `${cell.grievance}`;
    }
    const grievanceText = cell.grievance === 0 ? "No grievances" : `${cell.grievance} grievance block${cell.grievance > 1 ? "s" : ""}`;
    tile.setAttribute("aria-label", `${cell.label}. ${grievanceText}.`);
  });
  updateTileHighlights();
}

function updateTileHighlights() {
  tileElements.forEach((tile, index) => {
    const cell = state.cells[index];
    if (state.selecting && cell.passable && !state.locked) {
      tile.classList.add("selectable");
    } else {
      tile.classList.remove("selectable");
    }
    if (!state.selecting) {
      tile.classList.remove("selected");
      tile.setAttribute("aria-selected", "false");
    }
  });
}

function updateGauges() {
  const temperaturePercent = Math.round((state.temperature / TEMPERATURE_MAX) * 100);
  temperatureFill.style.width = `${temperaturePercent}%`;
  temperatureReading.textContent = `${temperaturePercent}%`;
  temperatureFill.classList.toggle("danger", state.temperature >= CRITICAL_THRESHOLD);
  const outburstPercent = Math.round((state.outburst / OUTBURST_MAX) * 100);
  outburstFill.style.width = `${outburstPercent}%`;
  outburstReading.textContent = `${outburstPercent}%`;
}

function updateTimerDisplay(remainingMs) {
  const minutes = Math.floor(remainingMs / 60_000);
  const seconds = Math.floor((remainingMs % 60_000) / 1_000);
  const paddedSeconds = String(seconds).padStart(2, "0");
  timerRemaining.textContent = `${String(minutes).padStart(2, "0")}:${paddedSeconds}`;
}

function updateStatus(message) {
  statusBar.textContent = message;
}

function logEvent(message, variant = "info") {
  const entry = document.createElement("li");
  entry.className = `log-entry ${variant}`;
  entry.textContent = message;
  logEntries.prepend(entry);
  if (variant === "success") {
    particleSystem.emitBurst(1.3);
  } else if (variant === "warning") {
    particleSystem.emitSparkle(0.8);
  } else if (variant === "danger") {
    particleSystem.emitSparkle(1.0);
  }
  while (logEntries.children.length > 12) {
    logEntries.removeChild(logEntries.lastElementChild);
  }
}

function updateButtons() {
  startDayButton.disabled = state.playing;
  resetDayButton.disabled = false;
  holdPositionButton.disabled = !state.playing || state.locked;
  routeFanButton.disabled = !state.playing || state.locked;
  commitRouteButton.disabled = !state.selecting || state.selection.length === 0 || state.locked;
  cancelRouteButton.disabled = !state.selecting;
  trashCanButton.disabled = !state.playing || state.outburst < OUTBURST_MAX || state.locked;
}

function updateLockBanner() {
  lockBanner.hidden = !state.locked;
}

function endDay(success, message) {
  if (!state.playing) {
    return;
  }
  clearInterval(state.tickTimer);
  clearInterval(state.spawnTimer);
  state.playing = false;
  state.selecting = false;
  state.selection = [];
  state.locked = false;
  state.lockedUntil = 0;
  updateStatus(message);
  logEvent(message, success ? "success" : "danger");
  updateButtons();
  updateLockBanner();
}
