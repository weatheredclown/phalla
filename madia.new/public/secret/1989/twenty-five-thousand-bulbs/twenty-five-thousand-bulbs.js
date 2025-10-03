import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { mountParticleField } from "../particles.js";
import { autoEnhanceFeedback } from "../feedback.js";

const particleSystem = mountParticleField({
  effects: {
    palette: ["#facc15", "#38bdf8", "#f472b6", "#22d3ee"],
    ambientDensity: 0.55,
  },
});

autoEnhanceFeedback();

const GAME_ID = "twenty-five-thousand-bulbs";
const scoreConfig = getScoreConfig(GAME_ID);
const highScore = initHighScoreBanner({
  gameId: GAME_ID,
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

const TIMER_SECONDS = 210;
const STARTING_STAPLES = 25;
const INEFFICIENCY_STAPLE_COST = 2;
const RECHARGE_SECONDS = 6;
const RECHARGE_STAPLES = 6;
const OVERLOAD_SHORT_CHANCE = 0.3;
const HOLIDAY_SPIRIT_BONUS = 2500;

const blueprintRows = [
  "###...###",
  "##.....##",
  "#.......#",
  "#.......#",
  "#.......#",
  "#.......#",
  "#.......#",
  "##.....##",
  "###.P.###",
];

const specialNodes = new Map([
  ["8,4", { id: "main-panel", type: "power", label: "Main Power Panel" }],
  ["4,2", { id: "porch-left", type: "socket", label: "Porch Column · Left" }],
  ["4,6", { id: "porch-right", type: "socket", label: "Porch Column · Right" }],
  ["6,2", { id: "garage-door", type: "socket", label: "Garage Doorframe" }],
  ["5,1", { id: "garage-eaves", type: "socket", label: "Garage Eaves" }],
  ["5,7", { id: "bay-window", type: "socket", label: "Living Room Bay" }],
  ["3,1", { id: "den-corner", type: "socket", label: "Den Corner" }],
  ["3,7", { id: "kitchen-corner", type: "socket", label: "Kitchen Corner" }],
  ["2,4", { id: "attic-tap", type: "overload", label: "Attic Junction" }],
  ["1,2", { id: "gable-west", type: "socket", label: "West Gable" }],
  ["1,6", { id: "gable-east", type: "socket", label: "East Gable" }],
  ["0,4", { id: "roof-peak", type: "socket", label: "Roof Peak" }],
  ["0,5", { id: "chimney", type: "socket", label: "Chimney Stack" }],
  ["4,4", { id: "porch-arch", type: "junction", label: "Porch Arch" }],
]);

const phases = [
  {
    id: "front-door",
    name: "Front Door Warm-Up",
    description: "Prep the porch columns and arch before the neighbors notice.",
  },
  {
    id: "garage",
    name: "Garage Glow-Up",
    description: "Feed the garage trim and seal the drafts with neon.",
  },
  {
    id: "first-floor",
    name: "First-Floor Frenzy",
    description: "Living room and study windows get the deluxe treatment.",
  },
  {
    id: "roofline",
    name: "Roof Reckoning",
    description: "Overloaded attic taps fuel the roofline spectacular.",
  },
];

const circuits = [
  {
    id: "porch-column-left",
    label: "Porch Column — Left",
    phase: "front-door",
    color: "#fde047",
    wattage: 650,
    idealLength: 6,
    spoolLength: 7,
    source: "main-panel",
    target: "porch-left",
    description: "Wrap the left column in warm yellow garland.",
  },
  {
    id: "porch-column-right",
    label: "Porch Column — Right",
    phase: "front-door",
    color: "#38bdf8",
    wattage: 650,
    idealLength: 6,
    spoolLength: 7,
    source: "main-panel",
    target: "porch-right",
    description: "Mirror the porch with icy blue shimmer.",
  },
  {
    id: "garage-door-chase",
    label: "Garage Door Chase",
    phase: "garage",
    color: "#fb7185",
    wattage: 520,
    idealLength: 5,
    spoolLength: 6,
    source: "main-panel",
    target: "garage-door",
    description: "Frame the garage door with a candy cane chase.",
  },
  {
    id: "garage-eaves-run",
    label: "Garage Eaves",
    phase: "garage",
    color: "#f97316",
    wattage: 620,
    idealLength: 7,
    spoolLength: 8,
    source: "main-panel",
    target: "garage-eaves",
    description: "Staple the long eaves run without wasting copper.",
  },
  {
    id: "bay-window-band",
    label: "Bay Window Band",
    phase: "first-floor",
    color: "#22d3ee",
    wattage: 720,
    idealLength: 7,
    spoolLength: 8,
    source: "main-panel",
    target: "bay-window",
    description: "Arc the living room bay with a cyan halo.",
  },
  {
    id: "den-corner-wrap",
    label: "Den Corner",
    phase: "first-floor",
    color: "#a855f7",
    wattage: 760,
    idealLength: 8,
    spoolLength: 9,
    source: "main-panel",
    target: "den-corner",
    description: "Snake through the study to the far den corner.",
  },
  {
    id: "kitchen-corner-wrap",
    label: "Kitchen Corner",
    phase: "first-floor",
    color: "#4ade80",
    wattage: 760,
    idealLength: 8,
    spoolLength: 9,
    source: "main-panel",
    target: "kitchen-corner",
    description: "Balance the floor with a cool green sweep.",
  },
  {
    id: "attic-feed",
    label: "Attic Junction Feed",
    phase: "roofline",
    color: "#facc15",
    wattage: 820,
    idealLength: 7,
    spoolLength: 8,
    source: "main-panel",
    target: "attic-tap",
    description: "Prime the overloaded attic junction. Handle with care.",
    overloaded: true,
    multiplier: 2,
  },
  {
    id: "gable-west-run",
    label: "West Gable Flare",
    phase: "roofline",
    color: "#38bdf8",
    wattage: 900,
    idealLength: 5,
    spoolLength: 6,
    source: "attic-tap",
    target: "gable-west",
    description: "Route power across the roofline to the western gable.",
    overloaded: true,
    multiplier: 2,
  },
  {
    id: "gable-east-run",
    label: "East Gable Flare",
    phase: "roofline",
    color: "#fb7185",
    wattage: 900,
    idealLength: 5,
    spoolLength: 6,
    source: "attic-tap",
    target: "gable-east",
    description: "Balance the roofline with a neon pink sweep.",
    overloaded: true,
    multiplier: 2,
  },
  {
    id: "roof-peak-beacon",
    label: "Roof Peak Beacon",
    phase: "roofline",
    color: "#f87171",
    wattage: 1040,
    idealLength: 4,
    spoolLength: 5,
    source: "attic-tap",
    target: "roof-peak",
    description: "Crown the roof with a blazing beacon.",
    overloaded: true,
    multiplier: 2,
  },
  {
    id: "chimney-trim",
    label: "Chimney Trim",
    phase: "roofline",
    color: "#fde68a",
    wattage: 680,
    idealLength: 5,
    spoolLength: 6,
    source: "attic-tap",
    target: "chimney",
    description: "Highlight the chimney stack for Cousin Eddie’s arrival.",
  },
];

const circuitsById = new Map(circuits.map((circuit) => [circuit.id, circuit]));
const circuitsByPhase = new Map();
for (const circuit of circuits) {
  if (!circuitsByPhase.has(circuit.phase)) {
    circuitsByPhase.set(circuit.phase, []);
  }
  circuitsByPhase.get(circuit.phase).push(circuit);
}

const nodesById = new Map();
const nodeElements = new Map();
const adjacency = new Map();
const occupiedEdges = new Map();
const pathElements = new Map();

const blueprintGrid = document.getElementById("blueprint-grid");
const wiringLayer = document.getElementById("wiring-layer");
const instructions = document.getElementById("blueprint-instructions");
const phaseList = document.getElementById("phase-list");
const wireList = document.getElementById("wire-list");
const timerDisplay = document.getElementById("timer-display");
const wattageDisplay = document.getElementById("wattage-display");
const stapleDisplay = document.getElementById("staple-display");
const rechargeDisplay = document.getElementById("recharge-display");
const rechargeTile = document.getElementById("recharge-tile");
const stapleTile = document.getElementById("staple-tile");
const eventLog = document.getElementById("event-log");
const boardWrapper = document.getElementById("board-wrapper");
const finale = document.getElementById("finale");
const replayButton = document.getElementById("replay-button");

const startButton = document.getElementById("start-run");
const pauseButton = document.getElementById("pause-run");
const resetButton = document.getElementById("reset-run");
const undoButton = document.getElementById("undo-step");
const cancelButton = document.getElementById("cancel-wire");

const state = {
  playing: false,
  timerSeconds: TIMER_SECONDS,
  timerInterval: 0,
  staples: STARTING_STAPLES,
  staplesUsed: 0,
  score: 0,
  activeCircuitId: null,
  activePath: [],
  activeEdges: new Set(),
  tempPathElement: null,
  rechargeTimer: 0,
  rechargeRemaining: 0,
  completedCircuits: new Map(),
  shortedCircuits: new Set(),
  currentPhaseIndex: 0,
  holidaySpiritAwarded: false,
};

const audioState = {
  context: null,
};

function ensureAudioContext() {
  if (!("AudioContext" in window || "webkitAudioContext" in window)) {
    return null;
  }
  if (!audioState.context) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    audioState.context = new Ctor();
  }
  if (audioState.context.state === "suspended") {
    audioState.context.resume();
  }
  return audioState.context;
}

function playTone({ frequency = 440, duration = 0.12, type = "sine", gain = 0.2, sweepTo }) {
  const ctx = ensureAudioContext();
  if (!ctx) {
    return;
  }
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gainNode.gain.value = gain;
  oscillator.connect(gainNode).connect(ctx.destination);
  const now = ctx.currentTime;
  if (sweepTo && sweepTo > 0) {
    oscillator.frequency.exponentialRampToValueAtTime(sweepTo, now + duration);
  }
  gainNode.gain.setValueAtTime(gain, now);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.05);
}

