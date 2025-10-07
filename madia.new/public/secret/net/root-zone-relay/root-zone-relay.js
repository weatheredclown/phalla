const form = document.getElementById("zone-form");
const board = document.getElementById("status-board");

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
  if (!mismatches.length) {
    updateBoard("All records align. Ready to push.");
  } else {
    updateBoard("Awaiting alignment…");
  }
});
