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
import { escapeHtml as baseEscapeHtml, ubbToHtml } from "/legacy/ubb.js";
import { auth, db, ensureUserDocument, missingConfig } from "./firebase.js";
import { initLegacyHeader } from "./header.js";
import {
  ROLE_NAMES,
  getCanonicalRoleDefinition,
  getActionTypeDefinition,
} from "./roles-data.js";

function getParam(name) {
  const params = new URLSearchParams(location.search);
  return params.get(name);
}

const header = initLegacyHeader();


const CUSTOM_ROLE_OPTION_VALUE = "__custom-role__";
const CUSTOM_ACTION_OPTION_VALUE = "__custom-action__";
const CUSTOM_TARGET_OPTION_VALUE = "__custom-target__";
const CUSTOM_REPLACEMENT_OPTION_VALUE = "__custom-replacement__";

function cloneCanonicalData(value) {
  if (!value || typeof value !== "object") {
    return null;
  }
  return JSON.parse(JSON.stringify(value));
}

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
  publicActionsList: document.getElementById("publicActionsList"),
  joinButton: document.getElementById("joinButton"),
  leaveButton: document.getElementById("leaveButton"),
  ownerControls: document.getElementById("ownerControls"),
  toggleOpen: document.getElementById("toggleOpen"),
  toggleActive: document.getElementById("toggleActive"),
  nextDay: document.getElementById("nextDay"),
  daySummary: document.getElementById("daySummary"),
  playerTools: document.getElementById("playerTools"),
  playerToolsStatus: document.getElementById("playerToolsStatus"),
  playerRoleSummary: document.getElementById("playerRoleSummary"),
  playerRoleName: document.getElementById("playerRoleName"),
  playerRoleDescription: document.getElementById("playerRoleDescription"),
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
  voteNotes: document.getElementById("voteNotes"),
  claimRecordForm: document.getElementById("claimRecordForm"),
  claimRoleSelect: document.getElementById("claimRoleSelect"),
  claimRoleCustom: document.getElementById("claimRoleCustom"),
  notebookRecordForm: document.getElementById("notebookRecordForm"),
  notebookTarget: document.getElementById("notebookTarget"),
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
let availableRoles = [...ROLE_NAMES];
let replacementCandidates = [];
let replacementCandidateDocs = new Map();
let replacementCandidatesPromise = null;
let pendingReplacementPlayerId = null;
let postCache = new Map();
let pendingQuote = null;

const BASE_PUBLIC_ACTION_DEFINITIONS = [
  {
    id: "vote",
    type: "vote",
    label: "Vote",
    normalized: "vote",
    requiresTarget: true,
    targetType: "player",
    excludeCurrentPlayer: true,
  },
  {
    id: "unvote",
    type: "unvote",
    label: "Unvote",
    normalized: "unvote",
    requiresTarget: false,
    targetType: null,
  },
  {
    id: "claim",
    type: "claim",
    label: "Claim",
    normalized: "claim",
    requiresTarget: true,
    targetType: "role",
  },
  {
    id: "notebook",
    type: "notebook",
    label: "Notebook",
    normalized: "notebook",
    requiresTarget: true,
    targetType: "player",
    allowsNotes: true,
  },
];

let publicActionRows = new Map();
let lastPublicActionsSignature = "";
const actionsByDayCache = new Map();
let actionHistoryContext = { actionsByDay: new Map() };

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

if (els.replacePlayerSelect) {
  els.replacePlayerSelect.addEventListener("change", handleReplaceSelectChange);
}

