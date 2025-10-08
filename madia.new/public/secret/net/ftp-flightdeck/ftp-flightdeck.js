import { initFullscreenToggle } from "../fullscreen.js";

initFullscreenToggle();

const form = document.getElementById("ftp-form");
const board = document.getElementById("status-board");
const radar = document.getElementById("radar-screen");
const readout = document.getElementById("queue-readout");
const track = document.getElementById("command-track");
const transferMeter = document.getElementById("transfer-meter");
const transferFill = transferMeter?.querySelector(".transfer-fill");
const trackItems = new Map(
  Array.from(track?.querySelectorAll("[data-command]") || []).map((item) => [
    item.dataset.command || "",
    item,
  ])
);

const expectedOrder = {
  open: "1",
  user: "2",
  passive: "3",
  cd: "4",
  put: "5",
  quit: "6",
};

const updateBoard = (message, state = "idle") => {
  if (!board) {
    return;
  }
  board.textContent = message;
  board.dataset.state = state;
};

const setRadarState = (state) => {
  if (!radar) {
    return;
  }
  radar.dataset.state = state;
};

const setReadout = (message) => {
  if (!readout) {
    return;
  }
  readout.textContent = message;
};

const findDuplicateSlots = (values) => {
  const used = new Map();
  const duplicates = new Set();
  Object.entries(values).forEach(([command, value]) => {
    if (!value) {
      return;
    }
    if (used.has(value) && used.get(value) !== command) {
      duplicates.add(value);
    } else {
      used.set(value, command);
    }
  });
  return duplicates;
};

const updateVisualization = (values, duplicates = new Set()) => {
  let correctCount = 0;
  trackItems.forEach((item, command) => {
    if (!command) {
      return;
    }
    const order = values[command];
    if (!order) {
      delete item.dataset.state;
      delete item.dataset.error;
      return;
    }
    if (duplicates.has(order)) {
      item.dataset.state = "queued";
      item.dataset.error = "true";
      return;
    }
    delete item.dataset.error;
    if (order === expectedOrder[command]) {
      item.dataset.state = "locked";
      correctCount += 1;
    } else {
      item.dataset.state = "queued";
    }
  });

  if (transferMeter && transferFill) {
    const progress = correctCount / Object.keys(expectedOrder).length;
    transferFill.style.transform = `scaleX(${progress})`;
    transferMeter.setAttribute("aria-valuenow", correctCount.toString());
  }

  return correctCount;
};

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const values = Object.fromEntries(Object.keys(expectedOrder).map((key) => [key, data.get(key) || ""]));
  const duplicates = findDuplicateSlots(values);
  updateVisualization(values, duplicates);
  if (duplicates.size) {
    const slots = Array.from(duplicates).join(", ");
    updateBoard("Sequence conflict detected. Remove duplicate slots.", "error");
    setReadout(`Conflict on slot ${slots}. Reorder before launch.`);
    setRadarState("warning");
    return;
  }
  const mismatches = Object.entries(expectedOrder).filter(([key, value]) => values[key] !== value);
  if (mismatches.length) {
    updateBoard("Transfer aborted. Adjust command ordering.", "error");
    setReadout("Autopilot rejected queue. Align commands with flight plan.");
    setRadarState("warning");
    return;
  }
  updateBoard("Payload delivered. QA has their bits.", "success");
  setReadout("Sequence locked. Uplink humming.");
  setRadarState("success");
  trackItems.forEach((item) => {
    item.dataset.state = "complete";
    delete item.dataset.error;
  });
  if (transferMeter && transferFill) {
    transferFill.style.transform = "scaleX(1)";
    transferMeter.setAttribute("aria-valuenow", Object.keys(expectedOrder).length.toString());
  }
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
  if (board?.dataset.state === "success") {
    return;
  }
  const data = new FormData(form);
  const values = Object.fromEntries(Object.keys(expectedOrder).map((key) => [key, data.get(key) || ""]));
  const duplicates = findDuplicateSlots(values);
  const correctCount = updateVisualization(values, duplicates);
  if (duplicates.size) {
    const slots = Array.from(duplicates).join(", ");
    updateBoard("Transfer queue idle.");
    setReadout(`Queue conflict at slot ${slots}.`);
    setRadarState("warning");
    return;
  }
  if (correctCount === Object.keys(expectedOrder).length) {
    updateBoard("Sequence aligned. Initiate transfer.");
    setReadout("Flight plan green across the board.");
    setRadarState("active");
  } else if (correctCount > 0) {
    updateBoard("Transfer queue idle.");
    setReadout("Queue warming up. Assign remaining slots.");
    setRadarState("active");
  } else {
    updateBoard("Transfer queue idle.");
    setReadout("Queue awaiting commands…");
    setRadarState("idle");
  }
});

if (form) {
  setReadout("Queue awaiting commands…");
  setRadarState("idle");
}
