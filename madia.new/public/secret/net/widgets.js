const clamp = (value, min = 0, max = 100) => {
  const number = Number.parseFloat(value);
  if (Number.isNaN(number)) {
    return min;
  }
  return Math.min(max, Math.max(min, number));
};

const clampAngle = (angle) => {
  const number = Number.parseFloat(angle);
  if (Number.isNaN(number)) {
    return 0;
  }
  const normalized = number % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

const cycleFocus = (items, current, direction) => {
  if (!items.length) {
    return null;
  }
  const index = items.indexOf(current);
  if (index === -1) {
    return items[0];
  }
  const nextIndex = (index + direction + items.length) % items.length;
  return items[nextIndex];
};

const formatPercent = (value) => `${Math.round(value)}%`;

const findHiddenInput = (root) => {
  if (!(root instanceof HTMLElement)) {
    return null;
  }
  return root.querySelector('input[type="hidden"]');
};

const dispatchWidgetEvent = (root, name, detail = {}) => {
  if (!(root instanceof HTMLElement)) {
    return;
  }
  root.dispatchEvent(
    new CustomEvent(name, {
      bubbles: true,
      detail,
    })
  );
};

const syncHiddenInput = (input, value) => {
  if (!(input instanceof HTMLInputElement)) {
    return;
  }
  if (input.value === value) {
    return;
  }
  input.value = value;
  input.dispatchEvent(
    new Event("input", {
      bubbles: true,
    })
  );
  input.dispatchEvent(
    new Event("change", {
      bubbles: true,
    })
  );
};

/* -------------------------------------------------- */
/* Neon Select                                         */
/* -------------------------------------------------- */

const initNeonSelect = (root) => {
  if (!(root instanceof HTMLElement)) {
    return;
  }

  const options = Array.from(root.querySelectorAll(".neon-select__option"));
  const hiddenInput = findHiddenInput(root);

  if (!options.length) {
    return;
  }

  const getInitialOption = () => {
    if (hiddenInput && hiddenInput.value) {
      return options.find((option) => option.dataset.value === hiddenInput.value) || options[0];
    }
    if (root.dataset.value) {
      return options.find((option) => option.dataset.value === root.dataset.value) || options[0];
    }
    return options[0];
  };

  let selected = getInitialOption();

  const setSelected = (target, focus = false) => {
    if (!target) {
      return;
    }
    selected = target;
    options.forEach((option) => {
      const isSelected = option === target;
      option.setAttribute("aria-selected", String(isSelected));
      option.setAttribute("tabindex", isSelected ? "0" : "-1");
    });
    const value = target.dataset.value || "";
    root.dataset.value = value;
    if (hiddenInput) {
      syncHiddenInput(hiddenInput, value);
    }
    dispatchWidgetEvent(root, "net:select-change", { value });
    if (focus) {
      target.focus();
    }
  };

  options.forEach((option) => {
    option.type = "button";
    option.setAttribute("role", "option");
    option.addEventListener("click", () => {
      setSelected(option, true);
    });
    option.addEventListener("keydown", (event) => {
      switch (event.key) {
        case "ArrowUp":
        case "ArrowLeft": {
          const previous = cycleFocus(options, option, -1);
          if (previous) {
            event.preventDefault();
            setSelected(previous, true);
          }
          break;
        }
        case "ArrowDown":
        case "ArrowRight": {
          const next = cycleFocus(options, option, 1);
          if (next) {
            event.preventDefault();
            setSelected(next, true);
          }
          break;
        }
        case "Home": {
          event.preventDefault();
          setSelected(options[0], true);
          break;
        }
        case "End": {
          event.preventDefault();
          setSelected(options[options.length - 1], true);
          break;
        }
        case "Enter":
        case " ": {
          event.preventDefault();
          setSelected(option, true);
          break;
        }
        default:
          break;
      }
    });
  });

  root.setAttribute("role", "listbox");
  if (!root.hasAttribute("tabindex")) {
    root.setAttribute("tabindex", "0");
  }

  root.addEventListener("focus", (event) => {
    if (event.target === root && selected) {
      selected.focus();
    }
  });

  setSelected(selected);
};

/* -------------------------------------------------- */
/* Segment Toggle                                      */
/* -------------------------------------------------- */

const initSegmentToggle = (group) => {
  if (!(group instanceof HTMLElement)) {
    return;
  }

  const buttons = Array.from(group.querySelectorAll(".segment-toggle__option"));
  const hiddenInput = findHiddenInput(group);

  if (!buttons.length) {
    return;
  }

  const getInitialButton = () => {
    if (hiddenInput && hiddenInput.value) {
      return buttons.find((button) => button.dataset.value === hiddenInput.value) || buttons[0];
    }
    if (group.dataset.value) {
      return buttons.find((button) => button.dataset.value === group.dataset.value) || buttons[0];
    }
    return buttons[0];
  };

  let active = getInitialButton();

  const setActive = (target, focus = false) => {
    if (!target) {
      return;
    }
    active = target;
    buttons.forEach((button) => {
      const isActive = button === target;
      button.setAttribute("aria-checked", String(isActive));
      button.setAttribute("tabindex", isActive ? "0" : "-1");
    });
    const value = target.dataset.value || "";
    group.dataset.value = value;
    if (hiddenInput) {
      syncHiddenInput(hiddenInput, value);
    }
    dispatchWidgetEvent(group, "net:segment-change", { value });
    if (focus) {
      target.focus();
    }
  };

  buttons.forEach((button) => {
    button.type = "button";
    button.setAttribute("role", "radio");
    button.addEventListener("click", () => {
      setActive(button, true);
    });
    button.addEventListener("keydown", (event) => {
      switch (event.key) {
        case "ArrowUp":
        case "ArrowLeft": {
          const previous = cycleFocus(buttons, button, -1);
          if (previous) {
            event.preventDefault();
            setActive(previous, true);
          }
          break;
        }
        case "ArrowDown":
        case "ArrowRight": {
          const next = cycleFocus(buttons, button, 1);
          if (next) {
            event.preventDefault();
            setActive(next, true);
          }
          break;
        }
        case "Home": {
          event.preventDefault();
          setActive(buttons[0], true);
          break;
        }
        case "End": {
          event.preventDefault();
          setActive(buttons[buttons.length - 1], true);
          break;
        }
        default:
          break;
      }
    });
  });

  group.setAttribute("role", "radiogroup");
  setActive(active);
};

/* -------------------------------------------------- */
/* Status Rails + Packet Scrubber                      */
/* -------------------------------------------------- */

const updateStatusBar = (bar, value) => {
  if (!(bar instanceof HTMLElement)) {
    return;
  }
  const progress = clamp(value ?? bar.dataset.progress ?? 0, 0, 100);
  bar.dataset.progress = String(progress);
  const fill = bar.querySelector(".status-rail__bar-fill");
  if (fill) {
    fill.style.transform = `scaleX(${progress / 100})`;
  }
  const row = bar.closest(".status-rail__row");
  if (row) {
    const valueEl = row.querySelector(".status-rail__value");
    if (valueEl) {
      valueEl.textContent = formatPercent(progress);
    }
  }
  bar.setAttribute("aria-valuenow", Math.round(progress));
  bar.setAttribute("aria-valuetext", `${Math.round(progress)} percent`);
};

const initStatusRail = (root) => {
  if (!(root instanceof HTMLElement)) {
    return;
  }
  const bars = Array.from(root.querySelectorAll(".status-rail__bar"));
  bars.forEach((bar) => updateStatusBar(bar));
};

const initPacketScrubber = (scrubber) => {
  if (!(scrubber instanceof HTMLElement)) {
    return;
  }
  const dial = scrubber.querySelector(".packet-scrubber__dial");
  const pointer = scrubber.querySelector(".packet-scrubber__pointer");
  const control = scrubber.querySelector('[data-role="scrubber-input"]');

  const setValue = (value) => {
    const progress = clamp(value ?? scrubber.dataset.value ?? 0, 0, 100);
    scrubber.dataset.value = String(progress);
    if (dial) {
      dial.dataset.value = progress.toFixed(0);
    }
    if (pointer) {
      const rotation = -120 + (progress / 100) * 240;
      pointer.style.transform = `rotate(${rotation}deg)`;
    }
  };

  if (control instanceof HTMLInputElement) {
    control.addEventListener("input", () => {
      setValue(control.value);
    });
    control.addEventListener("change", () => {
      const value = clamp(control.value, 0, 100);
      setValue(value);
      dispatchWidgetEvent(scrubber, "net:scrubber-change", { value });
    });
  }

  setValue(scrubber.dataset.value || (control ? control.value : 0));

  scrubber.addEventListener("net:segment-change", (event) => {
    if (event?.detail?.value !== undefined) {
      setValue(event.detail.value);
    }
  });
};

const autoPulse = (root) => {
  const bars = Array.from(root.querySelectorAll(".status-rail__bar"));
  if (!bars.length) {
    return;
  }
  setInterval(() => {
    bars.forEach((bar, index) => {
      const base = 35 + index * 15;
      const swing = Math.sin(Date.now() / 600 + index) * 18;
      updateStatusBar(bar, base + swing + Math.random() * 8);
    });
  }, 1500);
};

/* -------------------------------------------------- */
/* Orbital Dial                                        */
/* -------------------------------------------------- */

const initOrbitalDial = (root) => {
  if (!(root instanceof HTMLElement)) {
    return;
  }
  const knob = root.querySelector(".orbital-dial__knob");
  const needle = root.querySelector(".orbital-dial__needle");
  const readout = root.querySelector(".orbital-dial__readout strong");
  const hiddenInput = findHiddenInput(root);

  if (!(knob instanceof HTMLButtonElement) || !needle || !readout) {
    return;
  }

  const rectCache = { width: 0, height: 0, left: 0, top: 0 };

  const refreshRect = () => {
    const rect = knob.parentElement?.getBoundingClientRect();
    if (rect) {
      rectCache.width = rect.width;
      rectCache.height = rect.height;
      rectCache.left = rect.left;
      rectCache.top = rect.top;
    }
  };

  const setValue = (value, dispatch = true) => {
    const angle = clampAngle(value ?? root.dataset.value ?? 0);
    root.dataset.value = angle.toFixed(0);
    knob.style.setProperty("--dial-angle", `${angle}deg`);
    needle.style.setProperty("--dial-angle", `${angle}deg`);
    knob.setAttribute("aria-valuenow", angle.toFixed(0));
    knob.setAttribute("aria-valuetext", `${angle.toFixed(0)} degrees`);
    readout.textContent = `${angle.toFixed(0)}°`;
    if (hiddenInput) {
      syncHiddenInput(hiddenInput, angle.toFixed(0));
    }
    if (dispatch) {
      dispatchWidgetEvent(root, "net:orbital-change", { value: angle });
    }
  };

  const computeAngleFromEvent = (event) => {
    refreshRect();
    const centerX = rectCache.left + rectCache.width / 2;
    const centerY = rectCache.top + rectCache.height / 2;
    const angle = Math.atan2(centerY - event.clientY, event.clientX - centerX);
    return clampAngle(90 - (angle * 180) / Math.PI);
  };

  const handlePointerMove = (event) => {
    event.preventDefault();
    const angle = computeAngleFromEvent(event);
    setValue(angle);
  };

  const handlePointerUp = () => {
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
  };

  knob.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    knob.setPointerCapture(event.pointerId);
    handlePointerMove(event);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  });

  knob.addEventListener("keydown", (event) => {
    const current = Number.parseFloat(root.dataset.value || "0");
    let next = current;
    switch (event.key) {
      case "ArrowLeft":
      case "ArrowDown":
        next = current - 5;
        break;
      case "ArrowRight":
      case "ArrowUp":
        next = current + 5;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = 359;
        break;
      default:
        return;
    }
    event.preventDefault();
    setValue(next);
  });

  knob.setAttribute("role", "slider");
  knob.setAttribute("aria-valuemin", "0");
  knob.setAttribute("aria-valuemax", "359");

  setValue(root.dataset.value || 0, false);
};

