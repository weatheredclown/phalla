import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { mountParticleField } from "../particles.js";

const particleSystem = mountParticleField({
  effects: {
    palette: ["#38bdf8", "#f472b6", "#facc15", "#34d399"],
    ambientDensity: 0.6,
  },
});

const scoreConfig = getScoreConfig("nose-for-trouble");
const highScore = initHighScoreBanner({
  gameId: "nose-for-trouble",
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

const GRID_SIZE = 9;
const START_CELL = { row: 8, col: 1 };
const MAX_EXPLOSIONS = 1;
const PATH_COOLDOWN = 45;
const ERRATIC_THRESHOLD = 100;
const CALM_THRESHOLD = 45;
const METER_TICK = 280;
const ERRATIC_LURCH_DELAY = 140;

const TUNNEL_POSITIONS = [
  [0, 2],
  [0, 3],
  [0, 5],
  [0, 6],
  [1, 1],
  [1, 4],
  [1, 7],
  [2, 3],
  [2, 5],
  [3, 1],
  [3, 2],
  [3, 6],
  [3, 7],
  [4, 4],
  [4, 6],
  [5, 1],
  [5, 3],
  [5, 5],
  [6, 2],
  [6, 6],
  [7, 4],
  [7, 7],
  [8, 4],
  [8, 6],
];

const TUNNEL_CELLS = new Set(TUNNEL_POSITIONS.map(([row, col]) => `${row},${col}`));

const boardElement = document.getElementById("trail-grid");
const missionStatusElement = document.getElementById("mission-status");
const streakElement = document.getElementById("streak-count");
const explosionElement = document.getElementById("explosion-count");
const frustrationFill = document.getElementById("frustration-fill");
const frustrationBar = document.getElementById("frustration-bar");
const frustrationValue = document.getElementById("frustration-value");
const responseTimeElement = document.getElementById("response-time");
const eventLogElement = document.getElementById("event-log");

const startButton = document.getElementById("start-patrol");
const resetTrailButton = document.getElementById("reset-trail");
const abortButton = document.getElementById("abort-mission");

const cellElements = [];

const state = {
  patrolActive: false,
  boardLocked: false,
  path: [],
  baggie: null,
  lastBaggieKey: null,
  frustration: 0,
  erratic: false,
  streak: 0,
  explosions: 0,
  breachKey: null,
  meterTimer: null,
  responseTimer: null,
  responseStartedAt: 0,
  log: [],
};

initializeBoard();
renderBoard();
updateFrustration();
updateStats();
renderLog();
setMissionStatus("Press Start Patrol to begin tracing the scent.");

startButton.addEventListener("click", () => {
  startPatrol();
});

resetTrailButton.addEventListener("click", () => {
  if (!state.patrolActive) {
    return;
  }
  resetTrail();
  addLog("Trail reset to the nose. Recenter your sweep.", "warning");
  setMissionStatus("Trail reset. Plot a clean route to the active baggie.", "warning");
});

abortButton.addEventListener("click", () => {
  if (!state.patrolActive) {
    return;
  }
  abortMission("Patrol aborted. Jerry Lee is standing down.");
});

document.addEventListener("keydown", (event) => {
  if (event.defaultPrevented) {
    return;
  }
  if (!state.patrolActive) {
    if (event.key === "Enter" && startButton === document.activeElement) {
      startPatrol();
      event.preventDefault();
    }
    return;
  }
  if (event.key === "Backspace") {
    event.preventDefault();
    backtrackStep();
  } else if (event.key === "Escape") {
    event.preventDefault();
    abortMission("Patrol aborted. Jerry Lee is standing down.");
  }
});

function initializeBoard() {
  boardElement.innerHTML = "";
  cellElements.length = 0;
  for (let row = 0; row < GRID_SIZE; row += 1) {
    const rowElements = [];
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "trail-cell";
      button.dataset.row = String(row);
      button.dataset.col = String(col);
      button.setAttribute("role", "gridcell");
      button.setAttribute("aria-label", `Row ${row + 1}, column ${col + 1}`);
      button.addEventListener("pointerenter", handleCellPointerEnter);
      button.addEventListener("click", handleCellClick);
      boardElement.append(button);
      rowElements.push(button);
    }
    cellElements.push(rowElements);
  }
}

function startPatrol() {
  state.patrolActive = true;
  state.boardLocked = false;
  state.path = [{ ...START_CELL }];
  state.baggie = null;
  state.lastBaggieKey = null;
  state.frustration = 0;
  state.erratic = false;
  state.streak = 0;
  state.explosions = 0;
  state.breachKey = null;
  state.log = [];
  boardElement.classList.remove("is-erratic");
  addLog("Patrol engaged. Jerry Lee is on the scent.", "success");
  setMissionStatus("Scent trail live. Track the first baggie.", "success");
  spawnBaggie();
  updateFrustration();
  updateStats();
  renderBoard();
  renderLog();
  startFrustrationLoop();
  restartResponseTimer();
}

function abortMission(message) {
  state.patrolActive = false;
  state.boardLocked = true;
  stopFrustrationLoop();
  stopResponseTimer();
  boardElement.classList.remove("is-erratic");
  setMissionStatus(message, "warning");
  addLog(message, "warning");
}

function resetTrail() {
  state.path = [{ ...START_CELL }];
  state.breachKey = null;
  renderBoard();
}

function backtrackStep() {
  if (!state.patrolActive || state.path.length <= 1) {
    return;
  }
  state.path.pop();
  renderBoard();
  setMissionStatus("Trail shortened. Plot the next move.");
}

function handleCellClick(event) {
  if (!state.patrolActive || state.boardLocked) {
    return;
  }
  const cell = event.currentTarget;
  const row = Number.parseInt(cell.dataset.row ?? "-1", 10);
  const col = Number.parseInt(cell.dataset.col ?? "-1", 10);
  attemptStep(row, col);
}

function handleCellPointerEnter(event) {
  if (!state.patrolActive || state.boardLocked) {
    return;
  }
  if (!(event.buttons & 1)) {
    return;
  }
  const cell = event.currentTarget;
  const row = Number.parseInt(cell.dataset.row ?? "-1", 10);
  const col = Number.parseInt(cell.dataset.col ?? "-1", 10);
  attemptStep(row, col);
}

function attemptStep(row, col, options = {}) {
  if (!state.patrolActive || state.boardLocked) {
    return false;
  }
  if (!Number.isInteger(row) || !Number.isInteger(col)) {
    return false;
  }
  if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
    return false;
  }
  const head = state.path[state.path.length - 1];
  if (!head) {
    return false;
  }
  if (head.row === row && head.col === col) {
    return false;
  }
  const isAdjacent = Math.abs(head.row - row) + Math.abs(head.col - col) === 1;
  if (!isAdjacent) {
    return false;
  }
  const key = `${row},${col}`;
  const isBaggieCell = state.baggie && state.baggie.row === row && state.baggie.col === col;
  const alreadyVisited = state.path.some((cell) => cell.row === row && cell.col === col);
  if (alreadyVisited && !isBaggieCell) {
    return false;
  }
  state.path.push({ row, col });
  renderBoard();

  if (TUNNEL_CELLS.has(key)) {
    triggerExplosion(key);
    return true;
  }

  if (isBaggieCell) {
    interceptBaggie();
    return true;
  }

  if (state.erratic && !options.suppressErratic) {
    scheduleErraticLurch();
  }

  return true;
}

