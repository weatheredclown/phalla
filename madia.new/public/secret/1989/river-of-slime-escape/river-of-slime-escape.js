import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { mountParticleField } from "../particles.js";
import { autoEnhanceFeedback, createLogChannel, createStatusChannel } from "../feedback.js";

const particleField = mountParticleField({
  container: document.body,
  density: 0.00016,
  colors: ["#ff5dc8", "#38bdf8", "#80ffea", "#f472b6"],
  effects: {
    palette: ["#ff5dc8", "#facc15", "#38bdf8", "#fb7185"],
    ambientDensity: 0.45,
    zIndex: 30,
  },
});

autoEnhanceFeedback({
  statusSelectors: ["#status-readout"],
  logSelectors: ["#event-log"],
});

const scoreConfig = getScoreConfig("river-of-slime-escape");
const highScore = initHighScoreBanner({
  gameId: "river-of-slime-escape",
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

const GRID_COLS = 14;
const GRID_VISIBLE_ROWS = 26;
const CELL_SIZE = 20;
const PLAYER_RADIUS = 0.32;
const BASE_SPEED = 3.1;
const BOOST_SPEED = 1.55;
const TARGET_ALTITUDE = 210;
const QUICK_BURST_COST = 12;
const QUICK_BURST_POWER = 3.6;
const SLIME_BASE_SPEED = 0.34;
const SLIME_ACCELERATION = 0.045;
const FREEZE_DURATION = 5.5;
const FREEZE_DAMPING = 0.12;
const WEAK_COLLAPSE_TIME = 1.4;
const MAX_LOG_ENTRIES = 22;

const collectiblePool = [
  {
    id: "toaster",
    label: "Haunted Toaster",
    description: "Still humming the Jackie Wilson cue—its slime charge doubles morale gains topside.",
    icon: "🥖",
  },
  {
    id: "liberty",
    label: "Mini Statue of Liberty",
    description: "A scale model slick with mood slime. Proof you led with good vibes.",
    icon: "🗽",
  },
  {
    id: "mood-vial",
    label: "Mood Slime Vial",
    description: "Stabilized sample—useful for future positively charged experiments.",
    icon: "🧪",
  },
  {
    id: "ecto-goggles",
    label: "Ecto Goggles Lens",
    description: "Recovered lens keeps spectral drift off the HUD during future runs.",
    icon: "👓",
  },
];

const hazardNotes = {
  pipe: "Pipe burst chars morale. Vent the lane.",
  slime: "Slime surge chewing morale—climb!",
  weak: "Platform cracking. Move!",
};

const wrapupScreen = document.getElementById("wrapup-screen");
const wrapupMeters = document.getElementById("wrapup-meters");
const wrapupMorale = document.getElementById("wrapup-morale");
const wrapupList = document.getElementById("wrapup-collectibles-list");
const playAgainButton = document.getElementById("play-again");
const wrapupCloseButton = document.getElementById("wrapup-close");

const metersValue = document.getElementById("meters-value");
const moraleFill = document.getElementById("morale-fill");
const moraleValue = document.getElementById("morale-value");
const collectiblesValue = document.getElementById("collectibles-value");
const freezeValue = document.getElementById("freeze-value");
const slimeIndicatorFill = document.getElementById("slime-indicator-fill");
const slimeIndicatorText = document.getElementById("slime-indicator-text");

const startButton = document.getElementById("start-run");
const resetButton = document.getElementById("reset-run");
const clearLogButton = document.getElementById("clear-log");
const statusElement = document.getElementById("status-readout");
const logList = document.getElementById("event-log");
const canvas = document.getElementById("game-canvas");
const context = canvas.getContext("2d");

const setStatus = createStatusChannel(statusElement);
const logChannel = createLogChannel(logList, { limit: MAX_LOG_ENTRIES });

const state = {
  rows: [],
  pathColumn: Math.floor(GRID_COLS / 2),
  player: {
    x: Math.floor(GRID_COLS / 2) + 0.5,
    y: 2.5,
    vx: 0,
    vy: 0,
  },
  startAltitude: 2.5,
  morale: 100,
  meters: 0,
  collectibles: [],
  freezeTimer: 0,
  freezeCooldown: 0,
  slimeHeight: -3,
  slimeSpeed: SLIME_BASE_SPEED,
  bestAltitude: 0,
  running: false,
  started: false,
  gameOver: false,
  hitCooldown: 0,
  lastDamageSource: null,
  speedBoostTimer: 0,
  speedBoostValue: 1,
  weakTimers: new Map(),
  hazardContact: new Map(),
  pressed: new Set(),
  lastFrame: performance.now(),
  frameHandle: null,
  difficultyLevel: 0,
  tierThreeCelebrated: false,
};

resizeCanvas();
resetGame();
render(0);

window.addEventListener("resize", resizeCanvas);

const audioState = {
  context: null,
};

function ensureAudio() {
  if (audioState.context) {
    if (audioState.context.state === "suspended") {
      audioState.context.resume();
    }
    return audioState.context;
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }
  audioState.context = new AudioContextClass();
  return audioState.context;
}

function playSquelch() {
  const audioCtx = ensureAudio();
  if (!audioCtx) {
    return;
  }
  const duration = 0.32;
  const buffer = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * duration), audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    const decay = 1 - i / data.length;
    data[i] = (Math.random() * 2 - 1) * decay * 0.8;
  }
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 280;
  filter.Q.value = 0.8;
  const gain = audioCtx.createGain();
  gain.gain.value = 0.9;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  source.start();
  source.stop(audioCtx.currentTime + duration);
}