/* -------------------------------------------------- */
/* Plasma Column Fader                                 */
/* -------------------------------------------------- */

const initPlasmaFader = (root) => {
  if (!(root instanceof HTMLElement)) {
    return;
  }
  const channels = Array.from(root.querySelectorAll(".plasma-fader__column"));
  if (!channels.length) {
    return;
  }

  channels.forEach((column) => {
    const thumb = column.querySelector(".plasma-fader__thumb");
    const valueText = column.querySelector(".plasma-fader__value");
    const columnInput = column.querySelector('input[type="hidden"]');
    if (!(thumb instanceof HTMLButtonElement) || !valueText) {
      return;
    }

    const channelId = column.dataset.channel || "channel";

    const setValue = (value, dispatch = true) => {
      const percent = clamp(value ?? column.dataset.value ?? 0, 0, 100);
      column.dataset.value = String(percent);
      thumb.style.setProperty("--thumb-top", `${100 - percent}%`);
      thumb.textContent = `${Math.round(percent)}%`;
      thumb.setAttribute("aria-valuenow", Math.round(percent));
      thumb.setAttribute("aria-valuetext", `${Math.round(percent)} percent`);
      valueText.textContent = `${channelId.toUpperCase()} Output: ${formatPercent(percent)}`;
      if (columnInput) {
        columnInput.value = String(Math.round(percent));
      }
      if (dispatch) {
        dispatchWidgetEvent(column, "net:fader-change", {
          channel: channelId,
          value: percent,
        });
      }
    };

    const track = column.querySelector(".plasma-fader__track");
    const slot = column.querySelector(".plasma-fader__slot");

    const updateFromPointer = (event) => {
      const reference = slot || track;
      if (!reference) {
        return;
      }
      const rect = reference.getBoundingClientRect();
      const ratio = 1 - (event.clientY - rect.top) / rect.height;
      const percent = clamp(ratio * 100, 0, 100);
      setValue(percent);
    };

    const handlePointerMove = (event) => {
      event.preventDefault();
      updateFromPointer(event);
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    thumb.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      thumb.setPointerCapture(event.pointerId);
      updateFromPointer(event);
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    });

    thumb.addEventListener("keydown", (event) => {
      const current = Number.parseFloat(column.dataset.value || "0");
      let next = current;
      switch (event.key) {
        case "ArrowUp":
          next = current + 5;
          break;
        case "ArrowDown":
          next = current - 5;
          break;
        case "PageUp":
          next = current + 10;
          break;
        case "PageDown":
          next = current - 10;
          break;
        case "Home":
          next = 0;
          break;
        case "End":
          next = 100;
          break;
        default:
          return;
      }
      event.preventDefault();
      setValue(next);
    });

    thumb.setAttribute("role", "slider");
    thumb.setAttribute("aria-valuemin", "0");
    thumb.setAttribute("aria-valuemax", "100");

    setValue(column.dataset.value || (columnInput ? columnInput.value : 0), false);
  });
};

