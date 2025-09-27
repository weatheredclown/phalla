import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  getDoc,
  increment,
  getDocs,
  setDoc,
  where,
  deleteField,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDLVQ_ncruYo7Xd0tCzh8RIvlmzhrQYt_8",
  authDomain: "mafia-c37ad.firebaseapp.com",
  projectId: "mafia-c37ad",
  storageBucket: "mafia-c37ad.firebasestorage.app",
  messagingSenderId: "7209477847",
  appId: "1:7209477847:web:19dd92af0e42324b62f292"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

const missingConfig = Object.values(firebaseConfig).some(
  (value) => typeof value === "string" && value.startsWith("YOUR_")
);

if (missingConfig) {
  const warning = document.createElement("aside");
  warning.className = "config-warning";
  warning.innerHTML = `
    <strong>Firebase configuration required</strong>
    <p>
      Replace the <code>YOUR_*</code> values in <code>public/script.js</code> with
      your Firebase web app credentials. See <code>madia.new/README.md</code> for
      detailed setup instructions.
    </p>
  `;
  document.body.prepend(warning);
}

const els = {
  authStatus: document.getElementById("authStatus"),
  signInButton: document.getElementById("signInButton"),
  signOutButton: document.getElementById("signOutButton"),
  newThreadButton: document.getElementById("newThreadButton"),
  threadsList: document.getElementById("threadsList"),
  threadTitle: document.getElementById("threadTitle"),
  threadMetadata: document.getElementById("threadMetadata"),
  postsList: document.getElementById("postsList"),
  replyForm: document.getElementById("replyForm"),
  replyBody: document.getElementById("replyBody"),
  cancelReplyButton: document.getElementById("cancelReplyButton"),
  deleteThread: document.getElementById("deleteThread"),
  refreshThread: document.getElementById("refreshThread"),
  recordVoteButton: document.getElementById("recordVoteButton"),
  voteTableBody: document.querySelector("#voteTable tbody"),
  threadDialog: document.getElementById("threadDialog"),
  threadForm: document.getElementById("threadForm"),
  threadTitleInput: document.getElementById("threadTitleInput"),
  threadBodyInput: document.getElementById("threadBodyInput"),
  voteDialog: document.getElementById("voteDialog"),
  voteForm: document.getElementById("voteForm"),
  votePlayerInput: document.getElementById("votePlayerInput"),
  voteCountInput: document.getElementById("voteCountInput"),
  voteNotesInput: document.getElementById("voteNotesInput"),
  gameStatus: document.getElementById("gameStatus"),
  gameMetadataForm: document.getElementById("gameMetadataForm"),
  gameSelect: document.getElementById("gameSelect"),
  gameNameInput: document.getElementById("gameNameInput"),
  gameDayInput: document.getElementById("gameDayInput"),
  gamePhaseInput: document.getElementById("gamePhaseInput"),
  gameOpenInput: document.getElementById("gameOpenInput"),
  gameActiveInput: document.getElementById("gameActiveInput"),
  phaseToggleOpenButton: document.getElementById("phaseToggleOpenButton"),
  phaseToggleActiveButton: document.getElementById("phaseToggleActiveButton"),
  phaseNextDayButton: document.getElementById("phaseNextDayButton"),
  phaseSetDayButton: document.getElementById("phaseSetDayButton"),
  phaseSetNightButton: document.getElementById("phaseSetNightButton"),
  refreshGameButton: document.getElementById("refreshGameButton"),
  rosterStatus: document.getElementById("rosterStatus"),
  rosterTableBody: document.getElementById("rosterTableBody"),
};

if (missingConfig) {
  els.authStatus.textContent = "Firebase project not configured";
  els.signInButton.disabled = true;
  els.signOutButton.disabled = true;
  els.newThreadButton.disabled = true;
  els.recordVoteButton.disabled = true;
  if (els.gameMetadataForm) {
    els.gameMetadataForm.classList.add("disabled");
  }
  if (els.gameSelect) {
    els.gameSelect.disabled = true;
  }
  [
    els.phaseToggleOpenButton,
    els.phaseToggleActiveButton,
    els.phaseNextDayButton,
    els.phaseSetDayButton,
    els.phaseSetNightButton,
    els.refreshGameButton,
  ].forEach((button) => {
    if (button) {
      button.disabled = true;
    }
  });
  if (els.rosterTableBody) {
    els.rosterTableBody.innerHTML = "";
  }
  if (els.gameStatus) {
    setStatusMessage(els.gameStatus, "Configure Firebase to manage games.", "error");
  }
  if (els.rosterStatus) {
    setStatusMessage(els.rosterStatus, "", "info");
  }
  const main = document.querySelector("main");
  if (main) {
    main.innerHTML = `<p class="empty-state">Configure Firebase to load threads and game data.</p>`;
  }
}

let currentUser = null;
let currentUserProfile = null;
let selectedThreadId = null;
let unsubscribePosts = null;
let unsubscribeThreads = null;
let unsubscribeVotes = null;
let unsubscribeProfile = null;
let unsubscribeGameDoc = null;
let unsubscribeRoster = null;
let activeGameId = null;
let currentGameData = null;
let ownedGames = [];

