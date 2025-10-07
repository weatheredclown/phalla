import { mountParticleField } from "../particles.js";
import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { autoEnhanceFeedback, createLogChannel, createStatusChannel } from "../feedback.js";
import { createWrapUpDialog } from "../wrap-up-dialog.js";

const particleSystem = mountParticleField({
  density: 0.00022,
  effects: {
    palette: ["#38bdf8", "#f472b6", "#facc15", "#fb923c", "#6366f1"],
    ambientDensity: 0.75,
  },
});

const audio = createAudioBoard();

const scoreConfig = getScoreConfig("frank-drebins-follies");
const highScore = initHighScoreBanner({
  gameId: "frank-drebins-follies",
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

const SCENARIOS = [
  {
    id: "press-room",
    label: "Press Room Sweep",
    intro: "City Hall wants the suspicious briefcase cleared before the mayor steps up.",
    steps: [
      {
        id: "briefcase-latch",
        title: "Inspect the suspicious briefcase",
        instruction: "Press X to pop the latches before the fanfare hits.",
        buttonLabel: "Open Briefcase",
        key: "x",
        baseWindow: 2800,
        success: {
          chaos: 140,
          rep: -8,
          status: "Glitter storm erupts across the press pool.",
          log: "Confetti charge ricochets into the teleprompter. Chaos +140.",
          highlight: "Confetti cannon blasted the teleprompter into the city fountain.",
          severity: "minor",
          tone: "success",
          fx: "sparkle",
          damage: 2800,
        },
        failure: {
          chaos: 280,
          rep: -16,
          status: "Briefcase buckles and catapults exhibits into the mayor's portrait.",
          log: "Latch slips&mdash;evidence crates topple the press riser. Chaos +280.",
          highlight: "Evidence crates crushed the mayoral portrait and two podiums.",
          severity: "major",
          tone: "danger",
          fx: "burst",
          damage: 6400,
        },
        intervention: {
          label: "Tap B to clamp the confetti cannon",
          key: "b",
          window: 1800,
          success: {
            chaos: 0,
            rep: 10,
            status: "Confetti cannon secured. Reputation steadies... for now.",
            log: "You clamp the rogue confetti launcher. No chaos gained, Rep +10.",
            tone: "info",
            fx: "sparkle",
            highlight: "Confetti cannon rerouted into the fountain filters.",
            severity: "minor",
            damage: 0,
          },
          failure: {
            chaos: 200,
            rep: -18,
            status: "Confetti cannon spirals into the chandelier!",
            log: "You ignore the clamp. Cannon shreds the chandelier. Chaos +200.",
            tone: "danger",
            fx: "burst",
            highlight: "Confetti cannon shredded the chandelier and drenched reporters.",
            severity: "major",
            damage: 5200,
          },
        },
      },
      {
        id: "banana-net",
        title: "Catch the falling banana",
        instruction: "Press A to prevent a comedy pratfall.",
        buttonLabel: "Catch Banana",
        key: "a",
        baseWindow: 2400,
        success: {
          chaos: 110,
          rep: -6,
          status: "Drebin slides under the press table, scattering cue cards.",
          log: "You snag the banana&mdash;and slide into the lighting rig. Chaos +110.",
          highlight: "Banana save knocked the lighting truss into slow rotation.",
          severity: "minor",
          tone: "success",
          fx: "sparkle",
          damage: 2200,
        },
        failure: {
          chaos: 260,
          rep: -18,
          status: "Banana peel wipes out the camera dolly and two violinists.",
          log: "Slip! Camera dolly tumbles through the press pool. Chaos +260.",
          highlight: "Camera dolly cannonballed through the press pool seats.",
          severity: "major",
          tone: "danger",
          fx: "burst",
          damage: 5800,
        },
        intervention: {
          label: "Tap Y to brace the lighting rig",
          key: "y",
          window: 1600,
          success: {
            chaos: 0,
            rep: 8,
            status: "Lighting rig steadied. The sergeant mutters 'nice save'.",
            log: "You brace the rig. Reputation +8, chaos paused.",
            tone: "info",
            fx: "sparkle",
            highlight: "Lighting rig stabilized before it crushed the podium.",
            severity: "minor",
            damage: 0,
          },
          failure: {
            chaos: 160,
            rep: -14,
            status: "Rig swings wide and clips the local news desk!",
            log: "Ignore the rig and it scythes the news desk. Chaos +160.",
            tone: "warning",
            fx: "burst",
            highlight: "Lighting rig scythed the regional news desk in half.",
            severity: "major",
            damage: 4300,
          },
        },
      },
      {
        id: "alarm-slap",
        title: "Silence the alarm",
        instruction: "Press Y before Drebin shoulder-checks the sprinkler control.",
        buttonLabel: "Hit Alarm",
        key: "y",
        baseWindow: 2100,
        success: {
          chaos: 160,
          rep: -10,
          status: "Alarm stops, but Drebin's spin launches the podium signage.",
          log: "You nail the alarm and yeet the podium banners. Chaos +160.",
          highlight: "Podium signage launched into the mayoral pep band.",
          severity: "minor",
          tone: "success",
          fx: "sparkle",
          damage: 3600,
        },
        failure: {
          chaos: 340,
          rep: -22,
          status: "Sprinklers flood the room while the podium topples onto the mayor.",
          log: "Too slow. Sprinklers and podium crash. Chaos +340.",
          highlight: "Sprinkler surge drowned the podium and shorted three amps.",
          severity: "major",
          tone: "danger",
          fx: "burst",
          damage: 7800,
        },
        intervention: {
          label: "Tap A to roll out the caution tarp",
          key: "a",
          window: 1500,
          success: {
            chaos: 0,
            rep: 12,
            status: "Caution tarp deployed. IA begrudgingly nods.",
            log: "You drop the tarp. Reputation +12.",
            tone: "success",
            fx: "sparkle",
            highlight: "Emergency tarp spared the stage electronics.",
            severity: "minor",
            damage: 0,
          },
          failure: {
            chaos: 220,
            rep: -20,
            status: "No tarp&mdash;the speaker stack crashes into the orchestra pit!",
            log: "Skip the tarp and the speaker stack wipes out the pit. Chaos +220.",
            tone: "danger",
            fx: "burst",
            highlight: "Speaker stack cannonballed into the orchestra pit.",
            severity: "major",
            damage: 6400,
          },
        },
      },
    ],
  },
  {
    id: "parade-prep",
    label: "Parade Precinct",
    intro: "Downtown parade rehearsal. Nothing could possibly go wrong...",
    steps: [
      {
        id: "ribbon-cut",
        title: "Snip the ceremonial ribbon",
        instruction: "Press A to cut cleanly before the crowd chants again.",
        buttonLabel: "Cut Ribbon",
        key: "a",
        baseWindow: 2300,
        success: {
          chaos: 170,
          rep: -8,
          status: "Ribbon whips free and slingshots the podium confetti.",
          log: "Clean cut&mdash;and the ribbon slings confetti into the crowd. Chaos +170.",
          highlight: "Ribbon snap slingshotted confetti into the police choir.",
          severity: "minor",
          tone: "success",
          fx: "sparkle",
          damage: 3200,
        },
        failure: {
          chaos: 320,
          rep: -18,
          status: "Ribbon tangles the mayor and demolishes the cake display.",
          log: "Botched cut. Cake display annihilated. Chaos +320.",
          highlight: "Five-tier dedication cake exploded across Main Street.",
          severity: "major",
          tone: "danger",
          fx: "burst",
          damage: 8200,
        },
        intervention: {
          label: "Tap X to steady the podium",
          key: "x",
          window: 1700,
          success: {
            chaos: 0,
            rep: 10,
            status: "Podium steady. Crowd almost thinks you're competent.",
            log: "You brace the podium. Reputation +10.",
            tone: "info",
            fx: "sparkle",
            highlight: "Podium braced before it toppled into the marching band.",
            severity: "minor",
            damage: 0,
          },
          failure: {
            chaos: 210,
            rep: -16,
            status: "Podium tips into the baton squad!",
            log: "You skip the brace&mdash;baton squad pancaked. Chaos +210.",
            tone: "warning",
            fx: "burst",
            highlight: "Podium collapse flattened the baton squad's riser.",
            severity: "major",
            damage: 5400,
          },
        },
      },
      {
        id: "float-halt",
        title: "Stop the runaway patriot float",
        instruction: "Press B before it mows down the marching band.",
        buttonLabel: "Grab Tow Cable",
        key: "b",
        baseWindow: 2000,
        success: {
          chaos: 190,
          rep: -10,
          status: "Float halts but its fireworks burst into the reviewing stand.",
          log: "Tow cable yanked&mdash;fireworks salvo arcs into the stands. Chaos +190.",
          highlight: "Fireworks ricocheted into the reviewing stand banners.",
          severity: "minor",
          tone: "success",
          fx: "sparkle",
          damage: 4400,
        },
        failure: {
          chaos: 360,
          rep: -20,
          status: "Float barrels through the hot dog carts and city seal arch.",
          log: "Missed it. Float obliterates the vendor row. Chaos +360.",
          highlight: "Runaway float shredded the city seal archway and hot dog row.",
          severity: "major",
          tone: "danger",
          fx: "burst",
          damage: 9200,
        },
        intervention: {
          label: "Tap Y to wave off the baton team",
          key: "y",
          window: 1500,
          success: {
            chaos: 0,
            rep: 12,
            status: "Baton team clears the lane in the nick of time.",
            log: "You wave the baton team away. Reputation +12.",
            tone: "success",
            fx: "sparkle",
            highlight: "Baton squad evacuated before the float skid zone.",
            severity: "minor",
            damage: 0,
          },
          failure: {
            chaos: 240,
            rep: -18,
            status: "Wave ignored. Costumed patriots go flying!",
            log: "Too cool for waving. Patriotic mascots take flight. Chaos +240.",
            tone: "danger",
            fx: "burst",
            highlight: "Patriotic mascots pinwheeled into the grandstand.",
            severity: "major",
            damage: 6600,
          },
        },
      },
      {
        id: "band-pivot",
        title: "Redirect the marching band",
        instruction: "Press X to spin them before they crash into the reviewing stand.",
        buttonLabel: "Spin Band",
        key: "x",
        baseWindow: 1900,
        success: {
          chaos: 210,
          rep: -12,
          status: "Band pirouettes into the fountain, launching tubas skyward.",
          log: "You whirl the band, tubas cannon skyward. Chaos +210.",
          highlight: "Tubas launched like mortar shells into the souvenir kiosks.",
          severity: "major",
          tone: "success",
          fx: "sparkle",
          damage: 5200,
        },
        failure: {
          chaos: 380,
          rep: -24,
          status: "Band collides with the mayor's limo and a fireworks truck.",
          log: "Missed cue. Limo plus fireworks equals boom. Chaos +380.",
          highlight: "Marching band accordion crashed into the mayor's limo.",
          severity: "major",
          tone: "danger",
          fx: "burst",
          damage: 10800,
        },
        intervention: {
          label: "Tap B to deploy traffic cones",
          key: "b",
          window: 1400,
          success: {
            chaos: 0,
            rep: 14,
            status: "Traffic cones buy you goodwill from the precinct captain.",
            log: "Cones deployed. Reputation +14.",
            tone: "success",
            fx: "sparkle",
            highlight: "Traffic cones carved a safe lane for the color guard.",
            severity: "minor",
            damage: 0,
          },
          failure: {
            chaos: 260,
            rep: -20,
            status: "No cones. Cymbals collide with the patrol bikes!",
            log: "Cone kit ignored. Patrol bikes domino. Chaos +260.",
            tone: "warning",
            fx: "burst",
            highlight: "Patrol bikes dominoed across the reviewing stand entry.",
            severity: "major",
            damage: 6800,
          },
        },
      },
    ],
  },
  {
    id: "stadium-ceremony",
    label: "Stadium Spectacle",
    intro: "Halftime honors at Memorial Stadium. Keep the chaos televised, not catastrophic.",
    steps: [
      {
        id: "mic-check",
        title: "Test the stadium microphone",
        instruction: "Press Y before feedback detonates the speakers.",
        buttonLabel: "Tap Mic",
        key: "y",
        baseWindow: 2100,
        success: {
          chaos: 190,
          rep: -10,
          status: "Mic screech shatters the fireworks cue panel.",
          log: "Feedback arcs into the pyrotechnics board. Chaos +190.",
          highlight: "Feedback blast fried the pyrotechnics cue board.",
          severity: "major",
          tone: "success",
          fx: "sparkle",
          damage: 5400,
        },
        failure: {
          chaos: 360,
          rep: -22,
          status: "Feedback melts the jumbotron controls and floods the tunnel.",
          log: "Too slow. Jumbotron sparks and sprinklers soak the tunnel. Chaos +360.",
          highlight: "Feedback meltdown drenched the team tunnel electronics.",
          severity: "major",
          tone: "danger",
          fx: "burst",
          damage: 11200,
        },
        intervention: {
          label: "Tap A to yank the power strip",
          key: "a",
          window: 1500,
          success: {
            chaos: 0,
            rep: 12,
            status: "Power strip yanked. PA tech salutes you in disbelief.",
            log: "You kill the power strip. Reputation +12.",
            tone: "info",
            fx: "sparkle",
            highlight: "Power strip yank saved the west bleacher amps.",
            severity: "minor",
            damage: 0,
          },
          failure: {
            chaos: 260,
            rep: -18,
            status: "No yank. Speakers rain foam across the cheerleaders.",
            log: "Leave it plugged in. Foam cannons douse the cheer line. Chaos +260.",
            tone: "warning",
            fx: "burst",
            highlight: "Speaker stack foam-cannoned the cheer line into the mascot tunnel.",
            severity: "major",
            damage: 7200,
          },
        },
      },
      {
        id: "t-shirt-cannon",
        title: "Redirect the T-shirt cannon",
        instruction: "Press X before it primes the governor's suite.",
        buttonLabel: "Recalibrate Cannon",
        key: "x",
        baseWindow: 1900,
        success: {
          chaos: 210,
          rep: -12,
          status: "Cannon spins, rocketing shirts into the marching drumline.",
          log: "Cannon swivels and buries the drumline. Chaos +210.",
          highlight: "T-shirt volley carpet-bombed the drumline risers.",
          severity: "major",
          tone: "success",
          fx: "sparkle",
          damage: 6200,
        },
        failure: {
          chaos: 380,
          rep: -24,
          status: "Cannon fires into the governor's glass suite. Shards everywhere.",
          log: "Missed the swivel. Suite glass explodes. Chaos +380.",
          highlight: "Governor's suite glass imploded under a hail of shirts.",
          severity: "major",
          tone: "danger",
          fx: "burst",
          damage: 12800,
        },
        intervention: {
          label: "Tap B to lower the bleacher banner",
          key: "b",
          window: 1400,
          success: {
            chaos: 0,
            rep: 14,
            status: "Bleacher banner drops, absorbing the stray shots.",
            log: "Banner drop saves the governor's suite. Reputation +14.",
            tone: "success",
            fx: "sparkle",
            highlight: "Bleacher banner caught the misfired T-shirts midair.",
            severity: "minor",
            damage: 0,
          },
          failure: {
            chaos: 280,
            rep: -20,
            status: "Banner stays up. Mascot gets launched into the nacho stand.",
            log: "Banner stays put. Mascot launched into nachos. Chaos +280.",
            tone: "danger",
            fx: "burst",
            highlight: "Mascot launch collapsed the nacho stand roof.",
            severity: "major",
            damage: 7600,
          },
        },
      },
      {
        id: "finale-flare",
        title: "Disarm the finale flare",
        instruction: "Press B before the fireworks finale ignites the mascot costume.",
        buttonLabel: "Disarm Flare",
        key: "b",
        baseWindow: 1700,
        success: {
          chaos: 240,
          rep: -14,
          status: "Flare reroutes into the blimp banner and rains glitter.",
          log: "Flare diverted into the blimp banner. Chaos +240.",
          highlight: "Rerouted flare stitched a glitter trail across the blimp banner.",
          severity: "major",
          tone: "success",
          fx: "sparkle",
          damage: 7600,
        },
        failure: {
          chaos: 420,
          rep: -26,
          status: "Flare ignites the mascot costume and the halftime scoreboard.",
          log: "Too late. Mascot plus scoreboard equals fireworks. Chaos +420.",
          highlight: "Mascot costume ignited the halftime scoreboard scaffold.",
          severity: "major",
          tone: "danger",
          fx: "burst",
          damage: 14400,
        },
        intervention: {
          label: "Tap X to trigger the safety foam",
          key: "x",
          window: 1300,
          success: {
            chaos: 0,
            rep: 16,
            status: "Safety foam blankets the stage. Refs applaud reluctantly.",
            log: "Foam engaged. Reputation +16.",
            tone: "success",
            fx: "sparkle",
            highlight: "Safety foam smothered the flare before it hit the scoreboard.",
            severity: "minor",
            damage: 0,
          },
          failure: {
            chaos: 300,
            rep: -22,
            status: "No foam. Fireworks blow through the marching band's exit tunnel.",
            log: "Skip the foam and fireworks torch the exit tunnel. Chaos +300.",
            tone: "danger",
            fx: "burst",
            highlight: "Fireworks torched the marching band's exit tunnel curtains.",
            severity: "major",
            damage: 8800,
          },
        },
      },
    ],
  },
];

const PROMPT_KEYS = new Set(["a", "b", "x", "y"]);
const START_REPUTATION = 100;
const MIN_WINDOW = 850;
const GRACE_BONUS = 420;

const TONE_ALIASES = {
  neutral: "neutral",
  info: "neutral",
  success: "success",
  positive: "success",
  victory: "success",
  warning: "warning",
  caution: "warning",
  alert: "warning",
  danger: "danger",
  failure: "danger",
  negative: "danger",
};

const chaosScoreEl = document.getElementById("chaos-score");
const reputationTile = document.getElementById("reputation-tile");
const reputationFill = document.getElementById("reputation-fill");
const reputationValue = document.getElementById("reputation-value");
const vignetteLabel = document.getElementById("vignette-label");
const statusBar = document.getElementById("status-bar");
const promptCard = document.getElementById("prompt-card");
const promptTitle = document.getElementById("prompt-title");
const promptInstruction = document.getElementById("prompt-instruction");
const promptButton = document.getElementById("prompt-button");
const promptKey = document.getElementById("prompt-key");
const promptAction = document.getElementById("prompt-action");
const promptTimerEl = document.getElementById("prompt-timer");
const interventionCallout = document.getElementById("intervention-callout");
const interventionLabel = document.getElementById("intervention-label");
const interventionKey = document.getElementById("intervention-key");
const interventionTimerEl = document.getElementById("intervention-timer");
const eventLogList = document.getElementById("event-log");
const startButton = document.getElementById("start-run");
const resetButton = document.getElementById("reset-run");
const wrapUp = document.getElementById("wrap-up");
const wrapUpSummary = document.getElementById("wrap-up-summary");
const wrapUpChaos = document.getElementById("wrap-up-chaos");
const wrapUpDamage = document.getElementById("wrap-up-damage");
const wrapUpHighlights = document.getElementById("wrap-up-highlights");
const highlightList = document.getElementById("highlight-list");
const replayButton = document.getElementById("replay-button");
const closeWrapUp = document.getElementById("close-wrap-up");

const wrapUpDialog = createWrapUpDialog(wrapUp);

const log = createLogChannel(eventLogList, { limit: 16 });
const setStatus = createStatusChannel(statusBar, {
  onTone: handleStatusTone,
});

autoEnhanceFeedback();

let runActive = false;
let chaosRating = 0;
let reputation = START_REPUTATION;
let scenarioIndex = 0;
let stepIndex = 0;
let difficultyTier = 0;
let activeStep = null;
let promptDeadline = 0;
let promptTimerId = null;
let pendingTimeout = null;
let highlightReel = [];
let propertyDamage = 0;
let graceTime = 0;
let pendingIntervention = null;
let interventionTimerId = null;
let wrapUpReason = "";
let lastReputationTone = "success";
function normalizeTone(tone = "neutral") {
  const key = String(tone).toLowerCase();
  return TONE_ALIASES[key] ?? "neutral";
}

function pulseElement(element, className) {
  if (!element || !className) {
    return;
  }
  element.classList.remove(className);
  // eslint-disable-next-line no-unused-expressions
  element.offsetWidth;
  element.classList.add(className);
}

function handleStatusTone(tone) {
  const normalized = normalizeTone(tone);
  const tile = statusBar.closest(".status-tile");
  if (tile) {
    tile.dataset.tone = normalized;
    pulseElement(tile, "status-flare");
  }
  audio.playStatus(normalized);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatCurrency(value) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}


function updateChaosDisplay() {
  chaosScoreEl.textContent = chaosRating.toLocaleString();
}

function updateReputationDisplay() {
  const percent = clamp(reputation, 0, 100);
  reputationValue.textContent = `${percent.toFixed(0)}%`;
  reputationFill.style.width = `${percent}%`;
  const meter = reputationTile.querySelector(".reputation-meter");
  if (!meter) {
    return;
  }
  meter.classList.toggle("is-danger", percent <= 20);
  meter.classList.toggle("is-shrug", graceTime > 0);
  const tone = percent <= 20 ? "danger" : percent >= 70 ? "success" : "neutral";
  meter.dataset.tone = tone;
  reputationTile.dataset.tone = tone;
  if (tone !== lastReputationTone) {
    lastReputationTone = tone;
    audio.playMeterTone(tone);
  }
  meter.classList.remove("reputation-pulse");
  // eslint-disable-next-line no-unused-expressions
  meter.offsetWidth;
  meter.classList.add("reputation-pulse");
}

function resetPromptDisplay() {
  activeStep = null;
  promptTitle.textContent = "No prompt yet.";
  promptInstruction.textContent = "Stay frosty, detective.";
  promptKey.textContent = "—";
  promptAction.textContent = "Waiting";
  promptButton.disabled = true;
  promptButton.dataset.expectedKey = "";
  promptTimerEl.style.setProperty("--time-progress", "0");
  promptCard.dataset.fxTone = "neutral";
  promptCard.classList.remove("fx-burst", "fx-sparkle", "is-armed");
  promptButton.classList.remove("is-primed");
}

function hideIntervention() {
  if (interventionTimerId) {
    cancelAnimationFrame(interventionTimerId);
    interventionTimerId = null;
  }
  pendingIntervention = null;
  interventionCallout.hidden = true;
  interventionTimerEl.style.setProperty("--intervention-progress", "0");
}

function scheduleNextStep(delay = 520) {
  if (pendingTimeout) {
    window.clearTimeout(pendingTimeout);
  }
  pendingTimeout = window.setTimeout(() => {
    pendingTimeout = null;
    advanceStep();
  }, delay);
}

function stopPromptTimer() {
  if (promptTimerId) {
    cancelAnimationFrame(promptTimerId);
    promptTimerId = null;
  }
}

function setPrompt(step) {
  activeStep = step;
  const difficultyOffset = difficultyTier * 160;
  const windowMs = clamp((step.baseWindow || 2000) + graceTime - difficultyOffset, MIN_WINDOW, 3600);
  graceTime = 0;
  updateReputationDisplay();
  promptDeadline = performance.now() + windowMs;
  promptTitle.textContent = step.title;
  promptInstruction.textContent = step.instruction;
  promptKey.textContent = step.key.toUpperCase();
  promptAction.textContent = step.buttonLabel ?? "React";
  promptButton.disabled = false;
  promptButton.dataset.expectedKey = step.key;
  promptTimerEl.style.setProperty("--time-progress", "1");
  promptCard.classList.add("is-armed");
  promptButton.classList.add("is-primed");
  promptCard.dataset.fxTone = "neutral";
  audio.playPromptReady();

  const tick = () => {
    if (!activeStep) {
      promptTimerEl.style.setProperty("--time-progress", "0");
      promptTimerId = null;
      return;
    }
    const now = performance.now();
    const remaining = promptDeadline - now;
    if (remaining <= 0) {
      promptTimerEl.style.setProperty("--time-progress", "0");
      promptTimerId = null;
      resolveStep(false, "timeout");
      return;
    }
    const progress = clamp(remaining / windowMs, 0, 1);
    promptTimerEl.style.setProperty("--time-progress", progress.toString());
    promptTimerId = requestAnimationFrame(tick);
  };

  stopPromptTimer();
  promptTimerId = requestAnimationFrame(tick);
}

function pushHighlight(text, severity = "minor") {
  highlightReel.push({ text, severity });
}

function flashPrompt(effect, tone) {
  const normalizedTone = normalizeTone(tone);
  promptCard.dataset.fxTone = normalizedTone;
  if (effect === "burst") {
    pulseElement(promptCard, "fx-burst");
  } else if (effect === "sparkle") {
    pulseElement(promptCard, "fx-sparkle");
  }
}

function fireFX(outcome) {
  if (!outcome) {
    return;
  }
  const normalizedTone = normalizeTone(outcome.tone);
  const severity = outcome.severity === "major" ? "major" : "minor";
  if (outcome.fx === "burst") {
    particleSystem.emitBurst(severity === "major" ? 1.35 : 1.1);
    flashPrompt("burst", normalizedTone);
  } else if (outcome.fx === "sparkle") {
    particleSystem.emitSparkle(severity === "major" ? 1.25 : 1.05);
    flashPrompt("sparkle", normalizedTone);
  }
  if (outcome.fx) {
    audio.playFx(outcome.fx, { tone: normalizedTone, severity });
  }
}

function applyOutcome(outcome, sourceStep) {
  if (!outcome) {
    return;
  }
  chaosRating += Math.max(0, outcome.chaos ?? 0);
  propertyDamage += Math.max(0, outcome.damage ?? 0);
  const repDelta = outcome.rep ?? 0;
  reputation = clamp(reputation + repDelta, 0, 100);
  updateChaosDisplay();
  updateReputationDisplay();
  if ((outcome.chaos ?? 0) !== 0) {
    pulseElement(chaosScoreEl, "score-pop");
  }
  if (repDelta !== 0) {
    pulseElement(reputationTile, "status-flare");
  }

  if (outcome.log) {
    log.push(outcome.log.replace(/&mdash;/g, "—"), outcome.tone ?? "info");
  }
  if (outcome.status) {
    setStatus(outcome.status, outcome.tone ?? "info");
  }
  if (outcome.highlight) {
    pushHighlight(outcome.highlight, outcome.severity);
  }
  fireFX(outcome);

  if (reputation <= 0) {
    wrapUpReason = "Internal Affairs revoked your badge after catastrophic Reputation loss.";
    endRun();
  }
}

function triggerIntervention(intervention) {
  if (!intervention) {
    return;
  }
  pendingIntervention = {
    ...intervention,
    deadline: performance.now() + intervention.window,
  };
  interventionCallout.hidden = false;
  interventionLabel.textContent = intervention.label;
  interventionKey.textContent = `Press ${intervention.key.toUpperCase()}`;
  interventionTimerEl.style.setProperty("--intervention-progress", "1");
  audio.playInterventionCue();

  const tick = () => {
    if (!pendingIntervention) {
      interventionTimerEl.style.setProperty("--intervention-progress", "0");
      interventionTimerId = null;
      return;
    }
    const now = performance.now();
    const remaining = pendingIntervention.deadline - now;
    if (remaining <= 0) {
      interventionTimerEl.style.setProperty("--intervention-progress", "0");
      interventionTimerId = null;
      resolveIntervention(false);
      return;
    }
    const progress = clamp(remaining / intervention.window, 0, 1);
    interventionTimerEl.style.setProperty("--intervention-progress", progress.toString());
    interventionTimerId = requestAnimationFrame(tick);
  };

  if (interventionTimerId) {
    cancelAnimationFrame(interventionTimerId);
  }
  interventionTimerId = requestAnimationFrame(tick);
}

function resolveStep(success, reason = "input") {
  if (!activeStep) {
    return;
  }
  stopPromptTimer();
  const step = activeStep;
  activeStep = null;
  promptButton.disabled = true;
  promptButton.classList.remove("is-primed");
  promptCard.classList.remove("is-armed");
  const outcome = success ? step.success : step.failure;
  applyOutcome(outcome, step);

  if (reputation <= 0) {
    return;
  }

  if (step.intervention) {
    triggerIntervention(step.intervention);
  } else {
    scheduleNextStep(640);
  }
}

function resolveIntervention(success) {
  if (!pendingIntervention) {
    return;
  }
  const intervention = pendingIntervention;
  hideIntervention();
  const outcome = success ? intervention.success : intervention.failure;
  audio.playInterventionOutcome(success);
  applyOutcome(outcome);
  if (reputation <= 0) {
    return;
  }
  scheduleNextStep(success ? 520 : 760);
}

function advanceScenario() {
  if (!runActive) {
    return;
  }
  const scenario = SCENARIOS[scenarioIndex % SCENARIOS.length];
  vignetteLabel.textContent = scenario.label;
  setStatus(scenario.intro, "info");
  stepIndex = 0;
  scheduleNextStep(620);
}

function advanceStep() {
  hideIntervention();
  stopPromptTimer();
  if (!runActive) {
    return;
  }
  const scenario = SCENARIOS[scenarioIndex % SCENARIOS.length];
  if (stepIndex >= scenario.steps.length) {
    difficultyTier += 1;
    if (reputation > 40) {
      graceTime = GRACE_BONUS;
      log.push("Departmental Shrug acquired. Next prompt slows down.", "success");
      particleSystem.emitSparkle(1.4);
      updateReputationDisplay();
    }
    scenarioIndex += 1;
    advanceScenario();
    return;
  }
  const nextStep = scenario.steps[stepIndex];
  stepIndex += 1;
  setPrompt(nextStep);
}

function startRun() {
  if (runActive) {
    return;
  }
  audio.unlock().then(() => {
    audio.playShiftStart();
  });
  runActive = true;
  wrapUpDialog.close({ restoreFocus: false });
  chaosRating = 0;
  reputation = START_REPUTATION;
  scenarioIndex = 0;
  stepIndex = 0;
  difficultyTier = 0;
  highlightReel = [];
  propertyDamage = 0;
  graceTime = 0;
  wrapUpReason = "";
  lastReputationTone = "success";
  updateChaosDisplay();
  updateReputationDisplay();
  log.push("Desk sergeant growls: 'Try not to level the city this time.'", "info");
  advanceScenario();
}

function resetRun(options = {}) {
  const { silent = false } = options;
  runActive = false;
  wrapUpDialog.close({ restoreFocus: false });
  hideIntervention();
  stopPromptTimer();
  if (pendingTimeout) {
    window.clearTimeout(pendingTimeout);
    pendingTimeout = null;
  }
  resetPromptDisplay();
  vignetteLabel.textContent = "Awaiting Orders";
  setStatus("Press Start Shift to begin.", "neutral");
  chaosRating = 0;
  reputation = START_REPUTATION;
  highlightReel = [];
  propertyDamage = 0;
  graceTime = 0;
  difficultyTier = 0;
  wrapUpReason = "";
  lastReputationTone = "success";
  updateChaosDisplay();
  updateReputationDisplay();
  if (!silent) {
    audio.playReset();
  }
}

function endRun() {
  runActive = false;
  hideIntervention();
  stopPromptTimer();
  if (pendingTimeout) {
    window.clearTimeout(pendingTimeout);
    pendingTimeout = null;
  }
  promptButton.disabled = true;
  wrapUpChaos.textContent = chaosRating.toLocaleString();
  wrapUpDamage.textContent = formatCurrency(propertyDamage);
  wrapUpHighlights.textContent = highlightReel.length.toString();
  wrapUpSummary.textContent = wrapUpReason || "Shift concluded before the city crumbled.";
  highlightList.textContent = "";
  if (highlightReel.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "No highlights recorded. Were you even here, Drebin?";
    highlightList.append(empty);
  } else {
    highlightReel.slice(-6).forEach((item) => {
      const entry = document.createElement("li");
      entry.textContent = item.text;
      if (item.severity) {
        entry.dataset.severity = item.severity;
      }
      highlightList.append(entry);
    });
  }
  wrapUpDialog.open({ focus: replayButton });
  audio.playWrapUp(reputation > 0);
  highScore.submit(chaosRating, {
    highlights: highlightReel.length,
    propertyDamage,
    difficultyTier,
  });
}

function handlePromptButton() {
  if (!activeStep || promptButton.disabled) {
    return;
  }
  resolveStep(true, "click");
}

function handleKeydown(event) {
  if (event.defaultPrevented) {
    return;
  }
  if (wrapUpDialog.isOpen()) {
    if (event.key === "Escape") {
      event.preventDefault();
      wrapUpDialog.close();
    }
    return;
  }
  const key = event.key.toLowerCase();
  if (key === "enter" && !runActive) {
    event.preventDefault();
    startRun();
    return;
  }
  if (key === "r") {
    event.preventDefault();
    resetRun();
    return;
  }
  if (!PROMPT_KEYS.has(key)) {
    if (pendingIntervention && key === pendingIntervention.key) {
      event.preventDefault();
      resolveIntervention(true);
    }
    return;
  }

  if (pendingIntervention && key === pendingIntervention.key) {
    event.preventDefault();
    resolveIntervention(true);
    return;
  }

  if (!activeStep) {
    return;
  }
  event.preventDefault();
  if (key === activeStep.key) {
    resolveStep(true);
  } else {
    resolveStep(false, "wrong-key");
  }
}

function createAudioBoard() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const context = AudioContextClass ? new AudioContextClass() : null;
  let unlocked = false;

  function canPlay() {
    return Boolean(context) && unlocked && context.state === "running";
  }

  function unlock() {
    if (!context) {
      return Promise.resolve();
    }
    if (context.state === "running") {
      unlocked = true;
      return Promise.resolve();
    }
    if (unlocked) {
      return Promise.resolve();
    }
    return context.resume()
      .catch(() => {})
      .then(() => {
        if (context.state === "running") {
          unlocked = true;
        }
      });
  }

  function playTone({ frequency, duration = 0.24, type = "sine", gain = 0.12, start = 0 }) {
    if (!canPlay()) {
      return;
    }
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    const startTime = context.currentTime + start;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    gainNode.gain.setValueAtTime(0.0001, startTime);
    const attackTime = Math.min(0.04, duration * 0.35);
    gainNode.gain.linearRampToValueAtTime(gain, startTime + attackTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    oscillator.connect(gainNode).connect(context.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.2);
  }

  function playNoise(duration = 0.32, gain = 0.16, start = 0) {
    if (!canPlay()) {
      return;
    }
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) {
      data[index] = Math.random() * 2 - 1;
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    const gainNode = context.createGain();
    const startTime = context.currentTime + start;
    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    source.connect(gainNode).connect(context.destination);
    source.start(startTime);
    source.stop(startTime + duration + 0.2);
  }

  function playFx(type, { tone = "neutral", severity = "minor" } = {}) {
    if (!canPlay()) {
      return;
    }
    const normalizedTone = normalizeTone(tone);
    const strength = severity === "major" ? 1.3 : 1;
    if (type === "burst") {
      const base = normalizedTone === "danger" ? 210 : normalizedTone === "warning" ? 320 : 360;
      playTone({ frequency: base, duration: 0.26 * strength, type: "sawtooth", gain: 0.14 * strength });
      playNoise(0.32 * strength, 0.18 * strength);
    } else if (type === "sparkle") {
      const base = normalizedTone === "success" ? 780 : 660;
      playTone({ frequency: base, duration: 0.18 * strength, type: "triangle", gain: 0.1 * strength });
      playTone({ frequency: base * 1.32, duration: 0.22 * strength, type: "sine", gain: 0.08 * strength, start: 0.05 });
    }
  }

  function playStatus(tone = "neutral") {
    if (!canPlay()) {
      return;
    }
    const normalized = normalizeTone(tone);
    if (normalized === "success") {
      playTone({ frequency: 680, duration: 0.28, type: "triangle", gain: 0.1 });
      playTone({ frequency: 920, duration: 0.2, type: "sine", gain: 0.07, start: 0.12 });
    } else if (normalized === "warning") {
      playTone({ frequency: 460, duration: 0.34, type: "square", gain: 0.11 });
    } else if (normalized === "danger") {
      playTone({ frequency: 260, duration: 0.36, type: "sawtooth", gain: 0.14 });
      playNoise(0.3, 0.16, 0.04);
    } else {
      playTone({ frequency: 520, duration: 0.2, type: "sine", gain: 0.07 });
    }
  }

  function playMeterTone(tone = "neutral") {
    if (!canPlay()) {
      return;
    }
    const normalized = normalizeTone(tone);
    if (normalized === "danger") {
      playTone({ frequency: 220, duration: 0.28, type: "square", gain: 0.13 });
      playNoise(0.24, 0.14, 0.02);
    } else if (normalized === "success") {
      playTone({ frequency: 760, duration: 0.22, type: "triangle", gain: 0.09 });
    } else {
      playTone({ frequency: 540, duration: 0.18, type: "sine", gain: 0.07 });
    }
  }

  function playInterventionCue() {
    if (!canPlay()) {
      return;
    }
    playTone({ frequency: 860, duration: 0.12, type: "triangle", gain: 0.1 });
    playTone({ frequency: 980, duration: 0.1, type: "sine", gain: 0.08, start: 0.08 });
  }

  function playInterventionOutcome(success) {
    if (!canPlay()) {
      return;
    }
    if (success) {
      playTone({ frequency: 720, duration: 0.22, type: "triangle", gain: 0.1 });
      playTone({ frequency: 960, duration: 0.18, type: "sine", gain: 0.08, start: 0.1 });
    } else {
      playTone({ frequency: 240, duration: 0.32, type: "sawtooth", gain: 0.14 });
      playNoise(0.26, 0.14, 0.04);
    }
  }

  function playShiftStart() {
    if (!canPlay()) {
      return;
    }
    playTone({ frequency: 420, duration: 0.26, type: "triangle", gain: 0.1 });
    playTone({ frequency: 640, duration: 0.24, type: "sine", gain: 0.08, start: 0.14 });
  }

  function playReset() {
    if (!canPlay()) {
      return;
    }
    playTone({ frequency: 360, duration: 0.22, type: "sine", gain: 0.08 });
    playTone({ frequency: 260, duration: 0.2, type: "triangle", gain: 0.07, start: 0.12 });
  }

  function playPromptReady() {
    if (!canPlay()) {
      return;
    }
    playTone({ frequency: 840, duration: 0.12, type: "triangle", gain: 0.09 });
  }

  function playWrapUp(survived) {
    if (!canPlay()) {
      return;
    }
    if (survived) {
      playTone({ frequency: 700, duration: 0.28, type: "triangle", gain: 0.09 });
      playTone({ frequency: 940, duration: 0.24, type: "sine", gain: 0.08, start: 0.14 });
    } else {
      playTone({ frequency: 240, duration: 0.34, type: "sawtooth", gain: 0.13 });
      playNoise(0.28, 0.15, 0.05);
    }
  }

  return {
    unlock,
    playFx,
    playStatus,
    playMeterTone,
    playInterventionCue,
    playInterventionOutcome,
    playShiftStart,
    playReset,
    playPromptReady,
    playWrapUp,
  };
}

startButton.addEventListener("click", () => {
  if (!runActive) {
    startRun();
  }
});

resetButton.addEventListener("click", () => {
  resetRun();
});

promptButton.addEventListener("click", handlePromptButton);
replayButton.addEventListener("click", () => {
  wrapUpDialog.close({ restoreFocus: false });
  resetRun();
  startRun();
});
closeWrapUp.addEventListener("click", () => {
  wrapUpDialog.close();
});

document.addEventListener("keydown", handleKeydown);

resetRun({ silent: true });
