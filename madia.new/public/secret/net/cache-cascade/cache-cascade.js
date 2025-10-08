const form = document.getElementById("cache-form");
const board = document.getElementById("status-board");
const streamVisual = document.querySelector(".stream-visual");
const meterLookup = {
  static: document.querySelector('[data-stream="static"]'),
  cms: document.querySelector('[data-stream="cms"]'),
  mirror: document.querySelector('[data-stream="mirror"]'),
};
const surgeMonitor = document.querySelector(".surge-monitor");
const surgeFill = surgeMonitor?.querySelector(".surge-fill");
const surgeDots = surgeMonitor ? surgeMonitor.querySelectorAll(".surge-dot") : [];

const expected = {
  static: { route: "parent", ttl: "60" },
  cms: { route: "direct", ttl: "5" },
  mirror: { route: "sibling", ttl: "240" },
};

const updateBoard = (message, state = "idle") => {
  board.textContent = message;
  board.dataset.state = state;
};

const setMeterState = (key, state) => {
  const meter = meterLookup[key];
  if (!meter) {
    return;
  }
  meter.dataset.state = state;
};

const updateStreamVisual = (formData) => {
  let allGood = true;
  let correctStreams = 0;
  Object.entries(expected).forEach(([key, config]) => {
    const route = formData.get(key) || "";
    const ttl = formData.get(`${key}-ttl`) || "";
    let state = "idle";
    if (!route && !ttl) {
      state = "idle";
      allGood = false;
    } else if ((route && !ttl) || (!route && ttl)) {
      state = "partial";
      allGood = false;
    } else if (route === config.route && ttl === config.ttl) {
      state = "good";
      correctStreams += 1;
    } else {
      state = "warn";
      allGood = false;
    }
    setMeterState(key, state);
  });

  if (streamVisual) {
    streamVisual.dataset.flow = allGood ? "on" : "off";
  }

  const ratio = Object.keys(expected).length
    ? correctStreams / Object.keys(expected).length
    : 0;
  if (surgeMonitor) {
    surgeMonitor.style.setProperty("--progress", String(ratio));
    surgeMonitor.dataset.progress = String(correctStreams);
    if (correctStreams === Object.keys(expected).length) {
      surgeMonitor.dataset.state = "steady";
    } else if (correctStreams > 0) {
      surgeMonitor.dataset.state = "warming";
    } else {
      surgeMonitor.dataset.state = "idle";
    }
  }
  surgeDots.forEach((dot, index) => {
    dot.dataset.active = index < correctStreams ? "on" : "off";
  });
  surgeFill?.style.setProperty("--progress", String(ratio));
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
  updateStreamVisual(formData);
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
  updateStreamVisual(formData);
  const mismatches = evaluateCache(formData);
  if (!mismatches.length) {
    updateBoard("Hierarchy ready. Commit to squid.conf.");
  } else {
    updateBoard("Cache hit ratio falling…");
  }
});

if (form) {
  updateStreamVisual(new FormData(form));
}