async function ensurePlayerRecord(user) {
  if (!user) return null;
  const userRef = doc(db, "users", user.uid);
  let snapshot;
  try {
    snapshot = await getDoc(userRef);
  } catch (error) {
    console.error("Failed to load user profile", error);
    return null;
  }

  if (!snapshot.exists()) {
    try {
      const timestamp = serverTimestamp();
      const profile = {
        uid: user.uid,
        displayName: user.displayName || "",
        email: user.email || "",
        photoURL: user.photoURL || "",
        provider: user.providerData?.[0]?.providerId || "google.com",
      };
      await setDoc(userRef, {
        ...profile,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      return profile;
    } catch (error) {
      console.error("Failed to create user profile", error);
    }
    return null;
  }

  const data = snapshot.data() || {};
  const updates = {};
  if (!data.displayName && user.displayName) {
    updates.displayName = user.displayName;
  }
  if (!data.photoURL && user.photoURL) {
    updates.photoURL = user.photoURL;
  }
  if (!data.email && user.email) {
    updates.email = user.email;
  }

  if (Object.keys(updates).length) {
    try {
      await setDoc(
        userRef,
        {
          ...updates,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Failed to update user profile", error);
    }
    return { ...data, ...updates };
  }

  return data;
}

function stopProfileSubscription() {
  if (unsubscribeProfile) {
    unsubscribeProfile();
    unsubscribeProfile = null;
  }
}

function getCurrentDisplayName() {
  const profileName = (currentUserProfile?.displayName || "").trim();
  if (profileName) {
    return profileName;
  }
  const authName = (currentUser?.displayName || "").trim();
  if (authName) {
    return authName;
  }
  const email = (currentUser?.email || "").trim();
  if (email) {
    return email.split("@")[0];
  }
  const uid = (currentUser?.uid || "").trim();
  if (uid) {
    return uid;
  }
  return "Unknown";
}

function updateAuthDisplay() {
  if (!els.authStatus) return;
  if (currentUser) {
    els.authStatus.textContent = `Signed in as ${getCurrentDisplayName()}`;
  } else {
    els.authStatus.textContent = "Not signed in";
  }
}

function watchUserProfile(user) {
  if (!user) return null;
  return onSnapshot(
    doc(db, "users", user.uid),
    (snapshot) => {
      currentUserProfile = snapshot.exists() ? snapshot.data() || null : null;
      updateAuthDisplay();
    },
    (error) => {
      console.error("Failed to watch user profile", error);
    }
  );
}

function setStatusMessage(element, message, type = "info") {
  if (!element) {
    return;
  }
  element.textContent = message || "";
  element.classList.remove("success", "error", "info");
  if (message) {
    element.classList.add(type);
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

function showThreadsMessage(message) {
  if (!els.threadsList) return;
  els.threadsList.innerHTML = "";
  const li = document.createElement("li");
  li.className = "empty-message";
  li.textContent = message;
  li.tabIndex = -1;
  li.setAttribute("role", "status");
  li.style.listStyle = "none";
  li.style.cursor = "default";
  els.threadsList.appendChild(li);
}

function showPostsMessage(message) {
  if (!els.postsList) return;
  els.postsList.innerHTML = "";
  const li = document.createElement("li");
  li.className = "empty-message";
  li.textContent = message;
  li.tabIndex = -1;
  li.setAttribute("role", "status");
  li.style.listStyle = "none";
  li.style.cursor = "default";
  els.postsList.appendChild(li);
}

function showVotesMessage(message) {
  if (!els.voteTableBody) return;
  els.voteTableBody.innerHTML = "";
  const tr = document.createElement("tr");
  tr.className = "table-empty";
  const td = document.createElement("td");
  td.colSpan = 3;
  td.textContent = message;
  td.setAttribute("role", "status");
  td.style.padding = "1rem";
  tr.appendChild(td);
  els.voteTableBody.appendChild(tr);
}

function resetThreadSelection(message, postsMessage = "Select a thread to view posts.") {
  selectedThreadId = null;
  if (unsubscribePosts) {
    unsubscribePosts();
    unsubscribePosts = null;
  }
  els.threadTitle.textContent = message;
  els.threadMetadata.textContent = "";
  showPostsMessage(postsMessage);
  if (els.replyBody) {
    els.replyBody.value = "";
  }
  if (els.replyForm) {
    els.replyForm.hidden = true;
  }
}

function stopRealtimeSubscriptions({ showSignedOutState = false } = {}) {
  if (unsubscribeThreads) {
    unsubscribeThreads();
    unsubscribeThreads = null;
  }
  if (unsubscribeVotes) {
    unsubscribeVotes();
    unsubscribeVotes = null;
  }
  if (unsubscribePosts) {
    unsubscribePosts();
    unsubscribePosts = null;
  }
  if (showSignedOutState) {
    showThreadsMessage("Sign in to view threads.");
    showVotesMessage("Sign in to see recorded votes.");
    resetThreadSelection("Sign in to view a thread", "Sign in to view posts.");
  }
}

function stopGameSubscriptions() {
  if (unsubscribeGameDoc) {
    unsubscribeGameDoc();
    unsubscribeGameDoc = null;
  }
  if (unsubscribeRoster) {
    unsubscribeRoster();
    unsubscribeRoster = null;
  }
}

function enableGameControls() {
  const disabled =
    missingConfig ||
    !currentUser ||
    !activeGameId ||
    !currentGameData;
  const inputs = [
    els.gameNameInput,
    els.gameDayInput,
    els.gamePhaseInput,
    els.gameOpenInput,
    els.gameActiveInput,
  ];
  inputs.forEach((input) => {
    if (input) {
      input.disabled = disabled;
    }
  });
  const buttons = [
    els.phaseToggleOpenButton,
    els.phaseToggleActiveButton,
    els.phaseNextDayButton,
    els.phaseSetDayButton,
    els.phaseSetNightButton,
    els.refreshGameButton,
  ];
  buttons.forEach((button) => {
    if (button) {
      button.disabled = disabled;
    }
  });
  if (els.gameMetadataForm) {
    if (disabled) {
      els.gameMetadataForm.classList.add("disabled");
    } else {
      els.gameMetadataForm.classList.remove("disabled");
    }
  }
  if (els.rosterTableBody) {
    Array.from(els.rosterTableBody.querySelectorAll("input, textarea, select, button")).forEach(
      (element) => {
        element.disabled = disabled;
      }
    );
  }
  if (els.gameSelect) {
    els.gameSelect.disabled = missingConfig || !currentUser;
  }
}

function resetGameManagementUI({ signedOut = false } = {}) {
  stopGameSubscriptions();
  activeGameId = null;
  currentGameData = null;
  if (els.gameSelect) {
    els.gameSelect.value = "";
    els.gameSelect.disabled = missingConfig || !currentUser;
  }
  if (els.gameNameInput) {
    els.gameNameInput.value = "";
  }
  if (els.gameDayInput) {
    els.gameDayInput.value = "0";
  }
  if (els.gamePhaseInput) {
    els.gamePhaseInput.value = "";
  }
  if (els.gameOpenInput) {
    els.gameOpenInput.checked = false;
  }
  if (els.gameActiveInput) {
    els.gameActiveInput.checked = false;
  }
  if (els.rosterTableBody) {
    els.rosterTableBody.innerHTML = "";
  }
  if (els.rosterStatus) {
    setStatusMessage(
      els.rosterStatus,
      signedOut ? "Sign in to view the roster." : "Select a game to view the roster.",
      "info"
    );
  }
  if (els.gameStatus) {
    setStatusMessage(
      els.gameStatus,
      signedOut ? "Sign in to manage games." : "Select a game to edit metadata.",
      "info"
    );
  }
  enableGameControls();
}

function getPlayerDisplayName(data = {}) {
  return (
    data.displayName ||
    data.name ||
    data.username ||
    data.playerName ||
    data.email ||
    data.id ||
    "Unknown"
  );
}

function sortRosterPlayers(players = []) {
  return players
    .slice()
    .sort((a, b) => {
      const orderA =
        typeof a.order === "number"
          ? a.order
          : typeof a.joinOrder === "number"
          ? a.joinOrder
          : Number.POSITIVE_INFINITY;
      const orderB =
        typeof b.order === "number"
          ? b.order
          : typeof b.joinOrder === "number"
          ? b.joinOrder
          : Number.POSITIVE_INFINITY;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      const nameA = getPlayerDisplayName(a).toLowerCase();
      const nameB = getPlayerDisplayName(b).toLowerCase();
      return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
    });
}

async function loadOwnedGames() {
  if (missingConfig || !els.gameSelect || !currentUser) {
    return;
  }
  setStatusMessage(els.gameStatus, "Loading owned games…", "info");
  els.gameSelect.disabled = true;
  try {
    const gamesRef = collection(db, "games");
    let snapshot;
    try {
      snapshot = await getDocs(query(gamesRef, where("ownerUserId", "==", currentUser.uid)));
    } catch (error) {
      console.warn("Owner query failed, falling back to client filter", error);
      snapshot = await getDocs(gamesRef);
    }
    ownedGames = snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() || {}) }))
      .filter((game) => game.ownerUserId === currentUser.uid);
    ownedGames.sort((a, b) =>
      (a.gamename || "").localeCompare(b.gamename || "", undefined, { sensitivity: "base" })
    );
    populateGameSelect();
    if (!ownedGames.length) {
      setStatusMessage(
        els.gameStatus,
        "No owned games found. Create a game in the legacy UI to begin.",
        "info"
      );
    } else {
      setStatusMessage(els.gameStatus, "Select a game to manage its roster.", "info");
    }
  } catch (error) {
    console.error("Failed to load games", error);
    setStatusMessage(els.gameStatus, "Unable to load owned games.", "error");
  } finally {
    els.gameSelect.disabled = false;
  }
}

function populateGameSelect() {
  if (!els.gameSelect) {
    return;
  }
  const previous = activeGameId;
  els.gameSelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = ownedGames.length ? "Select a game…" : "No games found";
  els.gameSelect.appendChild(placeholder);
  ownedGames.forEach((game) => {
    const option = document.createElement("option");
    option.value = game.id;
    option.textContent = game.gamename || game.id;
    if (game.id === previous) {
      option.selected = true;
    }
    els.gameSelect.appendChild(option);
  });
  if (previous && !ownedGames.some((game) => game.id === previous)) {
    resetGameManagementUI();
  }
}

function handleGameSelection(event) {
  const value = event?.target?.value || "";
  if (!value) {
    resetGameManagementUI();
    return;
  }
  subscribeToGame(value);
}

function applyGameDataToForm(data = {}) {
  if (els.gameNameInput) {
    els.gameNameInput.value = data.gamename || "";
  }
  if (els.gameDayInput) {
    const dayValue = Number.isFinite(data.day) ? data.day : 0;
    els.gameDayInput.value = String(dayValue);
  }
  if (els.gamePhaseInput) {
    els.gamePhaseInput.value = data.phase || data.phaseLabel || "";
  }
  if (els.gameOpenInput) {
    els.gameOpenInput.checked = !!data.open;
  }
  if (els.gameActiveInput) {
    els.gameActiveInput.checked = !!data.active;
  }
  enableGameControls();
}

function subscribeToGame(gameId) {
  if (!gameId) {
    resetGameManagementUI();
    return;
  }
  stopGameSubscriptions();
  activeGameId = gameId;
  currentGameData = null;
  setStatusMessage(els.gameStatus, "Loading game…", "info");
  const gameRef = doc(db, "games", gameId);
  unsubscribeGameDoc = onSnapshot(
    gameRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        setStatusMessage(els.gameStatus, "Game not found.", "error");
        resetGameManagementUI();
        return;
      }
      currentGameData = { id: snapshot.id, ...(snapshot.data() || {}) };
      applyGameDataToForm(currentGameData);
      setStatusMessage(
        els.gameStatus,
        `Managing ${currentGameData.gamename || currentGameData.id}.`,
        "success"
      );
    },
    (error) => {
      console.error("Failed to watch game metadata", error);
      setStatusMessage(els.gameStatus, "Unable to load game metadata.", "error");
    }
  );
  startRosterSubscription(gameId);
}

