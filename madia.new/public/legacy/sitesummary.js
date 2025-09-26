import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { auth, db, ensureUserDocument, missingConfig } from "./firebase.js";
import { initLegacyHeader } from "./header.js";

const summaryContent = document.getElementById("summaryContent");
const header = initLegacyHeader();

if (missingConfig) {
  renderConfigWarning();
} else {
  renderInfo("Sign in to view site summary.");
}

onAuthStateChanged(auth, async (user) => {
  header?.setUser(user);

  if (missingConfig) {
    return;
  }

  if (!user) {
    renderInfo("Sign in to view site summary.");
    return;
  }

  try {
    await ensureUserDocument(user);
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
  const posts = [];
  let gamesSnap;
  try {
    gamesSnap = await getDocs(collection(db, "games"));
  } catch (error) {
    console.warn("Failed to load games for post summary", error);
    return rows;
  }

  await Promise.all(
    gamesSnap.docs.map(async (gameDoc) => {
      const gameData = gameDoc.data();
      const gameName = gameData.gamename || "";
      try {
        const postsSnap = await getDocs(
          query(
            collection(gameDoc.ref, "posts"),
            orderBy("createdAt", "desc"),
            limit(5)
          )
        );
        postsSnap.forEach((postDoc) => {
          posts.push({
            gameId: gameDoc.id,
            gameName,
            data: postDoc.data(),
          });
        });
      } catch (error) {
        console.warn(`Failed to load posts for game ${gameDoc.id}`, error);
      }
    })
  );

  posts
    .sort((a, b) => coerceMillis(b.data) - coerceMillis(a.data))
    .slice(0, 5)
    .forEach((entry) => {
      rows.push([
        entry.data.authorName || "Unknown",
        entry.gameName || entry.gameId || "",
        entry.data.title || "(no title)",
        truncate(stripHtml(entry.data.body || ""), 80),
      ]);
    });

  return rows;
}

async function fetchLatestPlayers() {
  const rows = [];
  const players = [];
  let gamesSnap;
  try {
    gamesSnap = await getDocs(collection(db, "games"));
  } catch (error) {
    console.warn("Failed to load games for player summary", error);
    return rows;
  }

  await Promise.all(
    gamesSnap.docs.map(async (gameDoc) => {
      const gameData = gameDoc.data();
      const gameName = gameData.gamename || "";
      const playersCol = collection(gameDoc.ref, "players");
      let snap;
      try {
        snap = await getDocs(
          query(playersCol, orderBy("joinedAt", "desc"), limit(10))
        );
      } catch (error) {
        console.warn(
          `Falling back to unordered players for game ${gameDoc.id}`,
          error
        );
        try {
          snap = await getDocs(playersCol);
        } catch (innerError) {
          console.warn(`Failed to load players for game ${gameDoc.id}`, innerError);
          return;
        }
      }

      snap.forEach((playerDoc) => {
        players.push({
          id: playerDoc.id,
          gameId: gameDoc.id,
          gameName,
          data: playerDoc.data(),
        });
      });
    })
  );

  players
    .sort((a, b) => {
      const diff = coerceMillis(b.data) - coerceMillis(a.data);
      if (diff !== 0) return diff;
      return a.id.localeCompare(b.id);
    })
    .slice(0, 5)
    .forEach((entry) => {
      rows.push([
        entry.id,
        entry.data.name || entry.data.username || "Unknown",
        entry.gameName || entry.gameId || "",
        formatDate(entry.data.joinedAt || entry.data.createdAt || null),
      ]);
    });

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