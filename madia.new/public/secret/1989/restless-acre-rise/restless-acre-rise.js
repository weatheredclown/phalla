import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { mountParticleField } from "../particles.js";
import { autoEnhanceFeedback, createStatusChannel, createLogChannel } from "../feedback.js";

const particleField = mountParticleField({
  colors: ["#38bdf8", "#a855f7", "#facc15", "#f97316"],
  effects: {
    palette: ["#facc15", "#fde68a", "#fbbf24", "#38bdf8"],
    ambientDensity: 0.3,
  },
});

autoEnhanceFeedback();

const scoreConfig = getScoreConfig("restless-acre-rise");
const highScore = initHighScoreBanner({
  gameId: "restless-acre-rise",
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

const canvas = document.getElementById("climb-canvas");
const ctx = canvas.getContext("2d");

const altitudeReadout = document.getElementById("altitude-readout");
const multiplierNote = document.getElementById("multiplier-note");
const nerveFill = document.getElementById("nerve-fill");
const nerveMeter = document.getElementById("nerve-meter");
const nerveReadout = document.getElementById("nerve-readout");
const effigyReadout = document.getElementById("effigy-readout");
const statusBanner = document.getElementById("status-banner");
const eventList = document.getElementById("event-log");
const damageFlash = document.getElementById("damage-flash");
const gameStage = document.querySelector(".game-stage");
const runSummary = document.getElementById("run-summary");
const finalAltitude = document.getElementById("final-altitude");
const finalEffigies = document.getElementById("final-effigies");

const startButton = document.getElementById("start-run");
const pauseButton = document.getElementById("pause-run");
const resetButton = document.getElementById("reset-run");
const replayButton = document.getElementById("replay-run");
const touchButtons = document.querySelectorAll(".touch-button");

const statusChannel = createStatusChannel(statusBanner);
const logChannel = createLogChannel(eventList, { limit: 40 });

const inputState = {
  left: false,
  right: false,
  glide: false,
  jumpQueued: false,
  jumpBuffer: 0,
};

let globalId = 0;
function nextId(prefix = "id") {
  globalId += 1;
  return `${prefix}-${globalId}`;
}

const worldState = {
  running: false,
  paused: false,
  lastFrame: performance.now(),
  cameraBase: 0,
  scrollSpeed: 28,
  scrollAcceleration: 6,
  altitude: 0,
  scoreAltitude: 0,
  lastAltitudeForScore: 0,
  nerve: 100,
  maxNerve: 100,
  effigies: 0,
  multiplier: 1,
  multiplierTimer: 0,
  invulnerableTimer: 0,
  player: null,
  platforms: [],
  platformById: new Map(),
  enemies: [],
  hazards: [],
  effigyNodes: [],
  nextSpawnAltitude: 180,
};

const audio = createAudioEngine();

resetGame();
requestAnimationFrame(loop);
updateHud();
statusChannel("Waiting at the base of the ridge.", "info");

startButton.addEventListener("click", () => {
  if (!worldState.running) {
    startRun();
  }
});

pauseButton.addEventListener("click", () => {
  if (!worldState.running) {
    return;
  }
  if (worldState.paused) {
    resumeRun();
  } else {
    pauseRun();
  }
});

resetButton.addEventListener("click", () => {
  logChannel.push("Run reset. The ridge settles momentarily.", "info");
  statusChannel("You returned to the base.", "info");
  resetGame();
});

replayButton.addEventListener("click", () => {
  resetGame();
  startRun();
});

touchButtons.forEach((button) => {
  const action = button.dataset.action;
  if (!action) {
    return;
  }
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    if (action === "left") {
      inputState.left = true;
    } else if (action === "right") {
      inputState.right = true;
    } else if (action === "jump") {
      queueJump();
    }
  });
  button.addEventListener("pointerup", (event) => {
    event.preventDefault();
    button.releasePointerCapture(event.pointerId);
    if (action === "left") {
      inputState.left = false;
    } else if (action === "right") {
      inputState.right = false;
    }
  });
  button.addEventListener("pointerleave", () => {
    if (action === "left") {
      inputState.left = false;
    } else if (action === "right") {
      inputState.right = false;
    }
  });
});