function playClick() {
  playTone({ frequency: 520, duration: 0.07, type: "triangle", gain: 0.18 });
}

function playComplete() {
  playTone({ frequency: 720, duration: 0.14, type: "sine", gain: 0.22 });
  window.setTimeout(() => playTone({ frequency: 1080, duration: 0.18, type: "sine", gain: 0.16 }), 70);
}

function playShort() {
  const ctx = ensureAudioContext();
  if (!ctx) {
    return;
  }
  const now = ctx.currentTime;
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(180, now);
  oscillator.frequency.exponentialRampToValueAtTime(40, now + 0.24);
  gainNode.gain.value = 0.28;
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
  oscillator.connect(gainNode).connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.32);
}

function playHolidaySpirit() {
  playTone({ frequency: 660, duration: 0.3, type: "sine", gain: 0.22 });
  window.setTimeout(() => playTone({ frequency: 880, duration: 0.4, type: "sine", gain: 0.2 }), 120);
  window.setTimeout(() => playTone({ frequency: 1180, duration: 0.5, type: "triangle", gain: 0.16 }), 260);
}

function initializeBoard() {
  const rows = blueprintRows.length;
  const cols = blueprintRows[0].length;
  blueprintGrid.style.setProperty("--rows", String(rows));
  blueprintGrid.style.setProperty("--cols", String(cols));

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (blueprintRows[row][col] === "#") {
        continue;
      }
      const key = `${row},${col}`;
      const special = specialNodes.get(key);
      const node = {
        id: special?.id ?? `node-${row}-${col}`,
        row,
        col,
        type: special?.type ?? "junction",
        label: special?.label ?? "Blueprint junction",
      };
      nodesById.set(node.id, node);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "blueprint-node";
      button.dataset.nodeId = node.id;
      button.dataset.type = node.type;
      button.dataset.state = "inactive";
      button.style.gridRowStart = String(row + 1);
      button.style.gridColumnStart = String(col + 1);
      button.setAttribute("aria-label", node.label);
      blueprintGrid.append(button);
      nodeElements.set(node.id, button);

      const neighbors = [];
      const offsets = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];
      for (const [dRow, dCol] of offsets) {
        const nRow = row + dRow;
        const nCol = col + dCol;
        if (nRow < 0 || nRow >= rows || nCol < 0 || nCol >= cols) {
          continue;
        }
        if (blueprintRows[nRow][nCol] === "#") {
          continue;
        }
        const neighborKey = `${nRow},${nCol}`;
        const neighborSpecial = specialNodes.get(neighborKey);
        const neighborId = neighborSpecial?.id ?? `node-${nRow}-${nCol}`;
        neighbors.push(neighborId);
      }
      adjacency.set(node.id, neighbors);
    }
  }

  blueprintGrid.addEventListener("click", (event) => {
    const target = event.target.closest(".blueprint-node");
    if (!target) {
      return;
    }
    const nodeId = target.dataset.nodeId;
    if (!nodeId) {
      return;
    }
    handleNodeSelection(nodeId);
  });
}

