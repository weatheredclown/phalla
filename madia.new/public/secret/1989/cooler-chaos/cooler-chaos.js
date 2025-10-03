import { mountParticleField } from "../particles.js";

const particleSystem = mountParticleField({
  effects: {
    palette: ["#38bdf8", "#f97316", "#facc15", "#fda4af"],
    ambientDensity: 0.6,
  },
});

const GRID_ROWS = 8;
const GRID_COLS = 8;
const TICK_MS = 1200;
const COMBO_WINDOW = 6000;
const MAX_TROUBLEMAKERS = 7;

const DIRECTIONS = {
  up: { row: -1, col: 0 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
  right: { row: 0, col: 1 },
};

const exitPositions = new Set(
  [
    { row: 0, col: 3 },
    { row: 0, col: 4 },
    { row: GRID_ROWS - 1, col: 3 },
    { row: GRID_ROWS - 1, col: 4 },
    { row: 3, col: 0 },
    { row: 4, col: 0 },
    { row: 3, col: GRID_COLS - 1 },
    { row: 4, col: GRID_COLS - 1 },
  ].map((cell) => keyFrom(cell.row, cell.col))
);

const gridElement = document.getElementById("bar-grid");
const startButton = document.getElementById("start-shift");
const pauseButton = document.getElementById("pause-shift");
const resetButton = document.getElementById("reset-shift");
const padButtons = document.querySelectorAll(".pad-button");
const eventLog = document.getElementById("event-log");
const ejectedCount = document.getElementById("ejected-count");
const glassCount = document.getElementById("glass-count");
const comboMeter = document.getElementById("combo-meter");
const beatCount = document.getElementById("beat-count");

const cellsByKey = new Map();

const state = {
  cooler: { row: 3, col: 3 },
  troublemakers: new Map(),
  glass: new Set(),
  beat: 0,
  ejected: 0,
  comboCount: 0,
  lastEjectTime: 0,
  timerId: null,
  paused: false,
};

const initialTroublemakers = [
  { row: 1, col: 3 },
  { row: 2, col: 5 },
  { row: 5, col: 2 },
];

setupGrid();
resetShift();
wireControls();

function setupGrid() {
  gridElement.style.setProperty("--rows", GRID_ROWS);
  gridElement.style.setProperty("--cols", GRID_COLS);
  gridElement.innerHTML = "";
  cellsByKey.clear();

  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      const cell = document.createElement("div");
      cell.classList.add("grid-cell");
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("tabindex", "-1");

      const cellKey = keyFrom(row, col);
      if (exitPositions.has(cellKey)) {
        cell.dataset.type = "exit";
      }

      cellsByKey.set(cellKey, cell);
      gridElement.appendChild(cell);
      updateCellAria(cell);
    }
  }
}

function resetShift() {
  clearTimer();
  state.cooler = { row: 3, col: 3 };
  state.troublemakers.clear();
  state.glass.clear();
  state.beat = 0;
  state.ejected = 0;
  state.comboCount = 0;
  state.lastEjectTime = 0;
  state.paused = false;
  initialTroublemakers.forEach((spot) => {
    const cellKey = keyFrom(spot.row, spot.col);
    state.troublemakers.set(cellKey, { row: spot.row, col: spot.col });
  });

  startButton.disabled = false;
  pauseButton.disabled = true;
  pauseButton.textContent = "Pause";
  render();
  updateStatus();
  addLog("Shift reset. Floor is clear.");
}

function wireControls() {
  startButton.addEventListener("click", startShift);
  pauseButton.addEventListener("click", togglePause);
  resetButton.addEventListener("click", () => {
    addLog("Reset called. Fresh shift inbound.");
    resetShift();
  });

  padButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const direction = button.dataset.dir;
      if (direction) {
        handleMove(direction);
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    const { key } = event;
    if (["ArrowUp", "w", "W"].includes(key)) {
      event.preventDefault();
      handleMove("up");
    } else if (["ArrowDown", "s", "S"].includes(key)) {
      event.preventDefault();
      handleMove("down");
    } else if (["ArrowLeft", "a", "A"].includes(key)) {
      event.preventDefault();
      handleMove("left");
    } else if (["ArrowRight", "d", "D"].includes(key)) {
      event.preventDefault();
      handleMove("right");
    } else if (key === " " || key === "Spacebar") {
      event.preventDefault();
      togglePause();
    } else if (key === "r" || key === "R") {
      event.preventDefault();
      addLog("Reset hotkey pressed. Clearing the floor.");
      resetShift();
    }
  });
}

