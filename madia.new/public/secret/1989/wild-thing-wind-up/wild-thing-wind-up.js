import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { mountParticleField } from "../particles.js";
import { autoEnhanceFeedback, createLogChannel, createStatusChannel } from "../feedback.js";

const GAME_ID = "wild-thing-wind-up";
const RUN_LIMIT = 5;
const POWER_MAX = 1.15;
const WILD_THRESHOLD = 1.0;
const POWER_SPEED = 0.95; // units per second
const SWEEP_MIN = 0.18;
const SWEEP_MAX = 0.82;

const particleField = mountParticleField({
  effects: {
    palette: ["#f97316", "#38bdf8", "#facc15", "#22d3ee", "#a855f7"],
    ambientDensity: 0.48,
  },
});

const scoreConfig = getScoreConfig(GAME_ID);
const highScore = initHighScoreBanner({
  gameId: GAME_ID,
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

autoEnhanceFeedback({ statusSelectors: ["#status-bar"], logSelectors: ["#event-log"] });

const startButton = document.getElementById("start-button");
const pitchButton = document.getElementById("pitch-button");
const timeButton = document.getElementById("time-button");

const inningValue = document.getElementById("inning-value");
const strikeoutsValue = document.getElementById("strikeouts-value");
const runsValue = document.getElementById("runs-value");
const wildSuccessValue = document.getElementById("wild-success-value");
const ballsValue = document.getElementById("balls-value");
const strikesValue = document.getElementById("strikes-value");
const outsValue = document.getElementById("outs-value");

const powerTrack = document.getElementById("power-track");
const powerFill = document.getElementById("power-fill");
const powerReadout = document.getElementById("power-readout");
const powerState = document.getElementById("power-state");

const plateLane = document.getElementById("plate-lane");
const catcherCall = document.getElementById("catcher-call");
const strikeZone = document.getElementById("strike-zone");
const targetMarker = document.getElementById("target-marker");
const accuracySweep = document.getElementById("accuracy-sweep");
const ballFlight = document.getElementById("ball-flight");
const accuracyModule = document.querySelector(".accuracy-module");

const statusChannel = createStatusChannel(document.getElementById("status-bar"));
const logChannel = createLogChannel(document.getElementById("event-log"), { limit: 16 });

const wrapUpRoot = document.getElementById("wrap-up");
const wrapUpStrikeouts = document.getElementById("wrap-up-strikeouts");
const wrapUpInnings = document.getElementById("wrap-up-innings");
const wrapUpRuns = document.getElementById("wrap-up-runs");
const wrapUpWild = document.getElementById("wrap-up-wild");
const wrapUpNote = document.getElementById("wrap-up-note");
const wrapUpReplay = document.getElementById("wrap-up-replay");
const wrapUpClose = document.getElementById("wrap-up-close");

const TARGET_ZONES = [
  { label: "High Inside", x: 0.32, y: 0.24 },
  { label: "High Away", x: 0.68, y: 0.22 },
  { label: "Middle", x: 0.5, y: 0.5 },
  { label: "Low In", x: 0.36, y: 0.78 },
  { label: "Low Away", x: 0.7, y: 0.8 },
  { label: "Down the Pipe", x: 0.5, y: 0.42 },
  { label: "Backdoor Drop", x: 0.76, y: 0.46 },
  { label: "Front Door", x: 0.28, y: 0.55 },
];

const WILD_FAIL_OUTCOMES = [
  "The ball rockets into the press box—camera ducks too late!",
  "Mascot takes one off the foam snout and tumbles backward over the dugout.",
  "That heater drills the on-deck circle and explodes a pyramid of helmets.",
  "It caroms off the backstop, showering popcorn on the luxury boxes.",
  "Line-drive souvenir. Some lucky fan just caught a 105 mph gift.",
];

const CROWD_ROARS = [
  "Crowd erupts as the mitt detonates!",
  "The stadium lights flicker from that sonic boom!",
  "Every seat is shaking—Wild Thing owns the moment!",
];

let powerAnimation = null;
let accuracyAnimation = null;

const state = {
  active: false,
  gameOver: false,
  phase: "idle",
  inning: 1,
  completedInnings: 0,
  outs: 0,
  balls: 0,
  strikes: 0,
  runs: 0,
  strikeouts: 0,
  wildSuccesses: 0,
  powerLevel: 0,
  powerDirection: 1,
  lastPowerTimestamp: 0,
  target: TARGET_ZONES[2],
  pointerX: 0.5,
  pointerY: 0.5,
  pointerDirection: 1,
  lastAccuracyTimestamp: 0,
  isWildAttempt: false,
  powerLocked: 0,
  difficulty: getDifficulty(1),
};

setup();

function setup() {
  updateScoreboard();
  updateCounts();
  updatePowerDisplay();
  setNewTarget();
  logChannel.push("Tap Start Warm-Up to take the mound.", "info");
  statusChannel("Tap Start Warm-Up to take the mound.", "info");

  startButton.addEventListener("click", () => {
    if (state.gameOver) {
      hideWrapUp();
    }
    startGame();
  });

  pitchButton.addEventListener("click", () => {
    advancePitchPhase();
  });

  timeButton.addEventListener("click", () => {
    callTime();
  });

  wrapUpReplay.addEventListener("click", () => {
    hideWrapUp();
    startGame();
  });

  wrapUpClose.addEventListener("click", () => {
    hideWrapUp();
    statusChannel("Take a breather, then warm up for another shot.", "info");
  });

  ballFlight.addEventListener("animationend", () => {
    ballFlight.className = "ball-flight";
  });

  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented) {
      return;
    }
    if (event.key === "Escape") {
      if (state.active && !state.gameOver) {
        callTime();
        event.preventDefault();
      }
      return;
    }
    if (event.code === "Space") {
      if (state.active && !state.gameOver) {
        advancePitchPhase();
        event.preventDefault();
      }
    }
  });
}

