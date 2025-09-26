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
  deleteField,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ubbToHtml } from "/legacy/ubb.js";
import { auth, db, ensureUserDocument, missingConfig } from "./firebase.js";
import { initLegacyHeader } from "./header.js";

function getParam(name) {
  const params = new URLSearchParams(location.search);
  return params.get(name);
}

const header = initLegacyHeader();


const CUSTOM_ROLE_OPTION_VALUE = "__custom-role__";
const CUSTOM_ACTION_OPTION_VALUE = "__custom-action__";
const CUSTOM_TARGET_OPTION_VALUE = "__custom-target__";

const ACTION_LIMIT_ERROR_CODE = "action-limit-exceeded";
const ACTION_RULE_KEYS = [
  "actionRules",
  "actionLimits",
  "privateActions",
  "privateActionRules",
  "specialActions",
  "actions",
  "abilities",
  "abilityRules",
  "playerActions",
  "privateActionLimit",
  "privateActionLimitMap",
  "privateActionLimits",
];


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
  privateActionNameCustom: document.getElementById("privateActionNameCustom"),
  privateActionTarget: document.getElementById("privateActionTarget"),
  privateActionTargetCustom: document.getElementById("privateActionTargetCustom"),
  privateActionDay: document.getElementById("privateActionDay"),
  voteRecordForm: document.getElementById("voteRecordForm"),
  voteTarget: document.getElementById("voteTarget"),
  voteDay: document.getElementById("voteDay"),
  voteNotes: document.getElementById("voteNotes"),
  claimRecordForm: document.getElementById("claimRecordForm"),
  claimRole: document.getElementById("claimRole"),
  claimDay: document.getElementById("claimDay"),
  notebookRecordForm: document.getElementById("notebookRecordForm"),
  notebookTarget: document.getElementById("notebookTarget"),
  notebookDay: document.getElementById("notebookDay"),
  notebookNotes: document.getElementById("notebookNotes"),
  moderatorPanel: document.getElementById("moderatorPanel"),
  moderatorStatus: document.getElementById("moderatorStatus"),
  moderatorRows: document.getElementById("moderatorRows"),
  playerListLink: document.getElementById("playerListLink"),
};
els.ubbButtons = document.querySelectorAll(".ubb-button[data-ubb-tag]");

let currentUser = null;
let currentGame = null;
let currentPlayer = null;
let gamePlayers = [];
let isOwnerView = false;
let availableRoles = [];
let rolesLoadPromise = null;

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  header?.setUser(user);
  if (user) {
    await ensureUserDocument(user);
  }
  await refreshMembershipAndControls();
  if (!missingConfig && gameId) {
    loadGame().catch((error) => {
      console.warn("Failed to refresh game after auth change", error);
    });
  }
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

if (els.privateActionName) {
  els.privateActionName.addEventListener("change", handlePrivateActionNameChange);
}

