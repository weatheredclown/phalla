const form = document.getElementById("ppp-form");
const board = document.getElementById("status-board");

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
  const formData = new FormData(form);
  const { duplicates, mismatches } = evaluateOrder(formData);
  if (duplicates.size) {
    updateBoard(`Modem error: duplicate steps ${Array.from(duplicates).join(", ")}.`, "error");
    return;
  }
  if (mismatches.length) {
    updateBoard(`Negotiation failed: adjust ${mismatches.join(", ")}.`, "error");
    return;
  }
  updateBoard("PPP link live. newsroom feed synchronized.", "success");
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
  } else {
    updateBoard("Modem idle. Awaiting script…");
  }
});
