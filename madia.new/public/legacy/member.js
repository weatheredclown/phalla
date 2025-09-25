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
  collectionGroup,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { injectLegacyHeader } from "./header.js";

function getParam(name) {
  const params = new URLSearchParams(location.search);
  return params.get(name);
}

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

const header = injectLegacyHeader({
  navHtml: `<a href="/legacy/index.html">&laquo; back to games</a>`,
});

const els = {
  profileInfo: document.getElementById("profileInfo"),
  gamesYouPlay: document.getElementById("gamesYouPlay"),
  gamesYouOwn: document.getElementById("gamesYouOwn"),
  createForm: document.getElementById("createGameForm"),
  gameName: document.getElementById("gameName"),
  gameDesc: document.getElementById("gameDesc"),
  createBtn: document.getElementById("createBtn"),
  signIn: header.signIn,
  signOut: header.signOut,
  userName: header.userName,
};

let currentUser = null;
const viewedUid = getParam("u");

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  els.signIn.style.display = user ? "none" : "inline-block";
  els.signOut.style.display = user ? "inline-block" : "none";
  if (els.userName) {
    els.userName.textContent = user ? user.displayName || "" : "";
  }
  renderProfileHeader();
  await loadLists();
});

els.signIn.addEventListener("click", async () => {
  await signInWithPopup(auth, provider);
});

els.signOut.addEventListener("click", async () => {
  await signOut(auth);
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
    const d = await (await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js")).getDoc(doc(db, "games", gid));
    if (d.exists()) plays.push({ id: gid, ...d.data() });
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
    a.innerHTML = `<a href="/legacy/gamedisplay.html?g=${g.id}">${g.gamename || "(no name)"}</a>`;
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

