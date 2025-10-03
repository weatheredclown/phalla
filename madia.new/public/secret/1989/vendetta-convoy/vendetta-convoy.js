import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { mountParticleField } from "../particles.js";

import { autoEnhanceFeedback } from "../feedback.js";

const particleSystem = mountParticleField({
  effects: {
    palette: ["#38bdf8", "#facc15", "#fb7185", "#34d399"],
    ambientDensity: 0.55,
  },
});

const scoreConfig = getScoreConfig("vendetta-convoy");
const highScore = initHighScoreBanner({
  gameId: "vendetta-convoy",
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

const BOARD_WIDTH = 8;
const BOARD_HEIGHT = 14;
const LANE_COLUMNS = [2, 3, 4, 5];

const START_ACTUATION = 72;
const ADVANCE_COST = 6;
const SABOTAGE_COST = 5;
const SCAN_COST = 8;
const PHOENIX_REFILL = 12;
const MAX_SCANS = 3;
const MAX_LOG_ENTRIES = 32;

const TANKER_SHAPES = [
  [
    { row: 0, col: 1 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 1, col: 2 },
  ],
  [
    { row: 0, col: 1 },
    { row: 1, col: 1 },
    { row: 1, col: 2 },
    { row: 2, col: 1 },
  ],
  [
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 1, col: 2 },
    { row: 2, col: 1 },
  ],
  [
    { row: 0, col: 1 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 2, col: 1 },
  ],
];

const SAFE_EVIDENCE_POSITIONS = [
  [2, 3],
  [5, 2],
  [8, 4],
  [10, 3],
];

const EXPLOSIVE_POSITIONS = [
  [3, 4],
  [6, 3],
  [9, 4],
  [12, 3],
];

const ROCK_POSITIONS = dedupePositions([
  [1, 3],
  [2, 2],
  [2, 4],
  [3, 3],
  [3, 5],
  [4, 4],
  [4, 2],
  [5, 1],
  [5, 3],
  [6, 2],
  [6, 4],
  [7, 3],
  [7, 4],
  [8, 3],
  [8, 5],
  [9, 3],
  [9, 5],
  [10, 2],
  [10, 4],
  [11, 3],
  [11, 4],
  [12, 2],
  [12, 4],
  [13, 3],
  [13, 4],
]);

const TOTAL_EVIDENCE = SAFE_EVIDENCE_POSITIONS.length + EXPLOSIVE_POSITIONS.length;

const startOperationButton = document.getElementById("start-operation");
const advanceTankerButton = document.getElementById("advance-tanker");
const intelScanButton = document.getElementById("intel-scan");
const resetOperationButton = document.getElementById("reset-operation");
const compoundGrid = document.getElementById("compound-grid");
const tankerQueueElement = document.getElementById("tanker-queue");
const operationStatusElement = document.getElementById("operation-status");
const eventLogElement = document.getElementById("event-log");
const actuationFill = document.getElementById("actuation-fill");
const actuationText = document.getElementById("actuation-text");
const actuationBar = document.getElementById("actuation-bar");
const evidenceCountElement = document.getElementById("evidence-count");
const scanCountElement = document.getElementById("scan-count");
const explosiveCountElement = document.getElementById("explosive-count");
const phoenixCountElement = document.getElementById("phoenix-count");

const cellElements = [];

const state = {
  board: [],
  selectedRocks: [],
  actionableTargets: new Set(),
  tankerQueue: [],
  settledCells: new Set(),
  actuation: START_ACTUATION,
  scans: MAX_SCANS,
  evidenceCleared: 0,
  explosionsTriggered: 0,
  phoenixCount: 0,
  operationActive: false,
  logs: [],
  pendingStatus: "Press Start Operation to begin the sabotage run.",
};

initializeGrid();
resetState(false);
renderAll();

startOperationButton.addEventListener("click", () => {
  resetState(true);
  logEvent("Operation underway. Align the tanker modules and clear the lane.", "success");
});

advanceTankerButton.addEventListener("click", () => {
  advanceTanker();
});

intelScanButton.addEventListener("click", () => {
  spendScan();
});

resetOperationButton.addEventListener("click", () => {
  resetState(false);
  logEvent("Operation reset. Formation cleared and intel restored.", "warning");
});

document.addEventListener("keydown", (event) => {
  if (event.defaultPrevented) {
    return;
  }
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
    return;
  }
  if (event.key === "a" || event.key === "A") {
    event.preventDefault();
    advanceTanker();
  } else if (event.key === "s" || event.key === "S") {
    event.preventDefault();
    spendScan();
  } else if (event.key === "r" || event.key === "R") {
    event.preventDefault();
    resetState(false);
    logEvent("Operation reset. Formation cleared and intel restored.", "warning");
  }
});

