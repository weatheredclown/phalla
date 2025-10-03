const boardWidth = 12;
const boardHeight = 20;
const dropInterval = 820;
const panicLimit = 5;

const entryCell = { x: 5, y: 0 };

const segments = [
  { id: "agora", name: "Agora Wing", x: 0, width: 4, y: 16, height: 4 },
  { id: "salon", name: "Salon Wing", x: 4, width: 4, y: 16, height: 4 },
  { id: "atrium", name: "Atrium Wing", x: 8, width: 4, y: 16, height: 4 },
];

const pieces = [
  {
    name: "Socrates",
    color: "rgba(234,179,8,0.9)",
    layout: [
      ".XX",
      "..X",
      "..X",
    ],
    anchor: { x: 1, y: 0 },
  },
  {
    name: "Sigmund Freud",
    color: "rgba(139,92,246,0.9)",
    layout: [
      "X..",
      "XXX",
    ],
    anchor: { x: 0, y: 0 },
  },
  {
    name: "Napoleon",
    color: "rgba(248,113,113,0.9)",
    layout: [
      "XX",
      ".X",
      ".X",
      ".X",
    ],
    anchor: { x: 0, y: 0 },
  },
  {
    name: "Joan of Arc",
    color: "rgba(248,250,252,0.92)",
    layout: [
      ".X",
      "XX",
      ".X",
    ],
    anchor: { x: 1, y: 0 },
  },
  {
    name: "Billy the Kid",
    color: "rgba(34,197,94,0.9)",
    layout: [
      "XX",
      "X.",
      "X.",
    ],
    anchor: { x: 0, y: 0 },
  },
  {
    name: "Abraham Lincoln",
    color: "rgba(59,130,246,0.9)",
    layout: [
      ".XX",
      "XX.",
    ],
    anchor: { x: 1, y: 0 },
  },
];

const contextDeck = [
  {
    id: "philosophy",
    title: "Philosophy Combo",
    description: "Anchor Socrates and Sigmund Freud in the Agora Wing pattern.",
    segment: "agora",
    anchors: [
      { name: "Socrates", position: { x: 1, y: 1 } },
      { name: "Sigmund Freud", position: { x: 2, y: 0 } },
    ],
    pattern: [
      ["Sigmund Freud", "Sigmund Freud", "Sigmund Freud", null],
      [null, "Socrates", "Socrates", null],
      [null, null, "Socrates", null],
      [null, null, null, null],
    ],
    reward: 120,
  },
  {
    id: "rebellion",
    title: "Rebellion Combo",
    description: "Land Joan of Arc and Billy the Kid in the Salon Wing.",
    segment: "salon",
    anchors: [
      { name: "Joan of Arc", position: { x: 1, y: 0 } },
      { name: "Billy the Kid", position: { x: 2, y: 1 } },
    ],
    pattern: [
      [null, "Joan of Arc", null, null],
      ["Billy the Kid", "Joan of Arc", null, null],
      ["Billy the Kid", null, null, null],
      [null, null, null, null],
    ],
    reward: 140,
  },
  {
    id: "leadership",
    title: "Leadership Combo",
    description: "Seat Napoleon and Abraham Lincoln in the Atrium Wing shape.",
    segment: "atrium",
    anchors: [
      { name: "Napoleon", position: { x: 1, y: 0 } },
      { name: "Abraham Lincoln", position: { x: 2, y: 0 } },
    ],
    pattern: [
      ["Napoleon", "Napoleon", null, null],
      [null, "Napoleon", "Abraham Lincoln", "Abraham Lincoln"],
      [null, null, "Abraham Lincoln", null],
      [null, null, null, null],
    ],
    reward: 160,
  },
  {
    id: "expedition",
    title: "Expedition Combo",
    description: "Pair Billy the Kid with Socrates back in the Agora Wing.",
    segment: "agora",
    anchors: [
      { name: "Billy the Kid", position: { x: 1, y: 1 } },
      { name: "Socrates", position: { x: 2, y: 0 } },
    ],
    pattern: [
      ["Socrates", "Socrates", null, null],
      ["Billy the Kid", "Socrates", null, null],
      ["Billy the Kid", null, null, null],
      [null, null, null, null],
    ],
    reward: 150,
  },
  {
    id: "debate",
    title: "Debate Combo",
    description: "Sigmund Freud joins Abraham Lincoln for an Atrium deep dive.",
    segment: "atrium",
    anchors: [
      { name: "Sigmund Freud", position: { x: 1, y: 0 } },
      { name: "Abraham Lincoln", position: { x: 2, y: 1 } },
    ],
    pattern: [
      ["Sigmund Freud", "Sigmund Freud", null, null],
      [null, "Sigmund Freud", "Abraham Lincoln", null],
      [null, null, "Abraham Lincoln", null],
      [null, null, null, null],
    ],
    reward: 170,
  },
];