function triggerExplosion(key) {
  state.explosions += 1;
  state.breachKey = key;
  renderBoard();
  stopFrustrationLoop();
  stopResponseTimer();
  setMissionStatus("Tunnel breach! Mission compromised.", "danger");
  addLog("Explosive tunnel detonated. Evidence lost in the blast.", "danger");
  explosionElement.textContent = `${state.explosions} / ${MAX_EXPLOSIONS}`;
  state.boardLocked = true;
  state.patrolActive = false;
  boardElement.classList.remove("is-erratic");
}

function interceptBaggie() {
  state.streak += 1;
  highScore.submit(state.streak, {
    response: Number.isFinite(state.responseStartedAt)
      ? Math.max(0, Math.round((performance.now() - state.responseStartedAt) / 100) / 10)
      : 0,
  });
  addLog(`Baggie secured. Streak now ${state.streak}.`, "success");
  setMissionStatus(`Intercept locked. ${state.streak} baggies in a row.`, "success");
  state.frustration = Math.max(0, state.frustration - PATH_COOLDOWN);
  updateFrustration();
  if (state.erratic && state.frustration <= CALM_THRESHOLD) {
    state.erratic = false;
    boardElement.classList.remove("is-erratic");
    addLog("Jerry calms down. Trail steady again.", "success");
  }
  state.path = [{ ...START_CELL }];
  state.lastBaggieKey = state.baggie ? `${state.baggie.row},${state.baggie.col}` : null;
  state.baggie = null;
  state.breachKey = null;
  spawnBaggie();
  renderBoard();
  updateStats();
  restartResponseTimer();
}

