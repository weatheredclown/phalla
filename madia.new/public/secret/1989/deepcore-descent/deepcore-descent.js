import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { mountParticleField } from "../particles.js";
import { autoEnhanceFeedback, createLogChannel, createStatusChannel } from "../feedback.js";

const particleField = mountParticleField({
  container: document.body,
  density: 0.00014,
  colors: ["#38bdf8", "#22d3ee", "#94f0ff", "#1e3a8a"],
  effects: {
    palette: ["#22d3ee", "#38bdf8", "#60a5fa", "#0ea5e9"],
    ambientDensity: 0.4,
    zIndex: 20,
  },
});

autoEnhanceFeedback({
  statusSelectors: ["#status-readout"],
  logSelectors: ["#event-log"],
});

const scoreConfig = getScoreConfig("deepcore-descent");
const highScore = initHighScoreBanner({
  gameId: "deepcore-descent",
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

const canvas = document.getElementById("game-canvas");
const context = canvas.getContext("2d");

const stageFrame = document.getElementById("stage-frame");
const startButton = document.getElementById("start-run");
const resetButton = document.getElementById("reset-run");
const clearLogButton = document.getElementById("clear-log");
const statusElement = document.getElementById("status-readout");
const logList = document.getElementById("event-log");
const wrapupScreen = document.getElementById("wrapup-screen");
const wrapupDepth = document.getElementById("wrapup-depth");
const wrapupLog = document.getElementById("wrapup-log");
const wrapupClose = document.getElementById("wrapup-close");
const playAgainButton = document.getElementById("play-again");

wrapupScreen.setAttribute("tabindex", "-1");

const depthValue = document.getElementById("depth-value");
const maxDepthValue = document.getElementById("max-depth-value");
const hullFill = document.getElementById("hull-fill");
const hullValue = document.getElementById("hull-value");
const hullCrack = document.getElementById("hull-crack");
const oxygenFill = document.getElementById("oxygen-fill");
const oxygenValue = document.getElementById("oxygen-value");
const fuelFill = document.getElementById("fuel-fill");
const fuelValue = document.getElementById("fuel-value");
const currentValue = document.getElementById("current-value");
const currentNote = document.getElementById("current-note");

const setStatus = createStatusChannel(statusElement);
const logChannel = createLogChannel(logList, { limit: 20 });

const SUB_RADIUS = 14;
const GRAVITY = 28;
const BASE_THRUST = 42;
const LATERAL_THRUST = 26;
const BRAKE_FORCE = 32;
const DRAG = 0.93;
const OXYGEN_DRAIN_PER_SECOND = 0.85;
const FUEL_DRAIN_PER_THRUST = 0.45;
const POWER_BURST_COST = 22;
const POWER_BURST_FORCE = 200;
const POWER_BURST_DURATION = 0.7;
const POWER_BURST_DRIFT = 65;
const POWER_BURST_COOLDOWN = 3.2;
const CURRENT_SHIFT_INTERVAL = [5.5, 9.5];
const CURRENT_FORCE_RANGE = { x: [-34, 34], y: [-22, 18] };
const MAX_DEPTH_FOR_WIDTH = 4200;
const PICKUP_COUNT = 12;
const PICKUP_RADIUS = 12;
const MAX_LOG_HISTORY = 36;

const state = {
  running: false,
  started: false,
  gameOver: false,
  sub: {
    x: canvas.width / 2,
    y: 0,
    vx: 0,
    vy: 0,
  },
  hull: 100,
  oxygen: 100,
  fuel: 100,
  depth: 0,
  maxDepth: 0,
  current: { x: 0, y: 0, strength: 0 },
  nextCurrentShift: 0,
  keys: new Set(),
  powerBurstTimer: 0,
  powerBurstCooldown: 0,
  powerBurstCount: 0,
  history: [],
  shakeTimer: 0,
  shakeIntensity: 0,
  lastFrame: performance.now(),
  cameraY: 0,
  pickups: [],
  oxygenAlarm: false,
  breathingActive: false,
  frameHandle: null,
};

const audioState = {
  context: null,
  alarmInterval: null,
  breathingSource: null,
  breathingGain: null,
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

function playCollisionSound(intensity = 1) {
  const audioCtx = ensureAudio();
  if (!audioCtx) {
    return;
  }
  const duration = 0.35;
  const buffer = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * duration), audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    const t = i / data.length;
    const decay = (1 - t) ** 2;
    data[i] = (Math.random() * 2 - 1) * decay * 0.6 * Math.min(intensity, 2.2);
  }
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 360;
  filter.Q.value = 1.2;
  const gain = audioCtx.createGain();
  gain.gain.value = 0.95 * Math.min(intensity, 1.6);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  source.start();
  source.stop(audioCtx.currentTime + duration);
}

function playBurstSound() {
  const audioCtx = ensureAudio();
  if (!audioCtx) {
    return;
  }
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(110, audioCtx.currentTime);
  oscillator.frequency.linearRampToValueAtTime(280, audioCtx.currentTime + 0.3);
  gain.gain.value = 0.0001;
  gain.gain.exponentialRampToValueAtTime(0.4, audioCtx.currentTime + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
  oscillator.connect(gain);
  gain.connect(audioCtx.destination);
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.65);
}

function playPickupSound(type) {
  const audioCtx = ensureAudio();
  if (!audioCtx) {
    return;
  }
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  oscillator.type = "triangle";
  const base = type === "oxygen" ? 420 : 300;
  oscillator.frequency.setValueAtTime(base, audioCtx.currentTime);
  oscillator.frequency.linearRampToValueAtTime(base + 180, audioCtx.currentTime + 0.2);
  gain.gain.value = 0.001;
  gain.gain.exponentialRampToValueAtTime(0.25, audioCtx.currentTime + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
  oscillator.connect(gain);
  gain.connect(audioCtx.destination);
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.45);
}

function startOxygenAlarm() {
  const audioCtx = ensureAudio();
  if (!audioCtx || audioState.alarmInterval) {
    return;
  }
  const beep = () => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "square";
    osc.frequency.value = 520;
    gain.gain.value = 0.0001;
    gain.gain.exponentialRampToValueAtTime(0.28, audioCtx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.28);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  };
  beep();
  audioState.alarmInterval = window.setInterval(beep, 900);
}