function createMatrix(rows, cols, factory) {
  const matrix = [];
  for (let y = 0; y < rows; y += 1) {
    const row = [];
    for (let x = 0; x < cols; x += 1) {
      row.push(factory());
    }
    matrix.push(row);
  }
  return matrix;
}

const board = createMatrix(boardHeight, boardWidth, () => null);

let activePiece = null;
let bag = [];
let nextQueue = [];
let dropTimer = null;
let isRunning = false;
let panic = 0;
let score = 0;
let contextsCleared = 0;
let contextIndex = 0;
let contextQueue = [];
let lockedPieces = new Map();
let segmentPieces = new Map();
let activePath = [];
let currentPath = [];
let buildingPath = false;

const boardElement = document.getElementById("time-grid");
const startButton = document.getElementById("start-run");
const startRouteButton = document.getElementById("start-route");
const undoRouteButton = document.getElementById("undo-route");
const commitRouteButton = document.getElementById("commit-route");
const clearRouteButton = document.getElementById("clear-route");
const routeStatusLabel = document.getElementById("route-status");
const statusBanner = document.getElementById("status-banner");
const scoreLabel = document.getElementById("score-label");
const contextLabel = document.getElementById("context-label");
const panicLabel = document.getElementById("panic-label");
const panicFill = document.getElementById("panic-fill");
const panicMeter = document.getElementById("panic-meter");
const nextPieceLabel = document.getElementById("next-piece-label");
const contextList = document.getElementById("context-list");
const eventList = document.getElementById("event-list");

initBoard();
renderBoard();
renderContexts();
updateStatus();

startButton.addEventListener("click", () => {
  if (isRunning) {
    stopRun();
  }
  startRun();
});

startRouteButton.addEventListener("click", () => {
  if (!isRunning) return;
  buildingPath = true;
  currentPath = [entryCell];
  renderPath();
  updateRouteControls();
  routeStatusLabel.textContent = "Sketching route from the rooftop beacon.";
});

undoRouteButton.addEventListener("click", () => {
  if (!buildingPath) return;
  if (currentPath.length > 1) {
    currentPath.pop();
    renderPath();
    updateRouteControls();
  }
});

commitRouteButton.addEventListener("click", () => {
  if (!buildingPath) return;
  if (currentPath.length < 2) {
    routeStatusLabel.textContent = "Trail needs to enter an era wing before it can be locked.";
    return;
  }
  const lastCell = currentPath[currentPath.length - 1];
  if (!isInsideAnySegment(lastCell)) {
    routeStatusLabel.textContent = "Route finale must end inside an era wing.";
    return;
  }
  activePath = [...currentPath];
  buildingPath = false;
  currentPath = [];
  renderPath();
  updateRouteControls();
  routeStatusLabel.textContent = "Route locked. Incoming anchors will warp when they hit the trail.";
});

clearRouteButton.addEventListener("click", () => {
  activePath = [];
  buildingPath = false;
  currentPath = [];
  renderPath();
  updateRouteControls();
  routeStatusLabel.textContent = "Phone booth route cleared.";
});

boardElement.addEventListener("click", (event) => {
  const target = event.target.closest(".time-cell");
  if (!target) return;
  if (!buildingPath) return;
  const x = Number.parseInt(target.dataset.x, 10);
  const y = Number.parseInt(target.dataset.y, 10);
  const last = currentPath[currentPath.length - 1];
  if (!isAdjacent(last, { x, y })) return;
  const exists = currentPath.some((cell) => cell.x === x && cell.y === y);
  if (exists) return;
  currentPath.push({ x, y });
  renderPath();
  updateRouteControls();
});

function startRun() {
  resetState();
  isRunning = true;
  startButton.textContent = "Abort Time Stream";
  statusBanner.textContent = "Time stream live. Plot a route and prep for arrivals.";
  startRouteButton.disabled = false;
  dropTimer = window.setInterval(() => gameTick(), dropInterval);
  spawnPiece();
  updateRouteControls();
}

function stopRun(message = "Run aborted.") {
  isRunning = false;
  window.clearInterval(dropTimer);
  dropTimer = null;
  startButton.textContent = "Launch Time Stream";
  statusBanner.textContent = message;
  startRouteButton.disabled = true;
  undoRouteButton.disabled = true;
  commitRouteButton.disabled = true;
  clearRouteButton.disabled = activePath.length === 0;
}