function startShift() {
  if (state.timerId) {
    return;
  }
  state.paused = false;
  state.timerId = window.setInterval(advanceBeat, TICK_MS);
  startButton.disabled = true;
  pauseButton.disabled = false;
  pauseButton.textContent = "Pause";
  addLog("Shift started. Keep the exits glowing.");
}

function togglePause() {
  if (!state.timerId && !state.paused) {
    return;
  }

  if (state.timerId) {
    clearTimer();
    state.paused = true;
    pauseButton.textContent = "Resume";
    addLog("Beat flow paused. Cooler is holding position.");
  } else {
    state.timerId = window.setInterval(advanceBeat, TICK_MS);
    state.paused = false;
    pauseButton.textContent = "Pause";
    addLog("Beat flow resumed. Floor motion returns.");
  }
}

function clearTimer() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

function advanceBeat() {
  state.beat += 1;
  moveTroublemakers();
  maybeSpawnTroublemaker();
  updateStatus();
  render();
}

function handleMove(direction) {
  const delta = DIRECTIONS[direction];
  if (!delta) {
    return;
  }

  const targetRow = state.cooler.row + delta.row;
  const targetCol = state.cooler.col + delta.col;
  if (!inBounds(targetRow, targetCol)) {
    addLog("Cooler bumps the wall—no give there.");
    return;
  }

  const targetKey = keyFrom(targetRow, targetCol);
  if (state.glass.has(targetKey)) {
    addLog(`Broken glass blocks ${formatTile(targetRow, targetCol)}.`);
    return;
  }

  if (state.troublemakers.has(targetKey)) {
    const pushed = tryPushChain(targetRow, targetCol, delta);
    if (!pushed) {
      addLog("Stack will not budge—blocked further down the lane.");
      return;
    }
  } else {
    state.cooler = { row: targetRow, col: targetCol };
  }

  updateStatus();
  render();
}

function tryPushChain(startRow, startCol, delta) {
  const chain = [];
  let currentRow = startRow;
  let currentCol = startCol;

  while (true) {
    const currentKey = keyFrom(currentRow, currentCol);
    const troublemaker = state.troublemakers.get(currentKey);
    if (!troublemaker) {
      break;
    }
    chain.push({ row: troublemaker.row, col: troublemaker.col, key: currentKey });
    const nextRow = currentRow + delta.row;
    const nextCol = currentCol + delta.col;
    if (!inBounds(nextRow, nextCol)) {
      return false;
    }
    const nextKey = keyFrom(nextRow, nextCol);
    if (state.glass.has(nextKey)) {
      return false;
    }
    if (state.troublemakers.has(nextKey)) {
      currentRow = nextRow;
      currentCol = nextCol;
      continue;
    }

    const destination = { row: nextRow, col: nextCol, key: nextKey };
    const willEject = exitPositions.has(destination.key);
    const moves = [];

    if (willEject) {
      const removed = chain[chain.length - 1];
      moves.push({ from: removed, to: null });
    } else {
      const last = chain[chain.length - 1];
      moves.push({ from: last, to: destination });
    }

    for (let index = chain.length - 2; index >= 0; index -= 1) {
      const from = chain[index];
      const to = chain[index + 1];
      moves.push({ from, to });
    }

    moves.forEach((move) => {
      if (move.to) {
        state.troublemakers.delete(move.from.key);
        state.troublemakers.set(move.to.key, { row: move.to.row, col: move.to.col });
      } else {
        state.troublemakers.delete(move.from.key);
      }
    });

    state.cooler = { row: state.cooler.row + delta.row, col: state.cooler.col + delta.col };
    if (willEject) {
      handleEjection(destination);
    } else {
      addLog(`Cooler shoves the line toward ${formatTile(destination.row, destination.col)}.`);
    }
    return true;
  }
}

