import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { mountParticleField } from "../particles.js";
import { autoEnhanceFeedback } from "../feedback.js";
import { createWrapUpDialog } from "../wrap-up-dialog.js";

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

const audio = createAudioController();

const PROXIMITY_NOTES = {
  calm: "Mower distant",
  alert: "Engine hum rising",
  danger: "Close pass incoming",
  critical: "Blades at your flank",
  impact: "On top of you",
};

const TRAIL_LIMIT = 5;

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
const wrapUpClose = document.getElementById("wrap-up-close");

const wrapUpDialog = createWrapUpDialog(wrapUp);

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
    cell.dataset.trail = "0";
    cell.dataset.sweep = "none";
    cell.dataset.danger = "false";
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
  trail: [],
  sprinklerActive: false,
  lastProximityStage: "calm",
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
  wrapUpDialog.close({ restoreFocus: false });
  resetRun();
  beginRun();
});

if (wrapUpClose) {
  wrapUpClose.addEventListener("click", () => {
    wrapUpDialog.close();
    setSessionStatus("Wrap-up dismissed. Plot your next route when ready.", "info");
  });
}

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
  audio.play("start");
  startButton.disabled = true;
  dashButton.disabled = false;
  waitButton.disabled = false;
  controlButtons.forEach((button) => {
    button.disabled = false;
  });
  wrapUpDialog.close({ restoreFocus: false });
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
  state.trail = [];
  state.sprinklerActive = false;
  state.lastProximityStage = "calm";
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
  wrapUpDialog.close({ restoreFocus: false });
  placePlayer();
  placeMower();
  resetSprinklerCells(false);
  recordTrail(state.playerPos);
  boardEl.dataset.sprinkler = "idle";
  delete boardEl.dataset.outcome;
  setDangerStage("calm", { force: true });
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
  if (active !== state.sprinklerActive) {
    state.sprinklerActive = active;
    if (active) {
      audio.play("sprinkler");
      pulseBoard("sprinkler-wave");
    }
  }
  boardEl.dataset.sprinkler = active ? "active" : "idle";
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
  let stage = "calm";
  if (distance < 1) {
    stage = "impact";
  } else if (distance < 3) {
    stage = "critical";
  } else if (distance < 5) {
    stage = "danger";
  } else if (distance < 8) {
    stage = "alert";
  }
  proximityNoteEl.textContent = PROXIMITY_NOTES[stage] ?? PROXIMITY_NOTES.calm;
  setDangerStage(stage);
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

