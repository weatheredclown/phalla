import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { mountParticleField } from "../particles.js";
import { autoEnhanceFeedback, createLogChannel, createStatusChannel } from "../feedback.js";

const particleField = mountParticleField({
  effects: {
    palette: ["#38bdf8", "#a855f7", "#facc15", "#f472b6"],
    ambientDensity: 0.45,
  },
});

autoEnhanceFeedback();

const scoreConfig = getScoreConfig("disorient-express");
const highScore = initHighScoreBanner({
  gameId: "disorient-express",
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

const GRID_LAYOUT = [
  [
    { type: "void" },
    { type: "track", surface: "tile", label: "Signal" },
    { type: "track", surface: "tile", label: "Bench" },
    { type: "track", surface: "tile", label: "Aisle" },
    { type: "goal", surface: "tile", label: "Phone" },
  ],
  [
    { type: "track", surface: "tile", label: "Steps" },
    { type: "track", surface: "carpet", label: "Mat" },
    { type: "hazard", surface: "wood", label: "Squeak", hazardId: "floorboard" },
    { type: "track", surface: "tile", label: "Crates" },
    { type: "track", surface: "tile", label: "Desk" },
  ],
  [
    { type: "track", surface: "metal", label: "Grate" },
    { type: "void" },
    { type: "track", surface: "tile", label: "Panel" },
    { type: "void" },
    { type: "track", surface: "metal", label: "Valve" },
  ],
  [
    { type: "track", surface: "carpet", label: "Runner" },
    { type: "track", surface: "tile", label: "Pipes" },
    { type: "track", surface: "tile", label: "Gears" },
    { type: "hazard", surface: "metal", label: "Tool Bin", hazardId: "crate" },
    { type: "track", surface: "tile", label: "Cab" },
  ],
  [
    { type: "start", surface: "tile", label: "Start" },
    { type: "track", surface: "carpet", label: "Seat" },
    { type: "track", surface: "carpet", label: "Curtain" },
    { type: "track", surface: "tile", label: "Switch" },
    { type: "track", surface: "tile", label: "Bridge" },
  ],
];

const START = { row: 4, col: 0 };
const GOAL = { row: 0, col: 4 };

const HAZARDS = {
  "1,2": {
    id: "floorboard",
    message: "Alert! The squeaky floorboard screeched. +10s penalty.",
  },
  "3,3": {
    id: "crate",
    message: "Alert! Tool bin toppled with a clang. +10s penalty.",
  },
};

const AUDIO_TRAPS = [
  {
    id: "steam-vent",
    center: { row: 2, col: 4 },
    radius: 1,
    duration: 3200,
    startLabel: "Steam building starboard",
    clearLabel: "Steam dispersing",
    status: "Steam valve venting—hold position!",
    log: "Steam valve howls to the right. Freeze until it clears.",
    feed: "Steam roar to the right. Hold steady.",
    releaseFeed: "Steam quiet. Track reopens.",
    pan: 0.65,
  },
];

const MOVE_VECTORS = {
  up: { row: -1, col: 0, facing: "north", pan: 0 },
  down: { row: 1, col: 0, facing: "south", pan: 0 },
  left: { row: 0, col: -1, facing: "west", pan: -0.35 },
  right: { row: 0, col: 1, facing: "east", pan: 0.35 },
};

const MOVE_KEYS = {
  w: "up",
  ArrowUp: "up",
  s: "down",
  ArrowDown: "down",
  a: "left",
  ArrowLeft: "left",
  d: "right",
  ArrowRight: "right",
};

const eyesGrid = document.getElementById("eyes-grid");
const startButton = document.getElementById("start-run");
const resetButton = document.getElementById("reset-run");
const rushButton = document.getElementById("rush-toggle");
const statusBar = document.getElementById("status-bar");
const logList = document.getElementById("event-log");
const timeElement = document.getElementById("cooperation-time");
const miscommunicationElement = document.getElementById("miscommunication-count");
const signalElement = document.getElementById("signal-strength");
const rushStatusElement = document.getElementById("rush-status");
const audioAlertElement = document.getElementById("audio-alert");
const earsFeedElement = document.getElementById("ears-feed");
const controlPad = document.querySelectorAll(".control-button");
const summaryOverlay = document.getElementById("summary-overlay");
const summaryBackdrop = document.getElementById("summary-backdrop");
const summaryTime = document.getElementById("summary-time");
const summaryMiscommunications = document.getElementById("summary-miscommunications");
const summaryRush = document.getElementById("summary-rush");
const summaryReplay = document.getElementById("summary-replay");
const summaryClose = document.getElementById("summary-close");

const logChannel = createLogChannel(logList, { limit: 14 });
const setStatus = createStatusChannel(statusBar);

const cellElements = [];

const state = {
  missionActive: false,
  rushing: false,
  rushActivations: 0,
  position: { ...START },
  facing: "north",
  mistakes: 0,
  penaltyMs: 0,
  timerStart: 0,
  timerId: null,
  ringId: null,
  elapsedMs: 0,
  lastMoveAt: 0,
  activeTrap: null,
  resolvedTraps: new Set(),
  audioContext: null,
  audioMaster: null,
  audioFilter: null,
};

let noiseBuffer = null;

renderGrid();
resetMission();
updateRushVisuals();
updateSignalStrength();
updateAudioFeed("Awaiting mission start.");
setStatus("Awaiting mission start.");

startButton.addEventListener("click", () => {
  if (!state.missionActive) {
    startMission();
  }
});

resetButton.addEventListener("click", () => {
  resetMission();
  setStatus("Carriage reset. Plot a fresh route.", "info");
  logChannel.push("Carriage reset to the starting marker.", "info");
});

rushButton.addEventListener("click", () => {
  if (!state.missionActive) {
    return;
  }
  toggleRush();
});

summaryReplay.addEventListener("click", () => {
  hideSummary();
  resetMission();
  startMission();
});

summaryClose.addEventListener("click", () => {
  hideSummary();
});

summaryBackdrop.addEventListener("click", hideSummary);

controlPad.forEach((button) => {
  button.addEventListener("click", () => {
    const direction = button.dataset.direction;
    if (direction === "hold") {
      holdPosition();
    } else if (direction) {
      attemptMove(direction);
    }
  });
});

document.addEventListener("keydown", (event) => {
  if (event.repeat) {
    return;
  }
  if (event.key === "r" || event.key === "R") {
    if (state.missionActive) {
      event.preventDefault();
      toggleRush();
    }
    return;
  }
  if (event.key === " " || event.code === "Space") {
    if (state.missionActive) {
      event.preventDefault();
      holdPosition();
    }
    return;
  }
  const direction = MOVE_KEYS[event.key];
  if (direction) {
    event.preventDefault();
    attemptMove(direction);
  }
});

function renderGrid() {
  eyesGrid.innerHTML = "";
  cellElements.length = 0;
  GRID_LAYOUT.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const tile = document.createElement("div");
      tile.classList.add("map-cell");
      tile.dataset.row = String(rowIndex);
      tile.dataset.col = String(colIndex);
      if (cell.type === "void") {
        tile.classList.add("is-void");
      } else {
        tile.classList.add("is-track");
        if (cell.type === "start") {
          tile.classList.add("is-start");
        }
        if (cell.type === "goal") {
          tile.classList.add("is-goal");
        }
        if (cell.type === "hazard") {
          tile.classList.add("is-hazard");
        }
        tile.textContent = cell.label ?? "";
      }
      eyesGrid.append(tile);
      if (!cellElements[rowIndex]) {
        cellElements[rowIndex] = [];
      }
      cellElements[rowIndex][colIndex] = tile;
    });
  });
}