function initializeGrid() {
  compoundGrid.innerHTML = "";
  cellElements.length = 0;
  for (let row = 0; row < BOARD_HEIGHT; row += 1) {
    const rowElements = [];
    for (let col = 0; col < BOARD_WIDTH; col += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "compound-cell";
      button.dataset.row = String(row);
      button.dataset.col = String(col);
      button.setAttribute("role", "gridcell");
      button.addEventListener("click", handleCellClick);
      compoundGrid.append(button);
      rowElements.push(button);
    }
    cellElements.push(rowElements);
  }
}

function resetState(activateOperation) {
  state.board = buildBoard();
  state.selectedRocks = [];
  state.actionableTargets = new Set();
  state.settledCells = new Set();
  state.actuation = START_ACTUATION;
  state.scans = MAX_SCANS;
  state.evidenceCleared = 0;
  state.explosionsTriggered = 0;
  state.phoenixCount = 0;
  state.logs = [];
  state.operationActive = activateOperation;
  state.pendingStatus = activateOperation
    ? "Operation live. Clear crates without rattling the explosives."
    : "Press Start Operation to begin the sabotage run.";

  if (activateOperation) {
    state.tankerQueue = [spawnPiece(false), spawnPiece(true), spawnPiece(true)].filter(Boolean);
    if (state.tankerQueue.length === 0) {
      state.operationActive = false;
      state.pendingStatus = "No safe launch corridor. Operation aborted.";
      logEvent("No launch corridor available. Reset and reassess the rock charges.", "danger");
    }
  } else {
    state.tankerQueue = [];
  }

  renderAll();
}

function buildBoard() {
  const board = Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from({ length: BOARD_WIDTH }, () => createCell("empty"))
  );

  SAFE_EVIDENCE_POSITIONS.forEach(([row, col]) => {
    board[row][col] = createCell("evidence");
  });

  EXPLOSIVE_POSITIONS.forEach(([row, col]) => {
    board[row][col] = createCell("explosive");
  });

  ROCK_POSITIONS.forEach(([row, col]) => {
    if (isWithinBoard(row, col)) {
      board[row][col] = createCell("rock");
    }
  });

  return board;
}

function createCell(type) {
  return {
    type,
    revealed: type !== "evidence" && type !== "explosive",
  };
}

function spawnPiece(randomised) {
  const piece = {
    orientation: randomised ? randomInt(0, TANKER_SHAPES.length) : 0,
    column: 2,
    row: 0,
  };

  if (!positionPiece(piece)) {
    return null;
  }
  return piece;
}

function positionPiece(piece) {
  const orientations = [...Array(TANKER_SHAPES.length).keys()];
  if (piece.orientation != null) {
    orientations.splice(orientations.indexOf(piece.orientation), 1);
    orientations.unshift(piece.orientation);
  }

  for (const orientation of orientations) {
    const width = getPieceWidth(orientation);
    const possibleColumns = shuffleArray(laneAlignedColumns(width));
    for (const column of possibleColumns) {
      if (canPlacePiece(orientation, 0, column)) {
        piece.orientation = orientation;
        piece.column = column;
        piece.row = 0;
        return true;
      }
    }
  }
  return false;
}

function canPlacePiece(orientation, rowOffset, columnOffset) {
  const offsets = TANKER_SHAPES[orientation];
  return offsets.every((offset) => {
    const row = rowOffset + offset.row;
    const col = columnOffset + offset.col;
    if (!isWithinBoard(row, col)) {
      return false;
    }
    if (isBlockingCell(row, col)) {
      return false;
    }
    return true;
  });
}

