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
  gameSelect: document.getElementById("gameSelect"),
  gameStatusMessage: document.getElementById("gameStatusMessage"),
  gameOwnerDisplay: document.getElementById("gameOwnerDisplay"),
  gameStateDisplay: document.getElementById("gameStateDisplay"),
  gameDayDisplay: document.getElementById("gameDayDisplay"),
  gameUpdatedDisplay: document.getElementById("gameUpdatedDisplay"),
  advanceDayButton: document.getElementById("advanceDayButton"),
  rewindDayButton: document.getElementById("rewindDayButton"),
  toggleActiveButton: document.getElementById("toggleActiveButton"),
  toggleOpenButton: document.getElementById("toggleOpenButton"),
  setDayForm: document.getElementById("setDayForm"),
  setDayInput: document.getElementById("setDayInput"),
  rosterTableBody: document.querySelector("#rosterTable tbody"),
  rosterHelp: document.getElementById("rosterHelp"),
  playerDialog: document.getElementById("playerDialog"),
  playerDialogName: document.getElementById("playerDialogName"),
  playerForm: document.getElementById("playerForm"),
  playerRoleInput: document.getElementById("playerRoleInput"),
  playerAlignmentInput: document.getElementById("playerAlignmentInput"),
  playerStatusSelect: document.getElementById("playerStatusSelect"),
  playerPostsInput: document.getElementById("playerPostsInput"),
  playerNotesInput: document.getElementById("playerNotesInput"),
  playerDialogError: document.getElementById("playerDialogError"),
  roleSuggestions: document.getElementById("roleSuggestions"),
};

const ROLE_SUGGESTIONS = [
  "Villager",
  "Vanillager",
  "Seer",
  "Investigator",
  "Bodyguard",
  "Doctor",
  "Healer",
  "Watcher",
  "Tracker",
  "Roleblocker",
  "Bus Driver",
  "Jailer",
  "Vigilante",
  "Mafia Goon",
  "Mafia Boss",
  "Cultist",
  "Serial Killer",
  "Neutral",
  "Neutral Support",
  "Spy",
];

if (els.roleSuggestions) {
  ROLE_SUGGESTIONS.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    els.roleSuggestions.appendChild(option);
  });
}

