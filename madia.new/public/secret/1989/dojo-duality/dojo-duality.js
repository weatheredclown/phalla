import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { autoEnhanceFeedback } from "../feedback.js";

const scoreConfig = getScoreConfig("dojo-duality");
const highScore = initHighScoreBanner({
  gameId: "dojo-duality",
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

const COLS = 10;
const ROWS = 18;
const START_INTERVAL = 900;
const MIN_INTERVAL = 240;
const FREEZE_DURATION = 3_500;
const FEAR_DECAY = 0.25;
const BALANCE_RECENTER = 0.35;
const FOCUS_SAFE_THRESHOLD = 20;
const MAX_LOG_ENTRIES = 12;

const TETROMINOS = [
  {
    name: "crane",
    rotations: [
      [
        { x: 0, y: 0 },
        { x: -1, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
      ],
      [
        { x: 0, y: 0 },
        { x: 0, y: -1 },
        { x: 0, y: 1 },
        { x: 1, y: 0 },
      ],
      [
        { x: 0, y: 0 },
        { x: -1, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: -1 },
      ],
      [
        { x: 0, y: 0 },
        { x: 0, y: -1 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
      ],
    ],
  },
  {
    name: "sweep",
    rotations: [
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: -1, y: 1 },
      ],
      [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 1, y: 2 },
      ],
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: -1 },
        { x: -1, y: -1 },
      ],
      [
        { x: 0, y: 0 },
        { x: -1, y: 0 },
        { x: -1, y: 1 },
        { x: -1, y: 2 },
      ],
    ],
  },
  {
    name: "ridge",
    rotations: [
      [
        { x: 0, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
      ],
      [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: -1, y: 1 },
        { x: -1, y: 2 },
      ],
      [
        { x: 0, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: -1 },
        { x: 1, y: -1 },
      ],
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 1, y: 2 },
      ],
    ],
  },
  {
    name: "stance",
    rotations: [
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
      ],
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
      ],
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
      ],
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
      ],
    ],
  },
];

const boardElement = document.getElementById("board");
const startButton = document.getElementById("start-match");
const resetButton = document.getElementById("reset-match");
const craneButton = document.getElementById("crane-kick");
const statusBar = document.getElementById("dojo-status");
const balanceMarker = document.getElementById("balance-marker");
const balanceReading = document.getElementById("balance-reading");
const defenseFill = document.getElementById("defense-fill");
const defenseReading = document.getElementById("defense-reading");
const fearFill = document.getElementById("fear-fill");
const fearReading = document.getElementById("fear-reading");
const logEntries = document.getElementById("log-entries");

const cells = [];

const state = {
  running: false,
  board: createBoard(),
  active: null,
  rotation: 0,
  position: { x: 0, y: 0 },
  dropInterval: START_INTERVAL,
  dropTimer: 0,
  nextPiece: null,
  freezeUntil: 0,
  defense: 0,
  fear: 0,
  balance: 0,
  focusScore: 0,
  bestFocus: 0,
};

initializeBoard();
updateMeters();
updateButtons();
renderBoard();

startButton.addEventListener("click", () => {
  if (state.running) {
    return;
  }
  startMatch();
});

resetButton.addEventListener("click", () => {
  resetMatch();
  updateStatus("Board cleared. Press Begin Match to resume training.");
});

craneButton.addEventListener("click", () => {
  attemptCraneKick();
});

window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);

function createBoard() {
  return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null));
}

function initializeBoard() {
  boardElement.innerHTML = "";
  cells.length = 0;
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-label", "Empty cell");
      boardElement.append(cell);
      cells.push(cell);
    }
  }
}

function startMatch() {
  resetMatch();
  state.running = true;
  state.nextPiece = randomPiece();
  spawnPiece();
  updateStatus("Match begins. Keep Daniel centered.");
  scheduleTick();
}

function resetMatch() {
  clearTimeout(state.dropTimer);
  state.running = false;
  state.board = createBoard();
  state.active = null;
  state.rotation = 0;
  state.position = { x: 0, y: 0 };
  state.dropInterval = START_INTERVAL;
  state.nextPiece = null;
  state.freezeUntil = 0;
  state.defense = 0;
  state.fear = 0;
  state.balance = 0;
  state.focusScore = 0;
  state.bestFocus = 0;
  renderBoard();
  updateMeters();
  updateButtons();
  clearLog();
}

