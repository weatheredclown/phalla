import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { mountParticleField } from "../particles.js";

const particleSystem = mountParticleField({
  effects: {
    palette: ["#f87171", "#38bdf8", "#facc15", "#fbbf24"],
    ambientDensity: 0.45,
    sparkleProbability: 0.12,
  },
});

const scoreConfig = getScoreConfig("gilded-partition");
const highScore = initHighScoreBanner({
  gameId: "gilded-partition",
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

const ROWS = 8;
const COLS = 8;
const TARGET_PERCENT = 65;
const MAX_DESTRUCTION = 7;
const LEGAL_VICTORY_THRESHOLD = 6;
const MAX_LOG_ENTRIES = 12;
const DIRECTIONS = [
  { row: 1, col: 0 },
  { row: -1, col: 0 },
  { row: 0, col: 1 },
  { row: 0, col: -1 },
];

const FLOOR_PLAN = [
  "AABBBCCD",
  "AABBBCCD",
  "EEJFGGCD",
  "EEJGGHDD",
  "IIJKKHHD",
  "IIJLLHHD",
  "MMJNNPPP",
  "MMJOOOPP",
];

const ROOMS = {
  A: { name: "Grand Stair", detail: "Double-height entryway" },
  B: { name: "Gallery Walk", detail: "Barbara's lithograph hall" },
  C: { name: "Winter Garden", detail: "Glasswork courtyard" },
  D: { name: "Litigation Landing", detail: "Neutral corridor" },
  E: { name: "Atrium Mezzanine", detail: "Floating bridge" },
  F: { name: "Scarlet Kitchen", detail: "Barbara's culinary flank" },
  G: { name: "Cobalt Study", detail: "Oliver's war room" },
  H: { name: "Verdant Spa", detail: "Sunken bath suite" },
  I: { name: "Carriage Hall", detail: "Garage vestibule" },
  J: { name: "Chandelier Room", detail: "Two-story showpiece" },
  K: { name: "Velvet Library", detail: "Mahogany stacks" },
  L: { name: "Negotiation Den", detail: "Whiskey bar" },
  M: { name: "Garage Loft", detail: "Vintage auto gallery" },
  N: { name: "Roof Terrace", detail: "Slate patio" },
  O: { name: "Solarium Nook", detail: "Walled greenhouse" },
  P: { name: "Cellar Vault", detail: "Reserve vintages" },
};

const PIECES = [
  { id: "granite", label: "GR", longName: "granite writ", side: "barbara", weight: 3 },
  { id: "slate", label: "SL", longName: "slate filing", side: "barbara", weight: 2 },
  { id: "marble", label: "MA", longName: "marble retainer", side: "oliver", weight: 3 },
  { id: "quartz", label: "QZ", longName: "quartz clause", side: "oliver", weight: 2 },
  { id: "barbara", label: "BA", longName: "Barbara's gambit", side: "barbara", weight: 1 },
  { id: "oliver", label: "OL", longName: "Oliver's riposte", side: "oliver", weight: 1 },
];

const PIECE_INFO = new Map(PIECES.map((piece) => [piece.id, piece]));
const WEIGHT_TOTAL = PIECES.reduce((sum, piece) => sum + piece.weight, 0);

const boardElement = document.getElementById("estate-board");
const eventList = document.getElementById("event-list");
const resetButton = document.getElementById("reset-estate");
const hintButton = document.getElementById("hint-toggle");
const barbaraMeterFill = document.getElementById("barbara-meter-fill");
const barbaraMeter = document.getElementById("barbara-meter");
const barbaraShareText = document.getElementById("barbara-share");
const barbaraTilesText = document.getElementById("barbara-tiles");
const oliverMeterFill = document.getElementById("oliver-meter-fill");
const oliverMeter = document.getElementById("oliver-meter");
const oliverShareText = document.getElementById("oliver-share");
const oliverTilesText = document.getElementById("oliver-tiles");
const destructionCountText = document.getElementById("destruction-count");
const roomList = document.getElementById("room-list");

const cellsByKey = new Map();
const labelsByKey = new Map();
const ownershipChips = new Map();

const state = {
  board: [],
  pieces: [],
  selectedKey: null,
  cursor: { row: 0, col: 0 },
  hints: false,
  destruction: new Set(),
};

populateRooms();
setupBoard();
resetEstate(true);
wireControls();

function populateRooms() {
  roomList.innerHTML = "";
  Object.entries(ROOMS).forEach(([id, info]) => {
    if (!isRoomUsed(id)) {
      return;
    }
    const dt = document.createElement("dt");
    dt.textContent = info.name;
    const dd = document.createElement("dd");
    dd.textContent = info.detail;
    roomList.append(dt, dd);
  });
}

function setupBoard() {
  boardElement.style.setProperty("--rows", ROWS);
  boardElement.style.setProperty("--cols", COLS);
  boardElement.innerHTML = "";
  cellsByKey.clear();
  labelsByKey.clear();
  ownershipChips.clear();

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const cellKey = keyFrom(row, col);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "estate-cell";
      button.dataset.row = String(row);
      button.dataset.col = String(col);
      button.setAttribute("role", "gridcell");
      button.addEventListener("click", () => {
        focusCell(row, col);
        handleCellActivation(row, col);
      });

      const chip = document.createElement("span");
      chip.className = "ownership-chip";

      const label = document.createElement("span");
      label.className = "piece-label";

      button.append(chip, label);
      boardElement.appendChild(button);

      cellsByKey.set(cellKey, button);
      labelsByKey.set(cellKey, label);
      ownershipChips.set(cellKey, chip);
    }
  }
}

