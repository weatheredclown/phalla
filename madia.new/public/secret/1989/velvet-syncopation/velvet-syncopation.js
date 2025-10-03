import { mountParticleField } from "../particles.js";
import { initParticleSystem } from "../particle-effects.js";

mountParticleField();

const particleSystem = initParticleSystem({
  palette: ["#38bdf8", "#f472b6", "#facc15", "#a855f7"],
  ambientDensity: 0.6,
});

const chart = [
  { left: "KeyA", right: "KeyL" },
  { left: "KeyS", right: "KeyK" },
  { left: "KeyA", right: "KeyK" },
  { left: "KeyS", right: "KeyL" },
  { left: "KeyA", right: "KeyL" },
  { left: "KeyS", right: "KeyK" },
  { left: "KeyA", right: "KeyK" },
  { left: "KeyS", right: "KeyL" },
];

const syncEvents = new Map([
  [0, { title: "Velvet Dip", sequence: ["Space", "KeyJ"] }],
  [2, { title: "Cross-Hand Glide", sequence: ["KeyF", "KeyJ"] }],
  [4, { title: "Breath Hold", sequence: ["Space", "KeyJ"] }],
  [6, { title: "Chromatic Sweep", sequence: ["KeyF", "KeyJ"] }],
]);

const noteStyles = {
  KeyA: { className: "note-cobalt", label: "A" },
  KeyS: { className: "note-amber", label: "S" },
  KeyK: { className: "note-teal", label: "K" },
  KeyL: { className: "note-crimson", label: "L" },
  KeyF: { className: "note-ivory", label: "F" },
  KeyJ: { className: "note-ruby", label: "J" },
  Space: { className: "note-space", label: "Space" },
};

const timeline = document.getElementById("timeline");
const startButton = document.getElementById("start-sequence");
const stopButton = document.getElementById("stop-sequence");
const statusReadout = document.getElementById("status-readout");
const harmonyFill = document.getElementById("harmony-fill");
const harmonyValue = document.getElementById("harmony-value");
const harmonyMeter = document.getElementById("harmony-meter");
const eventList = document.getElementById("event-list");
const virtualKeyButtons = Array.from(document.querySelectorAll(".virtual-key"));

const HARMONY_MAX = 100;
const STARTING_HARMONY = 80;
const totalTicks = chart.length * 2 + 1;
const showstopperSkips = new Set();
const syncSkips = new Set();
const leftCells = [];
const rightCells = [];
const syncCells = [];
const syncStepBadges = new Map();

let harmony = STARTING_HARMONY;
let playing = false;
let currentTick = 0;
let intervalId = null;
let beatWindow = null;
let syncWindow = null;
let lastBeatPerfect = false;

buildTimeline();
setHarmony(STARTING_HARMONY);
updateStatus("Waiting to start.");

startButton.addEventListener("click", () => {
  if (playing) {
    return;
  }
  beginSequence();
});

stopButton.addEventListener("click", () => {
  if (!playing) {
    return;
  }
  endSequence("Rehearsal stopped.", "warning", true);
});

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
  }
  handleInput(event.code);
});

virtualKeyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    handleInput(button.dataset.code);
  });
});

function buildTimeline() {
  const grid = document.createElement("div");
  grid.className = "timeline-grid";
  timeline.append(grid);

  createLane(grid, "Left Brother", (cell, beatIndex) => {
    const info = noteStyles[chart[beatIndex].left];
    const badge = document.createElement("span");
    badge.className = `note-badge ${info.className}`;
    badge.textContent = info.label;
    cell.append(badge);
    cell.setAttribute("aria-label", `Beat ${beatIndex + 1} left key ${info.label}`);
    leftCells.push(cell);
  });

  createLane(grid, "Right Brother", (cell, beatIndex) => {
    const info = noteStyles[chart[beatIndex].right];
    const badge = document.createElement("span");
    badge.className = `note-badge ${info.className}`;
    badge.textContent = info.label;
    cell.append(badge);
    cell.setAttribute("aria-label", `Beat ${beatIndex + 1} right key ${info.label}`);
    rightCells.push(cell);
  });

  createLane(grid, "Sync Rail", (cell, beatIndex) => {
    const event = syncEvents.get(beatIndex);
    if (!event) {
      cell.classList.add("is-rest");
      cell.textContent = "Rest";
    } else {
      const wrapper = document.createElement("div");
      wrapper.className = "sync-sequence";
      const title = document.createElement("strong");
      title.textContent = event.title;
      const steps = document.createElement("div");
      steps.className = "sequence-steps";
      const stepBadges = [];
      event.sequence.forEach((code) => {
        const step = document.createElement("span");
        step.className = "sequence-step";
        step.textContent = noteStyles[code]?.label ?? code;
        steps.append(step);
        stepBadges.push(step);
      });
      wrapper.append(title, steps);
      cell.append(wrapper);
      cell.setAttribute("aria-label", `Sync cue after beat ${beatIndex + 1}: ${event.title}`);
      syncStepBadges.set(beatIndex, stepBadges);
    }
    syncCells.push(cell);
  });
}

