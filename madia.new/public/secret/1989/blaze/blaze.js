
import {
  animateAction,
  animateCounter,
  animateListEntry,
  animateWarning,
  enableActionAnimations
} from "../action-animations.js";

enableActionAnimations();

const boardElement = document.getElementById("board");
const statusBar = document.getElementById("status-bar");
const capitalMeter = document.getElementById("capital-meter");
const logList = document.getElementById("log-entries");
const modeButtons = Array.from(document.querySelectorAll(".mode-button"));
const paletteButtons = Array.from(document.querySelectorAll(".palette-button"));
const rotateButton = document.getElementById("rotate-piece");
const advanceButton = document.getElementById("advance-flow");
const resetButton = document.getElementById("reset-board");

const GRID_ROWS = 7;
const GRID_COLS = 7;
const START = { row: 6, col: 1 };
const GOAL = { row: 0, col: 5 };
const SCANDAL_SOURCE = { row: 3, col: 3 };
const ARCHIVES = [
  { row: 1, col: 6 },
  { row: 6, col: 5 },
];
const BARRICADES = new Set(["2,3", "4,3", "1,5", "5,1"]);

const STARTING_CAPITAL = 6;
const DIVERT_COST = 1;
const BILL_REWARD = 3;
const BILLS_REQUIRED = 2;

const ORIENTATION_SEQUENCE = {
  straight: ["horizontal", "vertical"],
  corner: ["ne", "se", "sw", "nw"],
  junction: ["north", "east", "south", "west"],
};

const ORIENTATION_CONNECTORS = {
  horizontal: ["west", "east"],
  vertical: ["north", "south"],
  ne: ["north", "east"],
  se: ["south", "east"],
  sw: ["south", "west"],
  nw: ["north", "west"],
  north: ["south", "east", "west"],
  east: ["north", "south", "west"],
  south: ["north", "east", "west"],
  west: ["north", "south", "east"],
};

const DIRECTION_DELTAS = {
  north: { row: -1, col: 0 },
  south: { row: 1, col: 0 },
  west: { row: 0, col: -1 },
  east: { row: 0, col: 1 },
};

const OPPOSITE = {
  north: "south",
  south: "north",
  east: "west",
  west: "east",
};

const START_CONNECTORS = ["north", "east"];
const GOAL_CONNECTORS = ["west", "south"];
const SOURCE_CONNECTORS = ["north", "east", "south"];

let activeMode = "bill";
let selectedPiece = { type: "straight", orientation: "horizontal" };
let boardState = new Map();
let lockedSegments = new Map();
let tileRoles = new Map();
let tileElements = new Map();
let billPosition = { ...START };
let politicalCapital = STARTING_CAPITAL;
let signedBills = 0;
let scandalPoints = [];
let scandalId = 0;
let gameOver = false;

function key(row, col) {
  return `${row},${col}`;
}

function inBounds(row, col) {
  return row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS;
}

function setStatus(message) {
  statusBar.textContent = message;
  animateAction(statusBar, "flash");
}

function logEvent(message) {
  const item = document.createElement("li");
  item.textContent = message;

  animateAction(item, "flash");
  logList.appendChild(item);
  logList.scrollTop = logList.scrollHeight;
  animateListEntry(item);
}

function updateCapitalMeter() {
  capitalMeter.textContent = `Political Capital: ${politicalCapital}`;
  capitalMeter.classList.toggle("low", politicalCapital <= 2);
  capitalMeter.classList.toggle("strong", politicalCapital >= 8);
  animateCounter(capitalMeter);
  if (politicalCapital < 0) {
    triggerLoss("Political Capital collapsed below zero. The caucus walks out.");
  } else if (politicalCapital === 0) {
    triggerLoss("Political Capital is exhausted. No one will back another vote.");
  }
}

function resetState() {
  boardState = new Map();
  lockedSegments = new Map();
  tileRoles = new Map();
  tileElements = new Map();
  scandalPoints = [];
  scandalId = 0;
  signedBills = 0;
  billPosition = { ...START };
  politicalCapital = STARTING_CAPITAL;
  gameOver = false;
  setSelectedPiece("straight", "horizontal");
  setActiveMode("bill");
  buildBoard();
  renderBillToken();
  renderScandals();
  setStatus("Select a tile to begin the paper trail.");
  logList.innerHTML = "";
  logEvent("Session reset. Governor queues a fresh bill.");
  updateCapitalMeter();
  animateAction(boardElement, "pulse");
}

