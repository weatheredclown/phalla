import { initFullscreenToggle } from "../fullscreen.js";

initFullscreenToggle();

const form = document.getElementById("parser-form");
const board = document.getElementById("status-board");
const visual = document.getElementById("parser-visual");
const visualCaption = visual?.querySelector(".visual-caption");

const expected = {
  filter: "sed-block",
  format: "sed-collapse",
};

const updateBoard = (message, state = "idle") => {
  board.textContent = message;
  board.dataset.state = state;
};

const visualMessages = {
  idle: "Log tape ready for slicing.",
  processing: "Spooling awk | sed pipeline…",
  success: "Clean extract queued to pager.",
  error: "Parse failed. Refine the filters.",
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
  const filter = data.get("filter");
  const format = data.get("format");
  if (filter !== expected.filter || format !== expected.format) {
    updateBoard("Output still messy. Try a tighter selector or trim.", "error");
    setVisualState("error");
    return;
  }
  updateBoard("Report distilled. Pager ready.", "success");
  setVisualState("success");
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
  if (data.get("filter") && data.get("format")) {
    updateBoard("Preview pipeline staged.");
    setVisualState("processing");
  } else {
    updateBoard("Awaiting command pair.");
    setVisualState("idle");
  }
});
