import { initHighScoreBanner } from "../arcade-scores.js";
import { getScoreConfig } from "../score-config.js";
import { mountParticleField } from "../particles.js";
import { autoEnhanceFeedback, createStatusChannel, createLogChannel } from "../feedback.js";

const SHIFT_DURATION = 180;
const GOSSIP_FREEZE = 5;
const GOSSIP_PENALTY_CHANCE = 0.45;
const INITIAL_SPAWN_DELAY = 1.8;

const TOOLS = [
  {
    id: "wash",
    label: "Shampoo",
    ticketLabel: "Shampoo & rinse",
    icon: "🫧",
    hotkey: "Q",
    pulseClass: "is-spray",
  },
  {
    id: "cut",
    label: "Scissors",
    ticketLabel: "Precision snip",
    icon: "✂️",
    hotkey: "W",
    pulseClass: "is-snip",
  },
  {
    id: "tease",
    label: "Tease",
    ticketLabel: "Tease & lift",
    icon: "🎀",
    hotkey: "E",
    pulseClass: "is-spray",
  },
  {
    id: "spray",
    label: "Hairspray",
    ticketLabel: "Seal with spray",
    icon: "💨",
    hotkey: "A",
    pulseClass: "is-spray",
  },
  {
    id: "powder",
    label: "Powder",
    ticketLabel: "Powder pop",
    icon: "✨",
    hotkey: "S",
    pulseClass: "is-poof",
  },
  {
    id: "set",
    label: "Dryer Set",
    ticketLabel: "Dryer dome set",
    icon: "🌀",
    hotkey: "D",
    pulseClass: "is-spray",
  },
];

const TOOL_LOOKUP = new Map(TOOLS.map((tool) => [tool.id, tool]));
const TOOL_FROM_KEY = new Map(
  TOOLS.map((tool) => [tool.hotkey.toLowerCase(), tool.id]).concat(
    TOOLS.map((tool) => [tool.hotkey.toUpperCase(), tool.id]),
  ),
);

const STYLE_PATTERNS = [
  { name: "Sweet Tea Trim", steps: ["wash", "cut"] },
  { name: "Magnolia Tease", steps: ["wash", "tease", "spray"] },
  { name: "Pageant Beacon", steps: ["wash", "cut", "set"] },
  { name: "Bayou Bouffant", steps: ["wash", "tease", "powder", "spray"] },
  { name: "Moon Pie Glow", steps: ["powder", "spray"] },
  { name: "Rehearsal Radiance", steps: ["wash", "cut", "tease", "spray"] },
  { name: "Delta Dewdrop", steps: ["wash", "set", "spray"] },
  { name: "Courthouse Chic", steps: ["wash", "powder", "set"] },
  { name: "Gala Grandeur", steps: ["wash", "cut", "powder", "spray"] },
  { name: "Peach Parade", steps: ["wash", "tease", "set", "spray"] },
];

const CLIENT_NAMES = [
  "Shelby",
  "M'Lynn",
  "Annelle",
  "Clairee",
  "Ouiser",
  "Truvy",
  "Nita",
  "Darcy",
  "Loretta",
  "Birdie",
  "Faye",
  "Jolene",
  "Maybelle",
  "Charisse",
  "Ginger",
  "Luanne",
  "Edna",
  "Lorelai",
  "Francine",
  "Pearl",
];

const DIFFICULTY = [
  {
    label: "Calm",
    maxActive: 1,
    minSteps: 2,
    maxSteps: 2,
    decay: 4.2,
  },
  {
    label: "Buzzing",
    maxActive: 2,
    minSteps: 2,
    maxSteps: 3,
    decay: 5.4,
  },
  {
    label: "On Fire",
    maxActive: 3,
    minSteps: 3,
    maxSteps: 4,
    decay: 6.6,
  },
];

const particleField = mountParticleField({
  colors: ["#f472b6", "#fde68a", "#c4b5fd", "#93c5fd"],
  effects: {
    palette: ["#f472b6", "#f9a8d4", "#facc15", "#fde68a"],
    ambientDensity: 0.25,
  },
});

autoEnhanceFeedback();

