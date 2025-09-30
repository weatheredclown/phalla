import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { auth, db, ensureUserDocument, missingConfig } from "./firebase.js";
import { initLegacyHeader } from "./header.js";

const header = initLegacyHeader();

const els = {
  breadcrumb: document.getElementById("myGameBreadcrumb"),
  gameName: document.getElementById("myGameName"),
  gameDay: document.getElementById("myGameDay"),
  status: document.getElementById("myGameStatus"),
  content: document.getElementById("myGameContent"),
  roleBlock: document.getElementById("myGameRoleBlock"),
  roleName: document.getElementById("myGameRoleName"),
  roleDescription: document.getElementById("myGameRoleDescription"),
  threadLink: document.getElementById("myGameThreadLink"),
  actionSection: document.getElementById("myGameActionSection"),
  actionsBody: document.getElementById("myGameActions"),
};

const params = new URLSearchParams(location.search);
const gameId = params.get("g");

let currentUser = auth.currentUser;
let currentGame = null;
let currentPlayer = null;
let loadToken = 0;

if (!gameId) {
  renderStatus("Missing game id.", "error");
} else if (missingConfig) {
  renderStatus(
    "Firebase configuration required. Update public/legacy/firebase.js before using this page.",
    "warning"
  );
}

header?.setNavLinks([
  { label: "List of Games", href: "/legacy/index.html", current: !gameId },
]);

initializePage().catch((error) => {
  console.error("Failed to initialise my game view", error);
});

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  header?.setUser(user);
  initializePage().catch((error) => {
    console.error("Failed to refresh my game view after auth change", error);
  });
});

async function initializePage() {
  if (!gameId || missingConfig) {
    return;
  }

  const token = ++loadToken;
  renderStatus("Loading game details…", "info");

  const gameRef = doc(db, "games", gameId);
  let gameSnap;
  try {
    gameSnap = await getDoc(gameRef);
  } catch (error) {
    if (token !== loadToken) return;
    console.error("Failed to load game", error);
    renderStatus("Unable to load game details.", "error");
    return;
  }

  if (token !== loadToken) return;

  if (!gameSnap.exists()) {
    currentGame = null;
    updateBreadcrumb();
    renderStatus("Game not found.", "error");
    return;
  }

  currentGame = { id: gameId, ...gameSnap.data() };
  updateGameDisplay();
  updateBreadcrumb();

  if (!currentUser) {
    showContent();
    renderRole(null);
    hideActionSection();
    renderStatus("Sign in to view your assignment.", "warning");
    return;
  }

  try {
    await ensureUserDocument(currentUser);
  } catch (error) {
    if (token !== loadToken) return;
    console.warn("Failed to ensure user document", error);
  }

  let playerSnap;
  try {
    playerSnap = await getDoc(doc(gameRef, "players", currentUser.uid));
  } catch (error) {
    if (token !== loadToken) return;
    console.error("Failed to load player record", error);
    showContent();
    renderRole(null);
    hideActionSection();
    renderStatus("Unable to load your assignment.", "error");
    return;
  }

  if (token !== loadToken) return;

  if (!playerSnap.exists()) {
    currentPlayer = null;
    showContent();
    renderRole(null);
    hideActionSection();
    renderStatus(
      "You have not joined this game yet. Visit the game thread and click Join Game to receive a role.",
      "info"
    );
    return;
  }

  currentPlayer = { id: playerSnap.id, ...playerSnap.data() };
  showContent();
  renderRole(currentPlayer);
  renderStatus("", "info");
  await loadPlayerActions(currentUser.uid, token);
}

function updateGameDisplay() {
  if (!currentGame) {
    return;
  }
  if (els.gameName) {
    els.gameName.textContent = currentGame.gamename || "(no name)";
  }
  if (els.gameDay) {
    const dayValue = currentGame.day;
    els.gameDay.textContent = Number.isFinite(dayValue) ? dayValue : dayValue || "0";
  }
  if (els.threadLink) {
    els.threadLink.href = `/legacy/game.html?g=${encodeURIComponent(currentGame.id)}`;
    els.threadLink.textContent = `Return to ${currentGame.gamename || "the game"}`;
  }
  if (els.breadcrumb) {
    const name = escapeHtml(currentGame.gamename || "(no name)");
    els.breadcrumb.innerHTML = `&gt; <a href="/legacy/game.html?g=${encodeURIComponent(
      currentGame.id
    )}">${name}</a>`;
  }
  document.title = currentGame.gamename
    ? `My Game: ${currentGame.gamename}`
    : "My Game";
}

