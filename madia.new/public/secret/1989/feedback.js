const toneAliases = {
  neutral: "neutral",
  info: "info",
  success: "success",
  positive: "success",
  victory: "success",
  warning: "warning",
  caution: "warning",
  alert: "warning",
  danger: "danger",
  negative: "danger",
  failure: "danger",
};

const toneIcons = {
  neutral: "✶",
  info: "✷",
  success: "✦",
  warning: "⚠",
  danger: "✖",
};

function normalizeTone(tone = "neutral") {
  const key = String(tone).toLowerCase();
  return toneAliases[key] ?? (toneIcons[key] ? key : "neutral");
}

function setToneData(element, tone) {
  element.dataset.feedbackTone = tone;
  element.dataset.feedbackIcon = toneIcons[tone] ?? toneIcons.neutral;
}

function pulse(element, className) {
  element.classList.remove(className);
  // eslint-disable-next-line no-unused-expressions
  element.offsetWidth;
  element.classList.add(className);
}

function detectToneFromElement(element) {
  if (!element) {
    return "neutral";
  }
  const dataTone = element.dataset.tone || element.dataset.statusTone || element.dataset.feedbackTone;
  if (dataTone) {
    return normalizeTone(dataTone);
  }
  const classes = Array.from(element.classList);
  if (classes.some((cls) => ["success", "is-success", "positive", "is-positive"].includes(cls))) {
    return "success";
  }
  if (classes.some((cls) => ["warning", "is-warning", "caution"].includes(cls))) {
    return "warning";
  }
  if (classes.some((cls) => ["danger", "is-danger", "failure", "error", "negative", "is-negative"].includes(cls))) {
    return "danger";
  }
  return "neutral";
}

function ensureStatusRole(element) {
  if (!element.hasAttribute("role")) {
    element.setAttribute("role", "status");
  }
  element.setAttribute("aria-live", "polite");
}

function decorateStatusElement(element) {
  if (!element || element.dataset.feedbackDecorated === "status") {
    return;
  }
  element.dataset.feedbackDecorated = "status";
  element.classList.add("feedback-status");
  ensureStatusRole(element);
  const tone = detectToneFromElement(element);
  setToneData(element, tone);
  const observer = new MutationObserver((mutations) => {
    const hasRelevantChange = mutations.some((mutation) => {
      if (mutation.type !== "attributes" || mutation.attributeName !== "class") {
        return true;
      }
      const previous = (mutation.oldValue ?? "").replace(/\bfeedback-status-pulse\b/g, "").trim();
      const current = mutation.target.className.replace(/\bfeedback-status-pulse\b/g, "").trim();
      return previous !== current;
    });
    if (!hasRelevantChange) {
      return;
    }
    const updatedTone = detectToneFromElement(element);
    setToneData(element, updatedTone);
    pulse(element, "feedback-status-pulse");
  });
  observer.observe(element, {
    childList: true,
    characterData: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "data-tone", "data-status-tone"],
    attributeOldValue: true,
  });
}

function decorateLogEntry(entry) {
  if (!(entry instanceof HTMLElement) || entry.dataset.feedbackDecorated === "log-entry") {
    return;
  }
  entry.dataset.feedbackDecorated = "log-entry";
  const tone = detectToneFromElement(entry);
  entry.classList.add("feedback-log-entry");
  setToneData(entry, tone);
  pulse(entry, "feedback-log-pulse");
}

function decorateLogList(list) {
  if (!list || list.dataset.feedbackDecorated === "log") {
    return;
  }
  list.dataset.feedbackDecorated = "log";
  list.classList.add("feedback-log");
  Array.from(list.children).forEach((child) => {
    if (child instanceof HTMLElement) {
      decorateLogEntry(child);
    }
  });
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          decorateLogEntry(node);
        }
      });
    });
  });
  observer.observe(list, { childList: true });
}

export function createStatusChannel(statusElement, { onTone } = {}) {
  if (!statusElement) {
    return () => {};
  }
  statusElement.classList.add("feedback-status");
  if (!statusElement.hasAttribute("role")) {
    statusElement.setAttribute("role", "status");
  }
  statusElement.setAttribute("aria-live", "polite");
  setToneData(statusElement, "neutral");
  return (message, tone = "neutral") => {
    const normalized = normalizeTone(tone);
    statusElement.textContent = message;
    setToneData(statusElement, normalized);
    pulse(statusElement, "feedback-status-pulse");
    if (typeof onTone === "function") {
      onTone(normalized, { message, element: statusElement });
    }
  };
}

export function createLogChannel(
  listElement,
  { limit = 12, mode = "append", onTone } = {}
) {
  if (!listElement) {
    return {
      push() {
        return null;
      },
      decorate() {},
    };
  }
  listElement.classList.add("feedback-log");

  function trim() {
    while (listElement.children.length > limit) {
      if (mode === "prepend") {
        listElement.removeChild(listElement.lastElementChild);
      } else {
        listElement.removeChild(listElement.firstElementChild);
      }
    }
  }

  function insert(entry) {
    if (mode === "prepend") {
      listElement.prepend(entry);
    } else {
      listElement.append(entry);
      listElement.scrollTop = listElement.scrollHeight;
    }
    trim();
  }

  function decorate(entry, tone = "info") {
    if (!entry) {
      return null;
    }
    const normalized = normalizeTone(tone);
    entry.classList.add("feedback-log-entry");
    setToneData(entry, normalized);
    pulse(entry, "feedback-log-pulse");
    if (typeof onTone === "function") {
      onTone(normalized, { entry });
    }
    return entry;
  }

  function push(message, tone = "info") {
    const entry = document.createElement("li");
    entry.textContent = message;
    decorate(entry, tone);
    insert(entry);
    return entry;
  }

  return { push, decorate };
}

const DEFAULT_STATUS_SELECTORS = [
  "#status-bar",
  "#status-readout",
  ".status-readout",
  "#status-message",
  "#status-banner",
  "#operation-status",
  "#chain-status",
  "#target-callout",
];

const DEFAULT_LOG_SELECTORS = ["#event-log", "#event-list", "#log-entries"];

export function autoEnhanceFeedback({
  statusSelectors = DEFAULT_STATUS_SELECTORS,
  logSelectors = DEFAULT_LOG_SELECTORS,
} = {}) {
  statusSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((element) => {
      decorateStatusElement(element);
    });
  });
  logSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((list) => {
      decorateLogList(list);
    });
  });
}
