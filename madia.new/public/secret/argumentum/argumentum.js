const BOARD_SIZE = 6;
const TETRA_WIDTH = 10;
const TETRA_HEIGHT = 20;
const TRANSFORM_COST = { earth: 20, water: 30 };
const SHIFT_THRESHOLD = 100;

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
        [1, 1, 1, 0],
        [1, 0, 0, 0],
        [0, 0, 0, 0]
      ],
      [
        [0, 1, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 0]
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
        [0, 1, 0, 0],
        [1, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 0]
      ],
      [
        [0, 1, 0, 0],
        [1, 1, 1, 0],
        [0, 0, 0, 0],
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
const chargeTransformBtn = document.getElementById("charge-transform");
const cancelTransformBtn = document.getElementById("cancel-transform");
const transformToolbar = document.getElementById("transform-toolbar");
const shiftBoardBtn = document.getElementById("shift-board");
const routeToggleBtn = document.getElementById("route-toggle");
const scoreDisplay = document.getElementById("scoreDisplay");
const linesDisplay = document.getElementById("linesDisplay");
const levelDisplay = document.getElementById("levelDisplay");
const comboDisplay = document.getElementById("comboDisplay");
const bridgesDisplay = document.getElementById("bridgesDisplay");
const integrityMeter = document.getElementById("integrityMeter");
const integrityValue = document.getElementById("integrityValue");
const reactorMessage = document.getElementById("reactorMessage");
const restartButton = document.getElementById("restartButton");

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
let dropDelay = 900;
let availableBridges = 0;
let routeMode = false;
let routeSelection = [];
let shiftOrientation = 0;
let resolvingLock = false;
let resolvingMatch = false;
let score = 0;
let linesClearedTotal = 0;
let level = 1;
let comboChain = 0;
let reactorIntegrity = 100;
let gameOver = false;

const flowNodes = initializeFlowNodes();

function createMatrix(rows, cols, value) {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => value));
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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
  return { ...base, empowered: false, justSpawned: true };
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
  matchBoardEl.innerHTML = "";
  matchNodes = [];
  matchBoard.forEach((row, y) => {
    row.forEach((tile, x) => {
      const tileEl = document.createElement("button");
      tileEl.type = "button";
      tileEl.className = `rock-tile rock-${tile.id}`;
      if (tile.empowered) {
        tileEl.classList.add("rock-empowered");
      }
      if (tile.justSpawned) {
        tileEl.classList.add("tile-enter");
        tile.justSpawned = false;
      }
      tileEl.textContent = tile.label;
      tileEl.setAttribute("data-x", x);
      tileEl.setAttribute("data-y", y);
      tileEl.addEventListener("click", () => onTileClick(x, y));
      matchBoardEl.append(tileEl);
      matchNodes.push(tileEl);
    });
  });
}

function highlightStatus(element) {
  if (!element) {
    return;
  }
  element.classList.remove("status-pop");
  void element.offsetWidth;
  element.classList.add("status-pop");
}

function highlightMeter(element) {
  if (!element) {
    return;
  }
  element.classList.remove("meter-pulse");
  void element.offsetWidth;
  element.classList.add("meter-pulse");
}

function setReactorMessage(message, isDanger = false) {
  if (!reactorMessage) {
    return;
  }
  reactorMessage.textContent = message;
  reactorMessage.classList.toggle("reactor-message--danger", isDanger);
}

function updateStatusDisplays() {
  if (scoreDisplay) {
    scoreDisplay.textContent = score.toLocaleString();
  }
  if (linesDisplay) {
    linesDisplay.textContent = linesClearedTotal.toString();
  }
  if (levelDisplay) {
    levelDisplay.textContent = level.toString();
  }
  if (comboDisplay) {
    if (comboChain > 1) {
      comboDisplay.textContent = `x${comboChain}`;
      comboDisplay.classList.add("danger");
    } else {
      comboDisplay.textContent = "—";
      comboDisplay.classList.remove("danger");
    }
  }
  if (bridgesDisplay) {
    bridgesDisplay.textContent = availableBridges.toString();
  }
  if (integrityMeter) {
    integrityMeter.value = reactorIntegrity;
    integrityMeter.classList.toggle("danger", reactorIntegrity <= 30);
  }
  if (integrityValue) {
    integrityValue.textContent = `${Math.max(0, Math.round(reactorIntegrity))}%`;
    integrityValue.classList.toggle("danger", reactorIntegrity <= 30);
  }
}

