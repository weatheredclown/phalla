import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { autoEnhanceFeedback } from "../feedback.js";
import { mountParticleField } from "../particles.js";

const GAME_ID = "toilet-bomb-disposal";
const START_TIME_SECONDS = 120;
const PENALTY_SECONDS = 25;
const RIGGS_SUCCESS_CHANCE = 0.18;

const stagePalettes = {
  wires: ["#38bdf8", "#0ea5e9", "#22d3ee"],
  sensor: ["#f97316", "#fb923c", "#facc15"],
  pressure: ["#f472b6", "#f87171", "#facc15"],
};

const completionPalette = ["#facc15", "#fbbf24", "#38bdf8"];
const failurePalette = ["#f87171", "#fb7185", "#f97316"];
const celebrationIntensity = {
  wires: 0.9,
  sensor: 1.1,
  pressure: 1.45,
};

const scoreConfig = getScoreConfig(GAME_ID);
const highScore = initHighScoreBanner({
  gameId: GAME_ID,
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

autoEnhanceFeedback();

const body = document.body;
const simulator = document.querySelector(".simulator");
const timerValue = document.getElementById("timer-value");
const phaseFlag = document.getElementById("phase-flag");
const riggsFlag = document.getElementById("riggs-flag");
const wireStatus = document.getElementById("wire-status");
const sensorStatus = document.getElementById("sensor-status");
const pressureStatus = document.getElementById("pressure-status");
const wireButtons = Array.from(document.querySelectorAll(".wire"));
const sensorPanel = document.getElementById("sensor-panel");
const pressurePanel = document.getElementById("pressure-panel");
const sensorForm = document.querySelector(".sensor-form");
const pressureApplyButton = document.getElementById("pressure-apply");
const pressureInputs = Array.from(document.querySelectorAll(".pressure-controls input[type='checkbox']"));
const riggsFeed = document.getElementById("riggs-feed");
const eventLog = document.getElementById("event-log");
const wrapup = document.getElementById("wrapup");
const wrapupDialog = wrapup.querySelector(".wrapup-dialog");
const wrapupTime = document.getElementById("wrapup-time");
const wrapupRiggs = document.getElementById("wrapup-riggs");
const wrapupMistakes = document.getElementById("wrapup-mistakes");
const wrapupSubtitle = document.getElementById("wrapup-subtitle");
const wrapupRetry = document.getElementById("wrapup-retry");
const wrapupClose = document.getElementById("wrapup-close");

const particleField = mountParticleField({
  container: simulator ?? undefined,
  colors: ["#0ea5e9", "#38bdf8", "#f472b6", "#facc15"],
  effects: {
    palette: ["#38bdf8", "#f97316", "#facc15", "#f472b6"],
    ambientDensity: 0.58,
    zIndex: 22,
  },
});

const wiresSolution = ["green", "yellow"];
const weightTargets = {
  "dry-a": 10,
  "dry-b": 12,
  soaked: 20,
  toolkit: 8,
};
const TARGET_WEIGHT = 42;

const panelMap = {
  wires: document.getElementById("wires-panel"),
  sensor: sensorPanel,
  pressure: pressurePanel,
};

const riggsAdviceByStage = {
  wires: [
    "Forget the mirrors—just snip the blue one and sprint!",
    "Cut them all at once. The detonator can't keep up!",
    "Yellow looks suspicious. Pop it before the clock blinks again!",
  ],
  sensor: [
    "Skip the settings. Punch the power straight to standby!",
    "Just yank the whole sensor plate. It'll stop noticing movement!",
    "Wide sweep, narrow sweep—none of it matters. Kill the juice first!",
  ],
  pressure: [
    "Kick the seat! Pressure plates hate confidence!",
    "Toss every weight on. Something will cancel out!",
    "You don't need math. Just pull the lever and hope!",
  ],
};

const state = {
  timeRemaining: START_TIME_SECONDS,
  timerId: null,
  lastTick: performance.now(),
  stage: "wires",
  wiresCut: [],
  sensorHistory: [],
  sensorValues: {
    sweep: "continuous",
    field: "wide",
    power: "active",
  },
  riggsTimer: null,
  riggsUsed: false,
  riggsSuccess: false,
  riggsPrompt: null,
  mistakes: 0,
  isComplete: false,
  isDetonated: false,
  beepTimeout: null,
  audioContext: null,
};

wireButtons.forEach((button) => {
  button.addEventListener("click", () => handleWireCut(button));
});

sensorForm.addEventListener("change", (event) => {
  if (state.stage !== "sensor") {
    return;
  }
  const target = event.target;
  if (target instanceof HTMLInputElement && target.type === "radio") {
    recordSensorChange(target.name, target.value);
  }
});

sensorForm.addEventListener("submit", (event) => {
  event.preventDefault();
  handleSensorSubmit();
});

pressureApplyButton.addEventListener("click", handlePressureApply);
wrapupRetry.addEventListener("click", () => {
  hideWrapup();
  restartGame();
});
wrapupClose.addEventListener("click", () => {
  hideWrapup();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    suspendAudio();
  }
});

logEvent("Timer armed. Read every clue before you move.");
updateTimerDisplay();
updatePhaseFlag();
updateRiggsFlag();
highlightActivePanel(state.stage);
updateAmbientForStage(state.stage);
startCountdown();
scheduleRiggs();

function startCountdown() {
  if (state.timerId) {
    return;
  }
  state.lastTick = performance.now();
  state.timerId = window.setInterval(() => {
    const now = performance.now();
    const delta = (now - state.lastTick) / 1000;
    state.lastTick = now;
    state.timeRemaining = Math.max(0, state.timeRemaining - delta);
    updateTimerDisplay();
    if (state.timeRemaining <= 0) {
      triggerFailure("Timer expired.");
    }
  }, 100);
  scheduleBeep();
}

function stopCountdown() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
  if (state.beepTimeout) {
    window.clearTimeout(state.beepTimeout);
    state.beepTimeout = null;
  }
}