function startGame() {
  resetState();
  state.active = true;
  state.gameOver = false;
  startButton.textContent = "Restart Warm-Up";
  pitchButton.disabled = false;
  pitchButton.textContent = "Start Wind-Up";
  pitchButton.setAttribute("aria-label", "Start the wind-up phase");
  timeButton.disabled = false;
  logChannel.push("Bullpen door opens. The Wild Thing stalks to the hill.", "info");
  statusChannel("Wind up to fire the first pitch.", "info");
}

function resetState() {
  cancelPowerAnimation();
  cancelAccuracyAnimation();
  state.phase = "idle";
  state.inning = 1;
  state.completedInnings = 0;
  state.outs = 0;
  state.balls = 0;
  state.strikes = 0;
  state.runs = 0;
  state.strikeouts = 0;
  state.wildSuccesses = 0;
  state.powerLevel = 0;
  state.powerDirection = 1;
  state.lastPowerTimestamp = 0;
  state.pointerX = 0.5;
  state.pointerY = 0.5;
  state.pointerDirection = 1;
  state.lastAccuracyTimestamp = 0;
  state.isWildAttempt = false;
  state.powerLocked = 0;
  state.difficulty = getDifficulty(1);
  updateScoreboard();
  updateCounts();
  updatePowerDisplay();
  setNewTarget();
  hideWrapUp();
}

function advancePitchPhase() {
  if (!state.active || state.gameOver) {
    return;
  }
  if (state.phase === "idle") {
    startPowerPhase();
    return;
  }
  if (state.phase === "power") {
    lockPowerLevel();
    return;
  }
  if (state.phase === "accuracy") {
    lockAccuracy();
  }
}

function startPowerPhase() {
  state.phase = "power";
  state.powerLevel = 0;
  state.powerDirection = 1;
  state.lastPowerTimestamp = performance.now();
  updatePowerDisplay();
  setPowerState("Building Heat", "charging");
  pitchButton.textContent = "Lock Power";
  pitchButton.setAttribute("aria-label", "Lock the power level");
  logChannel.push("Power meter live. Ride the surge.", "info");
  statusChannel("Ride the power meter and lock it near the peak.", "info");
  cancelPowerAnimation();
  powerAnimation = window.requestAnimationFrame(stepPowerMeter);
}