if (missingConfig) {
  els.authStatus.textContent = "Firebase project not configured";
  els.signInButton.disabled = true;
  els.signOutButton.disabled = true;
  els.newThreadButton.disabled = true;
  els.recordVoteButton.disabled = true;
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
let unsubscribeGames = null;
let unsubscribeGameDoc = null;
let unsubscribePlayers = null;
let selectedGameId = null;
let currentGame = null;
let rosterById = new Map();
let editingPlayerId = null;

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

  const existingDisplayName = (data.displayName || "").trim();
  const authDisplayName = (user.displayName || "").trim();
  if (existingDisplayName !== authDisplayName) {
    updates.displayName = authDisplayName;
  }

  const existingPhotoURL = (data.photoURL || "").trim();
  const authPhotoURL = (user.photoURL || "").trim();
  if (existingPhotoURL !== authPhotoURL) {
    updates.photoURL = authPhotoURL;
  }

  const existingEmail = (data.email || "").trim();
  const authEmail = (user.email || "").trim();
  if (existingEmail !== authEmail) {
    updates.email = authEmail;
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
  stopGameSubscriptions({ showSignedOutState });
  if (showSignedOutState) {
    showThreadsMessage("Sign in to view threads.");
    showVotesMessage("Sign in to see recorded votes.");
    resetThreadSelection("Sign in to view a thread", "Sign in to view posts.");
  }
}

function startRealtimeSubscriptions() {
  if (missingConfig || !currentUser) return;
  stopRealtimeSubscriptions();
  unsubscribeThreads = watchThreads();
  unsubscribeVotes = watchVotes();
  unsubscribeGames = watchOwnedGames();
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

function stopGameSubscriptions({ showSignedOutState = false } = {}) {
  if (unsubscribeGames) {
    unsubscribeGames();
    unsubscribeGames = null;
  }
  if (unsubscribeGameDoc) {
    unsubscribeGameDoc();
    unsubscribeGameDoc = null;
  }
  if (unsubscribePlayers) {
    unsubscribePlayers();
    unsubscribePlayers = null;
  }
  currentGame = null;
  rosterById = new Map();
  if (showSignedOutState) {
    selectedGameId = null;
    renderGameOptions([]);
    updateGameDetails(null);
    showRosterMessage("Sign in to view player rosters.");
    showGameStatusMessage("Sign in to manage your games.");
  }
  updateRosterHelp();
}

function showGameStatusMessage(message) {
  if (!els.gameStatusMessage) return;
  els.gameStatusMessage.textContent = message || "";
}

function renderGameOptions(entries) {
  if (!els.gameSelect) return;
  const select = els.gameSelect;
  const previousSelection = selectedGameId;
  select.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = entries.length
    ? "Select a game"
    : "No moderated games yet";
  placeholder.disabled = entries.length > 0;
  select.appendChild(placeholder);

  const sorted = [...entries].sort((a, b) => {
    const aName = (a.data.gamename || a.id || "").toString();
    const bName = (b.data.gamename || b.id || "").toString();
    return aName.localeCompare(bName, undefined, { sensitivity: "base" });
  });

  sorted.forEach((entry) => {
    const option = document.createElement("option");
    option.value = entry.id;
    option.textContent = entry.data.gamename || entry.id;
    select.appendChild(option);
  });

  if (previousSelection && sorted.some((entry) => entry.id === previousSelection)) {
    select.value = previousSelection;
  } else if (sorted.length) {
    select.value = sorted[0].id;
    selectedGameId = select.value;
  } else {
    select.value = "";
    selectedGameId = null;
  }
}

function watchOwnedGames() {
  if (!currentUser || !els.gameSelect) return null;
  showGameStatusMessage("Loading moderated games…");
  renderGameOptions([]);
  updateGameDetails(null);
  showRosterMessage("Select a game to view the roster.");
  const gamesRef = collection(db, "games");
  const gamesQuery = query(
    gamesRef,
    where("ownerUserId", "==", currentUser.uid),
    orderBy("gamename")
  );
  return onSnapshot(
    gamesQuery,
    (snapshot) => {
      const entries = snapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        data: docSnapshot.data() || {},
      }));
      renderGameOptions(entries);
      if (els.gameSelect.value) {
        selectGame(els.gameSelect.value, { fromSnapshot: true });
      } else {
        selectedGameId = null;
        if (unsubscribeGameDoc) {
          unsubscribeGameDoc();
          unsubscribeGameDoc = null;
        }
        if (unsubscribePlayers) {
          unsubscribePlayers();
          unsubscribePlayers = null;
        }
        currentGame = null;
        rosterById = new Map();
        updateGameDetails(null);
        showRosterMessage(entries.length ? "Select a game to view the roster." : "No moderated games yet.");
        showGameStatusMessage(entries.length ? "Choose a game to begin." : "Create a game from the legacy UI to manage it here.");
      }
    },
    (error) => {
      console.error("Failed to watch moderated games", error);
      showGameStatusMessage(
        error.code === "permission-denied"
          ? "You do not have permission to manage these games."
          : "Unable to load moderated games."
      );
      renderGameOptions([]);
    }
  );
}

