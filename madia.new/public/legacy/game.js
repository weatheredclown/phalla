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
const CUSTOM_REPLACEMENT_OPTION_VALUE = "__custom-replacement__";

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
  publicActionsBlock: document.getElementById("publicActionsBlock"),
  publicActionsStatus: document.getElementById("publicActionsStatus"),
  publicActionVoteRow: document.getElementById("publicActionVoteRow"),
  publicActionVote: document.getElementById("publicActionVote"),
  publicActionVoteTarget: document.getElementById("publicActionVoteTarget"),
  publicActionUnvoteRow: document.getElementById("publicActionUnvoteRow"),
  publicActionUnvote: document.getElementById("publicActionUnvote"),
  publicActionClaimRow: document.getElementById("publicActionClaimRow"),
  publicActionClaim: document.getElementById("publicActionClaim"),
  publicClaimRoleSelect: document.getElementById("publicClaimRoleSelect"),
  publicClaimRoleCustom: document.getElementById("publicClaimRoleCustom"),
  publicActionNotebookRow: document.getElementById("publicActionNotebookRow"),
  publicActionNotebook: document.getElementById("publicActionNotebook"),
  publicNotebookTarget: document.getElementById("publicNotebookTarget"),
  publicNotebookNotes: document.getElementById("publicNotebookNotes"),
  joinButton: document.getElementById("joinButton"),
  leaveButton: document.getElementById("leaveButton"),
  ownerControls: document.getElementById("ownerControls"),
  toggleOpen: document.getElementById("toggleOpen"),
  toggleActive: document.getElementById("toggleActive"),
  nextDay: document.getElementById("nextDay"),
  daySummary: document.getElementById("daySummary"),
  playerTools: document.getElementById("playerTools"),
  playerToolsStatus: document.getElementById("playerToolsStatus"),
  privateChannelsSection: document.getElementById("privateChannelsSection"),
  privateChannelsContainer: document.getElementById("privateChannelsContainer"),
  privateChannelsStatus: document.getElementById("privateChannelsStatus"),
  voteTalliesSection: document.getElementById("voteTalliesSection"),
  voteTalliesStatus: document.getElementById("voteTalliesStatus"),
  voteTalliesBody: document.getElementById("voteTalliesBody"),
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
  claimRoleSelect: document.getElementById("claimRoleSelect"),
  claimRoleCustom: document.getElementById("claimRoleCustom"),
  claimDay: document.getElementById("claimDay"),
  notebookRecordForm: document.getElementById("notebookRecordForm"),
  notebookTarget: document.getElementById("notebookTarget"),
  notebookDay: document.getElementById("notebookDay"),
  notebookNotes: document.getElementById("notebookNotes"),
  moderatorPanel: document.getElementById("moderatorPanel"),
  moderatorStatus: document.getElementById("moderatorStatus"),
  moderatorRows: document.getElementById("moderatorRows"),
  replacePlayerControls: document.getElementById("replacePlayerControls"),
  replacePlayerName: document.getElementById("replacePlayerName"),
  replacePlayerSelect: document.getElementById("replacePlayerSelect"),
  replacePlayerCustom: document.getElementById("replacePlayerCustom"),
  confirmReplaceButton: document.getElementById("confirmReplaceButton"),
  cancelReplaceButton: document.getElementById("cancelReplaceButton"),
  playerListLink: document.getElementById("playerListLink"),
  actionHistorySection: document.getElementById("actionHistorySection"),
  actionHistoryContent: document.getElementById("actionHistoryContent"),
};
els.ubbButtons = document.querySelectorAll(".ubb-button[data-ubb-tag]");

let currentUser = null;
let currentGame = null;
let currentPlayer = null;
let gamePlayers = [];
let isOwnerView = false;
let availableRoles = [];
let rolesLoadPromise = null;
let replacementCandidates = [];
let replacementCandidateDocs = new Map();
let replacementCandidatesPromise = null;
let pendingReplacementPlayerId = null;
let postCache = new Map();
let pendingQuote = null;

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

const initialQuotePostId = getParam("q");
if (initialQuotePostId) {
  queueQuote(initialQuotePostId, { scroll: true, updateUrl: false });
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

if (els.claimRoleSelect) {
  els.claimRoleSelect.addEventListener("change", handleClaimRoleSelectChange);
}

if (els.publicClaimRoleSelect) {
  els.publicClaimRoleSelect.addEventListener("change", handleClaimRoleSelectChange);
}

if (els.replacePlayerSelect) {
  els.replacePlayerSelect.addEventListener("change", handleReplaceSelectChange);
}

els.confirmReplaceButton?.addEventListener("click", confirmReplaceSelection);
els.cancelReplaceButton?.addEventListener("click", cancelReplaceSelection);

els.publicActionVote?.addEventListener("change", handlePublicVoteToggle);
els.publicActionUnvote?.addEventListener("change", handlePublicUnvoteToggle);

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

  const actionsHtml = renderPostActionBadges(post.actions || []);

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
          <td class="${altClass}" style="${altStyle}" align="right">
            ${actionsHtml || "&nbsp;"}
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

  const actionButtons = [];

  if (canEdit) {
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "button";
    editButton.textContent = "Edit Post";
    editButton.addEventListener("click", () => handleEditPost(postId, post));
    actionButtons.push(editButton);
  }

  if (canDelete) {
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "button";
    deleteButton.textContent = "Delete Post";
    deleteButton.addEventListener("click", () => handleDeletePost(postId));
    actionButtons.push(deleteButton);
  }

  if (canCurrentUserPost()) {
    const quoteButton = document.createElement("button");
    quoteButton.type = "button";
    quoteButton.className = "button";
    quoteButton.textContent = "Quote";
    quoteButton.addEventListener("click", () => handleQuotePost(postId));
    actionButtons.push(quoteButton);
  }

  if (actionButtons.length) {
    const actions = document.createElement("div");
    actions.className = "post-actions";
    actionButtons.forEach((button) => actions.appendChild(button));
    container.appendChild(actions);
  }

  return container;
}

function renderPostActionBadges(actions = []) {
  if (!Array.isArray(actions) || !actions.length) {
    return "";
  }
  const formatted = actions
    .map((action) => renderSingleActionBadge(action))
    .filter(Boolean);
  if (!formatted.length) {
    return "";
  }
  return `<div class="action-badges">${formatted.join("")}</div>`;
}

function renderSingleActionBadge(action = {}) {
  const category = normalizeActionName(action.category || action.actionName);
  switch (category) {
    case "vote":
      return renderVoteActionBadge(action);
    case "claim":
      return renderClaimActionBadge(action);
    default:
      return renderGenericActionBadge(action);
  }
}