window.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
    return;
  }
  if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
    inputState.left = true;
    event.preventDefault();
  } else if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
    inputState.right = true;
    event.preventDefault();
  } else if (event.key === "ArrowUp" || event.key === "w" || event.key === "W" || event.key === " ") {
    event.preventDefault();
    queueJump();
  } else if (event.key === "Shift") {
    inputState.glide = true;
  } else if (event.key === "r" || event.key === "R") {
    event.preventDefault();
    logChannel.push("Manual reset triggered. Take a breath and try again.", "warning");
    statusChannel("You abandoned this climb and reset.", "warning");
    resetGame();
  }
});

window.addEventListener("keyup", (event) => {
  if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
    inputState.left = false;
  } else if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
    inputState.right = false;
  } else if (event.key === "Shift") {
    inputState.glide = false;
  }
});

function queueJump() {
  inputState.jumpQueued = true;
  inputState.jumpBuffer = 0.2;
}

function startRun() {
  audio.unlock();
  worldState.running = true;
  worldState.paused = false;
  worldState.lastFrame = performance.now();
  startButton.disabled = true;
  pauseButton.disabled = false;
  pauseButton.textContent = "Hold Breath";
  statusChannel("The ridge pulls you upward. Stay ahead of the fog.", "info");
  logChannel.push("Climb initiated. Fog pressure rising.", "info");
}

function pauseRun() {
  worldState.paused = true;
  pauseButton.textContent = "Resume";
  statusChannel("Breath held. The ridge waits for your next move.", "info");
  logChannel.push("Run paused. Fog coils at your back.", "warning");
}

function resumeRun() {
  worldState.paused = false;
  worldState.lastFrame = performance.now();
  pauseButton.textContent = "Hold Breath";
  statusChannel("Breath released. Keep climbing.", "info");
  logChannel.push("Run resumed. Fog resumes its crawl.", "info");
}

function resetGame() {
  worldState.running = false;
  worldState.paused = false;
  worldState.lastFrame = performance.now();
  worldState.cameraBase = 0;
  worldState.scrollSpeed = 28;
  worldState.altitude = 0;
  worldState.scoreAltitude = 0;
  worldState.lastAltitudeForScore = 0;
  worldState.nerve = worldState.maxNerve;
  worldState.effigies = 0;
  worldState.multiplier = 1;
  worldState.multiplierTimer = 0;
  worldState.invulnerableTimer = 0;
  worldState.platforms = [];
  worldState.platformById.clear();
  worldState.enemies = [];
  worldState.hazards = [];
  worldState.effigyNodes = [];
  worldState.nextSpawnAltitude = 200;
  startButton.disabled = false;
  pauseButton.disabled = true;
  pauseButton.textContent = "Hold Breath";
  runSummary.hidden = true;
  damageFlash.hidden = true;
  damageFlash.classList.remove("is-active");
  gameStage.classList.remove("is-shaking");

  worldState.player = {
    x: canvas.width / 2,
    y: 32,
    width: 26,
    height: 36,
    vx: 0,
    vy: 0,
    onGround: true,
    coyoteTimer: 0.12,
  };

  spawnPlatform({
    x: canvas.width / 2 - 70,
    width: 140,
    y: 24,
    type: "stable",
    label: "base",
  });
  spawnPlatform({
    x: canvas.width / 2 - 40,
    width: 80,
    y: 90,
    type: "crumble",
  });

  updateHud();
  renderScene();
}

function endRun(message) {
  if (!worldState.running) {
    return;
  }
  worldState.running = false;
  worldState.paused = false;
  startButton.disabled = false;
  pauseButton.disabled = true;
  pauseButton.textContent = "Hold Breath";
  statusChannel(message, "danger");
  logChannel.push(`Run ended: ${message}`, "danger");

  const finalScore = Math.floor(worldState.scoreAltitude);
  const result = highScore.submit(finalScore, {
    altitude: Math.floor(worldState.altitude),
    effigies: worldState.effigies,
  });
  if (result.updated) {
    logChannel.push("New high score recorded for this cabinet!", "success");
  }

  finalAltitude.textContent = `${Math.floor(worldState.altitude)} ft`;
  finalEffigies.textContent = String(worldState.effigies);
  runSummary.hidden = false;
}