/* -------------------------------------------------- */
/* Node Matrix                                         */
/* -------------------------------------------------- */

const initNodeMatrix = (root) => {
  if (!(root instanceof HTMLElement)) {
    return;
  }
  const nodes = Array.from(root.querySelectorAll(".node-matrix__node"));
  const summary = root.querySelector(".node-matrix__summary");
  const hiddenInput = findHiddenInput(root);

  if (!nodes.length || !summary) {
    return;
  }

  const updateSummary = () => {
    const active = nodes
      .filter((node) => node.getAttribute("aria-pressed") === "true")
      .map((node) => node.dataset.node || "")
      .filter(Boolean);
    const text = active.length ? active.join(" · ") : "No nodes armed";
    summary.textContent = `Active nodes: ${text}`;
    root.dataset.value = active.join(",");
    if (hiddenInput) {
      syncHiddenInput(hiddenInput, root.dataset.value || "");
    }
    dispatchWidgetEvent(root, "net:matrix-change", { nodes: active });
  };

  nodes.forEach((node) => {
    node.type = "button";
    node.setAttribute("role", "switch");
    if (!node.hasAttribute("tabindex")) {
      node.setAttribute("tabindex", "0");
    }
    node.addEventListener("click", () => {
      const current = node.getAttribute("aria-pressed") === "true";
      node.setAttribute("aria-pressed", String(!current));
      updateSummary();
    });
    node.addEventListener("keydown", (event) => {
      const row = Number.parseInt(node.dataset.row || "0", 10);
      const col = Number.parseInt(node.dataset.col || "0", 10);
      let target = null;
      switch (event.key) {
        case "ArrowUp":
          target = nodes.find((item) => Number.parseInt(item.dataset.row || "0", 10) === row - 1 && Number.parseInt(item.dataset.col || "0", 10) === col);
          break;
        case "ArrowDown":
          target = nodes.find((item) => Number.parseInt(item.dataset.row || "0", 10) === row + 1 && Number.parseInt(item.dataset.col || "0", 10) === col);
          break;
        case "ArrowLeft":
          target = nodes.find((item) => Number.parseInt(item.dataset.row || "0", 10) === row && Number.parseInt(item.dataset.col || "0", 10) === col - 1);
          break;
        case "ArrowRight":
          target = nodes.find((item) => Number.parseInt(item.dataset.row || "0", 10) === row && Number.parseInt(item.dataset.col || "0", 10) === col + 1);
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          node.click();
          return;
        default:
          return;
      }
      if (target) {
        event.preventDefault();
        target.focus();
      }
    });
  });

  updateSummary();
};