function spawnBaggie() {
  const available = [];
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const key = `${row},${col}`;
      if (TUNNEL_CELLS.has(key)) {
        continue;
      }
      if (row === START_CELL.row && col === START_CELL.col) {
        continue;
      }
      if (state.path.some((segment) => segment.row === row && segment.col === col)) {
        continue;
      }
      if (state.lastBaggieKey && state.lastBaggieKey === key) {
        continue;
      }
      available.push({ row, col });
    }
  }
  if (available.length === 0) {
    state.baggie = null;
    return;
  }
  const choice = available[Math.floor(Math.random() * available.length)];
  state.baggie = choice;
  state.responseStartedAt = performance.now();
  updateStats();
  renderBoard();
  responseTimeElement.textContent = "0.0s";
}

function startFrustrationLoop() {
  stopFrustrationLoop();
  state.meterTimer = window.setInterval(() => {
    if (!state.patrolActive || state.boardLocked) {
      return;
    }
    const delta = state.erratic ? 2.5 : 1.6;
    state.frustration = Math.min(ERRATIC_THRESHOLD, state.frustration + delta);
    updateFrustration();
    if (state.frustration >= ERRATIC_THRESHOLD && !state.erratic) {
      enterErraticMode();
    }
  }, METER_TICK);
}

function stopFrustrationLoop() {
  if (state.meterTimer) {
    window.clearInterval(state.meterTimer);
    state.meterTimer = null;
  }
}

function restartResponseTimer() {
  stopResponseTimer();
  state.responseStartedAt = performance.now();
  state.responseTimer = window.setInterval(() => {
    if (!state.patrolActive || state.boardLocked || !state.responseStartedAt) {
      responseTimeElement.textContent = "0.0s";
      return;
    }
    const elapsed = Math.max(0, performance.now() - state.responseStartedAt);
    responseTimeElement.textContent = `${(Math.round(elapsed / 100) / 10).toFixed(1)}s`;
  }, 120);
}

function stopResponseTimer() {
  if (state.responseTimer) {
    window.clearInterval(state.responseTimer);
    state.responseTimer = null;
  }
  responseTimeElement.textContent = "0.0s";
}

function enterErraticMode() {
  state.erratic = true;
  boardElement.classList.add("is-erratic");
  addLog("Frustration maxed. Jerry is lunging on instinct!", "warning");
  setMissionStatus("Frustration spike! Guide Jerry before he bolts into a tunnel.", "warning");
  scheduleErraticLurch();
}

function scheduleErraticLurch() {
  window.setTimeout(() => {
    if (!state.erratic || !state.patrolActive || state.boardLocked) {
      return;
    }
    const head = state.path[state.path.length - 1];
    if (!head) {
      return;
    }
    const neighbors = getNeighbors(head).filter((cell) => {
      if (!cell) {
        return false;
      }
      const key = `${cell.row},${cell.col}`;
      if (TUNNEL_CELLS.has(key)) {
        return true;
      }
      if (state.path.some((segment) => segment.row === cell.row && segment.col === cell.col)) {
        return false;
      }
      return true;
    });
    if (neighbors.length === 0) {
      return;
    }
    const choice = neighbors[Math.floor(Math.random() * neighbors.length)];
    attemptStep(choice.row, choice.col, { suppressErratic: true });
  }, ERRATIC_LURCH_DELAY);
}