function loop(timestamp) {
  const deltaMs = timestamp - worldState.lastFrame;
  worldState.lastFrame = timestamp;
  const delta = Math.min(deltaMs / 1000, 0.05);

  if (worldState.running && !worldState.paused) {
    stepSimulation(delta);
  } else {
    if (worldState.paused) {
      // keep timers aligned when paused
      worldState.lastFrame = timestamp;
    }
  }

  renderScene();
  requestAnimationFrame(loop);
}

function stepSimulation(delta) {
  const player = worldState.player;

  worldState.cameraBase += worldState.scrollSpeed * delta;
  worldState.scrollSpeed = Math.min(
    worldState.scrollSpeed + worldState.scrollAcceleration * delta,
    120,
  );

  worldState.invulnerableTimer = Math.max(0, worldState.invulnerableTimer - delta);

  if (worldState.multiplierTimer > 0) {
    worldState.multiplierTimer -= delta;
    if (worldState.multiplierTimer <= 0) {
      worldState.multiplier = 1;
      worldState.multiplierTimer = 0;
      multiplierNote.classList.remove("is-active");
      logChannel.push("Effigy surge fades. Score gain returns to normal.", "info");
    }
  }

  if (inputState.jumpQueued) {
    inputState.jumpQueued = false;
  } else if (inputState.jumpBuffer > 0) {
    inputState.jumpBuffer = Math.max(0, inputState.jumpBuffer - delta);
  }

  updatePlayer(player, delta);
  updatePlatforms(delta);
  updateEnemies(delta);
  updateHazards(delta);
  updateEffigies(delta);
  spawnSegments();

  const previousAltitude = worldState.altitude;
  worldState.altitude = Math.max(worldState.altitude, player.y);

  if (worldState.altitude > worldState.lastAltitudeForScore) {
    const gained = worldState.altitude - worldState.lastAltitudeForScore;
    worldState.scoreAltitude += gained * worldState.multiplier;
    worldState.lastAltitudeForScore = worldState.altitude;
  }

  if (player.y <= worldState.cameraBase + 10) {
    applyDamage(18, "The fog swallows your heels.");
    player.y = worldState.cameraBase + 30;
    player.vy = Math.max(player.vy, 18);
  }

  updateHud();
}

function updatePlayer(player, delta) {
  const moveAcceleration = 240;
  const maxMove = 110;
  const airborneControl = player.onGround ? 1 : 0.55;
  const friction = player.onGround ? 0.78 : 0.95;
  const gravity = inputState.glide ? 180 : 320;
  const terminalVelocity = -220;

  player.onGround = false;
  player.coyoteTimer = Math.max(0, player.coyoteTimer - delta);

  if (inputState.left && !inputState.right) {
    player.vx -= moveAcceleration * airborneControl * delta;
  } else if (inputState.right && !inputState.left) {
    player.vx += moveAcceleration * airborneControl * delta;
  } else {
    player.vx *= friction;
    if (Math.abs(player.vx) < 2) {
      player.vx = 0;
    }
  }

  player.vx = Math.max(-maxMove, Math.min(maxMove, player.vx));

  player.vy -= gravity * delta;
  if (player.vy < terminalVelocity) {
    player.vy = terminalVelocity;
  }

  const previousY = player.y;
  player.x += player.vx * delta;
  player.y += player.vy * delta;

  const padding = player.width / 2 + 12;
  if (player.x < padding) {
    player.x = padding;
    player.vx = Math.max(0, player.vx);
  } else if (player.x > canvas.width - padding) {
    player.x = canvas.width - padding;
    player.vx = Math.min(0, player.vx);
  }

  const playerLeft = player.x - player.width / 2;
  const playerRight = player.x + player.width / 2;

  let landedPlatform = null;
  if (player.vy <= 0) {
    for (const platform of worldState.platforms) {
      if (platform.destroyed) {
        continue;
      }
      if (previousY >= platform.y && player.y <= platform.y) {
        const platformLeft = platform.x;
        const platformRight = platform.x + platform.width;
        if (playerRight >= platformLeft && playerLeft <= platformRight) {
          player.y = platform.y;
          player.vy = 0;
          player.onGround = true;
          player.coyoteTimer = 0.12;
          landedPlatform = platform;
          break;
        }
      }
    }
  }

  if (landedPlatform) {
    if (landedPlatform.type === "crumble") {
      landedPlatform.crumbleTimer = 0;
      landedPlatform.triggered = true;
    }
    if (landedPlatform.safePath) {
      statusChannel("Safe footing secured. Altitude rising steady.", "info");
    }
  }

  if (!player.onGround && player.coyoteTimer <= 0 && inputState.jumpBuffer > 0) {
    // allow buffered jump shortly after stepping off
    player.vy = 160;
    player.y += player.vy * delta;
    player.onGround = false;
    player.coyoteTimer = 0;
    inputState.jumpBuffer = 0;
    audio.playJump();
    logChannel.push("Last-second leap keeps you above the mire.", "success");
  } else if ((player.onGround || player.coyoteTimer > 0) && inputState.jumpBuffer > 0) {
    player.vy = 190;
    player.y += player.vy * delta;
    player.onGround = false;
    player.coyoteTimer = 0;
    inputState.jumpBuffer = 0;
    audio.playJump();
    logChannel.push("You vault toward the next ledge.", "success");
  }
}

