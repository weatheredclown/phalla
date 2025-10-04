import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { mountParticleField } from "../particles.js";
import { autoEnhanceFeedback } from "../feedback.js";

const particleField = mountParticleField({
  effects: {
    palette: ["#f87171", "#fbbf24", "#38bdf8", "#a855f7"],
    ambientDensity: 0.22,
  },
});

autoEnhanceFeedback();

const scoreConfig = getScoreConfig("freddys-dream-maze");
const highScore = initHighScoreBanner({
  gameId: "freddys-dream-maze",
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

const REQUIRED_SIGILS = 4;
const BASE_SANITY_DRAIN_PER_SECOND = 3.6;
const MANIFESTATION_BASE_CHANCE = 0.18;
const FREDDY_BASE_CHANCE = 0.12;
const CONFRONTATION_TIMEOUT = 12000;
const GLYPHS = ["☾", "✶", "✕", "✥", "✴", "✦"];
const flashTimers = new WeakMap();

const ENVIRONMENT_BANK = [
  {
    title: "Childhood Bedroom (Breathing)",
    detail:
      "Stuffed animals hang from invisible threads while the wallpaper exhales a damp breeze toward the vent.",
    overlay:
      "linear-gradient(120deg, rgba(248, 113, 113, 0.3), rgba(56, 189, 248, 0.1), rgba(12, 11, 26, 0.9))",
  },
  {
    title: "Boiler Hallway",
    detail:
      "Lockers jut from the ceiling, each clanging in rhythm with a distant boiler. Steam hisses every time you blink.",
    overlay:
      "linear-gradient(150deg, rgba(239, 68, 68, 0.32), rgba(79, 70, 229, 0.18), rgba(15, 23, 42, 0.95))",
  },
  {
    title: "Flooded Classroom",
    detail:
      "Desk legs stretch like taffy while inky water ripples with whispers of tomorrow's test you never studied for.",
    overlay:
      "linear-gradient(130deg, rgba(14, 165, 233, 0.35), rgba(110, 231, 183, 0.15), rgba(12, 10, 30, 0.92))",
  },
  {
    title: "Hospital Corridor (Empty)",
    detail:
      "Monitors beep from unplugged sockets and gurneys scrape the floor even while they stand perfectly still.",
    overlay:
      "linear-gradient(160deg, rgba(252, 165, 165, 0.28), rgba(59, 130, 246, 0.2), rgba(9, 9, 20, 0.92))",
  },
  {
    title: "Funhouse Basement",
    detail:
      "Candy-colored lights pulse over rusted swings. Every mirrored surface reflects a different age of you.",
    overlay:
      "linear-gradient(140deg, rgba(217, 119, 6, 0.28), rgba(163, 163, 255, 0.18), rgba(12, 9, 32, 0.92))",
  },
];

const MANIFESTATIONS = [
  {
    id: "arachnid",
    title: "Silken Maw",
    subtitle: "The ceiling unspools into a throbbing web, every strand tipped with baby teeth.",
    description: "You hear the skitter of legs you remember from childhood terrariums.",
    warning: "Confront the pattern to reclaim 25 sanity. Failure costs 20 immediately.",
    confrontBonus: 25,
    confrontPenalty: 20,
    evadeDrain: 8,
    lingerDrain: 0.35,
    theme: "arachnid",
  },
  {
    id: "claustrophobia",
    title: "Narrowing Walls",
    subtitle: "Lockers slam shut around you, breathing in until your ribs creak.",
    description: "Every inhale feels rationed. The exit shrinks to a knifed slit of light.",
    warning: "Solve the sigil to shove the walls back for a 22 sanity surge. Failure crushes 18 sanity instantly.",
    confrontBonus: 22,
    confrontPenalty: 18,
    evadeDrain: 7,
    lingerDrain: 0.28,
    theme: "claustrophobic",
  },
  {
    id: "drowning",
    title: "Flooded Nursery",
    subtitle: "Cribs fill with dark water that reflects Freddy's grin instead of the moon.",
    description: "Every step you take sends ripples that chant lullabies backward.",
    warning: "Trace the glow to purge 28 sanity back into the meter. Misstep and lose 24.",
    confrontBonus: 28,
    confrontPenalty: 24,
    evadeDrain: 10,
    lingerDrain: 0.4,
    theme: "drowning",
  },
  {
    id: "silence",
    title: "Suffocating Library",
    subtitle: "Books inhale whispers while the card catalog files your heartbeat.",
    description: "Pages turn themselves, reading your worst secret aloud.",
    warning: "Match the hush glyphs to steady 20 sanity. A fumbled chant bleeds 16 sanity.",
    confrontBonus: 20,
    confrontPenalty: 16,
    evadeDrain: 6,
    lingerDrain: 0.22,
    theme: "silence",
  },
];

const OPTION_FACTORIES = [
  createHallwayOption,
  createMemoryOption,
  createSafeRoomOption,
  createSigilOption,
  createEchoOption,
];

const state = {
  active: false,
  sanity: 100,
  sigils: 0,
  confronted: 0,
  safeZones: 0,
  steps: 0,
  routeInstability: 0,
  slowDrain: 0,
  slowDrainDecayTimers: [],
  threat: 0,
  manifestation: null,
  confrontation: null,
  chase: null,
  awaitingExit: false,
  currentOptions: [],
  ticker: null,
  runStart: 0,
  lastTick: 0,
  elapsedMs: 0,
  audio: null,
  fearState: "lucid",
  lastSigils: 0,
  lastConfronted: 0,
  lastSafeZones: 0,
};

const startButton = document.getElementById("start-dream");
const resetButton = document.getElementById("reset-dream");
const toggleAudioButton = document.getElementById("toggle-audio");
const statusElement = document.getElementById("simulator-status");
const sanityValue = document.getElementById("sanity-value");
const sanityMeter = document.getElementById("sanity-meter");
const sanityFill = document.getElementById("sanity-fill");
const fearStateLabel = document.getElementById("fear-state");
const fearNote = document.getElementById("fear-note");
const sigilCount = document.getElementById("sigil-count");
const confrontCount = document.getElementById("confront-count");
const confrontNote = document.getElementById("confront-note");
const safeCount = document.getElementById("safe-count");
const environmentTitle = document.getElementById("environment-title");
const environmentShift = document.getElementById("environment-shift");
const environmentDetail = document.getElementById("environment-detail");
const environmentOverlay = document.getElementById("environment-overlay");
const environmentGrid = document.getElementById("environment-grid");
const environmentVisual = document.querySelector(".environment-visual");
const decisionTitle = document.getElementById("decision-title");
const decisionOptions = document.getElementById("decision-options");
const dreamLog = document.getElementById("dream-log");
const clearLogButton = document.getElementById("clear-log");
const wrapup = document.getElementById("wrapup");
const wrapupSanity = document.getElementById("wrapup-sanity");
const wrapupFears = document.getElementById("wrapup-fears");
const wrapupSafes = document.getElementById("wrapup-safes");
const wrapupTime = document.getElementById("wrapup-time");
const wrapupReplay = document.getElementById("wrapup-replay");
const wrapupClose = document.getElementById("wrapup-close");
const wrapupCard = wrapup.querySelector(".wrapup-card");
const manifestationOverlay = document.getElementById("manifestation");
const manifestationTitle = document.getElementById("manifestation-title");
const manifestationSubtitle = document.getElementById("manifestation-subtitle");
const manifestationDescription = document.getElementById("manifestation-description");
const manifestationWarning = document.getElementById("manifestation-warning");
const manifestationConfront = document.getElementById("manifestation-confront");
const manifestationEvade = document.getElementById("manifestation-evade");
const confrontationPanel = document.getElementById("confrontation");
const confrontationSequence = document.getElementById("confrontation-sequence");
const confrontationGrid = document.getElementById("confrontation-grid");
const confrontationTimer = document.getElementById("confrontation-timer");
const chaseOverlay = document.getElementById("chase-overlay");
const chaseFill = document.getElementById("chase-fill");
const chaseNote = document.getElementById("chase-note");
const chaseResist = document.getElementById("chase-resist");

function flashElement(element, className, duration = 600) {
  if (!element) {
    return;
  }
  const timers = flashTimers.get(element) ?? new Map();
  const existing = timers.get(className);
  if (existing) {
    window.clearTimeout(existing);
  }
  element.classList.remove(className);
  void element.getBoundingClientRect();
  element.classList.add(className);
  const timeout = window.setTimeout(() => {
    element.classList.remove(className);
    timers.delete(className);
    if (timers.size === 0) {
      flashTimers.delete(element);
    }
  }, duration);
  timers.set(className, timeout);
  flashTimers.set(element, timers);
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function logEvent(message, tone = "neutral") {
  if (!message) {
    return;
  }
  const item = document.createElement("li");
  item.textContent = message;
  if (tone === "warning") {
    item.classList.add("is-warning");
  } else if (tone === "danger") {
    item.classList.add("is-danger");
  }
  dreamLog.prepend(item);
  while (dreamLog.children.length > 10) {
    dreamLog.removeChild(dreamLog.lastElementChild);
  }
}

function updateSanity(delta, options = {}) {
  const previous = state.sanity;
  state.sanity = clamp(state.sanity + delta, 0, 100);
  if (options.log && delta !== 0) {
    const tone = delta > 0 ? "success" : delta < -9 ? "danger" : delta < 0 ? "warning" : "neutral";
    const formatted = delta > 0 ? `+${Math.round(delta)}` : `${Math.round(delta)}`;
    logEvent(`${options.log} (${formatted} sanity)`, tone);
    const magnitude = Math.abs(delta);
    if (delta > 0) {
      flashElement(sanityFill, "is-heal", 900);
      if (!options.silentFx) {
        playSfx(magnitude >= 12 ? "safe" : "heal");
      }
    } else if (delta < 0) {
      const className = magnitude >= 12 ? "is-crash" : "is-hit";
      flashElement(sanityFill, className, magnitude >= 12 ? 1100 : 850);
      if (!options.silentFx) {
        playSfx(magnitude >= 12 ? "crash" : "sting");
      }
    }
  }
  if (previous !== state.sanity) {
    renderSanity();
  }
  if (state.sanity <= 0 && state.active) {
    endRun(false, "sanity");
  }
}

function renderSanity() {
  const value = Math.round(state.sanity);
  sanityValue.textContent = `${value}%`;
  sanityMeter.setAttribute("aria-valuenow", String(value));
  sanityFill.style.width = `${value}%`;
  const warning = value <= 25;
  sanityMeter.dataset.warning = warning ? "true" : "false";

  let fearState = "lucid";
  let note = "Walls still remember their shape.";
  if (value <= 65 && value > 34) {
    fearState = "distorted";
    note = "Doors shift between rooms when you blink.";
  } else if (value <= 34) {
    fearState = "collapsing";
    note = "Freddy is inside the drywall, scraping nearer.";
  }
  document.body.dataset.fearState = fearState;
  const fearLabel =
    fearState === "lucid" ? "Lucid Drift" : fearState === "distorted" ? "Warped Focus" : "Fracture Threshold";
  fearStateLabel.textContent = fearLabel;
  fearNote.textContent = note;
  if (state.fearState !== fearState) {
    flashElement(document.body, "is-fear-shift", 1000);
    flashElement(fearStateLabel, "is-flash", 900);
    flashElement(fearNote, "is-flash", 900);
    state.fearState = fearState;
  }
}

function resetEnvironment() {
  const zone = pick(ENVIRONMENT_BANK);
  environmentTitle.textContent = zone.title;
  environmentDetail.textContent = zone.detail;
  environmentShift.textContent =
    state.routeInstability > 2
      ? "Ceiling seams crawl sideways, opening new corridors you do not remember."
      : "The wallpaper peels backward, revealing a corridor that was never there.";
  environmentOverlay.style.background = zone.overlay;
  flashElement(environmentOverlay, "is-pulse", 1000);
  if (environmentVisual) {
    flashElement(environmentVisual, "is-glow", 1000);
  }
  renderEnvironmentGrid();
}

function renderEnvironmentGrid(theme = "neutral") {
  environmentGrid.innerHTML = "";
  const frag = document.createDocumentFragment();
  for (let index = 0; index < 36; index += 1) {
    const tile = document.createElement("span");
    tile.classList.add("tile");
    const roll = Math.random();
    if (theme === "safe" && roll < 0.2) {
      tile.classList.add("is-safe");
    } else if (theme === "threat" && roll < 0.35) {
      tile.classList.add("is-threat");
    } else if (roll < 0.18) {
      tile.classList.add("is-active");
    }
    frag.appendChild(tile);
  }
  environmentGrid.appendChild(frag);
  flashElement(environmentGrid, "is-reshuffle", 900);
}

function renderHud() {
  renderSanity();
  sigilCount.textContent = `${state.sigils} / ${REQUIRED_SIGILS}`;
  confrontCount.textContent = String(state.confronted);
  safeCount.textContent = String(state.safeZones);
  confrontNote.textContent = state.confronted > 0 ? "Your stare scorches the nightmare." : "Face phantoms for surges.";
  state.lastSigils = state.sigils;
  state.lastConfronted = state.confronted;
  state.lastSafeZones = state.safeZones;
}

function resetState() {
  clearTimers();
  state.active = false;
  state.sanity = 100;
  state.sigils = 0;
  state.confronted = 0;
  state.safeZones = 0;
  state.steps = 0;
  state.routeInstability = 0;
  state.slowDrain = 0;
  state.threat = 0;
  state.awaitingExit = false;
  state.currentOptions = [];
  state.manifestation = null;
  state.confrontation = null;
  state.chase = null;
  state.elapsedMs = 0;
  state.fearState = "lucid";
  state.lastSigils = 0;
  state.lastConfronted = 0;
  state.lastSafeZones = 0;
  delete document.body.dataset.manifestation;
  delete document.body.dataset.chase;
  renderHud();
  resetEnvironment();
  decisionOptions.innerHTML = "";
  statusElement.textContent =
    "The wallpaper is breathing. Anchor yourself, then choose your first corridor.";
  decisionTitle.textContent = "Choose Your Next Anchor";
}

function clearTimers() {
  if (state.ticker) {
    window.clearInterval(state.ticker);
    state.ticker = null;
  }
  if (state.confrontation?.timer) {
    window.clearTimeout(state.confrontation.timer);
  }
  if (state.chase?.timer) {
    window.clearInterval(state.chase.timer);
  }
  state.slowDrainDecayTimers.forEach((timer) => window.clearTimeout(timer));
  state.slowDrainDecayTimers = [];
}

function startRun() {
  resetState();
  state.active = true;
  state.runStart = performance.now();
  state.lastTick = state.runStart;
  startButton.disabled = true;
  resetButton.disabled = false;
  logEvent("You steady your breath and step into the maze.");
  playSfx("start");
  flashElement(document.body, "is-run-start", 1000);
  renderOptions();
  startTicker();
  ensureAudio();
}

function resetRun() {
  endRun(false, "reset");
  resetState();
  startButton.disabled = false;
  resetButton.disabled = true;
}

function startTicker() {
  state.ticker = window.setInterval(() => {
    if (!state.active) {
      return;
    }
    const now = performance.now();
    const delta = Math.max(0, now - state.lastTick);
    state.lastTick = now;
    state.elapsedMs = now - state.runStart;
    const perSecondDrain =
      BASE_SANITY_DRAIN_PER_SECOND + state.routeInstability * 0.9 + state.slowDrain * 6 + state.threat * 0.5;
    const drain = (perSecondDrain / 1000) * delta;
    if (drain > 0) {
      updateSanity(-drain);
    }
  }, 180);
}

function ensureAudio() {
  if (state.audio) {
    if (state.audio.context.state === "suspended") {
      state.audio.context.resume().catch(() => {});
    }
    return;
  }
  const context = new AudioContext();
  const master = context.createGain();
  master.gain.value = 0.035;
  master.connect(context.destination);

  const lowOsc = context.createOscillator();
  lowOsc.type = "sawtooth";
  lowOsc.frequency.value = 58;
  const lowGain = context.createGain();
  lowGain.gain.value = 0.2;
  lowOsc.connect(lowGain);
  lowGain.connect(master);
  lowOsc.start();

  const pulse = context.createOscillator();
  pulse.type = "triangle";
  pulse.frequency.value = 138;
  const pulseGain = context.createGain();
  pulseGain.gain.value = 0.08;
  pulse.connect(pulseGain);
  pulseGain.connect(master);
  pulse.start();

  const lfo = context.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.19;
  const lfoGain = context.createGain();
  lfoGain.gain.value = 36;
  lfo.connect(lfoGain);
  lfoGain.connect(pulse.frequency);
  lfo.start();

  const noiseBuffer = context.createBuffer(1, Math.floor(context.sampleRate * 0.6), context.sampleRate);
  const channelData = noiseBuffer.getChannelData(0);
  for (let index = 0; index < channelData.length; index += 1) {
    const fade = 1 - index / channelData.length;
    channelData[index] = (Math.random() * 2 - 1) * fade;
  }

  state.audio = {
    context,
    master,
    muted: false,
    nodes: [lowOsc, pulse, lfo],
    subGains: [lowGain, pulseGain],
    noiseBuffer,
  };
}

function playSfx(type) {
  ensureAudio();
  if (!state.audio || state.audio.muted) {
    return;
  }
  const { context, master, noiseBuffer } = state.audio;
  const now = context.currentTime;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.connect(master);
  const stops = [];
  let maxStop = now + 0.3;

  const scheduleStop = (node, stopTime) => {
    stops.push({ node, stopTime });
    if (stopTime > maxStop) {
      maxStop = stopTime;
    }
  };

  const shape = (attack, peak, decay) => {
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);
    const envelopeEnd = now + attack + decay;
    if (envelopeEnd > maxStop) {
      maxStop = envelopeEnd;
    }
  };

  switch (type) {
    case "sigil": {
      const osc = context.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.45);
      osc.connect(gain);
      osc.start(now);
      const stopTime = now + 0.66;
      osc.stop(stopTime);
      scheduleStop(osc, stopTime);
      shape(0.05, 0.08, 0.55);
      break;
    }
    case "heal":
    case "safe": {
      const osc = context.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.linearRampToValueAtTime(420, now + 0.32);
      osc.connect(gain);
      osc.start(now);
      const stopTime = now + 0.4;
      osc.stop(stopTime);
      scheduleStop(osc, stopTime);
      shape(0.04, type === "safe" ? 0.07 : 0.05, 0.35);
      break;
    }
    case "sting": {
      const osc = context.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.24);
      osc.connect(gain);
      osc.start(now);
      const stopTime = now + 0.26;
      osc.stop(stopTime);
      scheduleStop(osc, stopTime);
      shape(0.01, 0.05, 0.24);
      break;
    }
    case "crash":
    case "fail": {
      const osc = context.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.6);
      osc.connect(gain);
      osc.start(now);
      const stopTime = now + 0.7;
      osc.stop(stopTime);
      scheduleStop(osc, stopTime);
      if (noiseBuffer) {
        const noise = context.createBufferSource();
        noise.buffer = noiseBuffer;
        noise.playbackRate.setValueAtTime(0.55, now);
        noise.connect(gain);
        noise.start(now);
        const noiseStop = now + 0.6;
        noise.stop(noiseStop);
        scheduleStop(noise, noiseStop);
      }
      shape(0.02, type === "crash" ? 0.09 : 0.07, 0.65);
      break;
    }
    case "manifestation": {
      const osc = context.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.9);
      osc.connect(gain);
      osc.start(now);
      const stopTime = now + 1;
      osc.stop(stopTime);
      scheduleStop(osc, stopTime);
      if (noiseBuffer) {
        const noise = context.createBufferSource();
        noise.buffer = noiseBuffer;
        noise.playbackRate.setValueAtTime(0.4, now);
        noise.connect(gain);
        noise.start(now);
        const noiseStop = now + 0.9;
        noise.stop(noiseStop);
        scheduleStop(noise, noiseStop);
      }
      shape(0.08, 0.1, 0.9);
      break;
    }
    case "chase": {
      if (noiseBuffer) {
        const noise = context.createBufferSource();
        noise.buffer = noiseBuffer;
        noise.playbackRate.setValueAtTime(1.2, now);
        noise.connect(gain);
        noise.start(now);
        const noiseStop = now + 0.5;
        noise.stop(noiseStop);
        scheduleStop(noise, noiseStop);
      }
      const osc = context.createOscillator();
      osc.type = "square";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.linearRampToValueAtTime(120, now + 0.4);
      osc.connect(gain);
      osc.start(now);
      const stopTime = now + 0.45;
      osc.stop(stopTime);
      scheduleStop(osc, stopTime);
      shape(0.01, 0.12, 0.45);
      break;
    }
    case "resist": {
      const osc = context.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(360, now + 0.18);
      osc.connect(gain);
      osc.start(now);
      const stopTime = now + 0.2;
      osc.stop(stopTime);
      scheduleStop(osc, stopTime);
      shape(0.01, 0.05, 0.18);
      break;
    }
    case "seal":
    case "exit": {
      const osc = context.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.5);
      osc.connect(gain);
      osc.start(now);
      const stopTime = now + 0.6;
      osc.stop(stopTime);
      scheduleStop(osc, stopTime);
      shape(0.04, type === "exit" ? 0.12 : 0.08, 0.55);
      break;
    }
    case "start": {
      const osc = context.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.linearRampToValueAtTime(300, now + 0.4);
      osc.connect(gain);
      osc.start(now);
      const stopTime = now + 0.45;
      osc.stop(stopTime);
      scheduleStop(osc, stopTime);
      shape(0.03, 0.06, 0.4);
      break;
    }
    default: {
      window.setTimeout(() => {
        try {
          gain.disconnect();
        } catch (error) {
          // ignore
        }
      }, 0);
      return;
    }
  }

  stops.forEach(({ node, stopTime }) => {
    const delay = Math.max(0, (stopTime - now) * 1000 + 120);
    window.setTimeout(() => {
      try {
        node.disconnect();
      } catch (error) {
        // ignore
      }
    }, delay);
  });

  const gainDelay = Math.max(0, (maxStop - now) * 1000 + 160);
  window.setTimeout(() => {
    try {
      gain.disconnect();
    } catch (error) {
      // ignore
    }
  }, gainDelay);
}

