import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { mountParticleField } from "../particles.js";
import { autoEnhanceFeedback } from "../feedback.js";

const particleField = mountParticleField({
  effects: {
    palette: ["#facc15", "#38bdf8", "#f472b6", "#fb7185"],
    ambientDensity: 0.45,
  },
});

autoEnhanceFeedback();

const scoreConfig = getScoreConfig("diner-debate");
const highScore = initHighScoreBanner({
  gameId: "diner-debate",
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

const APPROACH_WINDOW = 2200;
const MISS_WINDOW = 260;
const HOLD_START_WINDOW = 160;
const HOLD_RELEASE_WINDOW = 200;
const HOLD_PIXEL_SCALE = 0.12;

const TIMING_WINDOWS = [
  { rating: "Perfect", threshold: 70, score: 160, meter: 16 },
  { rating: "Good", threshold: 140, score: 110, meter: 12 },
  { rating: "OK", threshold: 220, score: 70, meter: 8 },
];

const ACTIONS = {
  gasp: { key: "KeyJ", label: "Gasp", short: "G", tone: 860 },
  pound: { key: "KeyK", label: "Pound", short: "P", tone: 520 },
  nod: { key: "KeyL", label: "Nod", short: "N", tone: 640 },
};

const KEY_TO_ACTION = new Map(
  Object.values(ACTIONS).map((action) => [action.key, action])
);

const sequences = [
  {
    id: "brunch-banter",
    title: "Brunch Banter",
    description: "Lean into the slow build and watch the lane cadence.",
    noise: "low",
    cues: [
      note("gasp", 1200),
      note("nod", 2200),
      note("pound", 3200),
      note("nod", 4200),
      note("gasp", 5200),
    ],
  },
  {
    id: "counter-crossfire",
    title: "Counter Crossfire",
    description: "Kitchen clatter kicks in. Expect brisk doubles and a table hold.",
    noise: "medium",
    cues: [
      note("pound", 900),
      note("gasp", 1650),
      note("nod", 2400),
      note("pound", 3100, { hold: 520 }),
      note("gasp", 4200),
      note("nod", 4850),
      note("pound", 5480),
    ],
  },
  {
    id: "press-gauntlet",
    title: "Press Gauntlet",
    description: "The crowd swells—rapid runs, camera flashes, and layered holds.",
    noise: "high",
    cues: [
      note("gasp", 750),
      note("nod", 1400),
      note("pound", 2000),
      note("nod", 2400),
      note("gasp", 2800),
      note("pound", 3400, { hold: 680 }),
      note("nod", 4500),
      note("gasp", 4900),
      note("pound", 5300),
      note("nod", 5700),
    ],
  },
];

const climaxSequence = {
  id: "neon-finale",
  title: "Neon Finale",
  description: "Everything slows, then spikes—thread the entire crescendo without a stumble.",
  noise: "climax",
  cues: [
    note("gasp", 600),
    note("pound", 1350),
    note("nod", 1900),
    note("pound", 2400, { hold: 720 }),
    note("gasp", 3600),
    note("nod", 4100),
    note("pound", 4500),
    note("gasp", 4900),
    note("nod", 5300),
    note("pound", 5700, { hold: 780 }),
  ],
};

const stageElement = document.querySelector(".stage");
const timelineElement = document.getElementById("timeline");
const performerElement = document.getElementById("lead-performer");
const cameraFlashElement = document.getElementById("camera-flash");
const stageStatusElement = document.getElementById("stage-status");
const eventLogElement = document.getElementById("event-log");
const startButton = document.getElementById("start-sequence");
const nextButton = document.getElementById("next-sequence");
const resetButton = document.getElementById("reset-sequence");
const climaxButton = document.getElementById("climax-trigger");
const convictionElement = document.getElementById("conviction-score");
const comboElement = document.getElementById("combo-count");
const comboBestElement = document.getElementById("combo-best");
const accuracyElement = document.getElementById("accuracy-value");
const hitReadoutElement = document.getElementById("hit-readout");
const climaxMeterElement = document.getElementById("climax-meter");
const climaxFillElement = document.getElementById("climax-fill");
const wrapupElement = document.getElementById("wrapup");
const wrapupSummaryElement = document.getElementById("wrapup-summary");
const wrapupScoreElement = document.getElementById("wrapup-score");
const wrapupAccuracyElement = document.getElementById("wrapup-accuracy");
const wrapupComboElement = document.getElementById("wrapup-combo");
const wrapupCloseButton = document.getElementById("wrapup-close");
const flashBannerElement = document.getElementById("flash-banner");
const flashTextElement = document.getElementById("flash-text");

const comboTileElement = comboElement.closest(".score-tile");

const state = {
  sequenceIndex: 0,
  playing: false,
  notes: [],
  frameId: null,
  sequenceStart: 0,
  sequenceDuration: 0,
  stats: {
    total: 0,
    hits: 0,
    perfects: 0,
  },
  conviction: 0,
  combo: 0,
  bestCombo: 0,
  climaxMeter: 0,
  climaxActivated: false,
  climaxSequenceQueued: false,
  climaxMultiplier: 1,
  activeHolds: new Map(),
  perfectInSequence: 0,
  missesInSequence: 0,
  pendingSequence: null,
};

prepareSequence(0);
updateScoreboard();
updateClimaxButton();

startButton.addEventListener("click", () => {
  if (state.playing) {
    return;
  }
  beginSequence();
});

nextButton.addEventListener("click", () => {
  if (state.playing) {
    return;
  }
  if (state.sequenceIndex < sequences.length - 1) {
    state.sequenceIndex += 1;
    prepareSequence(state.sequenceIndex);
  } else if (!state.climaxActivated && !state.climaxSequenceQueued) {
    addLog("Meter primed. Trigger the climax whenever you're ready.", "warning");
  }
});

resetButton.addEventListener("click", () => {
  if (state.playing) {
    stopSequence();
  }
  resetSession();
});

climaxButton.addEventListener("click", () => {
  requestClimax();
});

wrapupCloseButton.addEventListener("click", () => {
  wrapupElement.hidden = true;
  resetSession();
});

window.addEventListener("keydown", (event) => {
  if (event.defaultPrevented) {
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    requestClimax();
    return;
  }

  if (event.repeat) {
    return;
  }

  const action = KEY_TO_ACTION.get(event.code);
  if (!action) {
    return;
  }

  handleActionPress(action.key);
});

window.addEventListener("keyup", (event) => {
  const action = KEY_TO_ACTION.get(event.code);
  if (!action) {
    return;
  }
  handleActionRelease(action.key);
});

function note(action, time, options = {}) {
  return {
    action,
    time,
    hold: options.hold ?? 0,
    element: null,
    hit: false,
    missed: false,
    active: false,
    visible: false,
    holdStart: null,
    holdStartDelta: null,
  };
}

function prepareSequence(index) {
  const sequence = sequences[index];
  state.sequenceIndex = index;
  state.pendingSequence = sequence;
  stageStatusElement.textContent = `${sequence.title} · ${sequence.description}`;
  clearTimeline();
  stageElement.classList.remove("noise-medium", "noise-high");
  if (sequence.noise === "medium") {
    stageElement.classList.add("noise-medium");
  } else if (sequence.noise === "high") {
    stageElement.classList.add("noise-high");
  }
  addLog(`Loaded ${sequence.title}. Study the cues, then launch when ready.`, "info");
  startButton.disabled = false;
  nextButton.disabled = index >= sequences.length - 1;
}

function beginSequence(sequenceOverride = null) {
  const sequence = sequenceOverride ?? state.pendingSequence ?? sequences[state.sequenceIndex];
  if (!sequence) {
    return;
  }
  state.pendingSequence = sequence;
  stageStatusElement.textContent = `${sequence.title} · Performance in progress…`;
  clearTimeline();
  state.playing = true;
  state.notes = sequence.cues.map((cue) => ({ ...cue, element: createTimelineNote(cue) }));
  state.perfectInSequence = 0;
  state.missesInSequence = 0;
  state.sequenceDuration = calculateSequenceDuration(state.notes);
  state.sequenceStart = performance.now() + 600;
  state.frameId = window.requestAnimationFrame(runFrame);
  startButton.disabled = true;
  nextButton.disabled = true;
  addLog(`Rolling ${sequence.title}. Nail the beat line.`, "success");
}

function stopSequence() {
  if (state.frameId !== null) {
    window.cancelAnimationFrame(state.frameId);
    state.frameId = null;
  }
  state.playing = false;
  state.activeHolds.clear();
}

function calculateSequenceDuration(notes) {
  if (notes.length === 0) {
    return 0;
  }
  let last = 0;
  for (const cue of notes) {
    const end = cue.time + (cue.hold ?? 0);
    if (end > last) {
      last = end;
    }
  }
  return last + 1200;
}

function runFrame(now) {
  if (!state.playing) {
    return;
  }
  const elapsed = now - state.sequenceStart;
  const timelineWidth = timelineElement.clientWidth;
  const halfWidth = Math.max(120, timelineWidth / 2 - 40);

  for (const noteItem of state.notes) {
    updateNotePosition(noteItem, elapsed, halfWidth);
    if (!noteItem.hit && !noteItem.missed && !noteItem.active) {
      const lateBy = elapsed - noteItem.time;
      if (lateBy > MISS_WINDOW) {
        registerMiss(noteItem, lateBy > 0 ? "Late" : "Early");
      }
    }
  }

  if (elapsed >= state.sequenceDuration && state.activeHolds.size === 0) {
    completeSequence();
    return;
  }

  state.frameId = window.requestAnimationFrame(runFrame);
}

function updateNotePosition(noteItem, elapsed, halfWidth) {
  if (!noteItem.element) {
    return;
  }
  const timeUntil = noteItem.time - elapsed;
  const shouldBeVisible = timeUntil <= APPROACH_WINDOW + 300 && elapsed <= noteItem.time + (noteItem.hold ?? 0) + 600;
  if (shouldBeVisible && !noteItem.visible) {
    noteItem.visible = true;
    noteItem.element.classList.add("is-visible");
  }

  if (noteItem.visible) {
    const ratio = timeUntil / APPROACH_WINDOW;
    const offset = Math.max(-halfWidth, Math.min(halfWidth, ratio * halfWidth));
    noteItem.element.style.setProperty("--offset", `${offset}px`);
  }
}

function handleActionPress(key) {
  if (!state.playing) {
    addLog("Wait for the cue—sequence hasn’t started.", "warning");
    return;
  }
  const elapsed = performance.now() - state.sequenceStart;
  const noteItem = findNextNoteForKey(key);
  if (!noteItem) {
    addLog("That cue isn’t ready yet.", "warning");
    return;
  }

  if (noteItem.hold > 0) {
    const delta = elapsed - noteItem.time;
    if (Math.abs(delta) > HOLD_START_WINDOW) {
      addLog("Hold too early—watch the marker.", "danger");
      registerMiss(noteItem, delta < 0 ? "Too Early" : "Too Late");
      return;
    }
    noteItem.active = true;
    noteItem.holdStart = performance.now();
    noteItem.holdStartDelta = delta;
    state.activeHolds.set(key, noteItem);
    noteItem.element.classList.add("is-active");
    performerCelebrate();
    playTone(ACTIONS[noteItem.action].tone * 0.85, 0.18, "triangle");
    return;
  }

  evaluateNoteHit(noteItem, elapsed - noteItem.time);
}

function handleActionRelease(key) {
  if (!state.playing) {
    state.activeHolds.delete(key);
    return;
  }
  const holdNote = state.activeHolds.get(key);
  if (!holdNote) {
    return;
  }
  state.activeHolds.delete(key);
  const heldDuration = performance.now() - holdNote.holdStart;
  const elapsed = performance.now() - state.sequenceStart;
  const durationDelta = heldDuration - holdNote.hold;
  const startDelta = holdNote.holdStartDelta ?? 0;
  const worstDelta = Math.max(Math.abs(durationDelta), Math.abs(startDelta));

  if (worstDelta > HOLD_RELEASE_WINDOW) {
    registerMiss(holdNote, durationDelta < 0 ? "Hold dropped" : "Hold overshot");
    return;
  }

  evaluateNoteHit(holdNote, elapsed - holdNote.time, { hold: true, durationDelta });
}

function evaluateNoteHit(noteItem, delta, options = {}) {
  const ratingInfo = resolveRating(delta);
  if (!ratingInfo) {
    registerMiss(noteItem, delta < 0 ? "Too early" : "Too late");
    return;
  }
  noteItem.hit = true;
  noteItem.active = false;
  if (noteItem.element) {
    noteItem.element.classList.add("is-hit");
    noteItem.element.classList.remove("is-active");
  }

  state.stats.total += 1;
  state.stats.hits += 1;
  if (ratingInfo.rating === "Perfect") {
    state.stats.perfects += 1;
    state.perfectInSequence += 1;
  }

  state.combo += 1;
  if (state.combo > state.bestCombo) {
    state.bestCombo = state.combo;
  }

  const multiplier = state.climaxActivated ? state.climaxMultiplier : 1;
  state.conviction += Math.round(ratingInfo.score * multiplier);
  state.climaxMeter = Math.min(100, state.climaxMeter + ratingInfo.meter);
  addLog(`${ratingInfo.rating}! ${ACTIONS[noteItem.action].label} landed.`, "success");
  performerCelebrate();
  maybeFlashCamera(ratingInfo.rating);
  updateScoreboard();
  updateClimaxButton();
  playTone(ACTIONS[noteItem.action].tone * multiplier, 0.18 + (options.hold ? 0.12 : 0), options.hold ? "sawtooth" : "sine");

  checkSequencePerfect();
}

function registerMiss(noteItem, reason) {
  if (noteItem.missed || noteItem.hit) {
    return;
  }
  noteItem.missed = true;
  noteItem.active = false;
  if (noteItem.element) {
    noteItem.element.classList.add("is-missed");
    noteItem.element.classList.remove("is-active");
  }
  state.stats.total += 1;
  state.missesInSequence += 1;
  state.combo = 0;
  state.climaxMeter = Math.max(0, state.climaxMeter - 18);
  addLog(`Missed ${ACTIONS[noteItem.action].label}. ${reason}.`, "danger");
  performerStumble();
  shatterComboMeter();
  playScratch();
  updateScoreboard();
  updateClimaxButton();
}

function checkSequencePerfect() {
  if (!state.playing) {
    return;
  }
  if (state.perfectInSequence === state.notes.length && state.notes.length > 0) {
    showFlash("Flawless Performance!");
  }
}

function resolveRating(delta) {
  const offset = Math.abs(delta);
  for (const windowInfo of TIMING_WINDOWS) {
    if (offset <= windowInfo.threshold) {
      return windowInfo;
    }
  }
  return null;
}

function findNextNoteForKey(key) {
  for (const noteItem of state.notes) {
    if (noteItem.hit || noteItem.missed) {
      continue;
    }
    if (ACTIONS[noteItem.action].key === key) {
      return noteItem;
    }
  }
  return null;
}

function completeSequence() {
  stopSequence();
  const sequence = state.pendingSequence ?? sequences[state.sequenceIndex];
  state.pendingSequence = sequence;
  if (sequence && !state.climaxActivated) {
    if (sequence.noise === "climax") {
      stageStatusElement.textContent = "Finale complete. Review the wrap below.";
    } else {
      stageStatusElement.textContent = `${sequence.title} complete. Take a breath or queue the next round.`;
    }
  }
  startButton.disabled = false;
  nextButton.disabled = state.sequenceIndex >= sequences.length - 1 || state.climaxActivated;

  if (state.sequenceIndex < sequences.length - 1) {
    addLog(`Sequence clear. ${sequences[state.sequenceIndex + 1].title} is ready.`, "success");
  } else if (!state.climaxActivated) {
    addLog("Debate conquered. Fill that meter and fire the finale.", "warning");
  }

  if (state.climaxSequenceQueued) {
    state.climaxSequenceQueued = false;
    window.setTimeout(() => {
      stageElement.classList.add("climax-active");
      timelineElement.classList.add("is-climax");
      beginSequence(climaxSequence);
    }, 320);
    return;
  }

  if (!state.climaxActivated) {
    return;
  }

  finalizeSession();
}

function finalizeSession() {
  stageElement.classList.remove("climax-active");
  timelineElement.classList.remove("is-climax");
  clearTimeline();
  startButton.disabled = true;
  nextButton.disabled = true;
  stageStatusElement.textContent = "Debate wrapped. Check the performance summary.";
  const accuracy = state.stats.total > 0 ? Math.round((state.stats.hits / state.stats.total) * 100) : 0;
  const summary = accuracy >= 90
    ? "You owned the room—diners are telling this story for years."
    : accuracy >= 70
      ? "Solid delivery. One more pass and the gossip pages are yours."
      : "The crowd’s skeptical, but the booth is ready for redemption.";
  wrapupSummaryElement.textContent = summary;
  wrapupScoreElement.textContent = String(state.conviction);
  wrapupAccuracyElement.textContent = `${accuracy}%`;
  wrapupComboElement.textContent = String(state.bestCombo);
  wrapupElement.hidden = false;

  highScore.submit(state.conviction, {
    accuracy,
    combo: state.bestCombo,
  });
}

function requestClimax() {
  if (state.climaxActivated) {
    return;
  }
  if (state.climaxMeter < 30) {
    addLog("Build more momentum before unleashing the finale.", "warning");
    return;
  }

  const tier = state.climaxMeter >= 100 ? 3 : state.climaxMeter >= 70 ? 2.2 : 1.6;
  state.climaxMultiplier = tier;
  state.climaxActivated = true;
  stageElement.classList.add("climax-active");
  timelineElement.classList.add("is-climax");
  addLog(`Climax engaged! Multiplier x${tier.toFixed(1)} active.`, "success");
  if (typeof particleField.emitBurst === "function") {
    particleField.emitBurst(tier + 0.6);
  }
  if (typeof particleField.emitSparkle === "function") {
    particleField.emitSparkle(tier);
  }
  climaxButton.disabled = true;
  if (state.playing) {
    state.climaxSequenceQueued = true;
  } else {
    beginSequence(climaxSequence);
  }
}

function updateScoreboard() {
  convictionElement.textContent = String(state.conviction);
  comboElement.textContent = String(state.combo);
  comboBestElement.textContent = `Best ${state.bestCombo}`;
  const accuracy = state.stats.total > 0 ? Math.round((state.stats.hits / state.stats.total) * 100) : 0;
  accuracyElement.textContent = `${accuracy}%`;
  hitReadoutElement.textContent = `${state.stats.hits} / ${state.stats.total}`;
  climaxFillElement.style.width = `${state.climaxMeter}%`;
  climaxMeterElement.setAttribute("aria-valuenow", String(state.climaxMeter));
}

function updateClimaxButton() {
  const ready = state.climaxMeter >= 30 && !state.climaxActivated;
  climaxButton.disabled = !ready;
  climaxButton.textContent = ready ? "Cue the Finale" : "Hold for Applause";
}

function clearTimeline() {
  while (timelineElement.firstChild) {
    timelineElement.removeChild(timelineElement.firstChild);
  }
  const background = document.createElement("div");
  background.className = "timeline-background";
  background.setAttribute("aria-hidden", "true");
  const marker = document.createElement("div");
  marker.className = "hit-marker";
  marker.setAttribute("aria-hidden", "true");
  timelineElement.append(background, marker);
}

function createTimelineNote(noteItem) {
  const element = document.createElement("div");
  element.className = `timeline-note ${noteItem.action}`;
  element.textContent = ACTIONS[noteItem.action].short;
  const halfWidth = Math.max(120, timelineElement.clientWidth / 2 - 30);
  element.style.setProperty("--offset", `${halfWidth}px`);
  if (noteItem.hold > 0) {
    element.classList.add("hold");
    element.style.setProperty("--hold-duration", `${Math.max(60, noteItem.hold * HOLD_PIXEL_SCALE)}px`);
  }
  timelineElement.append(element);
  return element;
}

function performerCelebrate() {
  performerElement.classList.remove("is-stumbling");
  performerElement.classList.add("is-pulsing");
  window.setTimeout(() => {
    performerElement.classList.remove("is-pulsing");
  }, 300);
}

function performerStumble() {
  performerElement.classList.remove("is-pulsing");
  performerElement.classList.add("is-stumbling");
  window.setTimeout(() => {
    performerElement.classList.remove("is-stumbling");
  }, 420);
}

function shatterComboMeter() {
  if (!comboTileElement) {
    return;
  }
  comboTileElement.classList.add("combo-meter-shatter");
  window.setTimeout(() => {
    comboTileElement.classList.remove("combo-meter-shatter");
  }, 400);
}

function maybeFlashCamera(rating) {
  if (rating !== "Perfect") {
    return;
  }
  if (!cameraFlashElement) {
    return;
  }
  cameraFlashElement.classList.remove("is-active");
  void cameraFlashElement.offsetWidth;
  cameraFlashElement.classList.add("is-active");
}

function addLog(message, variant = "info") {
  const entry = document.createElement("li");
  entry.textContent = message;
  entry.classList.add(variant);
  eventLogElement.prepend(entry);
  while (eventLogElement.children.length > 9) {
    eventLogElement.removeChild(eventLogElement.lastChild);
  }
}

function showFlash(message) {
  flashTextElement.textContent = message;
  flashBannerElement.hidden = false;
  window.setTimeout(() => {
    flashBannerElement.hidden = true;
  }, 1400);
}

function resetSession() {
  stopSequence();
  state.sequenceIndex = 0;
  state.pendingSequence = sequences[0];
  state.conviction = 0;
  state.combo = 0;
  state.bestCombo = 0;
  state.climaxMeter = 0;
  state.climaxActivated = false;
  state.climaxMultiplier = 1;
  state.climaxSequenceQueued = false;
  state.stats = { total: 0, hits: 0, perfects: 0 };
  stageElement.classList.remove("climax-active", "noise-medium", "noise-high");
  timelineElement.classList.remove("is-climax");
  performerElement.classList.remove("is-pulsing", "is-stumbling");
  wrapupElement.hidden = true;
  flashBannerElement.hidden = true;
  addLog("Session reset. Line up the opening salvo.", "warning");
  prepareSequence(0);
  updateScoreboard();
  updateClimaxButton();
}

function playTone(frequency, duration = 0.18, type = "sine") {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.value = 0.18;
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start();
  gain.gain.setTargetAtTime(0, ctx.currentTime + duration, 0.12);
  oscillator.stop(ctx.currentTime + duration + 0.25);
}

function playScratch() {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  const duration = 0.32;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    const progress = i / data.length;
    const noise = (Math.random() * 2 - 1) * (1 - progress);
    data[i] = noise * (1 - Math.pow(progress, 2));
  }
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  gain.gain.value = 0.28;
  source.buffer = buffer;
  source.connect(gain).connect(ctx.destination);
  source.start();
}

let audioContext = null;
function getAudioContext() {
  if (typeof window.AudioContext !== "function" && typeof window.webkitAudioContext !== "function") {
    return null;
  }
  if (!audioContext) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    audioContext = new Ctor();
  }
  return audioContext;
}