function wireControls() {
  resetButton.addEventListener("click", () => {
    addLog("Estate reseeded. Fresh claims filed.");
    resetEstate(false);
  });

  hintButton.addEventListener("click", () => {
    state.hints = !state.hints;
    hintButton.textContent = state.hints ? "Disable Risk Hints" : "Toggle Risk Hints";
    addLog(state.hints ? "Risk hints enabled." : "Risk hints disabled.");
    refreshHints();
  });

  document.addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }
    const { key } = event;
    if (key === "ArrowUp") {
      event.preventDefault();
      moveCursor(-1, 0);
    } else if (key === "ArrowDown") {
      event.preventDefault();
      moveCursor(1, 0);
    } else if (key === "ArrowLeft") {
      event.preventDefault();
      moveCursor(0, -1);
    } else if (key === "ArrowRight") {
      event.preventDefault();
      moveCursor(0, 1);
    } else if (key === "Enter" || key === " ") {
      event.preventDefault();
      handleCellActivation(state.cursor.row, state.cursor.col);
    } else if (key === "Escape") {
      clearSelection();
    } else if (key === "r" || key === "R") {
      event.preventDefault();
      addLog("Manual reseed requested.");
      resetEstate(false);
    }
  });
}

function resetEstate(isInitial) {
  state.destruction.clear();
  state.board = buildOwnershipGrid();
  state.pieces = buildPieceGrid();
  state.selectedKey = null;
  state.cursor = { row: 0, col: 0 };
  if (!isInitial) {
    particleSystem?.burst?.({ palette: ["#fbbf24", "#38bdf8", "#f87171"] });
  }
  renderBoard();
  focusCell(0, 0);
  updateStatus();
  addLog("Deed ledger reset.");
}

function buildOwnershipGrid() {
  const grid = [];
  const assignments = [];
  for (let row = 0; row < ROWS; row += 1) {
    const rowAssignments = [];
    for (let col = 0; col < COLS; col += 1) {
      const roomId = FLOOR_PLAN[row][col];
      rowAssignments.push({ owner: "neutral", room: roomId });
      assignments.push({ row, col });
    }
    grid.push(rowAssignments);
  }
  const shuffled = shuffle(assignments);
  const half = Math.floor(shuffled.length / 2);
  shuffled.forEach((entry, index) => {
    const owner = index < half ? "barbara" : "oliver";
    grid[entry.row][entry.col].owner = owner;
  });
  if (shuffled.length % 2 === 1) {
    const middle = shuffled[half];
    grid[middle.row][middle.col].owner = "neutral";
  }
  return grid;
}