function toggleAudio() {
  ensureAudio();
  if (!state.audio) {
    return;
  }
  state.audio.muted = !state.audio.muted;
  state.audio.master.gain.setTargetAtTime(state.audio.muted ? 0 : 0.035, state.audio.context.currentTime, 0.08);
  toggleAudioButton.setAttribute("aria-pressed", state.audio.muted ? "true" : "false");
  toggleAudioButton.textContent = state.audio.muted ? "Unmute Whispers" : "Mute Whispers";
}

function renderOptions() {
  if (!state.active) {
    return;
  }
  if (state.awaitingExit) {
    renderExitOptions();
    return;
  }
  state.currentOptions = OPTION_FACTORIES.map((factory) => factory()).sort(() => Math.random() - 0.5).slice(0, 3);
  decisionOptions.innerHTML = "";
  state.currentOptions.forEach((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.index = String(index);
    button.innerHTML = `<strong>${option.title}</strong><span>${option.detail}</span>`;
    if (option.disabled) {
      button.disabled = true;
    }
    decisionOptions.appendChild(button);
  });
}

function renderExitOptions() {
  decisionOptions.innerHTML = "";
  const exitButton = document.createElement("button");
  exitButton.type = "button";
  exitButton.dataset.action = "exit";
  exitButton.innerHTML =
    "<strong>Tear Open the Wake Door</strong><span>Spend your gathered sigils to snap awake with whatever sanity remains.</span>";
  decisionOptions.appendChild(exitButton);

  const lingerButton = document.createElement("button");
  lingerButton.type = "button";
  lingerButton.dataset.action = "linger";
  lingerButton.innerHTML =
    "<strong>Hold for Clarity</strong><span>Stay a little longer—risk the drain for a shot at another safe surge.</span>";
  decisionOptions.appendChild(lingerButton);
}

