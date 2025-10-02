const GRID_WIDTH = 6;
const GRID_HEIGHT = 6;
const SHOP_COORD = { x: 2, y: 5 };

const mansions = [
  { id: "estate-luminari", label: "Estate Luminari", clue: "Wrap around the mirrored fountain before the caviar melts.", x: 5, y: 1 },
  { id: "copper-terrace", label: "Copper Terrace", clue: "Thread between the copper lanterns and avoid the garden party crowd.", x: 0, y: 2 },
  { id: "skyline-overlook", label: "Skyline Overlook", clue: "Climb the ridge and deliver to the rooftop patio with the city view.", x: 4, y: 0 },
  { id: "blue-awnings", label: "Blue Awnings", clue: "Hop the hedges and slide the pie under the blue-striped awning.", x: 0, y: 4 },
];

const orders = [
  { id: "estate-luminari", timer: 45, maxSteps: 8 },
  { id: "copper-terrace", timer: 45, maxSteps: 7 },
  { id: "skyline-overlook", timer: 50, maxSteps: 9 },
  { id: "blue-awnings", timer: 40, maxSteps: 6 },
];

const gridElement = document.getElementById("city-grid");
const statusText = document.getElementById("status-text");
const deliveredCount = document.getElementById("delivered-count");
const timerDisplay = document.getElementById("order-timer");
const jumpStatus = document.getElementById("jump-status");
const undoButton = document.getElementById("undo-step");
const resetButton = document.getElementById("reset-route");
const commitButton = document.getElementById("commit-route");
const queueElement = document.getElementById("order-queue");
const orderTemplate = document.getElementById("order-template");

const mansionLookup = new Map(mansions.map((mansion) => [mansion.id, mansion]));
const orderCards = new Map();
const cellLookup = new Map();

const occupiedNodes = new Set();
const occupiedEdges = new Set();

let activeOrderIndex = -1;
let activeOrder = null;
let activeTarget = null;
let acceptingInput = true;
let delivered = 0;
let timerId = null;
let remainingSeconds = 0;
let jumpUsed = false;
let jumpUsedThisRoute = false;

let currentPath = [];
let currentPathMetadata = [];
let highlightedKeys = [];

buildGrid();
renderOrderQueue();
startShift();

gridElement.addEventListener("click", handleCellClick);
undoButton.addEventListener("click", undoStep);
resetButton.addEventListener("click", clearCurrentRoute);
commitButton.addEventListener("click", commitRoute);

function buildGrid() {
  for (let y = 0; y < GRID_HEIGHT; y += 1) {
    for (let x = 0; x < GRID_WIDTH; x += 1) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "grid-cell";
      cell.dataset.x = String(x);
      cell.dataset.y = String(y);
      cell.setAttribute("aria-label", `Intersection ${x + 1},${GRID_HEIGHT - y}`);
      if (x === SHOP_COORD.x && y === SHOP_COORD.y) {
        cell.classList.add("is-shop");
        cell.innerHTML = '<span class="grid-label">Shop</span>';
      }
      const mansion = mansions.find((entry) => entry.x === x && entry.y === y);
      if (mansion) {
        const badge = document.createElement("span");
        badge.className = "grid-label";
        badge.textContent = mansion.label;
        cell.append(badge);
      }
      gridElement.append(cell);
      cellLookup.set(nodeKey({ x, y }), cell);
    }
  }
}

function renderOrderQueue() {
  mansions.forEach((mansion, index) => {
    const order = orders[index];
    const node = orderTemplate.content.cloneNode(true);
    const card = node.querySelector(".order-card");
    card.dataset.orderId = mansion.id;
    card.querySelector(".order-label").textContent = `${index + 1}. ${mansion.label}`;
    card.querySelector(".order-clue").textContent = mansion.clue;
    const timer = card.querySelector(".order-timer");
    timer.textContent = `${order.timer}s`;
    queueElement.append(card);
    orderCards.set(mansion.id, { element: card, timerElement: timer });
  });
}

function startShift() {
  occupiedNodes.clear();
  occupiedEdges.clear();
  jumpUsed = false;
  resetJumpStatus();
  delivered = 0;
  deliveredCount.textContent = `${delivered} / ${orders.length}`;
  timerDisplay.textContent = "--";
  clearCurrentRoute();
  cellLookup.forEach((cell) => {
    cell.classList.remove("has-trail", "is-target", "is-blocked");
    cell.dataset.disabled = "false";
  });
  orderCards.forEach(({ element, timerElement }, id) => {
    element.classList.remove("is-active", "is-complete");
    const order = orders.find((entry) => entry.id === id);
    timerElement.textContent = order ? `${order.timer}s` : "--";
  });
  stopTimer();
  acceptingInput = true;
  flashStatus("Tap the shop to launch the first delivery.", "");
  activateOrder(0);
}

