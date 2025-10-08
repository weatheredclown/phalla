import { initFullscreenToggle } from "../fullscreen.js";

initFullscreenToggle();

const form = document.getElementById("parser-form");
const board = document.getElementById("status-board");
const filterSelect = form?.elements.namedItem("filter");
const formatSelect = form?.elements.namedItem("format");
const stageLookup = {
  filter: document.querySelector('[data-stage="filter"]'),
  format: document.querySelector('[data-stage="format"]'),
};
const codeLookup = {
  filter: document.querySelector('[data-code="filter"]'),
  format: document.querySelector('[data-code="format"]'),
};
const pipelineContainer = document.querySelector(".pipeline-visual");
const outputPreview = document.getElementById("pipeline-output");
const pipelineMeter = document.querySelector(".pipeline-meter");
const meterPips = pipelineMeter ? pipelineMeter.querySelectorAll(".meter-pip") : [];
const totalStages = Object.keys(stageLookup).length;

const expected = {
  filter: "sed-pull",
  format: "sed-trim",
};

const commandLabels = {
  "awk-user": "awk '/User-Name/ {u=$3}'",
  "awk-pair": "awk '/Access-Request/ {print $NF}'",
  "sed-block": "sed -n '1,6p'",
  "sed-pull": "sed -n '/Access-Accept/,$p'",
  "awk-print": "awk 'NR==1 {printf \"%s \", $1}'",
  "awk-join": "awk 'NR%2==1 {printf $0 \" \"}'",
  "sed-trim": "sed 's/[\"=]//g;s/User-Name //;s/\\\\t//g'",
  "sed-collapse": "sed -n 's/.*= \"\\(.*\\)\"/\\1/p'",
};

const updateBoard = (message, state = "idle") => {
  board.textContent = message;
  board.dataset.state = state;
};

const updateStage = (stage, commandKey) => {
  const stageNode = stageLookup[stage];
  const codeNode = codeLookup[stage];
  if (stageNode) {
    stageNode.dataset.state = commandKey ? "active" : "idle";
  }
  if (codeNode) {
    codeNode.textContent = commandKey ? commandLabels[commandKey] || commandKey : "--";
  }
};

const updateMeter = (correctCount) => {
  const ratio = totalStages ? correctCount / totalStages : 0;
  if (pipelineMeter) {
    pipelineMeter.style.setProperty("--progress", String(ratio));
    pipelineMeter.dataset.state =
      correctCount === 0 ? "idle" : correctCount === totalStages ? "ready" : "warming";
  }
  meterPips.forEach((pip, index) => {
    pip.dataset.active = index < correctCount ? "on" : "off";
  });
};

const runPipeline = (filterKey, formatKey) => {
  const correctFilter = filterKey === expected.filter;
  const correctFormat = formatKey === expected.format;
  updateStage("filter", filterKey);
  updateStage("format", formatKey);
  let output = "--";
  if (correctFilter && correctFormat) {
    output = "dli CONNECT 64000/ARQ/V34/LAPM/V42BIS";
  } else if (filterKey || formatKey) {
    output = "// mismatched pipeline";
  }
  if (outputPreview) {
    outputPreview.textContent = output;
  }
  updateMeter([correctFilter, correctFormat].filter(Boolean).length);

  if (!filterKey && !formatKey) {
    return "idle";
  }
  if (correctFilter && correctFormat) {
    return "success";
  }
  if ((filterKey && !correctFilter) || (formatKey && !correctFormat)) {
    return "warn";
  }
  return "active";
};

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const filterKey = filterSelect?.value || "";
  const formatKey = formatSelect?.value || "";
  const status = runPipeline(filterKey, formatKey);
  if (status !== "success") {
    updateBoard("Pipeline failed verification. Revise selections.", "error");
    return;
  }
  updateBoard("Pager payload sanitized. Message queued.", "success");
  window.parent?.postMessage(
    {
      type: "net:level-complete",
      game: "stream-parser-depot",
      payload: {
        status: "Pipeline clean",
        score: 128,
      },
    },
    "*"
  );
});

form?.addEventListener("input", () => {
  if (board.dataset.state === "success") {
    return;
  }
  const filterKey = filterSelect?.value || "";
  const formatKey = formatSelect?.value || "";
  const status = runPipeline(filterKey, formatKey);
  if (status === "idle") {
    updateBoard("Awaiting command pair.");
  } else if (status === "success") {
    updateBoard("Pager payload sanitized. Message queued.", "success");
  } else if (status === "warn") {
    updateBoard("Log output malformed. Try different commands.");
  } else {
    updateBoard("Streaming records through pipeline…");
  }
});

if (form) {
  runPipeline(filterSelect?.value || "", formatSelect?.value || "");
}
