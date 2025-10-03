import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { mountParticleField } from "../particles.js";
import { autoEnhanceFeedback, createLogChannel, createStatusChannel } from "../feedback.js";

const particleField = mountParticleField({
  effects: {
    palette: ["#38bdf8", "#f97316", "#f472b6", "#facc15"],
    ambientDensity: 0.35,
  },
});

const scoreConfig = getScoreConfig("whispers-garden");
const highScore = initHighScoreBanner({
  gameId: "whispers-garden",
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

const FIELD_RADIUS = 100;
const PLAYER_START = { x: 0, y: 72, angle: 0 };
const MOVE_SPEED = 22; // units per second
const BACKWARD_MULTIPLIER = 0.55;
const TURN_SPEED = 0.0055; // radians per ms
const CAPTURE_RADIUS = 10;
const ACTIVATE_RADIUS = 42;
const DETECTION_RADIUS = 115;
const FOCUS_TIME_MULTIPLIER = 2.6;
const BASE_TIME_MULTIPLIER = 1;
const MOON_DURATION_MS = 240_000;
const BONUS_FAST_WINDOW = 16_000;
const BONUS_STRETCH_WINDOW = 26_000;

const SPOTS = [
  {
    id: "home-plate",
    name: "Home Plate Clearing",
    shortName: "Home Plate",
    detail: "Home plate carves itself into the dirt.",
    position: { x: 0, y: -60 },
    baseValue: 12,
    grid: { row: 3, col: 2 },
  },
  {
    id: "first-baseline",
    name: "First Baseline Lantern",
    shortName: "First Baseline",
    detail: "A chalk beam races toward first.",
    position: { x: 48, y: -20 },
    baseValue: 12,
    grid: { row: 3, col: 3 },
  },
  {
    id: "third-baseline",
    name: "Third Baseline Lantern",
    shortName: "Third Baseline",
    detail: "Third base hums to life in amber arcs.",
    position: { x: -48, y: -20 },
    baseValue: 12,
    grid: { row: 3, col: 1 },
  },
  {
    id: "mound-rise",
    name: "Pitcher's Rise",
    shortName: "Pitcher's Mound",
    detail: "The mound breathes, ready for a windup.",
    position: { x: 0, y: 0 },
    baseValue: 14,
    grid: { row: 2, col: 2 },
  },
  {
    id: "second-arc",
    name: "Second Base Arc",
    shortName: "Second Base",
    detail: "Second base glitters with dew.",
    position: { x: 0, y: 48 },
    baseValue: 12,
    grid: { row: 2, col: 3 },
  },
  {
    id: "left-field",
    name: "Left Field Drift",
    shortName: "Left Field",
    detail: "Left field grass bows in a perfect sweep.",
    position: { x: -46, y: 60 },
    baseValue: 12,
    grid: { row: 1, col: 1 },
  },
  {
    id: "right-field",
    name: "Right Field Drift",
    shortName: "Right Field",
    detail: "Right field ripples under a star shower.",
    position: { x: 46, y: 60 },
    baseValue: 12,
    grid: { row: 1, col: 4 },
  },
  {
    id: "bleacher-trace",
    name: "Bleacher Trace",
    shortName: "Bleachers",
    detail: "Ghostly bleachers glow for the crowd beyond.",
    position: { x: 0, y: -88 },
    baseValue: 14,
    grid: { row: 4, col: 2 },
  },
];

const beginButton = document.getElementById("begin-run");
const resetButton = document.getElementById("reset-run");
const focusButton = document.getElementById("focus-button");
const fieldView = document.getElementById("field-view");
const statusLine = document.getElementById("status-line");
const completionFill = document.getElementById("completion-fill");
const completionValue = document.getElementById("completion-value");
const completionMeter = document.getElementById("completion-meter");
const completionNote = document.getElementById("completion-note");
const focusStatus = document.getElementById("focus-status");
const moonFace = document.getElementById("moon-face");
const moonValue = document.getElementById("moon-value");
const wrapSection = document.getElementById("wrap-up");
const wrapScoreValue = document.getElementById("wrap-score-value");
const wrapScoreNote = document.getElementById("wrap-score-note");
const wrapSubtitle = document.getElementById("wrap-subtitle");
const wrapMap = document.getElementById("wrap-map");
const wrapReplay = document.getElementById("wrap-replay");
const whisperLogElement = document.getElementById("whisper-log");

const logChannel = createLogChannel(whisperLogElement, { limit: 12 });
const setStatus = createStatusChannel(statusLine);

const spotElements = new Map();
const wrapTiles = new Map();

let audioContext = null;
let whisperBuffer = null;
let mainSource = null;
let mainGain = null;
let mainFilter = null;
let mainPanner = null;
let windSource = null;
const distractors = [];

const state = {
  active: false,
  outcome: null,
  player: { ...PLAYER_START },
  movement: { forward: false, backward: false, left: false, right: false },
  built: new Set(),
  currentIndex: 0,
  currentSpot: null,
  moonProgress: 0,
  baseCompletion: 0,
  bonusCompletion: 0,
  bonusAwards: 0,
  completion: 0,
  runStart: 0,
  whisperStart: 0,
  focusActive: false,
  focusHold: { key: false, pointer: false },
  focusUses: 0,
};

let animationFrame = null;
let lastTick = performance.now();

setupField();
setupWrapMap();
resetRun({ silent: true });

beginButton.addEventListener("click", () => {
  startRun();
});

resetButton.addEventListener("click", () => {
  resetRun();
});

wrapReplay.addEventListener("click", () => {
  resetRun();
  window.setTimeout(() => {
    startRun();
  }, 120);
});

focusButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  state.focusHold.pointer = true;
  updateFocusState();
});

