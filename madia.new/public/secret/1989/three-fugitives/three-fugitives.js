import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { mountParticleField } from "../particles.js";

const baseLayout = [
  "#########",
  "#..T.S.#",
  "#.#.#..#",
  "#R.A.P.#",
  "#..FHA.#",
  "#.#.#..#",
  "#R...p.#",
  "#########",
];

const chainDefinitions = [
  { id: "alley-lock", label: "Alley Lock" },
  { id: "gallery-link", label: "Gallery Link" },
];

const resourceDefinitions = [
  { id: "sparkstone", label: "Sparkstone", icon: "⚡" },
  { id: "gritrock", label: "Gritrock", icon: "⛏️" },
];

const policeLoops = {
  north: [
    { x: 5, y: 3 },
    { x: 5, y: 2 },
    { x: 6, y: 2 },
    { x: 6, y: 3 },
  ],
  south: [
    { x: 5, y: 6 },
    { x: 5, y: 5 },
    { x: 6, y: 5 },
    { x: 6, y: 6 },
  ],
};

function coordKey(x, y) {
  return `${x},${y}`;
}

function clonePoint(point) {
  return { x: point.x, y: point.y };
}

function buildBoard() {
  const rows = baseLayout.map((row) => row.split(""));
  const height = rows.length;
  const width = Math.max(...rows.map((row) => row.length));

  const cells = [];
  const handcuffLinks = [];
  const handcuffMap = new Map();
  const resources = [];
  const resourceMap = new Map();
  const policeUnits = [];

  let fugitiveStart = null;
  let hostageStart = null;

  for (let y = 0; y < height; y += 1) {
    const row = [];
    const rawRow = rows[y] ?? [];
    for (let x = 0; x < width; x += 1) {
      const char = rawRow[x] ?? "#";
      const cell = {
        type: "floor",
        chainId: null,
        resourceId: null,
        position: { x, y },
      };

      switch (char) {
        case "#": {
          cell.type = "wall";
          break;
        }
        case "T": {
          cell.type = "forge";
          break;
        }
        case "S": {
          cell.type = "safe";
          break;
        }
        case "A": {
          cell.type = "chain";
          const definition = chainDefinitions[handcuffLinks.length] ?? {
            id: `chain-${handcuffLinks.length}`,
            label: "Unknown Link",
          };
          const link = {
            id: definition.id,
            label: definition.label,
            position: { x, y },
            locked: true,
          };
          handcuffLinks.push(link);
          handcuffMap.set(link.id, link);
          cell.chainId = link.id;
          break;
        }
        case "R": {
          cell.type = "resource";
          const definition = resourceDefinitions[resources.length] ?? {
            id: `resource-${resources.length}`,
            label: "Supply Cache",
            icon: "◆",
          };
          const resource = {
            id: definition.id,
            label: definition.label,
            icon: definition.icon ?? "◆",
            position: { x, y },
            collected: false,
          };
          resources.push(resource);
          resourceMap.set(resource.id, resource);
          cell.resourceId = resource.id;
          break;
        }
        case "F": {
          cell.type = "floor";
          fugitiveStart = { x, y };
          break;
        }
        case "H": {
          cell.type = "floor";
          hostageStart = { x, y };
          break;
        }
        case "P": {
          cell.type = "floor";
          policeUnits.push({
            id: "north-unit",
            name: "Uptown Patrol",
            loopKey: "north",
            loopIndex: 0,
            start: { x, y },
            position: { x, y },
          });
          break;
        }
        case "p": {
          cell.type = "floor";
          policeUnits.push({
            id: "south-unit",
            name: "River Patrol",
            loopKey: "south",
            loopIndex: 0,
            start: { x, y },
            position: { x, y },
          });
          break;
        }
        default: {
          cell.type = "floor";
        }
      }

      row.push(cell);
    }
    cells.push(row);
  }

  if (!fugitiveStart || !hostageStart) {
    throw new Error("Board requires both fugitive and hostage start positions");
  }

  return {
    width,
    height,
    cells,
    handcuffLinks,
    handcuffMap,
    resources,
    resourceMap,
    fugitiveStart,
    hostageStart,
    policeUnits,
  };
}

function isWithin(board, x, y) {
  return y >= 0 && y < board.height && x >= 0 && x < board.width;
}

function getCell(board, x, y) {
  if (!isWithin(board, x, y)) {
    return null;
  }
  return board.cells[y][x];
}