function resetState() {
  for (let y = 0; y < boardHeight; y += 1) {
    for (let x = 0; x < boardWidth; x += 1) {
      board[y][x] = null;
    }
  }
  activePiece = null;
  bag = [];
  nextQueue = [];
  panic = 0;
  score = 0;
  contextsCleared = 0;
  contextIndex = 0;
  contextQueue = drawContexts();
  lockedPieces.clear();
  segmentPieces = new Map();
  segments.forEach((segment) => {
    segmentPieces.set(segment.id, []);
  });
  activePath = [];
  currentPath = [];
  buildingPath = false;
  renderBoard();
  renderContexts();
  renderPath();
  updateStatus();
  clearEvents();
  routeStatusLabel.textContent = "Route tools armed.";
}

function gameTick() {
  if (!activePiece) {
    spawnPiece();
    return;
  }
  if (!attemptMove(0, 1)) {
    lockPiece();
    if (!isRunning) return;
    spawnPiece();
  } else {
    checkCapture();
  }
  renderBoard();
}

function spawnPiece() {
  if (panic >= panicLimit) {
    stopRun("Timeline collapse. Try again.");
    return;
  }
  if (nextQueue.length < 3) {
    refillQueue();
  }
  const pieceDef = nextQueue.shift();
  activePiece = {
    ...pieceDef,
    x: Math.floor(boardWidth / 2) - Math.floor(pieceDef.layout[0].length / 2),
    y: -getPieceTopOffset(pieceDef),
    id: crypto.randomUUID(),
    captured: false,
  };
  nextPieceLabel.textContent = nextQueue[0] ? nextQueue[0].name : "—";
  if (!isValidPosition(activePiece, activePiece.x, activePiece.y + 1)) {
    stopRun("Pieces jammed at entry. Presentation postponed.");
    return;
  }
  renderBoard();
  addEvent(`${pieceDef.name} entering the stream.`);
}

function refillQueue() {
  if (bag.length === 0) {
    bag = shuffle([...pieces]);
  }
  while (nextQueue.length < 3) {
    if (bag.length === 0) bag = shuffle([...pieces]);
    nextQueue.push(bag.shift());
  }
  nextPieceLabel.textContent = nextQueue[0] ? nextQueue[0].name : "—";
}

function attemptMove(dx, dy) {
  if (!activePiece) return false;
  const newX = activePiece.x + dx;
  const newY = activePiece.y + dy;
  if (!isValidPosition(activePiece, newX, newY)) {
    return false;
  }
  activePiece.x = newX;
  activePiece.y = newY;
  return true;
}

function isValidPosition(piece, x, y) {
  const cells = getCells(piece, x, y);
  return cells.every(({ x: cellX, y: cellY }) => {
    if (cellX < 0 || cellX >= boardWidth || cellY >= boardHeight) return false;
    if (cellY < 0) return true;
    return board[cellY][cellX] === null;
  });
}

function getCells(piece, offsetX, offsetY) {
  const result = [];
  for (let row = 0; row < piece.layout.length; row += 1) {
    for (let col = 0; col < piece.layout[row].length; col += 1) {
      if (piece.layout[row][col] === "X") {
        result.push({ x: offsetX + col, y: offsetY + row });
      }
    }
  }
  return result;
}

function getPieceTopOffset(piece) {
  for (let row = 0; row < piece.layout.length; row += 1) {
    if (piece.layout[row].includes("X")) {
      return row;
    }
  }
  return 0;
}

function checkCapture() {
  if (!activePiece || activePiece.captured || activePath.length < 2) return;
  const anchorX = activePiece.x + activePiece.anchor.x;
  const anchorY = activePiece.y + activePiece.anchor.y;
  const onPath = activePath.some((cell) => cell.x === anchorX && cell.y === anchorY);
  if (!onPath) return;
  const destination = activePath[activePath.length - 1];
  const newX = destination.x - activePiece.anchor.x;
  const newY = destination.y - activePiece.anchor.y;
  if (!isValidPosition(activePiece, newX, newY)) {
    return;
  }
  activePiece.x = newX;
  activePiece.y = newY;
  activePiece.captured = true;
  addEvent(`${activePiece.name} warped to ${getSegmentNameForCell(destination)}.`);
}

