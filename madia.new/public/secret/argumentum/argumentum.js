const BOARD_SIZE = 6;
const TETRA_WIDTH = 10;
const TETRA_HEIGHT = 20;
const TRANSFORM_COST = { earth: 20, water: 30 };
const SHIFT_THRESHOLD = 100;
const DROP_DELAY_BASE = 900;
const DROP_DELAY_MIN = 400;
const INTEGRITY_TICK_AMOUNT = 0.4;
const ROUTE_STABILIZE_MIN_LOCKED = 3;
const ROUTE_STABILIZE_BASE = 4;
const ROUTE_STABILIZE_PER_NODE = 2;
const ROUTE_STABILIZE_COOLDOWN_MS = 15000;
const ROTATION_KICKS = [
  { x: 0, y: 0 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: -1 },
  { x: -2, y: 0 },
  { x: 2, y: 0 },
  { x: -1, y: -1 },
  { x: 1, y: -1 }
];
const COMBO_TIMEOUT_MS = 6200;

const infusionMapping = {
  sedimentary: "geolocked",
  igneous: "volcanic",
  metamorphic: "flux",
  crystal: "prismatic"
};

const infusionLabels = {
  volcanic: "VO",
  geolocked: "GL",
  flux: "FX",
  prismatic: "PR"
};

const infusionTargets = {
  volcanic: "igneous",
  geolocked: "sedimentary",
  flux: "metamorphic",
  prismatic: "crystal"
};

function formatInfusionName(type) {
  return type ? type.charAt(0).toUpperCase() + type.slice(1) : "";
}

const rockTypes = [
  { id: "sedimentary", label: "Se", meter: "earth" },
  { id: "igneous", label: "Ig", meter: "fire" },
  { id: "metamorphic", label: "Me", meter: "water" },
  { id: "crystal", label: "Cr", meter: "shift" }
];

