const form = document.getElementById("route-form");
const board = document.getElementById("status-board");

const expected = {
  lab: "edge-hub",
  studio: "studio-loop",
  isp: "metro-border",
};

const updateBoard = (message, state = "idle") => {
  board.textContent = message;
  board.dataset.state = state;
};

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const mismatches = Object.entries(expected).filter(([key, value]) => data.get(key) !== value);
  if (mismatches.length) {
    updateBoard("Traceroute still breaks. Check the mismatched prefixes.", "error");
    return;
  }
  updateBoard("Routes propagated. Ping echoes clean.", "success");
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
});
