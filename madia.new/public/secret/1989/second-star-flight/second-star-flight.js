import { mountParticleField } from "../particles.js";
import { initParticleSystem } from "../particle-effects.js";

mountParticleField();

const particleSystem = initParticleSystem({
  palette: ["#38bdf8", "#facc15", "#f472b6", "#a855f7"],
  ambientDensity: 0.55,
});

const GRID_SIZE = 6;
const SHADOW_COUNT = 7;
const LIGHT_DURATION_MS = 8000;
const LIGHT_COOLDOWN_MS = 1500;
const FREEZE_DURATION_MS = 5000;
const HAPPY_COOLDOWN_MS = 12000;
const SHADOW_MOVE_INTERVAL_MS = 2600;
const SHADOW_RESPAWN_MIN_MS = 3200;
const SHADOW_RESPAWN_MAX_MS = 5200;
const SHADOW_STABILITY_RANGE = [4, 7];
const DUST_PER_CAPTURE = 3;
const DUST_CAP = 24;
const DUST_COST_PER_STEP = 1;
const DUST_DECAY_INTERVAL_MS = 7000;
const DUST_DECAY_AMOUNT = 1;
const FLIGHT_PER_STEP = 6;
const FLIGHT_BURST = 12;
const FLIGHT_GOAL = 100;
const STARTING_FLIGHT = 40;

const boardElement = document.getElementById("shadow-board");
const igniteButton = document.getElementById("ignite-button");
const happyButton = document.getElementById("happy-button");
const flowButton = document.getElementById("flow-button");
const resetFlowButton = document.getElementById("reset-flow-button");
const statusMessage = document.getElementById("status-message");
const flightMeter = document.getElementById("flight-meter");
const flightFill = document.getElementById("flight-fill");
const flightValue = document.getElementById("flight-value");
const dustValue = document.getElementById("dust-value");
const captureValue = document.getElementById("capture-value");
const eventLog = document.getElementById("event-log");

const PIXIE_WELL = { x: 0, y: GRID_SIZE - 1 };
const FLIGHT_GATE = { x: GRID_SIZE - 1, y: 0 };

const state = {
  lightActive: false,
  lightTimeout: null,
  lightCooldown: false,
  freezeActive: false,
  freezeTimeout: null,
  flowMode: false,
  dust: 0,
  flight: STARTING_FLIGHT,
  captured: 0,
  path: [],
  pathCells: new Set(),
  boardLitTimers: new Map(),
};

const cells = new Map();
const shadowPieces = [];
let shadowInterval = null;
let dustDecayInterval = null;

setupBoard();
seedShadows();
startShadowLoop();
startDustDecay();
updateFlight(STARTING_FLIGHT, false);
updateDust(0);
updateCaptures();
updateStatus("Lantern idle. Shadows on the move.");
logEvent("Shadows have slipped loose across the board. Illuminate wisely.");

igniteButton.addEventListener("click", () => {
  if (state.lightActive || state.lightCooldown) {
    return;
  }
  engageLantern();
});

happyButton.addEventListener("click", () => {
  if (state.freezeActive || happyButton.disabled) {
    return;
  }
  triggerHappyThoughts();
});

flowButton.addEventListener("click", () => {
  state.flowMode = !state.flowMode;
  flowButton.textContent = state.flowMode ? "Exit Flow Mode" : "Enter Flow Mode";
  if (state.flowMode) {
    updateStatus("Flow Mode armed. Build the dust trail from the Pixie Well.");
    logEvent("Flow Mode engaged. Dust can now be routed along adjacent tiles.", "success");
  } else {
    updateStatus("Flow Mode disengaged.");
  }
});

resetFlowButton.addEventListener("click", () => {
  if (!state.path.length) {
    updateStatus("Dust trail already clear.");
    return;
  }
  clearDustTrail();
  updateStatus("Dust trail reset. Begin again at the Pixie Well.");
  logEvent("Dust trail cleared. Pixie Dust reservoir remains intact.", "warning");
});

function setupBoard() {
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "board-cell";
      cell.dataset.x = String(x);
      cell.dataset.y = String(y);
      cell.dataset.key = cellKey({ x, y });
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-label", `Row ${y + 1}, Column ${x + 1}`);
      boardElement.appendChild(cell);
      cells.set(cell.dataset.key, cell);

      cell.addEventListener("pointerenter", () => handleCellReveal(cell));
      cell.addEventListener("focus", () => handleCellReveal(cell));
      cell.addEventListener("click", () => handleCellClick(cell));
    }
  }

  const wellCell = getCell(PIXIE_WELL);
  const gateCell = getCell(FLIGHT_GATE);
  wellCell.classList.add("pixie-well");
  gateCell.classList.add("flight-gate");
  state.pathCells.add(cellKey(PIXIE_WELL));
}

