import { initFullscreenToggle } from "../fullscreen.js";

initFullscreenToggle();

const form = document.getElementById("gopher-form");
const board = document.getElementById("status-board");
const preview = document.getElementById("gopher-preview");
const rowLookup = {
  banner: document.querySelector('[data-row="banner"]'),
  catalog: document.querySelector('[data-row="catalog"]'),
  zine: document.querySelector('[data-row="zine"]'),
};
const menuMeter = document.querySelector(".menu-meter");
const meterPips = menuMeter ? menuMeter.querySelectorAll(".meter-pip") : [];

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

const toRowKey = (name) => name.split("-")[0];

const updateBoard = (message, state = "idle") => {
  board.textContent = message;
  board.dataset.state = state;
};

const buildPreviewLine = (type, text, selector, host, port = "70") =>
  `${type}\t${text || "--"}\t${selector || "--"}\t${host || "--"}\t${port}`;

const updatePreview = (formData) => {
  if (!preview) {
    return;
  }
  const bannerLine = buildPreviewLine(
    formData.get("banner-type") || "i",
    formData.get("banner-text") || "--",
    formData.get("banner-selector") || "--",
    formData.get("banner-host") || "--"
  );
  const catalogLine = buildPreviewLine(
    formData.get("catalog-type") || "7",
    formData.get("catalog-text") || "--",
    formData.get("catalog-selector") || "--",
    formData.get("catalog-host") || "--"
  );
  const zinePort = formData.get("zine-port") || "70";
  const zineLine = buildPreviewLine(
    formData.get("zine-type") || "0",
    formData.get("zine-text") || "--",
    formData.get("zine-selector") || "--",
    formData.get("zine-host") || "--",
    zinePort
  );
  preview.textContent = `${bannerLine}\n${catalogLine}\n${zineLine}`;
};

const evaluateRow = (formData, prefix) => {
  const fields = ["text", "selector", "host", "type"];
  if (prefix === "zine") {
    fields.push("port");
  }
  const mismatches = fields.filter((field) => {
    const key = `${prefix}-${field}`;
    const expectedValue = expected[key];
    if (expectedValue === undefined) {
      return field !== "port" ? !(formData.get(key) || "").trim() : false;
    }
    return (formData.get(key) || "").trim() !== expectedValue;
  });
  return mismatches;
};

const applyRowState = (rowName, state) => {
  const row = rowLookup[rowName];
  if (!row) {
    return;
  }
  row.dataset.state = state;
};

const updateMeter = (rowsFilled) => {
  const ratio = rowsFilled / Object.keys(rowLookup).length;
  if (menuMeter) {
    menuMeter.dataset.state = rowsFilled === 0 ? "idle" : rowsFilled === 3 ? "complete" : "partial";
    menuMeter.style.setProperty("--progress", String(ratio));
  }
  meterPips.forEach((pip, index) => {
    pip.dataset.active = index < rowsFilled ? "on" : "off";
  });
};

const handleInput = () => {
  if (board.dataset.state === "success") {
    return;
  }
  const formData = new FormData(form);
  updatePreview(formData);
  let rowsCorrect = 0;
  Object.keys(rowLookup).forEach((rowName) => {
    const issues = evaluateRow(formData, rowName);
    if (!issues.length) {
      rowsCorrect += 1;
    }
    const touched = fieldsFilled(formData, rowName);
    const state = !touched ? "idle" : issues.length ? "warn" : "good";
    applyRowState(rowName, state);
  });
  updateMeter(rowsCorrect);
  if (rowsCorrect === Object.keys(rowLookup).length) {
    updateBoard("Menu ready. Publish to gophermap.");
  } else {
    updateBoard("Awaiting menu entries.");
  }
};

const fieldsFilled = (formData, prefix) => {
  const keys = Object.keys(expected).filter((key) => key.startsWith(`${prefix}-`));
  return keys.some((key) => (formData.get(key) || "").trim().length > 0);
};

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  updatePreview(formData);
  const issues = Object.keys(rowLookup).flatMap((rowName) =>
    evaluateRow(formData, rowName).map((field) => `${rowName} ${field}`)
  );
  if (issues.length) {
    updateBoard(`Gophermap rejected: fix ${issues.join(", ")}.`, "error");
    return;
  }
  updateBoard("Entries aligned. Menu pushed to campus net.", "success");
  window.parent?.postMessage(
    {
      type: "net:level-complete",
      game: "gopher-groundskeeper",
      payload: {
        status: "Menu matched",
        score: 3270,
      },
    },
    "*"
  );
});

form?.addEventListener("input", handleInput);

if (form) {
  updatePreview(new FormData(form));
}
