import { mountParticleField } from "../particles.js";

mountParticleField();

const boardSize = 6;
const shop = { row: 2, col: 0, label: "Hub", name: "Amore Slices dispatch" };
const houses = [
  { id: "mansion-03", row: 0, col: 2, label: "03", name: "Vista Loop No. 03", note: "Observatory Terrace" },
  { id: "mansion-08", row: 5, col: 1, label: "08", name: "Arcade Bend No. 08", note: "Atrium Statuary" },
  { id: "mansion-12", row: 1, col: 5, label: "12", name: "Fountain Crest No. 12", note: "Champagne Veranda" },
  { id: "mansion-19", row: 3, col: 5, label: "19", name: "Terrace Lane No. 19", note: "Skybridge Loft" },
  { id: "mansion-27", row: 4, col: 4, label: "27", name: "Harbor View No. 27", note: "Pool Pavilion" },
];

const orderSchedule = [
  { id: "order-01", houseId: "mansion-08", pizza: "Fig & Ricotta Serenade", duration: 24 },
  { id: "order-02", houseId: "mansion-12", pizza: "Champagne Basil Fold", duration: 22 },
  { id: "order-03", houseId: "mansion-27", pizza: "Truffle Triad Supreme", duration: 24 },
  { id: "order-04", houseId: "mansion-03", pizza: "Saffron Skyline Slice", duration: 20 },
  { id: "order-05", houseId: "mansion-19", pizza: "Garden Midnight Pie", duration: 24 },
  { id: "order-06", houseId: "mansion-27", pizza: "After Hours Calzone", duration: 20 },
  { id: "order-07", houseId: "mansion-12", pizza: "VIP Tuxedo Square", duration: 18 },
];

const boardElement = document.getElementById("delivery-board");
const orderList = document.getElementById("order-list");
const statusReadout = document.getElementById("status-readout");
const startButton = document.getElementById("start-shift");
const endButton = document.getElementById("end-shift");
const clearPathButton = document.getElementById("clear-path");
const eventList = document.getElementById("event-list");
const deliveredCountLabel = document.getElementById("delivered-count");
const jumpStatus = document.querySelector(".jump-status");
const jumpStatusText = document.getElementById("jump-status-text");
const queueMeter = document.getElementById("queue-meter");
const queueMeterFill = document.getElementById("queue-meter-fill");
const queueMeterValue = document.getElementById("queue-meter-value");

const housesById = new Map(houses.map((house) => [house.id, house]));
const nodeLookup = new Map();

let trails = [];
let usedEdges = new Set();
let activeSegments = [];
let activePath = [];
let activeOrders = [];
let scheduleIndex = 0;
let selectedOrderId = null;
let deliveredCount = 0;
let bikeJumpCharges = 1;
let shiftActive = false;
let jumpUsedThisRoute = false;
let tickTimer = null;

const overlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
overlay.classList.add("trail-overlay");
boardElement.append(overlay);

buildBoard();
renderTrails();
updateJumpStatus();
updateStatus("Awaiting shift.");

startButton.addEventListener("click", () => {
  if (shiftActive) {
    return;
  }
  startShift();
});

endButton.addEventListener("click", () => {
  if (!shiftActive) {
    return;
  }
  endShift(false, "Shift closed early. The queue will reset.");
});

clearPathButton.addEventListener("click", () => {
  if (!shiftActive) {
    return;
  }
  clearActivePath();
  updateStatus("Path cleared. Reroute from the hub.");
});

orderList.addEventListener("click", (event) => {
  const button = event.target.closest(".route-button");
  if (!button) {
    return;
  }
  const { orderId } = button.dataset;
  if (!orderId) {
    return;
  }
  setSelectedOrder(orderId);
});

