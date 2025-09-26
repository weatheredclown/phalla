import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { auth, db, provider, missingConfig } from "./firebase.js";

const els = {
  gamesBody: document.getElementById("gamesBody"),
  signIn: document.getElementById("signIn"),
  signOut: document.getElementById("signOut"),
  profileLink: document.getElementById("profileLink"),
};

let currentUser = null;
let unsubscribeGames = null;

function showGamesMessage(message) {
  if (!els.gamesBody) return;
  els.gamesBody.innerHTML = "";
  const tr = document.createElement("tr");
  tr.className = "alt1";
  const td = document.createElement("td");
  td.colSpan = 7;
  td.style.textAlign = "center";
  td.style.padding = "12px";
  td.style.color = "#94a3b8";
  td.textContent = message;
  tr.appendChild(td);
  els.gamesBody.appendChild(tr);
}

function stopWatchingGames({ signedOut = false } = {}) {
  if (unsubscribeGames) {
    unsubscribeGames();
    unsubscribeGames = null;
  }
  if (els.gamesBody) {
    els.gamesBody.innerHTML = "";
  }
  if (signedOut) {
    showGamesMessage("Sign in to view games.");
  }
}

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  els.signIn.style.display = user ? "none" : "inline-block";
  els.signOut.style.display = user ? "inline-block" : "none";
  els.profileLink.style.display = user ? "inline-block" : "none";
  if (user) {
    els.profileLink.href = `/legacy/member.html?u=${encodeURIComponent(user.uid)}`;
  }
  if (missingConfig) {
    stopWatchingGames();
    renderConfigWarning();
    return;
  }
  if (user) {
    watchGames();
  } else {
    stopWatchingGames({ signedOut: true });
  }
});

els.signIn.addEventListener("click", async () => {
  await signInWithPopup(auth, provider);
});
els.signOut.addEventListener("click", async () => {
  await signOut(auth);
});

