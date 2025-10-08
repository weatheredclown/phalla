const form = document.getElementById("bgp-form");
const board = document.getElementById("status-board");
const eventFeed = document.getElementById("event-feed");
const nodes = {
  backbone: document.querySelector('[data-node="backbone"]'),
  fiber: document.querySelector('[data-node="fiber-ring"]'),
  frame: document.querySelector('[data-node="frame-relay"]'),
};
const links = {
  primary: document.querySelector('[data-link="primary"]'),
  backup: document.querySelector('[data-link="backup"]'),
};

const expected = {
  "local-pref": "raise",
  "as-path": "double",
  community: "blackhole",
};

let lastBoardMessage = "";
let lastEventSignature = "";

const trimEventFeed = () => {
  if (!eventFeed) {
    return;
  }
  const maxEntries = 8;
  while (eventFeed.children.length > maxEntries) {
    eventFeed.removeChild(eventFeed.firstElementChild);
  }
};

const logEvent = (message, variant = "info") => {
  if (!eventFeed) {
    return;
  }
  const signature = `${variant}:${message}`;
  if (signature === lastEventSignature) {
    return;
  }
  const item = document.createElement("li");
  item.textContent = message;
  if (variant !== "info") {
    item.dataset.variant = variant;
  }
  eventFeed.append(item);
  trimEventFeed();
  eventFeed.scrollTop = eventFeed.scrollHeight;
  lastEventSignature = signature;
};

const applyState = (element, state) => {
  if (!element) {
    return;
  }
  if (state) {
    element.dataset.state = state;
  } else {
    delete element.dataset.state;
  }
};

const applyTopologyState = (formData) => {
  const localPref = formData.get("local-pref") || "";
  const asPath = formData.get("as-path") || "";
  const community = formData.get("community") || "";

  if (!nodes.backbone || !nodes.fiber || !nodes.frame) {
    return;
  }

  applyState(nodes.backbone, !localPref ? "" : localPref === expected["local-pref"] ? "active" : "warning");
  applyState(nodes.fiber, localPref === expected["local-pref"] ? "active" : localPref ? "warning" : "");
  if (community === expected.community && asPath === expected["as-path"]) {
    applyState(nodes.frame, "offline");
  } else if (!community && !asPath) {
    applyState(nodes.frame, "");
  } else {
    applyState(nodes.frame, "warning");
  }

  if (links.primary) {
    applyState(
      links.primary,
      !localPref ? "idle" : localPref === expected["local-pref"] ? "" : "congested"
    );
  }
  if (links.backup) {
    const backupState =
      !asPath && !community
        ? ""
        : asPath === expected["as-path"] && community === expected.community
        ? "idle"
        : "congested";
    applyState(links.backup, backupState);
  }
};

const updateBoard = (message, state = "idle", variant = "info") => {
  if (!board) {
    return;
  }
  board.textContent = message;
  board.dataset.state = state;
  if (message !== lastBoardMessage && (state === "success" || state === "error" || variant !== "info")) {
    logEvent(message, state === "error" ? "error" : state === "success" ? "success" : variant);
  }
  lastBoardMessage = message;
};

const evaluatePolicy = (formData) => {
  const mismatches = Object.entries(expected)
    .filter(([key, value]) => (formData.get(key) || "") !== value)
    .map(([key]) => key);
  return mismatches;
};

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  applyTopologyState(formData);
  const mismatches = evaluatePolicy(formData);
  if (mismatches.length) {
    updateBoard(`Route map rejected: fix ${mismatches.join(", ")}.`, "error");
    logEvent("Backup path still leaky. Rein in the policy table.", "error");
    return;
  }
  updateBoard("Policies live. Backbone prefers fiber ring.", "success");
  logEvent("Traffic converged on fiber ring. Frame relay damped.", "success");
  window.parent?.postMessage(
    {
      type: "net:level-complete",
      game: "borderline-broadcast",
      payload: {
        status: "Routes clean",
        score: 64512,
      },
    },
    "*"
  );
});

form?.addEventListener("input", () => {
  if (board.dataset.state === "success") {
    return;
  }
  const formData = new FormData(form);
  applyTopologyState(formData);
  const mismatches = evaluatePolicy(formData);
  if (!mismatches.length) {
    updateBoard("Policy ready. Deploy to routers.", "idle", "info");
    logEvent("Route-map staged. Awaiting commit.");
  } else {
    updateBoard("Session flapping. Apply damping plan…");
  }
});

if (form) {
  logEvent("Monitoring BGP session for leaks.");
  applyTopologyState(new FormData(form));
}