function getPieceCells(piece, rowOffset = piece.row, columnOffset = piece.column) {
  const offsets = TANKER_SHAPES[piece.orientation];
  return offsets.map((offset) => ({
    row: rowOffset + offset.row,
    col: columnOffset + offset.col,
  }));
}

function getPieceWidth(orientation) {
  const offsets = TANKER_SHAPES[orientation];
  const maxCol = offsets.reduce((max, offset) => Math.max(max, offset.col), 0);
  return maxCol + 1;
}

function isBlockingCell(row, col) {
  if (state.settledCells.has(keyFrom(row, col))) {
    return true;
  }
  const cell = state.board[row][col];
  return cell.type === "rock" || cell.type === "evidence" || cell.type === "explosive";
}

function handleCellClick(event) {
  const button = event.currentTarget;
  const row = Number(button.dataset.row);
  const col = Number(button.dataset.col);
  const cell = state.board[row][col];

  if (!state.operationActive) {
    return;
  }

  if (cell.type === "rock") {
    toggleRockSelection(row, col);
    return;
  }

  if ((cell.type === "evidence" || cell.type === "explosive") && state.actionableTargets.has(keyFrom(row, col))) {
    sabotageEvidence(row, col);
  }
}

function toggleRockSelection(row, col) {
  if (!state.operationActive) {
    return;
  }
  const key = keyFrom(row, col);
  const index = state.selectedRocks.indexOf(key);
  if (index >= 0) {
    state.selectedRocks.splice(index, 1);
  } else {
    if (state.selectedRocks.length === 3) {
      state.selectedRocks.shift();
    }
    state.selectedRocks.push(key);
  }
  updateActionableTargets();
  renderBoard();
}

function updateActionableTargets() {
  state.actionableTargets = new Set();
  if (!state.operationActive || state.selectedRocks.length !== 3) {
    return;
  }
  const selectedCoords = state.selectedRocks.map(parseKey);
  for (let row = 0; row < BOARD_HEIGHT; row += 1) {
    for (let col = 0; col < BOARD_WIDTH; col += 1) {
      const cell = state.board[row][col];
      if (cell.type !== "evidence" && cell.type !== "explosive") {
        continue;
      }
      const matches = selectedCoords.every(({ row: r, col: c }) => Math.abs(r - row) <= 1 && Math.abs(c - col) <= 1);
      if (matches) {
        state.actionableTargets.add(keyFrom(row, col));
      }
    }
  }
}

function sabotageEvidence(row, col) {
  if (!state.operationActive) {
    return;
  }
  const cell = state.board[row][col];
  if (cell.type !== "evidence" && cell.type !== "explosive") {
    return;
  }
  const wasExplosive = cell.type === "explosive";

  state.selectedRocks.forEach((key) => {
    const { row: rockRow, col: rockCol } = parseKey(key);
    const rockCell = state.board[rockRow][rockCol];
    if (rockCell.type === "rock") {
      rockCell.type = "cleared";
      rockCell.revealed = true;
    }
  });
  state.selectedRocks = [];
  state.actionableTargets = new Set();

  if (cell.type === "evidence" || cell.type === "explosive") {
    cell.type = "cleared";
    cell.revealed = true;
    state.evidenceCleared += 1;
    highScore.submit(state.evidenceCleared, { total: TOTAL_EVIDENCE });
  }

  state.actuation = Math.max(0, state.actuation - SABOTAGE_COST);

  if (wasExplosive) {
    state.explosionsTriggered += 1;
    logEvent("Concealed explosive detonated. Remaining tanker modules have been scattered.", "danger");
    randomiseRemainingPieces();
  } else {
    logEvent("Evidence crate neutralised. Lane segment cleared.", "success");
    state.pendingStatus = "Crate cleared. Lane opening up.";
  }

  renderAll();
}

function randomiseRemainingPieces() {
  if (state.tankerQueue.length === 0) {
    renderAll();
    return;
  }
  let viable = true;
  state.tankerQueue.forEach((piece) => {
    const ok = randomisePiece(piece);
    viable = viable && ok;
  });
  if (!viable) {
    state.operationActive = false;
    state.pendingStatus = "Explosion scattered the formation beyond recovery.";
    logEvent("Explosion scattered the convoy beyond recovery. Reset to re-run the sabotage.", "danger");
  } else {
    state.pendingStatus = "Convoy scattered—realign before advancing again.";
    logEvent("Convoy formation scrambled. Reorient the modules before advancing.", "warning");
  }
  renderAll();
}

