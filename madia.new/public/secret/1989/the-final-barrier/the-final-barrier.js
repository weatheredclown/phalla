import { mountParticleField } from "../particles.js";
import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { autoEnhanceFeedback, createLogChannel, createStatusChannel } from "../feedback.js";
import { createWrapUpDialog } from "../wrap-up-dialog.js";

const particleField = mountParticleField({
  container: document.getElementById("particle-anchor"),
  density: 0.00022,
  effects: {
    palette: ["#38bdf8", "#22d3ee", "#f472b6", "#facc15", "#c084fc"],
    ambientDensity: 0.6,
  },
});

const scoreConfig = getScoreConfig("the-final-barrier");
const highScore = initHighScoreBanner({
  gameId: "the-final-barrier",
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

autoEnhanceFeedback({ statusSelectors: ["#status-display"], logSelectors: ["#event-log"] });

const canvas = document.getElementById("barrier-canvas");
const ctx = canvas.getContext("2d");
if (!ctx) {
  throw new Error("Canvas context unavailable for The Final Barrier");
}

const cockpit = document.getElementById("cockpit");
const phaseIndicator = document.getElementById("phase-indicator");
const statusDisplay = document.getElementById("status-display");
const eventLog = document.getElementById("event-log");
const cinematic = document.getElementById("cinematic");
const cinematicLaunch = document.getElementById("cinematic-launch");
const launchButton = document.getElementById("launch-button");
const phaserButton = document.getElementById("phaser-button");
const torpedoButton = document.getElementById("torpedo-button");
const resetButton = document.getElementById("reset-button");
const replayButton = document.getElementById("replay-button");
const closeWrapButton = document.getElementById("close-wrap-button");

const wrapUpDialog = createWrapUpDialog(wrapUp);
const wrapUp = document.getElementById("wrap-up");
const wrapSummary = document.getElementById("wrap-summary");
const wrapScore = document.getElementById("wrap-score");
const wrapAccuracy = document.getElementById("wrap-accuracy");
const wrapShields = document.getElementById("wrap-shields");
const scoreValue = document.getElementById("score-value");
const accuracyValue = document.getElementById("accuracy-value");
const comboValue = document.getElementById("combo-value");
const shieldsValue = document.getElementById("shields-value");
const torpedoValue = document.getElementById("torpedo-value");
const modeValue = document.getElementById("mode-value");
const modeButtons = Array.from(document.querySelectorAll(".mode-button"));

const statusChannel = createStatusChannel(statusDisplay);
const logChannel = createLogChannel(eventLog, { limit: 20 });

const POWER_MODES = {
  balanced: {
    id: "balanced",
    label: "Balanced",
    phaserCooldown: 260,
    phaserDamage: 26,
    shieldRegen: 2.8,
  },
  shields: {
    id: "shields",
    label: "Shields to Full",
    phaserCooldown: 480,
    phaserDamage: 24,
    shieldRegen: 5.6,
  },
  weapons: {
    id: "weapons",
    label: "Weapons to Full",
    phaserCooldown: 220,
    phaserDamage: 36,
    shieldRegen: 0,
  },
};

const ENTITY_CONFIG = {
  energy: {
    name: "Energy Form",
    hp: 40,
    baseSize: 26,
    score: 220,
    damage: 14,
    speed: 22,
    drift: 26,
    color: "#38bdf8",
  },
  asteroid: {
    name: "Ice Asteroid",
    hp: 60,
    baseSize: 34,
    score: 180,
    damage: 18,
    speed: 28,
    drift: 12,
    color: "#a5f3fc",
  },
  surge: {
    name: "Surge Fragment",
    hp: 36,
    baseSize: 22,
    score: 240,
    damage: 16,
    speed: 36,
    drift: 48,
    color: "#f472b6",
  },
  shard: {
    name: "Sentinel Shard",
    hp: 48,
    baseSize: 24,
    score: 260,
    damage: 16,
    speed: 42,
    drift: 32,
    color: "#facc15",
  },
  sentinel: {
    name: "Barrier Sentinel",
    hp: 520,
    baseSize: 120,
    score: 3200,
    damage: 32,
    speed: 18,
    drift: 28,
    color: "#fde68a",
  },
};

const TORPEDO_DAMAGE = 160;
const TORPEDO_SPEED = 540;
const PHASER_EFFECT_DURATION = 160;
const SHIELD_CRACK_DURATION = 1400;
const MAX_SHIELDS = 100;

const PHASES = [
  {
    id: "outer-edge",
    label: "Phase 1 · Outer Edge",
    duration: 34000,
    intro: "Outer edge turbulence detected. Targets drifting slow and bright.",
    init(state) {
      state.energyTimer = 0;
      state.asteroidTimer = 2600;
    },
    tick(state, deltaMs) {
      state.energyTimer += deltaMs;
      state.asteroidTimer += deltaMs;
      if (state.energyTimer >= 1400) {
        spawnEntity("energy", { y: randomRange(-80, 80) });
        state.energyTimer = randomRange(400, 900);
      }
      if (state.asteroidTimer >= 3600) {
        spawnEntity("asteroid", { x: randomRange(-120, 120), y: randomRange(-60, 80) });
        state.asteroidTimer = randomRange(800, 1200);
      }
    },
  },
  {
    id: "energy-storm",
    label: "Phase 2 · Energy Storm",
    duration: 36000,
    intro: "Energy storm inbound. Visual interference heavy.",
    init(state) {
      state.energyTimer = 0;
      state.surgeTimer = 1800;
    },
    tick(state, deltaMs) {
      state.energyTimer += deltaMs;
      state.surgeTimer += deltaMs;
      if (state.energyTimer >= 900) {
        spawnEntity("energy", { x: randomRange(-130, 130), y: randomRange(-90, 90), speed: 28 });
        state.energyTimer = randomRange(420, 780);
      }
      if (state.surgeTimer >= 2200) {
        spawnEntity("surge", { x: randomRange(-140, 140), y: randomRange(-100, 100) });
        state.surgeTimer = randomRange(620, 980);
      }
    },
  },
  {
    id: "the-center",
    label: "Phase 3 · The Center",
    duration: Infinity,
    intro: "Sentinel manifesting. Target lattice is charging attacks.",
    init(state) {
      state.spawnedBoss = false;
      state.shardTimer = 2600;
      state.bossAttackTimer = 4800;
    },
    tick(state, deltaMs) {
      if (!state.spawnedBoss) {
        spawnEntity("sentinel", { z: 120, y: -10 });
        logChannel.push("Barrier Sentinel locking on.", "warning");
        state.spawnedBoss = true;
      }
      state.shardTimer += deltaMs;
      state.bossAttackTimer += deltaMs;
      if (state.shardTimer >= 3200) {
        spawnEntity("shard", { x: randomRange(-140, 140), y: randomRange(-80, 60), speed: 44 });
        state.shardTimer = randomRange(800, 1400);
      }
      if (state.bossAttackTimer >= 5600) {
        emitSentinelPulse();
        state.bossAttackTimer = randomRange(2200, 3200);
      }
    },
  },
];

const state = {
  running: false,
  preparing: false,
  shields: MAX_SHIELDS,
  torpedoesRemaining: 3,
  score: 0,
  shotsFired: 0,
  shotsHit: 0,
  comboMultiplier: 1,
  lastPhaser: 0,
  shieldCrackTimer: 0,
  powerMode: POWER_MODES.balanced,
  currentPhaseIndex: -1,
  phaseElapsed: 0,
  entities: [],
  beams: [],
  activeTorpedoes: [],
  background: [],
  sentinelId: null,
  pendingPulse: 0,
  runStart: 0,
};

const aim = {
  x: canvas.width / 2,
  y: canvas.height * 0.55,
};

let animationFrame = null;
let lastFrame = 0;
let entityCounter = 0;

function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

function resetState() {
  state.running = false;
  state.preparing = false;
  state.shields = MAX_SHIELDS;
  state.torpedoesRemaining = 3;
  state.score = 0;
  state.shotsFired = 0;
  state.shotsHit = 0;
  state.comboMultiplier = 1;
  state.lastPhaser = 0;
  state.shieldCrackTimer = 0;
  state.powerMode = POWER_MODES.balanced;
  state.currentPhaseIndex = -1;
  state.phaseElapsed = 0;
  state.entities = [];
  state.beams = [];
  state.activeTorpedoes = [];
  state.sentinelId = null;
  state.pendingPulse = 0;
  state.runStart = 0;
  aim.x = canvas.width / 2;
  aim.y = canvas.height * 0.55;
  setPhaseIndicator("Awaiting launch clearance.");
  setStatus("Power routed to standby systems.");
  logChannel.push("Simulation reset. Shields nominal.", "info");
  wrapUpDialog.close({ restoreFocus: false });
  cinematic.hidden = true;
  cockpit.classList.remove("is-phase-2", "is-phase-3");
  updatePowerModeButtons(POWER_MODES.balanced);
  updateHud();
  ensureBackground();
  cancelAnimationFrame(animationFrame);
  renderScene(0);
}

function ensureBackground() {
  if (state.background.length === 0) {
    for (let i = 0; i < 140; i += 1) {
      state.background.push(createBackgroundPoint());
    }
  }
}

function createBackgroundPoint() {
  return {
    x: randomRange(-220, 220),
    y: randomRange(-130, 130),
    z: randomRange(20, 180),
    speed: randomRange(16, 42),
    color: Math.random() > 0.5 ? "rgba(56,189,248,0.85)" : "rgba(236,72,153,0.9)",
    twinkle: randomRange(0.4, 1),
  };
}

function startCinematic() {
  if (state.running || state.preparing) {
    return;
  }
  state.preparing = true;
  cinematic.hidden = false;
  Array.from(cinematic.querySelectorAll(".cinematic-line")).forEach((line, index) => {
    line.classList.remove("is-active");
    setTimeout(() => {
      line.classList.add("is-active");
    }, index * 600);
  });
  statusChannel("Enterprise holding at the edge of the Barrier.", "info");
  logChannel.push("Cinematic engage. Awaiting helm confirmation.", "info");
}

function startRun() {
  if (state.running) {
    return;
  }
  state.preparing = false;
  cinematic.hidden = true;
  state.running = true;
  state.score = 0;
  state.shields = MAX_SHIELDS;
  state.torpedoesRemaining = 3;
  state.shotsFired = 0;
  state.shotsHit = 0;
  state.comboMultiplier = 1;
  state.phaseElapsed = 0;
  state.entities = [];
  state.beams = [];
  state.activeTorpedoes = [];
  state.sentinelId = null;
  state.pendingPulse = 0;
  state.runStart = performance.now();
  ensureBackground();
  enterPhase(0);
  logChannel.push("Launch sequence initiated.", "success");
  statusChannel("Barrier penetration underway. Maintain precision fire.", "info");
  lastFrame = performance.now();
  cancelAnimationFrame(animationFrame);
  animationFrame = requestAnimationFrame(step);
}

function enterPhase(index) {
  state.currentPhaseIndex = index;
  const phase = PHASES[index];
  state.phaseElapsed = 0;
  phaseIndicator.textContent = phase.label;
  statusChannel(phase.intro, "info");
  logChannel.push(phase.intro, "info");
  cockpit.classList.remove("is-phase-2", "is-phase-3");
  if (phase.id === "energy-storm") {
    cockpit.classList.add("is-phase-2");
  } else if (phase.id === "the-center") {
    cockpit.classList.add("is-phase-3");
  }
  if (typeof phase.init === "function") {
    phase.state = {};
    phase.init(phase.state);
  } else {
    phase.state = {};
  }
}

function advancePhase() {
  if (state.currentPhaseIndex < PHASES.length - 1) {
    enterPhase(state.currentPhaseIndex + 1);
  }
}

function spawnEntity(type, overrides = {}) {
  const config = ENTITY_CONFIG[type];
  if (!config) {
    return null;
  }
  const entity = {
    id: `entity-${++entityCounter}`,
    type,
    name: config.name,
    hp: config.hp,
    maxHp: config.hp,
    baseSize: config.baseSize,
    score: config.score,
    damage: config.damage,
    speed: overrides.speed ?? config.speed,
    driftX: overrides.driftX ?? randomRange(-config.drift, config.drift),
    driftY: overrides.driftY ?? randomRange(-config.drift, config.drift),
    x: overrides.x ?? randomRange(-180, 180),
    y: overrides.y ?? randomRange(-120, 120),
    z: overrides.z ?? 160,
    color: overrides.color ?? config.color,
    attackTimer: overrides.attackTimer ?? randomRange(1800, 2600),
    alive: true,
  };
  if (type === "sentinel") {
    state.sentinelId = entity.id;
    entity.z = overrides.z ?? 180;
    entity.speed = config.speed;
    entity.driftX = 0;
    entity.driftY = 0;
    entity.attackTimer = randomRange(3000, 4200);
  }
  state.entities.push(entity);
  return entity;
}

function emitSentinelPulse() {
  state.pendingPulse = 1;
  logChannel.push("Sentinel releases a shock pulse!", "danger");
  statusChannel("Shock pulse inbound—brace!", "danger");
}

function firePhasers() {
  if (!state.running) {
    return;
  }
  const now = performance.now();
  if (now - state.lastPhaser < state.powerMode.phaserCooldown) {
    return;
  }
  state.lastPhaser = now;
  state.shotsFired += 1;
  state.beams.push({
    x: aim.x,
    y: aim.y,
    born: now,
  });
  const hit = resolvePhaserHit();
  if (hit) {
    state.shotsHit += 1;
  }
  updateCombo();
  updateHud();
}

function resolvePhaserHit() {
  let hitSomething = false;
  const sorted = [...state.entities].sort((a, b) => a.z - b.z);
  for (const entity of sorted) {
    if (!entity.alive) {
      continue;
    }
    const projection = projectEntity(entity);
    if (!projection) {
      continue;
    }
    const distance = Math.hypot(aim.x - projection.x, aim.y - projection.y);
    if (distance <= projection.radius * 1.1) {
      const damage = state.powerMode.phaserDamage * (entity.type === "sentinel" ? 0.6 : 1);
      applyDamageToEntity(entity, damage, "Phaser burst");
      hitSomething = true;
      break;
    }
  }
  return hitSomething;
}

function launchTorpedo() {
  if (!state.running || state.torpedoesRemaining <= 0) {
    return;
  }
  state.torpedoesRemaining -= 1;
  state.shotsFired += 1;
  updateCombo();
  const originY = canvas.height * 0.7;
  const dx = aim.x - canvas.width / 2;
  const dy = aim.y - originY;
  const distance = Math.hypot(dx, dy) || 1;
  state.activeTorpedoes.push({
    x: canvas.width / 2,
    y: originY,
    vx: (dx / distance) * TORPEDO_SPEED,
    vy: (dy / distance) * TORPEDO_SPEED,
    born: performance.now(),
    life: 0,
  });
  logChannel.push("Photon torpedo away!", "success");
  updateHud();
}

function updateCombo() {
  const totalShots = state.shotsFired;
  if (totalShots === 0) {
    state.comboMultiplier = 1;
    accuracyValue.textContent = "100%";
    comboValue.textContent = "×1.0";
    return;
  }
  const accuracy = state.shotsHit / totalShots;
  const bonus = Math.max(0, accuracy - 0.5) * 2.5;
  state.comboMultiplier = 1 + Math.round(bonus * 10) / 10;
  accuracyValue.textContent = `${Math.round(accuracy * 100)}%`;
  comboValue.textContent = `×${state.comboMultiplier.toFixed(1)}`;
}

function applyDamageToEntity(entity, amount, source) {
  if (!entity.alive) {
    return;
  }
  entity.hp -= amount;
  if (entity.hp <= 0) {
    destroyEntity(entity, source);
  } else if (entity.type === "sentinel") {
    // Minor stagger log when boss is hit hard
    if (amount > 40) {
      logChannel.push("Sentinel lattice destabilised!", "success");
    }
  }
}

function destroyEntity(entity, source) {
  entity.alive = false;
  state.entities = state.entities.filter((item) => item.alive);
  const scoreGain = Math.round(entity.score * state.comboMultiplier);
  state.score += scoreGain;
  logChannel.push(`${entity.name} dispersed (+${scoreGain.toLocaleString()})`, "success");
  if (entity.type === "sentinel") {
    completeMission(true);
  }
  updateHud();
}

function applyPlayerDamage(amount, description) {
  state.shields = Math.max(0, state.shields - amount);
  state.shieldCrackTimer = SHIELD_CRACK_DURATION;
  shieldsValue.classList.add("is-cracked");
  cockpit.classList.remove("is-hit", "is-shake");
  // Force reflow for animation restart
  void cockpit.offsetWidth;
  cockpit.classList.add("is-hit", "is-shake");
  setStatus(`${description} Shields down ${amount.toFixed(0)}%.`, "danger");
  logChannel.push(`⚠ ${description} (-${amount.toFixed(0)}% shields)`, "danger");
  if (state.shields <= 0) {
    completeMission(false);
  }
  updateHud();
}

function setStatus(message, tone = "info") {
  statusChannel(message, tone);
}

function setPhaseIndicator(message) {
  phaseIndicator.textContent = message;
}

function updateHud() {
  scoreValue.textContent = state.score.toLocaleString();
  torpedoValue.textContent = state.torpedoesRemaining.toString();
  modeValue.textContent = state.powerMode.label;
  const totalShots = state.shotsFired;
  const accuracy = totalShots > 0 ? state.shotsHit / totalShots : 1;
  accuracyValue.textContent = `${Math.round(accuracy * 100)}%`;
  comboValue.textContent = `×${state.comboMultiplier.toFixed(1)}`;
  shieldsValue.textContent = `${Math.round(state.shields)}%`;
  if (state.shieldCrackTimer <= 0) {
    shieldsValue.classList.remove("is-cracked");
  }
}

function updatePowerModeButtons(selected) {
  modeButtons.forEach((button) => {
    const isActive = button.dataset.mode === selected.id;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  modeValue.textContent = selected.label;
}

function setPowerMode(modeId) {
  const mode = POWER_MODES[modeId] ?? POWER_MODES.balanced;
  state.powerMode = mode;
  updatePowerModeButtons(mode);
  modeValue.textContent = mode.label;
  logChannel.push(`Power diverted to ${mode.label}.`, "info");
  statusChannel(`Power configuration: ${mode.label}.`, "info");
}

function completeMission(victory) {
  if (!state.running) {
    return;
  }
  state.running = false;
  cancelAnimationFrame(animationFrame);
  const totalShots = state.shotsFired;
  const accuracy = totalShots > 0 ? state.shotsHit / totalShots : 1;
  const shieldPercent = Math.round(state.shields);
  wrapScore.textContent = state.score.toLocaleString();
  wrapAccuracy.textContent = `${Math.round(accuracy * 100)}%`;
  wrapShields.textContent = `${shieldPercent}%`;
  wrapSummary.textContent = victory
    ? "Sentinel shattered. Course clear beyond the Barrier."
    : "Enterprise crippled. The Barrier repels all intruders.";
  wrapUpDialog.open({ focus: replayButton });
  const meta = {
    accuracy: Math.round(accuracy * 100),
    shields: shieldPercent,
  };
  highScore.submit(state.score, meta);
  logChannel.push(victory ? "Mission success." : "Mission failed.", victory ? "success" : "danger");
  statusChannel(victory ? "Sentinel defeated. Plot a new heading." : "Simulation terminated.", victory ? "success" : "danger");
}

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;
  if (typeof ctx.resetTransform === "function") {
    ctx.resetTransform();
  } else {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  ctx.scale(ratio, ratio);
}

function projectEntity(entity) {
  const { x, y, z, baseSize } = entity;
  const adjustedZ = Math.max(12, z);
  const perspective = 320;
  const scale = perspective / (perspective + adjustedZ);
  const screenX = canvas.width / (window.devicePixelRatio || 1) / 2 + x * scale;
  const screenY = canvas.height / (window.devicePixelRatio || 1) / 2 + y * scale;
  const radius = Math.max(6, baseSize * scale);
  return { x: screenX, y: screenY, radius, scale };
}

function updateBackground(deltaMs) {
  const delta = deltaMs / 1000;
  state.background.forEach((point) => {
    point.z -= point.speed * delta;
    if (point.z <= 8) {
      point.x = randomRange(-220, 220);
      point.y = randomRange(-140, 140);
      point.z = randomRange(160, 220);
      point.speed = randomRange(18, 46);
      point.twinkle = randomRange(0.4, 1);
    }
  });
}

function updateEntities(deltaMs) {
  const delta = deltaMs / 1000;
  const now = performance.now();
  state.entities.forEach((entity) => {
    if (!entity.alive) {
      return;
    }
    entity.z -= entity.speed * delta;
    entity.x += entity.driftX * delta;
    entity.y += entity.driftY * delta;
    if (entity.type === "sentinel") {
      entity.z = Math.max(36, entity.z);
      entity.driftX = Math.sin(now / 900) * 28;
      entity.driftY = Math.cos(now / 1200) * 18;
      entity.attackTimer -= deltaMs;
      if (entity.attackTimer <= 0) {
        spawnEntity("shard", {
          x: randomRange(-120, 120),
          y: randomRange(-60, 60),
          speed: 52,
        });
        entity.attackTimer = randomRange(2600, 3600);
        logChannel.push("Sentinel fractures more shards!", "warning");
      }
    }
    if (entity.z <= 10) {
      entity.alive = false;
      state.entities = state.entities.filter((item) => item.alive);
      applyPlayerDamage(entity.damage, `${entity.name} impact.`);
    }
  });
}

function updateTorpedoes(deltaMs) {
  const delta = deltaMs / 1000;
  state.activeTorpedoes.forEach((torpedo) => {
    torpedo.x += torpedo.vx * delta;
    torpedo.y += torpedo.vy * delta;
    torpedo.life += deltaMs;
  });
  state.activeTorpedoes = state.activeTorpedoes.filter((torpedo) => {
    if (torpedo.life > 3000) {
      return false;
    }
    const collision = checkProjectileHit(torpedo, TORPEDO_DAMAGE);
    return !collision && torpedo.x >= -80 && torpedo.x <= canvas.width + 80 && torpedo.y >= -80 && torpedo.y <= canvas.height + 80;
  });
}

function checkProjectileHit(projectile, damage) {
  let hit = false;
  const sorted = [...state.entities].sort((a, b) => a.z - b.z);
  for (const entity of sorted) {
    if (!entity.alive) {
      continue;
    }
    const projection = projectEntity(entity);
    if (!projection) {
      continue;
    }
    const distance = Math.hypot(projectile.x - projection.x, projectile.y - projection.y);
    if (distance <= projection.radius * 1.1) {
      applyDamageToEntity(entity, damage, "Photon torpedo");
      state.shotsHit += 1;
      updateCombo();
      hit = true;
      break;
    }
  }
  return hit;
}

function updateBeams() {
  const now = performance.now();
  state.beams = state.beams.filter((beam) => now - beam.born < PHASER_EFFECT_DURATION);
}

function regenerateShields(deltaMs) {
  if (state.shields <= 0) {
    return;
  }
  const regenRate = state.powerMode.shieldRegen;
  if (regenRate <= 0) {
    return;
  }
  const delta = deltaMs / 1000;
  state.shields = Math.min(MAX_SHIELDS, state.shields + regenRate * delta);
}

function updateShieldEffects(deltaMs) {
  if (state.shieldCrackTimer > 0) {
    state.shieldCrackTimer = Math.max(0, state.shieldCrackTimer - deltaMs);
    if (state.shieldCrackTimer <= 0) {
      shieldsValue.classList.remove("is-cracked");
    }
  }
}

function step(timestamp) {
  if (!state.running) {
    return;
  }
  const deltaMs = Math.min(timestamp - lastFrame, 64);
  lastFrame = timestamp;
  const phase = PHASES[state.currentPhaseIndex];
  if (phase) {
    state.phaseElapsed += deltaMs;
    if (typeof phase.tick === "function") {
      phase.tick(phase.state, deltaMs);
    }
    if (phase.duration !== Infinity && state.phaseElapsed >= phase.duration) {
      advancePhase();
    }
  }
  if (state.pendingPulse > 0) {
    applyPlayerDamage(18, "Shock pulse");
    state.pendingPulse = 0;
  }
  updateBackground(deltaMs);
  updateEntities(deltaMs);
  updateTorpedoes(deltaMs);
  updateBeams();
  regenerateShields(deltaMs);
  updateShieldEffects(deltaMs);
  updateHud();
  renderScene(deltaMs);
  animationFrame = requestAnimationFrame(step);
}

function renderScene(deltaMs) {
  const width = canvas.width / (window.devicePixelRatio || 1);
  const height = canvas.height / (window.devicePixelRatio || 1);
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = "rgba(6,10,24,0.95)";
  ctx.fillRect(0, 0, width, height);

  // background swirl
  const gradient = ctx.createRadialGradient(width / 2, height * 0.4, 40, width / 2, height * 0.4, Math.max(width, height));
  gradient.addColorStop(0, "rgba(56,189,248,0.25)");
  gradient.addColorStop(0.35, "rgba(192,132,252,0.18)");
  gradient.addColorStop(0.8, "rgba(14,116,144,0.15)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  state.background.forEach((point) => {
    const perspective = 260;
    const scale = perspective / (perspective + point.z);
    const x = width / 2 + point.x * scale;
    const y = height / 2 + point.y * scale;
    const radius = Math.max(1.4, 2.8 * scale * point.twinkle);
    ctx.save();
    ctx.globalAlpha = Math.min(1, 0.35 + (1 - point.z / 220));
    ctx.fillStyle = point.color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  const entities = [...state.entities].sort((a, b) => b.z - a.z);
  entities.forEach((entity) => {
    const projection = projectEntity(entity);
    if (!projection) {
      return;
    }
    const { x, y, radius, scale } = projection;
    const alpha = entity.type === "sentinel" ? 0.45 : 0.8;
    const glow = entity.type === "sentinel" ? "rgba(250,204,21,0.45)" : entity.color;
    ctx.save();
    ctx.globalAlpha = alpha;
    const gradientEntity = ctx.createRadialGradient(x, y, radius * 0.25, x, y, radius);
    gradientEntity.addColorStop(0, "rgba(255,255,255,0.9)");
    gradientEntity.addColorStop(0.5, glow);
    gradientEntity.addColorStop(1, "rgba(15,23,42,0.9)");
    ctx.fillStyle = gradientEntity;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    if (entity.type === "sentinel") {
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = "rgba(250,204,21,0.65)";
      ctx.lineWidth = Math.max(2, 6 * scale);
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.7, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  });

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  state.beams.forEach((beam) => {
    ctx.strokeStyle = "rgba(56,189,248,0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(width / 2, height * 0.75);
    ctx.lineTo(beam.x, beam.y);
    ctx.stroke();
  });
  state.activeTorpedoes.forEach((torpedo) => {
    ctx.fillStyle = "rgba(248,113,113,0.9)";
    ctx.beginPath();
    ctx.arc(torpedo.x, torpedo.y, 6, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  // reticle
  ctx.save();
  ctx.strokeStyle = "rgba(148,163,184,0.8)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(aim.x, aim.y, 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(aim.x - 16, aim.y);
  ctx.lineTo(aim.x + 16, aim.y);
  ctx.moveTo(aim.x, aim.y - 16);
  ctx.lineTo(aim.x, aim.y + 16);
  ctx.stroke();
  ctx.restore();
}

canvas.addEventListener("pointermove", (event) => {
  const rect = canvas.getBoundingClientRect();
  aim.x = event.clientX - rect.left;
  aim.y = event.clientY - rect.top;
});

canvas.addEventListener("pointerdown", () => {
  firePhasers();
});

launchButton.addEventListener("click", () => {
  if (state.running) {
    return;
  }
  if (state.preparing) {
    return;
  }
  startCinematic();
});

cinematicLaunch.addEventListener("click", () => {
  startRun();
});

phaserButton.addEventListener("click", () => {
  firePhasers();
});

torpedoButton.addEventListener("click", () => {
  launchTorpedo();
});

resetButton.addEventListener("click", () => {
  resetState();
});

replayButton.addEventListener("click", () => {
  wrapUpDialog.close({ restoreFocus: false });
  startCinematic();
});

closeWrapButton.addEventListener("click", () => {
  wrapUpDialog.close();
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const modeId = button.dataset.mode;
    setPowerMode(modeId);
  });
});

window.addEventListener("keydown", (event) => {
  if (event.target && (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) {
    return;
  }
  if (event.code === "Space") {
    event.preventDefault();
    firePhasers();
  } else if (event.key.toLowerCase() === "t") {
    event.preventDefault();
    launchTorpedo();
  } else if (event.key === "1") {
    setPowerMode("balanced");
  } else if (event.key === "2") {
    setPowerMode("shields");
  } else if (event.key === "3") {
    setPowerMode("weapons");
  }
});

window.addEventListener("resize", () => {
  resizeCanvas();
  renderScene(0);
});

resizeCanvas();
resetState();
renderScene(0);

window.addEventListener("beforeunload", () => {
  particleField?.destroy?.();
});