function getNeighbors(cell) {
  if (!cell) {
    return [];
  }
  return [
    { row: cell.row - 1, col: cell.col },
    { row: cell.row + 1, col: cell.col },
    { row: cell.row, col: cell.col - 1 },
    { row: cell.row, col: cell.col + 1 },
  ].filter((candidate) => candidate.row >= 0 && candidate.row < GRID_SIZE && candidate.col >= 0 && candidate.col < GRID_SIZE);
}

function updateFrustration() {
  frustrationFill.style.width = `${state.frustration}%`;
  frustrationValue.textContent = `${Math.round(state.frustration)}%`;
  frustrationBar.setAttribute("aria-valuenow", String(Math.round(state.frustration)));
}

function updateStats() {
  streakElement.textContent = String(state.streak);
  explosionElement.textContent = `${state.explosions} / ${MAX_EXPLOSIONS}`;
  if (!state.patrolActive || !state.responseStartedAt) {
    responseTimeElement.textContent = "0.0s";
  }
}

function renderBoard() {
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const cell = cellElements[row][col];
      const key = `${row},${col}`;
      if (row === START_CELL.row && col === START_CELL.col) {
        cell.dataset.start = "true";
      } else {
        delete cell.dataset.start;
      }
      if (state.baggie && state.baggie.row === row && state.baggie.col === col) {
        cell.dataset.baggie = "true";
      } else {
        delete cell.dataset.baggie;
      }
      if (TUNNEL_CELLS.has(key)) {
        cell.dataset.tunnel = "true";
      } else {
        delete cell.dataset.tunnel;
      }
      if (state.breachKey === key) {
        cell.dataset.breach = "true";
      } else {
        delete cell.dataset.breach;
      }
      delete cell.dataset.path;
      delete cell.dataset.head;
      delete cell.dataset.available;
    }
  }
  state.path.forEach((segment, index) => {
    const cell = cellElements[segment.row]?.[segment.col];
    if (!cell) {
      return;
    }
    cell.dataset.path = "true";
    if (index === state.path.length - 1) {
      cell.dataset.head = "true";
    } else {
      delete cell.dataset.head;
    }
  });
  const head = state.path[state.path.length - 1];
  if (head) {
    const neighbors = getNeighbors(head);
    neighbors.forEach((neighbor) => {
      const cell = cellElements[neighbor.row]?.[neighbor.col];
      if (!cell) {
        return;
      }
      const key = `${neighbor.row},${neighbor.col}`;
      if (state.path.some((segment) => segment.row === neighbor.row && segment.col === neighbor.col)) {
        return;
      }
      if (state.baggie && state.baggie.row === neighbor.row && state.baggie.col === neighbor.col) {
        cell.dataset.available = "true";
        return;
      }
      if (TUNNEL_CELLS.has(key)) {
        cell.dataset.available = "true";
        return;
      }
      cell.dataset.available = "true";
    });
  }
}

function renderLog() {
  eventLogElement.innerHTML = "";
  state.log.forEach((entry) => {
    const item = document.createElement("li");
    if (entry.tone) {
      item.dataset.tone = entry.tone;
    }
    const time = document.createElement("time");
    time.dateTime = entry.timestamp.toISOString();
    time.textContent = entry.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const message = document.createElement("span");
    message.textContent = entry.message;
    item.append(time, message);
    eventLogElement.prepend(item);
  });
}

function addLog(message, tone = "info") {
  const entry = {
    message,
    tone,
    timestamp: new Date(),
  };
  state.log.push(entry);
  if (state.log.length > 12) {
    state.log.shift();
  }
  renderLog();
}

function setMissionStatus(message, tone = "info") {
  missionStatusElement.textContent = message;
  if (tone && tone !== "info") {
    missionStatusElement.dataset.tone = tone;
  } else {
    delete missionStatusElement.dataset.tone;
  }
}

window.addEventListener("beforeunload", () => {
  particleSystem?.destroy?.();
  stopFrustrationLoop();
  stopResponseTimer();
});
