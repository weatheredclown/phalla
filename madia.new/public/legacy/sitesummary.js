import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { auth, db, ensureUserDocument, missingConfig } from "./firebase.js";

const summaryContent = document.getElementById("summaryContent");
const signInButton = document.getElementById("signIn");
const signOutButton = document.getElementById("signOut");
const profileLink = document.getElementById("profileLink");
const signUpLink = document.getElementById("signUpLink");

if (missingConfig) {
  renderConfigWarning();
} else {
  renderInfo("Sign in to view site summary.");
}

signInButton?.addEventListener("click", () => {
  const redirect = encodeURIComponent(
    `${location.pathname}${location.search}${location.hash}`
  );
  location.href = `/legacy/login.html?redirect=${redirect}`;
});

signUpLink?.addEventListener("click", (event) => {
  event.preventDefault();
  const redirect = encodeURIComponent(
    `${location.pathname}${location.search}${location.hash}`
  );
  location.href = `/legacy/login.html?redirect=${redirect}#signup`;
});

signOutButton?.addEventListener("click", async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, async (user) => {
  if (signInButton) signInButton.style.display = user ? "none" : "inline-block";
  if (signOutButton) signOutButton.style.display = user ? "inline-block" : "none";
  if (profileLink) {
    profileLink.style.display = user ? "inline-block" : "none";
    if (user) {
      profileLink.href = `/legacy/member.html?u=${encodeURIComponent(user.uid)}`;
      await ensureUserDocument(user);
    }
  }
  if (signUpLink) {
    signUpLink.style.display = user ? "none" : "inline";
  }

  if (missingConfig) {
    return;
  }

  if (!user) {
    renderInfo("Sign in to view site summary.");
    return;
  }

  try {
    renderInfo("Loading summary...");
    await loadSummary();
  } catch (error) {
    console.error("Failed to load summary", error);
    renderError(error);
  }
});

function renderConfigWarning() {
  summaryContent.innerHTML = `
    <div class="smallfont" style="color:#F9A906;">
      Firebase configuration required. Update <code>public/legacy/firebase.js</code> to load site metrics.
    </div>
  `;
}

function renderInfo(message) {
  summaryContent.innerHTML = `
    <div class="smallfont" style="color:#F9A906;">${message}</div>
  `;
}

function renderError(error) {
  const message =
    error?.code === "permission-denied"
      ? "You do not have permission to view this summary."
      : error?.message || "An unknown error occurred.";
  summaryContent.innerHTML = `
    <div class="smallfont" style="color:#F9A906;">Failed to load summary: ${message}</div>
  `;
}

async function loadSummary() {
  summaryContent.innerHTML = "";
  const sections = [
    {
      title: "Lastest Posts",
      headers: ["Username", "Game", "Post Title", "Excerpt"],
      rows: await fetchLatestPosts(),
    },
    {
      title: "Lastest New Players",
      headers: ["Player Id", "Username", "Game", "Joined"],
      rows: await fetchLatestPlayers(),
    },
    {
      title: "Lastest Users",
      headers: ["User Id", "Username", "Joined"],
      rows: await fetchLatestUsers(),
    },
  ];

  for (const section of sections) {
    summaryContent.appendChild(renderSection(section));
  }
}

function renderSection({ title, headers, rows }) {
  const wrapper = document.createElement("div");
  wrapper.style.marginBottom = "24px";

  const heading = document.createElement("h2");
  heading.textContent = title;
  heading.style.color = "black";
  wrapper.appendChild(heading);

  const table = document.createElement("table");
  table.setAttribute("bgcolor", "#DDDDDD");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";

  const theadRow = document.createElement("tr");
  for (const header of headers) {
    const th = document.createElement("th");
    th.textContent = header;
    th.style.textAlign = "left";
    th.setAttribute("bgcolor", "#99AADD");
    theadRow.appendChild(th);
  }
  table.appendChild(theadRow);

  let alt = 1;
  if (!rows.length) {
    const td = document.createElement("td");
    td.colSpan = headers.length;
    td.textContent = "No data";
    td.style.padding = "6px";
    table.appendChild(createRow([td], "#DDDD"));
  } else {
    for (const row of rows) {
      alt *= -1;
      const base = alt === 1 ? "#DDDD" : "#BBBB";
      const cells = row.map((value, idx) => {
        const td = document.createElement("td");
        td.textContent = value ?? "";
        const shade = idx % 2 === 0 ? `${base}AA` : `${base}BB`;
        td.setAttribute("bgcolor", shade);
        td.style.padding = "4px";
        td.style.verticalAlign = "top";
        return td;
      });
      table.appendChild(createRow(cells));
    }
  }

  wrapper.appendChild(table);
  const hr = document.createElement("hr");
  wrapper.appendChild(hr);
  return wrapper;
}

