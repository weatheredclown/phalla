import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { mountParticleField } from "../particles.js";
import { autoEnhanceFeedback, createLogChannel, createStatusChannel } from "../feedback.js";

const particleField = mountParticleField({
  effects: {
    palette: ["#4cc9f0", "#38bdf8", "#c084fc", "#facc15"],
    ambientDensity: 0.5,
  },
});

const scoreConfig = getScoreConfig("under-the-sea-scramble");
const highScore = initHighScoreBanner({
  gameId: "under-the-sea-scramble",
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

const sceneNameEl = document.getElementById("scene-name");
const timerValueEl = document.getElementById("timer-value");
const timerFillEl = document.getElementById("timer-fill");
const scoreValueEl = document.getElementById("score-value");
const helpButton = document.getElementById("help-button");
const startButton = document.getElementById("start-button");
const resetButton = document.getElementById("reset-button");
const searchScene = document.getElementById("search-scene");
const targetList = document.getElementById("target-list");
const statusBanner = document.getElementById("status-banner");
const logList = document.getElementById("log-feed");
const clearLogButton = document.getElementById("clear-log");
const flounderOverlay = document.getElementById("flounder-overlay");
const wrapupScreen = document.getElementById("wrapup-screen");
const wrapupScore = document.getElementById("wrapup-score");
const wrapupAccuracy = document.getElementById("wrapup-accuracy");
const wrapupTreasureList = document.getElementById("wrapup-treasure-list");
const wrapupClose = document.getElementById("wrapup-close");
const playAgainButton = document.getElementById("play-again");

autoEnhanceFeedback();

const statusChannel = createStatusChannel(statusBanner);
const logChannel = createLogChannel(logList, { limit: 32 });

let audioContext = null;

function ensureAudioContext() {
  if (audioContext) {
    return audioContext;
  }
  try {
    audioContext = new AudioContext();
  } catch (error) {
    console.warn("Unable to initialize audio context", error);
  }
  return audioContext;
}

function playChime() {
  const ctx = ensureAudioContext();
  if (!ctx) {
    return;
  }
  const now = ctx.currentTime + 0.01;
  const oscillator = ctx.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(660, now);
  oscillator.frequency.exponentialRampToValueAtTime(1320, now + 0.25);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.35, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.5);
  const bubble = ctx.createOscillator();
  bubble.type = "triangle";
  bubble.frequency.setValueAtTime(320, now);
  bubble.frequency.exponentialRampToValueAtTime(520, now + 0.3);
  const bubbleGain = ctx.createGain();
  bubbleGain.gain.setValueAtTime(0.0001, now);
  bubbleGain.gain.exponentialRampToValueAtTime(0.18, now + 0.05);
  bubbleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
  bubble.connect(bubbleGain).connect(ctx.destination);
  bubble.start(now);
  bubble.stop(now + 0.4);
}

function playPenalty() {
  const ctx = ensureAudioContext();
  if (!ctx) {
    return;
  }
  const now = ctx.currentTime + 0.01;
  const oscillator = ctx.createOscillator();
  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(280, now);
  oscillator.frequency.linearRampToValueAtTime(180, now + 0.35);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.5);
}