function isTraversable(board, x, y) {
  const cell = getCell(board, x, y);
  if (!cell) {
    return false;
  }
  if (cell.type === "wall") {
    return false;
  }
  if (cell.chainId) {
    const link = board.handcuffMap.get(cell.chainId);
    if (link?.locked) {
      return false;
    }
  }
  return true;
}

function manhattanNeighbors(point) {
  return [
    { x: point.x, y: point.y - 1 },
    { x: point.x + 1, y: point.y },
    { x: point.x, y: point.y + 1 },
    { x: point.x - 1, y: point.y },
  ];
}

const board = buildBoard();

const gridElement = document.getElementById("grid");
const inventoryList = document.getElementById("inventory-list");
const linksList = document.getElementById("links-list");
const eventList = document.getElementById("event-log");
const turnReadout = document.getElementById("turn-readout");
const forgeButton = document.getElementById("forge-button");
const cutButton = document.getElementById("cut-button");
const distractionButton = document.getElementById("distraction-button");
const distractionStatus = document.getElementById("distraction-status");
const resetButton = document.getElementById("reset-button");

const cellElements = [];

gridElement.style.setProperty("--grid-width", String(board.width));
gridElement.style.setProperty("--grid-height", String(board.height));

for (let y = 0; y < board.height; y += 1) {
  const row = [];
  for (let x = 0; x < board.width; x += 1) {
    const cell = getCell(board, x, y);
    const element = document.createElement("div");
    element.className = "grid-cell";
    element.setAttribute("role", "gridcell");
    element.dataset.type = cell.type;
    gridElement.appendChild(element);
    row.push(element);
  }
  cellElements.push(row);
}

