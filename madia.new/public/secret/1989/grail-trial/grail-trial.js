import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { mountParticleField } from "../particles.js";
import { autoEnhanceFeedback } from "../feedback.js";

const particleField = mountParticleField({
  effects: {
    palette: ["#facc15", "#f97316", "#22d3ee", "#f472b6"],
    ambientDensity: 0.28,
    drift: 0.26,
  },
});

const scoreConfig = getScoreConfig("grail-trial");
const highScore = initHighScoreBanner({
  gameId: "grail-trial",
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

autoEnhanceFeedback();

const FAILURE_PENALTY_SECONDS = 5;
const TRIAL_COUNT = 3;

const TRIAL1_GRID = [
  ["I", "X", "Q", "M"],
  ["S", "E", "T", "R"],
  ["H", "L", "O", "D"],
  ["N", "V", "A", "G"],
];

const TRIAL1_PATH = [0, 5, 8, 10, 13, 14];

const TRIAL3_PATH = [1, 2, 2, 1, 0, 1];
const TRIAL3_START_LANE = 1;
const MAX_DUST = 9;

const LIGHT_TOSS = {
  cost: 1,
  count: 1,
  duration: 1600,
  label: "A quick puff reveals a single stone.",
};

const HEAVY_TOSS = {
  cost: 2,
  count: 2,
  duration: 2600,
  label: "A sweeping throw uncovers two spans.",
};

const BASE_SCORE_PER_TRIAL = 400;
const TIME_BONUS_BASE = 18000;
const TIME_BONUS_FACTOR = 320;
const FAILURE_PENALTY_POINTS = 200;
const DUST_BONUS_POINTS = 120;

const scoreValue = document.getElementById("score-value");
const totalTimeValue = document.getElementById("total-time");
const failureValue = document.getElementById("failure-count");
const trialsClearedValue = document.getElementById("trials-cleared");
const legendTrial1 = document.getElementById("legend-trial1");
const legendTrial2 = document.getElementById("legend-trial2");
const legendTrial3 = document.getElementById("legend-trial3");

const trial1Section = document.getElementById("trial-1");
const trial1Grid = document.getElementById("name-grid");
const trial1StartButton = document.getElementById("trial1-start");
const trial1SkipButton = document.getElementById("trial1-skip");
const trial1Status = document.getElementById("trial1-status");

const trial2Section = document.getElementById("trial-2");
const trial2StartButton = document.getElementById("trial2-start");
const duckButton = document.getElementById("duck-button");
const trial2Status = document.getElementById("trial2-status");
const bladeHall = document.getElementById("blade-hall");
const kneeler = document.getElementById("kneeler");

const trial3Section = document.getElementById("trial-3");
const chasmTrack = document.getElementById("chasm-track");
const dustCountValue = document.getElementById("dust-count");
const lightTossButton = document.getElementById("light-toss");
const heavyTossButton = document.getElementById("heavy-toss");
const advanceButton = document.getElementById("advance-button");
const trial3Status = document.getElementById("trial3-status");

const wrapup = document.getElementById("wrapup");
const wrapupDialog = wrapup.querySelector(".wrapup-dialog");
const wrapupSubtitle = document.getElementById("wrapup-subtitle");
const wrapupScore = document.getElementById("wrapup-score");
const wrapupTrial1 = document.getElementById("wrapup-trial1");
const wrapupTrial2 = document.getElementById("wrapup-trial2");
const wrapupTrial3 = document.getElementById("wrapup-trial3");
const wrapupTotal = document.getElementById("wrapup-total");
const wrapupDust = document.getElementById("wrapup-dust");
const wrapupReplay = document.getElementById("wrapup-replay");
const wrapupClose = document.getElementById("wrapup-close");

const audioState = {
  context: null,
};

const state = {
  currentTrial: 0,
  totalStart: null,
  trialStart: null,
  trialTimes: [0, 0, 0],
  failureCount: 0,
  completedTrials: 0,
  revealTimers: [],
  trial1Input: [],
  trial1Active: false,
  trial1RevealRunning: false,
  trial2Active: false,
  trial2WindowOpen: false,
  trial2BladeTimer: null,
  trial2WindowTimer: null,
  trial3Active: false,
  trial3Dust: MAX_DUST,
  trial3Column: 0,
  trial3Lane: TRIAL3_START_LANE,
  trial3PendingMoves: 0,
  trial3RevealTimer: null,
  trial3AdvanceUnlocked: false,
};

const trial1Tiles = [];
const trial3Tiles = [];

function ensureAudioContext() {
  if (!audioState.context) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioState.context = new AudioContext();
    }
  }
  if (audioState.context && audioState.context.state === "suspended") {
    audioState.context.resume().catch(() => {});
  }
  return audioState.context;
}