function playHeroic() {
  const audioCtx = ensureAudio();
  if (!audioCtx) {
    return;
  }
  const now = audioCtx.currentTime;
  const freqs = [392, 523.25, 659.25];
  freqs.forEach((freq, index) => {
    const oscillator = audioCtx.createOscillator();
    oscillator.type = "triangle";
    oscillator.frequency.value = freq;
    const gain = audioCtx.createGain();
    const startGain = 0.18 / (index + 1);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(startGain, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    oscillator.connect(gain);
    gain.connect(audioCtx.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.75);
  });
}

function playTierThreeSurge() {
  const audioCtx = ensureAudio();
  if (!audioCtx) {
    return;
  }
  const now = audioCtx.currentTime;
  const masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(0.0001, now);
  masterGain.gain.exponentialRampToValueAtTime(0.6, now + 0.12);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
  masterGain.connect(audioCtx.destination);

  const bass = audioCtx.createOscillator();
  bass.type = "sawtooth";
  bass.frequency.setValueAtTime(110, now);
  bass.frequency.linearRampToValueAtTime(220, now + 0.5);
  bass.frequency.exponentialRampToValueAtTime(70, now + 1.3);
  bass.connect(masterGain);
  bass.start(now);
  bass.stop(now + 1.3);

  const shimmer = audioCtx.createOscillator();
  shimmer.type = "triangle";
  shimmer.frequency.setValueAtTime(420, now);
  shimmer.frequency.linearRampToValueAtTime(680, now + 0.55);
  shimmer.frequency.exponentialRampToValueAtTime(320, now + 1.3);
  const shimmerGain = audioCtx.createGain();
  shimmerGain.gain.setValueAtTime(0.0001, now);
  shimmerGain.gain.linearRampToValueAtTime(0.26, now + 0.18);
  shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
  shimmer.connect(shimmerGain);
  shimmerGain.connect(masterGain);
  shimmer.start(now);
  shimmer.stop(now + 1.3);

  const noiseBuffer = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * 0.9), audioCtx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseData.length; i += 1) {
    const progress = i / noiseData.length;
    const envelope = (1 - progress) ** 1.8;
    noiseData[i] = (Math.random() * 2 - 1) * envelope * 0.45;
  }
  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  const noiseFilter = audioCtx.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.value = 520;
  noiseFilter.Q.value = 0.85;
  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.42, now + 0.1);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);
  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(masterGain);
  noiseSource.start(now);
  noiseSource.stop(now + 0.95);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) {
      return;
    }
    cleaned = true;
    bass.disconnect();
    shimmer.disconnect();
    shimmerGain.disconnect();
    noiseFilter.disconnect();
    noiseGain.disconnect();
    noiseSource.disconnect();
    masterGain.disconnect();
  };

  bass.onended = cleanup;
  shimmer.onended = cleanup;
  noiseSource.onended = cleanup;
}

startButton.addEventListener("click", () => {
  ensureAudio();
  if (state.running) {
    setStatus("Containment run already live—keep moving!", "info");
    return;
  }
  if (!state.started || state.gameOver) {
    resetGame();
  }
  state.running = true;
  state.started = true;
  state.gameOver = false;
  state.lastFrame = performance.now();
  logEvent("Containment run engaged. Channeling positive vibes.", "success");
  setStatus("Climb! Stay ahead of the slime surge.", "success");
  queueFrame();
});

resetButton.addEventListener("click", () => {
  resetGame();
  setStatus("Shaft recalibrated. Press Start when ready.");
  logEvent("Run reset. Maze reseeded.", "warning");
});

clearLogButton.addEventListener("click", () => {
  logList.innerHTML = "";
  logEvent("Log cleared.", "info");
});

playAgainButton.addEventListener("click", () => {
  hideWrapup();
  resetGame();
  setStatus("Fresh shaft primed. Press Start to run it back.", "success");
});

wrapupCloseButton.addEventListener("click", () => {
  hideWrapup();
  setStatus("Containment report stored. Press Start to try again.");
});

