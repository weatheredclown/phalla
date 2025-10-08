import { initFullscreenToggle } from "../fullscreen.js";

initFullscreenToggle();

const form = document.getElementById("ppp-form");
const board = document.getElementById("status-board");
const handshakeVisual = document.querySelector(".handshake-visual");
const signalWave = handshakeVisual?.querySelector(".signal-wave");
const phaseChips = new Map(
  Array.from(document.querySelectorAll(".phase-chip")).map((element) => [element.dataset.phase, element])
);

const expectedOrder = {
  carrier: "1",
  lcp: "2",
  auth: "3",
  ipcp: "4",
};

const expectedPhases = Object.entries(expectedOrder).sort(([, a], [, b]) => Number(a) - Number(b));

const updateBoard = (message, state = "idle") => {
  board.textContent = message;
  board.dataset.state = state;
  if (handshakeVisual) {
    handshakeVisual.dataset.state = state;
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
  const mismatches = Object.entries(expectedOrder).filter(([key, value]) => values[key] !== value).map(([key]) => key);
  return { duplicates, mismatches };
};

const computeProgress = (values, duplicates) => {
  let progress = 0;
  for (const [phase, step] of expectedPhases) {
    const assigned = values[phase];
    if (!assigned || duplicates.has(assigned) || assigned !== step) {
      break;
    }
    progress += 1;
  }
  return progress / expectedPhases.length;
};

const updateHandshakeVisual = (values, duplicates, mismatches) => {
  const mismatchSet = new Set(mismatches);
  phaseChips.forEach((chip, phase) => {
    const assigned = values[phase];
    const indexEl = chip.querySelector(".phase-index");
    if (indexEl) {
      indexEl.textContent = assigned || expectedOrder[phase];
    }
    if (!assigned) {
      chip.dataset.state = "";
      return;
    }
    if (duplicates.has(assigned)) {
      chip.dataset.state = "error";
      return;
    }
    if (!mismatchSet.has(phase)) {
      chip.dataset.state = "active";
    } else {
      chip.dataset.state = "pending";
    }
  });
  if (signalWave) {
    const progressRatio = computeProgress(values, duplicates);
    signalWave.style.setProperty("--handshake-progress", progressRatio.toString());
  }
};

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const values = collectValues(formData);
  const { duplicates, mismatches } = evaluateOrder(values);
  updateHandshakeVisual(values, duplicates, mismatches);
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
  const values = collectValues(formData);
  const { duplicates, mismatches } = evaluateOrder(values);
  updateHandshakeVisual(values, duplicates, mismatches);
  if (!duplicates.size && !mismatches.length) {
    updateBoard("Sequence locked. Dial when ready.");
  } else {
    updateBoard("Modem idle. Awaiting script…");
  }
});

if (form) {
  const values = collectValues(new FormData(form));
  const { duplicates, mismatches } = evaluateOrder(values);
  updateHandshakeVisual(values, duplicates, mismatches);
}