function lockPiece() {
  if (!activePiece) return;
  const cells = getCells(activePiece, activePiece.x, activePiece.y);
  let pieceClipped = false;
  cells.forEach(({ x, y }) => {
    if (y < 0) {
      pieceClipped = true;
      return;
    }
    board[y][x] = {
      id: activePiece.id,
      name: activePiece.name,
      color: activePiece.color,
    };
  });
  if (pieceClipped) {
    stopRun("Stream overflowed before delivery. Try again.");
    return;
  }
  const segmentId = resolveSegmentForPiece(cells);
  const anchorPosition = {
    x: activePiece.x + activePiece.anchor.x,
    y: activePiece.y + activePiece.anchor.y,
  };
  lockedPieces.set(activePiece.id, {
    id: activePiece.id,
    name: activePiece.name,
    segmentId,
    anchor: anchorPosition,
    definition: activePiece,
    cells,
  });
  if (segmentId) {
    const segmentList = segmentPieces.get(segmentId);
    const segment = segments.find((seg) => seg.id === segmentId);
    const relativeAnchor = {
      x: anchorPosition.x - segment.x,
      y: anchorPosition.y - segment.y,
    };
    segmentList.push({
      pieceId: activePiece.id,
      name: activePiece.name,
      anchor: relativeAnchor,
    });
    addEvent(`${activePiece.name} secured in the ${segment.name}.`);
  } else {
    panic += 1;
    addEvent(`${activePiece.name} drifted off target! Panic rising.`);
    if (panic >= panicLimit) {
      updateStatus();
      stopRun("Panic meter maxed. Oral report doomed.");
      return;
    }
  }
  evaluateContexts();
  activePiece = null;
  updateStatus();
}

function resolveSegmentForPiece(cells) {
  for (const segment of segments) {
    const inside = cells.every(({ x, y }) =>
      x >= segment.x &&
      x < segment.x + segment.width &&
      y >= segment.y &&
      y < segment.y + segment.height
    );
    if (inside) {
      return segment.id;
    }
  }
  return null;
}

function evaluateContexts() {
  if (contextQueue.length === 0) return;
  const activeContext = contextQueue[0];
  const segmentList = segmentPieces.get(activeContext.segment);
  if (!segmentList || segmentList.length === 0) return;
  const matchedPieces = [];
  for (const requirement of activeContext.anchors) {
    const match = segmentList.find(
      (piece) =>
        piece.name === requirement.name &&
        piece.anchor.x === requirement.position.x &&
        piece.anchor.y === requirement.position.y
    );
    if (!match) {
      return;
    }
    matchedPieces.push(match);
  }
  matchedPieces.forEach((piece) => {
    removePieceById(piece.pieceId);
  });
  contextQueue.shift();
  contextQueue.push(drawNextContext());
  contextsCleared += 1;
  score += activeContext.reward;
  addEvent(`${activeContext.title} cleared for ${activeContext.reward} study points!`);
  renderContexts();
}

function removePieceById(pieceId) {
  const pieceInfo = lockedPieces.get(pieceId);
  if (!pieceInfo) return;
  pieceInfo.cells.forEach(({ x, y }) => {
    board[y][x] = null;
  });
  lockedPieces.delete(pieceId);
  if (pieceInfo.segmentId) {
    const list = segmentPieces.get(pieceInfo.segmentId);
    if (list) {
      const index = list.findIndex((entry) => entry.pieceId === pieceId);
      if (index >= 0) {
        list.splice(index, 1);
      }
    }
  }
}

function drawContexts() {
  const queue = [];
  for (let i = 0; i < 3; i += 1) {
    queue.push(drawNextContext());
  }
  return queue;
}

function drawNextContext() {
  const context = contextDeck[contextIndex % contextDeck.length];
  contextIndex += 1;
  return context;
}

function renderBoard() {
  const fragment = document.createDocumentFragment();
  for (let y = 0; y < boardHeight; y += 1) {
    for (let x = 0; x < boardWidth; x += 1) {
      const cell = document.createElement("div");
      cell.className = "time-cell";
      cell.dataset.x = x;
      cell.dataset.y = y;
      const segment = segments.find((seg) =>
        x >= seg.x && x < seg.x + seg.width && y >= seg.y && y < seg.y + seg.height
      );
      if (segment) {
        cell.dataset.zone = segments.indexOf(segment);
      }
      if (x === entryCell.x && y === entryCell.y) {
        cell.classList.add("is-entry");
      }
      const locked = board[y][x];
      if (locked) {
        cell.classList.add("is-locked");
        cell.dataset.pieceName = locked.name;
        cell.style.setProperty("--piece-color", locked.color);
      }
      fragment.appendChild(cell);
    }
  }
  boardElement.innerHTML = "";
  boardElement.appendChild(fragment);
  if (activePiece) {
    const cells = getCells(activePiece, activePiece.x, activePiece.y);
    cells.forEach(({ x, y }) => {
      if (y < 0) return;
      const selector = `.time-cell[data-x="${x}"][data-y="${y}"]`;
      const cell = boardElement.querySelector(selector);
      if (cell) {
        cell.classList.add("is-active");
        cell.style.setProperty("--piece-color", activePiece.color);
      }
    });
  }
  renderPath();
}