els.confirmReplaceButton?.addEventListener("click", confirmReplaceSelection);
els.cancelReplaceButton?.addEventListener("click", cancelReplaceSelection);

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
  let resolved = null;
  if (typeof action.actionTypeId === "number") {
    resolved = getActionTypeDefinition(action.actionTypeId);
  }
  if (!resolved) {
    const normalized = normalizeActionName(action.actionName || action.category);
    if (normalized) {
      resolved = getActionTypeDefinition(normalized);
    }
  }
  const displayName =
    resolved?.label ||
    resolved?.name ||
    action.actionName ||
    action.category ||
    "Action";
  const name = escapeHtml(displayName);
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
  updateHeaderNav({ joined: false });
  isOwnerView = !!(auth.currentUser && g.ownerUserId === auth.currentUser.uid);
  els.gameTitle.textContent = g.gamename || "(no name)";
  els.ownerControls.style.display = isOwnerView ? "block" : "none";
  if (els.daySummary) {
    els.daySummary.style.display = isOwnerView ? "inline-block" : "none";
  }
  if (els.privateActionDay) {
    els.privateActionDay.value = g.day ?? 0;
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

  const actionsRef = collection(gameRef, "actions");
  const snapshots = [];

  try {
    if (isOwnerView) {
      snapshots.push(await getDocs(actionsRef));
    } else {
      snapshots.push(
        await getDocs(query(actionsRef, where("category", "==", "vote")))
      );
      if (currentUser) {
        snapshots.push(
          await getDocs(query(actionsRef, where("playerId", "==", currentUser.uid)))
        );
      }
    }
  } catch (error) {
    console.warn("Failed to load post actions", error);
    return map;
  }

  const seen = new Set();
  snapshots.forEach((snapshot) => {
    snapshot.forEach((docSnap) => {
      if (seen.has(docSnap.id)) {
        return;
      }
      seen.add(docSnap.id);
      const data = docSnap.data() || {};
      const postId = extractActionPostId(data);
      if (!postId) {
        return;
      }
      const list = map.get(postId) || [];
      list.push({ id: docSnap.id, ...data });
      map.set(postId, list);
    });
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
  return baseEscapeHtml(value);
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
  if (container) {
    container.innerHTML = "";
  }

  const userId = normalizeIdentifier(user.uid);
  const ownerId = normalizeIdentifier(currentGame?.ownerUserId);
  const isOwner = ownerId && userId === ownerId;
  const assignedRole = getAssignedRoleName(currentPlayer);
  if (!isOwner && !assignedRole) {
    clearPrivateChannels();
    return;
  }

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
    if (error?.code === "permission-denied") {
      clearPrivateChannels();
    } else {
      setPrivateChannelsStatus("Unable to load private discussions.", "error");
      container.innerHTML = "";
    }
    return;
  }

  const accessibleChannels = [];
  const hasAnyChannels = channelSnapshot.size > 0;

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

    const isOwner = ownerId && userId && userId === ownerId;
    const canView =
      (userId && memberIds.has(userId)) ||
      (userId && viewerIds.has(userId)) ||
      (userId && extraViewers.has(userId)) ||
      (isOwner && allowOwnerView);

    const ownerOverride = isOwner && !canView;

    if (canView || ownerOverride) {
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
    if (isOwner) {
      container.innerHTML = "";
      setPrivateChannelsStatus("No private discussions configured yet.");
      return;
    }

    if (currentPlayer) {
      if (hasAnyChannels) {
        clearPrivateChannels();
        return;
      }
      container.innerHTML = "";
      setPrivateChannelsStatus("No private discussions available for your role yet.");
      return;
    }

    clearPrivateChannels();
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

function updatePlayerRoleSummary(player) {
  const summary = els.playerRoleSummary;
  const nameEl = els.playerRoleName;
  const descriptionEl = els.playerRoleDescription;
  if (!summary || !nameEl || !descriptionEl) {
    return;
  }

  if (!player) {
    summary.style.display = "none";
    nameEl.textContent = "";
    descriptionEl.innerHTML = "";
    return;
  }

  const roleName = getAssignedRoleName(player);
  const roleDescription = getAssignedRoleDescription(player);
  if (!roleName && !roleDescription) {
    summary.style.display = "none";
    nameEl.textContent = "";
    descriptionEl.innerHTML = "";
    return;
  }

  summary.style.display = "block";
  nameEl.innerHTML = roleName ? `<big><big>${escapeHtml(roleName)}</big></big>` : "";
  if (roleDescription) {
    const escaped = escapeHtml(roleDescription).replace(/\r?\n/g, "<br />");
    descriptionEl.innerHTML = escaped;
  } else {
    descriptionEl.innerHTML = "";
  }
}

function updateHeaderNav({ joined = false } = {}) {
  if (!header || typeof header.setNavLinks !== "function") {
    return;
  }

  const links = [{ label: "List of Games", href: "/legacy/index.html" }];
  if (currentGame) {
    const gameLabel = currentGame.gamename || "(no name)";
    const gameLink = {
      label: gameLabel,
      href: `/legacy/game.html?g=${encodeURIComponent(currentGame.id)}`,
    };
    if (!joined) {
      gameLink.current = true;
    }
    links.push(gameLink);
    if (joined) {
      links.push({
        label: "my game",
        href: `/legacy/mygame.html?g=${encodeURIComponent(currentGame.id)}`,
        current: true,
        italic: true,
      });
    }
  } else {
    links[0].current = true;
  }

  if (!links.some((link) => link && link.current)) {
    links[links.length - 1].current = true;
  }

  header.setNavLinks(links);
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
    updatePlayerRoleSummary(null);
    updateHeaderNav({ joined: false });
    return;
  }
  try {
    const p = await getDoc(doc(db, "games", gameId, "players", user.uid));
    const joined = p.exists();
    const ownerView = currentGame && currentGame.ownerUserId === user.uid;
    setDisplay(els.replyForm, joined || ownerView ? "block" : "none");
    const canShowJoin = !!currentGame && !joined && !ownerView;
    setDisplay(els.joinButton, canShowJoin ? "inline-block" : "none");
    setDisplay(els.leaveButton, joined ? "inline-block" : "none");
    currentPlayer = joined ? { id: p.id, ...p.data() } : null;
    setDisplay(els.playerTools, joined || ownerView ? "block" : "none");
    updatePlayerToolsFormsVisibility();
    updatePublicActionControls();
    updatePlayerRoleSummary(currentPlayer);
    updateHeaderNav({ joined });
  } catch (error) {
    console.warn("Failed to refresh player membership", error);
    currentPlayer = null;
    updatePlayerRoleSummary(null);
    updateHeaderNav({ joined: false });
  }
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
  let ownerId = currentGame?.ownerUserId || "";
  if (!ownerId && gameId) {
    try {
      const snapshot = await getDoc(doc(db, "games", gameId));
      ownerId = snapshot.exists() ? snapshot.data()?.ownerUserId || "" : "";
    } catch (error) {
      console.warn("Failed to verify game owner before joining", error);
    }
  }
  if (ownerId && ownerId === user.uid) {
    alert("Game owners manage players but do not join the roster.");
    await refreshMembershipAndControls();
    return;
  }
  await setDoc(
    doc(db, "games", gameId, "players", user.uid),
    {
      uid: user.uid,
      name: user.displayName || "",
      joinedAt: serverTimestamp(),
    },
    { merge: true }
  );
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

  let voteSelected = false;
  let unvoteSelected = false;
  let actionValidationFailed = false;

  publicActionRows.forEach((row) => {
    if (actionValidationFailed || !row.checkbox?.checked) {
      return;
    }
    switch (row.definition.type) {
      case "vote": {
        const opposing = getPublicActionRowById("unvote");
        if (opposing?.checkbox?.checked) {
          setPublicActionsStatus("Choose either vote or unvote, not both.", "error");
          actionValidationFailed = true;
          return;
        }
        const targetId = (row.targetSelect?.value || "").trim();
        if (!targetId) {
          setPublicActionsStatus("Select a vote target before posting.", "error");
          actionValidationFailed = true;
          return;
        }
        const targetPlayer = findPlayerById(targetId);
        if (!targetPlayer) {
          setPublicActionsStatus("Select a valid vote target before posting.", "error");
          actionValidationFailed = true;
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
        voteSelected = true;
        break;
      }
      case "unvote": {
        const opposing = getPublicActionRowById("vote");
        if (voteSelected || opposing?.checkbox?.checked) {
          setPublicActionsStatus("Choose either vote or unvote, not both.", "error");
          actionValidationFailed = true;
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
        unvoteSelected = true;
        break;
      }
      case "claim": {
        const selectValue = (row.roleSelect?.value || "").trim();
        let claimRole = "";
        if (selectValue === CUSTOM_ROLE_OPTION_VALUE) {
          claimRole = (row.customInput?.value || "").trim();
        } else {
          claimRole = selectValue;
        }
        if (!claimRole) {
          setPublicActionsStatus("Select a role to claim before posting.", "error");
          actionValidationFailed = true;
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
        break;
      }
      case "notebook": {
        const targetId = (row.targetSelect?.value || "").trim();
        if (!targetId) {
          setPublicActionsStatus("Select a notebook target before posting.", "error");
          actionValidationFailed = true;
          return;
        }
        const targetPlayer = findPlayerById(targetId);
        if (!targetPlayer) {
          setPublicActionsStatus("Select a valid notebook target before posting.", "error");
          actionValidationFailed = true;
          return;
        }
        const notebookNotes = (row.notesInput?.value || "").trim();
        actionsToRecord.push({
          description: "notebook",
          payload: {
            category: "notebook",
            actionName: "notebook",
            targetPlayerId: targetPlayer.id,
            targetName: targetPlayer.name || "",
            notes: notebookNotes,
            day: currentDay,
            extra: {},
          },
        });
        break;
      }
      default: {
        let targetPlayerId = "";
        let targetName = "";
        if (row.definition.requiresTarget && row.definition.targetType === "player") {
          const targetId = (row.targetSelect?.value || "").trim();
          if (!targetId) {
            setPublicActionsStatus(
              `Select a target for ${row.definition.label.toLowerCase()} before posting.`,
              "error"
            );
            actionValidationFailed = true;
            return;
          }
          const targetPlayer = findPlayerById(targetId);
          if (!targetPlayer) {
            setPublicActionsStatus("Select a valid action target before posting.", "error");
            actionValidationFailed = true;
            return;
          }
          targetPlayerId = targetPlayer.id;
          targetName = targetPlayer.name || "";
        }
        const notes = (row.notesInput?.value || "").trim();
        const extra = {};
        if (Number.isFinite(row.definition.actionTypeId)) {
          extra.actionTypeId = row.definition.actionTypeId;
        }
        if (row.definition.actionType) {
          extra.actionType = row.definition.actionType;
        }
        actionsToRecord.push({
          description: row.definition.normalized || row.definition.label || "action",
          payload: {
            category: row.definition.normalized || row.definition.type || "public",
            actionName: row.definition.label,
            targetPlayerId,
            targetName,
            notes,
            day: currentDay,
            extra,
          },
        });
        break;
      }
    }
  });

  if (actionValidationFailed) {
    return;
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
  const day = currentGame?.day ?? 0;
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
  const day = currentGame?.day ?? 0;
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
  const day = currentGame?.day ?? 0;
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

function coerceBoolean(value, defaultValue = false) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return defaultValue;
    }
    if (["true", "yes", "1", "on", "open", "active"].includes(normalized)) {
      return true;
    }
    if (["false", "no", "0", "off", "closed", "inactive", "locked"].includes(normalized)) {
      return false;
    }
  }
  return defaultValue;
}

function getCurrentGameDay() {
  if (!currentGame) {
    return 0;
  }
  const rawDay = currentGame.day;
  if (typeof rawDay === "number") {
    return rawDay;
  }
  if (typeof rawDay === "string") {
    const parsed = parseInt(rawDay, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function hasGameDayStarted() {
  return getCurrentGameDay() > 0;
}

function isGameCurrentlyActive() {
  if (!currentGame) {
    return false;
  }
  if (Object.prototype.hasOwnProperty.call(currentGame, "active")) {
    return coerceBoolean(currentGame.active, true);
  }
  return true;
}

function isGameLockedForPlayers() {
  if (!currentGame) {
    return false;
  }
  if (Object.prototype.hasOwnProperty.call(currentGame, "locked")) {
    return coerceBoolean(currentGame.locked, false);
  }
  if (Object.prototype.hasOwnProperty.call(currentGame, "gamelocked")) {
    return coerceBoolean(currentGame.gamelocked, false);
  }
  if (Object.prototype.hasOwnProperty.call(currentGame, "open")) {
    return !coerceBoolean(currentGame.open, true);
  }
  return false;
}

function updatePlayerToolsFormsVisibility() {
  const joined = !!currentPlayer;
  const ownerView = isOwnerView;
  const playerActive = currentPlayer ? playerIsAlive(currentPlayer) : false;
  const gameActive = isGameCurrentlyActive();
  const dayStarted = hasGameDayStarted();
  const lockedForPlayer = isGameLockedForPlayers() && !ownerView;

  if (!joined && !ownerView) {
    setDisplay(els.privateActionForm, "none");
    setDisplay(els.voteRecordForm, "none");
    setDisplay(els.claimRecordForm, "none");
    setDisplay(els.notebookRecordForm, "none");
    hideReplacementControls();
    setPlayerToolsStatus("");
    return;
  }

  if (lockedForPlayer || !gameActive || !dayStarted || !playerActive) {
    setDisplay(els.privateActionForm, "none");
    setDisplay(els.voteRecordForm, "none");
    setDisplay(els.claimRecordForm, "none");
    setDisplay(els.notebookRecordForm, "none");
    hideReplacementControls();

    if (lockedForPlayer) {
      setPlayerToolsStatus("This game is currently locked.");
    } else if (!gameActive) {
      setPlayerToolsStatus("Private tools are disabled while the game is inactive.");
    } else if (!dayStarted) {
      setPlayerToolsStatus("Private tools unlock once Day 1 begins.");
    } else if (!playerActive && !ownerView) {
      setPlayerToolsStatus("");
    } else {
      setPlayerToolsStatus("");
    }
    return;
  }

  setPlayerToolsStatus("");

  const privateActionsAvailable = getAvailablePrivateActionNames().length > 0;
  setDisplay(els.privateActionForm, privateActionsAvailable ? "block" : "none");

  const hasVoteTargets = gamePlayers.some((player) => player.id !== currentPlayer?.id);
  setDisplay(els.voteRecordForm, hasVoteTargets ? "block" : "none");

  setDisplay(els.claimRecordForm, "block");

  const hasNotebookTargets = gamePlayers.length > 0;
  setDisplay(els.notebookRecordForm, hasNotebookTargets ? "block" : "none");

  if (!ownerView) {
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
  populatePublicActionTargets();
  updatePublicActionControls();
}

function updatePublicActionControls() {
  const block = els.publicActionsBlock;
  if (!block) {
    return;
  }
  const playerActive = currentPlayer ? playerIsAlive(currentPlayer) : false;
  const gameActive = isGameCurrentlyActive();
  const dayStarted = hasGameDayStarted();
  const lockedForPlayer = isGameLockedForPlayers() && !isOwnerView;
  const canUseActions =
    !!auth.currentUser &&
    (playerActive || isOwnerView) &&
    gameActive &&
    dayStarted &&
    !lockedForPlayer;
  if (!canUseActions) {
    block.style.display = "none";
    clearPublicActionSelections();
    setPublicActionsStatus("");
    return;
  }

  rebuildPublicActionsUI();
  populatePublicActionTargets();
  populateClaimRoleOptions();
  handleClaimRoleSelectChange();

  const hasVoteTargets = gamePlayers.some((player) => player.id !== currentPlayer?.id);
  const hasNotebookTargets = gamePlayers.length > 0;
  const hasClaimOptions = getKnownRoleNames().length > 0;

  let anyVisible = false;
  publicActionRows.forEach((row) => {
    let visible = true;
    switch (row.definition.type) {
      case "vote":
        visible = hasVoteTargets;
        break;
      case "unvote":
        visible = hasVoteTargets;
        break;
      case "claim":
        visible = hasClaimOptions;
        break;
      case "notebook":
        visible = hasNotebookTargets;
        break;
      default:
        if (row.definition.requiresTarget && row.definition.targetType === "player") {
          visible = gamePlayers.length > 0;
        }
        break;
    }
    setDisplay(row.root, visible ? "block" : "none");
    if (!visible) {
      if (row.checkbox) {
        row.checkbox.checked = false;
      }
      if (row.targetSelect) {
        row.targetSelect.value = "";
      }
      if (row.notesInput) {
        row.notesInput.value = "";
      }
      if (row.customInput) {
        row.customInput.value = "";
      }
    } else {
      anyVisible = true;
    }
  });

  block.style.display = anyVisible ? "block" : "none";
  if (!anyVisible) {
    setPublicActionsStatus("");
  }
}

function clearPublicActionSelections() {
  publicActionRows.forEach((row) => {
    if (row.checkbox) {
      row.checkbox.checked = false;
    }
    if (row.targetSelect) {
      row.targetSelect.value = "";
    }
    if (row.notesInput) {
      row.notesInput.value = "";
    }
    if (row.customInput) {
      row.customInput.value = "";
    }
  });
  handleClaimRoleSelectChange();
  setPublicActionsStatus("");
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

function computePublicActionDefinitions() {
  const definitions = BASE_PUBLIC_ACTION_DEFINITIONS.map((definition) => ({ ...definition }));
  const seen = new Set(definitions.map((definition) => definition.normalized));
  const visited = new WeakSet();

  function collectNotes(value) {
    const notes = [];
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (typeof entry === "string" && entry.trim()) {
          notes.push(entry.trim());
        }
      });
    } else if (typeof value === "string" && value.trim()) {
      notes.push(value.trim());
    }
    return notes;
  }

  function inspect(candidate) {
    if (!candidate) {
      return;
    }
    const typeOfCandidate = typeof candidate;
    if (typeOfCandidate === "string" || typeOfCandidate === "number" || typeOfCandidate === "boolean") {
      return;
    }
    if (Array.isArray(candidate)) {
      candidate.forEach(inspect);
      return;
    }
    if (typeOfCandidate !== "object") {
      return;
    }
    if (visited.has(candidate)) {
      return;
    }
    visited.add(candidate);

    const rawName =
      typeof candidate.actionName === "string"
        ? candidate.actionName
        : typeof candidate.name === "string"
        ? candidate.name
        : null;
    const normalized = normalizeActionName(rawName);
    if (normalized && !seen.has(normalized)) {
      const description = typeof candidate.description === "string" ? candidate.description : "";
      const likelyPrivate = description.toLowerCase().includes("moderator tracking");
      if (!likelyPrivate) {
        const targeted =
          candidate.targeted === true || normalizeActionName(candidate.target) === "player";
        const notes = collectNotes(candidate.notes);
        const timesPerGame = Number.isFinite(candidate.timesPerGame)
          ? candidate.timesPerGame
          : Number.isFinite(candidate.limit)
          ? candidate.limit
          : null;
        if (Number.isFinite(timesPerGame) && timesPerGame >= 0) {
          notes.push(
            timesPerGame === 1
              ? "Limited to 1 use per game."
              : `Limited to ${timesPerGame} uses per game.`
          );
        }
        const definition = {
          id: `custom-${normalized}`,
          type: "custom",
          label: candidate.name || candidate.actionName || candidate.actionType || rawName || "Action",
          normalized,
          requiresTarget: targeted,
          targetType: targeted ? "player" : null,
          allowsNotes: false,
          excludeCurrentPlayer: false,
        };
        if (notes.length) {
          definition.hint = notes.join(" ");
        }
        if (Number.isFinite(candidate.actionTypeId)) {
          definition.actionTypeId = candidate.actionTypeId;
        }
        if (typeof candidate.actionType === "string") {
          definition.actionType = candidate.actionType;
        }
        definitions.push(definition);
        seen.add(normalized);
      }
    }

    Object.values(candidate).forEach(inspect);
  }

  getActionRuleSources().forEach(inspect);

  return definitions;
}

function rebuildPublicActionsUI() {
  const container = els.publicActionsList;
  if (!container) {
    publicActionRows.clear();
    lastPublicActionsSignature = "";
    return;
  }
  const definitions = computePublicActionDefinitions();
  const signature = JSON.stringify(
    definitions.map((definition) => `${definition.id}:${definition.targetType || "none"}`)
  );
  if (signature !== lastPublicActionsSignature) {
    container.innerHTML = "";
    publicActionRows = new Map();
    definitions.forEach((definition) => {
      const row = createPublicActionRow(definition);
      if (row) {
        container.appendChild(row.root);
        publicActionRows.set(definition.id, row);
      }
    });
    lastPublicActionsSignature = signature;
  } else {
    definitions.forEach((definition) => {
      const row = publicActionRows.get(definition.id);
      if (!row) {
        return;
      }
      row.definition = definition;
      if (row.labelSpan) {
        row.labelSpan.textContent = ` ${definition.label}`;
      }
      if (row.hintEl) {
        if (definition.hint) {
          row.hintEl.textContent = definition.hint;
          row.hintEl.style.display = "block";
        } else {
          row.hintEl.textContent = "";
          row.hintEl.style.display = "none";
        }
      }
    });
  }
}

function getPublicActionRowById(id) {
  if (!id) {
    return null;
  }
  return publicActionRows.get(id) || null;
}

function createPublicActionRow(definition) {
  const root = document.createElement("div");
  root.className = "public-action-row";

  const label = document.createElement("label");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = `public-action-${definition.id}`;
  label.appendChild(checkbox);
  const labelSpan = document.createElement("span");
  labelSpan.textContent = ` ${definition.label}`;
  label.appendChild(labelSpan);
  root.appendChild(label);

  const row = {
    definition,
    root,
    checkbox,
    labelSpan,
  };

  if (definition.type === "claim") {
    const container = document.createElement("div");
    container.style.marginTop = "4px";
    const select = document.createElement("select");
    select.className = "bginput";
    select.addEventListener("change", handleClaimRoleSelectChange);
    container.appendChild(select);
    const customInput = document.createElement("input");
    customInput.className = "bginput";
    customInput.style.display = "none";
    customInput.style.marginTop = "6px";
    customInput.style.width = "250px";
    customInput.placeholder = "Enter role name";
    container.appendChild(customInput);
    row.roleSelect = select;
    row.customInput = customInput;
    root.appendChild(container);
  } else if (definition.type === "notebook") {
    const container = document.createElement("div");
    container.style.marginTop = "4px";
    const select = document.createElement("select");
    select.className = "bginput";
    container.appendChild(select);
    const notes = document.createElement("input");
    notes.className = "bginput";
    notes.style.marginTop = "6px";
    notes.style.width = "250px";
    notes.placeholder = "Notes (optional)";
    container.appendChild(notes);
    row.targetSelect = select;
    row.notesInput = notes;
    root.appendChild(container);
  } else if (definition.requiresTarget && definition.targetType === "player") {
    const container = document.createElement("div");
    container.style.marginTop = "4px";
    const select = document.createElement("select");
    select.className = "bginput";
    container.appendChild(select);
    row.targetSelect = select;
    root.appendChild(container);
  }

  if (definition.hint) {
    const hint = document.createElement("div");
    hint.className = "smallfont";
    hint.style.marginTop = "4px";
    hint.textContent = definition.hint;
    root.appendChild(hint);
    row.hintEl = hint;
  }

  if (definition.type === "vote") {
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        const unvoteRow = getPublicActionRowById("unvote");
        if (unvoteRow?.checkbox) {
          unvoteRow.checkbox.checked = false;
        }
      }
    });
  } else if (definition.type === "unvote") {
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        const voteRow = getPublicActionRowById("vote");
        if (voteRow?.checkbox) {
          voteRow.checkbox.checked = false;
        }
      }
    });
  }

  return row;
}