function addScore(amount) {
  if (!amount || gameOver) {
    return;
  }
  score = Math.max(0, score + Math.round(amount));
  updateStatusDisplays();
  highlightStatus(scoreDisplay);
}

function reduceIntegrity(amount, message) {
  if (amount <= 0 || gameOver) {
    return;
  }
  reactorIntegrity = Math.max(0, reactorIntegrity - amount);
  updateStatusDisplays();
  highlightStatus(integrityValue);
  highlightMeter(integrityMeter);
  if (message) {
    setReactorMessage(message, true);
    logEvent(message);
  } else if (reactorIntegrity <= 30) {
    setReactorMessage("Reactor integrity critical", true);
  }
  if (reactorIntegrity === 0) {
    triggerGameOver(message ?? "Reactor integrity collapsed.");
  }
}

function boostIntegrity(amount) {
  if (amount <= 0 || gameOver) {
    return;
  }
  reactorIntegrity = Math.min(100, reactorIntegrity + amount);
  updateStatusDisplays();
  highlightStatus(integrityValue);
  highlightMeter(integrityMeter);
  if (!gameOver) {
    setReactorMessage("Reactor stabilized", false);
  }
}

function updateLevel() {
  const targetLevel = Math.floor(linesClearedTotal / 5) + 1;
  if (targetLevel !== level) {
    level = targetLevel;
    const levelDelay = Math.max(320, 900 - (level - 1) * 60);
    dropDelay = Math.min(dropDelay, levelDelay);
    startDropLoop();
    logEvent(`Reactor intensity advanced to level ${level}.`);
    highlightStatus(levelDisplay);
  }
  updateStatusDisplays();
}