function startMission() {
  resetMission();
  const context = ensureAudioContext();
  if (context && context.state === "suspended") {
    context.resume().catch(() => {});
  }
  state.missionActive = true;
  state.timerStart = performance.now();
  state.timerId = window.setInterval(updateTimer, 80);
  state.ringId = window.setInterval(playRingCue, 1400);
  updateTimer();
  updateRushVisuals();
  updateAudioFeed("Mission live. Track the ringing phone.");
  setStatus("Mission live. Eyes guide every stride.", "success");
  logChannel.push("Mission start. Coordinate the cabin.", "success");
  startButton.disabled = true;
}

function resetMission() {
  stopTimers();
  stopActiveTrap();
  state.missionActive = false;
  state.position = { ...START };
  state.facing = "north";
  state.mistakes = 0;
  state.penaltyMs = 0;
  state.elapsedMs = 0;
  state.rushing = false;
  state.rushActivations = 0;
  state.resolvedTraps.clear();
  updateTimer();
  updateMiscommunications();
  updateRushVisuals();
  updateSignalStrength();
  updateAudioAlert("None");
  updateAudioFeed("Awaiting mission start.");
  startButton.disabled = false;
  highlightPosition();
}

function stopTimers() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
  if (state.ringId) {
    window.clearInterval(state.ringId);
    state.ringId = null;
  }
}

