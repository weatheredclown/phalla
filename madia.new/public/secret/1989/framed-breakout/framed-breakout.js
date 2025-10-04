import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { mountParticleField } from "../particles.js";
import { autoEnhanceFeedback } from "../feedback.js";

const particleField = mountParticleField({
  effects: {
    palette: ["#38bdf8", "#f97316", "#f472b6", "#22c55e"],
    ambientDensity: 0.42,
  },
});

const scoreConfig = getScoreConfig("framed-breakout");
const highScore = initHighScoreBanner({
  gameId: "framed-breakout",
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

autoEnhanceFeedback();

const HEROISM_MAX = 100;
const HEROISM_START = 30;
const TIME_BUDGET = 96;
const DISTRACTION_TIME = [18, 20, 24];
const DIRECT_TIME = [8, 10, 12];
const DISTRACTION_SCORE = [140, 180, 210];
const DIRECT_SCORE = [240, 280, 340];
const DISTRACTION_HEROISM = [16, 18, 24];
const DIRECT_HEROISM = [26, 32, 38];
const DIRECT_WINDOWS = [2600, 2300, 2100];

const AREAS = [
  {
    id: "cell-block",
    label: "Cell Block Rumble",
    guard: "Sergeant Prism",
    distractionSuccess: "Bunk collapse distraction triggered. Prism ran to investigate the noise.",
    directSuccess: "You haymakered Prism into the laundry cart and sprinted through.",
    distractionFail: "Prism caught the fake bunk collapse. Spotlight raked across your disguise.",
    directFail: "You whiffed the haymaker. Prism lit you up with the keytar spotlight.",
    puzzle: "sequence",
  },
  {
    id: "cafeteria",
    label: "Cafeteria Chaos",
    guard: "Lieutenant Ladle",
    distractionSuccess: "Pudding avalanche launched. Ladle followed the mess while you coasted.",
    directSuccess: "You vaulted the pudding carts and dropped Ladle in a tray slide.",
    distractionFail: "The pudding valves squealed off-beat. Drones pivoted straight at you.",
    directFail: "Your tray slide stalled. The drones triangulated your stunt.",
    puzzle: "toggles",
  },
  {
    id: "yard",
    label: "Yard Finale",
    guard: "Captain Floodlight",
    distractionSuccess: "Drone lights looped into a spiral and Floodlight chased the phantom beam.",
    directSuccess: "Slow-motion flying kick executed. Floodlight ate turf and the gate popped open.",
    distractionFail: "The drone pattern glitched. Floodlight spotted the hack instantly.",
    directFail: "You mistimed the slow-mo kick. Floodlight's megaphone siren blasted you.",
    puzzle: "maze",
  },
];

const AREA_COPY = {
  "cell-block": {
    waiting: "Status: Waiting for launch.",
    active: "Status: Active — pick your first move.",
    locked: "Status: Waiting for launch.",
  },
  cafeteria: {
    waiting: "Status: Locked until the cell block is clear.",
    active: "Status: Active — line up a distraction or blitz the guard.",
    locked: "Status: Locked until the cell block is clear.",
  },
  yard: {
    waiting: "Status: Reachable after the cafeteria.",
    active: "Status: Active — finale guard on alert.",
    locked: "Status: Reachable after the cafeteria.",
  },
};

const areaRefs = new Map();

document.querySelectorAll(".area-card").forEach((card) => {
  const areaId = card.dataset.area;
  const buttons = Array.from(card.querySelectorAll(".area-actions button"));
  const statusElement = card.querySelector(".area-status");
  areaRefs.set(areaId, {
    card,
    buttons,
    statusElement,
    message: statusElement?.textContent ?? "",
  });

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      if (!action) {
        return;
      }
      ensureAudio();
      handleAreaAction(areaId, action);
    });
  });
});

const heroismMeter = document.getElementById("heroism-meter");
const heroismFill = document.getElementById("heroism-fill");
const heroismValue = document.getElementById("heroism-value");
const scoreValue = document.getElementById("escape-score");
const guardEvadesValue = document.getElementById("guard-evades");
const timeBufferValue = document.getElementById("time-buffer");
const guardStatus = document.getElementById("guard-status");
const eventFeed = document.getElementById("event-feed");
const simulatorHelp = document.getElementById("simulator-help");
const startRunButton = document.getElementById("start-run");
const resetRunButton = document.getElementById("reset-run");
const heroismTile = document.querySelector(".status-tile--heroism");
const timeTile = document.querySelector(".status-tile--time");