function selectGame(gameId, { fromSnapshot = false } = {}) {
  if (!els.gameSelect) return;
  const normalizedId = (gameId || "").trim();
  if (!normalizedId) {
    selectedGameId = null;
    if (!fromSnapshot) {
      els.gameSelect.value = "";
    }
    if (unsubscribeGameDoc) {
      unsubscribeGameDoc();
      unsubscribeGameDoc = null;
    }
    if (unsubscribePlayers) {
      unsubscribePlayers();
      unsubscribePlayers = null;
    }
    currentGame = null;
    updateGameDetails(null);
    showRosterMessage("Select a game to view the roster.");
    updateRosterHelp();
    return;
  }
  if (!fromSnapshot) {
    els.gameSelect.value = normalizedId;
  }
  const shouldReattach = selectedGameId !== normalizedId || !unsubscribeGameDoc;
  selectedGameId = normalizedId;
  if (shouldReattach) {
    attachGameWatchers(normalizedId);
  }
}

function attachGameWatchers(gameId) {
  if (!gameId) return;
  if (unsubscribeGameDoc) {
    unsubscribeGameDoc();
    unsubscribeGameDoc = null;
  }
  if (unsubscribePlayers) {
    unsubscribePlayers();
    unsubscribePlayers = null;
  }
  const gameRef = doc(db, "games", gameId);
  showGameStatusMessage("Loading game details…");
  updateGameDetails(null);
  showRosterMessage("Loading roster…");
  unsubscribeGameDoc = onSnapshot(
    gameRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        showGameStatusMessage("Game not found.");
        currentGame = null;
        updateGameDetails(null);
        updateRosterHelp();
        return;
      }
      currentGame = { id: snapshot.id, ...(snapshot.data() || {}) };
      updateGameDetails(currentGame);
      updateRosterHelp();
      const currentStatus = els.gameStatusMessage?.textContent || "";
      if (!currentStatus || currentStatus.startsWith("Loading")) {
        showGameStatusMessage("");
      }
    },
    (error) => {
      console.error("Failed to load game metadata", error);
      showGameStatusMessage(
        error.code === "permission-denied"
          ? "You do not have permission to view this game."
          : "Unable to load game details."
      );
      currentGame = null;
      updateGameDetails(null);
      updateRosterHelp();
    }
  );
  unsubscribePlayers = onSnapshot(
    collection(gameRef, "players"),
    (snapshot) => {
      const players = snapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data() || {};
        const displayName =
          (data.name || data.username || data.displayName || docSnapshot.id || "").toString();
        const notes = data.moderatorNotes || data.notes || "";
        const role = data.role || data.rolename || "";
        const alignment = data.alignment || data.allegiance || "";
        const postsLeft =
          typeof data.postsLeft === "number" && Number.isFinite(data.postsLeft)
            ? data.postsLeft
            : "";
        return {
          id: docSnapshot.id,
          data,
          displayName,
          role,
          alignment,
          notes,
          postsLeft,
          alive: derivePlayerAlive(data),
        };
      });
      players.sort((a, b) => {
        const aOrderRaw = Number(a.data.order);
        const bOrderRaw = Number(b.data.order);
        const aOrder = Number.isFinite(aOrderRaw) ? aOrderRaw : Number.POSITIVE_INFINITY;
        const bOrder = Number.isFinite(bOrderRaw) ? bOrderRaw : Number.POSITIVE_INFINITY;
        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }
        return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" });
      });
      renderRoster(players);
    },
    (error) => {
      console.error("Failed to load roster", error);
      renderRoster([]);
      showRosterMessage(
        error.code === "permission-denied"
          ? "You do not have permission to view this roster."
          : "Unable to load roster."
      );
    }
  );
}

function updateGameDetails(game) {
  if (els.gameOwnerDisplay) {
    els.gameOwnerDisplay.textContent = game?.ownerName || "—";
  }
  if (els.gameStateDisplay) {
    if (!game) {
      els.gameStateDisplay.textContent = "No game selected";
    } else {
      const state = [];
      state.push(game.open ? "Open" : "Closed");
      state.push(game.active ? "Active" : "Paused");
      els.gameStateDisplay.textContent = state.join(" · ");
    }
  }
  if (els.gameDayDisplay) {
    els.gameDayDisplay.textContent = game ? String(game.day ?? 0) : "—";
  }
  if (els.gameUpdatedDisplay) {
    els.gameUpdatedDisplay.textContent = game?.updatedAt
      ? formatTimestamp(game.updatedAt)
      : "—";
  }
  if (els.setDayInput) {
    els.setDayInput.value = game && Number.isFinite(game.day) ? game.day : "";
  }
  updateRosterHelp();
  updatePhaseControls();
}