function renderPhaseList() {
  phaseList.innerHTML = "";
  for (let index = 0; index < phases.length; index += 1) {
    const phase = phases[index];
    const item = document.createElement("li");
    item.className = "phase-item";
    item.dataset.phaseId = phase.id;
    const stateAttr =
      index < state.currentPhaseIndex
        ? "complete"
        : index === state.currentPhaseIndex
          ? "current"
          : "upcoming";
    item.dataset.state = stateAttr;
    item.innerHTML = `
      <span class="phase-step">Phase ${index + 1}</span>
      <span class="phase-name">${phase.name}</span>
      <span class="phase-progress" data-phase-progress></span>
    `;
    phaseList.append(item);
  }
  updatePhaseProgress();
}

function updatePhaseProgress() {
  for (let index = 0; index < phases.length; index += 1) {
    const phase = phases[index];
    const item = phaseList.querySelector(`[data-phase-id="${phase.id}"]`);
    if (!item) {
      continue;
    }
    if (index < state.currentPhaseIndex) {
      item.dataset.state = "complete";
    } else if (index === state.currentPhaseIndex) {
      item.dataset.state = "current";
    } else {
      item.dataset.state = "upcoming";
    }
    const progress = item.querySelector("[data-phase-progress]");
    const circuitsInPhase = circuitsByPhase.get(phase.id) ?? [];
    const completed = circuitsInPhase.filter((circuit) => state.completedCircuits.has(circuit.id)).length;
    progress.textContent = `${completed} / ${circuitsInPhase.length}`;
  }
}

