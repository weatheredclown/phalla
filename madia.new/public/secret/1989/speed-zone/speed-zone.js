const svgNS = "http://www.w3.org/2000/svg";

const nodes = [
  { id: "sunset-gate", name: "Sunset Gate", x: 60, y: 280, type: "start" },
  { id: "mesa-canyon", name: "Mesa Canyon", x: 120, y: 310, type: "hazard-blowout", hazard: "blowout" },
  { id: "silver-city", name: "Silver City", x: 180, y: 210, type: "checkpoint" },
  { id: "sierra-rest", name: "Sky Mesa", x: 220, y: 270, type: "rest" },
  { id: "ridge-patrol", name: "Ridge Patrol", x: 260, y: 150, type: "hazard-sirens", hazard: "sirens" },
  { id: "mile-high", name: "Mile High", x: 310, y: 120, type: "checkpoint" },
  { id: "switchback", name: "Switchback 95", x: 340, y: 220, type: "hazard-blowout", hazard: "blowout" },
  { id: "prairie-rest", name: "Prairie Diner", x: 360, y: 280, type: "rest" },
  { id: "heartland", name: "Heartland Hub", x: 400, y: 200, type: "checkpoint" },
  { id: "toll-plaza", name: "Toll Plaza 214", x: 450, y: 240, type: "hazard-toll", hazard: "toll" },
  { id: "bayou-slide", name: "Bayou Slide", x: 480, y: 300, type: "hazard-sirens", hazard: "sirens" },
  { id: "shoreline", name: "Shoreline Motel", x: 530, y: 250, type: "rest" },
  { id: "neon-pier", name: "Neon Pier", x: 540, y: 160, type: "checkpoint" },
];

const edges = [
  ["sunset-gate", "mesa-canyon"],
  ["sunset-gate", "silver-city"],
  ["mesa-canyon", "silver-city"],
  ["mesa-canyon", "sierra-rest"],
  ["silver-city", "sierra-rest"],
  ["silver-city", "ridge-patrol"],
  ["sierra-rest", "ridge-patrol"],
  ["ridge-patrol", "mile-high"],
  ["mile-high", "switchback"],
  ["mile-high", "heartland"],
  ["switchback", "heartland"],
  ["switchback", "prairie-rest"],
  ["prairie-rest", "heartland"],
  ["heartland", "toll-plaza"],
  ["prairie-rest", "toll-plaza"],
  ["toll-plaza", "bayou-slide"],
  ["toll-plaza", "neon-pier"],
  ["bayou-slide", "shoreline"],
  ["neon-pier", "shoreline"],
];

const checkpoints = ["silver-city", "mile-high", "heartland", "neon-pier"];

const diceFaces = [
  {
    id: "overdrive",
    title: "Overdrive",
    movement: 5,
    hazard: "sirens",
    hazardLabel: "Siren Sweep",
    riskLevel: "danger",
    penalty: 8,
    description: "Five-step surge. Patrol scanners spike and siren nodes flare bright red.",
  },
  {
    id: "redline",
    title: "Redline",
    movement: 4,
    hazard: "blowout",
    hazardLabel: "Blowout Risk",
    riskLevel: "danger",
    penalty: 7,
    description: "Four-step push that stresses your treads across blowout nodes.",
  },
  {
    id: "backroad",
    title: "Backroad",
    movement: 3,
    hazard: "toll",
    hazardLabel: "Toll Trap",
    riskLevel: "alert",
    penalty: 5,
    description: "Three steps of side routes as toll agents set up shakedowns.",
  },
  {
    id: "slipstream",
    title: "Slipstream",
    movement: 4,
    hazard: "clear",
    hazardLabel: "Clear Skies",
    riskLevel: "steady",
    penalty: 0,
    description: "Four clean steps riding the wake of a long-haul convoy.",
  },
  {
    id: "draftline",
    title: "Draftline",
    movement: 3,
    hazard: "clear",
    hazardLabel: "Quiet Band",
    riskLevel: "steady",
    penalty: 0,
    description: "Three-step cruise while the scanners go quiet.",
  },
  {
    id: "scanner",
    title: "Scanner Ping",
    movement: 2,
    hazard: "sirens",
    hazardLabel: "Scanner Echo",
    riskLevel: "alert",
    penalty: 6,
    description: "Short hop, but the police band lights up nearby siren nodes.",
  },
];

const hazardSets = nodes.reduce((acc, node) => {
  if (node.hazard) {
    if (!acc[node.hazard]) {
      acc[node.hazard] = new Set();
    }
    acc[node.hazard].add(node.id);
  }
  return acc;
}, {});