function updatePlatforms(delta) {
  worldState.platforms = worldState.platforms.filter((platform) => {
    if (platform.destroyed) {
      worldState.platformById.delete(platform.id);
      return false;
    }
    if (platform.y < worldState.cameraBase - 120) {
      worldState.platformById.delete(platform.id);
      return false;
    }
    if (platform.type === "crumble" && platform.triggered) {
      platform.crumbleTimer += delta;
      if (!platform.falling && platform.crumbleTimer >= 0.85) {
        platform.falling = true;
        logChannel.push("Rotten boards collapse beneath you.", "warning");
      }
    }
    if (platform.falling) {
      platform.y -= 120 * delta;
      platform.opacity = Math.max(0, (platform.opacity ?? 1) - delta * 1.8);
      if (platform.opacity <= 0 || platform.y <= worldState.cameraBase - 80) {
        platform.destroyed = true;
        worldState.platformById.delete(platform.id);
        return false;
      }
    }
    return true;
  });
}

function updateEnemies(delta) {
  for (const enemy of worldState.enemies) {
    enemy.timer += delta;
    const platform = worldState.platformById.get(enemy.platformId);
    if (!platform || platform.destroyed) {
      enemy.remove = true;
      continue;
    }
    enemy.y = platform.y + 18;
    const targetRange = Math.abs(worldState.player.x - enemy.x);
    if (enemy.state === "idle" && targetRange < 90 && worldState.player.y > enemy.y - 48) {
      enemy.state = "telegraph";
      enemy.timer = 0;
      audio.playHiss();
      logChannel.push("A carrion beast hisses before it lunges!", "warning");
    } else if (enemy.state === "telegraph" && enemy.timer >= enemy.telegraphDuration) {
      enemy.state = "lunge";
      enemy.timer = 0;
      enemy.vx = Math.sign(worldState.player.x - enemy.x) || 1;
    } else if (enemy.state === "lunge" && enemy.timer >= enemy.lungeDuration) {
      enemy.state = "recover";
      enemy.timer = 0;
      enemy.vx = 0;
    } else if (enemy.state === "recover" && enemy.timer >= enemy.recoverDuration) {
      enemy.state = "idle";
      enemy.timer = 0;
      enemy.vx = 0;
    }

    if (enemy.state === "lunge") {
      enemy.x += enemy.directionSpeed * enemy.vx * delta;
    } else if (enemy.state === "idle") {
      enemy.x += Math.sin(performance.now() / 500 + enemy.seed) * delta * 8;
    }

    const minX = platform.x + enemy.width / 2;
    const maxX = platform.x + platform.width - enemy.width / 2;
    enemy.x = Math.max(minX, Math.min(maxX, enemy.x));

    if (collides(worldState.player, enemy)) {
      if (worldState.invulnerableTimer <= 0) {
        applyDamage(22, "The beast tears at your nerve!");
        enemy.state = "recover";
        enemy.timer = 0;
        enemy.vx = 0;
      }
    }

    if (enemy.y < worldState.cameraBase - 60) {
      enemy.remove = true;
    }
  }

  worldState.enemies = worldState.enemies.filter((enemy) => !enemy.remove);
}

function updateHazards(delta) {
  for (const hazard of worldState.hazards) {
    hazard.timer += delta;
    hazard.x += hazard.vx * delta;
    hazard.y += hazard.vy * delta;
    if (hazard.timer >= hazard.duration) {
      hazard.remove = true;
    }
    if (collides(worldState.player, hazard)) {
      if (worldState.invulnerableTimer <= 0) {
        applyDamage(hazard.damage, "Clawing roots rake your legs.");
      }
    }
    if (hazard.y < worldState.cameraBase - 60) {
      hazard.remove = true;
    }
  }
  worldState.hazards = worldState.hazards.filter((hazard) => !hazard.remove);
}