function seedShadows() {
  for (let i = 0; i < SHADOW_COUNT; i += 1) {
    const shadow = {
      id: `shadow-${i}`,
      x: 0,
      y: 0,
      stability: 0,
      state: "idle",
      respawnTimer: null,
    };
    shadowPieces.push(shadow);
    respawnShadow(shadow);
  }
}

function startShadowLoop() {
  shadowInterval = window.setInterval(() => {
    if (state.freezeActive) {
      return;
    }
    shadowPieces.forEach((shadow) => {
      if (shadow.state !== "active") {
        return;
      }
      shadow.stability -= 1;
      if (shadow.stability <= 0) {
        dissolveShadow(shadow);
        return;
      }
      moveShadow(shadow);
    });
  }, SHADOW_MOVE_INTERVAL_MS);
}

function startDustDecay() {
  dustDecayInterval = window.setInterval(() => {
    if (state.dust <= 0) {
      return;
    }
    updateDust(state.dust - DUST_DECAY_AMOUNT);
    logEvent(`Ambient night siphoned ${DUST_DECAY_AMOUNT} Pixie Dust.`, "warning");
  }, DUST_DECAY_INTERVAL_MS);
}

function engageLantern() {
  state.lightActive = true;
  state.lightCooldown = true;
  updateStatus("Lantern blazing. Sweep the grid to capture shadows.");
  igniteButton.disabled = true;
  igniteButton.textContent = "Lantern Active";
  logEvent("Lantern ignited. Illuminated cells will capture Lost Shadows.", "success");
  state.lightTimeout = window.setTimeout(() => {
    state.lightActive = false;
    igniteButton.textContent = "Ignite Lantern";
    updateStatus("Lantern faded. Awaiting recharge.");
    window.setTimeout(() => {
      igniteButton.disabled = false;
      state.lightCooldown = false;
      updateStatus("Lantern ready. Shadows regroup.");
    }, LIGHT_COOLDOWN_MS);
  }, LIGHT_DURATION_MS);
}

function triggerHappyThoughts() {
  state.freezeActive = true;
  happyButton.disabled = true;
  updateStatus("Shadows frozen. Capture window open.");
  logEvent("Think Happy Thoughts deployed. Shadows locked for five seconds.", "success");
  cells.forEach((cell) => {
    if (cell.classList.contains("has-shadow")) {
      cell.classList.add("freeze-glow");
    }
  });
  state.freezeTimeout = window.setTimeout(() => {
    state.freezeActive = false;
    cells.forEach((cell) => cell.classList.remove("freeze-glow"));
    updateStatus("Shadows resume their drift.");
  }, FREEZE_DURATION_MS);
  window.setTimeout(() => {
    happyButton.disabled = false;
  }, HAPPY_COOLDOWN_MS);
}

function handleCellReveal(cell) {
  if (!state.lightActive) {
    return;
  }
  lightCell(cell);
  const shadow = findShadowAt(cell.dataset.key);
  if (shadow) {
    captureShadow(shadow, cell);
  }
}

function handleCellClick(cell) {
  if (state.flowMode) {
    routeDustThrough(cell);
  } else if (state.lightActive) {
    handleCellReveal(cell);
  }
}

function lightCell(cell) {
  cell.classList.add("is-lit");
  if (state.boardLitTimers.has(cell.dataset.key)) {
    window.clearTimeout(state.boardLitTimers.get(cell.dataset.key));
  }
  const timer = window.setTimeout(() => {
    cell.classList.remove("is-lit");
    state.boardLitTimers.delete(cell.dataset.key);
  }, 700);
  state.boardLitTimers.set(cell.dataset.key, timer);
}

function captureShadow(shadow, cell) {
  if (shadow.state !== "active") {
    return;
  }
  shadow.state = "captured";
  clearShadowFromCell(shadow);
  state.captured += 1;
  updateCaptures();
  const gainedDust = Math.min(DUST_PER_CAPTURE, DUST_CAP - state.dust);
  if (gainedDust > 0) {
    updateDust(state.dust + gainedDust);
  }
  cell.classList.add("capture-flash");
  window.setTimeout(() => cell.classList.remove("capture-flash"), 620);
  if (gainedDust > 0) {
    logEvent(
      `Lost Shadow bottled at (${Number(shadow.x) + 1}, ${Number(shadow.y) + 1}). Pixie Dust +${gainedDust}.`,
      "success",
    );
  } else {
    logEvent(
      `Lost Shadow bottled at (${Number(shadow.x) + 1}, ${Number(shadow.y) + 1}). Reservoir already brimming.`,
      "success",
    );
  }
  const respawnDelay = randomInRange(SHADOW_RESPAWN_MIN_MS, SHADOW_RESPAWN_MAX_MS);
  shadow.respawnTimer = window.setTimeout(() => {
    respawnShadow(shadow);
  }, respawnDelay);
}