function attemptMove(direction) {
  if (!state.missionActive) {
    return;
  }
  const now = performance.now();
  const cooldown = state.rushing ? 120 : 220;
  if (now - state.lastMoveAt < cooldown) {
    return;
  }
  const vector = MOVE_VECTORS[direction];
  if (!vector) {
    return;
  }
  const targetRow = state.position.row + vector.row;
  const targetCol = state.position.col + vector.col;
  const targetCell = GRID_LAYOUT[targetRow]?.[targetCol];
  if (!targetCell || targetCell.type === "void") {
    logChannel.push("Bounced off a bulkhead. Re-center the route.", "warning");
    setStatus("That path is blocked. Adjust course.", "warning");
    playBumpTone();
    return;
  }
  state.lastMoveAt = now;
  state.position = { row: targetRow, col: targetCol };
  state.facing = vector.facing;
  highlightPosition();
  checkTrapDuringMove();
  const surface = targetCell.surface ?? "tile";
  playFootstep(surface, vector.pan);
  updateSignalStrength();
  updateAudioFeed(describeAudioCue(surface));
  logChannel.push(`Moved ${vector.facing} onto ${surfaceLabel(surface)} track.`);
  if (targetCell.type === "hazard") {
    triggerHazard(targetRow, targetCol);
  }
  checkAudioTrapProximity();
  if (targetRow === GOAL.row && targetCol === GOAL.col) {
    finishMission();
  }
}

function highlightPosition() {
  cellElements.flat().forEach((cell) => {
    if (cell) {
      cell.classList.remove("is-current");
    }
  });
  const tile = cellElements[state.position.row]?.[state.position.col];
  if (tile) {
    tile.classList.add("is-current");
  }
}

function triggerHazard(row, col) {
  const key = `${row},${col}`;
  const hazard = HAZARDS[key];
  if (!hazard) {
    return;
  }
  registerMiscommunication(hazard.message);
}

function checkTrapDuringMove() {
  if (!state.activeTrap) {
    return;
  }
  registerMiscommunication("Alert! You shuffled during the conductor's sweep. +10s penalty.");
  resolveAudioTrap(true);
}

function checkAudioTrapProximity() {
  if (!state.missionActive) {
    return;
  }
  for (const trap of AUDIO_TRAPS) {
    if (state.resolvedTraps.has(trap.id) || (state.activeTrap && state.activeTrap.trap.id === trap.id)) {
      continue;
    }
    const distance =
      Math.abs(state.position.row - trap.center.row) + Math.abs(state.position.col - trap.center.col);
    if (distance <= trap.radius) {
      startAudioTrap(trap);
      break;
    }
  }
}

