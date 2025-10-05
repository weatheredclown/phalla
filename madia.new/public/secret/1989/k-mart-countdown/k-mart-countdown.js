import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { mountParticleField } from "../particles.js";
import { autoEnhanceFeedback, createStatusChannel, createLogChannel } from "../feedback.js";

const ROUND_PLAN = [
  { min: 28, max: 44, observation: 5, chaos: 0.14 },
  { min: 48, max: 72, observation: 4.6, chaos: 0.2 },
  { min: 80, max: 128, observation: 4.2, chaos: 0.28 },
  { min: 132, max: 188, observation: 3.8, chaos: 0.35 },
  { min: 190, max: 256, observation: 3.4, chaos: 0.42 },
  { min: 240, max: 320, observation: 3.1, chaos: 0.5 },
];

const SCORE_TABLE = [10000, 8000, 6500, 5400, 4500, 3700, 3000, 2400, 1800, 1200, 500];
const MULTIPLIER_START = 5;
const MULTIPLIER_MIN = 1;
const MULTIPLIER_TICK_MS = 120;
const MULTIPLIER_DECAY_PER_TICK = 0.08;

const particleField = mountParticleField({
  effects: {
    palette: ["#38bdf8", "#f472b6", "#facc15", "#34d399"],
    ambientDensity: 0.4,
  },
});

autoEnhanceFeedback();