function randomisePiece(piece) {
  const orientations = shuffleArray([...Array(TANKER_SHAPES.length).keys()]);
  for (const orientation of orientations) {
    const width = getPieceWidth(orientation);
    const possibleColumns = shuffleArray(laneAlignedColumns(width));
    for (const column of possibleColumns) {
      if (canPlacePiece(orientation, 0, column)) {
        piece.orientation = orientation;
        piece.column = column;
        piece.row = 0;
        return true;
      }
    }
  }
  return false;
}

function advanceTanker() {
  if (!state.operationActive || state.tankerQueue.length === 0) {
    return;
  }
  if (state.actuation < ADVANCE_COST) {
    logEvent("Actuation depleted. Trigger a Phoenix wipe or reset the operation.", "warning");
    return;
  }

  const piece = state.tankerQueue[0];
  const nextRow = piece.row + 1;
  if (canPlacePiece(piece.orientation, nextRow, piece.column)) {
    piece.row = nextRow;
    state.actuation = Math.max(0, state.actuation - ADVANCE_COST);
    state.pendingStatus = "Convoy module advanced. Keep the lane clear.";
    renderAll();
    return;
  }

  settleActivePiece();
}

function settleActivePiece() {
  if (state.tankerQueue.length === 0) {
    return;
  }
  const piece = state.tankerQueue.shift();
  const cells = getPieceCells(piece);
  cells.forEach(({ row, col }) => {
    state.settledCells.add(keyFrom(row, col));
  });
  checkPhoenix(cells);
  logEvent("Tanker module locked into position.", "info");

  if (state.tankerQueue.length === 0) {
    state.operationActive = false;
    state.pendingStatus = "Convoy secured. Evidence trail purged.";
    logEvent("All tanker modules delivered. Mission success.", "success");
    renderAll();
    return;
  }

  const nextPiece = state.tankerQueue[0];
  if (!positionPiece(nextPiece)) {
    state.operationActive = false;
    state.pendingStatus = "Launch corridor blocked. Operation stalled.";
    logEvent("Launch corridor blocked. Reset to retry the sabotage pattern.", "danger");
  } else {
    state.pendingStatus = "Next module primed. Clear remaining crates.";
  }
  renderAll();
}

function checkPhoenix(cells) {
  const touchedRows = new Set(cells.map((cell) => cell.row));
  touchedRows.forEach((row) => {
    const filled = LANE_COLUMNS.every((col) => state.settledCells.has(keyFrom(row, col)));
    if (filled) {
      triggerPhoenix(row);
    }
  });
}

function triggerPhoenix(row) {
  state.phoenixCount += 1;
  state.actuation = Math.min(100, state.actuation + PHOENIX_REFILL);
  const rowStart = Math.max(0, row - 1);
  const rowEnd = Math.min(BOARD_HEIGHT - 1, row + 1);
  const colStart = Math.max(0, Math.min(...LANE_COLUMNS) - 1);
  const colEnd = Math.min(BOARD_WIDTH - 1, Math.max(...LANE_COLUMNS) + 1);
  for (let r = rowStart; r <= rowEnd; r += 1) {
    for (let c = colStart; c <= colEnd; c += 1) {
      const cell = state.board[r][c];
      if (cell.type === "evidence" || cell.type === "explosive") {
        state.evidenceCleared += 1;
        highScore.submit(state.evidenceCleared, { total: TOTAL_EVIDENCE });
        cell.type = "cleared";
        cell.revealed = true;
      }
    }
  }
  logEvent("Phoenix combo! Nearby crates purged and actuation stabilised.", "success");
}