function handleEjection(exitCell) {
  state.ejected += 1;
  const now = performance.now();
  if (now - state.lastEjectTime <= COMBO_WINDOW) {
    state.comboCount += 1;
  } else {
    state.comboCount = 1;
  }
  state.lastEjectTime = now;
  addLog(`Troublemaker launched through ${formatTile(exitCell.row, exitCell.col)}.`);
  particleSystem.emitSparkle(0.9 + state.comboCount * 0.1);
  if (state.comboCount >= 3) {
    triggerBeNice(exitCell);
    state.comboCount = 0;
  }
}

function triggerBeNice(anchorCell) {
  let cleared = 0;
  for (let rowDelta = -1; rowDelta <= 1; rowDelta += 1) {
    for (let colDelta = -1; colDelta <= 1; colDelta += 1) {
      const targetRow = anchorCell.row + rowDelta;
      const targetCol = anchorCell.col + colDelta;
      if (!inBounds(targetRow, targetCol)) {
        continue;
      }
      const targetKey = keyFrom(targetRow, targetCol);
      if (state.glass.delete(targetKey)) {
        cleared += 1;
        const cell = cellsByKey.get(targetKey);
        if (cell) {
          cell.dataset.highlight = "combo";
          window.setTimeout(() => {
            cell.removeAttribute("data-highlight");
          }, 600);
        }
      }
    }
  }

  const anchorKey = keyFrom(anchorCell.row, anchorCell.col);
  const anchorElement = cellsByKey.get(anchorKey);
  if (anchorElement) {
    anchorElement.dataset.highlight = "combo";
    window.setTimeout(() => {
      anchorElement.removeAttribute("data-highlight");
    }, 600);
  }
  particleSystem.emitBurst(1.4);

  if (cleared > 0) {
    addLog(`Be Nice bonus clears ${cleared} shard${cleared === 1 ? "" : "s"} near ${formatTile(anchorCell.row, anchorCell.col)}.`);
  } else {
    addLog("Be Nice bonus fizzles—no glass nearby to clear.");
  }
}

function moveTroublemakers() {
  const movers = shuffle(Array.from(state.troublemakers.keys()));
  const removed = new Set();
  const plannedMoves = new Map();

  movers.forEach((key) => {
    if (removed.has(key)) {
      return;
    }
    const troublemaker = state.troublemakers.get(key);
    if (!troublemaker) {
      return;
    }
    const directions = shuffle(Object.values(DIRECTIONS));
    for (const delta of directions) {
      const nextRow = troublemaker.row + delta.row;
      const nextCol = troublemaker.col + delta.col;
      if (!inBounds(nextRow, nextCol)) {
        continue;
      }
      const nextKey = keyFrom(nextRow, nextCol);
      if (exitPositions.has(nextKey)) {
        continue;
      }
      if (state.glass.has(nextKey)) {
        continue;
      }
      if (nextRow === state.cooler.row && nextCol === state.cooler.col) {
        continue;
      }

      if (state.troublemakers.has(nextKey) && !removed.has(nextKey)) {
        removed.add(key);
        removed.add(nextKey);
        addGlass(nextRow, nextCol);
        addLog(`Crash at ${formatTile(nextRow, nextCol)} scatters broken glass.`);
        const conflictingPlan = plannedMoves.get(nextKey);
        if (conflictingPlan) {
          removed.add(conflictingPlan.from);
          plannedMoves.delete(nextKey);
        }
        return;
      }

      if (plannedMoves.has(nextKey)) {
        const otherMove = plannedMoves.get(nextKey);
        removed.add(key);
        removed.add(otherMove.from);
        plannedMoves.delete(nextKey);
        addGlass(nextRow, nextCol);
        addLog(`Twin rush into ${formatTile(nextRow, nextCol)} leaves a glittering hazard.`);
        return;
      }

      plannedMoves.set(nextKey, { from: key, row: nextRow, col: nextCol });
      return;
    }
  });

  removed.forEach((key) => {
    state.troublemakers.delete(key);
  });

  plannedMoves.forEach((move) => {
    if (removed.has(move.from)) {
      return;
    }
    if (!state.troublemakers.has(move.from)) {
      return;
    }
    state.troublemakers.delete(move.from);
    state.troublemakers.set(keyFrom(move.row, move.col), { row: move.row, col: move.col });
  });
}