function updateBreadcrumb() {
  if (!header || typeof header.setNavLinks !== "function") {
    return;
  }
  const links = [{ label: "List of Games", href: "/legacy/index.html" }];
  if (currentGame) {
    const label = currentGame.gamename || "(no name)";
    links.push({
      label,
      href: `/legacy/game.html?g=${encodeURIComponent(currentGame.id)}`,
    });
    links.push({ label: "my game", current: true, italic: true });
  } else {
    links[0].current = true;
  }
  if (!links.some((link) => link.current)) {
    links[links.length - 1].current = true;
  }
  header.setNavLinks(links);
}

function showContent() {
  if (els.content) {
    els.content.style.display = "block";
  }
}

function hideActionSection() {
  if (els.actionSection) {
    els.actionSection.style.display = "none";
  }
  if (els.actionsBody) {
    els.actionsBody.innerHTML = `
      <tr>
        <td class="alt1" colspan="5" align="center">Loading private history…</td>
      </tr>
    `;
  }
}

function renderRole(player) {
  if (!els.roleBlock || !els.roleName || !els.roleDescription) {
    return;
  }
  if (!player) {
    els.roleBlock.style.display = "none";
    els.roleName.textContent = "";
    els.roleDescription.innerHTML = "";
    return;
  }
  const roleName = getAssignedRoleName(player);
  const roleDescription = getAssignedRoleDescription(player);
  if (!roleName && !roleDescription) {
    els.roleBlock.style.display = "none";
    els.roleName.textContent = "";
    els.roleDescription.innerHTML = "";
    return;
  }
  els.roleBlock.style.display = "block";
  els.roleName.innerHTML = roleName ? `<big><big>${escapeHtml(roleName)}</big></big>` : "";
  if (roleDescription) {
    const escaped = escapeHtml(roleDescription).replace(/\r?\n/g, "<br />");
    els.roleDescription.innerHTML = escaped;
  } else {
    els.roleDescription.innerHTML = "";
  }
}

async function loadPlayerActions(userId, token) {
  if (!els.actionSection || !els.actionsBody) {
    return;
  }
  els.actionSection.style.display = "block";
  els.actionsBody.innerHTML = `
    <tr>
      <td class="alt1" colspan="5" align="center">Loading private history…</td>
    </tr>
  `;

  const actionsRef = collection(db, "games", gameId, "actions");
  let snapshot;
  try {
    snapshot = await getDocs(query(actionsRef, where("playerId", "==", userId)));
  } catch (error) {
    if (token !== loadToken) return;
    console.error("Failed to load private history", error);
    if (error?.code === "permission-denied") {
      els.actionSection.style.display = "none";
      renderStatus("You do not have permission to view your recorded actions.", "warning");
      return;
    }
    els.actionsBody.innerHTML = `
      <tr>
        <td class="alt1" colspan="5" align="center">Unable to load private history.</td>
      </tr>
    `;
    return;
  }

  if (token !== loadToken) return;

  const records = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  if (!records.length) {
    els.actionsBody.innerHTML = `
      <tr>
        <td class="alt1" colspan="5" align="center"><i>No private history recorded yet.</i></td>
      </tr>
    `;
    return;
  }

  records.sort((a, b) => {
    const dayA = Number.isFinite(a.day) ? a.day : parseInt(a.day, 10) || 0;
    const dayB = Number.isFinite(b.day) ? b.day : parseInt(b.day, 10) || 0;
    if (dayA !== dayB) {
      return dayA - dayB;
    }
    return toMillis(a.createdAt || a.updatedAt) - toMillis(b.createdAt || b.updatedAt);
  });

  els.actionsBody.innerHTML = "";
  let alt = false;
  records.forEach((record) => {
    els.actionsBody.appendChild(renderActionRow(record, alt));
    alt = !alt;
  });
}