const wrapupElement = document.getElementById("wrapup");
const wrapupDialog = wrapupElement.querySelector(".wrapup-dialog");
const wrapupSubtitle = document.getElementById("wrapup-subtitle");
const wrapupScore = document.getElementById("wrapup-score");
const wrapupGuards = document.getElementById("wrapup-guards");
const wrapupHeroism = document.getElementById("wrapup-heroism");
const wrapupDisguise = document.getElementById("wrapup-disguise");
const wrapupFeed = document.getElementById("wrapup-feed");
const wrapupRestart = document.getElementById("wrapup-restart");
const wrapupClose = document.getElementById("wrapup-close");

const puzzleLayer = document.getElementById("puzzle-layer");
const puzzleDialog = puzzleLayer.querySelector(".puzzle-dialog");
const puzzleTitle = document.getElementById("puzzle-title");
const puzzleSubtitle = document.getElementById("puzzle-subtitle");
const puzzleBody = document.getElementById("puzzle-body");
const puzzleActions = document.getElementById("puzzle-actions");

const state = {
  runActive: false,
  currentArea: 0,
  heroism: 0,
  heroismPeak: 0,
  score: 0,
  guardsEvaded: 0,
  timeBuffer: TIME_BUDGET,
  history: [],
  highlights: [],
  distractionWins: 0,
  directWins: 0,
  detectionCount: 0,
  qteHandler: null,
  qteTimer: null,
  modalCleanup: null,
  timeWarningLevel: "safe",
};

if (heroismFill) {
  heroismFill.dataset.previousValue = String(state.heroism);
}

let audioContext = null;

function ensureAudio() {
  if (!audioContext) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioContext = new AudioContext();
    }
  }
  if (audioContext && audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

function playWhoosh() {
  const ctx = ensureAudio();
  if (!ctx) {
    return;
  }
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.7, ctx.currentTime + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
  osc.frequency.setValueAtTime(180, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.32);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.38);
}

function playHeroSting() {
  const ctx = ensureAudio();
  if (!ctx) {
    return;
  }
  const notes = [440, 554.37, 659.25];
  const now = ctx.currentTime;
  notes.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, now + index * 0.1);
    gain.gain.setValueAtTime(0.0001, now + index * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.6, now + index * 0.1 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.1 + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + index * 0.1);
    osc.stop(now + index * 0.1 + 0.52);
  });
}

function playSiren() {
  const ctx = ensureAudio();
  if (!ctx) {
    return;
  }
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  const now = ctx.currentTime;
  const sweep = ctx.createOscillator();
  sweep.type = "sine";
  sweep.frequency.setValueAtTime(2.5, now);
  const sweepGain = ctx.createGain();
  sweepGain.gain.setValueAtTime(80, now);
  sweep.connect(sweepGain);
  sweepGain.connect(osc.frequency);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.4, now + 0.06);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  sweep.start(now);
  osc.stop(now + 0.82);
  sweep.stop(now + 0.82);
}

function playChargeSweep(delta = 1) {
  const ctx = ensureAudio();
  if (!ctx) {
    return;
  }
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const intensity = Math.min(Math.max(delta, 4), 28);
  const startFreq = 220;
  const endFreq = startFreq + intensity * 14;
  osc.type = "sine";
  osc.frequency.setValueAtTime(startFreq, now);
  osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.4);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.45, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.48);
}

function playTimeWarning(level) {
  const ctx = ensureAudio();
  if (!ctx) {
    return;
  }
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  const base = level === "critical" ? 180 : 320;
  osc.frequency.setValueAtTime(base, now);
  if (level === "critical") {
    const vibrato = ctx.createOscillator();
    const vibratoGain = ctx.createGain();
    vibrato.frequency.setValueAtTime(7, now);
    vibratoGain.gain.setValueAtTime(30, now);
    vibrato.connect(vibratoGain).connect(osc.frequency);
    vibrato.start(now);
    vibrato.stop(now + 0.3);
  }
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(level === "critical" ? 0.5 : 0.35, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.34);
}

function playCrashImpact() {
  const ctx = ensureAudio();
  if (!ctx) {
    return;
  }
  const now = ctx.currentTime;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.32, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) {
    const fade = 1 - index / data.length;
    data[index] = (Math.random() * 2 - 1) * fade;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(520, now);
  filter.Q.value = 3;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.7, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
  noise.connect(filter).connect(gain).connect(ctx.destination);
  noise.start(now);
  noise.stop(now + 0.34);
}