function spawnPiece() {
  state.active = state.nextPiece ?? randomPiece();
  state.rotation = 0;
  state.position = { x: Math.floor(COLS / 2), y: -1 };
  state.nextPiece = randomPiece();
  if (!isValidPosition(state.position.x, state.position.y, state.rotation)) {
    endMatch("The mat overflows. Focus slips away.");
    return;
  }
  renderBoard();
  updateButtons();
}

function randomPiece() {
  const shape = TETROMINOS[Math.floor(Math.random() * TETROMINOS.length)];
  const type = Math.random() < 0.55 ? "positive" : "negative";
  return { shape, type };
}

function handleKeyDown(event) {
  if (!state.running) {
    return;
  }
  const now = Date.now();
  const frozen = now < state.freezeUntil;
  switch (event.key) {
    case "ArrowLeft":
      if (!frozen) {
        event.preventDefault();
        movePiece(-1, 0);
      }
      break;
    case "ArrowRight":
      if (!frozen) {
        event.preventDefault();
        movePiece(1, 0);
      }
      break;
    case "ArrowDown":
      event.preventDefault();
      softDrop();
      break;
    case "z":
    case "Z":
      if (!frozen) {
        event.preventDefault();
        rotatePiece(-1);
      }
      break;
    case "x":
    case "X":
      if (!frozen) {
        event.preventDefault();
        rotatePiece(1);
      }
      break;
    case " ":
      event.preventDefault();
      attemptCraneKick();
      break;
    default:
      break;
  }
}

function handleKeyUp(event) {
  if (event.key === "ArrowDown") {
    event.preventDefault();
  }
}

function movePiece(dx, dy) {
  const newX = state.position.x + dx;
  const newY = state.position.y + dy;
  if (isValidPosition(newX, newY, state.rotation)) {
    state.position = { x: newX, y: newY };
    renderBoard();
    return true;
  }
  if (dy === 1) {
    lockPiece();
  }
  return false;
}

function softDrop() {
  if (!state.running) {
    return;
  }
  if (!movePiece(0, 1)) {
    lockPiece();
  }
}

function rotatePiece(direction) {
  const newRotation = (state.rotation + direction + 4) % 4;
  if (isValidPosition(state.position.x, state.position.y, newRotation)) {
    state.rotation = newRotation;
    renderBoard();
    return;
  }
  if (isValidPosition(state.position.x + 1, state.position.y, newRotation)) {
    state.position.x += 1;
    state.rotation = newRotation;
    renderBoard();
    return;
  }
  if (isValidPosition(state.position.x - 1, state.position.y, newRotation)) {
    state.position.x -= 1;
    state.rotation = newRotation;
    renderBoard();
  }
}

function isValidPosition(x, y, rotation) {
  if (!state.active) {
    return false;
  }
  const cells = getPieceCells(state.active, rotation, { x, y });
  for (const { col, row } of cells) {
    if (col < 0 || col >= COLS) {
      return false;
    }
    if (row >= ROWS) {
      return false;
    }
    if (row >= 0 && state.board[row][col]) {
      return false;
    }
  }
  return true;
}

function getPieceCells(piece, rotation, position) {
  const offsets = piece.shape.rotations[rotation];
  return offsets.map((offset) => ({
    col: position.x + offset.x,
    row: position.y + offset.y,
  }));
}

function lockPiece() {
  if (!state.active) {
    return;
  }
  const cellsToLock = getPieceCells(state.active, state.rotation, state.position);
  let outOfBounds = false;
  for (const { col, row } of cellsToLock) {
    if (row < 0) {
      outOfBounds = true;
      continue;
    }
    state.board[row][col] = { type: state.active.type };
  }
  if (outOfBounds) {
    endMatch("Silver's pressure overwhelms Daniel at the top row.");
    return;
  }
  state.active = null;
  resolveMatches();
  spawnPiece();
  renderBoard();
  updateMeters();
  updateButtons();
}

function resolveMatches() {
  const clearedGroups = [];
  const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (visited[row][col]) {
        continue;
      }
      const cell = state.board[row][col];
      if (!cell) {
        continue;
      }
      const group = collectGroup(col, row, cell.type, visited);
      if (group.length >= 4) {
        clearedGroups.push({ type: cell.type, cells: group });
      }
    }
  }
  if (clearedGroups.length === 0) {
    settleMetersWithoutClear();
    return;
  }
  for (const group of clearedGroups) {
    for (const { col, row } of group.cells) {
      state.board[row][col] = null;
    }
  }
  collapseBoard();
  applyClearRewards(clearedGroups);
  renderBoard();
  updateMeters();
  resolveMatches();
}