function renderWireList() {
  wireList.innerHTML = "";
  for (const circuit of circuits) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "wire-button";
    button.dataset.circuitId = circuit.id;
    button.dataset.overload = circuit.overloaded ? "true" : "false";
    button.innerHTML = `
      <span class="wire-label">${circuit.label}</span>
      <span class="wire-meta">Ideal ${circuit.idealLength} · Spool ${circuit.spoolLength}</span>
    `;
    button.addEventListener("click", () => {
      selectCircuit(circuit.id);
    });
    item.append(button);
    wireList.append(item);
  }
  updateWireAvailability();
}

function updateWireAvailability() {
  const currentPhase = phases[state.currentPhaseIndex];
  const unlockedPhases = new Set();
  for (let index = 0; index <= state.currentPhaseIndex; index += 1) {
    unlockedPhases.add(phases[index].id);
  }
  for (const circuit of circuits) {
    const button = wireList.querySelector(`[data-circuit-id="${circuit.id}"]`);
    if (!button) {
      continue;
    }
    if (state.completedCircuits.has(circuit.id)) {
      button.dataset.state = "complete";
      button.disabled = true;
      continue;
    }
    if (!unlockedPhases.has(circuit.phase)) {
      button.dataset.state = "locked";
      button.disabled = true;
      continue;
    }
    button.disabled = false;
    let wireState = "ready";
    if (state.shortedCircuits.has(circuit.id)) {
      wireState = "warning";
    }
    if (state.activeCircuitId === circuit.id) {
      wireState = "active";
    }
    button.dataset.state = wireState;
  }
  instructions.textContent = state.activeCircuitId
    ? "Trace the highlighted route. Tap Undo to pull a staple or Cancel to return the spool."
    : `Select a wire to begin routing. Phase ${state.currentPhaseIndex + 1}: ${currentPhase.name}.`;
}

function selectCircuit(circuitId) {
  const circuit = circuitsById.get(circuitId);
  if (!circuit) {
    return;
  }
  const currentPhase = phases[state.currentPhaseIndex];
  if (circuit.phase !== currentPhase.id && !state.completedCircuits.has(circuit.id)) {
    logEvent(`Phase ${state.currentPhaseIndex + 1} must be cleared before tackling ${circuit.label}.`, "warning");
    return;
  }
  if (state.completedCircuits.has(circuit.id)) {
    logEvent(`${circuit.label} is already lit.`, "info");
    return;
  }
  if (state.activeCircuitId === circuit.id) {
    return;
  }
  cancelActiveCircuit();
  state.activeCircuitId = circuit.id;
  state.activePath = [circuit.source];
  state.activeEdges = new Set();
  highlightActiveNodes();
  updateWireAvailability();
  ensureAudioContext();
  playClick();
  logEvent(`Routing ${circuit.label}. Ideal length ${circuit.idealLength}.`, "info");
  updateTempPath();
}

