import { mountParticleField } from "../particles.js";

mountParticleField();

const ROWS = 5;
const COLS = 6;
const CHAOS_LIMIT = 18;
const MBST_SEGMENT = 12;
const DELIVERY_COST = 25;
const TEST_SCORE_TARGET = 120;
const CHAIN_DURATION = 12;
const LOG_LIMIT = 8;
const TICK_MS = 1000;
const TROUBLE_COLORS = ["crimson", "amber", "teal"];

const boardElement = document.getElementById("hallway-board");
const startButton = document.getElementById("start-shift");
const stopButton = document.getElementById("call-assembly");
const chainButton = document.getElementById("chain-gates");
const statusBanner = document.getElementById("status-banner");
const mbstMeter = document.getElementById("mbst-meter");
const mbstFill = document.getElementById("mbst-fill");
const mbstLabel = document.getElementById("mbst-label");
const testScoreMeter = document.getElementById("test-score-meter");
const testScoreFill = document.getElementById("test-score-fill");
const testScoreLabel = document.getElementById("test-score-label");
const chaosMeter = document.getElementById("chaos-meter");
const chaosFill = document.getElementById("chaos-fill");
const chaosLabel = document.getElementById("chaos-label");
const chainStatus = document.getElementById("chain-status");
const eventList = document.getElementById("event-list");
const laneHint = document.getElementById("lane-hint");

const board = Array.from({ length: ROWS }, () =>
  Array.from({ length: COLS }, () => ({ occupant: "empty", color: null }))
);
const cellElements = Array.from({ length: ROWS }, () => Array.from({ length: COLS }));
const selectedTrouble = new Set();

let shiftActive = false;
let tickHandle = null;
let mbstProgress = 0;
let testScore = 0;
let troublemakerCount = 0;
let chainAvailable = true;
let chainActive = false;
let chainRemaining = 0;

boardElement.style.setProperty("--cols", String(COLS));
boardElement.style.setProperty("--rows", String(ROWS));

createBoard();
updateMeters();

startButton.addEventListener("click", () => {
  if (shiftActive) {
    return;
  }
  beginShift();
});

stopButton.addEventListener("click", () => {
  if (!shiftActive) {
    return;
  }
  endShift("Assembly called. Sweep paused for review.", "warning");
});

chainButton.addEventListener("click", () => {
  if (!shiftActive || !chainAvailable || chainActive) {
    return;
  }
  activateChain();
});

function beginShift() {
  clearSelection();
  resetBoard();
  shiftActive = true;
  chainAvailable = true;
  chainActive = false;
  chainRemaining = 0;
  mbstProgress = 0;
  testScore = 0;
  troublemakerCount = 0;
  eventList.innerHTML = "";
  boardElement.classList.remove("is-frozen");
  startButton.disabled = true;
  stopButton.disabled = false;
  chainButton.disabled = false;
  updateMeters();
  updateStatus("Hall sweep launched. Keep the lanes clear.", "success");
  logEvent("Hall sweep launched. All lanes reset.");
  if (tickHandle) {
    window.clearInterval(tickHandle);
  }
  tickHandle = window.setInterval(() => {
    tick();
  }, TICK_MS);
}

function endShift(message, tone = "neutral") {
  if (tickHandle) {
    window.clearInterval(tickHandle);
    tickHandle = null;
  }
  if (shiftActive) {
    logEvent(message);
  }
  shiftActive = false;
  chainActive = false;
  chainRemaining = 0;
  chainButton.disabled = true;
  stopButton.disabled = true;
  startButton.disabled = false;
  boardElement.classList.remove("is-frozen");
  clearSelection();
  updateMeters();
  updateStatus(message, tone);
  updateChainStatus();
}

function tick() {
  if (!shiftActive) {
    return;
  }

  if (chainActive) {
    chainRemaining = Math.max(0, chainRemaining - 1);
    if (chainRemaining === 0) {
      chainActive = false;
      boardElement.classList.remove("is-frozen");
      updateStatus("Chain window closed. Troublemakers return.", "warning");
      logEvent("Chain window closed. New troublemakers are spawning again.");
    }
  }

  if (!chainActive) {
    maybeSpawnTroublemaker();
  }

  spawnStudyFlow();
  moveStudyFlow();
  recountTroublemakers();
  updateMeters();

  if (troublemakerCount >= CHAOS_LIMIT) {
    endShift("Chaos threshold reached. Restart the sweep.", "danger");
  }
}

