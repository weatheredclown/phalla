const form = document.getElementById("ftp-form");
const board = document.getElementById("status-board");
const flightTrack = document.querySelector(".flight-track");
const plane = document.getElementById("flight-plane");
const dashboard = document.querySelector(".flight-dashboard");
const dashboardValue = document.getElementById("flight-progress");
const dashboardLights = dashboard
  ? dashboard.querySelectorAll(".dashboard-light")
  : [];
const stepLookup = {
  open: document.querySelector('[data-command="open"]'),
  user: document.querySelector('[data-command="user"]'),
  passive: document.querySelector('[data-command="passive"]'),
  cd: document.querySelector('[data-command="cd"]'),
  put: document.querySelector('[data-command="put"]'),
  quit: document.querySelector('[data-command="quit"]'),
};

const expectedOrder = {
  open: "1",
  user: "2",
  passive: "3",
  cd: "4",
  put: "5",
  quit: "6",
};

const orderedCommands = Object.entries(expectedOrder).sort(
  (a, b) => Number(a[1]) - Number(b[1])
);

const updateBoard = (message, state = "idle") => {
  board.textContent = message;
  board.dataset.state = state;
};

const getDuplicates = (values) => {
  const seen = new Map();
  const duplicates = new Set();
  Object.entries(values).forEach(([command, value]) => {
    if (!value) {
      return;
    }
    const existing = seen.get(value);
    if (existing) {
      duplicates.add(existing);
      duplicates.add(command);
    } else {
      seen.set(value, command);
    }
  });
  return duplicates;
};

const updateFlightVisual = (values, duplicates) => {
  let anyInput = false;
  let allAssigned = true;

  Object.entries(stepLookup).forEach(([command, element]) => {
    if (!element) {
      return;
    }
    const slot = values[command] || "";
    const slotDisplay = element.querySelector(".step-slot");
    if (slotDisplay) {
      slotDisplay.textContent = slot || "--";
    }
    let state = "idle";
    if (slot) {
      anyInput = true;
      if (duplicates.has(command)) {
        state = "warn";
      } else if (slot === expectedOrder[command]) {
        state = "good";
      } else {
        state = "warn";
      }
    } else {
      allAssigned = false;
    }
    element.dataset.state = state;
  });

  let progress = 0;
  for (const [command, slot] of orderedCommands) {
    if (values[command] === slot && !duplicates.has(command)) {
      progress += 1;
    } else {
      break;
    }
  }

  const perfect =
    duplicates.size === 0 &&
    orderedCommands.every(([command, slot]) => values[command] === slot);

  const ratio = progress / orderedCommands.length;
  if (plane) {
    plane.style.setProperty("--progress", String(ratio));
    let planeState = "idle";
    if (perfect) {
      planeState = "dock";
    } else if (ratio > 0) {
      planeState = "taxi";
    }
    plane.dataset.state = planeState;
  }

  if (flightTrack) {
    let trackState = "idle";
    if (perfect) {
      trackState = "good";
    } else if (anyInput || duplicates.size) {
      trackState = "warn";
    }
    flightTrack.dataset.state = trackState;
  }

  if (dashboard) {
    dashboard.dataset.state = perfect ? "ready" : progress > 0 ? "active" : "idle";
    if (dashboardValue) {
      dashboardValue.textContent = `${Math.round(ratio * 100)}%`;
    }
  }
  dashboardLights.forEach((light, index) => {
    light.dataset.active = index < progress ? "on" : "off";
  });

  if (!anyInput) {
    return "idle";
  }
  if (perfect) {
    return "success";
  }
  if (duplicates.size || !allAssigned) {
    return "warn";
  }
  return "active";
};

const extractValues = (formData) =>
  Object.fromEntries(
    Object.keys(expectedOrder).map((key) => [key, formData.get(key) || ""])
  );

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const values = extractValues(data);
  const duplicates = getDuplicates(values);
  updateFlightVisual(values, duplicates);
  if (duplicates.size) {
    updateBoard("Sequence conflict detected. Remove duplicate slots.", "error");
    return;
  }
  const mismatches = Object.entries(expectedOrder).filter(
    ([key, value]) => values[key] !== value
  );
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
  const values = extractValues(data);
  const duplicates = getDuplicates(values);
  const state = updateFlightVisual(values, duplicates);
  if (state === "idle") {
    updateBoard("Transfer queue idle.");
  } else if (state === "success") {
    updateBoard("Payload lined up. Ready for launch.");
  } else if (state === "warn") {
    updateBoard("Course deviation detected. Adjust slots.");
  } else {
    updateBoard("Transfer queue syncing…");
  }
});

if (form) {
  const initialValues = Object.fromEntries(
    Object.keys(expectedOrder).map((key) => [key, form.elements.namedItem(key)?.value || ""])
  );
  updateFlightVisual(initialValues, new Set());
}
