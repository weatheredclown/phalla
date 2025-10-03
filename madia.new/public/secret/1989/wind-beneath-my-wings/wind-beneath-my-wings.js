import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { mountParticleField } from "../particles.js";
import { autoEnhanceFeedback, createLogChannel, createStatusChannel } from "../feedback.js";

const NOTE_TRAVEL_MS = 3400;
const NOTE_PREVIEW_MS = NOTE_TRAVEL_MS + 600;
const PERFECT_WINDOW = 100;
const HIT_WINDOW = 220;
const HOLD_RELEASE_GRACE = 180;
const HOLD_PIXEL_RATIO = 0.14;
const HOLD_TAIL_MIN = 110;
const HOLD_TAIL_MAX = 320;
const APPLAUSE_TARGET = 2200;
const STAR_GAIN_PERFECT = 18;
const STAR_GAIN_GOOD = 12;
const STAR_LOSS_ON_MISS = 28;
const STAR_POWER_DURATION = 4500;
const CRESCENDO_DURATION = 6500;
const MISS_PENALTY = 90;
const HOLD_FAIL_PENALTY = 140;
const SPAWN_OFFSET = 160;
const TARGET_OFFSET = 72;

const phases = [
  {
    id: "verse",
    name: "Opening Verse",
    start: 0,
    end: 22000,
    className: "is-verse",
    status: "The rehearsal hall is hushed. Land each tender syllable.",
  },
  {
    id: "chorus",
    name: "First Chorus",
    start: 22000,
    end: 43000,
    className: "is-chorus",
    status: "The lights warm. Sustained vowels bloom—hold steady.",
  },
  {
    id: "bridge",
    name: "Emotional Bridge",
    start: 43000,
    end: 62000,
    className: "is-bridge",
    status: "The tempo tightens. Ride the wave without blinking.",
  },
  {
    id: "finale",
    name: "Final Chorus",
    start: 62000,
    end: 90000,
    className: "is-finale",
    status: "Arena lights ignite. Every soar is magnified.",
  },
];

const notes = [
  { id: "v1", time: 4200, type: "tap", phase: "verse" },
  { id: "v2", time: 7600, type: "tap", phase: "verse" },
  { id: "v3", time: 10800, type: "tap", phase: "verse" },
  { id: "v4", time: 14200, type: "hold", duration: 1800, phase: "verse" },
  { id: "v5", time: 17800, type: "tap", phase: "verse" },
  { id: "v6", time: 20600, type: "hold", duration: 2200, phase: "verse" },
  { id: "c1", time: 23400, type: "tap", phase: "chorus" },
  { id: "c2", time: 26000, type: "tap", phase: "chorus" },
  { id: "c3", time: 28600, type: "hold", duration: 2800, phase: "chorus", major: true },
  { id: "c4", time: 32400, type: "tap", phase: "chorus" },
  { id: "c5", time: 34600, type: "tap", phase: "chorus" },
  { id: "c6", time: 36800, type: "hold", duration: 3000, phase: "chorus" },
  { id: "c7", time: 40800, type: "tap", phase: "chorus" },
  { id: "c8", time: 43000, type: "tap", phase: "chorus" },
  { id: "b1", time: 44400, type: "tap", phase: "bridge" },
  { id: "b2", time: 46000, type: "tap", phase: "bridge" },
  { id: "b3", time: 47600, type: "tap", phase: "bridge" },
  { id: "b4", time: 49200, type: "tap", phase: "bridge" },
  { id: "b5", time: 50800, type: "hold", duration: 2200, phase: "bridge" },
  { id: "b6", time: 53600, type: "tap", phase: "bridge" },
  { id: "b7", time: 55200, type: "tap", phase: "bridge" },
  { id: "b8", time: 56800, type: "tap", phase: "bridge" },
  { id: "b9", time: 58400, type: "hold", duration: 2800, phase: "bridge", major: true },
  { id: "f1", time: 61600, type: "tap", phase: "finale" },
  { id: "f2", time: 63600, type: "tap", phase: "finale" },
  { id: "f3", time: 65600, type: "hold", duration: 3200, phase: "finale" },
  { id: "f4", time: 70200, type: "tap", phase: "finale" },
  { id: "f5", time: 71800, type: "tap", phase: "finale" },
  { id: "f6", time: 73400, type: "hold", duration: 3400, phase: "finale", major: true },
  { id: "f7", time: 78200, type: "tap", phase: "finale" },
  { id: "f8", time: 80000, type: "tap", phase: "finale" },
  { id: "f9", time: 82000, type: "hold", duration: 4200, phase: "finale", major: true },
];

