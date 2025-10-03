import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { mountParticleField } from "../particles.js";

const particleSystem = mountParticleField({
  effects: {
    palette: ["#38bdf8", "#84cc16", "#facc15", "#fb7185"],
    ambientDensity: 0.55,
  },
});

const scoreConfig = getScoreConfig("half-inch-heroes");
const highScore = initHighScoreBanner({
  gameId: "half-inch-heroes",
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

const MAX_DISTANCE = 120;
const MAX_TURNS = 12;
const MAX_METER = 100;

const startButton = document.getElementById("start-mission");
const resetButton = document.getElementById("reset-mission");
const clearLogButton = document.getElementById("clear-log");
const missionStatus = document.getElementById("mission-status");
const eventLog = document.getElementById("event-log");
const actionButtons = Array.from(document.querySelectorAll("[data-action]"));

const distanceFill = document.getElementById("distance-fill");
const hydrationFill = document.getElementById("hydration-fill");
const dangerFill = document.getElementById("danger-fill");
const loyaltyFill = document.getElementById("loyalty-fill");
const distanceValue = document.getElementById("distance-value");
const hydrationValue = document.getElementById("hydration-value");
const dangerValue = document.getElementById("danger-value");
const loyaltyValue = document.getElementById("loyalty-value");
const crumbCount = document.getElementById("crumb-count");
const turnCount = document.getElementById("turn-count");

function createInitialState() {
  return {
    active: false,
    turnsLeft: MAX_TURNS,
    distance: 0,
    hydration: 72,
    danger: 22,
    loyalty: 64,
    crumbs: 2,
    log: [],
  };
}

const state = createInitialState();

resetMission({ preserveLog: false });

startButton.addEventListener("click", () => {
  if (state.active) {
    setMissionStatus("Run already in progress. Issue an action to continue.");
    return;
  }
  state.active = true;
  state.turnsLeft = MAX_TURNS;
  state.distance = Math.max(0, state.distance);
  state.hydration = clamp(state.hydration, 30, MAX_METER);
  state.danger = clamp(state.danger, 0, 40);
  state.loyalty = clamp(state.loyalty, 40, MAX_METER);
  state.crumbs = Math.max(1, state.crumbs);
  state.log = [];
  addLog("Mission start. Beacon ping heard from the attic.", "success");
  setMissionStatus("Backyard run live. Choose the first action.", "success");
  toggleActionButtons(true);
  updateMeters();
});

resetButton.addEventListener("click", () => {
  resetMission();
});

actionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    performAction(button.dataset.action);
  });
});

clearLogButton.addEventListener("click", () => {
  state.log = [];
  renderLog();
  setMissionStatus("Mission log cleared. Data slate ready.");
});

function performAction(action) {
  if (!state.active) {
    setMissionStatus("Start the run before issuing action commands.", "warning");
    return;
  }
  const summary = resolveAction(action);
  const driftNotes = applyBackyardDrift();
  const eventNotes = resolveRandomEvent();
  state.turnsLeft = Math.max(0, state.turnsLeft - 1);
  clampMeters();
  updateMeters();
  if (summary) {
    addLog(summary.message, summary.tone);
  }
  driftNotes.forEach((note) => addLog(note.message, note.tone));
  eventNotes.forEach((note) => addLog(note.message, note.tone));
  if (checkFailure()) {
    return;
  }
  if (checkVictory()) {
    return;
  }
  if (state.turnsLeft === 0) {
    completeMission({
      success: state.distance >= 96,
      message:
        state.distance >= 96
          ? "Beacon barely locks on. Extraction rope descends from the attic."
          : "Night creeps in before the beacon syncs. Rescue team remains grounded.",
      tone: state.distance >= 96 ? "success" : "danger",
    });
    return;
  }
  setMissionStatus(
    `Turns remaining: ${state.turnsLeft}. Hydration ${Math.round(state.hydration)}%. Danger ${Math.round(state.danger)}%.`
  );
}

