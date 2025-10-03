import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { mountParticleField } from "../particles.js";
import { autoEnhanceFeedback } from "../feedback.js";

const particleField = mountParticleField({
  effects: {
    palette: ["#38bdf8", "#fbbf24", "#f97316", "#f472b6"],
    ambientDensity: 0.55,
    accentTrail: 0.45,
  },
});

const scoreConfig = getScoreConfig("tailing-the-trash");
const highScore = initHighScoreBanner({
  gameId: "tailing-the-trash",
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

autoEnhanceFeedback();

const BOARD_ROWS = 9;
const BOARD_COLS = 13;
const MAX_SUSPICION = 100;
const TRAILING_DISTANCE = 5;
const SUSPECT_STEP_MS = 1400;
const MESS_TICK_MS = 150;
const BASE_MESS_INTERVAL = 6800;
const LONG_LEASH_MESS_CHANCE = 0.35;
const LONG_LEASH_MESS_COOLDOWN = 4200;
const CLEAN_WINDOW_MS = 5200;
const CLEAN_WINDOW_FAST = 3600;
const MOVE_COOLDOWN_SHORT = 420;
const MOVE_COOLDOWN_LONG = 220;
const LONG_LEASH_DISTANCE = 4;
const SHORT_LEASH_DISTANCE = 1;
const BASE_SUSPICION_PER_SECOND = 0.9;
const CONE_EDGE_PENALTY = 4;
const CONE_CORE_PENALTY = 10;
const MESS_FAIL_PENALTY = 18;
const CLEAN_SUCCESS_BONUS = 4;
const START_POS_DETECTIVE = { row: 7, col: 2 };
const START_POS_DOG = { row: 7, col: 1 };

const SUSPECT_PATH = [
  { row: 1, col: 2, facing: "east" },
  { row: 1, col: 3, facing: "east" },
  { row: 1, col: 4, facing: "east" },
  { row: 1, col: 5, facing: "east", checkpoint: true },
  { row: 1, col: 6, facing: "east" },
  { row: 1, col: 7, facing: "east" },
  { row: 1, col: 8, facing: "south" },
  { row: 2, col: 8, facing: "south" },
  { row: 3, col: 8, facing: "south", checkpoint: true },
  { row: 4, col: 8, facing: "south" },
  { row: 5, col: 8, facing: "south" },
  { row: 6, col: 8, facing: "east" },
  { row: 6, col: 9, facing: "east" },
  { row: 6, col: 10, facing: "south" },
  { row: 7, col: 10, facing: "south", checkpoint: true },
  { row: 8, col: 10, facing: "west" },
  { row: 8, col: 9, facing: "west" },
  { row: 8, col: 8, facing: "west" },
  { row: 8, col: 7, facing: "west" },
  { row: 8, col: 6, facing: "north" },
  { row: 7, col: 6, facing: "north" },
  { row: 6, col: 6, facing: "north" },
  { row: 5, col: 6, facing: "north", checkpoint: true },
  { row: 4, col: 6, facing: "west" },
  { row: 4, col: 5, facing: "west" },
  { row: 4, col: 4, facing: "west" },
  { row: 4, col: 3, facing: "north" },
  { row: 3, col: 3, facing: "north" },
  { row: 2, col: 3, facing: "north" },
  { row: 1, col: 3, facing: "west" },
  { row: 1, col: 2, facing: "west" },
  { row: 1, col: 1, facing: "south", checkpoint: true },
  { row: 2, col: 1, facing: "south" },
  { row: 3, col: 1, facing: "south" },
  { row: 4, col: 1, facing: "east" },
  { row: 4, col: 2, facing: "east" },
  { row: 4, col: 3, facing: "east" },
  { row: 4, col: 4, facing: "south" },
  { row: 5, col: 4, facing: "south", checkpoint: true },
  { row: 6, col: 4, facing: "south" },
  { row: 7, col: 4, facing: "east" },
  { row: 7, col: 5, facing: "east" },
  { row: 7, col: 6, facing: "east" },
  { row: 7, col: 7, facing: "east" },
  { row: 7, col: 8, facing: "east", checkpoint: true },
  { row: 7, col: 9, facing: "east" },
  { row: 7, col: 10, facing: "east" },
  { row: 7, col: 11, facing: "north" },
  { row: 6, col: 11, facing: "north" },
  { row: 5, col: 11, facing: "north" },
  { row: 4, col: 11, facing: "west" },
  { row: 4, col: 10, facing: "west" },
  { row: 4, col: 9, facing: "west", checkpoint: true },
  { row: 4, col: 8, facing: "west" },
  { row: 4, col: 7, facing: "west" },
  { row: 4, col: 6, facing: "west" },
  { row: 4, col: 5, facing: "west" },
  { row: 4, col: 4, facing: "west" },
  { row: 4, col: 3, facing: "west" },
  { row: 4, col: 2, facing: "west" },
  { row: 4, col: 1, facing: "west" },
];

const CHECKPOINT_COUNT = SUSPECT_PATH.filter((step) => step.checkpoint).length;

const boardElement = document.getElementById("city-grid");
const missionStatus = document.getElementById("mission-status");
const evidenceElement = document.getElementById("evidence-count");
const suspicionValue = document.getElementById("suspicion-value");
const suspicionMeter = document.getElementById("suspicion-meter");
const suspicionFill = document.getElementById("suspicion-fill");
const messQueueElement = document.getElementById("mess-queue");
const leashModeElement = document.getElementById("leash-mode");
const startButton = document.getElementById("start-button");
const toggleLeashButton = document.getElementById("toggle-leash");
const abortButton = document.getElementById("abort-button");
const eventFeed = document.getElementById("event-feed");
const wrapupElement = document.getElementById("wrapup");
const wrapupSubtitle = document.getElementById("wrapup-subtitle");
const wrapupEvidence = document.getElementById("wrapup-evidence");
const wrapupPeak = document.getElementById("wrapup-peak");
const wrapupBonus = document.getElementById("wrapup-bonus");
const wrapupMap = document.getElementById("wrapup-map");
const wrapupRematch = document.getElementById("wrapup-rematch");
const wrapupClose = document.getElementById("wrapup-close");
const simulatorHelp = document.getElementById("simulator-help");
const wrapupDialog = document.querySelector(".wrapup-dialog");

const cellElements = [];

const state = {
  active: false,
  boardLocked: false,
  suspectIndex: 0,
  detective: { ...START_POS_DETECTIVE },
  dog: { ...START_POS_DOG },
  leashMode: "short",
  suspicion: 0,
  suspicionPeak: 0,
  evidence: 0,
  messes: [],
  messCooldownUntil: 0,
  nextScheduledMess: 0,
  messCounter: 0,
  suspicionEvents: [],
  cleanupEvents: [],
  detectiveTrail: [],
  suspectTrail: [],
  timers: {
    suspect: null,
    mess: null,
  },
  lastMoveAt: 0,
  moveCooldown: MOVE_COOLDOWN_SHORT,
  audioContext: null,
  audioReady: false,
  lastVisionKey: null,
  lastVisionAt: 0,
};

initializeBoard();
renderBoard();
updateSuspicionUI();
updateMissionStatus("Hit Start Stakeout to begin shadowing the suspect.");
updateMessCount();
updateLeashUI();

startButton.addEventListener("click", () => {
  if (state.active) {
    return;
  }
  startStakeout();
});

toggleLeashButton.addEventListener("click", () => {
  if (!state.active) {
    toggleLeashMode();
    return;
  }
  toggleLeashMode();
  logEvent(
    state.leashMode === "long"
      ? "Long leash engaged. Cover more ground, but expect chaos."
      : "Short leash set. Pace slows, but Hooch stays tidy.",
    "warning",
  );
});

abortButton.addEventListener("click", () => {
  if (!state.active) {
    return;
  }
  endStakeout(false, "Stakeout aborted. File it as a dry run.");
});

wrapupRematch.addEventListener("click", () => {
  hideWrapup();
  startStakeout();
});

wrapupClose.addEventListener("click", () => {
  hideWrapup();
});

document.addEventListener("keydown", (event) => {
  if (event.defaultPrevented) {
    return;
  }
  const key = event.key.toLowerCase();
  if (key === "escape") {
    if (state.active) {
      endStakeout(false, "Stakeout aborted. File it as a dry run.");
    }
    return;
  }
  if (key === "l") {
    toggleLeashButton.click();
    return;
  }
  if (!state.active || state.boardLocked) {
    return;
  }
  if (["w", "arrowup"].includes(key)) {
    handleMove({ row: -1, col: 0 });
    event.preventDefault();
  } else if (["s", "arrowdown"].includes(key)) {
    handleMove({ row: 1, col: 0 });
    event.preventDefault();
  } else if (["a", "arrowleft"].includes(key)) {
    handleMove({ row: 0, col: -1 });
    event.preventDefault();
  } else if (["d", "arrowright"].includes(key)) {
    handleMove({ row: 0, col: 1 });
    event.preventDefault();
  } else if (key === " ") {
    attemptCleanup();
    event.preventDefault();
  }
});

Array.from(document.querySelectorAll(".pad-button")).forEach((button) => {
  button.addEventListener("click", () => {
    if (!state.active || state.boardLocked) {
      return;
    }
    const direction = button.dataset.direction;
    if (direction === "up") {
      handleMove({ row: -1, col: 0 });
    } else if (direction === "down") {
      handleMove({ row: 1, col: 0 });
    } else if (direction === "left") {
      handleMove({ row: 0, col: -1 });
    } else if (direction === "right") {
      handleMove({ row: 0, col: 1 });
    }
  });
});

function initializeBoard() {
  boardElement.innerHTML = "";
  cellElements.length = 0;
  for (let row = 0; row < BOARD_ROWS; row += 1) {
    const rowElements = [];
    for (let col = 0; col < BOARD_COLS; col += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "grid-cell";
      button.dataset.row = String(row);
      button.dataset.col = String(col);
      button.setAttribute("role", "gridcell");
      button.setAttribute("aria-label", `Row ${row + 1}, column ${col + 1}`);
      button.addEventListener("click", () => {
        if (!state.active) {
          return;
        }
        if (state.detective.row === row && state.detective.col === col) {
          attemptCleanup();
        }
      });
      boardElement.append(button);
      rowElements.push(button);
    }
    cellElements.push(rowElements);
  }
}

function startStakeout() {
  resetState();
  state.active = true;
  state.boardLocked = false;
  state.detectiveTrail.push({ ...state.detective });
  simulatorHelp.textContent =
    "Stay behind the suspect, clean every mess, and bank checkpoints before suspicion overloads.";
  logEvent("Stakeout live. Keep five tiles or less behind the mark.", "success");
  updateMissionStatus("Stay close and keep the cone from lighting up.", "warning");
  renderBoard();
  tickSuspect(true);
  state.timers.suspect = window.setInterval(() => tickSuspect(false), SUSPECT_STEP_MS);
  state.timers.mess = window.setInterval(() => processTimers(), MESS_TICK_MS);
}

function resetState() {
  clearTimers();
  state.active = false;
  state.boardLocked = false;
  state.suspectIndex = 0;
  state.detective = { ...START_POS_DETECTIVE };
  state.dog = { ...START_POS_DOG };
  state.leashMode = toggleLeashButton.getAttribute("aria-pressed") === "true" ? "long" : "short";
  state.moveCooldown = state.leashMode === "long" ? MOVE_COOLDOWN_LONG : MOVE_COOLDOWN_SHORT;
  state.suspicion = 0;
  state.suspicionPeak = 0;
  state.evidence = 0;
  state.messes = [];
  state.messCounter = 0;
  state.suspicionEvents = [];
  state.cleanupEvents = [];
  state.detectiveTrail = [];
  state.suspectTrail = [];
  state.nextScheduledMess = performance.now() + BASE_MESS_INTERVAL;
  state.messCooldownUntil = 0;
  state.lastMoveAt = 0;
  state.lastVisionKey = null;
  state.lastVisionAt = 0;
  updateMessCount();
  updateSuspicionUI();
  updateEvidence();
  updateLeashUI();
  renderBoard();
}

function clearTimers() {
  if (state.timers.suspect) {
    window.clearInterval(state.timers.suspect);
    state.timers.suspect = null;
  }
  if (state.timers.mess) {
    window.clearInterval(state.timers.mess);
    state.timers.mess = null;
  }
}

function tickSuspect(initial) {
  if (!initial) {
    state.suspectIndex += 1;
    if (state.suspectIndex >= SUSPECT_PATH.length) {
      endStakeout(true, "Suspect loop completed. Case file secured.");
      return;
    }
  }
  const step = SUSPECT_PATH[state.suspectIndex];
  state.suspectTrail.push({ row: step.row, col: step.col });
  maybeAwardEvidence(step);
  maybeSpawnRandomMess();
  renderBoard();
}

function maybeAwardEvidence(step) {
  if (!step.checkpoint) {
    return;
  }
  const distance = manhattanDistance(state.detective, step);
  if (distance <= TRAILING_DISTANCE && state.suspicion < MAX_SUSPICION) {
    state.evidence += 1;
    updateEvidence();
    playCue("checkpoint");
    logEvent(
      `Checkpoint logged at Pier ${String.fromCharCode(65 + state.evidence)}. Evidence total ${state.evidence}/${CHECKPOINT_COUNT}.`,
      "success",
    );
    updateMissionStatus("Checkpoint cleared. Keep the tail tight.", "success");
  } else {
    logEvent("Checkpoint missed—too distant to capture the exchange.", "warning");
    increaseSuspicion(6, {
      reason: "Missed checkpoint",
      location: { ...step },
    });
  }
}

function maybeSpawnRandomMess() {
  const now = performance.now();
  if (state.messes.length === 0 && now >= state.nextScheduledMess) {
    spawnMess({ forced: true });
    return;
  }
  if (state.leashMode === "long" && now >= state.messCooldownUntil) {
    if (Math.random() < LONG_LEASH_MESS_CHANCE) {
      spawnMess({ forced: false, longLeash: true });
      state.messCooldownUntil = now + LONG_LEASH_MESS_COOLDOWN;
    }
  }
}

function spawnMess({ forced = false, longLeash = false } = {}) {
  const messId = `mess-${state.messCounter += 1}`;
  const location = { row: state.dog.row, col: state.dog.col };
  const timer = longLeash ? CLEAN_WINDOW_FAST : CLEAN_WINDOW_MS;
  const expiresAt = performance.now() + timer;
  state.messes.push({ id: messId, ...location, expiresAt, longLeash });
  updateMessCount();
  const tone = longLeash ? "alert" : "warning";
  const message = longLeash
    ? "Long leash lurch—Hooch toppled a barrel!"
    : forced
      ? "Hooch scattered trash cans. Clean it before the guards turn."
      : "Hooch tracked muddy prints across the pier.";
  logEvent(message, tone);
  playCue("mess");
  updateMissionStatus("Mess active—clean it before suspicion spreads.", "warning");
  state.nextScheduledMess = performance.now() + BASE_MESS_INTERVAL;
}

function updateEvidence() {
  evidenceElement.textContent = `${state.evidence}`;
}

function updateSuspicionUI() {
  const pct = Math.min(100, Math.round((state.suspicion / MAX_SUSPICION) * 100));
  suspicionValue.textContent = `${pct}%`;
  suspicionMeter.setAttribute("aria-valuenow", String(pct));
  suspicionFill.style.width = `${pct}%`;
  if (pct >= 80) {
    suspicionMeter.classList.add("is-critical");
  } else {
    suspicionMeter.classList.remove("is-critical");
  }
}

function updateMessCount() {
  const count = state.messes.length;
  messQueueElement.textContent = count === 1 ? "1 active" : `${count} active`;
}

function updateLeashUI() {
  leashModeElement.textContent = state.leashMode === "long" ? "Long" : "Short";
  toggleLeashButton.textContent = state.leashMode === "long" ? "Short Leash" : "Long Leash";
  toggleLeashButton.setAttribute("aria-pressed", state.leashMode === "long" ? "true" : "false");
}

function toggleLeashMode() {
  state.leashMode = state.leashMode === "long" ? "short" : "long";
  state.moveCooldown = state.leashMode === "long" ? MOVE_COOLDOWN_LONG : MOVE_COOLDOWN_SHORT;
  updateLeashUI();
}

function handleMove(vector) {
  const now = performance.now();
  if (now - state.lastMoveAt < state.moveCooldown) {
    return;
  }
  const target = {
    row: clamp(state.detective.row + vector.row, 0, BOARD_ROWS - 1),
    col: clamp(state.detective.col + vector.col, 0, BOARD_COLS - 1),
  };
  if (target.row === state.detective.row && target.col === state.detective.col) {
    return;
  }
  state.detective = target;
  leashDog();
  state.detectiveTrail.push({ row: target.row, col: target.col });
  state.lastMoveAt = now;
  renderBoard();
  attemptCleanup();
}

function leashDog() {
  const limit = state.leashMode === "long" ? LONG_LEASH_DISTANCE : SHORT_LEASH_DISTANCE;
  const distance = manhattanDistance(state.detective, state.dog);
  if (distance <= limit) {
    return;
  }
  const steps = distance - limit;
  for (let step = 0; step < steps; step += 1) {
    const rowDiff = state.detective.row - state.dog.row;
    const colDiff = state.detective.col - state.dog.col;
    if (Math.abs(rowDiff) >= Math.abs(colDiff)) {
      state.dog.row += Math.sign(rowDiff);
    } else {
      state.dog.col += Math.sign(colDiff);
    }
  }
}

function renderBoard() {
  const suspectStep = SUSPECT_PATH[state.suspectIndex];
  const visionCells = computeVisionCells(suspectStep);
  boardElement.classList.toggle("is-alert", false);
  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      const cell = cellElements[row][col];
      cell.className = "grid-cell";
      const isPath = SUSPECT_PATH.some((step) => step.row === row && step.col === col);
      if (isPath) {
        cell.classList.add("is-path");
      }
      const checkpoint = SUSPECT_PATH.find((step) => step.row === row && step.col === col && step.checkpoint);
      if (checkpoint) {
        cell.classList.add("is-checkpoint");
      }
      const vision = visionCells.find((item) => item.row === row && item.col === col);
      if (vision) {
        cell.classList.add(vision.intensity === "edge" ? "vision-edge" : "vision-hot");
      }
      const hasMess = state.messes.some((mess) => mess.row === row && mess.col === col);
      if (hasMess) {
        cell.classList.add("has-mess");
      }
      if (state.detective.row === row && state.detective.col === col) {
        cell.classList.add("is-detective");
      }
      if (state.dog.row === row && state.dog.col === col) {
        cell.classList.add("is-dog");
      }
      if (suspectStep.row === row && suspectStep.col === col) {
        cell.classList.add("is-suspect");
      }
    }
  }
  evaluateVision(suspectStep, visionCells);
}

