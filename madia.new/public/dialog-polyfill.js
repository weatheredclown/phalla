const hasNativeDialogSupport =
  typeof window.HTMLDialogElement === "function" &&
  typeof window.HTMLDialogElement.prototype.showModal === "function";

function getInitialFocusTarget(dialog) {
  const autofocus = dialog.querySelector("[autofocus]");
  if (autofocus instanceof HTMLElement) {
    return autofocus;
  }
  const focusable = dialog.querySelector(
    "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
  );
  if (focusable instanceof HTMLElement) {
    return focusable;
  }
  return dialog;
}

export function applyDialogPolyfill() {
  if (hasNativeDialogSupport) {
    return;
  }

  if (!document.body) {
    window.addEventListener(
      "DOMContentLoaded",
      () => {
        applyDialogPolyfill();
      },
      { once: true }
    );
    return;
  }

  const openDialogs = [];
  let backdrop = null;
  let lastDialogSubmitter = null;

  function ensureBackdrop() {
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.className = "dialog-polyfill-backdrop";
      backdrop.addEventListener("click", () => {
        const active = openDialogs[openDialogs.length - 1];
        if (!active) {
          return;
        }
        const cancelEvent = new Event("cancel", { cancelable: true });
        if (active.dispatchEvent(cancelEvent)) {
          active.close();
        }
      });
      document.body.append(backdrop);
    }
    backdrop.dataset.visible = "true";
  }

  function hideBackdrop() {
    if (backdrop) {
      delete backdrop.dataset.visible;
    }
    if (openDialogs.length === 0) {
      document.body.classList.remove("dialog-polyfill-open");
    }
  }

  function polyfillDialog(dialog) {
    if (!(dialog instanceof HTMLElement) || dialog.dataset.dialogPolyfilled === "true") {
      return;
    }
    dialog.dataset.dialogPolyfilled = "true";
    if (!dialog.hasAttribute("role")) {
      dialog.setAttribute("role", "dialog");
    }
    if (!dialog.hasAttribute("aria-modal")) {
      dialog.setAttribute("aria-modal", "true");
    }
    if (!dialog.hasAttribute("tabindex")) {
      dialog.setAttribute("tabindex", "-1");
    }
    if (!dialog.hasAttribute("open")) {
      dialog.hidden = true;
    }

    dialog.showModal = function showModal() {
      if (this.hasAttribute("open")) {
        return;
      }
      this.setAttribute("open", "");
      this.hidden = false;
      openDialogs.push(this);
      ensureBackdrop();
      document.body.classList.add("dialog-polyfill-open");
      const focusTarget = getInitialFocusTarget(this);
      window.requestAnimationFrame(() => {
        focusTarget.focus({ preventScroll: true });
      });
    };

    dialog.close = function close(returnValue = "") {
      this.returnValue = returnValue;
      if (!this.hasAttribute("open")) {
        this.hidden = true;
        return;
      }
      this.removeAttribute("open");
      this.hidden = true;
      const index = openDialogs.lastIndexOf(this);
      if (index !== -1) {
        openDialogs.splice(index, 1);
      }
      hideBackdrop();
      this.dispatchEvent(new Event("close"));
    };

    dialog.addEventListener("cancel", (event) => {
      if (!event.defaultPrevented) {
        event.preventDefault();
        dialog.close();
      }
    });
  }

  document.querySelectorAll("dialog").forEach((dialog) => {
    polyfillDialog(dialog);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }
    const active = openDialogs[openDialogs.length - 1];
    if (!active) {
      return;
    }
    const cancelEvent = new Event("cancel", { cancelable: true });
    if (active.dispatchEvent(cancelEvent)) {
      active.close();
    }
  });

  document.addEventListener(
    "focusin",
    (event) => {
      const active = openDialogs[openDialogs.length - 1];
      if (!active) {
        return;
      }
      if (!active.contains(event.target)) {
        const focusTarget = getInitialFocusTarget(active);
        focusTarget.focus({ preventScroll: true });
      }
    },
    true
  );

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const button = target.closest("button, input[type='submit']");
    if (!button) {
      return;
    }
    const form = button.form;
    if (form && form.getAttribute("method") === "dialog") {
      lastDialogSubmitter = button;
    }
  });

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.getAttribute("method") !== "dialog") {
      return;
    }
    const dialog = form.closest("dialog");
    if (!dialog) {
      return;
    }
    event.preventDefault();
    const submitter = event.submitter || lastDialogSubmitter;
    const value = submitter?.value ?? submitter?.getAttribute("value") ?? "";
    dialog.close(value);
    lastDialogSubmitter = null;
  });
}
