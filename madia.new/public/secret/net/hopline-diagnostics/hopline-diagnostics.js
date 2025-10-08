import { initFullscreenToggle } from "../fullscreen.js";

initFullscreenToggle();

const form = document.getElementById("route-form");
const board = document.getElementById("status-board");
const topologyMap = document.querySelector(".topology-map");
const prefixChips = new Map(
  Array.from(document.querySelectorAll(".prefix-chip")).map((element) => [element.dataset.prefix, element])
);
const routerCards = new Map(
  Array.from(document.querySelectorAll(".router-card")).map((element) => [element.dataset.router, element])
);

const expected = {
  lab: "edge-hub",
  studio: "studio-loop",
  isp: "metro-border",
};

const updateBoard = (message, state = "idle") => {
  board.textContent = message;
  board.dataset.state = state;
  if (topologyMap) {
    topologyMap.dataset.state = state;
  }
};

const updateTopology = (formData, mismatches = []) => {
  const mismatchSet = new Set(mismatches);
  const mismatchRouters = new Set(mismatches.map((prefix) => expected[prefix]));
  prefixChips.forEach((chip, prefix) => {
    const router = formData.get(prefix) || "";
    if (router) {
      chip.dataset.router = router;
    } else {
      delete chip.dataset.router;
    }
    if (board.dataset.state === "success") {
      chip.dataset.state = "ready";
      return;
    }
    if (!router) {
      delete chip.dataset.state;
      return;
    }
    chip.dataset.state = mismatchSet.has(prefix) ? "error" : "ready";
  });

  routerCards.forEach((card, router) => {
    if (board.dataset.state === "success") {
      card.dataset.state = "success";
      return;
    }
    const active = Array.from(prefixChips.values()).some(
      (chip) => chip.dataset.router === router && chip.dataset.state
    );
    if (!active) {
      delete card.dataset.state;
      return;
    }
    card.dataset.state = mismatchRouters.has(router) ? "error" : "ready";
  });
};

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const mismatches = Object.entries(expected)
    .filter(([key, value]) => data.get(key) !== value)
    .map(([key]) => key);
  updateTopology(data, mismatches);
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
  const mismatches = Object.entries(expected)
    .filter(([key, value]) => data.get(key) !== value)
    .map(([key]) => key);
  updateTopology(data, mismatches);
  if (!mismatches.length) {
    updateBoard("Routes staged. Commit when ready.");
  } else {
    updateBoard("Routing daemon idle.");
  }
});

if (form) {
  updateTopology(new FormData(form));
}