function playSuccessChord() {
  const ctx = ensureAudioContext();
  if (!ctx) {
    return;
  }
  const notes = [392, 523.25, 659.25];
  const now = ctx.currentTime;
  notes.forEach((frequency, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.6, now + 0.05 + index * 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5 + index * 0.04);
    osc.frequency.setValueAtTime(frequency, now);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + index * 0.02);
    osc.stop(now + 0.6 + index * 0.02);
  });
}

function playFailureCrash() {
  const ctx = ensureAudioContext();
  if (!ctx) {
    return;
  }
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  gain.gain.setValueAtTime(0.8, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
  osc.frequency.setValueAtTime(160, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.45);
  const noise = ctx.createBufferSource();
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.5, ctx.currentTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
  noise.buffer = buffer;
  noise.loop = false;
  noise.connect(noiseGain).connect(ctx.destination);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.5);
  noise.start();
}

function formatSeconds(value) {
  return `${value.toFixed(2)}s`;
}

function calculateTotalTime() {
  return state.trialTimes.reduce((sum, value) => sum + value, 0);
}

function calculateScore() {
  if (state.completedTrials === 0) {
    return 0;
  }
  const completedTime = state.trialTimes
    .slice(0, state.completedTrials)
    .reduce((sum, value) => sum + value, 0);
  const base = state.completedTrials * BASE_SCORE_PER_TRIAL;
  const timeBonus = Math.max(0, Math.round(state.completedTrials * TIME_BONUS_BASE - completedTime * TIME_BONUS_FACTOR));
  const failurePenalty = state.failureCount * FAILURE_PENALTY_POINTS;
  const dustBonus = state.completedTrials === TRIAL_COUNT ? state.trial3Dust * DUST_BONUS_POINTS : 0;
  return Math.max(0, base + timeBonus + dustBonus - failurePenalty);
}

function updateHud() {
  const totalTime = calculateTotalTime();
  totalTimeValue.textContent = formatSeconds(totalTime);
  failureValue.textContent = String(state.failureCount);
  trialsClearedValue.textContent = `${state.completedTrials} / ${TRIAL_COUNT}`;
  scoreValue.textContent = calculateScore().toLocaleString();
}

function updateLegend(trialIndex, message) {
  const total = state.trialTimes[trialIndex - 1];
  const entry = `${formatSeconds(total)} · ${message}`;
  if (trialIndex === 1) {
    legendTrial1.textContent = entry;
  } else if (trialIndex === 2) {
    legendTrial2.textContent = entry;
  } else if (trialIndex === 3) {
    legendTrial3.textContent = entry;
  }
}

function resetTrial1Tiles() {
  trial1Tiles.forEach((tile) => {
    tile.classList.remove("tile--lit", "tile--safe", "tile--fail");
    tile.dataset.disabled = "true";
  });
}

function clearRevealTimers() {
  state.revealTimers.forEach((timer) => window.clearTimeout(timer));
  state.revealTimers = [];
}

function setTrialStatus(section, statusElement, message) {
  statusElement.textContent = message;
  section.dataset.status = message;
}

function startTrial1() {
  ensureAudioContext();
  if (state.currentTrial === 0) {
    resetExpedition();
    state.totalStart = performance.now();
  }
  state.currentTrial = 1;
  state.trial1Active = true;
  state.trial1RevealRunning = true;
  state.trial1Input = [];
  state.trialStart = performance.now();
  resetTrial1Tiles();
  trial1StartButton.disabled = true;
  trial1SkipButton.disabled = false;
  setTrialStatus(trial1Section, trial1Status, "Observe the sacred path or trust your instincts.");
  runTrial1Reveal();
}