const padChords = [
  { time: 0, duration: 9000, freqs: [261.63, 329.63] },
  { time: 22000, duration: 9000, freqs: [293.66, 349.23] },
  { time: 43000, duration: 9000, freqs: [329.63, 392.0] },
  { time: 62000, duration: 12000, freqs: [349.23, 440.0] },
  { time: 76000, duration: 9000, freqs: [392.0, 493.88] },
];

const stage = document.getElementById("stage");
const stageBackdrop = document.getElementById("stage-backdrop");
const stageOverlay = document.querySelector(".stage-overlay");
const noteLane = document.getElementById("note-lane");
const countdownEl = document.getElementById("countdown");
const crescendoBanner = document.getElementById("crescendo-banner");
const phaseNameEl = document.getElementById("phase-name");
const applauseFill = document.getElementById("applause-fill");
const applauseValue = document.getElementById("applause-value");
const comboValue = document.getElementById("combo-value");
const accuracyValue = document.getElementById("accuracy-value");
const perfectCountEl = document.getElementById("perfect-count");
const lateCountEl = document.getElementById("late-count");
const missCountEl = document.getElementById("miss-count");
const starFill = document.getElementById("star-fill");
const starValue = document.getElementById("star-value");
const starCard = document.querySelector(".star-card");
const starHint = document.getElementById("star-hint");
const statusBar = document.getElementById("status-bar");
const eventLog = document.getElementById("event-log");
const startButton = document.getElementById("start-performance");
const restartButton = document.getElementById("restart-performance");
const summaryOverlay = document.getElementById("summary-overlay");
const summaryScore = document.getElementById("summary-score");
const summaryAccuracy = document.getElementById("summary-accuracy");
const summaryCrescendos = document.getElementById("summary-crescendos");
const summaryRestart = document.getElementById("summary-restart");
const summaryClose = document.getElementById("summary-close");

const scoreConfig = getScoreConfig("wind-beneath-my-wings");
const highScore = initHighScoreBanner({
  gameId: "wind-beneath-my-wings",
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

const particleField = mountParticleField({
  container: document.getElementById("particle-anchor") ?? document.body,
  effects: {
    palette: ["#4cc9f0", "#f9a8d4", "#fde68a", "#f97316"],
    ambientDensity: 0.5,
    accentTrail: 0.5,
  },
});

autoEnhanceFeedback();

const statusChannel = createStatusChannel(statusBar);
const logChannel = createLogChannel(eventLog, { limit: 9 });

const state = {
  playing: false,
  countdownTimer: null,
  countdownValue: 0,
  startTime: 0,
  activeNotes: [],
  noteIndex: 0,
  keyDown: false,
  holdNote: null,
  applause: 0,
  combo: 0,
  bestCombo: 0,
  perfect: 0,
  late: 0,
  miss: 0,
  starPower: 0,
  starReady: false,
  starPowerActive: false,
  starPowerAvailable: true,
  starPowerEnd: 0,
  crescendoUntil: 0,
  crescendoCount: 0,
  multiplier: 1,
  lastPhaseId: "verse",
  rafId: null,
  totalNotes: notes.length,
  audioContext: null,
  masterGain: null,
  activeSources: [],
  pendingSummary: false,
};

function resetAudio() {
  state.activeSources.forEach(({ osc }) => {
    try {
      osc.stop();
    } catch (error) {
      // ignore stop errors when already stopped
    }
  });
  state.activeSources = [];
}

function initAudio() {
  if (state.audioContext) {
    resetAudio();
    return;
  }
  try {
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.gain.value = 0.08;
    gain.connect(ctx.destination);
    state.audioContext = ctx;
    state.masterGain = gain;
  } catch (error) {
    console.warn("Audio context unavailable", error);
  }
}

function schedulePad() {
  if (!state.audioContext || !state.masterGain) {
    return;
  }
  const ctx = state.audioContext;
  const startOffset = ctx.currentTime + 0.1;
  padChords.forEach((chord) => {
    chord.freqs.forEach((frequency) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, startOffset + chord.time / 1000);
      gain.gain.linearRampToValueAtTime(0.08, startOffset + chord.time / 1000 + 0.8);
      const releaseStart = startOffset + (chord.time + chord.duration - 800) / 1000;
      gain.gain.linearRampToValueAtTime(0.05, releaseStart);
      gain.gain.linearRampToValueAtTime(0.0001, startOffset + (chord.time + chord.duration) / 1000);
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, startOffset + chord.time / 1000);
      osc.connect(gain).connect(state.masterGain);
      osc.start(startOffset + chord.time / 1000);
      osc.stop(startOffset + (chord.time + chord.duration) / 1000);
      state.activeSources.push({ osc, gain });
    });
  });
}

