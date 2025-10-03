import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { mountParticleField } from "../particles.js";
import { createStatusChannel, createLogChannel } from "../feedback.js";

const particleField = mountParticleField({
  effects: {
    palette: ["#fde68a", "#fbbf24", "#f59e0b", "#f97316", "#f472b6"],
    ambientDensity: 0.32,
  },
});

const scoreConfig = getScoreConfig("sugar-ray-hustle");
const highScore = initHighScoreBanner({
  gameId: "sugar-ray-hustle",
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

const statusBar = document.getElementById("status-bar");
const eventLog = document.getElementById("event-log");
const swaggerMeter = document.getElementById("swagger-meter");
const swaggerFill = document.getElementById("swagger-fill");
const swaggerNote = document.getElementById("swagger-note");
const swaggerButton = document.getElementById("swagger-button");
const dealButton = document.getElementById("deal-challenge");
const challengeButton = document.getElementById("challenge-button");
const challengeArea = document.getElementById("challenge-area");
const timingRing = document.getElementById("timing-ring");
const windowLabel = document.getElementById("window-label");
const timingCaption = document.getElementById("timing-caption");
const resultBanner = document.getElementById("result-banner");
const playerBankValue = document.getElementById("player-bank");
const opponentBankValue = document.getElementById("opponent-bank");
const opponentBankLabel = document.getElementById("opponent-bank-label");
const potValue = document.getElementById("pot-value");
const potNote = document.getElementById("pot-note");
const streakValue = document.getElementById("streak-value");
const bestStreakValue = document.getElementById("best-streak-value");
const roundCounter = document.getElementById("round-counter");
const opponentCard = document.getElementById("opponent-card");
const opponentTitle = document.getElementById("opponent-title");
const opponentName = document.getElementById("opponent-name");
const opponentIntro = document.getElementById("opponent-intro");
const opponentTempo = document.getElementById("opponent-tempo");
const opponentWindow = document.getElementById("opponent-window");
const opponentPenalty = document.getElementById("opponent-penalty");
const opponentProgress = document.getElementById("opponent-progress");
const wrapUp = document.getElementById("wrap-up");
const wrapUpTitle = document.getElementById("wrap-up-title");
const wrapUpMoney = document.getElementById("wrap-up-money");
const wrapUpStreak = document.getElementById("wrap-up-streak");
const wrapUpOpponents = document.getElementById("wrap-up-opponents");
const wrapUpTotalOpponents = document.getElementById("wrap-up-total-opponents");
const wrapUpNote = document.getElementById("wrap-up-note");
const wrapUpReplay = document.getElementById("wrap-up-replay");

const setStatus = createStatusChannel(statusBar);
const logChannel = createLogChannel(eventLog, { limit: 12 });

const opponents = [
  {
    id: "velvet-verona",
    name: "Velvet Verona",
    title: "Floor Greeter",
    intro:
      "Velvet's glide is all satin and smoke. She tracks your pulse from the way you reach for the felt.",
    tempoLabel: "Lounge glide",
    accent: "#facc15",
    baseDuration: 2200,
    windows: { late: 420, good: 300, perfect: 160 },
    missMultiplier: 1.5,
    basePot: 160,
    potSwing: 90,
    bank: 900,
    swaggerBonus: 32,
    entrance: "Velvet Verona fans a velvet fan and beckons you to the rail.",
    exit: "Velvet tips the dealer and fades into the crowd—tapped out.",
    claims: [
      "fans the bones and calls velvet sevens",
      "lets the dice dance and hums for boxcars",
      "palms a die and whispers midnight doubles",
      "spins the cup and promises a satin eleven",
    ],
    taunts: [
      "\"Blink again and I'll rent those chips, sugar.\"",
      "\"Too slow. The glow waits for no one.\"",
      "\"Hands like that won't buy the next round.\"",
    ],
  },
  {
    id: "quickhand-quincy",
    name: "Quickhand Quincy",
    title: "Backroom Mechanic",
    intro: "Quincy rattles the dice like a snare drum, carving windows so tight you can feel the draft.",
    tempoLabel: "Switchback shuffle",
    accent: "#38bdf8",
    baseDuration: 1900,
    windows: { late: 360, good: 240, perfect: 120 },
    missMultiplier: 1.55,
    basePot: 210,
    potSwing: 110,
    bank: 1100,
    swaggerBonus: 34,
    entrance: "Quickhand Quincy snaps his suspenders and smirks at the pit boss.",
    exit: "Quincy flicks his hat brim and mutters about bad rhythm as he bows out.",
    claims: [
      "taps the cup twice and swears it's a midnight jump",
      "slides the bones down the rail and calls razored eights",
      "cackles about a hustle pair and snaps for double nickels",
      "palms the felt and whispers for angel wings",
    ],
    taunts: [
      "\"Thought you had the tempo? Try again, rookie.\"",
      "\"You just paid the house to practice.\"",
      "\"I heard the hesitation from the bar.\"",
    ],
  },
  {
    id: "lady-domino-della",
    name: "Lady Domino Della",
    title: "Pit Boss",
    intro: "Della drapes the table in gold filigree, collapsing the window to a razor's edge.",
    tempoLabel: "Metronome snap",
    accent: "#f472b6",
    baseDuration: 1650,
    windows: { late: 300, good: 200, perfect: 100 },
    missMultiplier: 1.65,
    basePot: 260,
    potSwing: 130,
    bank: 1300,
    swaggerBonus: 36,
    entrance: "Lady Della clicks her locket shut and orders the band to drop the beat.",
    exit: "Della laughs, promising a rematch when the lights cool down.",
    claims: [
      "rolls blindfolded and guarantees royal crowns",
      "tosses high and nods for a midnight ladder",
      "cuts the air and swears on triple moons",
      "beckons the dealer and calls a silk straight",
    ],
    taunts: [
      "\"Come back when you can hold a pulse.\"",
      "\"I saw you counting heartbeats instead of bars.\"",
      "\"That hesitation cost you the champagne.\"",
    ],
  },
  {
    id: "sugar-ray-caldwell",
    name: "Sugar Ray Caldwell",
    title: "Club Owner",
    intro:
      "The man himself steps in, cane sparkling. His ring shrinks faster than the spotlight on closing time.",
    tempoLabel: "Strobe blitz",
    accent: "#fde047",
    baseDuration: 1450,
    windows: { late: 260, good: 180, perfect: 80 },
    missMultiplier: 1.75,
    basePot: 320,
    potSwing: 160,
    bank: 1500,
    swaggerBonus: 40,
    entrance: "Sugar Ray twirls his cane and lets the room hush before the next throw.",
    exit: "Sugar Ray tips his hat—tonight, the floor is yours.",
    claims: [
      "tosses a blur and calls the dawn double",
      "cracks the dice like lightning and swears on midnight gold",
      "smiles thin and predicts a hustler's halo",
      "lets them ricochet and promises the house a silent twelve",
    ],
    taunts: [
      "\"You want the marquee? Catch the glint, not the rumor.\"",
      "\"Close isn't a currency in my club.\"",
      "\"The ring vanished and so did your bankroll.\"",
    ],
  },
];

const audioState = { context: null };

const state = {
  opponentIndex: 0,
  currentOpponent: opponents[0],
  playerMoney: 1200,
  opponentMoney: opponents[0].bank,
  pot: 0,
  round: 0,
  roundsAgainstCurrent: 0,
  perfectStreak: 0,
  bestPerfectStreak: 0,
  swagger: 0,
  swaggerReady: false,
  slowTimeCharges: 0,
  swaggerActivations: 0,
  challengeActive: false,
  challengeStart: null,
  challengeDuration: 0,
  challengeWindows: { late: 0, good: 0, perfect: 0 },
  animationId: null,
  zone: "idle",
  sessionActive: true,
  opponentsCleared: 0,
  lastClaim: "",
};

initialize();

function initialize() {
  wrapUpTotalOpponents.textContent = opponents.length.toString();
  setStatus("Welcome to the Rose Room. Prime the dice to start the hustle.", "info");
  updateOpponentCard();
  updateBanks();
  updateSwagger();
  updateRoundCounter();
  updateResultBanner("Waiting on the next claim.");
  updateDealButtonLabel();
  logChannel.push(state.currentOpponent.entrance, "info");
  dealButton.addEventListener("click", () => {
    if (!state.sessionActive || state.challengeActive) {
      return;
    }
    primeRound();
  });

  challengeButton.addEventListener("click", () => {
    if (!state.challengeActive) {
      return;
    }
    const context = ensureAudioContext();
    if (context?.state === "suspended") {
      context.resume().catch(() => {});
    }
    resolveChallenge(performance.now());
  });

  swaggerButton.addEventListener("click", () => {
    if (!state.sessionActive || state.challengeActive || !state.swaggerReady) {
      return;
    }
    const context = ensureAudioContext();
    if (context?.state === "suspended") {
      context.resume().catch(() => {});
    }
    activateSwagger();
  });

  wrapUpReplay.addEventListener("click", () => {
    resetSession();
  });
}

function primeRound() {
  const opponent = state.currentOpponent;
  state.round += 1;
  state.roundsAgainstCurrent += 1;
  state.pot = computePot(opponent);
  state.lastClaim = pick(opponent.claims);
  updateRoundCounter();
  updateBanks();
  updatePotNote();
  setStatus(
    `${opponent.name} ${state.lastClaim} for ${formatCurrency(state.pot)}. Wait for the glow.`,
    "info",
  );
  logChannel.push(
    `Round ${state.round}: ${opponent.name} ${state.lastClaim} for ${formatCurrency(state.pot)}.`,
  );
  opponentCard.classList.remove("is-taunting");
  opponentCard.classList.add("is-rolling");
  window.clearTimeout(primeRound.rollTimeout);
  primeRound.rollTimeout = window.setTimeout(() => {
    opponentCard.classList.remove("is-rolling");
    armChallenge(opponent);
  }, 520);
  dealButton.disabled = true;
}

function armChallenge(opponent) {
  const slowFactor = state.slowTimeCharges > 0 ? 1.65 : 1;
  const duration = opponent.baseDuration * slowFactor;
  const perfectWindow = opponent.windows.perfect * slowFactor;
  const goodWindow = opponent.windows.good * slowFactor;
  const lateWindow = opponent.windows.late * slowFactor;
  state.challengeDuration = duration;
  state.challengeWindows = {
    perfect: Math.max(0, duration - perfectWindow),
    good: Math.max(0, duration - perfectWindow - goodWindow),
    late: Math.max(0, duration - perfectWindow - goodWindow - lateWindow),
  };
  state.challengeActive = true;
  state.challengeStart = null;
  setChallengeZone("pre");
  challengeButton.disabled = false;
  if (state.slowTimeCharges > 0) {
    document.body.classList.add("is-slowmo");
    state.slowTimeCharges -= 1;
    state.swaggerReady = false;
    updateSwagger();
  }
  cancelAnimationFrame(state.animationId);
  state.animationId = requestAnimationFrame(stepChallenge);
}

function stepChallenge(timestamp) {
  if (!state.challengeActive) {
    return;
  }
  if (state.challengeStart === null) {
    state.challengeStart = timestamp;
  }
  const elapsed = timestamp - state.challengeStart;
  const progress = Math.min(elapsed / state.challengeDuration, 1);
  const scale = Math.max(0.1, 1 - progress);
  timingRing.style.setProperty("--ring-scale", scale.toFixed(3));
  updateZoneForElapsed(elapsed);
  if (elapsed >= state.challengeDuration) {
    resolveChallenge(timestamp);
    return;
  }
  state.animationId = requestAnimationFrame(stepChallenge);
}

function resolveChallenge(timestamp) {
  if (!state.challengeActive) {
    return;
  }
  const elapsed = timestamp - (state.challengeStart ?? timestamp);
  finishChallenge();
  const { perfect, good, late } = state.challengeWindows;
  if (elapsed < late) {
    handleMiss("Jumped before the rings aligned.");
    return;
  }
  if (elapsed >= state.challengeDuration) {
    handleMiss("Too late—the glow vanished.");
    return;
  }
  if (elapsed >= perfect) {
    handlePerfect(elapsed);
    return;
  }
  if (elapsed >= good) {
    handleGood();
    return;
  }
  handleLate();
}

function finishChallenge() {
  state.challengeActive = false;
  cancelAnimationFrame(state.animationId);
  state.animationId = null;
  challengeButton.disabled = true;
  challengeArea.classList.remove("is-flash");
  document.body.classList.remove("is-slowmo");
  state.zone = "idle";
  challengeArea.dataset.zone = "idle";
  windowLabel.textContent = "Wait for the glow";
  timingCaption.textContent = "The ring collapses fast—perfect hits double the pot.";
  timingRing.style.setProperty("--ring-scale", "1");
  window.setTimeout(() => {
    if (state.sessionActive) {
      dealButton.disabled = false;
      updateDealButtonLabel();
    }
  }, 420);
}

function handlePerfect(elapsed) {
  const opponent = state.currentOpponent;
  const haul = state.pot * 2;
  state.playerMoney += haul;
  state.opponentMoney -= haul;
  state.perfectStreak += 1;
  state.bestPerfectStreak = Math.max(state.bestPerfectStreak, state.perfectStreak);
  state.swagger = Math.min(100, state.swagger + opponent.swaggerBonus);
  state.swaggerReady = state.swagger >= 100;
  const intensity = Math.min(1.2, 0.85 + state.perfectStreak * 0.05);
  playKaChing(intensity);
  particleField.emitBurst(1.25 * intensity);
  particleField.emitSparkle(0.9 * intensity);
  challengeArea.classList.add("is-flash");
  window.setTimeout(() => {
    challengeArea.classList.remove("is-flash");
  }, 420);
  const windowMs = Math.max(0, state.challengeDuration - elapsed);
  const windowText = windowMs > 0 ? `${Math.round(windowMs)}ms spare` : "edge tight";
  setStatus(
    `Perfect! ${opponent.name}'s hustle collapses. ${formatCurrency(haul)} banked with ${windowText}.`,
    "success",
  );
  logChannel.push(
    `Perfect timing! ${formatCurrency(haul)} haul. Swagger rises to ${Math.round(state.swagger)}%.`,
    "success",
  );
  updateResultBanner("Perfect Challenge · Massive Win");
  updateBanks();
  updateSwagger();
  updateStreaks();
  evaluateOpponentState();
}

function handleGood() {
  const opponent = state.currentOpponent;
  const haul = state.pot;
  state.playerMoney += haul;
  state.opponentMoney -= haul;
  state.perfectStreak = 0;
  playKaChing(0.55);
  setStatus(`Good hit. ${formatCurrency(haul)} slides your way.`, "success");
  logChannel.push(`Good read. ${formatCurrency(haul)} secured.`, "success");
  updateResultBanner("Good Challenge · Solid Win");
  updateBanks();
  updateSwagger();
  updateStreaks();
  evaluateOpponentState();
}

function handleLate() {
  state.perfectStreak = 0;
  playThud();
  setStatus("Late window—chips stay put.", "warning");
  logChannel.push("Late window. Pot pushes.", "warning");
  triggerTaunt();
  updateResultBanner("Late Challenge · Push");
  updateSwagger(-12);
  updateStreaks();
}

function handleMiss(reason) {
  const opponent = state.currentOpponent;
  const penalty = Math.round(state.pot * opponent.missMultiplier);
  state.playerMoney -= penalty;
  state.opponentMoney += penalty;
  state.perfectStreak = 0;
  playThud();
  setStatus(`Miss! ${reason} Lose ${formatCurrency(penalty)}.`, "danger");
  logChannel.push(`Missed window. ${reason} (${formatCurrency(-penalty)}).`, "danger");
  triggerTaunt();
  updateResultBanner("Miss · House Takes the Pot");
  updateBanks();
  updateSwagger(-18);
  updateStreaks();
  evaluateDefeat();
}

function updateZoneForElapsed(elapsed) {
  const { perfect, good, late } = state.challengeWindows;
  if (elapsed >= perfect) {
    setChallengeZone("perfect");
    return;
  }
  if (elapsed >= good) {
    setChallengeZone("good");
    return;
  }
  if (elapsed >= late) {
    setChallengeZone("late");
    return;
  }
  setChallengeZone("pre");
}

function setChallengeZone(zone) {
  if (state.zone === zone) {
    return;
  }
  state.zone = zone;
  challengeArea.dataset.zone = zone;
  switch (zone) {
    case "perfect":
      windowLabel.textContent = "Perfect · Massive Win";
      timingCaption.textContent = "Now! Slam it while the inner ring burns gold.";
      break;
    case "good":
      windowLabel.textContent = "Good · Modest Win";
      timingCaption.textContent = "Hold your nerve a heartbeat longer for the big flash.";
      break;
    case "late":
      windowLabel.textContent = "Late · Push";
      timingCaption.textContent = "Play it safe or wait for the gold.";
      break;
    case "pre":
      windowLabel.textContent = "Hold for the tighten";
      timingCaption.textContent = "The ring is still wide—wait for the heat.";
      break;
    default:
      windowLabel.textContent = "Wait for the glow";
      timingCaption.textContent = "The ring collapses fast—perfect hits double the pot.";
      break;
  }
}

function triggerTaunt() {
  const opponent = state.currentOpponent;
  opponentCard.classList.remove("is-rolling");
  opponentCard.classList.remove("is-taunting");
  void opponentCard.offsetWidth;
  opponentCard.classList.add("is-taunting");
  const taunt = pick(opponent.taunts);
  if (taunt) {
    logChannel.push(`${opponent.name} sneers: ${taunt}`, "warning");
  }
}

function evaluateOpponentState() {
  if (state.opponentMoney <= 0) {
    const opponent = state.currentOpponent;
    state.opponentsCleared += 1;
    setStatus(`${opponent.name} is tapped out. ${opponent.exit}`, "success");
    logChannel.push(`${opponent.name} folds. On to the next shark.`, "success");
    advanceOpponent();
  }
}

function evaluateDefeat() {
  if (state.playerMoney <= 0) {
    state.playerMoney = Math.max(state.playerMoney, 0);
    endSession(false);
  }
}

function advanceOpponent() {
  state.opponentIndex += 1;
  if (state.opponentIndex >= opponents.length) {
    endSession(true);
    return;
  }
  state.currentOpponent = opponents[state.opponentIndex];
  state.opponentMoney = state.currentOpponent.bank;
  state.roundsAgainstCurrent = 0;
  updateOpponentCard();
  updateBanks();
  updateRoundCounter();
  state.pot = 0;
  updatePotNote();
  setStatus(state.currentOpponent.entrance, "info");
  logChannel.push(state.currentOpponent.entrance, "info");
}

function endSession(victory) {
  state.sessionActive = false;
  finishChallenge();
  dealButton.disabled = true;
  swaggerButton.disabled = true;
  state.challengeActive = false;
  updateBanks();
  const summary = victory
    ? "You own the Rose Room."
    : "The house sweeps the night.";
  wrapUpTitle.textContent = summary;
  wrapUpMoney.textContent = formatCurrency(state.playerMoney);
  wrapUpStreak.textContent = state.bestPerfectStreak.toString();
  if (victory) {
    state.opponentsCleared = opponents.length;
  }
  wrapUpOpponents.textContent = state.opponentsCleared.toString();
  wrapUpTotalOpponents.textContent = opponents.length.toString();
  wrapUpNote.textContent = victory
    ? "Hit the marquee and log the score upstairs."
    : "Keep grinding for that marquee slot.";
  wrapUp.hidden = false;
  const meta = {
    longestStreak: state.bestPerfectStreak,
    opponents: state.opponentsCleared,
    swaggerActivations: state.swaggerActivations,
  };
  const result = highScore.submit(state.playerMoney, meta);
  if (result.updated) {
    wrapUpNote.textContent = "New high score! The Rose Room lights spell your name.";
  }
}

function resetSession() {
  state.opponentIndex = 0;
  state.currentOpponent = opponents[0];
  state.playerMoney = 1200;
  state.opponentMoney = state.currentOpponent.bank;
  state.pot = 0;
  state.round = 0;
  state.roundsAgainstCurrent = 0;
  state.perfectStreak = 0;
  state.bestPerfectStreak = 0;
  state.swagger = 0;
  state.swaggerReady = false;
  state.slowTimeCharges = 0;
  state.swaggerActivations = 0;
  state.challengeActive = false;
  state.sessionActive = true;
  state.opponentsCleared = 0;
  state.lastClaim = "";
  wrapUp.hidden = true;
  wrapUpTotalOpponents.textContent = opponents.length.toString();
  wrapUpOpponents.textContent = "0";
  wrapUpStreak.textContent = "0";
  wrapUpMoney.textContent = formatCurrency(state.playerMoney);
  eventLog.innerHTML = "";
  updateOpponentCard();
  logChannel.push(state.currentOpponent.entrance, "info");
  updateBanks();
  updateRoundCounter();
  updateSwagger();
  updatePotNote();
  updateStreaks();
  updateResultBanner("Waiting on the next claim.");
  setStatus("Fresh bankroll. Prime the dice when you're ready.", "info");
  dealButton.disabled = false;
  updateDealButtonLabel();
}

function updateOpponentCard() {
  const opponent = opponents[state.opponentIndex];
  state.currentOpponent = opponent;
  opponentTitle.textContent = `${opponent.name} · ${opponent.title}`;
  opponentName.textContent = opponent.name;
  opponentIntro.textContent = opponent.intro;
  opponentTempo.textContent = opponent.tempoLabel;
  opponentWindow.innerHTML = `${Math.round(opponent.windows.perfect)}&nbsp;ms`;
  opponentPenalty.textContent = `×${formatMultiplier(opponent.missMultiplier)} pot`;
  opponentProgress.textContent = `Opponent ${state.opponentIndex + 1} of ${opponents.length}`;
  document.body.style.setProperty("--sugar-accent", opponent.accent ?? "#facc15");
  opponentBankLabel.textContent = `${opponent.name}'s Bank`;
}

function updateBanks() {
  playerBankValue.textContent = formatCurrency(state.playerMoney);
  opponentBankValue.textContent = formatCurrency(Math.max(state.opponentMoney, 0));
}

function updatePotNote() {
  if (state.pot <= 0) {
    potValue.textContent = "$0";
    potNote.textContent = "Press Prime the Dice to set the next stake.";
    return;
  }
  potValue.textContent = formatCurrency(state.pot);
  potNote.textContent = `${state.currentOpponent.name} ${state.lastClaim}.`;
}

function updateStreaks() {
  streakValue.textContent = state.perfectStreak.toString();
  bestStreakValue.textContent = state.bestPerfectStreak.toString();
}

function updateSwagger(change = 0) {
  if (change !== 0) {
    state.swagger = Math.max(0, Math.min(100, state.swagger + change));
    state.swaggerReady = state.swagger >= 100;
  }
  swaggerFill.style.width = `${state.swagger}%`;
  swaggerMeter.dataset.ready = state.swaggerReady ? "true" : "false";
  swaggerButton.disabled = !state.swaggerReady || !state.sessionActive || state.challengeActive;
  swaggerButton.dataset.ready = state.swaggerReady ? "true" : "false";
  swaggerNote.textContent = state.swaggerReady
    ? "Swagger primed. Spend it to slow time for one round."
    : "Perfect hits slow time. Keep the streak alive.";
}

function activateSwagger() {
  state.slowTimeCharges = 1;
  state.swagger = 0;
  state.swaggerReady = false;
  state.swaggerActivations += 1;
  updateSwagger();
  setStatus("Swagger spent. Time drags for the next claim.", "success");
  logChannel.push("Swagger activated—next ring slows to a crawl.", "success");
}

function updateRoundCounter() {
  const display = state.roundsAgainstCurrent > 0 ? state.roundsAgainstCurrent : 1;
  roundCounter.textContent = display.toString();
}

function updateResultBanner(text) {
  resultBanner.textContent = text;
}

function updateDealButtonLabel() {
  dealButton.textContent = state.round > 0 ? "Raise Another Pot" : "Prime the Dice";
}

function computePot(opponent) {
  const variance = Math.round(Math.random() * opponent.potSwing);
  return opponent.basePot + variance;
}

function formatCurrency(value) {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  return formatter.format(value);
}

function formatMultiplier(multiplier) {
  const text = multiplier.toFixed(2);
  return text.replace(/\.00$/, "");
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function ensureAudioContext() {
  if (audioState.context) {
    return audioState.context;
  }
  try {
    audioState.context = new AudioContext();
  } catch (error) {
    console.warn("Audio context unavailable", error);
  }
  return audioState.context;
}

function playKaChing(strength = 1) {
  const context = ensureAudioContext();
  if (!context) {
    return;
  }
  const now = context.currentTime;
  const master = context.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.linearRampToValueAtTime(0.5 * strength, now + 0.02);
  master.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
  master.connect(context.destination);

  const freqs = [880, 1320, 1760];
  freqs.forEach((frequency, index) => {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(frequency * 1.05, now + 0.08);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.2 * strength, now + 0.015 + index * 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45 + index * 0.05);
    osc.connect(gain).connect(master);
    osc.start(now + index * 0.01);
    osc.stop(now + 0.6 + index * 0.05);
  });

  const noise = context.createBufferSource();
  const buffer = context.createBuffer(1, context.sampleRate * 0.3, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.6));
  }
  noise.buffer = buffer;
  const noiseGain = context.createGain();
  noiseGain.gain.setValueAtTime(0.0001, now);
  noiseGain.gain.linearRampToValueAtTime(0.3 * strength, now + 0.02);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
  noise.connect(noiseGain).connect(master);
  noise.start(now);
  noise.stop(now + 0.35);
}

function playThud() {
  const context = ensureAudioContext();
  if (!context) {
    return;
  }
  const now = context.currentTime;
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(120, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.35);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.35, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
  osc.connect(gain).connect(context.destination);
  osc.start(now);
  osc.stop(now + 0.5);
}