function stopOxygenAlarm() {
  if (audioState.alarmInterval) {
    window.clearInterval(audioState.alarmInterval);
    audioState.alarmInterval = null;
  }
}

function startBreathingLoop() {
  const audioCtx = ensureAudio();
  if (!audioCtx || audioState.breathingSource) {
    return;
  }
  const duration = 3.2;
  const buffer = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * duration), audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    const t = (i / audioCtx.sampleRate) % duration;
    let envelope = 0;
    if (t < 1.2) {
      const inhale = t / 1.2;
      envelope = inhale ** 3;
    } else if (t < 2.4) {
      envelope = 1 - (t - 1.2) / 1.2;
    } else {
      const hold = (t - 2.4) / 0.8;
      envelope = Math.max(0, 0.35 - hold * 0.35);
    }
    const noise = Math.random() * 2 - 1;
    data[i] = noise * envelope * 0.25;
  }
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const gain = audioCtx.createGain();
  gain.gain.value = 0.18;
  source.connect(gain);
  gain.connect(audioCtx.destination);
  source.start();
  audioState.breathingSource = source;
  audioState.breathingGain = gain;
}

function stopBreathingLoop() {
  if (audioState.breathingSource) {
    try {
      audioState.breathingSource.stop();
    } catch (error) {
      // ignore stop errors
    }
    audioState.breathingSource.disconnect();
    audioState.breathingSource = null;
    if (audioState.breathingGain) {
      audioState.breathingGain.disconnect();
      audioState.breathingGain = null;
    }
  }
}