window.addEventListener("keydown", (event) => {
  if (event.defaultPrevented) {
    return;
  }
  const key = event.key.toLowerCase();
  if (key === " " && !event.repeat) {
    event.preventDefault();
    attemptBurst();
    return;
  }
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
    event.preventDefault();
    state.pressed.add(key);
  }
});

window.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
    state.pressed.delete(key);
  }
});

function queueFrame() {
  if (state.frameHandle !== null) {
    return;
  }
  state.frameHandle = window.requestAnimationFrame(step);
}

function step(timestamp) {
  state.frameHandle = null;
  const delta = Math.min((timestamp - state.lastFrame) / 1000, 0.16);
  state.lastFrame = timestamp;
  if (!state.running) {
    return;
  }
  update(delta);
  render(delta);
  if (state.running) {
    queueFrame();
  }
}

function resetGame() {
  state.rows = [];
  state.pathColumn = Math.floor(GRID_COLS / 2);
  state.player.x = state.pathColumn + 0.5;
  state.player.y = 2.5;
  state.player.vx = 0;
  state.player.vy = 0;
  state.startAltitude = state.player.y;
  state.morale = 100;
  state.meters = 0;
  state.collectibles = [];
  state.freezeTimer = 0;
  state.freezeCooldown = 0;
  state.slimeHeight = -3;
  state.slimeSpeed = SLIME_BASE_SPEED;
  state.bestAltitude = 0;
  state.running = false;
  state.started = false;
  state.gameOver = false;
  state.hitCooldown = 0;
  state.lastDamageSource = null;
  state.speedBoostTimer = 0;
  state.speedBoostValue = 1;
  state.weakTimers = new Map();
  state.hazardContact = new Map();
  state.pressed.clear();
  state.difficultyLevel = 0;
  state.tierThreeCelebrated = false;
  document.body.classList.remove("river-tier-three", "river-tier-three-flare");
  generateRowsUntil(140);
  updateHud();
  render(0);
  hideWrapup();
}

function hideWrapup() {
  wrapupScreen.hidden = true;
  wrapupScreen.setAttribute("aria-hidden", "true");
}

function update(delta) {
  updateDifficulty();
  if (state.freezeTimer > 0) {
    state.freezeTimer = Math.max(0, state.freezeTimer - delta);
  }
  if (state.freezeCooldown > 0) {
    state.freezeCooldown = Math.max(0, state.freezeCooldown - delta);
  }
  if (state.speedBoostTimer > 0) {
    state.speedBoostTimer = Math.max(0, state.speedBoostTimer - delta);
    if (state.speedBoostTimer === 0) {
      state.speedBoostValue = 1;
    }
  }
  if (state.hitCooldown > 0) {
    state.hitCooldown = Math.max(0, state.hitCooldown - delta);
  }

  const moveVector = resolveInput();
  const currentCell = getCell(Math.floor(state.player.x), Math.floor(state.player.y));
  let speedMultiplier = 1;
  if (state.speedBoostTimer > 0) {
    speedMultiplier *= state.speedBoostValue;
  }
  if (currentCell?.slowFactor) {
    speedMultiplier *= currentCell.slowFactor;
  }
  const speed = BASE_SPEED * speedMultiplier;

  const proposedX = state.player.x + moveVector.x * speed * delta;
  const proposedY = state.player.y + moveVector.y * speed * delta;
  movePlayer(proposedX, proposedY);

  const altitude = state.player.y - state.startAltitude;
  if (altitude > state.meters) {
    state.meters = altitude;
  }
  if (altitude > state.bestAltitude) {
    state.bestAltitude = altitude;
  }

  updateSlime(delta);
  processWeakPlatforms(delta);
  resolveCellEffects(delta);
  enforceBounds();
  checkEndConditions();
  generateRowsIfNeeded();
  updateHud();
}

function resolveInput() {
  let horizontal = 0;
  let vertical = 0;
  if (state.pressed.has("arrowleft") || state.pressed.has("a")) {
    horizontal -= 1;
  }
  if (state.pressed.has("arrowright") || state.pressed.has("d")) {
    horizontal += 1;
  }
  if (state.pressed.has("arrowup") || state.pressed.has("w")) {
    vertical += 1;
  }
  if (state.pressed.has("arrowdown") || state.pressed.has("s")) {
    vertical -= 1;
  }
  if (horizontal === 0 && vertical === 0) {
    return { x: 0, y: 0 };
  }
  const length = Math.hypot(horizontal, vertical) || 1;
  return { x: horizontal / length, y: vertical / length };
}