/* -------------------------------------------------- */
/* Cipher Wheel                                        */
/* -------------------------------------------------- */

const initCipherWheel = (root) => {
  if (!(root instanceof HTMLElement)) {
    return;
  }
  const rings = Array.from(root.querySelectorAll(".cipher-wheel__ring"));
  const readout = root.querySelector(".cipher-wheel__readout");
  const hiddenInput = findHiddenInput(root);

  if (!rings.length || !readout) {
    return;
  }

  const alphabet = root.dataset.alphabet || "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  const updateReadout = () => {
    const key = rings
      .map((ring) => ring.dataset.value || alphabet[0] || "")
      .join("");
    readout.textContent = `Cipher: ${key}`;
    root.dataset.value = key;
    if (hiddenInput) {
      syncHiddenInput(hiddenInput, key);
    }
    dispatchWidgetEvent(root, "net:cipher-change", { key });
  };

  rings.forEach((ring, index) => {
    const windowEl = ring.querySelector(".cipher-wheel__window");
    const controls = Array.from(ring.querySelectorAll(".cipher-wheel__controls button"));
    const ringLabel = ring.dataset.label || `Ring ${index + 1}`;

    if (!windowEl || !controls.length) {
      return;
    }

    const setValue = (value) => {
      const char = value.toUpperCase();
      const charIndex = alphabet.indexOf(char);
      const fallbackIndex = charIndex === -1 ? 0 : charIndex;
      const output = alphabet[fallbackIndex] || alphabet[0] || "";
      ring.dataset.value = output;
      windowEl.textContent = output;
      windowEl.setAttribute("aria-label", `${ringLabel} set to ${output}`);
      updateReadout();
    };

    const adjust = (delta) => {
      const current = ring.dataset.value || alphabet[0] || "";
      const indexCurrent = alphabet.indexOf(current);
      const nextIndex = indexCurrent === -1 ? 0 : (indexCurrent + delta + alphabet.length) % alphabet.length;
      setValue(alphabet[nextIndex]);
    };

    controls.forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.action;
        adjust(action === "increment" ? 1 : -1);
      });
      button.addEventListener("keydown", (event) => {
        if (event.key === "ArrowUp" || event.key === "+") {
          event.preventDefault();
          adjust(1);
        } else if (event.key === "ArrowDown" || event.key === "-") {
          event.preventDefault();
          adjust(-1);
        }
      });
    });

    setValue(ring.dataset.value || alphabet[Math.floor(Math.random() * alphabet.length)]);
  });

  updateReadout();
};