function startAudioTrap(trap) {
  stopActiveTrap();
  const context = ensureAudioContext();
  const source = context?.createBufferSource();
  if (context && source) {
    if (!noiseBuffer) {
      noiseBuffer = createNoiseBuffer(context);
    }
    source.buffer = noiseBuffer;
    source.loop = true;
    const gain = context.createGain();
    gain.gain.value = state.rushing ? 0.12 : 0.22;
    const panner = context.createStereoPanner();
    panner.pan.value = trap.pan ?? 0;
    source.connect(gain);
    gain.connect(panner);
    panner.connect(state.audioFilter ?? context.destination);
    source.start();
    state.activeTrap = {
      trap,
      source,
      gain,
      timeout: window.setTimeout(() => resolveAudioTrap(false), trap.duration),
      endsAt: performance.now() + trap.duration,
    };
  } else {
    state.activeTrap = {
      trap,
      source: null,
      gain: null,
      timeout: window.setTimeout(() => resolveAudioTrap(false), trap.duration),
      endsAt: performance.now() + trap.duration,
    };
  }
  updateAudioAlert(trap.startLabel);
  updateAudioFeed(trap.feed);
  setStatus(trap.status, "warning");
  logChannel.push(trap.log, "warning");
}

function stopActiveTrap() {
  if (!state.activeTrap) {
    return;
  }
  if (state.activeTrap.timeout) {
    window.clearTimeout(state.activeTrap.timeout);
  }
  if (state.activeTrap.source) {
    try {
      state.activeTrap.source.stop();
    } catch (error) {
      // ignore
    }
  }
  state.activeTrap = null;
  updateAudioAlert("None");
}

function resolveAudioTrap(triggeredByPenalty) {
  if (!state.activeTrap) {
    return;
  }
  const { trap } = state.activeTrap;
  if (state.activeTrap.timeout) {
    window.clearTimeout(state.activeTrap.timeout);
  }
  if (state.activeTrap.source) {
    try {
      state.activeTrap.source.stop();
    } catch (error) {
      // ignore
    }
  }
  state.activeTrap = null;
  state.resolvedTraps.add(trap.id);
  if (triggeredByPenalty) {
    updateAudioAlert("Alert triggered");
    setTimeout(() => {
      if (!state.activeTrap) {
        updateAudioAlert("None");
      }
    }, 1500);
  } else {
    updateAudioAlert(trap.clearLabel);
    updateAudioFeed(trap.releaseFeed);
    setTimeout(() => {
      if (!state.activeTrap) {
        updateAudioAlert("None");
      }
    }, 1500);
    logChannel.push("Audio hazard cleared.", "success");
    setStatus("Audio hazard clear. Advance when ready.", "success");
  }
}

function holdPosition() {
  if (!state.missionActive) {
    return;
  }
  playHoldTone();
  if (state.activeTrap) {
    logChannel.push("Holding while the hazard passes.");
    setStatus("Holding position. Wait for the all-clear.", "info");
    if (state.activeTrap.timeout) {
      const remaining = state.activeTrap.endsAt - performance.now();
      const shortened = Math.max(400, remaining - 500);
      window.clearTimeout(state.activeTrap.timeout);
      state.activeTrap.timeout = window.setTimeout(() => resolveAudioTrap(false), shortened);
      state.activeTrap.endsAt = performance.now() + shortened;
    }
  } else {
    logChannel.push("Holding to confirm bearings.");
    setStatus("Position steady. Confirm the next instruction.", "info");
  }
}

function registerMiscommunication(message) {
  state.mistakes += 1;
  state.penaltyMs += 10000;
  updateMiscommunications();
  updateTimer();
  setStatus(message, "danger");
  updateAudioAlert("Alert! Penalty applied");
  logChannel.push(message, "danger");
  playFailureBuzzer();
}

function updateMiscommunications() {
  miscommunicationElement.textContent = String(state.mistakes);
}

function finishMission() {
  stopTimers();
  stopActiveTrap();
  state.missionActive = false;
  state.elapsedMs = performance.now() - state.timerStart + state.penaltyMs;
  updateTimer();
  updateAudioFeed("Phone answered. Mission complete.");
  setStatus("Phone answered! Mission success.", "success");
  logChannel.push("Phone answered with perfect coordination.", "success");
  playSuccessChord();
  particleField.emitBurst(1.4);
  const scoreValue = Math.max(0, 300000 - Math.round(state.elapsedMs));
  const meta = {
    finalTimeMs: Math.round(state.elapsedMs),
    miscommunications: state.mistakes,
    display: formatTime(state.elapsedMs),
    rushCount: state.rushActivations,
  };
  highScore.submit(scoreValue, meta);
  summaryTime.textContent = formatTime(state.elapsedMs);
  summaryMiscommunications.textContent = String(state.mistakes);
  summaryRush.textContent = state.rushActivations > 0 ? `Engaged ×${state.rushActivations}` : "Standby";
  showSummary();
  startButton.disabled = false;
}