function getSongTime() {
  if (!state.playing) {
    return 0;
  }
  return performance.now() - state.startTime;
}

function setStagePhase(phaseId) {
  const phase = phases.find((item) => item.id === phaseId) ?? phases[0];
  phaseNameEl.textContent = phase.name;
  stage.classList.remove("is-verse", "is-chorus", "is-bridge", "is-finale");
  stage.classList.add(phase.className);
  if (state.lastPhaseId !== phase.id) {
    state.lastPhaseId = phase.id;
    statusChannel(phase.status, "info");
    logChannel.push(`${phase.name} begins.`, "info");
  }
}

function resetNotes() {
  noteLane.innerHTML = "";
  state.activeNotes = notes.map((note) => ({ ...note, spawned: false, element: null, status: "pending" }));
  state.noteIndex = 0;
}

function resetState({ keepOverlay = false } = {}) {
  if (state.rafId !== null) {
    cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }
  resetAudio();
  state.playing = false;
  state.countdownValue = 0;
  state.keyDown = false;
  state.holdNote = null;
  state.applause = 0;
  state.combo = 0;
  state.bestCombo = 0;
  state.perfect = 0;
  state.late = 0;
  state.miss = 0;
  state.starPower = 0;
  state.starReady = false;
  state.starPowerActive = false;
  state.starPowerAvailable = true;
  state.starPowerEnd = 0;
  state.crescendoUntil = 0;
  state.crescendoCount = 0;
  state.multiplier = 1;
  state.lastPhaseId = "verse";
  state.pendingSummary = false;
  resetNotes();
  updateApplauseDisplay();
  updateComboDisplay();
  updateAccuracyDisplay();
  updateStarDisplay();
  stage.classList.remove("is-live", "is-crescendo", "is-star-power", "is-miss-shock");
  stage.classList.add("is-intro", "is-verse");
  setStagePhase("verse");
  countdownEl.textContent = "";
  crescendoBanner.setAttribute("aria-hidden", "true");
  if (!keepOverlay) {
    summaryOverlay.hidden = true;
  }
  statusChannel("Welcome to the rehearsal hall.", "info");
  eventLog.innerHTML = "";
  logChannel.push("Stage reset. Ready when you are.", "info");
}

function updateApplauseDisplay() {
  const value = Math.max(0, Math.round(state.applause));
  applauseValue.textContent = value.toLocaleString();
  const meterValue = Math.min(1, value / APPLAUSE_TARGET) * 100;
  applauseFill.style.width = `${meterValue}%`;
  applauseFill.parentElement?.setAttribute("aria-valuenow", String(value));
  applauseFill.parentElement?.setAttribute("aria-valuemax", String(APPLAUSE_TARGET));
}