function buildBoard() {
  boardElement.innerHTML = "";
  tileElements.clear();
  lockedSegments.clear();
  tileRoles.clear();

  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.classList.add("tile");
      tile.dataset.row = String(row);
      tile.dataset.col = String(col);
      tile.setAttribute("role", "gridcell");
      tile.setAttribute("aria-label", `Tile ${row + 1}, ${col + 1}`);
      const content = document.createElement("div");
      content.classList.add("tile-content");
      tile.appendChild(content);

      const tileKey = key(row, col);
      if (row === START.row && col === START.col) {
        tile.classList.add("start", "locked");
        tile.disabled = true;
        tile.setAttribute("aria-disabled", "true");
        tileRoles.set(tileKey, "start");
        lockedSegments.set(tileKey, {
          occupant: "bill",
          connectors: START_CONNECTORS,
          type: "start",
          locked: true,
        });
      } else if (row === GOAL.row && col === GOAL.col) {
        tile.classList.add("goal", "locked");
        tile.disabled = true;
        tile.setAttribute("aria-disabled", "true");
        tileRoles.set(tileKey, "goal");
        lockedSegments.set(tileKey, {
          occupant: "bill",
          connectors: GOAL_CONNECTORS,
          type: "goal",
          locked: true,
        });
      } else if (row === SCANDAL_SOURCE.row && col === SCANDAL_SOURCE.col) {
        tile.classList.add("source", "locked");
        tile.disabled = true;
        tile.setAttribute("aria-disabled", "true");
        tileRoles.set(tileKey, "source");
        lockedSegments.set(tileKey, {
          occupant: "scandal",
          connectors: SOURCE_CONNECTORS,
          type: "source",
          locked: true,
        });
      } else if (ARCHIVES.some((archive) => archive.row === row && archive.col === col)) {
        tile.classList.add("archive", "locked");
        tile.disabled = true;
        tile.setAttribute("aria-disabled", "true");
        tileRoles.set(tileKey, "archive");
      } else if (BARRICADES.has(tileKey)) {
        tile.classList.add("barricade", "locked");
        tile.disabled = true;
        tile.setAttribute("aria-disabled", "true");
        tileRoles.set(tileKey, "barricade");
      } else {
        tile.addEventListener("click", () => handleTileClick(row, col));
      }

      boardElement.appendChild(tile);
      tileElements.set(tileKey, tile);
    }
  }
}

function handleTileClick(row, col) {
  if (gameOver) {
    setStatus("Session complete. Reset to try again.");
    animateWarning(statusBar);
    return;
  }

  const tileKey = key(row, col);
  const role = tileRoles.get(tileKey);
  if (role && role !== "") {
    if (role === "barricade" || role === "start" || role === "goal" || role === "source" || role === "archive") {
      setStatus("That tile is bound by statute—choose another.");
      animateWarning(statusBar);
      return;
    }
  }

  if (activeMode === "clear") {
    clearSegment(tileKey);
    return;
  }

  if (activeMode === "bill" && selectedPiece.type === "junction") {
    setStatus("Bill drafters can't install a junction. Switch to Scandal mode for that piece.");
    animateWarning(statusBar);
    return;
  }

  const existing = boardState.get(tileKey);
  if (existing && existing.occupant !== activeMode) {
    setStatus("That tile already carries the other conduit. Find a new route.");
    animateWarning(statusBar);
    return;
  }

  placeSegment(tileKey, {
    occupant: activeMode,
    type: selectedPiece.type,
    orientation: selectedPiece.orientation,
  });
}

function clearSegment(tileKey) {
  const existing = boardState.get(tileKey);
  if (!existing) {
    setStatus("Nothing to clear on that tile.");
    animateWarning(statusBar);
    return;
  }
  boardState.delete(tileKey);
  const tile = tileElements.get(tileKey);
  if (tile) {
    const existingSegment = tile.querySelector(".segment");
    if (existingSegment) {
      existingSegment.remove();
    }
    animateAction(tile, "pulse");
  }
  setStatus("Conduit removed. Rework the flow before advancing.");
}