const adjacency = new Map();
edges.forEach(([a, b]) => {
  if (!adjacency.has(a)) {
    adjacency.set(a, new Set());
  }
  if (!adjacency.has(b)) {
    adjacency.set(b, new Set());
  }
  adjacency.get(a).add(b);
  adjacency.get(b).add(a);
});

const svg = document.getElementById("route-map");
const rollButton = document.getElementById("roll-button");
const commitButton = document.getElementById("commit-button");
const undoButton = document.getElementById("undo-button");
const bypassButton = document.getElementById("bypass-button");
const checkpointReadout = document.getElementById("checkpoint-readout");
const diceReadout = document.getElementById("dice-readout");
const eventList = document.getElementById("event-list");
const heatFill = document.getElementById("heat-fill");
const heatValue = document.getElementById("heat-value");
const heatMeter = document.getElementById("heat-meter");

const nodesById = new Map();
const nodeElements = new Map();
const edgeElements = new Map();

let currentNode = "sunset-gate";
let plannedRoute = [];
let currentRoll = null;
let heat = 10;
const heatMax = 30;
let checkpointIndex = 0;
let bypassAvailable = true;
let consecutiveDanger = 0;
let safeStreak = 0;

function makeEdgeKey(a, b) {
  return [a, b].sort().join("::");
}

function drawMap() {
  nodes.forEach((node) => nodesById.set(node.id, node));

  edges.forEach(([a, b]) => {
    const nodeA = nodesById.get(a);
    const nodeB = nodesById.get(b);
    const line = document.createElementNS(svgNS, "line");
    line.classList.add("route-edge");
    line.setAttribute("x1", nodeA.x);
    line.setAttribute("y1", nodeA.y);
    line.setAttribute("x2", nodeB.x);
    line.setAttribute("y2", nodeB.y);
    svg.appendChild(line);
    edgeElements.set(makeEdgeKey(a, b), line);
  });

  nodes.forEach((node) => {
    const group = document.createElementNS(svgNS, "g");
    group.classList.add("route-node");
    group.dataset.id = node.id;
    group.dataset.type = node.type;
    group.setAttribute("tabindex", "0");
    group.setAttribute("role", "button");
    group.setAttribute("aria-label", `${node.name} waypoint`);

    const circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("cx", node.x);
    circle.setAttribute("cy", node.y);
    circle.setAttribute("r", "12");
    group.appendChild(circle);

    const text = document.createElementNS(svgNS, "text");
    text.setAttribute("x", node.x);
    text.setAttribute("y", node.y + 16);
    text.textContent = node.name;
    group.appendChild(text);

    group.addEventListener("click", () => handleNodeSelect(node.id));
    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleNodeSelect(node.id);
      }
    });

    svg.appendChild(group);
    nodeElements.set(node.id, group);
  });

  updateCurrentNode();
}

function updateCurrentNode() {
  nodeElements.forEach((group) => {
    if (group.dataset.id === currentNode) {
      group.dataset.current = "true";
    } else {
      delete group.dataset.current;
    }
  });
}

function logEvent(message) {
  const entry = document.createElement("li");
  entry.textContent = message;
  eventList.prepend(entry);
  while (eventList.children.length > 8) {
    eventList.removeChild(eventList.lastElementChild);
  }
}

function updateCheckpointReadout() {
  if (checkpointIndex >= checkpoints.length) {
    checkpointReadout.textContent = "All checkpoints cleared. Coast into Neon Pier.";
  } else {
    const nextId = checkpoints[checkpointIndex];
    const nextName = nodesById.get(nextId).name;
    checkpointReadout.textContent = `Next checkpoint: ${nextName}`;
  }
}

function updateHeatDisplay() {
  const percent = Math.min(100, (heat / heatMax) * 100);
  heatFill.style.width = `${percent}%`;
  heatValue.textContent = heat;
  heatMeter.setAttribute("aria-valuenow", String(heat));
}

function clearPlanning() {
  plannedRoute = [];
  nodeElements.forEach((group) => {
    delete group.dataset.selected;
    delete group.dataset.active;
  });
  edgeElements.forEach((edge) => edge.classList.remove("active"));
  undoButton.disabled = true;
  commitButton.disabled = true;
}

function highlightHazards(hazard) {
  nodeElements.forEach((group) => delete group.dataset.hazard);
  if (!hazard || hazard === "clear") {
    return;
  }
  const hazardNodes = hazardSets[hazard];
  if (!hazardNodes) {
    return;
  }
  hazardNodes.forEach((nodeId) => {
    const group = nodeElements.get(nodeId);
    if (group) {
      group.dataset.hazard = "lit";
    }
  });
}

