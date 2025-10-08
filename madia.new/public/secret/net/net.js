const STORAGE_KEY = "net-ops-progress";
const BODY_SCROLL_LOCK_CLASS = "net-scroll-lock";

const nodes = [
  {
    id: "hopline-diagnostics",
    layer: "Layer 08 · Backbone Pulse",
    name: "Hopline Diagnostics",
    description:
      "Trace the stubborn uplink with ping and traceroute, then pin prefixes to the right routers before users notice.",
    url: "./hopline-diagnostics/index.html",
    thumbnail: "Trace Ops",
  },
  {
    id: "root-zone-relay",
    layer: "Layer 07 · DNS Authority",
    name: "Root Zone Relay",
    description:
      "Rebuild an ISP's DNS zone after a power blip. Map records to the right hosts before the modem bank times out.",
    url: "./root-zone-relay/index.html",
    thumbnail: "NS Lookup",
  },
  {
    id: "daemon-handshake",
    layer: "Layer 06 · Web Stack",
    name: "Daemon Handshake",
    description:
      "Kick Apache 1.1 into motion on a beige tower. Enable the right modules and ride the green lights to 200 OK.",
    url: "./daemon-handshake/index.html",
    thumbnail: "httpd",
  },
  {
    id: "kernel-forge-20",
    layer: "Layer 05 · Kernel Lab",
    name: "Kernel Forge 2.0",
    description:
      "Compile a lean 2.0.x kernel for dual NIC routing. Strip the bloat, keep the drivers, and beat the pager deadline.",
    url: "./kernel-forge-20/index.html",
    thumbnail: "make bzImage",
  },
  {
    id: "modem-skunkworks",
    layer: "Layer 04 · Dial-Up Ops",
    name: "Modem Skunkworks",
    description:
      "Sequence the perfect PPP handshake so the remote newsroom can sync before sunrise.",
    url: "./modem-skunkworks/index.html",
    thumbnail: "PPP Sync",
  },
  {
    id: "borderline-broadcast",
    layer: "Layer 03 · Routing Core",
    name: "Borderline Broadcast",
    description:
      "Tame a flapping BGP session and set policies so backbone traffic stops leaking over the backup frame relay.",
    url: "./borderline-broadcast/index.html",
    thumbnail: "BGP Map",
  },
  {
    id: "stream-parser-depot",
    layer: "Layer 03 · Log Sieve",
    name: "Stream Parser Depot",
    description:
      "Chain the right awk and sed snippets to squeeze a clean incident summary out of the radius logs.",
    url: "./stream-parser-depot/index.html",
    thumbnail: "awk|sed",
  },
  {
    id: "cache-cascade",
    layer: "Layer 02 · Proxy Works",
    name: "Cache Cascade",
    description:
      "Tune your Squid cache hierarchy to absorb a surprise traffic storm without melting the leased line.",
    url: "./cache-cascade/index.html",
    thumbnail: "Proxy Flow",
  },
  {
    id: "gopher-groundskeeper",
    layer: "Layer 02 · Campus Content",
    name: "Gopher Groundskeeper",
    description:
      "Compose a spotless gophermap so the library's beige terminals show the latest banners, catalogs, and zines.",
    url: "./gopher-groundskeeper/index.html",
    thumbnail: "Burrow",
  },
  {
    id: "ftp-flightdeck",
    layer: "Layer 01 · Transfer Bay",
    name: "FTP Flightdeck",
    description:
      "Sequence a flawless FTP session so the nightly build touches down in staging before QA clocks in.",
    url: "./ftp-flightdeck/index.html",
    thumbnail: "FTP Ops",
  },
];

const nodeLookup = new Map(nodes.map((node) => [node.id, node]));

function lockBodyScroll() {
  if (!document.body) {
    return;
  }
  document.body.classList.add(BODY_SCROLL_LOCK_CLASS);
}

function unlockBodyScroll() {
  if (!document.body) {
    return;
  }
  document.body.classList.remove(BODY_SCROLL_LOCK_CLASS);
}

const loadProgress = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return {};
    }
    const parsed = JSON.parse(stored);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch (error) {
    console.warn("Failed to parse progress", error);
    return {};
  }
};

const saveProgress = (progress) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.warn("Failed to store progress", error);
  }
};

const progress = loadProgress();

const grid = document.getElementById("node-grid");
const template = document.getElementById("node-card-template");
const overlay = document.getElementById("player-overlay");
const frame = document.getElementById("cabinet-frame");
const closeButton = document.getElementById("close-overlay");
const restartButton = document.getElementById("restart-cabinet");
const titleEl = document.getElementById("player-title");
const layerEl = document.getElementById("player-layer");
const descriptionEl = document.getElementById("player-description");
const overlayBackdrop = document.getElementById("overlay-backdrop");
const resetProgressButton = document.getElementById("reset-progress");
const overlayFrame = document.getElementById("overlay-frame");
const progressSummary = document.getElementById("progress-summary");