function attemptBurst() {
  if (!state.running || state.gameOver) {
    return;
  }
  if (state.morale < QUICK_BURST_COST) {
    setStatus("Morale too low to jolt upward—collect some charge.", "warning");
    return;
  }
  state.player.y += QUICK_BURST_POWER;
  applyMoraleDamage(QUICK_BURST_COST * 0.35, "burst", { silent: true });
  setStatus("Upbeat surge! Quick burst launched you higher.", "success");
  logEvent("Quick burst triggered—altitude spike logged.", "success");
  triggerShake();
  particleField.emitBurst({ x: 0.5, y: 0.75, color: "#80ffea", lift: 320 });
  ensureAudio();
}

function movePlayer(targetX, targetY) {
  const clampedX = clamp(targetX, PLAYER_RADIUS, GRID_COLS - PLAYER_RADIUS);
  const clampedY = Math.max(targetY, state.slimeHeight + PLAYER_RADIUS + 0.1);
  if (isPassable(clampedX, state.player.y)) {
    state.player.x = clampedX;
  }
  if (isPassable(state.player.x, clampedY)) {
    state.player.y = clampedY;
  }
}

function isPassable(x, y) {
  const corners = [
    { x: x - PLAYER_RADIUS, y: y - PLAYER_RADIUS },
    { x: x + PLAYER_RADIUS, y: y - PLAYER_RADIUS },
    { x: x - PLAYER_RADIUS, y: y + PLAYER_RADIUS },
    { x: x + PLAYER_RADIUS, y: y + PLAYER_RADIUS },
  ];
  return corners.every(({ x: px, y: py }) => {
    const cell = getCell(Math.floor(px), Math.floor(py));
    if (!cell) {
      return false;
    }
    return cell.type !== "wall" && cell.type !== "gap";
  });
}

function enforceBounds() {
  state.player.x = clamp(state.player.x, PLAYER_RADIUS, GRID_COLS - PLAYER_RADIUS);
  state.player.y = Math.max(state.player.y, state.slimeHeight + PLAYER_RADIUS + 0.05);
}

function updateSlime(delta) {
  const freezeModifier = state.freezeTimer > 0 ? FREEZE_DAMPING : 1;
  state.slimeHeight += state.slimeSpeed * freezeModifier * delta;
  state.slimeSpeed = SLIME_BASE_SPEED + SLIME_ACCELERATION * state.difficultyLevel;
}

function updateDifficulty() {
  const altitude = state.meters;
  const levels = [0, 40, 90, 140, 190];
  let level = 0;
  for (let i = levels.length - 1; i >= 0; i -= 1) {
    if (altitude >= levels[i]) {
      level = i;
      break;
    }
  }
  if (level !== state.difficultyLevel) {
    state.difficultyLevel = level;
    logEvent(`Slime flow intensifies—difficulty tier ${level + 1}.`, "warning");
    setStatus("Slime tempo increased. Watch the hazard density.", "warning");
    handleDifficultyTierChange(level);
  }
}

function handleDifficultyTierChange(level) {
  if (level >= 2 && !state.tierThreeCelebrated) {
    state.tierThreeCelebrated = true;
    celebrateTierThreeSurge();
  }
}

function processWeakPlatforms(delta) {
  const entries = Array.from(state.weakTimers.entries());
  entries.forEach(([key, timer]) => {
    const updated = timer + delta;
    if (updated >= WEAK_COLLAPSE_TIME) {
      const [rowStr, colStr] = key.split(":");
      const rowIndex = Number.parseInt(rowStr, 10);
      const colIndex = Number.parseInt(colStr, 10);
      const cell = getCell(colIndex, rowIndex);
      if (cell) {
        cell.type = "gap";
        logEvent("Platform crumbled into the slime.", "danger");
        if (Math.floor(state.player.x) === colIndex && Math.floor(state.player.y) === rowIndex) {
          state.player.y = Math.max(state.player.y - 1.2, state.slimeHeight + 0.6);
          applyMoraleDamage(16, "weak");
        }
      }
      state.weakTimers.delete(key);
    } else {
      state.weakTimers.set(key, updated);
    }
  });
}

function resolveCellEffects(delta) {
  const rowIndex = Math.floor(state.player.y);
  const colIndex = Math.floor(state.player.x);
  const cell = getCell(colIndex, rowIndex);
  if (!cell) {
    return;
  }
  const key = `${rowIndex}:${colIndex}`;
  if (cell.type === "hazard" && cell.hazard === "pipe") {
    const severity = 10 * delta;
    applyMoraleDamage(severity, "pipe");
    if (!state.hazardContact.has(key)) {
      logEvent("Gushing pipe scorches morale.", "danger");
      state.hazardContact.set(key, true);
    }
  } else {
    state.hazardContact.delete(key);
  }
  if (cell.type === "weak") {
    if (!state.weakTimers.has(key)) {
      state.weakTimers.set(key, 0);
      logEvent("Catwalk groans underfoot. Move before it drops.", "warning");
    }
  }
  if (cell.collectible) {
    collectItem(cell.collectible);
    delete cell.collectible;
  }
  if (cell.powerup) {
    triggerPowerup(cell.powerup);
    delete cell.powerup;
  }
  if (cell.speedBonus && state.speedBoostTimer <= 0) {
    state.speedBoostTimer = 1.6;
    state.speedBoostValue = BOOST_SPEED;
    logEvent("Shortcut vent propels you upward.", "success");
    setStatus("Shortcut boost engaged—ride it while it lasts!", "success");
    particleField.emitSparkle({ x: 0.5, y: 0.5, palette: ["#80ffea", "#38bdf8"] });
  }
  if (state.player.y - PLAYER_RADIUS <= state.slimeHeight + 0.1) {
    applyMoraleDamage(28 * delta, "slime");
  }
}

