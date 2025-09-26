import {
  collection,
  doc,
  getDoc,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db, missingConfig } from "./firebase.js";

const playerRows = document.getElementById("playerRows");
const gameBreadcrumb = document.getElementById("gameBreadcrumb");

const params = new URLSearchParams(location.search);
const gameId = params.get("g");

if (!gameId) {
  playerRows.innerHTML = '<tr><td class="alt1" colspan="3" align="center">Missing game id.</td></tr>';
} else if (missingConfig) {
  renderConfigWarning();
} else {
  loadPlayers().catch((err) => renderError(err.message));
}

function renderConfigWarning() {
  playerRows.innerHTML = `
    <tr><td class="alt1" colspan="3" align="center" style="color:#F9A906;">Configure Firebase to load players.</td></tr>
  `;
}

function renderError(message) {
  playerRows.innerHTML = `
    <tr><td class="alt1" colspan="3" align="center" style="color:#F9A906;">Failed to load players: ${message}</td></tr>
  `;
}

async function loadPlayers() {
  playerRows.innerHTML = "";
  const gameRef = doc(db, "games", gameId);
  const gameSnap = await getDoc(gameRef);
  if (gameSnap.exists()) {
    const gameName = gameSnap.data().gamename || "(no name)";
    gameBreadcrumb.innerHTML = `&gt; <a href="/legacy/game.html?g=${encodeURIComponent(gameId)}">${escapeHtml(gameName)}</a>`;
  }

  const playersSnap = await getDocs(collection(gameRef, "players"));
  if (playersSnap.empty) {
    playerRows.innerHTML = '<tr><td class="alt1" colspan="3" align="center"><i>No players joined.</i></td></tr>';
    return;
  }

  const entries = playersSnap.docs
    .map((snap) => ({ id: snap.id, data: snap.data() }))
    .sort((a, b) => {
      const aName = (a.data.name || a.data.username || "").toLowerCase();
      const bName = (b.data.name || b.data.username || "").toLowerCase();
      return aName.localeCompare(bName);
    });

  entries.forEach((entry, idx) => {
    playerRows.appendChild(renderRow(entry, idx % 2 === 0));
  });
}

function renderRow(entry, even) {
  const tr = document.createElement("tr");
  tr.setAttribute("align", "center");

  const alive = playerIsAlive(entry.data);
  const iconTd = document.createElement("td");
  iconTd.className = "alt2";
  iconTd.setAttribute("align", "center");
  const icon = alive ? "phalla" : "dead_phalla";
  const iconAlt = alive ? "Active player" : "Eliminated player";
  iconTd.innerHTML = `<img src="/images/${icon}.gif" alt="${iconAlt}" border="0" />`;

  const nameTd = document.createElement("td");
  nameTd.className = even ? "alt1Active" : "alt1";
  nameTd.setAttribute("align", "left");
  nameTd.innerHTML = `${escapeHtml(entry.data.name || entry.data.username || entry.id)} <span class="smallfont" style="color:#888;">${alive ? "" : "(inactive)"}</span>`;

  const roleTd = document.createElement("td");
  roleTd.className = even ? "alt2" : "alt1";
  roleTd.setAttribute("align", "left");
  const role = entry.data.role || entry.data.rolename || "";
  roleTd.innerHTML = role ? escapeHtml(role) : "&nbsp;";

  tr.appendChild(iconTd);
  tr.appendChild(nameTd);
  tr.appendChild(roleTd);
  return tr;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Legacy Access stored the player status in the players.active column, so we
// prefer that field to mirror mafia.old/gamedisplay.asp behaviour and only fall
// back to any newer alive flags if it is missing.
function playerIsAlive(data = {}) {
  if (Object.prototype.hasOwnProperty.call(data, "active")) {
    const value = data.active;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["no", "dead", "false", "0"].includes(normalized)) {
        return false;
      }
      if (["yes", "alive", "true", "1"].includes(normalized)) {
        return true;
      }
    }
    if (typeof value === "number") {
      return value !== 0;
    }
    if (typeof value === "boolean") {
      return value;
    }
  }

  if (Object.prototype.hasOwnProperty.call(data, "alive")) {
    const value = data.alive;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["no", "dead", "false", "0"].includes(normalized)) {
        return false;
      }
      if (["yes", "alive", "true", "1"].includes(normalized)) {
        return true;
      }
    }
    if (typeof value === "number") {
      return value !== 0;
    }
    if (typeof value === "boolean") {
      return value;
    }
  }

  return true;
}