function scheduleBeep() {
  if (state.beepTimeout) {
    window.clearTimeout(state.beepTimeout);
  }
  if (state.isComplete || state.isDetonated) {
    return;
  }
  const progress = 1 - state.timeRemaining / START_TIME_SECONDS;
  const interval = Math.max(140, 620 - progress * 420);
  state.beepTimeout = window.setTimeout(() => {
    playBeep(progress);
    scheduleBeep();
  }, interval);
}

function playBeep(progress) {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  try {
    const now = ctx.currentTime;
    const baseFrequency = 520 + progress * 420;
    const primary = ctx.createOscillator();
    const overtone = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    primary.type = "square";
    overtone.type = "triangle";
    primary.frequency.setValueAtTime(baseFrequency, now);
    primary.frequency.linearRampToValueAtTime(baseFrequency + 120, now + 0.18);
    overtone.frequency.setValueAtTime(baseFrequency / 2, now);
    overtone.frequency.linearRampToValueAtTime(baseFrequency, now + 0.18);
    overtone.detune.setValueAtTime(15, now);
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(baseFrequency, now);
    filter.Q.setValueAtTime(9, now);
    const startGain = 0.1 + progress * 0.12;
    gain.gain.setValueAtTime(startGain, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    primary.connect(gain);
    overtone.connect(gain);
    gain.connect(filter);
    filter.connect(ctx.destination);
    primary.start(now);
    overtone.start(now);
    primary.stop(now + 0.26);
    overtone.stop(now + 0.26);
  } catch (error) {
    // Ignore audio errors silently.
  }
}

function playClick() {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  try {
    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(720, now);
    oscillator.frequency.linearRampToValueAtTime(540, now + 0.06);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    filter.type = "highpass";
    filter.frequency.setValueAtTime(520, now);
    oscillator.connect(gain);
    gain.connect(filter);
    filter.connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.12);
  } catch (error) {
    // Ignore audio errors silently.
  }
}