function buildPieceGrid() {
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      grid[row][col] = generatePiece(row, col, grid);
    }
  }
  return grid;
}

function generatePiece(row, col, grid) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = drawPiece();
    if (!createsImmediateMatch(row, col, candidate, grid)) {
      return candidate;
    }
  }
  return drawPiece();
}

function drawPiece() {
  let ticket = Math.random() * WEIGHT_TOTAL;
  for (const piece of PIECES) {
    ticket -= piece.weight;
    if (ticket <= 0) {
      return piece.id;
    }
  }
  return PIECES[0].id;
}

function createsImmediateMatch(row, col, candidate, grid) {
  const leftOne = col - 1 >= 0 ? grid[row][col - 1] : null;
  const leftTwo = col - 2 >= 0 ? grid[row][col - 2] : null;
  if (leftOne && leftTwo && leftOne === candidate && leftTwo === candidate) {
    return true;
  }
  const upOne = row - 1 >= 0 ? grid[row - 1][col] : null;
  const upTwo = row - 2 >= 0 ? grid[row - 2][col] : null;
  if (upOne && upTwo && upOne === candidate && upTwo === candidate) {
    return true;
  }
  return false;
}

function renderBoard() {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      updateCell(row, col);
    }
  }
  refreshHints();
  updateSelectionHighlight();
}

function updateCell(row, col) {
  const key = keyFrom(row, col);
  const cell = cellsByKey.get(key);
  const label = labelsByKey.get(key);
  const ownership = state.board[row][col];
  const pieceType = state.pieces[row][col];
  cell.dataset.owner = ownership.owner;
  cell.dataset.room = ownership.room;
  cell.dataset.piece = pieceType;
  if (ownership.owner === "destruction") {
    cell.setAttribute("aria-label", formatAriaLabel(row, col, "Destruction locked", pieceType));
  } else {
    const ownerLabel = ownership.owner === "neutral" ? "Unclaimed" : `${capitalize(ownership.owner)} control`;
    cell.setAttribute("aria-label", formatAriaLabel(row, col, ownerLabel, pieceType));
  }
  const info = PIECE_INFO.get(pieceType);
  if (label) {
    label.dataset.piece = pieceType;
    label.textContent = info ? info.label : "";
  }
}

function refreshHints() {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      applyRisk(row, col);
    }
  }
}

function applyRisk(row, col) {
  const key = keyFrom(row, col);
  const cell = cellsByKey.get(key);
  if (!cell) {
    return;
  }
  if (!state.hints) {
    cell.removeAttribute("data-risk");
    return;
  }
  const ownership = state.board[row][col];
  const pieceType = state.pieces[row][col];
  const info = PIECE_INFO.get(pieceType);
  if (!info || ownership.owner === "destruction" || ownership.owner === "neutral") {
    cell.removeAttribute("data-risk");
    return;
  }
  if (info.side && info.side !== ownership.owner) {
    cell.dataset.risk = "high";
  } else {
    cell.removeAttribute("data-risk");
  }
}

function updateSelectionHighlight() {
  cellsByKey.forEach((cell, key) => {
    if (key === state.selectedKey) {
      cell.classList.add("is-selected");
    } else {
      cell.classList.remove("is-selected");
    }
  });
}

function handleCellActivation(row, col) {
  const key = keyFrom(row, col);
  if (state.selectedKey === key) {
    clearSelection();
    return;
  }
  if (!state.selectedKey) {
    state.selectedKey = key;
    updateSelectionHighlight();
    return;
  }
  const [selRow, selCol] = parseKey(state.selectedKey);
  if (!isAdjacent(selRow, selCol, row, col)) {
    state.selectedKey = key;
    updateSelectionHighlight();
    return;
  }
  attemptSwap({ row: selRow, col: selCol }, { row, col });
  clearSelection();
}