function populatePublicActionTargets() {
  publicActionRows.forEach((row) => {
    if (!row.targetSelect || row.definition.targetType !== "player") {
      return;
    }
    const select = row.targetSelect;
    const previous = select.value;
    const placeholder =
      row.definition.type === "vote" || row.definition.type === "notebook"
        ? "-- select player --"
        : "-- choose target --";
    select.innerHTML = "";
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = placeholder;
    select.appendChild(blank);
    gamePlayers.forEach((player) => {
      if (row.definition.excludeCurrentPlayer && player.id === currentPlayer?.id) {
        return;
      }
      const option = document.createElement("option");
      option.value = player.id;
      option.textContent = player.name;
      option.dataset.playerName = player.name;
      select.appendChild(option);
    });
    if (previous) {
      select.value = previous;
      if (select.value !== previous) {
        const normalizedPrevious = normalizeIdentifier(previous);
        const match = gamePlayers.find(
          (player) => normalizeIdentifier(player.id) === normalizedPrevious
        );
        if (match) {
          select.value = match.id;
        } else {
          select.value = "";
        }
      }
    }
  });
}

function handleClaimRoleSelectChange() {
  toggleClaimRoleCustom(els.claimRoleSelect, els.claimRoleCustom);
  const claimRow = getPublicActionRowById("claim");
  if (claimRow) {
    toggleClaimRoleCustom(claimRow.roleSelect, claimRow.customInput);
  }
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
  ];
  const publicClaimRow = getPublicActionRowById("claim");
  if (publicClaimRow?.roleSelect) {
    selects.push({ select: publicClaimRow.roleSelect, custom: publicClaimRow.customInput });
  }
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
  availableRoles = [...ROLE_NAMES];
  return availableRoles;
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