focusButton.addEventListener("pointerup", () => {
  state.focusHold.pointer = false;
  updateFocusState();
});

focusButton.addEventListener("pointerleave", () => {
  state.focusHold.pointer = false;
  updateFocusState();
});

focusButton.addEventListener("pointercancel", () => {
  state.focusHold.pointer = false;
  updateFocusState();
});

function handleKeyDown(event) {
  if (event.repeat) {
    return;
  }
  const targetIsInput = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
  if (targetIsInput) {
    return;
  }
  switch (event.key) {
    case "ArrowUp":
    case "w":
    case "W":
      event.preventDefault();
      state.movement.forward = true;
      break;
    case "ArrowDown":
    case "s":
    case "S":
      event.preventDefault();
      state.movement.backward = true;
      break;
    case "ArrowLeft":
    case "a":
    case "A":
      event.preventDefault();
      state.movement.left = true;
      break;
    case "ArrowRight":
    case "d":
    case "D":
      event.preventDefault();
      state.movement.right = true;
      break;
    case "f":
    case "F": {
      event.preventDefault();
      state.focusHold.key = true;
      updateFocusState();
      break;
    }
    case "r":
    case "R": {
      event.preventDefault();
      resetRun();
      break;
    }
    default:
      break;
  }
}

function handleKeyUp(event) {
  const targetIsInput = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
  if (targetIsInput) {
    return;
  }
  switch (event.key) {
    case "ArrowUp":
    case "w":
    case "W":
      state.movement.forward = false;
      break;
    case "ArrowDown":
    case "s":
    case "S":
      state.movement.backward = false;
      break;
    case "ArrowLeft":
    case "a":
    case "A":
      state.movement.left = false;
      break;
    case "ArrowRight":
    case "d":
    case "D":
      state.movement.right = false;
      break;
    case "f":
    case "F":
      state.focusHold.key = false;
      updateFocusState();
      break;
    default:
      break;
  }
}

document.addEventListener("keydown", handleKeyDown);
document.addEventListener("keyup", handleKeyUp);

autoEnhanceFeedback({ statusSelectors: ["#status-line"], logSelectors: ["#whisper-log"] });
startAnimationLoop();

function startAnimationLoop() {
  cancelAnimationFrame(animationFrame);
  lastTick = performance.now();
  const step = (timestamp) => {
    const delta = timestamp - lastTick;
    lastTick = timestamp;
    update(delta);
    animationFrame = requestAnimationFrame(step);
  };
  animationFrame = requestAnimationFrame(step);
}

