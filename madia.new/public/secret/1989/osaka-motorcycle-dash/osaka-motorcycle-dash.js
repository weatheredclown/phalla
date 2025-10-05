import { mountParticleField } from "../particles.js";
import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { autoEnhanceFeedback, createLogChannel, createStatusChannel } from "../feedback.js";

const particleSystem = mountParticleField({
  density: 0.0002,
  effects: {
    palette: ["#38bdf8", "#f472b6", "#facc15", "#6366f1"],
    ambientDensity: 0.65,
  },
});

const scoreConfig = getScoreConfig("osaka-motorcycle-dash");
const highScore = initHighScoreBanner({
  gameId: "osaka-motorcycle-dash",
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

autoEnhanceFeedback();

const WORLD_WIDTH = 640;
const WORLD_HEIGHT = 360;
const PROXIMITY_RADIUS = 110;
const SAFE_RADIUS = PROXIMITY_RADIUS * 1.35;
const BASE_PLAYER_SPEED = 170;
const BOOST_MULTIPLIER = 1.35;
const BOOST_DRAIN_PER_SECOND = 34;
const BOOST_GAIN_PER_SECOND = 28;
const OUT_OF_RANGE_DAMAGE = 14;
const LOSS_OF_CONTACT_LIMIT = 4.2;
const COLLISION_DAMAGE = 18;
const DISABLER_COST = 18;
const DISABLER_RANGE = 150;
const HALO_PULSE_INTERVAL = 1.1;
const WARMUP_DURATION = 6;
const WARMUP_OUT_OF_RANGE_MULTIPLIER = 0.35;
const WARMUP_COLLISION_MULTIPLIER = 0.55;
const WARMUP_LOSS_THRESHOLD_BONUS = 2.5;

const chaseField = document.getElementById("chase-field");
const witnessElement = document.getElementById("witness");
const witnessGlow = witnessElement.querySelector(".witness-glow");
const proximityRing = document.getElementById("proximity-ring");
const playerElement = document.getElementById("player");
const hazardsLayer = document.getElementById("hazards");
const disablerEffects = document.getElementById("disabler-effects");

const distanceValue = document.getElementById("distance-value");
const healthFill = document.getElementById("health-fill");
const healthValue = document.getElementById("health-value");
const boostFill = document.getElementById("boost-fill");
const boostValue = document.getElementById("boost-value");
const proximityFill = document.getElementById("proximity-fill");
const proximityState = document.getElementById("proximity-state");
const phaseIndicator = document.getElementById("phase-indicator");

const statusBar = document.getElementById("status-bar");
const eventLogElement = document.getElementById("event-log");

const startButton = document.getElementById("start-chase");
const resetButton = document.getElementById("reset-chase");
const boostButton = document.getElementById("boost-button");
const disablerButton = document.getElementById("disabler-button");

const wrapUp = document.getElementById("wrap-up");
const wrapUpDistance = document.getElementById("wrap-up-distance");
const wrapUpDisabled = document.getElementById("wrap-up-disabled");
const wrapUpStreak = document.getElementById("wrap-up-streak");
const wrapUpNote = document.getElementById("wrap-up-note");
const replayButton = document.getElementById("replay-button");
const closeWrapUp = document.getElementById("close-wrap-up");

const setStatus = createStatusChannel(statusBar);
const log = createLogChannel(eventLogElement, { limit: 20 });

const ROUTE = [
  {
    id: "setup",
    label: "Mido-suji Setup",
    length: 260,
    speed: 118,
    vector: { x: 0, y: -1 },
    spawn: { traffic: [2.4, 3.4], gang: [6.4, 8.2] },
  },
  {
    id: "alley",
    label: "Dotonbori Weave",
    length: 320,
    speed: 132,
    vector: { x: -0.35, y: -1 },
    spawn: { traffic: [1.6, 2.4], gang: [4.8, 6.2] },
  },
  {
    id: "skyway",
    label: "Umeda Skyway",
    length: 360,
    speed: 146,
    vector: { x: 0.42, y: -1 },
    spawn: { traffic: [1.1, 1.8], gang: [3.6, 5] },
  },
];

const FINAL_SEGMENT = {
  id: "finale",
  label: "Express Breakout",
  speed: 158,
  vector: { x: 0.16, y: -1 },
  spawn: { traffic: [0.9, 1.4], gang: [3.1, 4.4] },
};

const keys = new Set();

let animationId = null;
let audioContext = null;
let boostActive = false;
let haloPulseTimeout = null;
let nextHaloPulseAt = HALO_PULSE_INTERVAL;
let impactTimeoutId = null;

const state = {
  running: false,
  lastTimestamp: 0,
  distance: 0,
  health: 100,
  boost: 60,
  witness: {
    x: WORLD_WIDTH / 2,
    y: WORLD_HEIGHT * 0.72,
    segmentIndex: 0,
    progress: 0,
    speed: ROUTE[0].speed,
  },
  player: {
    x: WORLD_WIDTH / 2 - 28,
    y: WORLD_HEIGHT * 0.9,
    vx: 0,
    vy: 0,
  },
  hazards: new Map(),
  hazardId: 0,
  disabledCount: 0,
  longestStreak: 0,
  currentStreak: 0,
  outOfRangeTime: 0,
  warningCooldown: 0,
  disablerCooldown: 0,
  boostHeld: false,
  spawnTimers: {
    traffic: 0,
    gang: 0,
  },
  activePhase: ROUTE[0],
  finale: false,
  reason: "",
  graceTimer: 0,
};

function resetState() {
  stopAnimation();
  state.running = false;
  state.distance = 0;
  state.health = 100;
  state.boost = 60;
  state.disabledCount = 0;
  state.longestStreak = 0;
  state.currentStreak = 0;
  state.outOfRangeTime = 0;
  state.warningCooldown = 0;
  state.disablerCooldown = 0;
  state.boostHeld = false;
  state.witness = {
    x: WORLD_WIDTH / 2,
    y: WORLD_HEIGHT * 0.72,
    segmentIndex: 0,
    progress: 0,
    speed: ROUTE[0].speed,
  };
  state.player = {
    x: WORLD_WIDTH / 2 - 28,
    y: WORLD_HEIGHT * 0.9,
    vx: 0,
    vy: 0,
  };
  state.hazards.forEach((hazard) => hazard.element.remove());
  state.hazards.clear();
  state.hazardId = 0;
  state.spawnTimers = {
    traffic: 1.6,
    gang: 6,
  };
  state.activePhase = ROUTE[0];
  state.finale = false;
  state.reason = "";
  state.graceTimer = WARMUP_DURATION;
  disablerEffects?.replaceChildren?.();
  setSpeedFx(false);
  clearHaloPulse();
  nextHaloPulseAt = HALO_PULSE_INTERVAL;
  window.clearTimeout(impactTimeoutId);
  impactTimeoutId = null;
  chaseField.classList.remove("is-impact");
  updateHud();
  updatePositions();
  updateProximityVisual(0);
  phaseIndicator.textContent = `Phase: ${state.activePhase.label}`;
  setStatus("Awaiting your signal. Stay sharp.", "info");
  boostButton.setAttribute("aria-pressed", "false");
  playerElement.dataset.boost = "false";
}

resetState();

function startChase() {
  if (state.running) {
    return;
  }
  hideWrapUp();
  resetState();
  state.running = true;
  state.lastTimestamp = performance.now();
  setStatus("Ride tight. Keep the witness in your halo and bank that boost.", "info");
  log.push("Engines hot. Witness rolling north on Mido-suji.", "info");
  log.push("Warm-up window active—loss penalties softened while you sync up.", "info");
  requestAnimationFrame(loop);
}

function stopAnimation() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

function loop(timestamp) {
  if (!state.running) {
    return;
  }
  const delta = Math.min(0.12, (timestamp - state.lastTimestamp) / 1000);
  state.lastTimestamp = timestamp;

  updateWitness(delta);
  updatePlayer(delta);
  updateHazards(delta);
  updateTimers(delta);
  updateHud();

  animationId = requestAnimationFrame(loop);
}

function updateWitness(delta) {
  const phase = getCurrentPhase();
  state.activePhase = phase;
  if (phase) {
    phaseIndicator.textContent = `Phase: ${phase.label}`;
  } else {
    phaseIndicator.textContent = "Phase: --";
  }

  const segment = phase === FINAL_SEGMENT ? null : phase;
  const vector = (segment ?? FINAL_SEGMENT).vector;
  const speed = (segment ?? FINAL_SEGMENT).speed;
  state.witness.speed = speed;

  const moveX = vector.x * speed * delta;
  const moveY = vector.y * speed * delta;
  state.witness.x += moveX;
  state.witness.y += moveY;
  state.distance += Math.sqrt(moveX * moveX + moveY * moveY);

  if (segment) {
    state.witness.progress += Math.sqrt(moveX * moveX + moveY * moveY);
    if (state.witness.progress >= segment.length) {
      advanceSegment();
    }
  }

  updatePositions();
}

function getCurrentPhase() {
  if (state.finale) {
    return FINAL_SEGMENT;
  }
  const segment = ROUTE[state.witness.segmentIndex];
  return segment ?? FINAL_SEGMENT;
}

function advanceSegment() {
  const previous = ROUTE[state.witness.segmentIndex];
  state.witness.segmentIndex += 1;
  state.witness.progress = 0;
  const next = ROUTE[state.witness.segmentIndex];
  if (!next) {
    if (!state.finale) {
      state.finale = true;
      log.push("Skyway engaged. Express Breakout online—traffic density max.", "warning");
      setStatus("Finale! Elevated lanes collapsing. Stay glued to the halo.", "warning");
      state.spawnTimers.traffic = 1.2;
      state.spawnTimers.gang = 3.5;
    }
    return;
  }
  log.push(`Phase clear: ${previous.label}. ${next.label} ahead.`, "info");
  setStatus(`${next.label}. Narrow alleys and hotter hostiles.`, "warning");
  state.spawnTimers.traffic = randomBetween(...next.spawn.traffic);
  state.spawnTimers.gang = randomBetween(...next.spawn.gang);
}

function updatePlayer(delta) {
  const boosting = state.boostHeld && state.boost > 20;
  const acceleration = BASE_PLAYER_SPEED * (boosting ? BOOST_MULTIPLIER : 1);
  let inputX = 0;
  let inputY = 0;
  if (keys.has("arrowleft") || keys.has("a")) {
    inputX -= 1;
  }
  if (keys.has("arrowright") || keys.has("d")) {
    inputX += 1;
  }
  if (keys.has("arrowup") || keys.has("w")) {
    inputY -= 1;
  }
  if (keys.has("arrowdown") || keys.has("s")) {
    inputY += 1;
  }
  const magnitude = Math.hypot(inputX, inputY);
  let speedMultiplier = 1;
  if (magnitude > 0) {
    const normX = inputX / magnitude;
    const normY = inputY / magnitude;
    state.player.x += normX * acceleration * delta;
    state.player.y += normY * acceleration * delta;
  } else {
    speedMultiplier = 0.82;
  }

  if (state.boostHeld && state.boost > 0) {
    state.boost = Math.max(0, state.boost - BOOST_DRAIN_PER_SECOND * delta);
  }

  playerElement.dataset.boost = boosting ? "true" : "false";
  setSpeedFx(boosting);

  clampPlayerPosition();
  updatePositions();
  updateProximity(delta);
}

function clampPlayerPosition() {
  state.player.x = clamp(state.player.x, 40, WORLD_WIDTH - 40);
  state.player.y = clamp(state.player.y, WORLD_HEIGHT * 0.35, WORLD_HEIGHT - 30);
}

function updateProximity(delta) {
  const dx = state.player.x - state.witness.x;
  const dy = state.player.y - state.witness.y;
  const distance = Math.hypot(dx, dy);
  const ratio = clamp(1 - distance / SAFE_RADIUS, 0, 1);
  const warmupRatio = getWarmupRatio();
  const penaltyMultiplier = warmupScale(WARMUP_OUT_OF_RANGE_MULTIPLIER);
  const lossThreshold = LOSS_OF_CONTACT_LIMIT + WARMUP_LOSS_THRESHOLD_BONUS * warmupRatio;

  updateProximityVisual(ratio);

  if (distance <= PROXIMITY_RADIUS) {
    state.currentStreak += delta;
    state.longestStreak = Math.max(state.longestStreak, state.currentStreak);
    if (state.currentStreak <= delta * 1.2 || state.currentStreak >= nextHaloPulseAt) {
      pulseHalo();
      nextHaloPulseAt = state.currentStreak + HALO_PULSE_INTERVAL;
    }
    state.outOfRangeTime = Math.max(0, state.outOfRangeTime - delta * 0.8);
    state.boost = Math.min(100, state.boost + BOOST_GAIN_PER_SECOND * delta);
    witnessElement.classList.remove("out-of-range");
    witnessGlow.style.opacity = "0.65";
  } else {
    if (state.currentStreak > 0.5) {
      log.push(`Proximity streak ended at ${(state.currentStreak).toFixed(1)}s.`, "warning");
    }
    state.currentStreak = 0;
    nextHaloPulseAt = HALO_PULSE_INTERVAL;
    clearHaloPulse();
    state.outOfRangeTime += delta * penaltyMultiplier;
    const damage = OUT_OF_RANGE_DAMAGE * penaltyMultiplier * delta;
    state.health = Math.max(0, state.health - damage);
    witnessElement.classList.add("out-of-range");
    witnessGlow.style.opacity = "0.35";
    if (state.outOfRangeTime >= lossThreshold) {
      endChase("Loss of contact penalty triggered. Witness vanished into the crowd.", "danger");
      return;
    }
    if (state.warningCooldown <= 0) {
      playWarningTone();
      state.warningCooldown = 1.4;
      setStatus("Halo unstable! Close the gap before the witness is gone.", "danger");
    }
  }

  if (state.health <= 0) {
    endChase("Bike integrity failed. Crash on the expressway.", "danger");
  }
}

function updateProximityVisual(ratio) {
  proximityFill.style.transform = `scaleX(${ratio.toFixed(3)})`;
  if (ratio >= 0.75) {
    proximityState.textContent = "Linked";
    proximityRing.dataset.state = "stable";
  } else if (ratio >= 0.45) {
    proximityState.textContent = "Strained";
    proximityRing.dataset.state = "stable";
  } else {
    proximityState.textContent = "Critical";
    proximityRing.dataset.state = "warning";
  }
}

function setSpeedFx(active) {
  if (active) {
    if (!boostActive) {
      playBoostCue();
    }
    boostActive = true;
    chaseField.classList.add("is-speeding");
    return;
  }
  if (boostActive) {
    playBoostRelease();
  }
  boostActive = false;
  chaseField.classList.remove("is-speeding");
}

function pulseHalo() {
  if (!proximityRing) {
    return;
  }
  proximityRing.classList.remove("is-pulsing");
  void proximityRing.offsetWidth;
  proximityRing.classList.add("is-pulsing");
  window.clearTimeout(haloPulseTimeout);
  haloPulseTimeout = window.setTimeout(() => {
    proximityRing.classList.remove("is-pulsing");
  }, 820);
}

function clearHaloPulse() {
  window.clearTimeout(haloPulseTimeout);
  haloPulseTimeout = null;
  proximityRing.classList.remove("is-pulsing");
}

function updatePositions() {
  positionElement(witnessElement, state.witness.x, state.witness.y);
  positionElement(proximityRing, state.witness.x, state.witness.y);
  positionElement(playerElement, state.player.x, state.player.y);
}

function updateHazards(delta) {
  const removals = [];
  state.hazards.forEach((hazard, id) => {
    if (hazard.disabled) {
      hazard.life += delta;
      if (hazard.life >= 0.4) {
        removals.push(id);
      }
      return;
    }

    hazard.x += hazard.vx * delta;
    hazard.y += hazard.vy * delta;

    if (hazard.type === "gang") {
      const targetX = state.witness.x;
      const dx = clamp(targetX - hazard.x, -80, 80);
      hazard.vx += dx * hazard.control * delta;
      hazard.vx = clamp(hazard.vx, -hazard.maxSpeed, hazard.maxSpeed);
    }

    positionElement(hazard.element, hazard.x, hazard.y);

    if (checkCollision(hazard, state.player, hazard.radius + 18)) {
      applyDamage(`Impact: ${hazard.label}`, hazard.damage);
      removals.push(id);
      return;
    }

    if (!hazard.grazed && checkCollision(hazard, state.witness, hazard.radius + 14)) {
      hazard.grazed = true;
      state.health = Math.max(0, state.health - hazard.damage * 0.6);
      state.outOfRangeTime += 0.6;
      setStatus("Witness clipped! Proximity window tightening.", "danger");
      log.push(`${hazard.label} scraped the witness. Close ranks!`, "danger");
      triggerImpactFx(hazard.x, hazard.y);
    }

    if (
      hazard.y > WORLD_HEIGHT + 140 ||
      hazard.y < -140 ||
      hazard.x < -160 ||
      hazard.x > WORLD_WIDTH + 160
    ) {
      removals.push(id);
    }
  });

  removals.forEach((id) => removeHazard(id));
}

function updateTimers(delta) {
  const phase = getCurrentPhase();
  state.graceTimer = Math.max(0, state.graceTimer - delta);
  state.spawnTimers.traffic -= delta;
  state.spawnTimers.gang -= delta;
  state.warningCooldown = Math.max(0, state.warningCooldown - delta);
  state.disablerCooldown = Math.max(0, state.disablerCooldown - delta);

  if (state.spawnTimers.traffic <= 0) {
    spawnTraffic();
    state.spawnTimers.traffic = randomBetween(...(phase.spawn?.traffic ?? [1.4, 2.2]));
  }

  if (state.spawnTimers.gang <= 0) {
    spawnGang();
    state.spawnTimers.gang = randomBetween(...(phase.spawn?.gang ?? [3.2, 4.4]));
  }
}

function spawnTraffic() {
  const id = ++state.hazardId;
  const element = document.createElement("div");
  element.className = "hazard is-traffic";
  hazardsLayer.append(element);
  const hazard = {
    id,
    type: "traffic",
    label: "Traffic van",
    x: randomBetween(WORLD_WIDTH * 0.25, WORLD_WIDTH * 0.75),
    y: -80,
    vx: randomBetween(-18, 18),
    vy: randomBetween(120, 170),
    radius: 28,
    damage: COLLISION_DAMAGE,
    element,
    disabled: false,
    life: 0,
  };
  state.hazards.set(id, hazard);
  positionElement(element, hazard.x, hazard.y);
}

function spawnGang() {
  const id = ++state.hazardId;
  const element = document.createElement("div");
  element.className = "hazard";
  hazardsLayer.append(element);
  const spawnSide = Math.random() < 0.5 ? -60 : WORLD_WIDTH + 60;
  const hazard = {
    id,
    type: "gang",
    label: "Gang rider",
    x: spawnSide,
    y: randomBetween(state.witness.y - 40, state.witness.y + 20),
    vx: spawnSide < 0 ? randomBetween(80, 110) : randomBetween(-110, -80),
    vy: randomBetween(110, 150),
    radius: 22,
    damage: COLLISION_DAMAGE + 6,
    maxSpeed: 120,
    control: 0.42,
    element,
    disabled: false,
    life: 0,
    grazed: false,
  };
  state.hazards.set(id, hazard);
  positionElement(element, hazard.x, hazard.y);
  log.push("Rival crew closing fast. Brace for ram.", "warning");
}

function removeHazard(id) {
  const hazard = state.hazards.get(id);
  if (!hazard) {
    return;
  }
  hazard.element.remove();
  state.hazards.delete(id);
}

function applyDamage(message, amount) {
  const scaledDamage = amount * warmupScale(WARMUP_COLLISION_MULTIPLIER);
  state.health = Math.max(0, state.health - scaledDamage);
  triggerImpactFx(state.player.x, state.player.y);
  setStatus(message, "danger");
  log.push(message, "danger");
  if (state.health <= 0) {
    endChase("Bike integrity failed. Crash on the expressway.", "danger");
  }
}

function triggerImpactFx(x, y) {
  chaseField.classList.remove("is-shaking");
  void chaseField.offsetWidth;
  chaseField.classList.add("is-shaking");
  chaseField.classList.add("is-impact");
  window.clearTimeout(impactTimeoutId);
  impactTimeoutId = window.setTimeout(() => {
    chaseField.classList.remove("is-impact");
  }, 360);
  spawnSpark(x, y);
  particleSystem?.emitBurst?.(0.9);
  playCrashCue();
}

function spawnSpark(x, y) {
  const spark = document.createElement("span");
  spark.className = "spark-burst";
  hazardsLayer.append(spark);
  positionElement(spark, x, y);
  requestAnimationFrame(() => {
    spark.classList.add("is-active");
  });
  window.setTimeout(() => {
    spark.remove();
  }, 480);
}

function spawnDisablerWave() {
  if (!disablerEffects) {
    return;
  }
  const wave = document.createElement("span");
  wave.className = "disabler-wave";
  disablerEffects.append(wave);
  positionElement(wave, state.player.x, state.player.y);
  requestAnimationFrame(() => {
    wave.classList.add("is-active");
  });
  window.setTimeout(() => {
    wave.remove();
  }, 620);
}

function triggerDisabler() {
  if (!state.running) {
    return;
  }
  if (state.disablerCooldown > 0) {
    setStatus("Disabler recharging. Hold the halo.", "warning");
    return;
  }
  if (state.boost < DISABLER_COST) {
    setStatus("Need more boost for a clean pulse.", "warning");
    return;
  }
  state.boost = Math.max(0, state.boost - DISABLER_COST);
  state.disablerCooldown = 1.1;
  const hits = [];
  state.hazards.forEach((hazard) => {
    if (hazard.disabled) {
      return;
    }
    const dx = hazard.x - state.player.x;
    const dy = hazard.y - state.player.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= DISABLER_RANGE && dy < 140) {
      hazard.disabled = true;
      hazard.element.classList.add("is-disabled");
      hazard.life = 0;
      hits.push(hazard);
    }
  });

  spawnDisablerWave();

  if (hits.length === 0) {
    playDisablerCue(0);
    setStatus("Pulse fired—no threats in cone.", "warning");
    log.push("Disabler fizzled. Save it for a flank.", "warning");
    return;
  }

  state.disabledCount += hits.length;
  playDisablerCue(hits.length);
  log.push(`Disabler pulse neutralized ${hits.length} threat${hits.length === 1 ? "" : "s"}.`, "success");
  const inHalo = witnessElement.classList.contains("out-of-range") === false;
  if (inHalo) {
    setStatus("Protector bonus! Witness lane is clear.", "success");
    state.boost = Math.min(100, state.boost + 24);
    const intensity = 1.1 + hits.length * 0.15;
    particleSystem?.emitBurst?.(intensity);
    particleSystem?.emitSparkle?.(0.95 + hits.length * 0.2);
  } else {
    setStatus("Pulse connected. Reel back into the halo.", "warning");
  }
}

function updateHud() {
  distanceValue.textContent = `${Math.round(state.distance)} m`;
  healthValue.textContent = `${Math.max(0, Math.round(state.health))}%`;
  const healthRatio = clamp(state.health / 100, 0, 1);
  healthFill.style.transform = `scaleX(${healthRatio})`;

  boostValue.textContent = `${Math.round(state.boost)}%`;
  const boostRatio = clamp(state.boost / 100, 0, 1);
  boostFill.style.transform = `scaleX(${boostRatio})`;
}

function endChase(reason, tone = "danger") {
  if (!state.running) {
    return;
  }
  state.running = false;
  state.reason = reason;
  stopAnimation();
  setSpeedFx(false);
  clearHaloPulse();
  window.clearTimeout(impactTimeoutId);
  impactTimeoutId = null;
  chaseField.classList.remove("is-impact");
  setStatus(reason, tone);
  log.push(reason, tone);
  showWrapUp();
}

function showWrapUp() {
  disablerEffects?.replaceChildren?.();
  wrapUpDistance.textContent = `${Math.round(state.distance)} m`;
  wrapUpDisabled.textContent = String(state.disabledCount);
  wrapUpStreak.textContent = `${state.longestStreak.toFixed(1)} s`;
  wrapUpNote.textContent = state.reason || "Stay tight to refill boost and keep the halo stable.";
  wrapUp.hidden = false;
  wrapUp.focus?.();
  const meta = {
    disabled: state.disabledCount,
    longestStreak: Number(state.longestStreak.toFixed(1)),
  };
  highScore.submit(Math.round(state.distance), meta);
  particleSystem?.emitSparkle?.(1.2);
}

function hideWrapUp() {
  wrapUp.hidden = true;
}

function positionElement(element, x, y) {
  if (!element) {
    return;
  }
  const bounds = chaseField.getBoundingClientRect();
  const offsetX = (x / WORLD_WIDTH) * bounds.width;
  const offsetY = (y / WORLD_HEIGHT) * bounds.height;
  element.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
}

function checkCollision(hazard, target, radius) {
  const dx = (hazard.x ?? 0) - (target.x ?? 0);
  const dy = (hazard.y ?? 0) - (target.y ?? 0);
  return Math.hypot(dx, dy) <= radius;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function getWarmupRatio() {
  if (state.graceTimer <= 0) {
    return 0;
  }
  return clamp(state.graceTimer / WARMUP_DURATION, 0, 1);
}

function warmupScale(minMultiplier) {
  const ratio = getWarmupRatio();
  if (ratio <= 0) {
    return 1;
  }
  const safeMin = Number.isFinite(minMultiplier) ? clamp(minMultiplier, 0, 1) : 0;
  return safeMin + (1 - safeMin) * (1 - ratio);
}

function getAudioContext() {
  if (!audioContext) {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    audioContext = AudioContextCtor ? new AudioContextCtor() : null;
  }
  if (audioContext && audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

function playTone({
  frequency,
  duration = 0.35,
  type = "sine",
  gain = 0.12,
  attack = 0.04,
  release = 0.2,
  detune = 0,
  pan = 0,
} = {}) {
  const context = getAudioContext();
  if (!context || !Number.isFinite(frequency)) {
    return false;
  }
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(Math.max(1, frequency), now);
  if (detune) {
    oscillator.detune.setValueAtTime(detune, now);
  }
  const gainNode = context.createGain();
  const safeAttack = Math.max(0.01, attack);
  const safeRelease = Math.max(0.05, release);
  const safeDuration = Math.max(duration, safeAttack + safeRelease + 0.05);
  const sustainTime = Math.max(safeAttack, safeDuration - safeRelease);
  const targetGain = Math.max(0, gain);
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(targetGain, now + safeAttack);
  gainNode.gain.setValueAtTime(targetGain, now + sustainTime);
  gainNode.gain.linearRampToValueAtTime(0.0001, now + safeDuration);
  if (typeof context.createStereoPanner === "function") {
    const panner = context.createStereoPanner();
    panner.pan.setValueAtTime(pan, now);
    gainNode.connect(panner);
    panner.connect(context.destination);
  } else {
    gainNode.connect(context.destination);
  }
  oscillator.connect(gainNode);
  oscillator.start(now);
  oscillator.stop(now + safeDuration + 0.05);
  return true;
}

function playSweep({
  startFreq,
  endFreq,
  duration = 0.4,
  type = "sine",
  gain = 0.14,
  pan = 0,
} = {}) {
  const context = getAudioContext();
  if (!context || !Number.isFinite(startFreq) || !Number.isFinite(endFreq)) {
    return false;
  }
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(Math.max(1, startFreq), now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), now + duration);
  const gainNode = context.createGain();
  const safeDuration = Math.max(duration, 0.45);
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(Math.max(0, gain), now + 0.05);
  gainNode.gain.linearRampToValueAtTime(0.0001, now + safeDuration);
  if (typeof context.createStereoPanner === "function") {
    const panner = context.createStereoPanner();
    panner.pan.setValueAtTime(pan, now);
    gainNode.connect(panner);
    panner.connect(context.destination);
  } else {
    gainNode.connect(context.destination);
  }
  oscillator.connect(gainNode);
  oscillator.start(now);
  oscillator.stop(now + safeDuration + 0.05);
  return true;
}

function playNoiseBurst({ duration = 0.32, gain = 0.2, frequency = 800 } = {}) {
  const context = getAudioContext();
  if (!context) {
    return false;
  }
  const now = context.currentTime;
  const sampleCount = Math.max(1, Math.floor(duration * context.sampleRate));
  const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < sampleCount; i += 1) {
    const fade = 1 - i / sampleCount;
    data[i] = (Math.random() * 2 - 1) * fade;
  }
  const source = context.createBufferSource();
  source.buffer = buffer;
  const filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(Math.max(200, frequency), now);
  filter.Q.setValueAtTime(0.9, now);
  const gainNode = context.createGain();
  gainNode.gain.setValueAtTime(Math.max(0.0001, gain), now);
  gainNode.gain.linearRampToValueAtTime(0.0001, now + duration);
  source.connect(filter).connect(gainNode).connect(context.destination);
  source.start(now);
  source.stop(now + duration + 0.05);
  return true;
}

function playWarningTone() {
  if (!playTone({
    frequency: 880,
    type: "triangle",
    gain: 0.16,
    attack: 0.05,
    release: 0.35,
  })) {
    return;
  }
  playTone({
    frequency: 660,
    type: "sine",
    gain: 0.1,
    attack: 0.05,
    release: 0.3,
    detune: -30,
  });
}

function playBoostCue() {
  playSweep({
    startFreq: 220,
    endFreq: 520,
    duration: 0.45,
    type: "sawtooth",
    gain: 0.12,
    pan: -0.1,
  });
  playTone({
    frequency: 760,
    type: "triangle",
    gain: 0.08,
    attack: 0.02,
    release: 0.25,
    pan: 0.15,
  });
}

function playBoostRelease() {
  playSweep({
    startFreq: 360,
    endFreq: 180,
    duration: 0.35,
    type: "sawtooth",
    gain: 0.1,
    pan: 0.05,
  });
}

function playDisablerCue(hitCount) {
  if (hitCount <= 0) {
    playTone({
      frequency: 520,
      duration: 0.22,
      type: "sine",
      gain: 0.08,
      attack: 0.02,
      release: 0.18,
    });
    return;
  }
  const intensity = Math.min(1, hitCount / 3);
  playSweep({
    startFreq: 780,
    endFreq: 210,
    duration: 0.45,
    type: "square",
    gain: 0.14 + intensity * 0.12,
    pan: 0.05,
  });
  playTone({
    frequency: 140 + hitCount * 40,
    duration: 0.3,
    type: "triangle",
    gain: 0.08 + intensity * 0.08,
    attack: 0.03,
    release: 0.22,
    pan: -0.05,
  });
}

function playCrashCue() {
  playNoiseBurst({ gain: 0.24, duration: 0.32, frequency: 840 });
  playTone({
    frequency: 160,
    duration: 0.3,
    type: "sawtooth",
    gain: 0.1,
    attack: 0.02,
    release: 0.24,
  });
}

startButton.addEventListener("click", () => {
  startChase();
});

resetButton.addEventListener("click", () => {
  resetState();
});

boostButton.addEventListener("pointerdown", () => {
  state.boostHeld = true;
  boostButton.setAttribute("aria-pressed", "true");
});

boostButton.addEventListener("pointerup", () => {
  state.boostHeld = false;
  boostButton.setAttribute("aria-pressed", "false");
});

boostButton.addEventListener("pointerleave", () => {
  state.boostHeld = false;
  boostButton.setAttribute("aria-pressed", "false");
});

disablerButton.addEventListener("click", () => {
  triggerDisabler();
});

replayButton.addEventListener("click", () => {
  startChase();
});

closeWrapUp.addEventListener("click", () => {
  hideWrapUp();
});

wrapUp.addEventListener("click", (event) => {
  if (event.target === wrapUp) {
    hideWrapUp();
  }
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (key === "shift") {
    state.boostHeld = true;
    boostButton.setAttribute("aria-pressed", "true");
  }
  if (key === " ") {
    event.preventDefault();
    triggerDisabler();
  } else if (key === "r") {
    event.preventDefault();
    resetState();
  }
  keys.add(key);
});

window.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();
  if (key === "shift") {
    state.boostHeld = false;
    boostButton.setAttribute("aria-pressed", "false");
  }
  keys.delete(key);
});

window.addEventListener("blur", () => {
  state.boostHeld = false;
  boostButton.setAttribute("aria-pressed", "false");
});