function startRosterSubscription(gameId) {
  if (!els.rosterTableBody) {
    return;
  }
  if (!gameId) {
    resetGameManagementUI();
    return;
  }
  if (unsubscribeRoster) {
    unsubscribeRoster();
    unsubscribeRoster = null;
  }
  setStatusMessage(els.rosterStatus, "Loading roster…", "info");
  const playersRef = collection(db, "games", gameId, "players");
  unsubscribeRoster = onSnapshot(
    playersRef,
    (snapshot) => {
      const players = [];
      snapshot.forEach((docSnap) => {
        players.push({ id: docSnap.id, ...(docSnap.data() || {}) });
      });
      renderRoster(players);
    },
    (error) => {
      console.error("Failed to watch roster", error);
      setStatusMessage(els.rosterStatus, "Unable to load roster.", "error");
      if (els.rosterTableBody) {
        els.rosterTableBody.innerHTML = "";
      }
    }
  );
}

function renderRoster(players = []) {
  if (!els.rosterTableBody) {
    return;
  }
  const sorted = sortRosterPlayers(players);
  els.rosterTableBody.innerHTML = "";
  if (!sorted.length) {
    const emptyRow = document.createElement("tr");
    const emptyCell = document.createElement("td");
    emptyCell.colSpan = 7;
    emptyCell.textContent = "No players joined yet.";
    emptyCell.style.textAlign = "center";
    emptyRow.appendChild(emptyCell);
    els.rosterTableBody.appendChild(emptyRow);
    setStatusMessage(els.rosterStatus, "No players joined yet.", "info");
    enableGameControls();
    return;
  }
  sorted.forEach((player) => {
    const row = document.createElement("tr");
    row.dataset.playerId = player.id;

    const nameCell = document.createElement("td");
    nameCell.innerHTML = `
      <div class="roster-name">${escapeHtml(getPlayerDisplayName(player))}</div>
      <div class="roster-meta">${escapeHtml(player.id)}</div>
    `;
    row.appendChild(nameCell);

    const roleCell = document.createElement("td");
    const roleInput = document.createElement("input");
    roleInput.type = "text";
    roleInput.className = "roster-role";
    roleInput.placeholder = "Unassigned";
    roleInput.value = (player.role || player.rolename || "").trim();
    roleCell.appendChild(roleInput);
    row.appendChild(roleCell);

    const alignmentCell = document.createElement("td");
    const alignmentInput = document.createElement("input");
    alignmentInput.type = "text";
    alignmentInput.className = "roster-alignment";
    alignmentInput.placeholder = "Alignment";
    alignmentInput.value =
      player.alignment || player.roleAlignment || player.roleDefinition?.alignment || "";
    alignmentCell.appendChild(alignmentInput);
    row.appendChild(alignmentCell);

    const statusCell = document.createElement("td");
    const statusSelect = document.createElement("select");
    statusSelect.className = "roster-status";
    [
      { value: "alive", label: "Alive" },
      { value: "eliminated", label: "Eliminated" },
    ].forEach((optionDef) => {
      const option = document.createElement("option");
      option.value = optionDef.value;
      option.textContent = optionDef.label;
      statusSelect.appendChild(option);
    });
    statusSelect.value = playerIsAlive(player) ? "alive" : "eliminated";
    statusCell.appendChild(statusSelect);
    row.appendChild(statusCell);

    const postsCell = document.createElement("td");
    const postsInput = document.createElement("input");
    postsInput.type = "number";
    postsInput.className = "roster-posts";
    postsInput.min = "-1";
    postsInput.placeholder = "∞";
    if (typeof player.postsLeft === "number" && Number.isFinite(player.postsLeft)) {
      postsInput.value = String(player.postsLeft);
    }
    postsCell.appendChild(postsInput);
    row.appendChild(postsCell);

    const notesCell = document.createElement("td");
    const notesInput = document.createElement("textarea");
    notesInput.className = "roster-notes";
    notesInput.rows = 2;
    notesInput.placeholder = "Moderator notes";
    notesInput.value = player.modNotes || player.notes || "";
    notesCell.appendChild(notesInput);
    row.appendChild(notesCell);

    const actionsCell = document.createElement("td");
    actionsCell.className = "actions";
    const actionWrapper = document.createElement("div");
    actionWrapper.className = "roster-actions";
    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.className = "secondary";
    resetButton.dataset.action = "reset";
    resetButton.textContent = "Reset";
    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "primary";
    saveButton.dataset.action = "save";
    saveButton.textContent = "Save";
    actionWrapper.appendChild(resetButton);
    actionWrapper.appendChild(saveButton);
    actionsCell.appendChild(actionWrapper);
    row.appendChild(actionsCell);

    row.dataset.originalRole = roleInput.value;
    row.dataset.originalAlignment = alignmentInput.value;
    row.dataset.originalStatus = statusSelect.value;
    row.dataset.originalPosts = postsInput.value || "";
    row.dataset.originalNotes = notesInput.value;

    els.rosterTableBody.appendChild(row);
  });
  setStatusMessage(
    els.rosterStatus,
    `${sorted.length} player${sorted.length === 1 ? "" : "s"} loaded.`,
    "info"
  );
  enableGameControls();
}