function update(delta) {
  updateMovement(delta);
  updateMoon(delta);
  updateAudio();
  updateFieldVisuals();
  checkCapture();
}

function updateMovement(delta) {
  if (!state.active) {
    return;
  }

  const angleDelta = TURN_SPEED * delta;
  if (state.movement.left && !state.movement.right) {
    state.player.angle -= angleDelta;
  } else if (state.movement.right && !state.movement.left) {
    state.player.angle += angleDelta;
  }

  normalizePlayerAngle();

  if (state.focusActive) {
    return;
  }

  let direction = 0;
  if (state.movement.forward && !state.movement.backward) {
    direction = 1;
  } else if (state.movement.backward && !state.movement.forward) {
    direction = -BACKWARD_MULTIPLIER;
  }

  if (direction === 0) {
    return;
  }

  const distance = MOVE_SPEED * direction * (delta / 1000);
  const dx = Math.sin(state.player.angle) * distance;
  const dy = -Math.cos(state.player.angle) * distance;
  state.player.x = clamp(state.player.x + dx, -FIELD_RADIUS + 2, FIELD_RADIUS - 2);
  state.player.y = clamp(state.player.y + dy, -FIELD_RADIUS + 2, FIELD_RADIUS - 2);
}

function updateMoon(delta) {
  if (!state.active) {
    return;
  }
  const speed = state.focusActive ? FOCUS_TIME_MULTIPLIER : BASE_TIME_MULTIPLIER;
  state.moonProgress += (delta * speed) / MOON_DURATION_MS;
  if (state.moonProgress >= 1) {
    state.moonProgress = 1;
    endRun(false, "Dawn overtook the whispers.");
  }
}

function updateAudio() {
  if (!audioContext) {
    return;
  }
  if (audioContext.state === "suspended") {
    return;
  }
  const listener = audioContext.listener;
  listener.positionX.setValueAtTime(state.player.x, audioContext.currentTime);
  listener.positionY.setValueAtTime(0, audioContext.currentTime);
  listener.positionZ.setValueAtTime(state.player.y, audioContext.currentTime);
  listener.forwardX.setValueAtTime(Math.sin(state.player.angle), audioContext.currentTime);
  listener.forwardY.setValueAtTime(0, audioContext.currentTime);
  listener.forwardZ.setValueAtTime(-Math.cos(state.player.angle), audioContext.currentTime);
  listener.upX.setValueAtTime(0, audioContext.currentTime);
  listener.upY.setValueAtTime(1, audioContext.currentTime);
  listener.upZ.setValueAtTime(0, audioContext.currentTime);

  if (mainPanner && state.currentSpot) {
    const { position } = state.currentSpot;
    mainPanner.positionX.setValueAtTime(position.x, audioContext.currentTime);
    mainPanner.positionY.setValueAtTime(0, audioContext.currentTime);
    mainPanner.positionZ.setValueAtTime(position.y, audioContext.currentTime);

    const distance = distanceTo(position);
    const normalized = clamp(1 - distance / DETECTION_RADIUS, 0, 1);
    const focusBoost = state.focusActive ? 0.2 : 0;
    const gainValue = clamp(0.08 + normalized * 0.75 + focusBoost, 0, 1.1);
    mainGain.gain.setTargetAtTime(gainValue, audioContext.currentTime, 0.12);

    const baseFrequency = 500 + normalized * 1800;
    const focusFactor = state.focusActive ? 1.8 : 1;
    mainFilter.frequency.setTargetAtTime(baseFrequency * focusFactor, audioContext.currentTime, 0.15);
    mainFilter.Q.setTargetAtTime(state.focusActive ? 3.2 : 0.8, audioContext.currentTime, 0.12);
  }

  distractors.forEach((track) => {
    const falloff = state.focusActive ? 0.3 : 1;
    track.gain.gain.setTargetAtTime(track.baseGain * falloff, audioContext.currentTime, 0.2);
  });
}

