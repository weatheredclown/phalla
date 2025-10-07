const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
];

function getFocusableElements(container) {
  if (!(container instanceof HTMLElement)) {
    return [];
  }
  const nodes = Array.from(container.querySelectorAll(FOCUSABLE_SELECTORS.join(",")));
  return nodes.filter((element) => {
    if (!(element instanceof HTMLElement)) {
      return false;
    }
    if (element.getAttribute("aria-hidden") === "true") {
      return false;
    }
    return element.offsetParent !== null || element === document.activeElement;
  });
}

function resolveElements(targets = []) {
  return targets
    .flatMap((target) => {
      if (!target) {
        return [];
      }
      if (target instanceof HTMLElement) {
        return [target];
      }
      if (typeof target === "string") {
        return Array.from(document.querySelectorAll(target));
      }
      return [];
    })
    .filter((element) => element instanceof HTMLElement);
}

export function createWrapUpDialog(dialog, options = {}) {
  if (!(dialog instanceof HTMLElement)) {
    return {
      element: null,
      initialize() {},
      open() {},
      close() {},
      isOpen() {
        return false;
      },
    };
  }

  const {
    inertTargets = null,
    openClass = "wrap-up-open",
    closeOnBackdrop = true,
    role = dialog.getAttribute("role") || "dialog",
    ariaModal = dialog.getAttribute("aria-modal") || "true",
  } = options;

  const attributeSnapshot = new Map();
  let inertElements = [];
  let lastFocused = null;

  function resolveInertElements() {
    if (Array.isArray(inertTargets) && inertTargets.length > 0) {
      return resolveElements(inertTargets).filter((element) => !dialog.contains(element));
    }
    return Array.from(document.body.children).filter((element) => {
      return element instanceof HTMLElement && element !== dialog && !element.contains(dialog);
    });
  }

  function applyInertState(active) {
    if (active) {
      inertElements = resolveInertElements();
      inertElements.forEach((element) => {
        if (!attributeSnapshot.has(element)) {
          attributeSnapshot.set(element, {
            ariaHidden: element.getAttribute("aria-hidden"),
            inert: "inert" in element ? element.inert : undefined,
          });
        }
        element.setAttribute("aria-hidden", "true");
        if ("inert" in element) {
          element.inert = true;
        }
      });
    } else {
      inertElements.forEach((element) => {
        const snapshot = attributeSnapshot.get(element);
        if (snapshot) {
          if (snapshot.ariaHidden === null) {
            element.removeAttribute("aria-hidden");
          } else {
            element.setAttribute("aria-hidden", snapshot.ariaHidden);
          }
          if ("inert" in element) {
            if (typeof snapshot.inert === "boolean") {
              element.inert = snapshot.inert;
            } else {
              element.inert = false;
            }
          }
          attributeSnapshot.delete(element);
        } else {
          element.removeAttribute("aria-hidden");
          if ("inert" in element) {
            element.inert = false;
          }
        }
      });
      inertElements = [];
    }
  }

  function trapFocus(event) {
    if (event.key !== "Tab") {
      return;
    }
    const focusable = getFocusableElements(dialog);
    if (focusable.length === 0) {
      event.preventDefault();
      dialog.focus({ preventScroll: true });
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey) {
      if (active === first || !dialog.contains(active)) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      }
    } else if (active === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  }

  function handleKeydown(event) {
    if (dialog.hidden) {
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      controller.close();
      return;
    }
    trapFocus(event);
  }

  function ensureAccessibilityAttributes() {
    if (!dialog.hasAttribute("tabindex")) {
      dialog.setAttribute("tabindex", "-1");
    }
    if (role) {
      dialog.setAttribute("role", role);
    }
    if (ariaModal != null) {
      dialog.setAttribute("aria-modal", String(ariaModal));
    }
  }

  function initialize() {
    ensureAccessibilityAttributes();
    if (dialog.hidden) {
      dialog.setAttribute("aria-hidden", "true");
      document.body.classList.remove(openClass);
      applyInertState(false);
    } else {
      dialog.setAttribute("aria-hidden", "false");
      document.body.classList.add(openClass);
      applyInertState(true);
    }
  }

  function open({ focus } = {}) {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && !dialog.contains(activeElement)) {
      lastFocused = activeElement;
    }
    dialog.hidden = false;
    dialog.setAttribute("aria-hidden", "false");
    document.body.classList.add(openClass);
    applyInertState(true);
    const focusTargets = getFocusableElements(dialog);
    const preferredTarget = focus instanceof HTMLElement ? focus : focusTargets[0] ?? dialog;
    window.requestAnimationFrame(() => {
      preferredTarget.focus({ preventScroll: true });
    });
  }

  function close({ restoreFocus = true } = {}) {
    const wasOpen = !dialog.hidden;
    dialog.hidden = true;
    dialog.setAttribute("aria-hidden", "true");
    document.body.classList.remove(openClass);
    applyInertState(false);
    if (restoreFocus && wasOpen && lastFocused instanceof HTMLElement) {
      window.requestAnimationFrame(() => {
        lastFocused?.focus({ preventScroll: true });
      });
    }
    lastFocused = null;
  }

  function isOpen() {
    return !dialog.hidden;
  }

  const controller = { element: dialog, initialize, open, close, isOpen };

  dialog.addEventListener("keydown", handleKeydown);
  if (closeOnBackdrop) {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        controller.close();
      }
    });
  }

  controller.initialize();

  return controller;
}

export function hideWrapUpDialogs() {
  document.querySelectorAll(".wrap-up").forEach((dialog) => {
    if (dialog instanceof HTMLElement) {
      dialog.hidden = true;
      dialog.setAttribute("aria-hidden", "true");
    }
  });
}