const pieceDefinitions = {
  sedimentary: {
    colorClass: "filled-earth",
    rotations: [
      [
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 1, 0],
        [0, 0, 0, 0]
      ],
      [
        [0, 0, 0, 0],
        [0, 1, 1, 1],
        [0, 1, 0, 0],
        [0, 0, 0, 0]
      ],
      [
        [0, 0, 0, 0],
        [0, 1, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0]
      ],
      [
        [0, 0, 0, 0],
        [0, 0, 1, 0],
        [1, 1, 1, 0],
        [0, 0, 0, 0]
      ]
    ]
  },
  igneous: {
    colorClass: "filled-fire",
    rotations: [
      [
        [0, 0, 0, 0],
        [1, 1, 1, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 0]
      ],
      [
        [0, 0, 1, 0],
        [0, 1, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 0]
      ],
      [
        [0, 0, 0, 0],
        [0, 0, 1, 0],
        [1, 1, 1, 0],
        [0, 0, 0, 0]
      ],
      [
        [0, 1, 0, 0],
        [0, 1, 1, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 0]
      ]
    ]
  },
  metamorphic: {
    colorClass: "filled-water",
    rotations: [
      [
        [0, 0, 0, 0],
        [0, 1, 1, 0],
        [1, 1, 0, 0],
        [0, 0, 0, 0]
      ],
      [
        [1, 0, 0, 0],
        [1, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 0]
      ],
      [
        [0, 0, 0, 0],
        [0, 1, 1, 0],
        [1, 1, 0, 0],
        [0, 0, 0, 0]
      ],
      [
        [1, 0, 0, 0],
        [1, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 0]
      ]
    ]
  },
  crystal: {
    colorClass: "filled-crystal",
    rotations: [
      [
        [0, 1, 1, 0],
        [0, 1, 1, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],
      [
        [0, 1, 1, 0],
        [0, 1, 1, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],
      [
        [0, 1, 1, 0],
        [0, 1, 1, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],
      [
        [0, 1, 1, 0],
        [0, 1, 1, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ]
    ]
  }
};

const meters = {
  earth: document.getElementById("earth-meter"),
  water: document.getElementById("water-meter"),
  fire: document.getElementById("fire-meter"),
  shift: document.getElementById("shift-meter")
};

const matchBoardEl = document.getElementById("match-board");
const pieceQueueEl = document.getElementById("piece-queue");
const tetraminoBoardEl = document.getElementById("tetramino-board");
const flowGridEl = document.getElementById("flow-grid");
const eventLogEl = document.getElementById("event-log");
const bridgeInventoryEl = document.getElementById("bridge-inventory");
const bridgeHintEl = document.getElementById("bridge-hint");
const chargeTransformBtn = document.getElementById("charge-transform");
const cancelTransformBtn = document.getElementById("cancel-transform");
const transformToolbar = document.getElementById("transform-toolbar");
const shiftBoardBtn = document.getElementById("shift-board");
const routeToggleBtn = document.getElementById("route-toggle");
const stabilizeRouteBtn = document.getElementById("stabilize-route");
const reactorHudEl = document.querySelector(".reactor-hud");
const scoreMetricEl = document.getElementById("score-metric");
const linesMetricEl = document.getElementById("lines-metric");
const comboMetricEl = document.getElementById("combo-metric");
const circuitsMetricEl = document.getElementById("circuits-metric");
const scoreDisplayEl = document.getElementById("score-display");
const linesDisplayEl = document.getElementById("lines-display");
const comboDisplayEl = document.getElementById("combo-display");
const comboMultiplierEl = document.getElementById("combo-multiplier");
const circuitsDisplayEl = document.getElementById("circuits-display");
const integrityMetricEl = document.getElementById("integrity-metric");
const integrityBarEl = document.querySelector(".integrity-bar");
const integrityFillEl = document.getElementById("integrity-fill");
const integrityValueEl = document.getElementById("integrity-value");
const reactorAlertEl = document.getElementById("reactor-alert");
const restartButton = document.getElementById("restart-game");

let matchBoard = [];
let matchNodes = [];
let selectedTile = null;
let transformMode = false;
let resourceMeterState = {
  earth: 0,
  water: 0,
  fire: 0,
  shift: 0
};

let tetraBoard = createMatrix(TETRA_HEIGHT, TETRA_WIDTH, null);
let pieceQueue = [];
let activePiece = null;
let dropIntervalId = null;
let dropDelay = DROP_DELAY_BASE;
let bridgeSchematics = [];
let routeMode = false;
let routeSelection = [];
let bridgePreview = null;
let bridgePreviewTimeout = null;
let pendingInfusions = [];
let shiftOrientation = 0;
let planIdCounter = 0;
let lastRouteStabilizeAt = 0;
let stabilizeCooldownTimeout = null;

let flowNodes = initializeFlowNodes();
let isResolvingMatches = false;
let reactorBusy = false;
let gameOver = false;
let scoreState = {
  score: 0,
  lines: 0,
  circuits: 0,
  integrity: 100,
  maxCombo: 0
};
let alertTimeoutId = null;
const comboState = {
  streak: 0,
  multiplier: 1,
  timeoutId: null,
  lastEvent: null
};
let audioContextInstance = null;
let audioUnlocked = false;

function createMatrix(rows, cols, value) {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => value));
}

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function isInputLocked() {
  return reactorBusy || isResolvingMatches || gameOver;
}

function flashMetric(element) {
  if (!element) {
    return;
  }
  element.classList.remove("pulse");
  // Force reflow to restart animation
  void element.offsetWidth; // eslint-disable-line no-void
  element.classList.add("pulse");
}

function updateScoreboard() {
  if (scoreDisplayEl) {
    scoreDisplayEl.textContent = scoreState.score.toLocaleString();
  }
  if (linesDisplayEl) {
    linesDisplayEl.textContent = scoreState.lines.toString();
  }
  if (circuitsDisplayEl) {
    circuitsDisplayEl.textContent = scoreState.circuits.toString();
  }
  if (comboDisplayEl) {
    comboDisplayEl.textContent = comboState.streak > 0 ? comboState.streak.toString() : "—";
  }
  if (comboMultiplierEl) {
    comboMultiplierEl.textContent = `x${comboState.multiplier.toFixed(1)}`;
  }
  if (comboMetricEl) {
    comboMetricEl.classList.toggle("combo-active", comboState.streak > 0);
  }
  if (reactorHudEl) {
    reactorHudEl.classList.toggle("combo-active", comboState.streak > 0);
  }
  const integrity = Math.max(0, Math.min(100, scoreState.integrity));
  if (integrityFillEl) {
    integrityFillEl.style.width = `${integrity}%`;
  }
  if (integrityValueEl) {
    integrityValueEl.textContent = `${Math.round(integrity)}%`;
  }
  if (integrityMetricEl) {
    const warning = integrity <= 45 && integrity > 25;
    const critical = integrity <= 25;
    integrityMetricEl.classList.toggle("integrity-warning", warning);
    integrityMetricEl.classList.toggle("integrity-critical", critical);
  }
  if (integrityBarEl) {
    integrityBarEl.setAttribute("aria-valuenow", Math.round(integrity).toString());
  }
  updateAlertForIntegrity();
}

function showAlert(message, level = "info", holdMs = 2400) {
  if (!reactorAlertEl) {
    return;
  }
  if (alertTimeoutId) {
    window.clearTimeout(alertTimeoutId);
    alertTimeoutId = null;
  }
  reactorAlertEl.textContent = message ?? "";
  reactorAlertEl.className = `reactor-alert ${level}`;
  if (holdMs > 0) {
    alertTimeoutId = window.setTimeout(() => {
      alertTimeoutId = null;
      updateAlertForIntegrity();
    }, holdMs);
  }
}

function updateAlertForIntegrity() {
  if (!reactorAlertEl || gameOver || alertTimeoutId) {
    return;
  }
  let level = "calm";
  let message = "";
  const integrity = Math.max(0, Math.min(100, scoreState.integrity));
  if (integrity <= 20) {
    level = "danger";
    message = "Integrity failing! Vent lines immediately.";
  } else if (integrity <= 45) {
    level = "warning";
    message = "Integrity wavering—seal circuits or clear lines.";
  } else if (comboState.streak >= 3) {
    level = "info";
    message = `Combo ${comboState.streak}! Reactor harmony amplifies.`;
  } else if (integrity >= 90) {
    message = "Reactor stable and radiant.";
  }
  reactorAlertEl.textContent = message;
  reactorAlertEl.className = `reactor-alert ${level}`;
}

function awardScore(amount, anchor, { comboEligible = true } = {}) {
  if (gameOver || !amount) {
    return;
  }
  const multiplier = comboEligible ? comboState.multiplier : 1;
  const finalAmount = Math.round(amount * multiplier);
  scoreState.score += finalAmount;
  updateScoreboard();
  flashMetric(scoreMetricEl);
  if (anchor) {
    anchor.classList.add("reward-flash");
    window.setTimeout(() => {
      anchor.classList.remove("reward-flash");
    }, 520);
  }
}

function damageIntegrity(amount, message) {
  if (!amount || gameOver) {
    return;
  }
  scoreState.integrity = Math.max(0, Math.min(100, scoreState.integrity - amount));
  updateScoreboard();
  if (message) {
    const level = scoreState.integrity <= 25 ? "danger" : "warning";
    showAlert(message, level);
  }
  if (scoreState.integrity <= 0) {
    triggerGameOver("Reactor integrity collapsed. Flow lattice dissolves.");
  }
}

function restoreIntegrity(amount, message) {
  if (!amount || gameOver) {
    return;
  }
  scoreState.integrity = Math.max(0, Math.min(100, scoreState.integrity + amount));
  updateScoreboard();
  if (message) {
    showAlert(message, "info");
  }
}

function applyIntegrityDrift() {
  if (!activePiece || reactorBusy || gameOver) {
    return;
  }
  damageIntegrity(INTEGRITY_TICK_AMOUNT);
}

const AUDIO_CUES = {
  match: { freq: 540, duration: 0.16, type: "sine", volume: 0.12 },
  line: { freq: 360, duration: 0.22, type: "triangle", volume: 0.16 },
  comboBreak: { freq: 180, duration: 0.3, type: "sawtooth", volume: 0.12 },
  gameover: { freq: 120, duration: 0.6, type: "square", volume: 0.1 }
};

function ensureAudioContext() {
  if (audioContextInstance) {
    return audioContextInstance;
  }
  if (!window.AudioContext && !window.webkitAudioContext) {
    return null;
  }
  try {
    audioContextInstance = new (window.AudioContext || window.webkitAudioContext)();
  } catch (error) {
    console.warn("Unable to initialise audio context", error);
    audioContextInstance = null;
  }
  return audioContextInstance;
}

function unlockAudioContext() {
  const context = ensureAudioContext();
  if (!context) {
    return;
  }
  context.resume().catch(() => {});
  audioUnlocked = true;
}

function playCue(name) {
  const cue = AUDIO_CUES[name];
  if (!cue) {
    return;
  }
  const context = ensureAudioContext();
  if (!context) {
    return;
  }
  if (context.state === "suspended" && audioUnlocked) {
    context.resume().catch(() => {});
  }
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  oscillator.type = cue.type || "sine";
  oscillator.frequency.setValueAtTime(cue.freq, now);
  const gain = context.createGain();
  const volume = cue.volume ?? 0.16;
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + cue.duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + cue.duration);
}

function setComboVisuals(active) {
  matchBoardEl.classList.toggle("combo-glow", active);
  tetraminoBoardEl.classList.toggle("combo-glow", active);
}

function scheduleComboDecay() {
  if (comboState.timeoutId) {
    window.clearTimeout(comboState.timeoutId);
  }
  comboState.timeoutId = window.setTimeout(() => {
    comboState.timeoutId = null;
    breakCombo("decay");
  }, COMBO_TIMEOUT_MS);
}

function registerCombo(amount = 1, source = "match", anchor) {
  if (gameOver) {
    return;
  }
  const increment = Math.max(1, Math.round(amount));
  comboState.streak += increment;
  comboState.lastEvent = source;
  comboState.multiplier = Math.min(3.5, 1 + Math.max(0, comboState.streak - 1) * 0.25);
  const previousMax = scoreState.maxCombo;
  scoreState.maxCombo = Math.max(scoreState.maxCombo, comboState.streak);
  updateScoreboard();
  setComboVisuals(true);
  if (anchor) {
    anchor.classList.add("combo-celebration");
    window.setTimeout(() => anchor.classList.remove("combo-celebration"), 620);
  }
  scheduleComboDecay();
  playCue(source === "line" ? "line" : "match");
  if (comboState.streak > 1 && comboState.streak > previousMax) {
    logEvent(
      `Combo ${comboState.streak} amplified (${comboState.multiplier.toFixed(1)}x resonance).`
    );
  }
}