function updateFieldVisuals() {
  const xPercent = toPercent(state.player.x);
  const yPercent = toPercent(state.player.y);
  fieldView.style.setProperty("--player-x", `${xPercent}%`);
  fieldView.style.setProperty("--player-y", `${yPercent}%`);

  let ghostStage = 0;
  if (state.built.size >= 6) {
    ghostStage = 3;
  } else if (state.built.size >= 3) {
    ghostStage = 2;
  } else if (state.built.size >= 1) {
    ghostStage = 1;
  }
  fieldView.dataset.ghosts = String(ghostStage);

  if (!state.currentSpot) {
    fieldView.style.setProperty("--beam-strength", "0");
    return;
  }

  const { position } = state.currentSpot;
  const dx = position.x - state.player.x;
  const dy = position.y - state.player.y;
  const distance = Math.hypot(dx, dy);
  const targetAngle = Math.atan2(dx, -dy);
  const diff = Math.abs(normalizeAngle(targetAngle - state.player.angle));
  const directionConfidence = 1 - clamp(diff / Math.PI, 0, 1);
  const distanceFactor = clamp(1 - distance / DETECTION_RADIUS, 0, 1);
  const beamStrength = clamp(distanceFactor * 0.6 + directionConfidence * 0.35, 0, 1);
  fieldView.style.setProperty("--beam-angle", `${(targetAngle * 180) / Math.PI}deg`);
  fieldView.style.setProperty("--beam-strength", beamStrength.toFixed(3));

  SPOTS.forEach((spot) => {
    const element = spotElements.get(spot.id);
    if (!element) {
      return;
    }
    const built = state.built.has(spot.id);
    element.dataset.built = built ? "true" : "false";
    const isTarget = state.currentSpot?.id === spot.id;
    if (isTarget && distance <= ACTIVATE_RADIUS) {
      element.dataset.active = "true";
    } else if (isTarget) {
      element.dataset.active = "false";
    } else {
      element.dataset.active = "false";
    }
  });

  updateHUD();
}

function updateHUD() {
  completionValue.textContent = Math.round(state.completion).toString();
  completionFill.style.width = `${state.completion}%`;
  completionMeter.setAttribute("aria-valuenow", Math.round(state.completion).toString());
  if (state.bonusCompletion > 0) {
    completionNote.textContent = `Bonus ${Math.round(state.bonusCompletion)}% earned from quick finds.`;
  } else {
    completionNote.textContent = "Build each station to reach 100%.";
  }

  const moonPhase = clamp(state.moonProgress, 0, 1);
  moonFace.style.setProperty("--moon-phase", moonPhase.toFixed(3));
  if (moonPhase < 0.33) {
    moonValue.textContent = "Nightfall";
  } else if (moonPhase < 0.66) {
    moonValue.textContent = "Midnight Drift";
  } else if (moonPhase < 1) {
    moonValue.textContent = "Dawn Edge";
  } else {
    moonValue.textContent = "First Light";
  }
}

function checkCapture() {
  if (!state.active || !state.currentSpot) {
    return;
  }
  const distance = distanceTo(state.currentSpot.position);
  if (distance <= CAPTURE_RADIUS) {
    completeCurrentSpot();
  }
}

function completeCurrentSpot() {
  const spot = state.currentSpot;
  state.built.add(spot.id);
  state.baseCompletion += spot.baseValue;

  const elapsed = performance.now() - state.whisperStart;
  let bonus = 0;
  if (elapsed <= BONUS_FAST_WINDOW) {
    bonus = 4;
  } else if (elapsed <= BONUS_STRETCH_WINDOW) {
    bonus = 2;
  }
  if (bonus > 0) {
    state.bonusCompletion += bonus;
    state.bonusAwards += 1;
    logChannel.push(`${spot.shortName} ignites quickly. Bonus +${bonus}%`, "success");
  } else {
    logChannel.push(`${spot.shortName} settles into place.`, "info");
  }

  state.completion = clamp(state.baseCompletion + state.bonusCompletion, 0, 100);
  particleField.emitBurst(1.25);
  particleField.emitSparkle(1.1);

  updateWrapTiles();

  if (state.built.size >= SPOTS.length) {
    endRun(true, "Diamond complete.");
    return;
  }

  state.currentIndex += 1;
  state.currentSpot = SPOTS[state.currentIndex];
  state.whisperStart = performance.now();
  logChannel.push(`Whisper bends toward ${state.currentSpot.name}.`, "info");
  setStatus(`New whisper: ${state.currentSpot.name}.`, "info");
  ensureDistractors();
  restartMainWhisper();
}

