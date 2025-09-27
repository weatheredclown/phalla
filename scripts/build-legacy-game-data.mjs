#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const exportDir = path.join(repoRoot, "docs", "db_exports");
const outputFile = path.join(repoRoot, "madia.new", "public", "legacy", "roles-data.js");

function parseCsv(text) {
  const rows = [];
  let current = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === "\r") {
      continue;
    }
    if (char === "\n") {
      if (inQuotes) {
        field += "\n";
        continue;
      }
      current.push(field);
      rows.push(current);
      current = [];
      field = "";
      continue;
    }
    if (char === '"') {
      const next = text[i + 1];
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      current.push(field);
      field = "";
      continue;
    }
    field += char;
  }
  current.push(field);
  rows.push(current);
  return rows;
}

function readCsv(fileName) {
  const fullPath = path.join(exportDir, fileName);
  const raw = fs.readFileSync(fullPath, "utf8");
  const rows = parseCsv(raw.trim());
  if (!rows.length) {
    return [];
  }
  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = row[index] ?? "";
    });
    return record;
  });
}

function toInteger(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeText(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function normalizeKey(value) {
  if (typeof value !== "string") {
    if (value === null || value === undefined) {
      return "";
    }
    return String(value).trim().toLowerCase();
  }
  return value.trim().toLowerCase();
}

function titleCase(value) {
  const text = normalizeText(value);
  if (!text) {
    return "";
  }
  return text
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      return word[0].toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function slugify(value) {
  const text = normalizeText(value).toLowerCase();
  return text
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

const ACTION_NAME_OVERRIDES = new Map([
  ["mafiavote", "Mafia Vote"],
  ["masonpost", "Mason Post"],
  ["notebook", "Notebook"],
  ["trust", "Trust"],
  ["seer", "Seer"],
  ["guardian", "Guardian"],
  ["track", "Track"],
  ["block", "Block"],
  ["execute", "Execute"],
  ["claim", "Claim"],
  ["vote", "Vote"],
]);

function formatActionLabel(raw) {
  const normalized = normalizeKey(raw);
  if (ACTION_NAME_OVERRIDES.has(normalized)) {
    return ACTION_NAME_OVERRIDES.get(normalized);
  }
  const cleaned = normalizeText(raw).replace(/[_-]+/g, " ");
  if (!cleaned) {
    return "";
  }
  return cleaned
    .split(/\s+/)
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word))
    .join(" ");
}

function getIndefiniteArticle(label) {
  const text = normalizeText(label);
  if (!text) {
    return "a";
  }
  return /^[aeiou]/i.test(text) ? "an" : "a";
}

function buildNoteParts({ timesPerGame, createsChannel }) {
  const notes = [];
  if (Number.isFinite(timesPerGame)) {
    notes.push(
      timesPerGame === 1
        ? "Limited to 1 use per game."
        : `Limited to ${timesPerGame} uses per game.`
    );
  }
  if (createsChannel) {
    notes.push("Creates a private discussion channel for eligible members.");
  }
  return notes.join(" ");
}

function cleanObject(value) {
  if (!value || typeof value !== "object") {
    return value;
  }
  Object.keys(value).forEach((key) => {
    const current = value[key];
    if (current === undefined || current === null || current === "") {
      delete value[key];
      return;
    }
    if (Array.isArray(current)) {
      const cleanedArray = current
        .map((item) => cleanObject(item))
        .filter((item) => item !== undefined && item !== null && item !== "");
      if (cleanedArray.length) {
        value[key] = cleanedArray;
      } else {
        delete value[key];
      }
      return;
    }
    if (typeof current === "object") {
      const cleaned = cleanObject({ ...current });
      if (Object.keys(cleaned).length) {
        value[key] = cleaned;
      } else {
        delete value[key];
      }
    }
  });
  return value;
}

const roles = readCsv("roles.csv");
const rules = readCsv("rules.csv");
const actionTypes = readCsv("actiontypes.csv");

const actionTypeById = new Map();
const actionTypeDefinitions = actionTypes.map((entry) => {
  const id = toInteger(entry.actiontypeid);
  const name = normalizeText(entry.actionname);
  const label = formatActionLabel(name);
  const definition = cleanObject({
    id: id ?? undefined,
    legacyActionTypeId: id ?? undefined,
    name,
    label,
    normalized: normalizeKey(name || label),
  });
  if (id !== null) {
    actionTypeById.set(id, definition);
  }
  return definition;
});

const rulesByRole = new Map();
rules.forEach((rule) => {
  const roleId = rule.roleid;
  if (!rulesByRole.has(roleId)) {
    rulesByRole.set(roleId, []);
  }
  rulesByRole.get(roleId).push(rule);
});

const roleDefinitions = roles.map((role) => {
  const roleId = toInteger(role.roleid);
  const name = titleCase(role.rolename);
  const alignment = role.protown === "1" ? "Village" : "Hostile";
  const tags = ["legacy", alignment.toLowerCase()];
  const summary = `Legacy ${name || "role"} imported from the Access database.`;
  const winCondition =
    alignment === "Village"
      ? "Eliminate all hostile factions from the game."
      : "Overwhelm the village and secure control of the vote.";

  const privateActions = [];
  const actionRules = [];
  const privateKeys = new Set();
  const ruleKeys = new Set();

  (rulesByRole.get(role.roleid) || []).forEach((ruleEntry) => {
    const actionTypeId = toInteger(ruleEntry.actiontypeid);
    const actionType = actionTypeId !== null ? actionTypeById.get(actionTypeId) : null;
    const rawName = actionType?.label || actionType?.name || ruleEntry.actionname;
    const displayName = formatActionLabel(rawName);
    if (!displayName) {
      return;
    }
    const times = toInteger(ruleEntry.timesperday);
    const limited = times !== null && times >= 0 ? times : null;
    const targeted = normalizeKey(ruleEntry.targeted) === "1";
    const isPrivate = normalizeKey(ruleEntry.private) === "1";
    const createsChannel = normalizeKey(ruleEntry.privatepostchannel) === "1";

    const actionDefinition = cleanObject({
      id: ruleEntry.ruleid ? `legacy-rule-${ruleEntry.ruleid}` : undefined,
      legacyRuleId: toInteger(ruleEntry.ruleid) ?? undefined,
      legacyActionTypeId: actionType?.legacyActionTypeId,
      actionType: actionType?.name,
      actionTypeId: actionType?.legacyActionTypeId,
      actionName: displayName,
      name: displayName,
      description: isPrivate
        ? `Record ${getIndefiniteArticle(displayName)} ${displayName} action for moderator tracking.`
        : undefined,
      timesPerGame: limited ?? undefined,
      targeted: targeted || undefined,
      target: targeted ? "player" : undefined,
      createsPrivateChannel: createsChannel || undefined,
      notes: buildNoteParts({ timesPerGame: limited ?? undefined, createsChannel }),
      tags: ["legacy"],
    });

    const ruleDefinition = cleanObject({
      ...actionDefinition,
    });

    if (isPrivate) {
      const key = `${actionTypeId || displayName}:private:${limited || "inf"}:${targeted}:${createsChannel}`;
      if (!privateKeys.has(key)) {
        privateKeys.add(key);
        privateActions.push(actionDefinition);
      }
    }

    const ruleKey = `${actionTypeId || displayName}:rule:${limited || "inf"}:${targeted}:${createsChannel}`;
    if (!ruleKeys.has(ruleKey)) {
      ruleKeys.add(ruleKey);
      actionRules.push(ruleDefinition);
    }
  });

  privateActions.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  actionRules.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  const rulesObject = cleanObject({
    legacyRoleId: roleId ?? undefined,
    privateActions,
    actionRules,
    notes: "Generated from docs/db_exports CSV exports.",
  });

  const definition = cleanObject({
    id: slugify(role.rolename || `role-${roleId ?? "unknown"}`),
    legacyId: roleId ?? undefined,
    name,
    alignment,
    summary,
    winCondition,
    tags,
    rules: Object.keys(rulesObject).length ? rulesObject : undefined,
  });
  return definition;
});

roleDefinitions.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

const fileContent = `// This file is auto-generated by scripts/build-legacy-game-data.mjs.\n// Run \"node scripts/build-legacy-game-data.mjs\" after updating docs/db_exports.\n\nexport const ACTION_TYPE_DEFINITIONS = ${JSON.stringify(
  actionTypeDefinitions,
  null,
  2
)};\n\nexport const ROLE_DEFINITIONS = ${JSON.stringify(roleDefinitions, null, 2)};\n\nexport const ROLE_NAMES = ROLE_DEFINITIONS.map((role) => role.name);\n\nexport function normalizeRoleName(name) {\n  if (typeof name !== \"string\") {\n    return \"\";\n  }\n  return name.trim().toLowerCase();\n}\n\nexport function normalizeActionTypeName(name) {\n  if (typeof name !== \"string\") {\n    return \"\";\n  }\n  return name.trim().toLowerCase();\n}\n\nconst CANONICAL_ROLE_MAP = new Map();\nROLE_DEFINITIONS.forEach((role) => {\n  const normalized = normalizeRoleName(role.name);\n  if (normalized) {\n    CANONICAL_ROLE_MAP.set(normalized, role);\n  }\n  (role.aliases || []).forEach((alias) => {\n    const normalizedAlias = normalizeRoleName(alias);\n    if (normalizedAlias) {\n      CANONICAL_ROLE_MAP.set(normalizedAlias, role);\n    }\n  });\n});\n\nconst ACTION_TYPE_BY_ID = new Map();\nconst ACTION_TYPE_BY_NAME = new Map();\nACTION_TYPE_DEFINITIONS.forEach((type) => {\n  if (typeof type.legacyActionTypeId === \"number\") {\n    ACTION_TYPE_BY_ID.set(type.legacyActionTypeId, type);\n  }\n  const normalizedName = normalizeActionTypeName(type.name);\n  if (normalizedName) {\n    ACTION_TYPE_BY_NAME.set(normalizedName, type);\n  }\n  const normalizedLabel = normalizeActionTypeName(type.label);\n  if (normalizedLabel) {\n    ACTION_TYPE_BY_NAME.set(normalizedLabel, type);\n  }\n});\n\nexport function getCanonicalRoleDefinition(name) {\n  const normalized = normalizeRoleName(name);\n  if (!normalized) {\n    return null;\n  }\n  return CANONICAL_ROLE_MAP.get(normalized) || null;\n}\n\nexport function getActionTypeDefinition(identifier) {\n  if (identifier === null || identifier === undefined) {\n    return null;\n  }\n  if (typeof identifier === \"number\") {\n    return ACTION_TYPE_BY_ID.get(identifier) || null;\n  }\n  const normalized = normalizeActionTypeName(identifier);\n  if (!normalized) {\n    return null;\n  }\n  return ACTION_TYPE_BY_NAME.get(normalized) || null;\n}\n`;

fs.writeFileSync(outputFile, `${fileContent}\n`, "utf8");

console.log(`Generated role data with ${roleDefinitions.length} roles and ${actionTypeDefinitions.length} action types.`);