function createHallwayOption() {
  return {
    id: "hallway",
    title: "Follow the Impossible Corridor",
    detail: "It bends back through your third-grade classroom and out a hospital ward.",
    handler: () => {
      state.steps += 1;
      state.routeInstability += 0.35;
      const cost = randomBetween(3, 6);
      updateSanity(-cost, { log: "The corridor stretches like gum." });
      maybeGainSigil(0.38, "You mark an exit sigil in the tiles.");
      maybeTriggerManifestation();
      maybeTriggerFreddy();
      resetEnvironment();
      renderOptions();
    },
  };
}

function createMemoryOption() {
  return {
    id: "memory",
    title: "Interrogate a Memory",
    detail: "A music box hums your childhood lullaby backward.",
    handler: () => {
      state.steps += 1;
      const swing = Math.random();
      if (swing < 0.45) {
        updateSanity(6, { log: "You rewrite the lullaby with your own words." });
      } else {
        updateSanity(-7, { log: "The lullaby answers in Freddy's voice." });
        state.threat += 0.35;
      }
      state.routeInstability += 0.25;
      maybeTriggerManifestation();
      maybeTriggerFreddy();
      renderOptions();
    },
  };
}

function createSafeRoomOption() {
  return {
    id: "safe",
    title: "Search for a Safe Zone",
    detail: "You recall a blanket fort hidden behind the furnace.",
    handler: () => {
      state.steps += 1;
      const roll = Math.random();
      if (roll < 0.55) {
        state.safeZones += 1;
        renderEnvironmentGrid("safe");
        safeCount.textContent = String(state.safeZones);
        state.lastSafeZones = state.safeZones;
        flashElement(safeCount, "is-flash", 900);
        playSfx("safe");
        updateSanity(10, { log: "You find a flicker of warmth and breathe.", silentFx: true });
      } else {
        renderEnvironmentGrid("threat");
        playSfx("sting");
        updateSanity(-5, { log: "The fort collapses into knives.", silentFx: true });
        state.threat += 0.25;
      }
      state.routeInstability = Math.max(0, state.routeInstability - 0.25);
      maybeGainSigil(0.24, "A sigil burns beneath the blankets.");
      maybeTriggerManifestation();
      maybeTriggerFreddy();
      renderOptions();
    },
  };
}