function playSuccess() {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  try {
    const now = ctx.currentTime;
    const lead = ctx.createOscillator();
    const harmony = ctx.createOscillator();
    const shimmer = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    lead.type = "triangle";
    harmony.type = "sine";
    shimmer.type = "square";
    lead.frequency.setValueAtTime(540, now);
    lead.frequency.linearRampToValueAtTime(760, now + 0.24);
    harmony.frequency.setValueAtTime(810, now);
    harmony.frequency.linearRampToValueAtTime(1010, now + 0.24);
    shimmer.frequency.setValueAtTime(1280, now);
    shimmer.frequency.linearRampToValueAtTime(1560, now + 0.24);
    shimmer.detune.setValueAtTime(12, now);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1600, now);
    lead.connect(gain);
    harmony.connect(gain);
    shimmer.connect(gain);
    gain.connect(filter);
    filter.connect(ctx.destination);
    lead.start(now);
    harmony.start(now + 0.02);
    shimmer.start(now + 0.04);
    lead.stop(now + 0.42);
    harmony.stop(now + 0.42);
    shimmer.stop(now + 0.42);
  } catch (error) {
    // Ignore audio errors silently.
  }
}

function playZap() {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  try {
    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const noise = createNoiseSource(ctx, 0.28);
    const noiseGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(1180, now);
    oscillator.frequency.exponentialRampToValueAtTime(180, now + 0.22);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.linearRampToValueAtTime(0.0001, now + 0.28);
    noiseGain.gain.setValueAtTime(0.12, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    filter.type = "highpass";
    filter.frequency.setValueAtTime(360, now);
    oscillator.connect(gain);
    gain.connect(filter);
    noise.connect(noiseGain);
    noiseGain.connect(filter);
    filter.connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.32);
    noise.start(now);
    noise.stop(now + 0.32);
  } catch (error) {
    // Ignore audio errors silently.
  }
}

function playBoom() {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  try {
    const now = ctx.currentTime;
    const rumble = ctx.createOscillator();
    const rumbleGain = ctx.createGain();
    const noise = createNoiseSource(ctx, 0.6);
    const noiseGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    rumble.type = "sine";
    rumble.frequency.setValueAtTime(70, now);
    rumble.frequency.exponentialRampToValueAtTime(24, now + 0.7);
    rumbleGain.gain.setValueAtTime(0.48, now);
    rumbleGain.gain.linearRampToValueAtTime(0.0001, now + 0.72);
    noiseGain.gain.setValueAtTime(0.28, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.64);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(340, now);
    rumble.connect(rumbleGain);
    rumbleGain.connect(filter);
    noise.connect(noiseGain);
    noiseGain.connect(filter);
    filter.connect(ctx.destination);
    rumble.start(now);
    rumble.stop(now + 0.8);
    noise.start(now);
    noise.stop(now + 0.7);
  } catch (error) {
    // Ignore audio errors silently.
  }
}

function getAudioContext() {
  if (state.isDetonated) {
    return null;
  }
  if (state.audioContext) {
    if (state.audioContext.state === "suspended") {
      state.audioContext.resume().catch(() => {});
    }
    return state.audioContext;
  }
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) {
    return null;
  }
  try {
    state.audioContext = new AudioContextCtor();
    return state.audioContext;
  } catch (error) {
    state.audioContext = null;
    return null;
  }
}

function suspendAudio() {
  if (state.audioContext && state.audioContext.state === "running") {
    state.audioContext.suspend().catch(() => {});
  }
}

function updateTimerDisplay() {
  const ms = Math.max(0, Math.round(state.timeRemaining * 1000));
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const tenths = Math.floor((ms % 1000) / 100);
  timerValue.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
  const urgency = state.timeRemaining / START_TIME_SECONDS;
  timerValue.classList.remove("is-warning", "is-critical");
  if (urgency < 0.25) {
    timerValue.classList.add("is-critical");
  } else if (urgency < 0.5) {
    timerValue.classList.add("is-warning");
  }
}

