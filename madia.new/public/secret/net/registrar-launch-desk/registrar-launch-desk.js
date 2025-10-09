import { initFullscreenToggle } from "../fullscreen.js";

initFullscreenToggle();

const scenarios = [
  {
    id: "launch-day",
    title: "Round 1 · Launch day logistics",
    domain: "orbit.cafe",
    narrative:
      "Orbit Café's marketing site is ready to launch. The web host handed you a single IPv4 address and a managed mail server.",
    goals: [
      "Point the apex (@) to the web host at 203.0.113.42 with an A record.",
      "Send www traffic to the apex using a CNAME alias.",
      "Route mail to mail.orbit-mail.net with priority 10.",
    ],
    candidates: [
      {
        id: "a-root-web",
        host: "@",
        type: "A",
        value: "203.0.113.42",
        ttl: "3600",
        description: "Primary web server provided by Launchpad Static Hosting.",
      },
      {
        id: "a-root-alt",
        host: "@",
        type: "A",
        value: "198.51.100.24",
        ttl: "3600",
        description: "An old sandbox address that is no longer in use.",
      },
      {
        id: "cname-www-root",
        host: "www",
        type: "CNAME",
        value: "@",
        ttl: "3600",
        description: "Lets www orbit the same destination as the apex.",
      },
      {
        id: "cname-www-app",
        host: "www",
        type: "CNAME",
        value: "app.orbit-pages.net",
        ttl: "3600",
        description: "Points www at a staging app that is not meant for production.",
      },
      {
        id: "mx-mail",
        host: "@",
        type: "MX",
        value: "mail.orbit-mail.net",
        priority: 10,
        ttl: "3600",
        description: "Primary mailbox cluster from Orbit Mail.",
      },
      {
        id: "mx-mail-backup",
        host: "@",
        type: "MX",
        value: "backup.orbit-mail.net",
        priority: 30,
        ttl: "3600",
        description: "Legacy backup MX that Orbit Mail retired last quarter.",
      },
      {
        id: "txt-verification",
        host: "@",
        type: "TXT",
        value: "google-site-verification=t7dLQ2Fx9oLJrKJwA1",
        ttl: "3600",
        description: "Verification token for an analytics service you may add later.",
      },
    ],
    solution: ["a-root-web", "cname-www-root", "mx-mail"],
  },
  {
    id: "mail-hardening",
    title: "Round 2 · Harden your inbox",
    domain: "papertrail.studio",
    narrative:
      "Papertrail Studio already serves a site from their craft CMS, but they are migrating mail to Papertrail Mail and need SPF configured.",
    goals: [
      "Keep the website online with the CMS server at 198.51.100.24.",
      "Publish the SPF policy v=spf1 include:_spf.papertrailmail.com -all.",
      "Add both priority 10 and 30 MX records pointing to Papertrail Mail.",
    ],
    candidates: [
      {
        id: "a-root-cms",
        host: "@",
        type: "A",
        value: "198.51.100.24",
        ttl: "1800",
        description: "Current CMS server that should keep receiving traffic.",
      },
      {
        id: "a-root-staging",
        host: "@",
        type: "A",
        value: "203.0.113.19",
        ttl: "1800",
        description: "Staging server used only for QA builds.",
      },
      {
        id: "txt-spf",
        host: "@",
        type: "TXT",
        value: '"v=spf1 include:_spf.papertrailmail.com -all"',
        ttl: "3600",
        description: "SPF record recommended by Papertrail Mail's onboarding wizard.",
      },
      {
        id: "txt-sandbox",
        host: "@",
        type: "TXT",
        value: '"v=spf1 mx -all"',
        ttl: "3600",
        description: "Old SPF placeholder that blocks Papertrail Mail from sending.",
      },
      {
        id: "mx-primary",
        host: "@",
        type: "MX",
        value: "mx1.papertrailmail.com",
        priority: 10,
        ttl: "3600",
        description: "Primary inbound mail exchanger for Papertrail Mail.",
      },
      {
        id: "mx-secondary",
        host: "@",
        type: "MX",
        value: "mx2.papertrailmail.com",
        priority: 30,
        ttl: "3600",
        description: "Backup mail exchanger required for failover.",
      },
      {
        id: "cname-calendar",
        host: "calendar",
        type: "CNAME",
        value: "ghs.googlehosted.com",
        ttl: "3600",
        description: "Points calendar.papertrail.studio to Google Calendar (optional).",
      },
    ],
    solution: ["a-root-cms", "txt-spf", "mx-primary", "mx-secondary"],
  },
  {
    id: "multi-stack",
    title: "Round 3 · Multi-stack launch",
    domain: "pixel.quest",
    narrative:
      "Pixel Quest is rolling out a hybrid stack with both IPv4 and IPv6 endpoints plus third-party verification tokens.",
    goals: [
      "Send the apex to the load balancer at 203.0.113.80.",
      "Expose an IPv6 API at api.pixel.quest using 2001:db8:200::5.",
      "Direct www to the apex with a CNAME so marketing stays in sync.",
      "Publish the TXT token stripe-verification=PX-44321 for billing onboarding.",
    ],
    candidates: [
      {
        id: "a-root-lb",
        host: "@",
        type: "A",
        value: "203.0.113.80",
        ttl: "1200",
        description: "Main IPv4 load balancer for the marketing site.",
      },
      {
        id: "a-root-misconfigured",
        host: "@",
        type: "A",
        value: "192.0.2.17",
        ttl: "1200",
        description: "Legacy IP from an old provider that should be removed.",
      },
      {
        id: "cname-www",
        host: "www",
        type: "CNAME",
        value: "@",
        ttl: "1200",
        description: "Keeps the www host synced with the apex content.",
      },
      {
        id: "aaaa-api",
        host: "api",
        type: "AAAA",
        value: "2001:db8:200::5",
        ttl: "900",
        description: "IPv6 address exposed by the API gateway.",
      },
      {
        id: "a-api-ipv4",
        host: "api",
        type: "A",
        value: "203.0.113.90",
        ttl: "900",
        description: "Fallback IPv4 address not yet ready for production.",
      },
      {
        id: "txt-stripe",
        host: "@",
        type: "TXT",
        value: '"stripe-verification=PX-44321"',
        ttl: "3600",
        description: "Required token for Stripe's domain claim flow.",
      },
      {
        id: "txt-beta",
        host: "beta",
        type: "TXT",
        value: '"beta-launch=soon"',
        ttl: "3600",
        description: "Fun easter egg record that marketing wants after launch.",
      },
    ],
    solution: ["a-root-lb", "cname-www", "aaaa-api", "txt-stripe"],
  },
];

