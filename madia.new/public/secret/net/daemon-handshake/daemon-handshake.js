import { initFullscreenToggle } from "../fullscreen.js";

initFullscreenToggle();

const form = document.getElementById("daemon-form");
const board = document.getElementById("status-board");
const visual = document.getElementById("daemon-visual");
const visualCaption = visual?.querySelector(".visual-caption");

const REQUIRED_PORT = 8080;
const REQUIRED_ROOT = "/var/www/altroot";
const REQUIRED_MODULES = ["mod_ssl", "mod_status"];
const FORBIDDEN_MODULES = ["mod_userdir"];

const updateBoard = (message, state = "idle") => {
  board.textContent = message;
  board.dataset.state = state;
};

const visualMessages = {
  idle: "Rack power cycling in standby.",
  processing: "Spinning up modules and sockets…",
  success: "All bays green. Apache standing tall.",
  error: "Rack alarms flashing—fix the checklist.",
};

const setVisualState = (state) => {
  if (!visual) {
    return;
  }
  visual.dataset.state = state;
  if (visualCaption && visualMessages[state]) {
    visualCaption.textContent = visualMessages[state];
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

const handleSubmit = (event) => {
  event.preventDefault();
  setVisualState("processing");
  const formData = new FormData(form);
  const issues = evaluateConfig(formData);
  if (issues.length) {
    updateBoard(`Daemon refused: ${issues.join(", ")}.`, "error");
    setVisualState("error");
    return;
  }
  updateBoard("httpd ready. Access log streaming.", "success");
  setVisualState("success");
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
  if (!issues.length) {
    updateBoard("Checklist satisfied. Ready to launch.");
    setVisualState("processing");
  } else {
    updateBoard("Daemon halted. Awaiting config…");
    setVisualState("idle");
  }
};

form?.addEventListener("submit", handleSubmit);
form?.addEventListener("input", handleInput);
