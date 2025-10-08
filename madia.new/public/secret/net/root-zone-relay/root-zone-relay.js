import { initFullscreenToggle } from "../fullscreen.js";

initFullscreenToggle();

const form = document.getElementById("zone-form");
const board = document.getElementById("status-board");
const zoneVisual = document.querySelector(".zone-visual");
const recordChips = new Map(
  Array.from(document.querySelectorAll(".record-chip")).map((element) => [element.dataset.record, element])
);

const expected = {
  "www-type": "A",
  "www-value": "203.0.113.42",
  "www-ttl": "3600",
  "mail-type": "MX",
  "mail-value": "mail.isp.example.",
  "mail-priority": "10",
  "root-type": "NS",
  "root-value": "ns1.isp.example.",
};

const normalize = (name, value) => {
  if (value == null) {
    return "";
  }
  if (name.endsWith("type")) {
    return value.trim().toUpperCase();
  }
  if (name.endsWith("ttl") || name.endsWith("priority")) {
    return String(Number(value));
  }
  return value.trim().toLowerCase();
};

const updateBoard = (message, state = "idle") => {
  board.textContent = message;
  board.dataset.state = state;
  if (zoneVisual) {
    zoneVisual.dataset.state = state;
  }
};

const recordFields = {
  www: ["www-type", "www-value", "www-ttl"],
  mail: ["mail-type", "mail-value", "mail-priority"],
  root: ["root-type", "root-value"],
};

const formatRecordValue = (record, values) => {
  if (record === "www") {
    const [type, value, ttl] = values;
    if (!type && !value && !ttl) {
      return "pending";
    }
    return `${value || "—"}${ttl ? ` · ${ttl}s` : ""}`;
  }
  if (record === "mail") {
    const [type, value, priority] = values;
    if (!type && !value && !priority) {
      return "pending";
    }
    return `${value || "—"}${priority ? ` · pref ${priority}` : ""}`;
  }
  const [, value] = values;
  return value || "pending";
};

const updateRecords = (formData, mismatches = []) => {
  const mismatchLookup = new Set(mismatches);
  recordChips.forEach((chip, key) => {
    const fields = recordFields[key];
    if (!fields) {
      return;
    }
    const rawValues = fields.map((field) => (formData.get(field) || "").trim());
    const normalizedValues = fields.map((field, index) => normalize(field, rawValues[index]));
    const typeEl = chip.querySelector('[data-role="type"]');
    const valueEl = chip.querySelector('[data-role="value"]');
    if (typeEl) {
      typeEl.textContent = normalizedValues[0] ? normalizedValues[0].toUpperCase() : "—";
    }
    if (valueEl) {
      valueEl.textContent = formatRecordValue(key, rawValues);
    }
    const hasValues = rawValues.every((value) => value);
    if (board.dataset.state === "success") {
      chip.dataset.state = "ready";
      return;
    }
    if (!hasValues) {
      chip.dataset.state = "";
      return;
    }
    const mismatch = fields.some((field) => mismatchLookup.has(field));
    chip.dataset.state = mismatch ? "error" : "ready";
  });
};

const evaluateZone = (formData) => {
  const mismatches = [];
  for (const [name, target] of Object.entries(expected)) {
    const inputValue = normalize(name, formData.get(name));
    const expectedValue = normalize(name, target);
    if (inputValue !== expectedValue) {
      mismatches.push(name);
    }
  }
  return mismatches;
};

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const mismatches = evaluateZone(formData);
  updateRecords(formData, mismatches);
  if (mismatches.length) {
    updateBoard(
      `Zone reject: ${mismatches.length} field${mismatches.length === 1 ? "" : "s"} misaligned.`,
      "error"
    );
    return;
  }
  updateBoard("Zone propagated. Secondary acknowledges serial bump.", "success");
  window.parent?.postMessage(
    {
      type: "net:level-complete",
      game: "root-zone-relay",
      payload: {
        status: "Zone steady",
        score: 3600,
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
  const mismatches = evaluateZone(formData);
  updateRecords(formData, mismatches);
  if (!mismatches.length) {
    updateBoard("All records align. Ready to push.");
  } else {
    updateBoard("Awaiting alignment…");
  }
});

if (form) {
  updateRecords(new FormData(form));
}
