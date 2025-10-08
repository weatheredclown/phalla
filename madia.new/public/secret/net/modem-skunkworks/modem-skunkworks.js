import { initFullscreenToggle } from "../fullscreen.js";

initFullscreenToggle();

const form = document.getElementById("ppp-form");
const board = document.getElementById("status-board");
const waveVisual = document.querySelector(".wave-visual");
const phaseIndicators = {
  carrier: document.querySelector('[data-phase="carrier"]'),
  lcp: document.querySelector('[data-phase="lcp"]'),
  auth: document.querySelector('[data-phase="auth"]'),
  ipcp: document.querySelector('[data-phase="ipcp"]'),
};
const syncMeter = document.querySelector(".sync-meter");
const syncDots = syncMeter ? syncMeter.querySelectorAll(".sync-dot") : [];

const expectedOrder = {
  carrier: "1",
  lcp: "2",
  auth: "3",
  ipcp: "4",
};
const totalPhases = Object.keys(expectedOrder).length;

const updateBoard = (message, state = "idle") => {
  board.textContent = message;
  board.dataset.state = state;
};

const extractValues = (formData) =>
  Object.fromEntries(
    Object.keys(expectedOrder).map((key) => [key, formData.get(key) || ""])
  );

const computeDuplicates = (values) => {
  const seen = new Map();
  const duplicates = new Set();
  Object.entries(values).forEach(([phase, slot]) => {
    if (!slot) {
      return;
    }
    if (seen.has(slot)) {
      duplicates.add(phase);
      duplicates.add(seen.get(slot));
    } else {
      seen.set(slot, phase);
    }
  });
  return duplicates;
};

const updateWaveVisual = (values, duplicates) => {
  const states = [];
  Object.entries(phaseIndicators).forEach(([phase, element]) => {
    if (!element) {
      return;
    }
    const slot = values[phase];
    let state = "idle";
    if (slot) {
      if (duplicates.has(phase)) {
        state = "warn";
      } else if (slot === expectedOrder[phase]) {
        state = "good";
      } else {
        state = "ready";
      }
    }
    element.dataset.state = state;
    states.push(state);
  });

  const goodCount = states.filter((state) => state === "good").length;
  const activeCount = states.filter((state) => state === "ready" || state === "good").length;

  if (waveVisual) {
    const allGood = states.length && states.every((state) => state === "good");
    const hasWarn = states.some((state) => state === "warn");
    const hasActive = states.some((state) => state === "ready" || state === "good");
    if (allGood) {
      waveVisual.dataset.state = "live";
    } else if (hasWarn) {
      waveVisual.dataset.state = "warn";
    } else if (hasActive) {
      waveVisual.dataset.state = "active";
    } else {
      waveVisual.dataset.state = "idle";
    }
  }

  if (syncMeter) {
    const ratio = totalPhases ? goodCount / totalPhases : 0;
    syncMeter.style.setProperty("--progress", String(ratio));
    if (goodCount === totalPhases) {
      syncMeter.dataset.state = "linked";
    } else if (activeCount > 0) {
      syncMeter.dataset.state = "active";
    } else {
      syncMeter.dataset.state = "idle";
    }
  }
  syncDots.forEach((dot, index) => {
    dot.dataset.active = index < goodCount ? "on" : "off";
  });
};

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const values = extractValues(formData);
  const duplicates = computeDuplicates(values);
  updateWaveVisual(values, duplicates);
  if (duplicates.size) {
    updateBoard(
      `Modem error: duplicate steps ${Array.from(duplicates).join(", ")}.`,
      "error"
    );
    return;
  }
  const mismatches = Object.entries(expectedOrder).filter(
    ([phase, slot]) => values[phase] !== slot
  );
  if (mismatches.length) {
    updateBoard(`Negotiation failed: adjust ${mismatches.map(([phase]) => phase).join(", ")}.`, "error");
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
  const values = extractValues(formData);
  const duplicates = computeDuplicates(values);
  updateWaveVisual(values, duplicates);
  const mismatches = Object.entries(expectedOrder).filter(
    ([phase, slot]) => values[phase] !== slot
  );
  if (!duplicates.size && !mismatches.length) {
    updateBoard("Sequence locked. Dial when ready.");
  } else if (duplicates.size) {
    updateBoard("Handshake colliding. Clear duplicates.");
  } else if (Object.values(values).some(Boolean)) {
    updateBoard("Negotiation tuning…");
  } else {
    updateBoard("Modem idle. Awaiting script…");
  }
});

if (form) {
  const initialValues = extractValues(new FormData(form));
  updateWaveVisual(initialValues, new Set());
}
