const form = document.getElementById("ftp-form");
const board = document.getElementById("status-board");
const flightPath = document.querySelector(".flight-path");
const flightPlane = flightPath?.querySelector(".flight-plane");
const flightSteps = new Map(
  Array.from(document.querySelectorAll(".flight-step")).map((element) => [element.dataset.command, element])
);

const expectedOrder = {
  open: "1",
  user: "2",
  passive: "3",
  cd: "4",
  put: "5",
  quit: "6",
};

const expectedSequence = Object.entries(expectedOrder).sort(([, a], [, b]) => Number(a) - Number(b));

const updateBoard = (message, state = "idle") => {
  board.textContent = message;
  board.dataset.state = state;
  if (flightPath) {
    flightPath.dataset.state = state;
  }
};

const collectValues = (formData) =>
  Object.fromEntries(Object.keys(expectedOrder).map((key) => [key, formData.get(key) || ""]));

const evaluateOrder = (values) => {
  const used = new Set();
  const duplicates = new Set();
  Object.values(values).forEach((value) => {
    if (!value) {
      return;
    }
    if (used.has(value)) {
      duplicates.add(value);
    }
    used.add(value);
  });
  const mismatches = Object.entries(expectedOrder).filter(([key, value]) => values[key] !== value);
  return { duplicates, mismatches };
};

const computeProgress = (values, duplicates) => {
  let progress = 0;
  for (const [command, step] of expectedSequence) {
    const assigned = values[command];
    if (!assigned || duplicates.has(assigned) || assigned !== step) {
      break;
    }
    progress += 1;
  }
  return progress;
};

const updateFlightVisual = (values, duplicates, mismatches) => {
  const mismatchLookup = new Set(mismatches.map(([command]) => command));
  flightSteps.forEach((element, command) => {
    const assigned = values[command];
    element.dataset.slot = assigned || "";
    const indexEl = element.querySelector(".step-index");
    if (indexEl) {
      indexEl.textContent = assigned || expectedOrder[command];
    }
    if (!assigned) {
      element.dataset.state = "";
      return;
    }
    if (duplicates.has(assigned)) {
      element.dataset.state = "duplicate";
      return;
    }
    if (!mismatchLookup.has(command)) {
      element.dataset.state = "correct";
    } else {
      element.dataset.state = "pending";
    }
  });
  if (flightPlane) {
    const progress = computeProgress(values, duplicates);
    const ratio = expectedSequence.length ? progress / expectedSequence.length : 0;
    flightPlane.style.setProperty("--flight-progress", ratio.toString());
  }
};

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const values = collectValues(data);
  const { duplicates, mismatches } = evaluateOrder(values);
  updateFlightVisual(values, duplicates, mismatches);
  if (duplicates.size) {
    updateBoard("Sequence conflict detected. Remove duplicate slots.", "error");
    return;
  }
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
  const data = new FormData(form);
  const values = collectValues(data);
  const { duplicates, mismatches } = evaluateOrder(values);
  updateFlightVisual(values, duplicates, mismatches);
  if (!duplicates.size && !mismatches.length) {
    updateBoard("Flight plan aligned. Initiate transfer.");
  } else {
    updateBoard("Transfer queue idle.");
  }
});

if (form) {
  const values = collectValues(new FormData(form));
  const { duplicates, mismatches } = evaluateOrder(values);
  updateFlightVisual(values, duplicates, mismatches);
}