function renderVoteActionBadge(action = {}) {
  const valid = action.valid !== false;
  const base = valid ? "!vote" : "!retracted vote";
  const target = escapeHtml(
    action.targetName || getPlayerDisplayName(normalizeIdentifier(action.targetPlayerId)) || ""
  );
  const note = getActionNote(action, { includeFor: "vote" });
  const classes = ["action-badge", "action-badge-vote", valid ? "action-badge-active" : "action-badge-retracted"];
  return `<div class="${classes.join(" ")}">${base}${target ? ` ${target}` : ""}${note}</div>`;
}

function renderClaimActionBadge(action = {}) {
  const valid = action.valid !== false;
  const verb = valid ? "claim" : "unclaim";
  const detail = escapeHtml(action.notes || action.targetName || action.actionName || "");
  const classes = ["action-badge", "action-badge-claim", valid ? "action-badge-active" : "action-badge-retracted"];
  return `<div class="${classes.join(" ")}"><span class="action-badge-verb">${verb}</span>${
    detail ? ` ${detail}` : ""
  }</div>`;
}

function renderGenericActionBadge(action = {}) {
  const name = escapeHtml(action.actionName || action.category || "Action");
  const target = escapeHtml(action.targetName || getPlayerDisplayName(normalizeIdentifier(action.targetPlayerId)) || "");
  const note = getActionNote(action, { includeFor: "generic" });
  const classes = ["action-badge", "action-badge-generic"];
  return `<div class="${classes.join(" ")}"><span class="action-badge-verb">${name}</span>${
    target ? ` ${target}` : ""
  }${note}</div>`;
}

function getActionNote(action = {}, options = {}) {
  const rawNote = typeof action.notes === "string" ? action.notes.trim() : "";
  if (!rawNote) {
    return "";
  }
  if (options.includeFor === "vote") {
    return ` <span class="action-badge-note">(${escapeHtml(rawNote)})</span>`;
  }
  if (options.includeFor === "generic") {
    return ` <span class="action-badge-note">(${escapeHtml(rawNote)})</span>`;
  }
  return "";
}

function extractActionPostId(action = {}) {
  const candidates = [
    action.postId,
    action.post,
    action.postRef,
    action.postDocumentId,
    action.postDocId,
    action.postKey,
  ];
  for (const candidate of candidates) {
    const normalized = normalizeActionPostCandidate(candidate);
    if (normalized) {
      return normalized;
    }
  }
  return "";
}

function normalizeActionPostCandidate(candidate) {
  if (!candidate) {
    return "";
  }
  if (typeof candidate === "string") {
    return candidate.trim();
  }
  if (typeof candidate === "object") {
    if (typeof candidate.id === "string") {
      return candidate.id.trim();
    }
    if (typeof candidate.postId === "string") {
      return candidate.postId.trim();
    }
    if (typeof candidate.path === "string") {
      const parts = candidate.path.split("/").filter(Boolean);
      if (parts.length) {
        return parts[parts.length - 1].trim();
      }
    }
  }
  return "";
}

function toMillis(value) {
  if (!value) {
    return 0;
  }
  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === "number") {
    return value;
  }
  return 0;
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
  populateClaimRoleOptions();
  updatePublicActionControls();
  updatePlayerToolsFormsVisibility();
  renderModeratorPanel();
  await renderVoteTallies();

  const actionsByPostId = await loadActionsByPost(gameRef);

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
  postCache = new Map();
  postEntries.forEach((entry) => {
    const data = entry.data;
    const actions = actionsByPostId.get(entry.id) || [];
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
      actions,
    };
    postCache.set(entry.id, post);
    els.postsContainer.appendChild(postRow(post.id, post, alt));
    alt = !alt;
  });

  attemptApplyPendingQuote();

  await refreshMembershipAndControls();
  await loadPrivateChannels();
}

async function loadActionsByPost(gameRef) {
  const map = new Map();
  if (!gameRef || missingConfig) {
    return map;
  }
  let snapshot;
  try {
    snapshot = await getDocs(collection(gameRef, "actions"));
  } catch (error) {
    console.warn("Failed to load post actions", error);
    return map;
  }
  snapshot.forEach((docSnap) => {
    const data = docSnap.data() || {};
    const postId = extractActionPostId(data);
    if (!postId) {
      return;
    }
    const list = map.get(postId) || [];
    list.push({ id: docSnap.id, ...data });
    map.set(postId, list);
  });
  map.forEach((list) => {
    list.sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt));
  });
  return map;
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

function setPrivateChannelsStatus(message, type = "info") {
  const el = els.privateChannelsStatus;
  if (!el) {
    return;
  }
  if (!message) {
    el.style.display = "none";
    el.textContent = "";
    return;
  }
  el.style.display = "block";
  el.textContent = message;
  el.style.color =
    type === "error" ? "#ff7676" : type === "success" ? "#6ee7b7" : "#F9A906";
}

function clearPrivateChannels() {
  const container = els.privateChannelsContainer;
  if (container) {
    container.innerHTML = "";
  }
  if (els.privateChannelsSection) {
    els.privateChannelsSection.style.display = "none";
  }
  setPrivateChannelsStatus("");
}

function collectIdSet(source, keys = []) {
  const ids = new Set();
  if (!source || typeof source !== "object") {
    return ids;
  }
  keys.forEach((key) => {
    const value = source[key];
    if (!Array.isArray(value)) {
      return;
    }
    value.forEach((item) => {
      const normalized = normalizeIdentifier(item);
      if (normalized) {
        ids.add(normalized);
      }
    });
  });
  return ids;
}