function breakCombo(reason = "decay", { silent = false } = {}) {
  if (comboState.timeoutId) {
    window.clearTimeout(comboState.timeoutId);
    comboState.timeoutId = null;
  }
  if (comboState.streak === 0) {
    return;
  }
  if (!silent) {
    playCue("comboBreak");
    if (reason === "decay") {
      showAlert("Combo energy dissipated.", "warning");
    }
    let logMessage = null;
    switch (reason) {
      case "dud":
        logMessage = "Combo fizzled with no successful link.";
        break;
      case "stalled":
        logMessage = "Combo stalled under reactor pressure.";
        break;
      case "decay":
        logMessage = "Combo resonance faded.";
        break;
      default:
        logMessage = reason !== "silent" ? "Combo chain collapsed." : null;
        break;
    }
    if (logMessage) {
      logEvent(logMessage);
    }
  }
  comboState.streak = 0;
  comboState.multiplier = 1;
  comboState.lastEvent = null;
  setComboVisuals(false);
  updateScoreboard();
}

function stopDropLoop() {
  if (dropIntervalId) {
    window.clearInterval(dropIntervalId);
    dropIntervalId = null;
  }
}

function triggerGameOver(message) {
  if (gameOver) {
    return;
  }
  gameOver = true;
  reactorBusy = false;
  isResolvingMatches = false;
  stopDropLoop();
  showAlert(message, "danger", 0);
  breakCombo("silent", { silent: true });
  if (restartButton) {
    restartButton.disabled = false;
    restartButton.classList.add("ready");
  }
  if (shiftBoardBtn) {
    shiftBoardBtn.disabled = true;
  }
  chargeTransformBtn.disabled = true;
  routeToggleBtn.disabled = true;
  transformMode = false;
  if (transformToolbar) {
    transformToolbar.hidden = true;
  }
  routeMode = false;
  updateRouteButton();
  updateStabilizeButton();
  matchBoardEl.classList.add("board-disabled");
  tetraminoBoardEl.classList.add("board-disabled");
  flowGridEl.classList.add("board-disabled");
  logEvent("Reactor shutdown engaged. Restart to attempt a new run.");
  playCue("gameover");
}

function startNewRun(isInitial = false) {
  stopDropLoop();
  gameOver = false;
  reactorBusy = false;
  isResolvingMatches = false;
  if (alertTimeoutId) {
    window.clearTimeout(alertTimeoutId);
    alertTimeoutId = null;
  }
  if (restartButton) {
    restartButton.disabled = true;
    restartButton.classList.remove("ready");
  }
  chargeTransformBtn.disabled = false;
  routeToggleBtn.disabled = false;
  transformMode = false;
  if (transformToolbar) {
    transformToolbar.hidden = true;
  }
  matchBoardEl.classList.remove("board-disabled", "resolving");
  tetraminoBoardEl.classList.remove("board-disabled", "board-busy");
  flowGridEl.classList.remove("board-disabled");
  selectedTile = null;
  bridgePreview = null;
  if (bridgePreviewTimeout) {
    window.clearTimeout(bridgePreviewTimeout);
    bridgePreviewTimeout = null;
  }
  routeSelection = [];
  lastRouteStabilizeAt = 0;
  if (stabilizeCooldownTimeout) {
    window.clearTimeout(stabilizeCooldownTimeout);
    stabilizeCooldownTimeout = null;
  }
  pieceQueue = [];
  activePiece = null;
  tetraBoard = createMatrix(TETRA_HEIGHT, TETRA_WIDTH, null);
  dropDelay = DROP_DELAY_BASE;
  shiftOrientation = 0;
  pendingInfusions = [];
  bridgeSchematics = [];
  planIdCounter = 0;
  flowNodes = initializeFlowNodes();
  resourceMeterState = { earth: 0, water: 0, fire: 0, shift: 0 };
  updateMeters();
  shiftBoardBtn.disabled = true;
  initializeMatchBoard();
  resetTetraminoBoard();
  updateBridgeInventory();
  updateBridgeHint();
  updateRouteButton();
  flowGridEl.innerHTML = "";
  renderFlowGrid();
  eventLogEl.innerHTML = "";
  logEvent(
    isInitial
      ? "Reactor calibration online. Forge matches to begin the flow."
      : "Reactor rebooted. Forge matches to rebuild momentum."
  );
  scoreState = {
    score: 0,
    lines: 0,
    circuits: 0,
    integrity: 100,
    maxCombo: 0
  };
  breakCombo("reset", { silent: true });
  updateScoreboard();
  if (!isInitial) {
    showAlert("Integrity restored. Reconnect the lattice to climb again.", "info");
  } else {
    updateAlertForIntegrity();
  }
  startDropLoop();
}

function initializeMatchBoard() {
  matchBoard = createMatrix(BOARD_SIZE, BOARD_SIZE, null);
  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      let tile;
      do {
        tile = createRandomTile();
        matchBoard[y][x] = tile;
      } while (createsMatch(x, y));
    }
  }
  renderMatchBoard();
}

function createRandomTile() {
  const base = rockTypes[Math.floor(Math.random() * rockTypes.length)];
  return createTile(base);
}

function createTile(base) {
  return { ...base, empowered: false, infusion: null };
}

function createTileOfType(id) {
  const base = rockTypes.find((rock) => rock.id === id);
  return base ? createTile(base) : createRandomTile();
}

function createsMatch(x, y) {
  const tile = matchBoard[y][x];
  const horizontal =
    x >= 2 &&
    matchBoard[y][x - 1]?.id === tile.id &&
    matchBoard[y][x - 2]?.id === tile.id;
  const vertical =
    y >= 2 &&
    matchBoard[y - 1]?.[x]?.id === tile.id &&
    matchBoard[y - 2]?.[x]?.id === tile.id;
  return horizontal || vertical;
}

function renderMatchBoard() {
  matchBoardEl.classList.toggle("transform-mode", transformMode);
  matchBoardEl.classList.toggle("resolving", isResolvingMatches);
  matchBoardEl.classList.toggle("board-disabled", gameOver);
  matchBoardEl.innerHTML = "";
  matchNodes = [];
  matchBoard.forEach((row, y) => {
    row.forEach((tile, x) => {
      const tileEl = document.createElement("button");
      tileEl.type = "button";
      const classes = ["rock-tile", `rock-${tile.id}`];
      if (tile.empowered) {
        classes.push("rock-empowered");
      }
      if (tile.infusion) {
        classes.push("rock-infused", `rock-${tile.infusion}`);
      }
      tileEl.className = classes.join(" ");
      tileEl.setAttribute("data-x", x);
      tileEl.setAttribute("data-y", y);
      const ariaLabel = [`${tile.label} rock`];
      if (tile.empowered) {
        ariaLabel.push("empowered");
      }
      if (tile.infusion) {
        ariaLabel.push(`${tile.infusion} infusion`);
      }
      tileEl.setAttribute("aria-label", ariaLabel.join(", "));
      const label = document.createElement("span");
      label.className = "rock-label";
      label.textContent = tile.label;
      tileEl.append(label);
      if (tile.infusion) {
        const badge = document.createElement("span");
        badge.className = `rock-state ${tile.infusion}`;
        badge.textContent = infusionLabels[tile.infusion] ?? tile.infusion.slice(0, 2).toUpperCase();
        tileEl.append(badge);
        tileEl.title = `${tile.label} — ${tile.infusion} infusion`;
      } else {
        tileEl.title = tile.label;
      }
      tileEl.addEventListener("click", () => onTileClick(x, y));
      if (selectedTile && selectedTile.x === x && selectedTile.y === y) {
        tileEl.classList.add("selected");
      }
      matchBoardEl.append(tileEl);
      matchNodes.push(tileEl);
    });
  });
}

