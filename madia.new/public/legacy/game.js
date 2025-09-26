import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
  updateDoc,
  setDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ubbToHtml } from "/legacy/ubb.js";
import { auth, db, provider, missingConfig } from "./firebase.js";
import { initLegacyHeader } from "./header.js";

function getParam(name) {
  const params = new URLSearchParams(location.search);
  return params.get(name);
}

const header = initLegacyHeader();

const els = {
  gameTitle: document.getElementById("gameTitle"),
  gameMeta: document.getElementById("gameMeta"),
  postsContainer: document.getElementById("postsContainer"),
  replyForm: document.getElementById("replyForm"),
  replyTitle: document.getElementById("replyTitle"),
  replyBody: document.getElementById("replyBody"),
  postReply: document.getElementById("postReply"),
  joinButton: document.getElementById("joinButton"),
  leaveButton: document.getElementById("leaveButton"),
  ownerControls: document.getElementById("ownerControls"),
  toggleOpen: document.getElementById("toggleOpen"),
  toggleActive: document.getElementById("toggleActive"),
  nextDay: document.getElementById("nextDay"),
  playerListLink: document.getElementById("playerListLink"),
};

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
  refreshMembershipAndControls();
});

const gameId = getParam("g");
if (!gameId) {
  els.gameTitle.textContent = "Missing game id";
}

if (els.playerListLink && gameId) {
  els.playerListLink.href = `/legacy/playerlist.html?g=${encodeURIComponent(gameId)}`;
}

function createMetaRow(html) {
  const tr = document.createElement("tr");
  tr.setAttribute("align", "center");
  tr.innerHTML = html;
  return tr;
}

function postRow(post, alt) {
  const altClass = alt ? "alt1" : "alt3";
  const altColor = alt ? "#18335E" : "#3B4970";
  const altStyle = `border-top:2px solid ${altColor};`;

  const container = document.createElement("div");
  container.innerHTML = `
  <table class="tborder" cellpadding="4" cellspacing="0" border="0" width="100%" align="center" style="margin-top:-5px;">
    <tr valign="top">
      <td class="${altClass}" width="145" style="${altStyle}">
        <div style="margin:-4px 8px 8px -4px;background-color:${altColor}" class="rounded">
          <div style="padding:5px;">
            <div class="pbit">
              <div style="font-weight:bold"><a style="font-size:13px;text-decoration:none;" href="#/member/${
                post.authorId || ""
              }">${post.authorName || "Unknown"}</a></div>
            </div>
            <div class="pbit"><div class="smallfont">${post.title || ""}</div></div>
            ${post.avatar ? `<div class="pbit"><div><img src="${post.avatar}" alt="" class="avatar" border="0" /></div></div>` : "&nbsp;"}
          </div>
        </div>
      </td>
      <td class="${altClass}" style="${altStyle}">
        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td align="left">
          <div class="smallfont"><strong>${post.title || ""}</strong></div>
          <hr size="1" style="color:silver" />
        </td></tr></table>
        <div class="smallfont"><img class="inlineimg" src="/images/doc.gif" alt="Old" border="0" /> ${
          post.createdAt || ""
        }</div>
        <div style="margin:10px 3px;">
          <table cellspacing="0"><tr><td><img src="/clear.gif" alt="" width="1" height="20" /></td><td class="postbody" valign="top">${
            ubbToHtml(post.body || "")
          }</td></tr></table>
        </div>

        <table width="100%" cellspacing="0"><tr>
          <td class="${altClass}" width="90%">
            ${post.sig ? `<div>__________________<br /><font size="1">${ubbToHtml(post.sig)}</font></div>` : "&nbsp;"}
          </td>
        </tr></table>
      </td>
    </tr>
  </table>`;
  return container;
}

