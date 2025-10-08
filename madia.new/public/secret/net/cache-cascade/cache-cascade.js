import { initFullscreenToggle } from "../fullscreen.js";

initFullscreenToggle();

const form = document.getElementById("cache-form");
const board = document.getElementById("status-board");
const visual = document.getElementById("cache-visual");
const visualCaption = visual?.querySelector(".visual-caption");

const expected = {
  static: { route: "parent", ttl: "60" },
  cms: { route: "direct", ttl: "5" },
  mirror: { route: "sibling", ttl: "240" },
};

const updateBoard = (message, state = "idle") => {
  board.textContent = message;
  board.dataset.state = state;
};

const visualMessages = {
  idle: "Hierarchy cooling channels primed.",
  processing: "Balancing request load…",
  success: "Cascade locked. Hit ratio stabilized.",
  error: "Hot spot detected—revise routing.",
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

const evaluateCache = (formData) => {
  const mismatches = [];
  Object.entries(expected).forEach(([prefix, config]) => {
    const route = formData.get(prefix) || "";
    const ttl = formData.get(`${prefix}-ttl`) || "";
    if (route !== config.route || ttl !== config.ttl) {
      mismatches.push(prefix);
    }
  });
  return mismatches;
};

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  setVisualState("processing");
  const formData = new FormData(form);
  const mismatches = evaluateCache(formData);
  if (mismatches.length) {
    updateBoard(`Hierarchy rejected: adjust ${mismatches.join(", ")}.`, "error");
    setVisualState("error");
    return;
  }
  updateBoard("Hit ratio climbing. Line holds steady.", "success");
  setVisualState("success");
  window.parent?.postMessage(
    {
      type: "net:level-complete",
      game: "cache-cascade",
      payload: {
        status: "Cache stable",
        score: 120,
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
  const mismatches = evaluateCache(formData);
  if (!mismatches.length) {
    updateBoard("Hierarchy ready. Commit to squid.conf.");
    setVisualState("processing");
  } else {
    updateBoard("Cache hit ratio falling…");
    setVisualState("idle");
  }
});