const scoreConfig = getScoreConfig("k-mart-countdown");
const highScore = initHighScoreBanner({
  gameId: "k-mart-countdown",
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

const bodyElement = document.body;
const matchstickField = document.getElementById("matchstick-field");
const phaseIndicator = document.getElementById("phase-indicator");
const multiplierReadout = document.getElementById("multiplier-readout");
const scoreTotalElement = document.getElementById("score-total");
const accuracyReadout = document.getElementById("accuracy-readout");
const roundCounter = document.getElementById("round-counter");
const observationTimer = document.getElementById("observation-timer");
const recountValue = document.getElementById("recount-value");
const phaseBanner = document.getElementById("phase-banner");
const guessInput = document.getElementById("guess-input");
const guessForm = document.getElementById("guess-form");
const finalCountButton = document.getElementById("final-count");
const startButton = document.getElementById("start-session");
const nextRoundButton = document.getElementById("next-round");
const replayButton = document.getElementById("replay-session");
const summaryPanel = document.getElementById("summary-panel");
const summaryBody = document.getElementById("summary-body");
const summaryOverview = document.getElementById("summary-overview");
const statusElement = document.getElementById("status-readout");
const eventLog = document.getElementById("event-log");

const statusChannel = createStatusChannel(statusElement);
const logChannel = createLogChannel(eventLog, { limit: 16 });

const state = {
  sessionActive: false,
  phase: "idle",
  roundIndex: -1,
  totalScore: 0,
  bestMultiplier: 1,
  currentRound: null,
  observationHandle: 0,
  observationEndsAt: 0,
  multiplierHandle: 0,
  revealHandle: 0,
  streakPerfect: 0,
  roundHistory: [],
  previousDiff: null,
  accuracyMomentum: 0,
};

let audioContext = null;

function ensureAudioContext() {
  if (audioContext) {
    return audioContext;
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }
  audioContext = new AudioContextClass();
  return audioContext;
}

function playNoiseBurst(duration = 0.32, gainValue = 0.4) {
  const ctx = ensureAudioContext();
  if (!ctx) {
    return;
  }
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const channelData = buffer.getChannelData(0);
  for (let index = 0; index < bufferSize; index += 1) {
    const decay = 1 - index / bufferSize;
    channelData[index] = (Math.random() * 2 - 1) * Math.pow(decay, 1.6);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.value = gainValue;
  source.connect(gain).connect(ctx.destination);
  source.start();
}

function playTone({ frequency = 440, duration = 0.2, type = "sine", gainValue = 0.25 }) {
  const ctx = ensureAudioContext();
  if (!ctx) {
    return;
  }
  const now = ctx.currentTime;
  const oscillator = ctx.createOscillator();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(gainValue, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

function playClatter() {
  playNoiseBurst(0.42, 0.55);
}

function playErrorTone() {
  playTone({ frequency: 180, duration: 0.32, type: "square", gainValue: 0.28 });
}

function playConfirmTone(multiplier) {
  const freq = 360 + multiplier * 40;
  playTone({ frequency: freq, duration: 0.18, type: "triangle", gainValue: 0.22 });
}

function playJackpot() {
  playTone({ frequency: 660, duration: 0.22, type: "sawtooth", gainValue: 0.25 });
  window.setTimeout(() => {
    playTone({ frequency: 880, duration: 0.34, type: "triangle", gainValue: 0.23 });
  }, 80);
}

function formatDigits(value, size = 3) {
  const number = Math.max(0, Math.floor(value));
  return number.toString().padStart(size, "0");
}

function formatScore(value) {
  return Math.max(0, Math.floor(value)).toString().padStart(6, "0");
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
  return Math.floor(randomBetween(min, max + 1));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function setPhase(phase, bannerText = "", statusMessage = "") {
  state.phase = phase;
  phaseIndicator.textContent = statusMessage || phaseToLabel(phase);
  if (bannerText) {
    phaseBanner.textContent = bannerText;
    phaseBanner.classList.add("is-visible");
  } else {
    phaseBanner.classList.remove("is-visible");
  }
}

function phaseToLabel(phase) {
  switch (phase) {
    case "setup":
      return "Setup";
    case "observe":
      return "Observation";
    case "calculate":
      return "Calculation";
    case "reveal":
      return "Verification";
    case "complete":
      return "Session Complete";
    default:
      return "Standby";
  }
}

function resetField() {
  window.cancelAnimationFrame(state.observationHandle);
  state.observationHandle = 0;
  if (state.multiplierHandle) {
    window.clearInterval(state.multiplierHandle);
    state.multiplierHandle = 0;
  }
  if (state.revealHandle) {
    window.clearTimeout(state.revealHandle);
    state.revealHandle = 0;
  }
  matchstickField.innerHTML = "";
  matchstickField.className = "matchstick-field";
  matchstickField.setAttribute("aria-hidden", "true");
  recountValue.textContent = formatDigits(0);
  observationTimer.textContent = "0.0s";
  bodyElement.classList.remove("is-perfect", "is-penalty");
}

function beginSession() {
  ensureAudioContext();
  state.sessionActive = true;
  state.roundIndex = -1;
  state.totalScore = 0;
  state.bestMultiplier = 1;
  state.roundHistory = [];
  state.streakPerfect = 0;
  state.previousDiff = null;
  state.accuracyMomentum = 0;
  summaryPanel.hidden = true;
  summaryBody.innerHTML = "";
  summaryOverview.textContent = "";
  updateScore(0);
  updateMultiplierDisplay(MULTIPLIER_START);
  accuracyReadout.textContent = "±0";
  roundCounter.textContent = `0 / ${ROUND_PLAN.length}`;
  startButton.disabled = true;
  nextRoundButton.disabled = true;
  finalCountButton.disabled = true;
  guessInput.value = "";
  guessInput.disabled = true;
  setPhase("setup", "Setup", "Setup phase");
  statusChannel("Matchstick trays restocked. Eyes up for the first spill.", "info");
  logChannel.push("Session armed. Awaiting first spill.", "info");
  advanceRound();
}

function advanceRound() {
  resetField();
  nextRoundButton.disabled = true;
  finalCountButton.disabled = true;
  guessInput.disabled = true;
  guessInput.value = "";
  state.roundIndex += 1;
  if (state.roundIndex >= ROUND_PLAN.length) {
    completeSession();
    return;
  }
  const spec = ROUND_PLAN[state.roundIndex];
  const actual = randomInt(spec.min, spec.max);
  const round = {
    index: state.roundIndex,
    actual,
    observation: spec.observation,
    chaos: spec.chaos,
    multiplier: MULTIPLIER_START,
    startedAt: performance.now(),
    guess: null,
  };
  state.currentRound = round;
  roundCounter.textContent = `${round.index + 1} / ${ROUND_PLAN.length}`;
  setPhase("setup", "Setup", "Setup");
  statusChannel(`Round ${round.index + 1} prepping. Spill incoming.`, "info");
  logChannel.push(`Round ${round.index + 1}: spill assembled.`, "info");
  renderMatchsticks(round);
  playClatter();
  window.setTimeout(() => {
    beginObservation(round);
  }, 520);
}

function renderMatchsticks(round) {
  matchstickField.innerHTML = "";
  const sticks = [];
  const total = round.actual;
  for (let index = 0; index < total; index += 1) {
    const stick = document.createElement("div");
    stick.className = "matchstick";
    const spread = 18 + round.chaos * 46;
    const angle = randomBetween(0, Math.PI * 2);
    const radius = randomBetween(0, spread);
    const verticalStretch = 0.65 + round.chaos * 0.4;
    let x = 50 + Math.cos(angle) * radius;
    let y = 52 + Math.sin(angle) * radius * verticalStretch;
    x = clamp(x, 8, 92);
    y = clamp(y, 12, 92);
    const rotateStart = randomBetween(-65, 65) * (1 - round.chaos * 0.4);
    const rotateEnd = rotateStart + randomBetween(-48, 48) * (0.4 + round.chaos * 0.8);
    stick.style.left = `${x}%`;
    stick.style.top = `${y}%`;
    stick.style.setProperty("--drop-delay", `${(index / total) * 180 + Math.random() * 180}ms`);
    stick.style.setProperty("--rotate-start", `${rotateStart}deg`);
    stick.style.setProperty("--rotate-end", `${rotateEnd}deg`);
    stick.dataset.order = String(index);
    matchstickField.append(stick);
    sticks.push(stick);
  }
  matchstickField.classList.add("is-visible");
  matchstickField.setAttribute("aria-hidden", "false");
  return sticks;
}

function beginObservation(round) {
  if (state.phase !== "setup" && state.phase !== "observe") {
    return;
  }
  setPhase("observe", "Observe", `Observation · ${round.observation.toFixed(1)}s`);
  matchstickField.classList.add("is-visible");
  matchstickField.classList.remove("is-hidden");
  state.observationEndsAt = performance.now() + round.observation * 1000;
  const tick = (timestamp) => {
    const remaining = Math.max(0, state.observationEndsAt - timestamp);
    observationTimer.textContent = `${(remaining / 1000).toFixed(1)}s`;
    if (remaining <= 0) {
      state.observationHandle = 0;
      enterCalculation(round);
      return;
    }
    state.observationHandle = window.requestAnimationFrame(tick);
  };
  state.observationHandle = window.requestAnimationFrame(tick);
  statusChannel("Burn the pattern into memory.", "info");
}

function enterCalculation(round) {
  window.cancelAnimationFrame(state.observationHandle);
  state.observationHandle = 0;
  setPhase("calculate", "Calculate", "Calculation window");
  matchstickField.classList.remove("is-visible");
  matchstickField.classList.add("is-hidden");
  matchstickField.setAttribute("aria-hidden", "true");
  guessInput.disabled = false;
  guessInput.focus();
  finalCountButton.disabled = false;
  round.multiplier = MULTIPLIER_START;
  updateMultiplierDisplay(round.multiplier);
  startMultiplierDecay(round);
  statusChannel("Spill vanished. Commit your count.", "warning");
  logChannel.push("Calculation window opened. Multiplier ticking.", "warning");
}

function startMultiplierDecay(round) {
  if (state.multiplierHandle) {
    window.clearInterval(state.multiplierHandle);
    state.multiplierHandle = 0;
  }
  state.multiplierHandle = window.setInterval(() => {
    round.multiplier = Math.max(
      MULTIPLIER_MIN,
      Number((round.multiplier - MULTIPLIER_DECAY_PER_TICK).toFixed(2)),
    );
    updateMultiplierDisplay(round.multiplier);
    if (round.multiplier <= MULTIPLIER_MIN) {
      window.clearInterval(state.multiplierHandle);
      state.multiplierHandle = 0;
    }
  }, MULTIPLIER_TICK_MS);
}

function updateMultiplierDisplay(multiplier) {
  multiplierReadout.textContent = `×${multiplier.toFixed(1)}`;
}

function updateScore(score) {
  scoreTotalElement.textContent = formatScore(score);
}

function handleGuessSubmit(event) {
  event.preventDefault();
  if (!state.sessionActive || state.phase !== "calculate") {
    return;
  }
  const raw = guessInput.value.trim();
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value)) {
    return;
  }
  finalizeRound(value);
}

guessForm.addEventListener("submit", handleGuessSubmit);

finalCountButton.addEventListener("click", (event) => {
  event.preventDefault();
  handleGuessSubmit(event);
});

startButton.addEventListener("click", () => {
  beginSession();
});

nextRoundButton.addEventListener("click", () => {
  if (state.sessionActive && state.phase === "reveal") {
    advanceRound();
  }
});

replayButton.addEventListener("click", () => {
  if (!state.sessionActive) {
    beginSession();
  }
});

guessInput.addEventListener("focus", () => {
  guessInput.select();
});

function finalizeRound(guess) {
  const round = state.currentRound;
  if (!round || round.guess !== null) {
    return;
  }
  window.clearInterval(state.multiplierHandle);
  state.multiplierHandle = 0;
  guessInput.disabled = true;
  finalCountButton.disabled = true;
  round.guess = Math.max(0, guess);
  const diff = Math.abs(round.guess - round.actual);
  const baseScore = diff < SCORE_TABLE.length ? SCORE_TABLE[diff] : 0;
  let roundScore = baseScore * round.multiplier;
  let improvementBonus = 0;
  let ladderTier = 0;
  let accuracyTrend = "steady";
  const previousDiff = state.previousDiff;
  if (typeof previousDiff === "number") {
    if (diff < previousDiff) {
      state.accuracyMomentum = Math.min(state.accuracyMomentum + 1, 5);
      ladderTier = state.accuracyMomentum;
      const improvementSteps = previousDiff - diff;
      const bonusRate = Math.min(0.25, 0.04 * improvementSteps + 0.05 * ladderTier);
      improvementBonus = Math.round(roundScore * bonusRate);
      roundScore += improvementBonus;
      accuracyTrend = "up";
    } else if (diff > previousDiff) {
      state.accuracyMomentum = 0;
      accuracyTrend = "down";
    } else {
      state.accuracyMomentum = Math.max(0, state.accuracyMomentum - 1);
      accuracyTrend = "steady";
    }
  } else {
    state.accuracyMomentum = 0;
  }
  let finalScore = Math.round(roundScore);
  let penalized = false;
  if (diff > 0 && round.multiplier >= 3) {
    const penalty = Math.round(300 * round.multiplier);
    finalScore = Math.max(0, finalScore - penalty);
    penalized = true;
  }
  finalScore = Math.round(finalScore);
  state.totalScore += finalScore;
  state.bestMultiplier = Math.max(state.bestMultiplier, round.multiplier);
  accuracyReadout.textContent = `±${diff}`;
  updateScore(state.totalScore);
  setPhase("reveal", "Verification", "Verification underway");
  revealMatches(round, diff, finalScore, penalized, improvementBonus, accuracyTrend);
  state.roundHistory.push({
    round: round.index + 1,
    guess: round.guess,
    actual: round.actual,
    diff,
    multiplier: round.multiplier,
    baseScore,
    finalScore,
    penalized,
    ladderBonus: improvementBonus,
    ladderTier,
    accuracyTrend,
  });
  state.previousDiff = diff;
  logChannel.push(
    `Round ${round.index + 1}: guessed ${round.guess}, actual ${round.actual}, Δ${diff}.${
      improvementBonus > 0 ? ` Ladder bonus +${improvementBonus.toLocaleString()}.` : ""
    }`,
    diff === 0
      ? "success"
      : penalized
        ? "danger"
        : accuracyTrend === "up"
          ? "success"
          : "warning",
  );
  if (diff === 0) {
    state.streakPerfect += 1;
    bodyElement.classList.add("is-perfect");
    particleField.emitBurst(1.4);
    playJackpot();
    statusChannel("Perfect count! Casino lights flare across the aisle.", "success");
    window.setTimeout(() => {
      bodyElement.classList.remove("is-perfect");
    }, 1400);
  } else {
    state.streakPerfect = 0;
    if (penalized) {
      bodyElement.classList.add("is-penalty");
      playErrorTone();
      statusChannel(
        `Fast miss. Penalty assessed to the ledger.${
          improvementBonus > 0 ? ` Ladder bonus +${improvementBonus.toLocaleString()} softened the hit.` : ""
        }`,
        "danger",
      );
      window.setTimeout(() => {
        bodyElement.classList.remove("is-penalty");
      }, 900);
    } else {
      playConfirmTone(round.multiplier + ladderTier * 0.2);
      if (accuracyTrend === "up" && improvementBonus > 0) {
        statusChannel(
          `Sharper read! Accuracy ladder bonus +${improvementBonus.toLocaleString()} awarded.`,
          "success",
        );
      } else if (accuracyTrend === "down") {
        statusChannel("Accuracy slipped. Ladder reset—steady the count next spill.", "warning");
      } else {
        statusChannel("Count logged. Review the recap to tighten accuracy.", "warning");
      }
    }
  }
  nextRoundButton.disabled = false;
  if (round.index + 1 >= ROUND_PLAN.length) {
    nextRoundButton.disabled = true;
  }
}

function revealMatches(round, diff, finalScore, penalized, ladderBonus, accuracyTrend) {
  matchstickField.classList.remove("is-hidden");
  matchstickField.classList.add("is-visible", "is-counting");
  matchstickField.setAttribute("aria-hidden", "false");
  const sticks = Array.from(matchstickField.children).sort(
    (a, b) => Number(a.dataset.order) - Number(b.dataset.order),
  );
  sticks.forEach((stick) => stick.classList.remove("is-counted"));
  let index = 0;
  const step = Math.max(22, 160 - Math.min(sticks.length, 220));
  const animate = () => {
    if (index >= sticks.length) {
      recountValue.textContent = formatDigits(sticks.length);
      const ladderMessage = round.index + 1 >= ROUND_PLAN.length
        ? " Ladder complete."
        : " Next round ready.";
      const improvementMessage = ladderBonus > 0
        ? ` Accuracy ladder bonus +${ladderBonus.toLocaleString()}.`
        : accuracyTrend === "down"
          ? " Accuracy ladder reset."
          : "";
      statusChannel(
        `Round ${round.index + 1} scored ${finalScore} pts${penalized ? " with penalty" : ""}.${ladderMessage}${improvementMessage}`,
        penalized ? "danger" : diff === 0 ? "success" : "info",
      );
      state.revealHandle = 0;
      if (round.index + 1 >= ROUND_PLAN.length) {
        window.setTimeout(() => {
          if (state.sessionActive) {
            completeSession();
          }
        }, 520);
      }
      return;
    }
    sticks[index].classList.add("is-counted");
    recountValue.textContent = formatDigits(index + 1);
    if ((index + 1) % 10 === 0) {
      playTone({ frequency: 420 + (index % 40) * 6, duration: 0.12, type: "square", gainValue: 0.12 });
    }
    index += 1;
    state.revealHandle = window.setTimeout(animate, step);
  };
  animate();
}

function completeSession() {
  state.sessionActive = false;
  setPhase("complete", "Session", "Session complete");
  nextRoundButton.disabled = true;
  startButton.disabled = false;
  finalCountButton.disabled = true;
  guessInput.disabled = true;
  renderSummary();
  highScore.submit(state.totalScore, {
    bestMultiplier: Number(state.bestMultiplier.toFixed(1)),
    rounds: state.roundHistory.length,
  });
  logChannel.push("Session complete. Summary available below the console.", "success");
}

function renderSummary() {
  summaryBody.innerHTML = "";
  const bestMultiplier = state.bestMultiplier.toFixed(1);
  const highestLadder = state.roundHistory.reduce(
    (max, entry) => Math.max(max, entry.ladderTier || 0),
    0,
  );
  const ladderText = highestLadder > 0 ? ` · Ladder peak T${highestLadder}` : "";
  summaryOverview.textContent = `Final score ${state.totalScore} · Best multiplier ×${bestMultiplier}${ladderText}.`;
  state.roundHistory.forEach((entry) => {
    const row = document.createElement("tr");
    if (entry.diff === 0) {
      row.classList.add("is-perfect");
    }
    if (entry.penalized) {
      row.classList.add("is-penalized");
    }
    row.innerHTML = `
      <th scope="row">${entry.round}</th>
      <td>${entry.guess}</td>
      <td>${entry.actual}</td>
      <td>${entry.diff}</td>
      <td>×${entry.multiplier.toFixed(1)}</td>
      <td>${entry.ladderBonus > 0 ? `+${entry.ladderBonus.toLocaleString()} (T${entry.ladderTier})` : entry.accuracyTrend === "down" ? "Reset" : "—"}</td>
      <td>${entry.finalScore.toLocaleString()}</td>
    `;
    summaryBody.append(row);
  });
  summaryPanel.hidden = false;
}

function resetGame() {
  state.sessionActive = false;
  state.roundIndex = -1;
  state.roundHistory = [];
  state.totalScore = 0;
  state.bestMultiplier = 1;
  state.previousDiff = null;
  state.accuracyMomentum = 0;
  startButton.disabled = false;
  nextRoundButton.disabled = true;
  guessInput.disabled = true;
  finalCountButton.disabled = true;
  guessInput.value = "";
  resetField();
  updateScore(0);
  updateMultiplierDisplay(MULTIPLIER_START);
  accuracyReadout.textContent = "±0";
  roundCounter.textContent = `0 / ${ROUND_PLAN.length}`;
  phaseIndicator.textContent = "Standby";
  phaseBanner.classList.remove("is-visible");
  statusChannel("Session reset. Ready when you are.", "info");
}

function init() {
  resetGame();
  summaryPanel.hidden = true;
}

init();