function runTrial1Reveal() {
  clearRevealTimers();
  TRIAL1_PATH.forEach((index, position) => {
    const tile = trial1Tiles[index];
    if (!tile) {
      return;
    }
    const revealDelay = position * 520;
    const revealTimer = window.setTimeout(() => {
      tile.classList.add("tile--lit");
      const fadeTimer = window.setTimeout(() => {
        tile.classList.remove("tile--lit");
        if (position === TRIAL1_PATH.length - 1 && state.trial1RevealRunning) {
          enableTrial1Input();
        }
      }, 360);
      state.revealTimers.push(fadeTimer);
    }, revealDelay);
    state.revealTimers.push(revealTimer);
  });
}

function enableTrial1Input() {
  state.trial1RevealRunning = false;
  trial1SkipButton.disabled = true;
  trial1Tiles.forEach((tile) => {
    tile.dataset.disabled = "false";
  });
  setTrialStatus(trial1Section, trial1Status, "Step only on the letters of the sacred name.");
}

function skipTrial1Reveal() {
  clearRevealTimers();
  trial1Tiles.forEach((tile) => tile.classList.remove("tile--lit"));
  enableTrial1Input();
  setTrialStatus(trial1Section, trial1Status, "You trusted your memory. Choose wisely.");
}

function handleTrial1TileClick(event) {
  if (!state.trial1Active || state.trial1RevealRunning) {
    return;
  }
  const tile = event.currentTarget;
  if (!tile || tile.dataset.disabled === "true") {
    return;
  }
  const index = Number(tile.dataset.index);
  const expectedIndex = TRIAL1_PATH[state.trial1Input.length];
  if (index !== expectedIndex) {
    tile.classList.add("tile--fail");
    failTrial(1, "The false stone crumbled beneath you.");
    return;
  }
  tile.classList.add("tile--safe");
  tile.dataset.disabled = "true";
  state.trial1Input.push(index);
  const remaining = TRIAL1_PATH.length - state.trial1Input.length;
  if (remaining > 0) {
    setTrialStatus(
      trial1Section,
      trial1Status,
      `${remaining} step${remaining === 1 ? "" : "s"} remain. Keep spelling the divine name.`,
    );
    return;
  }
  completeTrial(1, "Name honored. The floor is steady.");
}

function resetTrial1ForRetry() {
  state.trial1Active = false;
  state.trial1Input = [];
  clearRevealTimers();
  trial1Tiles.forEach((tile) => {
    tile.classList.remove("tile--lit", "tile--safe", "tile--fail");
    tile.dataset.disabled = "true";
  });
  trial1StartButton.disabled = false;
  trial1SkipButton.disabled = true;
  setTrialStatus(
    trial1Section,
    trial1Status,
    "The temple resets the letters. Begin the chant when ready.",
  );
}

function scheduleBladeStrike() {
  window.clearTimeout(state.trial2BladeTimer);
  const delay = 1200 + Math.random() * 1600;
  state.trial2BladeTimer = window.setTimeout(() => {
    state.trial2WindowOpen = true;
    kneeler.dataset.state = "ready";
    setTrialStatus(trial2Section, trial2Status, "Now! Kneel before the blades clash.");
    state.trial2WindowTimer = window.setTimeout(() => {
      if (state.trial2WindowOpen) {
        failTrial(2, "You hesitated and steel found you.");
      }
    }, 520);
  }, delay);
}

function startTrial2() {
  ensureAudioContext();
  state.currentTrial = 2;
  state.trial2Active = true;
  state.trialStart = performance.now();
  bladeHall.dataset.armed = "true";
  trial2StartButton.disabled = true;
  duckButton.disabled = false;
  setTrialStatus(trial2Section, trial2Status, "Blades primed. Watch the rhythm.");
  scheduleBladeStrike();
}

function resetTrial2ForRetry() {
  state.trial2Active = false;
  state.trial2WindowOpen = false;
  window.clearTimeout(state.trial2BladeTimer);
  window.clearTimeout(state.trial2WindowTimer);
  kneeler.dataset.state = "";
  bladeHall.dataset.armed = "false";
  duckButton.disabled = true;
  trial2StartButton.disabled = false;
  setTrialStatus(trial2Section, trial2Status, "Center yourself and ready the blades again.");
}