const TREASURES = {
  dinglehopper: {
    label: "A dinglehopper",
    icon: "🍴",
    scuttleNote: "Prime hair-straightening fork. Humans keep these in their windy cabinets.",
  },
  snarfblat: {
    label: "A snarfblat",
    icon: "🪈",
    scuttleNote: "Classic human nose trumpet. They blow bubbles out their ears with it!",
  },
  spyglass: {
    label: "A spyglass",
    icon: "🔭",
    scuttleNote: "A human squint-extender. Lets you see someone waving four oceans away.",
  },
  compass: {
    label: "An ornate compass",
    icon: "🧭",
    scuttleNote: "Human pocket pizza cutter. Slices their maps into fashionable wedges.",
  },
  candelabra: {
    label: "A tarnished candelabra",
    icon: "🕯️",
    scuttleNote: "Guaranteed to toast seaweed evenly. Humans sit around and watch it melt.",
  },
  pocketwatch: {
    label: "A pocket watch",
    icon: "⌚",
    scuttleNote: "This marvel tells you when the moon is hungry. Humans love punctual tides.",
  },
  musicbox: {
    label: "A music box",
    icon: "🎼",
    scuttleNote: "Wind it up and humans perform their mating chirps. Very advanced courting tech.",
  },
  magnifier: {
    label: "A magnifying lens",
    icon: "🔍",
    scuttleNote: "A sun-catching circle. Humans use it to brown tiny pastries.",
  },
  silvercup: {
    label: "A silver goblet",
    icon: "🍷",
    scuttleNote: "Perfect for drinking fresh rainlight. They toast clouds with it.",
  },
  windupfish: {
    label: "A wind-up fish toy",
    icon: "🤖",
    scuttleNote: "Mechanical cousin! Humans wind it and pretend they know how to swim.",
  },
  globe: {
    label: "A tabletop globe",
    icon: "🌐",
    scuttleNote: "Humans shrink their oceans for travel planning. Spin it to choose tonight's dinner current.",
  },
  tophat: {
    label: "A velvet top hat",
    icon: "🎩",
    scuttleNote: "A surface-dweller clam shell. They trap air in it to keep their heads afloat at fancy gatherings.",
  },
};

const SCENES = [
  {
    id: "grotto",
    name: "Ariel's Grotto",
    timeLimit: 60,
    timeBonusMultiplier: 12,
    intro: "Ariel left her starter collection by the glowing vents. Gather her favorite gadgets before the clams close for curfew.",
    targets: [
      {
        id: "dinglehopper",
        position: { left: 16, top: 58 },
        scale: 0.95,
        rotation: -12,
        score: 220,
        hint: "Check the rock ledge near the pearl clams.",
      },
      {
        id: "snarfblat",
        position: { left: 54, top: 32 },
        scale: 1.05,
        rotation: 8,
        score: 240,
        hint: "A school of fish is trying to play this as a flute.",
      },
      {
        id: "musicbox",
        position: { left: 74, top: 66 },
        scale: 0.92,
        rotation: 6,
        score: 250,
        hint: "Hear that muffled lullaby? It's hiding behind the coral arch.",
      },
    ],
    decoys: [
      { icon: "🪞", label: "Shell mirror", left: 30, top: 46, scale: 1 },
      { icon: "🧺", label: "Woven basket", left: 68, top: 18, scale: 0.9 },
      { icon: "🦀", label: "Chatty crab", left: 40, top: 68, scale: 1.2 },
    ],
  },
  {
    id: "reef",
    name: "Coral Bazaar",
    timeLimit: 48,
    timeBonusMultiplier: 16,
    intro: "Vendors flooded the reef with trinkets. Sift through the swirl of shells before the tide flips.",
    targets: [
      {
        id: "pocketwatch",
        position: { left: 22, top: 26 },
        scale: 0.8,
        rotation: 18,
        score: 280,
        hint: "A jellyfish is using it as a disco ball.",
      },
      {
        id: "magnifier",
        position: { left: 58, top: 52 },
        scale: 1.15,
        rotation: -10,
        score: 260,
        hint: "Check the sandy shelf beside the sea fan spiral.",
      },
      {
        id: "silvercup",
        position: { left: 76, top: 28 },
        scale: 1,
        rotation: 6,
        score: 290,
        hint: "It's balancing on drifting kelp near the light beam.",
      },
      {
        id: "spyglass",
        position: { left: 38, top: 70 },
        scale: 0.95,
        rotation: -14,
        score: 310,
        hint: "A sea turtle is borrowing it near the anemone stage.",
      },
    ],
    decoys: [
      { icon: "🐠", label: "Distracting fish", left: 12, top: 60, scale: 1.4 },
      { icon: "🪸", label: "Coral harp", left: 50, top: 18, scale: 1.1 },
      { icon: "🥽", label: "Diver goggles", left: 80, top: 64, scale: 0.95 },
      { icon: "🪙", label: "Doubloon spill", left: 64, top: 82, scale: 0.9 },
    ],
  },
  {
    id: "ship",
    name: "Sunken Shipwreck",
    timeLimit: 40,
    timeBonusMultiplier: 22,
    intro: "The brig is jammed with human keepsakes and ghostly currents. Snag the valuables before the lantern fades.",
    targets: [
      {
        id: "compass",
        position: { left: 18, top: 40 },
        scale: 0.9,
        rotation: 14,
        score: 340,
        hint: "Wedged between two broken planks near the prow.",
      },
      {
        id: "candelabra",
        position: { left: 46, top: 22 },
        scale: 1.1,
        rotation: -18,
        score: 320,
        hint: "Look for a faint glow above the captain's chair.",
      },
      {
        id: "windupfish",
        position: { left: 60, top: 68 },
        scale: 1.05,
        rotation: 10,
        score: 300,
        hint: "Mechanical fins are tangled in sailcloth at mid-deck.",
      },
      {
        id: "globe",
        position: { left: 82, top: 54 },
        scale: 0.9,
        rotation: -6,
        score: 340,
        hint: "Spin the glass sphere bobbing by the broken porthole.",
      },
      {
        id: "tophat",
        position: { left: 70, top: 24 },
        scale: 1,
        rotation: 2,
        score: 360,
        hint: "Look for the velvet brim perched atop a rope coil.",
      },
    ],
    decoys: [
      { icon: "⚓", label: "Anchor", left: 30, top: 64, scale: 1.2 },
      { icon: "🪙", label: "Coin stack", left: 52, top: 44, scale: 0.85 },
      { icon: "🪵", label: "Loose plank", left: 10, top: 22, scale: 1.4 },
      { icon: "🧜", label: "Figurine", left: 90, top: 32, scale: 0.8 },
      { icon: "🪤", label: "Crab trap", left: 44, top: 82, scale: 1 },
    ],
  },
];