function collectGroup(startCol, startRow, type, visited) {
  const stack = [{ col: startCol, row: startRow }];
  const group = [];
  visited[startRow][startCol] = true;
  while (stack.length) {
    const current = stack.pop();
    group.push(current);
    const neighbors = [
      { col: current.col - 1, row: current.row },
      { col: current.col + 1, row: current.row },
      { col: current.col, row: current.row - 1 },
      { col: current.col, row: current.row + 1 },
    ];
    for (const neighbor of neighbors) {
      if (
        neighbor.col < 0 ||
        neighbor.col >= COLS ||
        neighbor.row < 0 ||
        neighbor.row >= ROWS
      ) {
        continue;
      }
      if (visited[neighbor.row][neighbor.col]) {
        continue;
      }
      const neighborCell = state.board[neighbor.row][neighbor.col];
      if (neighborCell?.type === type) {
        visited[neighbor.row][neighbor.col] = true;
        stack.push(neighbor);
      }
    }
  }
  return group;
}

function collapseBoard() {
  for (let col = 0; col < COLS; col += 1) {
    const stack = [];
    for (let row = ROWS - 1; row >= 0; row -= 1) {
      if (state.board[row][col]) {
        stack.push(state.board[row][col]);
      }
    }
    for (let row = ROWS - 1; row >= 0; row -= 1) {
      const nextCell = stack.shift() ?? null;
      state.board[row][col] = nextCell;
    }
  }
}

function applyClearRewards(groups) {
  const positiveGroups = groups.filter((group) => group.type === "positive");
  const negativeGroups = groups.filter((group) => group.type === "negative");
  if (positiveGroups.length) {
    const totalCells = positiveGroups.reduce((sum, group) => sum + group.cells.length, 0);
    const comboGain = 14 + totalCells * 3;
    state.defense = clamp(state.defense + comboGain, 0, 100);
    state.balance = clamp(state.balance + 10 * positiveGroups.length + totalCells * 1.2, -100, 100);
    state.fear = clamp(state.fear - (8 + positiveGroups.length * 3), 0, 100);
    rewardFocus(totalCells);
    logEvent(`Miyagi-Do formation centered. Combo +${comboGain}.`, "success");
  }
  if (negativeGroups.length) {
    const totalCells = negativeGroups.reduce((sum, group) => sum + group.cells.length, 0);
    const fearGain = 18 + totalCells * 3;
    state.fear = clamp(state.fear + fearGain, 0, 100);
    state.balance = clamp(state.balance - (12 * negativeGroups.length + totalCells * 1.4), -100, 100);
    penalizeFocus(negativeGroups.length * 4);
    logEvent(`Cobra Kai press lands. Fear +${fearGain}.`, "warning");
  }
  if (state.fear >= 100) {
    triggerFearLock();
  }
}

function settleMetersWithoutClear() {
  // Gentle recentering to keep play dynamic when no clears occur.
  if (state.balance > 0) {
    state.balance = Math.max(0, state.balance - BALANCE_RECENTER);
  } else if (state.balance < 0) {
    state.balance = Math.min(0, state.balance + BALANCE_RECENTER);
  }
  state.fear = clamp(state.fear - FEAR_DECAY, 0, 100);
  trackBalanceWindow();
}

function rewardFocus(amount) {
  const closeness = Math.max(0, FOCUS_SAFE_THRESHOLD - Math.abs(state.balance));
  const bonus = amount * (1 + closeness / FOCUS_SAFE_THRESHOLD);
  state.focusScore += bonus;
  state.bestFocus = Math.max(state.bestFocus, Math.round(state.focusScore));
}

function penalizeFocus(amount) {
  state.focusScore = Math.max(0, state.focusScore - amount);
}

function triggerFearLock() {
  state.freezeUntil = Date.now() + FREEZE_DURATION;
  state.fear = 60;
  state.dropInterval = Math.max(MIN_INTERVAL, state.dropInterval - 120);
  updateStatus("Fear spikes—Daniel freezes as Silver speeds the cadence.");
  logEvent("Paralyzed with fear. Blocks accelerate until composure returns.", "warning");
}