function logEvent(message, tone = "info") {
  logChannel.push(message, tone);
  state.history.push({ message, tone, depth: Math.floor(state.depth) });
  if (state.history.length > MAX_LOG_HISTORY) {
    state.history.shift();
  }
}

function clearHistory() {
  state.history = [];
}

function setShake(intensity) {
  state.shakeTimer = 0.45;
  state.shakeIntensity = Math.min(10, Math.max(state.shakeIntensity, intensity));
  stageFrame.classList.add("is-shaking");
}

function updateShake(dt) {
  if (state.shakeTimer <= 0) {
    stageFrame.classList.remove("is-shaking");
    state.shakeIntensity = 0;
    return;
  }
  state.shakeTimer -= dt;
  if (state.shakeTimer <= 0) {
    stageFrame.classList.remove("is-shaking");
    state.shakeIntensity = 0;
  }
}

function updateCrackOverlay() {
  if (state.hull <= 70) {
    hullCrack.classList.add("is-active");
  } else {
    hullCrack.classList.remove("is-active");
  }
}

function getTunnelBounds(depth) {
  const t = depth / MAX_DEPTH_FOR_WIDTH;
  const clampT = Math.min(1, Math.max(0, t));
  const baseWidth = 220 - clampT * 120;
  const breathing = 30 * Math.sin(depth * 0.003) + 20 * Math.sin(depth * 0.0016 + 1.2);
  const width = Math.max(110, baseWidth + breathing);
  const center = canvas.width / 2 + 50 * Math.sin(depth * 0.0012) + 30 * Math.sin(depth * 0.0021 + 2.4);
  const left = center - width / 2;
  const right = center + width / 2;
  return { left, right, width };
}

function generatePickups() {
  state.pickups = [];
  for (let i = 0; i < PICKUP_COUNT; i += 1) {
    const depth = 180 + i * 220 + Math.random() * 160;
    const type = Math.random() < 0.5 ? "oxygen" : "fuel";
    const bounds = getTunnelBounds(depth);
    const margin = 26;
    const x = bounds.left + margin + Math.random() * Math.max(20, bounds.width - margin * 2);
    state.pickups.push({ id: `pickup-${i}`, type, x, depth, collected: false });
  }
}

function resetGame() {
  cancelAnimationFrame(state.frameHandle);
  state.running = false;
  state.started = false;
  state.gameOver = false;
  wrapupScreen.hidden = true;
  state.sub.x = canvas.width / 2;
  state.sub.y = -40;
  state.sub.vx = 0;
  state.sub.vy = 0;
  state.hull = 100;
  state.oxygen = 100;
  state.fuel = 100;
  state.depth = 0;
  state.maxDepth = 0;
  state.current = { x: 0, y: 0, strength: 0 };
  state.nextCurrentShift = 0;
  state.keys.clear();
  state.powerBurstTimer = 0;
  state.powerBurstCooldown = 0;
  state.powerBurstCount = 0;
  state.shakeTimer = 0;
  state.shakeIntensity = 0;
  state.cameraY = -200;
  state.lastFrame = performance.now();
  state.history = [];
  state.oxygenAlarm = false;
  state.breathingActive = false;
  stageFrame.classList.remove("is-shaking", "is-bursting");
  stopOxygenAlarm();
  stopBreathingLoop();
  generatePickups();
  updateHud();
  render();
  setStatus("Initiate the descent when ready.", "neutral");
}

function startGame() {
  if (state.running) {
    return;
  }
  ensureAudio();
  state.running = true;
  state.started = true;
  state.gameOver = false;
  state.lastFrame = performance.now();
  logEvent("Deepcore released. Begin controlled descent.", "info");
  setStatus("Maintain vector. Monitor hull stress.", "info");
  loop();
}