function createLane(grid, label, builder) {
  const labelCell = document.createElement("div");
  labelCell.className = "lane-label";
  labelCell.textContent = label;
  grid.append(labelCell);

  for (let beatIndex = 0; beatIndex < chart.length; beatIndex += 1) {
    const cell = document.createElement("div");
    cell.className = "lane-cell";
    cell.dataset.beat = String(beatIndex);
    builder(cell, beatIndex);
    grid.append(cell);
  }
}

function beginSequence() {
  playing = true;
  currentTick = 0;
  beatWindow = null;
  syncWindow = null;
  lastBeatPerfect = false;
  showstopperSkips.clear();
  syncSkips.clear();
  clearHighlights();
  eventList.innerHTML = "";
  setHarmony(STARTING_HARMONY);
  updateStatus("Rehearsal in motion.");
  logEvent("Rehearsal started. Keep the brothers in phase.");
  startButton.disabled = true;
  stopButton.disabled = false;
  intervalId = window.setInterval(advanceTick, 600);
  advanceTick();
}

function advanceTick() {
  if (!playing) {
    return;
  }

  if (currentTick % 2 === 0) {
    resolveSyncWindow();
    startBeatWindow(currentTick / 2);
  } else {
    resolveBeatWindow();
    startSyncWindow((currentTick - 1) / 2);
  }

  currentTick += 1;

  if (currentTick >= totalTicks && playing) {
    finishSequence();
  }
}

function startBeatWindow(beatIndex) {
  if (beatIndex >= chart.length) {
    return;
  }

  if (showstopperSkips.has(beatIndex)) {
    showstopperSkips.delete(beatIndex);
    beatWindow = { beatIndex, autoCleared: true };
    leftCells[beatIndex].classList.add("is-cleared");
    rightCells[beatIndex].classList.add("is-cleared");
    if (syncCells[beatIndex]) {
      syncCells[beatIndex].classList.remove("is-miss");
      syncCells[beatIndex].classList.add("is-cleared");
    }
    syncSkips.add(beatIndex);
    updateStatus(`Beat ${beatIndex + 1}: Showstopper keeps the room buzzing.`);
    return;
  }

  beatWindow = {
    beatIndex,
    leftCode: chart[beatIndex].left,
    rightCode: chart[beatIndex].right,
    leftHit: false,
    rightHit: false,
  };

  leftCells[beatIndex].classList.remove("is-cleared", "is-miss", "is-hit");
  rightCells[beatIndex].classList.remove("is-cleared", "is-miss", "is-hit");
  leftCells[beatIndex].classList.add("is-active");
  rightCells[beatIndex].classList.add("is-active");
  updateStatus(`Beat ${beatIndex + 1} of ${chart.length}: lock both brothers.`);
}