function createSigilOption() {
  return {
    id: "sigil",
    title: "Trace Glow in the Floor",
    detail: "Light leaks from between floorboards spelling a word you don't remember.",
    handler: () => {
      state.steps += 1;
      const focusCost = randomBetween(4, 9);
      updateSanity(-focusCost, { log: "You carve the glow into your palm." });
      const success = Math.random() < 0.6;
      if (success) {
        maybeGainSigil(1, "The sigil locks into place inside your palm.");
      } else {
        state.threat += 0.4;
        logEvent("The glow laughs and slithers away.", "warning");
      }
      state.routeInstability += 0.4;
      maybeTriggerManifestation();
      maybeTriggerFreddy();
      renderOptions();
    },
  };
}

function createEchoOption() {
  return {
    id: "echo",
    title: "Listen to the Whispers",
    detail: "Voices beckon from the vents, promising a shorter path.",
    handler: () => {
      state.steps += 1;
      const roll = Math.random();
      if (roll < 0.35) {
        updateSanity(5, { log: "You steal a whispered secret that steadies you." });
        state.threat = Math.max(0, state.threat - 0.3);
      } else {
        updateSanity(-9, { log: "Freddy hums back through the vent." });
        state.threat += 0.5;
      }
      state.routeInstability += 0.45;
      maybeTriggerManifestation();
      maybeTriggerFreddy();
      renderOptions();
    },
  };
}