const scoreConfig = getScoreConfig("truvys-salon-style");
const highScore = initHighScoreBanner({
  gameId: "truvys-salon-style",
  label: scoreConfig.label,
  format: scoreConfig.format,
  emptyText: scoreConfig.empty,
});

const openButton = document.getElementById("open-shift");
const pauseButton = document.getElementById("pause-shift");
const resetButton = document.getElementById("reset-shift");
const tipJarValue = document.getElementById("tip-jar");
const perfectNote = document.getElementById("perfect-note");
const shiftClock = document.getElementById("shift-clock");
const clientsServedNote = document.getElementById("clients-served");
const heatMeter = document.getElementById("heat-meter");
const heatFill = document.getElementById("heat-fill");
const queueHeat = document.getElementById("queue-heat");
const clientList = document.getElementById("client-list");
const ticketClient = document.getElementById("ticket-client");
const ticketStyle = document.getElementById("ticket-style");
const ticketSteps = document.getElementById("ticket-steps");
const ticketPatience = document.getElementById("ticket-patience");
const toolGrid = document.getElementById("tool-grid");
const statusStrip = document.getElementById("status-strip");
const eventLog = document.getElementById("event-log");
const gossipZone = document.getElementById("gossip-zone");
const gossipMessage = document.getElementById("gossip-message");
const gossipAccept = document.getElementById("gossip-accept");
const gossipDecline = document.getElementById("gossip-decline");
const wrapUp = document.getElementById("wrap-up");
const wrapTip = document.getElementById("wrap-tip-total");
const wrapClients = document.getElementById("wrap-clients");
const wrapStorms = document.getElementById("wrap-storms");
const wrapPerfects = document.getElementById("wrap-perfects");
const wrapNote = document.getElementById("wrap-note");
const wrapReplay = document.getElementById("wrap-replay");
const wrapClose = document.getElementById("wrap-close");

const statusChannel = createStatusChannel(statusStrip);
const logChannel = createLogChannel(eventLog, { limit: 40 });

const toolButtons = new Map();

const state = {
  running: false,
  paused: false,
  tipJar: 0,
  perfects: 0,
  served: 0,
  storms: 0,
  totalMistakes: 0,
  shiftRemaining: SHIFT_DURATION,
  lastFrame: performance.now(),
  clients: [],
  nextClientId: 1,
  selectedClientId: null,
  spawnCooldown: INITIAL_SPAWN_DELAY,
  gossipCooldown: randomRange(12, 20),
  gossipTimer: 0,
  gossipFrozen: false,
  sabotagePending: false,
  queueHeat: 0,
  queueHeatLabel: "Calm",
};

const audio = createSalonAudio();

setupTools();
resetShift(false);
requestAnimationFrame(tick);

openButton.addEventListener("click", () => {
  if (!state.running) {
    startShift();
  }
});

pauseButton.addEventListener("click", () => {
  if (!state.running) {
    return;
  }
  if (state.paused) {
    resumeShift();
  } else {
    pauseShift();
  }
});

resetButton.addEventListener("click", () => {
  logChannel.push("Shift reset. The dryers go quiet.", "warning");
  statusChannel("You closed early and reset the floor.", "warning");
  resetShift(true);
});

gossipAccept.addEventListener("click", () => {
  if (!state.gossipFrozen && state.gossipTimer <= 0) {
    triggerGossip();
  }
});

gossipDecline.addEventListener("click", () => {
  logChannel.push("You waved the gossip away. Timers keep ticking.", "info");
  statusChannel("Stayed focused on the ticket.", "info");
  hideGossip();
  state.gossipCooldown = randomRange(10, 18);
});

wrapReplay.addEventListener("click", () => {
  hideWrapUp();
  startShift();
});

wrapClose.addEventListener("click", () => {
  hideWrapUp();
  resetShift(false);
});