function updateEffigies(delta) {
  for (const effigy of worldState.effigyNodes) {
    effigy.phase = (effigy.phase + delta * 2.6) % (Math.PI * 2);
    if (!effigy.collected && intersectsCircle(worldState.player, effigy)) {
      collectEffigy(effigy);
    }
    if (effigy.y < worldState.cameraBase - 80) {
      effigy.remove = true;
    }
  }
  worldState.effigyNodes = worldState.effigyNodes.filter((effigy) => !effigy.remove);
}

function spawnSegments() {
  const targetAltitude = worldState.cameraBase + canvas.height + 200;
  while (worldState.nextSpawnAltitude < targetAltitude) {
    createSegment(worldState.nextSpawnAltitude);
    worldState.nextSpawnAltitude += 120 + Math.random() * 60;
  }
}

function createSegment(baseAltitude) {
  const safeWidth = 160 - Math.min(60, Math.floor(baseAltitude / 240) * 10);
  const safeX = clamp(
    Math.random() * (canvas.width - safeWidth - 60) + 30,
    24,
    canvas.width - safeWidth - 24,
  );

  const safePlatform = spawnPlatform({
    x: safeX,
    width: safeWidth,
    y: baseAltitude,
    type: Math.random() < 0.3 ? "crumble" : "stable",
    safePath: true,
  });

  if (Math.random() < 0.7) {
    const offset = Math.random() < 0.5 ? -1 : 1;
    const narrowWidth = 70 + Math.random() * 40;
    const narrowX = clamp(
      safeX + offset * (safeWidth / 2 + 40 + Math.random() * 40),
      16,
      canvas.width - narrowWidth - 16,
    );
    const riskPlatform = spawnPlatform({
      x: narrowX,
      width: narrowWidth,
      y: baseAltitude + 26 + Math.random() * 22,
      type: "risk",
    });
    if (riskPlatform && Math.random() < 0.8) {
      spawnEffigy({
        x: narrowX + narrowWidth / 2,
        y: riskPlatform.y + 24,
      });
    }
    if (riskPlatform && Math.random() < 0.55) {
      spawnEnemy(riskPlatform);
    }
  } else if (safePlatform && Math.random() < 0.35) {
    spawnEnemy(safePlatform);
  }

  if (safePlatform && Math.random() < 0.5) {
    spawnHazard(safePlatform);
  }
}

function spawnPlatform({ x, width, y, type = "stable", safePath = false }) {
  const platform = {
    id: nextId("platform"),
    x,
    width,
    y,
    type,
    safePath,
    crumbleTimer: 0,
    triggered: false,
    falling: false,
    destroyed: false,
  };
  worldState.platforms.push(platform);
  worldState.platformById.set(platform.id, platform);
  return platform;
}

function spawnEnemy(platform) {
  const enemy = {
    id: nextId("enemy"),
    platformId: platform.id,
    x: platform.x + platform.width / 2,
    y: platform.y + 18,
    width: 34,
    height: 28,
    state: "idle",
    timer: 0,
    telegraphDuration: 0.5,
    lungeDuration: 0.45,
    recoverDuration: 0.8,
    directionSpeed: 240 + Math.random() * 60,
    vx: 0,
    seed: Math.random() * Math.PI * 2,
  };
  worldState.enemies.push(enemy);
  return enemy;
}

function spawnHazard(platform) {
  const hazard = {
    id: nextId("hazard"),
    x: platform.x + platform.width / 2,
    y: platform.y + 36 + Math.random() * 24,
    width: 42,
    height: 18,
    vx: (Math.random() < 0.5 ? -1 : 1) * (40 + Math.random() * 60),
    vy: 18 + Math.random() * 30,
    timer: 0,
    duration: 2.8,
    damage: 16,
  };
  worldState.hazards.push(hazard);
  return hazard;
}

function spawnEffigy({ x, y }) {
  const effigy = {
    id: nextId("effigy"),
    x,
    y,
    radius: 14,
    phase: Math.random() * Math.PI * 2,
    collected: false,
  };
  worldState.effigyNodes.push(effigy);
  return effigy;
}