const elementPulseTimers = new WeakMap();

function pulseClass(element, className, duration = 620) {
  if (!element) {
    return;
  }
  const timers = elementPulseTimers.get(element) ?? new Map();
  const existing = timers.get(className);
  if (typeof existing === "number") {
    window.clearTimeout(existing);
  }
  element.classList.remove(className);
  // eslint-disable-next-line no-unused-expressions
  element.offsetWidth;
  element.classList.add(className);
  const timeoutId = window.setTimeout(() => {
    element.classList.remove(className);
    const current = elementPulseTimers.get(element);
    if (current) {
      current.delete(className);
      if (current.size === 0) {
        elementPulseTimers.delete(element);
      }
    }
  }, duration);
  timers.set(className, timeoutId);
  elementPulseTimers.set(element, timers);
}

function updateHeroismUI(triggerFlash = false) {
  const previous = Number(heroismFill?.dataset.previousValue ?? state.heroism);
  const clamped = Math.max(0, Math.min(HEROISM_MAX, Math.round(state.heroism)));
  state.heroism = clamped;
  if (heroismFill) {
    heroismFill.style.width = `${(clamped / HEROISM_MAX) * 100}%`;
    heroismFill.dataset.previousValue = String(clamped);
  }
  if (heroismMeter) {
    heroismMeter.setAttribute("aria-valuenow", String(clamped));
    heroismMeter.classList.toggle("heroism-meter--critical", clamped <= 18);
  }
  heroismValue.textContent = `${clamped} / ${HEROISM_MAX}`;
  if (clamped > state.heroismPeak) {
    state.heroismPeak = clamped;
  }

  const delta = clamped - previous;
  if (heroismTile) {
    heroismTile.classList.toggle("status-tile--charged", clamped >= 70);
    if (delta > 0) {
      pulseClass(heroismTile, "status-tile--surge");
      if (delta >= 6) {
        playChargeSweep(delta);
      }
    }
    if (triggerFlash) {
      pulseClass(heroismTile, "status-tile--drain");
    }
  }

  if (clamped === 0) {
    document.body.classList.add("heroism-drain");
  } else {
    document.body.classList.remove("heroism-drain");
  }
  if (triggerFlash) {
    document.body.classList.add("caught-flash");
    window.setTimeout(() => {
      document.body.classList.remove("caught-flash");
    }, 520);
  }
}

function updateScoreUI() {
  scoreValue.textContent = String(state.score);
  guardEvadesValue.textContent = String(state.guardsEvaded);
}

function updateTimeUI() {
  const clamped = Math.max(0, Math.round(state.timeBuffer));
  state.timeBuffer = clamped;
  timeBufferValue.textContent = `${clamped} beats`;
  const previousLevel = state.timeWarningLevel ?? "safe";
  let level = "safe";
  if (clamped <= 12) {
    level = "critical";
  } else if (clamped <= 28) {
    level = "warning";
  }
  if (timeTile) {
    timeTile.classList.toggle("is-warning", level === "warning");
    timeTile.classList.toggle("is-critical", level === "critical");
  }
  if (level !== previousLevel) {
    state.timeWarningLevel = level;
    if (level === "critical") {
      particleField.emitSparkle(0.65);
    }
    if (level !== "safe") {
      playTimeWarning(level);
    }
  }
}

function setGuardStatus(message) {
  guardStatus.textContent = message;
}

function renderEventFeed() {
  eventFeed.innerHTML = "";
  state.history.slice(0, 6).forEach((entry) => {
    const item = document.createElement("li");
    item.textContent = entry.text;
    if (entry.tone) {
      item.dataset.tone = entry.tone;
    }
    eventFeed.append(item);
  });
}

function logEvent(text, tone = "info") {
  state.history.unshift({ text, tone });
  if (state.history.length > 12) {
    state.history.pop();
  }
  if (!state.highlights.includes(text)) {
    state.highlights.unshift(text);
    if (state.highlights.length > 6) {
      state.highlights.pop();
    }
  }
  renderEventFeed();
}

function resetHighlights() {
  state.history = [];
  state.highlights = [];
  renderEventFeed();
}

