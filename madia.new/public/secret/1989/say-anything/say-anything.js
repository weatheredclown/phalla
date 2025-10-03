import { mountParticleField } from "../particles.js";
import { initParticleSystem } from "../particle-effects.js";

mountParticleField();

const particleSystem = initParticleSystem({
  palette: ["#38bdf8", "#f472b6", "#facc15", "#fb7185"],
  ambientDensity: 0.6,
});

const STARTING_FLOW = 72;
const MAX_FLOW = 100;
const SYNC_WINDOW_MS = 520;
const FLOW_DRIFT_INTERVAL_MS = 2200;
const FLOW_DRIFT_COST = 1;
const DEFAULT_PAIR_DURATION = 2800;
const DEFAULT_SILENCE_DURATION = 3200;

const blockLibrary = {
  love: createBlock("Love", "KeyA", "positive", "Cobalt Pulse"),
  reassure: createBlock("Reassure", "KeyS", "positive", "Grounding Echo"),
  static: createBlock("Static", "KeyD", "negative", "Noise Spike"),
  trust: createBlock("Trust", "KeyJ", "positive", "Aurora Reply"),
  guard: createBlock("Guard", "KeyK", "negative", "Closed Loop"),
  doubt: createBlock("Doubt", "KeyL", "negative", "Echo Chamber"),
};

const conversationTemplate = [
  { type: "pair", id: "boombox-overture", label: "Boombox Overture", lloyd: "love", diane: "trust", duration: 2700 },
  { type: "pair", id: "dinner-debrief", label: "Dinner Debrief", lloyd: "reassure", diane: "guard", duration: 3000 },
  { type: "silence", id: "late-night-drive", label: "Late Night Drive", duration: 3300 },
  { type: "pair", id: "family-static", label: "Family Static", lloyd: "static", diane: "doubt", duration: 3000 },
  { type: "pair", id: "window-ledge", label: "Window Ledge Check-in", lloyd: "love", diane: "trust", duration: 2800 },
  { type: "pair", id: "ring-exchange", label: "Ring Exchange", lloyd: "reassure", diane: "trust", duration: 2800 },
  { type: "pair", id: "boombox-reprise", label: "Boombox Reprise", lloyd: "love", diane: "trust", duration: 2700 },
  { type: "silence", id: "departure-lounge", label: "Departure Lounge", duration: 3400 },
  { type: "pair", id: "flight-risk", label: "Flight Risk", lloyd: "static", diane: "guard", duration: 3100 },
  { type: "pair", id: "future-promise", label: "Future Promise", lloyd: "love", diane: "trust", duration: 2800 },
  { type: "pair", id: "road-ahead", label: "Road Ahead", lloyd: "reassure", diane: "trust", duration: 2800 },
];

const allowedCodes = new Set(["KeyA", "KeyS", "KeyD", "KeyJ", "KeyK", "KeyL", "Space"]);

const lloydTrack = document.getElementById("lloyd-track");
const dianeTrack = document.getElementById("diane-track");
const startButton = document.getElementById("start-session");
const resetButton = document.getElementById("reset-session");
const statusReadout = document.getElementById("status-readout");
const flowFill = document.getElementById("flow-fill");
const flowValue = document.getElementById("flow-value");
const flowMeter = document.getElementById("flow-meter");
const boomboxIndicator = document.getElementById("boombox-charge");
const eventLog = document.getElementById("event-log");
const cloudList = document.getElementById("cloud-list");
const virtualKeyButtons = Array.from(document.querySelectorAll(".virtual-key"));

const state = {
  playing: false,
  index: -1,
  flow: STARTING_FLOW,
  miscommunication: [],
  positiveStreak: 0,
  activeEvent: null,
  activePair: null,
  silenceBlocks: null,
  boomboxWindow: false,
  boomboxCharged: false,
  eventTimeout: null,
  flowDriftTimer: null,
};

const activeElements = new Set();

startButton.addEventListener("click", () => {
  if (state.playing) {
    return;
  }
  beginSession();
});