function maybeSpawnTroublemaker() {
  if (state.troublemakers.size >= MAX_TROUBLEMAKERS) {
    return;
  }
  const spawnChance = state.troublemakers.size <= 3 ? 0.6 : 0.35;
  if (Math.random() > spawnChance) {
    return;
  }

  const openCells = [];
  cellsByKey.forEach((cell, key) => {
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    if (
      exitPositions.has(key) ||
      state.glass.has(key) ||
      state.troublemakers.has(key) ||
      (row === state.cooler.row && col === state.cooler.col)
    ) {
      return;
    }
    openCells.push({ row, col, key });
  });

  if (openCells.length === 0) {
    addLog("No space to spawn—floor gridlocked by glass.");
    return;
  }

  const spawnCell = openCells[Math.floor(Math.random() * openCells.length)];
  state.troublemakers.set(spawnCell.key, { row: spawnCell.row, col: spawnCell.col });
  addLog(`New trouble ignites at ${formatTile(spawnCell.row, spawnCell.col)}.`);
}

function addGlass(row, col) {
  const key = keyFrom(row, col);
  if (!state.glass.has(key)) {
    state.glass.add(key);
  }
}

function render() {
  cellsByKey.forEach((cell) => {
    cell.removeAttribute("data-occupant");
  });

  state.glass.forEach((key) => {
    const cell = cellsByKey.get(key);
    if (cell) {
      cell.dataset.occupant = "glass";
    }
  });

  state.troublemakers.forEach((troublemaker, key) => {
    const cell = cellsByKey.get(key);
    if (cell) {
      cell.dataset.occupant = "troublemaker";
    }
  });

  const coolerKey = keyFrom(state.cooler.row, state.cooler.col);
  const coolerCell = cellsByKey.get(coolerKey);
  if (coolerCell) {
    coolerCell.dataset.occupant = "cooler";
  }

  cellsByKey.forEach((cell) => updateCellAria(cell));
}

function updateStatus() {
  ejectedCount.textContent = String(state.ejected);
  glassCount.textContent = String(state.glass.size);
  comboMeter.textContent = `${state.comboCount} / 3`;
  beatCount.textContent = String(state.beat);
}

function addLog(message) {
  const entry = document.createElement("li");
  if (state.beat > 0) {
    entry.textContent = `Beat ${state.beat}: ${message}`;
  } else {
    entry.textContent = message;
  }
  eventLog.prepend(entry);
  while (eventLog.children.length > 12) {
    eventLog.removeChild(eventLog.lastChild);
  }
}

function updateCellAria(cell) {
  const row = Number(cell.dataset.row);
  const col = Number(cell.dataset.col);
  const tile = formatTile(row, col);
  const parts = [tile];
  if (cell.dataset.type === "exit") {
    parts.push("ejection lane");
  }
  const occupant = cell.dataset.occupant;
  if (occupant === "cooler") {
    parts.push("Cooler");
  } else if (occupant === "troublemaker") {
    parts.push("troublemaker");
  } else if (occupant === "glass") {
    parts.push("broken glass");
  } else {
    parts.push("clear");
  }
  cell.setAttribute("aria-label", parts.join(" · "));
}

function keyFrom(row, col) {
  return `${row},${col}`;
}

function inBounds(row, col) {
  return row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS;
}

function formatTile(row, col) {
  const letter = String.fromCharCode(65 + col);
  return `${letter}${row + 1}`;
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
