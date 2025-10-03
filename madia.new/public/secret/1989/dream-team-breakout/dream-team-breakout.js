import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { mountParticleField } from "../particles.js";

mountParticleField();

const scoreConfig = getScoreConfig("dream-team-breakout");
const highScore = initHighScoreBanner({
  gameId: "dream-team-breakout",
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

const TURN_COUNT = 6;
const SANITY_MAX = 3;
const wildcardDeck = ["S", "E", "S", "E", "S", "E"];

const directionVectors = {
  N: { dx: 0, dy: -1, name: "North", glyph: "↑" },
  E: { dx: 1, dy: 0, name: "East", glyph: "→" },
  S: { dx: 0, dy: 1, name: "South", glyph: "↓" },
  W: { dx: -1, dy: 0, name: "West", glyph: "←" },
  WAIT: { dx: 0, dy: 0, name: "Hold", glyph: "•" },
};

const patients = [
  {
    id: "stepper",
    name: "Stepper",
    token: "S",
    start: { x: 1, y: 1 },
  },
  {
    id: "liner",
    name: "Liner",
    token: "L",
    start: { x: 2, y: 1 },
  },
  {
    id: "looper",
    name: "Looper",
    token: "O",
    start: { x: 1, y: 2 },
  },
  {
    id: "wildcard",
    name: "Wildcard",
    token: "W",
    start: { x: 2, y: 2 },
  },
];

const walkableTiles = [
  { x: 1, y: 1 },
  { x: 2, y: 1 },
  { x: 3, y: 1 },
  { x: 4, y: 1 },
  { x: 5, y: 1 },
  { x: 1, y: 2 },
  { x: 2, y: 2 },
  { x: 3, y: 2 },
  { x: 4, y: 2 },
  { x: 5, y: 2 },
  { x: 6, y: 2 },
  { x: 7, y: 2 },
  { x: 1, y: 3 },
  { x: 2, y: 3 },
  { x: 3, y: 3 },
  { x: 5, y: 3 },
  { x: 6, y: 3 },
  { x: 7, y: 3 },
  { x: 2, y: 4 },
  { x: 3, y: 4 },
  { x: 4, y: 4 },
  { x: 5, y: 4 },
  { x: 6, y: 4 },
  { x: 7, y: 4 },
  { x: 3, y: 5 },
  { x: 4, y: 5 },
  { x: 5, y: 5 },
  { x: 6, y: 5 },
];

const goalTiles = [
  { x: 4, y: 4 },
  { x: 5, y: 3 },
  { x: 7, y: 2 },
  { x: 5, y: 5 },
];

const pepTalkTiles = [{ x: 3, y: 4 }];

const trafficLights = new Map([
  ["3,3", { cycle: [false, true, false, true, false, true], name: "Lex & 53rd" }],
]);

const patrolRoutes = [
  {
    id: "avenue",
    name: "Avenue patrol",
    path: [
      { x: 4, y: 2 },
      { x: 4, y: 3 },
      { x: 4, y: 4 },
      { x: 4, y: 3 },
    ],
  },
  {
    id: "cross",
    name: "Cross-town patrol",
    path: [
      { x: 6, y: 4 },
      { x: 6, y: 3 },
      { x: 6, y: 4 },
      { x: 6, y: 5 },
    ],
  },
];

const plainclothesSchedule = [{ turn: 2, spawn: { x: 6, y: 3 } }];

const boardWidth = 9;
const boardHeight = 7;

const streetSet = new Set(walkableTiles.map((tile) => coordKey(tile)));
const goalSet = new Set(goalTiles.map((tile) => coordKey(tile)));
const pepTalkSet = new Set(pepTalkTiles.map((tile) => coordKey(tile)));

const cityGrid = document.getElementById("city-grid");
const plannerBody = document.getElementById("planner-body");
const runButton = document.getElementById("run-plan");
const resetButton = document.getElementById("reset-plan");
const loadExampleButton = document.getElementById("load-example");
const sanityMeter = document.getElementById("sanity-meter");
const sanityFill = document.getElementById("sanity-fill");
const sanityValue = document.getElementById("sanity-value");
const statusReadout = document.getElementById("status-readout");
const looperDirectionSelect = document.getElementById("looper-direction");
const wildcardSequenceList = document.getElementById("wildcard-sequence");
const eventList = document.getElementById("event-list");
const prevTurnButton = document.getElementById("prev-turn");
const nextTurnButton = document.getElementById("next-turn");
const turnIndicator = document.getElementById("turn-indicator");

const stepperSelects = [];
const linerSelects = [];
const tileLookup = new Map();
const patientTokens = new Map();
const patrolTokens = [];
let plainclothesToken = null;

let snapshots = [];
let currentSnapshotIndex = 0;

function coordKey({ x, y }) {
  return `${x},${y}`;
}

function formatCoordinate({ x, y }) {
  const letter = String.fromCharCode(64 + x);
  return `${letter}${y}`;
}

function formatDirection(direction) {
  const info = directionVectors[direction] ?? directionVectors.WAIT;
  return `${info.glyph} ${info.name}`;
}

function createDirectionChip(direction) {
  const info = directionVectors[direction] ?? directionVectors.WAIT;
  const span = document.createElement("span");
  span.className = "direction-chip";
  span.textContent = info.glyph;
  span.title = info.name;
  return span;
}

function getTrafficLightState(turn) {
  const greens = new Set();
  trafficLights.forEach((config, key) => {
    const cycle = config.cycle;
    const state = cycle[turn % cycle.length];
    if (state) {
      greens.add(key);
    }
  });
  return greens;
}

function getPatrolPositions(turn) {
  return patrolRoutes.map((route) => {
    const pathIndex = turn % route.path.length;
    return route.path[pathIndex];
  });
}

function isWalkable(position) {
  return (
    position.x > 0 &&
    position.y > 0 &&
    position.x < boardWidth - 1 &&
    position.y < boardHeight - 1 &&
    streetSet.has(coordKey(position))
  );
}

function buildBoard() {
  for (let y = 0; y < boardHeight; y += 1) {
    for (let x = 0; x < boardWidth; x += 1) {
      const tile = document.createElement("div");
      tile.classList.add("tile");
      const interior = x > 0 && x < boardWidth - 1 && y > 0 && y < boardHeight - 1;
      const key = `${x},${y}`;
      if (!interior || !streetSet.has(key)) {
        tile.classList.add("wall");
      } else {
        tile.classList.add("street");
        tile.dataset.coord = key;
        if (goalSet.has(key)) {
          tile.classList.add("goal");
        }
        if (pepTalkSet.has(key)) {
          tile.classList.add("pep-talk");
        }
        if (trafficLights.has(key)) {
          tile.classList.add("traffic-light");
        }
        tileLookup.set(key, tile);
      }
      cityGrid.appendChild(tile);
    }
  }
}

function createTokens() {
  patients.forEach((patient) => {
    const token = document.createElement("div");
    token.classList.add("token", `patient-${patient.id}`);
    token.textContent = patient.token;
    patientTokens.set(patient.id, token);
  });

  patrolRoutes.forEach(() => {
    const patrolToken = document.createElement("div");
    patrolToken.classList.add("token", "patrol");
    patrolToken.textContent = "P";
    patrolTokens.push(patrolToken);
  });

  plainclothesToken = document.createElement("div");
  plainclothesToken.classList.add("token", "plainclothes");
  plainclothesToken.textContent = "C";
}

function placeToken(token, position) {
  const tile = tileLookup.get(coordKey(position));
  if (tile) {
    tile.appendChild(token);
  }
}

function buildPlanner() {
  const stepperOptions = ["N", "E", "S", "W"];
  const linerOptions = ["N", "E", "S", "W", "WAIT"];

  for (let turn = 0; turn < TURN_COUNT; turn += 1) {
    const row = document.createElement("tr");
    const turnCell = document.createElement("th");
    turnCell.scope = "row";
    turnCell.textContent = String(turn + 1);

    const stepperCell = document.createElement("td");
    const stepperSelect = document.createElement("select");
    const stepperPlaceholder = document.createElement("option");
    stepperPlaceholder.value = "";
    stepperPlaceholder.textContent = "Select";
    stepperPlaceholder.disabled = true;
    stepperPlaceholder.selected = true;
    stepperSelect.appendChild(stepperPlaceholder);
    stepperOptions.forEach((option) => {
      const opt = document.createElement("option");
      opt.value = option;
      opt.textContent = formatDirection(option);
      stepperSelect.appendChild(opt);
    });
    stepperCell.appendChild(stepperSelect);

    const linerCell = document.createElement("td");
    const linerSelect = document.createElement("select");
    const linerPlaceholder = document.createElement("option");
    linerPlaceholder.value = "";
    linerPlaceholder.textContent = "Select";
    linerPlaceholder.disabled = true;
    linerPlaceholder.selected = true;
    linerSelect.appendChild(linerPlaceholder);
    linerOptions.forEach((option) => {
      const opt = document.createElement("option");
      opt.value = option;
      opt.textContent = formatDirection(option);
      linerSelect.appendChild(opt);
    });
    linerCell.appendChild(linerSelect);

    const looperCell = document.createElement("td");
    looperCell.dataset.turn = String(turn);

    const wildcardCell = document.createElement("td");
    const wildcardChip = createDirectionChip(wildcardDeck[turn]);
    wildcardCell.appendChild(wildcardChip);
    const wildcardLabel = document.createElement("span");
    wildcardLabel.textContent = ` ${directionVectors[wildcardDeck[turn]].name}`;
    wildcardCell.appendChild(wildcardLabel);

    row.appendChild(turnCell);
    row.appendChild(stepperCell);
    row.appendChild(linerCell);
    row.appendChild(looperCell);
    row.appendChild(wildcardCell);

    plannerBody.appendChild(row);
    stepperSelects.push(stepperSelect);
    linerSelects.push(linerSelect);
  }
}

function updateLooperColumn(direction) {
  const info = directionVectors[direction] ?? directionVectors.E;
  plannerBody.querySelectorAll("td[data-turn]").forEach((cell) => {
    cell.textContent = "";
    const chip = createDirectionChip(direction);
    cell.appendChild(chip);
    const label = document.createElement("span");
    label.textContent = ` ${info.name} (locked)`;
    cell.appendChild(label);
  });
}

function renderWildcardSequence() {
  wildcardDeck.forEach((direction) => {
    const item = document.createElement("li");
    const chip = createDirectionChip(direction);
    item.appendChild(chip);
    wildcardSequenceList.appendChild(item);
  });
}

function resetPlanner() {
  stepperSelects.forEach((select) => {
    select.value = "";
  });
  linerSelects.forEach((select) => {
    select.value = "";
  });
  looperDirectionSelect.value = "E";
  updateLooperColumn("E");
}

function clearEvents() {
  eventList.innerHTML = "";
}

function pushEvent(message, type = "info") {
  const item = document.createElement("li");
  item.textContent = message;
  if (type === "warning") {
    item.style.color = "#f97316";
  }
  if (type === "success") {
    item.style.color = "#34d399";
  }
  eventList.appendChild(item);
}

function setSanity(value) {
  const clamped = Math.max(0, Math.min(SANITY_MAX, value));
  sanityMeter.setAttribute("aria-valuenow", String(clamped));
  const percentage = (clamped / SANITY_MAX) * 100;
  sanityFill.style.width = `${percentage}%`;
  sanityValue.textContent = `${clamped} / ${SANITY_MAX}`;
}

function copyPositions() {
  const positions = new Map();
  patients.forEach((patient) => {
    positions.set(patient.id, { ...patient.start });
  });
  return positions;
}

function findNearestPatient(position, proposals) {
  let nearest = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  patients.forEach((patient) => {
    const proposal = proposals.get(patient.id);
    if (!proposal) {
      return;
    }
    const distance = Math.abs(proposal.origin.x - position.x) + Math.abs(proposal.origin.y - position.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      nearest = proposal;
    }
  });
  return nearest;
}

function applySnapshot(snapshotArray) {
  snapshots = snapshotArray;
  currentSnapshotIndex = snapshots.length - 1;
  renderCurrentSnapshot();
}

function renderCurrentSnapshot() {
  const snapshot = snapshots[currentSnapshotIndex];
  if (!snapshot) {
    return;
  }

  patients.forEach((patient) => {
    const token = patientTokens.get(patient.id);
    const position = snapshot.positions.get(patient.id);
    if (token && position) {
      placeToken(token, position);
    }
  });

  patrolTokens.forEach((token) => {
    token.remove();
  });

  snapshot.patrols.forEach((position, index) => {
    const token = patrolTokens[index];
    placeToken(token, position);
  });

  plainclothesToken.remove();
  if (snapshot.plainclothes) {
    placeToken(plainclothesToken, snapshot.plainclothes);
  }

  pepTalkSet.forEach((key) => {
    const tile = tileLookup.get(key);
    if (tile) {
      tile.classList.toggle("pep-talk", !snapshot.collectedPepTalks.has(key));
    }
  });

  trafficLights.forEach((_, key) => {
    const tile = tileLookup.get(key);
    if (tile) {
      tile.classList.toggle("is-green", snapshot.greenLights.has(key));
    }
  });

  setSanity(snapshot.sanity);
  const turnLabel = `Turn ${snapshot.turn} / ${TURN_COUNT}`;
  turnIndicator.value = turnLabel;
  turnIndicator.textContent = turnLabel;
  prevTurnButton.disabled = currentSnapshotIndex === 0;
  nextTurnButton.disabled = currentSnapshotIndex === snapshots.length - 1;
}

function showInitialState() {
  const initialPositions = new Map();
  patients.forEach((patient) => {
    initialPositions.set(patient.id, { ...patient.start });
  });
  const initialSnapshot = {
    turn: 0,
    positions: initialPositions,
    patrols: getPatrolPositions(0),
    plainclothes: null,
    sanity: SANITY_MAX,
    greenLights: getTrafficLightState(0),
    collectedPepTalks: new Set(),
  };
  applySnapshot([initialSnapshot]);
  statusReadout.textContent = "Queue a plan to begin.";
}

function readPlans() {
  const stepperPlan = stepperSelects.map((select) => select.value).map((value) => value.trim());
  const linerPlan = linerSelects.map((select) => select.value).map((value) => value.trim());
  const looperDirection = looperDirectionSelect.value;
  return { stepperPlan, linerPlan, looperDirection };
}

function validatePlans({ stepperPlan, linerPlan }) {
  const missingStepper = stepperPlan.some((value) => !value);
  const missingLiner = linerPlan.some((value) => !value);
  if (missingStepper || missingLiner) {
    statusReadout.textContent = "Fill every turn for Stepper and Liner before running the simulation.";
    return false;
  }
  return true;
}

function runSimulation(plan) {
  const positions = new Map();
  patients.forEach((patient) => {
    positions.set(patient.id, { ...patient.start });
  });

  let sanity = SANITY_MAX;
  const timeline = [];
  const eventMessages = [];
  const log = (message, type = "info") => {
    eventMessages.push({ message, type });
  };
  const collectedPepTalks = new Set();
  let linerHeading = null;
  let plainclothes = null;
  let plainclothesActive = false;
  let failure = false;
  let failureMessage = "";

  timeline.push({
    turn: 0,
    positions: clonePositions(positions),
    patrols: getPatrolPositions(0),
    plainclothes: null,
    sanity,
    greenLights: getTrafficLightState(0),
    collectedPepTalks: new Set(collectedPepTalks),
  });

  for (let turn = 0; turn < TURN_COUNT; turn += 1) {
    const greens = getTrafficLightState(turn);
    const patrolPositions = getPatrolPositions(turn);
    const proposals = new Map();

    const stepperDirection = plan.stepperPlan[turn];
    const linerDirection = plan.linerPlan[turn];
    const wildcardDirection = wildcardDeck[turn];

    const stepperDelta = directionVectors[stepperDirection];
    if (!stepperDelta || stepperDirection === "WAIT") {
      failure = true;
      failureMessage = `Turn ${turn + 1}: Stepper must move exactly one tile per beat.`;
      log(failureMessage, "warning");
      sanity -= 1;
      break;
    }

    const linerDelta = directionVectors[linerDirection];
    if (!linerDelta) {
      failure = true;
      failureMessage = `Turn ${turn + 1}: Liner needs a direction or a hold.`;
      log(failureMessage, "warning");
      sanity -= 1;
      break;
    }
    if (linerDirection === "WAIT") {
      linerHeading = null;
    } else {
      if (linerHeading && linerHeading !== linerDirection) {
        log(
          `Turn ${turn + 1}: Liner broke the straight-line rule pivoting from ${directionVectors[linerHeading].name} to ${directionVectors[linerDirection].name}.`,
          "warning"
        );
        sanity -= 1;
        if (sanity <= 0) {
          failure = true;
          failureMessage = "Sanity collapsed after Liner broke formation.";
          break;
        }
      }
      linerHeading = linerDirection;
    }

    const looperDelta = directionVectors[plan.looperDirection];
    if (!looperDelta) {
      failure = true;
      failureMessage = `Looper direction "${plan.looperDirection}" is invalid.`;
      log(failureMessage, "warning");
      sanity -= 1;
      break;
    }

    const wildcardDelta = directionVectors[wildcardDirection];

    const stepperOrigin = positions.get("stepper");
    const linerOrigin = positions.get("liner");
    const looperOrigin = positions.get("looper");
    const wildcardOrigin = positions.get("wildcard");

    proposals.set("stepper", {
      origin: stepperOrigin,
      target: {
        x: stepperOrigin.x + stepperDelta.dx,
        y: stepperOrigin.y + stepperDelta.dy,
      },
      direction: stepperDirection,
      delta: stepperDelta,
    });

    if (linerDirection === "WAIT") {
      proposals.set("liner", {
        origin: linerOrigin,
        target: { ...linerOrigin },
        direction: linerDirection,
        delta: linerDelta,
      });
    } else {
      proposals.set("liner", {
        origin: linerOrigin,
        target: {
          x: linerOrigin.x + linerDelta.dx,
          y: linerOrigin.y + linerDelta.dy,
        },
        direction: linerDirection,
        delta: linerDelta,
      });
    }

    proposals.set("looper", {
      origin: looperOrigin,
      target: {
        x: looperOrigin.x + looperDelta.dx,
        y: looperOrigin.y + looperDelta.dy,
      },
      direction: plan.looperDirection,
      delta: looperDelta,
    });

    proposals.set("wildcard", {
      origin: wildcardOrigin,
      target: {
        x: wildcardOrigin.x + wildcardDelta.dx,
        y: wildcardOrigin.y + wildcardDelta.dy,
      },
      direction: wildcardDirection,
      delta: wildcardDelta,
    });

    // Spawn plainclothes if scheduled
    if (!plainclothesActive) {
      const schedule = plainclothesSchedule.find((entry) => entry.turn === turn);
      if (schedule) {
        plainclothesActive = true;
        plainclothes = { ...schedule.spawn };
        log(
          `Turn ${turn + 1}: Plainclothes tail appears at ${formatCoordinate(plainclothes)} and mirrors the nearest patient.`,
          "warning"
        );
      }
    }

    // Validate moves against board and traffic lights
    for (const [id, proposal] of proposals) {
      if (!isWalkable(proposal.target)) {
        failure = true;
        failureMessage = `Turn ${turn + 1}: ${patients.find((p) => p.id === id).name} can't move to ${formatCoordinate(
          proposal.target
        )} — that's off the map.`;
        log(failureMessage, "warning");
        sanity -= 1;
        break;
      }
      const key = coordKey(proposal.target);
      if (trafficLights.has(key) && !greens.has(key)) {
        const light = trafficLights.get(key);
        failure = true;
        failureMessage = `Turn ${turn + 1}: ${patients.find((p) => p.id === id).name} ran the red at ${light.name}.`;
        log(failureMessage, "warning");
        sanity -= 1;
        break;
      }
    }

    if (failure || sanity <= 0) {
      break;
    }

    const occupancy = new Map();
    for (const [id, proposal] of proposals) {
      const key = coordKey(proposal.target);
      if (occupancy.has(key)) {
        const otherId = occupancy.get(key);
        failure = true;
        failureMessage = `Turn ${turn + 1}: ${patients.find((p) => p.id === id).name} collided with ${patients.find(
          (p) => p.id === otherId
        ).name} at ${formatCoordinate(proposal.target)}.`;
        log(failureMessage, "warning");
        sanity -= 1;
        break;
      }
      occupancy.set(key, id);
    }

    if (failure || sanity <= 0) {
      break;
    }

    // Plainclothes mirrors nearest patient
    let plainclothesTarget = plainclothes;
    if (plainclothesActive && plainclothes) {
      const nearest = findNearestPatient(plainclothes, proposals);
      if (nearest) {
        const candidate = {
          x: plainclothes.x + nearest.delta.dx,
          y: plainclothes.y + nearest.delta.dy,
        };
        if (isWalkable(candidate)) {
          plainclothesTarget = candidate;
        }
      }
    }

    // Check patrol collisions
    for (const [id, proposal] of proposals) {
      if (patrolPositions.some((patrol) => patrol.x === proposal.target.x && patrol.y === proposal.target.y)) {
        failure = true;
        failureMessage = `Turn ${turn + 1}: ${patients.find((p) => p.id === id).name} walked straight into a patrol car.`;
        log(failureMessage, "warning");
        sanity -= 1;
        break;
      }
    }

    if (failure || sanity <= 0) {
      break;
    }

    // Check plainclothes collision
    if (plainclothesActive && plainclothesTarget) {
      if (
        Array.from(proposals.values()).some(
          (proposal) => proposal.target.x === plainclothesTarget.x && proposal.target.y === plainclothesTarget.y
        )
      ) {
        failure = true;
        failureMessage = `Turn ${turn + 1}: The plainclothes tail caught up and spooked the crew.`;
        log(failureMessage, "warning");
        sanity -= 1;
        break;
      }
    }

    // Apply moves
    proposals.forEach((proposal, id) => {
      positions.set(id, { ...proposal.target });
    });

    if (plainclothesActive && plainclothesTarget) {
      plainclothes = { ...plainclothesTarget };
    }

    // Pep talk pickups
    proposals.forEach((proposal, id) => {
      const key = coordKey(proposal.target);
      if (pepTalkSet.has(key) && !collectedPepTalks.has(key)) {
        collectedPepTalks.add(key);
        sanity = Math.min(SANITY_MAX, sanity + 1);
        log(
          `${patients.find((p) => p.id === id).name} grabbed the pep-talk at ${formatCoordinate(proposal.target)}. Sanity restored.`,
          "success"
        );
      }
    });

    const moveSummary = `Turn ${turn + 1}: Stepper ${formatDirection(stepperDirection)} to ${formatCoordinate(
      proposals.get("stepper").target
    )}; Liner ${formatDirection(linerDirection)} to ${formatCoordinate(proposals.get("liner").target)}; Looper ${formatDirection(
      plan.looperDirection
    )} to ${formatCoordinate(proposals.get("looper").target)}; Wildcard ${formatDirection(
      wildcardDirection
    )} to ${formatCoordinate(proposals.get("wildcard").target)}`;
    log(moveSummary);

    timeline.push({
      turn: turn + 1,
      positions: clonePositions(positions),
      patrols: getPatrolPositions(turn),
      plainclothes: plainclothesActive && plainclothes ? { ...plainclothes } : null,
      sanity,
      greenLights: getTrafficLightState(turn + 1),
      collectedPepTalks: new Set(collectedPepTalks),
    });

    if (sanity <= 0) {
      failure = true;
      failureMessage = "The crew lost their nerve.";
      break;
    }
  }

  if (!failure) {
    const goalOccupancy = new Set();
    let allOnGoals = true;
    patients.forEach((patient) => {
      const position = positions.get(patient.id);
      const key = coordKey(position);
      if (!goalSet.has(key) || goalOccupancy.has(key)) {
        allOnGoals = false;
      }
      goalOccupancy.add(key);
    });
    if (allOnGoals) {
      log("All four patients reached separate stadium gates. Night saved.", "success");
    } else {
      failure = true;
      failureMessage = "They escaped the street beat, but someone missed a stadium gate.";
      log(failureMessage, "warning");
    }
  }

  if (failure && failureMessage) {
    statusReadout.textContent = failureMessage;
  } else if (!failure) {
    statusReadout.textContent = "Success! The quartet slips into the stadium without triggering a chase.";
  }

  return {
    timeline,
    events: eventMessages,
    success: !failure,
    sanity,
  };
}

function clonePositions(positions) {
  const cloned = new Map();
  positions.forEach((value, key) => {
    cloned.set(key, { ...value });
  });
  return cloned;
}

runButton.addEventListener("click", () => {
  const plan = readPlans();
  if (!validatePlans(plan)) {
    return;
  }
  clearEvents();
  statusReadout.textContent = "Simulating the breakout...";
  const result = runSimulation(plan);
  setSanity(result.sanity);
  highScore.submit(result.sanity);
  applySnapshot(result.timeline);
  result.events.forEach(({ message, type }) => {
    pushEvent(message, type);
  });
});

resetButton.addEventListener("click", () => {
  resetPlanner();
  clearEvents();
  showInitialState();
});

loadExampleButton.addEventListener("click", () => {
  const examplePlan = {
    stepperPlan: ["S", "E", "S", "E", "S", "E"],
    linerPlan: ["E", "E", "E", "WAIT", "S", "S"],
    looperDirection: "E",
  };
  stepperSelects.forEach((select, index) => {
    select.value = examplePlan.stepperPlan[index];
  });
  linerSelects.forEach((select, index) => {
    select.value = examplePlan.linerPlan[index];
  });
  looperDirectionSelect.value = examplePlan.looperDirection;
  updateLooperColumn(examplePlan.looperDirection);
  statusReadout.textContent = "Example plan loaded. Run it to see the intended route.";
});

looperDirectionSelect.addEventListener("change", (event) => {
  updateLooperColumn(event.target.value);
});

prevTurnButton.addEventListener("click", () => {
  if (currentSnapshotIndex > 0) {
    currentSnapshotIndex -= 1;
    renderCurrentSnapshot();
  }
});

nextTurnButton.addEventListener("click", () => {
  if (currentSnapshotIndex < snapshots.length - 1) {
    currentSnapshotIndex += 1;
    renderCurrentSnapshot();
  }
});

buildBoard();
createTokens();
buildPlanner();
renderWildcardSequence();
resetPlanner();
showInitialState();