window.addEventListener("keydown", (event) => {
  if (wrapUp.hidden === false) {
    return;
  }
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
    return;
  }
  if (event.key === "p" || event.key === "P") {
    if (state.running) {
      event.preventDefault();
      if (state.paused) {
        resumeShift();
      } else {
        pauseShift();
      }
    }
  } else if (event.key === "r" || event.key === "R") {
    event.preventDefault();
    logChannel.push("Manual reset triggered. Fresh towels out.", "warning");
    statusChannel("You called the shift early.", "warning");
    resetShift(true);
  } else if (["1", "2", "3"].includes(event.key)) {
    const index = Number(event.key) - 1;
    const client = state.clients[index];
    if (client) {
      selectClient(client.id);
    }
  } else {
    const toolId = TOOL_FROM_KEY.get(event.key);
    if (toolId) {
      event.preventDefault();
      handleTool(toolId, "hotkey");
    }
  }
});

function setupTools() {
  toolGrid.innerHTML = "";
  TOOLS.forEach((tool) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tool-button";
    button.dataset.tool = tool.id;
    button.dataset.toolState = "locked";
    button.innerHTML = `
      <span class="tool-icon" aria-hidden="true">${tool.icon}</span>
      <span class="tool-label">${tool.label}</span>
      <span class="tool-hotkey">Hotkey: ${tool.hotkey}</span>
    `;
    button.addEventListener("click", () => handleTool(tool.id, "click"));
    toolGrid.append(button);
    toolButtons.set(tool.id, button);
  });
}

function startShift() {
  resetShift(false);
  audio.unlock();
  state.running = true;
  state.paused = false;
  openButton.disabled = true;
  pauseButton.disabled = false;
  pauseButton.textContent = "Pause Shift";
  statusChannel("Doors open. First client just stepped in.", "success");
  logChannel.push("Truvy flipped the sign to OPEN.", "info");
  spawnClient();
}

function resetShift(logIt) {
  state.running = false;
  state.paused = false;
  state.tipJar = 0;
  state.perfects = 0;
  state.served = 0;
  state.storms = 0;
  state.totalMistakes = 0;
  state.shiftRemaining = SHIFT_DURATION;
  state.lastFrame = performance.now();
  state.clients.forEach((client) => removeClientDom(client));
  state.clients = [];
  state.nextClientId = 1;
  state.selectedClientId = null;
  state.spawnCooldown = INITIAL_SPAWN_DELAY;
  state.gossipCooldown = randomRange(12, 20);
  state.gossipTimer = 0;
  state.gossipFrozen = false;
  state.sabotagePending = false;
  state.queueHeat = 0;
  state.queueHeatLabel = "Calm";
  hideGossip();
  updateHud();
  renderTicket();
  openButton.disabled = false;
  pauseButton.disabled = true;
  pauseButton.textContent = "Pause Shift";
  toolButtons.forEach((button) => {
    button.dataset.toolState = "locked";
  });
  if (!logIt) {
    statusChannel("Waiting to open the salon.", "info");
  }
}

function pauseShift() {
  state.paused = true;
  pauseButton.textContent = "Resume Shift";
  statusChannel("Shift paused. Patience meters hold steady.", "info");
}

function resumeShift() {
  if (!state.running) {
    return;
  }
  state.paused = false;
  state.lastFrame = performance.now();
  pauseButton.textContent = "Pause Shift";
  statusChannel("Back to styling!", "success");
}

function tick(now) {
  const delta = (now - state.lastFrame) / 1000;
  state.lastFrame = now;

  if (state.running && !state.paused) {
    state.shiftRemaining = Math.max(0, state.shiftRemaining - delta);
    if (state.shiftRemaining <= 0) {
      finishShift();
    }

    if (state.gossipTimer > 0) {
      state.gossipTimer = Math.max(0, state.gossipTimer - delta);
      gossipMessage.textContent = `Gossip freeze: ${state.gossipTimer.toFixed(1)}s left.`;
      if (state.gossipTimer === 0) {
        endGossipFreeze();
      }
    }

    if (!state.gossipFrozen) {
      updateClients(delta);
    }

    if (state.spawnCooldown > 0) {
      state.spawnCooldown = Math.max(0, state.spawnCooldown - delta);
    }

    const tier = getDifficultyTier();
    if (state.spawnCooldown === 0 && state.clients.length < tier.maxActive) {
      spawnClient();
    }

    if (state.gossipTimer <= 0 && !state.gossipFrozen) {
      state.gossipCooldown = Math.max(0, state.gossipCooldown - delta);
      if (state.gossipCooldown === 0) {
        offerGossip();
      }
    }

    updateQueueHeat();
  }

  updateHud();
  updateTicketPatience();
  requestAnimationFrame(tick);
}

