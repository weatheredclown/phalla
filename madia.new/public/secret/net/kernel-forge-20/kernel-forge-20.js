const form = document.getElementById("kernel-form");
const board = document.getElementById("status-board");
const monitor = document.querySelector(".forge-monitor");
const meterFill = monitor?.querySelector(".meter-fill");
const meterLabel = monitor?.querySelector('[data-role="meter-label"]');
const flagChips = new Map(
  Array.from(document.querySelectorAll(".flag-chip")).map((element) => [element.dataset.flag, element])
);
const driverChips = new Map(
  Array.from(document.querySelectorAll(".driver-chip")).map((element) => [element.dataset.driver, element])
);

const REQUIRED_NETWORK = ["forwarding", "firewall"];
const OPTIONAL_NETWORK = ["ipv6"];
const REQUIRED_NIC_MODE = "builtin";
const FORBIDDEN_DRIVERS = ["scsi", "sound"];

const updateBoard = (message, state = "idle") => {
  board.textContent = message;
  board.dataset.state = state;
  if (monitor) {
    monitor.dataset.state = state;
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

const applyChipState = (chip, isActive, hasIssue) => {
  if (!chip) {
    return isActive && !hasIssue ? 1 : 0;
  }
  if (board.dataset.state === "success") {
    chip.dataset.state = "active";
    return 1;
  }
  if (hasIssue) {
    chip.dataset.state = "error";
    return 0;
  }
  if (isActive) {
    chip.dataset.state = "active";
    return 1;
  }
  chip.dataset.state = "idle";
  return 0;
};

const updateForgeMonitor = (formData, issues = []) => {
  const network = new Set(formData.getAll("network"));
  const drivers = new Set(formData.getAll("drivers"));
  const nicMode = formData.get("nic-mode");
  const issueLookup = new Set(issues.map((issue) => issue.toLowerCase()));

  let satisfied = 0;
  satisfied += applyChipState(
    flagChips.get("forwarding"),
    network.has("forwarding"),
    issueLookup.has("enable forwarding")
  );
  satisfied += applyChipState(
    flagChips.get("firewall"),
    network.has("firewall"),
    issueLookup.has("enable firewall")
  );
  satisfied += applyChipState(
    flagChips.get("ipv6"),
    !network.has("ipv6"),
    issueLookup.has("disable ipv6")
  );
  satisfied += applyChipState(
    driverChips.get("3c59x"),
    nicMode === REQUIRED_NIC_MODE,
    issueLookup.has("3c59x mode")
  );
  satisfied += applyChipState(
    driverChips.get("scsi"),
    !drivers.has("scsi"),
    issueLookup.has("remove scsi")
  );
  satisfied += applyChipState(
    driverChips.get("sound"),
    !drivers.has("sound"),
    issueLookup.has("remove sound")
  );

  const total = 6;
  const ratio = total ? Math.max(0, Math.min(1, satisfied / total)) : 0;
  if (meterFill) {
    meterFill.style.setProperty("--forge-progress", ratio.toString());
  }
  if (meterLabel) {
    meterLabel.textContent = `Compile progress ${Math.round(ratio * 100)}%`;
  }
};

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const issues = evaluateKernel(formData);
  updateForgeMonitor(formData, issues);
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
  updateForgeMonitor(formData, issues);
  if (!issues.length) {
    updateBoard("Config matches memo. make bzImage ready.");
  } else {
    updateBoard("Awaiting config for make menuconfig…");
  }
});

if (form) {
  updateForgeMonitor(new FormData(form));
}
