import { initFullscreenToggle } from "../fullscreen.js";

initFullscreenToggle();

const form = document.getElementById("zone-form");
const board = document.getElementById("status-board");
const tileLookup = {
  www: document.querySelector('[data-record="www"]'),
  mail: document.querySelector('[data-record="mail"]'),
  root: document.querySelector('[data-record="root"]'),
};
const tileProgressLookup = {
  www: tileLookup.www?.querySelector('[data-role="tile-progress"]') || null,
  mail: tileLookup.mail?.querySelector('[data-role="tile-progress"]') || null,
  root: tileLookup.root?.querySelector('[data-role="tile-progress"]') || null,
};
const fieldsetLookup = {
  www: document.querySelector('fieldset[data-record="www"]'),
  mail: document.querySelector('fieldset[data-record="mail"]'),
  root: document.querySelector('fieldset[data-record="root"]'),
};
const zoneVisual = document.querySelector(".zone-visual");
const propagationMeter = document.querySelector(".propagation-meter");
const propagationPips = propagationMeter
  ? propagationMeter.querySelectorAll(".propagation-pip")
  : [];
const hintButton = document.querySelector('[data-role="hint-button"]');
const hintFeed = document.querySelector('[data-role="hint-feed"]');

const recordLabels = {
  www: "Host www",
  mail: "Host mail",
  root: "Root (@)",
  zone: "Zone status",
};

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
const controlLookup = {};
Object.values(recordFields)
  .flat()
  .forEach((field) => {
    const control = form?.querySelector(`[name="${field}"]`);
    if (control instanceof HTMLElement) {
      controlLookup[field] = control;
    }
  });

const hintDeck = {
  www: [
    "Traceroute shows the campus dial-up pool. Only an A record keeps modems happy.",
    "The octets reference test range 203.0.113.x — lock in .42 to match the router notes.",
    "TTL should breathe once per hour: 3600 seconds on the dot.",
  ],
  mail: [
    "MX only — aliases won't satisfy the relay queue.",
    "Mailbox banner says \"mail.isp.example\" with the dot. Match it precisely.",
    "Priority 10 keeps this primary before the backup spooler.",
  ],
  root: [
    "Authoritative servers want an NS record here.",
    "Primary resolver alias reads ns1.isp.example. Trailing dot required.",
  ],
};
const hintProgress = {
  www: 0,
  mail: 0,
  root: 0,
};

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
    const fieldset = fieldsetLookup[record];
    if (!tile) {
      return;
    }
    const values = fields.map((field) => formData.get(field) || "");
    const matches = fields.filter(
      (field) => normalize(field, formData.get(field)) === normalize(field, expected[field])
    ).length;
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
    const tileValue = tile.querySelector(".tile-value");
    if (tileValue) {
      const previewField = fields[0];
      tileValue.textContent = normalize(previewField, formData.get(previewField)) || "—";
    }
    const tileProgress = tileProgressLookup[record];
    if (tileProgress) {
      tileProgress.textContent = `${matches}/${fields.length} aligned`;
    }
    tile.dataset.state = state;
    if (fieldset) {
      fieldset.dataset.state = state;
    }
    fields.forEach((field) => {
      const control = controlLookup[field];
      if (control) {
        control.dataset.state = state;
      }
    });
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

const removeHintPlaceholder = () => {
  if (!hintFeed) {
    return;
  }
  const placeholder = hintFeed.querySelector(".hint-feed__placeholder");
  if (placeholder) {
    placeholder.remove();
  }
};

const pulseRecord = (record) => {
  const elements = [tileLookup[record], fieldsetLookup[record]];
  elements.forEach((element) => {
    if (!element) {
      return;
    }
    element.classList.add("is-hint");
    window.setTimeout(() => {
      element.classList.remove("is-hint");
    }, 900);
  });
  const fields = recordFields[record] || [];
  fields.forEach((field) => {
    const control = controlLookup[field];
    if (!control) {
      return;
    }
    control.classList.add("is-hint");
    window.setTimeout(() => {
      control.classList.remove("is-hint");
    }, 900);
  });
};

const appendHint = (record, message) => {
  if (!hintFeed) {
    return;
  }
  removeHintPlaceholder();
  const entry = document.createElement("li");
  entry.className = "hint-entry";
  entry.dataset.record = record;
  entry.innerHTML = `
    <span class="hint-entry__label">${recordLabels[record] || record}</span>
    <span class="hint-entry__body">${message}</span>
  `;
  hintFeed.appendChild(entry);
  hintFeed.scrollTop = hintFeed.scrollHeight;
  pulseRecord(record);
};

const handleHintRequest = () => {
  if (!form || !hintButton) {
    return;
  }
  hintButton.dataset.state = "scanning";
  hintButton.disabled = true;
  window.setTimeout(() => {
    hintButton.disabled = false;
    hintButton.dataset.state = "idle";
  }, 850);

  const formData = new FormData(form);
  const mismatches = evaluateZone(formData);
  updateTiles(formData);

  if (!mismatches.length) {
    appendHint("zone", "Zone already balanced — no faults detected.");
    return;
  }

  const mismatchedRecords = Array.from(
    new Set(mismatches.map((field) => field.split("-", 1)[0]))
  );
  mismatchedRecords.sort((a, b) => hintProgress[a] - hintProgress[b]);
  const record = mismatchedRecords[0];
  const deck = hintDeck[record] || [];
  const index = hintProgress[record] ?? 0;
  const hint = deck[Math.min(index, deck.length - 1)] || "Field still drifting. Audit the directive list.";
  hintProgress[record] = index + 1;
  appendHint(record, hint);
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

hintButton?.addEventListener("click", handleHintRequest);
