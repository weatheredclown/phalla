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
  arrayUnion,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// TODO: Replace with your project's firebaseConfig. The README explains how.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
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

const STATUS_ORDER = ["open", "running", "gameover"];
const STATUS_LABELS = {
  open: "Open",
  running: "Running",
  gameover: "Game Over",
};

const els = {
  authStatus: document.getElementById("authStatus"),
  signInButton: document.getElementById("signInButton"),
  signOutButton: document.getElementById("signOutButton"),
  newThreadButton: document.getElementById("newThreadButton"),
  recordVoteButton: document.getElementById("recordVoteButton"),
  forumGroups: STATUS_ORDER.reduce((groups, status) => {
    const tbody = document.querySelector(`tbody[data-status="${status}"]`);
    if (tbody) {
      groups[status] = {
        tbody,
        emptyRow: tbody.querySelector(".empty-row"),
        count: 0,
      };
    }
    return groups;
  }, {}),
  threadTitle: document.getElementById("threadTitle"),
  threadMetadata: document.getElementById("threadMetadata"),
  postsBody: document.getElementById("postsBody"),
  replyForm: document.getElementById("replyForm"),
  replyBody: document.getElementById("replyBody"),
  deleteThread: document.getElementById("deleteThread"),
  refreshThread: document.getElementById("refreshThread"),
  voteTableBody: document.getElementById("voteTableBody"),
  threadDialog: document.getElementById("threadDialog"),
  threadForm: document.getElementById("threadForm"),
  threadTitleInput: document.getElementById("threadTitleInput"),
  threadBodyInput: document.getElementById("threadBodyInput"),
  voteDialog: document.getElementById("voteDialog"),
  voteForm: document.getElementById("voteForm"),
  votePlayerInput: document.getElementById("votePlayerInput"),
  voteCountInput: document.getElementById("voteCountInput"),
  voteNotesInput: document.getElementById("voteNotesInput"),
};

if (missingConfig) {
  els.authStatus.textContent = "Firebase project not configured";
  els.signInButton.disabled = true;
  els.signOutButton.disabled = true;
  els.newThreadButton.disabled = true;
  els.recordVoteButton.disabled = true;
}

let currentUser = null;
let selectedThreadId = null;
let unsubscribePosts = null;

function requireAuth(action) {
  return (...args) => {
    if (!currentUser) {
      alert("Sign in to perform this action.");
      return;
    }
    action(...args);
  };
}

function normalizeStatus(rawStatus) {
  const value = (rawStatus || "").toString().toLowerCase();
  if (["open", "opening", "signup"].includes(value)) return "open";
  if (["gameover", "complete", "finished", "closed"].includes(value)) {
    return "gameover";
  }
  if (["running", "active", "ongoing"].includes(value)) return "running";
  return "running";
}

function truncate(text, length) {
  if (!text) return "";
  return text.length > length ? `${text.slice(0, length)}…` : text;
}

function escapeHtml(value) {
  return value
    ? value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
    : "";
}

function formatPostBody(body) {
  const safe = escapeHtml(body || "");
  return safe.replace(/\n{2,}/g, "<br><br>").replace(/\n/g, "<br>");
}

function formatTimestamp(timestamp) {
  if (!timestamp) return "just now";
  const date = timestamp.toDate ? timestamp.toDate() : timestamp;
  return date.toLocaleString();
}

function getStatusIcon(status, isOwner, isPlayer) {
  if (isOwner) return { src: "images/phalla.gif", alt: "Your game" };
  if (status === "gameover") {
    return {
      src: isPlayer
        ? "images/inactiveplayed_game.gif"
        : "images/inactive_game.gif",
      alt: "Completed game",
    };
  }
  return {
    src: isPlayer ? "images/activeplayed_game.gif" : "images/active_game.gif",
    alt: status === "open" ? "Open game" : "Running game",
  };
}

function clearForumRows() {
  Object.values(els.forumGroups).forEach((group) => {
    group.tbody.querySelectorAll("tr.thread-row").forEach((row) => row.remove());
    group.count = 0;
    if (group.emptyRow) {
      group.emptyRow.hidden = false;
    }
  });
}

function markSelectedRow() {
  document
    .querySelectorAll(".forum-table tr.thread-row.selected")
    .forEach((row) => row.classList.remove("selected"));
  if (!selectedThreadId) return;
  const activeRow = document.querySelector(
    `.forum-table tr.thread-row[data-id="${selectedThreadId}"]`
  );
  if (activeRow) {
    activeRow.classList.add("selected");
  }
}

