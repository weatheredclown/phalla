const STORAGE_KEY = "net-ops-progress";

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

const cardIndex = new Map();
let activeNode = null;

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
    if (button) {
      button.addEventListener("click", () => openNode(node));
    }

    cardIndex.set(node.id, card);
    fragment.append(card);
  });
  grid.replaceChildren(fragment);
};

const openNode = (node) => {
  if (!overlay || !frame) {
    return;
  }
  activeNode = node;
  titleEl.textContent = node.name;
  layerEl.textContent = node.layer;
  descriptionEl.textContent = node.description;
  frame.src = node.url;
  restartButton.setAttribute("aria-disabled", "true");
  restartButton.disabled = true;
  overlay.hidden = false;
  overlay.dataset.open = "true";
  requestAnimationFrame(() => {
    overlay?.querySelector(".overlay-frame")?.focus({ preventScroll: true });
  });
};

const closeOverlay = () => {
  if (!overlay || !frame) {
    return;
  }
  overlay.hidden = true;
  overlay.removeAttribute("data-open");
  frame.src = "about:blank";
  activeNode = null;
};

const restartNode = () => {
  if (!frame || !activeNode) {
    return;
  }
  const currentSrc = frame.src;
  frame.src = "about:blank";
  setTimeout(() => {
    frame.src = currentSrc || activeNode.url;
  }, 20);
};

closeButton?.addEventListener("click", closeOverlay);
overlayBackdrop?.addEventListener("click", closeOverlay);
restartButton?.addEventListener("click", restartNode);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !overlay?.hidden) {
    closeOverlay();
  }
});

resetProgressButton?.addEventListener("click", () => {
  Object.keys(progress).forEach((key) => delete progress[key]);
  saveProgress(progress);
  nodes.forEach((node) => updateStatus(node.id, null));
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
  restartButton.removeAttribute("aria-disabled");
  restartButton.disabled = false;
});

renderGrid();
