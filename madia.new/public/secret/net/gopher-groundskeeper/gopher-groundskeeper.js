const form = document.getElementById("gopher-form");
const board = document.getElementById("status-board");
const terminalLines = new Map(
  Array.from(document.querySelectorAll(".terminal-line")).map((element) => [element.dataset.line, element])
);

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
  terminalLines.forEach((line) => {
    if (state === "success") {
      line.dataset.state = "success";
    }
  });
};

const rowFields = {
  banner: {
    text: "banner-text",
    selector: "banner-selector",
    host: "banner-host",
    type: "banner-type",
  },
  catalog: {
    text: "catalog-text",
    selector: "catalog-selector",
    host: "catalog-host",
    type: "catalog-type",
  },
  zine: {
    text: "zine-text",
    selector: "zine-selector",
    host: "zine-host",
    type: "zine-type",
  },
};

const updateTerminal = (formData, errors = []) => {
  terminalLines.forEach((line, key) => {
    const fields = rowFields[key];
    if (!fields) {
      return;
    }
    const text = (formData.get(fields.text) || "").trim();
    const selector = (formData.get(fields.selector) || "").trim();
    const host = (formData.get(fields.host) || "").trim();
    const type = (formData.get(fields.type) || "").trim();
    const ready = text && selector && host && type;
    if (ready) {
      line.textContent = `${type}${text}\t${selector}\t${host}\t70`;
    } else {
      line.textContent = `• waiting for ${key} entry`;
    }
    if (board.dataset.state === "success") {
      line.dataset.state = "success";
      return;
    }
    if (!ready) {
      line.dataset.state = "";
      return;
    }
    const hasError = errors.some((field) => field.startsWith(key));
    line.dataset.state = hasError ? "error" : "ready";
  });
};

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const errors = Object.entries(expected).filter(([name, value]) => (data.get(name) || "").trim() !== value);
  updateTerminal(data, errors.map(([name]) => name));
  if (errors.length) {
    updateBoard("Menu mismatch. Check selector, type, and host fields.", "error");
    return;
  }
  updateBoard("Gophermap saved. Terminals update in sync.", "success");
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
  const data = new FormData(form);
  const errors = Object.entries(expected)
    .filter(([name, value]) => (data.get(name) || "").trim() !== value)
    .map(([name]) => name);
  updateTerminal(data, errors);
  const ready = Array.from(terminalLines.values()).every((line) => line.dataset.state === "ready");
  if (ready) {
    updateBoard("Preview aligned. Save to publish.");
  } else {
    updateBoard("Awaiting menu entries.");
  }
});

if (form) {
  updateTerminal(new FormData(form));
}
