const form = document.getElementById("gopher-form");
const board = document.getElementById("status-board");
const preview = document.getElementById("preview-output");
const progressMeter = document.getElementById("progress-meter");
const progressFill = progressMeter?.querySelector(".progress-fill");
const rows = Array.from(document.querySelectorAll(".row"));
const previewRows = {
  banner: document.querySelector('[data-preview-row="banner"]'),
  catalog: document.querySelector('[data-preview-row="catalog"]'),
  zine: document.querySelector('[data-preview-row="zine"]'),
};

const expected = {
  "banner-text": "Library Net Welcome",
  "banner-selector": "/motd.txt",
  "banner-host": "gopher.library.lan",
  "banner-type": "i",
  "catalog-text": "Catalog Search Terminal",
  "catalog-selector": "/query",
  "catalog-host": "catalog.library.lan",
  "catalog-type": "7",
  "zine-text": "Weekly Sparks",
  "zine-selector": "/zines/weeklysparks.txt",
  "zine-host": "198.51.100.77",
  "zine-type": "0",
};

const updateBoard = (message, state = "idle") => {
  board.textContent = message;
  board.dataset.state = state;
};

const formatValue = (value) => {
  const trimmed = (value || "").trim();
  return trimmed ? trimmed : "???";
};

const rowFieldMap = {
  banner: ["banner-type", "banner-text", "banner-selector", "banner-host"],
  catalog: ["catalog-type", "catalog-text", "catalog-selector", "catalog-host"],
  zine: ["zine-type", "zine-text", "zine-selector", "zine-host"],
};

const updateRowStates = (formData) => {
  let completeCount = 0;
  rows.forEach((row) => {
    const key = row.dataset.row;
    if (!key) {
      return;
    }
    const fields = rowFieldMap[key];
    if (!fields) {
      return;
    }
    const values = fields.map((name) => (formData.get(name) || "").trim());
    const filled = values.some(Boolean);
    const matches = fields.every((name) => (formData.get(name) || "").trim() === expected[name]);
    if (matches) {
      row.dataset.state = "complete";
      completeCount += 1;
    } else if (filled) {
      row.dataset.state = "editing";
    } else {
      delete row.dataset.state;
    }
    const previewRow = previewRows[key];
    if (previewRow) {
      const [typeField, textField, selectorField, hostField] = fields;
      const type = formatValue(formData.get(typeField));
      const display = formatValue(formData.get(textField));
      const selector = formatValue(formData.get(selectorField));
      const host = formatValue(formData.get(hostField));
      const port = key === "zine" ? "70" : "70";
      previewRow.textContent = `${type}${display}\t${selector}\t${host}\t${port}`;
      previewRow.dataset.state = matches ? "complete" : filled ? "editing" : "empty";
    }
  });

  if (progressMeter && progressFill) {
    const progressValue = completeCount;
    const progressPercent = completeCount / rows.length;
    progressFill.style.setProperty("--progress", progressPercent.toString());
    progressFill.style.transform = `scaleX(${progressPercent})`;
    progressMeter.setAttribute("aria-valuenow", progressValue.toString());
  }

  if (preview) {
    preview.dataset.state = completeCount === rows.length ? "complete" : "editing";
  }
};

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  updateRowStates(data);
  const errors = Object.entries(expected).filter(([name, value]) => (data.get(name) || "").trim() !== value);
  if (errors.length) {
    updateBoard("Menu mismatch. Check selector, type, and host fields.", "error");
    return;
  }
  updateBoard("Gophermap saved. Terminals update in sync.", "success");
  window.parent?.postMessage(
    {
      type: "net:level-complete",
      game: "gopher-groundskeeper",
      payload: {
        status: "Burrows indexed",
        score: 38000,
      },
    },
    "*"
  );
});

form?.addEventListener("input", () => {
  if (board.dataset.state === "success") {
    return;
  }
  const data = new FormData(form);
  updateRowStates(data);
  updateBoard("Awaiting menu entries.");
});

if (form) {
  updateRowStates(new FormData(form));
}