function determineDisguise() {
  if (state.directWins >= 2) {
    return "Foam Bicep Trench";
  }
  if (state.distractionWins >= 2) {
    return "Laundry Cart Poncho";
  }
  if (state.heroismPeak >= 80) {
    return "Chrome Star Bandolier";
  }
  return "Mullet of Shadows";
}

function setAreaStates() {
  AREAS.forEach((area, index) => {
    const ref = areaRefs.get(area.id);
    if (!ref) {
      return;
    }
    let stateName = "locked";
    let message = AREA_COPY[area.id]?.locked ?? ref.message;
    if (!state.runActive) {
      if (index === 0) {
        stateName = "ready";
        message = AREA_COPY[area.id]?.waiting ?? ref.message;
      }
    } else if (index < state.currentArea) {
      stateName = "cleared";
      message = ref.message;
    } else if (index === state.currentArea) {
      stateName = "active";
      message = AREA_COPY[area.id]?.active ?? "Status: Active.";
    }

    ref.card.dataset.state = stateName;
    if (ref.statusElement) {
      ref.statusElement.textContent = message;
    }
    ref.buttons.forEach((button) => {
      button.disabled = !state.runActive || index !== state.currentArea;
    });
  });
}

function resetBoard() {
  closeModal();
  closeWrapup();
  state.runActive = false;
  state.currentArea = 0;
  state.heroism = 0;
  state.heroismPeak = 0;
  state.score = 0;
  state.guardsEvaded = 0;
  state.timeBuffer = TIME_BUDGET;
  state.distractionWins = 0;
  state.directWins = 0;
  state.detectionCount = 0;
  state.timeWarningLevel = "safe";
  resetHighlights();
  if (heroismFill) {
    heroismFill.dataset.previousValue = String(state.heroism);
  }
  if (heroismTile) {
    heroismTile.classList.remove("status-tile--surge", "status-tile--charged", "status-tile--drain");
  }
  if (heroismMeter) {
    heroismMeter.classList.remove("heroism-meter--critical");
  }
  if (timeTile) {
    timeTile.classList.remove("is-warning", "is-critical");
  }
  document.body.classList.remove("heroism-crash");
  updateHeroismUI();
  updateScoreUI();
  updateTimeUI();
  simulatorHelp.textContent = "Launch the escape to arm the heroism meter, then clear each zone in order. Pick distractions for steady progress or gamble on direct action for bonus heroism.";
  setGuardStatus("Awaiting launch.");
  AREAS.forEach((area) => {
    const ref = areaRefs.get(area.id);
    if (ref) {
      ref.message = AREA_COPY[area.id]?.waiting ?? ref.message;
      if (ref.statusElement) {
        ref.statusElement.textContent = AREA_COPY[area.id]?.waiting ?? ref.message;
      }
    }
  });
  setAreaStates();
}

function startRun() {
  closeModal();
  closeWrapup();
  state.runActive = true;
  state.currentArea = 0;
  state.heroism = HEROISM_START;
  state.heroismPeak = HEROISM_START;
  state.score = 0;
  state.guardsEvaded = 0;
  state.timeBuffer = TIME_BUDGET;
  state.distractionWins = 0;
  state.directWins = 0;
  state.detectionCount = 0;
  state.timeWarningLevel = "safe";
  resetHighlights();
  if (heroismFill) {
    heroismFill.dataset.previousValue = "0";
  }
  if (heroismTile) {
    heroismTile.classList.remove("status-tile--surge", "status-tile--charged", "status-tile--drain");
  }
  if (heroismMeter) {
    heroismMeter.classList.remove("heroism-meter--critical");
  }
  if (timeTile) {
    timeTile.classList.remove("is-warning", "is-critical");
  }
  document.body.classList.remove("heroism-crash");
  updateHeroismUI();
  updateScoreUI();
  updateTimeUI();
  simulatorHelp.textContent = "Cell block infiltration armed. Build heroism safely or take a direct swing for instant glory.";
  setGuardStatus("Sergeant Prism is pacing. Choose distraction or direct action to break the cell block.");
  AREAS.forEach((area) => {
    const ref = areaRefs.get(area.id);
    if (ref && ref.statusElement) {
      ref.message = AREA_COPY[area.id]?.waiting ?? ref.message;
    }
  });
  logEvent("Heroism meter armed. Guards still think the moustache is legit.");
  setAreaStates();
}

function closeWrapup() {
  wrapupElement.hidden = true;
}