function renderPath() {
  requestAnimationFrame(() => {
    boardElement.querySelectorAll(".time-cell").forEach((cell) => {
      cell.classList.remove("is-path", "is-path-end");
    });
    const path = buildingPath ? currentPath : activePath;
    path.forEach((cell, index) => {
      const selector = `.time-cell[data-x="${cell.x}"][data-y="${cell.y}"]`;
      const element = boardElement.querySelector(selector);
      if (!element) return;
      element.classList.add("is-path");
      if (index === path.length - 1 && path.length > 1) {
        element.classList.add("is-path-end");
      }
    });
  });
}

function renderContexts() {
  contextList.innerHTML = "";
  contextQueue.forEach((context, index) => {
    if (!context) return;
    const item = document.createElement("li");
    item.className = "context-card";
    const heading = document.createElement("h4");
    heading.textContent = `${index === 0 ? "Active" : "Queued"}: ${context.title}`;
    const details = document.createElement("p");
    details.textContent = context.description;
    const pattern = document.createElement("div");
    pattern.className = "context-pattern";
    context.pattern.forEach((row) => {
      row.forEach((cell) => {
        const patternCell = document.createElement("div");
        patternCell.className = "pattern-cell";
        if (cell) {
          patternCell.classList.add("is-target");
          patternCell.dataset.piece = cell;
          patternCell.textContent = cell.split(" ")[0];
        }
        pattern.appendChild(patternCell);
      });
    });
    item.appendChild(heading);
    item.appendChild(details);
    item.appendChild(pattern);
    contextList.appendChild(item);
  });
}

function updateStatus() {
  scoreLabel.textContent = score;
  contextLabel.textContent = contextsCleared;
  panicLabel.textContent = `${panic} / ${panicLimit}`;
  panicMeter.setAttribute("aria-valuenow", panic.toString());
  panicFill.style.width = `${(panic / panicLimit) * 100}%`;
}

function updateRouteControls() {
  startRouteButton.disabled = !isRunning || buildingPath;
  undoRouteButton.disabled = !buildingPath || currentPath.length <= 1;
  commitRouteButton.disabled = !buildingPath;
  clearRouteButton.disabled = !isRunning || (!buildingPath && activePath.length === 0);
}

function isAdjacent(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

function isInsideAnySegment(cell) {
  return segments.some(
    (segment) =>
      cell.x >= segment.x &&
      cell.x < segment.x + segment.width &&
      cell.y >= segment.y &&
      cell.y < segment.y + segment.height
  );
}

function getSegmentNameForCell(cell) {
  const segment = segments.find(
    (seg) => cell.x >= seg.x && cell.x < seg.x + seg.width && cell.y >= seg.y && cell.y < seg.y + seg.height
  );
  return segment ? segment.name : "the time stream";
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function initBoard() {
  const fragment = document.createDocumentFragment();
  for (let y = 0; y < boardHeight; y += 1) {
    for (let x = 0; x < boardWidth; x += 1) {
      const cell = document.createElement("div");
      cell.className = "time-cell";
      cell.dataset.x = x;
      cell.dataset.y = y;
      const segment = segments.find((seg) =>
        x >= seg.x && x < seg.x + seg.width && y >= seg.y && y < seg.y + seg.height
      );
      if (segment) {
        cell.dataset.zone = segments.indexOf(segment);
      }
      if (x === entryCell.x && y === entryCell.y) {
        cell.classList.add("is-entry");
      }
      fragment.appendChild(cell);
    }
  }
  boardElement.innerHTML = "";
  boardElement.appendChild(fragment);
}

function addEvent(message) {
  const item = document.createElement("li");
  const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  item.textContent = `[${timestamp}] ${message}`;
  eventList.prepend(item);
  while (eventList.children.length > 8) {
    eventList.removeChild(eventList.lastChild);
  }
}

function clearEvents() {
  eventList.innerHTML = "";
}