/* -------------------------------------------------- */
/* Flux Keypad                                         */
/* -------------------------------------------------- */

const initFluxKeypad = (root) => {
  if (!(root instanceof HTMLElement)) {
    return;
  }
  const display = root.querySelector('[data-role="display"]');
  const status = root.querySelector('[data-role="status"]');
  const keys = Array.from(root.querySelectorAll(".flux-keypad__key"));
  const hiddenInput = findHiddenInput(root);
  const maxLength = Number.parseInt(root.dataset.maxLength || "6", 10);

  if (!display || !status || !keys.length) {
    return;
  }

  let buffer = "";

  const render = (announce = false) => {
    display.textContent = buffer.padEnd(maxLength, "·");
    if (hiddenInput) {
      syncHiddenInput(hiddenInput, buffer);
    }
    if (announce) {
      status.textContent = `Code staged: ${buffer || "none"}`;
    }
  };

  const append = (digit) => {
    if (buffer.length >= maxLength) {
      status.textContent = "Buffer full";
      return;
    }
    buffer += digit;
    render(true);
  };

  keys.forEach((key) => {
    key.type = "button";
    key.addEventListener("click", () => {
      append(key.dataset.key || "");
    });
  });

  const actions = Array.from(root.querySelectorAll(".flux-keypad__actions button"));

  actions.forEach((button) => {
    button.addEventListener("click", () => {
      switch (button.dataset.action) {
        case "clear":
          buffer = "";
          status.textContent = "Buffer cleared";
          render(false);
          break;
        case "backspace":
          buffer = buffer.slice(0, -1);
          status.textContent = "Digit removed";
          render(false);
          break;
        case "submit":
          if (!buffer.length) {
            status.textContent = "No code staged";
            break;
          }
          status.textContent = `Code transmitted (${buffer.length})`;
          dispatchWidgetEvent(root, "net:keypad-submit", { value: buffer });
          break;
        default:
          break;
      }
    });
  });

  render(false);
};

/* -------------------------------------------------- */
/* Sequencer                                           */
/* -------------------------------------------------- */