const cardIndex = new Map();
let lastFocusElement = null;
let pendingRestart = null;

function setRestartButtonEnabled(enabled) {
  if (!restartButton) {
    return;
  }
  restartButton.disabled = !enabled;
  restartButton.setAttribute("aria-disabled", enabled ? "false" : "true");
}

const updateProgressSummary = () => {
  if (!progressSummary) {
    return;
  }
  const total = nodes.length;
  const completedEntries = Object.entries(progress)
    .filter(([, entry]) => entry && entry.status)
    .sort(([, a], [, b]) => {
      const timestampA = a?.timestamp ?? 0;
      const timestampB = b?.timestamp ?? 0;
      return timestampB - timestampA;
    });
  const completedCount = completedEntries.length;
  if (completedCount === 0) {
    progressSummary.textContent = `Cabinets stabilized: 0 / ${total}. Boot a cabinet to start logging uptime.`;
    progressSummary.dataset.state = "idle";
    return;
  }
  const [latestNodeId, latestEntry] = completedEntries[0];
  const latestNode = nodeLookup.get(latestNodeId);
  const nodeName = latestNode?.name ?? "Unknown cabinet";
  const statusText = latestEntry?.status || "Stabilized";
  let scoreFragment = "";
  const score = latestEntry?.score;
  if (typeof score === "number" && Number.isFinite(score)) {
    scoreFragment = ` Score ${score.toLocaleString()}.`;
  } else if (typeof score === "string" && score.trim()) {
    scoreFragment = ` Score ${score.trim()}.`;
  }
  progressSummary.textContent = `Cabinets stabilized: ${completedCount} / ${total}. Latest: ${nodeName} – ${statusText}.${scoreFragment}`;
  progressSummary.dataset.state = "active";
};

if (frame) {
  frame.dataset.baseUrl = "";
}

const updateStatus = (nodeId, statusData = null) => {
  const entry = cardIndex.get(nodeId);
  if (!entry) {
    return;
  }
  const statusElement = entry.querySelector("[data-status]");
  if (!statusElement) {
    return;
  }
  if (statusData) {
    statusElement.textContent = statusData.status || "Online";
    statusElement.dataset.offline = "false";
    statusElement.setAttribute("data-completed", "true");
  } else {
    statusElement.textContent = "Offline";
    statusElement.dataset.offline = "true";
    statusElement.removeAttribute("data-completed");
  }
};

const renderGrid = () => {
  if (!grid || !template) {
    return;
  }
  const fragment = document.createDocumentFragment();
  nodes.forEach((node) => {
    const card = template.content.firstElementChild.cloneNode(true);
    card.dataset.nodeId = node.id;
    const thumb = card.querySelector(".node-thumb");
    const layer = card.querySelector(".node-layer");
    const title = card.querySelector(".node-title");
    const description = card.querySelector(".node-description");
    const status = card.querySelector("[data-status]");
    const button = card.querySelector(".boot-button");

    if (thumb) {
      thumb.textContent = node.thumbnail;
    }
    if (layer) {
      layer.textContent = node.layer;
    }
    if (title) {
      title.textContent = node.name;
    }
    if (description) {
      description.textContent = node.description;
    }
    if (status) {
      const stored = progress[node.id];
      if (stored) {
        status.textContent = stored.status || "Online";
        status.dataset.offline = "false";
        status.setAttribute("data-completed", "true");
      } else {
        status.textContent = "Offline";
        status.dataset.offline = "true";
      }
    }
    if (card) {
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", `Boot ${node.name}`);
    }
    if (button) {
      button.dataset.nodeId = node.id;
      button.setAttribute("aria-label", `Boot ${node.name}`);
    }

    cardIndex.set(node.id, card);
    fragment.append(card);
  });
  grid.replaceChildren(fragment);
  updateProgressSummary();
};

const openNode = (node) => {
  if (!overlay || !frame) {
    return;
  }
  titleEl.textContent = node.name;
  layerEl.textContent = node.layer;
  descriptionEl.textContent = node.description;
  frame.dataset.baseUrl = node.url;
  frame.src = node.url;
  setRestartButtonEnabled(false);
  overlay.hidden = false;
  overlay.dataset.open = "true";
  overlay.dataset.activeNode = node.id;
  lockBodyScroll();
  requestAnimationFrame(() => {
    overlayFrame?.focus({ preventScroll: true });
  });
};

