import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { mountParticleField } from "../particles.js";
import { autoEnhanceFeedback } from "../feedback.js";

const particleField = mountParticleField({
  effects: {
    palette: ["#fcd34d", "#fb7185", "#22d3ee", "#f97316"],
    ambientDensity: 0.4,
    accentTrail: 0.6,
  },
});

const scoreConfig = getScoreConfig("merger-madness");
const highScore = initHighScoreBanner({
  gameId: "merger-madness",
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

autoEnhanceFeedback();

const WORK_BLOCK_MS = 90_000;
const TODO_ITEMS = [
  { id: "file-prospectus", label: "File “Merger Prospectus”", type: "document" },
  { id: "memo-synergy", label: "Type “Synergy Memo”", type: "memo" },
  { id: "file-litigation", label: "File “Litigation Brief”", type: "document" },
  { id: "memo-floor", label: "Type “Skyline Update”", type: "memo" },
  { id: "file-benefits", label: "File “Benefits Rollup”", type: "document" },
];

const MEMO_LIBRARY = [
  {
    id: "memo-synergy",
    title: "Synergy Memo",
    text: "Team — sync with media to align the brand voice before the eleven a.m. deck. Highlight the skyline party win and keep morale blazing.",
    accuracyWeight: 1.1,
    todoId: "memo-synergy",
  },
  {
    id: "memo-floor",
    title: "Skyline Update",
    text: "Confirm the 52nd floor build-out hits code. Note the glass conference room swap and remind security about the investor badge list.",
    accuracyWeight: 1,
    todoId: "memo-floor",
  },
  {
    id: "memo-fasttrack",
    title: "Fast Track Recap",
    text: "Outline the fast-track approvals, call out the two redline clauses, and loop Rita for the revised courier schedule.",
    accuracyWeight: 1,
  },
  {
    id: "memo-culture",
    title: "Culture Burst",
    text: "Draft a bulletin celebrating the record-setting pitch week, spotlight the junior analyst win, and tease tonight's skyline toast.",
    accuracyWeight: 0.9,
  },
];

const DOCUMENT_LIBRARY = [
  {
    id: "file-prospectus",
    title: "Merger Prospectus",
    folder: "financials",
    owner: "CFO Desk",
    baseDeadline: 12_000,
    todoId: "file-prospectus",
  },
  {
    id: "file-litigation",
    title: "Litigation Brief",
    folder: "legal",
    owner: "Outside Counsel",
    baseDeadline: 10_000,
    todoId: "file-litigation",
  },
  {
    id: "file-benefits",
    title: "Benefits Rollup",
    folder: "memos",
    owner: "HR Loft",
    baseDeadline: 11_000,
    todoId: "file-benefits",
  },
  {
    id: "file-synergy",
    title: "Synergy Slides",
    folder: "memos",
    owner: "Pitch Squad",
    baseDeadline: 9_000,
  },
  {
    id: "file-audit",
    title: "Audit Variance",
    folder: "financials",
    owner: "Audit Team",
    baseDeadline: 8_500,
  },
  {
    id: "file-contract",
    title: "Contract Redlines",
    folder: "legal",
    owner: "Legal Floor",
    baseDeadline: 9_200,
  },
];

const FOLDER_LABELS = {
  memos: "Memos",
  financials: "Financials",
  legal: "Legal",
};

const difficultyStages = [
  { until: 20_000, intervalRange: [3_600, 4_200], docRange: [1, 1], typingChance: 0.55, phoneChance: 0.05 },
  { until: 55_000, intervalRange: [2_600, 3_200], docRange: [1, 2], typingChance: 0.65, phoneChance: 0.18 },
  { until: Infinity, intervalRange: [1_800, 2_400], docRange: [1, 3], typingChance: 0.75, phoneChance: 0.3 },
];

const typingInput = document.getElementById("typing-input");
const typingPrompt = document.getElementById("typing-prompt");
const typingInstructions = document.getElementById("typing-instructions");
const typingFeedback = document.getElementById("typing-feedback");
const sortingInstructions = document.getElementById("sorting-instructions");
const documentPile = document.getElementById("document-pile");
const efficiencyValue = document.getElementById("efficiency-value");
const stressValue = document.getElementById("stress-value");
const stressMeter = document.getElementById("stress-meter");
const stressFill = document.getElementById("stress-fill");
const pileCount = document.getElementById("pile-count");
const timerValue = document.getElementById("timer-value");
const simulatorHelp = document.getElementById("simulator-help");
const phoneAlert = document.getElementById("phone-alert");
const phoneTimer = document.getElementById("phone-timer");
const answerButton = document.getElementById("answer-button");
const coffeeButton = document.getElementById("coffee-button");
const startButton = document.getElementById("start-button");
const resetButton = document.getElementById("reset-button");
const folderButtons = Array.from(document.querySelectorAll(".folder-button"));
const wrapupElement = document.getElementById("wrapup");
const wrapupDialog = document.querySelector(".wrapup-dialog");
const wrapupSubtitle = document.getElementById("wrapup-subtitle");
const wrapupEfficiency = document.getElementById("wrapup-efficiency");
const wrapupAccuracy = document.getElementById("wrapup-accuracy");
const wrapupDocs = document.getElementById("wrapup-docs");
const wrapupNotes = document.getElementById("wrapup-notes");
const wrapupRematch = document.getElementById("wrapup-rematch");
const wrapupClose = document.getElementById("wrapup-close");
const todoList = document.getElementById("todo-list");

const audio = {
  context: null,
  gain: null,
};

const state = {
  active: false,
  blockRemainingMs: WORK_BLOCK_MS,
  efficiency: 0,
  stress: 0,
  typingTask: null,
  typingStartedAt: 0,
  totalTypedChars: 0,
  correctTypedChars: 0,
  memoHistory: [],
  documentsFiled: 0,
  documentQueue: [],
  phone: null,
  phoneDeadline: 0,
  nextTaskAt: 0,
  lastTick: 0,
  loopHandle: null,
  coffeeAvailable: true,
  stressShieldUntil: 0,
  errors: 0,
  blockNotes: [],
  todo: [],
};

initializeTodo();
updateTodoUI();
updateUI();
attachEventListeners();

function initializeTodo() {
  todoList.innerHTML = "";
  state.todo = TODO_ITEMS.map((item) => {
    const li = document.createElement("li");
    li.className = "todo-item";
    li.dataset.todoId = item.id;
    const status = document.createElement("span");
    status.className = "todo-status";
    status.textContent = "•";
    const label = document.createElement("span");
    label.textContent = item.label;
    li.append(status, label);
    todoList.append(li);
    return { ...item, statusElement: status, element: li, state: "pending" };
  });
}

function attachEventListeners() {
  typingInput.addEventListener("input", handleTypingInput);
  typingInput.addEventListener("focus", ensureAudio);
  folderButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!state.active) {
        return;
      }
      fileTopDocument(button.dataset.folder);
    });
  });
  answerButton.addEventListener("click", () => {
    if (!state.active || !state.phone) {
      return;
    }
    resolvePhoneCall(true);
  });
  startButton.addEventListener("click", () => {
    if (state.active) {
      return;
    }
    ensureAudio();
    startWorkBlock();
  });
  resetButton.addEventListener("click", () => {
    resetDesk();
  });
  coffeeButton.addEventListener("click", handleCoffeeBreak);
  wrapupRematch.addEventListener("click", () => {
    hideWrapup();
    startButton.focus();
  });
  wrapupClose.addEventListener("click", () => {
    hideWrapup();
    startButton.focus();
  });
}

