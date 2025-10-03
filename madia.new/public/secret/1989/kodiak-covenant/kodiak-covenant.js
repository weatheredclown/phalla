import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { mountParticleField } from "../particles.js";
import { autoEnhanceFeedback } from "../feedback.js";

const particleSystem = mountParticleField({
  effects: {
    palette: ["#38bdf8", "#facc15", "#fb7185", "#34d399"],
    ambientDensity: 0.5,
  },
});

const scoreConfig = getScoreConfig("kodiak-covenant");
const highScore = initHighScoreBanner({
  gameId: "kodiak-covenant",
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

const TURN_COUNT = 9;
const PROTECTION_WINDOW = 2;
const GRID_WIDTH = 6;
const GRID_HEIGHT = 6;
const MAX_METER = 3;

const DIRECTIONS = {
  H: { label: "Hold", dx: 0, dy: 0 },
  N: { label: "North", dx: 0, dy: -1 },
  E: { label: "East", dx: 1, dy: 0 },
  S: { label: "South", dx: 0, dy: 1 },
  W: { label: "West", dx: -1, dy: 0 },
};

const MAP_LAYOUT = [
  ["ridge", "trail", "trail", "trap", "trail", "den"],
  ["ridge", "trap", "trail", "trap", "trail", "ridge"],
  ["trail", "trail", "trail", "trail", "trap", "ridge"],
  ["trail", "trap", "ridge", "trail", "trail", "ridge"],
  ["trail", "trail", "trail", "trail", "trail", "ridge"],
  ["trail", "trail", "trail", "trail", "trail", "ridge"],
];

const START_POSITIONS = {
  kodiak: { x: 1, y: 5 },
  cub: { x: 2, y: 5 },
};

const DEN = { x: 5, y: 0 };

const HUNTER_PATH = [
  { x: 2, y: 0 },
  { x: 3, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 1 },
  { x: 3, y: 1 },
  { x: 2, y: 1 },
];

const plannerBody = document.getElementById("planner-body");
const runButton = document.getElementById("run-plan");
const resetButton = document.getElementById("reset-plan");
const exampleButton = document.getElementById("load-example");
const statusReadout = document.getElementById("status-readout");
const hunterReadout = document.getElementById("hunter-readout");
const meterFill = document.getElementById("meter-fill");
const meterValue = document.getElementById("meter-value");
const meterDelta = document.getElementById("meter-delta");
const protectionMeter = document.getElementById("protection-meter");
const turnIndicator = document.getElementById("turn-indicator");
const prevTurnButton = document.getElementById("prev-turn");
const nextTurnButton = document.getElementById("next-turn");
const eventList = document.getElementById("event-list");
const trailGrid = document.getElementById("trail-grid");

const plannerInputs = {
  kodiak: [],
  cub: [],
};

const cells = new Map();
let history = [];
let currentStateIndex = 0;
let executedTurns = 0;

function posKey(position) {
  return `${position.x},${position.y}`;
}

function clonePosition(position) {
  return { x: position.x, y: position.y };
}

function isWithinBounds(position) {
  return position.x >= 0 && position.x < GRID_WIDTH && position.y >= 0 && position.y < GRID_HEIGHT;
}

function getTileType(position) {
  if (!isWithinBounds(position)) {
    return "ridge";
  }
  return MAP_LAYOUT[position.y][position.x];
}

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function formatDirection(code) {
  return DIRECTIONS[code]?.label ?? "Hold";
}

function formatCoordinate(position) {
  const columns = ["A", "B", "C", "D", "E", "F"];
  const column = columns[position.x] ?? "?";
  const row = GRID_HEIGHT - position.y;
  return `${column}${row}`;
}

function createPlanner() {
  plannerBody.innerHTML = "";
  plannerInputs.kodiak.length = 0;
  plannerInputs.cub.length = 0;

  for (let turn = 1; turn <= TURN_COUNT; turn += 1) {
    const row = document.createElement("tr");

    const turnCell = document.createElement("th");
    turnCell.scope = "row";
    turnCell.className = "turn-label";
    turnCell.textContent = turn.toString().padStart(2, "0");
    row.appendChild(turnCell);

    ["kodiak", "cub"].forEach((role) => {
      const cell = document.createElement("td");
      const select = document.createElement("select");
      select.className = "direction-select";
      select.setAttribute("aria-label", `${role} direction for turn ${turn}`);

      Object.entries(DIRECTIONS).forEach(([value, data]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = data.label;
        if (value === "H") {
          option.selected = true;
        }
        select.appendChild(option);
      });

      plannerInputs[role].push(select);
      cell.appendChild(select);
      row.appendChild(cell);
    });

    plannerBody.appendChild(row);
  }
}

function initBoard() {
  trailGrid.innerHTML = "";
  cells.clear();

  for (let y = 0; y < GRID_HEIGHT; y += 1) {
    for (let x = 0; x < GRID_WIDTH; x += 1) {
      const tileType = MAP_LAYOUT[y][x];
      const tile = document.createElement("div");
      tile.classList.add("tile");
      tile.classList.add(`tile--${tileType}`);
      const key = `${x},${y}`;
      cells.set(key, tile);
      trailGrid.appendChild(tile);
    }
  }
}

function clearTokens() {
  cells.forEach((cell) => {
    cell.querySelectorAll(".token").forEach((token) => token.remove());
  });
}

function placeToken(position, variant, label) {
  const key = posKey(position);
  const cell = cells.get(key);
  if (!cell) {
    return;
  }
  const token = document.createElement("div");
  token.className = `token token--${variant}`;
  token.textContent = label;
  cell.appendChild(token);
}

function createState({
  turn,
  kodiak,
  cub,
  hunter,
  meter,
  meterDelta: delta,
  message,
  tone = "",
  scoutedMap,
  clearedTraps,
}) {
  const scoutedEntries = Array.from(scoutedMap.entries());
  const recentScouted = scoutedEntries
    .filter(([, visitedTurn]) => turn - visitedTurn <= PROTECTION_WINDOW)
    .map(([key]) => key);

  return {
    turn,
    kodiak: clonePosition(kodiak),
    cub: clonePosition(cub),
    hunter: clonePosition(hunter),
    meter,
    meterDelta: delta,
    message,
    tone,
    scouted: scoutedEntries,
    recentScouted,
    clearedTraps: Array.from(clearedTraps),
  };
}

function renderState() {
  if (!history.length) {
    return;
  }
  const state = history[currentStateIndex];

  const meterPercent = (state.meter / MAX_METER) * 100;
  meterFill.style.width = `${meterPercent}%`;
  meterValue.textContent = `${state.meter} / ${MAX_METER}`;
  protectionMeter.setAttribute("aria-valuenow", state.meter.toString());
  meterDelta.textContent = state.meterDelta ? `Δ ${state.meterDelta > 0 ? "+" : ""}${state.meterDelta}` : "";

  statusReadout.textContent = state.message;
  if (state.tone) {
    statusReadout.dataset.tone = state.tone;
  } else {
    statusReadout.removeAttribute("data-tone");
  }

  const hunterLabel = `Hunter sweep at ${formatCoordinate(state.hunter)}`;
  hunterReadout.textContent = hunterLabel;

  turnIndicator.textContent = `Turn ${state.turn} / ${executedTurns}`;
  prevTurnButton.disabled = currentStateIndex === 0;
  nextTurnButton.disabled = currentStateIndex >= history.length - 1;

  cells.forEach((cell, key) => {
    if (cell.classList.contains("tile--trap")) {
      if (state.clearedTraps.includes(key)) {
        cell.classList.add("tile--trap-cleared");
      } else {
        cell.classList.remove("tile--trap-cleared");
      }
    }
    if (state.recentScouted.includes(key)) {
      cell.classList.add("tile--scouted");
    } else {
      cell.classList.remove("tile--scouted");
    }
  });

  clearTokens();
  placeToken(state.kodiak, "kodiak", "K");
  placeToken(state.cub, "cub", "C");
  placeToken(state.hunter, "hunter", "H");

  if (state.kodiak.x === DEN.x && state.kodiak.y === DEN.y && state.cub.x === DEN.x && state.cub.y === DEN.y) {
    placeToken(DEN, "den", "Den");
  }

  Array.from(eventList.children).forEach((item, index) => {
    if (index === currentStateIndex - 1) {
      item.setAttribute("aria-current", "true");
    } else {
      item.removeAttribute("aria-current");
    }
  });
}

function renderEvents(events) {
  eventList.innerHTML = "";
  events.forEach((event, index) => {
    const item = document.createElement("li");
    item.className = "event-entry";
    item.textContent = event.text;
    if (event.tone) {
      item.dataset.tone = event.tone;
    }
    eventList.appendChild(item);
    if (index === events.length - 1) {
      if (event.tone === "success") {
        particleSystem.emitBurst(1.4);
      } else if (event.tone === "danger") {
        particleSystem.emitSparkle(0.9);
      } else if (event.tone) {
        particleSystem.emitSparkle(0.6);
      }
    }
  });
}

function readPlan() {
  return Array.from({ length: TURN_COUNT }, (_, index) => ({
    kodiak: plannerInputs.kodiak[index].value,
    cub: plannerInputs.cub[index].value,
  }));
}

function simulatePlan(plan) {
  const states = [];
  const events = [];
  const scoutedMap = new Map();
  const clearedTraps = new Set();

  let kodiak = clonePosition(START_POSITIONS.kodiak);
  let cub = clonePosition(START_POSITIONS.cub);
  let meter = MAX_METER;
  let failure = null;
  let success = false;

  scoutedMap.set(posKey(kodiak), 0);
  scoutedMap.set(posKey(cub), 0);

  const initialState = createState({
    turn: 0,
    kodiak,
    cub,
    hunter: clonePosition(HUNTER_PATH[0]),
    meter,
    meterDelta: 0,
    message: "Plan ready. Run the path to scout the glacier.",
    tone: "",
    scoutedMap,
    clearedTraps,
  });
  states.push(initialState);

  for (let turn = 1; turn <= TURN_COUNT; turn += 1) {
    const move = plan[turn - 1];
    const kodiakStep = DIRECTIONS[move.kodiak] ?? DIRECTIONS.H;
    const cubStep = DIRECTIONS[move.cub] ?? DIRECTIONS.H;

    const kodiakTarget = {
      x: kodiak.x + kodiakStep.dx,
      y: kodiak.y + kodiakStep.dy,
    };

    if (!isWithinBounds(kodiakTarget) || getTileType(kodiakTarget) === "ridge") {
      failure = {
        message: `Turn ${turn}: Kodiak slammed into a cliff face and lost the scent.`,
      };
    }

    if (failure) {
      states.push(
        createState({
          turn,
          kodiak,
          cub,
          hunter: clonePosition(HUNTER_PATH[(turn - 1) % HUNTER_PATH.length]),
          meter,
          meterDelta: 0,
          message: failure.message,
          tone: "danger",
          scoutedMap,
          clearedTraps,
        }),
      );
      events.push({ text: failure.message, tone: "danger" });
      break;
    }

    const kodiakTile = getTileType(kodiakTarget);
    kodiak = kodiakTarget;
    scoutedMap.set(posKey(kodiak), turn);

    if (kodiakTile === "trap") {
      clearedTraps.add(posKey(kodiak));
      highScore.submit(clearedTraps.size);
    }

    const cubTarget = {
      x: cub.x + cubStep.dx,
      y: cub.y + cubStep.dy,
    };

    if (!isWithinBounds(cubTarget) || getTileType(cubTarget) === "ridge") {
      failure = {
        message: `Turn ${turn}: The cub veered into impassable rock.`,
      };
    }

    const cubTileType = getTileType(cubTarget);
    const cubKey = posKey(cubTarget);
    const visitedTurn = scoutedMap.get(cubKey);
    const trapIsBlocked = cubTileType === "trap" && !clearedTraps.has(cubKey);
    const isMoving = cubTarget.x !== cub.x || cubTarget.y !== cub.y;

    if (!failure && isMoving && (visitedTurn === undefined || turn - visitedTurn > PROTECTION_WINDOW)) {
      failure = {
        message: `Turn ${turn}: The cub left the warmed trail and frostbitten paws stalled the run.`,
      };
    }

    if (!failure && trapIsBlocked) {
      failure = {
        message: `Turn ${turn}: The cub hit a live hunter trap before the Kodiak cleared it.`,
      };
    }

    if (failure) {
      states.push(
        createState({
          turn,
          kodiak,
          cub,
          hunter: clonePosition(HUNTER_PATH[(turn - 1) % HUNTER_PATH.length]),
          meter,
          meterDelta: 0,
          message: failure.message,
          tone: "danger",
          scoutedMap,
          clearedTraps,
        }),
      );
      events.push({ text: failure.message, tone: "danger" });
      break;
    }

    cub = cubTarget;

    const hunter = HUNTER_PATH[(turn - 1) % HUNTER_PATH.length];
    const distance = manhattan(kodiak, cub);
    const previousMeter = meter;

    if (distance <= 1) {
      meter = Math.min(MAX_METER, meter + 1);
    } else if (distance > 2) {
      meter = Math.max(0, meter - 1);
    }

    const meterChange = meter - previousMeter;

    const hunterDistance = manhattan(hunter, cub);
    if (meter === 0 && hunterDistance <= 1) {
      failure = {
        message: `Turn ${turn}: Protection collapsed and the hunter closed to ${hunterDistance === 0 ? "the cub" : "striking range"}.`,
      };
    }

    const denReached = kodiak.x === DEN.x && kodiak.y === DEN.y && cub.x === DEN.x && cub.y === DEN.y;

    let tone = "";
    let message = `Turn ${turn}: Kodiak ${formatDirection(move.kodiak)}; cub ${formatDirection(move.cub)}.`;

    if (meterChange > 0) {
      message += " Protection surges.";
    } else if (meterChange < 0) {
      message += " Protection thins.";
    }

    if (kodiakTile === "trap") {
      message += " Trap smashed.";
    }

    if (!failure && hunterDistance <= 1 && meter > 0) {
      message += " Hunter spotted but warded.";
    }

    if (failure) {
      tone = "danger";
    } else if (denReached) {
      tone = "success";
      message += " Den secured!";
    }

    const state = createState({
      turn,
      kodiak,
      cub,
      hunter,
      meter,
      meterDelta: meterChange,
      message: failure ? failure.message : message,
      tone: failure ? "danger" : tone,
      scoutedMap,
      clearedTraps,
    });

    states.push(state);
    events.push(
      failure
        ? { text: failure.message, tone: "danger" }
        : { text: message, tone },
    );

    if (failure) {
      break;
    }

    if (denReached) {
      success = true;
      break;
    }
  }

  if (!failure && !success) {
    const finalState = states[states.length - 1];
    if (finalState.turn === TURN_COUNT && !(finalState.kodiak.x === DEN.x && finalState.kodiak.y === DEN.y)) {
      finalState.message = "Route incomplete. Guide both bears into the den within nine beats.";
      finalState.tone = "";
      events.push({ text: finalState.message, tone: "" });
    }
  }

  return {
    states,
    events,
    success,
  };
}

function resetPlanner() {
  plannerInputs.kodiak.forEach((select) => {
    select.value = "H";
  });
  plannerInputs.cub.forEach((select) => {
    select.value = "H";
  });
  history = [
    createState({
      turn: 0,
      kodiak: clonePosition(START_POSITIONS.kodiak),
      cub: clonePosition(START_POSITIONS.cub),
      hunter: clonePosition(HUNTER_PATH[0]),
      meter: MAX_METER,
      meterDelta: 0,
      message: "Queue a path to begin.",
      tone: "",
      scoutedMap: new Map([
        [posKey(START_POSITIONS.kodiak), 0],
        [posKey(START_POSITIONS.cub), 0],
      ]),
      clearedTraps: new Set(),
    }),
  ];
  executedTurns = 0;
  currentStateIndex = 0;
  renderEvents([]);
  renderState();
}

function loadExamplePlan() {
  const kodiakMoves = ["E", "E", "N", "E", "N", "N", "N", "N", "E"];
  const cubMoves = ["H", "E", "H", "N", "E", "N", "N", "N", "E"];

  plannerInputs.kodiak.forEach((select, index) => {
    select.value = kodiakMoves[index] ?? "H";
  });
  plannerInputs.cub.forEach((select, index) => {
    select.value = cubMoves[index] ?? "H";
  });
}

function runSimulation() {
  const plan = readPlan();
  const result = simulatePlan(plan);
  history = result.states;
  executedTurns = history[history.length - 1]?.turn ?? 0;
  currentStateIndex = 0;
  renderEvents(result.events);
  renderState();
}

prevTurnButton.addEventListener("click", () => {
  if (currentStateIndex > 0) {
    currentStateIndex -= 1;
    renderState();
  }
});

nextTurnButton.addEventListener("click", () => {
  if (currentStateIndex < history.length - 1) {
    currentStateIndex += 1;
    renderState();
  }
});

runButton.addEventListener("click", runSimulation);
resetButton.addEventListener("click", resetPlanner);
exampleButton.addEventListener("click", () => {
  loadExamplePlan();
  runSimulation();
});

createPlanner();
initBoard();
resetPlanner();

autoEnhanceFeedback();
