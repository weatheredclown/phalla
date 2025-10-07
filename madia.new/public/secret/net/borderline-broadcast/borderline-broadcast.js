const form = document.getElementById("bgp-form");
const board = document.getElementById("status-board");

const expected = {
  "local-pref": "raise",
  "as-path": "double",
  community: "blackhole",
};

const updateBoard = (message, state = "idle") => {
  board.textContent = message;
  board.dataset.state = state;
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
  const mismatches = evaluatePolicy(formData);
  if (!mismatches.length) {
    updateBoard("Policy ready. Deploy to routers.");
  } else {
    updateBoard("Session flapping. Apply damping plan…");
  }
});