function maybeGainSigil(chance, message) {
  if (state.sigils >= REQUIRED_SIGILS) {
    return;
  }
  if (Math.random() < chance) {
    state.sigils += 1;
    sigilCount.textContent = `${state.sigils} / ${REQUIRED_SIGILS}`;
    flashElement(sigilCount, "is-flash", 900);
    flashElement(environmentOverlay, "is-sigil", 1400);
    playSfx("sigil");
    state.lastSigils = state.sigils;
    logEvent(message ?? "A new sigil sears into your vision.");
    if (state.sigils >= REQUIRED_SIGILS) {
      triggerExitDoor();
    }
  }
}

function triggerExitDoor() {
  state.awaitingExit = true;
  decisionTitle.textContent = "Wake Threshold";
  logEvent("Four sigils glow at once—the wake door is unlocked.");
  flashElement(decisionOptions, "is-flare", 1000);
  playSfx("seal");
  renderExitOptions();
}

function maybeTriggerManifestation() {
  if (!state.active || state.manifestation) {
    return;
  }
  const chance = MANIFESTATION_BASE_CHANCE + state.routeInstability * 0.08 + (state.sanity < 40 ? 0.12 : 0);
  if (Math.random() < chance) {
    const manifestation = pick(MANIFESTATIONS);
    openManifestation(manifestation);
  }
}

