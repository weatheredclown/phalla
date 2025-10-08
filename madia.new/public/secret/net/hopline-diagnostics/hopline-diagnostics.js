const form = document.getElementById("route-form");
const board = document.getElementById("status-board");
const visual = document.getElementById("hopline-visual");
const visualCaption = visual?.querySelector(".visual-caption");

const expected = {
  lab: "edge-hub",
  studio: "studio-loop",
  isp: "metro-border",
};

const updateBoard = (message, state = "idle") => {
  board.textContent = message;
  board.dataset.state = state;
};

const visualMessages = {
  idle: "Signal probes aligned.",
  processing: "Sweeping hops for packet loss…",
  success: "All hops green. Circuit restored.",
  error: "Route break detected. Reassign prefixes.",
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

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  setVisualState("processing");
  const data = new FormData(form);
  const mismatches = Object.entries(expected).filter(([key, value]) => data.get(key) !== value);
  if (mismatches.length) {
    updateBoard("Traceroute still breaks. Check the mismatched prefixes.", "error");
    setVisualState("error");
    return;
  }
  updateBoard("Routes propagated. Ping echoes clean.", "success");
  setVisualState("success");
  window.parent?.postMessage(
    {
      type: "net:level-complete",
      game: "hopline-diagnostics",
      payload: {
        status: "Latency shaved",
        score: 64000,
      },
    },
    "*"
  );
});

form?.addEventListener("input", () => {
  if (board.dataset.state === "success") {
    return;
  }
  updateBoard("Routing daemon idle.");
  setVisualState("idle");
});