async function manualRefreshGame() {
  if (!currentUser) {
    setStatusMessage(els.gameStatus, "Sign in to manage games.", "error");
    return;
  }
  if (!activeGameId) {
    setStatusMessage(els.gameStatus, "Select a game to refresh.", "info");
    return;
  }
  try {
    const gameRef = doc(db, "games", activeGameId);
    const snapshot = await getDoc(gameRef);
    if (snapshot.exists()) {
      currentGameData = { id: snapshot.id, ...(snapshot.data() || {}) };
      applyGameDataToForm(currentGameData);
      setStatusMessage(els.gameStatus, "Game metadata refreshed.", "success");
    } else {
      setStatusMessage(els.gameStatus, "Game no longer exists.", "error");
    }
    const playersSnapshot = await getDocs(collection(gameRef, "players"));
    const players = playersSnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() || {}),
    }));
    renderRoster(players);
    setStatusMessage(els.rosterStatus, "Roster refreshed.", "success");
  } catch (error) {
    console.error("Failed to refresh game", error);
    setStatusMessage(els.gameStatus, "Unable to refresh game data.", "error");
  }
}

async function updateGameMetadata(event) {
  event.preventDefault();
  if (!currentUser) {
    alert("Sign in to manage games.");
    return;
  }
  if (!activeGameId) {
    setStatusMessage(els.gameStatus, "Select a game first.", "error");
    return;
  }
  const updates = { updatedAt: serverTimestamp() };
  const nameValue = (els.gameNameInput?.value || "").trim();
  updates.gamename = nameValue;
  const dayValue = parseInt(els.gameDayInput?.value || "0", 10);
  updates.day = Number.isFinite(dayValue) && dayValue >= 0 ? dayValue : 0;
  const phaseValue = (els.gamePhaseInput?.value || "").trim();
  updates.phase = phaseValue ? phaseValue : deleteField();
  if (els.gameOpenInput) {
    updates.open = !!els.gameOpenInput.checked;
  }
  if (els.gameActiveInput) {
    updates.active = !!els.gameActiveInput.checked;
  }
  try {
    await updateDoc(doc(db, "games", activeGameId), updates);
    setStatusMessage(els.gameStatus, "Metadata updated.", "success");
  } catch (error) {
    console.error("Failed to update metadata", error);
    setStatusMessage(els.gameStatus, "Unable to update metadata.", "error");
  }
}