function collectItem(item) {
  if (state.collectibles.find((entry) => entry.id === item.id)) {
    logEvent(`${item.icon} Duplicate ${item.label} fizzles—already logged.`, "info");
    return;
  }
  state.collectibles.push(item);
  logEvent(`${item.icon} Collected ${item.label}.`, "success");
  setStatus(`Recovered ${item.label}. Keep morale high!`, "success");
  particleField.emitSparkle({ x: 0.45 + Math.random() * 0.1, y: 0.4, palette: ["#facc15", "#ff5dc8", "#80ffea"] });
}

function triggerPowerup(powerup) {
  if (powerup.type === "freeze") {
    state.freezeTimer = FREEZE_DURATION;
    state.freezeCooldown = FREEZE_DURATION + 5;
    freezeValue.textContent = "Active";
    logEvent("Proton blast freezes the slime surge!", "success");
    setStatus("Slime frozen—sprint through the lattice!", "success");
    particleField.emitBurst({ x: 0.5, y: 0.3, color: "#80ffea", lift: 360 });
    playHeroic();
  }
}

function celebrateTierThreeSurge() {
  logEvent("Level 3 psycho-reactive surge ignites neon arcs overhead.", "warning");
  setStatus("Level 3 surge! Slime lightning crackles—stay aggressive!", "warning");
  const body = document.body;
  if (body) {
    body.classList.add("river-tier-three");
    body.classList.add("river-tier-three-flare");
    window.setTimeout(() => {
      body.classList.remove("river-tier-three-flare");
    }, 900);
  }
  for (let index = 0; index < 3; index += 1) {
    window.setTimeout(() => {
      const strength = 1.45 + index * 0.25;
      particleField.emitBurst(strength);
      particleField.emitSparkle(1.3 + index * 0.2);
    }, index * 160);
  }
  playTierThreeSurge();
}

function applyMoraleDamage(amount, source, { silent = false } = {}) {
  if (amount <= 0) {
    return;
  }
  state.morale = clamp(state.morale - amount, 0, 100);
  updateHud();
  const shouldReact = !silent && (state.hitCooldown <= 0 || state.lastDamageSource !== source);
  if (shouldReact) {
    state.hitCooldown = 0.4;
    state.lastDamageSource = source;
    triggerShake();
    playSquelch();
    flashHit();
    if (source && hazardNotes[source]) {
      setStatus(hazardNotes[source], "danger");
    }
  }
}

function triggerShake() {
  document.body.classList.add("is-shaking");
  window.setTimeout(() => {
    document.body.classList.remove("is-shaking");
  }, 360);
}

function flashHit() {
  document.body.classList.add("is-hit");
  window.setTimeout(() => {
    document.body.classList.remove("is-hit");
  }, 240);
}

function updateHud() {
  metersValue.textContent = `${Math.floor(state.meters)} m`;
  moraleFill.style.transform = `scaleX(${Math.max(state.morale, 0) / 100})`;
  moraleValue.textContent = `${Math.round(state.morale)}%`;
  collectiblesValue.textContent = String(state.collectibles.length);
  if (state.freezeTimer > 0) {
    freezeValue.textContent = `${state.freezeTimer.toFixed(1)}s`;
  } else if (state.freezeCooldown > 0) {
    freezeValue.textContent = `Cooldown ${state.freezeCooldown.toFixed(1)}s`;
  } else {
    freezeValue.textContent = "Ready";
  }
  const buffer = state.player.y - state.slimeHeight;
  const clamped = clamp(buffer / 14, 0, 1);
  slimeIndicatorFill.style.transform = `scaleX(${clamped})`;
  if (buffer < 3) {
    slimeIndicatorText.textContent = `Slime ${buffer.toFixed(1)}m below!`;
    slimeIndicatorText.dataset.statusTone = "danger";
  } else if (buffer < 6) {
    slimeIndicatorText.textContent = `Only ${buffer.toFixed(1)}m cushion.`;
    slimeIndicatorText.dataset.statusTone = "warning";
  } else {
    slimeIndicatorText.textContent = "Stable buffer";
    slimeIndicatorText.dataset.statusTone = "info";
  }
}