function highlightActiveNodes() {
  const completedNodes = new Set();
  for (const record of state.completedCircuits.values()) {
    for (const nodeId of record.path) {
      completedNodes.add(nodeId);
    }
  }
  for (const [nodeId, element] of nodeElements.entries()) {
    if (!element) {
      continue;
    }
    element.dataset.state = completedNodes.has(nodeId) ? "complete" : "inactive";
  }
  if (!state.activeCircuitId) {
    return;
  }
  const circuit = circuitsById.get(state.activeCircuitId);
  if (!circuit) {
    return;
  }
  for (const nodeId of state.activePath) {
    const element = nodeElements.get(nodeId);
    if (element) {
      element.dataset.state = "active";
    }
  }
  const lastNodeId = state.activePath[state.activePath.length - 1];
  const neighbors = adjacency.get(lastNodeId) ?? [];
  for (const neighbor of neighbors) {
    if (state.activePath.includes(neighbor)) {
      continue;
    }
    const edgeKey = makeEdgeKey(lastNodeId, neighbor);
    if (occupiedEdges.has(edgeKey)) {
      continue;
    }
    const element = nodeElements.get(neighbor);
    if (element) {
      element.dataset.state = "available";
    }
  }
  const targetElement = nodeElements.get(circuit.target);
  if (targetElement) {
    targetElement.dataset.state = "target";
  }
  const sourceElement = nodeElements.get(circuit.source);
  if (sourceElement) {
    sourceElement.dataset.state = "active";
  }
}

function makeEdgeKey(a, b) {
  return [a, b].sort().join("::");
}

function handleNodeSelection(nodeId) {
  if (!state.activeCircuitId) {
    return;
  }
  const circuit = circuitsById.get(state.activeCircuitId);
  if (!circuit) {
    return;
  }
  const path = state.activePath;
  const lastNodeId = path[path.length - 1];
  if (nodeId === lastNodeId) {
    return;
  }
  const neighbors = adjacency.get(lastNodeId) ?? [];
  if (!neighbors.includes(nodeId)) {
    logEvent("That jump would cut through a wall. Follow the blueprint grid.", "warning");
    return;
  }
  const edgeKey = makeEdgeKey(lastNodeId, nodeId);
  if (occupiedEdges.has(edgeKey)) {
    logEvent("Another string already owns that channel. Pick a cleaner lane.", "warning");
    return;
  }
  if (state.rechargeRemaining > 0) {
    logEvent("Crew is reloading staples. Hold tight.", "warning");
    return;
  }
  const segmentCount = path.length - 1;
  if (segmentCount >= circuit.spoolLength) {
    logEvent("That spool is tapped out. Finish the run or cancel it.", "warning");
    return;
  }
  consumeStaples(1);
  state.activeEdges.add(edgeKey);
  path.push(nodeId);
  updateTempPath();
  highlightActiveNodes();
  playClick();
  if (nodeId === circuit.target) {
    finalizeCircuit();
  }
}

function undoLastStep() {
  if (!state.activeCircuitId) {
    return;
  }
  const path = state.activePath;
  if (path.length <= 1) {
    cancelActiveCircuit();
    return;
  }
  const lastNode = path.pop();
  const prevNode = path[path.length - 1];
  const edgeKey = makeEdgeKey(lastNode, prevNode);
  state.activeEdges.delete(edgeKey);
  highlightActiveNodes();
  updateTempPath();
  logEvent("Pulled the last staple.", "info");
}

function cancelActiveCircuit(options = {}) {
  const { silent = false } = options;
  if (state.activeCircuitId && !silent) {
    logEvent(`Cancelled ${circuitsById.get(state.activeCircuitId)?.label ?? "wire"}.`, "warning");
  }
  state.activeCircuitId = null;
  state.activePath = [];
  state.activeEdges = new Set();
  if (state.tempPathElement) {
    state.tempPathElement.remove();
    state.tempPathElement = null;
  }
  highlightActiveNodes();
  updateWireAvailability();
}

