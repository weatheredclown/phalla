import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { mountParticleField } from "../particles.js";
import { autoEnhanceFeedback } from "../feedback.js";

const boardWidth = 12;
const boardHeight = 20;
const dropInterval = 820;
const panicLimit = 5;
const CONTEXT_GOAL = 6;

const particleSystem = mountParticleField({
  effects: {
    palette: ["#60a5fa", "#facc15", "#34d399", "#a855f7"],
    ambientDensity: 0.35,
  },
});

const scoreConfig = getScoreConfig("dialtone-honor-roll");
const highScore = initHighScoreBanner({
  gameId: "dialtone-honor-roll",
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

const entryCell = { x: 5, y: 0 };

const segments = [
  { id: "agora", name: "Agora Wing", x: 0, width: 4, y: 16, height: 4 },
  { id: "salon", name: "Salon Wing", x: 4, width: 4, y: 16, height: 4 },
  { id: "atrium", name: "Atrium Wing", x: 8, width: 4, y: 16, height: 4 },
];

const figureCatalog = {
  "Socrates": { color: "rgba(234,179,8,0.9)", short: "Socrates" },
  "Sigmund Freud": { color: "rgba(139,92,246,0.9)", short: "Sigmund" },
  "Napoleon": { color: "rgba(248,113,113,0.9)", short: "Napoleon" },
  "Joan of Arc": { color: "rgba(248,250,252,0.92)", short: "Joan" },
  "Billy the Kid": { color: "rgba(34,197,94,0.9)", short: "Billy" },
  "Abraham Lincoln": { color: "rgba(59,130,246,0.9)", short: "Lincoln" },
};

const capsules = [
  { id: "philosophy", label: "Philosophy Capsule", sequence: ["Sigmund Freud", "Socrates"], drift: "pulse-left" },
  { id: "rebellion", label: "Rebellion Capsule", sequence: ["Joan of Arc", "Billy the Kid"], drift: "pulse-right" },
  { id: "leadership", label: "Leadership Capsule", sequence: ["Abraham Lincoln", "Napoleon"], drift: "zigzag" },
  { id: "expedition", label: "Expedition Capsule", sequence: ["Socrates", "Billy the Kid"], drift: "left" },
  { id: "debate", label: "Debate Capsule", sequence: ["Sigmund Freud", "Abraham Lincoln"], drift: "right" },
  { id: "anomaly", label: "Anomaly Capsule", sequence: ["Napoleon", "Joan of Arc"], drift: "none" },
];

function createContext(config) {
  const stacks = config.stacks.map((column) => [...column]);
  const preview = Array.from({ length: 4 }, () => Array(4).fill(null));
  stacks.forEach((column, columnIndex) => {
    column.forEach((name, depth) => {
      const row = 3 - depth;
      if (row >= 0 && row < 4) {
        preview[row][columnIndex] = name;
      }
    });
  });
  return { ...config, stacks, preview };
}

const contextDeck = [
  createContext({
    id: "philosophy-relay",
    title: "Philosophy Relay",
    description: "Stack Socrates beneath Sigmund Freud and escort Billy beside them in the Agora Wing.",
    segment: "agora",
    stacks: [
      ["Socrates", "Sigmund Freud"],
      ["Billy the Kid", "Socrates"],
      [],
      [],
    ],
    reward: 140,
  }),
  createContext({
    id: "agora-colloquium",
    title: "Agora Colloquium",
    description: "Build alternating Socrates/Sigmund towers and cap the row with Billy's escort.",
    segment: "agora",
    stacks: [
      ["Socrates", "Sigmund Freud", "Socrates", "Sigmund Freud"],
      [],
      ["Billy the Kid", "Socrates"],
      [],
    ],
    reward: 180,
  }),
  createContext({
    id: "salon-revolt",
    title: "Salon Revolt",
    description: "Drop Billy & Joan as a pair, then thread Joan's rescue capsule with Napoleon backing her up.",
    segment: "salon",
    stacks: [
      [],
      ["Billy the Kid", "Joan of Arc"],
      ["Joan of Arc", "Napoleon"],
      [],
    ],
    reward: 150,
  }),
  createContext({
    id: "salon-crossfire",
    title: "Salon Crossfire",
    description: "Double-stack the rebel duo and stabilize the flank with Joan's anomaly escort.",
    segment: "salon",
    stacks: [
      [],
      ["Billy the Kid", "Joan of Arc", "Billy the Kid", "Joan of Arc"],
      [],
      ["Joan of Arc", "Napoleon"],
    ],
    reward: 190,
  }),
  createContext({
    id: "atrium-caucus",
    title: "Atrium Caucus",
    description: "Seat Napoleon beneath Lincoln while Sigmund coaches from above in the Atrium Wing.",
    segment: "atrium",
    stacks: [
      ["Napoleon", "Abraham Lincoln"],
      ["Abraham Lincoln", "Sigmund Freud"],
      [],
      [],
    ],
    reward: 170,
  }),
  createContext({
    id: "atrium-accord",
    title: "Atrium Accord",
    description: "Echo the leadership tower twice and then slot the debate duo into the remaining column.",
    segment: "atrium",
    stacks: [
      ["Napoleon", "Abraham Lincoln", "Napoleon", "Abraham Lincoln"],
      [],
      ["Abraham Lincoln", "Sigmund Freud"],
      [],
    ],
    reward: 210,
  }),
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

let activeCapsule = null;
let bag = [];
let nextQueue = [];
let dropTimer = null;
let isRunning = false;
let panic = 0;
let score = 0;
let contextsCleared = 0;
let contextQueue = [];
let contextDrawPile = [];
let segmentStacks = new Map();
let highlightHistory = [];
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
const summaryPanel = document.getElementById("run-summary");
const summaryStatus = document.getElementById("run-summary-status");
const summaryScore = document.getElementById("summary-score");
const summaryContexts = document.getElementById("summary-contexts");
const summaryPanic = document.getElementById("summary-panic");
const summaryHighlights = document.getElementById("summary-highlights");
const summaryNote = document.getElementById("summary-note");
const replayButton = document.getElementById("replay-run");

initBoard();
renderBoard();
renderContexts();
updateStatus();

startButton.addEventListener("click", () => {
  if (isRunning) {
    stopRun("Run aborted.", { status: "aborted", cause: "manual" });
    return;
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
  routeStatusLabel.textContent = "Route locked. Incoming capsules warp when they hit the trail.";
});

clearRouteButton.addEventListener("click", () => {
  activePath = [];
  buildingPath = false;
  currentPath = [];
  renderPath();
  updateRouteControls();
  routeStatusLabel.textContent = "Phone booth route cleared.";
});

replayButton.addEventListener("click", () => {
  if (isRunning) {
    return;
  }
  startRun();
  startButton.focus();
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
  hideRunSummary();
  isRunning = true;
  startButton.textContent = "Abort Time Stream";
  statusBanner.textContent = `Time stream live. Secure ${CONTEXT_GOAL} contexts to ace the presentation.`;
  startRouteButton.disabled = false;
  dropTimer = window.setInterval(() => gameTick(), dropInterval);
  spawnCapsule();
  updateRouteControls();
  particleSystem.emitSparkle(0.7);
}

function stopRun(message = "Run aborted.", options = {}) {
  const { status = "aborted", cause = "manual" } = options;
  isRunning = false;
  if (dropTimer) {
    window.clearInterval(dropTimer);
    dropTimer = null;
  }
  startButton.textContent = "Launch Time Stream";
  statusBanner.textContent = message;
  startRouteButton.disabled = true;
  undoRouteButton.disabled = true;
  commitRouteButton.disabled = true;
  clearRouteButton.disabled = activePath.length === 0;
  updateRouteControls();
  presentRunSummary({ status, message, cause });
}

function resetState() {
  for (let y = 0; y < boardHeight; y += 1) {
    for (let x = 0; x < boardWidth; x += 1) {
      board[y][x] = null;
    }
  }
  activeCapsule = null;
  bag = [];
  nextQueue = [];
  panic = 0;
  score = 0;
  contextsCleared = 0;
  contextDrawPile = shuffle([...contextDeck]);
  contextQueue = drawContexts();
  segmentStacks = new Map();
  segments.forEach((segment) => {
    const columns = Array.from({ length: segment.width }, () => []);
    segmentStacks.set(segment.id, columns);
  });
  highlightHistory = [];
  activePath = [];
  currentPath = [];
  buildingPath = false;
  nextPieceLabel.textContent = "—";
  renderBoard();
  renderContexts();
  renderPath();
  updateStatus();
  clearEvents();
  routeStatusLabel.textContent = "Route tools armed.";
}

function gameTick() {
  if (!activeCapsule) {
    spawnCapsule();
    return;
  }
  applyDrift(activeCapsule);
  const movedDown = attemptMove(0, 1);
  if (!movedDown) {
    lockCapsule();
    if (!isRunning) return;
    spawnCapsule();
  } else {
    activeCapsule.steps += 1;
    warpToRoute();
  }
  renderBoard();
}

function spawnCapsule() {
  if (panic >= panicLimit) {
    stopRun("Timeline collapse. Try again.", { status: "failure", cause: "panic" });
    return;
  }
  if (nextQueue.length < 3) {
    refillQueue();
  }
  const capsuleDef = nextQueue.shift();
  const tokens = capsuleDef.sequence.map((name) => ({
    name,
    color: figureCatalog[name].color,
    short: figureCatalog[name].short,
  }));
  activeCapsule = {
    id: crypto.randomUUID(),
    def: capsuleDef,
    tokens,
    x: entryCell.x,
    y: -tokens.length,
    steps: 0,
    captured: false,
  };
  nextPieceLabel.textContent = nextQueue[0] ? describeCapsule(nextQueue[0]) : "—";
  if (!isValidPosition(activeCapsule, activeCapsule.x, activeCapsule.y + 1)) {
    stopRun("Capsules jammed at entry. Presentation postponed.", { status: "failure", cause: "entry-jam" });
    return;
  }
  renderBoard();
  addEvent(`${describeCapsule(capsuleDef)} syncing into the stream.`);
}

function refillQueue() {
  if (bag.length === 0) {
    bag = shuffle([...capsules]);
  }
  while (nextQueue.length < 3) {
    if (bag.length === 0) bag = shuffle([...capsules]);
    nextQueue.push(bag.shift());
  }
  nextPieceLabel.textContent = nextQueue[0] ? describeCapsule(nextQueue[0]) : "—";
}

function attemptMove(dx, dy) {
  if (!activeCapsule) return false;
  const newX = activeCapsule.x + dx;
  const newY = activeCapsule.y + dy;
  if (!isValidPosition(activeCapsule, newX, newY)) {
    return false;
  }
  activeCapsule.x = newX;
  activeCapsule.y = newY;
  return true;
}

function isValidPosition(piece, x, y) {
  const cells = getCapsuleCells(piece, x, y);
  return cells.every(({ x: cellX, y: cellY }) => {
    if (cellX < 0 || cellX >= boardWidth || cellY >= boardHeight) return false;
    if (cellY < 0) return true;
    return board[cellY][cellX] === null;
  });
}

function getCapsuleCells(piece, offsetX, offsetY) {
  return piece.tokens.map((token, index) => ({
    x: offsetX,
    y: offsetY + index,
    token,
  }));
}

function getAnchorCell(piece) {
  return {
    x: piece.x,
    y: piece.y + piece.tokens.length - 1,
  };
}

function applyDrift(piece) {
  const { drift } = piece.def;
  let dx = 0;
  if (drift === "left") {
    dx = -1;
  } else if (drift === "right") {
    dx = 1;
  } else if (drift === "pulse-left") {
    if (piece.steps % 2 === 0) dx = -1;
  } else if (drift === "pulse-right") {
    if (piece.steps % 2 === 0) dx = 1;
  } else if (drift === "zigzag") {
    dx = piece.steps % 2 === 0 ? -1 : 1;
  }
  if (dx !== 0) {
    attemptMove(dx, 0);
  }
}

function warpToRoute() {
  if (!activeCapsule || activePath.length < 2) return;
  const anchor = getAnchorCell(activeCapsule);
  const onPath = activePath.some((cell) => cell.x === anchor.x && cell.y === anchor.y);
  if (!onPath) return;
  const destination = activePath[activePath.length - 1];
  const targetX = destination.x;
  const targetY = destination.y - (activeCapsule.tokens.length - 1);
  if (!isValidPosition(activeCapsule, targetX, targetY)) {
    return;
  }
  activeCapsule.x = targetX;
  activeCapsule.y = targetY;
  activeCapsule.captured = true;
  addEvent(`${describeCapsule(activeCapsule.def)} warped to ${getSegmentNameForCell(destination)}.`);
}

function lockCapsule() {
  if (!activeCapsule) return;
  const cells = getCapsuleCells(activeCapsule, activeCapsule.x, activeCapsule.y);
  let clipped = false;
  cells.forEach(({ x, y, token }) => {
    if (y < 0) {
      clipped = true;
      return;
    }
    board[y][x] = {
      id: activeCapsule.id,
      name: token.name,
      color: token.color,
    };
  });
  if (clipped) {
    stopRun("Stream overflowed before delivery. Try again.", { status: "failure", cause: "overflow" });
    return;
  }
  const segmentId = resolveSegmentForCells(cells);
  if (segmentId) {
    const segment = segments.find((seg) => seg.id === segmentId);
    addEvent(`${describeCapsule(activeCapsule.def)} anchored in the ${segment.name}.`);
  } else {
    handlePanic(`${describeCapsule(activeCapsule.def)} drifted off course. Panic rising!`);
  }
  activeCapsule = null;
  applyGravity();
  updateSegmentStacks();
  evaluateContexts();
  updateStatus();
  renderBoard();
}

function resolveSegmentForCells(cells) {
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

function handlePanic(message) {
  panic += 1;
  addEvent(message);
  updateStatus();
  if (panic >= panicLimit) {
    stopRun("Panic meter maxed. Oral report doomed.", { status: "failure", cause: "panic" });
  }
}

function applyGravity() {
  for (let x = 0; x < boardWidth; x += 1) {
    const stack = [];
    for (let y = boardHeight - 1; y >= 0; y -= 1) {
      if (board[y][x]) {
        stack.push(board[y][x]);
      }
    }
    for (let y = boardHeight - 1, index = 0; y >= 0; y -= 1, index += 1) {
      board[y][x] = stack[index] || null;
    }
  }
}

function updateSegmentStacks() {
  segmentStacks = new Map();
  segments.forEach((segment) => {
    const columns = [];
    for (let offset = 0; offset < segment.width; offset += 1) {
      const column = [];
      for (let depth = 0; depth < segment.height; depth += 1) {
        const y = segment.y + segment.height - 1 - depth;
        const cell = board[y][segment.x + offset];
        if (!cell) {
          break;
        }
        column.push(cell.name);
      }
      columns.push(column);
    }
    segmentStacks.set(segment.id, columns);
  });
}

function evaluateContexts() {
  if (contextQueue.length === 0) return;
  const activeContext = contextQueue[0];
  const stacks = segmentStacks.get(activeContext.segment);
  if (!stacks) return;
  const matches = activeContext.stacks.every((requirement, index) => {
    const column = stacks[index] || [];
    if (column.length !== requirement.length) {
      return false;
    }
    for (let i = 0; i < requirement.length; i += 1) {
      if (column[i] !== requirement[i]) {
        return false;
      }
    }
    return true;
  });
  if (!matches) {
    return;
  }
  clearContextColumns(activeContext);
  contextQueue.shift();
  contextQueue.push(drawNextContext());
  contextsCleared += 1;
  score += activeContext.reward;
  const segment = segments.find((entry) => entry.id === activeContext.segment);
  const segmentName = segment ? segment.name : "Timeline Junction";
  addEvent(`${activeContext.title} locked for ${activeContext.reward} study points!`);
  const remaining = Math.max(0, CONTEXT_GOAL - contextsCleared);
  statusBanner.textContent = `${activeContext.title} secured. ${remaining} context${remaining === 1 ? "" : "s"} to go.`;
  highlightHistory.unshift({
    id: activeContext.id,
    title: activeContext.title,
    reward: activeContext.reward,
    segment: segmentName,
  });
  highlightHistory = highlightHistory.slice(0, 6);
  updateStatus();
  renderContexts();
  particleSystem.emitBurst(0.9 + Math.min(contextsCleared / CONTEXT_GOAL, 1) * 0.35);
  if (contextsCleared >= CONTEXT_GOAL) {
    stopRun("Presentation secured. Wyld Stallyns pass with honors!", { status: "success", cause: "goal" });
  }
}

function clearContextColumns(context) {
  const segment = segments.find((entry) => entry.id === context.segment);
  if (!segment) return;
  context.stacks.forEach((requirement, columnIndex) => {
    for (let depth = 0; depth < requirement.length; depth += 1) {
      const y = segment.y + segment.height - 1 - depth;
      const x = segment.x + columnIndex;
      board[y][x] = null;
    }
  });
  applyGravity();
  updateSegmentStacks();
}

function drawContexts() {
  const queue = [];
  for (let i = 0; i < 3; i += 1) {
    queue.push(drawNextContext());
  }
  return queue;
}

function drawNextContext() {
  if (contextDrawPile.length === 0) {
    contextDrawPile = shuffle([...contextDeck]);
  }
  return contextDrawPile.shift();
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
  if (activeCapsule) {
    const cells = getCapsuleCells(activeCapsule, activeCapsule.x, activeCapsule.y);
    cells.forEach(({ x, y, token }) => {
      if (y < 0) return;
      const selector = `.time-cell[data-x="${x}"][data-y="${y}"]`;
      const cell = boardElement.querySelector(selector);
      if (cell) {
        cell.classList.add("is-active");
        cell.style.setProperty("--piece-color", token.color);
        cell.dataset.previewName = token.name;
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
    context.preview.forEach((row) => {
      row.forEach((cellName) => {
        const patternCell = document.createElement("div");
        patternCell.className = "pattern-cell";
        if (cellName) {
          patternCell.classList.add("is-target");
          patternCell.dataset.piece = cellName;
          patternCell.textContent = figureCatalog[cellName].short;
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
  contextLabel.textContent = `${contextsCleared} / ${CONTEXT_GOAL}`;
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

function describeCapsule(capsule) {
  return capsule.sequence.map((name) => figureCatalog[name].short).join(" / ");
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

function presentRunSummary({ status, message, cause }) {
  const recordMeta = { contexts: contextsCleared, panic, cause };
  const result = highScore.submit(score, recordMeta);
  const hasSummaryElements =
    summaryPanel &&
    summaryStatus &&
    summaryScore &&
    summaryContexts &&
    summaryPanic &&
    summaryNote &&
    summaryHighlights;
  if (!hasSummaryElements) {
    if (result.updated) {
      particleSystem.emitBurst(1.4);
    }
    return;
  }
  summaryStatus.textContent = message;
  summaryScore.textContent = `${score} pts`;
  summaryContexts.textContent = `${contextsCleared} / ${CONTEXT_GOAL}`;
  summaryPanic.textContent = `${panic} / ${panicLimit}`;
  renderSummaryHighlights();
  summaryPanel.hidden = false;
  const note = resolveSummaryNote(status, cause, result.updated);
  summaryNote.textContent = note;
  if (result.updated) {
    particleSystem.emitBurst(1.6);
  } else if (status === "success") {
    particleSystem.emitSparkle(1.15);
  } else if (status === "failure") {
    particleSystem.emitSparkle(0.75);
  }
}

function hideRunSummary() {
  if (summaryPanel) {
    summaryPanel.hidden = true;
  }
}

function renderSummaryHighlights() {
  if (!summaryHighlights) {
    return;
  }
  summaryHighlights.innerHTML = "";
  if (highlightHistory.length === 0) {
    const item = document.createElement("li");
    item.classList.add("is-empty");
    item.textContent = "No contexts cleared this run.";
    summaryHighlights.append(item);
    return;
  }
  highlightHistory.slice(0, 3).forEach((entry) => {
    const item = document.createElement("li");
    const title = document.createElement("span");
    title.textContent = entry.title;
    const reward = document.createElement("span");
    reward.textContent = `+${entry.reward} pts`;
    const segment = document.createElement("small");
    segment.textContent = entry.segment;
    item.append(title, reward, segment);
    summaryHighlights.append(item);
  });
}

function resolveSummaryNote(status, cause, isRecord) {
  if (isRecord) {
    return "New timeline record! San Dimas High salutes your study spree.";
  }
  if (status === "success") {
    return "Presentation locked. Queue up another historical rescue when ready.";
  }
  if (status === "failure") {
    if (cause === "panic") {
      return "Panic meter blew. Clear stray capsules faster to calm the crowd.";
    }
    if (cause === "entry-jam") {
      return "Entry jammed. Sketch the booth trail earlier to avoid gridlock.";
    }
    if (cause === "overflow") {
      return "Overflow triggered. Route capsules to an era bay before they stack.";
    }
    return "Timeline destabilized. Adjust the route and try again.";
  }
  return "Timeline paused. Replay when the Wyld Stallyns are ready.";
}

autoEnhanceFeedback();