function resolveAction(action) {
  const notes = {
    message: "", 
    tone: "info",
  };
  switch (action) {
    case "ride":
      if (state.loyalty < 18) {
        state.distance = Math.max(0, state.distance - 2);
        state.danger = clamp(state.danger + 6, 0, MAX_METER);
        state.loyalty = clamp(state.loyalty - 4, 0, MAX_METER);
        notes.message = "Gauss refuses the sprint. The hesitation costs precious seconds.";
        notes.tone = "warning";
        return notes;
      }
      {
        const surge = randomBetween(18, 28) + Math.floor(state.loyalty / 12);
        const scare = randomBetween(8, 16) + (state.danger > 70 ? 6 : 0);
        state.distance = clamp(state.distance + surge, 0, MAX_DISTANCE);
        state.hydration = clamp(state.hydration - randomBetween(6, 9), 0, MAX_METER);
        state.danger = clamp(state.danger + scare, 0, MAX_METER + 20);
        state.loyalty = clamp(state.loyalty - randomBetween(12, 18), 0, MAX_METER);
        if (Math.random() < 0.25 && state.crumbs < 4) {
          state.crumbs += 1;
          notes.message = `Gauss barrels ahead, sniffing out a sugar cache. Distance +${surge}, crumb token +1.`;
          notes.tone = "success";
        } else {
          notes.message = `Gauss charge covers ${surge} span. Danger spikes by ${scare}.`;
          notes.tone = "info";
        }
      }
      return notes;
    case "dew": {
      const refill = randomBetween(18, 26);
      const calm = randomBetween(9, 14);
      const progress = randomBetween(4, 7);
      state.hydration = clamp(state.hydration + refill, 0, MAX_METER);
      state.danger = clamp(state.danger - calm, 0, MAX_METER);
      state.distance = clamp(state.distance + progress, 0, MAX_DISTANCE);
      state.loyalty = clamp(state.loyalty + 6, 0, MAX_METER);
      notes.message = `Dew harvest nets ${refill}% hydration and trims danger by ${calm}.`;
      notes.tone = "success";
      return notes;
    }
    case "vault": {
      const cost = randomBetween(12, 18);
      const leap = randomBetween(20, 28);
      state.hydration = clamp(state.hydration - cost, 0, MAX_METER);
      state.distance = clamp(state.distance + leap, 0, MAX_DISTANCE);
      let hazard = randomBetween(10, 16);
      if (state.danger > 78 && Math.random() < 0.4) {
        const tumble = randomBetween(8, 14);
        state.distance = clamp(state.distance - tumble, 0, MAX_DISTANCE);
        hazard += 8;
        state.danger = clamp(state.danger + hazard, 0, MAX_METER + 20);
        state.loyalty = clamp(state.loyalty - 6, 0, MAX_METER);
        notes.message = `Crosswind flips the seed. Crew slides back ${tumble}, danger surges ${hazard}.`;
        notes.tone = "danger";
      } else {
        state.danger = clamp(state.danger + hazard, 0, MAX_METER + 20);
        state.loyalty = clamp(state.loyalty - 4, 0, MAX_METER);
        notes.message = `Seed sling vault clears ${leap} span. Danger rises ${hazard}.`;
        notes.tone = "info";
      }
      return notes;
    }
    case "signal":
      if (state.crumbs <= 0) {
        state.danger = clamp(state.danger + 5, 0, MAX_METER);
        notes.message = "No crumbs available. Sprinkler alert inches higher.";
        notes.tone = "warning";
        return notes;
      }
      {
        const calm = randomBetween(18, 26);
        const loyaltyBoost = randomBetween(12, 18);
        const stride = randomBetween(10, 16);
        const hydrationBoost = randomBetween(6, 10);
        state.crumbs -= 1;
        state.danger = clamp(state.danger - calm, 0, MAX_METER);
        state.loyalty = clamp(state.loyalty + loyaltyBoost, 0, MAX_METER);
        state.distance = clamp(state.distance + stride, 0, MAX_DISTANCE);
        state.hydration = clamp(state.hydration + hydrationBoost, 0, MAX_METER);
        notes.message =
          `Crumb signal drops danger ${calm}, loyalty +${loyaltyBoost}, hydration +${hydrationBoost}.`; 
        notes.tone = "success";
      }
      return notes;
    case "crawl": {
      const crawlGain = randomBetween(6, 10);
      const crawlCalm = randomBetween(6, 12);
      const hydrateCost = randomBetween(2, 4);
      state.distance = clamp(state.distance + crawlGain, 0, MAX_DISTANCE);
      state.danger = clamp(state.danger - crawlCalm, 0, MAX_METER);
      state.hydration = clamp(state.hydration - hydrateCost, 0, MAX_METER);
      state.loyalty = clamp(state.loyalty + 4, 0, MAX_METER);
      notes.message = `Blade crawl inches ${crawlGain} forward and eases danger by ${crawlCalm}.`;
      notes.tone = "info";
      return notes;
    }
    default:
      notes.message = "Unknown action issued.";
      notes.tone = "warning";
      return notes;
  }
}