function updateClients(delta) {
  state.clients.forEach((client) => {
    if (client.status !== "active") {
      return;
    }
    client.patience = Math.max(0, client.patience - client.decay * delta);
    if (client.patience === 0) {
      stormOut(client, "Patience ran dry!");
    }
  });
  updateClientDisplays();
}

function updateClientDisplays() {
  state.clients.forEach((client, index) => {
    const dom = client.dom;
    if (!dom) {
      return;
    }
    const pct = Math.max(0, Math.min(100, client.patience));
    dom.fill.style.width = `${pct}%`;
    dom.meter.setAttribute("aria-valuenow", pct.toFixed(0));
    dom.patienceValue.textContent = `${pct.toFixed(0)}%`; 
    dom.card.classList.toggle("is-critical", pct <= 25);
    dom.card.classList.toggle("is-selected", client.id === state.selectedClientId);
    dom.card.dataset.queueIndex = index + 1;

    const nextStep = client.steps[client.currentStep];
    if (nextStep) {
      const tool = TOOL_LOOKUP.get(nextStep.tool);
      dom.nextStep.textContent = `Next: ${tool?.label ?? nextStep.tool} (${tool?.hotkey ?? ""})`;
    } else {
      dom.nextStep.textContent = "Ticket complete";
    }
  });
}

function handleTool(toolId, source) {
  if (!state.running || state.paused) {
    statusChannel("Open the salon before styling.", "warning");
    return;
  }
  const client = getSelectedClient();
  if (!client) {
    statusChannel("Pick a chair before grabbing a tool.", "warning");
    return;
  }
  if (client.status !== "active") {
    statusChannel("That client is already wrapped.", "info");
    return;
  }

  const tool = TOOL_LOOKUP.get(toolId);
  if (!tool) {
    return;
  }

  audio.play(toolId);
  pulseClientCard(client, tool.pulseClass);

  const step = client.steps[client.currentStep];
  const forcedError = state.sabotagePending;
  let success = false;

  if (!step) {
    success = false;
  } else if (forcedError) {
    success = false;
  } else {
    success = step.tool === toolId;
  }

  if (state.sabotagePending) {
    state.sabotagePending = false;
    logChannel.push("That gossip spun you around—the move misfired!", "danger");
    statusChannel("Gossip distraction! The action slipped.", "danger");
  }

  if (success) {
    advanceStep(client);
  } else {
    const reason = forcedError ? "Distraction" : "Wrong tool";
    registerMistake(client, `${reason}! ${tool.label} wasn't next.`);
  }

  renderTicket();
}

function advanceStep(client) {
  const step = client.steps[client.currentStep];
  if (!step) {
    return;
  }
  step.status = "done";
  client.currentStep += 1;
  const nextStep = client.steps[client.currentStep];
  if (nextStep) {
    nextStep.status = "active";
    const tool = TOOL_LOOKUP.get(nextStep.tool);
    statusChannel(`${client.name} loved it. Next up: ${tool?.label ?? nextStep.tool}.`, "success");
    logChannel.push(`${client.name}: ${step.ticketLabel} complete.`, "success");
  } else {
    finishClient(client);
  }
}

function registerMistake(client, message) {
  client.mistakes += 1;
  client.perfect = false;
  state.totalMistakes += 1;
  client.errorUntil = performance.now() + 900;
  client.patience = Math.max(0, client.patience - 25);
  pulseClientCard(client, "is-upset");
  statusChannel(message, "warning");
  logChannel.push(`${client.name} winced. Patience dropped!`, "warning");
  if (client.patience === 0) {
    stormOut(client, "Too many mistakes!");
  }
}

