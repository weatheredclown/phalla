import { mountParticleField } from "../particles.js";
import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { autoEnhanceFeedback, createLogChannel, createStatusChannel } from "../feedback.js";
import { createWrapUpDialog } from "../wrap-up-dialog.js";

const particleSystem = mountParticleField({
  density: 0.00018,
  effects: {
    palette: ["#38bdf8", "#c084fc", "#facc15", "#f472b6"],
    ambientDensity: 0.6,
  },
});

const scoreConfig = getScoreConfig("hoverboard-pursuit");
const highScore = initHighScoreBanner({
  gameId: "hoverboard-pursuit",
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

const ghostStorageKey = "hoverboard-pursuit-ghost";
const laneCount = 3;
let laneOffsets = [-140, 0, 140];
const hazardTypes = new Set(["traffic", "attack", "hazard", "water"]);

const PHASES = [
  {
    id: "town",
    name: "Town Square Dash",
    distance: 520,
    intro: "Town Square is clear. Thread the taxis and rack up boost.",
    events: [
      { offset: 60, lane: 1, type: "traffic", label: "Taxi Swarm", danger: "danger" },
      { offset: 110, lane: 2, type: "traffic", label: "Skyway Van", danger: "danger" },
      { offset: 140, lane: 0, type: "boost", label: "Boost Pad", boost: 18 },
      { offset: 190, lane: 0, type: "rail", label: "Plaza Rail", boost: 24 },
      { offset: 230, lane: 1, type: "shortcut", label: "Clocktower Cut", skip: 60, bonus: 12 },
      { offset: 280, lane: 2, type: "traffic", label: "Delivery Drone", danger: "warning" },
      { offset: 330, lane: 1, type: "ramp", label: "Holobanner Ramp", boost: 14 },
      { offset: 380, lane: 0, type: "traffic", label: "Courthouse Cab", danger: "danger" },
      { offset: 440, lane: 2, type: "boost", label: "Pulse Pad", boost: 16 },
    ],
  },
  {
    id: "suburb",
    name: "Suburban Skim",
    distance: 620,
    intro: "Suburbs online. Watch for the water skim and roaming dog walkers.",
    events: [
      { offset: 40, lane: 1, type: "water", label: "Water Skim", requiresBoost: true, boost: 20 },
      { offset: 120, lane: 0, type: "traffic", label: "Auto-Walker", danger: "warning" },
      { offset: 170, lane: 2, type: "traffic", label: "Hydro Van", danger: "danger" },
      { offset: 210, lane: 1, type: "shortcut", label: "Canal Gap", skip: 70, bonus: 18, requiresBoost: true },
      { offset: 260, lane: 0, type: "boost", label: "Hydrant Boost", boost: 18 },
      { offset: 310, lane: 1, type: "rail", label: "Skyway Rail", boost: 26 },
      { offset: 360, lane: 2, type: "traffic", label: "Dog Walker", danger: "warning" },
      { offset: 410, lane: 0, type: "ramp", label: "Garden Ramp", boost: 12 },
      { offset: 470, lane: 1, type: "hazard", label: "Sprinkler Surge", danger: "warning" },
      { offset: 540, lane: 2, type: "traffic", label: "Pizza Drone", danger: "danger" },
    ],
  },
  {
    id: "tunnel",
    name: "Tunnel Chase",
    distance: 640,
    intro: "Griff engaged. Tunnel walls will cave if you hesitate.",
    events: [
      { offset: 70, lane: 1, type: "attack", label: "Griff Charge", danger: "danger" },
      { offset: 120, lane: 0, type: "traffic", label: "Rust Barge", danger: "danger" },
      { offset: 170, lane: 2, type: "hazard", label: "Falling Beam", danger: "danger" },
      { offset: 220, lane: 1, type: "shortcut", label: "Maintenance Hatch", skip: 80, bonus: 20 },
      { offset: 270, lane: 0, type: "boost", label: "Turbo Coil", boost: 18 },
      { offset: 320, lane: 2, type: "attack", label: "Bat Swing", danger: "danger" },
      { offset: 380, lane: 1, type: "ramp", label: "Collapsed Ramp", boost: 16 },
      { offset: 440, lane: 0, type: "hazard", label: "Loose Wiring", danger: "warning" },
      { offset: 520, lane: 2, type: "shortcut", label: "Vent Slice", skip: 90, bonus: 22, requiresBoost: true },
      { offset: 580, lane: 1, type: "attack", label: "Gang Barrage", danger: "danger" },
    ],
  },
];

const BASE_SPEED = 140; // units per second
const BOOST_MULTIPLIER = 1.7;
const BOOST_SPEND_RATE = 38; // percent per second
const BOOST_GAIN_NEAR_MISS = 12;
const BOOST_GAIN_RAIL = 26;
const BOOST_GAIN_SHORTCUT = 16;
const RECOVERY_TIME = 1200;
const NEAR_MISS_WINDOW = 26;

const track = document.getElementById("race-track");
const playerBoard = document.getElementById("player-board");
const ghostBoard = document.getElementById("ghost-board");
const timerEl = document.getElementById("race-timer");
const boostFill = document.getElementById("boost-fill");
const boostMeter = document.getElementById("boost-meter");
const boostValue = document.getElementById("boost-value");
const statusBar = document.getElementById("status-bar");
const staticOverlay = document.getElementById("crash-static");
const phaseTimeEls = {
  town: document.querySelector('[data-phase-time="town"]'),
  suburb: document.querySelector('[data-phase-time="suburb"]'),
  tunnel: document.querySelector('[data-phase-time="tunnel"]'),
};
const phaseChips = {
  town: document.querySelector('.phase-chip[data-phase="town"]'),
  suburb: document.querySelector('.phase-chip[data-phase="suburb"]'),
  tunnel: document.querySelector('.phase-chip[data-phase="tunnel"]'),
};
const eventLogList = document.getElementById("event-log");

const startButton = document.getElementById("start-button");
const resetButton = document.getElementById("reset-button");
const boostButton = document.getElementById("boost-button");
const laneButtons = Array.from(document.querySelectorAll('[data-direction]'));

const wrapUp = document.getElementById("wrap-up");
const finalTimeEl = document.getElementById("final-time");
const splitTownEl = document.getElementById("split-town");
const splitSuburbEl = document.getElementById("split-suburb");
const splitTunnelEl = document.getElementById("split-tunnel");
const replayButton = document.getElementById("replay-button");
const ghostButton = document.getElementById("ghost-button");
const closeWrapUp = document.getElementById("close-wrap-up");

const wrapUpDialog = createWrapUpDialog(wrapUp);
const wrapUpNote = document.getElementById("wrap-up-note");

const log = createLogChannel(eventLogList, { limit: 18 });
const setStatus = createStatusChannel(statusBar);

autoEnhanceFeedback();

let storedGhost = loadGhost();
let runActive = false;
let useGhost = false;
let totalTime = 0;
let lastFrame = 0;
let currentPhaseIndex = 0;
let currentPhaseTimeStart = 0;
let phaseProgress = 0;
let phaseStartDistance = 0;
let boostCharge = 0;
let boostActive = false;
let recoveryTimer = 0;
let airborneTimer = 0;
let ghostPlayback = null;
let ghostRecording = [];
let lastGhostRecord = 0;
let playerLane = 1;
const shortcutsTaken = new Set();
let pendingLaneUpdate = null;

const allObstacles = PHASES.flatMap((phase, index) => {
  const phaseOffset = PHASES.slice(0, index).reduce((acc, item) => acc + item.distance, 0);
  return phase.events.map((event, eventIndex) => ({
    phaseIndex: index,
    id: `${phase.id}-${eventIndex}`,
    globalOffset: phaseOffset + event.offset,
    ...event,
  }));
});

const obstacleElements = new Map();
const processedObstacles = new Set();
const nearMissedObstacles = new Set();
let currentGhostLane = 1;

function formatTime(ms) {
  const total = Math.max(0, Math.round(ms));
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const millis = total % 1000;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

function setPhaseState(phaseId, state) {
  const chip = phaseChips[phaseId];
  if (!chip) {
    return;
  }
  chip.dataset.active = state === "active" ? "true" : "false";
  chip.dataset.complete = state === "complete" ? "true" : "false";
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function computeLaneOffsets() {
  const width = track?.clientWidth || 0;
  if (!width) {
    return [-140, 0, 140];
  }
  const laneWidth = width / laneCount;
  const laneHalfSpan = (laneCount - 1) / 2;
  return Array.from({ length: laneCount }, (_, index) => {
    const offset = (index - laneHalfSpan) * laneWidth;
    return Math.round(offset);
  });
}

function applyLaneOffsets() {
  const offset = laneOffsets[playerLane] ?? 0;
  playerBoard.style.setProperty("--lane-offset", `${offset}px`);
  track.dataset.playerLane = String(playerLane);
  updateGhostBoardLane(currentGhostLane);
  obstacleElements.forEach(({ element, obstacle }) => {
    const laneOffset = laneOffsets[obstacle.lane] ?? 0;
    element.style.setProperty("--lane-offset", `${laneOffset}px`);
  });
}

function updateLaneGeometry() {
  laneOffsets = computeLaneOffsets();
  playerLane = clamp(playerLane, 0, laneCount - 1);
  applyLaneOffsets();
}

function scheduleLaneGeometryUpdate() {
  if (pendingLaneUpdate !== null) {
    return;
  }
  pendingLaneUpdate = requestAnimationFrame(() => {
    pendingLaneUpdate = null;
    updateLaneGeometry();
  });
}

function setLane(lane) {
  const nextLane = clamp(lane, 0, laneCount - 1);
  if (playerLane === nextLane) {
    return;
  }
  playerLane = nextLane;
  applyLaneOffsets();
  log.push(`Lane shift ➜ ${["Left", "Center", "Right"][playerLane]}`);
}

function updateGhostBoardLane(lane) {
  currentGhostLane = clamp(lane, 0, laneCount - 1);
  const offset = laneOffsets[currentGhostLane] ?? 0;
  ghostBoard.style.setProperty("--lane-offset", `${offset}px`);
}

function grantBoost(amount, reason) {
  const previous = boostCharge;
  boostCharge = clamp(boostCharge + amount, 0, 100);
  if (boostCharge !== previous) {
    boostFill.style.width = `${boostCharge}%`;
    boostMeter.setAttribute("aria-valuenow", String(Math.round(boostCharge)));
    boostValue.textContent = `${Math.round(boostCharge)}%`;
    if (reason) {
      log.push(`${reason} +${Math.round(amount)}%`, "success");
    }
  }
}

function drainBoost(deltaSeconds) {
  if (!boostActive) {
    return;
  }
  const drainAmount = BOOST_SPEND_RATE * deltaSeconds;
  boostCharge = clamp(boostCharge - drainAmount, 0, 100);
  boostFill.style.width = `${boostCharge}%`;
  boostMeter.setAttribute("aria-valuenow", String(Math.round(boostCharge)));
  boostValue.textContent = `${Math.round(boostCharge)}%`;
  if (boostCharge <= 0.1) {
    stopBoost();
  }
}

function startBoost() {
  if (boostCharge < 30 || boostActive || !runActive) {
    return;
  }
  boostActive = true;
  document.body.classList.add("is-boosting");
  boostButton.setAttribute("aria-pressed", "true");
  particleSystem.emitBurst(1.4);
  log.push("Boost engaged!", "success");
}

function stopBoost() {
  if (!boostActive) {
    return;
  }
  boostActive = false;
  document.body.classList.remove("is-boosting");
  boostButton.setAttribute("aria-pressed", "false");
}

function scheduleGhostSample(time) {
  if (time - lastGhostRecord < 120 && ghostRecording.length > 0) {
    return;
  }
  const lastEntry = ghostRecording[ghostRecording.length - 1];
  if (!lastEntry || lastEntry.lane !== playerLane) {
    ghostRecording.push({ t: Math.round(time), lane: playerLane });
    lastGhostRecord = time;
  }
}

let audioContext = null;

function playCrashSound() {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioContext;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.45);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.6);
  } catch (error) {
    // Ignore audio errors in unsupported environments.
  }
}

function vibrate(pattern) {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

function handleCollision(obstacle, message) {
  if (recoveryTimer > 0) {
    return;
  }
  recoveryTimer = RECOVERY_TIME;
  stopBoost();
  boostCharge = Math.max(0, boostCharge - 18);
  boostFill.style.width = `${boostCharge}%`;
  boostMeter.setAttribute("aria-valuenow", String(Math.round(boostCharge)));
  boostValue.textContent = `${Math.round(boostCharge)}%`;
  document.body.classList.add("is-crashing");
  staticOverlay.classList.add("is-active");
  setTimeout(() => {
    document.body.classList.remove("is-crashing");
    staticOverlay.classList.remove("is-active");
  }, 400);
  playCrashSound();
  vibrate([40, 40, 80]);
  log.push(message || "Collision! Momentum lost.", "danger");
  setStatus("Respawning mid-lane. Regain speed!", "warning");
}

function handleNearMiss(obstacle) {
  if (nearMissedObstacles.has(obstacle.id)) {
    return;
  }
  nearMissedObstacles.add(obstacle.id);
  grantBoost(BOOST_GAIN_NEAR_MISS, "Near miss");
  particleSystem.emitSparkle(1.2);
}

function processObstacle(obstacle) {
  if (processedObstacles.has(obstacle.id)) {
    return;
  }
  processedObstacles.add(obstacle.id);
  const { type, label, boost = 0, skip = 0, bonus = 0, requiresBoost = false } = obstacle;
  const isPlayerLane = obstacle.lane === playerLane;

  if (type === "boost" && isPlayerLane) {
    grantBoost(boost, `${label}`);
    log.push(`${label} hit`, "success");
    return;
  }

  if (type === "rail" && isPlayerLane) {
    airborneTimer = Math.max(airborneTimer, 700);
    grantBoost(boost || BOOST_GAIN_RAIL, `${label}`);
    log.push(`Grinding ${label}`, "success");
    particleSystem.emitSparkle(1.4);
    return;
  }

  if (type === "ramp" && isPlayerLane) {
    airborneTimer = Math.max(airborneTimer, 950);
    grantBoost(boost || 16, `${label}`);
    log.push(`Launched from ${label}`, "success");
    particleSystem.emitBurst(1.1);
    return;
  }

  if (type === "shortcut" && isPlayerLane) {
    if (requiresBoost && !boostActive) {
      handleCollision(obstacle, `${label} missed without boost.`);
      return;
    }
    if (!shortcutsTaken.has(obstacle.id)) {
      shortcutsTaken.add(obstacle.id);
      grantBoost(bonus || BOOST_GAIN_SHORTCUT, `${label} shortcut`);
      phaseProgress += skip;
      log.push(`${label} saves ${Math.round(skip / BASE_SPEED)}s`, "success");
      particleSystem.emitBurst(1.6);
    }
    return;
  }

  if (type === "water" && isPlayerLane) {
    if (boostActive || airborneTimer > 0) {
      grantBoost(boost || 18, `${label}`);
      log.push(`Skimmed ${label}`, "success");
      return;
    }
    handleCollision(obstacle, `${label} stalled the board.`);
    return;
  }

  if (hazardTypes.has(type) && isPlayerLane && airborneTimer <= 0) {
    handleCollision(obstacle, `${label} clipped you.`);
    return;
  }

  if (type === "attack" && isPlayerLane && airborneTimer <= 0) {
    handleCollision(obstacle, `${label} connected.`);
  }
}

function spawnObstacles() {
  obstacleElements.forEach(({ element }) => {
    element.remove();
  });
  obstacleElements.clear();
  processedObstacles.clear();
  nearMissedObstacles.clear();
  allObstacles.forEach((obstacle) => {
    const element = document.createElement("div");
    element.className = "obstacle";
    element.dataset.type = obstacle.type;
    element.setAttribute("aria-hidden", "true");
    element.textContent = obstacle.label;
    element.style.setProperty("--lane-offset", `${laneOffsets[obstacle.lane] ?? 0}px`);
    element.style.setProperty("--z", "-460px");
    element.style.setProperty("--scale", "0.65");
    track.appendChild(element);
    obstacleElements.set(obstacle.id, { element, obstacle });
  });
}

function updateObstacles(deltaSeconds) {
  const totalDistance = phaseStartDistance + phaseProgress;
  allObstacles.forEach((obstacle) => {
    const entry = obstacleElements.get(obstacle.id);
    if (!entry) {
      return;
    }
    const { element } = entry;
    const distanceAhead = obstacle.globalOffset - totalDistance;
    const z = clamp(distanceAhead * -0.95, -520, 120);
    element.style.setProperty("--z", `${z}px`);
    const scale = clamp(1.2 - Math.abs(z) / 520, 0.55, 1.1);
    element.style.setProperty("--scale", scale.toFixed(3));

    if (distanceAhead < -80) {
      element.style.opacity = "0";
    } else if (distanceAhead < 0) {
      element.style.opacity = "0.4";
    } else {
      element.style.opacity = "1";
    }

    if (distanceAhead <= 160 && distanceAhead >= -40) {
      element.dataset.active = "true";
    } else {
      element.removeAttribute("data-active");
    }

    if (!processedObstacles.has(obstacle.id) && distanceAhead <= 0) {
      processObstacle(obstacle);
    }

    if (
      hazardTypes.has(obstacle.type) &&
      !nearMissedObstacles.has(obstacle.id) &&
      Math.abs(distanceAhead) <= NEAR_MISS_WINDOW &&
      obstacle.lane !== playerLane
    ) {
      handleNearMiss(obstacle);
    }

    if (distanceAhead < -160) {
      element.remove();
      obstacleElements.delete(obstacle.id);
    }
  });
}

function resetPhaseTimes() {
  Object.values(phaseTimeEls).forEach((el) => {
    el.textContent = "--:--.---";
  });
  Object.keys(phaseChips).forEach((id) => {
    setPhaseState(id, "idle");
  });
}

function updatePhaseTimerDisplay(phaseId, time) {
  const el = phaseTimeEls[phaseId];
  if (el) {
    el.textContent = formatTime(time);
  }
}

function updateTimerDisplay(time) {
  timerEl.textContent = formatTime(time);
}

function resetRunState() {
  runActive = false;
  useGhost = false;
  totalTime = 0;
  lastFrame = 0;
  currentPhaseIndex = 0;
  currentPhaseTimeStart = 0;
  phaseProgress = 0;
  phaseStartDistance = 0;
  boostCharge = 0;
  boostActive = false;
  recoveryTimer = 0;
  airborneTimer = 0;
  ghostPlayback = null;
  ghostRecording = [];
  lastGhostRecord = 0;
  playerLane = 1;
  shortcutsTaken.clear();
  processedObstacles.clear();
  nearMissedObstacles.clear();
  updateTimerDisplay(0);
  boostFill.style.width = "0%";
  boostMeter.setAttribute("aria-valuenow", "0");
  boostValue.textContent = "0%";
  boostButton.setAttribute("aria-pressed", "false");
  applyLaneOffsets();
  ghostBoard.hidden = true;
  updateGhostBoardLane(1);
  resetPhaseTimes();
  setStatus("Waiting on the line.");
  if (eventLogList) {
    eventLogList.innerHTML = "";
  }
  document.body.classList.remove("is-boosting", "is-crashing");
  staticOverlay.classList.remove("is-active");
}

function startRun({ ghost = false } = {}) {
  resetRunState();
  wrapUpDialog.close({ restoreFocus: false });
  useGhost = ghost && Boolean(storedGhost);
  runActive = true;
  totalTime = 0;
  currentPhaseIndex = 0;
  currentPhaseTimeStart = 0;
  phaseProgress = 0;
  phaseStartDistance = 0;
  shortcutsTaken.clear();
  ghostRecording = [{ t: 0, lane: playerLane }];
  lastGhostRecord = 0;
  if (useGhost && storedGhost) {
    ghostPlayback = {
      data: storedGhost,
      index: 0,
    };
    ghostBoard.hidden = false;
    wrapUpNote.textContent = "Ghost is active. Follow the translucent board to beat your best line.";
  } else {
    ghostPlayback = null;
    ghostBoard.hidden = true;
    wrapUpNote.textContent = "Ghost data saves your best line locally. Loading it mirrors your path as a translucent board next run.";
  }
  spawnObstacles();
  setPhaseState(PHASES[0].id, "active");
  setStatus(PHASES[0].intro);
  log.push("Run initiated.", "info");
  lastFrame = performance.now();
  requestAnimationFrame(step);
}

function finishRun() {
  runActive = false;
  stopBoost();
  const finalTime = totalTime;
  finalTimeEl.textContent = formatTime(finalTime);
  splitTownEl.textContent = phaseTimeEls.town.textContent;
  splitSuburbEl.textContent = phaseTimeEls.suburb.textContent;
  splitTunnelEl.textContent = phaseTimeEls.tunnel.textContent;

  const scoreValue = Math.max(0, 1000000 - Math.round(finalTime));
  const meta = {
    finalTimeMs: Math.round(finalTime),
    display: formatTime(finalTime),
    splits: {
      town: phaseTimeEls.town.textContent,
      suburb: phaseTimeEls.suburb.textContent,
      tunnel: phaseTimeEls.tunnel.textContent,
    },
  };
  highScore.submit(scoreValue, meta);

  wrapUpDialog.open({ focus: replayButton });

  const priorBest = storedGhost?.runTime;
  if (ghostRecording.length > 0 && (!Number.isFinite(priorBest) || finalTime < priorBest)) {
    ghostRecording.push({ t: Math.round(finalTime), lane: playerLane });
    saveGhost({
      runTime: Math.round(finalTime),
      entries: ghostRecording,
    });
    storedGhost = loadGhost();
    log.push("Ghost data updated with new best line.", "success");
  }

  ghostButton.disabled = !storedGhost;
  if (!storedGhost) {
    ghostButton.textContent = "Load Ghost Replay";
    ghostButton.title = "Set a best run to unlock ghost replay.";
  } else {
    ghostButton.title = "Load your best recorded line as a ghost.";
  }
  setStatus("Run complete. Review splits and retry.", "success");
}

function advancePhase() {
  const phase = PHASES[currentPhaseIndex];
  const phaseTime = totalTime - currentPhaseTimeStart;
  updatePhaseTimerDisplay(phase.id, phaseTime);
  setPhaseState(phase.id, "complete");
  log.push(`${phase.name} cleared in ${formatTime(phaseTime)}`, "success");

  currentPhaseIndex += 1;
  if (currentPhaseIndex >= PHASES.length) {
    finishRun();
    return;
  }
  const nextPhase = PHASES[currentPhaseIndex];
  const overshoot = Math.max(0, phaseProgress - phase.distance);
  phaseStartDistance += phase.distance;
  phaseProgress = overshoot;
  currentPhaseTimeStart = totalTime;
  setPhaseState(nextPhase.id, "active");
  setStatus(nextPhase.intro);
}

function updateGhostPlayback(elapsed) {
  if (!ghostPlayback || !ghostPlayback.data) {
    return;
  }
  const { data } = ghostPlayback;
  const { entries, runTime } = data;
  if (!entries || entries.length === 0) {
    ghostBoard.hidden = true;
    return;
  }
  if (elapsed > runTime) {
    ghostBoard.hidden = true;
    return;
  }
  ghostBoard.hidden = false;
  while (
    ghostPlayback.index < entries.length - 2 &&
    entries[ghostPlayback.index + 1].t <= elapsed
  ) {
    ghostPlayback.index += 1;
  }
  const current = entries[ghostPlayback.index];
  const next = entries[ghostPlayback.index + 1];
  let lane = current.lane;
  if (next) {
    const span = next.t - current.t;
    if (span > 0) {
      const ratio = clamp((elapsed - current.t) / span, 0, 1);
      if (ratio > 0.5) {
        lane = next.lane;
      }
    }
  }
  updateGhostBoardLane(lane);
}

function step(now) {
  if (!runActive) {
    return;
  }
  const deltaMs = now - lastFrame;
  lastFrame = now;
  const deltaSeconds = deltaMs / 1000;
  totalTime += deltaMs;
  updateTimerDisplay(totalTime);

  if (airborneTimer > 0) {
    airborneTimer = Math.max(0, airborneTimer - deltaMs);
  }

  if (recoveryTimer > 0) {
    recoveryTimer = Math.max(0, recoveryTimer - deltaMs);
  }

  const effectiveSpeed = recoveryTimer > 0 ? BASE_SPEED * 0.45 : boostActive ? BASE_SPEED * BOOST_MULTIPLIER : BASE_SPEED;
  phaseProgress += effectiveSpeed * deltaSeconds;

  if (boostActive) {
    drainBoost(deltaSeconds);
  }

  updateObstacles(deltaSeconds);
  updateGhostPlayback(totalTime);
  scheduleGhostSample(totalTime);

  const phase = PHASES[currentPhaseIndex];
  if (phase && phaseProgress >= phase.distance) {
    advancePhase();
  }

  requestAnimationFrame(step);
}

function loadGhost() {
  try {
    const raw = window.localStorage.getItem(ghostStorageKey);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.entries)) {
      return parsed;
    }
  } catch (error) {
    // Ignore storage errors
  }
  return null;
}

