import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { mountParticleField } from "../particles.js";

mountParticleField();

const scoreConfig = getScoreConfig("cable-clash");
const highScore = initHighScoreBanner({
  gameId: "cable-clash",
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

const boardElement = document.getElementById("board");
const statusBar = document.getElementById("status-bar");
const logList = document.getElementById("log-entries");
const paletteButtons = Array.from(document.querySelectorAll(".palette-button"));
const rotateButton = document.getElementById("rotate-piece");
const resolveButton = document.getElementById("resolve-turn");
const resetButton = document.getElementById("reset-arena");

const GRID_SIZE = 6;
const START = { row: 5, col: 0 };
const GOAL = { row: 0, col: 5 };
const AC_TILES = new Set(["2,2", "2,3", "3,2", "3,3"]);
const LOCKDOWN_LIMIT = 3;

const ORIENTATION_SEQUENCE = {
  straight: ["horizontal", "vertical"],
  corner: ["ne", "se", "sw", "nw"],
};

const ORIENTATION_CONNECTORS = {
  horizontal: ["west", "east"],
  vertical: ["north", "south"],
  ne: ["north", "east"],
  se: ["south", "east"],
  sw: ["south", "west"],
  nw: ["north", "west"],
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

const rivals = [
  {
    id: "diagonal",
    name: "Diagonal Dropper",
    className: "diagonal",
    initialPosition: { row: 4, col: 1 },
    initialDirection: { row: -1, col: 1 },
    position: { row: 4, col: 1 },
    direction: { row: -1, col: 1 },
    stunned: false,
    move() {
      return this.advance(2);
    },
    advance(steps) {
      const path = [];
      for (let i = 0; i < steps; i += 1) {
        let nextRow = this.position.row + this.direction.row;
        let nextCol = this.position.col + this.direction.col;
        if (nextRow < 0 || nextRow >= GRID_SIZE) {
          this.direction = { row: -this.direction.row, col: this.direction.col };
          nextRow = this.position.row + this.direction.row;
        }
        if (nextCol < 0 || nextCol >= GRID_SIZE) {
          this.direction = { row: this.direction.row, col: -this.direction.col };
          nextCol = this.position.col + this.direction.col;
        }
        this.position = {
          row: clamp(nextRow, 0, GRID_SIZE - 1),
          col: clamp(nextCol, 0, GRID_SIZE - 1),
        };
        path.push({ ...this.position });
      }
      return path;
    },
    reset() {
      this.position = { ...this.initialPosition };
      this.direction = { ...this.initialDirection };
      this.stunned = false;
    },
  },
  {
    id: "rush",
    name: "Rope Rush",
    className: "rush",
    initialPosition: { row: 5, col: 4 },
    initialDirection: { row: 0, col: -1 },
    position: { row: 5, col: 4 },
    direction: { row: 0, col: -1 },
    stunned: false,
    move() {
      return this.advance(2);
    },
    advance(steps) {
      const path = [];
      for (let i = 0; i < steps; i += 1) {
        let nextRow = this.position.row + this.direction.row;
        let nextCol = this.position.col + this.direction.col;
        if (nextRow < 0 || nextRow >= GRID_SIZE) {
          this.direction = { row: -this.direction.row, col: this.direction.col };
          nextRow = this.position.row + this.direction.row;
        }
        if (nextCol < 0 || nextCol >= GRID_SIZE) {
          this.direction = { row: this.direction.row, col: -this.direction.col };
          nextCol = this.position.col + this.direction.col;
        }
        this.position = {
          row: clamp(nextRow, 0, GRID_SIZE - 1),
          col: clamp(nextCol, 0, GRID_SIZE - 1),
        };
        path.push({ ...this.position });
      }
      return path;
    },
    reset() {
      this.position = { ...this.initialPosition };
      this.direction = { ...this.initialDirection };
      this.stunned = false;
    },
  },
];

let tiles = [];
let cableNetwork = new Map();
let activePiece = { type: "straight", orientation: "horizontal" };
let turnCounter = 0;
let lockdownsLeft = LOCKDOWN_LIMIT;
let circuitClosed = false;
let lastAcType = null;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function resetState() {
  boardElement.innerHTML = "";
  logList.innerHTML = "";
  tiles = [];
  cableNetwork = new Map();
  turnCounter = 0;
  lockdownsLeft = LOCKDOWN_LIMIT;
  circuitClosed = false;
  lastAcType = null;
  rivals.forEach((rival) => {
    rival.reset();
  });
  buildBoard();
  setStatus("Select a tile to begin routing.");
  logEvent("Arena reset. Cobalt corner is charged.");
  logEvent(`Lockdown plates stocked: ${lockdownsLeft}.`);
}

function buildBoard() {
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.classList.add("tile");
      tile.dataset.row = String(row);
      tile.dataset.col = String(col);
      tile.setAttribute("role", "gridcell");
      tile.setAttribute("aria-label", `Tile ${row + 1}, ${col + 1}`);
      if (AC_TILES.has(key(row, col))) {
        tile.classList.add("ac");
      }
      tile.addEventListener("click", () => handleTileClick(row, col));
      const content = document.createElement("div");
      content.classList.add("tile-content");
      tile.appendChild(content);
      if (row === START.row && col === START.col) {
        tile.classList.add("start", "locked");
        tile.disabled = true;
        renderSegment(tile, "horizontal");
        cableNetwork.set(key(row, col), {
          type: "start",
          connectors: ["north", "east"],
          locked: true,
        });
      } else if (row === GOAL.row && col === GOAL.col) {
        tile.classList.add("goal", "locked");
        tile.disabled = true;
        renderSegment(tile, "horizontal");
        cableNetwork.set(key(row, col), {
          type: "goal",
          connectors: ["west", "south"],
          locked: true,
        });
      }
      boardElement.appendChild(tile);
      tiles.push(tile);
    }
  }
  renderRivals();
}

function key(row, col) {
  return `${row},${col}`;
}

function renderSegment(tile, orientation) {
  const content = tile.querySelector(".tile-content");
  if (!content) {
    return;
  }
  const segment = document.createElement("div");
  segment.classList.add("segment");
  if (orientation === "horizontal" || orientation === "vertical") {
    segment.classList.add(orientation);
  } else {
    segment.classList.add("corner", orientation);
  }
  content.innerHTML = "";
  content.appendChild(segment);
}

function renderRivals() {
  tiles.forEach((tile) => {
    const rivalMarker = tile.querySelector(".rival");
    rivalMarker?.remove();
  });
  rivals.forEach((rival) => {
    const tile = getTile(rival.position.row, rival.position.col);
    if (!tile) {
      return;
    }
    const marker = document.createElement("div");
    marker.classList.add("rival", rival.className);
    if (rival.stunned) {
      marker.classList.add("stunned");
    }
    tile.querySelector(".tile-content").appendChild(marker);
  });
}

function getTile(row, col) {
  return tiles.find((tile) => Number(tile.dataset.row) === row && Number(tile.dataset.col) === col);
}

function setStatus(message) {
  statusBar.textContent = message;
}

function logEvent(message) {
  const entry = document.createElement("li");
  entry.textContent = message;
  logList.appendChild(entry);
  logList.scrollTop = logList.scrollHeight;
}

function selectPiece(button) {
  const type = button.dataset.piece;
  const orientation = button.dataset.orientation;
  activePiece = { type, orientation: orientation ?? null };
  paletteButtons.forEach((btn) => {
    btn.setAttribute("aria-pressed", btn === button ? "true" : "false");
  });
  setStatus(`Selected ${type === "lockdown" ? "Lockdown plate" : `${type} segment`}.`);
}

function rotateActivePiece() {
  if (activePiece.type === "lockdown") {
    return;
  }
  const sequence = ORIENTATION_SEQUENCE[activePiece.type];
  const currentIndex = sequence.indexOf(activePiece.orientation);
  const nextIndex = (currentIndex + 1) % sequence.length;
  activePiece.orientation = sequence[nextIndex];
  const button = paletteButtons.find((btn) => btn.dataset.piece === activePiece.type);
  if (button) {
    button.dataset.orientation = activePiece.orientation;
  }
  setStatus(`Orientation set to ${activePiece.orientation}.`);
}

function handleTileClick(row, col) {
  if (circuitClosed) {
    setStatus("Circuit closed! Reset to rerun the bout.");
    return;
  }
  const selection = { ...activePiece };
  if (!selection.type) {
    return;
  }
  if (selection.type === "lockdown") {
    lockTile(row, col);
    return;
  }
  placeSegment(row, col, selection);
}

function lockTile(row, col) {
  const tileKey = key(row, col);
  const existing = cableNetwork.get(tileKey);
  if (!existing || existing.locked || existing.type === "goal" || existing.type === "start") {
    setStatus("Lockdown can only be used on active cable segments.");
    return;
  }
  if (lockdownsLeft <= 0) {
    setStatus("No lockdown plates remaining.");
    return;
  }
  existing.locked = true;
  lockdownsLeft -= 1;
  const tile = getTile(row, col);
  tile.classList.add("locked");
  logEvent(`Lockdown plate secured on tile ${row + 1}, ${col + 1}. (${lockdownsLeft} remaining)`);
}

function placeSegment(row, col, selection) {
  const tileKey = key(row, col);
  const tile = getTile(row, col);
  if (!tile || tile.classList.contains("locked")) {
    return;
  }
  if (cableNetwork.has(tileKey)) {
    setStatus("Tile already occupied.");
    return;
  }
  if (AC_TILES.has(tileKey)) {
    if (lastAcType === selection.type) {
      setStatus("AC plates demand alternating segment types.");
      return;
    }
  }
  const connectors = ORIENTATION_CONNECTORS[selection.orientation];
  if (!connectors) {
    setStatus("Select an orientation before placing this segment.");
    return;
  }
  const hasConnection = connectors.some((direction) => {
    const neighbor = neighborKey(row, col, direction);
    if (!neighbor) {
      return false;
    }
    const neighborState = cableNetwork.get(neighbor.key);
    return neighborState && neighborState.connectors.includes(OPPOSITE[direction]);
  });
  if (!hasConnection) {
    setStatus("Segments must link to the active circuit.");
    return;
  }
  cableNetwork.set(tileKey, {
    type: selection.type,
    orientation: selection.orientation,
    connectors,
    locked: false,
  });
  if (AC_TILES.has(tileKey)) {
    lastAcType = selection.type;
  }
  renderSegment(tile, selection.orientation);
  setStatus(`Segment placed on tile ${row + 1}, ${col + 1}. Resolve the turn to continue.`);
  renderRivals();
  checkCircuitClosure();
}

function neighborKey(row, col, direction) {
  const delta = DIRECTION_DELTAS[direction];
  if (!delta) {
    return null;
  }
  const newRow = row + delta.row;
  const newCol = col + delta.col;
  if (newRow < 0 || newRow >= GRID_SIZE || newCol < 0 || newCol >= GRID_SIZE) {
    return null;
  }
  return { key: key(newRow, newCol), row: newRow, col: newCol };
}

function resolveTurn() {
  if (circuitClosed) {
    setStatus("Circuit is already secure. Reset to play again.");
    return;
  }
  turnCounter += 1;
  const turnLabel = `Turn ${turnCounter}`;
  logEvent(`${turnLabel}: Rivals are on the move.`);
  rivals.forEach((rival) => {
    if (rival.stunned) {
      rival.stunned = false;
      logEvent(`${turnLabel}: ${rival.name} shakes off the stun.`);
      return;
    }
    const path = rival.move();
    path.forEach((step) => {
      rival.position = { ...step };
      checkRivalCollision(rival, step);
    });
  });
  renderRivals();
  checkCircuitClosure();
}

function checkRivalCollision(rival, position) {
  const tileKey = key(position.row, position.col);
  const segment = cableNetwork.get(tileKey);
  if (!segment || segment.locked || segment.type === "goal" || segment.type === "start") {
    return;
  }
  cableNetwork.delete(tileKey);
  if (AC_TILES.has(tileKey)) {
    lastAcType = null;
  }
  const tile = getTile(position.row, position.col);
  tile?.querySelector(".tile-content").replaceChildren();
  setStatus(`${rival.name} wrecked a segment at ${position.row + 1}, ${position.col + 1}.`);
  logEvent(`${rival.name} snapped the cable at tile ${position.row + 1}, ${position.col + 1}.`);
}

function checkCircuitClosure() {
  const frontier = [START];
  const visited = new Set([key(START.row, START.col)]);
  while (frontier.length > 0) {
    const current = frontier.shift();
    if (current.row === GOAL.row && current.col === GOAL.col) {
      onCircuitClosed();
      return;
    }
    const state = cableNetwork.get(key(current.row, current.col));
    if (!state) {
      continue;
    }
    state.connectors.forEach((direction) => {
      const neighbor = neighborKey(current.row, current.col, direction);
      if (!neighbor) {
        return;
      }
      if (visited.has(neighbor.key)) {
        return;
      }
      const neighborState = cableNetwork.get(neighbor.key);
      if (neighborState && neighborState.connectors.includes(OPPOSITE[direction])) {
        visited.add(neighbor.key);
        frontier.push({ row: neighbor.row, col: neighbor.col });
      }
    });
  }
}

function onCircuitClosed() {
  if (circuitClosed) {
    return;
  }
  circuitClosed = true;
  setStatus("Circuit complete! The main-event slam erupts and stuns nearby rivals.");
  logEvent("The main-event slam fires—broadcast restored!");
  highScore.submit(turnCounter);
  rivals.forEach((rival) => {
    if (isAdjacent(rival.position, GOAL)) {
      rival.stunned = true;
      logEvent(`${rival.name} is stunned by the surge!`);
    }
  });
  cableNetwork.forEach((segment, tileKey) => {
    if (segment.type === "start" || segment.type === "goal") {
      return;
    }
    segment.locked = true;
    const [row, col] = tileKey.split(",").map(Number);
    const tile = getTile(row, col);
    tile?.classList.add("locked");
  });
  renderRivals();
}

function isAdjacent(a, b) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

paletteButtons.forEach((button) => {
  button.addEventListener("click", () => selectPiece(button));
});

rotateButton.addEventListener("click", rotateActivePiece);
resolveButton.addEventListener("click", resolveTurn);
resetButton.addEventListener("click", resetState);

document.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "r") {
    event.preventDefault();
    rotateActivePiece();
  }
  if (event.key === "Enter") {
    event.preventDefault();
    resolveTurn();
  }
});

resetState();
