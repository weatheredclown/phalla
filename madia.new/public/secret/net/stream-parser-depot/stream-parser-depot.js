const form = document.getElementById("parser-form");
const board = document.getElementById("status-board");

const expected = {
  filter: "sed-block",
  format: "sed-collapse",
};

const updateBoard = (message, state = "idle") => {
  board.textContent = message;
  board.dataset.state = state;
};

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const filter = data.get("filter");
  const format = data.get("format");
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
  if (data.get("filter") && data.get("format")) {
    updateBoard("Preview pipeline staged.");
  } else {
    updateBoard("Awaiting command pair.");
  }
});