function startRun() {
  if (state.active) {
    return;
  }
  state.active = true;
  state.outcome = null;
  state.player = { ...PLAYER_START };
  state.movement = { forward: false, backward: false, left: false, right: false };
  state.built.clear();
  state.baseCompletion = 0;
  state.bonusCompletion = 0;
  state.bonusAwards = 0;
  state.completion = 0;
  state.moonProgress = 0;
  state.runStart = performance.now();
  state.currentIndex = 0;
  state.currentSpot = SPOTS[0];
  state.whisperStart = performance.now();
  state.focusActive = false;
  state.focusHold = { key: false, pointer: false };
  state.focusUses = 0;
  wrapSection.hidden = true;
  focusStatus.textContent = "Idle";
  focusButton.disabled = false;
  focusButton.setAttribute("aria-pressed", "false");
  beginButton.disabled = true;
  ensureAudioContext().then(() => {
    restartMainWhisper();
    ensureWind();
    ensureDistractors();
  });
  updateWrapTiles();
  updateHUD();
  updateFieldVisuals();
  setStatus(`Whisper awakens near ${state.currentSpot.name}.`, "info");
  logChannel.push("The corn sighs. Track the whisper and raise the diamond.", "info");
}

function resetRun({ silent = false } = {}) {
  stopFocusImmediate();
  state.active = false;
  state.outcome = null;
  state.player = { ...PLAYER_START };
  state.movement = { forward: false, backward: false, left: false, right: false };
  state.built.clear();
  state.baseCompletion = 0;
  state.bonusCompletion = 0;
  state.bonusAwards = 0;
  state.completion = 0;
  state.moonProgress = 0;
  state.currentIndex = 0;
  state.currentSpot = null;
  state.focusActive = false;
  state.focusHold = { key: false, pointer: false };
  state.focusUses = 0;
  wrapSection.hidden = true;
  focusStatus.textContent = "Idle";
  focusButton.disabled = true;
  focusButton.setAttribute("aria-pressed", "false");
  beginButton.disabled = false;
  document.body.classList.remove("is-focusing");
  stopAudio();
  updateWrapTiles();
  updateFieldVisuals();
  updateHUD();
  if (!silent) {
    setStatus("Field reset. The whisper waits for you.", "info");
    logChannel.push("Field reset. Rows fall silent once more.", "neutral");
  } else {
    setStatus("Idle. Press Begin Listening when ready.", "info");
  }
}

function endRun(success, reason) {
  if (!state.active && state.outcome) {
    return;
  }
  state.active = false;
  state.outcome = success ? "success" : "failure";
  stopFocusImmediate();
  stopAudio();
  updateHUD();
  updateFieldVisuals();

  wrapSection.hidden = false;
  const completion = Math.round(state.completion);
  wrapScoreValue.textContent = `${completion}%`;
  wrapScoreNote.textContent = `Focus bursts: ${state.focusUses} · Bonus finds: ${state.bonusAwards}`;
  if (success) {
    wrapSubtitle.textContent = "The diamond shimmers beneath the constellations.";
    logChannel.push("The lineup assembles. The field is ready.", "success");
    setStatus("Diamond complete. Ghost players take their places.", "success");
    highScore.submit(completion, { focusBursts: state.focusUses, bonuses: state.bonusAwards });
    particleField.emitBurst(1.6);
    particleField.emitSparkle(1.4);
  } else {
    wrapSubtitle.textContent = reason ?? "Dawn cut the session short.";
    logChannel.push(reason ?? "Dawn cut the session short.", "warning");
    setStatus(reason ?? "Dawn cut the session short.", "warning");
  }
  beginButton.disabled = false;
  focusButton.disabled = true;
  updateWrapTiles();
}