const els = {
  status: document.getElementById("desk-status"),
  scenario: document.getElementById("scenario-card"),
  candidateList: document.getElementById("candidate-list"),
  zoneBody: document.getElementById("zone-body"),
  resetButton: document.getElementById("reset-button"),
  checkButton: document.getElementById("check-button"),
  nextButton: document.getElementById("next-button"),
  feedback: document.getElementById("feedback"),
  statusBoard: document.getElementById("status-board"),
  signalMap: document.getElementById("signal-map"),
};

const state = {
  index: 0,
  selected: new Set(),
  complete: Array(scenarios.length).fill(false),
};

attachListeners();
renderScenario();
updateStatus();

function attachListeners() {
  els.resetButton?.addEventListener("click", () => {
    state.selected.clear();
    state.complete[state.index] = false;
    renderCandidates();
    renderZone();
    setFeedback(null);
    setStatusBoard("Patch queue open. Queue records to stage the zone.", "idle");
    setDiagramState("idle");
    els.checkButton.disabled = false;
    updateNextButton();
    updateStatus();
  });

  els.checkButton?.addEventListener("click", () => {
    runValidation();
  });

  els.nextButton?.addEventListener("click", () => {
    if (state.index === scenarios.length - 1) {
      restartGame();
      return;
    }
    state.index = Math.min(state.index + 1, scenarios.length - 1);
    state.selected.clear();
    renderScenario();
    updateStatus();
  });
}

function renderScenario() {
  const scenario = scenarios[state.index];
  if (!scenario || !els.scenario) {
    return;
  }

  els.scenario.innerHTML = "";

  const domainLabel = document.createElement("p");
  domainLabel.className = "scenario-domain";
  domainLabel.append("Domain: ");
  const domainValue = document.createElement("span");
  domainValue.textContent = scenario.domain;
  domainLabel.appendChild(domainValue);

  const title = document.createElement("h2");
  title.className = "scenario-title";
  title.textContent = scenario.title;

  const narrative = document.createElement("p");
  narrative.className = "scenario-narrative";
  narrative.textContent = scenario.narrative;

  const objectives = document.createElement("div");
  objectives.className = "scenario-objectives";
  const objectivesHeading = document.createElement("h3");
  objectivesHeading.textContent = "Objectives";
  objectives.appendChild(objectivesHeading);

  const goalList = document.createElement("ul");
  goalList.className = "goal-list";
  scenario.goals.forEach((goal) => {
    const item = document.createElement("li");
    item.textContent = goal;
    goalList.appendChild(item);
  });
  objectives.appendChild(goalList);

  els.scenario.append(domainLabel, title, narrative, objectives);

  state.selected.clear();
  updateNextButton();
  setFeedback(null);
  els.checkButton.disabled = false;
  setStatusBoard("Patch queue open. Queue records to stage the zone.", "idle");
  setDiagramState("idle");
  renderCandidates();
  renderZone();
}