async function ensureActionsLoadedForDays(days = []) {
  if (!Array.isArray(days) || !days.length || missingConfig) {
    return;
  }
  const numericDays = days
    .map((value) => (Number.isFinite(value) ? value : null))
    .filter((value) => value !== null);
  const missing = numericDays.filter((day) => !actionsByDayCache.has(day));
  if (!missing.length) {
    return;
  }
  await Promise.all(
    missing.map(async (day) => {
      try {
        const snapshot = await getDocs(
          query(collection(db, "games", gameId, "actions"), where("day", "==", day))
        );
        const records = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        actionsByDayCache.set(day, records);
      } catch (error) {
        console.warn(`Failed to load actions for day ${day}`, error);
        actionsByDayCache.set(day, []);
      }
    })
  );
}

function getActionsForDay(day) {
  if (!Number.isFinite(day)) {
    return [];
  }
  return actionHistoryContext.actionsByDay.get(day) || [];
}

function isPlayerBlockedOnDay(playerId, day) {
  const normalizedPlayerId = normalizeIdentifier(playerId);
  if (!normalizedPlayerId) {
    return false;
  }
  return getActionsForDay(day).some((entry) => {
    if (entry.valid === false) {
      return false;
    }
    const type = normalizeActionName(entry.actionName || entry.category);
    if (type !== "block") {
      return false;
    }
    return normalizeIdentifier(entry.targetPlayerId) === normalizedPlayerId;
  });
}