function updateComboDisplay() {
  comboValue.textContent = state.combo;
}

function updateAccuracyDisplay() {
  perfectCountEl.textContent = state.perfect;
  lateCountEl.textContent = state.late;
  missCountEl.textContent = state.miss;
  const attempted = state.perfect + state.late + state.miss;
  const accuracy = attempted === 0 ? 0 : Math.round(((state.perfect + state.late) / attempted) * 100);
  accuracyValue.textContent = `${accuracy}%`;
}

function updateStarDisplay() {
  const clamped = Math.max(0, Math.min(100, Math.round(state.starPower)));
  starFill.style.width = `${clamped}%`;
  starFill.parentElement?.setAttribute("aria-valuenow", String(clamped));
  starValue.textContent = `${clamped}%`;
  if (state.starReady && state.starPowerAvailable) {
    starCard.dataset.ready = "true";
    starHint.textContent = "Press Enter to unleash Star Power.";
  } else {
    starCard.dataset.ready = "false";
    starHint.textContent = "Chain perfects to fill the meter.";
  }
}

function spawnNote(note) {
  const element = document.createElement("div");
  element.className = "note";
  element.dataset.id = note.id;
  element.dataset.type = note.type;
  element.dataset.label = note.type === "tap" ? "Tap" : "Hold";
  if (note.type === "hold" && typeof note.duration === "number") {
    const tail = Math.min(HOLD_TAIL_MAX, Math.max(HOLD_TAIL_MIN, note.duration * HOLD_PIXEL_RATIO));
    element.style.setProperty("--hold-extension", `${tail}px`);
  }
  noteLane.append(element);
  note.element = element;
  note.spawned = true;
}

function removeNote(note) {
  if (!note?.element) {
    return;
  }
  window.setTimeout(() => {
    note.element?.remove();
  }, 420);
}

function getPhaseForTime(time) {
  const phase = phases.find((segment) => time >= segment.start && time < segment.end);
  return phase ? phase.id : phases[phases.length - 1].id;
}

function getActiveMultiplier() {
  return state.multiplier;
}

function addApplause(points, rating = "perfect") {
  const multiplier = getActiveMultiplier();
  const comboBonus = 1 + state.combo * 0.05;
  const total = points * multiplier * comboBonus;
  state.applause += total;
  updateApplauseDisplay();
  const tone = rating === "perfect" ? "success" : rating === "late" ? "warning" : "info";
  logChannel.push(`Applause +${Math.round(total)} (${rating}).`, tone);
}

function increaseStarPower(amount) {
  state.starPower = Math.min(100, state.starPower + amount);
  if (state.starPower >= 100) {
    state.starReady = true;
  }
  updateStarDisplay();
}

function decreaseStarPower(amount) {
  state.starPower = Math.max(0, state.starPower - amount);
  if (state.starPower < 100) {
    state.starReady = false;
  }
  updateStarDisplay();
}

function celebrateHit(note) {
  if (note?.element) {
    note.element.classList.add("is-hit");
  }
  particleField.emitSparkle?.({ intensity: 0.8 });
}

function handleTapHit(note, delta, rating = "perfect") {
  if (note.status === "hit") {
    return;
  }
  note.status = "hit";
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  updateComboDisplay();
  if (rating === "perfect") {
    state.perfect += 1;
    increaseStarPower(STAR_GAIN_PERFECT);
  } else {
    state.late += 1;
    increaseStarPower(STAR_GAIN_GOOD);
  }
  updateAccuracyDisplay();
  addApplause(rating === "perfect" ? 150 : 100, rating);
  celebrateHit(note);
  removeNote(note);
}