function updateRosterHelp() {
  if (!els.rosterHelp) return;
  if (!selectedGameId) {
    els.rosterHelp.textContent = "Select a game to load its roster.";
    return;
  }
  if (!currentGame) {
    els.rosterHelp.textContent = "Loading roster…";
    return;
  }
  els.rosterHelp.textContent = isCurrentUserGameOwner()
    ? "Choose a player to edit their role, status, or moderator notes."
    : "You can view this roster, but only the game owner can make changes.";
}

function updatePhaseControls() {
  const canEdit = isCurrentUserGameOwner() && !!currentGame;
  if (els.advanceDayButton) {
    els.advanceDayButton.disabled = !canEdit;
  }
  if (els.rewindDayButton) {
    els.rewindDayButton.disabled = !canEdit;
  }
  if (els.toggleActiveButton) {
    els.toggleActiveButton.disabled = !canEdit;
  }
  if (els.toggleOpenButton) {
    els.toggleOpenButton.disabled = !canEdit;
  }
  if (els.setDayInput) {
    els.setDayInput.disabled = !canEdit;
  }
  if (els.setDayForm) {
    const submitButton = els.setDayForm.querySelector("button[type='submit']");
    if (submitButton) {
      submitButton.disabled = !canEdit;
    }
  }
}

function isCurrentUserGameOwner() {
  if (!currentUser || !currentGame) return false;
  return currentGame.ownerUserId === currentUser.uid;
}

function showRosterMessage(message) {
  if (!els.rosterTableBody) return;
  els.rosterTableBody.innerHTML = "";
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = 7;
  cell.className = "metadata";
  cell.textContent = message;
  cell.style.textAlign = "center";
  cell.style.padding = "1rem";
  cell.style.color = "var(--muted)";
  row.appendChild(cell);
  els.rosterTableBody.appendChild(row);
}

function renderRoster(players) {
  rosterById = new Map(players.map((player) => [player.id, player]));
  if (!els.rosterTableBody) return;
  els.rosterTableBody.innerHTML = "";
  if (!players.length) {
    showRosterMessage("No players joined yet.");
    return;
  }
  const canEdit = isCurrentUserGameOwner();
  players.forEach((player) => {
    const row = document.createElement("tr");
    row.dataset.playerId = player.id;

    const nameCell = document.createElement("td");
    const nameStrong = document.createElement("strong");
    nameStrong.textContent = player.displayName || "Unknown";
    nameCell.appendChild(nameStrong);
    if (player.id && player.id !== player.displayName) {
      const meta = document.createElement("div");
      meta.className = "metadata";
      meta.textContent = player.id;
      nameCell.appendChild(meta);
    }

    const statusCell = document.createElement("td");
    statusCell.textContent = player.alive ? "Alive" : "Eliminated";

    const roleCell = document.createElement("td");
    roleCell.textContent = player.role || "—";

    const alignmentCell = document.createElement("td");
    alignmentCell.textContent = player.alignment || "—";

    const postsCell = document.createElement("td");
    postsCell.textContent = player.postsLeft === "" ? "—" : String(player.postsLeft);

    const notesCell = document.createElement("td");
    notesCell.textContent = player.notes || "—";

    const actionsCell = document.createElement("td");
    actionsCell.className = "actions-column";
    if (canEdit) {
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "secondary";
      editButton.dataset.playerAction = "edit";
      editButton.textContent = "Edit";
      actionsCell.appendChild(editButton);
    } else {
      actionsCell.textContent = "—";
    }

    row.append(nameCell, statusCell, roleCell, alignmentCell, postsCell, notesCell, actionsCell);
    els.rosterTableBody.appendChild(row);
  });
}