function saveGhost(data) {
  try {
    window.localStorage.setItem(ghostStorageKey, JSON.stringify(data));
  } catch (error) {
    // Ignore storage errors
  }
}

startButton.addEventListener("click", () => {
  startRun({ ghost: false });
});

resetButton.addEventListener("click", () => {
  resetRunState();
  spawnObstacles();
  wrapUpDialog.close({ restoreFocus: false });
});

boostButton.addEventListener("mousedown", () => {
  startBoost();
});

boostButton.addEventListener("mouseup", () => {
  stopBoost();
});

boostButton.addEventListener("mouseleave", () => {
  if (!boostActive) {
    boostButton.setAttribute("aria-pressed", "false");
  }
});

laneButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const direction = button.dataset.direction;
    if (direction === "left") {
      setLane(playerLane - 1);
    } else if (direction === "right") {
      setLane(playerLane + 1);
    }
  });
});

replayButton.addEventListener("click", () => {
  wrapUpDialog.close({ restoreFocus: false });
  startRun({ ghost: false });
});

ghostButton.addEventListener("click", () => {
  if (!storedGhost) {
    return;
  }
  wrapUpDialog.close({ restoreFocus: false });
  startRun({ ghost: true });
});

closeWrapUp.addEventListener("click", () => {
  wrapUpDialog.close();
});

function handleKey(event) {
  if (event.defaultPrevented) {
    return;
  }
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    setLane(playerLane - 1);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    setLane(playerLane + 1);
  } else if (event.key.toLowerCase() === "r") {
    event.preventDefault();
    startRun({ ghost: useGhost });
  } else if (event.key === "Shift") {
    startBoost();
  }
}

function handleKeyUp(event) {
  if (event.key === "Shift") {
    stopBoost();
  }
}

document.addEventListener("keydown", handleKey);
document.addEventListener("keyup", handleKeyUp);

window.addEventListener("resize", scheduleLaneGeometryUpdate);

updateLaneGeometry();
resetRunState();
spawnObstacles();

if (storedGhost) {
  ghostButton.disabled = false;
  ghostButton.title = "Load your best recorded line as a ghost.";
} else {
  ghostButton.disabled = true;
  ghostButton.title = "Set a best run to unlock ghost replay.";
}