function showSummary() {
  summaryOverlay.hidden = false;
  summaryOverlay.setAttribute("aria-hidden", "false");
}

function hideSummary() {
  summaryOverlay.hidden = true;
  summaryOverlay.setAttribute("aria-hidden", "true");
}

function updateTimer() {
  if (state.missionActive) {
    state.elapsedMs = performance.now() - state.timerStart + state.penaltyMs;
  }
  timeElement.textContent = formatTime(state.elapsedMs);
}

function updateRushVisuals() {
  rushButton.setAttribute("aria-pressed", state.rushing ? "true" : "false");
  rushStatusElement.textContent = state.rushing ? "Rushing" : "Standby";
  rushButton.textContent = state.rushing ? "Cancel Rush Orders" : "Issue Rush Orders";
  applyRushFilter();
}

function toggleRush() {
  state.rushing = !state.rushing;
  if (state.rushing) {
    state.rushActivations += 1;
    setStatus("Rush orders engaged. Audio clarity reduced!", "warning");
    logChannel.push("Rush orders engaged—moves accelerate but cues muffle.", "warning");
  } else {
    setStatus("Rush cancelled. Audio feed restored.", "info");
    logChannel.push("Rush cancelled—returning to steady pace.");
  }
  updateRushVisuals();
}

function applyRushFilter() {
  const context = state.audioContext;
  if (!context || !state.audioFilter) {
    return;
  }
  const target = state.rushing ? 900 : 4800;
  state.audioFilter.frequency.setTargetAtTime(target, context.currentTime, 0.2);
}

function updateSignalStrength() {
  const distance = Math.abs(GOAL.row - state.position.row) + Math.abs(GOAL.col - state.position.col);
  let strength = "Calibrating…";
  if (state.missionActive) {
    if (distance === 0) {
      strength = "On target";
    } else if (distance <= 2) {
      strength = "Locked";
    } else if (distance <= 4) {
      strength = "Strong";
    } else {
      strength = "Faint";
    }
    const bearing = describeBearing();
    if (bearing) {
      strength += ` · ${bearing}`;
    }
  }
  signalElement.textContent = strength;
}

function describeBearing() {
  const vertical = GOAL.row - state.position.row;
  const horizontal = GOAL.col - state.position.col;
  const parts = [];
  if (vertical < 0) {
    parts.push("behind");
  } else if (vertical > 0) {
    parts.push("ahead");
  }
  if (horizontal < 0) {
    parts.push("left");
  } else if (horizontal > 0) {
    parts.push("right");
  }
  return parts.join("-");
}

function updateAudioFeed(message) {
  earsFeedElement.textContent = message;
}

function updateAudioAlert(message) {
  audioAlertElement.textContent = message;
}

function describeAudioCue(surface) {
  const bearing = describeBearing();
  const ring = bearing ? `Phone ${bearing}` : "Phone centered";
  const surfaceText = surfaceLabel(surface);
  return `${capitalize(surfaceText)} step · ${ring}`;
}