function applyBackyardDrift() {
  const notes = [];
  const hydrationDrain = state.danger > 70 ? 7 : 4;
  const dangerRise = state.danger > 65 ? 5 : 2;
  state.hydration = clamp(state.hydration - hydrationDrain, 0, MAX_METER);
  state.danger = clamp(state.danger + dangerRise, 0, MAX_METER + 20);
  if (state.danger > 85) {
    state.loyalty = clamp(state.loyalty - 6, 0, MAX_METER);
    notes.push({
      message: "Scorpion sweep rattles Gauss. Loyalty slips under pressure.",
      tone: "warning",
    });
  } else if (Math.random() < 0.22) {
    state.loyalty = clamp(state.loyalty + 2, 0, MAX_METER);
  }
  if (hydrationDrain >= 6) {
    notes.push({
      message: `Suit seals strain under dry air. Hydration drains ${hydrationDrain}%.`,
      tone: "warning",
    });
  }
  return notes;
}

function resolveRandomEvent() {
  const roll = Math.random();
  const notes = [];
  if (roll > 0.8) {
    const spike = randomBetween(14, 22);
    const soak = randomBetween(6, 11);
    state.danger = clamp(state.danger + spike, 0, MAX_METER + 20);
    state.hydration = clamp(state.hydration + soak, 0, MAX_METER);
    notes.push({
      message: `Sprinkler arc clips the squad. Danger +${spike}, hydration +${soak}.`,
      tone: "danger",
    });
  } else if (roll > 0.6) {
    const calm = randomBetween(10, 18);
    state.danger = clamp(state.danger - calm, 0, MAX_METER);
    if (state.crumbs < 4 && Math.random() < 0.4) {
      state.crumbs += 1;
      notes.push({
        message: `Ladybug caravan drops a crumb gift. Danger -${calm}, crumb token +1.`,
        tone: "success",
      });
    } else {
      notes.push({
        message: `Garden breeze hushes the lawn. Danger reduced by ${calm}.`,
        tone: "success",
      });
    }
  } else if (roll < 0.16) {
    const sting = randomBetween(8, 14);
    state.danger = clamp(state.danger + sting, 0, MAX_METER + 20);
    state.loyalty = clamp(state.loyalty - 5, 0, MAX_METER);
    notes.push({
      message: `Bee shadow swoops overhead. Danger +${sting}, loyalty shaken.`,
      tone: "warning",
    });
  } else if (roll < 0.3) {
    state.crumbs = Math.min(4, state.crumbs + 1);
    notes.push({
      message: "Scout ant delivers a pantry crumb. Token reserves +1.",
      tone: "success",
    });
  }
  return notes;
}

function checkFailure() {
  if (state.hydration <= 0) {
    completeMission({
      success: false,
      message: "Hydration seals fail. Crew signals for emergency pickup.",
      tone: "danger",
    });
    return true;
  }
  if (state.danger >= MAX_METER) {
    completeMission({
      success: false,
      message: "Lawn danger maxes out. Scorpion sweep forces extraction.",
      tone: "danger",
    });
    return true;
  }
  return false;
}

