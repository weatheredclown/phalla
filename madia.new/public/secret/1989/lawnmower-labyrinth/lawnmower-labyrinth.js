import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { mountParticleField } from "../particles.js";
import { autoEnhanceFeedback } from "../feedback.js";

const particleField = mountParticleField({
  effects: {
    palette: ["#38bdf8", "#22c55e", "#f97316", "#facc15"],
    ambientDensity: 0.5,
  },
});

autoEnhanceFeedback();

const scoreConfig = getScoreConfig("lawnmower-labyrinth");
const highScore = initHighScoreBanner({
  gameId: "lawnmower-labyrinth",
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

const layout = [
  "CCPPPPPPPPPF",
  "C.CPPPPBPPPP",
  "C.CCOOPPPPPP",
  "C.OOC.PBPPPP",
  "C...C.P.PPPP",
  "S..CCC...PP.",
  "C.CCC...CPP.",
  "C.....C..PP.",
];

const GRID_ROWS = layout.length;
const GRID_COLS = layout[0].length;
const MAX_PROXIMITY_DISTANCE = GRID_ROWS + GRID_COLS;
const STEP_COOLDOWN_MS = 220;
const DASH_COOLDOWN_MS = 2400;
const DASH_STUN_MS = 620;
const MOWER_STEP_MS = 420;
const START_DELAY_MS = 1600;
const SPRINKLER_CYCLE_MS = 5200;
const SPRINKLER_ACTIVE_MS = 2000;
const HOLD_COOLDOWN_MS = 300;

const SYMBOL_MAP = {
  C: { type: "cover", passable: true, cover: true },
  ".": { type: "open", passable: true, cover: false },
  O: { type: "object", passable: true, cover: true },
  P: { type: "sprinkler", passable: true, cover: false, sprinkler: true },
  S: { type: "start", passable: true, cover: true },
  F: { type: "safe", passable: true, cover: false },
  B: { type: "open", passable: true, cover: false, crumb: true },
};

const boardEl = document.getElementById("game-board");
const survivalTimeEl = document.getElementById("survival-time");
const sprinklerTimerEl = document.getElementById("sprinkler-timer");
const crumbCountEl = document.getElementById("crumb-count");
const proximityFillEl = document.getElementById("proximity-fill");
const proximityNoteEl = document.getElementById("proximity-note");
const sessionStatusEl = document.getElementById("session-status");
const startButton = document.getElementById("start-run");
const resetButton = document.getElementById("reset-run");
const dashButton = document.getElementById("dash-button");
const waitButton = document.getElementById("wait-button");
const controlButtons = Array.from(document.querySelectorAll("[data-move]"));
const clearLogButton = document.getElementById("clear-log");
const eventLog = document.getElementById("event-log");
const wrapUp = document.getElementById("wrap-up");
const wrapUpText = document.getElementById("wrap-up-text");
const replayButton = document.getElementById("replay-button");

boardEl.style.gridTemplateColumns = `repeat(${GRID_COLS}, 46px)`;

const tiles = [];
const sprinklerCells = [];
const crumbOrigins = new Set();
let startPosition = { x: 0, y: 0 };

for (let rowIndex = 0; rowIndex < GRID_ROWS; rowIndex += 1) {
  const rowTiles = [];
  const rowString = layout[rowIndex];
  for (let colIndex = 0; colIndex < GRID_COLS; colIndex += 1) {
    const symbol = rowString[colIndex];
    const definition = SYMBOL_MAP[symbol] ?? SYMBOL_MAP["."];
    const tile = {
      x: colIndex,
      y: rowIndex,
      type: definition.type,
      passable: definition.passable,
      cover: Boolean(definition.cover),
      sprinkler: Boolean(definition.sprinkler),
      crumb: Boolean(definition.crumb),
    };
    const cell = document.createElement("div");
    cell.className = "board-cell";
    cell.dataset.type = tile.type;
    cell.dataset.player = "false";
    cell.dataset.mower = "false";
    cell.dataset.crumb = tile.crumb ? "true" : "false";
    if (tile.sprinkler) {
      sprinklerCells.push(cell);
    }
    const playerMarker = document.createElement("div");
    playerMarker.className = "player-marker";
    const mowerMarker = document.createElement("div");
    mowerMarker.className = "mower-marker";
    const sprinklerOverlay = document.createElement("div");
    sprinklerOverlay.className = "sprinkler-overlay";
    cell.append(playerMarker, mowerMarker, sprinklerOverlay);
    boardEl.appendChild(cell);
    tile.cell = cell;
    rowTiles.push(tile);

    if (tile.type === "start") {
      startPosition = { x: colIndex, y: rowIndex };
    }
    if (tile.crumb) {
      crumbOrigins.add(keyFrom(colIndex, rowIndex));
    }
  }
  tiles.push(rowTiles);
}

const mowerRoute = buildMowerRoute();

const state = {
  running: false,
  ended: false,
  timeMs: 0,
  moveCooldown: 0,
  dashCooldown: 0,
  mowerDelay: START_DELAY_MS,
  mowerIndex: 0,
  mowerPos: { ...mowerRoute[0] },
  playerPos: { ...startPosition },
  sprinklerTimer: 0,
  collectedCrumbs: new Set(),
  lastDirection: { dx: 1, dy: 0 },
  pendingAnimation: null,
  lastFrame: null,
  mowerProgress: 0,
  logs: [],
};

placePlayer();
placeMower();
resetSprinklerCells(false);
updateHud();

startButton.addEventListener("click", () => {
  if (state.running) {
    setSessionStatus("Run already active. Keep moving!", "warning");
    return;
  }
  beginRun();
});

resetButton.addEventListener("click", () => {
  resetRun();
});

replayButton.addEventListener("click", () => {
  resetRun();
  beginRun();
});

dashButton.addEventListener("click", () => {
  performDash();
});

waitButton.addEventListener("click", () => {
  holdPosition();
});

controlButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const direction = button.dataset.move;
    const vector = getDirectionVector(direction);
    if (!vector) {
      return;
    }
    attemptMove(vector.dx, vector.dy);
  });
});