function computeVisionCells(step) {
  const cells = [];
  const { facing } = step;
  const vectors = {
    north: { row: -1, col: 0 },
    south: { row: 1, col: 0 },
    east: { row: 0, col: 1 },
    west: { row: 0, col: -1 },
  };
  const offsets = vectors[facing] ?? vectors.north;
  for (let depth = 1; depth <= 3; depth += 1) {
    for (let spread = -1; spread <= 1; spread += 1) {
      const row = step.row + offsets.row * depth + (offsets.col !== 0 ? spread : 0);
      const col = step.col + offsets.col * depth + (offsets.row !== 0 ? spread : 0);
      if (row < 0 || row >= BOARD_ROWS || col < 0 || col >= BOARD_COLS) {
        continue;
      }
      cells.push({ row, col, intensity: depth === 3 ? "edge" : "core" });
    }
  }
  return cells;
}

function evaluateVision(step, visionCells) {
  const detectiveInVision = visionCells.find(
    (cell) => cell.row === state.detective.row && cell.col === state.detective.col,
  );
  if (!state.active || !detectiveInVision) {
    state.lastVisionKey = null;
    return;
  }
  const key = `${state.detective.row},${state.detective.col}`;
  const now = performance.now();
  if (state.lastVisionKey === key && now - state.lastVisionAt < 900) {
    return;
  }
  state.lastVisionKey = key;
  state.lastVisionAt = now;
  const penalty = detectiveInVision.intensity === "edge" ? CONE_EDGE_PENALTY : CONE_CORE_PENALTY;
  boardElement.classList.toggle("is-alert", true);
  const descriptor = detectiveInVision.intensity === "edge" ? "edge of vision" : "direct sightline";
  logEvent(`Cone contact: ${descriptor}.`, "alert");
  increaseSuspicion(penalty, {
    reason: "Line of sight",
    location: { ...state.detective },
  });
  updateMissionStatus("The suspect spotted movement—duck back behind cover!", "alert");
}

