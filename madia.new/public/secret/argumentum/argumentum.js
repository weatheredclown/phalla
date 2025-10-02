const BOARD_SIZE = 6;
const TETRA_WIDTH = 10;
const TETRA_HEIGHT = 20;
const TRANSFORM_COST = { earth: 20, water: 30 };
const SHIFT_THRESHOLD = 100;

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
        [0, 0, 1, 1],
        [0, 1, 1, 0],
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
const bridgeInventoryEl = document.getElementById("bridge-inventory");
const bridgeHintEl = document.getElementById("bridge-hint");
const chargeTransformBtn = document.getElementById("charge-transform");
const cancelTransformBtn = document.getElementById("cancel-transform");
const transformToolbar = document.getElementById("transform-toolbar");
const shiftBoardBtn = document.getElementById("shift-board");
const routeToggleBtn = document.getElementById("route-toggle");

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
let bridgeSchematics = [];
let routeMode = false;
let routeSelection = [];
let bridgePreview = null;
let bridgePreviewTimeout = null;
let pendingInfusions = [];
let shiftOrientation = 0;
let planIdCounter = 0;

const flowNodes = initializeFlowNodes();

function createMatrix(rows, cols, value) {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => value));
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

function onTileClick(x, y) {
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

  resolveMatches(matches);
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

function resolveMatches(matches) {
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
  renderMatchBoard();

  matchSummary.forEach((data, id) => {
    logEvent(`Matched ${data.count} ${id} rocks${data.empowered ? " with empowered resonance" : ""}.`);
    addResources(rockTypes.find((rock) => rock.id === id).meter, data.count * 8 + data.empowered * 12);
    enqueueTetramino(id, data.count, data.empowered);
  });

  applyInfusionRewards(infusionSummary, restoredColumns);
  applyPendingInfusions();
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
  if (pieceQueue.length === 0) {
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
    logEvent("The reactor is overwhelmed. Network flow resets.");
    resetTetraminoBoard();
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

function placePiece() {
  if (!activePiece) {
    return;
  }
  const placedId = activePiece.id;
  const placedRotation = activePiece.rotation;
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
  const cleared = clearLines();
  if (cleared > 0) {
    handleLineClear(cleared, placedId, placedRotation);
  }
  spawnNextPiece();
}

function clearLines() {
  let cleared = 0;
  for (let y = TETRA_HEIGHT - 1; y >= 0; y -= 1) {
    if (tetraBoard[y].every((cell) => cell)) {
      tetraBoard.splice(y, 1);
      tetraBoard.unshift(Array.from({ length: TETRA_WIDTH }, () => null));
      cleared += 1;
      y += 1;
    }
  }
  if (cleared > 0) {
    renderTetraminoBoard();
  }
  return cleared;
}

function handleLineClear(count, id, rotationIndex = 0) {
  const awardType = id ?? "sedimentary";
  logEvent(`Cleared ${count} reactor line${count > 1 ? "s" : ""}. Bridges readied.`);
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

function dropStep() {
  if (!activePiece) {
    spawnNextPiece();
    return;
  }
  if (!collides(activePiece, 0, 1)) {
    activePiece.y += 1;
  } else {
    placePiece();
  }
  renderTetraminoBoard();
}

function rotatePiece() {
  if (!activePiece) {
    return;
  }
  const nextRotation = (activePiece.rotation + 1) % pieceDefinitions[activePiece.id].rotations.length;
  if (!collides(activePiece, 0, 0, nextRotation)) {
    activePiece.rotation = nextRotation;
    renderTetraminoBoard();
  }
}

function movePiece(offset) {
  if (!activePiece) {
    return;
  }
  if (!collides(activePiece, offset, 0)) {
    activePiece.x += offset;
    renderTetraminoBoard();
  }
}

function softDrop() {
  if (!activePiece) {
    return;
  }
  if (!collides(activePiece, 0, 1)) {
    activePiece.y += 1;
    renderTetraminoBoard();
  }
}

function applyTransformation(x, y) {
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
}

function exitTransformMode() {
  transformMode = false;
  transformToolbar.hidden = true;
  chargeTransformBtn.disabled = false;
}

function addResources(type, amount) {
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

function renderFlowGrid() {
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
  const infusion = determineInfusion(idHint);
  logEvent(
    `Completed a flow circuit. Energy surges through the lattice${
      infusion ? ` and a ${formatInfusionName(infusion)} shard forms.` : "."
    }`
  );
  addResources(idHint ? mapPieceToMeter(idHint) : "earth", 20);
  addResources("fire", 10);
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
  pendingInfusions.push(type);
  applyPendingInfusions();
}

function applyPendingInfusions() {
  if (pendingInfusions.length === 0) {
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
  if (dropIntervalId) {
    window.clearInterval(dropIntervalId);
  }
  dropIntervalId = window.setInterval(dropStep, dropDelay);
}

function applyShiftActuation() {
  if (resourceMeterState.shift < SHIFT_THRESHOLD) {
    return;
  }
  resourceMeterState.shift = 0;
  shiftOrientation = (shiftOrientation + 1) % 4;
  dropDelay = Math.max(400, dropDelay - 80);
  updateMeters();
  shiftBoardBtn.disabled = true;
  reorientNetwork();
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

function onKeyDown(event) {
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
      rotatePiece();
      break;
    case " ":
      while (activePiece && !collides(activePiece, 0, 1)) {
        activePiece.y += 1;
      }
      placePiece();
      renderTetraminoBoard();
      break;
    default:
      break;
  }
}

chargeTransformBtn.addEventListener("click", enterTransformMode);
cancelTransformBtn.addEventListener("click", exitTransformMode);
shiftBoardBtn.addEventListener("click", applyShiftActuation);
routeToggleBtn.addEventListener("click", toggleRouteMode);
window.addEventListener("keydown", onKeyDown);

initializeMatchBoard();
renderTetraminoBoard();
updateBridgeInventory();
updateBridgeHint();
updateRouteButton();
renderFlowGrid();
startDropLoop();
