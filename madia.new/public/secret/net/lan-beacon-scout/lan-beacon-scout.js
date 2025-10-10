import { initFullscreenToggle } from "../fullscreen.js";

initFullscreenToggle();

const rounds = [
  {
    id: "newsroom",
    name: "Newsroom Spine",
    cidr: "192.168.10.0/24",
    briefing:
      "Cube farm NICs took a voltage dip. Hit the all-ones host address and rely on broadcast name chatter to coax them back.",
    hint: "Desksets live on a /24. Think 255.",
    broadcast: "192.168.10.255",
    options: ["192.168.10.254", "192.168.10.255", "192.168.11.255"],
    method: "netbios",
    devices: ["ANCHOR-DESK", "EDIT-SUITE-03", "WIRECOPY-NODE"],
    baseScore: 90,
    penalty: 15,
  },
  {
    id: "engineering",
    name: "Engineering Lab",
    cidr: "172.16.8.0/26",
    briefing:
      "Prototype rigs are running a tight /26. They talk fast UDP for their diagnostics channel; flood the right block to wake them.",
    hint: "Fourth subnet of 172.16.8.0 with /26 mask. Broadcast ends in .63.",
    broadcast: "172.16.8.63",
    options: ["172.16.8.63", "172.16.8.127", "172.16.8.95"],
    method: "udp",
    devices: ["PCB-LASER", "SILICON-CAGE", "PLOTTER-CTRL"],
    baseScore: 100,
    penalty: 20,
  },
  {
    id: "archives",
    name: "Archive Annex",
    cidr: "10.0.5.128/27",
    briefing:
      "Tape robots idle on an odd /27. They only trust ARP refreshes from the wiring closet after hours.",
    hint: "/27 broadcast holds the top 5 bits. Expect .159.",
    broadcast: "10.0.5.159",
    options: ["10.0.5.159", "10.0.5.191", "10.0.5.143"],
    method: "arp",
    devices: ["TAPE-JOCKEY", "INDEXER", "RESTORE-GATE"],
    baseScore: 110,
    penalty: 25,
  },
];

const TOTAL_ROUNDS = rounds.length;
const integrityDisplay = document.getElementById("integrity-display");
const integrityFill = document.getElementById("integrity-fill");
const scoreDisplay = document.getElementById("score-display");
const roundDisplay = document.getElementById("round-display");
const statusBoard = document.getElementById("status-board");
const form = document.getElementById("sweep-form");
const briefingCopy = document.getElementById("briefing-copy");
const broadcastSelect = document.getElementById("broadcast-select");
const broadcastHint = document.getElementById("broadcast-hint");
const logList = document.getElementById("log-list");
const mapCards = new Map(
  Array.from(document.querySelectorAll(".map-card")).map((card) => [card.dataset.zone, card])
);

const METHOD_DISPLAY = [
  { id: "arp", short: "ARP", label: "Quick ARP Probe" },
  { id: "udp", short: "UDP", label: "UDP Echo Spray" },
  { id: "netbios", short: "NB", label: "NetBIOS Name Pulse" },
];