function sectionHeader(label) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td class="tcat" colspan="7">
      <a style="float:right" href="#top"><img src="/images/collapse_tcat.gif" alt="" border="0" /></a>
      ${label}
    </td>
  `;
  return tr;
}

function gameRow(game, meta) {
  // Determine icon and alt classes like games.asp
  const isOwner = currentUser && game.ownerUserId === currentUser.uid;
  const icon = isOwner
    ? "/images/phalla.gif"
    : game.active
    ? meta.joined ? "/images/activeplayed_game.gif" : "/images/active_game.gif"
    : meta.joined ? "/images/inactiveplayed_game.gif" : "/images/inactive_game.gif";
  const rowClass = game.day > 0 ? "alt1Active" : "alt3";

  const tr = document.createElement("tr");
  tr.setAttribute("align", "center");
  tr.innerHTML = `
    <td class="alt2"><img src="${icon}" alt="" border="0" /></td>
    <td class="${rowClass}" align="left">
      <div>
        <a href="/legacy/game.html?g=${game.id}" style="font-size:13px;"><strong>${
          game.gamename || "(no name)"
        }</strong></a>
        <span class="smallfont" style="font-size:10px">[run by <a href="#/member/${
          game.ownerUserId || "unknown"
        }">${game.ownerName || "Unknown"}</a>]</span>
      </div>
      <div class="smallfont" style="margin-left:2em;font-size:10px">${
        game.description || ""
      }</div>
    </td>
    <td class="alt2" nowrap="nowrap">
      <div class="smallfont" align="left">
        <a title="not clickable"><strong>${meta.lastPostTitle || ""}</strong></a>
      </div>
      <div style="width:260px;" class="smallfont">
        <div style="float:left;width:120px;text-align:left;">by <a href="#/member/${
          meta.lastPostUserId || "unknown"
        }" rel="nofollow">${meta.lastPostUser || ""}</a></div>
        <div style="text-align:right;" class="smallfont"><span class="time">${
          meta.lastPostTime || ""
        }</span></div>
      </div>
    </td>
    <td class="alt1">${meta.postCount ?? 0}</td>
    <td class="alt2">${meta.playerCount ?? 0}</td>
    <td class="alt1">${game.day ?? 0}</td>
    <td class="alt2">${game.open ? "Yes" : "No"}</td>
  `;
  return tr;
}

function watchGames() {
  if (unsubscribeGames) unsubscribeGames();
  showGamesMessage("Loading games…");
  const qGames = query(collection(db, "games"), orderBy("gamename"));
  unsubscribeGames = onSnapshot(
    qGames,
    async (snap) => {
      els.gamesBody.innerHTML = "";
      if (snap.empty) {
        showGamesMessage("No games available yet.");
        return;
      }
      const groups = { open: [], running: [], over: [] };
      snap.forEach((docSnap) => {
        const g = { id: docSnap.id, ...docSnap.data() };
        if (g.active && (g.day || 0) === 0) groups.open.push(g);
        else if (g.active) groups.running.push(g);
        else groups.over.push(g);
      });

      const sortByName = (a, b) =>
        String(a.gamename || "").localeCompare(String(b.gamename || ""));

      if (groups.open.length) els.gamesBody.appendChild(sectionHeader("Open"));
      for (const g of groups.open.sort(sortByName)) {
        els.gamesBody.appendChild(await decorateRow(g));
      }
      if (groups.running.length) els.gamesBody.appendChild(sectionHeader("Running"));
      for (const g of groups.running.sort(sortByName)) {
        els.gamesBody.appendChild(await decorateRow(g));
      }
      if (groups.over.length) els.gamesBody.appendChild(sectionHeader("Game Over"));
      for (const g of groups.over.sort(sortByName)) {
        els.gamesBody.appendChild(await decorateRow(g));
      }
    },
    (error) => {
      console.error("Failed to watch games", error);
      if (error.code === "permission-denied") {
        showGamesMessage("You do not have permission to view games.");
        return;
      }
      showGamesMessage("Unable to load games. Please try again later.");
    }
  );
}

async function decorateRow(game) {
  // Fetch meta similar to games.asp (counts, last post)
  let playerCount = 0;
  try {
    const playersSnap = await getDocs(collection(doc(db, "games", game.id), "players"));
    playerCount = playersSnap.size;
  } catch {}

  let postCount = 0;
  let lastPost = null;
  try {
    const postsCol = collection(doc(db, "games", game.id), "posts");
    const postsSnap = await getDocs(query(postsCol, orderBy("createdAt", "desc"), limit(1)));
    const allPosts = await getDocs(postsCol);
    postCount = allPosts.size;
    postsSnap.forEach((p) => (lastPost = p.data()));
  } catch {}

  let joined = false;
  try {
    if (currentUser) {
      const pDoc = await getDoc(doc(db, "games", game.id, "players", currentUser.uid));
      joined = pDoc.exists();
    }
  } catch {}

  const meta = {
    playerCount,
    postCount,
    lastPostTitle: lastPost?.title || (lastPost?.body ? String(lastPost.body).slice(0, 15) + "..." : ""),
    lastPostUser: lastPost?.authorName || "",
    lastPostUserId: lastPost?.authorId || "",
    lastPostTime: lastPost?.createdAt?.toDate ? lastPost.createdAt.toDate().toLocaleString() : "",
    joined,
  };

  return gameRow(game, meta);
}

function renderConfigWarning() {
  const err = document.createElement("div");
  err.className = "smallfont";
  err.style.color = "#F9A906";
  err.style.padding = "12px";
  err.style.textAlign = "left";
  err.innerHTML = `
    <strong>Firebase configuration required</strong><br />
    Update <code>public/legacy/firebase.js</code> with your project's credentials to load games.
  `;
  els.gamesBody.appendChild(err);
}

if (!missingConfig) {
  watchGames();
} else {
  renderConfigWarning();
}