function attemptSwap(a, b) {
  swapPieces(a, b);
  renderCell(a.row, a.col);
  renderCell(b.row, b.col);
  const matches = findMatches();
  if (matches.length === 0) {
    swapPieces(a, b);
    renderCell(a.row, a.col);
    renderCell(b.row, b.col);
    addLog("No claim satisfied.");
    return false;
  }
  resolveMatches(matches);
  return true;
}

function resolveMatches(initialMatches) {
  let cascade = 0;
  let matches = initialMatches;
  while (matches.length > 0) {
    cascade += 1;
    const cleared = new Set();
    const conversions = {
      barbara: new Map(),
      oliver: new Map(),
    };

    matches.forEach((match) => {
      const info = PIECE_INFO.get(match.type);
      if (!info) {
        return;
      }
      match.cells.forEach(({ row, col }) => {
        const key = keyFrom(row, col);
        cleared.add(key);
      });
      if (info.side === "barbara" || info.side === "oliver") {
        match.cells.forEach(({ row, col }) => {
          applyConversion(row, col, info.side, conversions);
          DIRECTIONS.forEach((offset) => {
            applyConversion(row + offset.row, col + offset.col, info.side, conversions);
          });
        });
      }
    });

    cleared.forEach((key) => {
      const { row, col } = parseKey(key);
      state.pieces[row][col] = null;
    });

    const locked = handleDestruction(conversions);
    handleLegalVictories(conversions, locked);

    dropPieces();
    fillPieces();
    renderBoard();
    updateStatus();

    if (cascade === 1) {
      if (locked > 0) {
        addLog(`Contested filings collided. ${locked} room${locked === 1 ? "" : "s"} locked.`);
      } else {
        addLog("Claims processed.");
      }
    } else if (locked > 0) {
      addLog(`Cascade conflict triggered ${locked} new ruins.`);
    } else {
      addLog("Cascade cleared additional claims.");
    }

    matches = findMatches();
  }
}

function applyConversion(row, col, side, conversions) {
  if (!inBounds(row, col)) {
    return;
  }
  const ownership = state.board[row][col];
  if (!ownership || ownership.owner === "destruction") {
    return;
  }
  if (ownership.owner !== side) {
    ownership.owner = side;
  }
  const key = keyFrom(row, col);
  conversions[side].set(key, { row, col });
  const otherSide = side === "barbara" ? "oliver" : "barbara";
  conversions[otherSide].delete(key);
}

function handleDestruction(conversions) {
  const barbaraCells = Array.from(conversions.barbara.values());
  const oliverCells = Array.from(conversions.oliver.values());
  if (barbaraCells.length === 0 || oliverCells.length === 0) {
    return 0;
  }
  const locked = new Set();
  barbaraCells.forEach((bCell) => {
    oliverCells.forEach((oCell) => {
      if (Math.abs(bCell.row - oCell.row) + Math.abs(bCell.col - oCell.col) === 1) {
        lockCell(bCell.row, bCell.col, locked, conversions);
        lockCell(oCell.row, oCell.col, locked, conversions);
      }
    });
  });
  return locked.size;
}

function lockCell(row, col, lockedSet, conversions) {
  if (!inBounds(row, col)) {
    return;
  }
  const key = keyFrom(row, col);
  const ownership = state.board[row][col];
  if (!ownership || ownership.owner === "destruction") {
    return;
  }
  ownership.owner = "destruction";
  state.destruction.add(key);
  conversions.barbara.delete(key);
  conversions.oliver.delete(key);
  lockedSet.add(key);
}