function renderActionRow(action, alt) {
  const tr = document.createElement("tr");
  tr.setAttribute("align", "center");

  const dayCell = document.createElement("td");
  dayCell.className = alt ? "alt2" : "alt1";
  dayCell.textContent = formatActionDay(action);
  tr.appendChild(dayCell);

  const actionCell = document.createElement("td");
  actionCell.className = alt ? "alt1" : "alt2";
  actionCell.setAttribute("align", "left");
  actionCell.textContent = formatActionName(action);
  tr.appendChild(actionCell);

  const targetCell = document.createElement("td");
  targetCell.className = alt ? "alt2" : "alt1";
  targetCell.setAttribute("align", "left");
  targetCell.innerHTML = formatActionTarget(action);
  tr.appendChild(targetCell);

  const statusCell = document.createElement("td");
  statusCell.className = alt ? "alt1" : "alt2";
  statusCell.textContent = formatActionStatus(action);
  tr.appendChild(statusCell);

  const loggedCell = document.createElement("td");
  loggedCell.className = alt ? "alt2" : "alt1";
  loggedCell.textContent = formatActionLogged(action);
  tr.appendChild(loggedCell);

  return tr;
}

function formatActionDay(action = {}) {
  const day = action.day;
  if (Number.isFinite(day)) {
    return day;
  }
  if (typeof day === "string" && day.trim()) {
    return day.trim();
  }
  return "—";
}

function formatActionName(action = {}) {
  const value = getFirstStringValue(action, [
    "actionName",
    "action",
    "category",
    "type",
    "label",
  ]);
  return value || "—";
}

function formatActionTarget(action = {}) {
  const primary =
    getFirstStringValue(action, ["targetName", "target", "targetDisplayName"]) ||
    getFirstStringValue(action, ["targetPlayerName"]);
  const fallback = getFirstStringValue(action, ["targetPlayerId"]);
  const base = primary || fallback || "—";
  const note = getFirstStringValue(action, ["notes", "detail", "details", "extraNotes"]);
  const pieces = [`<div>${escapeHtml(base)}</div>`];
  if (note) {
    pieces.push(`<div class="smallfont">${escapeHtml(note)}</div>`);
  }
  return pieces.join("");
}

function formatActionStatus(action = {}) {
  const explicit = getFirstStringValue(action, [
    "statusText",
    "status",
    "resultText",
    "result",
    "outcome",
    "resolution",
    "resolutionText",
  ]);
  if (explicit) {
    return explicit;
  }
  if (action.valid === false) {
    return "Invalidated";
  }
  if (action.pending === true) {
    return "Pending";
  }
  if (typeof action.success === "boolean") {
    return action.success ? "Success" : "Failed";
  }
  return "Recorded";
}

function formatActionLogged(action = {}) {
  return formatDate(action.updatedAt || action.createdAt || "");
}

function getAssignedRoleName(player) {
  if (!player || typeof player !== "object") {
    return "";
  }
  const fields = ["role", "rolename", "roleName"];
  for (const field of fields) {
    const raw = player[field];
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }
  return "";
}

function getAssignedRoleDescription(player) {
  if (!player || typeof player !== "object") {
    return "";
  }
  const fields = [
    "description",
    "roleDescription",
    "roleText",
    "roleDetails",
    "roleDescriptionText",
  ];
  for (const field of fields) {
    const raw = player[field];
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }
  return "";
}

function getFirstStringValue(source, keys = []) {
  if (!source || typeof source !== "object") {
    return "";
  }
  for (const key of keys) {
    if (!key) continue;
    const value = source[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }
  return "";
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

function formatDate(value) {
  if (!value) {
    return "";
  }
  if (typeof value.toDate === "function") {
    const date = value.toDate();
    return date instanceof Date ? date.toLocaleString() : "";
  }
  if (value instanceof Date) {
    return value.toLocaleString();
  }
  return String(value);
}

function toMillis(value) {
  if (!value) {
    return 0;
  }
  if (typeof value.toMillis === "function") {
    try {
      return value.toMillis();
    } catch {}
  }
  if (typeof value.toDate === "function") {
    const date = value.toDate();
    if (date instanceof Date) {
      return date.getTime();
    }
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function renderStatus(message, type = "info") {
  if (!els.status) {
    return;
  }
  if (!message) {
    els.status.style.display = "none";
    els.status.textContent = "";
    return;
  }
  els.status.style.display = "block";
  els.status.textContent = message;
  let color = "#F9A906";
  if (type === "error") {
    color = "#ff7676";
  } else if (type === "success") {
    color = "#6ee7b7";
  }
  els.status.style.color = color;
}