function collectEffigy(effigy) {
  if (effigy.collected) {
    return;
  }
  effigy.collected = true;
  effigy.remove = true;
  worldState.effigies += 1;
  worldState.multiplier = 2;
  worldState.multiplierTimer = 12;
  multiplierNote.classList.add("is-active");
  multiplierNote.textContent = "x2 score";
  effigyReadout.textContent = String(worldState.effigies);
  statusChannel("Effigy secured! Score gains are doubled.", "success");
  logChannel.push("The effigy glows bright—score multiplier active!", "success");
  particleField.emitBurst(1.6);
  audio.playEffigy();
}

function applyDamage(amount, message) {
  worldState.nerve = Math.max(0, worldState.nerve - amount);
  worldState.invulnerableTimer = 0.8;
  triggerDamageFeedback();
  statusChannel(message, "danger");
  logChannel.push(message, "danger");
  audio.playDamage();
  if (worldState.nerve <= 0) {
    endRun("Your nerve shatters in the dark.");
  }
}

function triggerDamageFeedback() {
  damageFlash.hidden = false;
  damageFlash.classList.add("is-active");
  gameStage.classList.add("is-shaking");
  window.setTimeout(() => {
    damageFlash.classList.remove("is-active");
  }, 180);
  window.setTimeout(() => {
    gameStage.classList.remove("is-shaking");
  }, 260);
}

