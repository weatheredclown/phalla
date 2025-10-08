const form = document.getElementById("daemon-form");
const board = document.getElementById("status-board");
const rack = document.querySelector(".rack-visual");
const lights = {
  port: document.querySelector('[data-light="port"]'),
  docroot: document.querySelector('[data-light="docroot"]'),
  ssl: document.querySelector('[data-light="ssl"]'),
  status: document.querySelector('[data-light="status"]'),
  userdir: document.querySelector('[data-light="userdir"]'),
};
const scope = document.querySelector(".handshake-oscilloscope");
const scopePulses = scope ? scope.querySelectorAll(".scope-pulse") : [];
const scopeReadout = document.getElementById("handshake-readout");

const TOTAL_CHECKS = 5;

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
  updateLights(formData);
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
  updateLights(formData);
  const issues = evaluateConfig(formData);
  if (!issues.length) {
    updateBoard("Checklist satisfied. Ready to launch.");
  } else {
    updateBoard("Daemon halted. Awaiting config…");
  }
};

form?.addEventListener("submit", handleSubmit);
form?.addEventListener("input", handleInput);

const applyLightState = (name, state) => {
  const target = lights[name];
  if (!target) {
    return;
  }
  target.dataset.state = state;
};

const deriveState = (condition, touched) => {
  if (!touched) {
    return "idle";
  }
  return condition ? "good" : "warn";
};

function updateLights(formData) {
  const portRaw = formData.get("port");
  const portTouched = portRaw !== null && portRaw !== "";
  const portMatch = Number(portRaw) === REQUIRED_PORT;
  applyLightState("port", deriveState(portMatch, portTouched));

  const docrootRaw = (formData.get("docroot") || "").trim();
  const docrootTouched = docrootRaw.length > 0;
  const docrootMatch = docrootRaw === REQUIRED_ROOT;
  applyLightState("docroot", deriveState(docrootMatch, docrootTouched));

  const modules = new Set(formData.getAll("modules"));
  const modulesTouched = modules.size > 0;
  let matchCount = 0;
  if (portMatch) {
    matchCount += 1;
  }
  if (docrootMatch) {
    matchCount += 1;
  }

  applyLightState("ssl", deriveState(modules.has("mod_ssl"), modulesTouched));
  applyLightState("status", deriveState(modules.has("mod_status"), modulesTouched));
  if (modules.has("mod_ssl")) {
    matchCount += 1;
  }
  if (modules.has("mod_status")) {
    matchCount += 1;
  }

  const userdirTouched = modulesTouched && (modules.has("mod_userdir") || modules.size > 0);
  let userdirState = "idle";
  if (userdirTouched) {
    userdirState = modules.has("mod_userdir") ? "warn" : "good";
  }
  applyLightState("userdir", userdirState);
  if (userdirTouched && !modules.has("mod_userdir")) {
    matchCount += 1;
  }

  if (rack) {
    const rackOnline =
      portMatch &&
      docrootMatch &&
      modules.has("mod_ssl") &&
      modules.has("mod_status") &&
      !modules.has("mod_userdir");
    rack.dataset.online = rackOnline ? "on" : "off";
  }

  const ratio = matchCount / TOTAL_CHECKS;
  if (scope) {
    scope.dataset.state = matchCount === TOTAL_CHECKS ? "sync" : matchCount > 0 ? "warming" : "idle";
    scope.style.setProperty("--progress", String(ratio));
  }
  scopePulses.forEach((pulse, index) => {
    const active = index < matchCount;
    pulse.dataset.active = active ? "on" : "off";
    pulse.dataset.state = index < matchCount ? "good" : "idle";
  });
  if (scopeReadout) {
    scopeReadout.textContent = `${matchCount}/${TOTAL_CHECKS}`;
  }
}

if (form) {
  updateLights(new FormData(form));
}