resetButton.addEventListener("click", () => {
  stopSession({
    status: "Session reset. Waiting to start.",
    logMessage: "Session reset. Frequencies clear.",
    logVariant: "warning",
  });
  setFlow(STARTING_FLOW);
  state.miscommunication = [];
  state.positiveStreak = 0;
  updateClouds();
});

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
  }
  highlightVirtualKey(event.code);
  handleInput(event.code);
});

virtualKeyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    highlightVirtualKey(button.dataset.code);
    handleInput(button.dataset.code);
  });
});

updateStatus("Waiting to start.");
updateBoombox("Boombox idle.");
setFlow(STARTING_FLOW);
updateClouds();

function beginSession() {
  state.playing = true;
  state.index = -1;
  state.miscommunication = [];
  state.positiveStreak = 0;
  state.flow = STARTING_FLOW;
  state.activeEvent = null;
  state.activePair = null;
  state.boomboxWindow = false;
  state.boomboxCharged = false;
  state.silenceBlocks = null;
  clearEventTimeout();
  clearActiveBlocks(true);
  updateClouds();
  setFlow(STARTING_FLOW);
  updateStatus("Conversation rolling. Catch each frequency.");
  updateBoombox("Boombox idle.");
  logEvent("Conversation started. Keep the beats paired.", "success");
  startButton.disabled = true;
  resetButton.disabled = false;
  startFlowDrift();
  advanceConversation();
}

function stopSession({ status, logMessage, logVariant, resetTracks = true } = {}) {
  clearEventTimeout();
  stopFlowDrift();
  state.playing = false;
  state.activeEvent = null;
  state.activePair = null;
  state.boomboxWindow = false;
  state.boomboxCharged = false;
  state.silenceBlocks = null;
  if (resetTracks) {
    clearActiveBlocks(true);
  }
  startButton.disabled = false;
  resetButton.disabled = true;
  updateStatus(status ?? "Waiting to start.");
  updateBoombox("Boombox idle.");
  if (logMessage) {
    logEvent(logMessage, logVariant);
  }
}

function handleInput(code) {
  if (!allowedCodes.has(code)) {
    return;
  }
  if (!state.playing) {
    if (code === "Space") {
      logEvent("The boombox hums, but no one is listening yet.", "warning");
    }
    return;
  }
  const activeEvent = state.activeEvent;
  if (!activeEvent) {
    return;
  }
  if (activeEvent.type === "pair") {
    handlePairInput(code);
    return;
  }
  if (activeEvent.type === "silence") {
    handleSilenceInput(code);
    return;
  }
}

function handlePairInput(code) {
  const pair = state.activePair;
  if (!pair) {
    return;
  }
  const now = window.performance.now();
  if (code === pair.lloyd.block.key && !pair.lloyd.matched) {
    pair.lloyd.matched = true;
    pair.lloyd.timestamp = now;
    removeBlock(pair.lloyd.element, "success");
    logEvent(`${pair.event.label}: Lloyd locks ${pair.lloyd.block.label}.`, "success");
    recordMatchTiming(pair, now);
    maybeResolvePair();
    return;
  }
  if (code === pair.diane.block.key && !pair.diane.matched) {
    pair.diane.matched = true;
    pair.diane.timestamp = now;
    removeBlock(pair.diane.element, "success");
    logEvent(`${pair.event.label}: Diane echoes ${pair.diane.block.label}.`, "success");
    recordMatchTiming(pair, now);
    maybeResolvePair();
    return;
  }
  if (code === "Space") {
    logEvent("The boombox swells mid-sentence—flow dips slightly.", "warning");
    modifyFlow(-4);
    return;
  }
  if (["KeyA", "KeyS", "KeyD"].includes(code) || ["KeyJ", "KeyK", "KeyL"].includes(code)) {
    logEvent("Wrong frequency struck. Static creeps in.", "warning");
    modifyFlow(-5);
  }
}