function finalizeCircuit() {
  const circuit = circuitsById.get(state.activeCircuitId);
  if (!circuit) {
    return;
  }
  const path = state.activePath;
  const segments = path.length - 1;
  if (segments < circuit.idealLength) {
    logEvent("Too short. That string won’t reach. Undo a few moves.", "danger");
    return;
  }
  if (segments > circuit.spoolLength) {
    logEvent("That run exceeded the spool. Trim back before stapling.", "danger");
    return;
  }
  const inefficiency = Math.max(0, segments - circuit.idealLength);
  if (inefficiency > 0) {
    const extraStaples = inefficiency * INEFFICIENCY_STAPLE_COST;
    consumeStaples(extraStaples);
    logEvent(`Slack detected. ${extraStaples} extra staples burned to hide the excess.`, "warning");
  }
  const edges = [];
  for (let index = 1; index < path.length; index += 1) {
    const edgeKey = makeEdgeKey(path[index - 1], path[index]);
    occupiedEdges.set(edgeKey, circuit.id);
    edges.push(edgeKey);
  }
  const multiplier = circuit.overloaded ? circuit.multiplier ?? 2 : 1;
  const addedScore = Math.round(circuit.wattage * multiplier);
  state.score += addedScore;
  state.completedCircuits.set(circuit.id, {
    path: [...path],
    edges,
    score: addedScore,
    overloaded: Boolean(circuit.overloaded),
  });
  state.shortedCircuits.delete(circuit.id);
  renderCircuitPath(circuit.id, path, circuit.color);
  cancelActiveCircuit({ silent: true });
  updateHud();
  updatePhaseProgress();
  playComplete();
  logEvent(`${circuit.label} lit for ${addedScore.toLocaleString()} watts.`, "info");
  if (circuit.overloaded) {
    maybeShortCircuit(circuit);
  }
  checkPhaseAdvance();
  checkForVictory();
}