function updateWrapTiles() {
  SPOTS.forEach((spot) => {
    const tile = wrapTiles.get(spot.id);
    if (tile) {
      tile.dataset.built = state.built.has(spot.id) ? "true" : "false";
    }
    const element = spotElements.get(spot.id);
    if (element) {
      element.dataset.built = state.built.has(spot.id) ? "true" : "false";
      element.dataset.active = state.currentSpot?.id === spot.id ? "true" : "false";
    }
  });
}

function normalizePlayerAngle() {
  if (state.player.angle > Math.PI) {
    state.player.angle -= Math.PI * 2;
  } else if (state.player.angle < -Math.PI) {
    state.player.angle += Math.PI * 2;
  }
}

function distanceTo(position) {
  const dx = position.x - state.player.x;
  const dy = position.y - state.player.y;
  return Math.hypot(dx, dy);
}

function toPercent(value) {
  return ((value + FIELD_RADIUS) / (FIELD_RADIUS * 2)) * 100;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeAngle(angle) {
  let result = angle;
  while (result > Math.PI) {
    result -= Math.PI * 2;
  }
  while (result < -Math.PI) {
    result += Math.PI * 2;
  }
  return result;
}

function setupField() {
  SPOTS.forEach((spot) => {
    const element = document.createElement("div");
    element.className = "field-spot";
    element.style.left = `${toPercent(spot.position.x)}%`;
    element.style.top = `${toPercent(spot.position.y)}%`;
    element.dataset.built = "false";
    element.dataset.active = "false";
    fieldView.appendChild(element);
    spotElements.set(spot.id, element);
  });
}

function setupWrapMap() {
  wrapMap.innerHTML = "";
  SPOTS.forEach((spot) => {
    const tile = document.createElement("div");
    tile.className = "wrap-tile";
    tile.dataset.built = "false";
    tile.style.gridRow = String(spot.grid.row);
    tile.style.gridColumn = String(spot.grid.col);
    tile.textContent = spot.shortName;
    wrapMap.appendChild(tile);
    wrapTiles.set(spot.id, tile);
  });
}

async function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new AudioContext();
    whisperBuffer = createWhisperBuffer(audioContext);
  }
  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }
  return audioContext;
}

function createWhisperBuffer(ctx) {
  const duration = 2.4;
  const sampleRate = ctx.sampleRate;
  const frameCount = Math.floor(duration * sampleRate);
  const buffer = ctx.createBuffer(1, frameCount, sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let index = 0; index < frameCount; index += 1) {
    const noise = Math.random() * 2 - 1;
    last = last * 0.96 + noise * 0.32;
    data[index] = last * 0.6;
  }
  return buffer;
}

function restartMainWhisper() {
  stopMainWhisper();
  if (!state.currentSpot || !audioContext || audioContext.state === "suspended") {
    return;
  }
  const source = new AudioBufferSourceNode(audioContext, { buffer: whisperBuffer, loop: true });
  const filter = new BiquadFilterNode(audioContext, { type: "lowpass", frequency: 600, Q: 1 });
  const panner = new PannerNode(audioContext, {
    panningModel: "HRTF",
    distanceModel: "linear",
    maxDistance: DETECTION_RADIUS + 40,
    refDistance: 6,
    rolloffFactor: 0.85,
  });
  const gain = new GainNode(audioContext, { gain: 0 });
  source.connect(filter).connect(panner).connect(gain).connect(audioContext.destination);
  source.start();
  mainSource = source;
  mainFilter = filter;
  mainPanner = panner;
  mainGain = gain;
}

function stopMainWhisper() {
  if (mainSource) {
    try {
      mainSource.stop();
    } catch (error) {
      // ignore
    }
    mainSource.disconnect();
    mainSource = null;
  }
  if (mainGain) {
    mainGain.disconnect();
    mainGain = null;
  }
  if (mainFilter) {
    mainFilter.disconnect();
    mainFilter = null;
  }
  if (mainPanner) {
    mainPanner.disconnect();
    mainPanner = null;
  }
}

function ensureWind() {
  if (windSource || !audioContext) {
    return;
  }
  const source = new AudioBufferSourceNode(audioContext, { buffer: whisperBuffer, loop: true });
  const filter = new BiquadFilterNode(audioContext, { type: "bandpass", frequency: 220, Q: 0.4 });
  const gain = new GainNode(audioContext, { gain: 0.05 });
  source.connect(filter).connect(gain).connect(audioContext.destination);
  source.start();
  windSource = { source, gain, filter };
}