const state = {
  active: false,
  sceneIndex: 0,
  score: 0,
  timerId: null,
  timeLeft: 0,
  sceneDuration: 0,
  helpUsedThisScene: false,
  totalHelpCalls: 0,
  totalTimeBonus: 0,
  totalClicks: 0,
  correctClicks: 0,
  collected: [],
  foundInScene: new Set(),
};

function resetState() {
  state.active = false;
  state.sceneIndex = 0;
  state.score = 0;
  state.timeLeft = 0;
  state.sceneDuration = 0;
  state.helpUsedThisScene = false;
  state.totalHelpCalls = 0;
  state.totalTimeBonus = 0;
  state.totalClicks = 0;
  state.correctClicks = 0;
  state.collected = [];
  state.foundInScene = new Set();
  window.clearInterval(state.timerId);
  state.timerId = null;
}

function stopTimer() {
  window.clearInterval(state.timerId);
  state.timerId = null;
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.ceil(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function updateTimerDisplay() {
  timerValueEl.textContent = formatTime(state.timeLeft);
  if (state.sceneDuration > 0) {
    const progress = Math.max(0, Math.min(1, state.timeLeft / state.sceneDuration));
    timerFillEl.style.width = `${progress * 100}%`;
  } else {
    timerFillEl.style.width = "0%";
  }
}

function updateScoreDisplay() {
  scoreValueEl.textContent = state.score.toLocaleString();
}

function clearSceneElements() {
  searchScene.innerHTML = "";
  targetList.innerHTML = "";
  searchScene.dataset.scene = "";
  searchScene.dataset.status = "idle";
}

function createTreasureElement(target, sceneConfig) {
  const treasureData = TREASURES[target.id];
  const button = document.createElement("button");
  button.className = "treasure-item";
  button.type = "button";
  button.dataset.icon = treasureData?.icon ?? "❓";
  button.dataset.id = target.id;
  button.style.left = `${target.position.left}%`;
  button.style.top = `${target.position.top}%`;
  button.style.transform = `translate(-50%, -50%) rotate(${target.rotation ?? 0}deg) scale(${target.scale ?? 1})`;
  button.setAttribute("aria-label", treasureData?.label ?? target.id);
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    handleTreasureClick(target, sceneConfig, button);
  });
  return button;
}

