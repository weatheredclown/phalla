import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { auth, db, missingConfig, provider } from "./firebase.js";
import { initLegacyHeader } from "./header.js";

const header = initLegacyHeader();

if (header?.signInButton) {
  header.signInButton.addEventListener("click", async () => {
    await signInWithPopup(auth, provider);
  });
}

if (header?.signOutLink) {
  header.signOutLink.addEventListener("click", async (event) => {
    event.preventDefault();
    await signOut(auth);
  });
}

onAuthStateChanged(auth, (user) => {
  header?.setUser(user);
});

const userRows = document.getElementById("userRows");

if (missingConfig) {
  renderConfigWarning();
} else {
  loadUsers().catch((err) => renderError(err.message));
}

function renderConfigWarning() {
  userRows.innerHTML = `
    <tr><td class="alt1" colspan="3" align="center" style="color:#F9A906;">Configure Firebase to load members.</td></tr>
  `;
}

function renderError(message) {
  userRows.innerHTML = `
    <tr><td class="alt1" colspan="3" align="center" style="color:#F9A906;">Failed to load members: ${message}</td></tr>
  `;
}

async function loadUsers() {
  userRows.innerHTML = "";
  const snapshot = await getDocs(collection(db, "users"));
  if (snapshot.empty) {
    userRows.innerHTML = '<tr><td class="alt1" colspan="3" align="center"><i>No members found.</i></td></tr>';
    return;
  }

  const docs = snapshot.docs
    .map((docSnap) => ({ id: docSnap.id, data: docSnap.data() }))
    .sort((a, b) => {
      const aName = (a.data.displayName || a.data.username || "").toLowerCase();
      const bName = (b.data.displayName || b.data.username || "").toLowerCase();
      return aName.localeCompare(bName);
    });

  docs.forEach((entry, idx) => {
    userRows.appendChild(renderRow(entry.id, entry.data, idx % 2 === 0));
  });
}

function renderRow(id, data, even) {
  const tr = document.createElement("tr");
  tr.setAttribute("align", "center");

  const nameTd = document.createElement("td");
  nameTd.className = even ? "alt1Active" : "alt1";
  nameTd.setAttribute("align", "left");
  nameTd.id = `u-${id}`;
  const displayName = data.displayName || data.username || "Unknown";
  const title = data.title || "";
  nameTd.innerHTML = `
    <a href="/legacy/member.html?u=${encodeURIComponent(id)}">${escapeHtml(displayName)}</a>
    <div class="smallfont">${escapeHtml(title)}</div>
  `;

  const dateTd = document.createElement("td");
  dateTd.className = even ? "alt2" : "alt1";
  dateTd.textContent = formatDate(data.createdAt || data.joinedAt || null);

  const avatarTd = document.createElement("td");
  avatarTd.className = even ? "alt1" : "alt2";
  avatarTd.innerHTML = renderAvatar(data);

  tr.appendChild(nameTd);
  tr.appendChild(dateTd);
  tr.appendChild(avatarTd);
  return tr;
}

function renderAvatar(data) {
  const src = data.avatar || data.photoURL || data.image || "";
  if (!src) {
    return "&nbsp;";
  }
  return `<img src="${escapeHtml(src)}" border="0" alt="avatar" hspace="4" vspace="4" />`;
}

function formatDate(value) {
  if (!value) return "";
  if (typeof value.toDate === "function") {
    return value.toDate().toLocaleString();
  }
  if (value instanceof Date) {
    return value.toLocaleString();
  }
  return "";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