function createBoard() {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "hall-cell";
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-pressed", "false");
      cell.addEventListener("click", () => {
        handleCellClick(row, col);
      });
      boardElement.append(cell);
      cellElements[row][col] = cell;
      renderCell(row, col);
    }
  }
}

function handleCellClick(row, col) {
  const state = board[row][col];
  if (state.occupant !== "trouble") {
    return;
  }
  const key = `${row}:${col}`;
  const cell = cellElements[row][col];
  if (selectedTrouble.has(key)) {
    selectedTrouble.delete(key);
    cell.classList.remove("is-selected");
    cell.setAttribute("aria-pressed", "false");
    return;
  }
  if (selectedTrouble.size > 0) {
    const [firstKey] = Array.from(selectedTrouble);
    const [firstRow, firstCol] = firstKey.split(":").map(Number);
    const firstColor = board[firstRow][firstCol].color;
    if (firstColor !== state.color) {
      clearSelection();
      updateStatus("Selections cleared. Match the same crew to expel them.", "warning");
    }
  }
  selectedTrouble.add(key);
  cell.classList.add("is-selected");
  cell.setAttribute("aria-pressed", "true");
  if (selectedTrouble.size === 3) {
    expelSelected();
  }
}

function expelSelected() {
  const coords = Array.from(selectedTrouble).map((key) => {
    const [row, col] = key.split(":").map(Number);
    return { row, col };
  });
  if (coords.length !== 3) {
    return;
  }
  const targetColor = board[coords[0].row][coords[0].col].color;
  const allMatch = coords.every(({ row, col }) => board[row][col].color === targetColor);
  if (!allMatch) {
    clearSelection();
    updateStatus("Troublemakers must share the same crew color.", "warning");
    return;
  }
  coords.forEach(({ row, col }) => {
    setCell(row, col, "empty");
  });
  clearSelection();
  recountTroublemakers();
  const before = mbstProgress;
  mbstProgress = Math.min(100, mbstProgress + MBST_SEGMENT);
  const gained = Math.round(mbstProgress - before);
  updateMeters();
  updateStatus(`Expelled three ${targetColor} blockers. MBST +${gained}.`, "success");
  logEvent(`Expelled three ${targetColor} Troublemakers. MBST now at ${Math.round(mbstProgress)}%.`);
}

function clearSelection() {
  selectedTrouble.forEach((key) => {
    const [row, col] = key.split(":").map(Number);
    const cell = cellElements[row][col];
    cell.classList.remove("is-selected");
    cell.setAttribute("aria-pressed", "false");
  });
  selectedTrouble.clear();
  updateLaneHint();
}

function resetBoard() {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      setCell(row, col, "empty");
    }
  }
}

function spawnStudyFlow() {
  for (let row = 0; row < ROWS; row += 1) {
    const cell = board[row][0];
    if (cell.occupant === "empty" && Math.random() < 0.45) {
      setCell(row, 0, "study");
    }
  }
}

function moveStudyFlow() {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = COLS - 1; col >= 0; col -= 1) {
      const cell = board[row][col];
      if (cell.occupant !== "study") {
        continue;
      }
      if (col === COLS - 1) {
        setCell(row, col, "empty");
        deliverStudyFlow(row);
        continue;
      }
      const nextCell = board[row][col + 1];
      if (nextCell.occupant === "empty") {
        setCell(row, col, "empty");
        setCell(row, col + 1, "study");
      }
    }
  }
}

function deliverStudyFlow(row) {
  if (mbstProgress <= 0) {
    updateStatus(`Lane ${row + 1} delivered, but MBST charge is empty.`, "warning");
    logEvent(`Lane ${row + 1} reached the students, but MBST charge was empty.`);
    return;
  }
  const spend = Math.min(mbstProgress, DELIVERY_COST);
  mbstProgress = Math.max(0, mbstProgress - spend);
  testScore = Math.min(TEST_SCORE_TARGET, testScore + spend);
  updateMeters();
  updateStatus(`Lane ${row + 1} cashed in ${spend} MBST for scores.`, "success");
  logEvent(`Lane ${row + 1} converted ${spend} MBST into test score progress.`);
  if (testScore >= TEST_SCORE_TARGET) {
    endShift("Test Score Bars maxed out. Eastside hits the benchmark!", "success");
  }
}

function maybeSpawnTroublemaker() {
  const emptyCells = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const cell = board[row][col];
      if (cell.occupant === "empty") {
        emptyCells.push({ row, col });
      }
    }
  }
  if (emptyCells.length === 0) {
    return;
  }
  if (Math.random() < 0.45) {
    const choice = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const color = TROUBLE_COLORS[Math.floor(Math.random() * TROUBLE_COLORS.length)];
    setCell(choice.row, choice.col, "trouble", color);
    logEvent(`Troublemaker appeared in Lane ${choice.row + 1}.`);
  }
}