async function onTileClick(x, y) {
  if (isInputLocked()) {
    return;
  }
  if (transformMode) {
    applyTransformation(x, y);
    return;
  }

  if (!selectedTile) {
    selectedTile = { x, y };
    getTileElement(x, y).classList.add("selected");
    return;
  }

  if (selectedTile.x === x && selectedTile.y === y) {
    getTileElement(x, y).classList.remove("selected");
    selectedTile = null;
    return;
  }

  if (!areAdjacent(selectedTile, { x, y })) {
    getTileElement(selectedTile.x, selectedTile.y).classList.remove("selected");
    selectedTile = { x, y };
    getTileElement(x, y).classList.add("selected");
    return;
  }

  swapTiles(selectedTile, { x, y });
  const matches = findAllMatches();
  if (matches.length === 0) {
    swapTiles(selectedTile, { x, y });
    getTileElement(selectedTile.x, selectedTile.y).classList.remove("selected");
    selectedTile = null;
    breakCombo("dud");
    return;
  }

  await resolveMatches(matches);
  selectedTile = null;
}

function getTileElement(x, y) {
  return matchNodes[y * BOARD_SIZE + x];
}

function areAdjacent(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

function swapTiles(a, b) {
  const tmp = matchBoard[a.y][a.x];
  matchBoard[a.y][a.x] = matchBoard[b.y][b.x];
  matchBoard[b.y][b.x] = tmp;
  renderMatchBoard();
}

function findAllMatches() {
  const matches = [];
  const seen = new Set();
  for (let y = 0; y < BOARD_SIZE; y += 1) {
    let streak = 1;
    for (let x = 1; x < BOARD_SIZE; x += 1) {
      if (matchBoard[y][x].id === matchBoard[y][x - 1].id) {
        streak += 1;
      } else {
        if (streak >= 3) {
          for (let k = 0; k < streak; k += 1) {
            const key = `${x - 1 - k}-${y}`;
            if (!seen.has(key)) {
              matches.push({ x: x - 1 - k, y, tile: matchBoard[y][x - 1 - k] });
              seen.add(key);
            }
          }
        }
        streak = 1;
      }
    }
    if (streak >= 3) {
      for (let k = 0; k < streak; k += 1) {
        const key = `${BOARD_SIZE - 1 - k}-${y}`;
        if (!seen.has(key)) {
          matches.push({ x: BOARD_SIZE - 1 - k, y, tile: matchBoard[y][BOARD_SIZE - 1 - k] });
          seen.add(key);
        }
      }
    }
  }

  for (let x = 0; x < BOARD_SIZE; x += 1) {
    let streak = 1;
    for (let y = 1; y < BOARD_SIZE; y += 1) {
      if (matchBoard[y][x].id === matchBoard[y - 1][x].id) {
        streak += 1;
      } else {
        if (streak >= 3) {
          for (let k = 0; k < streak; k += 1) {
            const key = `${x}-${y - 1 - k}`;
            if (!seen.has(key)) {
              matches.push({ x, y: y - 1 - k, tile: matchBoard[y - 1 - k][x] });
              seen.add(key);
            }
          }
        }
        streak = 1;
      }
    }
    if (streak >= 3) {
      for (let k = 0; k < streak; k += 1) {
        const key = `${x}-${BOARD_SIZE - 1 - k}`;
        if (!seen.has(key)) {
          matches.push({ x, y: BOARD_SIZE - 1 - k, tile: matchBoard[BOARD_SIZE - 1 - k][x] });
          seen.add(key);
        }
      }
    }
  }
  return matches;
}

async function resolveMatches(matches) {
  if (!matches || matches.length === 0) {
    return;
  }
  isResolvingMatches = true;
  matchBoardEl.classList.add("resolving");
  const animatedNodes = matches
    .map(({ x, y }) => getTileElement(x, y))
    .filter((node) => Boolean(node));
  animatedNodes.forEach((node) => {
    node.classList.add("rock-resolving");
  });
  await delay(220);
  const matchSummary = new Map();
  const infusionSummary = { volcanic: 0, geolocked: 0, flux: 0, prismatic: 0 };
  const geolockedAnchors = [];
  matches.forEach(({ x, y, tile }) => {
    matchBoard[y][x] = null;
    const data = matchSummary.get(tile.id) ?? { count: 0, empowered: 0, meter: tile.meter };
    data.count += 1;
    if (tile.empowered) {
      data.empowered += 1;
    }
    matchSummary.set(tile.id, data);
    if (tile.infusion && infusionSummary[tile.infusion] !== undefined) {
      infusionSummary[tile.infusion] += 1;
      if (tile.infusion === "geolocked") {
        geolockedAnchors.push({ x, id: tile.id });
      }
    }
  });

  collapseColumns();
  refillColumns();
  const restoredColumns = reinforceGeolockedAnchors(geolockedAnchors);

  let totalMatches = 0;
  let totalEmpowered = 0;
  matchSummary.forEach((data, id) => {
    totalMatches += data.count;
    totalEmpowered += data.empowered;
    logEvent(`Matched ${data.count} ${id} rocks${data.empowered ? " with empowered resonance" : ""}.`);
    addResources(rockTypes.find((rock) => rock.id === id).meter, data.count * 8 + data.empowered * 12);
    enqueueTetramino(id, data.count, data.empowered);
  });

  if (totalMatches > 0) {
    const integrityBoost = Math.min(8, totalMatches + totalEmpowered * 2);
    if (integrityBoost > 0) {
      restoreIntegrity(integrityBoost);
    }
    registerCombo(Math.max(1, matchSummary.size), "match", matchBoardEl);
    awardScore(totalMatches * 8 + totalEmpowered * 6, matchBoardEl);
  }

  applyInfusionRewards(infusionSummary, restoredColumns);
  applyPendingInfusions();
  isResolvingMatches = false;
  renderMatchBoard();
}

function reinforceGeolockedAnchors(anchors) {
  if (anchors.length === 0) {
    return 0;
  }
  const columns = new Map();
  anchors.forEach(({ x, id }) => {
    if (!columns.has(x)) {
      columns.set(x, id);
    }
  });
  columns.forEach((id, x) => {
    const replacement = createTileOfType(id);
    replacement.empowered = true;
    matchBoard[0][x] = replacement;
  });
  return columns.size;
}

function applyInfusionRewards(infusionSummary, restoredColumns) {
  if (!infusionSummary) {
    return;
  }
  if (infusionSummary.volcanic) {
    addResources("fire", infusionSummary.volcanic * 14);
    enqueueTetramino("igneous", infusionSummary.volcanic, 0);
    const surgeText = infusionSummary.volcanic === 1 ? "surge" : "surges";
    logEvent(`Volcanic infusion ignited ${infusionSummary.volcanic} bonus fire ${surgeText}.`);
  }
  if (infusionSummary.flux) {
    addResources("water", infusionSummary.flux * 10);
    resourceMeterState.shift = Math.min(100, resourceMeterState.shift + infusionSummary.flux * 12);
    updateMeters();
    logEvent(`Flux infusion accelerated shift charge across ${infusionSummary.flux} rock${
      infusionSummary.flux > 1 ? "s" : ""
    }.`);
  }
  if (infusionSummary.prismatic) {
    addResources("earth", infusionSummary.prismatic * 6);
    addResources("fire", infusionSummary.prismatic * 6);
    addResources("water", infusionSummary.prismatic * 6);
    addResources("shift", infusionSummary.prismatic * 10);
    logEvent(`Prismatic resonance cascaded through ${infusionSummary.prismatic} match${
      infusionSummary.prismatic > 1 ? "es" : ""
    }.`);
  }
  if (infusionSummary.geolocked) {
    const columnText = restoredColumns ?? 0;
    if (columnText > 0) {
      logEvent(
        `Geolocked memory reformed ${columnText} column${columnText === 1 ? "" : "s"} with empowered anchors.`
      );
    } else {
      logEvent("Geolocked memory fortified existing anchors.");
    }
  }
}

function collapseColumns() {
  for (let x = 0; x < BOARD_SIZE; x += 1) {
    const column = [];
    for (let y = 0; y < BOARD_SIZE; y += 1) {
      if (matchBoard[y][x]) {
        column.push(matchBoard[y][x]);
      }
    }
    for (let y = BOARD_SIZE - 1; y >= 0; y -= 1) {
      matchBoard[y][x] = column.pop() ?? null;
    }
  }
}

function refillColumns() {
  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      if (!matchBoard[y][x]) {
        matchBoard[y][x] = createRandomTile();
      }
    }
  }
}