function getFirstActionForPlayerOnDay(playerId, day, options = {}) {
  const { excludeTypes = [], excludeActionId = null, includeInvalid = false } = options;
  const normalizedPlayerId = normalizeIdentifier(playerId);
  if (!normalizedPlayerId) {
    return null;
  }
  const dayActions = getActionsForDay(day);
  const candidates = dayActions.filter((entry) => {
    if (!includeInvalid && entry.valid === false) {
      return false;
    }
    if (excludeActionId && entry.id === excludeActionId) {
      return false;
    }
    if (normalizeIdentifier(entry.playerId) !== normalizedPlayerId) {
      return false;
    }
    const type = normalizeActionName(entry.actionName || entry.category);
    if (excludeTypes.includes(type)) {
      return false;
    }
    return true;
  });
  if (!candidates.length) {
    return null;
  }
  candidates.sort(
    (a, b) => timestampToMillis(a.createdAt || a.updatedAt) - timestampToMillis(b.createdAt || b.updatedAt)
  );
  return candidates[0] || null;
}

function describeSeerResolution(action = {}) {
  const day = action.day ?? 0;
  const currentDay = currentGame?.day ?? 0;
  if (day === currentDay) {
    return null;
  }
  const actorId = action.playerId || currentUser?.uid || "";
  if (isPlayerBlockedOnDay(actorId, day)) {
    return "Blocked";
  }
  const targetId = action.targetPlayerId || "";
  const targetPlayer = findPlayerById(targetId);
  if (!targetPlayer) {
    return "Recorded";
  }
  const roleName = getAssignedRoleName(targetPlayer.data);
  const definition = getCanonicalRoleDefinition(roleName);
  if (definition?.id === "godfather") {
    return "Innocent";
  }
  const alignment = (definition?.alignment || targetPlayer.data?.alignment || "").trim().toLowerCase();
  if (alignment === "village") {
    return "Innocent";
  }
  if (alignment === "hostile") {
    return "Guilty";
  }
  if (alignment) {
    return alignment[0].toUpperCase() + alignment.slice(1);
  }
  return "Recorded";
}