function clearShadowFromCell(shadow) {
  const key = cellKey(shadow);
  const cell = cells.get(key);
  if (cell) {
    cell.classList.remove("has-shadow");
    cell.removeAttribute("data-shadow-id");
  }
}

function respawnShadow(shadow) {
  if (shadow.respawnTimer) {
    window.clearTimeout(shadow.respawnTimer);
    shadow.respawnTimer = null;
  }
  const position = findOpenCell();
  shadow.x = position.x;
  shadow.y = position.y;
  shadow.stability = randomIntInclusive(...SHADOW_STABILITY_RANGE);
  shadow.state = "active";
  const cell = getCell(position);
  cell.classList.add("has-shadow");
  cell.dataset.shadowId = shadow.id;
}

function moveShadow(shadow) {
  const neighbours = getNeighbours(shadow);
  if (!neighbours.length) {
    return;
  }
  const target = neighbours[Math.floor(Math.random() * neighbours.length)];
  const currentCell = getCell(shadow);
  currentCell.classList.remove("has-shadow");
  currentCell.removeAttribute("data-shadow-id");
  shadow.x = target.x;
  shadow.y = target.y;
  const nextCell = getCell(target);
  nextCell.classList.add("has-shadow");
  nextCell.dataset.shadowId = shadow.id;
}

function dissolveShadow(shadow) {
  shadow.state = "dissolving";
  clearShadowFromCell(shadow);
  logEvent(
    `Shadow at (${Number(shadow.x) + 1}, ${Number(shadow.y) + 1}) dissolved into the dark.`,
    "warning",
  );
  const respawnDelay = randomInRange(SHADOW_RESPAWN_MIN_MS, SHADOW_RESPAWN_MAX_MS);
  shadow.respawnTimer = window.setTimeout(() => {
    respawnShadow(shadow);
    logEvent("Shadow reformed somewhere in the grid.");
  }, respawnDelay);
}

function routeDustThrough(cell) {
  const x = Number(cell.dataset.x);
  const y = Number(cell.dataset.y);
  const key = cell.dataset.key;

  if (!state.path.length) {
    if (x !== PIXIE_WELL.x || y !== PIXIE_WELL.y) {
      updateStatus("Begin the trail from the Pixie Well.");
      logEvent("Dust flow must originate from the Pixie Well.", "warning");
      return;
    }
    state.path.push({ x, y });
    state.pathCells.add(key);
    cell.classList.add("flow-path");
    updateStatus("Trail anchored. Spend dust to extend toward the Flight Gate.");
    return;
  }

  const last = state.path[state.path.length - 1];
  if (x === last.x && y === last.y) {
    updateStatus("Node already part of the trail.");
    return;
  }

  if (!isAdjacent({ x, y }, last)) {
    updateStatus("Trail must extend to an adjacent tile.");
    logEvent("Dust can only flow into adjacent tiles.", "warning");
    return;
  }

  if (state.pathCells.has(key)) {
    updateStatus("That tile already glows with dust.");
    return;
  }

  if (state.dust < DUST_COST_PER_STEP) {
    updateStatus("Not enough Pixie Dust. Capture more shadows.");
    logEvent("Pixie Dust reservoir empty—capture more shadows.", "warning");
    return;
  }

  state.path.push({ x, y });
  state.pathCells.add(key);
  cell.classList.add("flow-path");
  updateDust(state.dust - DUST_COST_PER_STEP);
  const reachedGate = x === FLIGHT_GATE.x && y === FLIGHT_GATE.y;
  const gain = reachedGate ? FLIGHT_PER_STEP + FLIGHT_BURST : FLIGHT_PER_STEP;
  updateFlight(state.flight + gain);
  logEvent(
    reachedGate
      ? "Dust stream reached the Flight Gate! Soaring Burst unleashed."
      : "Pixie Dust surge extended the trail.",
    reachedGate ? "success" : undefined,
  );
  if (reachedGate) {
    updateStatus("Flight Gate charged! The skies crack open.");
    state.flowMode = false;
    flowButton.textContent = "Enter Flow Mode";
  } else {
    updateStatus("Dust stream extended. Keep chaining toward the gate.");
  }
}

