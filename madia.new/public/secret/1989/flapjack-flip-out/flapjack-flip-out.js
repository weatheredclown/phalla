import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { mountParticleField } from "../particles.js";
import { createStatusChannel, createLogChannel, autoEnhanceFeedback } from "../feedback.js";

const particleSystem = mountParticleField({
  effects: {
    palette: ["#facc15", "#f97316", "#fb7185", "#38bdf8"],
    ambientDensity: 0.55,
  },
});

const scoreConfig = getScoreConfig("flapjack-flip-out");
const highScore = initHighScoreBanner({
  gameId: "flapjack-flip-out",
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

const canvas = document.getElementById("stack-canvas");
const ctx = canvas.getContext("2d");

const startButton = document.getElementById("start-service");
const nudgeButton = document.getElementById("nudge-stack");
const resetButton = document.getElementById("reset-kitchen");
const statusBar = document.getElementById("status-bar");
const logList = document.getElementById("service-log");
const heightDisplay = document.getElementById("height-display");
const peakDisplay = document.getElementById("peak-display");
const countDisplay = document.getElementById("count-display");
const typeDisplay = document.getElementById("type-display");
const stabilityFill = document.getElementById("stability-fill");
const stabilityMeter = stabilityFill.parentElement;
const stabilityNote = document.getElementById("stability-note");
const tempoIndicator = document.getElementById("tempo-indicator");
const nextCallout = document.getElementById("next-callout");
const wrapup = document.getElementById("wrapup");
const wrapupSubtitle = document.getElementById("wrapup-subtitle");
const wrapupHeight = document.getElementById("wrapup-height");
const wrapupTotal = document.getElementById("wrapup-total");
const wrapupRisk = document.getElementById("wrapup-risk");
const wrapupPhoto = document.getElementById("wrapup-photo");
const wrapupPhotoCaption = document.getElementById("wrapup-photo-caption");
const wrapupRematch = document.getElementById("wrapup-rematch");
const wrapupClose = document.getElementById("wrapup-close");
const kitchenStage = document.querySelector(".kitchen-stage");

const statusChannel = createStatusChannel(statusBar);
const logChannel = createLogChannel(logList, { limit: 18 });

autoEnhanceFeedback({ statusSelectors: ["#status-bar"], logSelectors: ["#service-log"] });

if (!ctx) {
  throw new Error("Canvas context not available for Flapjack Flip-Out");
}

const PX_PER_CM = 4;
const FLOOR_Y = canvas.height - 70;
const PLATE_WIDTH = 240;
const PLATE_HEIGHT = 18;
const PLATE_SPEED = 0.38; // px per ms when using keys
const GRAVITY = 0.0011; // px per ms^2
const WOBBLE_MAX = 100;
const STACK_LEAN_LIMIT = 190;
const STACK_SHAKE_THRESHOLD = 82;

const PANCAKE_TYPES = [
  {
    id: "classic",
    name: "Classic Round",
    callout: "Classic",
    width: 180,
    thickness: 28,
    mass: 1,
    wobbleImpact: 9,
    compressionCap: 0.16,
    colors: {
      top: "#fde68a",
      sideTop: "#facc15",
      sideBottom: "#f97316",
      rim: "#fcd34d",
      scorch: "#b45309",
    },
  },
  {
    id: "hefty",
    name: "Griddle Titan",
    callout: "Heavy",
    width: 220,
    thickness: 34,
    mass: 1.6,
    wobbleImpact: 14,
    compressionCap: 0.22,
    colors: {
      top: "#fbbf24",
      sideTop: "#f59e0b",
      sideBottom: "#d97706",
      rim: "#fcd34d",
      scorch: "#92400e",
    },
  },
  {
    id: "mini",
    name: "Silver Dollar Scatter",
    callout: "Mini",
    width: 130,
    thickness: 22,
    mass: 0.6,
    wobbleImpact: 7,
    compressionCap: 0.12,
    colors: {
      top: "#fef9c3",
      sideTop: "#fcd34d",
      sideBottom: "#f59e0b",
      rim: "#fde68a",
      scorch: "#9a3412",
    },
  },
  {
    id: "burnt",
    name: "Burnt Brittle",
    callout: "Brittle",
    width: 170,
    thickness: 26,
    mass: 1.1,
    wobbleImpact: 12,
    compressionCap: 0.14,
    brittle: true,
    colors: {
      top: "#fed7aa",
      sideTop: "#fb7185",
      sideBottom: "#c2410c",
      rim: "#fecdd3",
      scorch: "#7f1d1d",
    },
  },
];

const pancakeById = new Map(PANCAKE_TYPES.map((type) => [type.id, type]));

const inputState = {
  left: false,
  right: false,
};

const pointerState = {
  active: false,
  pointerId: null,
  targetX: null,
};

const state = {
  running: false,
  started: false,
  round: 0,
  tempo: 1,
  plateX: canvas.width / 2,
  previousPlateX: canvas.width / 2,
  stack: [],
  stackLean: 0,
  stackLeanVelocity: 0,
  wobble: 0,
  wobblePeak: 0,
  pancakesServed: 0,
  pancakeTypes: new Map(),
  falling: null,
  launchTimer: 0,
  pendingType: PANCAKE_TYPES[0],
  bestSnapshot: null,
  snapshotPending: false,
  highestHeightCm: 0,
  nudgeCount: 0,
  riskyNudges: 0,
  collapseReason: null,
};

let animationId = null;
let lastTimestamp = performance.now();

resetKitchen();
startAnimation();
wireControls();

function startAnimation() {
  if (animationId !== null) {
    return;
  }
  const step = (timestamp) => {
    const deltaMs = Math.min(timestamp - lastTimestamp, 48);
    lastTimestamp = timestamp;
    update(deltaMs);
    render();
    if (state.snapshotPending) {
      captureSnapshot();
      state.snapshotPending = false;
    }
    animationId = window.requestAnimationFrame(step);
  };
  animationId = window.requestAnimationFrame(step);
}

function wireControls() {
  startButton.addEventListener("click", () => {
    if (!state.running) {
      beginService();
    }
  });

  nudgeButton.addEventListener("click", () => {
    performNudge();
  });

  resetButton.addEventListener("click", () => {
    addLog("Kitchen reset. Plate re-centered.");
    resetKitchen();
  });

  wrapupRematch.addEventListener("click", () => {
    hideWrapup();
    resetKitchen();
    beginService();
  });

  wrapupClose.addEventListener("click", () => {
    hideWrapup();
    resetKitchen();
    try {
      window.parent?.postMessage({ type: "1989:return-to-menu", game: "flapjack-flip-out" }, "*");
    } catch (error) {
      // ignore cross-origin issues
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }
    const { key } = event;
    if (["ArrowLeft", "a", "A"].includes(key)) {
      inputState.left = true;
      event.preventDefault();
    } else if (["ArrowRight", "d", "D"].includes(key)) {
      inputState.right = true;
      event.preventDefault();
    } else if (key === "n" || key === "N") {
      event.preventDefault();
      performNudge();
    } else if (key === "r" || key === "R") {
      event.preventDefault();
      addLog("Manual reset requested.");
      resetKitchen();
    } else if (key === " ") {
      if (!state.running) {
        event.preventDefault();
        beginService();
      }
    }
  });

  document.addEventListener("keyup", (event) => {
    const { key } = event;
    if (["ArrowLeft", "a", "A"].includes(key)) {
      inputState.left = false;
    } else if (["ArrowRight", "d", "D"].includes(key)) {
      inputState.right = false;
    }
  });

  const stage = kitchenStage;
  stage.addEventListener("pointerdown", (event) => {
    stage.setPointerCapture(event.pointerId);
    pointerState.active = true;
    pointerState.pointerId = event.pointerId;
    updatePointerTarget(event);
  });

  stage.addEventListener("pointermove", (event) => {
    if (!pointerState.active || pointerState.pointerId !== event.pointerId) {
      return;
    }
    updatePointerTarget(event);
  });

  stage.addEventListener("pointerup", (event) => {
    if (pointerState.pointerId === event.pointerId) {
      pointerState.active = false;
      pointerState.pointerId = null;
      pointerState.targetX = null;
    }
  });

  stage.addEventListener("pointercancel", () => {
    pointerState.active = false;
    pointerState.pointerId = null;
    pointerState.targetX = null;
  });
}

function updatePointerTarget(event) {
  const rect = canvas.getBoundingClientRect();
  const relativeX = ((event.clientX - rect.left) / rect.width) * canvas.width;
  pointerState.targetX = clamp(relativeX, PLATE_WIDTH * 0.35, canvas.width - PLATE_WIDTH * 0.35);
}

function resetKitchen() {
  state.running = false;
  state.started = false;
  state.round = 0;
  state.tempo = 1;
  state.stack = [];
  state.stackLean = 0;
  state.stackLeanVelocity = 0;
  state.wobble = 0;
  state.wobblePeak = 0;
  state.pancakesServed = 0;
  state.pancakeTypes.clear();
  state.falling = null;
  state.launchTimer = 0;
  state.pendingType = PANCAKE_TYPES[0];
  state.bestSnapshot = null;
  state.snapshotPending = false;
  state.highestHeightCm = 0;
  state.nudgeCount = 0;
  state.riskyNudges = 0;
  state.collapseReason = null;
  state.plateX = canvas.width / 2;
  state.previousPlateX = state.plateX;
  pointerState.active = false;
  pointerState.pointerId = null;
  pointerState.targetX = null;
  startButton.disabled = false;
  nudgeButton.disabled = true;
  if (kitchenStage) {
    kitchenStage.classList.remove("is-shaking");
  }
  hideWrapup();
  updateTempoIndicator();
  updateNextCallout();
  updateHud();
  statusChannel("Slide into position and begin service when ready.", "info");
}

function beginService() {
  state.running = true;
  state.started = true;
  state.round = 0;
  startButton.disabled = true;
  nudgeButton.disabled = false;
  queueNextPancake(true);
  statusChannel("Classic batter inbound. Center the plate for the first catch!", "info");
  addLog("Service opened. First pancake en route.");
}

function queueNextPancake(initial = false) {
  if (!state.running) {
    updateNextCallout();
    return;
  }
  const nextRound = state.round + 1;
  state.pendingType = choosePancakeType(nextRound);
  const baseDelay = initial ? 850 : Math.max(520, 1200 - nextRound * 55);
  state.launchTimer = baseDelay;
  state.tempo = Math.min(6, 1 + Math.floor((nextRound - 1) / 3));
  updateTempoIndicator();
  updateNextCallout();
}

function choosePancakeType(round) {
  if (round <= 2) {
    return PANCAKE_TYPES[0];
  }
  const pool = [];
  PANCAKE_TYPES.forEach((type) => {
    let weight = 1;
    if (type.id === "classic") {
      weight = 3;
    } else if (type.id === "hefty") {
      weight = round >= 4 ? 2 : 0;
    } else if (type.id === "mini") {
      weight = round >= 5 ? 2 : 0;
    } else if (type.id === "burnt") {
      weight = round >= 7 ? 1.6 : 0;
    }
    if (weight > 0) {
      pool.push({ type, weight });
    }
  });
  const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0);
  const roll = Math.random() * totalWeight;
  let acc = 0;
  for (const entry of pool) {
    acc += entry.weight;
    if (roll <= acc) {
      return entry.type;
    }
  }
  return PANCAKE_TYPES[0];
}

function update(deltaMs) {
  state.previousPlateX = state.plateX;
  updatePlate(deltaMs);
  settleStack(deltaMs);
  easeWobble(deltaMs);
  if (!state.running) {
    updateNextCallout();
    updateHud();
    return;
  }

  if (!state.falling) {
    state.launchTimer -= deltaMs;
    updateNextCallout();
    if (state.launchTimer <= 0) {
      launchPancake();
    }
  }

  if (state.falling) {
    updateFallingPancake(state.falling, deltaMs);
  }

  updateStackStress(deltaMs);
  detectInstability();
  updateHud();
}

function updatePlate(deltaMs) {
  const direction = (inputState.right ? 1 : 0) - (inputState.left ? 1 : 0);
  if (pointerState.active && pointerState.targetX !== null) {
    const followRate = Math.min(1, deltaMs / 90);
    state.plateX += (pointerState.targetX - state.plateX) * followRate;
  } else if (direction !== 0) {
    state.plateX += direction * PLATE_SPEED * deltaMs * Math.max(1, state.tempo * 0.85);
  }
  state.plateX = clamp(state.plateX, PLATE_WIDTH * 0.35, canvas.width - PLATE_WIDTH * 0.35);
  const deltaX = state.plateX - state.previousPlateX;
  state.stackLean -= deltaX * 0.35;
}

function launchPancake() {
  const type = state.pendingType ?? PANCAKE_TYPES[0];
  const entryX = canvas.width * (0.25 + Math.random() * 0.5);
  const baseVy = 0.26 + state.tempo * 0.02 + Math.random() * 0.05;
  const baseVx = (Math.random() - 0.5) * (0.18 + state.tempo * 0.04);
  state.falling = {
    type,
    x: entryX,
    y: -type.thickness - 60,
    vx: baseVx,
    vy: baseVy,
    rotation: (Math.random() - 0.5) * 0.15,
    spin: (Math.random() - 0.5) * 0.0018,
  };
  state.round += 1;
  addLog(`Launch ${state.round}: ${type.name} incoming.`);
  statusChannel(`${type.name} incoming! Position the plate.`, "info");
  state.pendingType = choosePancakeType(state.round + 1);
  state.launchTimer = Math.max(480, 1150 - state.round * 55);
  updateTempoIndicator();
  updateNextCallout();
}

function updateFallingPancake(pancake, deltaMs) {
  pancake.vy += GRAVITY * deltaMs;
  pancake.x += pancake.vx * deltaMs;
  pancake.y += pancake.vy * deltaMs;
  pancake.rotation += pancake.spin * deltaMs;

  const stackHeight = getStackHeightPx();
  const catchY = FLOOR_Y - stackHeight - pancake.type.thickness * 0.5;
  if (pancake.y >= catchY) {
    attemptCatch(pancake);
  } else if (pancake.y > FLOOR_Y + 140) {
    collapseTower("The pancake splats on the floor. Service over!", "danger");
    addLog("Dropped pancake. Tower lost.", "danger");
  }
}

function attemptCatch(pancake) {
  const stackCenter = state.plateX + state.stackLean;
  const catchWindow = (PLATE_WIDTH + pancake.type.width) * 0.5;
  const offset = pancake.x - stackCenter;
  if (Math.abs(offset) <= catchWindow) {
    lockPancake(pancake, offset, catchWindow);
  } else {
    collapseTower("Missed the catch—tower topples.", "danger");
    addLog("Missed catch. The stack crashes down!", "danger");
  }
}

function lockPancake(pancake, offset, catchWindow) {
  state.falling = null;
  const type = pancake.type;
  const compressionBase = Math.min(type.compressionCap, 0.06 * state.stack.length * type.mass + Math.abs(offset) / 620);
  const entry = {
    type,
    offset,
    compression: compressionBase,
    rotation: clamp(offset / 320, -0.3, 0.3),
    stress: 0,
  };
  state.stack.push(entry);
  state.pancakesServed += 1;
  const currentCount = state.pancakeTypes.get(type.id) ?? 0;
  state.pancakeTypes.set(type.id, currentCount + 1);

  const wobbleGain = Math.abs(offset) / (type.width * 0.5) * type.wobbleImpact * (1 + state.tempo * 0.15);
  state.wobble = clamp(state.wobble + wobbleGain + type.mass * 4.2, 0, WOBBLE_MAX);
  state.wobblePeak = Math.max(state.wobblePeak, state.wobble);
  state.stackLeanVelocity += offset * 0.008 * type.mass;
  state.stackLean += offset * 0.12;

  const heightCm = Math.round(getStackHeightPx() / PX_PER_CM);
  heightDisplay.textContent = `${heightCm} cm`;
  if (heightCm > state.highestHeightCm) {
    state.highestHeightCm = heightCm;
    peakDisplay.textContent = `${heightCm} cm`;
    state.snapshotPending = true;
    particleSystem.emitSparkle(1);
    addLog(`New peak height: ${heightCm} cm!`, "success");
  }

  if (Math.abs(offset) <= 12) {
    state.wobble = Math.max(0, state.wobble - 12);
    statusChannel("Perfect catch! Stack steadies.", "success");
    addLog("Perfect center catch. Stack tightens.", "success");
    particleSystem.emitSparkle(0.9);
  } else if (Math.abs(offset) > catchWindow * 0.75) {
    statusChannel("Wild catch! Tower lurches hard.", "warning");
    addLog("Severe off-center catch. Tower sways dangerously.", "warning");
  } else {
    statusChannel("Off-center catch. Wobble climbing.", "info");
    addLog("Stack wobbles from an off-center catch.");
  }

  if (type.brittle && state.wobble > 68) {
    collapseTower("The burnt pancake fractures under pressure!", "danger");
    addLog("Brittle pancake shattered—stack collapses!", "danger");
    return;
  }

  queueNextPancake();
}

function settleStack(deltaMs) {
  const delta = deltaMs / 16.6667;
  state.stackLean += state.stackLeanVelocity * delta;
  const spring = -state.stackLean * 0.0024;
  state.stackLeanVelocity += spring * delta;
  state.stackLeanVelocity *= 0.96;
}

function easeWobble(deltaMs) {
  const decay = deltaMs * 0.012;
  state.wobble = Math.max(0, state.wobble - decay);
}

function updateStackStress(deltaMs) {
  const wobbleRatio = state.wobble / WOBBLE_MAX;
  state.stack.forEach((pancake, index) => {
    const massFactor = pancake.type.mass * (index + 1) * 0.75;
    const offsetFactor = Math.abs(pancake.offset) / Math.max(1, pancake.type.width * 0.5);
    const compressionGain = Math.min(
      pancake.type.compressionCap,
      pancake.compression + wobbleRatio * 0.06 * pancake.type.mass + offsetFactor * 0.04,
    );
    pancake.compression = compressionGain;
    const stressValue = wobbleRatio * 100 + offsetFactor * 60 + massFactor * 4;
    pancake.stress = stressValue;
    pancake.rotation += state.stackLeanVelocity * 0.0004 * deltaMs;
  });
}

function detectInstability() {
  const leanRisk = Math.abs(state.stackLean) / STACK_LEAN_LIMIT;
  if (leanRisk > 1) {
    collapseTower("The tower leans too far and avalanches!", "danger");
    addLog("Lean exceeded the plate edge—tower avalanches.", "danger");
    return;
  }
  const highestStress = state.stack.reduce((max, pancake) => Math.max(max, pancake.stress ?? 0), 0);
  if (highestStress > 110) {
    collapseTower("Stack stress maxes out—the tower buckles.", "danger");
    addLog("Stress overload snaps the stack.", "danger");
  } else if (highestStress > STACK_SHAKE_THRESHOLD && state.running) {
    statusChannel("Stack groans under pressure. Consider nudging!", "warning");
  }

  if (state.wobble >= WOBBLE_MAX) {
    collapseTower("Wobble maxes out. Tower tumbles!", "danger");
    addLog("Wobble peaked at maximum. Collapse inevitable.", "danger");
  }
}

function updateHud() {
  const heightCm = Math.round(getStackHeightPx() / PX_PER_CM);
  heightDisplay.textContent = `${heightCm} cm`;
  peakDisplay.textContent = `${state.highestHeightCm} cm`;
  countDisplay.textContent = String(state.pancakesServed);
  const typeLabels = Array.from(state.pancakeTypes.entries()).map(([id, count]) => {
    const type = pancakeById.get(id);
    if (!type) {
      return `${count}`;
    }
    return `${type.callout}×${count}`;
  });
  typeDisplay.textContent = typeLabels.length > 0 ? typeLabels.join(" · ") : "—";
  const wobblePercent = Math.round((state.wobble / WOBBLE_MAX) * 100);
  stabilityFill.style.width = `${Math.min(100, wobblePercent)}%`;
  stabilityMeter.setAttribute("aria-valuenow", String(Math.min(100, wobblePercent)));
  if (wobblePercent < 20) {
    stabilityNote.textContent = "Plate is steady.";
  } else if (wobblePercent < 55) {
    stabilityNote.textContent = "Gentle sway building.";
  } else if (wobblePercent < 80) {
    stabilityNote.textContent = "Tower is tense—prep a nudge.";
  } else {
    stabilityNote.textContent = "Critical wobble! Immediate action.";
  }
}

function updateTempoIndicator() {
  tempoIndicator.textContent = `Tempo: ${state.tempo}`;
}

function updateNextCallout() {
  if (!state.running) {
    nextCallout.hidden = state.stack.length === 0;
    if (state.stack.length === 0) {
      nextCallout.hidden = true;
    } else {
      nextCallout.textContent = "Service paused.";
    }
    return;
  }
  if (!state.pendingType) {
    nextCallout.hidden = true;
    return;
  }
  const seconds = Math.max(0, state.launchTimer) / 1000;
  const eta = seconds > 0.2 ? `${seconds.toFixed(1)}s` : "now";
  nextCallout.textContent = `Next: ${state.pendingType.name} (${state.pendingType.callout}) in ${eta}`;
  nextCallout.hidden = false;
}

function performNudge() {
  if (!state.running || state.stack.length === 0) {
    statusChannel("No stack to nudge yet—catch a pancake first!", "info");
    return;
  }
  state.nudgeCount += 1;
  const wobbleRatio = state.wobble / WOBBLE_MAX;
  const failureChance = Math.max(0.08, 0.22 + wobbleRatio * 0.5);
  const roll = Math.random();
  if (roll < failureChance) {
    state.riskyNudges += 1;
    collapseTower("Nudge backfires—the tower snaps!", "danger");
    addLog("Nudge failed. Stack crashes instantly!", "danger");
    return;
  }
  const correction = state.stackLean * 0.6;
  state.stackLean -= correction;
  state.stackLeanVelocity *= 0.2;
  const wobbleDrop = 18 + wobbleRatio * 22;
  state.wobble = Math.max(0, state.wobble - wobbleDrop);
  state.wobblePeak = Math.max(state.wobblePeak, state.wobble);
  statusChannel("Nudge lands. Stack steadies for a beat.", "success");
  addLog(`Nudge success. Wobble eased by ${Math.round(wobbleDrop)}%.`, "success");
  particleSystem.emitSparkle(0.95);
}

function collapseTower(message, tone = "danger") {
  if (!state.running) {
    return;
  }
  state.running = false;
  nudgeButton.disabled = true;
  startButton.disabled = false;
  state.collapseReason = message;
  statusChannel(message, tone);
  addLog("Service complete. Cleaning syrup everywhere.");
  particleSystem.emitBurst(1.6);
  particleSystem.emitSparkle(1.1);
  if (kitchenStage) {
    kitchenStage.classList.remove("is-shaking");
    void kitchenStage.offsetWidth; // reflow
    kitchenStage.classList.add("is-shaking");
  }
  window.setTimeout(() => {
    showWrapup();
  }, 620);
}

function showWrapup() {
  const finalHeight = Math.round(getStackHeightPx() / PX_PER_CM);
  wrapupHeight.textContent = `${finalHeight} cm`;
  wrapupTotal.textContent = String(state.pancakesServed);
  wrapupRisk.textContent = state.nudgeCount > 0 ? `${state.nudgeCount} nudges` : "None";
  wrapupSubtitle.textContent = state.collapseReason ?? "Service closed.";
  wrapupPhoto.hidden = !state.bestSnapshot;
  wrapupPhoto.src = state.bestSnapshot ?? "";
  wrapupPhotoCaption.textContent = state.bestSnapshot
    ? `Tallest tower: ${state.highestHeightCm} cm`
    : "No tower captured.";
  wrapup.hidden = false;
  const meta = {
    pancakes: state.pancakesServed,
    nudges: state.nudgeCount,
    tempo: state.tempo,
  };
  highScore.submit(state.highestHeightCm, meta);
}

function hideWrapup() {
  wrapup.hidden = true;
}

function getStackHeightPx() {
  return state.stack.reduce((sum, pancake) => sum + pancake.type.thickness * (1 - pancake.compression), 0);
}

function captureSnapshot() {
  try {
    state.bestSnapshot = canvas.toDataURL("image/png");
  } catch (error) {
    // ignore capture errors (e.g., memory pressure)
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawKitchenElements();
  drawStack();
  drawFalling();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#0f172a");
  gradient.addColorStop(0.4, "#111827");
  gradient.addColorStop(1, "#1f2937");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawKitchenElements() {
  ctx.save();
  ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
  ctx.fillRect(0, FLOOR_Y + 8, canvas.width, canvas.height - FLOOR_Y - 8);
  const counterGrad = ctx.createLinearGradient(0, FLOOR_Y - 16, 0, FLOOR_Y + 32);
  counterGrad.addColorStop(0, "#f97316");
  counterGrad.addColorStop(1, "#7c2d12");
  ctx.fillStyle = counterGrad;
  ctx.fillRect(-20, FLOOR_Y - 12, canvas.width + 40, 60);
  ctx.restore();
  drawPlate();
}

function drawRoundedRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function drawPlate() {
  ctx.save();
  ctx.translate(state.plateX, FLOOR_Y);
  const plateGradient = ctx.createLinearGradient(-PLATE_WIDTH / 2, 0, PLATE_WIDTH / 2, PLATE_HEIGHT);
  plateGradient.addColorStop(0, "rgba(56, 189, 248, 0.7)");
  plateGradient.addColorStop(1, "rgba(59, 130, 246, 0.45)");
  ctx.fillStyle = plateGradient;
  drawRoundedRect(ctx, -PLATE_WIDTH / 2, -PLATE_HEIGHT, PLATE_WIDTH, PLATE_HEIGHT * 1.2, 12);
  ctx.fill();
  ctx.fillStyle = "rgba(30, 64, 175, 0.25)";
  drawRoundedRect(ctx, -PLATE_WIDTH / 2 + 12, -PLATE_HEIGHT * 0.9, PLATE_WIDTH - 24, PLATE_HEIGHT * 0.7, 10);
  ctx.fill();
  ctx.restore();
}

function drawStack() {
  let stackY = FLOOR_Y;
  state.stack.forEach((pancake) => {
    const effectiveThickness = pancake.type.thickness * (1 - pancake.compression);
    stackY -= effectiveThickness;
    const centerX = state.plateX + state.stackLean + pancake.offset;
    drawPancake(centerX, stackY, pancake);
  });
}

function drawPancake(x, y, pancake) {
  const { type } = pancake;
  const width = type.width * (1 - pancake.compression * 0.2);
  const height = type.thickness * (1 - pancake.compression * 0.5);
  const ellipseHeight = height * 0.45;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(pancake.rotation ?? 0);
  const sideGradient = ctx.createLinearGradient(0, -height / 2, 0, height / 2);
  sideGradient.addColorStop(0, type.colors.sideTop);
  sideGradient.addColorStop(1, type.colors.sideBottom);
  ctx.fillStyle = sideGradient;
  ctx.fillRect(-width / 2, -height / 2, width, height);
  ctx.fillStyle = type.colors.bottom ?? type.colors.sideBottom;
  ctx.beginPath();
  ctx.ellipse(0, height / 2, width / 2, ellipseHeight, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = type.colors.top;
  ctx.beginPath();
  ctx.ellipse(0, -height / 2, width / 2, ellipseHeight, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(15, 23, 42, 0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, -height / 2, width / 2, ellipseHeight, 0, 0, Math.PI * 2);
  ctx.stroke();
  if ((pancake.stress ?? 0) > STACK_SHAKE_THRESHOLD) {
    drawStressLines(width, height, pancake);
  }
  ctx.restore();
}

function drawStressLines(width, height, pancake) {
  ctx.save();
  ctx.strokeStyle = "rgba(248, 113, 113, 0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  const segments = 3;
  for (let i = 0; i < segments; i += 1) {
    const offsetX = -width / 2 + (i + 0.5) * (width / segments);
    ctx.moveTo(offsetX, -height / 2);
    ctx.lineTo(offsetX + (Math.random() - 0.5) * 8, -height / 2 - 10);
  }
  ctx.stroke();
  ctx.restore();
}

function drawFalling() {
  if (!state.falling) {
    return;
  }
  const pancake = state.falling;
  const width = pancake.type.width;
  const height = pancake.type.thickness;
  const ellipseHeight = height * 0.45;
  ctx.save();
  ctx.translate(pancake.x, pancake.y);
  ctx.rotate(pancake.rotation);
  const sideGradient = ctx.createLinearGradient(0, -height / 2, 0, height / 2);
  sideGradient.addColorStop(0, pancake.type.colors.sideTop);
  sideGradient.addColorStop(1, pancake.type.colors.sideBottom);
  ctx.fillStyle = sideGradient;
  ctx.fillRect(-width / 2, -height / 2, width, height);
  ctx.fillStyle = pancake.type.colors.bottom ?? pancake.type.colors.sideBottom;
  ctx.beginPath();
  ctx.ellipse(0, height / 2, width / 2, ellipseHeight, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pancake.type.colors.top;
  ctx.beginPath();
  ctx.ellipse(0, -height / 2, width / 2, ellipseHeight, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function addLog(message, tone = "info") {
  logChannel.push(message, tone);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
*** End of File ***