function renderThreadRow(threadId, data, status) {
  const group = els.forumGroups[status] || els.forumGroups.running;
  if (!group) return;

  const players = Array.isArray(data.players) ? data.players : [];
  const isOwner = currentUser && data.createdBy === currentUser.uid;
  const isPlayer = currentUser && players.includes(currentUser.uid);
  const icon = getStatusIcon(status, isOwner, isPlayer);
  const row = document.createElement("tr");
  row.dataset.id = threadId;
  row.classList.add("thread-row");

  const altClass = group.count % 2 === 0 ? "alt1" : "alt2";

  const iconCell = document.createElement("td");
  iconCell.className = altClass;
  iconCell.innerHTML = `<img src="${icon.src}" alt="${icon.alt}" width="32" height="32" />`;
  iconCell.align = "center";

  const gameCell = document.createElement("td");
  gameCell.className = altClass;
  gameCell.align = "left";
  const title = escapeHtml(data.title || "(no name)");
  const owner = escapeHtml(data.createdByName || "Unknown");
  const description = escapeHtml(data.description || data.summary || "");
  gameCell.innerHTML = `
    <div class="game-title"><strong>${title}</strong> <span class="smallfont">[run by ${owner}]</span></div>
    ${
      description
        ? `<div class="game-description">${description}</div>`
        : ""
    }
  `;

  const lastPostCell = document.createElement("td");
  lastPostCell.className = altClass;
  lastPostCell.align = "left";
  const lastExcerpt = escapeHtml(
    truncate(data.lastPostExcerpt || data.summary || "No posts yet.", 40)
  );
  const lastAuthor = escapeHtml(data.lastPostBy || data.createdByName || "Unknown");
  const lastTime = formatTimestamp(data.lastPostAt || data.createdAt);
  lastPostCell.innerHTML = `
    <span class="smallfont"><strong>${lastExcerpt || "No posts yet."}</strong></span>
    <span class="smallfont">by ${lastAuthor}<br />${lastTime}</span>
  `;

  const postsCell = document.createElement("td");
  postsCell.className = altClass;
  postsCell.align = "center";
  postsCell.textContent = data.postCount || 0;

  const playersCell = document.createElement("td");
  playersCell.className = altClass;
  playersCell.align = "center";
  const playerCount =
    typeof data.playerCount === "number" ? data.playerCount : players.length;
  playersCell.textContent =
    typeof playerCount === "number" && !Number.isNaN(playerCount)
      ? playerCount
      : "--";

  const dayCell = document.createElement("td");
  dayCell.className = altClass;
  dayCell.align = "center";
  const dayValue = data.day ?? data.currentDay;
  dayCell.textContent = dayValue ?? "--";

  const openCell = document.createElement("td");
  openCell.className = altClass;
  openCell.align = "center";
  const openValue =
    typeof data.open === "boolean"
      ? data.open
      : status === "open" || status === "running";
  openCell.textContent = openValue ? "Yes" : "No";

  [iconCell, gameCell, lastPostCell, postsCell, playersCell, dayCell, openCell].forEach(
    (cell) => row.appendChild(cell)
  );

  row.addEventListener("click", () => selectThread(threadId));

  group.count += 1;
  if (group.emptyRow) {
    group.emptyRow.hidden = true;
  }
  group.tbody.appendChild(row);
}