function createDecoyElement(decoy) {
  const button = document.createElement("button");
  button.className = "decoy-item";
  button.type = "button";
  button.dataset.icon = decoy.icon;
  button.setAttribute("aria-label", decoy.label);
  button.style.left = `${decoy.left}%`;
  button.style.top = `${decoy.top}%`;
  button.style.transform = `translate(-50%, -50%) scale(${decoy.scale ?? 1})`;
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    handleDecoyClick(decoy);
  });
  return button;
}

function createTargetListItem(target) {
  const treasureData = TREASURES[target.id];
  const item = document.createElement("li");
  item.className = "target-item";
  item.dataset.targetId = target.id;
  item.textContent = treasureData?.label ?? target.id;
  return item;
}

function animateTreasureToList(treasureEl, listItem) {
  const startRect = treasureEl.getBoundingClientRect();
  const endRect = listItem.getBoundingClientRect();
  const sparkle = document.createElement("div");
  sparkle.className = "sparkle-trail";
  sparkle.style.left = `${startRect.left + startRect.width / 2}px`;
  sparkle.style.top = `${startRect.top + startRect.height / 2}px`;
  document.body.appendChild(sparkle);
  const animation = sparkle.animate(
    [
      {
        transform: "translate(-50%, -50%) scale(0.6)",
        opacity: 1,
      },
      {
        transform: `translate(${endRect.left + endRect.width / 2 - startRect.left - startRect.width / 2}px, ${
          endRect.top + endRect.height / 2 - startRect.top - startRect.height / 2
        }px) scale(1.1)`,
        opacity: 0,
      },
    ],
    {
      duration: 620,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "forwards",
    }
  );
  animation.addEventListener("finish", () => {
    sparkle.remove();
  });
}

function handleTreasureClick(target, sceneConfig, button) {
  if (!state.active || state.foundInScene.has(target.id)) {
    return;
  }
  ensureAudioContext();
  state.totalClicks += 1;
  state.correctClicks += 1;
  state.foundInScene.add(target.id);
  const treasureData = TREASURES[target.id];
  state.score += target.score;
  state.collected.push({ id: target.id, sceneId: sceneConfig.id, score: target.score });
  updateScoreDisplay();
  playChime();
  const listItem = targetList.querySelector(`[data-target-id="${target.id}"]`);
  if (listItem) {
    listItem.classList.add("is-found");
    animateTreasureToList(button, listItem);
  }
  button.classList.add("is-found");
  logChannel.push(`${treasureData?.label ?? target.id} secured · +${target.score} pts`, "success");
  statusChannel(`${treasureData?.label ?? target.id} added to the trove!`, "success");
  if (state.foundInScene.size === sceneConfig.targets.length) {
    completeScene(true);
  }
}

function handleDecoyClick(decoy) {
  if (!state.active) {
    return;
  }
  ensureAudioContext();
  state.totalClicks += 1;
  applyPenalty(`${decoy.label} was just clutter.`, 120);
}

function applyPenalty(message, deduction) {
  state.score = Math.max(0, state.score - deduction);
  updateScoreDisplay();
  playPenalty();
  flounderOverlay.classList.add("is-active");
  statusChannel(`Flounder panics! ${message}`, "danger");
  logChannel.push(`${message} -${deduction} pts`, "danger");
  window.setTimeout(() => {
    flounderOverlay.classList.remove("is-active");
  }, 2000);
}