function enqueueTetramino(id, count, empoweredCount) {
  if (gameOver) {
    return;
  }
  const definition = pieceDefinitions[id];
  if (!definition) {
    return;
  }
  const bonusPieces = Math.floor((count + empoweredCount) / 4);
  const totalPieces = 1 + bonusPieces;
  for (let i = 0; i < totalPieces; i += 1) {
    pieceQueue.push({ id, rotation: 0 });
  }
  updateQueueDisplay();
  if (!activePiece) {
    spawnNextPiece();
  }
}

function updateQueueDisplay() {
  pieceQueueEl.innerHTML = "";
  pieceQueue.forEach((piece) => {
    const wrapper = document.createElement("div");
    wrapper.className = "queue-piece";
    const matrix = pieceDefinitions[piece.id].rotations[0];
    matrix.forEach((row) => {
      row.forEach((value) => {
        const cell = document.createElement("div");
        if (value) {
          cell.style.background = getQueueColor(piece.id);
        } else {
          cell.style.background = "transparent";
        }
        wrapper.append(cell);
      });
    });
    pieceQueueEl.append(wrapper);
  });
}

function getQueueColor(id) {
  switch (id) {
    case "sedimentary":
      return "#8bb974";
    case "igneous":
      return "#ef5350";
    case "metamorphic":
      return "#64b5f6";
    case "crystal":
      return "#b39ddb";
    default:
      return "#90a4ae";
  }
}

function spawnNextPiece() {
  if (gameOver) {
    return;
  }
  if (pieceQueue.length === 0) {
    updateQueueDisplay();
    return;
  }
  const next = pieceQueue.shift();
  updateQueueDisplay();
  activePiece = {
    ...next,
    x: 3,
    y: 0,
    rotation: next.rotation ?? 0
  };
  if (collides(activePiece, 0, 0)) {
    triggerGameOver("The reactor is overwhelmed by backlog shards.");
    return;
  }
  renderTetraminoBoard();
}

function collides(piece, offsetX, offsetY, rotationIndex = piece.rotation) {
  const matrix = pieceDefinitions[piece.id].rotations[rotationIndex];
  for (let y = 0; y < matrix.length; y += 1) {
    for (let x = 0; x < matrix[y].length; x += 1) {
      if (!matrix[y][x]) {
        continue;
      }
      const boardX = piece.x + x + offsetX;
      const boardY = piece.y + y + offsetY;
      if (boardX < 0 || boardX >= TETRA_WIDTH || boardY >= TETRA_HEIGHT) {
        return true;
      }
      if (boardY >= 0 && tetraBoard[boardY][boardX]) {
        return true;
      }
    }
  }
  return false;
}

async function placePiece() {
  if (!activePiece || reactorBusy) {
    return;
  }
  reactorBusy = true;
  const placedId = activePiece.id;
  const placedRotation = activePiece.rotation;
  const matrix = pieceDefinitions[activePiece.id].rotations[activePiece.rotation];
  try {
    for (let y = 0; y < matrix.length; y += 1) {
      for (let x = 0; x < matrix[y].length; x += 1) {
        if (!matrix[y][x]) {
          continue;
        }
        const boardX = activePiece.x + x;
        const boardY = activePiece.y + y;
        if (boardY >= 0 && boardY < TETRA_HEIGHT) {
          tetraBoard[boardY][boardX] = {
            id: activePiece.id,
            className: pieceDefinitions[activePiece.id].colorClass
          };
        }
      }
    }
    activePiece = null;
    renderTetraminoBoard();
    const cleared = await clearLines();
    if (cleared > 0) {
      handleLineClear(cleared, placedId, placedRotation);
    } else {
      damageIntegrity(6, "Shard stacks tower and integrity buckles.");
      breakCombo("stalled");
    }
  } finally {
    reactorBusy = false;
    if (!gameOver) {
      spawnNextPiece();
      renderTetraminoBoard();
    }
  }
}

async function clearLines() {
  const rowsToClear = [];
  for (let y = TETRA_HEIGHT - 1; y >= 0; y -= 1) {
    if (tetraBoard[y].every((cell) => cell)) {
      rowsToClear.push(y);
    }
  }
  if (rowsToClear.length === 0) {
    return 0;
  }
  rowsToClear.forEach((row) => {
    for (let x = 0; x < TETRA_WIDTH; x += 1) {
      const cell = tetraBoard[row][x];
      if (cell) {
        tetraBoard[row][x] = { ...cell, clearing: true };
      }
    }
  });
  renderTetraminoBoard();
  await delay(260);
  rowsToClear
    .sort((a, b) => b - a)
    .forEach((row) => {
      tetraBoard.splice(row, 1);
      tetraBoard.unshift(Array.from({ length: TETRA_WIDTH }, () => null));
    });
  renderTetraminoBoard();
  return rowsToClear.length;
}

function handleLineClear(count, id, rotationIndex = 0) {
  const awardType = id ?? "sedimentary";
  logEvent(`Cleared ${count} reactor line${count > 1 ? "s" : ""}. Bridges readied.`);
  scoreState.lines += count;
  flashMetric(linesMetricEl);
  registerCombo(Math.max(1, count), "line", tetraminoBoardEl);
  awardScore(count * 120, tetraminoBoardEl);
  restoreIntegrity(12 + count * 3, "Line clears fortify the reactor's integrity.");
  addResources(mapPieceToMeter(awardType), 14 * count);
  extendFlowWithBridges(count, awardType, rotationIndex);
}

function mapPieceToMeter(id) {
  switch (id) {
    case "igneous":
      return "fire";
    case "metamorphic":
      return "water";
    case "crystal":
      return "shift";
    default:
      return "earth";
  }
}

function resetTetraminoBoard() {
  tetraBoard = createMatrix(TETRA_HEIGHT, TETRA_WIDTH, null);
  pieceQueue = [];
  activePiece = null;
  renderTetraminoBoard();
  updateQueueDisplay();
}

function renderTetraminoBoard() {
  tetraminoBoardEl.classList.toggle("board-busy", reactorBusy);
  tetraminoBoardEl.classList.toggle("board-disabled", gameOver);
  tetraminoBoardEl.innerHTML = "";
  for (let y = 0; y < TETRA_HEIGHT; y += 1) {
    for (let x = 0; x < TETRA_WIDTH; x += 1) {
      const cell = document.createElement("div");
      cell.className = "tetra-cell";
      const value = tetraBoard[y][x];
      if (value) {
        cell.classList.add(value.className);
        if (value.clearing) {
          cell.classList.add("line-clearing");
        }
      }
      if (activePiece) {
        const matrix = pieceDefinitions[activePiece.id].rotations[activePiece.rotation];
        const relX = x - activePiece.x;
        const relY = y - activePiece.y;
        if (
          relX >= 0 &&
          relX < matrix[0].length &&
          relY >= 0 &&
          relY < matrix.length &&
          matrix[relY][relX]
        ) {
          cell.classList.add(pieceDefinitions[activePiece.id].colorClass);
        }
      }
      tetraminoBoardEl.append(cell);
    }
  }
}