function stepPowerMeter(timestamp) {
  if (state.phase !== "power") {
    return;
  }
  const deltaSeconds = Math.min((timestamp - state.lastPowerTimestamp) / 1000, 0.12);
  state.lastPowerTimestamp = timestamp;
  state.powerLevel += state.powerDirection * POWER_SPEED * deltaSeconds;
  if (state.powerLevel >= POWER_MAX) {
    state.powerLevel = POWER_MAX;
    state.powerDirection = -1;
  } else if (state.powerLevel <= 0) {
    state.powerLevel = 0;
    state.powerDirection = 1;
  }
  updatePowerDisplay();
  powerAnimation = window.requestAnimationFrame(stepPowerMeter);
}

function lockPowerLevel() {
  if (state.phase !== "power") {
    return;
  }
  cancelPowerAnimation();
  state.powerLocked = state.powerLevel;
  state.isWildAttempt = state.powerLocked >= WILD_THRESHOLD;
  setPowerState(state.isWildAttempt ? "Wild Thing" : "Locked", state.isWildAttempt ? "wild" : "locked");
  pitchButton.textContent = "Snap Release";
  pitchButton.setAttribute("aria-label", "Snap the release for accuracy");
  statusChannel(state.isWildAttempt ? "Wild Thing attempt! The accuracy sweep is about to go berserk." : "Power locked. Track the glove and snap the release.", state.isWildAttempt ? "warning" : "info");
  startAccuracyPhase();
}

function startAccuracyPhase() {
  state.phase = "accuracy";
  state.pointerX = state.target.x;
  state.pointerY = state.target.y;
  state.pointerDirection = Math.random() > 0.5 ? 1 : -1;
  state.lastAccuracyTimestamp = performance.now();
  accuracyModule.classList.add("is-active");
  accuracyModule.classList.toggle("is-wild", state.isWildAttempt);
  cancelAccuracyAnimation();
  accuracyAnimation = window.requestAnimationFrame(stepAccuracyMeter);
}

function stepAccuracyMeter(timestamp) {
  if (state.phase !== "accuracy") {
    return;
  }
  const deltaSeconds = Math.min((timestamp - state.lastAccuracyTimestamp) / 1000, 0.12);
  state.lastAccuracyTimestamp = timestamp;
  const speed = getSweepSpeed();
  state.pointerX += state.pointerDirection * speed * deltaSeconds;
  if (state.pointerX <= SWEEP_MIN) {
    state.pointerX = SWEEP_MIN;
    state.pointerDirection = 1;
  } else if (state.pointerX >= SWEEP_MAX) {
    state.pointerX = SWEEP_MAX;
    state.pointerDirection = -1;
  }

  const jitterStrength = state.isWildAttempt
    ? state.difficulty.jitter * 4
    : state.difficulty.jitter * 1.5;
  const jitter = (Math.random() - 0.5) * jitterStrength;
  state.pointerY = clamp(state.target.y + jitter, 0.2, 0.85);

  positionSweep();
  accuracyAnimation = window.requestAnimationFrame(stepAccuracyMeter);
}

function lockAccuracy() {
  if (state.phase !== "accuracy") {
    return;
  }
  cancelAccuracyAnimation();
  accuracyModule.classList.remove("is-active");
  accuracyModule.classList.remove("is-wild");
  resolvePitch();
}

