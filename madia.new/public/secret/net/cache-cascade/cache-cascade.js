const form = document.getElementById("cache-form");
const board = document.getElementById("status-board");

const expected = {
  static: { route: "parent", ttl: "60" },
  cms: { route: "direct", ttl: "5" },
  mirror: { route: "sibling", ttl: "240" },
};

const updateBoard = (message, state = "idle") => {
  board.textContent = message;
  board.dataset.state = state;
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
  const formData = new FormData(form);
  const mismatches = evaluateCache(formData);
  if (mismatches.length) {
    updateBoard(`Hierarchy rejected: adjust ${mismatches.join(", ")}.`, "error");
    return;
  }
  updateBoard("Hit ratio climbing. Line holds steady.", "success");
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
  } else {
    updateBoard("Cache hit ratio falling…");
  }
});