function renderCircuitPath(circuitId, path, color) {
  const d = path
    .map((nodeId, index) => {
      const { x, y } = getNodePosition(nodeId);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  let pathElement = pathElements.get(circuitId);
  if (!pathElement) {
    pathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pathElement.classList.add("wire-path");
    wiringLayer.append(pathElement);
    pathElements.set(circuitId, pathElement);
  }
  pathElement.setAttribute("d", d);
  pathElement.setAttribute("stroke", color);
}

function updateTempPath() {
  if (state.tempPathElement) {
    state.tempPathElement.remove();
    state.tempPathElement = null;
  }
  if (!state.activeCircuitId || state.activePath.length < 2) {
    return;
  }
  const d = state.activePath
    .map((nodeId, index) => {
      const { x, y } = getNodePosition(nodeId);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  const tempPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  tempPath.classList.add("wire-path", "is-temp");
  const circuit = circuitsById.get(state.activeCircuitId);
  tempPath.setAttribute("stroke", circuit?.color ?? "#38bdf8");
  tempPath.setAttribute("d", d);
  wiringLayer.append(tempPath);
  state.tempPathElement = tempPath;
}

function getNodePosition(nodeId) {
  const node = nodesById.get(nodeId);
  const rect = blueprintGrid.getBoundingClientRect();
  const rows = blueprintRows.length;
  const cols = blueprintRows[0].length;
  const cellWidth = rect.width / cols;
  const cellHeight = rect.height / rows;
  return {
    x: rect.left + (node.col + 0.5) * cellWidth,
    y: rect.top + (node.row + 0.5) * cellHeight,
  };
}

function consumeStaples(count) {
  state.staples = Math.max(0, state.staples - count);
  state.staplesUsed += count;
  if (state.staples === 0 && state.rechargeRemaining === 0) {
    beginRecharge();
  }
  updateHud();
}

function beginRecharge() {
  state.rechargeRemaining = RECHARGE_SECONDS;
  rechargeDisplay.textContent = `Reloading (${state.rechargeRemaining}s)`;
  rechargeTile.dataset.state = "cooldown";
  state.rechargeTimer = window.setInterval(() => {
    state.rechargeRemaining -= 1;
    if (state.rechargeRemaining <= 0) {
      window.clearInterval(state.rechargeTimer);
      state.rechargeTimer = 0;
      state.rechargeRemaining = 0;
      state.staples += RECHARGE_STAPLES;
      rechargeDisplay.textContent = "Ready";
      rechargeTile.dataset.state = "ready";
      logEvent(`Staple gun reloaded. +${RECHARGE_STAPLES} staples.`, "info");
      updateHud();
      return;
    }
    rechargeDisplay.textContent = `Reloading (${state.rechargeRemaining}s)`;
  }, 1000);
  logEvent("Staple gun dry! Crew is reloading.", "danger");
}

function updateHud() {
  timerDisplay.textContent = formatTime(state.timerSeconds);
  wattageDisplay.textContent = state.score.toLocaleString();
  stapleDisplay.textContent = `${state.staples}`;
  stapleTile.dataset.state = state.staples <= 5 ? "low" : "ready";
}

function formatTime(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function logEvent(message, tone = "info") {
  const entry = document.createElement("li");
  entry.className = "event-entry";
  entry.dataset.tone = tone;
  entry.innerHTML = `
    <span>${message}</span>
    <time>T-${formatTime(state.timerSeconds)}</time>
  `;
  eventLog.prepend(entry);
  while (eventLog.children.length > 24) {
    eventLog.lastElementChild?.remove();
  }
}

function checkPhaseAdvance() {
  const currentPhase = phases[state.currentPhaseIndex];
  const circuitsInPhase = circuitsByPhase.get(currentPhase.id) ?? [];
  const complete = circuitsInPhase.every((circuit) => state.completedCircuits.has(circuit.id));
  if (complete && state.currentPhaseIndex < phases.length - 1) {
    const clearedPhaseIndex = state.currentPhaseIndex;
    state.currentPhaseIndex += 1;
    updateWireAvailability();
    updatePhaseProgress();
    logEvent(
      `Phase ${clearedPhaseIndex + 1} complete. ${phases[state.currentPhaseIndex].name} unlocked.`,
      "info",
    );
  }
}

function checkForVictory() {
  if (state.completedCircuits.size !== circuits.length) {
    return;
  }
  if (!state.holidaySpiritAwarded) {
    state.score += HOLIDAY_SPIRIT_BONUS;
    state.holidaySpiritAwarded = true;
    updateHud();
    logEvent(`Holiday Spirit Bonus! +${HOLIDAY_SPIRIT_BONUS.toLocaleString()} watts.`, "info");
  }
  playHolidaySpirit();
  particleSystem.emitBurst(2.5);
  showFinale();
  finishRun(true);
}

function showFinale() {
  finale.hidden = false;
}

function hideFinale() {
  finale.hidden = true;
}

function maybeShortCircuit(circuit) {
  if (!circuit.overloaded) {
    return;
  }
  if (Math.random() > OVERLOAD_SHORT_CHANCE) {
    return;
  }
  window.setTimeout(() => {
    triggerShort(circuit.id);
  }, 400 + Math.random() * 600);
}

function triggerShort(circuitId) {
  const circuit = circuitsById.get(circuitId);
  if (!circuit) {
    return;
  }
  const record = state.completedCircuits.get(circuitId);
  if (!record) {
    return;
  }
  for (const edge of record.edges) {
    occupiedEdges.delete(edge);
  }
  state.completedCircuits.delete(circuitId);
  state.shortedCircuits.add(circuitId);
  state.score = Math.max(0, state.score - record.score);
  updateHud();
  const pathElement = pathElements.get(circuitId);
  if (pathElement) {
    pathElement.remove();
    pathElements.delete(circuitId);
  }
  if (state.tempPathElement) {
    state.tempPathElement.remove();
    state.tempPathElement = null;
  }
  highlightActiveNodes();
  boardWrapper.classList.add("is-shocking");
  window.setTimeout(() => {
    boardWrapper.classList.remove("is-shocking");
  }, 420);
  playShort();
  particleSystem.emitBurst(1.4);
  logEvent(`${circuit.label} shorted! Junction blew the entire string.`, "danger");
  updatePhaseProgress();
  updateWireAvailability();
  selectCircuit(circuitId);
}

function startRun() {
  if (state.playing) {
    return;
  }
  state.playing = true;
  if (!state.timerInterval) {
    state.timerInterval = window.setInterval(() => {
      state.timerSeconds -= 1;
      if (state.timerSeconds <= 0) {
        state.timerSeconds = 0;
        updateHud();
        finishRun(false);
        logEvent("Breaker tripped. The clock hit zero.", "danger");
        return;
      }
      updateHud();
    }, 1000);
  }
  startButton.disabled = true;
  pauseButton.disabled = false;
  resetButton.disabled = false;
  logEvent("Wiring run engaged. Timer ticking.", "info");
}

function pauseRun() {
  if (!state.playing) {
    return;
  }
  state.playing = false;
  if (state.timerInterval) {
    window.clearInterval(state.timerInterval);
    state.timerInterval = 0;
  }
  startButton.disabled = false;
  pauseButton.disabled = true;
  logEvent("Timer paused. Survey the blueprint before resuming.", "info");
}

function resetRun() {
  if (state.timerInterval) {
    window.clearInterval(state.timerInterval);
    state.timerInterval = 0;
  }
  if (state.rechargeTimer) {
    window.clearInterval(state.rechargeTimer);
    state.rechargeTimer = 0;
  }
  state.playing = false;
  state.timerSeconds = TIMER_SECONDS;
  state.staples = STARTING_STAPLES;
  state.staplesUsed = 0;
  state.score = 0;
  state.activeCircuitId = null;
  state.activePath = [];
  state.activeEdges = new Set();
  if (state.tempPathElement) {
    state.tempPathElement.remove();
    state.tempPathElement = null;
  }
  state.completedCircuits.clear();
  state.shortedCircuits.clear();
  state.currentPhaseIndex = 0;
  state.holidaySpiritAwarded = false;
  rechargeDisplay.textContent = "Ready";
  rechargeTile.dataset.state = "ready";
  stapleTile.dataset.state = "ready";
  for (const pathElement of pathElements.values()) {
    pathElement.remove();
  }
  pathElements.clear();
  occupiedEdges.clear();
  eventLog.innerHTML = "";
  hideFinale();
  updateHud();
  renderPhaseList();
  updateWireAvailability();
  highlightActiveNodes();
  startButton.disabled = false;
  pauseButton.disabled = true;
  logEvent("Blueprint reset. Fresh run queued.", "info");
}

function finishRun(success) {
  if (state.timerInterval) {
    window.clearInterval(state.timerInterval);
    state.timerInterval = 0;
  }
  state.playing = false;
  startButton.disabled = true;
  pauseButton.disabled = true;
  const meta = {
    phases: state.currentPhaseIndex + 1,
    staplesUsed: state.staplesUsed,
    success,
  };
  highScore.submit(state.score, meta);
}

function handleKeydown(event) {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
    return;
  }
  const { key } = event;
  if (key === "Enter") {
    event.preventDefault();
    if (state.playing) {
      pauseRun();
    } else {
      startRun();
    }
  } else if (key === "Escape") {
    event.preventDefault();
    cancelActiveCircuit();
  } else if (key === "Backspace") {
    event.preventDefault();
    undoLastStep();
  } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "W", "a", "A", "s", "S", "d", "D"].includes(key)) {
    event.preventDefault();
    handleDirectionalInput(key);
  }
}

function handleDirectionalInput(key) {
  if (!state.activeCircuitId) {
    return;
  }
  const direction =
    key === "ArrowUp" || key === "w" || key === "W"
      ? [-1, 0]
      : key === "ArrowDown" || key === "s" || key === "S"
        ? [1, 0]
        : key === "ArrowLeft" || key === "a" || key === "A"
          ? [0, -1]
          : [0, 1];
  const lastNodeId = state.activePath[state.activePath.length - 1];
  const node = nodesById.get(lastNodeId);
  if (!node) {
    return;
  }
  const targetRow = node.row + direction[0];
  const targetCol = node.col + direction[1];
  if (blueprintRows[targetRow]?.[targetCol] === "#") {
    return;
  }
  const neighborKey = `${targetRow},${targetCol}`;
  const neighborSpecial = specialNodes.get(neighborKey);
  const targetId = neighborSpecial?.id ?? `node-${targetRow}-${targetCol}`;
  handleNodeSelection(targetId);
}

function reflowPaths() {
  for (const [circuitId, record] of state.completedCircuits.entries()) {
    const circuit = circuitsById.get(circuitId);
    if (!circuit) {
      continue;
    }
    renderCircuitPath(circuitId, record.path, circuit.color);
  }
  updateTempPath();
}

startButton.addEventListener("click", startRun);
pauseButton.addEventListener("click", pauseRun);
resetButton.addEventListener("click", resetRun);
undoButton.addEventListener("click", undoLastStep);
cancelButton.addEventListener("click", cancelActiveCircuit);
replayButton.addEventListener("click", () => {
  hideFinale();
  resetRun();
});

document.addEventListener("keydown", handleKeydown);
window.addEventListener("resize", () => {
  window.requestAnimationFrame(reflowPaths);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && state.playing) {
    pauseRun();
  }
});

initializeBoard();
renderPhaseList();
renderWireList();
updateHud();
logEvent("Blueprint loaded. Select a wire to begin.", "info");
