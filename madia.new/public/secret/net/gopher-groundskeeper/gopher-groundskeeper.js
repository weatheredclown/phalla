import { initFullscreenToggle } from "../fullscreen.js";

initFullscreenToggle();

const form = document.getElementById("gopher-form");
const board = document.getElementById("status-board");
const visual = document.getElementById("gopher-visual");
const visualCaption = visual?.querySelector(".visual-caption");

const expected = {
  "banner-text": "Library Net Welcome",
  "banner-selector": "/motd.txt",
  "banner-host": "gopher.library.lan",
  "banner-type": "i",
  "catalog-text": "Catalog Search Terminal",
  "catalog-selector": "/query",
  "catalog-host": "catalog.library.lan",
  "catalog-type": "7",
  "zine-text": "Weekly Sparks",
  "zine-selector": "/zines/weeklysparks.txt",
  "zine-host": "198.51.100.77",
  "zine-type": "0",
};

const updateBoard = (message, state = "idle") => {
  board.textContent = message;
  board.dataset.state = state;
};

const visualMessages = {
  idle: "Gopher tunnels awaiting signage.",
  processing: "Routing burrow paths…",
  success: "All tunnels labeled. Visitors guided.",
  error: "Dead end detected—fix the entries.",
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

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  setVisualState("processing");
  const data = new FormData(form);
  const errors = Object.entries(expected).filter(([name, value]) => (data.get(name) || "").trim() !== value);
  if (errors.length) {
    updateBoard("Menu mismatch. Check selector, type, and host fields.", "error");
    setVisualState("error");
    return;
  }
  updateBoard("Gophermap saved. Terminals update in sync.", "success");
  setVisualState("success");
  window.parent?.postMessage(
    {
      type: "net:level-complete",
      game: "gopher-groundskeeper",
      payload: {
        status: "Burrows indexed",
        score: 38000,
      },
    },
    "*"
  );
});

form?.addEventListener("input", () => {
  if (board.dataset.state === "success") {
    return;
  }
  updateBoard("Awaiting menu entries.");
  setVisualState("idle");
});