function dropStep() {
  if (gameOver || reactorBusy) {
    return;
  }
  if (!activePiece) {
    spawnNextPiece();
    return;
  }
  if (!collides(activePiece, 0, 1)) {
    activePiece.y += 1;
    applyIntegrityDrift();
    renderTetraminoBoard();
  } else {
    placePiece();
  }
}

function rotatePiece(direction = 1) {
  if (!activePiece || isInputLocked()) {
    return;
  }
  const definition = pieceDefinitions[activePiece.id];
  const total = definition.rotations.length;
  const nextRotation = (activePiece.rotation + direction + total) % total;
  for (const offset of ROTATION_KICKS) {
    if (!collides(activePiece, offset.x, offset.y, nextRotation)) {
      activePiece.x += offset.x;
      activePiece.y += offset.y;
      activePiece.rotation = nextRotation;
      renderTetraminoBoard();
      return;
    }
  }
}

function movePiece(offset) {
  if (!activePiece || isInputLocked()) {
    return;
  }
  if (!collides(activePiece, offset, 0)) {
    activePiece.x += offset;
    renderTetraminoBoard();
  }
}

function softDrop() {
  if (!activePiece || isInputLocked()) {
    return;
  }
  if (!collides(activePiece, 0, 1)) {
    activePiece.y += 1;
    applyIntegrityDrift();
    renderTetraminoBoard();
  }
}

function applyTransformation(x, y) {
  if (gameOver) {
    return;
  }
  const tile = matchBoard[y][x];
  if (tile.empowered) {
    logEvent("This rock already carries a charged state.");
    return;
  }
  if (resourceMeterState.earth < TRANSFORM_COST.earth || resourceMeterState.water < TRANSFORM_COST.water) {
    logEvent("Not enough routed energy to transmute.");
    return;
  }
  resourceMeterState.earth -= TRANSFORM_COST.earth;
  resourceMeterState.water -= TRANSFORM_COST.water;
  tile.empowered = true;
  renderMatchBoard();
  updateMeters();
  exitTransformMode();
  logEvent(`Empowered a ${tile.id} rock via flow resonance.`);
  addResources("shift", 16);
  damageIntegrity(5, "Channeling resonance taxes the core's integrity.");
}

function enterTransformMode() {
  if (gameOver) {
    return;
  }
  if (transformMode) {
    return;
  }
  if (resourceMeterState.earth < TRANSFORM_COST.earth || resourceMeterState.water < TRANSFORM_COST.water) {
    logEvent("Channel requires earth and water energy reserves.");
    return;
  }
  transformMode = true;
  transformToolbar.hidden = false;
  chargeTransformBtn.disabled = true;
  renderMatchBoard();
}

function exitTransformMode() {
  transformMode = false;
  transformToolbar.hidden = true;
  chargeTransformBtn.disabled = false;
  renderMatchBoard();
}

function addResources(type, amount) {
  if (gameOver) {
    return;
  }
  resourceMeterState[type] = Math.min(100, resourceMeterState[type] + amount);
  updateMeters();
  if (resourceMeterState.shift >= SHIFT_THRESHOLD) {
    shiftBoardBtn.disabled = false;
  }
}

function updateMeters() {
  Object.entries(meters).forEach(([type, element]) => {
    element.value = resourceMeterState[type];
  });
}

function initializeFlowNodes() {
  const nodes = [];
  const wells = new Set([2, 7, 28]);
  const conduits = new Set([9, 26, 33]);
  for (let i = 0; i < 36; i += 1) {
    let kind = "empty";
    if (wells.has(i)) {
      kind = "well";
    }
    if (conduits.has(i)) {
      kind = "conduit";
    }
    nodes.push({ kind, bridged: false, locked: false, schematic: null });
  }
  return nodes;
}

function updateStabilizeButton() {
  if (!stabilizeRouteBtn) {
    return;
  }
  const now = Date.now();
  const lockedCount = routeSelection.filter((index) => flowNodes[index]?.locked).length;
  const onCooldown = now - lastRouteStabilizeAt < ROUTE_STABILIZE_COOLDOWN_MS;
  const canStabilize =
    routeMode &&
    !gameOver &&
    lockedCount >= ROUTE_STABILIZE_MIN_LOCKED &&
    !onCooldown;
  stabilizeRouteBtn.disabled = !canStabilize;
  if (canStabilize) {
    stabilizeRouteBtn.title = "Channel stored flow across the selected route to restore integrity.";
  } else if (gameOver) {
    stabilizeRouteBtn.title = "Reactor offline. Restart the run to stabilize routes again.";
  } else if (!routeMode) {
    stabilizeRouteBtn.title = "Enable Plan Routes to target bridges for stabilization.";
  } else if (onCooldown) {
    const remaining = Math.max(
      0,
      Math.ceil((ROUTE_STABILIZE_COOLDOWN_MS - (now - lastRouteStabilizeAt)) / 1000)
    );
    stabilizeRouteBtn.title =
      remaining > 0
        ? `Stabilizer recalibrating. Ready in ${remaining} second${remaining === 1 ? "" : "s"}.`
        : "Stabilizer recalibrating.";
  } else if (lockedCount < ROUTE_STABILIZE_MIN_LOCKED) {
    stabilizeRouteBtn.title = "Select at least three locked bridges to steady the flow.";
  } else {
    stabilizeRouteBtn.title = "";
  }
}

function renderFlowGrid() {
  flowGridEl.classList.toggle("board-disabled", gameOver);
  flowGridEl.innerHTML = "";
  const previewCells = new Set(bridgePreview?.cells ?? []);
  const previewValid = bridgePreview?.valid ?? false;
  flowNodes.forEach((node, index) => {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "flow-node";
    if (node.kind === "well") {
      cell.classList.add("well");
      cell.textContent = "W";
    } else if (node.kind === "conduit") {
      cell.classList.add("conduit");
      cell.textContent = "C";
    } else if (node.bridged) {
      cell.classList.add("bridge");
      if (node.locked) {
        cell.classList.add("locked");
        cell.textContent = "";
      } else {
        cell.textContent = "B";
      }
    } else {
      cell.textContent = "";
    }
    if (routeSelection.includes(index)) {
      cell.classList.add("route-selected");
    }
    if (previewCells.has(index)) {
      cell.classList.add(previewValid ? "bridge-preview" : "bridge-invalid");
    }
    cell.addEventListener("click", () => onFlowNodeClick(index));
    flowGridEl.append(cell);
  });
  updateStabilizeButton();
}

function onFlowNodeClick(index) {
  if (!routeMode) {
    return;
  }
  const node = flowNodes[index];
  if (node.kind === "well" || node.kind === "conduit" || node.bridged) {
    if (routeSelection.includes(index)) {
      routeSelection = routeSelection.filter((value) => value !== index);
    } else {
      routeSelection.push(index);
    }
    renderFlowGrid();
    return;
  }
  if (bridgeSchematics.length === 0) {
    logEvent("No schematics ready. Clear reactor lines to craft more.");
    setBridgePreview([index], false);
    return;
  }
  attemptPlaceSchematic(index);
}