function addSceneDetails(sceneConfig) {
  const detail = document.createElement("div");
  detail.className = "scene-detail";
  if (sceneConfig.id === "grotto") {
    detail.style.backgroundImage = "radial-gradient(circle at 20% 40%, rgba(253, 224, 71, 0.25), transparent 60%)";
  } else if (sceneConfig.id === "reef") {
    detail.style.backgroundImage = "radial-gradient(circle at 80% 30%, rgba(190, 242, 100, 0.25), transparent 60%)";
  } else {
    detail.style.backgroundImage = "radial-gradient(circle at 40% 60%, rgba(252, 165, 165, 0.25), transparent 60%)";
  }
  searchScene.appendChild(detail);
}

function setupScene(sceneIndex) {
  const sceneConfig = SCENES[sceneIndex];
  if (!sceneConfig) {
    finishDive();
    return;
  }
  clearSceneElements();
  state.sceneIndex = sceneIndex;
  state.foundInScene = new Set();
  state.helpUsedThisScene = false;
  state.sceneDuration = sceneConfig.timeLimit;
  state.timeLeft = sceneConfig.timeLimit;
  state.active = true;
  searchScene.dataset.scene = sceneConfig.id;
  searchScene.dataset.status = "active";
  sceneNameEl.textContent = sceneConfig.name;
  updateTimerDisplay();
  helpButton.disabled = false;
  helpButton.textContent = "Available";
  addSceneDetails(sceneConfig);
  sceneConfig.targets.forEach((target) => {
    const treasureEl = createTreasureElement(target, sceneConfig);
    searchScene.appendChild(treasureEl);
    const listItem = createTargetListItem(target);
    targetList.appendChild(listItem);
  });
  sceneConfig.decoys.forEach((decoy) => {
    const decoyEl = createDecoyElement(decoy);
    searchScene.appendChild(decoyEl);
  });
  statusChannel(sceneConfig.intro, "info");
  logChannel.push(`Entering ${sceneConfig.name}. ${sceneConfig.targets.length} treasures on the list.`, "info");
  startTimer();
}

function startTimer() {
  stopTimer();
  updateTimerDisplay();
  state.timerId = window.setInterval(() => {
    state.timeLeft -= 1;
    updateTimerDisplay();
    if (state.timeLeft <= 0) {
      stopTimer();
      completeScene(false);
    }
  }, 1000);
}

function completeScene(success) {
  stopTimer();
  state.active = false;
  helpButton.disabled = true;
  const sceneConfig = SCENES[state.sceneIndex];
  if (!sceneConfig) {
    finishDive();
    return;
  }
  if (success) {
    const remaining = Math.max(0, state.timeLeft);
    let timeBonus = 0;
    if (!state.helpUsedThisScene) {
      timeBonus = Math.round(remaining * sceneConfig.timeBonusMultiplier);
      state.score += timeBonus;
      state.totalTimeBonus += timeBonus;
      updateScoreDisplay();
    }
    const bonusMessage = timeBonus > 0 ? ` +${timeBonus} time bonus!` : state.helpUsedThisScene ? " (Scuttle claimed your time bonus)" : "";
    statusChannel(`List cleared!${bonusMessage}`, timeBonus > 0 ? "success" : "info");
    logChannel.push(
      `Cleared ${sceneConfig.name} with ${Math.ceil(remaining)}s left${
        timeBonus > 0 ? ` · +${timeBonus} bonus` : state.helpUsedThisScene ? " · No bonus after Scuttle's tip" : ""
      }`,
      timeBonus > 0 ? "success" : "warning"
    );
    window.setTimeout(() => {
      setupScene(state.sceneIndex + 1);
    }, 1400);
  } else {
    statusChannel("Time's up! Ariel has to stash what you found.", "danger");
    logChannel.push(`Time expired in ${sceneConfig.name}.`, "danger");
    finishDive();
  }
}

