import { initFullscreenToggle } from "../fullscreen.js";

initFullscreenToggle();

const form = document.getElementById("kernel-form");
const board = document.getElementById("status-board");
const dialLookup = {
  network: document.querySelector('[data-step="network"]'),
  drivers: document.querySelector('[data-step="drivers"]'),
  trim: document.querySelector('[data-step="trim"]'),
};
const progressGauge = document.querySelector(".compile-progress");
const ticker = document.querySelector(".compile-ticker");
const tickerSteps = ticker
  ? {
      network: ticker.querySelector('[data-ticker="network"]'),
      drivers: ticker.querySelector('[data-ticker="drivers"]'),
      trim: ticker.querySelector('[data-ticker="trim"]'),
    }
  : {};

const tickerMessages = {
  network: {
    idle: "Routing stack cold",
    warming: "Routing stack primed",
    good: "Routing stack online",
  },
  drivers: {
    idle: "Drivers queued",
    warming: "Driver matrix compiling",
    good: "Driver matrix ready",
  },
  trim: {
    idle: "Image trim pending",
    warming: "Stripping modules…",
    good: "Image trimmed",
  },
};

const required = {
  network: new Set(["forwarding", "firewall"]),
  drivers: {
    mode: "builtin",
    excluded: new Set(["scsi", "sound"]),
  },
};

const updateBoard = (message, state = "idle") => {
  board.textContent = message;
  board.dataset.state = state;
};

const applyDialState = (step, state) => {
  const dial = dialLookup[step];
  if (!dial) {
    return;
  }
  dial.dataset.state = state;
  const tickerStep = tickerSteps[step];
  if (tickerStep) {
    tickerStep.textContent = tickerMessages[step][state] || tickerMessages[step].idle;
  }
};

const evaluateNetwork = (values) => {
  const selected = new Set(values.network || []);
  let state = "idle";
  if (selected.size > 0) {
    state = required.network.every((feature) => selected.has(feature)) ? "good" : "warn";
  }
  applyDialState("network", state);
  return state === "good";
};

const evaluateDrivers = (values) => {
  const modeGood = values.nicMode === required.drivers.mode;
  const excluded = new Set(values.drivers || []);
  const hasForbidden = Array.from(required.drivers.excluded).some((flag) => excluded.has(flag));
  let state = "idle";
  if (values.nicMode || excluded.size) {
    state = modeGood && !hasForbidden ? "good" : "warn";
  }
  applyDialState("drivers", state);
  return state === "good";
};

const evaluateTrim = (networkGood, driversGood) => {
  const state = networkGood && driversGood ? "good" : networkGood || driversGood ? "warming" : "idle";
  applyDialState("trim", state);
  return state === "good";
};

const updateGauge = (completed) => {
  if (!progressGauge) {
    return;
  }
  const ratio = completed / Object.keys(dialLookup).length;
  progressGauge.dataset.state =
    completed === 0 ? "idle" : completed === Object.keys(dialLookup).length ? "ready" : "progress";
  progressGauge.style.setProperty("--progress", String(ratio));
};

const extractValues = (formData) => ({
  network: formData.getAll("network"),
  nicMode: formData.get("nic-mode") || "module",
  drivers: formData.getAll("drivers"),
});

const evaluateForm = (formData) => {
  const values = extractValues(formData);
  const networkGood = evaluateNetwork(values);
  const driversGood = evaluateDrivers(values);
  const trimGood = evaluateTrim(networkGood, driversGood);
  const completed = [networkGood, driversGood, trimGood].filter(Boolean).length;
  updateGauge(completed);
  if (completed === 0) {
    return "idle";
  }
  if (completed === 3) {
    return "success";
  }
  if (!networkGood || !driversGood) {
    return "warn";
  }
  return "progress";
};

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const status = evaluateForm(formData);
  if (status !== "success") {
    updateBoard("Compile aborted. Checklist incomplete.", "error");
    return;
  }
  updateBoard("Kernel forged. Deploy to router farm.", "success");
  window.parent?.postMessage(
    {
      type: "net:level-complete",
      game: "kernel-forge-20",
      payload: {
        status: "Kernel patched",
        score: 200,
      },
    },
    "*"
  );
});

form?.addEventListener("input", () => {
  if (board.dataset.state === "success") {
    return;
  }
  const status = evaluateForm(new FormData(form));
  if (status === "idle") {
    updateBoard("Awaiting config for make menuconfig…");
  } else if (status === "success") {
    updateBoard("Kernel forged. Deploy to router farm.", "success");
  } else if (status === "warn") {
    updateBoard("Build flags out of spec. Recheck memo.");
  } else {
    updateBoard("Configuring kernel options…");
  }
});

if (form) {
  evaluateForm(new FormData(form));
}
