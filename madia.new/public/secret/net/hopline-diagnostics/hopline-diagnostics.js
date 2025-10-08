import { initFullscreenToggle } from "../fullscreen.js";

initFullscreenToggle();

const form = document.getElementById("route-form");
const board = document.getElementById("status-board");
const traceVisual = document.querySelector(".trace-visual");
const netIndicators = {
  lab: document.querySelector('[data-net="lab"]'),
  studio: document.querySelector('[data-net="studio"]'),
  isp: document.querySelector('[data-net="isp"]'),
};
const routerIndicators = {
  "edge-hub": document.querySelector('[data-router="edge-hub"]'),
  "studio-loop": document.querySelector('[data-router="studio-loop"]'),
  "metro-border": document.querySelector('[data-router="metro-border"]'),
};
const linkIndicators = {
  lab: document.querySelector('[data-link="lab"]'),
  studio: document.querySelector('[data-link="studio"]'),
  isp: document.querySelector('[data-link="isp"]'),
};
const traceMeter = document.querySelector(".trace-meter");
const tracePips = traceMeter ? traceMeter.querySelectorAll(".trace-pip") : [];

const expected = {
  lab: "edge-hub",
  studio: "studio-loop",
  isp: "metro-border",
};

const updateBoard = (message, state = "idle") => {
  board.textContent = message;
  board.dataset.state = state;
};

const applyState = (element, state) => {
  if (!element) {
    return;
  }
  element.dataset.state = state;
};

const updateTraceVisual = (values) => {
  let correct = 0;
  Object.entries(netIndicators).forEach(([net, element]) => {
    const router = values[net];
    if (!element) {
      return;
    }
    const state = !router ? "idle" : router === expected[net] ? "good" : "warn";
    applyState(element, state);
    const link = linkIndicators[net];
    if (link) {
      applyState(link, state);
    }
    if (router === expected[net]) {
      correct += 1;
    }
  });

  Object.entries(routerIndicators).forEach(([router, element]) => {
    if (!element) {
      return;
    }
    const hasMatch = Object.values(values).includes(router);
    let state = "idle";
    if (hasMatch) {
      const correctAssignments = Object.entries(expected).filter(
        ([net, expectedRouter]) => values[net] === expectedRouter && expectedRouter === router
      );
      state = correctAssignments.length ? "good" : "warn";
    }
    applyState(element, state);
  });

  if (traceVisual) {
    traceVisual.dataset.state = correct === Object.keys(expected).length ? "good" : correct > 0 ? "active" : "idle";
  }

  if (traceMeter) {
    const ratio = correct / Object.keys(expected).length;
    traceMeter.dataset.state = correct === 0 ? "idle" : correct === Object.keys(expected).length ? "ready" : "warming";
    traceMeter.style.setProperty("--progress", String(ratio));
  }
  tracePips.forEach((pip, index) => {
    pip.dataset.active = index < correct ? "on" : "off";
  });

  if (correct === Object.keys(expected).length) {
    return "success";
  }
  if (correct === 0) {
    return "idle";
  }
  const hasWarnings = Object.entries(values).some(([net, router]) => router && router !== expected[net]);
  return hasWarnings ? "warn" : "active";
};

const extractValues = (formData) => ({
  lab: formData.get("lab") || "",
  studio: formData.get("studio") || "",
  isp: formData.get("isp") || "",
});

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const values = extractValues(formData);
  const state = updateTraceVisual(values);
  const mismatches = Object.entries(expected).filter(([net, router]) => values[net] !== router);
  if (mismatches.length) {
    updateBoard("Route merge failed. Adjust assignments.", "error");
    return;
  }
  if (state === "success") {
    updateBoard("Routes locked. Upload restored.", "success");
    window.parent?.postMessage(
      {
        type: "net:level-complete",
        game: "hopline-diagnostics",
        payload: {
          status: "Trace clean",
          score: 512,
        },
      },
      "*"
    );
  }
});

form?.addEventListener("input", () => {
  if (board.dataset.state === "success") {
    return;
  }
  const formData = new FormData(form);
  const values = extractValues(formData);
  const state = updateTraceVisual(values);
  if (state === "idle") {
    updateBoard("Routing daemon idle.");
  } else if (state === "success") {
    updateBoard("Routes locked. Upload restored.");
  } else if (state === "warn") {
    updateBoard("Mismatch detected. Verify prefixes.");
  } else {
    updateBoard("Propagating route updates…");
  }
});

if (form) {
  updateTraceVisual(extractValues(new FormData(form)));
}