function finishClient(client) {
  client.status = "finished";
  state.served += 1;
  const baseTip = 6 * client.steps.length;
  const speedBonus = Math.round(client.patience * 0.4);
  const perfectBonus = client.mistakes === 0 ? 10 : 0;
  const totalTip = baseTip + speedBonus + perfectBonus;
  state.tipJar += totalTip;
  if (client.mistakes === 0) {
    state.perfects += 1;
  }
  pulseClientCard(client, "is-happy");
  statusChannel(
    `${client.name} left sparkling! +$${totalTip} in tips.`,
    "success",
  );
  logChannel.push(
    `${client.name} paid $${totalTip}. ${client.mistakes === 0 ? "Perfect service!" : "A little frizz, but still smiling."}`,
    client.mistakes === 0 ? "success" : "info",
  );
  removeClient(client);
}

function stormOut(client, reason) {
  if (client.status === "stormed") {
    return;
  }
  client.status = "stormed";
  state.storms += 1;
  const penalty = Math.min(state.tipJar, 12);
  state.tipJar = Math.max(0, state.tipJar - penalty);
  pulseClientCard(client, "is-upset");
  statusChannel(`${client.name} stormed out! -$${penalty} penalty.`, "danger");
  logChannel.push(`${client.name} left furious. Lost $${penalty}.`, "danger");
  removeClient(client);
}

function removeClient(client) {
  const index = state.clients.findIndex((entry) => entry.id === client.id);
  if (index >= 0) {
    removeClientDom(state.clients[index]);
    state.clients.splice(index, 1);
  }
  if (state.selectedClientId === client.id) {
    const fallback = state.clients[0];
    state.selectedClientId = fallback ? fallback.id : null;
  }
  renderTicket();
  state.spawnCooldown = randomRange(2.5, 4.5);
}

function removeClientDom(client) {
  if (client.dom?.item) {
    client.dom.item.remove();
  }
}

function spawnClient() {
  const tier = getDifficultyTier();
  const styles = STYLE_PATTERNS.filter(
    (style) => style.steps.length >= tier.minSteps && style.steps.length <= tier.maxSteps,
  );
  const blueprint = styles.length > 0 ? randomItem(styles) : randomItem(STYLE_PATTERNS);
  const client = {
    id: state.nextClientId++,
    name: randomItem(CLIENT_NAMES),
    style: blueprint.name,
    steps: blueprint.steps.map((toolId) => {
      const tool = TOOL_LOOKUP.get(toolId);
      return {
        tool: toolId,
        ticketLabel: tool?.ticketLabel ?? toolId,
        status: "pending",
      };
    }),
    currentStep: 0,
    patience: 100,
    decay: tier.decay + Math.random() * 1.1,
    mistakes: 0,
    perfect: true,
    status: "active",
    errorUntil: 0,
    dom: null,
  };
  if (client.steps[0]) {
    client.steps[0].status = "active";
  }
  state.clients.push(client);
  attachClientDom(client);
  if (!state.selectedClientId) {
    state.selectedClientId = client.id;
  }
  statusChannel(`${client.name} wants the ${client.style}.`, "info");
  logChannel.push(`${client.name} sat down for a ${client.style}.`, "info");
  state.spawnCooldown = randomRange(6, 9);
  updateClientDisplays();
  renderTicket();
  toolButtons.forEach((button) => {
    button.dataset.toolState = "ready";
  });
}

function attachClientDom(client) {
  const item = document.createElement("li");
  const card = document.createElement("button");
  card.type = "button";
  card.className = "client-card";
  card.dataset.clientId = String(client.id);
  card.innerHTML = `
    <div class="client-avatar" aria-hidden="true"></div>
    <div class="client-info">
      <p class="client-name">${client.name}</p>
      <p class="client-style">${client.style}</p>
      <p class="client-next-step">Preparing ticket...</p>
      <div class="patience-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100">
        <div class="patience-fill"></div>
      </div>
      <p class="client-patience-value" aria-live="off">100%</p>
    </div>
  `;
  card.addEventListener("click", () => selectClient(client.id));
  item.append(card);
  clientList.append(item);
  client.dom = {
    item,
    card,
    meter: card.querySelector(".patience-meter"),
    fill: card.querySelector(".patience-fill"),
    nextStep: card.querySelector(".client-next-step"),
    patienceValue: card.querySelector(".client-patience-value"),
  };
}

