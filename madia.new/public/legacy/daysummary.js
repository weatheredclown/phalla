import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { auth, db, ensureUserDocument, missingConfig } from "./firebase.js";
import { initLegacyHeader } from "./header.js";

const params = new URLSearchParams(location.search);
const gameId = params.get("g");

const header = initLegacyHeader();

const els = {
  gameName: document.getElementById("gameName"),
  gameMeta: document.getElementById("gameMeta"),
  summaryStatus: document.getElementById("summaryStatus"),
  actionsBody: document.getElementById("actionsBody"),
  renameForm: document.getElementById("renameForm"),
  renameInput: document.getElementById("renameInput"),
  resetForm: document.getElementById("resetForm"),
  resetConfirm: document.getElementById("resetConfirm"),
  gameOverForm: document.getElementById("gameOverForm"),
  gameOverConfirm: document.getElementById("gameOverConfirm"),
  clearPostsForm: document.getElementById("clearPostsForm"),
  clearPostsConfirm: document.getElementById("clearPostsConfirm"),
  deleteForm: document.getElementById("deleteForm"),
  deleteConfirm: document.getElementById("deleteConfirm"),
};

let currentUser = null;
let currentGame = null;

function setStatus(message, type = "info") {
  if (!els.summaryStatus) return;
  els.summaryStatus.textContent = message || "";
  if (!message) {
    return;
  }
  els.summaryStatus.style.color =
    type === "error" ? "#ff7676" : type === "success" ? "#6ee7b7" : "#F9A906";
}

function disableForms(disabled) {
  const forms = [
    els.renameForm,
    els.resetForm,
    els.gameOverForm,
    els.clearPostsForm,
    els.deleteForm,
  ];
  forms.forEach((form) => {
    if (!form) return;
    Array.from(form.elements).forEach((element) => {
      element.disabled = disabled;
    });
  });
}

function formatTimestamp(value) {
  if (!value) return "";
  if (typeof value.toDate === "function") {
    const date = value.toDate();
    return date instanceof Date ? date.toLocaleString() : "";
  }
  if (value instanceof Date) {
    return value.toLocaleString();
  }
  return String(value);
}

async function deleteCollectionDocs(collectionRef) {
  const snapshot = await getDocs(collectionRef);
  const deletions = snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref));
  await Promise.all(deletions);
}

async function loadGame() {
  if (!gameId) {
    setStatus("Missing game id", "error");
    disableForms(true);
    return;
  }
  if (missingConfig) {
    setStatus("Firebase configuration required", "error");
    disableForms(true);
    return;
  }
  const gameRef = doc(db, "games", gameId);
  let snap;
  try {
    snap = await getDoc(gameRef);
  } catch (error) {
    console.error("Failed to load game", error);
    setStatus("Unable to load game. Try again later.", "error");
    disableForms(true);
    return;
  }
  if (!snap.exists()) {
    setStatus("Game not found", "error");
    disableForms(true);
    return;
  }
  currentGame = { id: gameId, ...snap.data() };
  els.gameName.textContent = currentGame.gamename || "(no name)";
  const day = currentGame.day ?? 0;
  const open = currentGame.open ? "Open" : "Closed";
  const active = currentGame.active ? "Running" : "Game Over";
  const updated = formatTimestamp(currentGame.updatedAt || currentGame.createdAt);
  els.gameMeta.innerHTML = `Day ${day} · ${open} · ${active}${
    updated ? ` · updated ${updated}` : ""
  }`;
  if (els.renameInput) {
    els.renameInput.value = currentGame.gamename || "";
  }
  disableForms(!currentUser || currentGame.ownerUserId !== currentUser.uid);
  await loadActions();
}

async function loadActions() {
  if (!els.actionsBody) return;
  els.actionsBody.innerHTML = "";
  const actionsRef = collection(db, "games", gameId, "actions");
  let snapshot;
  try {
    snapshot = await getDocs(actionsRef);
  } catch (error) {
    console.warn("Failed to load actions", error);
    const row = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 6;
    td.className = "alt1";
    td.style.textAlign = "center";
    td.textContent = "Unable to load actions.";
    row.appendChild(td);
    els.actionsBody.appendChild(row);
    return;
  }
  if (snapshot.empty) {
    const row = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 6;
    td.className = "alt1";
    td.style.textAlign = "center";
    td.textContent = "No private actions recorded.";
    row.appendChild(td);
    els.actionsBody.appendChild(row);
    return;
  }
  const actions = snapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .sort((a, b) => {
      const dayDiff = (a.day ?? 0) - (b.day ?? 0);
      if (dayDiff !== 0) return dayDiff;
      return String(a.actionName || "").localeCompare(String(b.actionName || ""));
    });
  let alt = false;
  actions.forEach((action) => {
    alt = !alt;
    const row = document.createElement("tr");
    row.setAttribute("align", "center");
    row.className = alt ? "alt1" : "alt2";
    const targetDisplay = action.notes
      ? `${action.targetName || ""} (${action.notes})`
      : action.targetName || "";
    const cells = [
      action.day ?? 0,
      action.username || action.playerName || "",
      action.actionName || "",
      targetDisplay,
      action.valid === false ? "No" : "Yes",
      formatTimestamp(action.updatedAt || action.createdAt),
    ];
    cells.forEach((value) => {
      const td = document.createElement("td");
      td.textContent = value;
      td.className = alt ? "alt1" : "alt2";
      row.appendChild(td);
    });
    els.actionsBody.appendChild(row);
  });
}

