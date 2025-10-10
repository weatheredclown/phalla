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

const phaseDetails = [
  { id: "carrier", label: "Carrier detect" },
  { id: "lcp", label: "Link control (LCP)" },
  { id: "auth", label: "Authentication" },
  { id: "ipcp", label: "Network control (IPCP)" },
];

const expectedOrder = new Map(
  phaseDetails.map((detail, index) => [detail.id, String(index + 1)])
);
const totalPhases = phaseDetails.length;

const pool = document.querySelector("[data-role=\"phase-pool\"]");
const chips = Array.from(document.querySelectorAll(".phase-chip"));
const slotElements = Array.from(
  document.querySelectorAll("[data-role=\"phase-slot\"]")
);

let selectedChip = null;
let draggingChip = null;

const updateBoard = (message, state = "idle") => {
  board.textContent = message;
  board.dataset.state = state;
};

const getPhaseSlots = () => {
  const assignments = Object.fromEntries(
    phaseDetails.map((detail) => [detail.id, ""])
  );
  slotElements.forEach((slot) => {
    const phase = slot.dataset.phase || "";
    if (phase) {
      assignments[phase] = slot.dataset.slot || "";
    }
  });
  return assignments;
};

const updateWaveVisual = (assignments) => {
  const states = [];
  Object.entries(phaseIndicators).forEach(([phase, element]) => {
    if (!element) {
      return;
    }
    const slot = assignments[phase];
    let state = "idle";
    if (slot) {
      state = slot === expectedOrder.get(phase) ? "good" : "ready";
    }
    element.dataset.state = state;
    states.push(state);
  });

  const goodCount = states.filter((state) => state === "good").length;
  const activeCount = states.filter((state) => state === "ready" || state === "good").length;

  if (waveVisual) {
    const allGood = states.length && states.every((state) => state === "good");
    const hasActive = states.some((state) => state === "ready" || state === "good");
    if (allGood) {
      waveVisual.dataset.state = "live";
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

const refreshBoardMessage = (assignments) => {
  const solved = phaseDetails.every(
    (detail, index) => assignments[detail.id] === String(index + 1)
  );
  if (board.dataset.state === "success" && solved) {
    return;
  }
  if (board.dataset.state === "success" && !solved) {
    board.dataset.state = "idle";
  }

  if (selectedChip) {
    const label = selectedChip.dataset.phaseLabel || selectedChip.textContent.trim();
    updateBoard(`Route ${label} to a slot.`);
    return;
  }

  const filledCount = slotElements.filter((slot) => Boolean(slot.dataset.phase)).length;
  if (!filledCount) {
    updateBoard("Modem idle. Awaiting script…");
    return;
  }

  const mismatches = phaseDetails.filter((detail, index) => {
    const expectedSlot = String(index + 1);
    const actualSlot = assignments[detail.id];
    return actualSlot && actualSlot !== expectedSlot;
  });

  if (filledCount < totalPhases) {
    if (mismatches.length) {
      updateBoard("Alignment off. Continue tuning.");
    } else {
      updateBoard("Negotiation tuning…");
    }
    return;
  }

  if (mismatches.length) {
    updateBoard("Alignment off. Realign handshake.");
    return;
  }

  updateBoard("Sequence locked. Dial when ready.");
};

const updateState = () => {
  const assignments = getPhaseSlots();
  updateWaveVisual(assignments);
  refreshBoardMessage(assignments);
};

const setSelectedChip = (chip) => {
  if (selectedChip && selectedChip !== chip) {
    selectedChip.dataset.selected = "false";
    selectedChip.setAttribute("aria-pressed", "false");
  }
  selectedChip = chip;
  if (chip) {
    chip.dataset.selected = "true";
    chip.setAttribute("aria-pressed", "true");
  }
  refreshBoardMessage(getPhaseSlots());
};

const clearSlotMetadata = (slot) => {
  const slotDrop = slot.querySelector("[data-role=\"slot-drop\"]");
  const placeholder = slot.querySelector("[data-role=\"slot-placeholder\"]");
  if (slotDrop) {
    slotDrop.removeAttribute("data-state");
    slotDrop.setAttribute(
      "aria-label",
      `Slot ${slot.dataset.slot || ""} awaiting assignment`
    );
  }
  if (placeholder) {
    placeholder.hidden = false;
  }
  const input = slot.querySelector("[data-role=\"slot-input\"]");
  if (input) {
    input.value = "";
  }
  slot.dataset.phase = "";
};

const releaseChip = (chip, { focus = false, silent = false } = {}) => {
  if (!chip) {
    return;
  }
  const slot = chip.closest("[data-role=\"phase-slot\"]");
  if (slot) {
    clearSlotMetadata(slot);
  }
  if (selectedChip === chip) {
    setSelectedChip(null);
  }
  chip.dataset.location = "pool";
  chip.dataset.selected = "false";
  chip.setAttribute("aria-pressed", "false");
  pool?.appendChild(chip);
  if (focus) {
    chip.focus();
  }
  if (!silent) {
    updateState();
  }
};

const assignChipToSlot = (chip, slot) => {
  if (!chip || !slot) {
    return;
  }
  const slotContent = slot.querySelector("[data-role=\"slot-content\"]");
  const slotDrop = slot.querySelector("[data-role=\"slot-drop\"]");
  const placeholder = slot.querySelector("[data-role=\"slot-placeholder\"]");

  if (slotContent) {
    const occupyingChip = slotContent.querySelector(".phase-chip");
    if (occupyingChip && occupyingChip !== chip) {
      releaseChip(occupyingChip, { silent: true });
    }
  }

  const previousSlot = chip.closest("[data-role=\"phase-slot\"]");
  if (previousSlot && previousSlot !== slot) {
    clearSlotMetadata(previousSlot);
  }

  if (placeholder) {
    placeholder.hidden = true;
  }
  slotContent?.appendChild(chip);
  chip.dataset.location = "slot";
  chip.dataset.selected = "false";
  chip.setAttribute("aria-pressed", "false");
  slot.dataset.phase = chip.dataset.phase || "";
  if (slotDrop) {
    slotDrop.setAttribute("data-state", "filled");
    const label = chip.dataset.phaseLabel || chip.textContent.trim();
    slotDrop.setAttribute(
      "aria-label",
      `Slot ${slot.dataset.slot || ""} locked to ${label}. Press Delete to clear.`
    );
  }
  const input = slot.querySelector("[data-role=\"slot-input\"]");
  if (input) {
    input.value = chip.dataset.phase || "";
  }
  setSelectedChip(null);
  updateState();
};

chips.forEach((chip) => {
  chip.setAttribute("aria-pressed", "false");
  chip.dataset.location = "pool";

  chip.addEventListener("click", (event) => {
    event.preventDefault();
    if (chip.dataset.location === "slot") {
      releaseChip(chip, { focus: true });
      return;
    }
    if (selectedChip === chip) {
      setSelectedChip(null);
    } else {
      setSelectedChip(chip);
    }
  });

  chip.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      chip.click();
    }
  });

  chip.addEventListener("dragstart", (event) => {
    draggingChip = chip;
    chip.dataset.dragging = "true";
    event.dataTransfer?.setData("text/plain", chip.dataset.phase || "");
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
    }
  });

  chip.addEventListener("dragend", () => {
    draggingChip = null;
    chip.dataset.dragging = "false";
  });
});