function selectClient(clientId) {
  state.selectedClientId = clientId;
  updateClientDisplays();
  renderTicket();
}

function getSelectedClient() {
  return state.clients.find((client) => client.id === state.selectedClientId);
}

function renderTicket() {
  const client = getSelectedClient();
  if (!client) {
    ticketClient.textContent = "No client selected.";
    ticketStyle.textContent = "";
    ticketSteps.innerHTML = "";
    ticketPatience.textContent = "";
    return;
  }
  ticketClient.textContent = client.name;
  ticketStyle.textContent = `Request: ${client.style}`;
  ticketSteps.innerHTML = "";
  client.steps.forEach((step, index) => {
    const li = document.createElement("li");
    let status = step.status;
    if (status === "pending" && index === client.currentStep) {
      status = "active";
    }
    if (step.status !== "done" && performance.now() < client.errorUntil) {
      status = "error";
    }
    li.dataset.status = status;
    const tool = TOOL_LOOKUP.get(step.tool);
    const hotkey = tool?.hotkey ?? "";
    li.innerHTML = `
      <span class="ticket-step-label">${step.ticketLabel}</span>
      <span class="ticket-step-hotkey">${hotkey}</span>
    `;
    ticketSteps.append(li);
  });
  ticketPatience.textContent = `Patience: ${client.patience.toFixed(0)}%`;
}

function updateTicketPatience() {
  const client = getSelectedClient();
  if (!client) {
    return;
  }
  ticketPatience.textContent = `Patience: ${client.patience.toFixed(0)}%`;
}

function updateHud() {
  tipJarValue.textContent = `$${state.tipJar}`;
  perfectNote.textContent = state.perfects > 0 ? `${state.perfects} perfect service${state.perfects === 1 ? "" : "s"}.` : "No perfects yet.";
  shiftClock.textContent = formatTime(state.shiftRemaining);
  clientsServedNote.textContent = `${state.served} served · ${state.storms} storm-outs`;
  queueHeat.textContent = state.queueHeatLabel ?? "Calm";
  heatFill.style.width = `${state.queueHeat}%`;
  heatMeter.setAttribute("aria-valuenow", state.queueHeat.toFixed(0));
}

function updateQueueHeat() {
  const tier = getDifficultyTier();
  const load = state.clients.length / Math.max(1, tier.maxActive);
  const avgPatience =
    state.clients.reduce((sum, client) => sum + client.patience, 0) /
    Math.max(1, state.clients.length);
  const heat = Math.min(100, Math.round(load * 45 + (100 - avgPatience) * 0.6));
  state.queueHeat = heat;
  if (heat < 30) {
    state.queueHeatLabel = "Calm";
  } else if (heat < 65) {
    state.queueHeatLabel = "Buzzing";
  } else {
    state.queueHeatLabel = "On Fire";
  }
}

function finishShift() {
  state.running = false;
  state.paused = false;
  pauseButton.disabled = true;
  openButton.disabled = false;
  statusChannel("Shift complete! Tally those tips.", "success");
  logChannel.push("Doors closed. Counting the jar.", "info");
  showWrapUp();
  const meta = {
    clients: state.served,
    perfects: state.perfects,
    storms: state.storms,
  };
  highScore.submit(state.tipJar, meta);
}

function showWrapUp() {
  wrapTip.textContent = `$${state.tipJar}`;
  wrapClients.textContent = String(state.served);
  wrapStorms.textContent = String(state.storms);
  wrapPerfects.textContent = String(state.perfects);
  if (state.storms === 0 && state.served > 0) {
    wrapNote.textContent = "No one stormed out. Truvy would be proud.";
  } else if (state.perfects > 0) {
    wrapNote.textContent = "Those perfect runs boosted every bouquet budget.";
  } else if (state.served === 0) {
    wrapNote.textContent = "Open again to keep Magnolia's hair high.";
  } else {
    wrapNote.textContent = "A little hairspray and you can bounce back next shift.";
  }
  wrapUp.hidden = false;
  wrapUp.focus();
}

function hideWrapUp() {
  wrapUp.hidden = true;
}

