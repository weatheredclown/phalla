import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { mountParticleField } from "../particles.js";
import { autoEnhanceFeedback, createLogChannel, createStatusChannel } from "../feedback.js";

const particleField = mountParticleField({
  effects: {
    palette: ["#ffd166", "#4cc9f0", "#ff85f3", "#06d6a0"],
    ambientDensity: 0.55,
  },
});

const scoreConfig = getScoreConfig("voice-box-swap");
const highScore = initHighScoreBanner({
  gameId: "voice-box-swap",
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

const ACTION_LIBRARY = {
  giggle: {
    id: "giggle",
    label: "Giggle Burst",
    icon: "😄",
    tone: "happy",
    babyClass: "is-giggle",
    description: "Let loose a bright belly laugh.",
    successSound: "Giggle pop",
  },
  cry: {
    id: "cry",
    label: "Full Cry",
    icon: "😭",
    tone: "fussy",
    babyClass: "is-cry",
    description: "Launch the classic wail.",
    successSound: "Cry siren",
  },
  rattle: {
    id: "rattle",
    label: "Rattle Launch",
    icon: "🪀",
    tone: "mischief",
    babyClass: "is-rattle",
    description: "Pitch the nearest toy for emphasis.",
    successSound: "Clatter hit",
  },
  shrug: {
    id: "shrug",
    label: "Befuddled Shrug",
    icon: "🤷",
    tone: "confused",
    babyClass: "is-shrug",
    description: "Offer a who-me shoulder roll.",
    successSound: "Shrug rustle",
  },
  yawn: {
    id: "yawn",
    label: "Sleepy Yawn",
    icon: "😴",
    tone: "calm",
    babyClass: "is-yawn",
    description: "Stretch, sigh, and feign sleep.",
    successSound: "Soft coo",
  },
  bottle: {
    id: "bottle",
    label: "Milk Chug",
    icon: "🍼",
    tone: "calm",
    babyClass: "is-bottle",
    description: "Reach for refreshment with gusto.",
    successSound: "Slurp sip",
  },
  babble: {
    id: "babble",
    label: "Babble Solo",
    icon: "🗯️",
    tone: "mischief",
    babyClass: "is-babble",
    description: "Fire off an improv monologue.",
    successSound: "Babble riff",
  },
};

const PHASES = [
  {
    id: "morning",
    name: "Morning",
    timer: 18,
    basePoints: 120,
    intro: "Morning monitors armed. Keep it light and obvious.",
    scenarios: [
      {
        id: "sunrise-bottle",
        text: "Sirens in the tummy. Deploy the milk before the revolt starts.",
        correct: "bottle",
        options: ["bottle", "giggle", "cry"],
      },
      {
        id: "tickle-tax",
        text: "They’re wiggling my feet like it’s a talk show bit. Might as well feed them a laugh track.",
        correct: "giggle",
        options: ["giggle", "shrug", "cry"],
      },
      {
        id: "fan-drama",
        text: "Ceiling fan is doing its best helicopter impression. Time to yell until someone salutes.",
        correct: "cry",
        options: ["cry", "bottle", "rattle"],
      },
      {
        id: "diaper-protest",
        text: "Diaper feels like a beanbag chair. Better lob a rattle and demand service.",
        correct: "rattle",
        options: ["rattle", "yawn", "giggle"],
      },
    ],
  },
  {
    id: "playtime",
    name: "Playtime",
    timer: 14,
    basePoints: 150,
    intro: "Playtime sarcasm engaged. Interpret the shade.",
    scenarios: [
      {
        id: "duck-audition",
        text: "They’re back with the squeaky duck one-man show. Guess it’s my turn to babble the encore.",
        correct: "babble",
        options: ["babble", "giggle", "shrug", "rattle"],
      },
      {
        id: "peekaboo-fatigue",
        text: "Peekaboo again? Wow, didn’t see that coming. Offer the most dramatic shrug imaginable.",
        correct: "shrug",
        options: ["shrug", "giggle", "cry", "babble"],
      },
      {
        id: "tummy-time",
        text: "They said 'tummy time' like it’s spa day. I’ll stage a yawn and negotiate for cuddle time.",
        correct: "yawn",
        options: ["yawn", "cry", "rattle", "giggle"],
      },
      {
        id: "tower-collapse",
        text: "Block tower collapsed again. Clearly the rattle needs to lead the investigation.",
        correct: "rattle",
        options: ["rattle", "babble", "cry", "shrug"],
      },
    ],
  },
  {
    id: "bedtime",
    name: "Bedtime",
    timer: 11,
    basePoints: 190,
    intro: "Bedtime whispers now. Sarcasm is sleepy and sharp.",
    scenarios: [
      {
        id: "off-key-lullaby",
        text: "They’re humming off-key lullabies again. A heroic yawn might save the tune.",
        correct: "yawn",
        options: ["yawn", "giggle", "cry", "shrug"],
      },
      {
        id: "monitor-light",
        text: "Monitor light is spotlight bright. I’ll babble like I’m hosting late-night radio.",
        correct: "babble",
        options: ["babble", "cry", "yawn", "giggle"],
      },
      {
        id: "blanket-drama",
        text: "They tucked the blanket like a burrito. Only a polite giggle keeps me from busting out.",
        correct: "giggle",
        options: ["giggle", "cry", "rattle", "bottle"],
      },
      {
        id: "last-call",
        text: "Nightlight flickered twice—that’s the secret code for one last milk run.",
        correct: "bottle",
        options: ["bottle", "yawn", "cry", "shrug"],
      },
    ],
  },
];

const PARENT_MOMENTS = [
  {
    id: "sleepy-parent",
    prompt: "Parent tiptoes in with half-closed eyes clutching a bottle. Noise is outlawed.",
    correct: "safe",
    safePoints: 70,
    riskyBonus: 320,
    riskyPenalty: 220,
    safeCopy: "You coo softly. Combo stays safe.",
    riskySuccess: "You nail a whisper giggle. Parent chuckles, jackpot!",
    riskyFail: "You went full confetti laugh. Parent jolts, combo implodes.",
  },
  {
    id: "camera-ready",
    prompt: "Parent cracks the door with a camcorder grin. They want highlight reels.",
    correct: "risky",
    safePoints: 60,
    riskyBonus: 360,
    riskyPenalty: 260,
    safeCopy: "You stay mellow. Parent leaves mildly impressed.",
    riskySuccess: "You deliver the perfect babble solo. Record-smashing applause!",
    riskyFail: "The big move fizzles. Camera powers down and combo shatters.",
  },
  {
    id: "suspicious-sniff",
    prompt: "Parent sniff-checks the room with eyebrows raised. Better tread carefully.",
    correct: "safe",
    safePoints: 80,
    riskyBonus: 340,
    riskyPenalty: 240,
    safeCopy: "You settle into quiet innocence. Crisis averted.",
    riskySuccess: "You somehow charm them with a sly shrug. Massive points!",
    riskyFail: "You toss a rattle at the wrong time. Combo breaks and score dips.",
  },
  {
    id: "dance-party",
    prompt: "Parent is bouncing to 'Bust a Move' in the hall. Energy demands a showstopper.",
    correct: "risky",
    safePoints: 65,
    riskyBonus: 400,
    riskyPenalty: 280,
    safeCopy: "You stay chill. Groove passes you by but combo survives.",
    riskySuccess: "You launch a flawless giggle-pop routine. Huge bonus!",
    riskyFail: "You misfire the routine. Parent sighs and the streak snaps.",
  },
];

const babyAvatar = document.getElementById("baby-avatar");
const thoughtText = document.getElementById("thought-text");
const actionGrid = document.getElementById("action-grid");
const statusBar = document.getElementById("status-bar");
const timerValue = document.getElementById("decision-timer");
const timerWarning = document.getElementById("timer-warning");
const syncScoreEl = document.getElementById("sync-score");
const comboLabel = document.getElementById("combo-multiplier");
const longestComboEl = document.getElementById("longest-combo");
const bestRiskyEl = document.getElementById("best-risky");
const phaseNameEl = document.getElementById("phase-name");
const phaseTracker = document.getElementById("phase-tracker");
const replayButton = document.getElementById("replay-day");
const eventLogEl = document.getElementById("event-log");
const summaryOverlay = document.getElementById("summary-overlay");
const summaryScoreEl = document.getElementById("summary-score");
const summaryComboEl = document.getElementById("summary-combo");
const summaryRiskyEl = document.getElementById("summary-risky");
const summaryReplay = document.getElementById("summary-replay");
const summaryClose = document.getElementById("summary-close");

const statusChannel = createStatusChannel(statusBar);
const logChannel = createLogChannel(eventLogEl, { limit: 10 });

const BABY_STATES = ["is-giggle", "is-cry", "is-rattle", "is-shrug", "is-yawn", "is-bottle", "is-babble"];

const state = {
  phaseIndex: 0,
  scenarioIndex: 0,
  comboStreak: 0,
  score: 0,
  longestCombo: 0,
  bestRisky: 0,
  awaitingChoice: false,
  currentScenario: null,
  parentEvent: null,
  parentCooldown: 0,
  timerId: null,
  timeRemaining: 0,
  deck: [],
  summaryOpen: false,
};

setupPhaseTracker();
wireControls();
resetDay();
autoEnhanceFeedback();

function resetDay() {
  stopTimer();
  hideSummary();
  state.phaseIndex = 0;
  state.scenarioIndex = 0;
  state.comboStreak = 0;
  state.score = 0;
  state.longestCombo = 0;
  state.bestRisky = 0;
  state.parentCooldown = 0;
  state.deck = buildDeck();
  updateScoreboard();
  updatePhaseTracker();
  logChannel.push("Daily routine reset. Baby eyes are wide open.");
  statusChannel("Morning monitors armed. Watch the thought bubble.", "info");
  presentNextScenario();
}

function buildDeck() {
  return PHASES.map((phase) => ({
    ...phase,
    scenarios: shuffle([...phase.scenarios]),
  }));
}

function presentNextScenario() {
  if (state.phaseIndex >= state.deck.length) {
    completeDay();
    return;
  }

  const phase = state.deck[state.phaseIndex];
  if (state.scenarioIndex >= phase.scenarios.length) {
    state.phaseIndex += 1;
    state.scenarioIndex = 0;
    updatePhaseTracker();
    presentNextScenario();
    return;
  }

  const scenario = phase.scenarios[state.scenarioIndex];
  state.currentScenario = {
    ...scenario,
    phaseId: phase.id,
    phaseName: phase.name,
    basePoints: phase.basePoints,
  };
  state.awaitingChoice = true;
  state.parentEvent = null;

  phaseNameEl.textContent = phase.name;
  thoughtText.textContent = scenario.text;
  renderActions(scenario.options);
  setBabyState(null);
  timerWarning.textContent = "";
  statusChannel(phase.intro, "info");
  startTimer(phase.timer, () => {
    handleScenarioResult(null, { reason: "timeout" });
  });
}

function renderActions(optionIds) {
  actionGrid.innerHTML = "";
  optionIds.forEach((actionId, index) => {
    const action = ACTION_LIBRARY[actionId];
    if (!action) {
      return;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "icon-button";
    button.dataset.actionId = actionId;
    button.dataset.tone = action.tone;
    button.setAttribute("role", "radio");
    button.setAttribute("aria-checked", "false");
    button.dataset.index = String(index);
    button.innerHTML = `
      <span class="icon-glyph" aria-hidden="true">${action.icon}</span>
      <span class="icon-label">${action.label}</span>
    `;
    button.title = action.description;
    button.addEventListener("click", () => {
      chooseAction(actionId);
    });
    actionGrid.append(button);
  });
}

function chooseAction(actionId) {
  if (!state.awaitingChoice || state.parentEvent) {
    return;
  }
  const scenario = state.currentScenario;
  if (!scenario) {
    return;
  }
  stopTimer();
  state.awaitingChoice = false;
  const isCorrect = actionId === scenario.correct;
  const action = ACTION_LIBRARY[actionId];
  const multiplier = getMultiplier(isCorrect ? state.comboStreak + 1 : state.comboStreak);

  if (isCorrect) {
    state.comboStreak += 1;
    state.longestCombo = Math.max(state.longestCombo, state.comboStreak);
    const points = Math.round(scenario.basePoints * multiplier);
    state.score += points;
    updateScoreboard({ highlightCombo: true });
    animateBaby(action?.babyClass ?? null);
    particleField.emitBurst(0.75 + state.comboStreak * 0.15);
    statusChannel(
      `${action?.successSound ?? "Success"}! Sync locked at ×${getMultiplier()} combo.`,
      "success",
    );
    logChannel.push(
      `Synced ${action?.label ?? "action"} · +${points.toLocaleString()} (${formatMultiplier()})`,
      "success",
    );
    queueNextStep(() => {
      if (!maybeTriggerParentMoment()) {
        advanceScenario();
      }
    });
  } else {
    shatterCombo();
    const penalty = Math.round(scenario.basePoints * 0.6);
    state.score = Math.max(0, state.score - penalty);
    updateScoreboard({ comboBroken: true });
    animateBaby(randomIncorrectBabyClass(actionId));
    statusChannel("Wah-wah trombone! That action missed the vibe.", "danger");
    logChannel.push(
      `Missed sync on ${action?.label ?? "action"} · -${penalty.toLocaleString()} (combo reset)`,
      "danger",
    );
    queueNextStep(() => {
      advanceScenario();
    });
  }
}

function handleScenarioResult(actionId, { reason }) {
  if (!state.awaitingChoice || state.parentEvent) {
    return;
  }
  state.awaitingChoice = false;
  const scenario = state.currentScenario;
  if (!scenario) {
    return;
  }
  if (reason === "timeout") {
    shatterCombo();
    const penalty = Math.round(scenario.basePoints * 0.75);
    state.score = Math.max(0, state.score - penalty);
    updateScoreboard({ comboBroken: true });
    animateBaby(randomIncorrectBabyClass(actionId));
    statusChannel("Timer buzzed out—combo shattered.", "danger");
    logChannel.push(
      `Timer expired · -${penalty.toLocaleString()} (combo reset)`,
      "danger",
    );
    queueNextStep(() => {
      advanceScenario();
    });
  }
}

function advanceScenario() {
  state.scenarioIndex += 1;
  updatePhaseTracker();
  presentNextScenario();
}

function maybeTriggerParentMoment() {
  if (state.parentCooldown > 0) {
    state.parentCooldown -= 1;
    return false;
  }
  if (state.comboStreak < 2) {
    return false;
  }
  if (Math.random() > 0.45) {
    state.parentCooldown = 1;
    return false;
  }
  const moment = randomChoice(PARENT_MOMENTS);
  startParentMoment(moment);
  state.parentCooldown = 2;
  return true;
}

function startParentMoment(moment) {
  state.parentEvent = moment;
  state.awaitingChoice = true;
  stopTimer();
  thoughtText.textContent = moment.prompt;
  renderParentChoices();
  statusChannel("Parent Is Nearby! Pick Safe or Risky before they notice.", "warning");
  startTimer(8, () => {
    resolveParentMoment("timeout");
  });
}

function renderParentChoices() {
  actionGrid.innerHTML = "";

  const safeButton = document.createElement("button");
  safeButton.type = "button";
  safeButton.className = "icon-button";
  safeButton.dataset.tone = "calm";
  safeButton.dataset.actionId = "safe";
  safeButton.innerHTML = `
    <span class="icon-glyph" aria-hidden="true">🛏️</span>
    <span class="icon-label">Safe Sway</span>
  `;
  safeButton.addEventListener("click", () => resolveParentMoment("safe"));

  const riskyButton = document.createElement("button");
  riskyButton.type = "button";
  riskyButton.className = "icon-button";
  riskyButton.dataset.tone = "mischief";
  riskyButton.dataset.actionId = "risky";
  riskyButton.innerHTML = `
    <span class="icon-glyph" aria-hidden="true">🎉</span>
    <span class="icon-label">Risky Routine</span>
  `;
  riskyButton.addEventListener("click", () => resolveParentMoment("risky"));

  actionGrid.append(safeButton, riskyButton);
}

function resolveParentMoment(selection) {
  if (!state.parentEvent || !state.awaitingChoice) {
    return;
  }
  stopTimer();
  state.awaitingChoice = false;
  const moment = state.parentEvent;
  state.parentEvent = null;

  if (selection === "timeout") {
    shatterCombo();
    const penalty = moment.riskyPenalty;
    state.score = Math.max(0, state.score - penalty);
    updateScoreboard({ comboBroken: true });
    animateBaby(randomIncorrectBabyClass());
    statusChannel("Parent caught you frozen! Combo busted.", "danger");
    logChannel.push(`Froze under pressure · -${penalty.toLocaleString()} (combo reset)`, "danger");
    queueNextStep(() => {
      advanceScenario();
    });
    return;
  }

  if (selection === "safe") {
    const award = moment.safePoints;
    state.score += award;
    updateScoreboard({ highlightSafe: true });
    animateBaby("is-yawn");
    statusChannel(moment.safeCopy ?? "Safe choice logged.", "info");
    logChannel.push(`Safe play · +${award.toLocaleString()} (combo held)`, "warning");
    queueNextStep(() => {
      advanceScenario();
    });
    return;
  }

  const success = moment.correct === "risky";
  if (success) {
    state.comboStreak += 1;
    state.longestCombo = Math.max(state.longestCombo, state.comboStreak);
    const multiplier = getMultiplier();
    const bonus = Math.round(moment.riskyBonus * multiplier);
    state.score += bonus;
    state.bestRisky = Math.max(state.bestRisky, bonus);
    updateScoreboard({ highlightCombo: true });
    animateBaby("is-giggle");
    particleField.emitBurst(1.45);
    statusChannel(moment.riskySuccess ?? "Risk paid off!", "success");
    logChannel.push(
      `Risky win · +${bonus.toLocaleString()} (${formatMultiplier()})`,
      "success",
    );
  } else {
    shatterCombo();
    const penalty = moment.riskyPenalty;
    state.score = Math.max(0, state.score - penalty);
    updateScoreboard({ comboBroken: true });
    animateBaby("is-cry");
    statusChannel(moment.riskyFail ?? "Risk backfired.", "danger");
    logChannel.push(
      `Risky miss · -${penalty.toLocaleString()} (combo reset)`,
      "danger",
    );
  }

  queueNextStep(() => {
    advanceScenario();
  });
}

function startTimer(seconds, onExpire) {
  stopTimer();
  state.timeRemaining = seconds;
  const start = performance.now();
  updateTimerDisplay();
  state.timerId = window.setInterval(() => {
    const elapsed = (performance.now() - start) / 1000;
    state.timeRemaining = Math.max(0, seconds - elapsed);
    updateTimerDisplay();
    if (state.timeRemaining <= 0) {
      stopTimer();
      if (typeof onExpire === "function") {
        onExpire();
      }
    }
  }, 100);
}

function stopTimer() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

function updateTimerDisplay() {
  if (state.timeRemaining === undefined) {
    timerValue.textContent = "—";
    timerValue.classList.remove("danger");
    return;
  }
  timerValue.textContent = `${state.timeRemaining.toFixed(1)}s`;
  if (state.timeRemaining <= 3) {
    timerValue.classList.add("danger");
    timerWarning.textContent = "Hurry! Combo at risk.";
  } else {
    timerValue.classList.remove("danger");
    timerWarning.textContent = "";
  }
}

function updateScoreboard({ highlightCombo = false, comboBroken = false, highlightSafe = false } = {}) {
  syncScoreEl.textContent = state.score.toLocaleString();
  comboLabel.textContent = `×${getMultiplier()}`;
  longestComboEl.textContent = state.longestCombo.toString();
  bestRiskyEl.textContent = state.bestRisky.toLocaleString();

  const comboContainer = comboLabel.parentElement;
  if (!comboContainer) {
    return;
  }

  const pulse = (className) => {
    comboContainer.classList.remove(className);
    // eslint-disable-next-line no-unused-expressions
    comboContainer.offsetWidth;
    comboContainer.classList.add(className);
    window.setTimeout(() => {
      comboContainer.classList.remove(className);
    }, 420);
  };

  if (highlightCombo) {
    pulse("popped");
  }

  if (comboBroken) {
    pulse("reset");
  }

  if (highlightSafe) {
    pulse("safe-pulse");
  }
}

function shatterCombo() {
  state.comboStreak = 0;
}

function getMultiplier(streak = state.comboStreak) {
  return Math.max(1, streak + 1);
}

function formatMultiplier() {
  return `×${getMultiplier()}`;
}

function animateBaby(stateClass) {
  setBabyState(stateClass);
}

function setBabyState(stateClass) {
  BABY_STATES.forEach((cls) => {
    babyAvatar.classList.remove(cls);
  });
  if (stateClass) {
    // eslint-disable-next-line no-unused-expressions
    babyAvatar.offsetWidth;
    babyAvatar.classList.add(stateClass);
  }
}

function randomIncorrectBabyClass(excluded) {
  const candidates = BABY_STATES.filter((cls) => cls !== ACTION_LIBRARY[excluded]?.babyClass);
  return randomChoice(candidates) ?? "is-shrug";
}

function setupPhaseTracker() {
  phaseTracker.innerHTML = "";
  PHASES.forEach((phase) => {
    const item = document.createElement("li");
    item.dataset.phaseId = phase.id;
    item.textContent = `${phase.name} · ${phase.scenarios.length} cues`;
    phaseTracker.append(item);
  });
}

function updatePhaseTracker() {
  const { phaseIndex } = state;
  phaseTracker.querySelectorAll("li").forEach((item, index) => {
    item.dataset.current = String(index === phaseIndex);
    item.dataset.complete = String(index < phaseIndex);
  });

  if (phaseIndex >= state.deck.length) {
    return;
  }
  const phase = state.deck[phaseIndex];
  if (!phase) {
    return;
  }
  const remaining = Math.max(0, phase.scenarios.length - state.scenarioIndex);
  statusChannel(`${phase.name}: ${remaining} cue${remaining === 1 ? "" : "s"} left.`, "info");
}

function queueNextStep(callback) {
  window.setTimeout(() => {
    callback();
  }, 700);
}

function completeDay() {
  stopTimer();
  setBabyState(null);
  statusChannel("Day complete! Log the highlights below.", "success");
  logChannel.push(
    `Session complete · ${state.score.toLocaleString()} points · Longest combo ${state.longestCombo}`,
    "success",
  );
  showSummary();
  highScore.submit(state.score, {
    longestCombo: state.longestCombo,
    bestRisky: state.bestRisky,
  });
}

function showSummary() {
  summaryScoreEl.textContent = state.score.toLocaleString();
  summaryComboEl.textContent = state.longestCombo.toString();
  summaryRiskyEl.textContent = state.bestRisky.toLocaleString();
  summaryOverlay.hidden = false;
  state.summaryOpen = true;
}

function hideSummary() {
  summaryOverlay.hidden = true;
  state.summaryOpen = false;
}

function wireControls() {
  replayButton.addEventListener("click", () => {
    resetDay();
  });
  summaryReplay.addEventListener("click", () => {
    resetDay();
  });
  summaryClose.addEventListener("click", () => {
    hideSummary();
  });

  document.addEventListener("keydown", (event) => {
    if (state.summaryOpen) {
      return;
    }
    if (state.parentEvent && (event.key === "s" || event.key === "S")) {
      event.preventDefault();
      resolveParentMoment("safe");
      return;
    }
    if (state.parentEvent && (event.key === "r" || event.key === "R")) {
      event.preventDefault();
      resolveParentMoment("risky");
      return;
    }
    if (!state.parentEvent && state.awaitingChoice) {
      const number = Number.parseInt(event.key, 10);
      if (Number.isFinite(number) && number >= 1 && number <= 4) {
        const button = actionGrid.querySelector(`button[data-index="${number - 1}"]`);
        if (button) {
          event.preventDefault();
          const actionId = button.dataset.actionId;
          if (actionId) {
            chooseAction(actionId);
          }
        }
      }
    }
  });
}

function randomChoice(list) {
  if (!Array.isArray(list) || list.length === 0) {
    return null;
  }
  return list[Math.floor(Math.random() * list.length)];
}

function shuffle(list) {
  for (let index = list.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [list[index], list[swapIndex]] = [list[swapIndex], list[index]];
  }
  return list;
}