function attemptCleanup() {
  if (!state.active) {
    return;
  }
  const index = state.messes.findIndex(
    (mess) => mess.row === state.detective.row && mess.col === state.detective.col,
  );
  if (index === -1) {
    return;
  }
  const mess = state.messes.splice(index, 1)[0];
  updateMessCount();
  const cell = cellElements[mess.row][mess.col];
  cell.classList.add("cleaned-flash");
  window.setTimeout(() => cell.classList.remove("cleaned-flash"), 340);
  state.cleanupEvents.push({ row: mess.row, col: mess.col });
  playCue("clean");
  logEvent("Mess cleared. Suspicion dissipates.", "success");
  adjustSuspicion(-CLEAN_SUCCESS_BONUS);
  updateMissionStatus("Cleanup complete. Rejoin the tail.", "success");
}

function processTimers() {
  if (!state.active) {
    return;
  }
  const now = performance.now();
  state.messes = state.messes.filter((mess) => {
    if (now >= mess.expiresAt) {
      increaseSuspicion(MESS_FAIL_PENALTY, {
        reason: "Missed cleanup",
        location: { row: mess.row, col: mess.col },
      });
      logEvent("Mess ignored—dock security raises questions.", "alert");
      return false;
    }
    return true;
  });
  updateMessCount();
  if (!state.active) {
    return;
  }
  adjustSuspicion(BASE_SUSPICION_PER_SECOND * (MESS_TICK_MS / 1000));
}