function updatePhaseFlag() {
  phaseFlag.textContent = `Phase: ${state.stage === "wires" ? "Wires" : state.stage === "sensor" ? "Sensor" : state.stage === "pressure" ? "Pressure" : "Complete"}`;
}

function updateRiggsFlag() {
  riggsFlag.textContent = state.riggsPrompt ? "Riggs Yelling" : state.riggsUsed ? "Riggs Attempted" : "Riggs Quiet";
  if (state.riggsPrompt) {
    riggsFlag.dataset.active = "true";
  } else {
    delete riggsFlag.dataset.active;
  }
}

function handleWireCut(button) {
  if (state.stage !== "wires" || state.isComplete || state.isDetonated) {
    return;
  }
  const wireId = button.dataset.wire;
  if (!wireId || state.wiresCut.includes(wireId)) {
    return;
  }
  const expectedWire = wiresSolution[state.wiresCut.length];
  if (wireId === expectedWire) {
    state.wiresCut.push(wireId);
    button.dataset.state = "cut";
    button.setAttribute("aria-disabled", "true");
    button.disabled = true;
    playClick();
    logEvent(`Cut ${wireId.toUpperCase()} lead safely.`);
    if (state.wiresCut.length === wiresSolution.length) {
      completeWires();
    } else {
      wireStatus.textContent = "First prime severed. Mirror again before your next cut.";
    }
  } else {
    applyMistake(`The ${wireId} wire rerouted power!`);
    button.dataset.state = "cut";
    button.disabled = true;
    button.setAttribute("aria-disabled", "true");
  }
}

function completeWires() {
  wireStatus.textContent = "Harness stable. Motion sensor is next.";
  playSuccess();
  celebrateStage("wires");
  revealSensor();
  setStage("sensor");
  logEvent("Wire harness contained. Move to the sensor.");
}

function recordSensorChange(name, value) {
  state.sensorValues[name] = value;
  const lastEntry = state.sensorHistory[state.sensorHistory.length - 1];
  if (lastEntry !== name) {
    state.sensorHistory.push(name);
  }
}

function handleSensorSubmit() {
  if (state.stage !== "sensor" || state.isComplete || state.isDetonated) {
    return;
  }
  const { sweep, field, power } = state.sensorValues;
  const order = state.sensorHistory.slice(-3).join("|");
  const orderValid = order === "sweep|field|power";
  const valuesValid = sweep === "pulse" && field === "narrow" && power === "standby";
  if (valuesValid && orderValid) {
    playSuccess();
    celebrateStage("sensor");
    sensorStatus.textContent = "Sensor sleeping. Pressure plate is live.";
    logEvent("Motion sensor parked in maintenance.");
    revealPressure();
    setStage("pressure");
  } else {
    applyMistake("Sensor flared. Order matters: pulse, choke, kill.");
    sensorStatus.textContent = "Reset to defaults and follow the pulse → choke → kill sequence.";
    resetSensorForm();
  }
}

function handlePressureApply() {
  if (state.stage !== "pressure" || state.isComplete || state.isDetonated) {
    return;
  }
  const selected = pressureInputs.filter((input) => input.checked);
  const weight = selected.reduce((total, input) => total + (weightTargets[input.value] ?? 0), 0);
  if (weight === TARGET_WEIGHT && selected.length === 3 && hasRequiredWeights(selected)) {
    playSuccess();
    celebrateStage("pressure");
    pressureStatus.textContent = "Seat lifted. Bomb disarmed.";
    logEvent("Counterweight locked. Pressure plate balanced.");
    completeBomb();
  } else {
    applyMistake("Counterweight slipped. Recalculate 42 lbs even.");
    pressureStatus.textContent = "Only the soaked cobalt plus both dry shims make 42. Try again.";
  }
}