function createRow(cells, color) {
  const tr = document.createElement("tr");
  if (color) {
    tr.setAttribute("bgcolor", color);
  }
  for (const cell of cells) {
    tr.appendChild(cell);
  }
  return tr;
}

async function fetchLatestPosts() {
  const rows = [];
  const gameCache = new Map();
  const postsQuery = query(
    collectionGroup(db, "posts"),
    orderBy("createdAt", "desc"),
    limit(5)
  );
  const postsSnap = await getDocs(postsQuery);
  for (const snap of postsSnap.docs) {
    const data = snap.data();
    const pathParts = snap.ref.path.split("/");
    const gameId = pathParts.length > 1 ? pathParts[1] : null;
    let gameName = "";
    if (gameId) {
      if (!gameCache.has(gameId)) {
        try {
          const gameSnap = await getDoc(doc(db, "games", gameId));
          gameCache.set(gameId, gameSnap.exists() ? gameSnap.data().gamename || "" : "");
        } catch (err) {
          gameCache.set(gameId, "");
          console.warn("Failed to load game name", err);
        }
      }
      gameName = gameCache.get(gameId) || "";
    }
    rows.push([
      data.authorName || "Unknown",
      gameName || gameId || "",
      data.title || "(no title)",
      truncate(stripHtml(data.body || ""), 80),
    ]);
  }
  return rows;
}

async function fetchLatestPlayers() {
  const rows = [];
  const gameCache = new Map();
  const playerSnaps = await getDocs(collectionGroup(db, "players"));
  const docs = playerSnaps.docs
    .map((snap) => ({
      id: snap.id,
      path: snap.ref.path,
      data: snap.data(),
    }))
    .sort((a, b) => coerceMillis(b.data) - coerceMillis(a.data))
    .slice(0, 5);

  for (const entry of docs) {
    const pathParts = entry.path.split("/");
    const gameId = pathParts.length > 1 ? pathParts[1] : null;
    let gameName = "";
    if (gameId) {
      if (!gameCache.has(gameId)) {
        try {
          const gameSnap = await getDoc(doc(db, "games", gameId));
          gameCache.set(gameId, gameSnap.exists() ? gameSnap.data().gamename || "" : "");
        } catch (err) {
          gameCache.set(gameId, "");
        }
      }
      gameName = gameCache.get(gameId) || "";
    }
    rows.push([
      entry.id,
      entry.data.name || entry.data.username || "Unknown",
      gameName || gameId || "",
      formatDate(entry.data.joinedAt || entry.data.createdAt || null),
    ]);
  }
  return rows;
}

async function fetchLatestUsers() {
  const rows = [];
  const usersSnap = await getDocs(collection(db, "users"));
  const docs = usersSnap.docs
    .map((snap) => ({ id: snap.id, data: snap.data() }))
    .sort((a, b) => coerceMillis(b.data) - coerceMillis(a.data))
    .slice(0, 5);

  for (const entry of docs) {
    rows.push([
      entry.id,
      entry.data.displayName || entry.data.username || "Unknown",
      formatDate(entry.data.createdAt || entry.data.joinedAt || null),
    ]);
  }
  return rows;
}

function stripHtml(value) {
  const tmp = document.createElement("div");
  tmp.innerHTML = value;
  return tmp.textContent || tmp.innerText || "";
}

function truncate(value, length) {
  if (!value) return "";
  return value.length > length ? `${value.slice(0, length)}...` : value;
}

function coerceMillis(data) {
  const value = data?.joinedAt || data?.createdAt || data?.updatedAt || null;
  if (!value) return 0;
  if (typeof value.toDate === "function") {
    return value.toDate().getTime();
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === "number") {
    return value;
  }
  return 0;
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