boardElement.addEventListener("click", (event) => {
  if (!shiftActive) {
    return;
  }
  const button = event.target.closest(".intersection");
  if (!button) {
    return;
  }
  const row = Number.parseInt(button.dataset.row, 10);
  const col = Number.parseInt(button.dataset.col, 10);
  const position = { row, col };

  if (!selectedOrderId) {
    updateStatus("Select an order before plotting a route.");
    return;
  }

  const target = getTargetHouse();
  if (!target) {
    updateStatus("The chosen order no longer exists.");
    return;
  }

  if (activePath.length === 0) {
    if (!positionsEqual(position, shop)) {
      updateStatus("Start at the Amore Slices hub.");
      return;
    }
    activePath.push(position);
    button.classList.add("is-active");
    updateClearPathState();
    renderTrails();
    return;
  }

  const lastPosition = activePath[activePath.length - 1];
  if (positionsEqual(lastPosition, position)) {
    return;
  }

  if (!isAdjacent(lastPosition, position)) {
    triggerTrafficJam("Scooters can only move to adjacent intersections.");
    return;
  }

  const segmentKey = edgeKey(lastPosition, position);
  const segment = { from: lastPosition, to: position };

  if (usedEdges.has(segmentKey)) {
    if (bikeJumpCharges > 0 && !jumpUsedThisRoute) {
      bikeJumpCharges = 0;
      jumpUsedThisRoute = true;
      logEvent("Bike Jump deployed to glide across a locked trail.");
      updateJumpStatus();
    } else {
      triggerTrafficJam("Crossed an existing trail and triggered a traffic jam.");
      return;
    }
  }

  activeSegments.push(segment);

  activePath.push(position);
  button.classList.add("is-active");
  renderTrails();
  updateClearPathState();

  if (positionsEqual(position, target)) {
    finalizeRoute();
  }
});

window.addEventListener("resize", () => {
  renderTrails();
});

function buildBoard() {
  for (let row = 0; row < boardSize; row += 1) {
    for (let col = 0; col < boardSize; col += 1) {
      const key = positionKey({ row, col });
      const button = document.createElement("button");
      button.type = "button";
      button.className = "intersection";
      button.dataset.row = String(row);
      button.dataset.col = String(col);
      button.setAttribute("aria-label", `Intersection ${row + 1}, ${col + 1}`);

      if (positionsEqual({ row, col }, shop)) {
        button.classList.add("shop");
        button.textContent = shop.label;
        button.setAttribute("aria-label", `${shop.name} hub`);
      } else {
        const house = houses.find((item) => item.row === row && item.col === col);
        if (house) {
          button.classList.add("mansion");
          button.textContent = house.label;
          button.setAttribute("aria-label", `${house.name} — ${house.note}`);
        }
      }

      boardElement.append(button);
      nodeLookup.set(key, button);
    }
  }
}

function startShift() {
  resetShiftState();
  shiftActive = true;
  logEvent("Shift started. Orders are dialing in.");
  updateStatus("Shift in motion. Select an order and chart a path.");
  startButton.disabled = true;
  endButton.disabled = false;
  clearPathButton.disabled = true;
  enqueueOrders();
  if (activeOrders.length > 0) {
    setSelectedOrder(activeOrders[0].id);
  }
  tickTimer = window.setInterval(handleTick, 1000);
  handleTick();
}

function resetShiftState() {
  clearActivePath();
  trails = [];
  usedEdges = new Set();
  activeOrders = [];
  scheduleIndex = 0;
  deliveredCount = 0;
  bikeJumpCharges = 1;
  jumpUsedThisRoute = false;
  selectedOrderId = null;
  shiftActive = false;
  window.clearInterval(tickTimer);
  tickTimer = null;
  Array.from(nodeLookup.values()).forEach((node) => {
    node.classList.remove("is-active", "is-target");
  });
  renderTrails();
  updateJumpStatus();
  updateDeliveredCount();
  queueMeterFill.style.width = "100%";
  queueMeterValue.textContent = "100";
  queueMeter.setAttribute("aria-valuenow", "100");
  orderList.innerHTML = "";
  eventList.innerHTML = "";
}

function enqueueOrders() {
  const maxActive = 3;
  while (activeOrders.length < maxActive && scheduleIndex < orderSchedule.length) {
    const template = orderSchedule[scheduleIndex];
    scheduleIndex += 1;
    const order = {
      id: template.id,
      houseId: template.houseId,
      pizza: template.pizza,
      duration: template.duration,
      remaining: template.duration,
    };
    activeOrders.push(order);
    const house = housesById.get(order.houseId);
    if (house) {
      logEvent(`Order queued: ${house.name} requests the ${order.pizza}.`);
    } else {
      logEvent("An unknown address placed an order.");
    }
  }
  renderOrders();
  updateQueueMeter();
}

