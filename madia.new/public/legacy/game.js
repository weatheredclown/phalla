import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
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
  where,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ubbToHtml } from "/legacy/ubb.js";
import { auth, db, ensureUserDocument, missingConfig } from "./firebase.js";
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
  daySummary: document.getElementById("daySummary"),
  playerTools: document.getElementById("playerTools"),
  playerToolsStatus: document.getElementById("playerToolsStatus"),
  privateActionForm: document.getElementById("privateActionForm"),
  privateActionName: document.getElementById("privateActionName"),
  privateActionTarget: document.getElementById("privateActionTarget"),
  privateActionDay: document.getElementById("privateActionDay"),
  voteRecordForm: document.getElementById("voteRecordForm"),
  voteTarget: document.getElementById("voteTarget"),
  voteDay: document.getElementById("voteDay"),
  voteNotes: document.getElementById("voteNotes"),
  playerListLink: document.getElementById("playerListLink"),
};
els.ubbButtons = document.querySelectorAll(".ubb-button[data-ubb-tag]");

let currentUser = null;
let currentGame = null;
let currentPlayer = null;

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  header?.setUser(user);
  if (user) {
    await ensureUserDocument(user);
  }
  refreshMembershipAndControls();
});

const gameId = getParam("g");
if (!gameId) {
  els.gameTitle.textContent = "Missing game id";
}

if (els.playerListLink && gameId) {
  els.playerListLink.href = `/legacy/playerlist.html?g=${encodeURIComponent(gameId)}`;
}

if (els.ubbButtons?.length) {
  els.ubbButtons.forEach((button) => {
    button.addEventListener("click", () => applyUbbTag(button.dataset.ubbTag));
  });
}

function createMetaRow(html) {
  const tr = document.createElement("tr");
  tr.setAttribute("align", "center");
  tr.innerHTML = html;
  return tr;
}

function postRow(postId, post, alt) {
  const altClass = alt ? "alt1" : "alt3";
  const altColor = alt ? "#18335E" : "#3B4970";
  const altStyle = `border-top:2px solid ${altColor};`;

  const editedMeta = [];
  if (post.updatedAt) {
    const editor = post.editedByName || "Unknown";
    editedMeta.push(`Edited by ${editor} · ${formatDate(post.updatedAt)}`);
  }

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
          }${
            editedMeta.length
              ? `<br /><span class="post-meta">${editedMeta.join(" · ")}</span>`
              : ""
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

  const canEdit =
    !!currentUser &&
    (post.authorId === currentUser.uid || currentGame?.ownerUserId === currentUser.uid);
  const canDelete =
    !!currentUser && currentGame?.ownerUserId === currentUser.uid;

  if (canEdit || canDelete) {
    const actions = document.createElement("div");
    actions.className = "post-actions";

    if (canEdit) {
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "button";
      editButton.textContent = "Edit Post";
      editButton.addEventListener("click", () => handleEditPost(postId, post));
      actions.appendChild(editButton);
    }

    if (canDelete) {
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "button";
      deleteButton.textContent = "Delete Post";
      deleteButton.addEventListener("click", () => handleDeletePost(postId));
      actions.appendChild(deleteButton);
    }

    container.appendChild(actions);
  }

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
  currentGame = { id: gameId, ...g };
  els.gameTitle.textContent = g.gamename || "(no name)";
  els.ownerControls.style.display = auth.currentUser && g.ownerUserId === auth.currentUser.uid ? "block" : "none";
  if (els.daySummary) {
    els.daySummary.style.display =
      auth.currentUser && g.ownerUserId === auth.currentUser.uid ? "inline-block" : "none";
  }
  if (els.privateActionDay) {
    els.privateActionDay.value = g.day ?? 0;
  }
  if (els.voteDay) {
    els.voteDay.value = g.day ?? 0;
  }

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
      id: p.id,
      title: data.title || "",
      body: data.body || "",
      authorName: data.authorName || "",
      authorId: data.authorId || "",
      avatar: data.avatar || "",
      createdAt: formatDate(data.createdAt),
      updatedAt: data.updatedAt || null,
      editedByName: data.editedByName || "",
      sig: data.sig || "",
    };
    els.postsContainer.appendChild(postRow(post.id, post, alt));
    alt = !alt;
  });

  await refreshMembershipAndControls();
}

loadGame().catch((e) => {
  els.gameTitle.textContent = `Error: ${e.message}`;
});

function setDisplay(el, value) {
  if (el) {
    el.style.display = value;
  }
}