function handleSilenceInput(code) {
  if (!state.boomboxWindow) {
    return;
  }
  if (code === "Space") {
    if (state.boomboxCharged) {
      logEvent("Boombox charge already humming.");
      return;
    }
    state.boomboxCharged = true;
    clearEventTimeout();
    if (state.silenceBlocks) {
      removeBlock(state.silenceBlocks.lloyd, "success");
      removeBlock(state.silenceBlocks.diane, "success");
    }
    modifyFlow(7);
    updateBoombox("Boombox resonance holds the moment.");
    logEvent(`${state.activeEvent.label}: Silence bridged with the boombox.`, "success");
    state.positiveStreak = 0;
    finalizeEvent();
    return;
  }
  if (["KeyA", "KeyS", "KeyD", "KeyJ", "KeyK", "KeyL"].includes(code)) {
    logEvent("Key taps won't fill the silence—charge the boombox!", "warning");
    modifyFlow(-3);
  }
}

function recordMatchTiming(pair, timestamp) {
  if (pair.firstMatchTime === null) {
    pair.firstMatchTime = timestamp;
  } else {
    const delta = Math.abs(timestamp - pair.firstMatchTime);
    if (delta > SYNC_WINDOW_MS) {
      pair.syncTight = false;
    }
  }
}

function maybeResolvePair() {
  const pair = state.activePair;
  if (!pair) {
    return;
  }
  if (pair.lloyd.matched && pair.diane.matched) {
    resolvePair(pair);
  }
}

function resolvePair(pair) {
  clearEventTimeout();
  const { event } = pair;
  const bothPositive = pair.lloyd.block.tone === "positive" && pair.diane.block.tone === "positive";
  const hasNegative = pair.lloyd.block.tone === "negative" || pair.diane.block.tone === "negative";
  if (!pair.syncTight) {
    registerMiscommunication(event, "Out of sync");
    logEvent(`${event.label}: Replies landed out of sync.`, "warning");
    modifyFlow(-8);
    state.positiveStreak = 0;
    finalizeEvent();
    return;
  }
  if (bothPositive) {
    state.positiveStreak += 1;
    modifyFlow(8);
    logEvent(`${event.label}: Harmonic lock achieved.`, "success");
    const cleared = state.miscommunication.length;
    if (cleared > 0) {
      clearMiscommunication();
      logEvent(`Commitment clears ${cleared} miscommunication cloud${cleared === 1 ? "" : "s"}.`, "success");
    }
    if (state.positiveStreak >= 3) {
      triggerCommitmentSweep();
    }
  } else {
    state.positiveStreak = 0;
    if (hasNegative) {
      registerMiscommunication(event, "Tense undertone");
      modifyFlow(3);
      logEvent(`${event.label}: Tension acknowledged but steady.`, "success");
    } else {
      modifyFlow(5);
      logEvent(`${event.label}: Frequencies balanced.`, "success");
    }
  }
  finalizeEvent();
}

function triggerCommitmentSweep() {
  state.positiveStreak = 0;
  const cloudsCleared = state.miscommunication.length;
  clearMiscommunication();
  modifyFlow(12);
  logEvent(
    `Commitment Sweep ignites the sky${cloudsCleared > 0 ? `—${cloudsCleared} clouds vaporized` : "."}`,
    "success",
  );
}

function registerMiscommunication(event, note) {
  const existing = state.miscommunication.find((cloud) => cloud.id === event.id);
  if (existing) {
    if (note) {
      existing.note = note;
      updateClouds();
    }
    return;
  }
  state.miscommunication.push({ id: event.id, label: event.label, note: note ?? "Static rising" });
  updateClouds();
}

function clearMiscommunication() {
  if (state.miscommunication.length === 0) {
    return;
  }
  state.miscommunication = [];
  updateClouds();
}

function startPairEvent(event) {
  clearActiveBlocks(true);
  state.activePair = {
    event,
    lloyd: {
      block: { ...event.lloyd },
      element: spawnBlock(lloydTrack, event.lloyd, `${event.id}-lloyd`),
      matched: false,
      timestamp: null,
    },
    diane: {
      block: { ...event.diane },
      element: spawnBlock(dianeTrack, event.diane, `${event.id}-diane`),
      matched: false,
      timestamp: null,
    },
    firstMatchTime: null,
    syncTight: true,
  };
  updateStatus(`${event.label}: Match both frequencies now.`);
  updateBoombox("Boombox idle.");
  if (event.lloyd.tone === "negative" || event.diane.tone === "negative") {
    registerMiscommunication(event, "Static in the air");
  }
  const duration = event.duration ?? DEFAULT_PAIR_DURATION;
  state.eventTimeout = window.setTimeout(() => {
    if (!state.playing || state.activeEvent !== event) {
      return;
    }
    failPair(event, "The beat slipped away.");
  }, duration);
}

