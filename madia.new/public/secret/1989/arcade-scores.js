const STORAGE_KEY = "1989-shared-high-scores";
const CELEBRATE_TIMEOUT = 1200;
const widgetState = {
  element: null,
  label: null,
  value: null,
  note: null,
  celebrateTimer: null,
};

const eventTarget = new EventTarget();
let memoryStore = {};
let storageAvailable = true;

try {
  const testKey = `${STORAGE_KEY}-check`;
  window.localStorage.setItem(testKey, "ok");
  window.localStorage.removeItem(testKey);
} catch (error) {
  storageAvailable = false;
}

function readStore() {
  if (storageAvailable) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return {};
      }
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch (error) {
      console.warn("Failed to parse shared high scores", error);
    }
    return {};
  }
  return { ...memoryStore };
}

function writeStore(store) {
  const payload = JSON.stringify(store);
  if (storageAvailable) {
    window.localStorage.setItem(STORAGE_KEY, payload);
  } else {
    memoryStore = { ...store };
  }
}

function sanitizeEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const value = Number(entry.value);
  if (!Number.isFinite(value)) {
    return null;
  }
  const meta = sanitizeMeta(entry.meta);
  return {
    value,
    meta,
    updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : new Date().toISOString(),
  };
}

function sanitizeMeta(meta) {
  if (!meta || typeof meta !== "object") {
    return {};
  }
  const clean = {};
  Object.entries(meta).forEach(([key, value]) => {
    if (value === null) {
      clean[key] = null;
    } else if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") {
      clean[key] = value;
    } else if (typeof value === "object") {
      clean[key] = sanitizeMeta(value);
    }
  });
  return clean;
}

function notifyChange(gameId, entry) {
  const detail = { gameId, entry: sanitizeEntry(entry) };
  eventTarget.dispatchEvent(new CustomEvent("score", { detail }));
}

export function getHighScore(gameId) {
  if (!gameId) {
    return null;
  }
  const store = readStore();
  const entry = sanitizeEntry(store[gameId]);
  return entry;
}

export function getAllHighScores() {
  const store = readStore();
  return new Map(
    Object.entries(store)
      .map(([gameId, entry]) => [gameId, sanitizeEntry(entry)])
      .filter(([, entry]) => entry !== null),
  );
}

export function recordHighScore(gameId, score, meta = {}) {
  if (!gameId || !Number.isFinite(score)) {
    return { updated: false, entry: getHighScore(gameId) };
  }
  const store = readStore();
  const current = sanitizeEntry(store[gameId]);
  if (current && current.value >= score) {
    return { updated: false, entry: current };
  }
  const entry = {
    value: score,
    meta: sanitizeMeta(meta),
    updatedAt: new Date().toISOString(),
  };
  store[gameId] = entry;
  writeStore(store);
  notifyChange(gameId, entry);
  return { updated: true, entry: sanitizeEntry(entry) };
}

export function onHighScoreChange(handler) {
  if (typeof handler !== "function") {
    return () => {};
  }
  const listener = (event) => {
    handler(event.detail);
  };
  eventTarget.addEventListener("score", listener);
  return () => {
    eventTarget.removeEventListener("score", listener);
  };
}

export function onGameHighScore(gameId, handler) {
  if (!gameId || typeof handler !== "function") {
    return () => {};
  }
  return onHighScoreChange((detail) => {
    if (detail?.gameId === gameId) {
      handler(detail.entry);
    }
  });
}