async function triggerPhaseAction(action, value = "") {
  if (!currentUser) {
    alert("Sign in to manage games.");
    return;
  }
  if (!activeGameId || !currentGameData) {
    setStatusMessage(els.gameStatus, "Select a game first.", "error");
    return;
  }
  const patch = { updatedAt: serverTimestamp() };
  let message = "";
  if (action === "toggleOpen") {
    const next = !currentGameData.open;
    patch.open = next;
    message = next ? "Game opened to new players." : "Game closed to new players.";
  } else if (action === "toggleActive") {
    const next = !currentGameData.active;
    patch.active = next;
    message = next ? "Game marked active." : "Game marked inactive.";
  } else if (action === "nextDay") {
    const nextDay = (currentGameData.day ?? 0) + 1;
    patch.day = nextDay;
    message = `Advanced to day ${nextDay}.`;
  } else if (action === "setPhase") {
    const trimmed = (value || "").trim();
    if (trimmed) {
      patch.phase = trimmed;
      message = `Phase set to ${trimmed}.`;
    } else {
      patch.phase = deleteField();
      message = "Phase cleared.";
    }
  }
  try {
    await updateDoc(doc(db, "games", activeGameId), patch);
    setStatusMessage(els.gameStatus, message, "success");
  } catch (error) {
    console.error("Failed to apply phase action", error);
    setStatusMessage(els.gameStatus, "Unable to update phase controls.", "error");
  }
}