function ensureAudio() {
  if (audio.context) {
    return;
  }
  try {
    const context = new AudioContext();
    const gain = context.createGain();
    gain.gain.value = 0.08;
    gain.connect(context.destination);
    audio.context = context;
    audio.gain = gain;
  } catch (error) {
    console.warn("Audio context unavailable", error);
  }
}

function playTone({ frequency, duration, type = "square" }) {
  if (!audio.context || !audio.gain) {
    return;
  }
  const oscillator = audio.context.createOscillator();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  const env = audio.context.createGain();
  env.gain.value = 0;
  oscillator.connect(env).connect(audio.gain);
  const now = audio.context.currentTime;
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(1, now + 0.01);
  env.gain.linearRampToValueAtTime(0, now + duration);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

function playKeyClick() {
  playTone({ frequency: 640, duration: 0.07, type: "triangle" });
}

function playPerfectChime() {
  playTone({ frequency: 880, duration: 0.2, type: "sine" });
  playTone({ frequency: 1320, duration: 0.2, type: "sine" });
}

function playErrorThunk() {
  playTone({ frequency: 220, duration: 0.18, type: "sawtooth" });
}

function startWorkBlock() {
  resetDesk();
  state.active = true;
  state.blockRemainingMs = WORK_BLOCK_MS;
  state.nextTaskAt = performance.now() + 1_200;
  state.lastTick = 0;
  simulatorHelp.textContent = "Block running — keep the desk clear and the memos pristine.";
  typingInstructions.textContent = "Waiting for the first memo to arrive.";
  sortingInstructions.textContent = "Watch the courier tray for new deliveries.";
  typingInput.disabled = false;
  typingInput.value = "";
  typingInput.focus();
  coffeeButton.disabled = false;
  state.loopHandle = requestAnimationFrame(gameLoop);
}

function resetDesk() {
  clearAnimationLoop();
  state.active = false;
  state.blockRemainingMs = WORK_BLOCK_MS;
  state.efficiency = 0;
  state.stress = 0;
  state.typingTask = null;
  state.typingStartedAt = 0;
  state.totalTypedChars = 0;
  state.correctTypedChars = 0;
  state.memoHistory = [];
  state.documentsFiled = 0;
  state.documentQueue = [];
  state.phone = null;
  state.phoneDeadline = 0;
  state.nextTaskAt = 0;
  state.lastTick = 0;
  state.loopHandle = null;
  state.coffeeAvailable = true;
  state.stressShieldUntil = 0;
  state.errors = 0;
  state.blockNotes = [];
  initializeTodo();
  updateTodoUI();
  typingInput.value = "";
  typingInput.disabled = true;
  typingPrompt.textContent = "";
  typingInstructions.textContent = "Waiting for the first memo to arrive.";
  typingFeedback.textContent = "";
  typingFeedback.className = "typing-feedback";
  sortingInstructions.textContent = "No documents queued.";
  documentPile.innerHTML = "";
  pileCount.textContent = "0";
  phoneAlert.hidden = true;
  coffeeButton.disabled = true;
  simulatorHelp.textContent = "File documents, type perfect memos, and answer calls before stress boils over.";
  updateUI();
}

function gameLoop(timestamp) {
  if (!state.active) {
    return;
  }
  if (state.lastTick === 0) {
    state.lastTick = timestamp;
  }
  const delta = timestamp - state.lastTick;
  state.lastTick = timestamp;
  state.blockRemainingMs = Math.max(0, state.blockRemainingMs - delta);
  const elapsed = WORK_BLOCK_MS - state.blockRemainingMs;
  const stage = difficultyStages.find((item) => elapsed <= item.until) ?? difficultyStages[difficultyStages.length - 1];

  if (timestamp >= state.nextTaskAt) {
    spawnTasks(stage, timestamp);
  }

  updateDocumentTimers(timestamp);
  updatePhoneTimer(timestamp);
  applyBackgroundStress(delta);
  updateUI();

  if (state.blockRemainingMs <= 0) {
    finishBlock(true, "Block complete — the boardroom is impressed.");
    return;
  }

  if (state.stress >= 100) {
    finishBlock(false, "Stress overload — take a breath and regroup.");
    return;
  }

  state.loopHandle = requestAnimationFrame(gameLoop);
}

function spawnTasks(stage, timestamp) {
  const interval = randomInRange(stage.intervalRange[0], stage.intervalRange[1]);
  state.nextTaskAt = timestamp + interval;

  const docsToSpawn = randomInt(stage.docRange[0], stage.docRange[1]);
  for (let index = 0; index < docsToSpawn; index += 1) {
    spawnDocument(timestamp, index === 0);
  }

  if (!state.typingTask && Math.random() < stage.typingChance) {
    spawnMemo(timestamp);
  }

  if (!state.phone && Math.random() < stage.phoneChance) {
    triggerPhoneCall(timestamp);
  }
}

function spawnMemo(timestamp) {
  const memo = pickWeightedMemo();
  state.typingTask = {
    ...memo,
    startedAt: timestamp,
    prevLength: 0,
    correctLength: 0,
  };
  state.typingStartedAt = timestamp;
  typingPrompt.textContent = memo.text;
  typingInstructions.textContent = `${memo.title} ready — type it exactly.`;
  typingInput.value = "";
  typingInput.focus();
  typingFeedback.textContent = "";
  typingFeedback.className = "typing-feedback";
  setTodoState(memo.todoId, "active");
}

function pickWeightedMemo() {
  const totalWeight = MEMO_LIBRARY.reduce((sum, memo) => sum + (memo.accuracyWeight ?? 1), 0);
  const roll = Math.random() * totalWeight;
  let accumulator = 0;
  for (const memo of MEMO_LIBRARY) {
    accumulator += memo.accuracyWeight ?? 1;
    if (roll <= accumulator) {
      return memo;
    }
  }
  return MEMO_LIBRARY[MEMO_LIBRARY.length - 1];
}

function spawnDocument(timestamp, markTodo) {
  const template = DOCUMENT_LIBRARY[Math.floor(Math.random() * DOCUMENT_LIBRARY.length)];
  const variance = randomInRange(-1_200, 1_200);
  const deadline = timestamp + Math.max(6_000, template.baseDeadline + variance);
  const document = {
    id: `${template.id}-${timestamp}-${Math.random().toString(16).slice(2, 6)}`,
    templateId: template.id,
    title: template.title,
    folder: template.folder,
    owner: template.owner,
    folderLabel: FOLDER_LABELS[template.folder] ?? "Archive",
    createdAt: timestamp,
    deadline,
    warned: false,
    overdue: false,
    todoId: template.todoId,
  };
  state.documentQueue.push(document);
  if (markTodo && template.todoId) {
    setTodoState(template.todoId, "active");
  }
  sortingInstructions.textContent = `Top document: ${document.title} → ${document.folderLabel}.`;
}

function triggerPhoneCall(timestamp) {
  state.phone = {
    createdAt: timestamp,
  };
  state.phoneDeadline = timestamp + 3_500;
  phoneAlert.hidden = false;
  phoneTimer.textContent = "3.5s";
  simulatorHelp.textContent = "Phone ringing — answer before stress spikes!";
  playTone({ frequency: 520, duration: 0.25, type: "square" });
}

function updatePhoneTimer(timestamp) {
  if (!state.phone) {
    return;
  }
  const remaining = Math.max(0, state.phoneDeadline - timestamp);
  phoneTimer.textContent = `${(remaining / 1000).toFixed(1)}s`;
  if (remaining <= 0) {
    resolvePhoneCall(false);
  }
}

function resolvePhoneCall(answered) {
  if (!state.phone) {
    return;
  }
  if (answered) {
    state.efficiency += 45;
    state.blockNotes.push("+45 Efficiency from prompt phone handling");
    simulatorHelp.textContent = "Call patched through — back to the paperwork.";
    playPerfectChime();
  } else {
    registerError("Missed call! Stress surged.", 14);
  }
  state.phone = null;
  phoneAlert.hidden = true;
}

function applyBackgroundStress(deltaMs) {
  if (!state.active) {
    return;
  }
  const now = performance.now();
  if (now < state.stressShieldUntil) {
    return;
  }
  const pilePressure = state.documentQueue.length * 0.012 * (deltaMs / 16.67);
  state.stress = Math.min(100, state.stress + pilePressure);
}

function updateDocumentTimers(timestamp) {
  let earliest = null;
  state.documentQueue.forEach((doc) => {
    const timeLeft = doc.deadline - timestamp;
    if (timeLeft <= 0 && !doc.overdue) {
      doc.overdue = true;
      registerError(`${doc.title} expired on the blotter!`, 12);
    } else if (timeLeft <= 3_000 && !doc.warned) {
      doc.warned = true;
      simulatorHelp.textContent = `${doc.title} is seconds from blowing up — file it!`;
      particleField?.burst?.({
        x: 0.2 + Math.random() * 0.4,
        y: 0.7,
        colors: ["#f97316", "#ef4444"],
      });
    }
    if (earliest === null || doc.deadline < earliest.deadline) {
      earliest = doc;
    }
  });
  if (earliest) {
    sortingInstructions.textContent = `Top document: ${earliest.title} → ${earliest.folderLabel}.`;
  } else if (state.active) {
    sortingInstructions.textContent = "Courier tray clear. Breathe.";
  }
}

function fileTopDocument(folder) {
  if (state.documentQueue.length === 0) {
    simulatorHelp.textContent = "No documents waiting — prep for the next drop.";
    return;
  }
  const doc = state.documentQueue.shift();
  if (doc.folder === folder) {
    const now = performance.now();
    const speedBonus = Math.max(0, Math.round((doc.deadline - now) / 500));
    const points = 55 + speedBonus;
    state.efficiency += points;
    state.documentsFiled += 1;
    state.blockNotes.push(`Filed ${doc.title} (+${points})`);
    setTodoState(doc.todoId, "complete");
    simulatorHelp.textContent = `${doc.title} filed. Keep the pile under control.`;
    particleField?.burst?.({
      x: 0.1 + Math.random() * 0.3,
      y: 0.65,
      colors: ["#fcd34d", "#22d3ee"],
    });
  } else {
    registerError(`${doc.title} misfiled — it belongs in ${FOLDER_LABELS[doc.folder]}.`, 10);
    state.documentQueue.unshift(doc);
    updateDocumentList();
    return;
  }
  updateDocumentList();
}

function updateDocumentList() {
  documentPile.innerHTML = "";
  const now = performance.now();
  state.documentQueue.forEach((doc) => {
    const card = document.createElement("article");
    card.className = "document-card";
    if (doc.deadline - now <= 3_000) {
      card.classList.add("is-urgent");
    }
    card.dataset.folderLabel = doc.folderLabel;
    const seconds = Math.max(0, Math.ceil((doc.deadline - now) / 1000));
    card.innerHTML = `
      <p class="document-title">${doc.title}</p>
      <div class="document-meta">
        <span>${doc.owner}</span>
        <span>${seconds}s</span>
      </div>
    `;
    documentPile.append(card);
  });
  pileCount.textContent = String(state.documentQueue.length);
}

function handleTypingInput() {
  if (!state.typingTask) {
    typingInput.value = "";
    return;
  }
  const memo = state.typingTask;
  const value = typingInput.value;
  const target = memo.text;
  const previousLength = memo.prevLength ?? 0;
  const delta = value.length - previousLength;
  if (delta > 0) {
    state.totalTypedChars += delta;
  }
  memo.prevLength = value.length;

  if (!target.startsWith(value)) {
    registerError("Typing error — reset to fix the memo!", 6);
    typingFeedback.textContent = "ERROR — backspace and correct the line.";
    typingFeedback.className = "typing-feedback is-bad";
    playErrorThunk();
    return;
  }

  playKeyClick();
  const correctDelta = Math.max(0, value.length - (memo.correctLength ?? 0));
  state.correctTypedChars += correctDelta;
  memo.correctLength = value.length;

  if (value.length === target.length) {
    completeMemo();
  } else {
    typingFeedback.textContent = `${value.length}/${target.length} characters matched.`;
    typingFeedback.className = "typing-feedback is-warning";
  }
}

function completeMemo() {
  const memo = state.typingTask;
  const now = performance.now();
  const duration = Math.max(1, now - memo.startedAt);
  const accuracy = calculateAccuracy();
  const basePoints = 120;
  const speedBonus = Math.max(0, Math.round((memo.text.length / duration) * 4_500));
  const total = Math.round(basePoints + speedBonus * accuracy);
  state.efficiency += total;
  state.memoHistory.push({ title: memo.title, points: total, accuracy });
  state.blockNotes.push(`Typed ${memo.title} (+${total})`);
  typingInstructions.textContent = "Memo delivered. Awaiting the next dictation.";
  typingFeedback.textContent = `Perfect! ${memo.title} delivered.`;
  typingFeedback.className = "typing-feedback is-good";
  typingPrompt.textContent = "";
  typingInput.value = "";
  state.typingTask = null;
  setTodoState(memo.todoId, "complete");
  playPerfectChime();
  particleField?.burst?.({
    x: 0.6 + Math.random() * 0.25,
    y: 0.3,
    colors: ["#22d3ee", "#fcd34d", "#fb7185"],
  });
}

function calculateAccuracy() {
  if (state.totalTypedChars === 0) {
    return 1;
  }
  return Math.min(1, state.correctTypedChars / state.totalTypedChars);
}

function registerError(message, stressAmount) {
  state.errors += 1;
  simulatorHelp.textContent = message;
  state.blockNotes.push(`⚠ ${message}`);
  if (performance.now() >= state.stressShieldUntil) {
    state.stress = Math.min(100, state.stress + stressAmount);
  }
  playErrorThunk();
}

function handleCoffeeBreak() {
  if (!state.active || !state.coffeeAvailable) {
    return;
  }
  state.coffeeAvailable = false;
  coffeeButton.disabled = true;
  state.documentQueue = [];
  updateDocumentList();
  state.stressShieldUntil = performance.now() + 5_000;
  state.efficiency = Math.max(0, state.efficiency - 120);
  state.blockNotes.push("Coffee break — cleared pile but -120 Efficiency");
  simulatorHelp.textContent = "Coffee break! Desk cleared, stress paused for five seconds.";
}

function applyStressDecay() {
  if (!state.active) {
    return;
  }
  if (performance.now() < state.stressShieldUntil) {
    state.stress = Math.max(0, state.stress - 0.08);
  }
}

function updateUI() {
  efficiencyValue.textContent = Math.round(Math.max(0, state.efficiency));
  stressValue.textContent = `${Math.round(state.stress)}%`;
  stressMeter.setAttribute("aria-valuenow", `${Math.round(state.stress)}`);
  stressFill.style.width = `${Math.min(100, state.stress)}%`;
  timerValue.textContent = formatTimer(state.blockRemainingMs);
  updateDocumentList();
  updateTodoUI();
  applyStressDecay();
}

function updateTodoUI() {
  state.todo.forEach((item) => {
    if (item.state === "pending") {
      item.element.classList.remove("is-active", "is-complete");
      item.statusElement.textContent = "•";
    } else if (item.state === "active") {
      item.element.classList.add("is-active");
      item.element.classList.remove("is-complete");
      item.statusElement.textContent = "▶";
    } else if (item.state === "complete") {
      item.element.classList.remove("is-active");
      item.element.classList.add("is-complete");
      item.statusElement.textContent = "✓";
    }
  });
}

function setTodoState(todoId, newState) {
  if (!todoId) {
    return;
  }
  const todoItem = state.todo.find((item) => item.id === todoId);
  if (!todoItem) {
    return;
  }
  if (todoItem.state === "complete") {
    return;
  }
  todoItem.state = newState;
  updateTodoUI();
}

function finishBlock(success, message) {
  state.active = false;
  clearAnimationLoop();
  typingInput.disabled = true;
  coffeeButton.disabled = true;
  phoneAlert.hidden = true;
  simulatorHelp.textContent = message;
  const accuracy = calculateAccuracy();
  wrapupEfficiency.textContent = Math.round(Math.max(0, state.efficiency));
  wrapupAccuracy.textContent = `${Math.round(accuracy * 100)}%`;
  wrapupDocs.textContent = `${state.documentsFiled}`;
  wrapupSubtitle.textContent = message;
  renderWrapupNotes();
  wrapupElement.hidden = false;
  wrapupDialog?.focus?.();
  if (success) {
    highScore.submit(Math.round(Math.max(0, state.efficiency)), {
      accuracy: Math.round(accuracy * 100),
      documents: state.documentsFiled,
      errors: state.errors,
    });
    particleField?.burst?.({
      x: 0.5,
      y: 0.4,
      colors: ["#22d3ee", "#fcd34d", "#34d399"],
    });
  }
}

function renderWrapupNotes() {
  if (!state.blockNotes.length) {
    wrapupNotes.textContent = "Keep balancing typing precision with filing speed to climb the leaderboard.";
    return;
  }
  const list = document.createElement("ul");
  list.className = "wrapup-list";
  state.blockNotes.slice(-6).forEach((note) => {
    const item = document.createElement("li");
    item.textContent = note;
    list.append(item);
  });
  wrapupNotes.innerHTML = "";
  wrapupNotes.append(list);
}

function hideWrapup() {
  wrapupElement.hidden = true;
}

function clearAnimationLoop() {
  if (state.loopHandle) {
    cancelAnimationFrame(state.loopHandle);
    state.loopHandle = null;
  }
}

function updateDocumentPileStats() {
  pileCount.textContent = String(state.documentQueue.length);
}

function formatTimer(milliseconds) {
  const safe = Math.max(0, Math.round(milliseconds / 1000));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}

function randomInt(min, max) {
  const lower = Math.ceil(min);
  const upper = Math.floor(max);
  return Math.floor(Math.random() * (upper - lower + 1)) + lower;
}

updateDocumentPileStats();