function endRun(reason, tone = "warning") {
  if (state.gameOver) {
    return;
  }
  state.running = false;
  state.gameOver = true;
  cancelAnimationFrame(state.frameHandle);
  stopOxygenAlarm();
  stopBreathingLoop();
  stageFrame.classList.remove("is-shaking", "is-bursting");
  const finalDepth = Math.floor(state.maxDepth);
  logEvent(`Mission terminated: ${reason}.`, tone);
  setStatus(`Recovery in progress. Final depth ${finalDepth} m.`, tone);
  wrapupDepth.textContent = `${finalDepth}`;
  wrapupLog.innerHTML = "";
  state.history.forEach((entry) => {
    const item = document.createElement("li");
    const depthNote = Number.isFinite(entry.depth) ? ` @ ${entry.depth} m` : "";
    item.textContent = `${entry.message}${depthNote}`;
    item.dataset.tone = entry.tone;
    wrapupLog.append(item);
  });
  wrapupScreen.hidden = false;
  if (typeof wrapupScreen.focus === "function") {
    wrapupScreen.focus({ preventScroll: true });
  }
  highScore.submit(finalDepth, {
    hull: Math.max(0, Math.round(state.hull)),
    oxygen: Math.max(0, Math.round(state.oxygen)),
    fuel: Math.max(0, Math.round(state.fuel)),
    powerBursts: state.powerBurstCount,
  });
}

function loop() {
  state.frameHandle = requestAnimationFrame(loop);
  const now = performance.now();
  const dt = Math.min((now - state.lastFrame) / 1000, 0.12);
  state.lastFrame = now;
  update(dt);
  render();
}

function update(dt) {
  updateShake(dt);
  if (!state.running) {
    return;
  }

  state.powerBurstCooldown = Math.max(0, state.powerBurstCooldown - dt);
  if (state.nextCurrentShift <= 0) {
    shiftCurrent();
  } else {
    state.nextCurrentShift -= dt;
  }

  applyForces(dt);
  applyMovement(dt);
  consumeResources(dt);
  checkPickups();
  updateHud();
  evaluateCritical();
}

function applyForces(dt) {
  const sub = state.sub;
  sub.vy += GRAVITY * dt;
  sub.vx *= DRAG;
  sub.vy *= DRAG;
  sub.vx += state.current.x * dt;
  sub.vy += state.current.y * dt;

  if (state.powerBurstTimer > 0) {
    sub.vy -= POWER_BURST_FORCE * dt;
    sub.vx += (Math.random() * 2 - 1) * POWER_BURST_DRIFT * dt;
    state.powerBurstTimer -= dt;
    if (state.powerBurstTimer <= 0) {
      stageFrame.classList.remove("is-bursting");
      setStatus("Power Burst dissipated. Hull cooling.", "info");
    }
  }

  const usingFuel = state.fuel > 0;
  const thrustScale = usingFuel ? 1 : 0.2;

  if (state.keys.has("ArrowUp") || state.keys.has("KeyW")) {
    sub.vy -= BASE_THRUST * dt * thrustScale;
    if (usingFuel) {
      state.fuel = Math.max(0, state.fuel - FUEL_DRAIN_PER_THRUST * dt * 1.4);
    }
  }
  if (state.keys.has("ArrowLeft") || state.keys.has("KeyA")) {
    sub.vx -= LATERAL_THRUST * dt * thrustScale;
    if (usingFuel) {
      state.fuel = Math.max(0, state.fuel - FUEL_DRAIN_PER_THRUST * dt);
    }
  }
  if (state.keys.has("ArrowRight") || state.keys.has("KeyD")) {
    sub.vx += LATERAL_THRUST * dt * thrustScale;
    if (usingFuel) {
      state.fuel = Math.max(0, state.fuel - FUEL_DRAIN_PER_THRUST * dt);
    }
  }
  if (state.keys.has("ArrowDown") || state.keys.has("KeyS")) {
    sub.vy += BRAKE_FORCE * dt * thrustScale;
    if (usingFuel) {
      state.fuel = Math.max(0, state.fuel - FUEL_DRAIN_PER_THRUST * dt * 0.6);
    }
  }
}