function openWrapup(success, message) {
  wrapupSubtitle.textContent = message;
  wrapupScore.textContent = String(state.score);
  wrapupGuards.textContent = String(state.guardsEvaded);
  wrapupHeroism.textContent = String(state.heroismPeak);
  const disguise = determineDisguise();
  wrapupDisguise.textContent = disguise;
  wrapupFeed.innerHTML = "";
  state.highlights.slice(0, 5).forEach((entry) => {
    const item = document.createElement("li");
    item.textContent = entry;
    wrapupFeed.append(item);
  });
  wrapupElement.hidden = false;
  window.setTimeout(() => {
    wrapupDialog.focus();
  }, 120);
  highScore.submit(state.score, {
    evaded: state.guardsEvaded,
    heroismPeak: state.heroismPeak,
    disguise,
    success,
  });
}

function endRun(success, message) {
  state.runActive = false;
  setAreaStates();
  if (success) {
    setGuardStatus("Gate breach complete. Nobody believes the fake moustache, but you're gone.");
    simulatorHelp.textContent = "Replay the run or chase a higher Escape Prowess score.";
    particleField.emitBurst(1.2);
    particleField.emitSparkle(1.4);
  } else {
    simulatorHelp.textContent = "Heroism meter empty. Set a safer distraction before trying another haymaker.";
  }
  openWrapup(success, message);
}

function spendTime(amount, description) {
  state.timeBuffer = Math.max(0, state.timeBuffer - amount);
  updateTimeUI();
  if (description) {
    logEvent(`${description} (-${amount} beats)`);
  }
  if (state.timeBuffer === 0) {
    logEvent("Guard rotation snapped shut. No buffer left!", "warning");
    handleDetection("Guard rotation caught up to you.");
    return false;
  }
  return true;
}

function handleDetection(reason) {
  playSiren();
  playCrashImpact();
  particleField.emitBurst(0.6);
  document.body.classList.add("heroism-crash");
  window.setTimeout(() => {
    document.body.classList.remove("heroism-crash");
  }, 560);
  state.detectionCount += 1;
  const previousHeroism = state.heroism;
  state.heroism = 0;
  updateHeroismUI(true);
  logEvent(reason ?? "Alarm tripped! Heroism meter wiped.", "warning");
  setGuardStatus("Alarm flare! Heroism meter emptied. Build it back up before another stunt.");
  if (previousHeroism === 0) {
    endRun(false, reason ?? "Caught without any heroism buffer. Warden's moustache squad hauled you back.");
    return;
  }
  const activeArea = AREAS[state.currentArea];
  const ref = areaRefs.get(activeArea?.id ?? "");
  if (ref && ref.statusElement) {
    ref.statusElement.textContent = "Status: Alarm tripped — heroism drained.";
    ref.message = ref.statusElement.textContent;
  }
}

function handleAreaAction(areaId, action) {
  if (!state.runActive) {
    return;
  }
  const areaIndex = AREAS.findIndex((entry) => entry.id === areaId);
  if (areaIndex !== state.currentArea) {
    return;
  }
  const area = AREAS[areaIndex];
  if (!area) {
    return;
  }
  const isDistraction = action === "distraction";
  const timeCost = isDistraction ? DISTRACTION_TIME[areaIndex] : DIRECT_TIME[areaIndex];
  const timeLabel = isDistraction ? "Setting distraction" : "Direct Action prep";
  if (!spendTime(timeCost, timeLabel)) {
    return;
  }
  if (isDistraction) {
    openDistractionPuzzle(area, areaIndex);
  } else {
    openDirectAction(area, areaIndex);
  }
}

function closeModal() {
  if (state.modalCleanup) {
    state.modalCleanup();
    state.modalCleanup = null;
  }
  if (state.qteTimer) {
    window.cancelAnimationFrame(state.qteTimer);
    state.qteTimer = null;
  }
  if (state.qteHandler) {
    window.removeEventListener("keydown", state.qteHandler);
    state.qteHandler = null;
  }
  puzzleLayer.hidden = true;
  puzzleBody.innerHTML = "";
  puzzleActions.innerHTML = "";
  document.body.classList.remove("caught-flash");
}

function openModal(title, subtitle) {
  puzzleTitle.textContent = title;
  puzzleSubtitle.textContent = subtitle ?? "";
  puzzleBody.innerHTML = "";
  puzzleActions.innerHTML = "";
  puzzleLayer.hidden = false;
  window.setTimeout(() => {
    puzzleDialog.focus();
  }, 120);
}