function extendFlowWithBridges(count, id, rotationIndex = 0) {
  if (gameOver) {
    return;
  }
  const plan = createBridgePlan(id, rotationIndex);
  if (!plan) {
    return;
  }
  for (let i = 0; i < count; i += 1) {
    bridgeSchematics.push({ ...plan, uid: `${plan.id}-${planIdCounter}` });
    planIdCounter += 1;
  }
  logEvent(
    `Drafted ${count} ${plan.label} schematic${count > 1 ? "s" : ""} from the reactor.`
  );
  awardScore(count * 20, flowGridEl);
  restoreIntegrity(Math.min(6, count * 2));
  routeMode = true;
  updateRouteButton();
  updateBridgeInventory();
  updateBridgeHint();
  renderFlowGrid();
}

function updateRouteButton() {
  routeToggleBtn.textContent = routeMode
    ? `Routing Active (${bridgeSchematics.length})`
    : `Plan Routes (${bridgeSchematics.length})`;
}

function toggleRouteMode() {
  if (gameOver) {
    return;
  }
  routeMode = !routeMode;
  if (!routeMode) {
    routeSelection = [];
    if (bridgePreviewTimeout) {
      window.clearTimeout(bridgePreviewTimeout);
      bridgePreviewTimeout = null;
    }
    bridgePreview = null;
  }
  updateRouteButton();
  updateBridgeHint();
  renderFlowGrid();
}

function stabilizeSelectedRoute() {
  if (!routeMode || gameOver) {
    return;
  }
  const now = Date.now();
  if (now - lastRouteStabilizeAt < ROUTE_STABILIZE_COOLDOWN_MS) {
    logEvent("Stabilizer still recalibrating. Give it a moment to recharge.");
    updateStabilizeButton();
    return;
  }
  const lockedNodes = routeSelection.filter((index) => flowNodes[index]?.locked);
  if (lockedNodes.length < ROUTE_STABILIZE_MIN_LOCKED) {
    logEvent("Select at least three locked bridges to channel stability.");
    updateStabilizeButton();
    return;
  }
  const restored = ROUTE_STABILIZE_BASE + lockedNodes.length * ROUTE_STABILIZE_PER_NODE;
  restoreIntegrity(
    restored,
    "Stabilized flow routes reinforce the reactor's structural integrity."
  );
  logEvent(`Stabilized ${lockedNodes.length} bridge node${lockedNodes.length === 1 ? "" : "s"}.`);
  lastRouteStabilizeAt = now;
  if (stabilizeCooldownTimeout) {
    window.clearTimeout(stabilizeCooldownTimeout);
  }
  stabilizeCooldownTimeout = window.setTimeout(() => {
    stabilizeCooldownTimeout = null;
    updateStabilizeButton();
  }, ROUTE_STABILIZE_COOLDOWN_MS);
  updateStabilizeButton();
}

function createBridgePlan(id, rotationIndex = 0) {
  const definition = pieceDefinitions[id];
  if (!definition) {
    return null;
  }
  const rotation = definition.rotations[rotationIndex] ?? definition.rotations[0];
  const cells = [];
  rotation.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        cells.push({ x, y });
      }
    });
  });
  if (cells.length === 0) {
    return null;
  }
  const minX = Math.min(...cells.map((cell) => cell.x));
  const minY = Math.min(...cells.map((cell) => cell.y));
  const normalized = cells.map((cell) => ({ x: cell.x - minX, y: cell.y - minY }));
  const width = Math.max(...normalized.map((cell) => cell.x)) + 1;
  const height = Math.max(...normalized.map((cell) => cell.y)) + 1;
  return {
    id,
    rotation: rotationIndex,
    cells: normalized,
    width,
    height,
    label: mapPieceToSchematicLabel(id)
  };
}

function mapPieceToSchematicLabel(id) {
  switch (id) {
    case "igneous":
      return "Volcanic Span";
    case "metamorphic":
      return "Flux Channel";
    case "crystal":
      return "Prism Arch";
    default:
      return "Stonework Bridge";
  }
}

function attemptPlaceSchematic(anchorIndex) {
  if (gameOver) {
    return;
  }
  const plan = bridgeSchematics[0];
  if (!plan) {
    return;
  }
  const baseRow = Math.floor(anchorIndex / 6);
  const baseCol = anchorIndex % 6;
  const targetCells = [];
  let valid = true;
  plan.cells.forEach((cell) => {
    const row = baseRow + cell.y;
    const col = baseCol + cell.x;
    if (row < 0 || row >= 6 || col < 0 || col >= 6) {
      valid = false;
      return;
    }
    const index = row * 6 + col;
    const target = flowNodes[index];
    if (!target || target.kind !== "empty" || target.bridged) {
      valid = false;
      return;
    }
    targetCells.push(index);
  });
  const previewCells = Array.from(
    new Set([
      ...targetCells,
      ...plan.cells
        .map((cell) => {
          const row = baseRow + cell.y;
          const col = baseCol + cell.x;
          if (row < 0 || row >= 6 || col < 0 || col >= 6) {
            return null;
          }
          return row * 6 + col;
        })
        .filter((value) => value !== null)
    ])
  );
  if (!valid || targetCells.length !== plan.cells.length) {
    setBridgePreview(previewCells.length ? previewCells : [anchorIndex], false);
    logEvent("Schematic can't lock there. Choose an open lattice that fits the shape.");
    return;
  }
  targetCells.forEach((targetIndex) => {
    const target = flowNodes[targetIndex];
    target.bridged = true;
    target.locked = true;
    target.kind = "bridge";
    target.schematic = plan.id;
  });
  bridgeSchematics.shift();
  setBridgePreview(targetCells, true);
  routeSelection = Array.from(new Set([...routeSelection, ...targetCells]));
  logEvent(`Locked a ${plan.label} into the flow lattice.`);
  awardScore(plan.cells.length * 12, flowGridEl);
  restoreIntegrity(Math.min(8, plan.cells.length * 2));
  updateBridgeInventory();
  updateRouteButton();
  updateBridgeHint();
  evaluateNetwork(plan.id);
}

function setBridgePreview(cells, valid) {
  if (bridgePreviewTimeout) {
    window.clearTimeout(bridgePreviewTimeout);
    bridgePreviewTimeout = null;
  }
  bridgePreview = { cells, valid };
  renderFlowGrid();
  bridgePreviewTimeout = window.setTimeout(() => {
    bridgePreview = null;
    renderFlowGrid();
  }, 900);
}

function updateBridgeInventory() {
  if (!bridgeInventoryEl) {
    return;
  }
  bridgeInventoryEl.innerHTML = "";
  if (bridgeSchematics.length === 0) {
    const empty = document.createElement("p");
    empty.className = "schematic-label";
    empty.textContent = "No schematics queued.";
    bridgeInventoryEl.append(empty);
    updateBridgeHint();
    return;
  }
  bridgeSchematics.forEach((plan, index) => {
    const card = document.createElement("div");
    card.className = "schematic-card";
    if (index === 0) {
      card.classList.add("active");
    }
    const grid = document.createElement("div");
    grid.className = "schematic-grid";
    grid.style.gridTemplateColumns = `repeat(${plan.width}, 10px)`;
    grid.style.gridTemplateRows = `repeat(${plan.height}, 10px)`;
    const filled = new Set(plan.cells.map((cell) => `${cell.x}-${cell.y}`));
    for (let y = 0; y < plan.height; y += 1) {
      for (let x = 0; x < plan.width; x += 1) {
        const cell = document.createElement("div");
        if (filled.has(`${x}-${y}`)) {
          cell.classList.add("filled");
        }
        grid.append(cell);
      }
    }
    const label = document.createElement("span");
    label.className = "schematic-label";
    label.textContent = `${plan.label} (${plan.cells.length} nodes)`;
    card.append(grid, label);
    bridgeInventoryEl.append(card);
  });
  updateBridgeHint();
}

