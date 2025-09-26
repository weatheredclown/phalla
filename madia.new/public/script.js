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
};

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
  els.recordVoteButton.addEventListener("click", requireAuth(() => {
    els.voteDialog.showModal();
  }));
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