function openManifestation(manifestation) {
  state.manifestation = manifestation;
  manifestationTitle.textContent = manifestation.title;
  manifestationSubtitle.textContent = manifestation.subtitle;
  manifestationDescription.textContent = manifestation.description;
  manifestationWarning.textContent = manifestation.warning;
  confrontationPanel.hidden = true;
  confrontationSequence.textContent = "";
  confrontationGrid.innerHTML = "";
  confrontationTimer.textContent = "";
  manifestationOverlay.hidden = false;
  disableDecisions();
  document.body.dataset.manifestation = manifestation.theme;
  flashElement(manifestationOverlay, "is-open", 900);
  flashElement(environmentOverlay, "is-threat", 1200);
  flashElement(document.body, "is-manifest", 1200);
  playSfx("manifestation");
}

function disableDecisions() {
  decisionOptions.querySelectorAll("button").forEach((button) => {
    button.disabled = true;
  });
}

function enableDecisions() {
  decisionOptions.querySelectorAll("button").forEach((button) => {
    button.disabled = false;
  });
}

function beginConfrontation() {
  if (!state.manifestation) {
    return;
  }
  confrontationPanel.hidden = false;
  const sequenceLength = Math.min(3 + Math.floor(state.routeInstability), 5);
  const sequence = [];
  for (let index = 0; index < sequenceLength; index += 1) {
    sequence.push(pick(GLYPHS));
  }
  confrontationSequence.textContent = sequence.join(" ");
  confrontationGrid.innerHTML = "";
  GLYPHS.forEach((glyph, glyphIndex) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.glyph = glyph;
    button.textContent = glyph;
    button.dataset.key = String(glyphIndex);
    button.disabled = true;
    confrontationGrid.appendChild(button);
  });
  window.setTimeout(() => {
    confrontationSequence.textContent = "";
    confrontationGrid.querySelectorAll("button").forEach((button) => {
      button.disabled = false;
    });
    confrontationTimer.textContent = "10.0s";
  }, 1600);

  const timer = window.setTimeout(() => {
    resolveConfrontation(false, "The sigil dissolves before you finish.");
  }, CONFRONTATION_TIMEOUT);

  state.confrontation = {
    sequence,
    input: [],
    timer,
    startedAt: performance.now(),
  };
  updateConfrontationTimer();
}