const closeOverlay = () => {
  if (!overlay || !frame) {
    return;
  }
  overlay.hidden = true;
  overlay.removeAttribute("data-open");
  overlay.removeAttribute("data-active-node");
  frame.src = "about:blank";
  try {
    pendingRestart?.();
  } catch (error) {
    console.warn("Failed to cancel pending restart", error);
  }
  pendingRestart = null;
  frame.dataset.baseUrl = "";
  setRestartButtonEnabled(false);
  unlockBodyScroll();
  if (lastFocusElement && document.body.contains(lastFocusElement)) {
    lastFocusElement.focus({ preventScroll: true });
  } else {
    const fallbackButton = grid?.querySelector(".boot-button");
    fallbackButton?.focus({ preventScroll: true });
  }
};

const restartNode = () => {
  if (!frame || !overlay || overlay.hidden) {
    return;
  }
  const activeNodeId = overlay.dataset.activeNode;
  if (!activeNodeId) {
    return;
  }
  const baseUrl = frame.dataset.baseUrl || nodeLookup.get(activeNodeId)?.url;
  if (!baseUrl) {
    return;
  }
  setRestartButtonEnabled(false);
  try {
    pendingRestart?.();
  } catch (error) {
    console.warn("Failed to clean up previous restart handler", error);
  }
  const restoreFocus = document.activeElement === restartButton;

  const handleLoad = () => {
    frame.removeEventListener("load", handleLoad);
    pendingRestart = null;
    if (overlay.hidden) {
      return;
    }
    setRestartButtonEnabled(true);
    if (restoreFocus) {
      restartButton?.focus({ preventScroll: true });
    }
  };

  pendingRestart = () => {
    frame.removeEventListener("load", handleLoad);
    pendingRestart = null;
  };

  frame.addEventListener("load", handleLoad);

  let reloadTriggered = false;
  try {
    if (frame.contentWindow) {
      frame.contentWindow.location.reload();
      reloadTriggered = true;
    }
  } catch (error) {
    console.warn("Falling back to src reset for restart", error);
  }

  if (reloadTriggered) {
    return;
  }

  try {
    const resolvedUrl = new URL(baseUrl, window.location.href);
    resolvedUrl.searchParams.set("restart", Date.now().toString(36));
    frame.src = `${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`;
  } catch (urlError) {
    console.warn("Unable to build restart URL", urlError);
    frame.src = baseUrl;
  }
};

closeButton?.addEventListener("click", closeOverlay);
overlayBackdrop?.addEventListener("click", closeOverlay);
restartButton?.addEventListener("click", restartNode);

resetProgressButton?.addEventListener("click", () => {
  Object.keys(progress).forEach((key) => delete progress[key]);
  saveProgress(progress);
  nodes.forEach((node) => updateStatus(node.id, null));
  updateProgressSummary();
});

window.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") {
    return;
  }
  if (data.type !== "net:level-complete") {
    return;
  }
  const nodeId = data.game;
  const payload = data.payload ?? {};
  if (!nodeId || !nodes.some((node) => node.id === nodeId)) {
    return;
  }
  progress[nodeId] = {
    status: payload.status || "Stabilized",
    score: payload.score ?? null,
    timestamp: Date.now(),
  };
  saveProgress(progress);
  updateStatus(nodeId, progress[nodeId]);
  setRestartButtonEnabled(true);
  updateProgressSummary();
});

renderGrid();

grid?.addEventListener("click", (event) => {
  const button = event.target.closest(".boot-button");
  const card = event.target.closest(".node-card");
  const source = button ?? card;
  if (!source) {
    return;
  }
  const nodeId = source.dataset.nodeId || card?.dataset.nodeId;
  if (!nodeId) {
    return;
  }
  const node = nodeLookup.get(nodeId);
  if (!node) {
    return;
  }
  lastFocusElement = source;
  openNode(node);
});

grid?.addEventListener("keydown", (event) => {
  if (event.defaultPrevented) {
    return;
  }
  const card = event.target.closest(".node-card");
  if (!card) {
    return;
  }
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    const nodeId = card.dataset.nodeId;
    const node = nodeLookup.get(nodeId);
    if (!node) {
      return;
    }
    lastFocusElement = card;
    openNode(node);
  }
});

document.addEventListener("keydown", (event) => {
  if (!overlay || overlay.hidden) {
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    closeOverlay();
    return;
  }
  if ((event.key === "r" || event.key === "R") && !event.metaKey && !event.ctrlKey && !event.altKey) {
    event.preventDefault();
    restartNode();
  }
});

setRestartButtonEnabled(false);

frame?.addEventListener("load", () => {
  if (overlay?.hidden) {
    return;
  }
  setRestartButtonEnabled(true);
});