function attemptCraneKick() {
  if (state.defense < 100) {
    return;
  }
  let cleared = 0;
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (state.board[row][col]?.type === "negative") {
        state.board[row][col] = null;
        cleared += 1;
      }
    }
  }
  if (cleared === 0) {
    state.defense = clamp(state.defense - 25, 0, 100);
    updateStatus("Crane Kick whiffs—no Cobra Kai influence to purge.");
    updateMeters();
    updateButtons();
    return;
  }
  collapseBoard();
  state.defense = 0;
  state.fear = clamp(state.fear - 30, 0, 100);
  state.balance = clamp(state.balance * 0.5, -40, 40);
  rewardFocus(Math.max(8, cleared / 2));
  updateStatus("Crane Kick lands—Cobra Kai swept clean.");
  logEvent(`Crane Kick wipeout clears ${cleared} Cobra Kai blocks.`, "success");
  renderBoard();
  updateMeters();
  updateButtons();
}

function endMatch(message) {
  if (state.running) {
    clearTimeout(state.dropTimer);
    state.running = false;
    updateStatus(message);
    logEvent(message, "warning");
    highScore.submit(Math.round(state.bestFocus));
    updateButtons();
  }
}

function scheduleTick() {
  clearTimeout(state.dropTimer);
  const delay = state.running ? state.dropInterval : START_INTERVAL;
  state.dropTimer = window.setTimeout(() => {
    if (!state.running) {
      return;
    }
    const now = Date.now();
    if (now < state.freezeUntil) {
      settleMetersWithoutClear();
      updateMeters();
      scheduleTick();
      return;
    }
    if (!movePiece(0, 1)) {
      lockPiece();
    }
    settleMetersWithoutClear();
    updateMeters();
    scheduleTick();
  }, delay);
}

function renderBoard() {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const cellIndex = row * COLS + col;
      const cellElement = cells[cellIndex];
      const value = state.board[row][col];
      cellElement.className = "cell";
      if (value) {
        cellElement.classList.add(value.type);
        cellElement.setAttribute("aria-label", `${value.type === "positive" ? "Miyagi-Do" : "Cobra Kai"} block`);
      } else {
        cellElement.setAttribute("aria-label", "Empty cell");
      }
    }
  }
  if (state.active) {
    const previewCells = getPieceCells(state.active, state.rotation, state.position);
    for (const { col, row } of previewCells) {
      if (row < 0 || row >= ROWS || col < 0 || col >= COLS) {
        continue;
      }
      const cellIndex = row * COLS + col;
      const cellElement = cells[cellIndex];
      cellElement.classList.add(state.active.type, "preview");
    }
  }
}

function updateMeters() {
  balanceMarker.style.left = `${50 + (state.balance / 2)}%`;
  balanceReading.textContent = Math.round(state.balance);
  defenseFill.style.width = `${state.defense}%`;
  defenseReading.textContent = `${Math.round(state.defense)}%`;
  fearFill.style.width = `${state.fear}%`;
  fearReading.textContent = `${Math.round(state.fear)}%`;
}

function updateButtons() {
  craneButton.disabled = state.defense < 100 || !state.running;
}

function updateStatus(message) {
  statusBar.textContent = message;
}

function logEvent(message, tone = "neutral") {
  const entry = document.createElement("li");
  entry.textContent = message;
  if (tone !== "neutral") {
    entry.classList.add(tone);
  }
  logEntries.append(entry);
  while (logEntries.children.length > MAX_LOG_ENTRIES) {
    logEntries.removeChild(logEntries.firstChild);
  }
  logEntries.scrollTop = logEntries.scrollHeight;
}

function clearLog() {
  logEntries.innerHTML = "";
}

function trackBalanceWindow() {
  if (!state.running) {
    return;
  }
  const deviation = Math.abs(state.balance);
  if (deviation <= FOCUS_SAFE_THRESHOLD) {
    state.focusScore += 1.2;
  } else if (deviation <= 40) {
    state.focusScore += 0.4;
  } else {
    state.focusScore = Math.max(0, state.focusScore - 0.6);
  }
  state.bestFocus = Math.max(state.bestFocus, Math.round(state.focusScore));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

autoEnhanceFeedback();