function ensureDistractors() {
  if (!audioContext) {
    return;
  }
  const desired = state.built.size >= 5 ? 3 : state.built.size >= 2 ? 2 : state.built.size >= 1 ? 1 : 0;
  while (distractors.length < desired) {
    distractors.push(createDistractor());
  }
  while (distractors.length > desired) {
    const track = distractors.pop();
    stopDistractor(track);
  }
}

function createDistractor() {
  const angle = Math.random() * Math.PI * 2;
  const radius = 40 + Math.random() * 60;
  const position = {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
  const source = new AudioBufferSourceNode(audioContext, { buffer: whisperBuffer, loop: true });
  const filter = new BiquadFilterNode(audioContext, { type: "lowpass", frequency: 420, Q: 0.5 });
  const panner = new PannerNode(audioContext, {
    panningModel: "HRTF",
    distanceModel: "linear",
    maxDistance: DETECTION_RADIUS + 30,
    refDistance: 8,
    rolloffFactor: 0.9,
  });
  const gain = new GainNode(audioContext, { gain: 0.05 + Math.random() * 0.06 });
  panner.positionX.setValueAtTime(position.x, audioContext.currentTime);
  panner.positionY.setValueAtTime(0, audioContext.currentTime);
  panner.positionZ.setValueAtTime(position.y, audioContext.currentTime);
  source.connect(filter).connect(panner).connect(gain).connect(audioContext.destination);
  source.start(audioContext.currentTime + Math.random());
  return { source, filter, panner, gain, baseGain: gain.gain.value };
}

function stopDistractor(track) {
  if (!track) {
    return;
  }
  try {
    track.source.stop();
  } catch (error) {
    // ignore
  }
  track.source.disconnect();
  track.filter.disconnect();
  track.panner.disconnect();
  track.gain.disconnect();
}

function stopAudio() {
  stopMainWhisper();
  distractors.splice(0, distractors.length).forEach(stopDistractor);
  if (windSource) {
    try {
      windSource.source.stop();
    } catch (error) {
      // ignore
    }
    windSource.source.disconnect();
    windSource.filter.disconnect();
    windSource.gain.disconnect();
    windSource = null;
  }
}

function updateFocusState() {
  const shouldFocus = state.active && !state.outcome && (state.focusHold.key || state.focusHold.pointer);
  if (shouldFocus) {
    startFocus();
  } else {
    stopFocus();
  }
}

function startFocus() {
  if (state.focusActive || !state.active || state.outcome) {
    return;
  }
  state.focusActive = true;
  state.movement.forward = false;
  state.movement.backward = false;
  state.focusUses += 1;
  focusButton.setAttribute("aria-pressed", "true");
  focusStatus.textContent = "Focusing";
  document.body.classList.add("is-focusing");
  setStatus("Focus engaged. The whisper clarifies as the moon sprints.", "warning");
  logChannel.push("Focus engaged. Time quickens.", "warning");
}

function stopFocus(force = false) {
  if (!state.focusActive) {
    return;
  }
  if (!force && (state.focusHold.key || state.focusHold.pointer)) {
    return;
  }
  state.focusActive = false;
  focusButton.setAttribute("aria-pressed", "false");
  focusStatus.textContent = "Idle";
  document.body.classList.remove("is-focusing");
  if (!force) {
    logChannel.push("Focus released. Pace steadies.", "info");
    setStatus("Focus released. Pace steadies.", "info");
  }
}

function stopFocusImmediate() {
  state.focusHold = { key: false, pointer: false };
  if (state.focusActive) {
    stopFocus(true);
  }
  state.focusActive = false;
  focusButton.setAttribute("aria-pressed", "false");
  focusStatus.textContent = "Idle";
  document.body.classList.remove("is-focusing");
}

function cancelAnimationFrame(handle) {
  if (typeof window !== "undefined" && window.cancelAnimationFrame) {
    window.cancelAnimationFrame(handle);
  }
}