async function selectThread(threadId) {
  if (unsubscribePosts) {
    unsubscribePosts();
    unsubscribePosts = null;
  }
  selectedThreadId = threadId;
  markSelectedRow();
  els.postsBody.innerHTML = "";
  els.threadTitle.textContent = "Loading thread...";
  els.threadMetadata.textContent = "";
  els.deleteThread.hidden = true;
  els.replyForm.hidden = !currentUser;

  const threadRef = doc(db, "threads", threadId);
  const snapshot = await getDoc(threadRef);
  if (!snapshot.exists()) {
    els.threadTitle.textContent = "Thread not found";
    return;
  }

  const thread = snapshot.data();
  const status = normalizeStatus(thread.status);
  els.threadTitle.textContent = thread.title || "Untitled thread";

  const metadataParts = [];
  metadataParts.push(
    `Started by ${thread.createdByName || "Unknown"} on ${formatTimestamp(
      thread.createdAt
    )}`
  );
  metadataParts.push(`${STATUS_LABELS[status] || "Running"}`);
  if (thread.postCount) {
    metadataParts.push(`${thread.postCount} posts`);
  }
  const playerTotal = Array.isArray(thread.players)
    ? thread.players.length
    : typeof thread.playerCount === "number"
    ? thread.playerCount
    : null;
  if (playerTotal !== null) {
    metadataParts.push(`${playerTotal} players`);
  }
  if (typeof thread.day === "number") {
    metadataParts.push(`Day ${thread.day}`);
  }
  els.threadMetadata.textContent = metadataParts.join(" · ");

  els.deleteThread.hidden = !currentUser || thread.createdBy !== currentUser.uid;

  unsubscribePosts = onSnapshot(
    query(collection(threadRef, "posts"), orderBy("createdAt", "asc")),
    (snapshot) => {
      els.postsBody.innerHTML = "";
      if (snapshot.empty) {
        const emptyRow = document.createElement("tr");
        emptyRow.className = "empty-row";
        const cell = document.createElement("td");
        cell.className = "alt1";
        cell.colSpan = 2;
        cell.textContent = "No posts yet.";
        emptyRow.appendChild(cell);
        els.postsBody.appendChild(emptyRow);
        return;
      }

      let index = 0;
      snapshot.forEach((docSnapshot) => {
        index += 1;
        const post = docSnapshot.data();
        const headerRow = document.createElement("tr");
        headerRow.className = "post-header";
        const headerCell = document.createElement("td");
        headerCell.className = "thead";
        headerCell.colSpan = 2;
        headerCell.innerHTML = `#${index} · ${escapeHtml(
          post.authorName || "Unknown"
        )} · ${formatTimestamp(post.createdAt)}`;
        headerRow.appendChild(headerCell);

        const contentRow = document.createElement("tr");
        contentRow.className = "post-row";

        const authorCell = document.createElement("td");
        authorCell.className = index % 2 === 0 ? "alt2 author-cell" : "alt1 author-cell";
        authorCell.textContent = post.authorName || "Unknown";

        const bodyCell = document.createElement("td");
        bodyCell.className = index % 2 === 0 ? "alt1Active post-cell" : "alt1 post-cell";
        bodyCell.innerHTML = `
          <div class="post-body">${formatPostBody(post.body)}</div>
          <div class="post-meta">Posted ${formatTimestamp(post.createdAt)}</div>
        `;

        contentRow.appendChild(authorCell);
        contentRow.appendChild(bodyCell);

        els.postsBody.appendChild(headerRow);
        els.postsBody.appendChild(contentRow);
      });
    }
  );
}

function watchThreads() {
  const threadsRef = collection(db, "threads");
  const threadsQuery = query(threadsRef, orderBy("createdAt", "desc"));
  return onSnapshot(threadsQuery, (snapshot) => {
    clearForumRows();
    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      const status = normalizeStatus(
        data.status || (data.active ? "running" : data.open ? "open" : "gameover")
      );
      renderThreadRow(docSnapshot.id, data, status);
    });
    markSelectedRow();
  });
}