if (els.privateActionTarget) {
  els.privateActionTarget.addEventListener("change", handlePrivateActionTargetChange);
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
              <div style="font-weight:bold"><a style="font-size:13px;text-decoration:none;" href="#" data-author-link="true">${post.authorName || "Unknown"}</a></div>
            </div>
            <div class="pbit"><div class="smallfont">${post.title || ""}</div></div>
            ${post.avatar ? `<div class="pbit"><div><img data-avatar="true" alt="" class="avatar" border="0" /></div></div>` : "&nbsp;"}
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

  const authorLink = container.querySelector("[data-author-link]");
  if (authorLink) {
    authorLink.setAttribute(
      "href",
      `/legacy/member.html?u=${encodeURIComponent(post.authorId || "")}`
    );
  }
  const avatarImg = container.querySelector("img[data-avatar]");
  if (avatarImg && post.avatar) {
    avatarImg.src = post.avatar;
  }

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
  isOwnerView = !!(auth.currentUser && g.ownerUserId === auth.currentUser.uid);
  els.gameTitle.textContent = g.gamename || "(no name)";
  els.ownerControls.style.display = isOwnerView ? "block" : "none";
  if (els.daySummary) {
    els.daySummary.style.display = isOwnerView ? "inline-block" : "none";
  }
  if (els.privateActionDay) {
    els.privateActionDay.value = g.day ?? 0;
  }
  if (els.voteDay) {
    els.voteDay.value = g.day ?? 0;
  }
  if (els.claimDay) {
    els.claimDay.value = g.day ?? 0;
  }
  if (els.notebookDay) {
    els.notebookDay.value = g.day ?? 0;
  }

  // Meta row (last post, players, day, open)
  try {
    const playersSnap = await getDocs(collection(gameRef, "players"));
    gamePlayers = playersSnap.docs
      .map((docSnap) => {
        const data = docSnap.data() || {};
        const name = data.name || data.username || data.displayName || docSnap.id;
        return { id: docSnap.id, name, data };
      })
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  } catch (error) {
    console.warn("Failed to load players", error);
    gamePlayers = [];
  }
  const playerCount = gamePlayers.length;
  await ensureRolesLoaded();
  populatePlayerSelects();
  populatePrivateActionOptions();
  renderModeratorPanel();

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
  const postsSnap = await getDocs(
    query(collection(gameRef, "posts"), orderBy("createdAt", "asc"))
  );
  const postEntries = [];
  const authorIds = new Set();
  postsSnap.forEach((p) => {
    const data = p.data();
    postEntries.push({ id: p.id, data });
    if (data.authorId) {
      authorIds.add(data.authorId);
    }
  });

  const avatarMap = await fetchUserThumbnails(Array.from(authorIds));

  let alt = false;
  postEntries.forEach((entry) => {
    const data = entry.data;
    const post = {
      id: entry.id,
      title: data.title || "",
      body: data.body || "",
      authorName: data.authorName || "",
      authorId: data.authorId || "",
      avatar: data.avatar || avatarMap.get(data.authorId || "") || "",
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

async function fetchUserThumbnails(userIds = []) {
  const thumbnails = new Map();
  if (!userIds.length || missingConfig) {
    return thumbnails;
  }

  await Promise.all(
    userIds.map(async (uid) => {
      try {
        const snap = await getDoc(doc(db, "users", uid));
        if (!snap.exists()) {
          return;
        }
        const data = snap.data() || {};
        const avatar = data.photoURL || data.avatar || data.image || "";
        if (avatar) {
          thumbnails.set(uid, avatar);
        }
      } catch (error) {
        console.warn(`Failed to load thumbnail for ${uid}`, error);
      }
    })
  );

  return thumbnails;
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
    populatePrivateActionOptions();
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
  populatePrivateActionOptions();
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
    avatar: user.photoURL || "",
    createdAt: serverTimestamp(),
  });
  els.replyTitle.value = "";
  els.replyBody.value = "";
  if (!isOwner && currentPlayer && typeof currentPlayer.postsLeft === "number") {
    if (currentPlayer.postsLeft > 0) {
      const remaining = currentPlayer.postsLeft - 1;
      try {
        await updateDoc(doc(db, "games", gameId, "players", user.uid), { postsLeft: remaining });
        currentPlayer.postsLeft = remaining;
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
  const rawActionValue = els.privateActionName?.value || "";
  const actionName =
    rawActionValue === CUSTOM_ACTION_OPTION_VALUE
      ? (els.privateActionNameCustom?.value || "").trim()
      : (rawActionValue || "").trim();
  const targetSelectValue = els.privateActionTarget?.value || "";
  let targetPlayerId = "";
  let targetName = "";
  if (targetSelectValue === CUSTOM_TARGET_OPTION_VALUE) {
    const customTarget = (els.privateActionTargetCustom?.value || "").trim();
    if (customTarget) {
      const matchedCustom = findPlayerByName(customTarget);
      targetPlayerId = matchedCustom?.id || "";
      targetName = matchedCustom?.name || customTarget;
    }
  } else if (targetSelectValue) {
    targetPlayerId = targetSelectValue;
    const selectedOption = els.privateActionTarget?.selectedOptions?.[0];
    const optionName = selectedOption?.dataset?.playerName || selectedOption?.textContent || "";
    targetName = optionName || findPlayerById(targetPlayerId)?.name || "";
  }
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
      targetPlayerId,
      day,
    });
    setPlayerToolsStatus("Private action recorded.", "success");
    if (els.privateActionTarget) {
      els.privateActionTarget.value = "";
    }
    if (els.privateActionTargetCustom) {
      els.privateActionTargetCustom.value = "";
    }
    handlePrivateActionTargetChange();
  } catch (error) {
    if (error?.code === ACTION_LIMIT_ERROR_CODE) {
      const limit = typeof error.limit === "number" ? error.limit : null;
      const limitText =
        limit === 0
          ? `You cannot perform ${actionName || "this action"} again.`
          : limit
          ? `You may perform ${actionName || "this action"} only ${limit} time(s) per game.`
          : `You have already used ${actionName || "this action"} the maximum number of times this game.`;
      setPlayerToolsStatus(limitText, "error");
      return;
    }
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
  const targetId = (els.voteTarget?.value || "").trim();
  const target = targetId ? findPlayerById(targetId) : null;
  const targetName = target?.name || "";
  const notes = (els.voteNotes?.value || "").trim();
  const day = parseDayInput(els.voteDay);
  if (!targetId) {
    setPlayerToolsStatus("Enter a vote target first.", "error");
    return;
  }
  try {
    await recordAction({
      category: "vote",
      actionName: "Vote",
      targetName,
      targetPlayerId: targetId,
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

els.claimRecordForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) {
    header?.openAuthPanel("login");
    return;
  }
  const role = (els.claimRole?.value || "").trim();
  const day = parseDayInput(els.claimDay);
  if (!role) {
    setPlayerToolsStatus("Enter a role to claim.", "error");
    return;
  }
  try {
    await recordAction({
      category: "claim",
      actionName: "Claim",
      notes: role,
      day,
    });
    setPlayerToolsStatus("Claim recorded.", "success");
    if (els.claimRole) {
      els.claimRole.value = "";
    }
  } catch (error) {
    console.error("Failed to record claim", error);
    setPlayerToolsStatus("Unable to record claim.", "error");
  }
});

els.notebookRecordForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) {
    header?.openAuthPanel("login");
    return;
  }
  const targetId = (els.notebookTarget?.value || "").trim();
  const target = targetId ? findPlayerById(targetId) : null;
  const targetName = target?.name || "";
  const notes = (els.notebookNotes?.value || "").trim();
  const day = parseDayInput(els.notebookDay);
  if (!targetId) {
    setPlayerToolsStatus("Choose a notebook target first.", "error");
    return;
  }
  try {
    await recordAction({
      category: "notebook",
      actionName: "Notebook",
      targetName,
      targetPlayerId: targetId,
      notes,
      day,
    });
    setPlayerToolsStatus("Notebook entry saved.", "success");
    if (els.notebookNotes) {
      els.notebookNotes.value = "";
    }
  } catch (error) {
    console.error("Failed to record notebook entry", error);
    setPlayerToolsStatus("Unable to record notebook entry.", "error");
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

function normalizeActionName(name) {
  if (typeof name !== "string") {
    return "";
  }
  return name.trim().toLowerCase();
}

function isTrustAction(name) {
  return normalizeActionName(name) === "trust";
}

function normalizeIdentifier(value) {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value.trim();
  }
  return String(value).trim();
}

function targetsMatch(a = {}, b = {}) {
  const idA = normalizeIdentifier(a.targetPlayerId);
  const idB = normalizeIdentifier(b.targetPlayerId);
  if (idA && idB) {
    return idA === idB;
  }
  const nameA = normalizeActionName(a.targetName);
  const nameB = normalizeActionName(b.targetName);
  if (nameA && nameB) {
    return nameA === nameB;
  }
  return false;
}

function actionHasTarget(action = {}) {
  return !!(normalizeIdentifier(action.targetPlayerId) || normalizeActionName(action.targetName));
}

function parseNumericLimit(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function extractTimesPerGame(rule) {
  if (rule === null || rule === undefined) {
    return null;
  }
  if (typeof rule === "number" || typeof rule === "string") {
    const parsed = parseNumericLimit(rule);
    if (parsed === null || parsed < 0) {
      return null;
    }
    return parsed;
  }
  if (typeof rule !== "object") {
    return null;
  }
  const candidates = [
    rule.timesPerGame,
    rule.timesPerDay,
    rule.timesperday,
    rule.limit,
    rule.max,
    rule.maxUses,
    rule.maxPerGame,
    rule.perGame,
    rule.uses,
    rule.allowed,
  ];
  for (const candidate of candidates) {
    const parsed = parseNumericLimit(candidate);
    if (parsed === null) {
      continue;
    }
    if (parsed < 0) {
      return null;
    }
    return parsed;
  }
  return null;
}

function getActionRuleSources() {
  const sources = [];
  const entities = [];
  if (currentPlayer) {
    entities.push(currentPlayer);
    if (currentPlayer.rules && typeof currentPlayer.rules === "object") {
      entities.push(currentPlayer.rules);
    }
  }
  if (currentGame) {
    entities.push(currentGame);
    if (currentGame.rules && typeof currentGame.rules === "object") {
      entities.push(currentGame.rules);
    }
  }
  entities.forEach((entity) => {
    if (!entity) return;
    ACTION_RULE_KEYS.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(entity, key)) {
        const value = entity[key];
        if (value !== undefined && value !== null) {
          sources.push(value);
        }
      }
    });
  });
  return sources;
}

function resolveActionRuleFromSource(source, normalized, seen = new WeakSet()) {
  if (!source) {
    return null;
  }
  if (typeof source === "object") {
    if (seen.has(source)) {
      return null;
    }
    seen.add(source);
  }
  if (Array.isArray(source)) {
    for (const entry of source) {
      const resolved = resolveActionRuleFromSource(entry, normalized, seen);
      if (resolved !== null && resolved !== undefined) {
        return resolved;
      }
    }
    return null;
  }
  if (typeof source !== "object") {
    return null;
  }
  const candidateNames = [
    source.name,
    source.actionName,
    source.action,
    source.label,
    source.title,
    source.key,
    source.id,
    source.slug,
    source.code,
  ];
  if (candidateNames.some((candidate) => normalizeActionName(candidate) === normalized)) {
    return source;
  }
  const directKey = Object.keys(source).find((key) => normalizeActionName(key) === normalized);
  if (directKey) {
    const value = source[directKey];
    if (value && typeof value === "object") {
      const nested = resolveActionRuleFromSource(value, normalized, seen);
      if (nested !== null && nested !== undefined) {
        return nested;
      }
    }
    return value;
  }
  for (const value of Object.values(source)) {
    if (typeof value === "object" || Array.isArray(value)) {
      const nested = resolveActionRuleFromSource(value, normalized, seen);
      if (nested !== null && nested !== undefined) {
        return nested;
      }
    }
  }
  return null;
}

function getTimesPerGameLimitFor(actionName) {
  const normalized = normalizeActionName(actionName);
  if (!normalized) {
    return null;
  }
  const sources = getActionRuleSources();
  for (const source of sources) {
    const rule = resolveActionRuleFromSource(source, normalized);
    const limit = extractTimesPerGame(rule);
    if (limit !== null && limit !== undefined) {
      return limit;
    }
  }
  return null;
}

async function recordAction({
  category,
  actionName,
  targetName = "",
  targetPlayerId = "",
  notes = "",
  day,
  extra = {},
}) {
  if (!currentUser) {
    throw new Error("Not signed in");
  }
  const gameRef = doc(db, "games", gameId);
  const actionsRef = collection(gameRef, "actions");
  const cleanActionName = typeof actionName === "string" ? actionName.trim() : actionName || "";
  const cleanTargetName = typeof targetName === "string" ? targetName.trim() : targetName || "";
  const existingSnapshot = await getDocs(query(actionsRef, where("playerId", "==", currentUser.uid)));
  const existingActions = existingSnapshot.docs.map((docSnap) => ({ doc: docSnap, data: docSnap.data() || {} }));
  if (category === "private") {
    const limit = getTimesPerGameLimitFor(cleanActionName);
    if (limit !== null && limit !== undefined) {
      const normalizedName = normalizeActionName(cleanActionName);
      const usageCount = existingActions.filter(
        ({ data }) =>
          normalizeActionName(data.category) === "private" &&
          normalizeActionName(data.actionName) === normalizedName
      ).length;
      if (usageCount >= limit) {
        const error = new Error("Action limit reached");
        error.code = ACTION_LIMIT_ERROR_CODE;
        error.limit = limit;
        error.actionName = cleanActionName;
        throw error;
      }
    }
  }
  const context = { category, actionName: cleanActionName, targetName: cleanTargetName, targetPlayerId, day };
  const invalidations = existingActions
    .filter(({ data }) => shouldInvalidateAction(data, context))
    .map(({ doc }) =>
      updateDoc(doc.ref, {
        valid: false,
        updatedAt: serverTimestamp(),
      }).catch((error) => {
        console.warn("Failed to invalidate action", doc.id, error);
      })
    );
  await Promise.all(invalidations);
  const payload = {
    playerId: currentUser.uid,
    username: currentUser.displayName || "Unknown",
    actionName: cleanActionName,
    targetName: cleanTargetName,
    notes,
    day,
    category,
    valid: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...extra,
  };
  if (targetPlayerId) {
    payload.targetPlayerId = targetPlayerId;
  }
  await addDoc(actionsRef, payload);
}

function shouldInvalidateAction(data = {}, context = {}) {
  if (!data || data.valid === false) {
    return false;
  }
  const dataCategory = normalizeActionName(data.category);
  const contextCategory = normalizeActionName(context.category);
  if (!dataCategory || dataCategory !== contextCategory) {
    return false;
  }
  const dataDay = data.day ?? 0;
  const contextDay = context.day ?? 0;
  switch (contextCategory) {
    case "private": {
      const dataAction = normalizeActionName(data.actionName);
      const contextAction = normalizeActionName(context.actionName);
      if (!dataAction || dataAction !== contextAction) {
        return false;
      }
      if (isTrustAction(context.actionName)) {
        if (targetsMatch(data, context)) {
          return true;
        }
        if (!actionHasTarget(data) || !actionHasTarget(context)) {
          return dataDay === contextDay;
        }
        return false;
      }
      return dataDay === contextDay;
    }
    case "vote":
      return dataDay === contextDay;
    case "claim":
      return true;
    case "notebook": {
      const dataTargetId = normalizeIdentifier(data.targetPlayerId);
      const contextTargetId = normalizeIdentifier(context.targetPlayerId);
      if (dataTargetId && contextTargetId) {
        return dataTargetId === contextTargetId;
      }
      const expected = normalizeActionName(context.targetName);
      const actual = normalizeActionName(data.targetName);
      if (expected && actual) {
        return expected === actual;
      }
      return dataDay === contextDay;
    }
    default:
      return dataDay === contextDay;
  }
}

function findPlayerById(id) {
  if (!id) {
    return null;
  }
  return gamePlayers.find((player) => player.id === id) || null;
}

function findPlayerByName(name) {
  if (!name) {
    return null;
  }
  const normalized = name.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  return (
    gamePlayers.find((player) => (player.name || "").trim().toLowerCase() === normalized) || null
  );
}

function populatePlayerSelects() {
  const selects = [
    { element: els.privateActionTarget, placeholder: "-- choose target --", allowCustom: true },
    { element: els.voteTarget, placeholder: "-- select player --", allowCustom: false },
    { element: els.notebookTarget, placeholder: "-- select player --", allowCustom: false },
  ];
  selects.forEach(({ element, placeholder, allowCustom }) => {
    if (!element) return;
    const previous = element.value;
    element.innerHTML = "";
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = placeholder;
    element.appendChild(blank);
    gamePlayers.forEach((player) => {
      const option = document.createElement("option");
      option.value = player.id;
      option.textContent = player.name;
      option.dataset.playerName = player.name;
      element.appendChild(option);
    });
    if (allowCustom) {
      const customOption = document.createElement("option");
      customOption.value = CUSTOM_TARGET_OPTION_VALUE;
      customOption.textContent = "Custom target…";
      element.appendChild(customOption);
    }
    if (previous) {
      element.value = previous;
      if (element.value !== previous) {
        const normalizedPrevious = normalizeIdentifier(previous);
        const match = gamePlayers.find(
          (player) => normalizeIdentifier(player.id) === normalizedPrevious
        );
        if (match) {
          element.value = match.id;
        } else if (allowCustom && normalizedPrevious === CUSTOM_TARGET_OPTION_VALUE) {
          element.value = CUSTOM_TARGET_OPTION_VALUE;
        } else if (allowCustom && previous === CUSTOM_TARGET_OPTION_VALUE) {
          element.value = CUSTOM_TARGET_OPTION_VALUE;
        }
      }
    }
  });
  handlePrivateActionTargetChange();
}

function handlePrivateActionNameChange() {
  const input = els.privateActionNameCustom;
  if (!input) {
    return;
  }
  const isCustom = (els.privateActionName?.value || "") === CUSTOM_ACTION_OPTION_VALUE;
  setDisplay(input, isCustom ? "block" : "none");
  if (!isCustom) {
    input.value = "";
  }
}

function handlePrivateActionTargetChange() {
  const input = els.privateActionTargetCustom;
  if (!input) {
    return;
  }
  const isCustom = (els.privateActionTarget?.value || "") === CUSTOM_TARGET_OPTION_VALUE;
  setDisplay(input, isCustom ? "block" : "none");
  if (!isCustom) {
    input.value = "";
  }
}

function getAvailablePrivateActionNames() {
  const names = new Map();
  const visited = new WeakSet();

  function addName(name) {
    if (typeof name !== "string") {
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    const normalized = normalizeActionName(trimmed);
    if (!normalized || names.has(normalized)) {
      return;
    }
    names.set(normalized, trimmed);
  }

  function inspect(value) {
    if (!value) {
      return;
    }
    if (typeof value === "string") {
      addName(value);
      return;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(inspect);
      return;
    }
    if (typeof value === "object") {
      if (visited.has(value)) {
        return;
      }
      visited.add(value);
      addName(
        value.actionName ||
          value.name ||
          value.action ||
          value.label ||
          value.title ||
          value.key ||
          value.id ||
          value.slug
      );
      if (Array.isArray(value.aliases)) {
        value.aliases.forEach(addName);
      }
      Object.values(value).forEach(inspect);
    }
  }

  getActionRuleSources().forEach(inspect);

  const result = Array.from(names.values());
  result.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  return result;
}

function populatePrivateActionOptions() {
  const select = els.privateActionName;
  if (!select) {
    return;
  }
  const previous = select.value;
  const options = getAvailablePrivateActionNames();
  select.innerHTML = "";

  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = "-- select action --";
  select.appendChild(blank);

  options.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });

  const customOption = document.createElement("option");
  customOption.value = CUSTOM_ACTION_OPTION_VALUE;
  customOption.textContent = "Custom action…";
  select.appendChild(customOption);

  if (previous) {
    if (previous === CUSTOM_ACTION_OPTION_VALUE) {
      select.value = CUSTOM_ACTION_OPTION_VALUE;
    } else {
      const normalizedPrevious = normalizeActionName(previous);
      const match = options.find((name) => normalizeActionName(name) === normalizedPrevious);
      if (match) {
        select.value = match;
      }
    }
  }

  handlePrivateActionNameChange();
}