function describeTrackerResolution(action = {}) {
  const day = action.day ?? 0;
  const currentDay = currentGame?.day ?? 0;
  if (day === currentDay) {
    return null;
  }
  const actorId = action.playerId || currentUser?.uid || "";
  if (isPlayerBlockedOnDay(actorId, day)) {
    return "Blocked";
  }
  const targetId = action.targetPlayerId || "";
  if (!targetId) {
    return "None";
  }
  const targetAction = getFirstActionForPlayerOnDay(targetId, day, {
    excludeTypes: ["vote", "mafiavote", "claim"],
    excludeActionId: action.id,
  });
  if (!targetAction) {
    return "None";
  }
  const visitedName =
    targetAction.targetName ||
    getPlayerDisplayName(targetAction.targetPlayerId) ||
    (targetAction.actionName ? targetAction.actionName : "");
  return visitedName ? visitedName : "Recorded";
}

function describeBlockResolution(action = {}) {
  const day = action.day ?? 0;
  const currentDay = currentGame?.day ?? 0;
  if (day === currentDay) {
    return null;
  }
  const actorId = action.playerId || currentUser?.uid || "";
  if (isPlayerBlockedOnDay(actorId, day)) {
    return "You were blocked";
  }
  const targetId = action.targetPlayerId || "";
  if (!targetId) {
    return "Blocked";
  }
  const targetAction = getFirstActionForPlayerOnDay(targetId, day, {
    excludeTypes: ["vote", "mafiavote", "claim"],
    excludeActionId: action.id,
  });
  if (!targetAction) {
    return "No action";
  }
  return "Blocked them";
}