function resolvePitch() {
  state.phase = "idle";
  const dx = state.pointerX - state.target.x;
  const dy = state.pointerY - state.target.y;
  const diff = Math.hypot(dx, dy);
  const baseTolerance = state.difficulty.window * (state.isWildAttempt ? 0.72 : 1);
  const perfectCutoff = baseTolerance * 0.45;
  const chaseCutoff = baseTolerance;
  const contactCutoff = baseTolerance * (state.isWildAttempt ? 1.18 : 1.42);
  const chaosCutoff = baseTolerance * (state.isWildAttempt ? 1.72 : 1.95);
  const velocity = state.powerLocked;

  if (state.isWildAttempt && diff <= perfectCutoff) {
    triggerBallFlight("wild");
    particleField.emitBurst(1.45);
    shakePlate();
    const result = registerStrike({ forceStrikeout: true, wildBonus: true });
    logChannel.push("Wild Thing detonates the mitt! Automatic punch-out.", "success");
    statusChannel(randomChoice(CROWD_ROARS), "success");
    afterPitch(result);
    return;
  }

  if (diff <= perfectCutoff) {
    triggerBallFlight(state.isWildAttempt ? "wild" : "standard");
    particleField.emitSparkle(state.isWildAttempt ? 1.1 : 0.8);
    const message = velocity >= 0.9
      ? "Heater paints the letters. Batter frozen."
      : "Painted the black. Ump rings him up.";
    const result = registerStrike({});
    logChannel.push(message, "success");
    statusChannel(`Strike! Count ${state.balls}-${state.strikes}.`, "success");
    afterPitch(result);
    return;
  }

  if (diff <= chaseCutoff) {
    const aggressive = velocity >= 0.75 || state.isWildAttempt;
    if (aggressive) {
      triggerBallFlight(state.isWildAttempt ? "wild" : "standard");
      particleField.emitSparkle(0.7);
      const foul = Math.random() < 0.24 && state.strikes >= 2;
      const result = registerStrike({ foul });
      if (foul) {
        logChannel.push("Foul tip keeps the at-bat alive.", "info");
        statusChannel(`Foul tip. Count ${state.balls}-${state.strikes}.`, "info");
      } else {
        logChannel.push("Batter chases the breaker out of the zone.", "success");
        statusChannel(`Swing and miss! Count ${state.balls}-${state.strikes}.`, "success");
      }
      afterPitch(result);
    } else {
      triggerBallFlight("standard");
      const outcome = registerBall({ addRun: false });
      logChannel.push("Just off the plate. The batter watches it sail by.", "warning");
      statusChannel(`Ball. Count ${state.balls}-${state.strikes}.`, "warning");
      afterPitch(outcome);
    }
    return;
  }

  if (diff <= contactCutoff) {
    const foulChance = state.strikes < 2 ? 0.58 : 0.34;
    if (Math.random() < foulChance) {
      triggerBallFlight("standard");
      const result = registerStrike({ foul: true });
      logChannel.push("Foul into the third deck netting.", "info");
      statusChannel(`Foul. Count ${state.balls}-${state.strikes}.`, "info");
      afterPitch(result);
      return;
    }
    const outChance = Math.max(0.25, 0.55 - state.inning * 0.04 - state.runs * 0.02);
    if (Math.random() < outChance) {
      triggerBallFlight("standard");
      const result = registerContact({ type: "out" });
      logChannel.push("Weak dribbler to short. Easy toss for the out.", "success");
      statusChannel(`Out recorded. ${state.outs} ${state.outs === 1 ? "out" : "outs"}.`, "success");
      afterPitch(result);
    } else {
      triggerBallFlight("standard");
      const result = registerContact({ type: "run" });
      logChannel.push("Shot through the gap! Run crosses the plate.", "danger");
      statusChannel(`Run scores. Total runs ${state.runs}.`, "danger");
      afterPitch(result);
    }
    return;
  }

  if (diff <= chaosCutoff) {
    triggerBallFlight("standard");
    if (velocity <= 0.5) {
      const outcome = registerBall({ addRun: false });
      logChannel.push("Off-speed tumbles out of the zone.", "warning");
      statusChannel(`Ball. Count ${state.balls}-${state.strikes}.`, "warning");
      afterPitch(outcome);
    } else {
      const result = registerContact({ type: "run" });
      logChannel.push("Batter ropes it down the line. RBI single.", "danger");
      statusChannel(`Run scores. Total runs ${state.runs}.`, "danger");
      triggerBallFlight("chaos");
      shakePlate();
      afterPitch(result);
    }
    return;
  }

  triggerBallFlight("chaos");
  shakePlate();
  const chaosOutcome = state.isWildAttempt ? randomChoice(WILD_FAIL_OUTCOMES) : "That one drills the batter—he takes his base.";
  const result = registerBall({ addRun: true });
  logChannel.push(state.isWildAttempt ? chaosOutcome : "Plunked him. The dugout is jawing.", "danger");
  statusChannel(`Wild miss. Run scores. Total runs ${state.runs}.`, "danger");
  afterPitch(result);
}

function afterPitch(result) {
  updatePowerDisplay();
  if (!state.gameOver) {
    setPowerState("Idle", "idle");
    pitchButton.textContent = "Start Wind-Up";
    pitchButton.setAttribute("aria-label", "Start the next wind-up");
    setNewTarget();
  }
  if (result === "game-over") {
    concludeGame();
  }
}