async function handleRosterSave(row, playerId) {
  if (!currentUser) {
    alert("Sign in to manage games.");
    return;
  }
  if (!activeGameId) {
    setStatusMessage(els.rosterStatus, "Select a game first.", "error");
    return;
  }
  const roleValue = (row.querySelector(".roster-role")?.value || "").trim();
  const alignmentValue = (row.querySelector(".roster-alignment")?.value || "").trim();
  const statusValue = row.querySelector(".roster-status")?.value || "alive";
  const postsValueRaw = row.querySelector(".roster-posts")?.value || "";
  const notesValue = (row.querySelector(".roster-notes")?.value || "").trim();
  const postsValue = parseInt(postsValueRaw, 10);
  const updates = { updatedAt: serverTimestamp() };
  updates.active = statusValue === "alive";
  updates.alive = statusValue === "alive";
  updates.postsLeft = Number.isFinite(postsValue) ? postsValue : -1;
  if (roleValue) {
    updates.role = roleValue;
    updates.rolename = roleValue;
  } else {
    updates.role = deleteField();
    updates.rolename = deleteField();
  }
  if (alignmentValue) {
    updates.alignment = alignmentValue;
  } else {
    updates.alignment = deleteField();
  }
  if (notesValue) {
    updates.modNotes = notesValue;
  } else {
    updates.modNotes = deleteField();
  }
  try {
    await updateDoc(doc(db, "games", activeGameId, "players", playerId), updates);
    setStatusMessage(els.rosterStatus, "Player updated.", "success");
  } catch (error) {
    console.error("Failed to update player", error);
    setStatusMessage(els.rosterStatus, "Unable to update player.", "error");
  }
}

function handleRosterReset(row) {
  const roleInput = row.querySelector(".roster-role");
  const alignmentInput = row.querySelector(".roster-alignment");
  const statusSelect = row.querySelector(".roster-status");
  const postsInput = row.querySelector(".roster-posts");
  const notesInput = row.querySelector(".roster-notes");
  if (roleInput) {
    roleInput.value = row.dataset.originalRole || "";
  }
  if (alignmentInput) {
    alignmentInput.value = row.dataset.originalAlignment || "";
  }
  if (statusSelect) {
    statusSelect.value = row.dataset.originalStatus || "alive";
  }
  if (postsInput) {
    postsInput.value = row.dataset.originalPosts || "";
  }
  if (notesInput) {
    notesInput.value = row.dataset.originalNotes || "";
  }
  setStatusMessage(els.rosterStatus, "Row reset.", "info");
}

function startRealtimeSubscriptions() {
  if (missingConfig || !currentUser) return;
  stopRealtimeSubscriptions();
  unsubscribeThreads = watchThreads();
  unsubscribeVotes = watchVotes();
}

function requireAuth(action) {
  return (...args) => {
    if (!currentUser) {
      alert("Sign in to perform this action.");
      return;
    }
    action(...args);
  };
}

function renderThread(threadId, data) {
  const li = document.createElement("li");
  li.dataset.id = threadId;
  li.innerHTML = `
    <div class="thread-title">${data.title}</div>
    <div class="thread-meta">Created by ${data.createdByName || "Unknown"} · ${formatTimestamp(
    data.createdAt
  )}</div>
    <div class="thread-count">${data.postCount || 1} posts</div>
  `;
  if (threadId === selectedThreadId) {
    li.classList.add("active");
  }
  li.addEventListener("click", () => {
    selectThread(threadId);
  });
  return li;
}

function formatTimestamp(timestamp) {
  if (!timestamp) return "just now";
  const date = timestamp.toDate ? timestamp.toDate() : timestamp;
  return date.toLocaleString();
}

async function selectThread(threadId) {
  if (!currentUser) {
    alert("Sign in to view threads.");
    return;
  }
  if (unsubscribePosts) {
    unsubscribePosts();
    unsubscribePosts = null;
  }
  selectedThreadId = threadId;
  els.postsList.innerHTML = "";
  els.threadTitle.textContent = "Loading thread...";
  els.threadMetadata.textContent = "";
  els.deleteThread.hidden = true;
  els.replyForm.hidden = !currentUser;

  const threadRef = doc(db, "threads", threadId);
  let snapshot;
  try {
    snapshot = await getDoc(threadRef);
  } catch (error) {
    console.error("Failed to load thread", error);
    if (error.code === "permission-denied") {
      showThreadsMessage("You do not have permission to view this thread.");
      resetThreadSelection(
        "Access denied",
        "You do not have permission to view posts in this thread."
      );
      return;
    }
    alert("Unable to load thread. Try again later.");
    resetThreadSelection("Select a thread");
    return;
  }
  if (!snapshot.exists()) {
    els.threadTitle.textContent = "Thread not found";
    return;
  }
  const thread = snapshot.data();
  els.threadTitle.textContent = thread.title;
  els.threadMetadata.textContent = `Created by ${
    thread.createdByName || "Unknown"
  } on ${formatTimestamp(thread.createdAt)}`;
  els.deleteThread.hidden = !currentUser || thread.createdBy !== currentUser.uid;

  unsubscribePosts = onSnapshot(
    query(collection(threadRef, "posts"), orderBy("createdAt", "asc")),
    (snapshot) => {
      els.postsList.innerHTML = "";
      snapshot.forEach((docSnapshot) => {
        const post = docSnapshot.data();
        const li = document.createElement("li");
        li.innerHTML = `
          <div class="post-author">${post.authorName || "Unknown"}</div>
          <div class="post-body">${post.body || ""}</div>
          <div class="post-meta">${formatTimestamp(post.createdAt)}</div>
        `;
        els.postsList.appendChild(li);
      });
    }
  );
}