function resolveBeatWindow() {
  if (!beatWindow) {
    lastBeatPerfect = false;
    return;
  }

  const { beatIndex, autoCleared } = beatWindow;
  leftCells[beatIndex].classList.remove("is-active");
  rightCells[beatIndex].classList.remove("is-active");

  if (autoCleared) {
    logEvent(`Beat ${beatIndex + 1}: riding the Showstopper glide.`, "positive");
    lastBeatPerfect = true;
    beatWindow = null;
    return;
  }

  const misses = [];
  if (!beatWindow.leftHit) {
    misses.push("left");
    adjustHarmony(-8);
  }
  if (!beatWindow.rightHit) {
    misses.push("right");
    adjustHarmony(-8);
  }
  if (!playing) {
    beatWindow = null;
    return;
  }

  if (misses.length === 0) {
    adjustHarmony(4);
    if (!playing) {
      beatWindow = null;
      return;
    }
    logEvent(`Beat ${beatIndex + 1}: both brothers locked in.`, "positive");
    leftCells[beatIndex].classList.add("is-cleared");
    rightCells[beatIndex].classList.add("is-cleared");
    lastBeatPerfect = true;
  } else {
    const missText =
      misses.length === 2
        ? "both brothers slipped"
        : `${misses[0]} brother slipped`;
    logEvent(`Beat ${beatIndex + 1}: ${missText}.`, "warning");
    if (!beatWindow.leftHit) {
      leftCells[beatIndex].classList.add("is-miss");
    }
    if (!beatWindow.rightHit) {
      rightCells[beatIndex].classList.add("is-miss");
    }
    lastBeatPerfect = false;
  }

  beatWindow = null;
}

function startSyncWindow(beatIndex) {
  if (beatIndex >= chart.length) {
    syncWindow = null;
    return;
  }

  if (syncSkips.has(beatIndex)) {
    syncSkips.delete(beatIndex);
    syncWindow = { beatIndex, autoSkipped: true };
    if (syncEvents.has(beatIndex)) {
      logEvent(`Sync cue after beat ${beatIndex + 1} cleared by Showstopper.`, "positive");
    } else {
      logEvent(`Beat ${beatIndex + 1}: Showstopper keeps the slips quiet.`, "positive");
    }
    updateStatus(`Showstopper carry through beat ${beatIndex + 1}.`);
    return;
  }

  const event = syncEvents.get(beatIndex);
  if (!event) {
    syncWindow = null;
    updateStatus(`No sync cue after beat ${beatIndex + 1}. Keep your groove.`);
    return;
  }

  syncCells[beatIndex].classList.remove("is-cleared", "is-miss");
  syncCells[beatIndex].classList.add("is-active");
  const stepBadges = syncStepBadges.get(beatIndex) ?? [];
  stepBadges.forEach((badge) => {
    badge.classList.remove("is-hit", "is-miss", "is-complete");
  });
  syncWindow = {
    beatIndex,
    sequence: [...event.sequence],
    progress: 0,
    title: event.title,
    complete: false,
    failed: false,
    lastBeatPerfect,
  };
  updateStatus(`Sync cue: ${event.title} after beat ${beatIndex + 1}.`);
}

function resolveSyncWindow() {
  if (!syncWindow) {
    return;
  }

  const { beatIndex, autoSkipped } = syncWindow;
  syncCells[beatIndex]?.classList.remove("is-active");

  if (autoSkipped) {
    syncWindow = null;
    return;
  }

  const event = syncEvents.get(beatIndex);
  if (!event) {
    syncWindow = null;
    return;
  }

  if (syncWindow.complete) {
    adjustHarmony(6);
    if (!playing) {
      syncWindow = null;
      return;
    }
    logEvent(`Sync cue ${event.title} landed cleanly.`, "positive");
    syncCells[beatIndex]?.classList.add("is-cleared");
    const badges = syncStepBadges.get(beatIndex) ?? [];
    badges.forEach((badge) => badge.classList.add("is-complete"));
    if (syncWindow.lastBeatPerfect) {
      triggerShowstopper(beatIndex);
    }
  } else {
    adjustHarmony(-12);
    if (!playing) {
      syncWindow = null;
      return;
    }
    logEvent(`Sync cue ${event.title} slipped out of time.`, "warning");
    syncCells[beatIndex]?.classList.add("is-miss");
  }

  syncWindow = null;
}

function triggerShowstopper(beatIndex) {
  adjustHarmony(10);
  if (!playing) {
    return;
  }

  const cleared = [];
  for (let offset = 1; offset <= 2; offset += 1) {
    const nextBeat = beatIndex + offset;
    if (nextBeat < chart.length) {
      showstopperSkips.add(nextBeat);
      syncSkips.add(nextBeat);
      cleared.push(`beat ${nextBeat + 1}`);
    }
  }

  if (cleared.length > 0) {
    logEvent(`Showstopper clears ${cleared.join(" and ")}.`, "positive");
    updateStatus(`Showstopper! Coasting through ${cleared.join(" and ")}.`);
  } else {
    logEvent("Showstopper fired on the finale flourish!", "positive");
    updateStatus("Showstopper on the finale flourish!");
  }
}