function completeHold(note, { auto = false } = {}) {
  if (!note || note.status === "hit") {
    return;
  }
  note.status = "hit";
  note.holdActive = false;
  state.holdNote = null;
  const holdSeconds = Math.max(1.2, note.duration / 1000);
  const base = 180 * Math.pow(holdSeconds, 1.4);
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.perfect += 1;
  increaseStarPower(STAR_GAIN_PERFECT + holdSeconds * 4);
  updateComboDisplay();
  updateAccuracyDisplay();
  const rating = auto ? "perfect" : "perfect";
  addApplause(base, rating);
  celebrateHit(note);
  if (note.major) {
    triggerCrescendo();
    state.crescendoCount += 1;
  }
  removeNote(note);
}

function failHold(note, reason = "Hold dropped") {
  if (!note || note.status === "hit" || note.status === "miss") {
    return;
  }
  note.status = "miss";
  note.holdActive = false;
  state.holdNote = null;
  if (note.element) {
    note.element.classList.add("is-miss");
  }
  handleMissAftermath(reason);
  removeNote(note);
}

function handleMiss(note, reason = "Missed note") {
  if (!note || note.status === "hit" || note.status === "miss") {
    return;
  }
  note.status = "miss";
  if (note.element) {
    note.element.classList.add("is-miss");
  }
  state.miss += 1;
  updateAccuracyDisplay();
  handleMissAftermath(reason);
  removeNote(note);
}

function handleMissAftermath(reason) {
  state.combo = 0;
  updateComboDisplay();
  state.applause = Math.max(0, state.applause - MISS_PENALTY);
  updateApplauseDisplay();
  decreaseStarPower(STAR_LOSS_ON_MISS);
  statusChannel(`${reason}. Combo reset.`, "warning");
  logChannel.push(reason, "danger");
  stage.classList.remove("is-miss-shock");
  void stage.offsetWidth;
  stage.classList.add("is-miss-shock");
}

function triggerCrescendo() {
  const now = getSongTime();
  state.crescendoUntil = now + CRESCENDO_DURATION;
  state.multiplier = 2;
  stage.classList.add("is-crescendo");
  crescendoBanner.setAttribute("aria-hidden", "false");
  particleField.emitBurst?.({ intensity: 1 });
  statusChannel("Crescendo! Spotlight doubles your applause.", "success");
}

function clearCrescendoIfNeeded(now) {
  if (state.crescendoUntil > 0 && now >= state.crescendoUntil) {
    state.crescendoUntil = 0;
    state.multiplier = 1;
    stage.classList.remove("is-crescendo");
    crescendoBanner.setAttribute("aria-hidden", "true");
    statusChannel("Crescendo fades. Keep the energy up!", "info");
  }
}

function activateStarPower() {
  if (!state.starReady || !state.starPowerAvailable) {
    return;
  }
  state.starPowerAvailable = false;
  state.starPowerActive = true;
  state.starPowerEnd = getSongTime() + STAR_POWER_DURATION;
  stage.classList.add("is-star-power");
  starCard.dataset.ready = "false";
  starHint.textContent = "Star Power is covering the next phrases.";
  statusChannel("Star Power! The band carries the next bars.", "success");
  logChannel.push("Star Power activated. Notes will auto-clear for a moment.", "success");
}

function clearStarPowerIfNeeded(now) {
  if (state.starPowerActive && now >= state.starPowerEnd) {
    state.starPowerActive = false;
    stage.classList.remove("is-star-power");
    statusChannel("Star Power ended. You're back in the spotlight.", "info");
  }
}

function autoHitNotes(now) {
  if (!state.starPowerActive) {
    return;
  }
  state.activeNotes.forEach((note) => {
    if (note.status === "pending" || note.status === "holding") {
      if (note.type === "tap") {
        if (Math.abs(now - note.time) <= HIT_WINDOW) {
          handleTapHit(note, 0, "perfect");
        }
      } else if (note.type === "hold") {
        if (!note.holdActive && Math.abs(now - note.time) <= HIT_WINDOW) {
          note.holdActive = true;
          note.status = "holding";
          note.holdAuto = true;
        }
        if (note.holdActive && now >= note.time + note.duration - HOLD_RELEASE_GRACE) {
          completeHold(note, { auto: true });
        }
      }
    }
  });
}