const initSequencer = (root) => {
  if (!(root instanceof HTMLElement)) {
    return;
  }
  const steps = Array.from(root.querySelectorAll(".sequencer-grid__step"));
  const controls = Array.from(root.querySelectorAll(".sequencer-grid__controls button"));
  const readout = root.querySelector('[data-role="sequence-output"]');
  const hiddenInput = findHiddenInput(root);

  if (!steps.length || !controls.length || !readout) {
    return;
  }

  let playing = false;
  let timerId = 0;
  let phase = 0;

  const computePattern = () =>
    steps
      .map((step) => (step.getAttribute("aria-pressed") === "true" ? "■" : "·"))
      .join(" ");

  const renderPattern = () => {
    const pattern = computePattern();
    readout.textContent = `Pattern: ${pattern}`;
    if (hiddenInput) {
      syncHiddenInput(hiddenInput, pattern);
    }
    dispatchWidgetEvent(root, "net:sequencer-change", { pattern });
  };

  const setPlaying = (state) => {
    if (playing === state) {
      return;
    }
    playing = state;
    if (!playing) {
      window.clearInterval(timerId);
      steps.forEach((step) => step.removeAttribute("data-phase"));
      return;
    }
    phase = 0;
    timerId = window.setInterval(() => {
      steps.forEach((step, index) => {
        step.dataset.phase = index === phase ? "active" : "";
      });
      const activeSteps = steps.filter((step) => step.dataset.phase === "active" && step.getAttribute("aria-pressed") === "true");
      if (activeSteps.length) {
        dispatchWidgetEvent(root, "net:sequencer-trigger", { index: phase });
      }
      phase = (phase + 1) % steps.length;
    }, 320);
  };

  steps.forEach((step) => {
    step.type = "button";
    step.setAttribute("role", "switch");
    step.addEventListener("click", () => {
      const current = step.getAttribute("aria-pressed") === "true";
      step.setAttribute("aria-pressed", String(!current));
      renderPattern();
    });
    step.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        step.click();
      }
    });
  });

  controls.forEach((button) => {
    button.addEventListener("click", () => {
      switch (button.dataset.action) {
        case "play":
          setPlaying(true);
          break;
        case "stop":
          setPlaying(false);
          break;
        case "clear":
          steps.forEach((step) => step.setAttribute("aria-pressed", "false"));
          renderPattern();
          break;
        default:
          break;
      }
    });
  });

  renderPattern();
};

/* -------------------------------------------------- */
/* Radar Monitor                                       */
/* -------------------------------------------------- */

const initRadarMonitor = (root) => {
  if (!(root instanceof HTMLElement)) {
    return;
  }
  const sweep = root.querySelector(".radar-monitor__sweep");
  const targets = Array.from(root.querySelectorAll(".radar-monitor__target"));
  const log = root.querySelector(".radar-monitor__log");

  if (!sweep || !log) {
    return;
  }

  let angle = 0;

  const pushLog = (message) => {
    const stamp = new Date().toLocaleTimeString(undefined, { hour12: false });
    const entry = document.createElement("div");
    entry.textContent = `[${stamp}] ${message}`;
    log.append(entry);
    log.scrollTop = log.scrollHeight;
  };

  const tick = () => {
    angle = (angle + 2) % 360;
    sweep.style.setProperty("--sweep-angle", `${angle}deg`);
    targets.forEach((target) => {
      const threshold = Number.parseFloat(target.dataset.threshold || "0");
      const offset = Math.abs(angle - threshold);
      if (offset < 6 || offset > 354) {
        if (target.dataset.state !== "active") {
          target.dataset.state = "active";
          pushLog(`Signal spike at ${target.dataset.id || "unknown"}`);
          dispatchWidgetEvent(root, "net:radar-hit", { id: target.dataset.id, angle });
        }
      } else if (target.dataset.state === "active") {
        target.dataset.state = "";
      }
    });
    window.requestAnimationFrame(tick);
  };

  window.requestAnimationFrame(tick);
};

/* -------------------------------------------------- */
/* Tunnel Meter                                        */
/* -------------------------------------------------- */

const initTunnelMeter = (root) => {
  if (!(root instanceof HTMLElement)) {
    return;
  }
  const rows = Array.from(root.querySelectorAll(".tunnel-meter__row"));
  if (!rows.length) {
    return;
  }

  const setRowValue = (row, value) => {
    const bar = row.querySelector(".tunnel-meter__bar-fill");
    const readout = row.querySelector(".tunnel-meter__value");
    const percent = clamp(value ?? row.dataset.value ?? 0, 0, 100);
    row.dataset.value = String(percent);
    if (bar) {
      bar.style.transform = `scaleX(${percent / 100})`;
    }
    if (readout) {
      readout.textContent = formatPercent(percent);
    }
  };

  rows.forEach((row) => setRowValue(row));

  setInterval(() => {
    rows.forEach((row, index) => {
      const base = Number.parseFloat(row.dataset.value || "0");
      const swing = Math.sin(Date.now() / 800 + index) * 12;
      setRowValue(row, clamp(base + swing + Math.random() * 6, 0, 100));
    });
  }, 1200);
};

