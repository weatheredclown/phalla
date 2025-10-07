import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { mountParticleField } from "../particles.js";
import { autoEnhanceFeedback, createLogChannel, createStatusChannel } from "../feedback.js";
import { createWrapUpDialog } from "../wrap-up-dialog.js";

const particleField = mountParticleField({
  effects: {
    palette: ["#22d3ee", "#7c3aed", "#f97316", "#facc15", "#a855f7"],
    ambientDensity: 0.68,
  },
});

const scoreConfig = getScoreConfig("power-glove-prodigy");
const highScore = initHighScoreBanner({
  gameId: "power-glove-prodigy",
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

const startButton = document.getElementById("start-button");
const resetButton = document.getElementById("reset-button");
const arena = document.querySelector(".arena");
const scoreValue = document.getElementById("score-value");
const multiplierValue = document.getElementById("multiplier-value");
const streakValue = document.getElementById("streak-value");
const streakBestValue = document.getElementById("streak-best");
const hypeFill = document.getElementById("hype-fill");
const hypeValue = document.getElementById("hype-value");
const phaseTrack = document.getElementById("phase-track");
const challengeTitle = document.getElementById("challenge-title");
const challengeText = document.getElementById("challenge-text");
const patternDisplay = document.getElementById("pattern-display");
const challengeTimer = document.getElementById("challenge-timer");
const statusLine = document.getElementById("status-line");
const logList = document.getElementById("event-log");
const wrapUp = document.getElementById("wrap-up");
const inspirationSection = document.querySelector(".inspiration");
const inspirationButton = document.getElementById("inspiration-button");
const inspirationText = document.getElementById("inspiration-text");
const wrapUpScore = document.getElementById("summary-score");
const wrapUpStreak = document.getElementById("summary-streak");
const wrapUpMultiplier = document.getElementById("summary-multiplier");
const wrapUpHype = document.getElementById("summary-hype");
const wrapUpReplay = document.getElementById("wrap-up-replay");
const wrapUpClose = document.getElementById("wrap-up-close");

const wrapUpDialog = createWrapUpDialog(wrapUp);

autoEnhanceFeedback(document.body);
const statusChannel = createStatusChannel(statusLine);
const logChannel = createLogChannel(logList, { limit: 20, mode: "prepend" });

const INPUTS = {
  A: {
    id: "A",
    label: "A",
    icon: "A",
    keys: ["KeyZ", "KeyA", "Digit1", "Numpad1"],
  },
  B: {
    id: "B",
    label: "B",
    icon: "B",
    keys: ["KeyX", "KeyS", "Digit2", "Numpad2"],
  },
  UP: {
    id: "UP",
    label: "Up",
    icon: "↑",
    keys: ["ArrowUp", "KeyK", "Numpad8"],
  },
  DOWN: {
    id: "DOWN",
    label: "Down",
    icon: "↓",
    keys: ["ArrowDown", "KeyJ", "Numpad5"],
  },
};

const TRACKS = [
  {
    id: "qualifiers",
    name: "Qualifiers",
    intro: "Qualifier lights glow. Keep the strings crisp to impress the scouts.",
    outro: "Qualifiers conquered. The pit crew swaps carts for semifinals.",
    basePoints: 280,
    hypeBoost: 12,
    challenges: [
      {
        id: "warp-zone",
        title: "Warp Zone Warmup",
        text: "Queue the warp whistle flourish and slide into the hidden lane before the camera swing.",
        pattern: ["UP", "UP", "DOWN", "DOWN"],
        window: 5200,
        successLog: "Warp Zone slotted. Crowd warms up with a synth sweep.",
        failureLog: "Warp string fumbled. Spotlight drifts to the rival station.",
      },
      {
        id: "bonus-chain",
        title: "Bonus Chain Mash",
        text: "Snag the bonus coins with alternating taps—no dropped beats or the announcer yawns.",
        pattern: ["A", "B", "A", "B"],
        window: 5000,
        successLog: "Bonus chain flawless. Multiplier display pulses neon.",
        failureLog: "Bonus chain scuffed. Panel meter flickers in disappointment.",
      },
      {
        id: "pipeline-drift",
        title: "Pipeline Drift",
        text: "Feather the d-pad to dodge the rotating drones and land back on the track with swagger.",
        pattern: ["UP", "DOWN", "DOWN", "UP"],
        window: 5400,
        successLog: "Pipeline drift perfect. Hype meter hums louder.",
        failureLog: "Drone collision. Crowd murmurs and the lights dim.",
      },
    ],
  },
  {
    id: "semifinals",
    name: "Semifinals",
    intro: "Semifinal bracket begins. Commentary booth is tracking every flick.",
    outro: "Semifinals secure. Championship board flips to your name.",
    basePoints: 340,
    hypeBoost: 16,
    challenges: [
      {
        id: "cliff-side",
        title: "Cliffside Boost",
        text: "Turbo off the canyon edge, charge the glove, and land on the bonus pad.",
        pattern: ["B", "B", "UP", "A", "UP"],
        window: 5200,
        successLog: "Cliffside boost landed. Crowd erupts in laser-white confetti.",
        failureLog: "Turbo mistimed. Canyon echoes with a collective gasp.",
      },
      {
        id: "mirror-match",
        title: "Mirror Match Mindgame",
        text: "Predict the mirrored opponent and reverse their rhythm without blinking.",
        pattern: ["DOWN", "UP", "A", "DOWN", "B"],
        window: 5600,
        successLog: "Mirror broken. Rival glances over in disbelief.",
        failureLog: "Mirror steals the round. Hype leaks through the floor grate.",
      },
      {
        id: "combo-finale",
        title: "Combo Finale",
        text: "The judges cue a tricky five-piece. Hit every cue to keep your semifinal advantage.",
        pattern: ["A", "UP", "B", "DOWN", "A"],
        window: 5500,
        successLog: "Combo finale perfect. The booth shouts about Turbo Overflow chances.",
        failureLog: "Combo finale slips. The monitors flash a warning banner.",
      },
    ],
  },
  {
    id: "championship",
    name: "Championship",
    intro: "Championship spotlight ignites. Every beat is a broadcast highlight.",
    outro: "Champion crowned. The crowd chants your callsign.",
    basePoints: 420,
    hypeBoost: 22,
    challenges: [
      {
        id: "tournament-glide",
        title: "Tournament Glide",
        text: "Float between obstacles, double-tap to hover, and spike the landing on the scoring pad.",
        pattern: ["UP", "A", "UP", "B", "DOWN"],
        window: 5600,
        successLog: "Tournament glide nails it. Hype meter blazes near capacity.",
        failureLog: "Hover misfire. Crowd dims and the announcer hesitates.",
      },
      {
        id: "power-gauntlet",
        title: "Power Gauntlet",
        text: "The glove glows red-hot—chain alternating taps to deflect every incoming projectile.",
        pattern: ["A", "B", "A", "B", "A"],
        window: 5400,
        successLog: "Power gauntlet cleared. Sparks spiral toward the rafters.",
        failureLog: "Gauntlet overload. Sparks fizzle before the scoreboard.",
      },
      {
        id: "turbo-overflow",
        title: "Turbo Overflow",
        text: "Crowd demands the secret macro. Cycle d-pad flicks before sealing with a face button blitz.",
        pattern: ["DOWN", "DOWN", "UP", "UP", "B", "A"],
        window: 5800,
        successLog: "Turbo Overflow unleashed. Arena bathed in violet streaks.",
        failureLog: "Overflow stalled. Pressure gauge falls back to zero.",
      },
      {
        id: "victory-crescendo",
        title: "Victory Crescendo",
        text: "Final string—echo the theme, swap pads fast, and hold the last note to stop the clock.",
        pattern: ["A", "UP", "B", "DOWN", "UP", "A"],
        window: 6000,
        successLog: "Victory Crescendo echoes. Championship trophy lifts into view.",
        failureLog: "Crescendo clipped. Trophy hover falters before settling.",
      },
    ],
  },
];

const padButtons = new Map();
document.querySelectorAll(".pad-button").forEach((button) => {
  const inputId = button.dataset.input;
  if (inputId) {
    padButtons.set(inputId, button);
  }
});

const KEY_MAP = new Map();
Object.values(INPUTS).forEach((input) => {
  input.keys.forEach((key) => {
    KEY_MAP.set(key, input.id);
  });
});

const state = {
  playing: false,
  summaryOpen: false,
  trackIndex: 0,
  challengeIndex: 0,
  stepIndex: 0,
  score: 0,
  hype: 0,
  multiplier: 1,
  streak: 0,
  bestStreak: 0,
  multiplierPeak: 1,
  hypePeak: 0,
  awaitingInput: false,
  turboActive: false,
  turboSteps: 0,
};

let timerId = null;
let timerDeadline = 0;
let timerDuration = 0;
let audioContext = null;

function ensureAudioContext() {
  if (audioContext) {
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {
        /* ignore */
      });
    }
    return audioContext;
  }
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) {
    return null;
  }
  audioContext = new Ctor();
  return audioContext;
}

