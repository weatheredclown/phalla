import { initFullscreenToggle } from "../fullscreen.js";

initFullscreenToggle();

const form = document.getElementById("parser-form");
const board = document.getElementById("status-board");
const pipelineVisual = document.querySelector(".pipeline-visual");
const filterOutput = pipelineVisual?.querySelector('[data-role="filter-output"]');
const formatOutput = pipelineVisual?.querySelector('[data-role="format-output"]');
const filterStage = pipelineVisual?.querySelector('[data-stage="filter"]');
const formatStage = pipelineVisual?.querySelector('[data-stage="format"]');
const filterSelect = form?.querySelector('select[name="filter"]');
const formatSelect = form?.querySelector('select[name="format"]');

const expected = {
  filter: "sed-block",
  format: "sed-collapse",
};

const updateBoard = (message, state = "idle") => {
  board.textContent = message;
  board.dataset.state = state;
  if (pipelineVisual) {
    pipelineVisual.dataset.state = state;
  }
};

const optionLabel = (select, value) => {
  if (!select || !value) {
    return "";
  }
  const option = Array.from(select.options).find((item) => item.value === value);
  return option ? option.textContent.trim() : value;
};

const updatePipeline = (formData, mismatches = []) => {
  const filterValue = formData.get("filter") || "";
  const formatValue = formData.get("format") || "";
  if (filterOutput) {
    filterOutput.textContent = filterValue ? optionLabel(filterSelect, filterValue) : "Select a filter snippet";
  }
  if (formatOutput) {
    formatOutput.textContent = formatValue ? optionLabel(formatSelect, formatValue) : "Awaiting formatter";
  }
  if (filterStage) {
    if (board.dataset.state === "success") {
      filterStage.dataset.state = "ready";
    } else if (!filterValue) {
      delete filterStage.dataset.state;
    } else {
      filterStage.dataset.state = mismatches.includes("filter") ? "error" : "ready";
    }
  }
  if (formatStage) {
    if (board.dataset.state === "success") {
      formatStage.dataset.state = "ready";
    } else if (!formatValue) {
      delete formatStage.dataset.state;
    } else {
      formatStage.dataset.state = mismatches.includes("format") ? "error" : "ready";
    }
  }
};

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const filter = data.get("filter") || "";
  const format = data.get("format") || "";
  const mismatches = Object.entries(expected)
    .filter(([key, value]) => data.get(key) !== value)
    .map(([key]) => key);
  updatePipeline(data, mismatches);
  if (mismatches.length) {
    updateBoard("Output still messy. Try a tighter selector or trim.", "error");
    return;
  }
  updateBoard("Report distilled. Pager ready.", "success");
  window.parent?.postMessage(
    {
      type: "net:level-complete",
      game: "stream-parser-depot",
      payload: {
        status: "Regex on call",
        score: 42000,
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
  const mismatches = Object.entries(expected)
    .filter(([key, value]) => data.get(key) !== value)
    .map(([key]) => key);
  updatePipeline(data, mismatches);
  if (data.get("filter") && data.get("format")) {
    updateBoard("Preview pipeline staged.");
  } else {
    updateBoard("Awaiting command pair.");
  }
});

if (form) {
  const data = new FormData(form);
  const mismatches = Object.entries(expected)
    .filter(([key, value]) => data.get(key) !== value)
    .map(([key]) => key);
  updatePipeline(data, mismatches);
}