function updateBridgeHint() {
  if (!bridgeHintEl) {
    return;
  }
  if (bridgeSchematics.length === 0) {
    bridgeHintEl.textContent = "Clear reactor lines to forge new schematics.";
    return;
  }
  if (!routeMode) {
    bridgeHintEl.textContent = "Enable Plan Routes to slot the next schematic.";
    return;
  }
  bridgeHintEl.textContent = "Select a lattice cell to anchor the highlighted schematic footprint.";
}

function evaluateNetwork(idHint) {
  const adjacency = (index) => {
    const row = Math.floor(index / 6);
    const col = index % 6;
    const neighbors = [];
    const offsets = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ];
    offsets.forEach(([dx, dy]) => {
      const newRow = row + dy;
      const newCol = col + dx;
      if (newRow >= 0 && newRow < 6 && newCol >= 0 && newCol < 6) {
        neighbors.push(newRow * 6 + newCol);
      }
    });
    return neighbors;
  };

  const wells = flowNodes
    .map((node, index) => ({ node, index }))
    .filter(({ node }) => node.kind === "well");
  const conduits = flowNodes
    .map((node, index) => ({ node, index }))
    .filter(({ node }) => node.kind === "conduit");

  const bridgedNodes = new Set(
    flowNodes
      .map((node, index) => (node.kind !== "empty" || node.bridged ? index : null))
      .filter((value) => value !== null)
  );

  wells.forEach(({ index }) => {
    const visited = new Set([index]);
    const stack = [index];
    while (stack.length) {
      const current = stack.pop();
      adjacency(current).forEach((neighbor) => {
        if (!bridgedNodes.has(neighbor) || visited.has(neighbor)) {
          return;
        }
        visited.add(neighbor);
        stack.push(neighbor);
      });
    }
    conduits.forEach(({ index: conduitIndex }) => {
      if (visited.has(conduitIndex)) {
        completeCircuit(idHint);
      }
    });
  });
}

function completeCircuit(idHint) {
  if (gameOver) {
    return;
  }
  const infusion = determineInfusion(idHint);
  logEvent(
    `Completed a flow circuit. Energy surges through the lattice${
      infusion ? ` and a ${formatInfusionName(infusion)} shard forms.` : "."
    }`
  );
  addResources(idHint ? mapPieceToMeter(idHint) : "earth", 20);
  addResources("fire", 10);
  scoreState.circuits += 1;
  flashMetric(circuitsMetricEl);
  awardScore(180 + (infusion ? 40 : 0), flowGridEl);
  restoreIntegrity(18, "Circuit sealed and stability surges.");
  if (infusion) {
    queueInfusion(infusion);
  }
}

function determineInfusion(idHint) {
  if (idHint && infusionMapping[idHint]) {
    return infusionMapping[idHint];
  }
  const types = Object.keys(infusionLabels);
  if (types.length === 0) {
    return null;
  }
  return types[Math.floor(Math.random() * types.length)];
}

function queueInfusion(type) {
  if (gameOver) {
    return;
  }
  pendingInfusions.push(type);
  applyPendingInfusions();
}

function applyPendingInfusions() {
  if (gameOver || pendingInfusions.length === 0) {
    return;
  }
  const remaining = [];
  let infusedAny = false;
  pendingInfusions.forEach((type) => {
    const infused = infuseTileWithState(type);
    if (infused) {
      infusedAny = true;
      logEvent(
        `Infused a ${infused.tile.label} rock with ${formatInfusionName(type)} energy.`
      );
    } else {
      remaining.push(type);
    }
  });
  pendingInfusions = remaining;
  if (infusedAny) {
    renderMatchBoard();
  }
}

function infuseTileWithState(type) {
  const targetId = infusionTargets[type];
  const preferred = [];
  const fallback = [];
  matchBoard.forEach((row) => {
    row.forEach((tile) => {
      if (!tile.infusion) {
        if (!targetId || tile.id === targetId) {
          preferred.push(tile);
        } else {
          fallback.push(tile);
        }
      }
    });
  });
  const pool = preferred.length > 0 ? preferred : fallback;
  if (pool.length === 0) {
    return null;
  }
  const tile = pool[Math.floor(Math.random() * pool.length)];
  tile.infusion = type;
  return { tile };
}

function logEvent(message) {
  const entry = document.createElement("p");
  entry.textContent = message;
  eventLogEl.prepend(entry);
  while (eventLogEl.children.length > 8) {
    eventLogEl.removeChild(eventLogEl.lastChild);
  }
}

function startDropLoop() {
  stopDropLoop();
  if (gameOver) {
    return;
  }
  dropIntervalId = window.setInterval(dropStep, dropDelay);
}

function applyShiftActuation() {
  if (resourceMeterState.shift < SHIFT_THRESHOLD || gameOver) {
    return;
  }
  resourceMeterState.shift = 0;
  shiftOrientation = (shiftOrientation + 1) % 4;
  dropDelay = Math.max(DROP_DELAY_MIN, dropDelay - 80);
  updateMeters();
  shiftBoardBtn.disabled = true;
  reorientNetwork();
  restoreIntegrity(10, "Actuation vents stress across the flow lattice.");
  startDropLoop();
  logEvent("Actuated shift realigned the reactor relative to the flow grid.");
}

function reorientNetwork() {
  const rotated = [];
  for (let row = 0; row < 6; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      const sourceRow = 5 - col;
      const sourceCol = row;
      rotated[row * 6 + col] = { ...flowNodes[sourceRow * 6 + sourceCol] };
    }
  }
  for (let i = 0; i < flowNodes.length; i += 1) {
    flowNodes[i] = rotated[i];
  }
  renderFlowGrid();
}

const scrollBlockingKeys = new Set(["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " "]);

function onKeyDown(event) {
  if (scrollBlockingKeys.has(event.key)) {
    event.preventDefault();
  }
  if (gameOver) {
    return;
  }
  switch (event.key) {
    case "ArrowLeft":
      movePiece(-1);
      break;
    case "ArrowRight":
      movePiece(1);
      break;
    case "ArrowDown":
      softDrop();
      break;
    case "ArrowUp":
    case "x":
    case "X":
      rotatePiece(1);
      break;
    case "z":
    case "Z":
      rotatePiece(-1);
      break;
    case " ":
      if (isInputLocked()) {
        return;
      }
      while (activePiece && !collides(activePiece, 0, 1)) {
        activePiece.y += 1;
      }
      placePiece();
      break;
    default:
      break;
  }
}

chargeTransformBtn.addEventListener("click", enterTransformMode);
cancelTransformBtn.addEventListener("click", exitTransformMode);
shiftBoardBtn.addEventListener("click", applyShiftActuation);
routeToggleBtn.addEventListener("click", toggleRouteMode);
if (stabilizeRouteBtn) {
  stabilizeRouteBtn.addEventListener("click", stabilizeSelectedRoute);
}
if (restartButton) {
  restartButton.addEventListener("click", () => startNewRun(false));
}
document.addEventListener("pointerdown", unlockAudioContext, { once: true });
document.addEventListener("keydown", unlockAudioContext, { once: true });
window.addEventListener("keydown", onKeyDown);

startNewRun(true);