function startSilenceEvent(event) {
  clearActiveBlocks(true);
  state.activePair = null;
  state.boomboxWindow = true;
  state.boomboxCharged = false;
  const lloydSilence = spawnSilenceBlock(lloydTrack, `${event.id}-lloyd`);
  const dianeSilence = spawnSilenceBlock(dianeTrack, `${event.id}-diane`);
  state.silenceBlocks = { lloyd: lloydSilence, diane: dianeSilence };
  updateStatus(`${event.label}: Silence gap — charge the boombox.`);
  updateBoombox("Silence gap — charge now!");
  logEvent(`${event.label}: Hold the moment with a boombox charge.`, "warning");
  const duration = event.duration ?? DEFAULT_SILENCE_DURATION;
  state.eventTimeout = window.setTimeout(() => {
    if (!state.playing || state.activeEvent !== event) {
      return;
    }
    failSilence(event);
  }, duration);
}

function failPair(event, reason) {
  const pair = state.activePair;
  if (pair) {
    if (!pair.lloyd.matched) {
      removeBlock(pair.lloyd.element, "failure");
    }
    if (!pair.diane.matched) {
      removeBlock(pair.diane.element, "failure");
    }
  }
  registerMiscommunication(event, reason ?? "Missed sync");
  logEvent(`${event.label}: ${reason ?? "Missed sync"}`, "danger");
  modifyFlow(-12);
  state.positiveStreak = 0;
  finalizeEvent();
}

function failSilence(event) {
  if (state.silenceBlocks) {
    removeBlock(state.silenceBlocks.lloyd, "failure");
    removeBlock(state.silenceBlocks.diane, "failure");
  }
  registerMiscommunication(event, "Silence fracture");
  logEvent(`${event.label}: Silence swallowed the moment.`, "danger");
  modifyFlow(-14);
  state.positiveStreak = 0;
  finalizeEvent();
}

function finalizeEvent(delay = 720) {
  clearEventTimeout();
  state.activeEvent = null;
  state.activePair = null;
  state.boomboxWindow = false;
  state.boomboxCharged = false;
  state.silenceBlocks = null;
  updateBoombox("Boombox idle.");
  window.setTimeout(() => {
    clearActiveBlocks(true);
  }, 360);
  if (state.playing) {
    window.setTimeout(() => {
      advanceConversation();
    }, delay);
  }
}

function advanceConversation() {
  if (!state.playing) {
    return;
  }
  state.index += 1;
  if (state.index >= conversationTemplate.length) {
    logEvent("Every frequency aligned. Conversation holds steady.", "success");
    stopSession({ status: "Every frequency aligned. Conversation holds steady." });
    return;
  }
  const step = conversationTemplate[state.index];
  const event = instantiateEvent(step);
  state.activeEvent = event;
  if (event.type === "pair") {
    startPairEvent(event);
  } else if (event.type === "silence") {
    startSilenceEvent(event);
  }
}

function instantiateEvent(step) {
  if (step.type === "pair") {
    return {
      type: step.type,
      id: step.id,
      label: step.label,
      lloyd: { ...blockLibrary[step.lloyd] },
      diane: { ...blockLibrary[step.diane] },
      duration: step.duration,
    };
  }
  return { ...step };
}

function spawnBlock(track, block, id) {
  const element = document.createElement("div");
  element.className = `emotion-block ${block.tone}`;
  element.dataset.key = block.key;
  element.dataset.eventId = id;
  const label = document.createElement("span");
  label.className = "emotion-label";
  label.textContent = block.label;
  const tone = document.createElement("span");
  tone.className = "emotion-tone";
  tone.textContent = block.signature;
  element.append(label, tone);
  track.append(element);
  activeElements.add(element);
  return element;
}