function openDistractionPuzzle(area, index) {
  if (area.puzzle === "sequence") {
    openSequencePuzzle(area, index);
  } else if (area.puzzle === "toggles") {
    openTogglePuzzle(area, index);
  } else {
    openMazePuzzle(area, index);
  }
}

function resolveDistractionSuccess(area, index, highlight) {
  closeModal();
  playWhoosh();
  particleField.emitSparkle(1);
  state.score += DISTRACTION_SCORE[index];
  state.heroism = Math.min(HEROISM_MAX, state.heroism + DISTRACTION_HEROISM[index]);
  state.heroismPeak = Math.max(state.heroismPeak, state.heroism);
  state.guardsEvaded += 1;
  state.distractionWins += 1;
  updateHeroismUI();
  updateScoreUI();
  logEvent(area.distractionSuccess, "success");
  if (highlight) {
    logEvent(highlight, "success");
  }
  const ref = areaRefs.get(area.id);
  if (ref && ref.statusElement) {
    ref.statusElement.textContent = `Status: Cleared with distraction.`;
    ref.message = ref.statusElement.textContent;
    ref.card.classList.add("is-distracted");
    window.setTimeout(() => {
      ref.card.classList.remove("is-distracted");
    }, 1600);
  }
  advanceArea();
}

function resolveDirectSuccess(area, index) {
  closeModal();
  playHeroSting();
  document.body.classList.add("slowmo-hit");
  window.setTimeout(() => {
    document.body.classList.remove("slowmo-hit");
  }, 600);
  particleField.emitBurst(0.85);
  particleField.emitSparkle(1.25);
  state.score += DIRECT_SCORE[index];
  state.heroism = Math.min(HEROISM_MAX, state.heroism + DIRECT_HEROISM[index]);
  state.heroismPeak = Math.max(state.heroismPeak, state.heroism);
  state.guardsEvaded += 1;
  state.directWins += 1;
  updateHeroismUI();
  updateScoreUI();
  logEvent(area.directSuccess, "success");
  const ref = areaRefs.get(area.id);
  if (ref && ref.statusElement) {
    ref.statusElement.textContent = "Status: Cleared with direct action heroics.";
    ref.message = ref.statusElement.textContent;
    ref.card.classList.add("is-investigating");
    window.setTimeout(() => {
      ref.card.classList.remove("is-investigating");
    }, 900);
  }
  advanceArea();
}

function advanceArea() {
  state.currentArea += 1;
  if (state.currentArea >= AREAS.length) {
    const bonus = Math.round(state.heroism * 1.5);
    state.score += bonus;
    updateScoreUI();
    logEvent(`Final sprint bonus: +${bonus} Escape Prowess for glowing heroism.`, "success");
    endRun(true, "Slow-motion exit complete. Tango & Cash slid under the gate with sparks flying.");
    return;
  }
  const nextArea = AREAS[state.currentArea];
  setGuardStatus(`${nextArea.guard} is on deck. Decide between a distraction or Direct Action.`);
  simulatorHelp.textContent = "Use distractions to refill heroism before taking another risky direct strike.";
  setAreaStates();
}