function handleDuck() {
  if (!state.trial2Active) {
    return;
  }
  if (!state.trial2WindowOpen) {
    failTrial(2, "You knelt too soon and the blade rebounded.");
    return;
  }
  state.trial2WindowOpen = false;
  window.clearTimeout(state.trial2BladeTimer);
  window.clearTimeout(state.trial2WindowTimer);
  kneeler.dataset.state = "duck";
  setTrialStatus(trial2Section, trial2Status, "You slid under the storm of steel.");
  completeTrial(2, "Penitence honored. The next hall opens.");
}

function buildChasmTrack() {
  chasmTrack.innerHTML = "";
  trial3Tiles.length = 0;
  const columns = TRIAL3_PATH.length + 1;
  for (let columnIndex = 0; columnIndex <= columns; columnIndex += 1) {
    const column = document.createElement("div");
    column.className = "bridge-column";
    const lanes = [];
    for (let laneIndex = 0; laneIndex < 3; laneIndex += 1) {
      const tile = document.createElement("div");
      tile.className = "bridge-tile";
      tile.dataset.column = String(columnIndex);
      tile.dataset.lane = String(laneIndex);
      column.appendChild(tile);
      lanes.push(tile);
    }
    chasmTrack.appendChild(column);
    trial3Tiles.push(lanes);
  }
  state.trial3Lane = TRIAL3_START_LANE;
  if (trial3Tiles[0]) {
    trial3Tiles[0][TRIAL3_START_LANE].dataset.position = "player";
  }
}

function resetChasm() {
  trial3Tiles.forEach((lanes) => {
    lanes.forEach((tile) => {
      tile.dataset.position = "";
      tile.dataset.revealed = "false";
    });
  });
  state.trial3Lane = TRIAL3_START_LANE;
  if (trial3Tiles[0]) {
    trial3Tiles[0][TRIAL3_START_LANE].dataset.position = "player";
  }
}

function clearTrial3Reveal() {
  window.clearTimeout(state.trial3RevealTimer);
  state.trial3RevealTimer = null;
  trial3Tiles.forEach((lanes) => {
    lanes.forEach((tile) => {
      if (tile.dataset.revealed === "true") {
        tile.dataset.revealed = "false";
      }
    });
  });
}

function updateDustButtons() {
  const busy = state.trial3PendingMoves > 0;
  const active = state.trial3Active;
  lightTossButton.disabled = !active || busy || state.trial3Dust <= 0;
  heavyTossButton.disabled = !active || busy || state.trial3Dust < HEAVY_TOSS.cost;
}

function startTrial3() {
  ensureAudioContext();
  state.currentTrial = 3;
  state.trialStart = performance.now();
  state.trial3Active = true;
  state.trial3Dust = MAX_DUST;
  state.trial3Column = 0;
  state.trial3PendingMoves = 0;
  state.trial3AdvanceUnlocked = false;
  clearTrial3Reveal();
  resetChasm();
  dustCountValue.textContent = String(state.trial3Dust);
  updateDustButtons();
  advanceButton.disabled = true;
  setTrialStatus(trial3Section, trial3Status, "Throw dust to map the invisible bridge.");
}

function handleDustThrow(config) {
  if (!state.trial3Active) {
    return;
  }
  if (state.trial3PendingMoves > 0) {
    setTrialStatus(trial3Section, trial3Status, "Step onto the revealed stones before they fade!");
    return;
  }
  if (state.trial3Dust < config.cost) {
    setTrialStatus(trial3Section, trial3Status, "Not enough dust for that throw.");
    updateDustButtons();
    if (state.trial3Dust <= 0 && state.trial3PendingMoves <= 0) {
      failTrial(3, "The satchel is empty. Faith without footing ends in darkness.");
    }
    return;
  }
  state.trial3Dust -= config.cost;
  dustCountValue.textContent = String(state.trial3Dust);
  state.trial3PendingMoves = 0;
  clearTrial3Reveal();
  for (let i = 1; i <= config.count; i += 1) {
    const targetStep = state.trial3Column + i;
    if (targetStep > TRIAL3_PATH.length) {
      break;
    }
    const lane = TRIAL3_PATH[targetStep - 1];
    const tile = trial3Tiles[targetStep][lane];
    if (tile) {
      tile.dataset.revealed = "true";
      state.trial3PendingMoves += 1;
    }
  }
  updateDustButtons();
  if (state.trial3PendingMoves === 0) {
    if (state.trial3Column >= TRIAL3_PATH.length) {
      completeTrial(3, "You dashed across just in time.");
      return;
    }
    setTrialStatus(trial3Section, trial3Status, "No stones revealed. Try another throw.");
    return;
  }
  state.trial3AdvanceUnlocked = true;
  advanceButton.disabled = false;
  setTrialStatus(trial3Section, trial3Status, config.label);
  state.trial3RevealTimer = window.setTimeout(() => {
    if (state.trial3PendingMoves > 0) {
      failTrial(3, "The stones vanished before you moved.");
    }
  }, config.duration);
}