clearLogButton.addEventListener("click", () => {
  state.logs = [];
  renderLog();
  setSessionStatus("Log cleared. Sensors recalibrated.");
});

window.addEventListener("keydown", (event) => {
  if (event.defaultPrevented) {
    return;
  }
  const target = event.target;
  if (target && target.closest && target.closest("input, textarea, select")) {
    return;
  }
  const vector = getDirectionVector(event.key);
  if (vector) {
    event.preventDefault();
    attemptMove(vector.dx, vector.dy);
    return;
  }
  if (event.key === " ") {
    event.preventDefault();
    holdPosition();
  }
  if (event.key === "Shift") {
    event.preventDefault();
    performDash();
  }
});

function beginRun() {
  resetRun({ preserveLog: true });
  state.running = true;
  state.ended = false;
  state.timeMs = 0;
  state.moveCooldown = 0;
  state.dashCooldown = 0;
  state.mowerDelay = START_DELAY_MS;
  state.mowerIndex = 0;
  state.mowerPos = { ...mowerRoute[0] };
  state.sprinklerTimer = 0;
  state.mowerProgress = 0;
  state.lastFrame = null;
  state.pendingAnimation = requestAnimationFrame(step);
  setSessionStatus("Run live. Track the mower and move with intent.", "success");
  addLog("Engine ignites. First pass sweeping the top row.", "info");
  startButton.disabled = true;
  dashButton.disabled = false;
  waitButton.disabled = false;
  controlButtons.forEach((button) => {
    button.disabled = false;
  });
  wrapUp.hidden = true;
  placeMower();
}

function resetRun({ preserveLog = false } = {}) {
  if (state.pendingAnimation) {
    cancelAnimationFrame(state.pendingAnimation);
    state.pendingAnimation = null;
  }
  state.running = false;
  state.ended = false;
  state.timeMs = 0;
  state.moveCooldown = 0;
  state.dashCooldown = 0;
  state.mowerDelay = START_DELAY_MS;
  state.mowerIndex = 0;
  state.mowerPos = { ...mowerRoute[0] };
  state.playerPos = { ...startPosition };
  state.sprinklerTimer = 0;
  state.collectedCrumbs = new Set();
  state.lastDirection = { dx: 1, dy: 0 };
  state.mowerProgress = 0;
  state.lastFrame = null;
  if (!preserveLog) {
    state.logs = [];
    renderLog();
  }
  crumbOrigins.forEach((key) => {
    const [x, y] = key.split(",").map(Number);
    const tile = tiles[y]?.[x];
    if (tile) {
      tile.crumb = true;
      tile.cell.dataset.crumb = "true";
    }
  });
  startButton.disabled = false;
  dashButton.disabled = true;
  waitButton.disabled = true;
  controlButtons.forEach((button) => {
    button.disabled = true;
  });
  wrapUp.hidden = true;
  placePlayer();
  placeMower();
  resetSprinklerCells(false);
  updateHud();
  sprinklerTimerEl.textContent = "Dry window";
  setSessionStatus("Engine rumble on standby. Start the run to engage the mower.");
}