const getChipFromTransfer = (event) => {
  const phase = event.dataTransfer?.getData("text/plain");
  if (draggingChip) {
    return draggingChip;
  }
  if (!phase) {
    return null;
  }
  return chips.find((chip) => chip.dataset.phase === phase) || null;
};

slotElements.forEach((slot) => {
  const slotDrop = slot.querySelector("[data-role=\"slot-drop\"]");
  if (!slotDrop) {
    return;
  }

  slotDrop.addEventListener("click", () => {
    if (selectedChip) {
      assignChipToSlot(selectedChip, slot);
      slotDrop.focus();
      return;
    }
    const chipInSlot = slotDrop.querySelector(".phase-chip");
    if (chipInSlot) {
      releaseChip(chipInSlot, { focus: true });
    }
  });

  slotDrop.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && selectedChip) {
      event.preventDefault();
      assignChipToSlot(selectedChip, slot);
      return;
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      const chipInSlot = slotDrop.querySelector(".phase-chip");
      if (chipInSlot) {
        event.preventDefault();
        releaseChip(chipInSlot, { focus: true });
      }
    }
  });

  slotDrop.addEventListener("dragover", (event) => {
    if (!draggingChip) {
      return;
    }
    event.preventDefault();
    slotDrop.setAttribute("data-drop", "active");
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  });

  slotDrop.addEventListener("dragleave", () => {
    slotDrop.removeAttribute("data-drop");
  });

  slotDrop.addEventListener("drop", (event) => {
    event.preventDefault();
    slotDrop.removeAttribute("data-drop");
    const chip = getChipFromTransfer(event);
    if (chip) {
      assignChipToSlot(chip, slot);
      slotDrop.focus();
    }
  });
});

if (pool) {
  pool.addEventListener("dragover", (event) => {
    if (!draggingChip) {
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  });

  pool.addEventListener("drop", (event) => {
    event.preventDefault();
    const chip = getChipFromTransfer(event);
    if (chip) {
      releaseChip(chip, { focus: true });
    }
  });
}

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const assignments = getPhaseSlots();
  const emptySlots = slotElements.filter((slot) => !slot.dataset.phase);
  if (emptySlots.length) {
    updateBoard("PPP script incomplete: assign all phases.", "error");
    return;
  }
  const mismatches = phaseDetails.filter(
    (detail, index) => assignments[detail.id] !== String(index + 1)
  );
  if (mismatches.length) {
    updateBoard(
      `Negotiation failed: adjust ${mismatches
        .map((detail) => detail.label)
        .join(", ")}.`,
      "error"
    );
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

updateState();
