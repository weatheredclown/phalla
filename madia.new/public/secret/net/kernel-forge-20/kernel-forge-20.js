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
    idle: "stack cold",
    partial: "patching",
    warn: "miswired",
    good: "linked",
  },
  drivers: {
    idle: "waiting",
    partial: "queuing",
    warn: "conflict",
    good: "locked in",
  },
  trim: {
    idle: "unused",
    warn: "bloated",
    good: "lean",
  },
};

const REQUIRED_NETWORK = ["forwarding", "firewall"];
const OPTIONAL_NETWORK = ["ipv6"];
const REQUIRED_NIC_MODE = "builtin";
const FORBIDDEN_DRIVERS = ["scsi", "sound"];

const updateBoard = (message, state = "idle") => {
  board.textContent = message;
  board.dataset.state = state;
};

const evaluateKernel = (formData) => {
  const network = new Set(formData.getAll("network"));
  const drivers = new Set(formData.getAll("drivers"));
  const nicMode = formData.get("nic-mode");
  const issues = [];

  REQUIRED_NETWORK.forEach((flag) => {
    if (!network.has(flag)) {
      issues.push(`Enable ${flag}`);
    }
  });

  OPTIONAL_NETWORK.forEach((flag) => {
    if (network.has(flag)) {
      issues.push(`Disable ${flag}`);
    }
  });

  if (nicMode !== REQUIRED_NIC_MODE) {
    issues.push("3c59x mode");
  }

  FORBIDDEN_DRIVERS.forEach((flag) => {
    if (drivers.has(flag)) {
      issues.push(`Remove ${flag}`);
    }
  });

  return { issues, network, drivers, nicMode };
};

const setDialState = (key, state) => {
  const dial = dialLookup[key];
  if (!dial) {
    return;
  }
  dial.dataset.state = state;
};

const updateTickerStep = (key, state) => {
  const element = tickerSteps[key];
  if (!element) {
    return;
  }
  element.dataset.state = state;
  const statusMap = tickerMessages[key] || {};
  const status = statusMap[state] || statusMap.idle || "idle";
  element.dataset.status = status;
};

const updateCompileVisual = ({ network, drivers, nicMode }) => {
  const hasForwarding = network.has("forwarding");
  const hasFirewall = network.has("firewall");
  const hasIPv6 = network.has("ipv6");

  let networkState = "idle";
  if (hasIPv6) {
    networkState = "warn";
  } else if (hasForwarding && hasFirewall) {
    networkState = "good";
  } else if (hasForwarding || hasFirewall || network.size > 0) {
    networkState = "partial";
  }
  setDialState("network", networkState);

  let driverState = "partial";
  if (drivers.has("scsi") || drivers.has("sound")) {
    driverState = "warn";
  } else if (nicMode === REQUIRED_NIC_MODE) {
    driverState = "good";
  }
  setDialState("drivers", driverState);

  const trimState = drivers.has("scsi") || drivers.has("sound") ? "warn" : "good";
  setDialState("trim", trimState);
  updateTickerStep("network", networkState);
  updateTickerStep("drivers", driverState);
  updateTickerStep("trim", trimState);

  const states = [networkState, driverState, trimState];
  const goodCount = states.filter((state) => state === "good").length;
  const warnCount = states.filter((state) => state === "warn").length;
  const progress = goodCount / states.length;

  if (progressGauge) {
    progressGauge.style.setProperty("--progress", String(progress));
    if (warnCount > 0) {
      progressGauge.dataset.state = "warn";
    } else if (goodCount === states.length) {
      progressGauge.dataset.state = "ready";
    } else {
      progressGauge.dataset.state = "idle";
    }
  }

  if (ticker) {
    if (warnCount > 0) {
      ticker.dataset.state = "warn";
    } else if (goodCount === states.length) {
      ticker.dataset.state = "ready";
    } else if (states.some((state) => state !== "idle")) {
      ticker.dataset.state = "active";
    } else {
      ticker.dataset.state = "idle";
    }
  }
};

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const result = evaluateKernel(formData);
  updateCompileVisual(result);
  if (result.issues.length) {
    updateBoard(`Build failed: ${result.issues.join(", ")}.`, "error");
    return;
  }
  updateBoard("Kernel linked. bzImage staged in /boot.", "success");
  window.parent?.postMessage(
    {
      type: "net:level-complete",
      game: "kernel-forge-20",
      payload: {
        status: "Router ready",
        score: 20036,
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
  const result = evaluateKernel(formData);
  updateCompileVisual(result);
  if (!result.issues.length) {
    updateBoard("Config matches memo. make bzImage ready.");
  } else if (result.issues.length < 3) {
    updateBoard("Tuning flags… keep trimming.");
  } else {
    updateBoard("Awaiting config for make menuconfig…");
  }
});

if (form) {
  const initial = evaluateKernel(new FormData(form));
  updateCompileVisual(initial);
}