function finishDive() {
  stopTimer();
  state.active = false;
  helpButton.disabled = true;
  const totalAccuracy = state.totalClicks > 0 ? Math.round((state.correctClicks / state.totalClicks) * 100) : 0;
  wrapupScore.textContent = state.score.toLocaleString();
  wrapupAccuracy.textContent = `Accuracy: ${totalAccuracy}% · Time bonus ${state.totalTimeBonus.toLocaleString()} pts`;
  wrapupTreasureList.innerHTML = "";
  if (state.collected.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "Scuttle shrugs—no treasures logged.";
    wrapupTreasureList.appendChild(empty);
  } else {
    state.collected.forEach((entry) => {
      const treasureData = TREASURES[entry.id];
      const li = document.createElement("li");
      li.innerHTML = `<strong>${treasureData?.label ?? entry.id}</strong><br />${
        treasureData?.scuttleNote ?? "Scuttle can't identify this one."
      }`;
      wrapupTreasureList.appendChild(li);
    });
  }
  wrapupScreen.hidden = false;
  particleField?.burst?.({ intensity: 1.2 });
  highScore.submit(state.score, {
    accuracy: totalAccuracy,
    timeBonus: state.totalTimeBonus,
    helpCalls: state.totalHelpCalls,
  });
}

function closeWrapup() {
  wrapupScreen.hidden = true;
}

function handleHelpRequest() {
  if (!state.active || state.helpUsedThisScene) {
    return;
  }
  const sceneConfig = SCENES[state.sceneIndex];
  if (!sceneConfig) {
    return;
  }
  const remainingTargets = sceneConfig.targets.filter((target) => !state.foundInScene.has(target.id));
  if (remainingTargets.length === 0) {
    statusChannel("List already cleared—save Scuttle for later!", "info");
    return;
  }
  state.helpUsedThisScene = true;
  state.totalHelpCalls += 1;
  helpButton.disabled = true;
  helpButton.textContent = "Used";
  const target = remainingTargets[Math.floor(Math.random() * remainingTargets.length)];
  const highlight = document.createElement("div");
  highlight.className = "treasure-highlight";
  highlight.style.left = `${target.position.left}%`;
  highlight.style.top = `${target.position.top}%`;
  highlight.style.width = "9rem";
  highlight.style.height = "9rem";
  searchScene.appendChild(highlight);
  window.setTimeout(() => {
    highlight.remove();
  }, 4000);
  statusChannel(`Scuttle circles the area: ${target.hint}`, "warning");
  logChannel.push(`Scuttle hint used: ${target.hint}`, "warning");
}

function startDive() {
  closeWrapup();
  resetState();
  clearSceneElements();
  updateScoreDisplay();
  timerFillEl.style.width = "0%";
  state.active = true;
  setupScene(0);
}

function resetDive() {
  closeWrapup();
  resetState();
  clearSceneElements();
  updateScoreDisplay();
  timerFillEl.style.width = "0%";
  sceneNameEl.textContent = "Grotto Warm-Up";
  timerValueEl.textContent = "00:00";
  helpButton.disabled = true;
  helpButton.textContent = "Unavailable";
  statusChannel("Reset complete. Ready when you are!", "info");
}

function wireControls() {
  startButton.addEventListener("click", () => {
    startDive();
  });
  resetButton.addEventListener("click", () => {
    resetDive();
  });
  helpButton.addEventListener("click", () => {
    handleHelpRequest();
  });
  clearLogButton.addEventListener("click", () => {
    logList.innerHTML = "";
  });
  wrapupClose.addEventListener("click", () => {
    closeWrapup();
  });
  playAgainButton.addEventListener("click", () => {
    startDive();
  });
  searchScene.addEventListener("click", () => {
    if (!state.active) {
      return;
    }
    state.totalClicks += 1;
    applyPenalty("That patch held nothing useful.", 90);
  });
}

function init() {
  resetDive();
  wireControls();
}

init();