function updateDiceReadout(face) {
  if (!face) {
    diceReadout.textContent = "Waiting for the first roll.";
    return;
  }
  const hazardText = face.hazard === "clear" ? "No hazards this surge." : `${face.hazardLabel} ignites matching nodes.`;
  diceReadout.textContent = `${face.title}: ${face.movement} movement. ${hazardText}`;
}

function updateSelectableNodes() {
  nodeElements.forEach((group) => {
    if (group.dataset.id !== currentNode) {
      delete group.dataset.active;
    }
  });
  if (!currentRoll) {
    return;
  }
  const base = plannedRoute.length > 0 ? plannedRoute[plannedRoute.length - 1] : currentNode;
  const neighbors = adjacency.get(base) ?? new Set();
  neighbors.forEach((neighbor) => {
    if (neighbor === currentNode) {
      return;
    }
    if (plannedRoute.includes(neighbor)) {
      return;
    }
    const element = nodeElements.get(neighbor);
    if (element) {
      element.dataset.active = "true";
    }
  });
}

function handleNodeSelect(nodeId) {
  if (!currentRoll) {
    return;
  }
  const base = plannedRoute.length > 0 ? plannedRoute[plannedRoute.length - 1] : currentNode;
  if (!adjacency.get(base)?.has(nodeId)) {
    return;
  }
  if (nodeId === currentNode) {
    return;
  }
  if (plannedRoute.includes(nodeId)) {
    return;
  }
  if (plannedRoute.length >= currentRoll.movement) {
    return;
  }

  plannedRoute.push(nodeId);
  const element = nodeElements.get(nodeId);
  if (element) {
    element.dataset.selected = "true";
  }
  const edge = edgeElements.get(makeEdgeKey(base, nodeId));
  edge?.classList.add("active");

  const stepsRemaining = currentRoll.movement - plannedRoute.length;
  if (stepsRemaining === 0) {
    commitButton.disabled = false;
    diceReadout.textContent = `${currentRoll.title}: Route locked to ${nodesById.get(nodeId).name}. Commit to surge.`;
  } else {
    commitButton.disabled = true;
    diceReadout.textContent = `${currentRoll.title}: ${stepsRemaining} movement left.`;
  }
  undoButton.disabled = false;
  updateSelectableNodes();
}

function undoStep() {
  if (plannedRoute.length === 0) {
    return;
  }
  const removed = plannedRoute.pop();
  const element = nodeElements.get(removed);
  if (element) {
    delete element.dataset.selected;
  }
  const base = plannedRoute.length > 0 ? plannedRoute[plannedRoute.length - 1] : currentNode;
  const edge = edgeElements.get(makeEdgeKey(base, removed));
  edge?.classList.remove("active");
  const stepsRemaining = currentRoll ? currentRoll.movement - plannedRoute.length : 0;
  if (currentRoll) {
    if (stepsRemaining === currentRoll.movement) {
      diceReadout.textContent = `${currentRoll.title}: ${currentRoll.movement} movement ready.`;
    } else {
      diceReadout.textContent = `${currentRoll.title}: ${stepsRemaining} movement left.`;
    }
  }
  commitButton.disabled = true;
  if (plannedRoute.length === 0) {
    undoButton.disabled = true;
  }
  updateSelectableNodes();
}

function adjustHeat(amount) {
  heat = Math.min(heatMax, Math.max(0, heat + amount));
  updateHeatDisplay();
  if (heat >= heatMax) {
    endRun(false);
    return true;
  }
  return false;
}