function handleTick() {
  if (!shiftActive) {
    return;
  }

  let jammedOrder = null;
  activeOrders.forEach((order) => {
    order.remaining = Math.max(0, order.remaining - 1);
    if (order.remaining === 0 && !jammedOrder) {
      jammedOrder = order;
    }
  });

  renderOrders();
  updateQueueMeter();

  if (jammedOrder) {
    const house = housesById.get(jammedOrder.houseId);
    const name = house ? house.name : "a client";
    triggerTrafficJam(`${name}'s timer expired.`);
  }
}

function renderOrders() {
  orderList.innerHTML = "";
  activeOrders.forEach((order) => {
    const house = housesById.get(order.houseId);
    const item = document.createElement("li");
    item.className = "order-card";
    if (order.id === selectedOrderId) {
      item.classList.add("is-selected");
    }

    const heading = document.createElement("div");
    heading.className = "order-heading";
    const title = document.createElement("strong");
    title.textContent = house ? house.name : "Unknown Client";
    const badge = document.createElement("span");
    badge.textContent = order.id.replace("order-", "#");
    heading.append(title, badge);

    const detail = document.createElement("div");
    detail.className = "order-detail";
    detail.textContent = order.pizza;

    const timerRow = document.createElement("div");
    timerRow.className = "timer-row";
    const timerValue = document.createElement("span");
    timerValue.className = "timer-value";
    timerValue.textContent = `${order.remaining}s`;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "route-button";
    button.dataset.orderId = order.id;
    button.textContent = order.id === selectedOrderId ? "Routing" : "Route";
    if (order.id === selectedOrderId) {
      button.disabled = true;
    }
    timerRow.append(timerValue, button);

    item.append(heading, detail, timerRow);
    orderList.append(item);
  });
}

function setSelectedOrder(orderId) {
  const order = activeOrders.find((item) => item.id === orderId);
  if (!order) {
    updateStatus("That order is no longer active.");
    return;
  }
  selectedOrderId = orderId;
  logEvent(`Routing ${orderId} — keep it hot.`);
  highlightTarget(order.houseId);
  clearActivePath();
  renderOrders();
  updateStatus("Start from the hub and reach the highlighted mansion.");
}

function highlightTarget(houseId) {
  Array.from(nodeLookup.values()).forEach((node) => node.classList.remove("is-target"));
  const house = housesById.get(houseId);
  if (!house) {
    return;
  }
  const key = positionKey(house);
  const node = nodeLookup.get(key);
  node?.classList.add("is-target");
}

function getTargetHouse() {
  if (!selectedOrderId) {
    return null;
  }
  const order = activeOrders.find((item) => item.id === selectedOrderId);
  if (!order) {
    return null;
  }
  return housesById.get(order.houseId) ?? null;
}

function finalizeRoute() {
  const order = activeOrders.find((item) => item.id === selectedOrderId);
  if (!order) {
    updateStatus("The selected order vanished.");
    return;
  }

  if (activePath.length < 2) {
    updateStatus("Extend the trail beyond the hub.");
    return;
  }

  const newSegments = [];
  let collision = false;

  for (let index = 1; index < activePath.length; index += 1) {
    const from = activePath[index - 1];
    const to = activePath[index];
    const key = edgeKey(from, to);
    if (usedEdges.has(key)) {
      collision = true;
    } else {
      newSegments.push({ from, to });
    }
  }

  if (collision && bikeJumpCharges === 0 && !jumpUsedThisRoute) {
    triggerTrafficJam("Route overlapped an existing trail.");
    return;
  }

  newSegments.forEach((segment) => {
    usedEdges.add(edgeKey(segment.from, segment.to));
    trails.push(segment);
  });

  deliveredCount += 1;
  updateDeliveredCount();
  logEvent(`Delivered ${order.pizza} to ${housesById.get(order.houseId)?.name ?? "a client"}.`);
  updateStatus("Delivery locked in. Queue up the next order.");

  activeOrders = activeOrders.filter((item) => item.id !== order.id);
  selectedOrderId = null;
  jumpUsedThisRoute = false;
  clearActivePath(true);
  highlightTarget(null);
  renderOrders();
  updateQueueMeter();
  enqueueOrders();

  if (activeOrders.length === 0 && scheduleIndex >= orderSchedule.length) {
    endShift(true, "All scheduled clients served. Night complete.");
  } else if (activeOrders.length > 0) {
    setSelectedOrder(activeOrders[0].id);
  }
}