function placeSegment(tileKey, segment) {
  boardState.set(tileKey, { ...segment });
  renderSegment(tileKey);
  setStatus(
    segment.occupant === "bill"
      ? "Bill conduit laid."
      : "Scandal channel positioned."
  );
  const tile = tileElements.get(tileKey);
  if (tile) {
    animateAction(tile, "pulse");
  }
}

function renderSegment(tileKey) {
  const tile = tileElements.get(tileKey);
  if (!tile) {
    return;
  }
  const content = tile.querySelector(".tile-content");
  if (!content) {
    return;
  }
  const existingSegment = content.querySelector(".segment");
  if (existingSegment) {
    existingSegment.remove();
  }
  const data = boardState.get(tileKey);
  if (!data) {
    return;
  }
  const segment = document.createElement("div");
  segment.classList.add("segment", data.occupant, data.type, data.orientation);
  content.appendChild(segment);
}

function renderBillToken() {
  boardElement.querySelectorAll(".token.bill").forEach((token) => token.remove());
  const tile = tileElements.get(key(billPosition.row, billPosition.col));
  if (!tile) {
    return;
  }
  const content = tile.querySelector(".tile-content");
  if (!content) {
    return;
  }
  const token = document.createElement("div");
  token.classList.add("token", "bill");
  content.appendChild(token);
  animateAction(content, "flash");
}

function renderScandals() {
  boardElement.querySelectorAll(".token.scandal").forEach((token) => token.remove());
  scandalPoints.forEach((point) => {
    const tile = tileElements.get(key(point.row, point.col));
    if (!tile) {
      return;
    }
    const content = tile.querySelector(".tile-content");
    if (!content) {
      return;
    }
    const token = document.createElement("div");
    token.classList.add("token", "scandal");
    content.appendChild(token);
    animateAction(content, "pulse");
  });
}

function getConnectorsFor(mode, row, col) {
  const tileKey = key(row, col);
  if (mode === "bill") {
    if (row === START.row && col === START.col) {
      return START_CONNECTORS;
    }
    if (row === GOAL.row && col === GOAL.col) {
      return GOAL_CONNECTORS;
    }
  } else if (mode === "scandal" && row === SCANDAL_SOURCE.row && col === SCANDAL_SOURCE.col) {
    return SOURCE_CONNECTORS;
  }

  const locked = lockedSegments.get(tileKey);
  if (locked && locked.occupant === mode) {
    return locked.connectors;
  }
  const data = boardState.get(tileKey);
  if (!data) {
    return null;
  }
  if (data.occupant !== mode) {
    return null;
  }
  return ORIENTATION_CONNECTORS[data.orientation] ?? null;
}

function tileHasBill(row, col) {
  const tileKey = key(row, col);
  if (row === START.row && col === START.col) {
    return true;
  }
  if (row === GOAL.row && col === GOAL.col) {
    return true;
  }
  const data = boardState.get(tileKey);
  return data?.occupant === "bill";
}

function computeBillRoute() {
  const visited = new Set();
  const route = [];
  let current = { ...START };
  let previousDirection = null;
  visited.add(key(current.row, current.col));
  route.push({ ...current });

  while (!(current.row === GOAL.row && current.col === GOAL.col)) {
    const connectors = getConnectorsFor("bill", current.row, current.col);
    if (!connectors || connectors.length === 0) {
      return null;
    }
    const options = connectors
      .filter((direction) => !(previousDirection && direction === OPPOSITE[previousDirection]))
      .map((direction) => {
        const delta = DIRECTION_DELTAS[direction];
        const nextRow = current.row + delta.row;
        const nextCol = current.col + delta.col;
        return { direction, row: nextRow, col: nextCol };
      })
      .filter((option) => inBounds(option.row, option.col));

    let nextOption = null;
    for (const option of options) {
      const connectorsNext = getConnectorsFor("bill", option.row, option.col);
      if (!connectorsNext || !connectorsNext.includes(OPPOSITE[option.direction])) {
        continue;
      }
      const optionKey = key(option.row, option.col);
      if (visited.has(optionKey) && !(option.row === GOAL.row && option.col === GOAL.col)) {
        continue;
      }
      nextOption = option;
      break;
    }

    if (!nextOption) {
      return null;
    }

    current = { row: nextOption.row, col: nextOption.col };
    previousDirection = nextOption.direction;
    route.push({ ...current });
    const currentKey = key(current.row, current.col);
    if (visited.has(currentKey) && !(current.row === GOAL.row && current.col === GOAL.col)) {
      return null;
    }
    visited.add(currentKey);
    if (route.length > GRID_ROWS * GRID_COLS + 2) {
      return null;
    }
  }

  return route;
}