function spendScan() {
  if (!state.operationActive) {
    return;
  }
  if (state.scans <= 0) {
    logEvent("No intel scans remaining.", "warning");
    return;
  }
  if (state.actuation < SCAN_COST) {
    logEvent("Actuation too low to power a scan.", "warning");
    return;
  }

  const concealedCells = [];
  for (let row = 0; row < BOARD_HEIGHT; row += 1) {
    for (let col = 0; col < BOARD_WIDTH; col += 1) {
      const cell = state.board[row][col];
      if ((cell.type === "evidence" || cell.type === "explosive") && !cell.revealed) {
        concealedCells.push({ row, col, type: cell.type });
      }
    }
  }

  if (concealedCells.length === 0) {
    logEvent("All crates already identified.", "info");
    return;
  }

  const revealed = concealedCells[randomInt(0, concealedCells.length)];
  const cell = state.board[revealed.row][revealed.col];
  cell.revealed = true;
  state.scans -= 1;
  state.actuation = Math.max(0, state.actuation - SCAN_COST);

  if (revealed.type === "explosive") {
    logEvent(`Scan complete: crate at row ${revealed.row + 1}, col ${revealed.col + 1} is wired.`, "warning");
    state.pendingStatus = "Explosive identified. Avoid matching that crate.";
  } else {
    logEvent(`Scan complete: crate at row ${revealed.row + 1}, col ${revealed.col + 1} is clean evidence.`, "info");
    state.pendingStatus = "Clean evidence spotted. Ready charges when able.";
  }
  renderAll();
}

function renderAll() {
  renderBoard();
  renderQueue();
  renderStatus();
  renderLog();
  updateButtons();
}

function renderBoard() {
  const activeCells = new Set();
  if (state.operationActive && state.tankerQueue.length > 0) {
    getPieceCells(state.tankerQueue[0]).forEach(({ row, col }) => {
      activeCells.add(keyFrom(row, col));
    });
  }

  for (let row = 0; row < BOARD_HEIGHT; row += 1) {
    for (let col = 0; col < BOARD_WIDTH; col += 1) {
      const cell = state.board[row][col];
      const element = cellElements[row][col];
      const classes = ["compound-cell"];

      if (cell.type === "rock") {
        classes.push("cell-rock");
        if (state.selectedRocks.includes(keyFrom(row, col))) {
          classes.push("selected");
        }
      } else if (cell.type === "evidence") {
        classes.push("cell-evidence");
        if (!cell.revealed) {
          classes.push("concealed");
        }
      } else if (cell.type === "explosive") {
        if (cell.revealed) {
          classes.push("cell-explosive");
        } else {
          classes.push("cell-evidence", "concealed");
        }
      } else if (cell.type === "cleared") {
        classes.push("cell-cleared");
      }

      const key = keyFrom(row, col);
      if (state.actionableTargets.has(key)) {
        classes.push("cell-actionable");
      }
      if (state.settledCells.has(key)) {
        classes.push("cell-tanker-settled");
      }
      if (activeCells.has(key)) {
        classes.push("cell-tanker-active");
      }

      element.className = classes.join(" ");
      element.disabled = !state.operationActive;
      element.setAttribute("aria-label", describeCell(row, col, cell, activeCells.has(key)));
      element.textContent = getCellGlyph(cell, activeCells.has(key));
    }
  }
}

function renderQueue() {
  tankerQueueElement.innerHTML = "";
  state.tankerQueue.forEach((piece, index) => {
    const article = document.createElement("article");
    article.className = `queue-piece${index === 0 ? " active" : ""}`;
    const header = document.createElement("div");
    header.className = "queue-piece-header";
    header.textContent = index === 0 ? "Active Module" : `Queued Module ${index}`;
    article.append(header);

    const grid = document.createElement("div");
    grid.className = "queue-grid";
    for (let r = 0; r < 3; r += 1) {
      for (let c = 0; c < 3; c += 1) {
        const cell = document.createElement("span");
        cell.className = "queue-cell";
        if (TANKER_SHAPES[piece.orientation].some((offset) => offset.row === r && offset.col === c)) {
          cell.classList.add("fill");
        }
        grid.append(cell);
      }
    }
    article.append(grid);
    tankerQueueElement.append(article);
  });
}

function renderStatus() {
  const actuationPercent = Math.round((state.actuation / 100) * 100);
  const ratio = Math.max(0, Math.min(1, state.actuation / 100));
  actuationFill.style.transform = `scaleX(${ratio})`;
  actuationText.textContent = `${actuationPercent}%`;
  actuationBar.setAttribute("aria-valuenow", String(actuationPercent));
  evidenceCountElement.textContent = `${state.evidenceCleared} / ${TOTAL_EVIDENCE}`;
  scanCountElement.textContent = `${state.scans}`;
  explosiveCountElement.textContent = `${state.explosionsTriggered}`;
  phoenixCountElement.textContent = `${state.phoenixCount}`;
  operationStatusElement.textContent = state.pendingStatus;
}