function openSequencePuzzle(area, index) {
  const commands = [
    { id: "up", icon: "⬆️", label: "Up" },
    { id: "left", icon: "⬅️", label: "Left" },
    { id: "right", icon: "➡️", label: "Right" },
    { id: "zap", icon: "⚡", label: "Zap" },
  ];
  const length = 3 + index;
  const sequence = Array.from({ length }, () => commands[Math.floor(Math.random() * commands.length)]);
  openModal(`${area.label}: Bunk Collapse`, "Watch the fuse sequence, then repeat it to drop the bunk and distract the guard.");
  const instruction = document.createElement("p");
  instruction.textContent = "Memorize the glowing icons, then tap them back in order.";
  puzzleBody.append(instruction);
  const row = document.createElement("div");
  row.className = "sequence-row";
  const tokens = sequence.map((command) => {
    const span = document.createElement("span");
    span.className = "sequence-token";
    span.textContent = command.icon;
    row.append(span);
    return span;
  });
  puzzleBody.append(row);
  const controls = document.createElement("div");
  controls.className = "sequence-controls";
  commands.forEach((command) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = command.icon;
    button.setAttribute("aria-label", command.label);
    button.disabled = true;
    button.addEventListener("click", () => {
      if (!ready) {
        return;
      }
      input.push(command.id);
      if (command.id !== sequence[input.length - 1].id) {
        closeModal();
        handleDetection(area.distractionFail);
        return;
      }
      if (input.length === sequence.length) {
        resolveDistractionSuccess(area, index, "Bunk collapse executed without a peep.");
      }
    });
    controls.append(button);
  });
  puzzleBody.append(controls);
  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.className = "action-button";
  cancelButton.textContent = "Abort Attempt";
  cancelButton.addEventListener("click", () => {
    closeModal();
    handleDetection("Abort triggered mid-setup. Guards got suspicious.");
  });
  puzzleActions.append(cancelButton);

  const input = [];
  let ready = false;
  let indexPointer = 0;

  function playNext() {
    if (indexPointer >= tokens.length) {
      ready = true;
      controls.querySelectorAll("button").forEach((button) => {
        button.disabled = false;
      });
      return;
    }
    const token = tokens[indexPointer];
    token.classList.add("is-active");
    window.setTimeout(() => {
      token.classList.remove("is-active");
      indexPointer += 1;
      window.setTimeout(playNext, 160);
    }, 380);
  }

  playNext();

  state.modalCleanup = () => {
    controls.querySelectorAll("button").forEach((button) => {
      button.disabled = false;
    });
  };
}

function openTogglePuzzle(area, index) {
  openModal(`${area.label}: Pudding Valve Hack`, "Match the valve levels to flood the carts and distract the guard.");
  const target = Array.from({ length: 3 }, () => Math.floor(Math.random() * 3));
  const current = target.map((value) => (value + Math.floor(Math.random() * 2) + 1) % 3);
  const instructions = document.createElement("p");
  instructions.textContent = "Click each valve to cycle its pressure. Match the target readout to spill the pudding.";
  puzzleBody.append(instructions);
  const targetRow = document.createElement("p");
  targetRow.textContent = `Target pattern: ${target.map((value) => value + 1).join(" · ")}`;
  puzzleBody.append(targetRow);
  const grid = document.createElement("div");
  grid.className = "toggle-grid";
  const switches = current.map((value, switchIndex) => {
    const wrap = document.createElement("div");
    wrap.className = "toggle-switch";
    const label = document.createElement("span");
    label.textContent = `Valve ${switchIndex + 1}`;
    const stateLabel = document.createElement("span");
    stateLabel.className = "toggle-state";
    stateLabel.textContent = String(value + 1);
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Cycle";
    button.addEventListener("click", () => {
      current[switchIndex] = (current[switchIndex] + 1) % 3;
      stateLabel.textContent = String(current[switchIndex] + 1);
      if (current.every((val, idx) => val === target[idx])) {
        resolveDistractionSuccess(area, index, "Pudding valves synced. Cart stampede engaged.");
      }
    });
    wrap.append(label, stateLabel, button);
    grid.append(wrap);
    return wrap;
  });
  puzzleBody.append(grid);
  const abort = document.createElement("button");
  abort.type = "button";
  abort.className = "action-button";
  abort.textContent = "Abort Attempt";
  abort.addEventListener("click", () => {
    closeModal();
    handleDetection("Valve hack aborted. Drones tracked the hesitation.");
  });
  puzzleActions.append(abort);

  state.modalCleanup = () => {
    switches.forEach((wrap) => {
      wrap.querySelectorAll("button").forEach((button) => {
        button.disabled = true;
      });
    });
  };
}