const scoreConfig = getScoreConfig("three-fugitives");
const highScore = initHighScoreBanner({
  gameId: "three-fugitives",
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

const particleField = mountParticleField({
  effects: {
    palette: ["#38bdf8", "#facc15", "#f97316", "#7b5bff"],
    ambientDensity: 0.3,
  },
});

const state = {
  fugitive: clonePoint(board.fugitiveStart),
  hostage: clonePoint(board.hostageStart),
  inventory: {
    sparkstone: false,
    gritrock: false,
    filingStones: 0,
  },
  turns: 0,
  distractionAvailable: true,
  distractionTurns: 0,
  events: [],
  gameState: "active",
};

function resetPolice() {
  board.policeUnits.forEach((unit) => {
    unit.position = clonePoint(unit.start);
    const loop = policeLoops[unit.loopKey] ?? [];
    const startIndex = loop.findIndex((step) => step.x === unit.start.x && step.y === unit.start.y);
    unit.loopIndex = startIndex >= 0 ? startIndex : 0;
  });
}

function resetResources() {
  board.resources.forEach((resource) => {
    resource.collected = false;
    state.inventory[resource.id] = false;
  });
}

function resetLinks() {
  board.handcuffLinks.forEach((link) => {
    link.locked = true;
  });
}

function pushEvent(message) {
  state.events.unshift({ message, id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}` });
  if (state.events.length > 8) {
    state.events.length = 8;
  }
  renderEventLog();
}

function renderEventLog() {
  eventList.innerHTML = "";
  state.events.forEach((entry) => {
    const item = document.createElement("li");
    item.textContent = entry.message;
    eventList.appendChild(item);
  });
}

function renderInventory() {
  inventoryList.innerHTML = "";
  board.resources.forEach((resource) => {
    const li = document.createElement("li");
    li.dataset.ready = resource.collected ? "true" : "false";
    li.innerHTML = `<span>${resource.label}</span><span>${resource.collected ? "Ready" : "Missing"}</span>`;
    inventoryList.appendChild(li);
  });

  const filingItem = document.createElement("li");
  filingItem.dataset.ready = state.inventory.filingStones > 0 ? "true" : "false";
  filingItem.innerHTML = `<span>Filing Stones</span><span>${state.inventory.filingStones}</span>`;
  inventoryList.appendChild(filingItem);
}

function renderLinks() {
  linksList.innerHTML = "";
  board.handcuffLinks.forEach((link) => {
    const li = document.createElement("li");
    li.dataset.status = link.locked ? "locked" : "cut";
    li.innerHTML = `<span>${link.label}</span><span>${link.locked ? "Locked" : "Cut"}</span>`;
    linksList.appendChild(li);
  });
}

function describeCell(cell) {
  if (!cell) {
    return "Void";
  }
  switch (cell.type) {
    case "wall":
      return "Wall";
    case "forge":
      return "Filing tray";
    case "safe":
      return "Safe balcony";
    case "chain": {
      const link = cell.chainId ? board.handcuffMap.get(cell.chainId) : null;
      if (link) {
        return link.locked ? `${link.label}, locked` : `${link.label}, cut`;
      }
      return "Link";
    }
    case "resource": {
      const resource = cell.resourceId ? board.resourceMap.get(cell.resourceId) : null;
      if (resource) {
        return resource.collected ? `${resource.label}, collected` : `${resource.label} cache`;
      }
      return "Cache";
    }
    default:
      return "Floor";
  }
}

function renderGrid() {
  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      const cell = getCell(board, x, y);
      const element = cellElements[y][x];
      element.dataset.type = cell.type;
      if (cell.chainId) {
        const link = board.handcuffMap.get(cell.chainId);
        element.dataset.chainStatus = link?.locked ? "locked" : "cut";
      } else {
        element.removeAttribute("data-chain-status");
      }

      if (cell.type === "resource") {
        const resource = cell.resourceId ? board.resourceMap.get(cell.resourceId) : null;
        if (resource) {
          element.dataset.resource = resource.id;
          element.dataset.resourceState = resource.collected ? "collected" : "present";
        }
        element.textContent = resource && !resource.collected ? resource.icon : "";
      } else {
        element.removeAttribute("data-resource");
        element.removeAttribute("data-resource-state");
        element.textContent = "";
      }

      element.removeAttribute("data-occupant");
      element.removeAttribute("data-occupant-secondary");

      let label = element.textContent ?? "";
      let primary = null;
      let secondary = null;

      if (state.hostage.x === x && state.hostage.y === y) {
        primary = "hostage";
        label = "H";
      }

      if (state.fugitive.x === x && state.fugitive.y === y) {
        if (primary) {
          secondary = primary;
        }
        primary = "fugitive";
        label = "F";
      }

      const policeHere = board.policeUnits.filter((unit) => unit.position.x === x && unit.position.y === y);
      if (policeHere.length > 0) {
        if (primary) {
          secondary = primary;
        }
        primary = "police";
        label = "🚓";
      }

      if (primary) {
        element.dataset.occupant = primary;
        if (secondary) {
          element.dataset.occupantSecondary = secondary;
        }
      }

      if (label) {
        element.textContent = label;
      }

      const descriptor = [];
      if (primary === "fugitive") {
        descriptor.push("Fugitive");
      } else if (primary === "hostage") {
        descriptor.push("Hostage");
      } else if (primary === "police") {
        descriptor.push("Police");
      }

      descriptor.push(describeCell(cell));
      element.setAttribute("aria-label", descriptor.join(", "));
    }
  }
}

function updateTurnReadout() {
  turnReadout.textContent = `Turn ${state.turns}`;
}

function updateDistractionUI() {
  if (state.gameState !== "active") {
    distractionButton.disabled = true;
  } else {
    distractionButton.disabled = !state.distractionAvailable || state.distractionTurns > 0;
  }

  if (!state.distractionAvailable) {
    if (state.distractionTurns > 0) {
      distractionStatus.textContent = `Distraction looping for ${state.distractionTurns} turn${state.distractionTurns === 1 ? "" : "s"}.`;
    } else {
      distractionStatus.textContent = "Distraction used.";
    }
  } else {
    distractionStatus.textContent = "Distraction ready.";
  }
}

function refreshUI() {
  renderGrid();
  renderInventory();
  renderLinks();
  updateTurnReadout();
  updateDistractionUI();
  const lockedLinks = countLockedLinks();
  const resourcesReady = board.resources.every((resource) => resource.collected);
  forgeButton.disabled = !(state.gameState === "active" && resourcesReady && lockedLinks > 0 && state.inventory.filingStones < lockedLinks);
  cutButton.disabled = !(state.gameState === "active" && state.inventory.filingStones > 0 && lockedLinks > 0);
}

function resetGame() {
  state.fugitive = clonePoint(board.fugitiveStart);
  state.hostage = clonePoint(board.hostageStart);
  state.inventory.sparkstone = false;
  state.inventory.gritrock = false;
  state.inventory.filingStones = 0;
  state.turns = 0;
  state.distractionAvailable = true;
  state.distractionTurns = 0;
  state.gameState = "active";
  state.events = [];
  resetPolice();
  resetResources();
  resetLinks();
  renderEventLog();
  pushEvent("Briefing: Collect sparkstone and gritrock, then forge a Filing Stone to cut the first link.");
  refreshUI();
}

function countLockedLinks() {
  return board.handcuffLinks.filter((link) => link.locked).length;
}

function collectResourceIfPresent() {
  const cell = getCell(board, state.fugitive.x, state.fugitive.y);
  if (!cell || cell.type !== "resource" || !cell.resourceId) {
    return;
  }
  const resource = board.resourceMap.get(cell.resourceId);
  if (!resource || resource.collected) {
    return;
  }
  resource.collected = true;
  state.inventory[resource.id] = true;
  pushEvent(`${resource.label} secured.`);
}

function handleForge() {
  const currentCell = getCell(board, state.fugitive.x, state.fugitive.y);
  if (currentCell?.type !== "forge") {
    pushEvent("Stand on the Filing Tray to work the stones.");
    return;
  }
  const requiredReady = board.resources.every((resource) => resource.collected);
  if (!requiredReady) {
    return;
  }
  const lockedLinks = countLockedLinks();
  if (lockedLinks <= 0) {
    return;
  }
  state.inventory.filingStones += 1;
  particleField.emitSparkle(0.6);
  pushEvent("Filing Stone forged. Ready to cut a link.");
  refreshUI();
}

function cutNextLink() {
  const nextLink = board.handcuffLinks.find((link) => link.locked);
  if (!nextLink) {
    return;
  }
  nextLink.locked = false;
  state.inventory.filingStones = Math.max(0, state.inventory.filingStones - 1);
  particleField.emitSparkle(0.9);
  pushEvent(`${nextLink.label} severed.`);
  refreshUI();
}

function triggerDistraction() {
  if (!state.distractionAvailable || state.gameState !== "active") {
    return;
  }
  state.distractionAvailable = false;
  state.distractionTurns = 3;
  particleField.emitSparkle(0.5);
  pushEvent("Distraction deployed. Patrols fall into their loop.");
  refreshUI();
}

function attemptHostagePush(targetX, targetY, dx, dy) {
  const destination = { x: targetX + dx, y: targetY + dy };
  if (!isWithin(board, destination.x, destination.y)) {
    pushEvent("The hostage jolts against the perimeter.");
    return false;
  }
  if (!isTraversable(board, destination.x, destination.y)) {
    pushEvent("The hostage can’t cross that obstacle.");
    return false;
  }
  const policeBlocking = board.policeUnits.some((unit) => unit.position.x === destination.x && unit.position.y === destination.y);
  if (policeBlocking) {
    pushEvent("A patrol blocks the shove.");
    return false;
  }
  state.hostage = destination;
  return true;
}

function attemptMove(dx, dy) {
  if (state.gameState !== "active") {
    return;
  }
  if (dx === 0 && dy === 0) {
    return;
  }
  const next = { x: state.fugitive.x + dx, y: state.fugitive.y + dy };
  if (!isWithin(board, next.x, next.y)) {
    return;
  }
  const cell = getCell(board, next.x, next.y);
  if (!cell) {
    return;
  }

  if (state.hostage.x === next.x && state.hostage.y === next.y) {
    const pushed = attemptHostagePush(next.x, next.y, dx, dy);
    if (!pushed) {
      return;
    }
  } else if (!isTraversable(board, next.x, next.y)) {
    pushEvent("The handcuffs still anchor that direction.");
    return;
  }

  const policeHere = board.policeUnits.find((unit) => unit.position.x === next.x && unit.position.y === next.y);
  if (policeHere) {
    state.gameState = "lost";
    pushEvent("Grabbed! The patrol tackles the Fugitive mid-step.");
    refreshUI();
    return;
  }

  state.fugitive = next;
  state.turns += 1;
  collectResourceIfPresent();
  advanceAfterMove();
}

function advanceAfterMove() {
  checkVictory();
  if (state.gameState !== "active") {
    refreshUI();
    return;
  }
  movePolice();
  if (state.gameState === "active") {
    if (state.distractionTurns > 0) {
      state.distractionTurns -= 1;
      if (state.distractionTurns === 0) {
        pushEvent("The distraction fades; patrols resume pursuit.");
      }
    }
  }
  refreshUI();
}

function movePolice() {
  const occupied = new Set(board.policeUnits.map((unit) => coordKey(unit.position.x, unit.position.y)));

  board.policeUnits.forEach((unit) => {
    const currentKey = coordKey(unit.position.x, unit.position.y);
    occupied.delete(currentKey);
    let nextPosition = unit.position;

    if (state.distractionTurns > 0) {
      const loop = policeLoops[unit.loopKey] ?? [];
      if (loop.length > 0) {
        unit.loopIndex = (unit.loopIndex + 1) % loop.length;
        nextPosition = clonePoint(loop[unit.loopIndex]);
      }
    } else {
      const pursuit = findPursuitStep(unit.position, state.hostage, unit);
      if (pursuit) {
        nextPosition = pursuit;
      }
    }

    const nextKey = coordKey(nextPosition.x, nextPosition.y);
    if (occupied.has(nextKey)) {
      occupied.add(currentKey);
      return;
    }

    unit.position = nextPosition;
    occupied.add(nextKey);

    if (unit.position.x === state.hostage.x && unit.position.y === state.hostage.y) {
      state.gameState = "lost";
      pushEvent(`${unit.name} seizes the hostage.`);
    } else if (unit.position.x === state.fugitive.x && unit.position.y === state.fugitive.y) {
      state.gameState = "lost";
      pushEvent(`${unit.name} collars the Fugitive.`);
    }
  });
}

function findPursuitStep(start, goal, unit) {
  const queue = [];
  const visited = new Set();
  queue.push({ point: start, path: [start] });
  visited.add(coordKey(start.x, start.y));

  while (queue.length > 0) {
    const current = queue.shift();
    if (current.point.x === goal.x && current.point.y === goal.y) {
      if (current.path.length > 1) {
        return current.path[1];
      }
      return null;
    }

    const neighbors = manhattanNeighbors(current.point);
    for (const neighbor of neighbors) {
      if (!isWithin(board, neighbor.x, neighbor.y)) {
        continue;
      }
      const key = coordKey(neighbor.x, neighbor.y);
      if (visited.has(key)) {
        continue;
      }
      const cell = getCell(board, neighbor.x, neighbor.y);
      if (!cell) {
        continue;
      }
      if (neighbor.x === goal.x && neighbor.y === goal.y) {
        queue.push({ point: neighbor, path: current.path.concat([neighbor]) });
        visited.add(key);
        continue;
      }
      if (!isTraversable(board, neighbor.x, neighbor.y)) {
        continue;
      }
      if (neighbor.x === state.fugitive.x && neighbor.y === state.fugitive.y) {
        continue;
      }
      const blockedByPolice = board.policeUnits.some((other) => other !== unit && other.position.x === neighbor.x && other.position.y === neighbor.y);
      if (blockedByPolice) {
        continue;
      }
      visited.add(key);
      queue.push({ point: neighbor, path: current.path.concat([neighbor]) });
    }
  }

  return null;
}

function checkVictory() {
  const cell = getCell(board, state.hostage.x, state.hostage.y);
  if (cell?.type === "safe") {
    state.gameState = "won";
    pushEvent(`Rescue complete in ${state.turns} turn${state.turns === 1 ? "" : "s"}.`);
    particleField.emitBurst(1.2);
    const tempoBudget = 40;
    const buffer = Math.max(0, tempoBudget - state.turns);
    highScore.submit(buffer, { turns: state.turns });
  }
}

const keyToVector = {
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
  w: { dx: 0, dy: -1 },
  s: { dx: 0, dy: 1 },
  a: { dx: -1, dy: 0 },
  d: { dx: 1, dy: 0 },
  W: { dx: 0, dy: -1 },
  S: { dx: 0, dy: 1 },
  A: { dx: -1, dy: 0 },
  D: { dx: 1, dy: 0 },
};

document.addEventListener("keydown", (event) => {
  if (keyToVector[event.key]) {
    event.preventDefault();
    const { dx, dy } = keyToVector[event.key];
    attemptMove(dx, dy);
  }
});

document.querySelectorAll(".dpad-button").forEach((button) => {
  button.addEventListener("click", () => {
    const move = button.dataset.move;
    if (!move) {
      return;
    }
    const [dx, dy] = move.split(",").map((value) => Number.parseInt(value, 10));
    if (Number.isFinite(dx) && Number.isFinite(dy)) {
      attemptMove(dx, dy);
    }
  });
});

forgeButton.addEventListener("click", () => {
  if (state.gameState !== "active") {
    return;
  }
  handleForge();
});

cutButton.addEventListener("click", () => {
  if (state.gameState !== "active") {
    return;
  }
  if (state.inventory.filingStones <= 0) {
    return;
  }
  cutNextLink();
});

distractionButton.addEventListener("click", () => {
  if (state.gameState !== "active") {
    return;
  }
  triggerDistraction();
});

resetButton.addEventListener("click", () => {
  resetGame();
});

resetGame();