function handleAdvance() {
  if (!state.trial3Active || !state.trial3AdvanceUnlocked) {
    return;
  }
  if (state.trial3PendingMoves <= 0) {
    failTrial(3, "You stepped without seeing and fell into the abyss.");
    return;
  }
  const nextColumn = state.trial3Column + 1;
  const lane = TRIAL3_PATH[nextColumn - 1];
  const previousTile = trial3Tiles[state.trial3Column]?.[state.trial3Lane];
  if (previousTile) {
    previousTile.dataset.position = "";
  }
  const nextTile = trial3Tiles[nextColumn]?.[lane];
  if (nextTile) {
    nextTile.dataset.position = "player";
    nextTile.dataset.revealed = "false";
  }
  state.trial3Column = nextColumn;
  state.trial3Lane = lane;
  state.trial3PendingMoves -= 1;
  if (state.trial3Column >= TRIAL3_PATH.length) {
    completeTrial(3, "You crossed the abyss and guard the Grail.");
    return;
  }
  if (state.trial3PendingMoves <= 0) {
    clearTrial3Reveal();
    advanceButton.disabled = true;
    if (state.trial3Dust <= 0) {
      failTrial(3, "The satchel is empty. Faith without footing ends in darkness.");
      return;
    }
    setTrialStatus(trial3Section, trial3Status, "The next step is hidden once more.");
  } else {
    setTrialStatus(trial3Section, trial3Status, "One more glimpse remains—step swiftly.");
  }
  updateDustButtons();
}

function resetTrial3ForRetry() {
  state.trial3Active = false;
  state.trial3Dust = MAX_DUST;
  state.trial3Column = 0;
  state.trial3PendingMoves = 0;
  state.trial3AdvanceUnlocked = false;
  clearTrial3Reveal();
  resetChasm();
  dustCountValue.textContent = String(state.trial3Dust);
  updateDustButtons();
  advanceButton.disabled = true;
  setTrialStatus(trial3Section, trial3Status, "Gather yourself before the final leap.");
}

function completeTrial(trialNumber, message) {
  const now = performance.now();
  if (state.trialStart) {
    state.trialTimes[trialNumber - 1] += (now - state.trialStart) / 1000;
  }
  state.trialStart = null;
  state.completedTrials = Math.max(state.completedTrials, trialNumber);
  updateHud();
  updateLegend(trialNumber, `${message}`);
  playSuccessChord();

  if (trialNumber === 1) {
    state.trial1Active = false;
    trial1SkipButton.disabled = true;
    trial2StartButton.disabled = false;
    setTrialStatus(trial2Section, trial2Status, "The hallway hums. Ready the blades when prepared.");
  } else if (trialNumber === 2) {
    state.trial2Active = false;
    duckButton.disabled = true;
    kneeler.dataset.state = "duck";
    bladeHall.dataset.armed = "false";
    startTrial3();
  } else if (trialNumber === 3) {
    state.trial3Active = false;
    updateDustButtons();
    advanceButton.disabled = true;
    finalizeRun();
  }
}

function failTrial(trialNumber, failureMessage) {
  const now = performance.now();
  if (state.trialStart) {
    state.trialTimes[trialNumber - 1] += (now - state.trialStart) / 1000;
  }
  state.trialStart = null;
  state.trialTimes[trialNumber - 1] += FAILURE_PENALTY_SECONDS;
  state.failureCount += 1;
  playFailureCrash();
  updateHud();
  updateLegend(trialNumber, `${failureMessage} +${FAILURE_PENALTY_SECONDS}s penalty.`);

  if (trialNumber === 1) {
    resetTrial1ForRetry();
  } else if (trialNumber === 2) {
    resetTrial2ForRetry();
  } else {
    resetTrial3ForRetry();
  }
}

