import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  collection,
  collectionGroup,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  serverTimestamp,
  setDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { auth, db, ensureUserDocument, missingConfig } from "./firebase.js";
import { initLegacyHeader } from "./header.js";

const header = initLegacyHeader();

function getParam(name) {
  const params = new URLSearchParams(location.search);
  return params.get(name);
}

const els = {
  profileInfo: document.getElementById("profileInfo"),
  gamesYouPlay: document.getElementById("gamesYouPlay"),
  gamesYouOwn: document.getElementById("gamesYouOwn"),
  createForm: document.getElementById("createGameForm"),
  gameName: document.getElementById("gameName"),
  gameDesc: document.getElementById("gameDesc"),
  createBtn: document.getElementById("createBtn"),
};

let currentUser = null;
const viewedUid = getParam("u");

onAuthStateChanged(auth, async (user) => {
  header?.setUser(user);
  currentUser = user;
  if (user) {
    await ensureUserDocument(user);
  }
  renderProfileHeader();
  await loadLists();
});

function renderProfileHeader() {
  if (!viewedUid) {
    els.profileInfo.textContent = "Missing member id";
    els.createForm.style.display = "none";
    return;
  }
  const mine = currentUser && currentUser.uid === viewedUid;
  els.profileInfo.innerHTML = mine
    ? `<b>${currentUser?.displayName || "You"}</b> (you)`
    : `Member: <b>${viewedUid}</b>`;
  els.createForm.style.display = mine ? "block" : "none";
}

async function loadLists() {
  if (missingConfig) {
    els.gamesYouPlay.innerHTML = `<div class="smallfont" style="color:#F9A906;">Configure Firebase to load games.</div>`;
    els.gamesYouOwn.innerHTML = `<div class="smallfont" style="color:#F9A906;">Configure Firebase to load games.</div>`;
    return;
  }
  els.gamesYouPlay.innerHTML = groupSectionSkeleton();
  els.gamesYouOwn.innerHTML = groupSectionSkeleton();

  const ownedQ = query(collection(db, "games"), where("ownerUserId", "==", viewedUid));
  const ownedSnap = await getDocs(ownedQ);
  const owned = ownedSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  renderGrouped(els.gamesYouOwn, owned);

  // Find games where players subdoc has uid == viewedUid
  const playersCG = query(collectionGroup(db, "players"), where("uid", "==", viewedUid));
  const playersSnap = await getDocs(playersCG);
  const gameIds = new Set();
  playersSnap.forEach((p) => {
    const gameRef = p.ref.parent.parent; // games/{id}
    if (gameRef) gameIds.add(gameRef.id);
  });
  const plays = [];
  for (const gid of gameIds) {
    try {
      const d = await getDoc(doc(db, "games", gid));
      if (d.exists()) plays.push({ id: gid, ...d.data() });
    } catch (err) {
      console.warn("Failed to load game", gid, err);
    }
  }
  renderGrouped(els.gamesYouPlay, plays);
}

function groupSectionSkeleton() {
  return `
    <fieldset class="fieldset"><legend>Open</legend><div class="smallfont" data-group="open"></div></fieldset>
    <fieldset class="fieldset"><legend>Running</legend><div class="smallfont" data-group="running"></div></fieldset>
    <fieldset class="fieldset"><legend>Game Over</legend><div class="smallfont" data-group="over"></div></fieldset>
  `;
}

function renderGrouped(container, games) {
  const open = container.querySelector('[data-group="open"]');
  const running = container.querySelector('[data-group="running"]');
  const over = container.querySelector('[data-group="over"]');
  open.innerHTML = running.innerHTML = over.innerHTML = "";
  if (!games.length) {
    container.querySelectorAll('[data-group]').forEach((el) => (el.innerHTML = "<i>None</i>"));
    return;
  }
  for (const g of games.sort((a,b)=> (b.active - a.active) || ((b.open|0)-(a.open|0)) || String(a.gamename||"").localeCompare(String(b.gamename||"")))) {
    const a = document.createElement("div");
    a.innerHTML = `<a href="/legacy/game.html?g=${g.id}">${g.gamename || "(no name)"}</a>`;
    const bucket = g.active ? ((g.day||0)===0 ? open : running) : over;
    bucket.appendChild(a);
  }
}

els.createBtn.addEventListener("click", async () => {
  if (!currentUser || currentUser.uid !== viewedUid) return;
  const name = (els.gameName.value || "").trim();
  const desc = (els.gameDesc.value || "").trim();
  if (!name) return;
  const newDoc = await addDoc(collection(db, "games"), {
    gamename: name,
    description: desc,
    ownerUserId: currentUser.uid,
    ownerName: currentUser.displayName || "",
    active: true,
    open: true,
    day: 0,
    createdAt: serverTimestamp(),
  });
  // Auto-join owner
  await setDoc(doc(db, "games", newDoc.id, "players", currentUser.uid), { uid: currentUser.uid, name: currentUser.displayName || "" });
  location.href = `/legacy/game.html?g=${newDoc.id}`;
});