function watchThreads() {
  const threadsRef = collection(db, "threads");
  const threadsQuery = query(threadsRef, orderBy("createdAt", "desc"));
  showThreadsMessage("Loading threads…");
  return onSnapshot(
    threadsQuery,
    (snapshot) => {
      els.threadsList.innerHTML = "";
      if (snapshot.empty) {
        showThreadsMessage("No threads yet. Be the first to start one!");
        return;
      }
      snapshot.forEach((docSnapshot) => {
        const thread = docSnapshot.data();
        const li = renderThread(docSnapshot.id, thread);
        els.threadsList.appendChild(li);
      });
    },
    (error) => {
      console.error("Failed to watch threads", error);
      if (error.code === "permission-denied") {
        showThreadsMessage("You do not have permission to view threads.");
        return;
      }
      showThreadsMessage("Unable to load threads. Please try again later.");
    }
  );
}

async function createThread(title, body) {
  const threadsRef = collection(db, "threads");
  const displayName = getCurrentDisplayName();
  const newThread = await addDoc(threadsRef, {
    title,
    createdBy: currentUser.uid,
    createdByName: displayName,
    createdAt: serverTimestamp(),
    postCount: 1,
  });
  const postRef = collection(db, "threads", newThread.id, "posts");
  await addDoc(postRef, {
    author: currentUser.uid,
    authorName: displayName,
    body,
    createdAt: serverTimestamp(),
  });
  selectThread(newThread.id);
}

async function deleteCurrentThread() {
  if (!selectedThreadId) return;
  if (!confirm("Delete this thread? This cannot be undone.")) return;
  const postsRef = collection(db, "threads", selectedThreadId, "posts");
  const postsSnapshot = await getDocs(postsRef);
  await Promise.all(postsSnapshot.docs.map((docSnapshot) => deleteDoc(docSnapshot.ref)));
  await deleteDoc(doc(db, "threads", selectedThreadId));
  resetThreadSelection("Select a thread");
}

async function submitReply(event) {
  event.preventDefault();
  if (!selectedThreadId) return;
  const body = els.replyBody.value.trim();
  if (!body) return;
  const displayName = getCurrentDisplayName();
  const postRef = collection(db, "threads", selectedThreadId, "posts");
  await addDoc(postRef, {
    author: currentUser.uid,
    authorName: displayName,
    body,
    createdAt: serverTimestamp(),
  });
  els.replyBody.value = "";
  const threadRef = doc(db, "threads", selectedThreadId);
  await updateDoc(threadRef, {
    postCount: increment(1),
  });
}

async function recordVote(player, votes, notes) {
  const voteRef = collection(db, "votes");
  const displayName = getCurrentDisplayName();
  await addDoc(voteRef, {
    player,
    votes,
    notes,
    recordedBy: currentUser.uid,
    recordedByName: displayName,
    createdAt: serverTimestamp(),
  });
}

function watchVotes() {
  const voteRef = collection(db, "votes");
  showVotesMessage("Loading votes…");
  return onSnapshot(
    query(voteRef, orderBy("createdAt", "desc")),
    (snapshot) => {
      els.voteTableBody.innerHTML = "";
      if (snapshot.empty) {
        showVotesMessage("No votes recorded yet.");
        return;
      }
      snapshot.forEach((docSnapshot) => {
        const vote = docSnapshot.data();
        const tr = document.createElement("tr");
        const recordedAt = formatTimestamp(vote.createdAt);
        tr.innerHTML = `
          <td>${vote.player}</td>
          <td>${vote.votes}</td>
          <td>
            <div>${vote.notes || ""}</div>
            <div class="post-meta">Recorded by ${vote.recordedByName || "Unknown"} · ${recordedAt}</div>
          </td>
        `;
        els.voteTableBody.appendChild(tr);
      });
    },
    (error) => {
      console.error("Failed to watch votes", error);
      if (error.code === "permission-denied") {
        showVotesMessage("You do not have permission to view votes.");
        return;
      }
      showVotesMessage("Unable to load votes. Please try again later.");
    }
  );
}