function scheduleTone({ frequency, duration = 0.18, delay = 0, gain = 0.18, type = "square" }) {
  const ctx = ensureAudioContext();
  if (!ctx) {
    return;
  }
  const osc = ctx.createOscillator();
  const envelope = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  envelope.gain.value = 0;
  osc.connect(envelope);
  envelope.connect(ctx.destination);
  const start = ctx.currentTime + delay;
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.linearRampToValueAtTime(gain, start + 0.02);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

const fx = {
  pressPad(inputId) {
    const button = padButtons.get(inputId);
    if (!button) {
      return;
    }
    button.classList.remove("is-active");
    // eslint-disable-next-line no-unused-expressions
    button.offsetWidth;
    button.classList.add("is-active");
    window.setTimeout(() => {
      button.classList.remove("is-active");
    }, 140);
    scheduleTone({ frequency: inputId === "B" ? 392 : 330, duration: 0.1, gain: 0.15, type: "sawtooth" });
  },
  stepSuccess() {
    scheduleTone({ frequency: 523.25, duration: 0.14, gain: 0.16, type: "square" });
  },
  successBurst() {
    particleField.emitBurst(1.08);
    scheduleTone({ frequency: 659.25, duration: 0.2, gain: 0.2, type: "square" });
    scheduleTone({ frequency: 783.99, duration: 0.18, delay: 0.12, gain: 0.18, type: "triangle" });
  },
  phaseCelebrate() {
    particleField.emitSparkle(1.16);
    scheduleTone({ frequency: 880, duration: 0.3, gain: 0.24, type: "triangle" });
    scheduleTone({ frequency: 1174.66, duration: 0.25, delay: 0.15, gain: 0.2, type: "sawtooth" });
  },
  failure() {
    particleField.emitBurst(0.9);
    scheduleTone({ frequency: 196, duration: 0.25, gain: 0.22, type: "sawtooth" });
    scheduleTone({ frequency: 110, duration: 0.35, delay: 0.12, gain: 0.18, type: "triangle" });
    animateArena("is-shake");
  },
  turboOn() {
    particleField.emitSparkle(1.24);
    scheduleTone({ frequency: 987.77, duration: 0.4, gain: 0.28, type: "square" });
    scheduleTone({ frequency: 1318.51, duration: 0.35, delay: 0.18, gain: 0.22, type: "triangle" });
  },
};

function animateArena(className) {
  if (!arena) {
    return;
  }
  arena.classList.remove(className);
  // eslint-disable-next-line no-unused-expressions
  arena.offsetWidth;
  arena.classList.add(className);
  window.setTimeout(() => {
    arena.classList.remove(className);
  }, 320);
}

function updatePhaseTrack() {
  const items = phaseTrack.querySelectorAll("li");
  items.forEach((item, index) => {
    item.dataset.current = String(index === state.trackIndex);
    item.dataset.complete = String(index < state.trackIndex);
  });
}

function updateScoreboard() {
  scoreValue.textContent = state.score.toLocaleString();
  multiplierValue.textContent = `×${state.multiplier.toFixed(1)}`;
  streakValue.textContent = state.streak.toString();
  streakBestValue.textContent = state.bestStreak.toString();
  const hypeRounded = Math.round(state.hype);
  hypeFill.style.setProperty("--progress", hypeRounded.toString());
  hypeFill.parentElement?.setAttribute("aria-valuenow", hypeRounded.toString());
  hypeValue.textContent = `${hypeRounded}%`;
  if (arena) {
    if (state.turboActive) {
      arena.dataset.mode = "turbo";
    } else {
      delete arena.dataset.mode;
    }
  }
}

function stopTimer() {
  if (timerId !== null) {
    window.cancelAnimationFrame(timerId);
    timerId = null;
  }
}

function startTimer(duration) {
  stopTimer();
  timerDuration = duration;
  timerDeadline = performance.now() + duration;
  challengeTimer.style.setProperty("--progress", "1");
  const tick = () => {
    if (!state.awaitingInput) {
      timerId = null;
      challengeTimer.style.setProperty("--progress", "0");
      return;
    }
    const now = performance.now();
    const remaining = timerDeadline - now;
    if (remaining <= 0) {
      timerId = null;
      challengeTimer.style.setProperty("--progress", "0");
      handleFailure("timeout");
      return;
    }
    const progress = Math.max(0, remaining / timerDuration);
    challengeTimer.style.setProperty("--progress", progress.toFixed(3));
    timerId = window.requestAnimationFrame(tick);
  };
  timerId = window.requestAnimationFrame(tick);
}

function getCurrentTrack() {
  return TRACKS[state.trackIndex];
}

function getCurrentChallenge() {
  const track = getCurrentTrack();
  if (!track) {
    return null;
  }
  return track.challenges[state.challengeIndex] ?? null;
}

function renderChallenge(challenge) {
  challengeTitle.textContent = challenge.title;
  challengeText.textContent = challenge.text;
  patternDisplay.innerHTML = "";
  challenge.pattern.forEach((inputId, index) => {
    const input = INPUTS[inputId];
    const step = document.createElement("span");
    step.className = "pattern-step";
    step.dataset.input = inputId;
    if (index === 0) {
      step.dataset.state = "active";
    } else {
      step.dataset.state = "pending";
    }
    step.textContent = input?.icon ?? inputId;
    patternDisplay.append(step);
  });
}

function queueNext(callback, delay = 650) {
  window.setTimeout(() => {
    callback();
  }, delay);
}

function activateTurbo() {
  if (state.turboActive) {
    state.turboSteps = Math.max(state.turboSteps, 3);
    return;
  }
  state.turboActive = true;
  state.turboSteps = 3;
  fx.turboOn();
  statusChannel("Turbo Overflow engaged! Multipliers surge for the next strings.", "success");
  logChannel.push("Turbo Overflow lights the stage. Spectators chant your callsign.", "success");
  updateScoreboard();
}

function deactivateTurbo() {
  if (!state.turboActive) {
    return;
  }
  state.turboActive = false;
  state.turboSteps = 0;
  statusChannel("Turbo Overflow winds down. Keep the hype alive to trigger it again.", "info");
  updateScoreboard();
}

function handleChallengeClear(challenge) {
  const track = getCurrentTrack();
  if (!track) {
    return;
  }
  state.awaitingInput = false;
  stopTimer();
  const patternBonus = challenge.pattern.length * 18;
  const turboMultiplier = state.turboActive ? 1.25 : 1;
  const baseScore = challenge.points ?? track.basePoints;
  const streakBonus = state.streak * 24;
  const increment = Math.round((baseScore + patternBonus + streakBonus) * state.multiplier * turboMultiplier);
  state.score += increment;
  state.streak += 1;
  state.bestStreak = Math.max(state.bestStreak, state.streak);
  state.multiplier = Math.min(8, state.multiplier + 0.35 + challenge.pattern.length * 0.08 + (state.turboActive ? 0.2 : 0));
  state.multiplierPeak = Math.max(state.multiplierPeak, state.multiplier);
  const hypeGain = (challenge.hype ?? track.hypeBoost) + state.streak * 1.5 + (state.turboActive ? 6 : 0);
  state.hype = Math.min(100, state.hype + hypeGain);
  state.hypePeak = Math.max(state.hypePeak, state.hype);
  fx.successBurst();
  updateScoreboard();
  logChannel.push(`${track.name}: ${challenge.successLog}`, "success");
  statusChannel(`${challenge.title} cleared! Multiplier now ×${state.multiplier.toFixed(1)}.`, "success");
  const patternSteps = patternDisplay.querySelectorAll(".pattern-step");
  patternSteps.forEach((step) => {
    step.dataset.state = "complete";
  });
  if (!state.turboActive && state.hype >= 80) {
    activateTurbo();
  }
  if (state.turboActive) {
    state.turboSteps -= 1;
    if (state.turboSteps <= 0) {
      deactivateTurbo();
    }
  }
  queueNext(() => {
    advanceChallenge();
  }, 800);
}

function handleFailure(reason) {
  if (!state.playing || !state.awaitingInput) {
    return;
  }
  const track = getCurrentTrack();
  const challenge = getCurrentChallenge();
  state.awaitingInput = false;
  stopTimer();
  fx.failure();
  const isTimeout = reason === "timeout";
  state.hype = Math.max(0, state.hype - (isTimeout ? 18 : 24));
  state.multiplier = Math.max(1, state.multiplier - (isTimeout ? 0.6 : 0.8));
  state.streak = 0;
  deactivateTurbo();
  updateScoreboard();
  const message = challenge?.failureLog ?? "Sequence dropped.";
  logChannel.push(`${track?.name ?? "Stage"}: ${message}`, "warning");
  statusChannel(`${challenge?.title ?? "Challenge"} missed. Multiplier steadies at ×${state.multiplier.toFixed(1)}.`, "warning");
  const patternSteps = patternDisplay.querySelectorAll(".pattern-step");
  patternSteps.forEach((step) => {
    if (step.dataset.state !== "complete") {
      step.dataset.state = "failed";
    }
  });
  queueNext(() => {
    advanceChallenge();
  }, 900);
}

function advanceChallenge() {
  const track = getCurrentTrack();
  if (!track) {
    finishTournament();
    return;
  }
  state.challengeIndex += 1;
  if (state.challengeIndex >= track.challenges.length) {
    completeTrack();
    return;
  }
  state.stepIndex = 0;
  state.awaitingInput = true;
  const challenge = getCurrentChallenge();
  renderChallenge(challenge);
  statusChannel(`${challenge.title}: Execute ${challenge.pattern.length}-beat string.`, "info");
  startTimer(challenge.window ?? 5200);
}

function completeTrack() {
  const track = getCurrentTrack();
  fx.phaseCelebrate();
  logChannel.push(`${track.name} clear · ${track.outro}`, "success");
  statusChannel(`${track.name} cleared. ${track.outro}`, "success");
  state.trackIndex += 1;
  state.challengeIndex = 0;
  state.stepIndex = 0;
  if (state.trackIndex >= TRACKS.length) {
    finishTournament();
    return;
  }
  updatePhaseTrack();
  const nextTrack = getCurrentTrack();
  queueNext(() => {
    state.awaitingInput = true;
    renderChallenge(nextTrack.challenges[0]);
    statusChannel(`${nextTrack.name}: ${nextTrack.intro}`, "info");
    startTimer(nextTrack.challenges[0].window ?? 5400);
  }, 1000);
}

function finishTournament() {
  stopTimer();
  state.playing = false;
  state.awaitingInput = false;
  deactivateTurbo();
  updatePhaseTrack();
  updateScoreboard();
  statusChannel("Tournament complete! Review the run and chase the leaderboard.", "success");
  logChannel.push(
    `Run complete · ${state.score.toLocaleString()} pts · Best streak ${state.bestStreak} · Peak hype ${Math.round(state.hypePeak)}%`,
    "success",
  );
  showSummary();
  highScore.submit(state.score, {
    bestStreak: state.bestStreak,
    peakMultiplier: Number(state.multiplierPeak.toFixed(1)),
    hypePeak: Math.round(state.hypePeak),
  });
}

function resetBoardState() {
  challengeTitle.textContent = "Awaiting start.";
  challengeText.textContent = "Press Start Tournament to begin the hype run.";
  patternDisplay.innerHTML = "";
  challengeTimer.style.setProperty("--progress", "0");
}

function resetTournament({ keepSummary = false } = {}) {
  stopTimer();
  state.playing = false;
  state.summaryOpen = false;
  state.trackIndex = 0;
  state.challengeIndex = 0;
  state.stepIndex = 0;
  state.score = 0;
  state.hype = 0;
  state.multiplier = 1;
  state.streak = 0;
  state.bestStreak = 0;
  state.multiplierPeak = 1;
  state.hypePeak = 0;
  state.awaitingInput = false;
  deactivateTurbo();
  updatePhaseTrack();
  updateScoreboard();
  resetBoardState();
  if (!keepSummary) {
    hideSummary();
  }
  statusChannel("Tournament reset. Hit Start when you're ready to perform.", "info");
}

function startTournament() {
  if (state.playing) {
    return;
  }
  ensureAudioContext();
  resetTournament();
  state.playing = true;
  updatePhaseTrack();
  const track = getCurrentTrack();
  const challenge = getCurrentChallenge();
  state.awaitingInput = true;
  renderChallenge(challenge);
  statusChannel(`${track.intro}`, "info");
  logChannel.push(`Tournament start · ${track.name} lights up.`, "info");
  startTimer(challenge.window ?? 5200);
}

function showSummary() {
  wrapUpScore.textContent = state.score.toLocaleString();
  wrapUpStreak.textContent = state.bestStreak.toString();
  wrapUpMultiplier.textContent = `×${state.multiplierPeak.toFixed(1)}`;
  wrapUpHype.textContent = `${Math.round(state.hypePeak)}%`;
  wrapUpDialog.open({ focus: wrapUpReplay });
  state.summaryOpen = true;
}

function hideSummary({ restoreFocus = true } = {}) {
  wrapUpDialog.close({ restoreFocus });
  state.summaryOpen = false;
}

function handlePadButtonClick(event) {
  const button = event.currentTarget;
  const inputId = button.dataset.input;
  if (!inputId) {
    return;
  }
  ensureAudioContext();
  handleInput(inputId);
}

function handleInput(inputId) {
  if (!state.playing || !state.awaitingInput) {
    return;
  }
  fx.pressPad(inputId);
  const challenge = getCurrentChallenge();
  if (!challenge) {
    return;
  }
  const expected = challenge.pattern[state.stepIndex];
  if (inputId !== expected) {
    handleFailure("mistake");
    return;
  }
  const steps = patternDisplay.querySelectorAll(".pattern-step");
  const currentStep = steps[state.stepIndex];
  if (currentStep) {
    currentStep.dataset.state = "complete";
  }
  state.stepIndex += 1;
  if (state.stepIndex >= challenge.pattern.length) {
    handleChallengeClear(challenge);
    return;
  }
  const nextStep = steps[state.stepIndex];
  if (nextStep) {
    nextStep.dataset.state = "active";
  }
  fx.stepSuccess();
}

function handleKeyDown(event) {
  if (state.summaryOpen) {
    if (event.key === "Escape") {
      hideSummary();
    }
    return;
  }
  if (event.repeat) {
    return;
  }
  if (event.key === "Enter") {
    if (!state.playing) {
      startTournament();
      event.preventDefault();
    }
    return;
  }
  const inputId = KEY_MAP.get(event.code);
  if (!inputId) {
    return;
  }
  if (event.code.startsWith("Arrow")) {
    event.preventDefault();
  }
  handleInput(inputId);
}

document.addEventListener("keydown", handleKeyDown);

padButtons.forEach((button) => {
  button.addEventListener("click", handlePadButtonClick);
});

startButton.addEventListener("click", () => {
  startTournament();
});

resetButton.addEventListener("click", () => {
  resetTournament();
});

wrapUpReplay.addEventListener("click", () => {
  hideSummary({ restoreFocus: false });
  startTournament();
});

wrapUpClose.addEventListener("click", () => {
  hideSummary();
  statusChannel("Results saved. Fire up another run when ready.", "info");
});

if (inspirationButton && inspirationText) {
  inspirationButton.addEventListener("click", () => {
    inspirationText.hidden = false;
    inspirationButton.hidden = true;
    inspirationButton.setAttribute("aria-expanded", "true");
    if (inspirationSection) {
      inspirationSection.dataset.revealed = "true";
    }
    const inspirationMessage = inspirationText.textContent?.trim();
    if (inspirationMessage) {
      statusChannel(`Inspiration reveal · ${inspirationMessage}`, "info");
      logChannel.push(`Inspiration unlocked · ${inspirationMessage}`, "info");
    } else {
      statusChannel("Cabinet inspiration revealed.", "info");
      logChannel.push("Cabinet inspiration revealed.", "info");
    }
  });
}

resetTournament({ keepSummary: true });