function hasRequiredWeights(selected) {
  const ids = selected.map((input) => input.value);
  return ids.includes("dry-a") && ids.includes("dry-b") && ids.includes("soaked");
}

function revealSensor() {
  sensorPanel.hidden = false;
  sensorPanel.setAttribute("aria-hidden", "false");
}

function revealPressure() {
  pressurePanel.hidden = false;
  pressurePanel.setAttribute("aria-hidden", "false");
}

function setStage(stage) {
  state.stage = stage;
  updatePhaseFlag();
  highlightActivePanel(stage);
  updateAmbientForStage(stage);
  dismissRiggs();
  scheduleRiggs();
}

function applyMistake(message) {
  if (state.isDetonated || state.isComplete) {
    return;
  }
  state.mistakes += 1;
  state.timeRemaining = Math.max(0, state.timeRemaining - PENALTY_SECONDS);
  updateTimerDisplay();
  logEvent(`${message} −${PENALTY_SECONDS}s.`);
  playZap();
  particleField.emitSparkle(0.85 + state.mistakes * 0.12);
  body.classList.add("is-shaking");
  body.classList.add("is-sparking");
  window.setTimeout(() => {
    body.classList.remove("is-shaking");
    body.classList.remove("is-sparking");
  }, 500);
  if (state.timeRemaining <= 0) {
    triggerFailure("Timer collapsed after repeated shocks.");
  }
}

function triggerFailure(reason) {
  if (state.isDetonated || state.isComplete) {
    return;
  }
  state.isDetonated = true;
  stopCountdown();
  dismissRiggs();
  clearRiggsTimer();
  playBoom();
  particleField.emitBurst(1.2);
  particleField.setAmbientPalette(failurePalette);
  body.classList.remove("is-sparking");
  body.classList.add("is-overloaded");
  body.classList.add("is-detonated");
  logEvent(reason);
  showWrapup({
    success: false,
    reason,
  });
}

function completeBomb() {
  if (state.isComplete || state.isDetonated) {
    return;
  }
  state.isComplete = true;
  stopCountdown();
  dismissRiggs();
  clearRiggsTimer();
  logEvent("Bomb disarmed. Seat safe.");
  const remainingMs = Math.round(state.timeRemaining * 1000);
  highScore.submit(remainingMs, { riggs: state.riggsSuccess });
  particleField.setAmbientPalette(completionPalette);
  body.classList.remove("is-sparking");
  body.classList.add("is-cleared");
  window.setTimeout(() => {
    body.classList.remove("is-cleared");
  }, 1400);
  showWrapup({ success: true });
}

function showWrapup({ success, reason }) {
  wrapup.hidden = false;
  wrapup.setAttribute("aria-hidden", "false");
  const ms = Math.max(0, Math.round(state.timeRemaining * 1000));
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const tenths = Math.floor((ms % 1000) / 100);
  wrapupTime.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
  wrapupMistakes.textContent = String(state.mistakes);
  if (state.riggsSuccess) {
    wrapupRiggs.textContent = "Successful Riggs Maneuver";
  } else if (state.riggsUsed) {
    wrapupRiggs.textContent = "Attempted · Catastrophic";
  } else {
    wrapupRiggs.textContent = "Not Attempted";
  }
  if (success) {
    wrapupSubtitle.textContent = "Rig safe. Call it in.";
  } else {
    wrapupSubtitle.textContent = reason || "Riggs never stood a chance.";
  }
  window.requestAnimationFrame(() => {
    wrapupDialog.focus();
  });
}

function hideWrapup() {
  wrapup.hidden = true;
  wrapup.setAttribute("aria-hidden", "true");
}

function resetSensorForm() {
  state.sensorHistory = [];
  state.sensorValues = {
    sweep: "continuous",
    field: "wide",
    power: "active",
  };
  sensorForm.reset();
}