function getChannelTitle(channel = {}) {
  if (!channel || typeof channel !== "object") {
    return "Private Discussion";
  }
  const rawTitle =
    channel.title || channel.name || channel.rolename || channel.roleName || "";
  const title = typeof rawTitle === "string" ? rawTitle.trim() : String(rawTitle || "");
  return title || "Private Discussion";
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

function renderPrivateChannel(channel, posts, options = {}) {
  const { canPost = false, emptyMessage = "No posts yet." } = options;
  const container = document.createElement("div");
  container.className = "private-channel";
  container.style.marginTop = "12px";

  const headerTable = document.createElement("table");
  headerTable.className = "tborder";
  headerTable.setAttribute("cellpadding", "4");
  headerTable.setAttribute("cellspacing", "0");
  headerTable.setAttribute("border", "0");
  headerTable.setAttribute("width", "100%");
  const description =
    typeof channel.description === "string" && channel.description.trim()
      ? `<div class="smallfont" style="font-weight:normal;">${escapeHtml(
          channel.description.trim()
        )}</div>`
      : "";
  headerTable.innerHTML = `
    <tr>
      <td class="thead">
        <div>${escapeHtml(getChannelTitle(channel))}</div>
        ${description}
      </td>
    </tr>
  `;
  container.appendChild(headerTable);

  if (posts.length) {
    let alt = false;
    posts.forEach((post) => {
      container.appendChild(postRow(post.id, post, alt));
      alt = !alt;
    });
  } else {
    const emptyTable = document.createElement("table");
    emptyTable.className = "tborder";
    emptyTable.setAttribute("cellpadding", "6");
    emptyTable.setAttribute("cellspacing", "0");
    emptyTable.setAttribute("border", "0");
    emptyTable.setAttribute("width", "100%");
    emptyTable.innerHTML = `
      <tr>
        <td class="alt1" align="center">${escapeHtml(emptyMessage)}</td>
      </tr>
    `;
    container.appendChild(emptyTable);
  }

  if (canPost) {
    const form = document.createElement("form");
    form.dataset.channelId = channel.id;
    form.innerHTML = `
      <table cellpadding="4" cellspacing="0" border="0" width="100%" class="tborder" style="margin-top:6px;">
        <tr>
          <td class="alt2">
            <div class="smallfont">Message (UBB)</div>
            <textarea class="bginput" rows="4" style="width:98%;" data-private-body="${channel.id}"></textarea>
            <div style="margin-top:8px;"><button class="button" type="submit">Post Reply</button></div>
          </td>
        </tr>
      </table>
      <div class="smallfont" style="display:none; margin-top:6px; color:#F9A906;" data-private-status="${channel.id}"></div>
    `;
    form.addEventListener("submit", handlePrivateReplySubmit);
    container.appendChild(form);
  }

  return container;
}

async function loadPrivateChannels() {
  if (!els.privateChannelsSection || !els.privateChannelsContainer) {
    return;
  }
  if (missingConfig || !gameId) {
    clearPrivateChannels();
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    clearPrivateChannels();
    return;
  }

  const container = els.privateChannelsContainer;
  container.innerHTML = "";
  if (els.privateChannelsSection) {
    els.privateChannelsSection.style.display = "block";
  }
  setPrivateChannelsStatus("Loading role discussions…");

  const gameRef = doc(db, "games", gameId);
  let channelSnapshot;
  try {
    channelSnapshot = await getDocs(collection(gameRef, "channels"));
  } catch (error) {
    console.error("Failed to load private channels", error);
    const message =
      error?.code === "permission-denied"
        ? "You do not have permission to view private discussions."
        : "Unable to load private discussions.";
    setPrivateChannelsStatus(message, "error");
    container.innerHTML = "";
    return;
  }

  const userId = normalizeIdentifier(user.uid);
  const ownerId = normalizeIdentifier(currentGame?.ownerUserId);

  const accessibleChannels = [];
  channelSnapshot.forEach((docSnap) => {
    const data = docSnap.data() || {};
    const memberIds = collectIdSet(data, [
      "memberIds",
      "members",
      "writerIds",
      "posterIds",
      "writers",
    ]);
    const viewerIds = collectIdSet(data, [
      "viewerIds",
      "viewers",
      "readerIds",
      "spectatorIds",
      "readonlyIds",
      "readOnlyIds",
    ]);
    const extraViewers = collectIdSet(data, [
      "extraViewerIds",
      "additionalViewers",
      "additionalReaderIds",
      "observerIds",
    ]);
    const allowOwnerView =
      data.allowOwner === undefined ? true : Boolean(data.allowOwner);
    const allowOwnerPost =
      data.allowOwnerPost === undefined ? allowOwnerView : Boolean(data.allowOwnerPost);

    const canView =
      (userId && memberIds.has(userId)) ||
      (userId && viewerIds.has(userId)) ||
      (userId && extraViewers.has(userId)) ||
      (ownerId && userId === ownerId && allowOwnerView);

    if (canView) {
      accessibleChannels.push({
        id: docSnap.id,
        data,
        memberIds,
        allowOwnerPost,
        allowOwnerView,
      });
    }
  });

  if (!accessibleChannels.length) {
    const isOwner = ownerId && userId && userId === ownerId;
    const message = currentPlayer || isOwner
      ? "No private discussions available for your role yet."
      : "Join the game to view your role discussions.";
    container.innerHTML = "";
    setPrivateChannelsStatus(message);
    return;
  }

  accessibleChannels.sort((a, b) => {
    const orderA =
      typeof a.data.sortOrder === "number" ? a.data.sortOrder : Number.MAX_SAFE_INTEGER;
    const orderB =
      typeof b.data.sortOrder === "number" ? b.data.sortOrder : Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return getChannelTitle(a.data).localeCompare(getChannelTitle(b.data), undefined, {
      sensitivity: "base",
    });
  });

  const fragment = document.createDocumentFragment();

  for (const channel of accessibleChannels) {
    const channelData = channel.data;
    const channelId = channel.id;
    let postsSnapshot;
    try {
      postsSnapshot = await getDocs(
        query(collection(gameRef, "channels", channelId, "posts"), orderBy("createdAt", "asc"))
      );
    } catch (error) {
      console.warn(`Failed to load posts for channel ${channelId}`, error);
      const fallback = renderPrivateChannel(
        { id: channelId, ...channelData },
        [],
        { canPost: false, emptyMessage: "Unable to load posts for this discussion." }
      );
      fragment.appendChild(fallback);
      continue;
    }

    const posts = [];
    const authorIds = new Set();
    postsSnapshot.forEach((docSnap) => {
      const data = docSnap.data() || {};
      posts.push({ id: docSnap.id, data });
      if (data.authorId) {
        authorIds.add(data.authorId);
      }
    });

    const avatarMap = await fetchUserThumbnails(Array.from(authorIds));
    const formattedPosts = posts.map((entry) => {
      const data = entry.data;
      return {
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
    });

    const postingDisabled = channelData.closed === true || channelData.locked === true;
    const canPost =
      !postingDisabled &&
      ((userId && channel.memberIds.has(userId)) ||
        (ownerId && userId === ownerId && channel.allowOwnerPost));

    const rendered = renderPrivateChannel(
      { id: channelId, ...channelData },
      formattedPosts,
      { canPost }
    );
    fragment.appendChild(rendered);
  }

  container.innerHTML = "";
  container.appendChild(fragment);
  setPrivateChannelsStatus("");
}

async function handlePrivateReplySubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form) {
    return;
  }

  const channelId = form.dataset.channelId;
  if (!channelId) {
    return;
  }

  if (!auth.currentUser) {
    header?.openAuthPanel("login");
    return;
  }

  const textarea = form.querySelector(`[data-private-body="${channelId}"]`);
  const statusEl = form.querySelector(`[data-private-status="${channelId}"]`);
  const body = (textarea?.value || "").trim();
  if (!body) {
    if (statusEl) {
      statusEl.style.display = "block";
      statusEl.style.color = "#ff7676";
      statusEl.textContent = "Enter a message before posting.";
    }
    return;
  }

  if (statusEl) {
    statusEl.style.display = "block";
    statusEl.style.color = "#F9A906";
    statusEl.textContent = "Posting message…";
  }

  try {
    const user = auth.currentUser;
    if (!user) {
      header?.openAuthPanel("login");
      return;
    }
    await addDoc(collection(doc(db, "games", gameId, "channels", channelId), "posts"), {
      body,
      authorId: user.uid,
      authorName: user.displayName || "Unknown",
      avatar: user.photoURL || "",
      createdAt: serverTimestamp(),
    });
    if (textarea) {
      textarea.value = "";
    }
    if (statusEl) {
      statusEl.style.color = "#6ee7b7";
      statusEl.textContent = "Message posted.";
    }
    await loadPrivateChannels();
  } catch (error) {
    console.error("Failed to post private message", error);
    if (statusEl) {
      statusEl.style.color = "#ff7676";
      statusEl.textContent = "Unable to post message.";
    } else {
      alert("Unable to post message.");
    }
  }
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
    setDisplay(els.publicActionsBlock, "none");
    setPlayerToolsStatus("");
    setPublicActionsStatus("");
    if (els.actionHistorySection) {
      els.actionHistorySection.style.display = "none";
    }
    currentPlayer = null;
    clearPublicActionSelections();
    clearPrivateChannels();
    populatePrivateActionOptions();
    populateClaimRoleOptions();
    updatePlayerToolsFormsVisibility();
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
    updatePlayerToolsFormsVisibility();
    updatePublicActionControls();
  } catch {}
  await loadPrivateChannels();
  await renderActionHistory();
  populatePrivateActionOptions();
  populateClaimRoleOptions();
  updatePlayerToolsFormsVisibility();
  updatePublicActionControls();
  attemptApplyPendingQuote();
}