function adjustSuspicion(delta) {
  state.suspicion = clamp(state.suspicion + delta, 0, MAX_SUSPICION);
  state.suspicionPeak = Math.max(state.suspicionPeak, state.suspicion);
  updateSuspicionUI();
  if (state.suspicion >= MAX_SUSPICION) {
    endStakeout(false, "Suspicion maxed—the suspect blows the cover.");
  }
}

function increaseSuspicion(amount, meta) {
  state.suspicionEvents.push({
    ...meta,
    amount,
    at: new Date().toISOString(),
  });
  adjustSuspicion(amount);
}

function logEvent(message, tone = "info") {
  const entry = document.createElement("li");
  entry.textContent = message;
  entry.dataset.tone = tone;
  eventFeed.prepend(entry);
  while (eventFeed.children.length > 9) {
    eventFeed.removeChild(eventFeed.lastChild);
  }
}

function updateMissionStatus(text, tone) {
  missionStatus.textContent = text;
  missionStatus.dataset.tone = tone ?? "";
  if (tone) {
    missionStatus.setAttribute("data-tone", tone);
  } else {
    missionStatus.removeAttribute("data-tone");
  }
}

function endStakeout(success, message) {
  if (!state.active) {
    return;
  }
  state.active = false;
  state.boardLocked = true;
  clearTimers();
  updateMissionStatus(message, success ? "success" : "alert");
  logEvent(message, success ? "success" : "alert");
  simulatorHelp.textContent = success
    ? "Great work. Run it back to chase a cleaner high score."
    : "Recalibrate the approach and keep that suspicion bar low.";
  renderBoard();
  showWrapup(success, message);
  particleField?.burst?.({
    x: 0.5,
    y: 0.5,
    colors: success ? ["#38bdf8", "#fbbf24", "#34d399"] : ["#ef4444", "#f97316"],
  });
}