function step(timestamp) {
  if (!state.running) {
    return;
  }
  if (!state.lastFrame) {
    state.lastFrame = timestamp;
  }
  const delta = timestamp - state.lastFrame;
  state.lastFrame = timestamp;
  state.timeMs += delta;
  state.moveCooldown = Math.max(0, state.moveCooldown - delta);
  state.dashCooldown = Math.max(0, state.dashCooldown - delta);
  state.sprinklerTimer += delta;
  updateSprinklerCycle();
  updateMower(delta);
  updateHud();
  if (!state.ended) {
    checkHazards();
  }
  if (state.running) {
    state.pendingAnimation = requestAnimationFrame(step);
  }
}

function updateMower(delta) {
  if (state.mowerDelay > 0) {
    state.mowerDelay = Math.max(0, state.mowerDelay - delta);
    return;
  }
  state.mowerProgress = (state.mowerProgress ?? 0) + delta;
  if (state.mowerProgress < MOWER_STEP_MS) {
    return;
  }
  state.mowerProgress -= MOWER_STEP_MS;
  const previous = state.mowerPos;
  state.mowerIndex = (state.mowerIndex + 1) % mowerRoute.length;
  state.mowerPos = { ...mowerRoute[state.mowerIndex] };
  placeMower();
  if (previous.y !== state.mowerPos.y) {
    addLog(`Mower drops to row ${state.mowerPos.y + 1}.`, "warning");
  }
}

function updateSprinklerCycle() {
  const cycle = state.sprinklerTimer % SPRINKLER_CYCLE_MS;
  const active = cycle < SPRINKLER_ACTIVE_MS;
  resetSprinklerCells(active);
  if (active) {
    const remaining = Math.max(0, SPRINKLER_ACTIVE_MS - cycle);
    sprinklerTimerEl.textContent = `Impact! ${formatSeconds(remaining)}s`;
  } else {
    const until = Math.max(0, SPRINKLER_CYCLE_MS - cycle);
    sprinklerTimerEl.textContent = `Next burst ${formatSeconds(until)}s`;
  }
}

function resetSprinklerCells(active) {
  sprinklerCells.forEach((cell) => {
    cell.dataset.sprinklerActive = active ? "true" : "false";
  });
}

function updateHud() {
  survivalTimeEl.textContent = `${formatSeconds(state.timeMs)}s`;
  crumbCountEl.textContent = `${state.collectedCrumbs.size}`;
  updateProximity();
}

function updateProximity() {
  const distance = manhattan(state.playerPos, state.mowerPos);
  const ratio = 1 - Math.min(distance, MAX_PROXIMITY_DISTANCE) / MAX_PROXIMITY_DISTANCE;
  proximityFillEl.style.width = `${Math.max(8, Math.round(ratio * 100))}%`;
  if (distance >= 8) {
    proximityNoteEl.textContent = "Mower distant";
  } else if (distance >= 5) {
    proximityNoteEl.textContent = "Engine hum rising";
  } else if (distance >= 3) {
    proximityNoteEl.textContent = "Close pass incoming";
  } else if (distance >= 1) {
    proximityNoteEl.textContent = "Blades at your flank";
  } else {
    proximityNoteEl.textContent = "On top of you";
  }
}

function attemptMove(dx, dy) {
  if (!state.running) {
    setSessionStatus("Start the run before moving.", "warning");
    return;
  }
  if (state.moveCooldown > 0) {
    setSessionStatus("You need a beat before your next move.", "warning");
    return;
  }
  if (dx === 0 && dy === 0) {
    return;
  }
  const moved = performStep(dx, dy);
  if (moved) {
    state.moveCooldown = STEP_COOLDOWN_MS;
    state.lastDirection = { dx, dy };
  }
}

