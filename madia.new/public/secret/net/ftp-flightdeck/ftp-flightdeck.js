const form = document.getElementById("ftp-form");
const board = document.getElementById("status-board");

const expectedOrder = {
  open: "1",
  user: "2",
  passive: "3",
  cd: "4",
  put: "5",
  quit: "6",
};

const updateBoard = (message, state = "idle") => {
  board.textContent = message;
  board.dataset.state = state;
};

const hasDuplicates = (values) => {
  const used = new Set();
  for (const value of Object.values(values)) {
    if (!value) {
      continue;
    }
    if (used.has(value)) {
      return true;
    }
    used.add(value);
  }
  return false;
};

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const values = Object.fromEntries(Object.keys(expectedOrder).map((key) => [key, data.get(key) || ""]));
  if (hasDuplicates(values)) {
    updateBoard("Sequence conflict detected. Remove duplicate slots.", "error");
    return;
  }
  const mismatches = Object.entries(expectedOrder).filter(([key, value]) => values[key] !== value);
  if (mismatches.length) {
    updateBoard("Transfer aborted. Adjust command ordering.", "error");
    return;
  }
  updateBoard("Payload delivered. QA has their bits.", "success");
  window.parent?.postMessage(
    {
      type: "net:level-complete",
      game: "ftp-flightdeck",
      payload: {
        status: "Build docked",
        score: 36000,
      },
    },
    "*"
  );
});

form?.addEventListener("input", () => {
  if (board.dataset.state === "success") {
    return;
  }
  updateBoard("Transfer queue idle.");
});
