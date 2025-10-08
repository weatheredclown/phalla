import { initFullscreenToggle } from "../fullscreen.js";

initFullscreenToggle();

const form = document.getElementById("bgp-form");
const board = document.getElementById("status-board");
const visual = document.getElementById("bgp-visual");
const visualCaption = visual?.querySelector(".visual-caption");

const expected = {
  "local-pref": "raise",
  "as-path": "double",
  community: "blackhole",
};

const updateBoard = (message, state = "idle") => {
  board.textContent = message;
  board.dataset.state = state;
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
  const mismatches = evaluatePolicy(formData);
  if (mismatches.length) {
    updateBoard(`Route map rejected: fix ${mismatches.join(", ")}.`, "error");
    setVisualState("error");
    return;
  }
  updateBoard("Policies live. Backbone prefers fiber ring.", "success");
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
  if (board.dataset.state === "success") {
    return;
  }
  const formData = new FormData(form);
  const mismatches = evaluatePolicy(formData);
  if (!mismatches.length) {
    updateBoard("Policy ready. Deploy to routers.");
    setVisualState("processing");
  } else {
    updateBoard("Session flapping. Apply damping plan…");
    setVisualState("idle");
  }
});