function restartGame() {
  stopCountdown();
  dismissRiggs();
  clearRiggsTimer();
  body.classList.remove("is-detonated");
  body.classList.remove("is-overloaded");
  body.classList.remove("is-cleared");
  body.classList.remove("is-sparking");
  state.timeRemaining = START_TIME_SECONDS;
  state.stage = "wires";
  state.wiresCut = [];
  state.sensorHistory = [];
  state.sensorValues = {
    sweep: "continuous",
    field: "wide",
    power: "active",
  };
  state.riggsUsed = false;
  state.riggsSuccess = false;
  state.mistakes = 0;
  state.isComplete = false;
  state.isDetonated = false;
  eventLog.innerHTML = "";
  logEvent("Console reset. Timer armed.");
  wireButtons.forEach((button) => {
    button.disabled = false;
    button.removeAttribute("aria-disabled");
    button.dataset.state = "";
  });
  wireStatus.textContent = "Ready to cut. Only prime positions survive the mirror.";
  resetSensorForm();
  sensorStatus.textContent = "Sequence reminder: pulse first, choke the field second, kill the juice last.";
  sensorPanel.hidden = true;
  pressurePanel.hidden = true;
  pressureInputs.forEach((input) => {
    input.checked = false;
  });
  pressureStatus.textContent = "Target is 42 lbs even. Soaked shim counts double. Only the right trio lifts the plate.";
  updateTimerDisplay();
  updatePhaseFlag();
  updateRiggsFlag();
  highlightActivePanel(state.stage);
  updateAmbientForStage(state.stage);
  startCountdown();
  scheduleRiggs();
}

function logEvent(message) {
  const entry = document.createElement("li");
  entry.textContent = `${timestampLabel()} ${message}`;
  eventLog.prepend(entry);
  while (eventLog.childElementCount > 6) {
    eventLog.lastElementChild?.remove();
  }
}

function timestampLabel() {
  const elapsed = Math.max(0, START_TIME_SECONDS - state.timeRemaining);
  const seconds = Math.floor(elapsed);
  return `[${String(seconds).padStart(2, "0")}s]`;
}

function clearRiggsTimer() {
  if (state.riggsTimer) {
    window.clearTimeout(state.riggsTimer);
    state.riggsTimer = null;
  }
}

function scheduleRiggs() {
  clearRiggsTimer();
  if (state.isComplete || state.isDetonated) {
    return;
  }
  const delay = Math.random() * 7000 + 9000;
  state.riggsTimer = window.setTimeout(() => {
    spawnRiggsAdvice();
  }, delay);
}

function spawnRiggsAdvice() {
  if (state.riggsPrompt || state.isComplete || state.isDetonated) {
    return;
  }
  const stageAdvice = riggsAdviceByStage[state.stage];
  if (!stageAdvice || stageAdvice.length === 0) {
    return;
  }
  const line = stageAdvice[Math.floor(Math.random() * stageAdvice.length)];
  const container = document.createElement("div");
  container.className = "riggs-alert";
  container.innerHTML = `
    <strong>Riggs:</strong>
    <p>${line}</p>
    <button type="button">Do it!</button>
  `;
  const actionButton = container.querySelector("button");
  if (actionButton) {
    actionButton.addEventListener("click", () => {
      followRiggs();
    });
  }
  riggsFeed.innerHTML = "";
  riggsFeed.append(container);
  state.riggsPrompt = container;
  updateRiggsFlag();
  logEvent("Riggs is shouting a shortcut.");
  playRiggsStinger();
  particleField.emitSparkle(0.75);
}

function dismissRiggs() {
  if (state.riggsPrompt) {
    state.riggsPrompt.remove();
    state.riggsPrompt = null;
    riggsFeed.innerHTML = "";
    updateRiggsFlag();
  }
}

