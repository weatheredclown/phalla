const form = document.getElementById("kernel-form");
const board = document.getElementById("status-board");
const visual = document.getElementById("kernel-visual");
const visualCaption = visual?.querySelector(".visual-caption");

const REQUIRED_NETWORK = ["forwarding", "firewall"];
const OPTIONAL_NETWORK = ["ipv6"];
const REQUIRED_NIC_MODE = "builtin";
const FORBIDDEN_DRIVERS = ["scsi", "sound"];

const updateBoard = (message, state = "idle") => {
  board.textContent = message;
  board.dataset.state = state;
};

const visualMessages = {
  idle: "Compiler idle at prompt.",
  processing: "Running make menuconfig…",
  success: "Kernel forged. Routers will reboot clean.",
  error: "Build halted. Check toggles.",
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

const evaluateKernel = (formData) => {
  const network = new Set(formData.getAll("network"));
  const drivers = new Set(formData.getAll("drivers"));
  const nicMode = formData.get("nic-mode");
  const issues = [];

  REQUIRED_NETWORK.forEach((flag) => {
    if (!network.has(flag)) {
      issues.push(`Enable ${flag}`);
    }
  });

  OPTIONAL_NETWORK.forEach((flag) => {
    if (network.has(flag)) {
      issues.push(`Disable ${flag}`);
    }
  });

  if (nicMode !== REQUIRED_NIC_MODE) {
    issues.push("3c59x mode");
  }

  FORBIDDEN_DRIVERS.forEach((flag) => {
    if (drivers.has(flag)) {
      issues.push(`Remove ${flag}`);
    }
  });

  return issues;
};

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  setVisualState("processing");
  const formData = new FormData(form);
  const issues = evaluateKernel(formData);
  if (issues.length) {
    updateBoard(`Build failed: ${issues.join(", ")}.`, "error");
    setVisualState("error");
    return;
  }
  updateBoard("Kernel linked. bzImage staged in /boot.", "success");
  setVisualState("success");
  window.parent?.postMessage(
    {
      type: "net:level-complete",
      game: "kernel-forge-20",
      payload: {
        status: "Router ready",
        score: 20036,
      },
    },
    "*"
  );
});

form?.addEventListener("input", () => {
  if (board.dataset.state === "success") {
    return;
  }
  const formData = new FormData(form);
  const issues = evaluateKernel(formData);
  if (!issues.length) {
    updateBoard("Config matches memo. make bzImage ready.");
    setVisualState("processing");
  } else {
    updateBoard("Awaiting config for make menuconfig…");
    setVisualState("idle");
  }
});
