const form = document.getElementById("gopher-form");
const board = document.getElementById("status-board");
const preview = document.getElementById("gopher-preview");
const rowLookup = {
  banner: document.querySelector('[data-row="banner"]'),
  catalog: document.querySelector('[data-row="catalog"]'),
  zine: document.querySelector('[data-row="zine"]'),
};
const menuMeter = document.querySelector(".menu-meter");
const meterPips = menuMeter ? menuMeter.querySelectorAll(".meter-pip") : [];

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

const rowConfig = {
  banner: {
    text: "banner-text",
    selector: "banner-selector",
    host: "banner-host",
    type: "banner-type",
    port: "70",
  },
  catalog: {
    text: "catalog-text",
    selector: "catalog-selector",
    host: "catalog-host",
    type: "catalog-type",
    port: "70",
  },
  zine: {
    text: "zine-text",
    selector: "zine-selector",
    host: "zine-host",
    type: "zine-type",
    port: "70",
  },
};

const normalize = (name, value) => {
  if (value == null) {
    return "";
  }
  const trimmed = String(value).trim();
  if (name.endsWith("type")) {
    return trimmed.toLowerCase();
  }
  if (name.endsWith("host")) {
    return trimmed.toLowerCase();
  }
  if (name.endsWith("text")) {
    return trimmed;
  }
  return trimmed;
};

const updateBoard = (message, state = "idle") => {
  board.textContent = message;
  board.dataset.state = state;
};

const buildLine = (type, text, selector, host, port) => {
  const safeType = (type || "?").slice(0, 1);
  const safeText = text || "--";
  const safeSelector = selector || "--";
  const safeHost = host || "--";
  const safePort = port || "70";
  return `${safeType}${safeText}\t${safeSelector}\t${safeHost}\t${safePort}`;
};

const updatePreview = (formData) => {
  const lines = [];
  let anyInput = false;
  let allAligned = true;
  let alignedRows = 0;

  Object.entries(rowConfig).forEach(([rowKey, config]) => {
    const rowElement = rowLookup[rowKey];
    const fieldValues = {
      type: formData.get(config.type) || "",
      text: formData.get(config.text) || "",
      selector: formData.get(config.selector) || "",
      host: formData.get(config.host) || "",
    };

    const normalized = {
      type: normalize(config.type, fieldValues.type),
      text: normalize(config.text, fieldValues.text),
      selector: normalize(config.selector, fieldValues.selector),
      host: normalize(config.host, fieldValues.host),
    };

    const expectedRow = {
      type: normalize(config.type, expected[config.type]),
      text: normalize(config.text, expected[config.text]),
      selector: normalize(config.selector, expected[config.selector]),
      host: normalize(config.host, expected[config.host]),
    };

    const touched = Object.values(fieldValues).some((value) => value.trim().length > 0);
    if (touched) {
      anyInput = true;
    }

    const matches = Object.keys(expectedRow).every(
      (key) => normalized[key] === expectedRow[key]
    );
    if (!matches) {
      allAligned = false;
    }
    if (matches) {
      alignedRows += 1;
    }

    if (rowElement) {
      let state = "idle";
      if (touched) {
        state = matches ? "good" : "warn";
      }
      rowElement.dataset.state = state;
    }

    const displayType = fieldValues.type.trim() || expected[config.type];
    lines.push(
      buildLine(
        displayType,
        fieldValues.text.trim() || "--",
        fieldValues.selector.trim() || "--",
        fieldValues.host.trim() || "--",
        config.port
      )
    );
  });

  if (preview) {
    preview.textContent = lines.join("\n");
  }

  const totalRows = Object.keys(rowConfig).length;
  const ratio = totalRows ? alignedRows / totalRows : 0;
  if (menuMeter) {
    menuMeter.dataset.state = alignedRows === totalRows ? "ready" : alignedRows > 0 ? "active" : "idle";
    menuMeter.style.setProperty("--progress", String(ratio));
  }
  meterPips.forEach((pip, index) => {
    pip.dataset.active = index < alignedRows ? "on" : "off";
  });

  return { anyInput, allAligned };
};

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const errors = Object.entries(expected).filter(
    ([name, value]) => normalize(name, data.get(name)) !== normalize(name, value)
  );
  updatePreview(data);
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
  const { anyInput, allAligned } = updatePreview(data);
  if (!anyInput) {
    updateBoard("Awaiting menu entries.");
    return;
  }
  if (allAligned) {
    updateBoard("Rows aligned. Save to deploy.");
  } else {
    updateBoard("Drafting menu entries…");
  }
});

if (form) {
  updatePreview(new FormData(form));
}