function render() {
  if (!context) {
    return;
  }
  const ratio = window.devicePixelRatio || 1;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  const viewportHeight = GRID_VISIBLE_ROWS * CELL_SIZE;
  const viewportWidth = GRID_COLS * CELL_SIZE;
  context.clearRect(0, 0, viewportWidth, viewportHeight);
  const cameraBase = Math.max(0, state.player.y - GRID_VISIBLE_ROWS * 0.45);

  drawBackground(context, viewportWidth, viewportHeight);
  drawGrid(context, cameraBase);
  drawCollectibles(context, cameraBase);
  drawSlime(context, cameraBase, viewportWidth, viewportHeight);
  drawPlayer(context, cameraBase);
  drawOverlays(context, cameraBase);
}

function drawBackground(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "rgba(8, 12, 26, 0.95)");
  gradient.addColorStop(0.65, "rgba(8, 10, 22, 0.98)");
  gradient.addColorStop(1, "rgba(12, 16, 32, 0.95)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function drawGrid(ctx, cameraBase) {
  const startRow = Math.floor(cameraBase);
  const endRow = startRow + GRID_VISIBLE_ROWS + 2;
  for (let row = startRow; row <= endRow; row += 1) {
    const rowData = getRow(row);
    if (!rowData) {
      continue;
    }
    for (let col = 0; col < GRID_COLS; col += 1) {
      const cell = rowData[col];
      if (!cell || cell.type === "wall") {
        drawWallCell(ctx, row, col, cameraBase);
      } else if (cell.type === "floor" || cell.type === "hazard" || cell.type === "weak") {
        drawFloorCell(ctx, row, col, cameraBase, cell);
      }
    }
  }
}