function recountTroublemakers() {
  troublemakerCount = 0;
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (board[row][col].occupant === "trouble") {
        troublemakerCount += 1;
      }
    }
  }
}

function setCell(row, col, occupant, color = null) {
  board[row][col] = { occupant, color };
  renderCell(row, col);
}

function renderCell(row, col) {
  const state = board[row][col];
  const cell = cellElements[row][col];
  const key = `${row}:${col}`;
  cell.classList.remove("is-study", "is-trouble");
  cell.removeAttribute("data-color");
  cell.classList.toggle("is-selected", selectedTrouble.has(key));
  cell.setAttribute("aria-pressed", selectedTrouble.has(key) ? "true" : "false");
  const labelBase = `Lane ${row + 1}, column ${col + 1}`;
  if (state.occupant === "study") {
    cell.classList.add("is-study");
    cell.disabled = true;
    cell.setAttribute("aria-label", `${labelBase}: Study Flow block.`);
  } else if (state.occupant === "trouble") {
    cell.classList.add("is-trouble");
    cell.dataset.color = state.color ?? "crimson";
    cell.disabled = false;
    cell.setAttribute("aria-label", `${labelBase}: ${state.color} Troublemaker.`);
  } else {
    cell.disabled = true;
    cell.setAttribute("aria-label", `${labelBase}: Clear.`);
  }
}

function updateMeters() {
  mbstFill.style.width = `${mbstProgress}%`;
  mbstMeter.setAttribute("aria-valuenow", String(Math.round(mbstProgress)));
  mbstLabel.textContent = `${Math.round(mbstProgress)}%`;

  const testPercent = (testScore / TEST_SCORE_TARGET) * 100;
  testScoreFill.style.width = `${Math.min(100, testPercent)}%`;
  testScoreMeter.setAttribute("aria-valuenow", String(Math.round(testScore)));
  testScoreLabel.textContent = `${Math.round(testScore)} / ${TEST_SCORE_TARGET}`;

  const chaosPercent = (troublemakerCount / CHAOS_LIMIT) * 100;
  chaosFill.style.width = `${Math.max(0, Math.min(100, chaosPercent))}%`;
  chaosMeter.setAttribute("aria-valuenow", String(troublemakerCount));
  chaosLabel.textContent = `${troublemakerCount} / ${CHAOS_LIMIT}`;

  updateChainStatus();
  updateLaneHint();
}

function updateChainStatus() {
  if (!shiftActive) {
    chainStatus.textContent = chainAvailable
      ? "Chain ready when the sweep begins."
      : "Chain cooling off until the next sweep.";
    return;
  }
  if (chainActive) {
    chainStatus.textContent = `Chain frozen: ${chainRemaining}s left.`;
  } else if (chainAvailable) {
    chainStatus.textContent = "Chain ready. Freeze new trouble on demand.";
  } else {
    chainStatus.textContent = "Chain spent for this sweep.";
  }
}

function updateLaneHint() {
  if (selectedTrouble.size === 0) {
    laneHint.textContent = "Select three matching Troublemakers to expel them.";
    return;
  }
  const [firstKey] = Array.from(selectedTrouble);
  const [row, col] = firstKey.split(":").map(Number);
  const color = board[row][col].color;
  laneHint.textContent = `Selected ${selectedTrouble.size} ${color} blocker${selectedTrouble.size === 1 ? "" : "s"}.`;
}

function updateStatus(message, tone = "neutral") {
  statusBanner.textContent = message;
  statusBanner.classList.remove("is-success", "is-warning", "is-danger");
  if (tone === "success") {
    statusBanner.classList.add("is-success");
  } else if (tone === "warning") {
    statusBanner.classList.add("is-warning");
  } else if (tone === "danger") {
    statusBanner.classList.add("is-danger");
  }
}

function logEvent(message) {
  const entry = document.createElement("li");
  entry.textContent = message;
  eventList.prepend(entry);
  while (eventList.children.length > LOG_LIMIT) {
    eventList.removeChild(eventList.lastElementChild);
  }
}

function activateChain() {
  chainAvailable = false;
  chainActive = true;
  chainRemaining = CHAIN_DURATION;
  boardElement.classList.add("is-frozen");
  chainButton.disabled = true;
  updateChainStatus();
  updateStatus("Gates chained. New trouble frozen for a moment.", "success");
  logEvent("Chained the gates. Troublemaker spawns paused.");
}
