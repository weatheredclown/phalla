import { initFullscreenToggle } from "../fullscreen.js";

initFullscreenToggle();

const form = document.getElementById("zone-form");
const board = document.getElementById("status-board");
const tileLookup = {
  www: document.querySelector('[data-record="www"]'),
  mail: document.querySelector('[data-record="mail"]'),
  root: document.querySelector('[data-record="root"]'),
};
const zoneVisual = document.querySelector(".zone-visual");
const propagationMeter = document.querySelector(".propagation-meter");
const propagationPips = propagationMeter
  ? propagationMeter.querySelectorAll(".propagation-pip")
  : [];

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

const recordFields = {
  www: ["www-type", "www-value", "www-ttl"],
  mail: ["mail-type", "mail-value", "mail-priority"],
  root: ["root-type", "root-value"],
};
const totalRecords = Object.keys(recordFields).length;

const normalize = (name, value) => {
  if (value == null) {
    return "";
  }
  const trimmed = value.trim();
  if (name.endsWith("type")) {
    return trimmed.toUpperCase();
  }
  if (name.endsWith("ttl") || name.endsWith("priority")) {
    return String(Number(trimmed));
  }
  return trimmed.toLowerCase();
};

const updateBoard = (message, state = "idle") => {
  board.textContent = message;
  board.dataset.state = state;
};

const evaluateZone = (formData) => {
  const mismatches = [];
  Object.entries(expected).forEach(([name, target]) => {
    if (normalize(name, formData.get(name)) !== normalize(name, target)) {
      mismatches.push(name);
    }
  });
  return mismatches;
};

const updateTiles = (formData) => {
  let allGood = true;
  let alignedCount = 0;
  Object.entries(recordFields).forEach(([record, fields]) => {
    const tile = tileLookup[record];
    if (!tile) {
      return;
    }
    const values = fields.map((field) => formData.get(field) || "");
    const touched = values.some((value) => value.trim().length > 0);
    const aligned = fields.every(
      (field) => normalize(field, formData.get(field)) === normalize(field, expected[field])
    );
    if (!aligned) {
      allGood = false;
    } else {
      alignedCount += 1;
    }
    let state = "idle";
    if (touched || aligned) {
      state = aligned ? "good" : "warn";
    }
    tile.dataset.state = state;
  });

  if (zoneVisual) {
    zoneVisual.dataset.state = allGood ? "aligned" : "draft";
  }

  if (propagationMeter) {
    const ratio = totalRecords ? alignedCount / totalRecords : 0;
    propagationMeter.style.setProperty("--progress", String(ratio));
    if (alignedCount === totalRecords) {
      propagationMeter.dataset.state = "ready";
    } else if (alignedCount > 0) {
      propagationMeter.dataset.state = "warming";
    } else {
      propagationMeter.dataset.state = "idle";
    }
  }
  propagationPips.forEach((pip, index) => {
    pip.dataset.active = index < alignedCount ? "on" : "off";
  });
};

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const mismatches = evaluateZone(formData);
  updateTiles(formData);
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
  updateTiles(formData);
  if (!mismatches.length) {
    updateBoard("All records align. Ready to push.");
  } else if (mismatches.length <= 2) {
    updateBoard("Records warming. Adjust highlighted tiles.");
  } else {
    updateBoard("Awaiting alignment…");
  }
});

if (form) {
  updateTiles(new FormData(form));
}