function renderCandidates() {
  const scenario = scenarios[state.index];
  if (!scenario || !els.candidateList) {
    return;
  }

  els.candidateList.innerHTML = "";

  const table = document.createElement("table");
  table.className = "candidate-table";
  const caption = document.createElement("caption");
  caption.textContent = "Candidate records";
  table.appendChild(caption);

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["Load", "Host", "Type", "Target / Value", "TTL", "Priority", "Notes"].forEach((heading) => {
    const th = document.createElement("th");
    th.textContent = heading;
    if (heading === "Load" || heading === "TTL" || heading === "Priority") {
      th.style.textAlign = "center";
    }
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  scenario.candidates.forEach((candidate) => {
    const row = document.createElement("tr");
    const isSelected = state.selected.has(candidate.id);
    if (isSelected) {
      row.dataset.selected = "true";
    }

    const toggleCell = document.createElement("td");
    toggleCell.className = "candidate-table__toggle";
    toggleCell.style.textAlign = "center";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = isSelected;
    checkbox.id = `candidate-${candidate.id}`;
    checkbox.setAttribute(
      "aria-label",
      `Load ${candidate.host} ${candidate.type} record`
    );
    checkbox.addEventListener("change", (event) => {
      toggleCandidate(candidate.id, event.target.checked);
    });
    toggleCell.appendChild(checkbox);
    row.appendChild(toggleCell);

    const hostCell = document.createElement("td");
    hostCell.textContent = candidate.host;
    row.appendChild(hostCell);

    const typeCell = document.createElement("td");
    typeCell.textContent = candidate.type;
    row.appendChild(typeCell);

    const valueCell = document.createElement("td");
    valueCell.textContent = candidate.value;
    row.appendChild(valueCell);

    const ttlCell = document.createElement("td");
    ttlCell.style.textAlign = "center";
    ttlCell.textContent = candidate.ttl ?? "—";
    row.appendChild(ttlCell);

    const priorityCell = document.createElement("td");
    priorityCell.style.textAlign = "center";
    if (candidate.type === "MX" && candidate.priority !== undefined) {
      priorityCell.textContent = String(candidate.priority);
    } else {
      priorityCell.textContent = "—";
    }
    row.appendChild(priorityCell);

    const notesCell = document.createElement("td");
    notesCell.className = "candidate-table__notes";
    notesCell.textContent = candidate.description;
    row.appendChild(notesCell);

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  els.candidateList.appendChild(table);
}

function renderZone() {
  const scenario = scenarios[state.index];
  if (!scenario || !els.zoneBody) {
    return;
  }

  els.zoneBody.innerHTML = "";
  const records = scenario.candidates.filter((candidate) =>
    state.selected.has(candidate.id)
  );

  if (!records.length) {
    const empty = document.createElement("p");
    empty.className = "zone-empty";
    empty.textContent = "No records staged. Flip the toggles to queue them.";
    els.zoneBody.appendChild(empty);
    return;
  }

  records.forEach((record) => {
    const card = document.createElement("div");
    card.className = "zone-record";

    const header = document.createElement("div");
    header.className = "zone-record__header";
    const host = document.createElement("span");
    host.className = "zone-record__host";
    host.textContent = record.host;
    const type = document.createElement("span");
    type.className = "zone-record__type";
    type.textContent = record.type;
    header.append(host, type);

    const value = document.createElement("div");
    value.className = "zone-record__value";
    value.textContent = record.value;

    const meta = document.createElement("div");
    meta.className = "zone-record__meta";
    if (record.ttl) {
      const ttl = document.createElement("span");
      ttl.textContent = `TTL ${record.ttl}`;
      meta.appendChild(ttl);
    }
    if (record.type === "MX" && record.priority !== undefined) {
      const priority = document.createElement("span");
      priority.textContent = `Priority ${record.priority}`;
      meta.appendChild(priority);
    }

    const note = document.createElement("p");
    note.className = "zone-record__note";
    note.textContent = record.description;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "zone-record__remove";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => {
      toggleCandidate(record.id, false);
    });

    card.append(header, value, meta, note, remove);
    els.zoneBody.appendChild(card);
  });
}

function toggleCandidate(id, shouldSelect) {
  if (shouldSelect) {
    state.selected.add(id);
  } else {
    state.selected.delete(id);
  }

  if (state.complete[state.index]) {
    state.complete[state.index] = false;
    els.checkButton.disabled = false;
  }

  renderCandidates();
  renderZone();
  setFeedback(null);
  updateNextButton();
  setStatusBoard(
    state.selected.size
      ? "Zone staging rack warmed up. Validate before pushing."
      : "Patch queue open. Queue records to stage the zone.",
    state.selected.size ? "staging" : "idle"
  );
  setDiagramState(state.selected.size ? "staging" : "idle");
  updateStatus();
}

function runValidation() {
  const scenario = scenarios[state.index];
  if (!scenario) {
    return;
  }

  setStatusBoard("Running validation across registrars…", "processing");
  setDiagramState("processing");

  const missing = scenario.solution.filter((id) => !state.selected.has(id));
  const extras = Array.from(state.selected).filter(
    (id) => !scenario.solution.includes(id)
  );

  if (!missing.length && !extras.length) {
    handleSuccess(scenario);
    return;
  }

  const detailBlocks = [];
  if (missing.length) {
    detailBlocks.push(createListBlock("Missing", missing, scenario));
  }
  if (extras.length) {
    detailBlocks.push(createListBlock("Not needed right now", extras, scenario));
  }

  const summary = document.createElement("p");
  summary.textContent = "Not quite. Cross-check the onboarding binder and try again.";
  detailBlocks.unshift(summary);

  setFeedback(detailBlocks, "warning");
  setStatusBoard("Validation failed. Compare notes and retry.", "error");
  setDiagramState("error");
}

function handleSuccess(scenario) {
  state.complete[state.index] = true;
  els.checkButton.disabled = true;
  setFeedback("Registrar signs off. Propagation timers already ticking.", "success");
  setStatusBoard(
    `${scenario.domain} cleared. Services resolving within minutes.`,
    "success"
  );
  setDiagramState("success");
  updateNextButton();
  updateStatus();

  const score = 3600 + state.index * 240;
  window.parent?.postMessage(
    {
      type: "net:level-complete",
      game: "registrar-launch-desk",
      payload: {
        status: `${scenario.domain} verified`,
        score,
      },
    },
    "*"
  );
}

function restartGame() {
  state.index = 0;
  state.selected.clear();
  state.complete = Array(scenarios.length).fill(false);
  renderScenario();
  updateStatus();
}

function updateStatus() {
  if (!els.status) {
    return;
  }
  const scenario = scenarios[state.index];
  const completed = state.complete.filter(Boolean).length;
  els.status.innerHTML = "";

  const roundChunk = document.createElement("span");
  roundChunk.className = "status-ribbon__chunk";
  roundChunk.textContent = `Round ${state.index + 1} of ${scenarios.length}`;
  els.status.appendChild(roundChunk);

  const clearedChunk = document.createElement("span");
  clearedChunk.className = "status-ribbon__chunk";
  clearedChunk.textContent = `Clearances ${completed}/${scenarios.length}`;
  els.status.appendChild(clearedChunk);

  if (scenario) {
    const domainChunk = document.createElement("span");
    domainChunk.className = "status-ribbon__domain";
    domainChunk.textContent = scenario.domain;
    els.status.appendChild(domainChunk);
  }
}

function updateNextButton() {
  if (!els.nextButton) {
    return;
  }
  const isComplete = state.complete[state.index];
  els.nextButton.hidden = !isComplete;
  els.nextButton.textContent =
    state.index === scenarios.length - 1 ? "Replay rotation" : "Next briefing";
}

function setFeedback(content, tone = "info") {
  if (!els.feedback) {
    return;
  }
  els.feedback.innerHTML = "";
  if (!content || (Array.isArray(content) && content.length === 0)) {
    els.feedback.removeAttribute("data-tone");
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "feedback__message";
  const blocks = Array.isArray(content) ? content : [content];
  blocks.forEach((block) => {
    if (typeof block === "string") {
      const paragraph = document.createElement("p");
      paragraph.textContent = block;
      wrapper.appendChild(paragraph);
      return;
    }
    wrapper.appendChild(block);
  });
  els.feedback.dataset.tone = tone;
  els.feedback.appendChild(wrapper);
}

function setStatusBoard(message, stateName = "idle") {
  if (!els.statusBoard) {
    return;
  }
  els.statusBoard.textContent = message;
  els.statusBoard.dataset.state = stateName;
}

function setDiagramState(stateName) {
  if (els.signalMap) {
    els.signalMap.dataset.state = stateName;
  }
}

function createListBlock(label, ids, scenario) {
  const container = document.createElement("div");
  const heading = document.createElement("p");
  heading.textContent = `${label}:`;
  container.appendChild(heading);
  const list = document.createElement("ul");
  ids.forEach((id) => {
    const item = document.createElement("li");
    item.textContent = describeCandidate(scenario, id);
    list.appendChild(item);
  });
  container.appendChild(list);
  return container;
}

function describeCandidate(scenario, candidateId) {
  const candidate = scenario.candidates.find((entry) => entry.id === candidateId);
  if (!candidate) {
    return "Unknown record";
  }
  const priority =
    candidate.type === "MX" && candidate.priority !== undefined
      ? ` (priority ${candidate.priority})`
      : "";
  return `${candidate.host} ${candidate.type} → ${candidate.value}${priority}`;
}
