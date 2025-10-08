const form = document.getElementById("ppp-form");
const board = document.getElementById("status-board");
const visual = document.getElementById("modem-visual");
const visualCaption = visual?.querySelector(".visual-caption");

const expectedOrder = {
  carrier: "1",
  lcp: "2",
  auth: "3",
  ipcp: "4",
};

const updateBoard = (message, state = "idle") => {
  board.textContent = message;
  board.dataset.state = state;
};

const visualMessages = {
  idle: "Carrier tone standing by.",
  processing: "Negotiating PPP sequence…",
  success: "Link locked. Syncing newsroom feed.",
  error: "Handshake jammed. Reorder the phases.",
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

const evaluateOrder = (formData) => {
  const values = Object.fromEntries(Object.keys(expectedOrder).map((key) => [key, formData.get(key) || ""]));
  const duplicates = new Set();
  const seen = new Map();
  Object.entries(values).forEach(([key, value]) => {
    if (!value) {
      return;
    }
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.set(value, key);
  });
  const mismatches = Object.entries(expectedOrder).filter(([key, value]) => values[key] !== value).map(([key]) => key);
  return { duplicates, mismatches };
};

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  setVisualState("processing");
  const formData = new FormData(form);
  const { duplicates, mismatches } = evaluateOrder(formData);
  if (duplicates.size) {
    updateBoard(`Modem error: duplicate steps ${Array.from(duplicates).join(", ")}.`, "error");
    setVisualState("error");
    return;
  }
  if (mismatches.length) {
    updateBoard(`Negotiation failed: adjust ${mismatches.join(", ")}.`, "error");
    setVisualState("error");
    return;
  }
  updateBoard("PPP link live. newsroom feed synchronized.", "success");
  setVisualState("success");
  window.parent?.postMessage(
    {
      type: "net:level-complete",
      game: "modem-skunkworks",
      payload: {
        status: "Link steady",
        score: 56000,
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
  const { duplicates, mismatches } = evaluateOrder(formData);
  if (!duplicates.size && !mismatches.length) {
    updateBoard("Sequence locked. Dial when ready.");
    setVisualState("processing");
  } else {
    updateBoard("Modem idle. Awaiting script…");
    setVisualState("idle");
  }
});