async function onTileClick(x, y) {
  if (gameOver || resolvingMatch) {
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
    return;
  }

  resolvingMatch = true;
  try {
    await resolveMatches(matches);
  } finally {
    resolvingMatch = false;
  }
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
  if (matches.length === 0) {
    return;
  }

  const uniquePositions = [];
  const seen = new Set();
  const matchSummary = new Map();

  matches.forEach(({ x, y, tile }) => {
    const key = `${x}-${y}`;
    if (!seen.has(key)) {
      uniquePositions.push({ x, y, tile });
      seen.add(key);
    }
    const data = matchSummary.get(tile.id) ?? { count: 0, empowered: 0, meter: tile.meter };
    data.count += 1;
    if (tile.empowered) {
      data.empowered += 1;
    }
    matchSummary.set(tile.id, data);
  });

  uniquePositions.forEach(({ x, y }) => {
    const tileEl = getTileElement(x, y);
    if (tileEl) {
      tileEl.classList.add("match-highlight");
    }
  });

  await wait(200);

  uniquePositions.forEach(({ x, y }) => {
    const tileEl = getTileElement(x, y);
    if (tileEl) {
      tileEl.classList.add("match-fade");
    }
    matchBoard[y][x] = null;
  });

  await wait(140);

  collapseColumns();
  refillColumns();
  renderMatchBoard();

  let earnedScore = 0;
  matchSummary.forEach((data, id) => {
    const meterType = rockTypes.find((rock) => rock.id === id).meter;
    logEvent(`Matched ${data.count} ${id} rocks${data.empowered ? " with empowered resonance" : ""}.`);
    addResources(meterType, data.count * 8 + data.empowered * 12);
    earnedScore += data.count * 35 + data.empowered * 50;
    enqueueTetramino(id, data.count, data.empowered);
  });

  if (earnedScore > 0) {
    addScore(earnedScore);
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
  activePiece = {
    ...next,
    x: 3,
    y: 0,
    rotation: next.rotation ?? 0
  };
  if (collides(activePiece, 0, 0)) {
    activePiece = null;
    comboChain = 0;
    reduceIntegrity(30, "Reactor overload purges the chamber.");
    resetTetraminoBoard();
    updateStatusDisplays();
    if (!gameOver) {
      spawnNextPiece();
    }
    return;
  }
  updateQueueDisplay();
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
  if (!activePiece || resolvingLock || gameOver) {
    return;
  }
  resolvingLock = true;
  try {
    const placedId = activePiece.id;
    const matrix = pieceDefinitions[activePiece.id].rotations[activePiece.rotation];
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

    const rowsToClear = findCompleteRows();
    if (rowsToClear.length > 0) {
      comboChain += 1;
      updateStatusDisplays();
      if (comboChain > 1) {
        highlightStatus(comboDisplay);
      }
      await animateLineClear(rowsToClear);
      removeRows(rowsToClear);
      linesClearedTotal += rowsToClear.length;
      const lineScore = rowsToClear.length * 160 + Math.max(0, comboChain - 1) * 90;
      addScore(lineScore);
      boostIntegrity(rowsToClear.length * 6);
      renderTetraminoBoard();
      handleLineClear(rowsToClear.length, placedId);
      updateStatusDisplays();
      highlightStatus(linesDisplay);
      updateLevel();
    } else {
      if (comboChain !== 0) {
        comboChain = 0;
        updateStatusDisplays();
      }
      setReactorMessage("Reactor strain rises from inert drop.", true);
      reduceIntegrity(6);
    }
    updateStatusDisplays();
  } finally {
    resolvingLock = false;
  }

  if (!gameOver) {
    spawnNextPiece();
  }
}

function findCompleteRows() {
  const rows = [];
  for (let y = 0; y < TETRA_HEIGHT; y += 1) {
    if (tetraBoard[y].every((cell) => cell)) {
      rows.push(y);
    }
  }
  return rows;
}

async function animateLineClear(rows) {
  const cells = Array.from(tetraminoBoardEl.children);
  rows.forEach((row) => {
    for (let x = 0; x < TETRA_WIDTH; x += 1) {
      const index = row * TETRA_WIDTH + x;
      const cell = cells[index];
      if (cell) {
        cell.classList.add("line-clear");
      }
    }
  });
  await wait(220);
}

function removeRows(rows) {
  const sorted = [...rows].sort((a, b) => a - b);
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const row = sorted[i];
    tetraBoard.splice(row, 1);
    tetraBoard.unshift(Array.from({ length: TETRA_WIDTH }, () => null));
  }
}

function handleLineClear(count, id) {
  const awardType = id ?? "sedimentary";
  logEvent(`Cleared ${count} reactor line${count > 1 ? "s" : ""}. Bridges readied.`);
  addResources(mapPieceToMeter(awardType), 14 * count);
  extendFlowWithBridges(count, awardType);
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
  comboChain = 0;
  renderTetraminoBoard();
  updateQueueDisplay();
  updateStatusDisplays();
}