function performStep(dx, dy) {
  const next = { x: state.playerPos.x + dx, y: state.playerPos.y + dy };
  if (!isInside(next)) {
    setSessionStatus("That path leads off the lawn.", "warning");
    return false;
  }
  const tile = getTile(next);
  if (!tile.passable) {
    setSessionStatus("Obstacle blocks that route.", "warning");
    return false;
  }
  state.playerPos = next;
  placePlayer();
  postMoveEffects(tile);
  return true;
}

function performDash() {
  if (!state.running) {
    setSessionStatus("Start the run before dashing.", "warning");
    return;
  }
  if (state.dashCooldown > 0) {
    setSessionStatus("Dash cooling down. Keep to cover.", "warning");
    return;
  }
  const { dx, dy } = state.lastDirection;
  if (dx === 0 && dy === 0) {
    setSessionStatus("Pick a direction before dashing.", "warning");
    return;
  }
  let steps = 0;
  for (let i = 0; i < 2; i += 1) {
    if (!performStep(dx, dy)) {
      if (steps === 0) {
        addLog("Dash aborted against an obstacle.", "warning");
      }
      break;
    }
    steps += 1;
    if (state.ended) {
      break;
    }
  }
  if (steps > 0) {
    state.dashCooldown = DASH_COOLDOWN_MS;
    state.moveCooldown = DASH_STUN_MS;
    setSessionStatus(`Mad dash executed (${steps} tiles). Catch your breath!`, "success");
    addLog(`Mad dash covered ${steps} tile${steps === 1 ? "" : "s"}.`, "success");
  }
}

function holdPosition() {
  if (!state.running) {
    setSessionStatus("Start the run to hold position.", "warning");
    return;
  }
  state.moveCooldown = HOLD_COOLDOWN_MS;
  setSessionStatus("You hunker down and let the mower pass.", "success");
  addLog("Holding position—staying low behind cover.", "info");
  if (!getTile(state.playerPos).cover) {
    addLog("Exposed on open turf. Find cover soon!", "warning");
  }
}

function postMoveEffects(tile) {
  setSessionStatus(`Moved to row ${state.playerPos.y + 1}, column ${state.playerPos.x + 1}.`);
  if (tile.crumb && !state.collectedCrumbs.has(keyFrom(tile.x, tile.y))) {
    state.collectedCrumbs.add(keyFrom(tile.x, tile.y));
    tile.crumb = false;
    tile.cell.dataset.crumb = "false";
    addLog("Snagged a crumb bonus in the open!", "success");
  }
  if (tile.sprinkler && state.sprinklerTimer % SPRINKLER_CYCLE_MS < SPRINKLER_ACTIVE_MS) {
    failRun("Sprinkler droplet slams you off the turf.");
    return;
  }
  if (tile.type === "safe") {
    completeRun();
    return;
  }
  updateHud();
}

function checkHazards() {
  const currentTile = getTile(state.playerPos);
  if (state.playerPos.x === state.mowerPos.x && state.playerPos.y === state.mowerPos.y) {
    failRun("The mower barrels over you. SLICE!");
    return;
  }
  if (!currentTile.cover) {
    const direct = manhattan(state.playerPos, state.mowerPos);
    if (direct <= 1) {
      failRun("Caught in the open as the mower roars by.");
      return;
    }
    if (sharesLineOfSight(state.playerPos, state.mowerPos)) {
      failRun("Line of sight exposed you to the mower blades.");
      return;
    }
  }
  if (currentTile.sprinkler && state.sprinklerTimer % SPRINKLER_CYCLE_MS < SPRINKLER_ACTIVE_MS) {
    failRun("Sprinkler droplet slams you off the turf.");
  }
}

function completeRun() {
  if (!state.running || state.ended) {
    return;
  }
  state.running = false;
  state.ended = true;
  if (state.pendingAnimation) {
    cancelAnimationFrame(state.pendingAnimation);
    state.pendingAnimation = null;
  }
  state.lastFrame = null;
  startButton.disabled = false;
  dashButton.disabled = true;
  waitButton.disabled = true;
  controlButtons.forEach((button) => {
    button.disabled = true;
  });
  const finalTime = state.timeMs;
  const crumbBonus = state.collectedCrumbs.size * 5000;
  const scoreValue = Math.max(0, 1000000 - Math.round(finalTime)) + crumbBonus;
  const meta = {
    survivalTimeMs: Math.round(finalTime),
    crumbs: state.collectedCrumbs.size,
    display: `${formatSeconds(finalTime)}s · crumbs ${state.collectedCrumbs.size}`,
  };
  highScore.submit(scoreValue, meta);
  wrapUp.hidden = false;
  wrapUpText.textContent = `Safe Zone reached in ${formatSeconds(finalTime)}s with ${state.collectedCrumbs.size} crumb${
    state.collectedCrumbs.size === 1 ? "" : "s"
  } banked.`;
  setSessionStatus("Safe Zone reached!", "success");
  addLog("You dive beneath the patio flag—run secured!", "success");
  particleField?.trigger?.({ intensity: 0.7 });
}