function findEligibleNote(now) {
  let best = null;
  let bestDelta = Infinity;
  for (const note of state.activeNotes) {
    if (note.status === "hit" || note.status === "miss") {
      continue;
    }
    const delta = now - note.time;
    if (Math.abs(delta) <= HIT_WINDOW) {
      if (best === null || Math.abs(delta) < Math.abs(bestDelta)) {
        best = note;
        bestDelta = delta;
      }
    }
  }
  return { note: best, delta: bestDelta };
}

function handleKeyDown(event) {
  if (event.repeat) {
    return;
  }
  if (event.code === "Space") {
    event.preventDefault();
    state.keyDown = true;
    if (!state.playing) {
      return;
    }
    const now = getSongTime();
    const { note, delta } = findEligibleNote(now);
    if (!note) {
      return;
    }
    if (note.type === "tap") {
      const rating = Math.abs(delta) <= PERFECT_WINDOW ? "perfect" : "late";
      handleTapHit(note, delta, rating);
    } else if (note.type === "hold") {
      if (note.status === "holding" || note.holdActive) {
        return;
      }
      if (Math.abs(delta) <= HIT_WINDOW) {
        note.holdActive = true;
        note.status = "holding";
        note.holdAuto = false;
        note.holdPressDelta = delta;
        state.holdNote = note;
        logChannel.push("Hold engaged. Keep the ribbon lit.", "info");
        increaseStarPower(6);
        updateStarDisplay();
      }
    }
  } else if (event.code === "Enter") {
    event.preventDefault();
    activateStarPower();
  }
}

function handleKeyUp(event) {
  if (event.code === "Space") {
    state.keyDown = false;
    if (!state.playing) {
      return;
    }
    if (state.holdNote && !state.holdNote.holdAuto) {
      const now = getSongTime();
      const releaseThreshold = state.holdNote.time + state.holdNote.duration - HOLD_RELEASE_GRACE;
      if (now >= releaseThreshold) {
        completeHold(state.holdNote);
      } else {
        failHold(state.holdNote, "Released hold too early");
      }
    }
  }
}

function spawnNotesIfNeeded(now) {
  while (state.noteIndex < state.activeNotes.length) {
    const note = state.activeNotes[state.noteIndex];
    if (note.spawned) {
      state.noteIndex += 1;
      continue;
    }
    if (now + NOTE_PREVIEW_MS >= note.time) {
      spawnNote(note);
      state.noteIndex += 1;
    } else {
      break;
    }
  }
}

function updateNotes(now) {
  const laneHeight = noteLane.clientHeight || 360;
  state.activeNotes.forEach((note) => {
    if (!note.spawned || !note.element) {
      return;
    }
    const spawnTime = note.time - NOTE_TRAVEL_MS;
    const rawProgress = (now - spawnTime) / NOTE_TRAVEL_MS;
    const clamped = Math.max(0, note.type === "hold" ? Math.min(rawProgress, 1) : rawProgress);
    const noteHeight = note.element.offsetHeight || 56;
    const targetY = laneHeight - TARGET_OFFSET - noteHeight / 2;
    const top = -SPAWN_OFFSET + clamped * (targetY + SPAWN_OFFSET);
    note.element.style.setProperty("--note-y", `${top}px`);

    if (note.type === "tap") {
      if (now > note.time + HIT_WINDOW && note.status !== "hit" && note.status !== "miss") {
        handleMiss(note, "Missed tap note");
      }
    } else if (note.type === "hold") {
      if (now > note.time + HIT_WINDOW && !note.holdActive && note.status !== "hit" && note.status !== "miss") {
        failHold(note, "Missed the hold start");
      }
      if (note.holdActive && !note.holdAuto && !state.keyDown) {
        const gracePoint = note.time + note.duration - HOLD_RELEASE_GRACE;
        if (now < gracePoint) {
          failHold(note, "Hold slipped");
        }
      }
      if (note.holdActive && now >= note.time + note.duration - HOLD_RELEASE_GRACE) {
        if (note.holdAuto) {
          completeHold(note, { auto: true });
        } else if (state.keyDown) {
          completeHold(note);
        }
      }
    }
  });
}