function registerStrike({ foul = false, forceStrikeout = false, wildBonus = false }) {
  if (forceStrikeout) {
    state.strikeouts += 1;
    state.outs += 1;
    state.balls = 0;
    state.strikes = 0;
    if (wildBonus) {
      state.wildSuccesses += 1;
    }
    updateCounts();
    updateScoreboard();
    const inningResult = checkInningProgress();
    return inningResult;
  }

  if (foul) {
    if (state.strikes < 2) {
      state.strikes += 1;
    }
    updateCounts();
    return "foul";
  }

  state.strikes += 1;
  if (state.strikes >= 3) {
    state.strikes = 0;
    state.balls = 0;
    state.strikeouts += 1;
    state.outs += 1;
    if (wildBonus) {
      state.wildSuccesses += 1;
    }
    updateCounts();
    updateScoreboard();
    const inningResult = checkInningProgress();
    return inningResult;
  }
  if (wildBonus) {
    state.wildSuccesses += 1;
    updateScoreboard();
  }
  updateCounts();
  return "strike";
}

function registerBall({ addRun }) {
  if (addRun) {
    state.runs += 1;
    state.balls = 0;
    state.strikes = 0;
    updateCounts();
    updateScoreboard();
    if (state.runs >= RUN_LIMIT) {
      state.gameOver = true;
      return "game-over";
    }
    return "run";
  }
  state.balls += 1;
  if (state.balls >= 4) {
    state.runs += 1;
    state.balls = 0;
    state.strikes = 0;
    updateCounts();
    updateScoreboard();
    if (state.runs >= RUN_LIMIT) {
      state.gameOver = true;
      return "game-over";
    }
    return "walk";
  }
  updateCounts();
  return "ball";
}

function registerContact({ type }) {
  state.balls = 0;
  state.strikes = 0;
  if (type === "out") {
    state.outs += 1;
    updateCounts();
    const inningResult = checkInningProgress();
    return inningResult;
  }
  if (type === "run") {
    state.runs += 1;
    updateCounts();
    updateScoreboard();
    if (state.runs >= RUN_LIMIT) {
      state.gameOver = true;
      return "game-over";
    }
    return "run";
  }
  updateCounts();
  return "ball";
}

function checkInningProgress() {
  if (state.outs >= 3) {
    state.completedInnings += 1;
    state.outs = 0;
    state.balls = 0;
    state.strikes = 0;
    state.inning += 1;
    state.difficulty = getDifficulty(state.inning);
    updateCounts();
    updateScoreboard();
    logChannel.push(`Inning ${state.inning - 1} closed. The lineup sharpens for the next frame.`, "info");
    statusChannel(`Frame complete. Welcome to inning ${state.inning}. Target window tightens.`, "info");
    setNewTarget();
    return "inning";
  }
  return "strikeout";
}

function concludeGame() {
  state.gameOver = true;
  state.active = false;
  pitchButton.disabled = true;
  timeButton.disabled = true;
  startButton.textContent = "Start Warm-Up";
  setPowerState("Idle", "idle");
  const inningsPitched = formatInningsPitched();
  wrapUpStrikeouts.textContent = String(state.strikeouts);
  wrapUpRuns.textContent = String(state.runs);
  wrapUpWild.textContent = String(state.wildSuccesses);
  wrapUpInnings.textContent = inningsPitched;
  const scoreResult = highScore.submit(state.strikeouts, {
    innings: inningsPitched,
    runs: state.runs,
    wildThings: state.wildSuccesses,
  });
  if (scoreResult.updated) {
    wrapUpNote.textContent = "New high score! The scoreboard crew paints your name in neon.";
  } else if (scoreResult.entry) {
    wrapUpNote.textContent = `High score still stands at ${scoreConfig.format(scoreResult.entry)}.`;
  } else {
    wrapUpNote.textContent = "Punch out the order again to push your high score even higher.";
  }
  wrapUpRoot.hidden = false;
  window.setTimeout(() => {
    wrapUpReplay.focus();
  }, 90);
  statusChannel("Skipper signals for the pen. Game over—check the box score.", "warning");
}