function applyMovement(dt) {
  const sub = state.sub;
  sub.x += sub.vx * dt;
  sub.y += sub.vy * dt;
  state.depth = Math.max(0, sub.y);
  state.maxDepth = Math.max(state.maxDepth, state.depth);
  state.cameraY = state.depth - 140;

  const bounds = getTunnelBounds(sub.y);
  const leftLimit = bounds.left + SUB_RADIUS;
  const rightLimit = bounds.right - SUB_RADIUS;
  if (sub.x < leftLimit) {
    const impact = Math.abs(sub.vx) + Math.abs(sub.vy) * 0.2;
    sub.x = leftLimit;
    sub.vx = Math.abs(sub.vx) * 0.2;
    handleCollision("wall", impact);
  } else if (sub.x > rightLimit) {
    const impact = Math.abs(sub.vx) + Math.abs(sub.vy) * 0.2;
    sub.x = rightLimit;
    sub.vx = -Math.abs(sub.vx) * 0.2;
    handleCollision("wall", impact);
  }

  if (sub.y < -100) {
    sub.y = -100;
    sub.vy = 0;
  }

  if (checkObstacleCollision(sub)) {
    // collision handled inside
  }
}

function checkObstacleCollision(sub) {
  let collided = false;
  const rockCount = 16;
  for (let i = 0; i < rockCount; i += 1) {
    const depth = Math.floor(sub.y / 90) * 90 + i * 24;
    const bounds = getTunnelBounds(depth);
    const rockSeed = Math.sin(depth * 0.12 + i);
    const rockWidth = 18 + Math.abs(rockSeed) * 42;
    const rockHeight = 20 + Math.abs(Math.cos(depth * 0.06 + i)) * 55;
    const offset = (Math.sin(depth * 0.021 + i * 0.5) + 1) / 2;
    const leftRockX = bounds.left + rockWidth * 0.4 + offset * 40;
    const rightRockX = bounds.right - rockWidth * 0.4 - offset * 40;
    const isTop = i % 3 === 0;
    const y = depth + (isTop ? -rockHeight * 0.6 : rockHeight * 0.6);
    const x = i % 2 === 0 ? leftRockX : rightRockX;
    const dx = sub.x - x;
    const dy = sub.y - y;
    const halfW = rockWidth / 2;
    const halfH = rockHeight / 2;
    if (Math.abs(dx) < SUB_RADIUS + halfW && Math.abs(dy) < SUB_RADIUS + halfH) {
      const impact = Math.hypot(sub.vx, sub.vy) * 0.4 + 0.6;
      sub.vx += dx > 0 ? 18 * dtClamp(impact) : -18 * dtClamp(impact);
      sub.vy += dy > 0 ? 10 * dtClamp(impact) : -10 * dtClamp(impact);
      handleCollision("rock", impact);
      collided = true;
    }
  }
  return collided;
}

function dtClamp(value) {
  return Math.min(1.2, Math.max(0.2, value));
}

function handleCollision(type, impact) {
  const damage = Math.min(35, 9 + impact * 12);
  state.hull = Math.max(0, state.hull - damage);
  updateCrackOverlay();
  playCollisionSound(Math.min(2.5, 0.4 + impact));
  setShake(Math.min(8, impact * 5));
  const depth = Math.floor(state.depth);
  logEvent(`Collision at ${depth} m (${type}). Hull down ${Math.round(damage)}%.`, "danger");
  if (state.hull <= 0) {
    endRun("Hull integrity lost", "danger");
  }
}

function consumeResources(dt) {
  state.oxygen = Math.max(0, state.oxygen - OXYGEN_DRAIN_PER_SECOND * dt);
  if (!state.running) {
    return;
  }
  if (state.oxygen <= 0) {
    endRun("Oxygen depleted", "danger");
  }
  if (state.fuel <= 0) {
    state.fuel = 0;
  }
}

