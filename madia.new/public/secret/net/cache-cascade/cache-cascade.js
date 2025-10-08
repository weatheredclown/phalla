import { initFullscreenToggle } from "../fullscreen.js";

initFullscreenToggle();

const form = document.getElementById("cache-form");
const board = document.getElementById("status-board");
const streamVisuals = new Map(
  Array.from(document.querySelectorAll(".cascade-stream")).map((element) => [element.dataset.stream, element])
);

const expected = {
  static: { route: "parent", ttl: "60" },
  cms: { route: "direct", ttl: "5" },
  mirror: { route: "sibling", ttl: "240" },
};

const TTL_MAX = 240;

const updateBoard = (message, state = "idle") => {
  board.textContent = message;
  board.dataset.state = state;
  streamVisuals.forEach((element) => {
    element.dataset.state = state === "success" ? "success" : element.dataset.state;
  });
};

const evaluateCache = (formData) => {
  const mismatches = [];
  Object.entries(expected).forEach(([prefix, config]) => {
    const route = formData.get(prefix) || "";
    const ttl = formData.get(`${prefix}-ttl`) || "";
    if (route !== config.route || ttl !== config.ttl) {
      mismatches.push(prefix);
    }
  });
  return mismatches;
};

const updateStreamVisuals = (formData, mismatches = []) => {
  streamVisuals.forEach((element, prefix) => {
    const route = formData.get(prefix) || "";
    const ttl = formData.get(`${prefix}-ttl`) || "";
    if (route) {
      element.dataset.route = route;
    } else {
      delete element.dataset.route;
    }

    const ttlValue = Number(ttl);
    const ttlFill = element.querySelector(".ttl-fill");
    if (ttlFill) {
      const ratio = ttlValue ? Math.min(ttlValue / TTL_MAX, 1) : 0.15;
      ttlFill.style.setProperty("--ttl-ratio", ratio.toString());
    }
    const ttlReadout = element.querySelector('[data-role="ttl"]');
    if (ttlReadout) {
      ttlReadout.textContent = ttlValue ? `TTL ${ttlValue} min` : "TTL —";
    }

    if (board.dataset.state === "success") {
      element.dataset.state = "success";
    } else if (mismatches.includes(prefix)) {
      element.dataset.state = "error";
    } else if (route && ttl) {
      element.dataset.state = "ready";
    } else {
      delete element.dataset.state;
    }
  });
};

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const mismatches = evaluateCache(formData);
  updateStreamVisuals(formData, mismatches);
  if (mismatches.length) {
    updateBoard(`Hierarchy rejected: adjust ${mismatches.join(", ")}.`, "error");
    return;
  }
  updateBoard("Hit ratio climbing. Line holds steady.", "success");
  window.parent?.postMessage(
    {
      type: "net:level-complete",
      game: "cache-cascade",
      payload: {
        status: "Cache stable",
        score: 120,
      },
    },
    "*"
  );
});

form?.addEventListener("input", () => {
  if (board.dataset.state === "success") {
    return;
  }
  const formData = new FormData(form);
  const mismatches = evaluateCache(formData);
  updateStreamVisuals(formData, mismatches);
  if (!mismatches.length) {
    updateBoard("Hierarchy ready. Commit to squid.conf.");
  } else {
    updateBoard("Cache hit ratio falling…");
  }
});

if (form) {
  updateStreamVisuals(new FormData(form));
}