function hideWrapUp() {
  wrapUpRoot.hidden = true;
}

function callTime() {
  if (!state.active || state.gameOver) {
    return;
  }
  cancelPowerAnimation();
  cancelAccuracyAnimation();
  state.phase = "idle";
  setPowerState("Idle", "idle");
  pitchButton.textContent = "Start Wind-Up";
  pitchButton.setAttribute("aria-label", "Start the wind-up phase");
  statusChannel("Time is called. Reset the sign and breathe.", "info");
}

function cancelPowerAnimation() {
  if (powerAnimation !== null) {
    window.cancelAnimationFrame(powerAnimation);
    powerAnimation = null;
  }
}

function cancelAccuracyAnimation() {
  if (accuracyAnimation !== null) {
    window.cancelAnimationFrame(accuracyAnimation);
    accuracyAnimation = null;
  }
}

function updateScoreboard() {
  inningValue.textContent = String(state.inning);
  strikeoutsValue.textContent = String(state.strikeouts);
  runsValue.textContent = String(state.runs);
  wildSuccessValue.textContent = String(state.wildSuccesses);
}

function updateCounts() {
  ballsValue.textContent = String(state.balls);
  strikesValue.textContent = String(state.strikes);
  outsValue.textContent = String(state.outs);
}

function updatePowerDisplay() {
  const clamped = Math.max(0, Math.min(POWER_MAX, state.powerLevel));
  const percent = Math.round((clamped / POWER_MAX) * 115);
  powerFill.style.height = `${(clamped / POWER_MAX) * 100}%`;
  powerReadout.textContent = `${percent}%`;
  powerTrack.setAttribute("aria-valuenow", String(Math.round((clamped / POWER_MAX) * 115)));
  if (state.phase === "idle" && !state.isWildAttempt) {
    setPowerState("Idle", "idle");
  } else if (state.phase === "power") {
    if (clamped >= WILD_THRESHOLD) {
      setPowerState("Wild Thing", "wild");
    } else {
      setPowerState("Building Heat", "charging");
    }
  }
}

function setPowerState(label, stateName) {
  powerState.textContent = label;
  powerState.dataset.state = stateName;
}

function setNewTarget() {
  state.target = randomChoice(TARGET_ZONES);
  catcherCall.textContent = `Target: ${state.target.label}`;
  const size = Math.max(0.14, state.difficulty.window);
  targetMarker.style.width = `${size * 100}%`;
  targetMarker.style.height = `${size * 100}%`;
  targetMarker.style.left = `${state.target.x * 100}%`;
  targetMarker.style.top = `${state.target.y * 100}%`;
  const sweepSize = Math.max(0.11, state.difficulty.window * 0.68);
  accuracySweep.style.width = `${sweepSize * 100}%`;
  accuracySweep.style.height = `${sweepSize * 100}%`;
  positionSweep();
}

function positionSweep() {
  accuracySweep.style.left = `${state.pointerX * 100}%`;
  accuracySweep.style.top = `${state.pointerY * 100}%`;
}

function triggerBallFlight(mode) {
  ballFlight.className = "ball-flight";
  if (mode === "wild") {
    ballFlight.classList.add("is-wild");
  } else if (mode === "chaos") {
    ballFlight.classList.add("is-chaos");
  } else {
    ballFlight.classList.add("is-standard");
  }
}

function shakePlate() {
  plateLane.classList.add("is-shake");
  window.setTimeout(() => {
    plateLane.classList.remove("is-shake");
  }, 360);
}

function formatInningsPitched() {
  const totalOuts = state.completedInnings * 3 + state.outs;
  const whole = Math.floor(totalOuts / 3);
  const remainder = totalOuts % 3;
  return `${whole}.${remainder}`;
}

function getSweepSpeed() {
  const base = state.difficulty.sweepSpeed;
  return state.isWildAttempt ? base * 1.65 : base;
}

function getDifficulty(inning) {
  const level = Math.max(1, Math.min(12, inning));
  const window = Math.max(0.12, 0.28 - (level - 1) * 0.015);
  const sweepSpeed = 0.65 + (level - 1) * 0.08;
  const jitter = 0.008 + (level - 1) * 0.0025;
  return { window, sweepSpeed, jitter };
}

function randomChoice(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