function triggerTrafficJam(reason) {
  endShift(false, `Traffic jam! ${reason}`);
}

function endShift(success, message) {
  if (!shiftActive && !success) {
    resetShiftState();
    updateStatus(message);
    return;
  }
  shiftActive = false;
  window.clearInterval(tickTimer);
  tickTimer = null;
  startButton.disabled = false;
  endButton.disabled = true;
  clearPathButton.disabled = true;
  selectedOrderId = null;
  clearActivePath();
  highlightTarget(null);
  updateStatus(message);
  if (!success) {
    activeOrders = [];
    orderList.innerHTML = "";
    updateQueueMeter();
    logEvent(message);
  } else {
    logEvent("Shift cleared with every order delivered.");
  }
}

function clearActivePath(keepJumpState = false) {
  activePath.forEach((position) => {
    const key = positionKey(position);
    const node = nodeLookup.get(key);
    node?.classList.remove("is-active");
  });
  activePath = [];
  activeSegments = [];
  if (!keepJumpState) {
    jumpUsedThisRoute = false;
  }
  renderTrails();
  updateClearPathState();
}

function renderTrails() {
  const rect = boardElement.getBoundingClientRect();
  overlay.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
  overlay.setAttribute("width", String(rect.width));
  overlay.setAttribute("height", String(rect.height));
  while (overlay.firstChild) {
    overlay.removeChild(overlay.firstChild);
  }

  const drawSegment = (segment, className) => {
    const fromNode = nodeLookup.get(positionKey(segment.from));
    const toNode = nodeLookup.get(positionKey(segment.to));
    if (!fromNode || !toNode) {
      return;
    }
    const fromRect = fromNode.getBoundingClientRect();
    const toRect = toNode.getBoundingClientRect();
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(fromRect.left - rect.left + fromRect.width / 2));
    line.setAttribute("y1", String(fromRect.top - rect.top + fromRect.height / 2));
    line.setAttribute("x2", String(toRect.left - rect.left + toRect.width / 2));
    line.setAttribute("y2", String(toRect.top - rect.top + toRect.height / 2));
    line.classList.add(className);
    overlay.append(line);
  };

  trails.forEach((segment) => drawSegment(segment, "trail-line"));
  activeSegments.forEach((segment) => drawSegment(segment, "active-line"));
}

function updateJumpStatus() {
  if (bikeJumpCharges > 0) {
    jumpStatus.classList.add("ready");
    jumpStatus.classList.remove("spent");
    jumpStatusText.textContent = "Charge ready. You may vault one locked trail this shift.";
  } else {
    jumpStatus.classList.remove("ready");
    jumpStatus.classList.add("spent");
    jumpStatusText.textContent = "Charge spent. Future routes must avoid every glowing trail.";
  }
}

function updateDeliveredCount() {
  deliveredCountLabel.textContent = `${deliveredCount} delivered`;
}

function updateStatus(message) {
  statusReadout.textContent = message;
}

function updateQueueMeter() {
  if (activeOrders.length === 0) {
    queueMeterFill.style.width = "100%";
    queueMeterValue.textContent = "100";
    queueMeter.setAttribute("aria-valuenow", "100");
    return;
  }
  let lowest = 100;
  activeOrders.forEach((order) => {
    const percent = Math.round((order.remaining / order.duration) * 100);
    lowest = Math.min(lowest, percent);
  });
  queueMeterFill.style.width = `${lowest}%`;
  queueMeterValue.textContent = String(lowest);
  queueMeter.setAttribute("aria-valuenow", String(lowest));
}

function logEvent(message) {
  const item = document.createElement("li");
  item.textContent = message;
  eventList.prepend(item);
  while (eventList.children.length > 8) {
    eventList.removeChild(eventList.lastChild);
  }
}

function updateClearPathState() {
  clearPathButton.disabled = activePath.length === 0;
}

function positionKey(position) {
  return `${position.row},${position.col}`;
}

function positionsEqual(a, b) {
  return a.row === b.row && a.col === b.col;
}

function isAdjacent(a, b) {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

function edgeKey(a, b) {
  const first = a.row < b.row || (a.row === b.row && a.col <= b.col) ? a : b;
  const second = first === a ? b : a;
  return `${first.row},${first.col}|${second.row},${second.col}`;
}