function checkPhaseTransitions(now) {
  const phaseId = getPhaseForTime(now);
  setStagePhase(phaseId);
}

function maybeEndPerformance(now) {
  if (state.pendingSummary) {
    return;
  }
  const lastNote = notes[notes.length - 1];
  const finaleEnd = lastNote.time + (lastNote.duration ?? 0) + 2400;
  const unresolved = state.activeNotes.some((note) => note.status !== "hit" && note.status !== "miss");
  if (!unresolved && now > finaleEnd) {
    state.pendingSummary = true;
    window.setTimeout(() => {
      finishPerformance();
    }, 600);
  }
}

function update(now) {
  if (!state.playing) {
    return;
  }
  spawnNotesIfNeeded(now);
  updateNotes(now);
  autoHitNotes(now);
  checkPhaseTransitions(now);
  clearCrescendoIfNeeded(now);
  clearStarPowerIfNeeded(now);
  maybeEndPerformance(now);
  state.rafId = requestAnimationFrame(() => update(getSongTime()));
}

function beginPerformance() {
  state.playing = true;
  state.startTime = performance.now();
  stage.classList.remove("is-intro");
  stage.classList.add("is-live");
  initAudio();
  if (state.audioContext) {
    state.audioContext.resume().then(() => {
      schedulePad();
    }).catch(() => {
      // ignore resume errors
    });
  }
  logChannel.push("Curtain rises. Feel the first verse.", "info");
  statusChannel("Performance live!", "success");
  state.rafId = requestAnimationFrame(() => update(getSongTime()));
}

function startCountdown() {
  if (state.playing || state.countdownTimer) {
    return;
  }
  resetState({ keepOverlay: true });
  state.countdownValue = 3;
  countdownEl.textContent = "3";
  statusChannel("Deep breath. Entry in three…", "info");
  state.countdownTimer = window.setInterval(() => {
    state.countdownValue -= 1;
    if (state.countdownValue > 0) {
      countdownEl.textContent = String(state.countdownValue);
    } else {
      window.clearInterval(state.countdownTimer);
      state.countdownTimer = null;
      countdownEl.textContent = "";
      beginPerformance();
    }
  }, 1000);
}

function finishPerformance() {
  state.playing = false;
  if (state.rafId !== null) {
    cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }
  clearInterval(state.countdownTimer ?? 0);
  state.countdownTimer = null;
  stage.classList.remove("is-live", "is-star-power", "is-crescendo");
  const finalScore = Math.max(0, Math.round(state.applause));
  const attempted = state.perfect + state.late + state.miss;
  const accuracy = attempted === 0 ? 0 : Math.round(((state.perfect + state.late) / attempted) * 100);
  summaryScore.textContent = finalScore.toLocaleString();
  summaryAccuracy.textContent = `${accuracy}%`;
  summaryCrescendos.textContent = String(state.crescendoCount);
  highScore.submit(finalScore, {
    accuracy,
    crescendos: state.crescendoCount,
    bestCombo: state.bestCombo,
  });
  summaryOverlay.hidden = false;
  statusChannel("Curtain call complete. Check your summary.", "success");
}

startButton.addEventListener("click", () => {
  if (state.playing) {
    return;
  }
  startCountdown();
});

restartButton.addEventListener("click", () => {
  resetState();
});

summaryRestart.addEventListener("click", () => {
  summaryOverlay.hidden = true;
  startCountdown();
});

summaryClose.addEventListener("click", () => {
  summaryOverlay.hidden = true;
});

document.addEventListener("keydown", handleKeyDown);
document.addEventListener("keyup", handleKeyUp);

resetState();