if (!missingConfig) {
  showThreadsMessage("Sign in to load threads.");
  showVotesMessage("Sign in to load votes.");
  resetThreadSelection("Sign in to view a thread", "Sign in to view posts.");
  resetGameManagementUI({ signedOut: true });

  els.signInButton.addEventListener("click", () => {
    signInWithPopup(auth, provider).catch((error) => {
      console.error(error);
      alert("Failed to sign in. Check the console for details.");
    });
  });
  els.signOutButton.addEventListener("click", () => signOut(auth));
  els.newThreadButton.addEventListener("click", requireAuth(() => {
    els.threadDialog.showModal();
  }));
  if (els.threadDialog) {
    els.threadDialog.addEventListener("close", () => {
      if (els.threadDialog.returnValue === "default") {
        const title = els.threadTitleInput.value.trim();
        const body = els.threadBodyInput.value.trim();
        if (title && body) {
          createThread(title, body).catch((error) => {
            console.error(error);
            alert("Unable to create thread.");
          });
        }
      }
      if (els.threadForm) {
        els.threadForm.reset();
      } else {
        if (els.threadTitleInput) {
          els.threadTitleInput.value = "";
        }
        if (els.threadBodyInput) {
          els.threadBodyInput.value = "";
        }
      }
    });
  }
  els.deleteThread.addEventListener("click", requireAuth(deleteCurrentThread));
  els.replyForm.addEventListener("submit", requireAuth(submitReply));
  els.refreshThread.addEventListener("click", () => {
    if (selectedThreadId) {
      selectThread(selectedThreadId);
    }
  });
  els.recordVoteButton.addEventListener("click", requireAuth(() => {
    els.voteDialog.showModal();
  }));
  if (els.voteDialog) {
    els.voteDialog.addEventListener("close", () => {
      if (els.voteDialog.returnValue === "default") {
        const player = els.votePlayerInput.value.trim();
        const votes = parseInt(els.voteCountInput.value, 10) || 0;
        const notes = els.voteNotesInput.value.trim();
        if (player) {
          recordVote(player, votes, notes).catch((error) => {
            console.error(error);
            alert("Unable to record vote.");
          });
        }
      }
      if (els.voteForm) {
        els.voteForm.reset();
      } else {
        if (els.votePlayerInput) {
          els.votePlayerInput.value = "";
        }
        if (els.voteCountInput) {
          els.voteCountInput.value = "1";
        }
        if (els.voteNotesInput) {
          els.voteNotesInput.value = "";
        }
      }
    });
  }

  if (els.cancelReplyButton && els.replyBody) {
    els.cancelReplyButton.addEventListener("click", () => {
      els.replyBody.value = "";
      els.replyBody.blur();
    });
  }

  if (els.gameSelect) {
    els.gameSelect.addEventListener("change", handleGameSelection);
  }
  if (els.gameMetadataForm) {
    els.gameMetadataForm.addEventListener("submit", updateGameMetadata);
  }
  if (els.refreshGameButton) {
    els.refreshGameButton.addEventListener("click", manualRefreshGame);
  }
  if (els.phaseToggleOpenButton) {
    els.phaseToggleOpenButton.addEventListener("click", () => triggerPhaseAction("toggleOpen"));
  }
  if (els.phaseToggleActiveButton) {
    els.phaseToggleActiveButton.addEventListener("click", () =>
      triggerPhaseAction("toggleActive")
    );
  }
  if (els.phaseNextDayButton) {
    els.phaseNextDayButton.addEventListener("click", () => triggerPhaseAction("nextDay"));
  }
  if (els.phaseSetDayButton) {
    els.phaseSetDayButton.addEventListener("click", () => triggerPhaseAction("setPhase", "Day"));
  }
  if (els.phaseSetNightButton) {
    els.phaseSetNightButton.addEventListener("click", () =>
      triggerPhaseAction("setPhase", "Night")
    );
  }
  if (els.rosterTableBody) {
    els.rosterTableBody.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) {
        return;
      }
      const row = button.closest("tr[data-player-id]");
      const playerId = row?.dataset.playerId;
      if (!row || !playerId) {
        return;
      }
      if (button.dataset.action === "save") {
        handleRosterSave(row, playerId);
      } else if (button.dataset.action === "reset") {
        handleRosterReset(row);
      }
    });
  }

  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
      currentUserProfile = null;
      const profile = await ensurePlayerRecord(user);
      if (profile) {
        currentUserProfile = profile;
      }
      updateAuthDisplay();
      stopProfileSubscription();
      unsubscribeProfile = watchUserProfile(user);
      els.signInButton.hidden = true;
      els.signOutButton.hidden = false;
      els.replyForm.hidden = !selectedThreadId;
      startRealtimeSubscriptions();
      if (!selectedThreadId) {
        resetThreadSelection("Select a thread");
      }
      enableGameControls();
      await loadOwnedGames();
    } else {
      stopProfileSubscription();
      currentUserProfile = null;
      updateAuthDisplay();
      els.signInButton.hidden = false;
      els.signOutButton.hidden = true;
      els.replyForm.hidden = true;
      els.deleteThread.hidden = true;
      stopRealtimeSubscriptions({ showSignedOutState: true });
      resetGameManagementUI({ signedOut: true });
    }
  });

  window.addEventListener("beforeunload", () => {
    stopRealtimeSubscriptions();
    stopProfileSubscription();
    stopGameSubscriptions();
  });
}