els.joinButton?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) {
    header?.openAuthPanel("login");
    return;
  }
  await setDoc(doc(db, "games", gameId, "players", user.uid), { uid: user.uid, name: user.displayName || "" });
  await refreshMembershipAndControls();
  await loadGame();
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
  await loadGame();
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

  setPublicActionsStatus("");

  const actionsToRecord = [];
  const currentDay = currentGame?.day ?? 0;

  if (els.publicActionVote?.checked) {
    const targetId = (els.publicActionVoteTarget?.value || "").trim();
    if (!targetId) {
      setPublicActionsStatus("Select a vote target before posting.", "error");
      return;
    }
    const targetPlayer = findPlayerById(targetId);
    if (!targetPlayer) {
      setPublicActionsStatus("Select a valid vote target before posting.", "error");
      return;
    }
    actionsToRecord.push({
      description: "vote",
      payload: {
        category: "vote",
        actionName: "vote",
        targetPlayerId: targetPlayer.id,
        targetName: targetPlayer.name || "",
        notes: "",
        day: currentDay,
        extra: {},
      },
    });
  }

  if (els.publicActionUnvote?.checked) {
    if (els.publicActionVote?.checked) {
      setPublicActionsStatus("Choose either vote or unvote, not both.", "error");
      return;
    }
    actionsToRecord.push({
      description: "unvote",
      payload: {
        category: "vote",
        actionName: "unvote",
        targetPlayerId: "",
        targetName: "",
        notes: "",
        day: currentDay,
        extra: { valid: false },
      },
    });
  }

  if (els.publicActionClaim?.checked) {
    const claimValue = (els.publicClaimRoleSelect?.value || "").trim();
    let claimRole = "";
    if (claimValue === CUSTOM_ROLE_OPTION_VALUE) {
      claimRole = (els.publicClaimRoleCustom?.value || "").trim();
    } else {
      claimRole = claimValue;
    }
    if (!claimRole) {
      setPublicActionsStatus("Select a role to claim before posting.", "error");
      return;
    }
    const claimTargetId = currentPlayer?.id || user.uid;
    actionsToRecord.push({
      description: "claim",
      payload: {
        category: "claim",
        actionName: "claim",
        targetPlayerId: claimTargetId,
        targetName: claimRole,
        notes: claimRole,
        day: currentDay,
        extra: {},
      },
    });
  }

  if (els.publicActionNotebook?.checked) {
    const notebookTargetId = (els.publicNotebookTarget?.value || "").trim();
    if (!notebookTargetId) {
      setPublicActionsStatus("Select a notebook target before posting.", "error");
      return;
    }
    const notebookTarget = findPlayerById(notebookTargetId);
    if (!notebookTarget) {
      setPublicActionsStatus("Select a valid notebook target before posting.", "error");
      return;
    }
    const notebookNotes = (els.publicNotebookNotes?.value || "").trim();
    actionsToRecord.push({
      description: "notebook",
      payload: {
        category: "notebook",
        actionName: "notebook",
        targetPlayerId: notebookTarget.id,
        targetName: notebookTarget.name || "",
        notes: notebookNotes,
        day: currentDay,
        extra: {},
      },
    });
  }

  let postRef;
  try {
    postRef = await addDoc(collection(doc(db, "games", gameId), "posts"), {
      title,
      body, // store as UBB; render via ubbToHtml
      authorId: user.uid,
      authorName: user.displayName || "Unknown",
      avatar: user.photoURL || "",
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to post reply", error);
    alert("Unable to post reply.");
    return;
  }

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

  if (actionsToRecord.length) {
    let actionError = false;
    for (const action of actionsToRecord) {
      try {
        const extra = { ...(action.payload.extra || {}), postId: postRef.id };
        if (!extra.postRef) {
          extra.postRef = postRef;
        }
        await recordAction({ ...action.payload, extra });
      } catch (error) {
        actionError = true;
        console.error(`Failed to record ${action.description} action`, error);
        setPublicActionsStatus(`Unable to record ${action.description} action.`, "error");
      }
    }
    if (!actionError) {
      setPublicActionsStatus("");
    }
  }

  clearPublicActionSelections();
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
    await renderActionHistory();
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
    await renderVoteTallies();
    await renderActionHistory();
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
  const selectedRole = els.claimRoleSelect?.value || "";
  const role =
    selectedRole === CUSTOM_ROLE_OPTION_VALUE
      ? (els.claimRoleCustom?.value || "").trim()
      : selectedRole.trim();
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
    if (els.claimRoleSelect) {
      els.claimRoleSelect.value = "";
    }
    if (els.claimRoleCustom) {
      els.claimRoleCustom.value = "";
    }
    handleClaimRoleSelectChange();
    await renderActionHistory();
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
    await renderActionHistory();
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

function setPublicActionsStatus(message, type = "info") {
  const el = els.publicActionsStatus;
  if (!el) {
    return;
  }
  if (!message) {
    el.style.display = "none";
    el.textContent = "";
    return;
  }
  el.style.display = "block";
  el.textContent = message;
  el.style.color = type === "error" ? "#ff7676" : type === "success" ? "#6ee7b7" : "#F9A906";
}

function updatePlayerToolsFormsVisibility() {
  const canUseTools = !!currentPlayer || isOwnerView;
  if (!canUseTools) {
    setDisplay(els.privateActionForm, "none");
    setDisplay(els.voteRecordForm, "none");
    setDisplay(els.claimRecordForm, "none");
    setDisplay(els.notebookRecordForm, "none");
    hideReplacementControls();
    return;
  }

  const privateActionsAvailable = getAvailablePrivateActionNames().length > 0;
  setDisplay(els.privateActionForm, privateActionsAvailable ? "block" : "none");

  const hasVoteTargets = gamePlayers.some((player) => player.id !== currentPlayer?.id);
  setDisplay(els.voteRecordForm, hasVoteTargets ? "block" : "none");

  setDisplay(els.claimRecordForm, "block");

  const hasNotebookTargets = gamePlayers.length > 0;
  setDisplay(els.notebookRecordForm, hasNotebookTargets ? "block" : "none");

  if (!isOwnerView) {
    hideReplacementControls();
  }
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

function getPlayerDisplayName(playerId) {
  const match = findPlayerById(playerId);
  return match?.name || "";
}

function populatePlayerSelects() {
  const selects = [
    { element: els.privateActionTarget, placeholder: "-- choose target --", allowCustom: true },
    { element: els.voteTarget, placeholder: "-- select player --", allowCustom: false },
    { element: els.notebookTarget, placeholder: "-- select player --", allowCustom: false },
    { element: els.publicActionVoteTarget, placeholder: "-- select player --", allowCustom: false },
    { element: els.publicNotebookTarget, placeholder: "-- select player --", allowCustom: false },
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
  updatePublicActionControls();
}

function updatePublicActionControls() {
  const block = els.publicActionsBlock;
  if (!block) {
    return;
  }
  const canUseActions = !!auth.currentUser && (currentPlayer || isOwnerView);
  if (!canUseActions) {
    block.style.display = "none";
    clearPublicActionSelections();
    setPublicActionsStatus("");
    return;
  }

  const voteRow = els.publicActionVoteRow;
  const unvoteRow = els.publicActionUnvoteRow;
  const claimRow = els.publicActionClaimRow;
  const notebookRow = els.publicActionNotebookRow;

  const hasVoteTargets = gamePlayers.some((player) => player.id !== currentPlayer?.id);
  setDisplay(voteRow, hasVoteTargets ? "block" : "none");
  setDisplay(unvoteRow, hasVoteTargets ? "block" : "none");
  if (!hasVoteTargets) {
    if (els.publicActionVote) {
      els.publicActionVote.checked = false;
    }
    if (els.publicActionUnvote) {
      els.publicActionUnvote.checked = false;
    }
    if (els.publicActionVoteTarget) {
      els.publicActionVoteTarget.value = "";
    }
  }

  const hasNotebookTargets = gamePlayers.length > 0;
  setDisplay(notebookRow, hasNotebookTargets ? "block" : "none");
  if (!hasNotebookTargets) {
    if (els.publicActionNotebook) {
      els.publicActionNotebook.checked = false;
    }
    if (els.publicNotebookTarget) {
      els.publicNotebookTarget.value = "";
    }
    if (els.publicNotebookNotes) {
      els.publicNotebookNotes.value = "";
    }
  }

  const hasClaimOptions = getKnownRoleNames().length > 0;
  setDisplay(claimRow, hasClaimOptions ? "block" : "none");
  if (!hasClaimOptions) {
    if (els.publicActionClaim) {
      els.publicActionClaim.checked = false;
    }
    if (els.publicClaimRoleSelect) {
      els.publicClaimRoleSelect.value = "";
    }
    if (els.publicClaimRoleCustom) {
      els.publicClaimRoleCustom.value = "";
    }
  }

  const visibleRows = [voteRow, unvoteRow, claimRow, notebookRow];
  const anyVisible = visibleRows.some((row) => row && row.style.display !== "none");
  block.style.display = anyVisible ? "block" : "none";
  if (!anyVisible) {
    setPublicActionsStatus("");
  }
}

function clearPublicActionSelections() {
  if (els.publicActionVote) {
    els.publicActionVote.checked = false;
  }
  if (els.publicActionVoteTarget) {
    els.publicActionVoteTarget.value = "";
  }
  if (els.publicActionUnvote) {
    els.publicActionUnvote.checked = false;
  }
  if (els.publicActionClaim) {
    els.publicActionClaim.checked = false;
  }
  if (els.publicClaimRoleSelect) {
    els.publicClaimRoleSelect.value = "";
  }
  if (els.publicClaimRoleCustom) {
    els.publicClaimRoleCustom.value = "";
  }
  if (els.publicActionNotebook) {
    els.publicActionNotebook.checked = false;
  }
  if (els.publicNotebookTarget) {
    els.publicNotebookTarget.value = "";
  }
  if (els.publicNotebookNotes) {
    els.publicNotebookNotes.value = "";
  }
  handleClaimRoleSelectChange();
}

function handlePublicVoteToggle() {
  if (els.publicActionVote?.checked && els.publicActionUnvote) {
    els.publicActionUnvote.checked = false;
  }
}

function handlePublicUnvoteToggle() {
  if (els.publicActionUnvote?.checked && els.publicActionVote) {
    els.publicActionVote.checked = false;
  }
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

function handleClaimRoleSelectChange() {
  toggleClaimRoleCustom(els.claimRoleSelect, els.claimRoleCustom);
  toggleClaimRoleCustom(els.publicClaimRoleSelect, els.publicClaimRoleCustom);
}

function toggleClaimRoleCustom(selectEl, inputEl) {
  if (!inputEl) {
    return;
  }
  const isCustom = (selectEl?.value || "") === CUSTOM_ROLE_OPTION_VALUE;
  setDisplay(inputEl, isCustom ? "block" : "none");
  if (!isCustom) {
    inputEl.value = "";
  }
}

function handleQuotePost(postId) {
  if (!postId) {
    return;
  }
  queueQuote(postId, { scroll: true, updateUrl: true, focus: true });
}

function queueQuote(postId, options = {}) {
  if (!postId) {
    return;
  }
  pendingQuote = { postId, ...options };
  attemptApplyPendingQuote();
}

function attemptApplyPendingQuote() {
  if (!pendingQuote) {
    return;
  }
  const post = postCache.get(pendingQuote.postId);
  if (!post) {
    return;
  }
  if (!canCurrentUserPost()) {
    return;
  }
  applyQuoteToReply(pendingQuote.postId, post, pendingQuote);
  pendingQuote = null;
}

function applyQuoteToReply(postId, post, options = {}) {
  if (!els.replyBody) {
    return;
  }
  const { scroll = false, updateUrl = true, focus = false, append = true } = options;
  const quoteTitle = buildQuoteTitle(post);
  if (quoteTitle && els.replyTitle && !els.replyTitle.value.trim()) {
    els.replyTitle.value = quoteTitle;
  }
  const quoteBlock = buildQuoteBlock(post);
  if (!quoteBlock) {
    return;
  }
  const existing = els.replyBody.value || "";
  const trimmedExisting = existing.replace(/\s*$/, "");
  const nextValue = append && trimmedExisting
    ? `${trimmedExisting}\n\n${quoteBlock}`
    : quoteBlock;
  els.replyBody.value = nextValue;
  if (focus) {
    setReplyCursorToEnd();
  }
  if (scroll) {
    scrollReplyFormIntoView();
  }
  if (updateUrl) {
    updateQuoteParam(postId, { setHash: true });
  }
}

function buildQuoteTitle(post = {}) {
  const title = typeof post.title === "string" ? post.title.trim() : "";
  if (!title) {
    return "";
  }
  if (/^re:/i.test(title)) {
    return title;
  }
  return `RE: ${title}`;
}

function buildQuoteBlock(post = {}) {
  const rawBody =
    typeof post.body === "string" ? post.body : post.body ? String(post.body) : "";
  return `[quote]${rawBody}[/quote]\n\n`;
}

function scrollReplyFormIntoView() {
  const anchor = document.getElementById("reply") || els.replyForm;
  anchor?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setReplyCursorToEnd() {
  if (!els.replyBody) {
    return;
  }
  const length = els.replyBody.value.length;
  els.replyBody.focus();
  els.replyBody.setSelectionRange(length, length);
}

function updateQuoteParam(postId, options = {}) {
  const { setHash = false } = options;
  try {
    const url = new URL(window.location.href);
    if (postId) {
      url.searchParams.set("q", postId);
    } else {
      url.searchParams.delete("q");
    }
    if (setHash) {
      url.hash = "#reply";
    }
    history.replaceState({}, "", url.toString());
  } catch (error) {
    console.warn("Failed to update quote param", error);
  }
}

function canCurrentUserPost() {
  if (!auth.currentUser) {
    return false;
  }
  if (isOwnerView) {
    return true;
  }
  return !!currentPlayer;
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

function populateClaimRoleOptions() {
  const selects = [
    { select: els.claimRoleSelect, custom: els.claimRoleCustom },
    { select: els.publicClaimRoleSelect, custom: els.publicClaimRoleCustom },
  ];
  const roles = getKnownRoleNames();

  selects.forEach(({ select, custom }) => {
    if (!select) {
      return;
    }
    const previous = select.value;
    select.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "-- choose role --";
    select.appendChild(placeholder);

    roles.forEach((role) => {
      const option = document.createElement("option");
      option.value = role;
      option.textContent = role;
      select.appendChild(option);
    });

    const customOption = document.createElement("option");
    customOption.value = CUSTOM_ROLE_OPTION_VALUE;
    customOption.textContent = "Custom role…";
    select.appendChild(customOption);

    if (previous) {
      if (previous === CUSTOM_ROLE_OPTION_VALUE) {
        select.value = CUSTOM_ROLE_OPTION_VALUE;
      } else {
        const normalizedPrevious = previous.trim().toLowerCase();
        const match = roles.find((role) => role.trim().toLowerCase() === normalizedPrevious);
        if (match) {
          select.value = match;
        }
      }
    }

    if (select.value === "" && previous && custom && previous !== CUSTOM_ROLE_OPTION_VALUE) {
      const normalizedPrevious = previous.trim().toLowerCase();
      const match = roles.find((role) => role.trim().toLowerCase() === normalizedPrevious);
      if (!match) {
        select.value = CUSTOM_ROLE_OPTION_VALUE;
        custom.value = previous;
      }
    }
  });

  handleClaimRoleSelectChange();
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

async function renderVoteTallies() {
  const section = els.voteTalliesSection;
  const body = els.voteTalliesBody;
  const status = els.voteTalliesStatus;
  if (!section || !body) {
    return;
  }
  if (!currentGame || missingConfig) {
    section.style.display = "none";
    body.innerHTML = "";
    if (status) {
      status.textContent = "";
    }
    return;
  }
  section.style.display = "block";
  body.innerHTML = "";
  const day = currentGame.day ?? 0;
  if (status) {
    status.textContent = `Vote tally · Day ${day}`;
  }
  if (!gamePlayers.length) {
    const row = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4;
    td.className = "alt1";
    td.style.textAlign = "center";
    td.textContent = "No players joined yet.";
    row.appendChild(td);
    body.appendChild(row);
    return;
  }
  let snapshot;
  try {
    const gameRef = doc(db, "games", gameId);
    snapshot = await getDocs(query(collection(gameRef, "actions"), where("category", "==", "vote")));
  } catch (error) {
    console.warn("Failed to load vote tallies", error);
    const row = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4;
    td.className = "alt1";
    td.style.textAlign = "center";
    td.textContent = "Unable to load votes.";
    row.appendChild(td);
    body.appendChild(row);
    return;
  }
  const tallies = new Map();
  gamePlayers.forEach((player) => {
    tallies.set(player.id, {
      id: player.id,
      name: player.name,
      alive: playerIsAlive(player.data),
      voters: new Map(),
    });
  });
  const extraTargets = new Map();
  snapshot.forEach((docSnap) => {
    const data = docSnap.data() || {};
    if ((data.day ?? 0) !== day) {
      return;
    }
    if (data.valid === false) {
      return;
    }
    const targetId = normalizeIdentifier(data.targetPlayerId);
    const fallbackName = data.targetName || getPlayerDisplayName(targetId) || "";
    let entry;
    if (targetId && tallies.has(targetId)) {
      entry = tallies.get(targetId);
    } else {
      const keyBase = normalizeActionName(fallbackName) || targetId || "unknown";
      const key = targetId ? `id:${targetId}` : `name:${keyBase}`;
      if (!extraTargets.has(key)) {
        extraTargets.set(key, {
          id: targetId || keyBase,
          name: fallbackName || targetId || "(no target)",
          alive: null,
          voters: new Map(),
        });
      }
      entry = extraTargets.get(key);
    }
    if (!entry) {
      return;
    }
    const voterId = normalizeIdentifier(data.playerId);
    const voterName =
      data.username ||
      data.playerName ||
      getPlayerDisplayName(voterId) ||
      (typeof data.playerDisplayName === "string" ? data.playerDisplayName : "");
    const voterKey =
      voterId ||
      (voterName ? `name:${normalizeActionName(voterName)}` : `doc:${docSnap.id}`);
    if (!entry.voters.has(voterKey)) {
      entry.voters.set(voterKey, voterName || "Unknown");
    }
  });
  const combined = [
    ...tallies.values(),
    ...Array.from(extraTargets.values()).filter((entry) => entry.voters.size > 0),
  ];
  if (!combined.length) {
    const row = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4;
    td.className = "alt1";
    td.style.textAlign = "center";
    td.textContent = "No votes recorded yet.";
    row.appendChild(td);
    body.appendChild(row);
    return;
  }
  const formatted = combined.map((entry) => ({
    ...entry,
    voters: Array.from(entry.voters.values()).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    ),
  }));
  formatted.sort((a, b) => {
    if (b.voters.length !== a.voters.length) {
      return b.voters.length - a.voters.length;
    }
    return (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
  });
  let alt = false;
  formatted.forEach((entry) => {
    alt = !alt;
    const row = document.createElement("tr");
    row.setAttribute("align", "center");
    const primary = alt ? "alt1" : "alt2";
    const secondary = alt ? "alt2" : "alt1";
    const nameCell = document.createElement("td");
    nameCell.className = primary;
    nameCell.setAttribute("align", "left");
    nameCell.innerHTML = `<strong>${escapeHtml(entry.name || "Unknown")}</strong>`;
    const aliveCell = document.createElement("td");
    aliveCell.className = secondary;
    aliveCell.textContent =
      entry.alive === null || entry.alive === undefined ? "—" : entry.alive ? "Yes" : "No";
    const countCell = document.createElement("td");
    countCell.className = primary;
    countCell.textContent = String(entry.voters.length);
    const votersCell = document.createElement("td");
    votersCell.className = secondary;
    votersCell.setAttribute("align", "left");
    votersCell.textContent = entry.voters.length ? entry.voters.join(", ") : "—";
    row.append(nameCell, aliveCell, countCell, votersCell);
    body.appendChild(row);
  });
}

function extractFirstStringValue(source, keys = []) {
  if (!source) {
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

function describeActionStatus(action = {}) {
  const explicit = extractFirstStringValue(action, [
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
  const category = normalizeActionName(action.category);
  const day = action.day ?? 0;
  const currentDay = currentGame?.day ?? 0;
  if (category === "vote") {
    return day === currentDay ? "Pending" : "Counted";
  }
  if (category === "claim") {
    return day === currentDay ? "Pending" : "Recorded";
  }
  if (category === "notebook") {
    return "Saved";
  }
  if (isTrustAction(action.actionName) && day === currentDay) {
    return "Trusted";
  }
  if (day === currentDay) {
    return "Pending";
  }
  return "Recorded";
}

function timestampToMillis(value) {
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

function formatActionTarget(action = {}) {
  const pieces = [];
  const primary =
    action.targetName ||
    getPlayerDisplayName(action.targetPlayerId) ||
    (action.targetPlayerId ? String(action.targetPlayerId) : "");
  if (primary) {
    pieces.push(`<div>${escapeHtml(primary)}</div>`);
  } else {
    pieces.push("<div>—</div>");
  }
  const note = extractFirstStringValue(action, ["notes", "detail", "details", "extraNotes"]);
  if (note) {
    pieces.push(`<div class="smallfont">${escapeHtml(note)}</div>`);
  }
  return pieces.join("");
}

async function renderActionHistory() {
  const section = els.actionHistorySection;
  const content = els.actionHistoryContent;
  if (!section || !content) {
    return;
  }
  if (!currentUser || !currentPlayer || missingConfig) {
    section.style.display = "none";
    content.innerHTML = "";
    return;
  }
  let snapshot;
  try {
    const actionsRef = collection(db, "games", gameId, "actions");
    snapshot = await getDocs(query(actionsRef, where("playerId", "==", currentUser.uid)));
  } catch (error) {
    console.warn("Failed to load action history", error);
    section.style.display = "block";
    content.innerHTML =
      '<div class="smallfont" style="text-align:center;color:#ff7676;">Unable to load actions.</div>';
    return;
  }
  const actions = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  if (!actions.length) {
    section.style.display = "block";
    content.innerHTML =
      '<div class="smallfont" style="text-align:center;">No recorded actions yet.</div>';
    return;
  }
  actions.sort((a, b) => {
    const dayDiff = (b.day ?? 0) - (a.day ?? 0);
    if (dayDiff !== 0) {
      return dayDiff;
    }
    return timestampToMillis(b.updatedAt || b.createdAt) - timestampToMillis(a.updatedAt || a.createdAt);
  });
  const grouped = new Map();
  actions.forEach((action) => {
    const dayValue = action.day ?? 0;
    if (!grouped.has(dayValue)) {
      grouped.set(dayValue, []);
    }
    grouped.get(dayValue).push(action);
  });
  const fragment = document.createDocumentFragment();
  const days = Array.from(grouped.keys()).sort((a, b) => b - a);
  days.forEach((dayValue) => {
    const table = document.createElement("table");
    table.className = "tborder";
    table.setAttribute("cellpadding", "4");
    table.setAttribute("cellspacing", "1");
    table.setAttribute("border", "0");
    table.style.marginTop = "6px";
    table.style.width = "100%";
    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr align="center">
        <td class="thead" colspan="4" align="left">Day ${dayValue}</td>
      </tr>
      <tr align="center">
        <td class="thead" width="180">Action</td>
        <td class="thead" width="220">Target</td>
        <td class="thead" width="140">Status</td>
        <td class="thead" align="left">Updated</td>
      </tr>
    `;
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    const dayActions = grouped.get(dayValue) || [];
    let alt = false;
    dayActions.forEach((action) => {
      alt = !alt;
      const row = document.createElement("tr");
      row.setAttribute("align", "center");
      const primary = alt ? "alt1" : "alt2";
      const secondary = alt ? "alt2" : "alt1";
      const actionCell = document.createElement("td");
      actionCell.className = primary;
      actionCell.setAttribute("align", "left");
      actionCell.innerHTML = `<strong>${escapeHtml(action.actionName || action.category || "Action")}</strong>`;
      const targetCell = document.createElement("td");
      targetCell.className = secondary;
      targetCell.setAttribute("align", "left");
      targetCell.innerHTML = formatActionTarget(action);
      const statusCell = document.createElement("td");
      statusCell.className = primary;
      statusCell.textContent = describeActionStatus(action);
      const updatedCell = document.createElement("td");
      updatedCell.className = secondary;
      updatedCell.setAttribute("align", "left");
      updatedCell.textContent = formatDate(action.updatedAt || action.createdAt) || "—";
      row.append(actionCell, targetCell, statusCell, updatedCell);
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    fragment.appendChild(table);
  });
  section.style.display = "block";
  content.innerHTML = "";
  content.appendChild(fragment);
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

function hideReplacementControls() {
  pendingReplacementPlayerId = null;
  if (els.replacePlayerSelect) {
    els.replacePlayerSelect.value = "";
  }
  if (els.replacePlayerCustom) {
    els.replacePlayerCustom.value = "";
  }
  setDisplay(els.replacePlayerCustom, "none");
  setDisplay(els.replacePlayerControls, "none");
}

function handleReplaceSelectChange() {
  const input = els.replacePlayerCustom;
  if (!input) {
    return;
  }
  const isCustom = (els.replacePlayerSelect?.value || "") === CUSTOM_REPLACEMENT_OPTION_VALUE;
  setDisplay(input, isCustom ? "block" : "none");
  if (!isCustom) {
    input.value = "";
  }
}

function cancelReplaceSelection() {
  hideReplacementControls();
  setModeratorStatus("", "info");
}

async function ensureReplacementCandidates() {
  if (replacementCandidatesPromise) {
    return replacementCandidatesPromise;
  }
  replacementCandidatesPromise = (async () => {
    const list = [];
    const map = new Map();
    try {
      const snapshot = await getDocs(collection(db, "users"));
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() || {};
        const name =
          (data.displayName || data.username || data.name || data.email || docSnap.id || "").toString().trim() || docSnap.id;
        list.push({ id: docSnap.id, name, doc: docSnap });
        map.set(docSnap.id, docSnap);
      });
      list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
      replacementCandidates = list;
      replacementCandidateDocs = map;
      return list;
    } catch (error) {
      console.error("Failed to load replacement candidates", error);
      replacementCandidates = [];
      replacementCandidateDocs = new Map();
      throw error;
    }
  })();
  try {
    return await replacementCandidatesPromise;
  } catch (error) {
    replacementCandidatesPromise = null;
    throw error;
  }
}

function populateReplacementSelect() {
  const select = els.replacePlayerSelect;
  if (!select) {
    return;
  }
  const previous = select.value;
  select.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "-- choose replacement --";
  select.appendChild(placeholder);

  const currentIds = new Set(gamePlayers.map((player) => player.id));
  replacementCandidates.forEach(({ id, name }) => {
    if (currentIds.has(id)) {
      return;
    }
    const option = document.createElement("option");
    option.value = id;
    option.textContent = name;
    select.appendChild(option);
  });

  const customOption = document.createElement("option");
  customOption.value = CUSTOM_REPLACEMENT_OPTION_VALUE;
  customOption.textContent = "Custom user…";
  select.appendChild(customOption);

  if (previous) {
    if (previous === CUSTOM_REPLACEMENT_OPTION_VALUE) {
      select.value = CUSTOM_REPLACEMENT_OPTION_VALUE;
    } else if (!currentIds.has(previous) && replacementCandidateDocs.has(previous)) {
      select.value = previous;
    }
  }

  handleReplaceSelectChange();
}

async function confirmReplaceSelection() {
  if (!pendingReplacementPlayerId) {
    setModeratorStatus("Select a player to replace first.", "error");
    return;
  }
  const selected = els.replacePlayerSelect?.value || "";
  if (!selected) {
    setModeratorStatus("Choose a replacement player first.", "error");
    return;
  }
  let userDoc = null;
  if (selected === CUSTOM_REPLACEMENT_OPTION_VALUE) {
    const identifier = (els.replacePlayerCustom?.value || "").trim();
    if (!identifier) {
      setModeratorStatus("Enter a replacement player identifier.", "error");
      return;
    }
    try {
      userDoc = await findUserProfile(identifier);
    } catch (error) {
      console.error("Lookup failed", error);
      setModeratorStatus("Unable to look up replacement player.", "error");
      return;
    }
    if (!userDoc) {
      setModeratorStatus("Replacement player not found.", "error");
      return;
    }
  } else {
    userDoc = replacementCandidateDocs.get(selected) || null;
    if (!userDoc) {
      setModeratorStatus("Unable to load replacement player.", "error");
      return;
    }
  }
  await executeModeratorReplacement(pendingReplacementPlayerId, userDoc);
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
  try {
    await ensureReplacementCandidates();
  } catch (error) {
    setModeratorStatus("Unable to load replacement candidates.", "error");
    return;
  }
  pendingReplacementPlayerId = playerId;
  const player = gamePlayers.find((entry) => entry.id === playerId);
  if (els.replacePlayerName) {
    els.replacePlayerName.textContent = player?.name || "(unknown)";
  }
  populateReplacementSelect();
  setDisplay(els.replacePlayerControls, "block");
  if (els.replacePlayerSelect) {
    els.replacePlayerSelect.focus();
  }
  setModeratorStatus("Choose a replacement player from the list.", "info");
}

async function executeModeratorReplacement(playerId, userDoc) {
  if (!isOwnerView || !currentGame) {
    setModeratorStatus("Only the owner can replace players.", "error");
    return;
  }
  if (!userDoc) {
    setModeratorStatus("Replacement player not found.", "error");
    return;
  }
  const newUserId = userDoc.id;
  if (!newUserId) {
    setModeratorStatus("Replacement player not found.", "error");
    return;
  }
  if (gamePlayers.some((player) => player.id === newUserId)) {
    setModeratorStatus("That player is already in the game.", "error");
    return;
  }
  const userData = userDoc.data ? userDoc.data() || {} : {};
  const newName = userData.displayName || userData.username || userData.email || userData.name || "Player";
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
    hideReplacementControls();
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
