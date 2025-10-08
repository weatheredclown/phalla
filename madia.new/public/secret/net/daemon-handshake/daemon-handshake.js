import { initFullscreenToggle } from "../fullscreen.js";

initFullscreenToggle();

const form = document.getElementById("daemon-form");
const board = document.getElementById("status-board");
const rack = document.querySelector(".rack-visual");
const tierIndicators = new Map(
  Array.from(document.querySelectorAll(".rack-tier")).map((element) => [element.dataset.tier, element])
);
const moduleIndicators = new Map(
  Array.from(document.querySelectorAll(".module-indicator")).map((element) => [element.dataset.module, element])
);

const REQUIRED_PORT = 8080;
const REQUIRED_ROOT = "/var/www/altroot";
const REQUIRED_MODULES = ["mod_ssl", "mod_status"];
const FORBIDDEN_MODULES = ["mod_userdir"];

const updateBoard = (message, state = "idle") => {
  board.textContent = message;
  board.dataset.state = state;
  if (rack) {
    rack.dataset.state = state;
  }
};

const evaluateConfig = (formData) => {
  const port = Number(formData.get("port"));
  const docroot = (formData.get("docroot") || "").trim();
  const modules = new Set(formData.getAll("modules"));
  const issues = [];
  if (port !== REQUIRED_PORT) {
    issues.push("Port");
  }
  if (docroot !== REQUIRED_ROOT) {
    issues.push("DocumentRoot");
  }
  REQUIRED_MODULES.forEach((module) => {
    if (!modules.has(module)) {
      issues.push(module);
    }
  });
  FORBIDDEN_MODULES.forEach((module) => {
    if (modules.has(module)) {
      issues.push(`Remove ${module}`);
    }
  });
  return issues;
};

const normalizeIssueMatch = (issues, target) =>
  issues.some((issue) => issue.toLowerCase().includes(target.toLowerCase()));

const updateRackVisual = (formData, issues = []) => {
  const portIndicator = tierIndicators.get("port");
  if (portIndicator) {
    const port = Number(formData.get("port"));
    const state = issues.includes("Port") ? "error" : port === REQUIRED_PORT ? "ready" : "idle";
    portIndicator.dataset.state = state;
  }

  const docrootIndicator = tierIndicators.get("docroot");
  if (docrootIndicator) {
    const docroot = (formData.get("docroot") || "").trim();
    const state = issues.includes("DocumentRoot") ? "error" : docroot === REQUIRED_ROOT ? "ready" : "idle";
    docrootIndicator.dataset.state = state;
  }

  const modules = new Set(formData.getAll("modules"));
  moduleIndicators.forEach((indicator, module) => {
    let state = "idle";
    if (REQUIRED_MODULES.includes(module)) {
      state = modules.has(module) ? "active" : "disabled";
      if (normalizeIssueMatch(issues, module)) {
        state = "error";
      }
    } else if (FORBIDDEN_MODULES.includes(module)) {
      state = modules.has(module) ? "error" : "disabled";
    } else {
      state = modules.has(module) ? "active" : "disabled";
    }
    indicator.dataset.state = state;
  });
};

const handleSubmit = (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const issues = evaluateConfig(formData);
  updateRackVisual(formData, issues);
  if (issues.length) {
    updateBoard(`Daemon refused: ${issues.join(", ")}.`, "error");
    return;
  }
  updateBoard("httpd ready. Access log streaming.", "success");
  window.parent?.postMessage(
    {
      type: "net:level-complete",
      game: "daemon-handshake",
      payload: {
        status: "Service green",
        score: 8080,
      },
    },
    "*"
  );
};

const handleInput = () => {
  if (board.dataset.state === "success") {
    return;
  }
  const formData = new FormData(form);
  const issues = evaluateConfig(formData);
  updateRackVisual(formData, issues);
  if (!issues.length) {
    updateBoard("Checklist satisfied. Ready to launch.");
  } else {
    updateBoard("Daemon halted. Awaiting config…");
  }
};

form?.addEventListener("submit", handleSubmit);
form?.addEventListener("input", handleInput);

if (form) {
  updateRackVisual(new FormData(form));
}