async function refreshMembershipAndControls() {
  const user = auth.currentUser;
  if (!user) {
    setDisplay(els.replyForm, "none");
    setDisplay(els.joinButton, "inline-block");
    setDisplay(els.leaveButton, "none");
    setDisplay(els.playerTools, "none");
    setPlayerToolsStatus("");
    currentPlayer = null;
    return;
  }
  try {
    const p = await getDoc(doc(db, "games", gameId, "players", user.uid));
    const joined = p.exists();
    setDisplay(els.replyForm, joined ? "block" : "none");
    setDisplay(els.joinButton, joined ? "none" : "inline-block");
    setDisplay(els.leaveButton, joined ? "inline-block" : "none");
    currentPlayer = joined ? { id: p.id, ...p.data() } : null;
    const ownerView = currentGame && currentGame.ownerUserId === user.uid;
    setDisplay(els.playerTools, joined || ownerView ? "block" : "none");
  } catch {}
}

els.joinButton?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) {
    header?.openAuthPanel("login");
    return;
  }
  await setDoc(doc(db, "games", gameId, "players", user.uid), { uid: user.uid, name: user.displayName || "" });
  await refreshMembershipAndControls();
});

els.leaveButton?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) {
    header?.openAuthPanel("login");
    return;
  }
  // Delete player doc keyed by uid
  await deleteDoc(doc(db, "games", gameId, "players", user.uid));
  await refreshMembershipAndControls();
});

els.postReply.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) {
    header?.openAuthPanel("login");
    return;
  }
  const isOwner = currentGame?.ownerUserId === user.uid;
  if (!isOwner && currentPlayer && typeof currentPlayer.postsLeft === "number") {
    if (currentPlayer.postsLeft <= 0) {
      alert("You have no posts remaining for today.");
      return;
    }
  }
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
  if (!isOwner && currentPlayer && typeof currentPlayer.postsLeft === "number") {
    if (currentPlayer.postsLeft === 1) {
      try {
        await updateDoc(doc(db, "games", gameId, "players", user.uid), { postsLeft: 0 });
        currentPlayer.postsLeft = 0;
      } catch (error) {
        console.warn("Failed to update postsLeft", error);
      }
    }
  }
  await loadGame();
});

// Owner controls
els.toggleOpen.addEventListener("click", async () => ownerUpdate({ toggle: "open" }));
els.toggleActive.addEventListener("click", async () => ownerUpdate({ toggle: "active" }));
els.nextDay.addEventListener("click", async () => ownerUpdate({ nextDay: true }));
els.daySummary?.addEventListener("click", () => {
  if (!gameId) return;
  window.location.href = `/legacy/daysummary.html?g=${encodeURIComponent(gameId)}`;
});

els.privateActionForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) {
    header?.openAuthPanel("login");
    return;
  }
  const actionName = (els.privateActionName?.value || "").trim();
  const targetName = (els.privateActionTarget?.value || "").trim();
  const day = parseDayInput(els.privateActionDay);
  if (!actionName) {
    setPlayerToolsStatus("Enter an action name to record.", "error");
    return;
  }
  try {
    await recordAction({
      category: "private",
      actionName,
      targetName,
      day,
    });
    setPlayerToolsStatus("Private action recorded.", "success");
    if (els.privateActionTarget) {
      els.privateActionTarget.value = "";
    }
  } catch (error) {
    console.error("Failed to record action", error);
    setPlayerToolsStatus("Unable to record action.", "error");
  }
});

els.voteRecordForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) {
    header?.openAuthPanel("login");
    return;
  }
  const targetName = (els.voteTarget?.value || "").trim();
  const notes = (els.voteNotes?.value || "").trim();
  const day = parseDayInput(els.voteDay);
  if (!targetName) {
    setPlayerToolsStatus("Enter a vote target first.", "error");
    return;
  }
  try {
    await recordAction({
      category: "vote",
      actionName: "Vote",
      targetName,
      notes,
      day,
    });
    setPlayerToolsStatus("Vote recorded.", "success");
    if (els.voteTarget) {
      els.voteTarget.value = "";
    }
    if (els.voteNotes) {
      els.voteNotes.value = "";
    }
  } catch (error) {
    console.error("Failed to record vote", error);
    setPlayerToolsStatus("Unable to record vote.", "error");
  }
});