function getKnownRoleNames() {
  const names = new Set(availableRoles);
  gamePlayers.forEach((player) => {
    const roleValue = (player.data.role || player.data.rolename || "").trim();
    if (roleValue) {
      names.add(roleValue);
    }
  });
  return Array.from(names).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

async function ensureRolesLoaded() {
  if (availableRoles.length) {
    return availableRoles;
  }
  if (rolesLoadPromise) {
    return rolesLoadPromise;
  }
  const loadPromise = (async () => {
    try {
      const rolesSnap = await getDocs(query(collection(db, "roles"), orderBy("rolename")));
      const names = [];
      rolesSnap.forEach((docSnap) => {
        const data = docSnap.data() || {};
        const name = String(data.rolename || data.name || docSnap.id || "").trim();
        if (!name) {
          return;
        }
        if (!names.includes(name)) {
          names.push(name);
        }
      });
      availableRoles = names;
    } catch (error) {
      console.warn("Failed to load available roles", error);
      availableRoles = [];
    }
    return availableRoles;
  })();
  rolesLoadPromise = loadPromise;
  try {
    return await loadPromise;
  } finally {
    rolesLoadPromise = null;
  }
}

function renderModeratorPanel() {
  const panel = els.moderatorPanel;
  const rows = els.moderatorRows;
  if (!panel || !rows) {
    return;
  }
  if (!isOwnerView) {
    panel.style.display = "none";
    setModeratorStatus("");
    return;
  }
  panel.style.display = "block";
  rows.innerHTML = "";
  if (!gamePlayers.length) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML =
      '<td class="alt1" colspan="5" align="center"><i>No players joined.</i></td>';
    rows.appendChild(emptyRow);
    return;
  }
  const roleOptions = getKnownRoleNames();
  gamePlayers.forEach((player, index) => {
    const tr = document.createElement("tr");
    tr.dataset.playerId = player.id;
    tr.setAttribute("align", "center");
    const altPrimary = index % 2 === 0 ? "alt1" : "alt2";
    const altSecondary = index % 2 === 0 ? "alt2" : "alt1";

    const nameTd = document.createElement("td");
    nameTd.className = altSecondary;
    nameTd.setAttribute("align", "left");
    nameTd.innerHTML = `<strong>${escapeHtml(player.name)}</strong><br /><span class="smallfont">${escapeHtml(
      player.id
    )}</span>`;

    const roleTd = document.createElement("td");
    roleTd.className = altPrimary;
    const roleSelect = document.createElement("select");
    roleSelect.className = "bginput moderator-role";
    roleSelect.style.width = "95%";
    const blankOption = document.createElement("option");
    blankOption.value = "";
    blankOption.textContent = "-- select role --";
    roleSelect.appendChild(blankOption);
    roleOptions.forEach((roleName) => {
      const option = document.createElement("option");
      option.value = roleName;
      option.textContent = roleName;
      roleSelect.appendChild(option);
    });
    const currentRole = (player.data.role || player.data.rolename || "").trim();
    if (currentRole && !roleOptions.includes(currentRole)) {
      const existing = document.createElement("option");
      existing.value = currentRole;
      existing.textContent = currentRole;
      existing.dataset.custom = "true";
      roleSelect.appendChild(existing);
    }
    const customTrigger = document.createElement("option");
    customTrigger.value = CUSTOM_ROLE_OPTION_VALUE;
    customTrigger.textContent = "Custom role…";
    roleSelect.appendChild(customTrigger);
    if (currentRole) {
      roleSelect.value = currentRole;
    } else {
      roleSelect.value = "";
    }
    roleSelect.dataset.previousValue = roleSelect.value;
    roleSelect.addEventListener("change", () => {
      if (roleSelect.value !== CUSTOM_ROLE_OPTION_VALUE) {
        roleSelect.dataset.previousValue = roleSelect.value;
        return;
      }
      const customValue = window.prompt("Enter a custom role name:", "");
      if (customValue === null) {
        roleSelect.value = roleSelect.dataset.previousValue || "";
        return;
      }
      const trimmed = customValue.trim();
      if (!trimmed) {
        roleSelect.value = "";
        roleSelect.dataset.previousValue = "";
        return;
      }
      let customOption = roleSelect.querySelector("option[data-custom='true']");
      if (!customOption) {
        customOption = document.createElement("option");
        customOption.dataset.custom = "true";
        roleSelect.insertBefore(customOption, customTrigger);
      }
      customOption.value = trimmed;
      customOption.textContent = trimmed;
      roleSelect.value = trimmed;
      roleSelect.dataset.previousValue = trimmed;
    });
    roleTd.appendChild(roleSelect);

    const statusTd = document.createElement("td");
    statusTd.className = altSecondary;
    const statusSelect = document.createElement("select");
    statusSelect.className = "bginput moderator-status";
    [
      { value: "alive", label: "Alive" },
      { value: "eliminated", label: "Eliminated" },
    ].forEach((optionDef) => {
      const option = document.createElement("option");
      option.value = optionDef.value;
      option.textContent = optionDef.label;
      statusSelect.appendChild(option);
    });
    statusSelect.value = playerIsAlive(player.data) ? "alive" : "eliminated";
    statusTd.appendChild(statusSelect);

    const postsTd = document.createElement("td");
    postsTd.className = altPrimary;
    const postsInput = document.createElement("input");
    postsInput.type = "number";
    postsInput.min = "-1";
    postsInput.className = "bginput moderator-postsleft";
    postsInput.style.width = "80%";
    if (typeof player.data.postsLeft === "number" && player.data.postsLeft >= 0) {
      postsInput.value = player.data.postsLeft;
    } else {
      postsInput.placeholder = "∞";
    }
    postsTd.appendChild(postsInput);

    const actionsTd = document.createElement("td");
    actionsTd.className = altSecondary;
    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "button";
    saveButton.dataset.action = "save";
    saveButton.textContent = "Save";
    actionsTd.appendChild(saveButton);

    const kickButton = document.createElement("button");
    kickButton.type = "button";
    kickButton.className = "button";
    kickButton.dataset.action = "kick";
    kickButton.textContent = "Kick";
    kickButton.style.marginLeft = "4px";
    actionsTd.appendChild(kickButton);

    const replaceButton = document.createElement("button");
    replaceButton.type = "button";
    replaceButton.className = "button";
    replaceButton.dataset.action = "replace";
    replaceButton.textContent = "Replace";
    replaceButton.style.marginLeft = "4px";
    actionsTd.appendChild(replaceButton);

    tr.appendChild(nameTd);
    tr.appendChild(roleTd);
    tr.appendChild(statusTd);
    tr.appendChild(postsTd);
    tr.appendChild(actionsTd);
    rows.appendChild(tr);
  });
}