function offerGossip() {
  state.gossipCooldown = randomRange(28, 38);
  gossipZone.hidden = false;
  gossipMessage.textContent = "Hot gossip from Drum's cousin! Freeze timers for 5 seconds?";
}

function hideGossip() {
  gossipZone.hidden = true;
}

function triggerGossip() {
  state.gossipFrozen = true;
  state.gossipTimer = GOSSIP_FREEZE;
  state.sabotagePending = Math.random() < GOSSIP_PENALTY_CHANCE;
  gossipZone.hidden = false;
  gossipMessage.textContent = `Timers frozen! ${state.sabotagePending ? "But that tea might rattle you..." : "Plan your next moves."}`;
  statusChannel("Salon froze in the gossip glow.", "info");
  logChannel.push("Gossip huddle paused every timer.", "info");
}

function endGossipFreeze() {
  state.gossipFrozen = false;
  gossipZone.hidden = true;
  if (state.sabotagePending) {
    statusChannel("Distraction lingers—next action might slip!", "warning");
  } else {
    statusChannel("Back to work, no harm done.", "success");
  }
}

function pulseClientCard(client, className) {
  if (!client.dom?.card || !className) {
    return;
  }
  const { card } = client.dom;
  card.classList.remove(className);
  void card.offsetWidth;
  card.classList.add(className);
  if (className === "is-happy" || className === "is-upset") {
    window.setTimeout(() => {
      card.classList.remove(className);
    }, 900);
  }
}

function getDifficultyTier() {
  if (state.served >= 10) {
    return DIFFICULTY[2];
  }
  if (state.served >= 4) {
    return DIFFICULTY[1];
  }
  return DIFFICULTY[0];
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function createSalonAudio() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    return {
      unlock() {},
      play() {},
    };
  }
  const context = new AudioContext();
  const master = context.createGain();
  master.gain.value = 0.3;
  master.connect(context.destination);

  function ensure() {
    if (context.state === "suspended") {
      context.resume();
    }
  }

  function playSnip() {
    const now = context.currentTime;
    for (let i = 0; i < 2; i += 1) {
      const osc = context.createOscillator();
      osc.type = "triangle";
      const gain = context.createGain();
      gain.gain.setValueAtTime(0, now + i * 0.06);
      gain.gain.linearRampToValueAtTime(0.45, now + i * 0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.06 + 0.12);
      osc.frequency.setValueAtTime(1800, now + i * 0.06);
      osc.frequency.exponentialRampToValueAtTime(600, now + i * 0.06 + 0.12);
      osc.connect(gain).connect(master);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.16);
    }
  }

  function playNoise(duration, color = "white") {
    const sampleCount = Math.floor(context.sampleRate * duration);
    const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < sampleCount; i += 1) {
      let value = Math.random() * 2 - 1;
      if (color === "pink") {
        value = last + 0.02 * (Math.random() * 2 - 1);
        last = value;
      }
      data[i] = value;
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.linearRampToValueAtTime(0.4, context.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    source.connect(gain).connect(master);
    source.start();
    source.stop(context.currentTime + duration + 0.02);
  }

  function playWash() {
    playNoise(0.35, "pink");
  }

  function playTease() {
    const now = context.currentTime;
    const osc = context.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.linearRampToValueAtTime(760, now + 0.15);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain).connect(master);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  function playSpray() {
    playNoise(0.4, "white");
  }

  function playPowder() {
    playNoise(0.25, "pink");
  }

  function playSet() {
    const now = context.currentTime;
    const osc = context.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(120, now);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.002, now + 0.6);
    osc.connect(gain).connect(master);
    osc.start(now);
    osc.stop(now + 0.65);
  }

  return {
    unlock() {
      ensure();
    },
    play(toolId) {
      ensure();
      switch (toolId) {
        case "cut":
          playSnip();
          break;
        case "wash":
          playWash();
          break;
        case "tease":
          playTease();
          break;
        case "spray":
          playSpray();
          break;
        case "powder":
          playPowder();
          break;
        case "set":
          playSet();
          break;
        default:
          playSpray();
      }
    },
  };
}