function updateConfrontationTimer() {
  if (!state.confrontation) {
    return;
  }
  const remaining = Math.max(0, CONFRONTATION_TIMEOUT - (performance.now() - state.confrontation.startedAt));
  confrontationTimer.textContent = `${(remaining / 1000).toFixed(1)}s`;
  if (remaining <= 0 || !state.manifestation) {
    return;
  }
  window.requestAnimationFrame(updateConfrontationTimer);
}

function handleGlyphInput(glyph) {
  if (!state.confrontation || !state.manifestation) {
    return;
  }
  const expected = state.confrontation.sequence[state.confrontation.input.length];
  state.confrontation.input.push(glyph);
  confrontationSequence.textContent = state.confrontation.input.join(" ");
  if (glyph !== expected) {
    resolveConfrontation(false, "The glyph shatters and screams.");
    return;
  }
  if (state.confrontation.input.length >= state.confrontation.sequence.length) {
    resolveConfrontation(true, "You seal the manifestation inside the sigil.");
  }
}

function resolveConfrontation(success, message) {
  if (state.confrontation?.timer) {
    window.clearTimeout(state.confrontation.timer);
  }
  if (!state.manifestation) {
    return;
  }
  confrontationTimer.textContent = "";
  confrontationGrid.innerHTML = "";
  confrontationSequence.textContent = "";
  const manifest = state.manifestation;
  state.manifestation = null;
  state.confrontation = null;
  manifestationOverlay.hidden = true;
  enableDecisions();
  delete document.body.dataset.manifestation;
  if (success) {
    state.confronted += 1;
    updateSanity(manifest.confrontBonus, { log: message, silentFx: true });
    flashElement(confrontCount, "is-flash", 900);
    flashElement(environmentOverlay, "is-pulse", 1000);
    playSfx("seal");
    particleField.emitBurst?.(0.8);
    maybeGainSigil(0.6, "The conquered fear crumbles into a fresh sigil.");
  } else {
    updateSanity(-manifest.confrontPenalty, { log: message, severity: "danger", silentFx: true });
    flashElement(document.body, "is-shiver", 1000);
    playSfx("crash");
    state.routeInstability += 0.6;
    state.threat += 0.4;
  }
  renderHud();
  renderOptions();
}

function evadeManifestation() {
  if (!state.manifestation) {
    return;
  }
  const manifest = state.manifestation;
  updateSanity(-manifest.evadeDrain, { log: "You back away, letting the fear own the room.", silentFx: true });
  playSfx("sting");
  flashElement(document.body, "is-shiver", 900);
  state.slowDrain += manifest.lingerDrain;
  scheduleSlowDrainFade(manifest.lingerDrain);
  state.routeInstability += 0.45;
  state.threat += 0.35;
  state.manifestation = null;
  manifestationOverlay.hidden = true;
  enableDecisions();
  delete document.body.dataset.manifestation;
  renderOptions();
}

function scheduleSlowDrainFade(amount) {
  const timer = window.setTimeout(() => {
    state.slowDrain = Math.max(0, state.slowDrain - amount);
  }, 9000);
  state.slowDrainDecayTimers.push(timer);
}

function maybeTriggerFreddy() {
  if (!state.active || state.chase) {
    return;
  }
  const chance = FREDDY_BASE_CHANCE + state.threat * 0.12 + (state.sanity < 35 ? 0.18 : 0);
  if (Math.random() < chance) {
    startChase();
  }
}

function startChase() {
  state.chase = {
    progress: 0,
    required: 5,
    timer: null,
  };
  chaseFill.style.width = "0%";
  chaseNote.textContent = "0 / 5 bursts";
  chaseOverlay.hidden = false;
  disableDecisions();
  updateSanity(-12, { log: "Freddy rakes across your sanity.", silentFx: true });
  document.body.dataset.chase = "active";
  flashElement(chaseOverlay, "is-surge", 900);
  flashElement(document.body, "is-chase", 1200);
  playSfx("chase");
  const timer = window.setInterval(() => {
    if (!state.chase) {
      return;
    }
    updateSanity(-5, { log: "Claws tear new seams in the maze.", silentFx: true });
    if (!state.active) {
      stopChase();
    }
  }, 1200);
  state.chase.timer = timer;
}

function resistChase() {
  if (!state.chase) {
    return;
  }
  state.chase.progress += 1;
  const progressPercent = (state.chase.progress / state.chase.required) * 100;
  chaseFill.style.width = `${Math.min(progressPercent, 100)}%`;
  chaseNote.textContent = `${state.chase.progress} / ${state.chase.required} bursts`;
  particleField.emitSparkle?.(0.5);
  flashElement(chaseFill, "is-progress", 700);
  flashElement(chaseOverlay, "is-surge", 700);
  updateSanity(2, { log: "You wrench free of the claws.", silentFx: true });
  playSfx("resist");
  if (state.chase.progress >= state.chase.required) {
    stopChase(true);
  }
}