function resolveRoute() {
  if (!currentRoll || plannedRoute.length !== currentRoll.movement) {
    return;
  }

  const visited = [...plannedRoute];
  const finalNode = visited[visited.length - 1];
  const face = currentRoll;
  currentRoll = null;
  plannedRoute = [];
  rollButton.disabled = false;
  commitButton.disabled = true;
  undoButton.disabled = true;

  highlightHazards(null);
  nodeElements.forEach((group) => delete group.dataset.active);

  let hazardTriggered = false;
  if (face.hazard !== "clear") {
    const hazardNodes = hazardSets[face.hazard];
    if (hazardNodes?.has(finalNode)) {
      hazardTriggered = true;
    }
  }

  visited.forEach((nodeId, index) => {
    const prev = index === 0 ? currentNode : visited[index - 1];
    edgeElements.get(makeEdgeKey(prev, nodeId))?.classList.remove("active");
    const element = nodeElements.get(nodeId);
    if (element) {
      delete element.dataset.selected;
    }
  });

  currentNode = finalNode;
  updateCurrentNode();

  const finalName = nodesById.get(finalNode).name;
  if (hazardTriggered) {
    const penalty = face.penalty || 6;
    const ended = adjustHeat(penalty);
    logEvent(`⚠️ ${face.hazardLabel} clamps down at ${finalName}. Heat +${penalty}.`);
    if (ended) {
      return;
    }
  } else {
    adjustHeat(-1);
    logEvent(`✅ Clean run into ${finalName}. Heat -1.`);
  }

  const finalNodeData = nodesById.get(finalNode);
  if (finalNodeData?.type === "rest") {
    adjustHeat(-5);
    logEvent(`🛠️ Crew cools off at ${finalNodeData.name}. Heat -5.`);
  }

  while (checkpointIndex < checkpoints.length && visited.includes(checkpoints[checkpointIndex])) {
    const clearedId = checkpoints[checkpointIndex];
    const clearedName = nodesById.get(clearedId).name;
    checkpointIndex += 1;
    adjustHeat(-4);
    logEvent(`🏁 Cleared ${clearedName}. Heat -4.`);
  }

  updateCheckpointReadout();

  if (checkpointIndex >= checkpoints.length) {
    logEvent("🎉 All checkpoints cleared. Neon Pier throws a midnight fireworks show!");
    endRun(true);
    return;
  }

  diceReadout.textContent = "Route committed. Roll again to keep the run alive.";
}

function endRun(success) {
  rollButton.disabled = true;
  commitButton.disabled = true;
  undoButton.disabled = true;
  if (success) {
    diceReadout.textContent = "Run complete. The crew celebrates at Neon Pier.";
  } else {
    diceReadout.textContent = "Heat maxed out. Federal sting ends the run.";
    logEvent("🚨 The Heat maxed out. Cross-country sting shuts down the convoy.");
  }
}

function triggerBypass() {
  if (!bypassAvailable) {
    return;
  }
  bypassAvailable = false;
  bypassButton.disabled = true;
  bypassButton.textContent = "Bypass Spent";
  if (checkpointIndex < checkpoints.length) {
    const skipped = nodesById.get(checkpoints[checkpointIndex]).name;
    checkpointIndex += 1;
    logEvent(`🪄 Bypass actuation burns ${skipped}. Next checkpoint auto-cleared.`);
    updateCheckpointReadout();
  }
  if (checkpointIndex >= checkpoints.length) {
    clearPlanning();
    highlightHazards(null);
    currentRoll = null;
    logEvent("🎉 Bypass rockets the crew straight into Neon Pier. Run complete.");
    endRun(true);
    return;
  }
  if (currentRoll) {
    logEvent("♻️ Surge cancelled. Risk icons reshuffle for the next roll.");
    currentRoll = null;
    clearPlanning();
    highlightHazards(null);
    rollButton.disabled = false;
  }
  diceReadout.textContent = "Bypass triggered. Roll anew with shuffled risks.";
}

function rollDice() {
  if (currentRoll) {
    return;
  }
  const face = diceFaces[Math.floor(Math.random() * diceFaces.length)];
  currentRoll = face;
  rollButton.disabled = true;
  clearPlanning();
  highlightHazards(face.hazard);
  updateDiceReadout(face);

  if (face.riskLevel === "danger") {
    consecutiveDanger += 1;
  } else {
    consecutiveDanger = 0;
  }

  if (face.hazard === "clear") {
    safeStreak += 1;
  } else {
    safeStreak = 0;
  }

  if (consecutiveDanger >= 2) {
    consecutiveDanger = 0;
    const ended = adjustHeat(3);
    logEvent("🚓 Rival intel triggers a patrol sweep ahead. Heat +3.");
    if (ended) {
      currentRoll = null;
      highlightHazards(null);
      nodeElements.forEach((group) => delete group.dataset.active);
      return;
    }
  }

  if (safeStreak >= 2) {
    safeStreak = 0;
    logEvent("🛰️ Two clean rolls reset the rival intel. Hazards stay quiet.");
  }

  updateSelectableNodes();
}

rollButton.addEventListener("click", rollDice);
commitButton.addEventListener("click", resolveRoute);
undoButton.addEventListener("click", undoStep);
bypassButton.addEventListener("click", triggerBypass);

drawMap();
updateDiceReadout(null);
updateHeatDisplay();
updateCheckpointReadout();
