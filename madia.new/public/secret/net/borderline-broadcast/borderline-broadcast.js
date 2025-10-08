import { initFullscreenToggle } from "../fullscreen.js";

initFullscreenToggle();

const form = document.getElementById("bgp-form");
const board = document.getElementById("status-board");
const eventFeed = document.getElementById("event-feed");
const visual = document.getElementById("bgp-visual");
const visualCaption = visual?.querySelector(".visual-caption");
const topology = document.querySelector(".topology-display");
const nodeIndicators = {
  backbone: document.querySelector('[data-node="backbone"]'),
  transit: document.querySelector('[data-node="transit"]'),
  community: document.querySelector('[data-node="community"]'),
};
const linkIndicators = {
  fiber: document.querySelector('[data-link="fiber"]'),
  relay: document.querySelector('[data-link="relay"]'),
  blackhole: document.querySelector('[data-link="blackhole"]'),
};
const gauge = document.querySelector(".telemetry-gauge");
const gaugeValue = document.getElementById("bgp-gauge-value");
const gaugeMarkers = gauge ? gauge.querySelectorAll(".gauge-marker") : [];

const expected = {
  "local-pref": "raise",
  "as-path": "double",
  community: "blackhole",
};
const totalChecks = Object.keys(expected).length;

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

const deriveState = (value, matches) => {
  if (!value) {
    return "idle";
  }
  return matches ? "good" : "warn";
};

const updateTopologyState = (formData) => {
  const localPref = formData.get("local-pref") || "";
  const asPath = formData.get("as-path") || "";
  const communityValue = formData.get("community") || "";

  const matches = {
    backbone: localPref === expected["local-pref"],
    transit: asPath === expected["as-path"],
    community: communityValue === expected.community,
  };
  const matchCount = Object.values(matches).filter(Boolean).length;
  const ratio = totalChecks ? matchCount / totalChecks : 0;

  applyState(nodeIndicators.backbone, deriveState(localPref, matches.backbone));
  applyState(nodeIndicators.transit, deriveState(asPath, matches.transit));
  applyState(nodeIndicators.community, deriveState(communityValue, matches.community));

  applyState(linkIndicators.fiber, deriveState(localPref, matches.backbone));
  applyState(linkIndicators.relay, deriveState(asPath, matches.transit));
  applyState(linkIndicators.blackhole, deriveState(communityValue, matches.community));

  if (topology) {
    const allGood = matches.backbone && matches.transit && matches.community;
    topology.dataset.flow = allGood ? "on" : "off";
  }

  if (gauge) {
    gauge.style.setProperty("--progress", String(ratio));
    gauge.dataset.state = matchCount === totalChecks ? "locked" : matchCount > 0 ? "warming" : "idle";
    gauge.dataset.progress = String(matchCount);
  }
  gaugeMarkers.forEach((marker, index) => {
    marker.dataset.active = index < matchCount ? "on" : "off";
  });
  if (gaugeValue) {
    gaugeValue.textContent = `${Math.round(ratio * 100)}%`;
  }
};

const updateBoard = (message, state = "idle", variant = "info") => {
  if (!board) {
    return;
  }
  board.textContent = message;
  board.dataset.state = state;
  if (message !== lastBoardMessage && (state === "success" || state === "error" || variant !== "info")) {
    logEvent(
      message,
      state === "error" ? "error" : state === "success" ? "success" : variant
    );
  }
  lastBoardMessage = message;
};

const visualMessages = {
  idle: "Backbone telemetry nominal.",
  processing: "Propagating policy changes…",
  success: "Routes converged on the fiber ring.",
  error: "Instability detected—adjust policy mix.",
};

const setVisualState = (state) => {
  if (!visual) {
    return;
  }
  visual.dataset.state = state;
  if (visualCaption && visualMessages[state]) {
    visualCaption.textContent = visualMessages[state];
  }
};

const evaluatePolicy = (formData) => {
  const mismatches = Object.entries(expected)
    .filter(([key, value]) => (formData.get(key) || "") !== value)
    .map(([key]) => key);
  return mismatches;
};

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  setVisualState("processing");
  const formData = new FormData(form);
  updateTopologyState(formData);
  const mismatches = evaluatePolicy(formData);
  if (mismatches.length) {
    updateBoard(`Route map rejected: fix ${mismatches.join(", ")}.`, "error");
    logEvent("Backup path still leaky. Rein in the policy table.", "error");
    setVisualState("error");
    return;
  }
  updateBoard("Policies live. Backbone prefers fiber ring.", "success");
  logEvent("Traffic converged on fiber ring. Frame relay damped.", "success");
  setVisualState("success");
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
  if (board?.dataset.state === "success") {
    return;
  }
  const formData = new FormData(form);
  updateTopologyState(formData);
  const mismatches = evaluatePolicy(formData);
  if (!mismatches.length) {
    updateBoard("Policy ready. Deploy to routers.", "idle", "info");
    logEvent("Route-map staged. Awaiting commit.");
    setVisualState("processing");
  } else {
    updateBoard("Session flapping. Apply damping plan…");
    setVisualState("idle");
  }
});

if (form) {
  logEvent("Monitoring BGP session for leaks.");
  updateTopologyState(new FormData(form));
}