export function initHighScoreBanner({ gameId, label = "High Score", format, emptyText = "No score yet." }) {
  if (!gameId) {
    throw new Error("gameId is required for initHighScoreBanner");
  }
  ensureWidget();
  widgetState.label.textContent = label;
  const render = (entry) => {
    if (entry) {
      widgetState.value.textContent = typeof format === "function" ? format(entry) : String(entry.value);
      widgetState.value.dataset.empty = "false";
      widgetState.note.textContent = "Personal best";
    } else {
      widgetState.value.textContent = emptyText;
      widgetState.value.dataset.empty = "true";
      widgetState.note.textContent = "Set a record to lock it in.";
    }
  };
  render(getHighScore(gameId));

  const celebrate = () => {
    widgetState.element.classList.add("is-celebrate");
    window.clearTimeout(widgetState.celebrateTimer);
    widgetState.celebrateTimer = window.setTimeout(() => {
      widgetState.element.classList.remove("is-celebrate");
    }, CELEBRATE_TIMEOUT);
  };

  const unsubscribe = onGameHighScore(gameId, (entry) => {
    render(entry);
    if (entry) {
      celebrate();
    }
  });

  return {
    submit(score, meta = {}) {
      const result = recordHighScore(gameId, score, meta);
      if (result.updated) {
        render(result.entry);
        celebrate();
      }
      return result;
    },
    render,
    destroy() {
      unsubscribe();
    },
  };
}

function ensureWidget() {
  if (widgetState.element) {
    return widgetState.element;
  }
  injectStyles();
  const wrapper = document.createElement("aside");
  wrapper.id = "shared-high-score";
  wrapper.className = "shared-high-score";
  wrapper.setAttribute("role", "status");
  wrapper.setAttribute("aria-live", "polite");

  const heading = document.createElement("p");
  heading.className = "shared-high-score__heading";
  heading.textContent = "High Score";

  const label = document.createElement("p");
  label.className = "shared-high-score__label";

  const value = document.createElement("p");
  value.className = "shared-high-score__value";
  value.dataset.empty = "true";

  const note = document.createElement("p");
  note.className = "shared-high-score__note";

  wrapper.append(heading, label, value, note);
  document.body.appendChild(wrapper);

  widgetState.element = wrapper;
  widgetState.label = label;
  widgetState.value = value;
  widgetState.note = note;
  return wrapper;
}

function injectStyles() {
  if (document.getElementById("shared-high-score-style")) {
    return;
  }
  const style = document.createElement("style");
  style.id = "shared-high-score-style";
  style.textContent = `
    #shared-high-score {
      position: fixed;
      top: 1.25rem;
      right: 1.25rem;
      z-index: 40;
      min-width: 12rem;
      max-width: 18rem;
      padding: 0.75rem 1rem;
      border-radius: 0.85rem;
      background: rgba(15, 23, 42, 0.88);
      border: 1px solid rgba(148, 163, 184, 0.45);
      box-shadow: 0 0.75rem 2.5rem rgba(15, 23, 42, 0.35);
      color: #f8fafc;
      font-family: "Spline Sans", "Segoe UI", sans-serif;
      backdrop-filter: blur(6px);
      transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease;
    }
    #shared-high-score.is-celebrate {
      transform: translateY(-4px);
      border-color: rgba(96, 165, 250, 0.9);
      box-shadow: 0 1.1rem 3.2rem rgba(59, 130, 246, 0.35);
    }
    .shared-high-score__heading {
      margin: 0;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: rgba(148, 163, 184, 0.85);
    }
    .shared-high-score__label {
      margin: 0.25rem 0 0;
      font-size: 0.85rem;
      color: rgba(203, 213, 225, 0.85);
    }
    .shared-high-score__value {
      margin: 0.4rem 0 0;
      font-size: 1.45rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      color: #f8fafc;
    }
    .shared-high-score__value[data-empty="true"] {
      font-size: 1rem;
      font-weight: 400;
      color: rgba(226, 232, 240, 0.8);
    }
    .shared-high-score__note {
      margin: 0.3rem 0 0;
      font-size: 0.7rem;
      color: rgba(148, 163, 184, 0.85);
    }
    @media (max-width: 720px) {
      #shared-high-score {
        left: 1rem;
        right: 1rem;
        top: auto;
        bottom: 1rem;
      }
    }
  `;
  document.head.appendChild(style);
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) {
      return;
    }
    const store = readStore();
    Object.entries(store).forEach(([gameId, entry]) => {
      notifyChange(gameId, entry);
    });
  });
}