function activateOrder(index) {
  if (index >= orders.length) {
    handleShiftComplete();
    return;
  }
  activeOrderIndex = index;
  activeOrder = orders[index];
  activeTarget = mansionLookup.get(activeOrder.id);
  orderCards.forEach(({ element }) => {
    element.classList.remove("is-active");
  });
  const card = orderCards.get(activeOrder.id);
  card?.element.classList.add("is-active");
  highlightTarget();
  clearCurrentRoute();
  remainingSeconds = activeOrder.timer;
  updateTimerDisplay();
  startTimer();
  flashStatus(`Route ${index + 1}: ${activeTarget.label} is waiting.`, "");
}

function highlightTarget() {
  cellLookup.forEach((cell) => cell.classList.remove("is-target"));
  if (!activeTarget) {
    return;
  }
  const targetCell = cellLookup.get(nodeKey(activeTarget));
  targetCell?.classList.add("is-target");
}

function startTimer() {
  stopTimer();
  timerId = window.setInterval(() => {
    remainingSeconds -= 1;
    updateTimerDisplay();
    if (remainingSeconds <= 0) {
      window.clearInterval(timerId);
      timerId = null;
      handleFailure("Order expired on the curb. Queue resetting.");
    }
  }, 1000);
}

function stopTimer() {
  if (timerId !== null) {
    window.clearInterval(timerId);
    timerId = null;
  }
}

function updateTimerDisplay() {
  if (!activeOrder) {
    timerDisplay.textContent = "--";
    return;
  }
  timerDisplay.textContent = `${Math.max(remainingSeconds, 0)}s`;
  const card = orderCards.get(activeOrder.id);
  if (card) {
    card.timerElement.textContent = `${Math.max(remainingSeconds, 0)}s`;
  }
}

function handleCellClick(event) {
  if (!acceptingInput || !activeOrder) {
    return;
  }
  const target = event.target.closest(".grid-cell");
  if (!target) {
    return;
  }
  const position = {
    x: Number(target.dataset.x),
    y: Number(target.dataset.y),
  };
  extendPath(position);
}

function extendPath(position) {
  if (currentPath.length === 0) {
    if (!positionsEqual(position, SHOP_COORD)) {
      flashStatus("Deliveries must launch from Amore Slices.", "flash-warning");
      return;
    }
    currentPath.push(position);
    updatePathHighlight();
    return;
  }

  const last = currentPath[currentPath.length - 1];
  if (!areAdjacent(last, position)) {
    flashStatus("Scooter moves one block at a time—only orthogonal turns allowed.", "flash-warning");
    return;
  }

  const key = nodeKey(position);
  const priorIndex = currentPath.findIndex((node) => node.x === position.x && node.y === position.y);
  if (priorIndex !== -1) {
    if (priorIndex === currentPath.length - 2) {
      undoStep();
    } else {
      flashStatus("Routes can't loop over themselves.", "flash-warning");
    }
    return;
  }

  const edge = edgeKey(last, position);
  const collidesEdge = occupiedEdges.has(edge);
  const collidesNode = occupiedNodes.has(key) && !positionsEqual(position, SHOP_COORD);
  if (collidesEdge || collidesNode) {
    if (jumpUsed || jumpUsedThisRoute) {
      flashStatus("That lane is already glowing—no room to squeeze by without a jump.", "flash-error");
      return;
    }
    jumpUsedThisRoute = true;
    flashStatus("Bike Jump engaged! You ghosted through a glowing trail.", "flash-success");
    updateJumpStatus();
  }

  currentPath.push(position);
  currentPathMetadata.push({ usedJump: collidesEdge || collidesNode });
  updatePathHighlight();
}

function undoStep() {
  if (currentPath.length === 0) {
    return;
  }
  const removed = currentPath.pop();
  if (currentPathMetadata.length > 0) {
    const meta = currentPathMetadata.pop();
    if (meta.usedJump) {
      jumpUsedThisRoute = false;
      flashStatus("Bike Jump charge restored—choose a cleaner lane.", "flash-warning");
      updateJumpStatus();
    }
  }
  if (currentPath.length === 0) {
    clearCurrentRoute();
    return;
  }
  updatePathHighlight();
}

