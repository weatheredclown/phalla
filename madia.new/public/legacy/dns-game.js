import { initLegacyHeader } from "./header.js";

const header = initLegacyHeader();
header?.setNavLinks([
  { label: "List of Games", href: "/legacy/index.html" },
  { label: "DNS Setup Minigame", current: true },
]);

const scenarios = [
  {
    id: "launch-day",
    title: "Round 1 · Launch day logistics",
    domain: "orbit.cafe",
    narrative:
      "Orbit Café's marketing site is ready to launch. The web host handed you a single IPv4 address and a managed mail server.",
    goals: [
      "Point the apex ( @ ) to the web host at 203.0.113.42 with an A record.",
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
        value: 'google-site-verification=t7dLQ2Fx9oLJrKJwA1',
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
  scenarioPanel: document.getElementById("dnsScenarioPanel"),
  candidateList: document.getElementById("dnsCandidateList"),
  zoneBody: document.getElementById("dnsZoneBody"),
  feedback: document.getElementById("dnsFeedback"),
  resetButton: document.getElementById("dnsResetButton"),
  checkButton: document.getElementById("dnsCheckButton"),
  nextButton: document.getElementById("dnsNextButton"),
  status: document.getElementById("dnsGameStatus"),
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
    setFeedback("", "info");
    els.checkButton.disabled = false;
    els.nextButton.style.display = "none";
    updateStatus();
  });

  els.checkButton?.addEventListener("click", () => {
    checkConfiguration();
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
  if (!scenario) {
    return;
  }

  const goalsList = scenario.goals
    .map((goal) => `<li>${escapeHtml(goal)}</li>`)
    .join("");

  els.scenarioPanel.innerHTML = `
    <div class="dns-game__card">
      <div class="dns-game__meta">Domain: <strong>${escapeHtml(scenario.domain)}</strong></div>
      <h2 class="dns-game__card-title">${escapeHtml(scenario.title)}</h2>
      <p class="dns-game__narrative">${escapeHtml(scenario.narrative)}</p>
      <h3 class="dns-game__subtitle">Your objectives</h3>
      <ul class="dns-game__goal-list">${goalsList}</ul>
    </div>
  `;

  els.nextButton.style.display = state.complete[state.index] ? "inline-block" : "none";
  els.nextButton.textContent =
    state.index === scenarios.length - 1 ? "Play again" : "Next round";
  els.checkButton.disabled = false;
  setFeedback("", "info");

  renderCandidates();
  renderZone();
}

function renderCandidates() {
  const scenario = scenarios[state.index];
  if (!scenario) return;

  els.candidateList.innerHTML = "";

  const table = document.createElement("table");
  table.className = "tborder dns-game__table";
  table.setAttribute("cellpadding", "4");
  table.setAttribute("cellspacing", "1");
  table.setAttribute("border", "0");
  table.setAttribute("width", "100%");

  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th class="thead" align="center">Load</th>
      <th class="thead" align="left">Host</th>
      <th class="thead" align="left">Type</th>
      <th class="thead" align="left">Target / Value</th>
      <th class="thead" align="center">TTL</th>
      <th class="thead" align="center">Priority</th>
      <th class="thead" align="left">Notes</th>
    </tr>
  `;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  scenario.candidates.forEach((candidate, index) => {
    const row = document.createElement("tr");
    const tone = index % 2 === 0 ? "alt1" : "alt2";

    const selectCell = document.createElement("td");
    selectCell.className = tone;
    selectCell.setAttribute("align", "center");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = state.selected.has(candidate.id);
    checkbox.setAttribute("data-candidate", candidate.id);
    checkbox.addEventListener("change", () => {
      toggleCandidate(candidate.id, checkbox.checked);
    });
    selectCell.appendChild(checkbox);
    row.appendChild(selectCell);

    row.appendChild(createCell(candidate.host, tone, "left"));
    row.appendChild(createCell(candidate.type, tone, "left"));
    row.appendChild(createCell(candidate.value, tone, "left"));
    row.appendChild(createCell(candidate.ttl, tone, "center"));
    row.appendChild(
      createCell(
        candidate.type === "MX" && candidate.priority !== undefined
          ? String(candidate.priority)
          : "—",
        tone,
        "center",
      ),
    );
    row.appendChild(createCell(candidate.description, tone, "left", true));

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  els.candidateList.appendChild(table);
}

function renderZone() {
  const scenario = scenarios[state.index];
  if (!scenario) return;

  const selection = Array.from(state.selected);
  if (!selection.length) {
    els.zoneBody.innerHTML =
      '<p class="dns-game__empty">No records loaded yet. Flip a few switches above.</p>';
    return;
  }

  const table = document.createElement("table");
  table.className = "tborder dns-game__table";
  table.setAttribute("cellpadding", "4");
  table.setAttribute("cellspacing", "1");
  table.setAttribute("border", "0");
  table.setAttribute("width", "100%");

  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th class="thead" align="left">Host</th>
      <th class="thead" align="left">Type</th>
      <th class="thead" align="left">Target / Value</th>
      <th class="thead" align="center">TTL</th>
      <th class="thead" align="center">Priority</th>
    </tr>
  `;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  selection.forEach((candidateId, index) => {
    const candidate = scenario.candidates.find((entry) => entry.id === candidateId);
    if (!candidate) {
      return;
    }
    const tone = index % 2 === 0 ? "alt1" : "alt2";
    const row = document.createElement("tr");
    row.appendChild(createCell(candidate.host, tone, "left"));
    row.appendChild(createCell(candidate.type, tone, "left"));
    row.appendChild(createCell(candidate.value, tone, "left"));
    row.appendChild(createCell(candidate.ttl, tone, "center"));
    row.appendChild(
      createCell(
        candidate.type === "MX" && candidate.priority !== undefined
          ? String(candidate.priority)
          : "—",
        tone,
        "center",
      ),
    );
    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  els.zoneBody.innerHTML = "";
  els.zoneBody.appendChild(table);
}

function toggleCandidate(candidateId, isChecked) {
  if (!candidateId) return;
  if (state.complete[state.index]) {
    return;
  }
  if (isChecked) {
    state.selected.add(candidateId);
  } else {
    state.selected.delete(candidateId);
  }
  renderZone();
}

function checkConfiguration() {
  const scenario = scenarios[state.index];
  if (!scenario) return;

  const solutionSet = new Set(scenario.solution);
  const selection = Array.from(state.selected);

  const missing = scenario.solution.filter((id) => !state.selected.has(id));
  const extras = selection.filter((id) => !solutionSet.has(id));

  if (!missing.length && !extras.length) {
    state.complete[state.index] = true;
    els.checkButton.disabled = true;
    els.nextButton.style.display = "inline-block";
    setFeedback(
      "Perfect! Your registrar approves the zone, and services are already resolving.",
      "success",
    );
    updateStatus();
    return;
  }

  const details = [];
  if (missing.length) {
    const missingDescriptions = missing
      .map((id) => describeCandidate(scenario, id))
      .join("</li><li>");
    details.push(
      `<p><strong>Missing:</strong></p><ul><li>${missingDescriptions}</li></ul>`,
    );
  }
  if (extras.length) {
    const extraDescriptions = extras
      .map((id) => describeCandidate(scenario, id))
      .join("</li><li>");
    details.push(
      `<p><strong>Not needed right now:</strong></p><ul><li>${extraDescriptions}</li></ul>`,
    );
  }

  setFeedback(
    `Not quite. Double-check the onboarding docs before trying again.${
      details.length ? details.join("") : ""
    }`,
    "warning",
  );
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
  return `${escapeHtml(candidate.host)} ${escapeHtml(candidate.type)} → ${escapeHtml(
    candidate.value,
  )}${priority}`;
}

function setFeedback(message, tone) {
  if (!els.feedback) return;
  const toneClass = tone ? ` dns-game__feedback--${tone}` : "";
  els.feedback.innerHTML = message
    ? `<div class="dns-game__feedback-message${toneClass}">${message}</div>`
    : "";
}

function updateStatus() {
  if (!els.status) return;
  const completed = state.complete.filter(Boolean).length;
  els.status.textContent = `Round ${state.index + 1} of ${scenarios.length} · Completed ${completed}`;
}

function restartGame() {
  state.index = 0;
  state.selected.clear();
  state.complete = Array(scenarios.length).fill(false);
  renderScenario();
  updateStatus();
  setFeedback("", "info");
}

function createCell(value, tone, align, isNotes = false) {
  const cell = document.createElement("td");
  cell.className = tone;
  cell.setAttribute("align", align);
  const text = document.createElement("span");
  if (isNotes) {
    text.className = "dns-game__note";
  }
  text.textContent = value ?? "";
  cell.appendChild(text);
  return cell;
}

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
