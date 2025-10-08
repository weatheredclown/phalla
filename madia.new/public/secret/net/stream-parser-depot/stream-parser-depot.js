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
  filter: "sed-block",
  format: "sed-collapse",
};

const updateBoard = (message, state = "idle") => {
  board.textContent = message;
  board.dataset.state = state;
};

const stageState = (value, target) => {
  if (!value) {
    return "idle";
  }
  if (value === target) {
    return "good";
  }
  return "selected";
};

const updateStage = (stage, value, target, label) => {
  const element = stageLookup[stage];
  const code = codeLookup[stage];
  if (!element || !code) {
    return;
  }
  const optionText = label || "--";
  code.textContent = value ? optionText : "--";
  element.dataset.state = stageState(value, target);
};

const computePreview = (filter, format) => {
  if (!filter && !format) {
    return "--";
  }
  if (!filter || !format) {
    return "Incomplete pipeline";
  }
  if (filter === expected.filter && format === expected.format) {
    return "dli CONNECT 64000/ARQ/V34/LAPM/V42BIS";
  }
  if (filter === expected.filter) {
    return "dli … (needs formatting)";
  }
  if (format === expected.format) {
    return "garbled input → CONNECT";
  }
  return "Noise: rad_recv ???";
};

const updatePipelineVisual = (filter, format) => {
  updateStage(
    "filter",
    filter,
    expected.filter,
    filterSelect?.selectedOptions?.[0]?.textContent?.trim() || ""
  );
  updateStage(
    "format",
    format,
    expected.format,
    formatSelect?.selectedOptions?.[0]?.textContent?.trim() || ""
  );
  if (outputPreview) {
    outputPreview.textContent = computePreview(filter, format);
  }
  if (pipelineContainer) {
    const states = [stageLookup.filter?.dataset.state, stageLookup.format?.dataset.state];
    if (states.every((state) => state === "good")) {
      pipelineContainer.dataset.state = "good";
    } else if (states.some((state) => state === "warn")) {
      pipelineContainer.dataset.state = "warn";
    } else if (states.some((state) => state && state !== "idle")) {
      pipelineContainer.dataset.state = "active";
    } else {
      pipelineContainer.dataset.state = "idle";
    }
    const goodCount = states.filter((state) => state === "good").length;
    const activeCount = states.filter((state) => state && state !== "idle").length;
    if (pipelineMeter) {
      const ratio = totalStages ? goodCount / totalStages : 0;
      pipelineMeter.style.setProperty("--progress", String(ratio));
      if (goodCount === totalStages) {
        pipelineMeter.dataset.state = "ready";
      } else if (activeCount > 0) {
        pipelineMeter.dataset.state = "active";
      } else {
        pipelineMeter.dataset.state = "idle";
      }
    }
    meterPips.forEach((pip, index) => {
      pip.dataset.active = index < goodCount ? "on" : "off";
    });
  }
};

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const filter = data.get("filter");
  const format = data.get("format");
  updatePipelineVisual(filter, format);
  if (filter !== expected.filter || format !== expected.format) {
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
  const filter = data.get("filter");
  const format = data.get("format");
  updatePipelineVisual(filter, format);
  if (filter === expected.filter && format === expected.format) {
    updateBoard("Pipeline locked. Dispatch when ready.");
  } else if (filter || format) {
    updateBoard("Preview pipeline staged.");
  } else {
    updateBoard("Awaiting command pair.");
  }
});

if (form) {
  updatePipelineVisual(filterSelect?.value || "", formatSelect?.value || "");
}