function clearCurrentRoute() {
  currentPath = [];
  currentPathMetadata = [];
  jumpUsedThisRoute = false;
  updateJumpStatus();
  removePathHighlight();
}

function commitRoute() {
  if (!activeOrder || currentPath.length < 2) {
    flashStatus("Map a route from the shop to the mansion before delivering.", "flash-warning");
    return;
  }
  const destination = currentPath[currentPath.length - 1];
  if (!positionsEqual(destination, activeTarget)) {
    flashStatus(`This trail ends at the wrong address—aim for ${activeTarget.label}.`, "flash-error");
    return;
  }
  const stepCount = currentPath.length - 1;
  if (stepCount > activeOrder.maxSteps) {
    flashStatus("Too many blocks! Reroute with fewer turns.", "flash-error");
    return;
  }
  if (jumpUsed && jumpUsedThisRoute) {
    flashStatus("Bike Jump already spent earlier—no extra charge to burn.", "flash-error");
    return;
  }

  finalizeRoute();
}

function finalizeRoute() {
  stopTimer();
  for (let i = 1; i < currentPath.length; i += 1) {
    const prev = currentPath[i - 1];
    const next = currentPath[i];
    const edge = edgeKey(prev, next);
    occupiedEdges.add(edge);
    const nextKey = nodeKey(next);
    if (!positionsEqual(next, SHOP_COORD)) {
      occupiedNodes.add(nextKey);
    }
  }
  currentPath.forEach((node) => {
    const cell = cellLookup.get(nodeKey(node));
    cell?.classList.add("has-trail");
  });
  const card = orderCards.get(activeOrder.id);
  if (card) {
    card.element.classList.remove("is-active");
    card.element.classList.add("is-complete");
    card.timerElement.textContent = "Delivered";
  }
  delivered += 1;
  deliveredCount.textContent = `${delivered} / ${orders.length}`;
  if (jumpUsedThisRoute) {
    jumpUsed = true;
  }
  jumpUsedThisRoute = false;
  updateJumpStatus();
  flashStatus(`${activeTarget.label} enjoyed the pie!`, "flash-success");
  clearCurrentRoute();
  window.setTimeout(() => {
    activateOrder(activeOrderIndex + 1);
  }, 600);
}

function handleShiftComplete() {
  flashStatus("Shift complete! Every mansion is satisfied.", "flash-success");
  stopTimer();
  acceptingInput = false;
  window.setTimeout(() => {
    acceptingInput = true;
    startShift();
  }, 3200);
}

function handleFailure(message) {
  stopTimer();
  flashStatus(message, "flash-error");
  acceptingInput = false;
  window.setTimeout(() => {
    acceptingInput = true;
    startShift();
  }, 2000);
}

function updatePathHighlight() {
  removePathHighlight();
  highlightedKeys = currentPath.map((node) => nodeKey(node));
  highlightedKeys.forEach((key) => {
    const cell = cellLookup.get(key);
    if (cell) {
      cell.classList.add("is-path");
    }
  });
}

function removePathHighlight() {
  highlightedKeys.forEach((key) => {
    const cell = cellLookup.get(key);
    cell?.classList.remove("is-path");
  });
  highlightedKeys = [];
}

function updateJumpStatus() {
  if (jumpUsed || jumpUsedThisRoute) {
    jumpStatus.textContent = jumpUsed ? "Spent" : "Engaged";
  } else {
    jumpStatus.textContent = "Ready";
  }
}

function resetJumpStatus() {
  jumpStatus.textContent = "Ready";
}

function flashStatus(message, toneClass) {
  statusText.classList.remove("flash-success", "flash-warning", "flash-error");
  if (toneClass) {
    statusText.classList.add(toneClass);
  }
  statusText.textContent = message;
}

function nodeKey(node) {
  return `${node.x},${node.y}`;
}

function edgeKey(a, b) {
  if (a.x === b.x && a.y === b.y) {
    return `${a.x},${a.y}`;
  }
  const forward = `${a.x},${a.y}|${b.x},${b.y}`;
  const reverse = `${b.x},${b.y}|${a.x},${a.y}`;
  return forward < reverse ? forward : reverse;
}

function areAdjacent(a, b) {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
}

function positionsEqual(a, b) {
  return a.x === b.x && a.y === b.y;
}
