import { mountParticleField } from "../particles.js";
import { initHighScoreBanner, getHighScore } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { autoEnhanceFeedback, createLogChannel, createStatusChannel } from "../feedback.js";

const particleField = mountParticleField({
  density: 0.0002,
  effects: {
    palette: ["#4c84ff", "#6c4cff", "#f0b73f", "#1e293b"],
    ambientDensity: 0.58,
  },
});

const scoreConfig = getScoreConfig("bat-signal-scramble");
const highScore = initHighScoreBanner({
  gameId: "bat-signal-scramble",
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

const responseTimerEl = document.getElementById("response-timer");
const momentumFill = document.getElementById("momentum-fill");
const momentumValue = document.getElementById("momentum-value");
const momentumMeter = document.getElementById("momentum-meter");
const momentumButton = document.getElementById("momentum-button");
const gameStage = document.getElementById("game-stage");
const batmobile = document.getElementById("batmobile");
const batman = document.getElementById("batman");
const statusBar = document.getElementById("status-bar");
const eventLogList = document.getElementById("event-log");
const startButton = document.getElementById("start-button");
const resetButton = document.getElementById("reset-button");
const shortcutButton = document.getElementById("shortcut-button");
const gadgetButton = document.getElementById("gadget-button");
const jumpButton = document.getElementById("jump-button");
const laneButtons = Array.from(document.querySelectorAll("[data-direction]"));
const phaseTimeEls = {
  streets: document.querySelector('[data-phase-time="streets"]'),
  rooftops: document.querySelector('[data-phase-time="rooftops"]'),
};
const phaseChips = {
  streets: document.querySelector('.phase-chip[data-phase="streets"]'),
  rooftops: document.querySelector('.phase-chip[data-phase="rooftops"]'),
};

const wrapUp = document.getElementById("wrap-up");
const finalTimeEl = document.getElementById("final-time");
const finalDeltaEl = document.getElementById("final-delta");
const splitStreetsEl = document.getElementById("split-streets");
const splitRooftopsEl = document.getElementById("split-rooftops");
const routeSummaryEl = document.getElementById("route-summary");
const routeMapList = document.getElementById("route-map");
const replayButton = document.getElementById("replay-button");
const closeWrapUpButton = document.getElementById("close-wrap-up");

autoEnhanceFeedback();

const log = createLogChannel(eventLogList, { limit: 20 });
const setStatus = createStatusChannel(statusBar);

const BOOST_MULTIPLIER = 1.65;
const RECOVERY_DURATION = 1400;
const IMPACT_CLASS_TIMEOUT = 320;

const PHASES = [
  {
    id: "streets",
    name: "Narrows Pursuit",
    intro: "Turbines hot. The Narrows gridlock is already folding toward you.",
    outro: "Cathedral ramp ahead. Brace for rooftop deployment.",
    baseSpeed: 0.27,
    length: 780,
    laneOffsets: [-140, 0, 140],
    events: [
      {
        id: "streets-convoy",
        type: "traffic",
        label: "Armored Convoy",
        offset: 70,
        lane: 1,
        penalty: 2400,
        perfectWindow: 420,
        momentum: 16,
      },
      {
        id: "streets-barricade",
        type: "traffic",
        label: "Police Barricade",
        offset: 150,
        lane: 2,
        penalty: 2600,
        perfectWindow: 420,
        momentum: 18,
      },
      {
        id: "streets-grapple-turn",
        type: "gadget",
        label: "Side Grapple Hairpin",
        offset: 210,
        window: 1400,
        skip: 60,
        momentum: 22,
      },
      {
        id: "streets-shortcut-axis",
        type: "shortcut",
        label: "Axis Alley Shortcut",
        offset: 300,
        window: 1300,
        skip: 110,
        penalty: 3200,
        risk: "Debris-strewn service lane",
        momentum: 24,
      },
      {
        id: "streets-tanker",
        type: "traffic",
        label: "Chemical Tanker",
        offset: 410,
        lane: 0,
        penalty: 2800,
        perfectWindow: 360,
        momentum: 18,
      },
      {
        id: "streets-grapple-snap",
        type: "gadget",
        label: "Grapple Turnabout",
        offset: 520,
        window: 1300,
        skip: 70,
        momentum: 24,
      },
      {
        id: "streets-shortcut-theater",
        type: "shortcut",
        label: "Monarch Theater Cut",
        offset: 600,
        window: 1200,
        skip: 140,
        penalty: 3400,
        risk: "Collapsed marquee",
        momentum: 28,
      },
      {
        id: "streets-final-squeeze",
        type: "traffic",
        label: "Narrows Squeeze",
        offset: 710,
        lane: 1,
        penalty: 2600,
        perfectWindow: 380,
        momentum: 20,
      },
    ],
  },
  {
    id: "rooftops",
    name: "Rooftop Gauntlet",
    intro: "Grapnel ready. Cathedral spires ahead—mind the searchlights.",
    outro: "Signal tower in sight. Hit the beam.",
    baseSpeed: 0.25,
    length: 660,
    laneOffsets: [-120, 0, 120],
    events: [
      {
        id: "roof-first-gap",
        type: "jump",
        label: "Cathedral Gap",
        offset: 80,
        window: 1300,
        penalty: 3200,
        momentum: 22,
      },
      {
        id: "roof-spotlight",
        type: "traffic",
        label: "Spotlight Sweep",
        offset: 140,
        lane: 0,
        penalty: 2400,
        perfectWindow: 420,
        momentum: 16,
      },
      {
        id: "roof-grapple",
        type: "grapple",
        label: "Clocktower Grapple",
        offset: 220,
        window: 1400,
        skip: 90,
        penalty: 3600,
        momentum: 26,
      },
      {
        id: "roof-shortcut",
        type: "shortcut",
        label: "Glass Atrium Drop",
        offset: 310,
        window: 1100,
        skip: 150,
        penalty: 4200,
        risk: "Shattering skylight",
        momentum: 30,
      },
      {
        id: "roof-gargoyle",
        type: "jump",
        label: "Gargoyle Leap",
        offset: 420,
        window: 1200,
        penalty: 3000,
        momentum: 20,
      },
      {
        id: "roof-grapple-final",
        type: "grapple",
        label: "Billboard Swing",
        offset: 520,
        window: 1200,
        skip: 110,
        penalty: 3800,
        momentum: 28,
      },
      {
        id: "roof-final-gap",
        type: "jump",
        label: "Tower Vault",
        offset: 620,
        window: 1300,
        penalty: 3400,
        momentum: 22,
      },
    ],
  },
];

const state = {
  running: false,
  phaseIndex: 0,
  phaseProgress: 0,
  phaseEventIndex: 0,
  totalTime: 0,
  lastFrame: 0,
  lane: 1,
  momentum: 0,
  boostTimer: 0,
  recoveryTimer: 0,
  pendingPrompt: null,
  eventLog: [],
  shortcutsTaken: 0,
  totalShortcuts: PHASES.reduce((sum, phase) => sum + phase.events.filter((event) => event.type === "shortcut").length, 0),
  momentumBursts: 0,
  phaseTimes: {
    streets: 0,
    rooftops: 0,
  },
};

let animationFrame = null;
let previousBestSnapshot = getHighScore("bat-signal-scramble");

function formatTime(ms) {
  const safe = Math.max(0, Math.round(ms));
  const minutes = Math.floor(safe / 60000);
  const seconds = Math.floor((safe % 60000) / 1000);
  const millis = safe % 1000;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

function setPhaseState(phaseId, stateValue) {
  const chip = phaseChips[phaseId];
  if (!chip) {
    return;
  }
  if (stateValue === "active") {
    chip.dataset.active = "true";
    chip.dataset.complete = "false";
  } else if (stateValue === "complete") {
    chip.dataset.active = "false";
    chip.dataset.complete = "true";
  } else {
    chip.dataset.active = "false";
    chip.dataset.complete = "false";
  }
}

function updatePhaseTimerDisplay(phaseId, time) {
  const el = phaseTimeEls[phaseId];
  if (!el) {
    return;
  }
  el.textContent = formatTime(time);
}

function clearPhaseTimers() {
  Object.keys(phaseTimeEls).forEach((key) => {
    if (phaseTimeEls[key]) {
      phaseTimeEls[key].textContent = "--:--.---";
    }
  });
}

function clampLane(lane, phase) {
  const max = phase.laneOffsets.length - 1;
  return Math.max(0, Math.min(max, lane));
}

function applyLaneVisual() {
  const phase = PHASES[state.phaseIndex];
  const offsets = phase.laneOffsets;
  const offset = offsets[state.lane] ?? 0;
  if (phase.id === "streets") {
    batmobile.style.setProperty("--lane-offset", String(offset));
  } else {
    batman.style.setProperty("--lane-offset", String(offset));
  }
}

function setLane(nextLane) {
  const phase = PHASES[state.phaseIndex];
  const safeLane = clampLane(nextLane, phase);
  if (safeLane === state.lane) {
    return;
  }
  state.lane = safeLane;
  state.lastLaneShift = performance.now();
  applyLaneVisual();
  log.push(`Lane shift ➜ ${["Left", "Center", "Right"][state.lane] ?? "Path"}`);
}

function adjustMomentum(amount, reason) {
  const next = Math.max(0, Math.min(100, state.momentum + amount));
  state.momentum = next;
  momentumFill.style.width = `${next}%`;
  momentumMeter.setAttribute("aria-valuenow", String(Math.round(next)));
  momentumValue.textContent = `${Math.round(next)}%`;
  if (amount > 0) {
    log.push(`${reason} (+${Math.round(amount)} Momentum)`, "success");
  }
  if (state.momentum >= 100) {
    momentumButton.disabled = false;
    momentumButton.setAttribute("aria-pressed", "true");
    momentumButton.classList.add("is-ready");
    setStatus("Momentum charged. Deploy Turbine Dash or Grapnel Launch.", "success");
  } else {
    momentumButton.disabled = true;
    momentumButton.setAttribute("aria-pressed", "false");
    momentumButton.classList.remove("is-ready");
  }
}

function resetMomentum() {
  state.momentum = 0;
  momentumFill.style.width = "0%";
  momentumMeter.setAttribute("aria-valuenow", "0");
  momentumValue.textContent = "0%";
  momentumButton.disabled = true;
  momentumButton.setAttribute("aria-pressed", "false");
  momentumButton.classList.remove("is-ready");
}

function queuePrompt(type, event, { window = 1200, onSuccess, onFail, message, intent = "warning" } = {}) {
  const expiresAt = performance.now() + window;
  state.pendingPrompt = {
    type,
    event,
    expiresAt,
    onSuccess,
    onFail,
  };
  const intentTone = intent === "danger" ? "danger" : intent === "success" ? "success" : "warning";
  setStatus(message ?? "Action required", intentTone);
  if (type === "shortcut") {
    shortcutButton.classList.add("is-armed");
  } else if (type === "gadget" || type === "grapple") {
    gadgetButton.classList.add("is-armed");
  } else if (type === "jump") {
    jumpButton.classList.add("is-armed");
  }
}

function clearPrompt() {
  state.pendingPrompt = null;
  shortcutButton.classList.remove("is-armed");
  gadgetButton.classList.remove("is-armed");
  jumpButton.classList.remove("is-armed");
}

function registerEventResult(event, outcome, detail) {
  state.eventLog.push({
    phaseId: PHASES[state.phaseIndex].id,
    phaseName: PHASES[state.phaseIndex].name,
    label: event?.label ?? "", 
    outcome,
    detail,
  });
}

function triggerImpact(penalty, message) {
  state.totalTime += penalty;
  state.recoveryTimer = RECOVERY_DURATION;
  gameStage.classList.add("is-impact");
  window.setTimeout(() => {
    gameStage.classList.remove("is-impact");
  }, IMPACT_CLASS_TIMEOUT);
  resetMomentum();
  setStatus(message, "danger");
  log.push(`${message} (+${formatTime(penalty)} penalty)`, "danger");
}

function resolvePrompt(type) {
  if (!state.pendingPrompt || state.pendingPrompt.type !== type) {
    return false;
  }
  const prompt = state.pendingPrompt;
  clearPrompt();
  if (typeof prompt.onSuccess === "function") {
    prompt.onSuccess();
  }
  return true;
}

function failPrompt(prompt) {
  clearPrompt();
  if (typeof prompt?.onFail === "function") {
    prompt.onFail();
  }
}

function handleTraffic(event) {
  const phase = PHASES[state.phaseIndex];
  if (state.lane === event.lane) {
    triggerImpact(event.penalty ?? 2600, `${event.label} collision!`);
    registerEventResult(event, "impact", "Collision");
    return;
  }
  const lastShiftAgo = performance.now() - (state.lastLaneShift ?? 0);
  const perfect = Number.isFinite(event.perfectWindow) && lastShiftAgo <= event.perfectWindow;
  const momentumGain = perfect ? (event.momentum ?? 18) : Math.max(6, (event.momentum ?? 18) * 0.5);
  adjustMomentum(momentumGain, `${perfect ? "Perfect" : "Clean"} dodge: ${event.label}`);
  registerEventResult(event, perfect ? "momentum" : "success", perfect ? "Perfect dodge" : "Avoided");
}

function handleShortcut(event) {
  queuePrompt("shortcut", event, {
    window: event.window ?? 1200,
    message: `${event.label} ready. Hit shortcut to engage (${event.risk ?? "High risk"}).`,
    onSuccess: () => {
      state.shortcutsTaken += 1;
      state.phaseProgress += event.skip ?? 100;
      adjustMomentum(event.momentum ?? 22, `${event.label} cleared`);
      registerEventResult(event, "shortcut-success", "Saved route time");
      log.push(`${event.label} threaded. Route compressed.`, "success");
      setStatus(`${event.label} secured. Momentum surging.`, "success");
    },
    onFail: () => {
      triggerImpact(event.penalty ?? 3200, `${event.label} collapse!`);
      registerEventResult(event, "shortcut-fail", "Missed shortcut");
    },
  });
}

function handleGadget(event) {
  queuePrompt("gadget", event, {
    window: event.window ?? 1200,
    message: `${event.label}! Fire grapples now.`,
    onSuccess: () => {
      state.phaseProgress += event.skip ?? 60;
      adjustMomentum(event.momentum ?? 20, `${event.label} executed`);
      registerEventResult(event, "momentum", "Gadget combo");
      log.push(`${event.label} executed flawlessly.`, "success");
      setStatus(`${event.label} locked. Keep the dash alive.`, "success");
    },
    onFail: () => {
      triggerImpact(event.penalty ?? 2800, `${event.label} missed!`);
      registerEventResult(event, "impact", "Gadget miss");
    },
  });
}

function handleJump(event) {
  queuePrompt("jump", event, {
    window: event.window ?? 1100,
    message: `${event.label}! Vault now.`,
    onSuccess: () => {
      adjustMomentum(event.momentum ?? 18, `${event.label} cleared`);
      registerEventResult(event, "momentum", "Perfect vault");
      log.push(`${event.label} lands clean.`, "success");
      gameStage.classList.add("is-swing");
      window.setTimeout(() => gameStage.classList.remove("is-swing"), 320);
    },
    onFail: () => {
      triggerImpact(event.penalty ?? 3200, `${event.label} fail!`);
      registerEventResult(event, "impact", "Missed jump");
    },
  });
}

function handleGrapple(event) {
  queuePrompt("grapple", event, {
    window: event.window ?? 1200,
    message: `${event.label}! Grapnel ready.`,
    onSuccess: () => {
      state.phaseProgress += event.skip ?? 80;
      adjustMomentum(event.momentum ?? 24, `${event.label} swing`);
      registerEventResult(event, "momentum", "Grapnel surge");
      log.push(`${event.label} sling complete.`, "success");
      gameStage.classList.add("is-swing");
      window.setTimeout(() => gameStage.classList.remove("is-swing"), 360);
    },
    onFail: () => {
      triggerImpact(event.penalty ?? 3600, `${event.label} miss!`);
      registerEventResult(event, "impact", "Missed grapnel");
    },
  });
}

function processPhaseEvents() {
  const phase = PHASES[state.phaseIndex];
  while (state.phaseEventIndex < phase.events.length && state.phaseProgress >= phase.events[state.phaseEventIndex].offset) {
    const event = phase.events[state.phaseEventIndex];
    state.phaseEventIndex += 1;
    switch (event.type) {
      case "traffic":
        handleTraffic(event);
        break;
      case "shortcut":
        handleShortcut(event);
        break;
      case "gadget":
        handleGadget(event);
        break;
      case "jump":
        handleJump(event);
        break;
      case "grapple":
        handleGrapple(event);
        break;
      default:
        break;
    }
  }
}

function activateMomentumSurge() {
  if (state.momentum < 100) {
    return;
  }
  const phase = PHASES[state.phaseIndex];
  state.momentumBursts += 1;
  state.boostTimer = 2400;
  adjustMomentum(-100, "Momentum spent");
  momentumButton.disabled = true;
  momentumButton.setAttribute("aria-pressed", "false");
  momentumButton.classList.remove("is-ready");
  if (phase.id === "streets") {
    log.push("Turbine Dash unleashed!", "success");
    setStatus("Turbine Dash active—hold the line!", "success");
    registerEventResult({ label: "Turbine Dash" }, "momentum", "Phase I boost");
  } else {
    log.push("Grapnel Launch engaged—slinging forward!", "success");
    setStatus("Grapnel Launch arcs across the skyline!", "success");
    registerEventResult({ label: "Grapnel Launch" }, "momentum", "Phase II boost");
    state.phaseProgress += 110;
  }
}

function step(timestamp) {
  if (!state.running) {
    return;
  }
  if (!state.lastFrame) {
    state.lastFrame = timestamp;
  }
  const delta = Math.min(80, timestamp - state.lastFrame);
  state.lastFrame = timestamp;
  state.totalTime += delta;
  responseTimerEl.textContent = formatTime(state.totalTime);

  if (state.recoveryTimer > 0) {
    state.recoveryTimer = Math.max(0, state.recoveryTimer - delta);
  }
  if (state.boostTimer > 0) {
    state.boostTimer = Math.max(0, state.boostTimer - delta);
  }

  const phase = PHASES[state.phaseIndex];
  const speedMultiplier = (state.recoveryTimer > 0 ? 0.55 : 1) * (state.boostTimer > 0 ? BOOST_MULTIPLIER : 1);
  state.phaseProgress += delta * phase.baseSpeed * speedMultiplier;

  if (state.pendingPrompt && performance.now() >= state.pendingPrompt.expiresAt) {
    const expiredPrompt = state.pendingPrompt;
    clearPrompt();
    failPrompt(expiredPrompt);
  }

  processPhaseEvents();

  if (state.phaseProgress >= phase.length) {
    advancePhase();
  }

  animationFrame = window.requestAnimationFrame(step);
}

function advancePhase() {
  const phase = PHASES[state.phaseIndex];
  const phaseTime = state.totalTime - (state.phaseIndex === 0 ? 0 : state.phaseTimes.streets);
  if (phase.id === "streets") {
    state.phaseTimes.streets = state.totalTime;
  } else {
    state.phaseTimes.rooftops = state.totalTime;
  }
  updatePhaseTimerDisplay(phase.id, phase.id === "streets" ? state.phaseTimes.streets : state.totalTime - state.phaseTimes.streets);
  setPhaseState(phase.id, "complete");
  log.push(`${phase.name} cleared in ${phase.id === "streets" ? formatTime(state.phaseTimes.streets) : formatTime(state.totalTime - state.phaseTimes.streets)}.`, "info");

  if (state.phaseIndex >= PHASES.length - 1) {
    finishRun();
    return;
  }
  state.phaseIndex += 1;
  state.phaseProgress = 0;
  state.phaseEventIndex = 0;
  clearPrompt();
  const nextPhase = PHASES[state.phaseIndex];
  setPhaseState(nextPhase.id, "active");
  gameStage.dataset.phase = nextPhase.id;
  setStatus(nextPhase.intro, "info");
  applyLaneVisual();
}

function finishRun() {
  state.running = false;
  if (animationFrame) {
    window.cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
  clearPrompt();
  const finalTime = state.totalTime;
  const streetsSplit = state.phaseTimes.streets;
  const rooftopSplit = finalTime - state.phaseTimes.streets;
  updatePhaseTimerDisplay("rooftops", rooftopSplit);
  finalTimeEl.textContent = formatTime(finalTime);
  splitStreetsEl.textContent = formatTime(streetsSplit);
  splitRooftopsEl.textContent = formatTime(rooftopSplit);

  const scoreValue = Math.max(0, 1000000 - Math.round(finalTime));
  const meta = {
    finalTimeMs: Math.round(finalTime),
    display: formatTime(finalTime),
    splits: {
      streets: formatTime(streetsSplit),
      rooftops: formatTime(rooftopSplit),
    },
    shortcuts: {
      cleared: state.shortcutsTaken,
      total: state.totalShortcuts,
    },
    momentumBursts: state.momentumBursts,
    route: state.eventLog,
  };
  const result = highScore.submit(scoreValue, meta);

  const bestBefore = previousBestSnapshot?.meta?.finalTimeMs;
  if (result.updated) {
    finalDeltaEl.textContent = bestBefore
      ? `New personal best! −${formatTime(Math.abs(finalTime - bestBefore))}`
      : "New personal best registered.";
    previousBestSnapshot = result.entry;
  } else if (bestBefore) {
    const diff = finalTime - bestBefore;
    finalDeltaEl.textContent = `${diff >= 0 ? "+" : "−"}${formatTime(Math.abs(diff))} vs personal best.`;
  } else {
    finalDeltaEl.textContent = "Run logged. Beat it to claim the cabinet.";
  }

  routeSummaryEl.textContent = `Shortcuts: ${state.shortcutsTaken}/${state.totalShortcuts} · Momentum Bursts: ${state.momentumBursts}`;
  routeMapList.innerHTML = "";
  state.eventLog.forEach((entry) => {
    const item = document.createElement("li");
    item.dataset.outcome = entry.outcome;
    item.textContent = `[${entry.phaseName}] ${entry.label} — ${entry.detail ?? entry.outcome}`;
    routeMapList.appendChild(item);
  });

  wrapUp.hidden = false;
  setStatus("Scramble complete. Review the route and reset when ready.", "success");
}

function resetRun({ soft = false } = {}) {
  state.running = false;
  if (animationFrame) {
    window.cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
  state.phaseIndex = 0;
  state.phaseProgress = 0;
  state.phaseEventIndex = 0;
  state.totalTime = 0;
  state.lastFrame = 0;
  state.lane = 1;
  state.momentum = 0;
  state.boostTimer = 0;
  state.recoveryTimer = 0;
  state.pendingPrompt = null;
  state.eventLog = [];
  state.shortcutsTaken = 0;
  state.momentumBursts = 0;
  state.phaseTimes = { streets: 0, rooftops: 0 };
  responseTimerEl.textContent = "00:00.000";
  clearPhaseTimers();
  resetMomentum();
  gameStage.dataset.phase = "streets";
  applyLaneVisual();
  setPhaseState("streets", "inactive");
  setPhaseState("rooftops", "inactive");
  clearPrompt();
  log.push("Run reset. Gotham awaits.", "info");
  if (!soft) {
    setStatus("Awaiting ignition.", "info");
  }
}

function startRun() {
  if (state.running) {
    return;
  }
  resetRun({ soft: true });
  state.running = true;
  previousBestSnapshot = getHighScore("bat-signal-scramble");
  setPhaseState("streets", "active");
  setStatus(PHASES[0].intro, "info");
  log.push("Scramble initiated. Keep it clean.", "info");
  state.lastFrame = performance.now();
  animationFrame = window.requestAnimationFrame(step);
}

function closeWrapUp() {
  wrapUp.hidden = true;
}

startButton.addEventListener("click", () => {
  closeWrapUp();
  startRun();
});

resetButton.addEventListener("click", () => {
  closeWrapUp();
  resetRun();
});

replayButton.addEventListener("click", () => {
  closeWrapUp();
  startRun();
});

closeWrapUpButton.addEventListener("click", () => {
  closeWrapUp();
});

laneButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const direction = button.dataset.direction === "left" ? -1 : 1;
    setLane(state.lane + direction);
  });
});

shortcutButton.addEventListener("click", () => {
  if (!resolvePrompt("shortcut")) {
    log.push("Shortcut unavailable.", "warning");
  }
});

gadgetButton.addEventListener("click", () => {
  if (!resolvePrompt("gadget") && !resolvePrompt("grapple")) {
    log.push("No gadget cue active.", "warning");
  }
});

jumpButton.addEventListener("click", () => {
  if (!resolvePrompt("jump")) {
    log.push("No jump queued.", "warning");
  }
});

momentumButton.addEventListener("click", () => {
  activateMomentumSurge();
});

document.addEventListener("keydown", (event) => {
  if (event.target && event.target.tagName === "INPUT") {
    return;
  }
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    setLane(state.lane - 1);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    setLane(state.lane + 1);
  } else if (event.key === "s" || event.key === "S") {
    event.preventDefault();
    resolvePrompt("shortcut");
  } else if (event.key === "g" || event.key === "G") {
    event.preventDefault();
    if (!resolvePrompt("gadget")) {
      resolvePrompt("grapple");
    }
  } else if (event.key === "j" || event.key === "J") {
    event.preventDefault();
    resolvePrompt("jump");
  } else if (event.key === "b" || event.key === "B") {
    event.preventDefault();
    activateMomentumSurge();
  } else if (event.key === "r" || event.key === "R") {
    event.preventDefault();
    resetRun();
  }
});

resetRun();

window.addEventListener("beforeunload", () => {
  particleField?.destroy?.();
});
