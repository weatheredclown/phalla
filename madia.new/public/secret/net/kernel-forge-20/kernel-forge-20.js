const form = document.getElementById("kernel-form");
const board = document.getElementById("status-board");

const REQUIRED_NETWORK = ["forwarding", "firewall"];
const OPTIONAL_NETWORK = ["ipv6"];
const REQUIRED_NIC_MODE = "builtin";
const FORBIDDEN_DRIVERS = ["scsi", "sound"];

const updateBoard = (message, state = "idle") => {
  board.textContent = message;
  board.dataset.state = state;
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
  const formData = new FormData(form);
  const issues = evaluateKernel(formData);
  if (issues.length) {
    updateBoard(`Build failed: ${issues.join(", ")}.`, "error");
    return;
  }
  updateBoard("Kernel linked. bzImage staged in /boot.", "success");
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
  } else {
    updateBoard("Awaiting config for make menuconfig…");
  }
});