function handleLegalVictories(conversions, lockedCount) {
  ["barbara", "oliver"].forEach((side) => {
    const cells = Array.from(conversions[side].values());
    if (cells.length < LEGAL_VICTORY_THRESHOLD) {
      return;
    }
    const cluster = largestCluster(cells);
    if (cluster.length >= LEGAL_VICTORY_THRESHOLD) {
      const freed = releaseDestruction(side, cluster);
      if (freed > 0) {
        addLog(`Legal Victory for ${capitalize(side)} freed ${freed} ruin${freed === 1 ? "" : "s"}.`);
      }
    }
  });
  if (lockedCount > 0) {
    particleSystem?.burst?.({ palette: ["#f87171", "#38bdf8"], count: lockedCount * 6 });
  }
}

function largestCluster(cells) {
  const visited = new Set();
  let best = [];
  const cellSet = new Set(cells.map((cell) => keyFrom(cell.row, cell.col)));
  cells.forEach((cell) => {
    const key = keyFrom(cell.row, cell.col);
    if (visited.has(key)) {
      return;
    }
    const cluster = [];
    const stack = [cell];
    visited.add(key);
    while (stack.length > 0) {
      const current = stack.pop();
      cluster.push(current);
      DIRECTIONS.forEach((offset) => {
        const nextRow = current.row + offset.row;
        const nextCol = current.col + offset.col;
        const nextKey = keyFrom(nextRow, nextCol);
        if (cellSet.has(nextKey) && !visited.has(nextKey)) {
          visited.add(nextKey);
          stack.push({ row: nextRow, col: nextCol });
        }
      });
    }
    if (cluster.length > best.length) {
      best = cluster;
    }
  });
  return best;
}

function releaseDestruction(side, cluster) {
  const clusterKeys = new Set(cluster.map((cell) => keyFrom(cell.row, cell.col)));
  const clusterCells = cluster.map((cell) => ({ row: cell.row, col: cell.col }));
  const freed = [];
  const candidates = Array.from(state.destruction);
  for (const key of candidates) {
    if (freed.length >= 2) {
      break;
    }
    if (clusterKeys.has(key)) {
      continue;
    }
    const { row, col } = parseKey(key);
    const nearCluster = clusterCells.some((cell) => Math.abs(cell.row - row) + Math.abs(cell.col - col) <= 1);
    if (nearCluster) {
      continue;
    }
    freed.push({ key, row, col });
  }
  freed.forEach((entry) => {
    state.destruction.delete(entry.key);
    state.board[entry.row][entry.col].owner = side;
  });
  return freed.length;
}

function dropPieces() {
  for (let col = 0; col < COLS; col += 1) {
    let targetRow = ROWS - 1;
    for (let row = ROWS - 1; row >= 0; row -= 1) {
      const type = state.pieces[row][col];
      if (type) {
        if (row !== targetRow) {
          state.pieces[targetRow][col] = type;
          state.pieces[row][col] = null;
        }
        targetRow -= 1;
      }
    }
    for (let fillRow = targetRow; fillRow >= 0; fillRow -= 1) {
      state.pieces[fillRow][col] = null;
    }
  }
}

function fillPieces() {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (!state.pieces[row][col]) {
        state.pieces[row][col] = generatePiece(row, col, state.pieces);
      }
    }
  }
}

function findMatches() {
  const matches = [];
  // Horizontal
  for (let row = 0; row < ROWS; row += 1) {
    let runType = null;
    let runStart = 0;
    for (let col = 0; col <= COLS; col += 1) {
      const type = col < COLS ? state.pieces[row][col] : null;
      if (type && type === runType) {
        continue;
      }
      if (runType && col - runStart >= 3) {
        matches.push({
          type: runType,
          cells: Array.from({ length: col - runStart }, (_, index) => ({ row, col: runStart + index })),
        });
      }
      runType = type;
      runStart = col;
    }
  }
  // Vertical
  for (let col = 0; col < COLS; col += 1) {
    let runType = null;
    let runStart = 0;
    for (let row = 0; row <= ROWS; row += 1) {
      const type = row < ROWS ? state.pieces[row][col] : null;
      if (type && type === runType) {
        continue;
      }
      if (runType && row - runStart >= 3) {
        matches.push({
          type: runType,
          cells: Array.from({ length: row - runStart }, (_, index) => ({ row: runStart + index, col })),
        });
      }
      runType = type;
      runStart = row;
    }
  }
  return matches.filter((match) => PIECE_INFO.has(match.type));
}