const createHostBitScope = (round) => {
  if (!round.cidr) {
    return null;
  }
  const prefix = Number(round.cidr.split("/")[1]);
  if (!Number.isFinite(prefix)) {
    return null;
  }
  const broadcastOctets = round.broadcast.split(".").map(Number);
  const lastOctet = broadcastOctets[3] ?? 0;
  const binary = lastOctet.toString(2).padStart(8, "0");
  const networkBitsInOctet = Math.max(0, prefix - 24);
  const hostBits = Math.max(0, 8 - networkBitsInOctet);
  const hostPattern = binary.slice(networkBitsInOctet);

  const container = document.createElement("div");
  container.className = "clue-panel__bit-grid bit-grid";
  container.setAttribute(
    "aria-label",
    `Host bit scope shows ${hostBits} host bits active (${hostPattern.split("").join(" ")}) for broadcast ending .${broadcastOctets[3]}.`
  );

  const label = document.createElement("span");
  label.className = "bit-grid__label";
  label.textContent = "Host bit scope";
  container.appendChild(label);

  const lights = document.createElement("div");
  lights.className = "bit-grid__lights";

  binary.split("").forEach((bit, index) => {
    const cell = document.createElement("span");
    cell.className = "bit-light";
    cell.textContent = bit;
    if (index < networkBitsInOctet) {
      cell.classList.add("bit-light--network");
    } else {
      cell.classList.add("bit-light--host");
      if (bit === "1") {
        cell.classList.add("bit-light--hot");
      }
    }
    lights.appendChild(cell);
  });

  container.appendChild(lights);

  const annotation = document.createElement("span");
  annotation.className = "bit-grid__annotation";
  annotation.textContent = `${hostBits} host bits → ${broadcastOctets[3]}`;
  container.appendChild(annotation);

  return container;
};

const createMethodIndicator = (round) => {
  const container = document.createElement("div");
  container.className = "clue-panel__method method-indicators";
  const activeMethod = METHOD_DISPLAY.find((item) => item.id === round.method);
  if (activeMethod) {
    container.setAttribute(
      "aria-label",
      `Handshake lights highlight ${activeMethod.label}.`
    );
  }

  const label = document.createElement("span");
  label.className = "method-indicators__label";
  label.textContent = "Handshake lights";
  container.appendChild(label);

  const strip = document.createElement("div");
  strip.className = "method-indicators__lights";
  METHOD_DISPLAY.forEach((item) => {
    const light = document.createElement("span");
    light.className = "method-light";
    light.dataset.method = item.id;
    light.textContent = item.short;
    light.title = item.label;
    if (item.id === round.method) {
      light.classList.add("method-light--active");
    }
    strip.appendChild(light);
  });
  container.appendChild(strip);

  return container;
};

const initCluePanels = () => {
  rounds.forEach((round) => {
    const card = mapCards.get(round.id);
    if (!card) {
      return;
    }
    if (card.querySelector(".clue-panel")) {
      return;
    }
    const panel = document.createElement("div");
    panel.className = "clue-panel";
    const hostScope = createHostBitScope(round);
    if (hostScope) {
      panel.appendChild(hostScope);
    }
    panel.appendChild(createMethodIndicator(round));
    card.appendChild(panel);
  });
};

let currentRoundIndex = 0;
let score = 0;
let integrity = 100;
let attemptsThisRound = 0;

const clampIntegrity = () => {
  integrity = Math.max(0, Math.min(integrity, 100));
};

const updateHud = () => {
  integrityDisplay.textContent = `${Math.round(integrity)}%`;
  integrityFill.style.width = `${integrity}%`;
  scoreDisplay.textContent = `${score}`;
  roundDisplay.textContent = `${Math.min(currentRoundIndex + 1, TOTAL_ROUNDS)} / ${TOTAL_ROUNDS}`;
};

const setStatus = (message, state = "idle") => {
  statusBoard.textContent = message;
  statusBoard.dataset.state = state;
};

const renderDevices = (round) => {
  const card = mapCards.get(round.id);
  if (!card) {
    return;
  }
  card.dataset.state = "complete";
  const counter = card.querySelector('[data-role="device-count"]');
  if (counter) {
    counter.textContent = `Found ${round.devices.length} devices`;
  }
};

const appendLogEntry = (round, attempts, roundScore) => {
  const entry = document.createElement("li");
  const title = document.createElement("strong");
  title.textContent = `${round.name}`;
  entry.appendChild(title);

  const summary = document.createElement("span");
  summary.textContent = `Wake-up successful after ${attempts} ${attempts === 1 ? "sweep" : "sweeps"}.`;
  entry.appendChild(summary);

  const deviceLine = document.createElement("span");
  deviceLine.textContent = `Devices online: ${round.devices.join(", ")}.`;
  entry.appendChild(deviceLine);

  const scoreLine = document.createElement("span");
  scoreLine.textContent = `Score earned: ${roundScore}`;
  entry.appendChild(scoreLine);

  logList?.prepend(entry);
};

