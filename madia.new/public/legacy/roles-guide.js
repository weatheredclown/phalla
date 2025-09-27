import { ROLE_DEFINITIONS } from "./roles-data.js";
import { initLegacyHeader } from "./header.js";

initLegacyHeader();

const container = document.getElementById("rolesContent");
if (!container) {
  console.warn("Role guide container missing");
} else {
  renderRoleGuide(container, ROLE_DEFINITIONS);
}

function renderRoleGuide(target, definitions) {
  const roles = [...definitions].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );

  target.innerHTML = "";

  const missingRules = roles.filter((role) => !role.rules);
  const summary = document.createElement("div");
  summary.className = "smallfont role-guide__summary";
  if (missingRules.length) {
    summary.textContent = `Loaded ${roles.length} roles, but ${missingRules.length} lack detailed rule breakdowns.`;
  } else {
    summary.textContent = `All ${roles.length} built-in roles include rule references. Review the summaries below for actions, passives, and moderator notes.`;
  }
  target.appendChild(summary);

  roles.forEach((role) => {
    target.appendChild(createRoleCard(role));
  });
}

function createRoleCard(role) {
  const table = document.createElement("table");
  table.className = "tborder role-card";
  table.cellPadding = "6";
  table.cellSpacing = "1";
  table.border = "0";
  table.width = "100%";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  const headCell = document.createElement("td");
  headCell.className = "thead";
  headCell.colSpan = 2;

  const heading = document.createElement("div");
  heading.className = "role-card__heading";

  const nameEl = document.createElement("span");
  nameEl.className = "role-card__name";
  nameEl.textContent = role.name;
  heading.appendChild(nameEl);

  if (role.alignment) {
    const alignment = document.createElement("span");
    alignment.className = "role-card__alignment";
    alignment.textContent = role.alignment;
    heading.appendChild(alignment);
  }

  headCell.appendChild(heading);

  headRow.appendChild(headCell);
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  let rowIndex = 0;

  const addRow = (label, builder) => {
    rowIndex += 1;
    const isEven = rowIndex % 2 === 0;
    const row = document.createElement("tr");

    const labelCell = document.createElement("td");
    labelCell.className = isEven ? "alt2 role-card__label" : "alt1 role-card__label";
    labelCell.textContent = label;

    const contentCell = document.createElement("td");
    contentCell.className = isEven ? "alt1" : "alt2";

    const content = builder();
    if (!content) {
      const placeholder = document.createElement("span");
      placeholder.className = "role-card__empty";
      placeholder.textContent = "—";
      contentCell.appendChild(placeholder);
    } else if (typeof content === "string") {
      const span = document.createElement("span");
      span.textContent = content;
      contentCell.appendChild(span);
    } else {
      contentCell.appendChild(content);
    }

    row.appendChild(labelCell);
    row.appendChild(contentCell);
    tbody.appendChild(row);
  };

  addRow("Summary", () => {
    const div = document.createElement("div");
    div.textContent = role.summary || "No summary provided.";
    return div;
  });

  if (role.winCondition) {
    addRow("Win condition", () => {
      const div = document.createElement("div");
      div.textContent = role.winCondition;
      return div;
    });
  }

  if (Array.isArray(role.aliases) && role.aliases.length) {
    addRow("Aliases", () => role.aliases.join(", "));
  }

  if (Array.isArray(role.passiveAbilities) && role.passiveAbilities.length) {
    addRow("Passive abilities", () => renderPassiveAbilities(role.passiveAbilities));
  }

  const privateActions = role.rules?.privateActions || [];
  addRow("Private actions", () =>
    renderActions(privateActions, "No private actions. Use passive abilities or votes only.")
  );

  const actionRules = role.rules?.actionRules || [];
  addRow("Moderator rules", () =>
    renderActions(actionRules, "No moderator logging required beyond standard vote tracking.")
  );

  if (role.rules?.notes) {
    addRow("Notes", () => {
      const note = document.createElement("div");
      note.className = "role-card__note";
      note.textContent = role.rules.notes;
      return note;
    });
  }

  table.appendChild(tbody);
  return table;
}

function renderPassiveAbilities(passives) {
  if (!passives.length) {
    return null;
  }
  const list = document.createElement("ul");
  list.className = "role-card__list";
  passives.forEach((passive) => {
    const item = document.createElement("li");
    item.className = "role-card__action";

    const title = document.createElement("div");
    title.className = "role-card__action-name";
    title.textContent = passive.name || "Unnamed ability";
    item.appendChild(title);

    if (passive.description) {
      const description = document.createElement("div");
      description.textContent = passive.description;
      item.appendChild(description);
    }

    list.appendChild(item);
  });
  return list;
}

function renderActions(actions, emptyMessage) {
  if (!actions.length) {
    const span = document.createElement("span");
    span.className = "role-card__empty";
    span.textContent = emptyMessage;
    return span;
  }

  const list = document.createElement("ul");
  list.className = "role-card__list";

  actions.forEach((action) => {
    const item = document.createElement("li");
    item.className = "role-card__action";

    const title = document.createElement("div");
    title.className = "role-card__action-name";
    title.textContent = action.name || action.actionName || "Unnamed action";
    item.appendChild(title);

    if (action.description) {
      const description = document.createElement("div");
      description.textContent = action.description;
      item.appendChild(description);
    }

    const details = [];
    if (typeof action.timesPerDay === "number") {
      details.push(`Uses per day: ${action.timesPerDay}`);
    }
    if (typeof action.timesPerGame === "number") {
      details.push(`Uses per game: ${action.timesPerGame}`);
    }
    if (typeof action.timesPerNight === "number") {
      details.push(`Uses per night: ${action.timesPerNight}`);
    }
    if (typeof action.usesRemaining === "number") {
      details.push(`Uses remaining: ${action.usesRemaining}`);
    }
    if (action.phase) {
      details.push(`Phase: ${action.phase}`);
    }
    if (action.target) {
      details.push(`Target: ${action.target}`);
    }
    if (typeof action.targeted === "boolean") {
      details.push(action.targeted ? "Requires target" : "No target");
    }
    if (action.notes) {
      details.push(`Notes: ${action.notes}`);
    }
    if (details.length) {
      const meta = document.createElement("div");
      meta.className = "smallfont role-card__action-meta";
      meta.textContent = details.join(" • ");
      item.appendChild(meta);
    }

    list.appendChild(item);
  });

  return list;
}