function spawnSilenceBlock(track, id) {
  const element = document.createElement("div");
  element.className = "emotion-block silence";
  element.dataset.eventId = id;
  const label = document.createElement("span");
  label.className = "emotion-label";
  label.textContent = "Silence";
  const tone = document.createElement("span");
  tone.className = "emotion-tone";
  tone.textContent = "Hold together";
  element.append(label, tone);
  track.append(element);
  activeElements.add(element);
  return element;
}

function removeBlock(element, outcome) {
  if (!element) {
    return;
  }
  if (outcome === "success") {
    element.classList.add("is-cleared");
  } else if (outcome === "failure") {
    element.classList.add("is-missed");
  }
  window.setTimeout(() => {
    element.remove();
  }, 360);
  activeElements.delete(element);
}

function clearActiveBlocks(force = false) {
  activeElements.forEach((element) => {
    if (force) {
      element.remove();
    } else {
      element.classList.add("is-cleared");
      window.setTimeout(() => element.remove(), 360);
    }
  });
  activeElements.clear();
}

function setFlow(value) {
  const clamped = Math.max(0, Math.min(MAX_FLOW, Math.round(value)));
  state.flow = clamped;
  flowFill.style.width = `${clamped}%`;
  flowValue.textContent = String(clamped);
  flowMeter.setAttribute("aria-valuenow", String(clamped));
  if (clamped === 0 && state.playing) {
    logEvent("Communication flow collapsed. The moment slips away.", "danger");
    stopSession({ status: "Communication flow collapsed. The moment slips away." });
  }
}

function modifyFlow(delta) {
  setFlow(state.flow + delta);
}

function startFlowDrift() {
  stopFlowDrift();
  state.flowDriftTimer = window.setInterval(() => {
    if (!state.playing) {
      return;
    }
    modifyFlow(-FLOW_DRIFT_COST);
  }, FLOW_DRIFT_INTERVAL_MS);
}

function stopFlowDrift() {
  if (state.flowDriftTimer !== null) {
    window.clearInterval(state.flowDriftTimer);
    state.flowDriftTimer = null;
  }
}

function updateStatus(message) {
  statusReadout.textContent = message;
}

function updateBoombox(message) {
  boomboxIndicator.textContent = message;
}

function updateClouds() {
  cloudList.innerHTML = "";
  if (state.miscommunication.length === 0) {
    const empty = document.createElement("li");
    empty.className = "cloud-empty";
    empty.textContent = "Sky is clear.";
    cloudList.append(empty);
    return;
  }
  state.miscommunication.forEach((cloud) => {
    const item = document.createElement("li");
    const chip = document.createElement("span");
    chip.className = "cloud-chip";
    const label = document.createElement("span");
    label.className = "cloud-label";
    label.textContent = cloud.label;
    const note = document.createElement("span");
    note.textContent = cloud.note;
    chip.append(label, note);
    item.append(chip);
    cloudList.append(item);
  });
}

function logEvent(message, variant = "info") {
  const item = document.createElement("li");
  item.className = "log-entry";
  if (variant === "success") {
    item.classList.add("success");
    particleSystem.emitBurst(1.2);
  } else if (variant === "warning") {
    item.classList.add("warning");
    particleSystem.emitSparkle(0.7);
  } else if (variant === "danger") {
    item.classList.add("danger");
    particleSystem.emitSparkle(1.0);
  }
  item.textContent = message;
  eventLog.prepend(item);
  while (eventLog.children.length > 9) {
    eventLog.removeChild(eventLog.lastChild);
  }
}

function highlightVirtualKey(code) {
  const button = virtualKeyButtons.find((entry) => entry.dataset.code === code);
  if (!button) {
    return;
  }
  button.classList.add("is-active");
  window.setTimeout(() => {
    button.classList.remove("is-active");
  }, 180);
}

function clearEventTimeout() {
  if (state.eventTimeout !== null) {
    window.clearTimeout(state.eventTimeout);
    state.eventTimeout = null;
  }
}

function createBlock(label, key, tone, signature) {
  return { label, key, tone, signature };
}
