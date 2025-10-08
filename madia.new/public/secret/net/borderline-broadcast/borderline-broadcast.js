const form = document.getElementById("bgp-form");
const board = document.getElementById("status-board");
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

const updateBoard = (message, state = "idle") => {
  board.textContent = message;
  board.dataset.state = state;
};

const applyIndicatorState = (element, state) => {
  if (!element) {
    return;
  }
  element.dataset.state = state;
};

const deriveState = (value, matches) => {
  if (!value) {
    return "idle";
  }
  return matches ? "good" : "warn";
};

const updateVisual = (formData) => {
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

  applyIndicatorState(nodeIndicators.backbone, deriveState(localPref, matches.backbone));
  applyIndicatorState(nodeIndicators.transit, deriveState(asPath, matches.transit));
  applyIndicatorState(nodeIndicators.community, deriveState(communityValue, matches.community));

  applyIndicatorState(linkIndicators.fiber, deriveState(localPref, matches.backbone));
  applyIndicatorState(linkIndicators.relay, deriveState(asPath, matches.transit));
  applyIndicatorState(linkIndicators.blackhole, deriveState(communityValue, matches.community));

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

const evaluatePolicy = (formData) => {
  const mismatches = Object.entries(expected)
    .filter(([key, value]) => (formData.get(key) || "") !== value)
    .map(([key]) => key);
  return mismatches;
};

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  updateVisual(formData);
  const mismatches = evaluatePolicy(formData);
  if (mismatches.length) {
    updateBoard(`Route map rejected: fix ${mismatches.join(", ")}.`, "error");
    return;
  }
  updateBoard("Policies live. Backbone prefers fiber ring.", "success");
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
  updateVisual(formData);
  const mismatches = evaluatePolicy(formData);
  if (!mismatches.length) {
    updateBoard("Policy ready. Deploy to routers.");
  } else {
    updateBoard("Session flapping. Apply damping plan…");
  }
});

if (form) {
  updateVisual(new FormData(form));
}