function failRun(message) {
  if (!state.running || state.ended) {
    return;
  }
  state.running = false;
  state.ended = true;
  if (state.pendingAnimation) {
    cancelAnimationFrame(state.pendingAnimation);
    state.pendingAnimation = null;
  }
  state.lastFrame = null;
  startButton.disabled = false;
  dashButton.disabled = true;
  waitButton.disabled = true;
  controlButtons.forEach((button) => {
    button.disabled = true;
  });
  wrapUp.hidden = false;
  wrapUpText.textContent = `${message} Try again for a faster time.`;
  setSessionStatus(message, "danger");
  addLog(message, "danger");
  particleField?.trigger?.({ mode: "burst", intensity: 0.3 });
}

function placePlayer() {
  tiles.forEach((row) => {
    row.forEach((tile) => {
      tile.cell.dataset.player = tile.x === state.playerPos.x && tile.y === state.playerPos.y ? "true" : "false";
    });
  });
}

function placeMower() {
  tiles.forEach((row) => {
    row.forEach((tile) => {
      tile.cell.dataset.mower = tile.x === state.mowerPos.x && tile.y === state.mowerPos.y ? "true" : "false";
    });
  });
}

function getTile(position) {
  return tiles[position.y]?.[position.x];
}

function isInside(position) {
  return position.x >= 0 && position.x < GRID_COLS && position.y >= 0 && position.y < GRID_ROWS;
}

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function sharesLineOfSight(a, b) {
  if (a.x === b.x) {
    const start = Math.min(a.y, b.y) + 1;
    const end = Math.max(a.y, b.y);
    for (let y = start; y < end; y += 1) {
      if (tiles[y]?.[a.x]?.cover) {
        return false;
      }
    }
    return true;
  }
  if (a.y === b.y) {
    const start = Math.min(a.x, b.x) + 1;
    const end = Math.max(a.x, b.x);
    for (let x = start; x < end; x += 1) {
      if (tiles[a.y]?.[x]?.cover) {
        return false;
      }
    }
    return true;
  }
  return false;
}

function addLog(message, tone = "info") {
  state.logs.unshift({ message, tone, id: crypto.randomUUID() });
  renderLog();
}

function renderLog() {
  eventLog.innerHTML = "";
  state.logs.slice(0, 12).forEach((entry) => {
    const item = document.createElement("li");
    item.textContent = entry.message;
    item.dataset.tone = entry.tone;
    eventLog.appendChild(item);
  });
}

function setSessionStatus(message, tone = "info") {
  sessionStatusEl.textContent = message;
  if (tone === "info") {
    sessionStatusEl.removeAttribute("data-tone");
  } else {
    sessionStatusEl.dataset.tone = tone;
  }
}

function buildMowerRoute() {
  const route = [];
  for (let y = 0; y < GRID_ROWS; y += 1) {
    if (y % 2 === 0) {
      for (let x = 0; x < GRID_COLS; x += 1) {
        route.push({ x, y });
      }
    } else {
      for (let x = GRID_COLS - 1; x >= 0; x -= 1) {
        route.push({ x, y });
      }
    }
  }
  return route;
}

function getDirectionVector(key) {
  switch (key) {
    case "ArrowUp":
    case "up":
      return { dx: 0, dy: -1 };
    case "ArrowDown":
    case "down":
      return { dx: 0, dy: 1 };
    case "ArrowLeft":
    case "left":
      return { dx: -1, dy: 0 };
    case "ArrowRight":
    case "right":
      return { dx: 1, dy: 0 };
    default:
      return null;
  }
}

function formatSeconds(milliseconds) {
  const seconds = Math.max(0, milliseconds) / 1000;
  return seconds.toFixed(2);
}

function keyFrom(x, y) {
  return `${x},${y}`;
}

resetRun();