/* -------------------------------------------------- */
/* Launch Lever                                        */
/* -------------------------------------------------- */

const initLaunchLever = (root) => {
  if (!(root instanceof HTMLElement)) {
    return;
  }
  const thumb = root.querySelector(".launch-lever__thumb");
  const status = root.querySelector(".launch-lever__status");
  if (!(thumb instanceof HTMLButtonElement) || !status) {
    return;
  }

  const setPercent = (value, announce = true) => {
    const percent = clamp(value, 0, 100);
    root.dataset.value = String(percent);
    thumb.style.setProperty("--lever-percent", `${percent}%`);
    thumb.setAttribute("aria-valuenow", Math.round(percent));
    thumb.setAttribute("aria-valuetext", `${Math.round(percent)} percent armed`);
    if (!announce) {
      return;
    }
    if (percent >= 98) {
      status.textContent = "Launch vector committed";
      dispatchWidgetEvent(root, "net:lever-commit", { value: percent });
      setTimeout(() => {
        setPercent(0, false);
        status.textContent = "Lever resetting";
        setTimeout(() => {
          status.textContent = "Awaiting authorization";
        }, 750);
      }, 900);
    } else {
      status.textContent = `Alignment ${formatPercent(percent)}`;
    }
  };

  const track = root.querySelector(".launch-lever__rail");

  const updateFromPointer = (event) => {
    const reference = track || thumb.parentElement;
    if (!reference) {
      return;
    }
    const rect = reference.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const percent = clamp(ratio * 100, 0, 100);
    setPercent(percent);
  };

  const handlePointerMove = (event) => {
    event.preventDefault();
    updateFromPointer(event);
  };

  const handlePointerUp = () => {
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
  };

  thumb.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    thumb.setPointerCapture(event.pointerId);
    updateFromPointer(event);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  });

  thumb.addEventListener("keydown", (event) => {
    const current = Number.parseFloat(root.dataset.value || "0");
    let next = current;
    switch (event.key) {
      case "ArrowLeft":
        next = current - 5;
        break;
      case "ArrowRight":
        next = current + 5;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = 100;
        break;
      default:
        return;
    }
    event.preventDefault();
    setPercent(next);
  });

  thumb.setAttribute("role", "slider");
  thumb.setAttribute("aria-valuemin", "0");
  thumb.setAttribute("aria-valuemax", "100");

  setPercent(Number.parseFloat(root.dataset.value || "0"), false);
  status.textContent = "Awaiting authorization";
};

/* -------------------------------------------------- */
/* Constellation Router                                */
/* -------------------------------------------------- */

const initConstellationRouter = (root) => {
  if (!(root instanceof HTMLElement)) {
    return;
  }
  const nodes = Array.from(root.querySelectorAll(".constellation-router__node"));
  const readout = root.querySelector(".constellation-router__readout");
  const hiddenInput = findHiddenInput(root);

  if (!nodes.length || !readout) {
    return;
  }

  const setActive = (target, shouldFocus = true) => {
    nodes.forEach((node) => {
      const isActive = node === target;
      node.setAttribute("aria-checked", String(isActive));
      if (isActive && shouldFocus) {
        node.focus();
      }
    });
    const value = target?.dataset.node || "";
    root.dataset.value = value;
    readout.textContent = value ? `Route locked to ${value}` : "No route selected";
    if (hiddenInput) {
      syncHiddenInput(hiddenInput, value);
    }
    if (value) {
      dispatchWidgetEvent(root, "net:constellation-change", { value });
    }
  };

  nodes.forEach((node) => {
    node.type = "button";
    node.setAttribute("role", "radio");
    node.addEventListener("click", () => setActive(node));
    node.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setActive(node);
      }
    });
  });

  setActive(nodes.find((node) => node.dataset.active === "true") || nodes[0], false);
};

/* -------------------------------------------------- */
/* Holo Console                                        */
/* -------------------------------------------------- */

const initHoloConsole = (root) => {
  if (!(root instanceof HTMLElement)) {
    return;
  }
  const textarea = root.querySelector("textarea");
  const preview = root.querySelector(".holo-console__preview");
  const charCount = root.querySelector('[data-role="char-count"]');
  const status = root.querySelector('[data-role="console-status"]');
  const hiddenInput = findHiddenInput(root);

  if (!(textarea instanceof HTMLTextAreaElement) || !preview || !charCount || !status) {
    return;
  }

  const max = Number.parseInt(textarea.getAttribute("maxlength") || "240", 10);

  const render = () => {
    const value = textarea.value;
    preview.textContent = value || "// awaiting uplink text";
    charCount.textContent = `${value.length} / ${max}`;
    status.textContent = value.length ? "Echo online" : "Echo idle";
    if (hiddenInput) {
      syncHiddenInput(hiddenInput, value);
    }
    dispatchWidgetEvent(root, "net:console-change", { value });
  };

  textarea.addEventListener("input", render);
  render();
};