async function ownerUpdate(action) {
  const user = auth.currentUser;
  if (!user) {
    header?.openAuthPanel("login");
    return;
  }
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

function applyUbbTag(tag) {
  if (!tag || !els.replyBody) {
    return;
  }

  const textarea = els.replyBody;
  const value = textarea.value || "";
  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? 0;
  const openTag = `[${tag}]`;
  const closeTag = `[/${tag}]`;
  const before = value.slice(0, start);
  const selected = value.slice(start, end);
  const after = value.slice(end);
  const scrollTop = textarea.scrollTop;

  textarea.value = `${before}${openTag}${selected}${closeTag}${after}`;
  textarea.focus();

  const newSelectionStart = start + openTag.length;
  const selectionLength = selected.length;
  const newSelectionEnd = selectionLength ? newSelectionStart + selectionLength : newSelectionStart;

  textarea.setSelectionRange(newSelectionStart, newSelectionEnd);
  textarea.scrollTop = scrollTop;
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

function parseDayInput(input) {
  if (!input) {
    return currentGame?.day ?? 0;
  }
  const value = parseInt(input.value, 10);
  if (Number.isFinite(value) && value >= 0) {
    return value;
  }
  return currentGame?.day ?? 0;
}

function setPlayerToolsStatus(message, type = "info") {
  const el = els.playerToolsStatus;
  if (!el) return;
  if (!message) {
    el.style.display = "none";
    el.textContent = "";
    return;
  }
  el.style.display = "block";
  el.textContent = message;
  el.style.color = type === "error" ? "#ff7676" : type === "success" ? "#6ee7b7" : "#F9A906";
}

async function recordAction({ category, actionName, targetName, notes = "", day }) {
  if (!currentUser) {
    throw new Error("Not signed in");
  }
  const gameRef = doc(db, "games", gameId);
  const actionsRef = collection(gameRef, "actions");
  const existing = await getDocs(query(actionsRef, where("playerId", "==", currentUser.uid)));
  const invalidations = existing.docs
    .filter((docSnap) => {
      const data = docSnap.data();
      if ((data.category || "") !== category) return false;
      const dataDay = data.day ?? 0;
      if (dataDay !== day) return false;
      if (category === "private" && (data.actionName || "") !== actionName) {
        return false;
      }
      return data.valid !== false;
    })
    .map((docSnap) =>
      updateDoc(docSnap.ref, {
        valid: false,
        updatedAt: serverTimestamp(),
      }).catch((error) => {
        console.warn("Failed to invalidate action", docSnap.id, error);
      })
    );
  await Promise.all(invalidations);
  await addDoc(actionsRef, {
    playerId: currentUser.uid,
    username: currentUser.displayName || "Unknown",
    actionName,
    targetName,
    notes,
    day,
    category,
    valid: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

async function handleEditPost(postId, post) {
  if (!currentUser) {
    header?.openAuthPanel("login");
    return;
  }
  if (!currentGame || !postId) {
    return;
  }
  const allowEdit =
    post.authorId === currentUser.uid || currentGame.ownerUserId === currentUser.uid;
  if (!allowEdit) {
    alert("You do not have permission to edit this post.");
    return;
  }
  const newTitle = prompt("Edit post title", post.title || "");
  if (newTitle === null) {
    return;
  }
  const newBody = prompt("Edit post body (UBB)", post.body || "");
  if (newBody === null) {
    return;
  }
  const trimmedTitle = newTitle.trim();
  const trimmedBody = newBody.trim();
  if (!trimmedBody) {
    alert("Post body cannot be empty.");
    return;
  }
  try {
    await updateDoc(doc(db, "games", gameId, "posts", postId), {
      title: trimmedTitle,
      body: trimmedBody,
      updatedAt: serverTimestamp(),
      editedBy: currentUser.uid,
      editedByName: currentUser.displayName || "Unknown",
    });
    await loadGame();
  } catch (error) {
    console.error("Failed to edit post", error);
    alert("Unable to save changes. Try again later.");
  }
}

async function handleDeletePost(postId) {
  if (!currentUser) {
    header?.openAuthPanel("login");
    return;
  }
  if (!currentGame || currentGame.ownerUserId !== currentUser.uid) {
    alert("Only the game owner can delete posts.");
    return;
  }
  if (!confirm("Delete this post? This cannot be undone.")) {
    return;
  }
  try {
    await deleteDoc(doc(db, "games", gameId, "posts", postId));
    await loadGame();
  } catch (error) {
    console.error("Failed to delete post", error);
    alert("Unable to delete post. Try again later.");
  }
}
