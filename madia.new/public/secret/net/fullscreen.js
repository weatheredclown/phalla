export function initFullscreenToggle({
  target = document.documentElement,
  buttonSelector = "[data-role=\"fullscreen-toggle\"]",
} = {}) {
  const button = document.querySelector(buttonSelector);
  if (!button || !target) {
    return;
  }

  const supportsFullscreen =
    typeof target.requestFullscreen === "function" &&
    typeof document.exitFullscreen === "function";

  const enterLabel = button.querySelector('[data-state="enter"]');
  const exitLabel = button.querySelector('[data-state="exit"]');

  const syncLabels = (isActive) => {
    if (enterLabel) {
      enterLabel.hidden = isActive;
    }
    if (exitLabel) {
      exitLabel.hidden = !isActive;
    }
  };

  const syncState = () => {
    const fullscreenElement = document.fullscreenElement;
    const isActive = Boolean(
      fullscreenElement &&
        (fullscreenElement === target ||
          fullscreenElement === document.documentElement ||
          fullscreenElement === document.body)
    );
    button.dataset.fullscreen = isActive ? "true" : "false";
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
    syncLabels(isActive);
  };

  if (!supportsFullscreen) {
    button.disabled = true;
    button.title = "Fullscreen is not supported in this browser";
    syncLabels(false);
    return;
  }

  button.addEventListener("click", async () => {
    const isActive = button.dataset.fullscreen === "true";
    try {
      if (isActive) {
        await document.exitFullscreen();
      } else {
        await target.requestFullscreen();
      }
    } catch (error) {
      console.warn("Fullscreen toggle failed", error);
    }
  });

  document.addEventListener("fullscreenchange", syncState);
  syncState();
}