function advanceFlow() {
  if (gameOver) {
    setStatus("Session complete. Reset to launch another run.");
    animateWarning(statusBar);
    return;
  }

  const route = computeBillRoute();
  if (!route) {
    setStatus("The bill's conduit is incomplete. Shore it up before advancing.");
    logEvent("Bill route collapsed—paper trail must be continuous.");
    animateWarning(statusBar);
    return;
  }

  const currentIndex = route.findIndex((step) => step.row === billPosition.row && step.col === billPosition.col);
  if (currentIndex === -1) {
    setStatus("The bill lost the paper trail. Rebuild from the desk.");
    logEvent("Bill position is off the conduit. Resetting to the desk.");
    animateWarning(statusBar);
    billPosition = { ...START };
    renderBillToken();
    return;
  }

  if (currentIndex >= route.length - 1) {
    setStatus("A fresh bill is staged at the Governor's Desk.");
  } else {
    const nextStep = route[currentIndex + 1];
    billPosition = { ...nextStep };
    if (billPosition.row === GOAL.row && billPosition.col === GOAL.col) {
      signedBills += 1;
      politicalCapital += BILL_REWARD;
      logEvent(`Bill signed cleanly. Political Capital +${BILL_REWARD} (now ${politicalCapital}).`);
      updateCapitalMeter();
      if (gameOver) {
        return;
      }
      if (signedBills >= BILLS_REQUIRED) {
        renderBillToken();
        triggerWin();
        return;
      }
      billPosition = { ...START };
      logEvent("Fresh legislation drafted at the Governor's Desk.");
      setStatus("Bill signed without scandal. A new draft is ready.");
      animateAction(statusBar, "flash");
    } else {
      logEvent(`Bill advanced to row ${billPosition.row + 1}, column ${billPosition.col + 1}.`);
      setStatus("Bill advanced along the conduit.");
      animateAction(statusBar, "flash");
    }
  }

  renderBillToken();
  spawnScandalPoint();
  moveScandals();
  renderScandals();
}

function spawnScandalPoint() {
  if (gameOver) {
    return;
  }
  scandalId += 1;
  scandalPoints.push({
    id: scandalId,
    row: SCANDAL_SOURCE.row,
    col: SCANDAL_SOURCE.col,
    lastDirection: null,
    cameFrom: null,
  });
  logEvent(`Scandal Point ${scandalId} erupts from Blaze's parlor.`);
  const sourceTile = tileElements.get(key(SCANDAL_SOURCE.row, SCANDAL_SOURCE.col));
  if (sourceTile) {
    animateAction(sourceTile, "flash");
  }
}

function moveScandals() {
  if (gameOver) {
    return;
  }
  const survivors = [];
  for (const point of scandalPoints) {
    const outcome = advanceScandal(point);
    if (gameOver) {
      return;
    }
    if (outcome === "contained") {
      politicalCapital -= DIVERT_COST;
      logEvent(
        `Scandal Point ${point.id} filed into archives. Political Capital -${DIVERT_COST} (now ${politicalCapital}).`
      );
      updateCapitalMeter();
      if (gameOver) {
        return;
      }
    } else if (outcome === "moved") {
      survivors.push(point);
    } else if (outcome === "stalled") {
      logEvent(`Scandal Point ${point.id} jammed with nowhere to go.`);
      triggerLoss("A scandal jammed and burst across the floor.");
      return;
    }
  }
  scandalPoints = survivors;
}