function setModeratorStatus(message, type = "info") {
  const el = els.moderatorStatus;
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

els.moderatorRows?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const row = button.closest("tr");
  const playerId = row?.dataset.playerId;
  if (!playerId) return;
  if (button.dataset.action === "save") {
    handleModeratorSave(row, playerId);
  } else if (button.dataset.action === "kick") {
    handleModeratorKick(playerId);
  } else if (button.dataset.action === "replace") {
    handleModeratorReplace(playerId);
  }
});

async function handleModeratorSave(row, playerId) {
  if (!isOwnerView || !currentGame) {
    setModeratorStatus("Only the owner can update players.", "error");
    return;
  }
  const roleSelect = row.querySelector(".moderator-role");
  const statusSelect = row.querySelector(".moderator-status");
  const postsInput = row.querySelector(".moderator-postsleft");
  const roleValueRaw = roleSelect?.value || "";
  if (roleValueRaw === CUSTOM_ROLE_OPTION_VALUE) {
    setModeratorStatus("Select a role before saving.", "error");
    return;
  }
  const roleValue = roleValueRaw.trim();
  const alive = statusSelect?.value === "alive";
  const postsRaw = postsInput?.value || "";
  const parsedPosts = parseInt(postsRaw, 10);
  const updates = {
    active: alive,
    alive,
    postsLeft: Number.isFinite(parsedPosts) ? parsedPosts : -1,
    updatedAt: serverTimestamp(),
  };
  if (roleValue) {
    updates.role = roleValue;
    updates.rolename = roleValue;
  } else {
    updates.role = deleteField();
    updates.rolename = deleteField();
  }
  try {
    await updateDoc(doc(db, "games", gameId, "players", playerId), updates);
    setModeratorStatus("Player updated.", "success");
    await loadGame();
  } catch (error) {
    console.error("Failed to update player", error);
    setModeratorStatus("Unable to update player.", "error");
  }
}