/* -------------------------------------------------- */
/* Cryo Switch                                         */
/* -------------------------------------------------- */

const initCryoSwitch = (root) => {
  if (!(root instanceof HTMLElement)) {
    return;
  }
  const handle = root.querySelector(".cryo-switch__handle");
  const status = root.querySelector(".cryo-switch__status");
  const hiddenInput = findHiddenInput(root);

  if (!(handle instanceof HTMLButtonElement) || !status) {
    return;
  }

  const phases = [
    { label: "Hibernate", percent: 5, status: "Cryo lock engaged" },
    { label: "Idle", percent: 50, status: "Capsule idle" },
    { label: "Revive", percent: 95, status: "Revival sequence primed" },
  ];

  const setPhase = (index, announce = true) => {
    const safeIndex = ((index % phases.length) + phases.length) % phases.length;
    const phase = phases[safeIndex];
    root.dataset.value = String(safeIndex);
    handle.style.setProperty("--switch-percent", `${phase.percent}%`);
    handle.textContent = phase.label;
    handle.setAttribute("aria-valuenow", String(safeIndex));
    handle.setAttribute("aria-valuetext", phase.label);
    if (hiddenInput) {
      syncHiddenInput(hiddenInput, String(safeIndex));
    }
    if (announce) {
      status.textContent = phase.status;
      dispatchWidgetEvent(root, "net:cryo-change", { index: safeIndex, label: phase.label });
    }
  };

  handle.addEventListener("click", () => {
    const next = Number.parseInt(root.dataset.value || "1", 10) + 1;
    setPhase(next);
  });

  handle.addEventListener("keydown", (event) => {
    let next = Number.parseInt(root.dataset.value || "1", 10);
    switch (event.key) {
      case "ArrowLeft":
      case "ArrowDown":
        next -= 1;
        break;
      case "ArrowRight":
      case "ArrowUp":
        next += 1;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = phases.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    setPhase(next);
  });

  handle.setAttribute("role", "slider");
  handle.setAttribute("aria-valuemin", "0");
  handle.setAttribute("aria-valuemax", String(phases.length - 1));

  setPhase(Number.parseInt(root.dataset.value || "1", 10), false);
};

/* -------------------------------------------------- */
/* Initialise all widgets                              */
/* -------------------------------------------------- */

window.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-widget='neon-select']").forEach((node) => initNeonSelect(node));
  document.querySelectorAll("[data-widget='segment-toggle']").forEach((node) => initSegmentToggle(node));
  document.querySelectorAll("[data-widget='status-rail']").forEach((node) => initStatusRail(node));
  document.querySelectorAll("[data-widget='packet-scrubber']").forEach((node) => initPacketScrubber(node));
  document.querySelectorAll("[data-widget='orbital-dial']").forEach((node) => initOrbitalDial(node));
  document.querySelectorAll("[data-widget='plasma-fader']").forEach((node) => initPlasmaFader(node));
  document.querySelectorAll("[data-widget='node-matrix']").forEach((node) => initNodeMatrix(node));
  document.querySelectorAll("[data-widget='cipher-wheel']").forEach((node) => initCipherWheel(node));
  document.querySelectorAll("[data-widget='flux-keypad']").forEach((node) => initFluxKeypad(node));
  document.querySelectorAll("[data-widget='sequencer-grid']").forEach((node) => initSequencer(node));
  document.querySelectorAll("[data-widget='radar-monitor']").forEach((node) => initRadarMonitor(node));
  document.querySelectorAll("[data-widget='tunnel-meter']").forEach((node) => initTunnelMeter(node));
  document.querySelectorAll("[data-widget='launch-lever']").forEach((node) => initLaunchLever(node));
  document.querySelectorAll("[data-widget='constellation-router']").forEach((node) => initConstellationRouter(node));
  document.querySelectorAll("[data-widget='holo-console']").forEach((node) => initHoloConsole(node));
  document.querySelectorAll("[data-widget='cryo-switch']").forEach((node) => initCryoSwitch(node));

  const pulseHost = document.querySelector("[data-widget='status-rail']");
  if (pulseHost) {
    autoPulse(pulseHost);
  }
});