function followRiggs() {
  if (!state.riggsPrompt || state.isComplete || state.isDetonated) {
    return;
  }
  state.riggsUsed = true;
  const success = Math.random() < RIGGS_SUCCESS_CHANCE;
  if (success) {
    state.riggsSuccess = true;
    const bonus = 30;
    state.timeRemaining = Math.min(START_TIME_SECONDS, state.timeRemaining + bonus);
    updateTimerDisplay();
    playSuccess();
    playRiggsVictory();
    particleField.emitBurst(1.25);
    particleField.emitSparkle(1.05);
    logEvent(`Riggs got lucky. Skipped the ${state.stage} phase. +${bonus}s.`);
    skipCurrentStage();
  } else {
    logEvent("Riggs Maneuver detonated the porcelain.");
    triggerFailure("Riggs Maneuver failed.");
  }
  dismissRiggs();
  scheduleRiggs();
}

function skipCurrentStage() {
  if (state.stage === "wires") {
    wireButtons.forEach((button) => {
      if (!button.dataset.state) {
        button.dataset.state = "cut";
        button.disabled = true;
        button.setAttribute("aria-disabled", "true");
      }
    });
    state.wiresCut = [...wiresSolution];
    completeWires();
  } else if (state.stage === "sensor") {
    revealPressure();
    setStage("pressure");
    sensorStatus.textContent = "Riggs bypassed the sensor. Tread carefully.";
  } else if (state.stage === "pressure") {
    celebrateStage("pressure");
    completeBomb();
  }
}

function highlightActivePanel(stage) {
  Object.entries(panelMap).forEach(([key, panel]) => {
    if (!panel) {
      return;
    }
    if (key === stage) {
      panel.classList.add("is-active");
    } else {
      panel.classList.remove("is-active");
    }
  });
}

function updateAmbientForStage(stage) {
  const palette = stagePalettes[stage];
  if (palette) {
    particleField.setAmbientPalette(palette);
  }
}

function celebrateStage(stage) {
  const intensity = celebrationIntensity[stage] ?? 1;
  particleField.emitBurst(intensity);
  particleField.emitSparkle(Math.min(1.35, 0.75 + intensity * 0.4));
  playStageChime(stage);
}

function createNoiseSource(ctx, duration = 0.3) {
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    channel[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  return source;
}

function playStageChime(stage) {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  try {
    const now = ctx.currentTime;
    const base = stage === "pressure" ? 420 : stage === "sensor" ? 360 : 300;
    const lead = ctx.createOscillator();
    const harmony = ctx.createOscillator();
    const gain = ctx.createGain();
    lead.type = "sine";
    harmony.type = "triangle";
    lead.frequency.setValueAtTime(base, now);
    lead.frequency.linearRampToValueAtTime(base * 1.4, now + 0.4);
    harmony.frequency.setValueAtTime(base * 1.5, now);
    harmony.frequency.linearRampToValueAtTime(base * 1.85, now + 0.4);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    lead.connect(gain);
    harmony.connect(gain);
    gain.connect(ctx.destination);
    lead.start(now);
    harmony.start(now + 0.05);
    lead.stop(now + 0.65);
    harmony.stop(now + 0.65);
  } catch (error) {
    // Ignore audio errors silently.
  }
}

function playRiggsStinger() {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.22);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.linearRampToValueAtTime(0.0001, now + 0.24);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch (error) {
    // Ignore audio errors silently.
  }
}

function playRiggsVictory() {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  try {
    const now = ctx.currentTime;
    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    const gain = ctx.createGain();
    oscA.type = "triangle";
    oscB.type = "sawtooth";
    oscA.frequency.setValueAtTime(520, now);
    oscA.frequency.linearRampToValueAtTime(760, now + 0.3);
    oscB.frequency.setValueAtTime(1040, now);
    oscB.frequency.linearRampToValueAtTime(1280, now + 0.3);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    oscA.connect(gain);
    oscB.connect(gain);
    gain.connect(ctx.destination);
    oscA.start(now);
    oscB.start(now + 0.04);
    oscA.stop(now + 0.52);
    oscB.stop(now + 0.52);
  } catch (error) {
    // Ignore audio errors silently.
  }
}