function finalizeRun() {
  const totalTime = calculateTotalTime();
  const finalScore = calculateScore();
  updateHud();

  wrapupTrial1.textContent = formatSeconds(state.trialTimes[0]);
  wrapupTrial2.textContent = formatSeconds(state.trialTimes[1]);
  wrapupTrial3.textContent = formatSeconds(state.trialTimes[2]);
  wrapupTotal.textContent = formatSeconds(totalTime);
  wrapupDust.textContent = `${state.trial3Dust} dust`;
  wrapupScore.textContent = `Worthiness Score: ${finalScore.toLocaleString()}`;
  wrapupSubtitle.textContent = `${state.failureCount} failure${state.failureCount === 1 ? "" : "s"} · ${state.trial3Dust} dust saved`;

  wrapup.hidden = false;
  requestAnimationFrame(() => {
    wrapupDialog.focus();
  });

  highScore.submit(finalScore, {
    totalTimeMs: Math.round(totalTime * 1000),
    trialTimesMs: state.trialTimes.map((value) => Math.round(value * 1000)),
    failures: state.failureCount,
    dustRemaining: state.trial3Dust,
  });
}

function closeWrapup() {
  wrapup.hidden = true;
  requestAnimationFrame(() => {
    trial1StartButton.focus({ preventScroll: true });
  });
}

function resetExpedition() {
  state.currentTrial = 0;
  state.totalStart = null;
  state.trialStart = null;
  state.trialTimes = [0, 0, 0];
  state.failureCount = 0;
  state.completedTrials = 0;
  state.trial1Input = [];
  state.trial1Active = false;
  state.trial1RevealRunning = false;
  state.trial2Active = false;
  state.trial2WindowOpen = false;
  state.trial3Active = false;
  state.trial3Dust = MAX_DUST;
  state.trial3Column = 0;
  state.trial3Lane = TRIAL3_START_LANE;
  state.trial3PendingMoves = 0;
  state.trial3AdvanceUnlocked = false;
  clearRevealTimers();
  window.clearTimeout(state.trial2BladeTimer);
  window.clearTimeout(state.trial2WindowTimer);
  clearTrial3Reveal();
  resetTrial1ForRetry();
  resetTrial2ForRetry();
  resetTrial3ForRetry();
  trial2StartButton.disabled = true;
  duckButton.disabled = true;
  lightTossButton.disabled = true;
  heavyTossButton.disabled = true;
  advanceButton.disabled = true;
  setTrialStatus(trial1Section, trial1Status, "Press Begin Chant to watch the inscription ignite.");
  setTrialStatus(trial2Section, trial2Status, "Await the verdict from Trial I.");
  setTrialStatus(trial3Section, trial3Status, "The bridge awaits the penitent.");
  updateLegend(1, "untouched");
  updateLegend(2, "awaiting");
  updateLegend(3, "awaiting");
  updateHud();
}



function initializeTiles() {
  TRIAL1_GRID.forEach((row) => {
    row.forEach((letter, columnIndex) => {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.textContent = letter;
      tile.dataset.index = String(trial1Tiles.length);
      tile.dataset.disabled = "true";
      tile.addEventListener("click", handleTrial1TileClick);
      trial1Grid.appendChild(tile);
      trial1Tiles.push(tile);
    });
  });
}

initializeTiles();
buildChasmTrack();
resetExpedition();

trial1StartButton.addEventListener("click", startTrial1);
trial1SkipButton.addEventListener("click", skipTrial1Reveal);
trial2StartButton.addEventListener("click", startTrial2);
duckButton.addEventListener("click", handleDuck);
lightTossButton.addEventListener("click", () => handleDustThrow(LIGHT_TOSS));
heavyTossButton.addEventListener("click", () => handleDustThrow(HEAVY_TOSS));
advanceButton.addEventListener("click", handleAdvance);
wrapupReplay.addEventListener("click", () => {
  closeWrapup();
  resetExpedition();
});
wrapupClose.addEventListener("click", closeWrapup);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !wrapup.hidden) {
    closeWrapup();
  }
});

window.addEventListener("beforeunload", () => {
  particleField?.stop?.();
});