async function createThread(title, body) {
  const threadsRef = collection(db, "threads");
  const now = serverTimestamp();
  const description = truncate(body.split(/\n{2,}/)[0] || body, 140);
  const newThread = await addDoc(threadsRef, {
    title,
    createdBy: currentUser.uid,
    createdByName: currentUser.displayName,
    createdAt: now,
    status: "open",
    postCount: 1,
    lastPostAt: now,
    lastPostBy: currentUser.displayName,
    lastPostExcerpt: truncate(body, 80),
    description,
    players: [currentUser.uid],
    day: 0,
  });
  const postRef = collection(db, "threads", newThread.id, "posts");
  await addDoc(postRef, {
    author: currentUser.uid,
    authorName: currentUser.displayName,
    body,
    createdAt: now,
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
  selectedThreadId = null;
  els.threadTitle.textContent = "Select a thread";
  els.threadMetadata.textContent = "";
  els.postsBody.innerHTML =
    '<tr class="empty-row"><td class="alt1" colspan="2">Choose a game to load posts.</td></tr>';
  markSelectedRow();
}

async function submitReply(event) {
  event.preventDefault();
  if (!selectedThreadId) return;
  const body = els.replyBody.value.trim();
  if (!body) return;
  const postRef = collection(db, "threads", selectedThreadId, "posts");
  await addDoc(postRef, {
    author: currentUser.uid,
    authorName: currentUser.displayName,
    body,
    createdAt: serverTimestamp(),
  });
  els.replyBody.value = "";
  const threadRef = doc(db, "threads", selectedThreadId);
  await updateDoc(threadRef, {
    postCount: increment(1),
    lastPostAt: serverTimestamp(),
    lastPostBy: currentUser.displayName,
    lastPostExcerpt: truncate(body, 80),
    players: arrayUnion(currentUser.uid),
  });
}

async function recordVote(player, votes, notes) {
  const voteRef = collection(db, "votes");
  await addDoc(voteRef, {
    player,
    votes,
    notes,
    recordedBy: currentUser.uid,
    recordedByName: currentUser.displayName,
    createdAt: serverTimestamp(),
  });
}

function watchVotes() {
  const voteRef = collection(db, "votes");
  return onSnapshot(query(voteRef, orderBy("createdAt", "desc")), (snapshot) => {
    els.voteTableBody.innerHTML = "";
    if (snapshot.empty) {
      const emptyRow = document.createElement("tr");
      emptyRow.className = "empty-row";
      const cell = document.createElement("td");
      cell.className = "alt1";
      cell.colSpan = 3;
      cell.textContent = "No votes recorded yet.";
      emptyRow.appendChild(cell);
      els.voteTableBody.appendChild(emptyRow);
      return;
    }

    let index = 0;
    snapshot.forEach((docSnapshot) => {
      const vote = docSnapshot.data();
      const tr = document.createElement("tr");
      const altClass = index % 2 === 0 ? "alt1" : "alt2";

      const playerCell = document.createElement("td");
      playerCell.className = altClass;
      playerCell.textContent = vote.player;

      const votesCell = document.createElement("td");
      votesCell.className = altClass;
      votesCell.align = "center";
      votesCell.textContent = vote.votes;

      const notesCell = document.createElement("td");
      notesCell.className = altClass;
      notesCell.innerHTML = `
        <div>${escapeHtml(vote.notes || "")}</div>
        <div class="smallfont">Recorded by ${escapeHtml(
          vote.recordedByName || "Unknown"
        )} · ${formatTimestamp(vote.createdAt)}</div>
      `;

      tr.appendChild(playerCell);
      tr.appendChild(votesCell);
      tr.appendChild(notesCell);
      els.voteTableBody.appendChild(tr);
      index += 1;
    });
  });
}

let unsubscribeThreads = null;
let unsubscribeVotes = null;

if (!missingConfig) {
  unsubscribeThreads = watchThreads();
  unsubscribeVotes = watchVotes();

  els.signInButton.addEventListener("click", () => {
    signInWithPopup(auth, provider).catch((error) => {
      console.error(error);
      alert("Failed to sign in. Check the console for details.");
    });
  });
  els.signOutButton.addEventListener("click", () => signOut(auth));
  els.newThreadButton.addEventListener(
    "click",
    requireAuth(() => {
      els.threadDialog.showModal();
    })
  );
  els.threadForm.addEventListener("close", () => {
    if (els.threadForm.returnValue === "default") {
      const title = els.threadTitleInput.value.trim();
      const body = els.threadBodyInput.value.trim();
      if (title && body) {
        createThread(title, body).catch((error) => {
          console.error(error);
          alert("Unable to create thread.");
        });
      }
    }
    els.threadTitleInput.value = "";
    els.threadBodyInput.value = "";
  });
  els.deleteThread.addEventListener("click", requireAuth(deleteCurrentThread));
  els.replyForm.addEventListener("submit", requireAuth(submitReply));
  els.refreshThread.addEventListener("click", () => {
    if (selectedThreadId) {
      selectThread(selectedThreadId);
    }
  });
  els.recordVoteButton.addEventListener(
    "click",
    requireAuth(() => {
      els.voteDialog.showModal();
    })
  );
  els.voteForm.addEventListener("close", () => {
    if (els.voteForm.returnValue === "default") {
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
    els.votePlayerInput.value = "";
    els.voteCountInput.value = "1";
    els.voteNotesInput.value = "";
  });

  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
      els.authStatus.textContent = `Welcome, ${user.displayName}.`;
      els.signInButton.hidden = true;
      els.signOutButton.hidden = false;
      els.replyForm.hidden = !selectedThreadId;
    } else {
      els.authStatus.textContent = "Welcome, Guest.";
      els.signInButton.hidden = false;
      els.signOutButton.hidden = true;
      els.replyForm.hidden = true;
      els.deleteThread.hidden = true;
    }
    markSelectedRow();
  });

  window.addEventListener("beforeunload", () => {
    unsubscribeThreads?.();
    unsubscribePosts?.();
    unsubscribeVotes?.();
  });
}