function stopChase(victorious = false) {
  if (state.chase?.timer) {
    window.clearInterval(state.chase.timer);
  }
  chaseOverlay.hidden = true;
  state.chase = null;
  enableDecisions();
  delete document.body.dataset.chase;
  if (victorious) {
    state.threat = Math.max(0, state.threat - 0.6);
    particleField.emitBurst?.(0.6);
    logEvent("You slam a dream door and hear Freddy howl behind it.");
    playSfx("seal");
  } else {
    playSfx("sting");
  }
  renderOptions();
}

function finishRun() {
  endRun(true, "exit");
}

function endRun(success, reason) {
  if (!state.active && reason !== "reset") {
    return;
  }
  clearTimers();
  manifestationOverlay.hidden = true;
  chaseOverlay.hidden = true;
  state.manifestation = null;
  state.confrontation = null;
  state.chase = null;
  delete document.body.dataset.manifestation;
  delete document.body.dataset.chase;
  const escaped = success && reason === "exit";
  state.active = false;
  const audioActive = state.audio?.context.state === "running" && state.audio.master.gain.value > 0;
  if (reason !== "reset") {
    playSfx(escaped ? "exit" : "fail");
  }
  if (audioActive) {
    const now = state.audio.context.currentTime;
    state.audio.master.gain.setTargetAtTime(state.audio.master.gain.value, now, 0.02);
    state.audio.master.gain.setTargetAtTime(0.0001, now + 0.2, 0.6);
  }
  if (reason === "reset") {
    return;
  }
  wrapup.hidden = false;
  flashElement(wrapup, "is-appear", 900);
  if (wrapupCard) {
    flashElement(wrapupCard, "is-appear", 900);
  }
  const sanityValueFinal = Math.round(state.sanity);
  wrapupSanity.textContent = `${sanityValueFinal}%`;
  wrapupFears.textContent = String(state.confronted);
  wrapupSafes.textContent = String(state.safeZones);
  wrapupTime.textContent = formatTime(state.elapsedMs);
  particleField.emitBurst?.(escaped ? 1 : 0.4);
  highScore.submit(sanityValueFinal, {
    confronted: state.confronted,
    safeZones: state.safeZones,
    timeMs: Math.round(state.elapsedMs),
    escaped,
  });
  logEvent(escaped ? "You rip yourself awake, sanity flickering." : "The dream swallows you whole.", "warning");
  startButton.disabled = false;
  resetButton.disabled = true;
}

function formatTime(ms) {
  const safe = Math.max(0, Math.round(ms));
  const minutes = Math.floor(safe / 60000);
  const seconds = Math.floor((safe % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function handleDecision(event) {
  const button = event.target.closest("button");
  if (!button || button.disabled) {
    return;
  }
  if (state.awaitingExit) {
    if (button.dataset.action === "exit") {
      finishRun();
    } else {
      state.awaitingExit = false;
      decisionTitle.textContent = "Choose Your Next Anchor";
      renderOptions();
    }
    return;
  }
  const index = Number.parseInt(button.dataset.index ?? "-1", 10);
  if (!Number.isInteger(index) || index < 0 || index >= state.currentOptions.length) {
    return;
  }
  const option = state.currentOptions[index];
  option.handler();
}

function handleKeydown(event) {
  if (wrapup.hidden === false && event.key === "Escape") {
    wrapup.hidden = true;
    return;
  }
  if (!manifestationOverlay.hidden) {
    if (event.key === "Escape") {
      evadeManifestation();
    }
    if (state.confrontation && /[1-6]/.test(event.key)) {
      const glyphIndex = Number(event.key) - 1;
      const glyph = GLYPHS[glyphIndex];
      if (glyph) {
        handleGlyphInput(glyph);
      }
    }
    if (state.confrontation && ["q", "w", "e", "r", "t", "y"].includes(event.key.toLowerCase())) {
      const mapping = { q: 0, w: 1, e: 2, r: 3, t: 4, y: 5 };
      const glyph = GLYPHS[mapping[event.key.toLowerCase()]];
      if (glyph) {
        handleGlyphInput(glyph);
      }
    }
    return;
  }
  if (!chaseOverlay.hidden && event.code === "Space") {
    event.preventDefault();
    resistChase();
    return;
  }
  if (!state.active) {
    return;
  }
  if (["1", "2", "3"].includes(event.key)) {
    const index = Number(event.key) - 1;
    const button = decisionOptions.querySelector(`button[data-index="${index}"]`);
    if (button) {
      button.click();
    }
  }
}

clearLogButton.addEventListener("click", () => {
  dreamLog.innerHTML = "";
});

startButton.addEventListener("click", () => {
  if (!state.active) {
    startRun();
  }
});

resetButton.addEventListener("click", () => {
  resetRun();
});

toggleAudioButton.addEventListener("click", () => {
  toggleAudio();
});

decisionOptions.addEventListener("click", handleDecision);

manifestationConfront.addEventListener("click", () => {
  beginConfrontation();
});

manifestationEvade.addEventListener("click", () => {
  evadeManifestation();
});

confrontationGrid.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || button.disabled) {
    return;
  }
  handleGlyphInput(button.dataset.glyph);
});

chaseResist.addEventListener("click", () => {
  resistChase();
});

wrapupReplay.addEventListener("click", () => {
  wrapup.hidden = true;
  startRun();
});

wrapupClose.addEventListener("click", () => {
  wrapup.hidden = true;
});

document.addEventListener("keydown", handleKeydown);

resetState();
renderHud();