function swapPieces(a, b) {
  const temp = state.pieces[a.row][a.col];
  state.pieces[a.row][a.col] = state.pieces[b.row][b.col];
  state.pieces[b.row][b.col] = temp;
}

function renderCell(row, col) {
  updateCell(row, col);
}

function updateStatus() {
  let barbara = 0;
  let oliver = 0;
  let destruction = 0;
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const owner = state.board[row][col].owner;
      if (owner === "barbara") {
        barbara += 1;
      } else if (owner === "oliver") {
        oliver += 1;
      } else if (owner === "destruction") {
        destruction += 1;
      }
    }
  }
  const total = ROWS * COLS;
  const barbaraPercent = Math.round((barbara / total) * 100);
  const oliverPercent = Math.round((oliver / total) * 100);
  barbaraShareText.textContent = String(barbaraPercent);
  barbaraTilesText.textContent = String(barbara);
  oliverShareText.textContent = String(oliverPercent);
  oliverTilesText.textContent = String(oliver);
  destructionCountText.textContent = String(destruction);
  barbaraMeterFill.style.width = `${barbaraPercent}%`;
  oliverMeterFill.style.width = `${oliverPercent}%`;
  barbaraMeter.setAttribute("aria-valuenow", String(barbaraPercent));
  oliverMeter.setAttribute("aria-valuenow", String(oliverPercent));
  if (barbaraPercent >= TARGET_PERCENT && destruction <= MAX_DESTRUCTION) {
    highScore.submit(barbaraPercent, { destruction });
  }
}

function addLog(message) {
  const entry = document.createElement("li");
  entry.textContent = message;
  eventList.prepend(entry);
  while (eventList.children.length > MAX_LOG_ENTRIES) {
    eventList.removeChild(eventList.lastChild);
  }
}

function focusCell(row, col) {
  if (!inBounds(row, col)) {
    return;
  }
  state.cursor = { row, col };
  const key = keyFrom(row, col);
  const cell = cellsByKey.get(key);
  cell?.focus();
}

function moveCursor(rowOffset, colOffset) {
  let { row, col } = state.cursor;
  row = clamp(row + rowOffset, 0, ROWS - 1);
  col = clamp(col + colOffset, 0, COLS - 1);
  focusCell(row, col);
}

function clearSelection() {
  state.selectedKey = null;
  updateSelectionHighlight();
}

function inBounds(row, col) {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS;
}

function isAdjacent(aRow, aCol, bRow, bCol) {
  return Math.abs(aRow - bRow) + Math.abs(aCol - bCol) === 1;
}

function keyFrom(row, col) {
  return `${row},${col}`;
}

function parseKey(key) {
  const [row, col] = key.split(",").map((value) => Number.parseInt(value, 10));
  return [row, col];
}

function formatAriaLabel(row, col, ownerLabel, pieceType) {
  const info = PIECE_INFO.get(pieceType);
  const pieceText = info ? info.longName : "empty";
  const room = ROOMS[state.board[row][col].room];
  const cellName = `${String.fromCharCode(65 + col)}${row + 1}`;
  return `${cellName}, ${room?.name ?? "Unknown room"}. ${ownerLabel}. Piece: ${pieceText}.`;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function shuffle(values) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const temp = copy[index];
    copy[index] = copy[swapIndex];
    copy[swapIndex] = temp;
  }
  return copy;
}

function isRoomUsed(id) {
  return FLOOR_PLAN.some((row) => row.includes(id));
}

window.addEventListener("beforeunload", () => {
  particleSystem?.destroy?.();
});