function renderTetraminoBoard() {
  tetraminoBoardEl.innerHTML = "";
  for (let y = 0; y < TETRA_HEIGHT; y += 1) {
    for (let x = 0; x < TETRA_WIDTH; x += 1) {
      const cell = document.createElement("div");
      cell.className = "tetra-cell";
      const value = tetraBoard[y][x];
      if (value) {
        cell.classList.add(value.className);
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

async function dropStep() {
  if (gameOver || resolvingLock) {
    return;
  }
  if (!activePiece) {
    spawnNextPiece();
    return;
  }
  if (!collides(activePiece, 0, 1)) {
    activePiece.y += 1;
    renderTetraminoBoard();
    return;
  }
  await placePiece();
}

function rotatePiece() {
  if (!activePiece || resolvingLock || gameOver) {
    return;
  }
  const definition = pieceDefinitions[activePiece.id];
  const nextRotation = (activePiece.rotation + 1) % definition.rotations.length;
  const kicks = [0, -1, 1, -2, 2];
  for (let i = 0; i < kicks.length; i += 1) {
    const offsetX = kicks[i];
    if (!collides(activePiece, offsetX, 0, nextRotation)) {
      activePiece.x += offsetX;
      activePiece.rotation = nextRotation;
      renderTetraminoBoard();
      return;
    }
  }
}

function movePiece(offset) {
  if (!activePiece || resolvingLock || gameOver) {
    return;
  }
  if (!collides(activePiece, offset, 0)) {
    activePiece.x += offset;
    renderTetraminoBoard();
  }
}

function softDrop() {
  if (!activePiece || resolvingLock || gameOver) {
    return;
  }
  if (!collides(activePiece, 0, 1)) {
    activePiece.y += 1;
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
}

function enterTransformMode() {
  if (transformMode || gameOver) {
    return;
  }
  if (resourceMeterState.earth < TRANSFORM_COST.earth || resourceMeterState.water < TRANSFORM_COST.water) {
    logEvent("Channel requires earth and water energy reserves.");
    return;
  }
  transformMode = true;
  transformToolbar.hidden = false;
  chargeTransformBtn.disabled = true;
}

function exitTransformMode() {
  transformMode = false;
  transformToolbar.hidden = true;
  chargeTransformBtn.disabled = false;
}

function addResources(type, amount) {
  resourceMeterState[type] = Math.min(100, resourceMeterState[type] + amount);
  updateMeters();
  highlightMeter(meters[type]);
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
    nodes.push({ kind, bridged: false });
  }
  return nodes;
}

function resetFlowNodes() {
  const fresh = initializeFlowNodes();
  for (let i = 0; i < flowNodes.length; i += 1) {
    flowNodes[i] = fresh[i];
  }
}

function renderFlowGrid() {
  flowGridEl.innerHTML = "";
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
      cell.textContent = "B";
    } else {
      cell.textContent = "";
    }
    if (routeSelection.includes(index)) {
      cell.classList.add("route-selected");
    }
    cell.addEventListener("click", () => onFlowNodeClick(index));
    flowGridEl.append(cell);
  });
}

function onFlowNodeClick(index) {
  if (!routeMode || gameOver) {
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
  if (availableBridges <= 0) {
    logEvent("No forged bridges ready. Clear reactor lines to craft more.");
    return;
  }
  node.bridged = true;
  availableBridges -= 1;
  routeSelection.push(index);
  logEvent("Installed a bridge segment into the flow trails.");
  renderFlowGrid();
  updateRouteButton();
  updateStatusDisplays();
  highlightStatus(bridgesDisplay);
  evaluateNetwork();
}

function extendFlowWithBridges(count, id) {
  if (gameOver) {
    return;
  }
  logEvent(`Stored ${count} bridge segment${count > 1 ? "s" : ""} for the network.`);
  routeMode = true;
  availableBridges += count;
  updateRouteButton();
  renderFlowGrid();
  evaluateNetwork(id);
  updateStatusDisplays();
  highlightStatus(bridgesDisplay);
}

function updateRouteButton() {
  if (!routeToggleBtn) {
    return;
  }
  routeToggleBtn.textContent = routeMode
    ? `Routing Active (${availableBridges})`
    : `Plan Routes (${availableBridges})`;
  routeToggleBtn.disabled = gameOver;
}

function toggleRouteMode() {
  if (gameOver) {
    return;
  }
  routeMode = !routeMode;
  if (!routeMode) {
    routeSelection = [];
  }
  updateRouteButton();
  renderFlowGrid();
}

function evaluateNetwork(idHint) {
  if (gameOver) {
    return;
  }
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
  logEvent("Completed a flow circuit. Energy surges through the lattice!");
  addResources(idHint ? mapPieceToMeter(idHint) : "earth", 20);
  addResources("fire", 10);
  addScore(120);
  boostIntegrity(10);
}

function logEvent(message) {
  if (!eventLogEl) {
    return;
  }
  const entry = document.createElement("p");
  entry.className = "log-entry";
  entry.textContent = message;
  eventLogEl.prepend(entry);
  while (eventLogEl.children.length > 8) {
    eventLogEl.removeChild(eventLogEl.lastChild);
  }
}

function stopDropLoop() {
  if (dropIntervalId) {
    window.clearInterval(dropIntervalId);
    dropIntervalId = null;
  }
}

function startDropLoop() {
  if (gameOver) {
    return;
  }
  stopDropLoop();
  dropIntervalId = window.setInterval(() => {
    dropStep();
  }, dropDelay);
}

function applyShiftActuation() {
  if (gameOver || resolvingLock || resourceMeterState.shift < SHIFT_THRESHOLD) {
    return;
  }
  resourceMeterState.shift = 0;
  shiftOrientation = (shiftOrientation + 1) % 4;
  dropDelay = Math.max(280, dropDelay - 90);
  updateMeters();
  shiftBoardBtn.disabled = true;
  reorientNetwork();
  logEvent("Actuated shift realigned the reactor relative to the flow grid.");
  setReactorMessage("Actuated shift accelerates the drop cadence.");
  addScore(60);
  highlightStatus(levelDisplay);
  startDropLoop();
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

async function onKeyDown(event) {
  if (gameOver) {
    return;
  }
  switch (event.key) {
    case "ArrowLeft":
      event.preventDefault();
      movePiece(-1);
      break;
    case "ArrowRight":
      event.preventDefault();
      movePiece(1);
      break;
    case "ArrowDown":
      event.preventDefault();
      softDrop();
      break;
    case "ArrowUp":
    case "x":
    case "X":
      event.preventDefault();
      rotatePiece();
      break;
    case " ":
      event.preventDefault();
      if (!activePiece || resolvingLock) {
        break;
      }
      while (activePiece && !collides(activePiece, 0, 1)) {
        activePiece.y += 1;
      }
      renderTetraminoBoard();
      await placePiece();
      break;
    default:
      break;
  }
}

function triggerGameOver(reason) {
  if (gameOver) {
    return;
  }
  gameOver = true;
  resolvingLock = false;
  resolvingMatch = false;
  stopDropLoop();
  if (transformMode) {
    exitTransformMode();
  }
  chargeTransformBtn.disabled = true;
  shiftBoardBtn.disabled = true;
  routeMode = false;
  routeSelection = [];
  updateRouteButton();
  renderFlowGrid();
  activePiece = null;
  renderTetraminoBoard();
  if (selectedTile) {
    const tileEl = getTileElement(selectedTile.x, selectedTile.y);
    if (tileEl) {
      tileEl.classList.remove("selected");
    }
    selectedTile = null;
  }
  setReactorMessage(`Game Over — ${reason}`, true);
  logEvent(`Run ended: ${reason}. Final score ${score.toLocaleString()}.`);
  updateStatusDisplays();
}

function resetGameState() {
  stopDropLoop();
  gameOver = false;
  resolvingLock = false;
  resolvingMatch = false;
  score = 0;
  linesClearedTotal = 0;
  level = 1;
  comboChain = 0;
  reactorIntegrity = 100;
  dropDelay = 900;
  availableBridges = 0;
  routeMode = false;
  routeSelection = [];
  shiftOrientation = 0;
  selectedTile = null;
  transformMode = false;
  resourceMeterState = { earth: 0, water: 0, fire: 0, shift: 0 };
  updateMeters();
  transformToolbar.hidden = true;
  chargeTransformBtn.disabled = false;
  shiftBoardBtn.disabled = true;
  resetFlowNodes();
  renderFlowGrid();
  updateRouteButton();
  eventLogEl.innerHTML = "";
  setReactorMessage("Stabilized");
  initializeMatchBoard();
  resetTetraminoBoard();
  updateStatusDisplays();
  logEvent("Reactor run initialized. Forge matches to queue tetraminos.");
  startDropLoop();
}

if (chargeTransformBtn) {
  chargeTransformBtn.addEventListener("click", enterTransformMode);
}
if (cancelTransformBtn) {
  cancelTransformBtn.addEventListener("click", exitTransformMode);
}
if (shiftBoardBtn) {
  shiftBoardBtn.addEventListener("click", applyShiftActuation);
}
if (routeToggleBtn) {
  routeToggleBtn.addEventListener("click", toggleRouteMode);
}
if (restartButton) {
  restartButton.addEventListener("click", resetGameState);
}
window.addEventListener("keydown", onKeyDown);

resetGameState();