function checkPickups() {
  const sub = state.sub;
  state.pickups.forEach((pickup) => {
    if (pickup.collected) {
      return;
    }
    const dx = sub.x - pickup.x;
    const dy = sub.y - pickup.depth;
    if (Math.hypot(dx, dy) < SUB_RADIUS + PICKUP_RADIUS) {
      pickup.collected = true;
      if (pickup.type === "oxygen") {
        state.oxygen = Math.min(100, state.oxygen + 18);
        logEvent(`Oxygen canister collected at ${Math.floor(pickup.depth)} m.`, "success");
      } else {
        state.fuel = Math.min(100, state.fuel + 22);
        logEvent(`Fuel cell recovered at ${Math.floor(pickup.depth)} m.`, "success");
      }
      playPickupSound(pickup.type);
    }
  });
}

function updateHud() {
  depthValue.textContent = `${Math.floor(state.depth)} m`;
  maxDepthValue.textContent = `Max ${Math.floor(state.maxDepth)} m`;
  hullFill.style.transform = `scaleX(${Math.max(0, state.hull) / 100})`;
  hullValue.textContent = `${Math.round(state.hull)}%`;
  oxygenFill.style.transform = `scaleX(${Math.max(0, state.oxygen) / 100})`;
  oxygenValue.textContent = `${Math.round(state.oxygen)}%`;
  fuelFill.style.transform = `scaleX(${Math.max(0, state.fuel) / 100})`;
  fuelValue.textContent = `${Math.round(state.fuel)}%`;
  const strength = Math.hypot(state.current.x, state.current.y);
  if (strength < 6) {
    currentValue.textContent = "Calm drift";
    currentNote.textContent = "Stabilizers nominal";
  } else if (strength < 18) {
    currentValue.textContent = "Shear rising";
    currentNote.textContent = "Trim fins, adjust";
  } else {
    currentValue.textContent = "Rip current";
    currentNote.textContent = "Power Burst may be required";
  }
}

function evaluateCritical() {
  if (state.oxygen <= 25 && !state.oxygenAlarm) {
    startOxygenAlarm();
    startBreathingLoop();
    state.oxygenAlarm = true;
    logEvent("Oxygen critical. Alarm cycling.", "warning");
    setStatus("Oxygen reserve below 25%. Locate canisters or surface.", "warning");
  } else if (state.oxygen > 32 && state.oxygenAlarm) {
    stopOxygenAlarm();
    stopBreathingLoop();
    state.oxygenAlarm = false;
    logEvent("Oxygen stable again.", "info");
    setStatus("Alarm cleared. Maintain descent.", "info");
  }
}