function advanceScandal(point) {
  const connectors = getConnectorsFor("scandal", point.row, point.col);
  if (!connectors || connectors.length === 0) {
    return "stalled";
  }

  const options = connectors
    .filter((direction) => !(point.cameFrom && direction === point.cameFrom))
    .map((direction) => {
      const delta = DIRECTION_DELTAS[direction];
      return {
        direction,
        row: point.row + delta.row,
        col: point.col + delta.col,
      };
    })
    .filter((option) => inBounds(option.row, option.col));

  let chosen = null;
  for (const option of options) {
    const role = tileRoles.get(key(option.row, option.col));
    if (role === "barricade") {
      continue;
    }
    if (role === "archive") {
      chosen = option;
      break;
    }
    const connectorsNext = getConnectorsFor("scandal", option.row, option.col);
    if (!connectorsNext || !connectorsNext.includes(OPPOSITE[option.direction])) {
      continue;
    }
    if (tileHasBill(option.row, option.col)) {
      continue;
    }
    if (!chosen) {
      chosen = option;
    } else if (point.lastDirection && option.direction === point.lastDirection) {
      chosen = option;
    }
  }

  if (!chosen) {
    return "stalled";
  }

  const role = tileRoles.get(key(chosen.row, chosen.col));
  if (tileHasBill(chosen.row, chosen.col)) {
    triggerLoss("A scandal crossed into the bill's conduit. The legislation is ruined.");
    return "collision";
  }

  if (role === "archive") {
    return "contained";
  }

  const connectorsNext = getConnectorsFor("scandal", chosen.row, chosen.col);
  if (!connectorsNext || !connectorsNext.includes(OPPOSITE[chosen.direction])) {
    return "stalled";
  }

  point.row = chosen.row;
  point.col = chosen.col;
  point.cameFrom = OPPOSITE[chosen.direction];
  point.lastDirection = chosen.direction;
  return "moved";
}

function triggerLoss(message) {
  if (gameOver) {
    return;
  }
  gameOver = true;
  setStatus(message);
  animateWarning(statusBar);
  logEvent("Proceedings collapse. Reset to attempt another session.");
}

function triggerWin() {
  if (gameOver) {
    return;
  }
  gameOver = true;
  setStatus("Two clean bills signed. The chamber erupts in relief.");
  animateAction(statusBar, "flash");
  logEvent("Victory! The paper trail held under pressure.");
}

function setActiveMode(mode) {
  activeMode = mode;
  modeButtons.forEach((button) => {
    const pressed = button.dataset.mode === mode;
    button.setAttribute("aria-pressed", pressed ? "true" : "false");
    if (pressed) {
      animateAction(button, "pulse");
    }
  });
  paletteButtons.forEach((button) => {
    const isJunction = button.dataset.piece === "junction";
    button.disabled = mode === "bill" && isJunction;
    if (button.disabled) {
      button.setAttribute("aria-pressed", "false");
    }
  });
  if (mode === "bill" && selectedPiece.type === "junction") {
    setSelectedPiece("straight", "horizontal");
  }
  if (mode === "clear") {
    setStatus("Clear mode: select a placed conduit to remove it.");
    animateAction(statusBar, "flash");
  }
}

function setSelectedPiece(type, orientation) {
  selectedPiece = { type, orientation };
  paletteButtons.forEach((button) => {
    const pressed = button.dataset.piece === type;
    button.setAttribute("aria-pressed", pressed ? "true" : "false");
    if (pressed) {
      button.dataset.orientation = orientation;
      animateAction(button, "pulse");
    }
  });
}

function rotateSelectedPiece() {
  const sequence = ORIENTATION_SEQUENCE[selectedPiece.type];
  if (!sequence || sequence.length === 0) {
    return;
  }
  const index = sequence.indexOf(selectedPiece.orientation);
  const nextOrientation = sequence[(index + 1) % sequence.length];
  selectedPiece = { ...selectedPiece, orientation: nextOrientation };
  paletteButtons.forEach((button) => {
    if (button.dataset.piece === selectedPiece.type) {
      button.dataset.orientation = selectedPiece.orientation;
      animateAction(button, "pulse");
    }
  });
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveMode(button.dataset.mode);
  });
});

paletteButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.disabled) {
      return;
    }
    const type = button.dataset.piece;
    const orientation = button.dataset.orientation;
    setSelectedPiece(type, orientation);
  });
});

rotateButton.addEventListener("click", () => {
  rotateSelectedPiece();
});

advanceButton.addEventListener("click", () => {
  advanceFlow();
});

resetButton.addEventListener("click", () => {
  resetState();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "r" || event.key === "R") {
    event.preventDefault();
    rotateSelectedPiece();
  } else if (event.key === "Enter") {
    event.preventDefault();
    advanceFlow();
  }
});

resetState();