async function ensureOwner() {
  if (!currentGame || !currentUser) return false;
  if (currentGame.ownerUserId !== currentUser.uid) {
    setStatus("Only the game owner can use these tools.", "error");
    disableForms(true);
    return false;
  }
  return true;
}

async function createSystemPost(title) {
  if (!currentGame || !currentUser) return;
  const postsRef = collection(db, "games", gameId, "posts");
  await addDoc(postsRef, {
    title,
    body: "",
    authorId: currentUser.uid,
    authorName: currentUser.displayName || "Moderator",
    createdAt: serverTimestamp(),
  });
}

els.renameForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!(await ensureOwner())) return;
  const value = (els.renameInput?.value || "").trim();
  if (!value) {
    setStatus("Enter a new game name first.", "error");
    return;
  }
  try {
    await updateDoc(doc(db, "games", gameId), {
      gamename: value,
      updatedAt: serverTimestamp(),
    });
    setStatus("Game name updated.", "success");
    await loadGame();
  } catch (error) {
    console.error("Failed to rename game", error);
    setStatus("Unable to rename game.", "error");
  }
});

els.resetForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!(await ensureOwner())) return;
  if (!els.resetConfirm?.checked) {
    setStatus("Check confirm before resetting.", "error");
    return;
  }
  const gameRef = doc(db, "games", gameId);
  try {
    await updateDoc(gameRef, {
      day: 0,
      active: true,
      open: true,
      updatedAt: serverTimestamp(),
    });
    await deleteCollectionDocs(collection(gameRef, "actions"));
    const players = await getDocs(collection(gameRef, "players"));
    const ownerId = currentGame?.ownerUserId || "";
    await Promise.all(
      players.docs
        .filter((docSnap) => !ownerId || docSnap.id !== ownerId)
        .map((docSnap) =>
          updateDoc(docSnap.ref, { postsLeft: -1, active: true }).catch((error) => {
            console.warn("Failed to reset player", docSnap.id, error);
          })
        )
    );
    await createSystemPost("Day 0 (game reset!)");
    setStatus("Game reset to Day 0.", "success");
    els.resetConfirm.checked = false;
    await loadGame();
  } catch (error) {
    console.error("Failed to reset game", error);
    setStatus("Unable to reset game.", "error");
  }
});

els.gameOverForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!(await ensureOwner())) return;
  if (!els.gameOverConfirm?.checked) {
    setStatus("Check confirm before ending the game.", "error");
    return;
  }
  try {
    await updateDoc(doc(db, "games", gameId), {
      active: false,
      open: false,
      updatedAt: serverTimestamp(),
    });
    await createSystemPost("GAME ENDED!");
    setStatus("Game marked as complete.", "success");
    els.gameOverConfirm.checked = false;
    await loadGame();
  } catch (error) {
    console.error("Failed to mark game over", error);
    setStatus("Unable to mark game over.", "error");
  }
});

els.clearPostsForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!(await ensureOwner())) return;
  if (!els.clearPostsConfirm?.checked) {
    setStatus("Check confirm before clearing posts.", "error");
    return;
  }
  try {
    await deleteCollectionDocs(collection(db, "games", gameId, "posts"));
    setStatus("All posts deleted.", "success");
    els.clearPostsConfirm.checked = false;
    await loadGame();
  } catch (error) {
    console.error("Failed to clear posts", error);
    setStatus("Unable to clear posts.", "error");
  }
});

els.deleteForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!(await ensureOwner())) return;
  if (!els.deleteConfirm?.checked) {
    setStatus("Check confirm before deleting the game.", "error");
    return;
  }
  const gameRef = doc(db, "games", gameId);
  try {
    await deleteCollectionDocs(collection(gameRef, "actions"));
    await deleteCollectionDocs(collection(gameRef, "players"));
    await deleteCollectionDocs(collection(gameRef, "posts"));
    await deleteDoc(gameRef);
    setStatus("Game deleted.", "success");
    els.deleteConfirm.checked = false;
    setTimeout(() => {
      window.location.href = "/legacy/index.html";
    }, 800);
  } catch (error) {
    console.error("Failed to delete game", error);
    setStatus("Unable to delete game.", "error");
  }
});

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  header?.setUser(user);
  if (missingConfig) {
    setStatus("Firebase configuration required", "error");
    disableForms(true);
    return;
  }
  if (!user) {
    setStatus("Sign in as the game owner to use these tools.");
    disableForms(true);
    return;
  }
  try {
    await ensureUserDocument(user);
  } catch (error) {
    console.warn("Failed to ensure user profile", error);
  }
  await loadGame();
});

if (!missingConfig && gameId) {
  loadGame().catch((error) => {
    console.error("Failed to load summary", error);
    setStatus("Unable to load summary.", "error");
  });
} else if (!gameId) {
  setStatus("Missing game id", "error");
}