function surfaceLabel(surface) {
  switch (surface) {
    case "carpet":
      return "soft carpet";
    case "metal":
      return "metal grate";
    case "wood":
      return "wood panel";
    default:
      return "tile";
  }
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatTime(ms) {
  const safe = Math.max(0, Math.round(ms));
  const minutes = Math.floor(safe / 60000);
  const seconds = Math.floor((safe % 60000) / 1000);
  const millis = safe % 1000;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

function ensureAudioContext() {
  if (state.audioContext) {
    return state.audioContext;
  }
  if (!window.AudioContext && !window.webkitAudioContext) {
    return null;
  }
  const Context = window.AudioContext || window.webkitAudioContext;
  const context = new Context();
  const master = context.createGain();
  master.gain.value = 0.6;
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 4800;
  filter.connect(master);
  master.connect(context.destination);
  state.audioContext = context;
  state.audioMaster = master;
  state.audioFilter = filter;
  return context;
}

function playRingCue() {
  if (!state.missionActive) {
    return;
  }
  const context = ensureAudioContext();
  if (!context) {
    return;
  }
  const panValue = Math.max(-1, Math.min(1, (GOAL.col - state.position.col) / 2));
  const now = context.currentTime;
  for (let i = 0; i < 2; i += 1) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    const panner = context.createStereoPanner();
    panner.pan.value = panValue;
    osc.type = "square";
    const start = now + i * 0.28;
    osc.frequency.setValueAtTime(920, start);
    gain.gain.setValueAtTime(0, start);
    const peak = state.rushing ? 0.16 : 0.32;
    gain.gain.linearRampToValueAtTime(peak, start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
    osc.connect(gain);
    gain.connect(panner);
    panner.connect(state.audioFilter ?? context.destination);
    osc.start(start);
    osc.stop(start + 0.28);
  }
}

function playFootstep(surface, pan = 0) {
  const context = ensureAudioContext();
  if (!context) {
    return;
  }
  const osc = context.createOscillator();
  const gain = context.createGain();
  const panner = context.createStereoPanner();
  panner.pan.value = pan;
  osc.type = surface === "metal" ? "triangle" : "sine";
  const baseFreq = surface === "carpet" ? 180 : surface === "metal" ? 420 : surface === "wood" ? 260 : 300;
  osc.frequency.setValueAtTime(baseFreq, context.currentTime);
  gain.gain.setValueAtTime(0, context.currentTime);
  const peak = surface === "carpet" ? 0.22 : 0.33;
  gain.gain.linearRampToValueAtTime(peak, context.currentTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.28);
  osc.connect(gain);
  gain.connect(panner);
  panner.connect(state.audioFilter ?? context.destination);
  osc.start();
  osc.stop(context.currentTime + 0.32);
}

function playBumpTone() {
  const context = ensureAudioContext();
  if (!context) {
    return;
  }
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(120, context.currentTime);
  gain.gain.setValueAtTime(0, context.currentTime);
  gain.gain.linearRampToValueAtTime(0.2, context.currentTime + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.25);
  osc.connect(gain);
  gain.connect(state.audioFilter ?? context.destination);
  osc.start();
  osc.stop(context.currentTime + 0.28);
}

function playHoldTone() {
  const context = ensureAudioContext();
  if (!context) {
    return;
  }
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(540, context.currentTime);
  gain.gain.setValueAtTime(0, context.currentTime);
  gain.gain.linearRampToValueAtTime(0.16, context.currentTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.24);
  osc.connect(gain);
  gain.connect(state.audioFilter ?? context.destination);
  osc.start();
  osc.stop(context.currentTime + 0.26);
}

function playFailureBuzzer() {
  const context = ensureAudioContext();
  if (!context) {
    return;
  }
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(180, context.currentTime);
  gain.gain.setValueAtTime(0, context.currentTime);
  gain.gain.linearRampToValueAtTime(0.3, context.currentTime + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.5);
  osc.connect(gain);
  gain.connect(state.audioFilter ?? context.destination);
  osc.start();
  osc.stop(context.currentTime + 0.55);
}

function playSuccessChord() {
  const context = ensureAudioContext();
  if (!context) {
    return;
  }
  const freqs = [523.25, 659.25, 783.99];
  const now = context.currentTime;
  freqs.forEach((frequency, index) => {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.26, now + 0.05 * index);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc.connect(gain);
    gain.connect(state.audioFilter ?? context.destination);
    osc.start(now);
    osc.stop(now + 1);
  });
}

function createNoiseBuffer(context) {
  const buffer = context.createBuffer(1, context.sampleRate * 1.5, context.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < channel.length; i += 1) {
    channel[i] = Math.random() * 2 - 1;
  }
  return buffer;
}