function renderLog() {
  eventLogElement.innerHTML = "";
  state.logs.slice(0, MAX_LOG_ENTRIES).forEach((entry) => {
    const item = document.createElement("li");
    item.className = `log-entry ${entry.tone}`;
    item.textContent = entry.message;
    eventLogElement.append(item);
  });
}

function updateButtons() {
  startOperationButton.disabled = state.operationActive;
  advanceTankerButton.disabled = !state.operationActive || state.tankerQueue.length === 0;
  intelScanButton.disabled = !state.operationActive || state.scans <= 0 || state.actuation < SCAN_COST;
}

function logEvent(message, tone = "info") {
  state.logs.unshift({ message, tone });
  if (state.logs.length > MAX_LOG_ENTRIES) {
    state.logs.length = MAX_LOG_ENTRIES;
  }
  if (tone === "success") {
    particleSystem.emitBurst(1.4);
  } else if (tone === "danger") {
    particleSystem.emitSparkle(1.0);
  } else if (tone === "warning") {
    particleSystem.emitSparkle(0.8);
  }
  renderLog();
}

function describeCell(row, col, cell, isActive) {
  if (state.settledCells.has(keyFrom(row, col))) {
    return `Settled tanker plating at row ${row + 1}, column ${col + 1}.`;
  }
  if (isActive) {
    return `Active tanker module at row ${row + 1}, column ${col + 1}.`;
  }
  if (cell.type === "rock") {
    return `Rock charge at row ${row + 1}, column ${col + 1}.`;
  }
  if (cell.type === "cleared") {
    return `Cleared lane tile at row ${row + 1}, column ${col + 1}.`;
  }
  if (cell.type === "evidence") {
    return cell.revealed
      ? `Identified evidence crate at row ${row + 1}, column ${col + 1}.`
      : `Unknown crate at row ${row + 1}, column ${col + 1}.`;
  }
  if (cell.type === "explosive") {
    return cell.revealed
      ? `Known explosive crate at row ${row + 1}, column ${col + 1}.`
      : `Unknown crate at row ${row + 1}, column ${col + 1}.`;
  }
  return `Empty tile at row ${row + 1}, column ${col + 1}.`;
}

function getCellGlyph(cell, isActive) {
  if (isActive) {
    return "⛽";
  }
  if (cell.type === "rock") {
    return "⬣";
  }
  if (cell.type === "evidence") {
    return cell.revealed ? "□" : "?";
  }
  if (cell.type === "explosive") {
    return cell.revealed ? "✖" : "?";
  }
  if (cell.type === "cleared") {
    return "·";
  }
  if (cell.type === "empty") {
    return "";
  }
  return "";
}

function keyFrom(row, col) {
  return `${row}-${col}`;
}

function parseKey(key) {
  const [row, col] = key.split("-").map(Number);
  return { row, col };
}

function dedupePositions(list) {
  const seen = new Set();
  const unique = [];
  list.forEach(([row, col]) => {
    const key = keyFrom(row, col);
    if (!seen.has(key) && isWithinBoard(row, col)) {
      seen.add(key);
      unique.push([row, col]);
    }
  });
  return unique;
}

function shuffleArray(values) {
  const array = [...values];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function isWithinBoard(row, col) {
  return row >= 0 && row < BOARD_HEIGHT && col >= 0 && col < BOARD_WIDTH;
}

function laneAlignedColumns(width) {
  const laneMin = Math.min(...LANE_COLUMNS);
  const laneMax = Math.max(...LANE_COLUMNS);
  const minColumn = Math.max(0, laneMin - 1);
  const maxColumn = Math.min(BOARD_WIDTH - width, laneMax - Math.max(0, width - 2));
  const columns = [];
  for (let col = minColumn; col <= maxColumn; col += 1) {
    columns.push(col);
  }
  if (columns.length === 0) {
    for (let col = 0; col <= BOARD_WIDTH - width; col += 1) {
      columns.push(col);
    }
  }
  return columns;
}

autoEnhanceFeedback();