function checkVictory() {
  if (state.distance >= MAX_DISTANCE) {
    completeMission({
      success: true,
      message: "Beacon sync perfect. Attic winch reels the crew to safety.",
      tone: "success",
    });
    return true;
  }
  return false;
}

function completeMission({ success, message, tone }) {
  state.active = false;
  toggleActionButtons(false);
  clampMeters();
  updateMeters();
  setMissionStatus(message, tone);
  addLog(message, tone);
  const scoreValue = Math.max(0, Math.round(state.distance));
  highScore.submit(scoreValue, {
    turnsUsed: MAX_TURNS - state.turnsLeft,
    hydration: Math.max(0, Math.round(state.hydration)),
    loyalty: Math.max(0, Math.round(state.loyalty)),
  });
  if (success) {
    particleSystem?.burst({
      count: 28,
      scatter: 220,
      palette: ["#84cc16", "#38bdf8", "#facc15"],
      origin: {
        x: window.innerWidth * 0.58,
        y: window.innerHeight * 0.35,
      },
    });
  }
}

function resetMission({ preserveLog = false } = {}) {
  const next = createInitialState();
  Object.assign(state, next);
  if (!preserveLog) {
    state.log = [];
  }
  toggleActionButtons(false);
  renderLog();
  updateMeters();
  setMissionStatus("Awaiting mission start.");
}

function clampMeters() {
  state.distance = clamp(state.distance, 0, MAX_DISTANCE);
  state.hydration = clamp(state.hydration, 0, MAX_METER);
  state.danger = clamp(state.danger, 0, MAX_METER + 20);
  state.loyalty = clamp(state.loyalty, 0, MAX_METER);
  state.crumbs = clamp(state.crumbs, 0, 4);
}

function updateMeters() {
  const distancePct = (state.distance / MAX_DISTANCE) * 100;
  distanceFill.style.width = `${Math.min(distancePct, 100)}%`;
  distanceValue.textContent = `${Math.round(state.distance)} / ${MAX_DISTANCE}`;

  const hydrationPct = (state.hydration / MAX_METER) * 100;
  hydrationFill.style.width = `${Math.max(0, Math.min(hydrationPct, 100))}%`;
  hydrationValue.textContent = `${Math.round(state.hydration)}%`;

  const dangerPct = (state.danger / MAX_METER) * 100;
  dangerFill.style.width = `${Math.max(0, Math.min(dangerPct, 100))}%`;
  dangerValue.textContent = `${Math.round(state.danger)}%`;

  const loyaltyPct = (state.loyalty / MAX_METER) * 100;
  loyaltyFill.style.width = `${Math.max(0, Math.min(loyaltyPct, 100))}%`;
  loyaltyValue.textContent = `${Math.round(state.loyalty)}%`;

  crumbCount.textContent = `${state.crumbs}`;
  turnCount.textContent = `${state.turnsLeft}`;
}

function renderLog() {
  eventLog.innerHTML = "";
  const fragment = document.createDocumentFragment();
  state.log.slice(0, 48).forEach((entry) => {
    const li = document.createElement("li");
    li.textContent = entry.message;
    if (entry.tone && entry.tone !== "info") {
      li.dataset.type = entry.tone;
    }
    fragment.appendChild(li);
  });
  eventLog.appendChild(fragment);
}

function addLog(message, tone = "info") {
  state.log.unshift({ message, tone });
  state.log = state.log.slice(0, 48);
  renderLog();
}

function setMissionStatus(message, tone) {
  missionStatus.textContent = message;
  if (tone) {
    missionStatus.setAttribute("data-status", tone);
  } else {
    missionStatus.removeAttribute("data-status");
  }
}

function toggleActionButtons(enabled) {
  actionButtons.forEach((button) => {
    button.disabled = !enabled;
  });
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function randomBetween(min, max) {
  const lower = Math.ceil(min);
  const upper = Math.floor(max);
  return Math.floor(Math.random() * (upper - lower + 1)) + lower;
}