const activateRoundCard = (round) => {
  mapCards.forEach((card, id) => {
    if (card.dataset.state !== "complete") {
      delete card.dataset.state;
    }
    if (id === round.id) {
      card.dataset.state = card.dataset.state === "complete" ? "complete" : "active";
    }
  });
};

const populateRound = () => {
  const round = rounds[currentRoundIndex];
  if (!round) {
    return;
  }
  attemptsThisRound = 0;
  briefingCopy.textContent = round.briefing;
  broadcastHint.textContent = round.hint;
  while (broadcastSelect.options.length > 1) {
    broadcastSelect.remove(1);
  }
  round.options.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    broadcastSelect.appendChild(option);
  });
  broadcastSelect.value = "";
  Array.from(form.querySelectorAll('input[name="method"]')).forEach((input) => {
    input.checked = false;
  });
  activateRoundCard(round);
  setStatus("Link idle. Configure sweep parameters.");
  updateHud();
};

const advanceRound = () => {
  currentRoundIndex += 1;
  if (currentRoundIndex >= TOTAL_ROUNDS) {
    roundDisplay.textContent = `${TOTAL_ROUNDS} / ${TOTAL_ROUNDS}`;
    const finalScore = score + Math.round(integrity);
    setStatus("All segments reporting. Signal locked in.", "success");
    window.parent?.postMessage(
      {
        type: "net:level-complete",
        game: "lan-beacon-scout",
        payload: {
          status: "Broadcast ring restored",
          score: finalScore,
        },
      },
      "*"
    );
    return;
  }
  populateRound();
};

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const round = rounds[currentRoundIndex];
  if (!round) {
    return;
  }
  const selectedBroadcast = broadcastSelect.value;
  const methodInput = form.querySelector('input[name="method"]:checked');
  const selectedMethod = methodInput?.value || "";
  if (!selectedBroadcast || !selectedMethod) {
    setStatus("Need both broadcast target and method before sending.", "error");
    return;
  }
  attemptsThisRound += 1;
  if (selectedBroadcast !== round.broadcast || selectedMethod !== round.method) {
    integrity -= 12;
    clampIntegrity();
    updateHud();
    setStatus("Echo lost. Adjust the sweep parameters and retry.", "error");
    const card = mapCards.get(round.id);
    if (card) {
      card.dataset.state = "active";
    }
    return;
  }

  const penalty = Math.max(0, (attemptsThisRound - 1) * round.penalty);
  const roundScore = Math.max(round.baseScore - penalty, Math.floor(round.penalty / 2));
  score += roundScore;
  updateHud();
  renderDevices(round);
  appendLogEntry(round, attemptsThisRound, roundScore);
  setStatus("Broadcast acknowledged. Devices checking in.", "success");
  setTimeout(() => {
    advanceRound();
  }, 500);
});

form?.addEventListener("input", () => {
  if (statusBoard.dataset.state === "success") {
    return;
  }
  const round = rounds[currentRoundIndex];
  if (!round) {
    return;
  }
  const selectedBroadcast = broadcastSelect.value;
  const methodInput = form.querySelector('input[name="method"]:checked');
  const selectedMethod = methodInput?.value || "";
  if (selectedBroadcast === round.broadcast && selectedMethod === round.method) {
    setStatus("Sweep configured. Fire when ready.");
    const card = mapCards.get(round.id);
    if (card && card.dataset.state !== "complete") {
      card.dataset.state = "active";
    }
  } else {
    setStatus("Fine-tune the beacon parameters.");
  }
});

initCluePanels();
populateRound();