function clearDustTrail() {
  state.path.forEach((node) => {
    const key = cellKey(node);
    if (key === cellKey(PIXIE_WELL)) {
      return;
    }
    const cell = cells.get(key);
    if (cell) {
      cell.classList.remove("flow-path");
    }
  });
  state.path = [];
  state.pathCells = new Set([cellKey(PIXIE_WELL)]);
  const wellCell = getCell(PIXIE_WELL);
  wellCell.classList.remove("flow-path");
}

function updateDust(value) {
  const clamped = Math.max(0, Math.min(DUST_CAP, value));
  state.dust = clamped;
  dustValue.textContent = String(clamped);
}

function updateFlight(value, announce = true) {
  const clamped = Math.max(0, Math.min(FLIGHT_GOAL, value));
  state.flight = clamped;
  flightFill.style.width = `${clamped}%`;
  flightValue.textContent = String(clamped);
  flightMeter.setAttribute("aria-valuenow", String(clamped));
  if (announce && clamped >= FLIGHT_GOAL) {
    logEvent("Flight Meter maxed! Hook's blockade has been shattered.", "success");
    updateStatus("Flight Meter full. The level objective is complete!");
  }
}

function updateCaptures() {
  captureValue.textContent = String(state.captured);
}

function updateStatus(message) {
  statusMessage.textContent = message;
}

function logEvent(message, variant = "info") {
  const entry = document.createElement("li");
  entry.textContent = message;
  if (variant !== "info") {
    entry.classList.add(variant);
  }
  eventLog.prepend(entry);
  if (variant === "success") {
    particleSystem.emitBurst(1.3);
  } else if (variant === "warning") {
    particleSystem.emitSparkle(0.8);
  } else if (variant === "danger") {
    particleSystem.emitSparkle(1.0);
  }
  while (eventLog.children.length > 12) {
    eventLog.removeChild(eventLog.lastElementChild);
  }
}

function findShadowAt(key) {
  const shadowCell = cells.get(key);
  if (!shadowCell || !shadowCell.dataset.shadowId) {
    return null;
  }
  return shadowPieces.find((shadow) => shadow.id === shadowCell.dataset.shadowId) ?? null;
}

function findOpenCell() {
  const occupied = new Set();
  shadowPieces.forEach((shadow) => {
    if (shadow.state === "active") {
      occupied.add(cellKey(shadow));
    }
  });
  occupied.add(cellKey(PIXIE_WELL));
  occupied.add(cellKey(FLIGHT_GATE));
  state.pathCells.forEach((key) => occupied.add(key));
  let attempts = 0;
  while (attempts < 100) {
    const x = Math.floor(Math.random() * GRID_SIZE);
    const y = Math.floor(Math.random() * GRID_SIZE);
    const key = cellKey({ x, y });
    if (!occupied.has(key)) {
      return { x, y };
    }
    attempts += 1;
  }
  return { x: 2, y: 2 };
}

function getCell(position) {
  return cells.get(cellKey(position));
}

function cellKey(position) {
  return `${position.x},${position.y}`;
}

function getNeighbours(position) {
  const coords = [];
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      if (dx === 0 && dy === 0) {
        continue;
      }
      const nx = position.x + dx;
      const ny = position.y + dy;
      if (nx < 0 || ny < 0 || nx >= GRID_SIZE || ny >= GRID_SIZE) {
        continue;
      }
      const key = cellKey({ x: nx, y: ny });
      if (state.pathCells.has(key)) {
        continue;
      }
      if (key === cellKey(PIXIE_WELL) || key === cellKey(FLIGHT_GATE)) {
        continue;
      }
      const cell = cells.get(key);
      if (cell && cell.dataset.shadowId) {
        continue;
      }
      coords.push({ x: nx, y: ny });
    }
  }
  return coords;
}

function isAdjacent(a, b) {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
}

function randomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomIntInclusive(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

window.addEventListener("beforeunload", () => {
  if (shadowInterval) {
    window.clearInterval(shadowInterval);
  }
  if (dustDecayInterval) {
    window.clearInterval(dustDecayInterval);
  }
  shadowPieces.forEach((shadow) => {
    if (shadow.respawnTimer) {
      window.clearTimeout(shadow.respawnTimer);
    }
  });
  if (state.lightTimeout) {
    window.clearTimeout(state.lightTimeout);
  }
  if (state.freezeTimeout) {
    window.clearTimeout(state.freezeTimeout);
  }
});