function derivePlayerAlive(data = {}) {
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

function openPlayerDialog(playerId) {
  if (!els.playerDialog) return;
  const player = rosterById.get(playerId);
  if (!player) return;
  editingPlayerId = playerId;
  if (els.playerDialogName) {
    els.playerDialogName.textContent = `${player.displayName} (${player.id})`;
  }
  if (els.playerRoleInput) {
    els.playerRoleInput.value = player.role || "";
  }
  if (els.playerAlignmentInput) {
    els.playerAlignmentInput.value = player.alignment || "";
  }
  if (els.playerStatusSelect) {
    els.playerStatusSelect.value = player.alive ? "alive" : "eliminated";
  }
  if (els.playerPostsInput) {
    els.playerPostsInput.value = player.postsLeft === "" ? "" : String(player.postsLeft);
  }
  if (els.playerNotesInput) {
    els.playerNotesInput.value = player.notes || "";
  }
  if (els.playerDialogError) {
    els.playerDialogError.textContent = "";
    els.playerDialogError.hidden = true;
  }
  try {
    els.playerDialog.showModal();
  } catch (error) {
    console.error("Unable to open player dialog", error);
  }
}

async function savePlayerChanges() {
  if (!editingPlayerId || !currentGame) {
    return;
  }
  if (!isCurrentUserGameOwner()) {
    if (els.playerDialogError) {
      els.playerDialogError.textContent = "Only the game owner can update players.";
      els.playerDialogError.hidden = false;
    }
    return;
  }
  const role = (els.playerRoleInput?.value || "").trim();
  const alignment = (els.playerAlignmentInput?.value || "").trim();
  const status = els.playerStatusSelect?.value === "alive";
  const postsRaw = els.playerPostsInput?.value || "";
  const parsedPosts = parseInt(postsRaw, 10);
  const notes = (els.playerNotesInput?.value || "").trim();

  const updates = {
    active: status,
    alive: status,
    updatedAt: serverTimestamp(),
  };

  if (Number.isFinite(parsedPosts)) {
    updates.postsLeft = parsedPosts;
  } else {
    updates.postsLeft = deleteField();
  }

  if (role) {
    updates.role = role;
    updates.rolename = role;
  } else {
    updates.role = deleteField();
    updates.rolename = deleteField();
  }

  if (alignment) {
    updates.alignment = alignment;
  } else {
    updates.alignment = deleteField();
  }

  if (notes) {
    updates.moderatorNotes = notes;
  } else {
    updates.moderatorNotes = deleteField();
  }

  try {
    await updateDoc(doc(db, "games", currentGame.id, "players", editingPlayerId), updates);
    editingPlayerId = null;
    if (els.playerDialogError) {
      els.playerDialogError.hidden = true;
    }
    els.playerDialog?.close();
  } catch (error) {
    console.error("Failed to update player", error);
    if (els.playerDialogError) {
      els.playerDialogError.textContent = "Unable to save player changes.";
      els.playerDialogError.hidden = false;
    }
    throw error;
  }
}

function requireGameOwnership(action) {
  return () => {
    if (!currentUser) {
      alert("Sign in to manage games.");
      return;
    }
    if (!currentGame || !isCurrentUserGameOwner()) {
      alert("Only the game owner can perform this action.");
      return;
    }
    action();
  };
}

async function applyGameUpdates(updates, { successMessage, errorMessage } = {}) {
  if (!currentGame) return;
  try {
    await updateDoc(doc(db, "games", currentGame.id), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    if (successMessage) {
      showGameStatusMessage(successMessage);
    }
  } catch (error) {
    console.error("Failed to update game", error);
    showGameStatusMessage(errorMessage || "Unable to update game metadata.");
  }
}

if (!missingConfig) {
  showThreadsMessage("Sign in to load threads.");
  showVotesMessage("Sign in to load votes.");
  resetThreadSelection("Sign in to view a thread", "Sign in to view posts.");

  if (els.gameSelect) {
    els.gameSelect.addEventListener("change", (event) => {
      selectGame(event.target.value);
    });
  }

  if (els.advanceDayButton) {
    els.advanceDayButton.addEventListener(
      "click",
      requireGameOwnership(() => {
        const currentDay = Number.isFinite(currentGame?.day) ? currentGame.day : 0;
        const nextDay = currentDay + 1;
        applyGameUpdates({ day: nextDay }, {
          successMessage: `Advanced to day ${nextDay}.`,
        });
      })
    );
  }

  if (els.rewindDayButton) {
    els.rewindDayButton.addEventListener(
      "click",
      requireGameOwnership(() => {
        const currentDay = Number.isFinite(currentGame?.day) ? currentGame.day : 0;
        const nextDay = Math.max(currentDay - 1, 0);
        applyGameUpdates({ day: nextDay }, {
          successMessage: `Rewound to day ${nextDay}.`,
        });
      })
    );
  }

  if (els.toggleActiveButton) {
    els.toggleActiveButton.addEventListener(
      "click",
      requireGameOwnership(() => {
        const nextState = !currentGame?.active;
        applyGameUpdates(
          { active: nextState },
          { successMessage: nextState ? "Game marked active." : "Game paused." }
        );
      })
    );
  }

  if (els.toggleOpenButton) {
    els.toggleOpenButton.addEventListener(
      "click",
      requireGameOwnership(() => {
        const nextState = !currentGame?.open;
        applyGameUpdates(
          { open: nextState },
          { successMessage: nextState ? "Signups opened." : "Signups closed." }
        );
      })
    );
  }

  if (els.setDayForm) {
    els.setDayForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!currentGame) {
        showGameStatusMessage("Select a game before updating the day.");
        return;
      }
      if (!isCurrentUserGameOwner()) {
        alert("Only the game owner can update the day.");
        return;
      }
      const value = Number(els.setDayInput?.value || "");
      if (!Number.isFinite(value) || value < 0) {
        showGameStatusMessage("Enter a non-negative day number.");
        return;
      }
      applyGameUpdates({ day: value }, { successMessage: `Day set to ${value}.` });
    });
  }

  if (els.rosterTableBody) {
    els.rosterTableBody.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-player-action='edit']");
      if (!button) return;
      if (!isCurrentUserGameOwner()) {
        alert("Only the game owner can edit players.");
        return;
      }
      const row = button.closest("tr[data-player-id]");
      const playerId = row?.dataset.playerId;
      if (playerId) {
        openPlayerDialog(playerId);
      }
    });
  }

  if (els.playerForm) {
    const cancelButton = els.playerForm.querySelector("[data-action='cancel']");
    if (cancelButton) {
      cancelButton.addEventListener("click", () => {
        editingPlayerId = null;
        els.playerDialog?.close();
      });
    }
    els.playerForm.addEventListener("submit", (event) => {
      event.preventDefault();
      savePlayerChanges().catch(() => {});
    });
  }

  if (els.playerDialog) {
    els.playerDialog.addEventListener("close", () => {
      editingPlayerId = null;
    });
    els.playerDialog.addEventListener("cancel", () => {
      editingPlayerId = null;
    });
  }

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
    } else {
      stopProfileSubscription();
      currentUserProfile = null;
      updateAuthDisplay();
      els.signInButton.hidden = false;
      els.signOutButton.hidden = true;
      els.replyForm.hidden = true;
      els.deleteThread.hidden = true;
      stopRealtimeSubscriptions({ showSignedOutState: true });
    }
  });

  window.addEventListener("beforeunload", () => {
    stopRealtimeSubscriptions();
    stopProfileSubscription();
  });
}