function describeTrustResolution(action = {}) {
  return "Trusted";
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
  const normalizedAction = normalizeActionName(
    action.actionName || action.actionType || action.category
  );
  if (normalizedAction === "trust") {
    return describeTrustResolution(action);
  }
  if (normalizedAction === "seer") {
    const seerResult = describeSeerResolution(action);
    if (seerResult) {
      return seerResult;
    }
  }
  if (normalizedAction === "track") {
    const trackerResult = describeTrackerResolution(action);
    if (trackerResult) {
      return trackerResult;
    }
  }
  if (normalizedAction === "block") {
    const blockResult = describeBlockResolution(action);
    if (blockResult) {
      return blockResult;
    }
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
  const uniqueDays = Array.from(
    new Set(
      actions
        .map((action) => (Number.isFinite(action.day) ? action.day : null))
        .filter((day) => day !== null)
    )
  );
  actionHistoryContext.actionsByDay = new Map();
  if (uniqueDays.length) {
    await ensureActionsLoadedForDays(uniqueDays);
    uniqueDays.forEach((day) => {
      actionHistoryContext.actionsByDay.set(day, actionsByDayCache.get(day) || []);
    });
  }
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

function applyCanonicalRoleDefinition(updates, roleName) {
  if (!updates || typeof updates !== "object") {
    return;
  }
  ACTION_RULE_KEYS.forEach((key) => {
    updates[key] = deleteField();
  });
  updates.roleDefinition = deleteField();
  updates.roleDefinitionId = deleteField();
  updates.rules = deleteField();

  const definition = getCanonicalRoleDefinition(roleName);
  if (!definition) {
    return;
  }

  updates.roleDefinitionId = definition.id;
  const roleDefinition = {
    id: definition.id,
    name: definition.name,
  };
  if (definition.alignment) {
    roleDefinition.alignment = definition.alignment;
  }
  if (definition.summary) {
    roleDefinition.summary = definition.summary;
  }
  if (definition.winCondition) {
    roleDefinition.winCondition = definition.winCondition;
  }
  if (Array.isArray(definition.tags) && definition.tags.length) {
    roleDefinition.tags = [...definition.tags];
  }
  if (Array.isArray(definition.passiveAbilities) && definition.passiveAbilities.length) {
    roleDefinition.passiveAbilities = definition.passiveAbilities.map((passive) => ({
      ...passive,
    }));
  }

  const activeAbilities = definition.rules?.privateActions || [];
  if (activeAbilities.length) {
    const mapped = activeAbilities
      .map((action) => {
        const name = action.actionName || action.name || "";
        if (!name) {
          return null;
        }
        const ability = { name };
        if (action.description) {
          ability.description = action.description;
        }
        if (action.phase) {
          ability.phase = action.phase;
        }
        if (action.notes) {
          ability.notes = action.notes;
        }
        if (action.target) {
          ability.target = action.target;
        }
        if (Array.isArray(action.tags) && action.tags.length) {
          ability.tags = [...action.tags];
        }
        return ability;
      })
      .filter(Boolean);
    if (mapped.length) {
      roleDefinition.activeAbilities = mapped;
    }
  }

  if (!roleDefinition.winCondition) {
    delete roleDefinition.winCondition;
  }
  if (!roleDefinition.tags?.length) {
    delete roleDefinition.tags;
  }
  if (!roleDefinition.passiveAbilities?.length) {
    delete roleDefinition.passiveAbilities;
  }
  if (!roleDefinition.activeAbilities?.length) {
    delete roleDefinition.activeAbilities;
  }

  updates.roleDefinition = roleDefinition;
  const rulesClone = cloneCanonicalData(definition.rules);
  if (rulesClone) {
    updates.rules = rulesClone;
  }
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
  applyCanonicalRoleDefinition(updates, roleValue);
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
      delete baseData.joinedAt;
      delete baseData.createdAt;
      transaction.set(newRef, {
        ...baseData,
        uid: newUserId,
        name: newName,
        username: newName,
        replacedFrom: playerId,
        joinedAt: serverTimestamp(),
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
