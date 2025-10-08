const form = document.getElementById("route-form");
const board = document.getElementById("status-board");
const traceVisual = document.querySelector(".trace-visual");
const netIndicators = {
  lab: document.querySelector('[data-net="lab"]'),
  studio: document.querySelector('[data-net="studio"]'),
  isp: document.querySelector('[data-net="isp"]'),
};
const routerIndicators = {
  "edge-hub": document.querySelector('[data-router="edge-hub"]'),
  "studio-loop": document.querySelector('[data-router="studio-loop"]'),
  "metro-border": document.querySelector('[data-router="metro-border"]'),
};
const linkIndicators = {
  lab: document.querySelector('[data-link="lab"]'),
  studio: document.querySelector('[data-link="studio"]'),
  isp: document.querySelector('[data-link="isp"]'),
};
const traceMeter = document.querySelector(".trace-meter");
const tracePips = traceMeter ? traceMeter.querySelectorAll(".trace-pip") : [];
const totalRoutes = Object.keys(expected).length;

const expected = {
  lab: "edge-hub",
  studio: "studio-loop",
  isp: "metro-border",
};

const updateBoard = (message, state = "idle") => {
  board.textContent = message;
  board.dataset.state = state;
};

const setIndicatorState = (element, state) => {
  if (!element) {
    return;
  }
  element.dataset.state = state;
};

const deriveState = (value, matches) => {
  if (!value) {
    return "idle";
  }
  return matches ? "good" : "warn";
};

const updateVisual = (formData) => {
  const routerStates = new Map(
    Object.keys(routerIndicators).map((key) => [key, "idle"])
  );
  let matchCount = 0;

  Object.entries(expected).forEach(([prefix, target]) => {
    const selected = formData.get(prefix) || "";
    const matches = selected === target;
    setIndicatorState(netIndicators[prefix], deriveState(selected, matches));
    setIndicatorState(linkIndicators[prefix], deriveState(selected, matches));
    if (matches) {
      matchCount += 1;
    }
    if (selected) {
      const current = routerStates.get(selected) || "idle";
      if (!matches || current === "warn") {
        routerStates.set(selected, "warn");
      } else {
        routerStates.set(selected, "good");
      }
    }
  });

  routerStates.forEach((state, router) => {
    setIndicatorState(routerIndicators[router], state);
  });

  if (traceVisual) {
    const allCorrect = Object.entries(expected).every(
      ([prefix, target]) => (formData.get(prefix) || "") === target
    );
    traceVisual.dataset.flow = allCorrect ? "on" : "off";
  }

  if (traceMeter) {
    traceMeter.dataset.state = matchCount === totalRoutes ? "steady" : matchCount > 0 ? "active" : "idle";
    const ratio = totalRoutes ? matchCount / totalRoutes : 0;
    traceMeter.style.setProperty("--progress", String(ratio));
  }
  tracePips.forEach((pip, index) => {
    pip.dataset.active = index < matchCount ? "on" : "off";
  });
};

const evaluate = (formData) =>
  Object.entries(expected).filter(([key, value]) => (formData.get(key) || "") !== value);

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  updateVisual(data);
  const mismatches = evaluate(data);
  if (mismatches.length) {
    updateBoard("Traceroute still breaks. Check the mismatched prefixes.", "error");
    return;
  }
  updateBoard("Routes propagated. Ping echoes clean.", "success");
  window.parent?.postMessage(
    {
      type: "net:level-complete",
      game: "hopline-diagnostics",
      payload: {
        status: "Latency shaved",
        score: 64000,
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
  updateVisual(data);
  const mismatches = evaluate(data);
  if (!mismatches.length && Object.values(expected).every((value, index) => data.get(Object.keys(expected)[index]))) {
    updateBoard("Routes staged. Push when ready.");
  } else {
    updateBoard("Routing daemon idle.");
  }
});

if (form) {
  updateVisual(new FormData(form));
}