function showWrapup(success, message) {
  wrapupSubtitle.textContent = message;
  wrapupEvidence.textContent = `${state.evidence}`;
  wrapupPeak.textContent = `${Math.round((state.suspicionPeak / MAX_SUSPICION) * 100)}%`;
  const stealthBonus = Math.max(0, Math.round((MAX_SUSPICION - state.suspicionPeak) / 2));
  wrapupBonus.textContent = `${stealthBonus}`;
  renderWrapupMap();
  wrapupElement.hidden = false;
  wrapupDialog?.focus?.();
  if (success) {
    highScore.submit(state.evidence, {
      suspicion: Math.round(state.suspicionPeak),
      timestamp: Date.now(),
    });
  }
}

function hideWrapup() {
  wrapupElement.hidden = true;
  startButton.focus();
}

function renderWrapupMap() {
  wrapupMap.innerHTML = "";
  const suspectSet = new Set(state.suspectTrail.map((pos) => `${pos.row},${pos.col}`));
  const detectiveSet = new Set(state.detectiveTrail.map((pos) => `${pos.row},${pos.col}`));
  const cleanupSet = new Set(state.cleanupEvents.map((pos) => `${pos.row},${pos.col}`));
  const alertSet = new Set(state.suspicionEvents.map((event) => `${event.location?.row},${event.location?.col}`));
  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      const cell = document.createElement("div");
      cell.className = "map-cell";
      const key = `${row},${col}`;
      if (suspectSet.has(key)) {
        cell.classList.add("is-suspect");
      }
      if (detectiveSet.has(key)) {
        cell.classList.add("is-detective");
      }
      if (cleanupSet.has(key)) {
        cell.classList.add("is-cleanup");
      }
      if (alertSet.has(key)) {
        cell.classList.add("is-alert");
      }
      wrapupMap.append(cell);
    }
  }
}

function processAudio() {
  if (!state.audioReady) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      state.audioContext = new AudioContextClass();
      state.audioReady = true;
    }
  }
  if (state.audioContext?.state === "suspended") {
    state.audioContext.resume().catch(() => {});
  }
}

function playCue(type) {
  processAudio();
  if (!state.audioContext) {
    return;
  }
  const ctx = state.audioContext;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.connect(gain).connect(ctx.destination);
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  let frequency = 440;
  let duration = 0.25;
  switch (type) {
    case "mess":
      frequency = 220;
      duration = 0.4;
      break;
    case "clean":
      frequency = 720;
      duration = 0.2;
      break;
    case "checkpoint":
      frequency = 560;
      duration = 0.35;
      break;
    default:
      break;
  }
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.type = type === "mess" ? "sawtooth" : "triangle";
  gain.gain.exponentialRampToValueAtTime(0.3, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.05);
}

function manhattanDistance(a, b) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