function renderScene() {
  if (!ctx) {
    return;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawPlatforms();
  drawEffigies();
  drawHazards();
  drawEnemies();
  drawPlayer();
  drawFog();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#020617");
  gradient.addColorStop(0.4, "#0f172a");
  gradient.addColorStop(1, "#020617");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawPlatforms() {
  for (const platform of worldState.platforms) {
    const screenY = toScreenY(platform.y);
    if (screenY > canvas.height + 40 || screenY < -40) {
      continue;
    }
    const opacity = platform.opacity ?? 1;
    ctx.fillStyle = platform.type === "risk"
      ? `rgba(76, 29, 149, ${0.72 * opacity})`
      : `rgba(71, 85, 105, ${0.82 * opacity})`;
    ctx.shadowColor = platform.type === "risk" ? "rgba(148, 163, 184, 0.45)" : "rgba(15, 23, 42, 0.65)";
    ctx.shadowBlur = platform.type === "risk" ? 18 : 10;
    ctx.fillRect(platform.x, screenY - 8, platform.width, 12);
    ctx.shadowBlur = 0;
    if (platform.type === "crumble") {
      ctx.strokeStyle = "rgba(248, 113, 113, 0.55)";
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(platform.x, screenY - 8, platform.width, 12);
      ctx.setLineDash([]);
    }
  }
}

function drawEnemies() {
  for (const enemy of worldState.enemies) {
    const screenY = toScreenY(enemy.y);
    if (screenY > canvas.height + 60 || screenY < -40) {
      continue;
    }
    ctx.save();
    ctx.translate(enemy.x, screenY);
    ctx.fillStyle = enemy.state === "telegraph" ? "#f97316" : "rgba(244, 114, 182, 0.9)";
    ctx.beginPath();
    ctx.ellipse(0, -enemy.height / 2, enemy.width / 2, enemy.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.beginPath();
    ctx.arc(-6, -enemy.height * 0.4, 4, 0, Math.PI * 2);
    ctx.arc(6, -enemy.height * 0.4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawHazards() {
  ctx.fillStyle = "rgba(220, 38, 38, 0.45)";
  for (const hazard of worldState.hazards) {
    const screenY = toScreenY(hazard.y);
    ctx.beginPath();
    ctx.roundRect(hazard.x - hazard.width / 2, screenY - hazard.height, hazard.width, hazard.height, 8);
    ctx.fill();
  }
}

function drawEffigies() {
  for (const effigy of worldState.effigyNodes) {
    const screenY = toScreenY(effigy.y);
    const pulse = (Math.sin(effigy.phase) + 1) / 2;
    const radius = effigy.radius + pulse * 6;
    ctx.beginPath();
    ctx.arc(effigy.x, screenY, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(250, 204, 21, ${0.55 + pulse * 0.35})`;
    ctx.fill();
    ctx.strokeStyle = "rgba(253, 224, 71, 0.9)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawPlayer() {
  const player = worldState.player;
  const screenY = toScreenY(player.y);
  ctx.save();
  ctx.translate(player.x, screenY - player.height);
  ctx.fillStyle = "rgba(226, 232, 240, 0.95)";
  ctx.fillRect(-player.width / 2, 0, player.width, player.height);
  ctx.fillStyle = "rgba(30, 41, 59, 0.92)";
  ctx.fillRect(-player.width / 2, 0, player.width, player.height * 0.45);
  ctx.fillStyle = "#f97316";
  ctx.fillRect(-player.width / 2, player.height * 0.62, player.width, player.height * 0.12);
  ctx.restore();
}

function drawFog() {
  const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - 200);
  gradient.addColorStop(0, "rgba(148, 163, 184, 0.45)");
  gradient.addColorStop(1, "rgba(148, 163, 184, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, canvas.height - 200, canvas.width, 200);
}

function updateHud() {
  altitudeReadout.textContent = `${Math.floor(worldState.altitude)} ft`;
  if (worldState.multiplier > 1) {
    multiplierNote.textContent = `x${worldState.multiplier} score`;
    multiplierNote.classList.add("is-active");
  } else {
    multiplierNote.textContent = "x1 score";
    multiplierNote.classList.remove("is-active");
  }
  const nervePercent = Math.max(0, Math.round((worldState.nerve / worldState.maxNerve) * 100));
  nerveFill.style.width = `${nervePercent}%`;
  nerveMeter.setAttribute("aria-valuenow", String(nervePercent));
  nerveReadout.textContent = `${nervePercent}%`;
  effigyReadout.textContent = String(worldState.effigies);
}

function toScreenY(worldY) {
  return canvas.height - (worldY - worldState.cameraBase);
}

function collides(player, object) {
  const halfWidth = (object.width ?? 0) / 2;
  const objectLeft = object.x - halfWidth;
  const objectRight = object.x + halfWidth;
  const objectBottom = object.y;
  const objectTop = objectBottom - (object.height ?? 0);
  const playerLeft = player.x - player.width / 2;
  const playerRight = player.x + player.width / 2;
  const playerTop = player.y - player.height;
  const playerBottom = player.y;
  return (
    playerRight > objectLeft &&
    playerLeft < objectRight &&
    playerBottom > objectTop &&
    playerTop < objectBottom
  );
}

function intersectsCircle(player, circle) {
  const playerLeft = player.x - player.width / 2;
  const playerRight = player.x + player.width / 2;
  const playerTop = player.y - player.height;
  const playerBottom = player.y;
  const closestX = clamp(circle.x, playerLeft, playerRight);
  const closestY = clamp(circle.y, playerTop, playerBottom);
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return dx * dx + dy * dy <= circle.radius * circle.radius;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createAudioEngine() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const context = AudioContextClass ? new AudioContextClass() : null;
  let unlocked = false;

  function unlock() {
    if (!context || unlocked) {
      return;
    }
    if (context.state === "suspended") {
      context.resume();
    }
    unlocked = true;
  }

  function playTone({ frequency, duration = 0.2, type = "sine", gain = 0.2 }) {
    if (!context) {
      return;
    }
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gainNode.gain.value = gain;
    oscillator.connect(gainNode).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }

  function playNoise(duration = 0.4, gain = 0.2) {
    if (!context) {
      return;
    }
    const bufferSize = context.sampleRate * duration;
    const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    const noiseSource = context.createBufferSource();
    noiseSource.buffer = buffer;
    const gainNode = context.createGain();
    gainNode.gain.value = gain;
    noiseSource.connect(gainNode).connect(context.destination);
    noiseSource.start();
    noiseSource.stop(context.currentTime + duration);
  }

  return {
    unlock,
    playJump() {
      playTone({ frequency: 680, duration: 0.14, gain: 0.08, type: "triangle" });
    },
    playHiss() {
      playNoise(0.25, 0.16);
    },
    playDamage() {
      playTone({ frequency: 120, duration: 0.22, gain: 0.22, type: "sawtooth" });
      playNoise(0.35, 0.18);
    },
    playEffigy() {
      playTone({ frequency: 420, duration: 0.2, gain: 0.1, type: "triangle" });
      playTone({ frequency: 660, duration: 0.25, gain: 0.08, type: "sine" });
    },
  };
}