function openMazePuzzle(area, index) {
  openModal(`${area.label}: Spotlight Maze`, "Trace the safe tiles in order after the preview. Miss one and the spotlight locks on.");
  const path = [0, 1, 4, 7, 8];
  const cells = [];
  const grid = document.createElement("div");
  grid.className = "maze-grid";
  for (let i = 0; i < 9; i += 1) {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "maze-cell";
    cell.textContent = i === 8 ? "🚪" : "";
    cell.disabled = true;
    grid.append(cell);
    cells.push(cell);
  }
  puzzleBody.append(grid);
  const abort = document.createElement("button");
  abort.type = "button";
  abort.className = "action-button";
  abort.textContent = "Abort Attempt";
  abort.addEventListener("click", () => {
    closeModal();
    handleDetection("Drone maze aborted. Floodlight spotted the glitch.");
  });
  puzzleActions.append(abort);

  let pointer = 0;
  let ready = false;

  function highlightPath() {
    path.forEach((indexValue, step) => {
      window.setTimeout(() => {
        cells[indexValue].classList.add("is-hint");
        window.setTimeout(() => {
          cells[indexValue].classList.remove("is-hint");
          if (step === path.length - 1) {
            enableInput();
          }
        }, 360);
      }, step * 420);
    });
  }

  function enableInput() {
    ready = true;
    cells.forEach((cell, cellIndex) => {
      cell.disabled = false;
      cell.addEventListener("click", () => {
        if (!ready) {
          return;
        }
        if (cellIndex !== path[pointer]) {
          closeModal();
          handleDetection(area.distractionFail);
          return;
        }
        cell.classList.add("is-active");
        pointer += 1;
        if (pointer === path.length) {
          resolveDistractionSuccess(area, index, "Drone loop spoofed. Spotlight chased a phantom.");
        }
      });
    });
  }

  highlightPath();

  state.modalCleanup = () => {
    ready = false;
    cells.forEach((cell) => {
      cell.disabled = true;
    });
  };
}

function openDirectAction(area, index) {
  const keys = ["Q", "W", "E", "A", "S", "D", "J", "K"];
  const targetKey = keys[Math.floor(Math.random() * keys.length)];
  openModal(`${area.label}: Direct Action`, "Hit the highlighted key before the timer expires to deliver the knockout." );
  const prompt = document.createElement("p");
  prompt.textContent = "Press the glowing key (or tap the button) in time.";
  const glyph = document.createElement("div");
  glyph.className = "sequence-row";
  const token = document.createElement("span");
  token.className = "sequence-token";
  token.textContent = targetKey;
  token.style.fontSize = "2rem";
  glyph.append(token);
  const timerBar = document.createElement("div");
  timerBar.className = "heroism-meter";
  const timerFill = document.createElement("div");
  timerFill.className = "heroism-fill";
  timerFill.style.width = "100%";
  timerBar.append(timerFill);
  const buttonRow = document.createElement("div");
  buttonRow.className = "sequence-controls";
  const triggerButton = document.createElement("button");
  triggerButton.type = "button";
  triggerButton.textContent = targetKey;
  triggerButton.addEventListener("click", () => {
    resolveDirectSuccess(area, index);
  });
  buttonRow.append(triggerButton);
  puzzleBody.append(prompt, glyph, timerBar, buttonRow);
  const abort = document.createElement("button");
  abort.type = "button";
  abort.className = "action-button";
  abort.textContent = "Abort Attempt";
  abort.addEventListener("click", () => {
    closeModal();
    handleDetection("Direct Action aborted. Guard raised an eyebrow." );
  });
  puzzleActions.append(abort);

  const deadline = DIRECT_WINDOWS[index];
  const start = performance.now();

  function tick(now) {
    const elapsed = now - start;
    const remaining = Math.max(0, deadline - elapsed);
    timerFill.style.width = `${(remaining / deadline) * 100}%`;
    if (remaining <= 0) {
      closeModal();
      handleDetection(area.directFail);
      return;
    }
    state.qteTimer = window.requestAnimationFrame(tick);
  }
  state.qteTimer = window.requestAnimationFrame(tick);

  state.qteHandler = (event) => {
    if (event.key.toUpperCase() === targetKey) {
      resolveDirectSuccess(area, index);
    } else {
      closeModal();
      handleDetection(area.directFail);
    }
  };
  window.addEventListener("keydown", state.qteHandler, { once: true });

  state.modalCleanup = () => {
    if (state.qteTimer) {
      window.cancelAnimationFrame(state.qteTimer);
      state.qteTimer = null;
    }
  };
}

startRunButton.addEventListener("click", () => {
  ensureAudio();
  startRun();
});

resetRunButton.addEventListener("click", () => {
  ensureAudio();
  resetBoard();
});

wrapupRestart.addEventListener("click", () => {
  startRun();
});

wrapupClose.addEventListener("click", () => {
  closeWrapup();
});

wrapupDialog.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeWrapup();
  }
});

puzzleDialog.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModal();
    handleDetection("You bailed mid-plan and a guard peered in.");
  }
});

window.addEventListener("beforeunload", () => {
  if (state.qteTimer) {
    window.cancelAnimationFrame(state.qteTimer);
  }
});

resetBoard();