function drawCollectibles(ctx, cameraBase) {
  const startRow = Math.floor(cameraBase);
  const endRow = startRow + GRID_VISIBLE_ROWS + 2;
  ctx.font = "14px 'Press Start 2P', monospace";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  for (let row = startRow; row <= endRow; row += 1) {
    const rowData = getRow(row);
    if (!rowData) {
      continue;
    }
    for (let col = 0; col < GRID_COLS; col += 1) {
      const cell = rowData[col];
      if (!cell) {
        continue;
      }
      if (cell.collectible) {
        const { x, y } = cellRect(row, col, cameraBase);
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.fillText(cell.collectible.icon, x + CELL_SIZE / 2, y + CELL_SIZE / 2 + 2);
      }
      if (cell.powerup?.type === "freeze") {
        const { x, y } = cellRect(row, col, cameraBase);
        ctx.fillStyle = "rgba(128, 255, 234, 0.9)";
        ctx.beginPath();
        ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, CELL_SIZE * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(56, 189, 248, 0.9)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }
}

function drawWallCell(ctx, row, col, cameraBase) {
  const { x, y } = cellRect(row, col, cameraBase);
  ctx.fillStyle = "rgba(12, 16, 32, 0.95)";
  ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
  ctx.strokeStyle = "rgba(31, 42, 68, 0.75)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
}

function drawFloorCell(ctx, row, col, cameraBase, cell) {
  const { x, y } = cellRect(row, col, cameraBase);
  const base = ctx.createLinearGradient(x, y, x, y + CELL_SIZE);
  base.addColorStop(0, "rgba(20, 28, 48, 0.9)");
  base.addColorStop(1, "rgba(15, 22, 40, 0.85)");
  ctx.fillStyle = base;
  ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
  ctx.strokeStyle = "rgba(128, 255, 234, 0.25)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
  if (cell.type === "hazard" && cell.hazard === "pipe") {
    const glow = ctx.createRadialGradient(
      x + CELL_SIZE / 2,
      y + CELL_SIZE / 2,
      2,
      x + CELL_SIZE / 2,
      y + CELL_SIZE / 2,
      CELL_SIZE * 0.5,
    );
    glow.addColorStop(0, "rgba(255, 93, 200, 0.8)");
    glow.addColorStop(1, "rgba(255, 93, 200, 0.1)");
    ctx.fillStyle = glow;
    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
  }
  if (cell.type === "weak") {
    ctx.strokeStyle = "rgba(250, 204, 21, 0.75)";
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 4);
    ctx.lineTo(x + CELL_SIZE - 4, y + CELL_SIZE - 4);
    ctx.moveTo(x + CELL_SIZE - 4, y + 4);
    ctx.lineTo(x + 4, y + CELL_SIZE - 4);
    ctx.stroke();
  }
  if (cell.speedBonus) {
    ctx.strokeStyle = "rgba(128, 255, 234, 0.65)";
    ctx.beginPath();
    ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, CELL_SIZE * 0.35, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (cell.slowFactor) {
    ctx.fillStyle = "rgba(255, 93, 200, 0.18)";
    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
  }
}

function drawSlime(ctx, cameraBase, width, height) {
  const slimeTop = state.slimeHeight - cameraBase;
  const pixelTop = height - slimeTop * CELL_SIZE;
  const gradient = ctx.createLinearGradient(0, pixelTop, 0, height);
  gradient.addColorStop(0, "rgba(255, 93, 200, 0.78)");
  gradient.addColorStop(0.65, "rgba(246, 70, 180, 0.72)");
  gradient.addColorStop(1, "rgba(35, 8, 32, 0.95)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, pixelTop, width, height - pixelTop);
  ctx.strokeStyle = "rgba(128, 255, 234, 0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, pixelTop);
  for (let x = 0; x <= width; x += 12) {
    const wave = Math.sin((performance.now() / 200 + x) * 0.04) * 6;
    ctx.lineTo(x, pixelTop + wave);
  }
  ctx.lineTo(width, pixelTop);
  ctx.stroke();
}

function drawPlayer(ctx, cameraBase) {
  const x = state.player.x * CELL_SIZE;
  const yOffset = state.player.y - cameraBase;
  const pixelY = (GRID_VISIBLE_ROWS - yOffset) * CELL_SIZE;
  ctx.fillStyle = "rgba(128, 255, 234, 0.92)";
  ctx.beginPath();
  ctx.arc(x, pixelY, CELL_SIZE * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(56, 189, 248, 0.9)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "rgba(255, 93, 200, 0.9)";
  ctx.beginPath();
  ctx.arc(x, pixelY - CELL_SIZE * 0.18, CELL_SIZE * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

function drawOverlays(ctx, cameraBase) {
  const altitude = Math.floor(state.player.y - state.startAltitude);
  const text = `${altitude} m`;
  ctx.font = "16px 'Spline Sans', 'Segoe UI', sans-serif";
  ctx.fillStyle = "rgba(248, 250, 252, 0.8)";
  ctx.fillText(text, 12, 24);
  const diff = state.player.y - state.slimeHeight;
  ctx.fillStyle = diff < 4 ? "rgba(255, 93, 200, 0.85)" : "rgba(128, 255, 234, 0.7)";
  ctx.fillText(`${diff.toFixed(1)}m buffer`, 12, 44);
}

function cellRect(row, col, cameraBase) {
  const x = col * CELL_SIZE;
  const y = (GRID_VISIBLE_ROWS - (row - cameraBase + 1)) * CELL_SIZE;
  return { x, y };
}

function generateRowsIfNeeded() {
  const topNeeded = Math.ceil(state.player.y + GRID_VISIBLE_ROWS * 0.75);
  generateRowsUntil(topNeeded + 20);
}

function generateRowsUntil(targetRow) {
  for (let i = state.rows.length; i <= targetRow; i += 1) {
    state.rows[i] = generateRow(i);
  }
}

function generateRow(index) {
  const row = new Array(GRID_COLS).fill(null).map(() => ({ type: "wall" }));
  if (index === 0) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      row[col] = createFloorCell();
    }
    return row;
  }
  const driftOptions = [-1, 0, 0, 1];
  if (state.difficultyLevel >= 2) {
    driftOptions.push(-2, 2);
  }
  const drift = randomChoice(driftOptions);
  state.pathColumn = clamp(state.pathColumn + drift, 2, GRID_COLS - 3);
  const difficulty = resolveRowDifficulty(index);
  const corridorWidth = difficulty.corridorWidth;
  const half = Math.floor(corridorWidth / 2);
  for (let offset = -half; offset <= half; offset += 1) {
    const col = clamp(state.pathColumn + offset, 0, GRID_COLS - 1);
    row[col] = createFloorCell();
    if (difficulty.addSlow && Math.random() < 0.25) {
      row[col].slowFactor = 0.7;
    }
  }
  if (Math.random() < difficulty.branchChance) {
    const dir = Math.random() < 0.5 ? -1 : 1;
    const branchCol = clamp(state.pathColumn + dir * (half + 1), 1, GRID_COLS - 2);
    row[branchCol] = createFloorCell({ branch: true, speedBonus: BOOST_SPEED });
  }
  if (Math.random() < difficulty.hazardRate) {
    const hazardCol = clamp(state.pathColumn + randomChoice([-half, 0, half]), 1, GRID_COLS - 2);
    row[hazardCol] = {
      type: "hazard",
      hazard: "pipe",
    };
  }
  if (Math.random() < difficulty.weakRate) {
    const weakCol = clamp(state.pathColumn + randomChoice([-half, half]), 1, GRID_COLS - 2);
    row[weakCol] = {
      type: "weak",
    };
  }
  if (Math.random() < difficulty.collectibleRate) {
    const candidateCols = row
      .map((cell, colIndex) => ({ cell, colIndex }))
      .filter(({ cell }) => cell.type !== "wall" && !cell.collectible && !cell.powerup);
    if (candidateCols.length > 0) {
      const pick = randomChoice(candidateCols);
      row[pick.colIndex].collectible = randomChoice(collectiblePool);
    }
  }
  if (difficulty.freezeChance > 0 && Math.random() < difficulty.freezeChance) {
    const safeCols = row
      .map((cell, colIndex) => ({ cell, colIndex }))
      .filter(({ cell }) => cell.type === "floor");
    if (safeCols.length > 0) {
      const pick = randomChoice(safeCols);
      row[pick.colIndex].powerup = { type: "freeze" };
    }
  }
  return row;
}

function createFloorCell(overrides = {}) {
  return {
    type: "floor",
    slowFactor: 0,
    ...overrides,
  };
}

function resolveRowDifficulty(index) {
  if (index < 30) {
    return {
      corridorWidth: 5,
      hazardRate: 0.06,
      weakRate: 0.04,
      collectibleRate: 0.09,
      freezeChance: 0.05,
      branchChance: 0.15,
      addSlow: true,
    };
  }
  if (index < 80) {
    return {
      corridorWidth: 4,
      hazardRate: 0.1,
      weakRate: 0.08,
      collectibleRate: 0.11,
      freezeChance: 0.05,
      branchChance: 0.22,
      addSlow: true,
    };
  }
  if (index < 140) {
    return {
      corridorWidth: 3,
      hazardRate: 0.16,
      weakRate: 0.12,
      collectibleRate: 0.12,
      freezeChance: 0.06,
      branchChance: 0.26,
      addSlow: false,
    };
  }
  if (index < 220) {
    return {
      corridorWidth: 3,
      hazardRate: 0.22,
      weakRate: 0.18,
      collectibleRate: 0.14,
      freezeChance: 0.08,
      branchChance: 0.3,
      addSlow: false,
    };
  }
  return {
    corridorWidth: 2,
    hazardRate: 0.28,
    weakRate: 0.22,
    collectibleRate: 0.16,
    freezeChance: 0.1,
    branchChance: 0.32,
    addSlow: false,
  };
}

function getCell(col, row) {
  const rowData = getRow(row);
  if (!rowData) {
    return null;
  }
  return rowData[col] ?? null;
}

function getRow(row) {
  if (row < 0) {
    return null;
  }
  if (!state.rows[row]) {
    state.rows[row] = generateRow(row);
  }
  return state.rows[row];
}

function checkEndConditions() {
  if (state.morale <= 0) {
    completeRun({
      success: false,
      message: "Morale drained to zero. The slime reclaimed the shaft.",
    });
    return;
  }
  if (state.meters >= TARGET_ALTITUDE) {
    completeRun({
      success: true,
      message: "Containment crew breached street level!",
    });
  }
}

function completeRun({ success, message }) {
  state.running = false;
  state.gameOver = true;
  setStatus(message, success ? "success" : "danger");
  logEvent(message, success ? "success" : "danger");
  freezeValue.textContent = "Ready";
  const finalMeters = Math.floor(state.meters);
  wrapupMeters.textContent = String(finalMeters);
  wrapupMorale.textContent = success
    ? `Escaped with ${Math.round(state.morale)}% morale remaining.`
    : "The slime surge overtook the climb.";
  wrapupList.innerHTML = "";
  if (state.collectibles.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No artifacts recovered—play bold to find them.";
    wrapupList.append(li);
  } else {
    state.collectibles.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = `${item.icon} ${item.label} — ${item.description}`;
      wrapupList.append(li);
    });
  }
  wrapupScreen.hidden = false;
  wrapupScreen.setAttribute("aria-hidden", "false");
  particleField.emitBurst({ x: 0.5, y: 0.4, color: success ? "#80ffea" : "#ff5dc8", lift: success ? 420 : 220 });
  highScore.submit(finalMeters, {
    morale: Math.round(state.morale),
    collectibles: state.collectibles.length,
    outcome: success ? "escaped" : "overtaken",
  });
}

function logEvent(message, tone = "info") {
  logChannel.push(message, tone);
}

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = GRID_COLS * CELL_SIZE * ratio;
  canvas.height = GRID_VISIBLE_ROWS * CELL_SIZE * ratio;
  canvas.style.width = `${GRID_COLS * CELL_SIZE}px`;
  canvas.style.height = `${GRID_VISIBLE_ROWS * CELL_SIZE}px`;
  if (context) {
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.imageSmoothingEnabled = false;
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function randomChoice(list) {
  return list[Math.floor(Math.random() * list.length)];
}

window.addEventListener("beforeunload", () => {
  particleField.destroy?.();
});