async function handleModeratorKick(playerId) {
  if (!isOwnerView || !currentGame) {
    setModeratorStatus("Only the owner can remove players.", "error");
    return;
  }
  if ((currentGame.day ?? 0) > 0) {
    setModeratorStatus("Players can only be removed before the game starts (Day 0).", "error");
    return;
  }
  if (!window.confirm("Remove this player from the game?")) {
    return;
  }
  try {
    const gameRef = doc(db, "games", gameId);
    await deleteDoc(doc(gameRef, "players", playerId));
    const actionsSnap = await getDocs(query(collection(gameRef, "actions"), where("playerId", "==", playerId)));
    await Promise.all(
      actionsSnap.docs.map((docSnap) =>
        deleteDoc(docSnap.ref).catch((error) => {
          console.warn("Failed to delete action", docSnap.id, error);
        })
      )
    );
    setModeratorStatus("Player removed.", "success");
    await loadGame();
  } catch (error) {
    console.error("Failed to remove player", error);
    setModeratorStatus("Unable to remove player.", "error");
  }
}

async function handleModeratorReplace(playerId) {
  if (!isOwnerView || !currentGame) {
    setModeratorStatus("Only the owner can replace players.", "error");
    return;
  }
  const identifier = window.prompt(
    "Enter the username, email, or UID of the replacement player:",
    ""
  );
  if (identifier === null) {
    return;
  }
  const trimmed = identifier.trim();
  if (!trimmed) {
    setModeratorStatus("Enter a replacement player identifier.", "error");
    return;
  }
  let userDoc;
  try {
    userDoc = await findUserProfile(trimmed);
  } catch (error) {
    console.error("Lookup failed", error);
    setModeratorStatus("Unable to look up replacement player.", "error");
    return;
  }
  if (!userDoc) {
    setModeratorStatus("Replacement player not found.", "error");
    return;
  }
  const newUserId = userDoc.id;
  if (gamePlayers.some((player) => player.id === newUserId)) {
    setModeratorStatus("That player is already in the game.", "error");
    return;
  }
  const userData = userDoc.data() || {};
  const newName = userData.displayName || userData.username || userData.email || "Player";
  const gameRef = doc(db, "games", gameId);
  const oldRef = doc(gameRef, "players", playerId);
  const newRef = doc(gameRef, "players", newUserId);
  try {
    await runTransaction(db, async (transaction) => {
      const oldSnap = await transaction.get(oldRef);
      if (!oldSnap.exists()) {
        throw new Error("Player not found.");
      }
      const newSnap = await transaction.get(newRef);
      if (newSnap.exists()) {
        throw new Error("Replacement already joined.");
      }
      const existing = oldSnap.data() || {};
      const baseData = { ...existing };
      delete baseData.uid;
      delete baseData.userid;
      delete baseData.userId;
      delete baseData.username;
      delete baseData.id;
      transaction.set(newRef, {
        ...baseData,
        uid: newUserId,
        name: newName,
        username: newName,
        replacedFrom: playerId,
        updatedAt: serverTimestamp(),
      });
      transaction.delete(oldRef);
    });
    const actionsSnap = await getDocs(query(collection(gameRef, "actions"), where("playerId", "==", playerId)));
    await Promise.all(
      actionsSnap.docs.map((docSnap) =>
        updateDoc(docSnap.ref, {
          playerId: newUserId,
          username: newName,
          updatedAt: serverTimestamp(),
        }).catch((error) => {
          console.warn("Failed to update action", docSnap.id, error);
        })
      )
    );
    setModeratorStatus("Player replaced.", "success");
    await loadGame();
  } catch (error) {
    console.error("Failed to replace player", error);
    setModeratorStatus(error.message || "Unable to replace player.", "error");
  }
}

async function findUserProfile(identifier) {
  const directRef = doc(db, "users", identifier);
  try {
    const directSnap = await getDoc(directRef);
    if (directSnap.exists()) {
      return directSnap;
    }
  } catch (error) {
    console.warn("Direct lookup failed", error);
  }
  const usersRef = collection(db, "users");
  const normalized = identifier.toLowerCase();
  try {
    let snapshot = await getDocs(query(usersRef, where("usernameLower", "==", normalized)));
    if (!snapshot.empty) {
      return snapshot.docs[0];
    }
    snapshot = await getDocs(query(usersRef, where("email", "==", identifier)));
    if (!snapshot.empty) {
      return snapshot.docs[0];
    }
  } catch (error) {
    console.warn("Profile lookup failed", error);
  }
  return null;
}

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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