function performStep(dx, dy, options = {}) {
  const from = { ...state.playerPos };
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
  recordTrail(from);
  postMoveEffects(tile);
  if (!state.ended && !options.silent) {
    audio.play("step");
  }
  if (typeof options.onStepComplete === "function") {
    options.onStepComplete(from, tile);
  }
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
  const dashTrail = [];
  for (let i = 0; i < 2; i += 1) {
    const moved = performStep(dx, dy, {
      silent: true,
      onStepComplete(from) {
        dashTrail.push({ ...from });
      },
    });
    if (!moved) {
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
    dashTrail.forEach((position, index) => {
      const dashTile = getTile(position);
      if (dashTile) {
        pulseCell(dashTile.cell, index === 0 ? "dash-echo-strong" : "dash-echo");
      }
    });
    particleField?.emitSparkle?.(0.6 + steps * 0.25);
    audio.play("dash");
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
  audio.play("hold");
  if (!getTile(state.playerPos).cover) {
    addLog("Exposed on open turf. Find cover soon!", "warning");
  }
}

function postMoveEffects(tile) {
  setSessionStatus(`Moved to row ${state.playerPos.y + 1}, column ${state.playerPos.x + 1}.`);
  pulseCell(tile?.cell, "cell-step");
  if (tile.crumb && !state.collectedCrumbs.has(keyFrom(tile.x, tile.y))) {
    state.collectedCrumbs.add(keyFrom(tile.x, tile.y));
    tile.crumb = false;
    tile.cell.dataset.crumb = "false";
    addLog("Snagged a crumb bonus in the open!", "success");
    pulseCell(tile.cell, "crumb-pop");
    particleField?.emitSparkle?.(0.9);
    audio.play("crumb");
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
  wrapUpDialog.open({ focus: replayButton });
  wrapUpText.textContent = `Safe Zone reached in ${formatSeconds(finalTime)}s with ${state.collectedCrumbs.size} crumb${
    state.collectedCrumbs.size === 1 ? "" : "s"
  } banked.`;
  setSessionStatus("Safe Zone reached!", "success");
  addLog("You dive beneath the patio flag—run secured!", "success");
  particleField?.emitBurst?.(1.15);
  particleField?.emitSparkle?.(1.1);
  boardEl.dataset.outcome = "success";
  pulseBoard("board-success");
  audio.play("success");
  setDangerStage("calm", { force: true });
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
  wrapUpDialog.open({ focus: replayButton });
  wrapUpText.textContent = `${message} Try again for a faster time.`;
  setSessionStatus(message, "danger");
  addLog(message, "danger");
  particleField?.emitBurst?.(0.45);
  boardEl.dataset.outcome = "fail";
  pulseBoard("board-fail");
  audio.play("fail");
  setDangerStage("impact", { force: true });
}

function placePlayer() {
  tiles.forEach((row) => {
    row.forEach((tile) => {
      tile.cell.dataset.player = tile.x === state.playerPos.x && tile.y === state.playerPos.y ? "true" : "false";
    });
  });
  updateThreatHighlights();
}

function placeMower() {
  const nextIndex = (state.mowerIndex + 1) % mowerRoute.length;
  const nextPos = mowerRoute[nextIndex];
  const previewIndex = (state.mowerIndex + 2) % mowerRoute.length;
  const previewPos = mowerRoute[previewIndex];
  tiles.forEach((row) => {
    row.forEach((tile) => {
      const isCurrent = tile.x === state.mowerPos.x && tile.y === state.mowerPos.y;
      const isNext = tile.x === nextPos.x && tile.y === nextPos.y;
      const isPreview = tile.x === previewPos.x && tile.y === previewPos.y;
      tile.cell.dataset.mower = isCurrent ? "true" : "false";
      tile.cell.dataset.sweep = isCurrent ? "current" : isNext ? "next" : isPreview ? "preview" : "none";
    });
  });
  updateThreatHighlights();
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

function setDangerStage(stage, { force = false } = {}) {
  if (!force && state.lastProximityStage === stage) {
    return;
  }
  state.lastProximityStage = stage;
  boardEl.dataset.dangerLevel = stage;
  if (force) {
    return;
  }
  if (stage === "danger") {
    audio.play("warning");
  } else if (stage === "critical" || stage === "impact") {
    audio.play("threat");
  }
}

function updateThreatHighlights() {
  const dangerCells = new Set();
  const playerTile = getTile(state.playerPos);
  if (playerTile && !playerTile.cover) {
    if (state.playerPos.x === state.mowerPos.x) {
      const start = Math.min(state.playerPos.y, state.mowerPos.y);
      const end = Math.max(state.playerPos.y, state.mowerPos.y);
      for (let y = start; y <= end; y += 1) {
        dangerCells.add(keyFrom(state.playerPos.x, y));
      }
    } else if (state.playerPos.y === state.mowerPos.y) {
      const start = Math.min(state.playerPos.x, state.mowerPos.x);
      const end = Math.max(state.playerPos.x, state.mowerPos.x);
      for (let x = start; x <= end; x += 1) {
        dangerCells.add(keyFrom(x, state.playerPos.y));
      }
    }
  }
  tiles.forEach((row) => {
    row.forEach((tile) => {
      const key = keyFrom(tile.x, tile.y);
      tile.cell.dataset.danger = dangerCells.has(key) ? "true" : "false";
    });
  });
}

function recordTrail(position) {
  if (!position) {
    return;
  }
  const key = keyFrom(position.x, position.y);
  state.trail = state.trail.filter((entry) => keyFrom(entry.x, entry.y) !== key);
  state.trail.unshift({ ...position });
  if (state.trail.length > TRAIL_LIMIT) {
    state.trail.length = TRAIL_LIMIT;
  }
  updateTrailMarkers();
}

function updateTrailMarkers() {
  const map = new Map();
  state.trail.forEach((position, index) => {
    map.set(keyFrom(position.x, position.y), index + 1);
  });
  tiles.forEach((row) => {
    row.forEach((tile) => {
      const level = map.get(keyFrom(tile.x, tile.y));
      tile.cell.dataset.trail = level ? String(level) : "0";
    });
  });
}

function pulseCell(cell, className) {
  if (!cell) {
    return;
  }
  cell.classList.remove(className);
  void cell.offsetWidth;
  cell.classList.add(className);
  cell.addEventListener(
    "animationend",
    () => {
      cell.classList.remove(className);
    },
    { once: true },
  );
}

function pulseBoard(className) {
  boardEl.classList.remove(className);
  void boardEl.offsetWidth;
  boardEl.classList.add(className);
  boardEl.addEventListener(
    "animationend",
    () => {
      boardEl.classList.remove(className);
    },
    { once: true },
  );
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

function createAudioController() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  let context = null;
  let masterGain = null;
  let noiseBuffer = null;

  function ensureContext() {
    if (!AudioContextClass) {
      return null;
    }
    if (!context) {
      context = new AudioContextClass();
      masterGain = context.createGain();
      masterGain.gain.value = 0.24;
      masterGain.connect(context.destination);
    }
    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }
    return context;
  }

  function getNoiseBuffer(ctx) {
    if (noiseBuffer) {
      return noiseBuffer;
    }
    const length = Math.round(ctx.sampleRate * 1.5);
    noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
  }

  function playTone(ctx, frequency, options = {}) {
    if (!ctx || !masterGain) {
      return;
    }
    const oscillator = ctx.createOscillator();
    oscillator.type = options.type ?? "sine";
    const startTime = options.startTime ?? ctx.currentTime;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    if (typeof options.endFrequency === "number") {
      const endTime = startTime + (options.attack ?? 0.01) + (options.hold ?? 0.08);
      oscillator.frequency.linearRampToValueAtTime(options.endFrequency, endTime);
    }
    if (typeof options.detune === "number") {
      oscillator.detune.setValueAtTime(options.detune, startTime);
    }
    const gainNode = ctx.createGain();
    const attack = options.attack ?? 0.015;
    const hold = options.hold ?? 0.08;
    const release = options.release ?? 0.18;
    const sustain = options.sustain ?? 0.6;
    const peak = options.gain ?? 0.2;
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(peak, startTime + attack);
    gainNode.gain.linearRampToValueAtTime(peak * sustain, startTime + attack + hold);
    gainNode.gain.linearRampToValueAtTime(0, startTime + attack + hold + release);
    oscillator.connect(gainNode).connect(masterGain);
    oscillator.start(startTime);
    oscillator.stop(startTime + attack + hold + release + 0.05);
  }

  function playNoise(ctx, options = {}) {
    if (!ctx || !masterGain) {
      return;
    }
    const bufferSource = ctx.createBufferSource();
    bufferSource.buffer = getNoiseBuffer(ctx);
    bufferSource.loop = true;
    const gainNode = ctx.createGain();
    const startTime = options.startTime ?? ctx.currentTime;
    const attack = options.attack ?? 0.02;
    const hold = options.hold ?? 0.05;
    const release = options.release ?? 0.18;
    const peak = options.gain ?? 0.15;
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(peak, startTime + attack);
    gainNode.gain.linearRampToValueAtTime(peak * 0.6, startTime + attack + hold);
    gainNode.gain.linearRampToValueAtTime(0, startTime + attack + hold + release);
    bufferSource.connect(gainNode).connect(masterGain);
    bufferSource.start(startTime);
    bufferSource.stop(startTime + attack + hold + release + 0.05);
  }

  function play(type) {
    const ctx = ensureContext();
    if (!ctx || !masterGain) {
      return;
    }
    const now = ctx.currentTime + 0.02;
    switch (type) {
      case "start": {
        playTone(ctx, 420, { type: "triangle", gain: 0.16, attack: 0.02, hold: 0.1, release: 0.32, startTime: now });
        playTone(ctx, 640, { type: "sine", gain: 0.12, attack: 0.02, hold: 0.1, release: 0.3, startTime: now + 0.08 });
        playTone(ctx, 860, { type: "triangle", gain: 0.12, attack: 0.02, hold: 0.08, release: 0.28, startTime: now + 0.16 });
        break;
      }
      case "step": {
        playTone(ctx, 520, { type: "triangle", gain: 0.12, attack: 0.012, hold: 0.05, release: 0.12, startTime: now });
        break;
      }
      case "dash": {
        playTone(ctx, 300, {
          type: "sawtooth",
          gain: 0.18,
          attack: 0.01,
          hold: 0.12,
          release: 0.22,
          endFrequency: 560,
          startTime: now,
        });
        playTone(ctx, 760, {
          type: "sine",
          gain: 0.12,
          attack: 0.015,
          hold: 0.08,
          release: 0.25,
          startTime: now + 0.06,
          endFrequency: 1020,
        });
        break;
      }
      case "crumb": {
        playTone(ctx, 860, {
          type: "triangle",
          gain: 0.16,
          attack: 0.015,
          hold: 0.08,
          release: 0.34,
          startTime: now,
          endFrequency: 1020,
        });
        playTone(ctx, 1260, {
          type: "sine",
          gain: 0.11,
          attack: 0.02,
          hold: 0.06,
          release: 0.32,
          startTime: now + 0.05,
          endFrequency: 1500,
        });
        break;
      }
      case "warning": {
        playTone(ctx, 460, { type: "square", gain: 0.12, attack: 0.01, hold: 0.05, release: 0.18, startTime: now });
        break;
      }
      case "threat": {
        playTone(ctx, 320, {
          type: "square",
          gain: 0.18,
          attack: 0.008,
          hold: 0.08,
          release: 0.24,
          startTime: now,
          endFrequency: 260,
        });
        playTone(ctx, 620, {
          type: "triangle",
          gain: 0.1,
          attack: 0.012,
          hold: 0.06,
          release: 0.2,
          startTime: now + 0.05,
        });
        break;
      }
      case "hold": {
        playTone(ctx, 220, { type: "sine", gain: 0.12, attack: 0.02, hold: 0.1, release: 0.22, startTime: now });
        break;
      }
      case "sprinkler": {
        playNoise(ctx, { gain: 0.14, attack: 0.02, hold: 0.08, release: 0.22, startTime: now });
        playTone(ctx, 980, {
          type: "sine",
          gain: 0.09,
          attack: 0.015,
          hold: 0.05,
          release: 0.24,
          startTime: now + 0.04,
          endFrequency: 720,
        });
        break;
      }
      case "success": {
        playTone(ctx, 520, { type: "triangle", gain: 0.18, attack: 0.018, hold: 0.18, release: 0.4, startTime: now });
        playTone(ctx, 780, { type: "sine", gain: 0.14, attack: 0.02, hold: 0.22, release: 0.45, startTime: now + 0.08 });
        playTone(ctx, 1040, { type: "triangle", gain: 0.12, attack: 0.02, hold: 0.18, release: 0.4, startTime: now + 0.18 });
        break;
      }
      case "fail": {
        playTone(ctx, 380, {
          type: "sawtooth",
          gain: 0.22,
          attack: 0.012,
          hold: 0.12,
          release: 0.5,
          startTime: now,
          endFrequency: 140,
        });
        playNoise(ctx, { gain: 0.12, attack: 0.015, hold: 0.12, release: 0.45, startTime: now + 0.02 });
        break;
      }
      default:
        break;
    }
  }

  return { play };
}

resetRun();