function shiftCurrent() {
  const duration = CURRENT_SHIFT_INTERVAL[0] + Math.random() * (CURRENT_SHIFT_INTERVAL[1] - CURRENT_SHIFT_INTERVAL[0]);
  state.nextCurrentShift = duration;
  const x = lerp(CURRENT_FORCE_RANGE.x[0], CURRENT_FORCE_RANGE.x[1], Math.random());
  const y = lerp(CURRENT_FORCE_RANGE.y[0], CURRENT_FORCE_RANGE.y[1], Math.random());
  state.current = { x: x / 40, y: y / 40, strength: Math.hypot(x, y) };
  if (state.current.strength > 18) {
    logEvent("Violent current detected. Brace for drift.", "warning");
    setStatus("Rip current on sensors. Hold vector or burst clear!", "warning");
  } else if (state.current.strength > 9) {
    logEvent("Lateral current pushing the hull.", "info");
  } else {
    logEvent("Calmer pocket located.", "positive");
  }
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function activatePowerBurst() {
  if (state.powerBurstCooldown > 0 || state.fuel < POWER_BURST_COST || !state.running) {
    return;
  }
  state.fuel = Math.max(0, state.fuel - POWER_BURST_COST);
  state.powerBurstTimer = POWER_BURST_DURATION;
  state.powerBurstCooldown = POWER_BURST_COOLDOWN;
  state.powerBurstCount += 1;
  stageFrame.classList.add("is-bursting");
  playBurstSound();
  logEvent(`Power Burst engaged at ${Math.floor(state.depth)} m.`, "warning");
  setStatus("Thrusters overloaded! Control sensitivity reduced.", "danger");
}

function handleKeydown(event) {
  if (event.repeat) {
    return;
  }
  state.keys.add(event.code);
  if (event.code === "Space") {
    event.preventDefault();
    activatePowerBurst();
  }
}

function handleKeyup(event) {
  state.keys.delete(event.code);
}

function render() {
  const ctx = context;
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const camY = state.cameraY;
  const depth = state.sub.y;
  const darkness = Math.min(0.86, depth / 3200);
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, `rgba(4, 14, 37, ${0.72 + darkness * 0.15})`);
  gradient.addColorStop(1, `rgba(1, 4, 18, ${0.92 + darkness * 0.08})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawTunnel(ctx, camY);
  drawPickups(ctx, camY);
  drawSubmersible(ctx, camY);
  drawParticles(ctx, camY);

  ctx.restore();
}

function drawTunnel(ctx, camY) {
  ctx.save();
  ctx.translate(0, -camY);
  const step = 32;
  ctx.fillStyle = "rgba(12, 30, 48, 0.9)";
  ctx.strokeStyle = "rgba(14, 116, 144, 0.28)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let depth = camY - 80; depth < camY + canvas.height + 200; depth += step) {
    if (depth < -200) {
      continue;
    }
    const bounds = getTunnelBounds(depth);
    const nextBounds = getTunnelBounds(depth + step);
    ctx.moveTo(bounds.left, depth);
    ctx.lineTo(bounds.left, depth + step);
    ctx.lineTo(nextBounds.left, depth + step);
    ctx.lineTo(nextBounds.left, depth + step + 2);
  }
  ctx.stroke();
  ctx.beginPath();
  for (let depth = camY - 80; depth < camY + canvas.height + 200; depth += step) {
    if (depth < -200) {
      continue;
    }
    const bounds = getTunnelBounds(depth);
    const nextBounds = getTunnelBounds(depth + step);
    ctx.moveTo(bounds.right, depth);
    ctx.lineTo(bounds.right, depth + step);
    ctx.lineTo(nextBounds.right, depth + step);
    ctx.lineTo(nextBounds.right, depth + step + 2);
  }
  ctx.stroke();

  ctx.fillStyle = "rgba(8, 23, 38, 0.9)";
  for (let depth = camY - 100; depth < camY + canvas.height + 160; depth += step) {
    if (depth < -200) {
      continue;
    }
    const bounds = getTunnelBounds(depth);
    const noise = Math.sin(depth * 0.07) * 24;
    ctx.beginPath();
    ctx.ellipse(bounds.left - 12, depth + noise, 16, 24, 0, 0, Math.PI * 2);
    ctx.ellipse(bounds.right + 12, depth - noise, 16, 24, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPickups(ctx, camY) {
  ctx.save();
  ctx.translate(0, -camY);
  state.pickups.forEach((pickup) => {
    if (pickup.collected) {
      return;
    }
    if (pickup.depth < camY - 80 || pickup.depth > camY + canvas.height + 80) {
      return;
    }
    ctx.beginPath();
    if (pickup.type === "oxygen") {
      ctx.fillStyle = "rgba(56, 189, 248, 0.85)";
      ctx.strokeStyle = "rgba(14, 165, 233, 0.8)";
    } else {
      ctx.fillStyle = "rgba(96, 165, 250, 0.85)";
      ctx.strokeStyle = "rgba(34, 197, 94, 0.8)";
    }
    ctx.lineWidth = 2;
    ctx.arc(pickup.x, pickup.depth, PICKUP_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle = "rgba(241, 245, 249, 0.9)";
    ctx.lineWidth = 1.5;
    ctx.arc(pickup.x, pickup.depth, PICKUP_RADIUS - 5, Math.PI * 0.2, Math.PI * 1.6);
    ctx.stroke();
  });
  ctx.restore();
}

function drawSubmersible(ctx, camY) {
  ctx.save();
  ctx.translate(0, -camY);
  const { x, y, vx, vy } = state.sub;
  ctx.translate(x, y);
  const angle = Math.atan2(vy, vx * 0.5);
  ctx.rotate(angle * 0.08);
  const hullGradient = ctx.createLinearGradient(-20, -20, 20, 30);
  hullGradient.addColorStop(0, "#0ea5e9");
  hullGradient.addColorStop(1, "#082f49");
  ctx.fillStyle = hullGradient;
  ctx.strokeStyle = "rgba(226, 243, 255, 0.8)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-22, -10);
  ctx.quadraticCurveTo(0, -26, 22, -10);
  ctx.quadraticCurveTo(30, 4, 16, 18);
  ctx.quadraticCurveTo(0, 24, -16, 18);
  ctx.quadraticCurveTo(-30, 4, -22, -10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Viewport
  ctx.beginPath();
  ctx.fillStyle = "rgba(191, 219, 254, 0.85)";
  ctx.arc(0, -2, 10, 0, Math.PI * 2);
  ctx.fill();

  // Thrusters glow
  const thrusterStrength = state.keys.size > 0 ? 0.8 : 0.3;
  ctx.fillStyle = `rgba(56, 189, 248, ${0.4 + thrusterStrength * 0.5})`;
  ctx.beginPath();
  ctx.ellipse(-18, 10, 6, 12, Math.PI / 8, 0, Math.PI * 2);
  ctx.ellipse(18, 10, 6, 12, -Math.PI / 8, 0, Math.PI * 2);
  ctx.fill();

  if (state.powerBurstTimer > 0) {
    ctx.fillStyle = "rgba(14, 165, 233, 0.85)";
    ctx.beginPath();
    ctx.moveTo(-18, 16);
    ctx.lineTo(-8, 36 + Math.random() * 6);
    ctx.lineTo(8, 36 + Math.random() * 6);
    ctx.lineTo(18, 16);
    ctx.closePath();
    ctx.fill();
  }

  // Headlights
  const beam = ctx.createRadialGradient(0, -6, 2, 0, -6, 120);
  beam.addColorStop(0, "rgba(191, 219, 254, 0.45)");
  beam.addColorStop(0.6, "rgba(59, 130, 246, 0.15)");
  beam.addColorStop(1, "rgba(14, 23, 42, 0)");
  ctx.fillStyle = beam;
  ctx.globalCompositeOperation = "lighter";
  ctx.beginPath();
  ctx.moveTo(-8, -4);
  ctx.quadraticCurveTo(-4, -50, 0, -120);
  ctx.quadraticCurveTo(4, -50, 8, -4);
  ctx.closePath();
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";

  ctx.restore();
}

function drawParticles(ctx, camY) {
  ctx.save();
  ctx.translate(0, -camY);
  const count = 60;
  for (let i = 0; i < count; i += 1) {
    const depth = state.depth + (i / count) * 260;
    const x = (Math.sin(depth * 0.12 + i) + 1) * 0.5 * canvas.width;
    const y = depth + Math.sin(depth * 0.33 + i) * 12;
    ctx.fillStyle = `rgba(148, 233, 255, ${0.08 + (i / count) * 0.12})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.4 + (i % 4) * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

startButton.addEventListener("click", () => {
  if (!state.started) {
    clearHistory();
  }
  startGame();
});

resetButton.addEventListener("click", () => {
  resetGame();
  logEvent("Systems reset. Awaiting launch.", "info");
});

clearLogButton.addEventListener("click", () => {
  logList.innerHTML = "";
  clearHistory();
});

wrapupClose.addEventListener("click", () => {
  wrapupScreen.hidden = true;
  resetGame();
});

playAgainButton.addEventListener("click", () => {
  wrapupScreen.hidden = true;
  resetGame();
  startGame();
});

window.addEventListener("keydown", handleKeydown);
window.addEventListener("keyup", handleKeyup);

wrapupScreen.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    wrapupScreen.hidden = true;
    resetGame();
  }
});

resetGame();
render();
