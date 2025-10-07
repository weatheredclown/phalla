const form = document.getElementById("daemon-form");
const board = document.getElementById("status-board");

const REQUIRED_PORT = 8080;
const REQUIRED_ROOT = "/var/www/altroot";
const REQUIRED_MODULES = ["mod_ssl", "mod_status"];
const FORBIDDEN_MODULES = ["mod_userdir"];

const updateBoard = (message, state = "idle") => {
  board.textContent = message;
  board.dataset.state = state;
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
  const formData = new FormData(form);
  const issues = evaluateConfig(formData);
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
  if (!issues.length) {
    updateBoard("Checklist satisfied. Ready to launch.");
  } else {
    updateBoard("Daemon halted. Awaiting config…");
  }
};

form?.addEventListener("submit", handleSubmit);
form?.addEventListener("input", handleInput);