async function loadGame() {
  if (missingConfig) {
    els.gameTitle.textContent = "Firebase configuration required";
    els.gameMeta.innerHTML = "";
    els.postsContainer.innerHTML = "";
    return;
  }
  const gameRef = doc(db, "games", gameId);
  const gSnap = await getDoc(gameRef);
  if (!gSnap.exists()) {
    els.gameTitle.textContent = "Game not found";
    return;
  }
  const g = gSnap.data();
  els.gameTitle.textContent = g.gamename || "(no name)";
  els.ownerControls.style.display = auth.currentUser && g.ownerUserId === auth.currentUser.uid ? "block" : "none";

  // Meta row (last post, players, day, open)
  let playerCount = 0;
  try {
    const playersSnap = await getDocs(collection(gameRef, "players"));
    playerCount = playersSnap.size;
  } catch {}

  let lastPost = null;
  try {
    const postsSnap = await getDocs(query(collection(gameRef, "posts"), orderBy("createdAt", "desc")));
    postsSnap.forEach((d) => {
      if (!lastPost) lastPost = d.data();
    });
  } catch {}

  const lastTitle = lastPost?.title || (lastPost?.body ? String(lastPost.body).slice(0, 15) + "..." : "");
  const lastUser = lastPost?.authorName || "";
  const lastTime = lastPost?.createdAt?.toDate ? lastPost.createdAt.toDate().toLocaleString() : "";

  els.gameMeta.innerHTML = "";
  els.gameMeta.appendChild(
    createMetaRow(`
      <td class="alt2">&nbsp;</td>
      <td class="alt2" nowrap="nowrap">
        <div class="smallfont" align="left"><a title="not clickable"><strong>${lastTitle}</strong></a></div>
        <div style="width:260px;" class="smallfont">
          <div style="float:left;width:120px;text-align:left;">by <a href="#/member">${lastUser}</a></div>
          <div style="text-align:right;" class="smallfont"><span class="time">${lastTime}</span></div>
        </div>
      </td>
      <td class="alt2">${playerCount}</td>
      <td class="alt1">${g.day ?? 0}</td>
      <td class="alt2">${g.open ? "Yes" : "No"}</td>
    `)
  );

  // Posts list (ascending)
  els.postsContainer.innerHTML = "";
  const posts = await getDocs(query(collection(gameRef, "posts"), orderBy("createdAt", "asc")));
  let alt = false;
  posts.forEach((p) => {
    const data = p.data();
    const post = {
      title: data.title || "",
      body: data.body || "",
      authorName: data.authorName || "",
      authorId: data.authorId || "",
      avatar: data.avatar || "",
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleString() : "",
      sig: data.sig || "",
    };
    els.postsContainer.appendChild(postRow(post, alt));
    alt = !alt;
  });
}

loadGame().catch((e) => {
  els.gameTitle.textContent = `Error: ${e.message}`;
});

async function refreshMembershipAndControls() {
  const user = auth.currentUser;
  if (!user) {
    els.replyForm.style.display = "none";
    els.joinButton.style.display = "inline-block";
    els.leaveButton.style.display = "none";
    return;
  }
  try {
    const p = await getDoc(doc(db, "games", gameId, "players", user.uid));
    const joined = p.exists();
    els.replyForm.style.display = joined ? "block" : "none";
    els.joinButton.style.display = joined ? "none" : "inline-block";
    els.leaveButton.style.display = joined ? "inline-block" : "none";
  } catch {}
}

els.joinButton.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;
  await setDoc(doc(db, "games", gameId, "players", user.uid), { uid: user.uid, name: user.displayName || "" });
  await refreshMembershipAndControls();
});

els.leaveButton.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;
  // Delete player doc keyed by uid
  await deleteDoc(doc(db, "games", gameId, "players", user.uid));
  await refreshMembershipAndControls();
});

els.postReply.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;
  const title = (els.replyTitle.value || "").trim();
  const body = (els.replyBody.value || "").trim();
  if (!body) return;
  await addDoc(collection(doc(db, "games", gameId), "posts"), {
    title,
    body, // store as UBB; render via ubbToHtml
    authorId: user.uid,
    authorName: user.displayName || "Unknown",
    createdAt: serverTimestamp(),
  });
  els.replyTitle.value = "";
  els.replyBody.value = "";
  await loadGame();
});

// Owner controls
els.toggleOpen.addEventListener("click", async () => ownerUpdate({ toggle: "open" }));
els.toggleActive.addEventListener("click", async () => ownerUpdate({ toggle: "active" }));
els.nextDay.addEventListener("click", async () => ownerUpdate({ nextDay: true }));

async function ownerUpdate(action) {
  const user = auth.currentUser;
  if (!user) return;
  const ref = doc(db, "games", gameId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const g = snap.data();
  if (g.ownerUserId !== user.uid) return;
  const patch = {};
  if (action.toggle === "open") patch.open = !g.open;
  if (action.toggle === "active") patch.active = !g.active;
  if (action.nextDay) patch.day = (g.day || 0) + 1;
  await updateDoc(ref, patch);
  await loadGame();
}