function handleInput(code) {
  const button = virtualKeyButtons.find((key) => key.dataset.code === code);
  if (button) {
    button.classList.add("is-active");
    window.setTimeout(() => {
      button.classList.remove("is-active");
    }, 150);
  }

  if (!playing) {
    return;
  }

  if (beatWindow && !beatWindow.autoCleared) {
    if (code === beatWindow.leftCode) {
      beatWindow.leftHit = true;
      leftCells[beatWindow.beatIndex].classList.add("is-hit");
    }
    if (code === beatWindow.rightCode) {
      beatWindow.rightHit = true;
      rightCells[beatWindow.beatIndex].classList.add("is-hit");
    }
  }

  if (syncWindow && !syncWindow.autoSkipped && !syncWindow.complete) {
    if (syncWindow.failed) {
      return;
    }
    const expected = syncWindow.sequence[syncWindow.progress];
    if (code === expected) {
      syncWindow.progress += 1;
      const badges = syncStepBadges.get(syncWindow.beatIndex);
      const badge = badges?.[syncWindow.progress - 1];
      badge?.classList.add("is-hit");
      if (syncWindow.progress === syncWindow.sequence.length) {
        syncWindow.complete = true;
      }
    } else if (!syncWindow.failed && noteStyles[code]) {
      syncWindow.failed = true;
      const badges = syncStepBadges.get(syncWindow.beatIndex);
      const badge = badges?.[syncWindow.progress];
      badge?.classList.add("is-miss");
      syncWindow.complete = false;
      syncCells[syncWindow.beatIndex]?.classList.add("is-miss");
    }
  }
}

function setHarmony(value) {
  const clamped = Math.max(0, Math.min(HARMONY_MAX, Math.round(value)));
  harmony = clamped;
  harmonyFill.style.width = `${clamped}%`;
  harmonyMeter.setAttribute("aria-valuenow", String(clamped));
  harmonyValue.textContent = String(clamped);
  if (clamped <= 0 && playing) {
    handleHarmonyCollapse();
  }
}

function adjustHarmony(delta) {
  setHarmony(harmony + delta);
}

function handleHarmonyCollapse() {
  endSequence("Harmony collapsed. Reset to try again.", "warning", true);
}

function finishSequence() {
  endSequence(`Rehearsal complete. Harmony ${Math.round(harmony)}.`, "positive", true);
}

function endSequence(message, type = "neutral", includeSummary = false) {
  stopLoop();
  if (!playing) {
    return;
  }
  playing = false;
  startButton.disabled = false;
  stopButton.disabled = true;
  beatWindow = null;
  syncWindow = null;
  currentTick = 0;
  updateStatus(message);
  clearHighlights();
  logEvent(message, type);
  if (includeSummary) {
    logHarmonySummary();
  }
}

function logHarmonySummary() {
  const value = Math.round(harmony);
  const type = value >= 70 ? "positive" : value <= 30 ? "warning" : "neutral";
  logEvent(`Harmony settled at ${value}.`, type);
}

function stopLoop() {
  if (intervalId !== null) {
    window.clearInterval(intervalId);
    intervalId = null;
  }
}

function logEvent(message, type = "neutral") {
  const item = document.createElement("li");
  item.textContent = message;
  if (type === "positive") {
    item.classList.add("is-positive");
    particleSystem.emitBurst(1.2);
  } else if (type === "warning") {
    item.classList.add("is-warning");
    particleSystem.emitSparkle(0.8);
  }
  eventList.prepend(item);
  while (eventList.children.length > 8) {
    eventList.removeChild(eventList.lastChild);
  }
}

function updateStatus(message) {
  statusReadout.textContent = message;
}

function clearHighlights() {
  leftCells.forEach((cell) => cell.classList.remove("is-active", "is-cleared", "is-hit", "is-miss"));
  rightCells.forEach((cell) => cell.classList.remove("is-active", "is-cleared", "is-hit", "is-miss"));
  syncCells.forEach((cell) => cell.classList.remove("is-active", "is-cleared", "is-miss"));
  syncStepBadges.forEach((badges) => {
    badges.forEach((badge) => badge.classList.remove("is-hit", "is-miss", "is-complete"));
  });
}
