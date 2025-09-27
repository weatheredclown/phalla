import {
  onAuthStateChanged,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  collection,
  collectionGroup,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  serverTimestamp,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  auth,
  db,
  ensureUserDocument,
  missingConfig,
  storage,
} from "./firebase.js";
import {
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { initLegacyHeader } from "./header.js";

const header = initLegacyHeader();

function getParam(name) {
  const params = new URLSearchParams(location.search);
  return params.get(name);
}

const els = {
  profileInfo: document.getElementById("profileInfo"),
  profileAvatar: document.getElementById("profileAvatar"),
  profileDisplayName: document.getElementById("profileDisplayName"),
  profileEmail: document.getElementById("profileEmail"),
  profileForm: document.getElementById("profileForm"),
  displayNameInput: document.getElementById("displayNameInput"),
  avatarInput: document.getElementById("avatarInput"),
  profileStatus: document.getElementById("profileStatus"),
  gamesYouPlay: document.getElementById("gamesYouPlay"),
  gamesYouOwn: document.getElementById("gamesYouOwn"),
  createForm: document.getElementById("createGameForm"),
  gameName: document.getElementById("gameName"),
  gameDesc: document.getElementById("gameDesc"),
  createBtn: document.getElementById("createBtn"),
};

const defaultAvatar = "/images/avatars/001.jpg";
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

let currentUser = null;
const viewedUid = getParam("u");
const profileDocRef = viewedUid ? doc(db, "users", viewedUid) : null;
let profileData = null;

onAuthStateChanged(auth, async (user) => {
  header?.setUser(user);
  currentUser = user;
  if (user) {
    await ensureUserDocument(user);
  }
  await loadProfile();
  await loadLists();
});

async function loadProfile() {
  setProfileStatus("");

  const mine = currentUser && currentUser.uid === viewedUid;

  if (!viewedUid || !profileDocRef) {
    profileData = null;
    renderProfileHeader();
    renderProfileCard();
    return;
  }

  if (missingConfig) {
    if (mine && currentUser) {
      profileData = {
        displayName: currentUser.displayName || "",
        email: currentUser.email || "",
        photoURL: currentUser.photoURL || "",
      };
      setProfileStatus("Configure Firebase to edit your profile.", "info");
    } else {
      profileData = {};
    }
    renderProfileHeader();
    renderProfileCard();
    return;
  }

  try {
    const snapshot = await getDoc(profileDocRef);
    profileData = snapshot.exists() ? snapshot.data() : {};
  } catch (error) {
    console.error("Failed to load user profile", error);
    profileData = profileData || {};
    if (mine) {
      setProfileStatus("We couldn't load your profile right now.", "error");
    }
  }

  if (mine && currentUser) {
    profileData = {
      ...profileData,
      displayName: profileData.displayName || currentUser.displayName || "",
      email: profileData.email || currentUser.email || "",
      photoURL: profileData.photoURL || currentUser.photoURL || "",
    };
  }

  renderProfileHeader();
  renderProfileCard();
}

function renderProfileHeader() {
  if (!els.profileInfo) {
    return;
  }

  if (!viewedUid) {
    els.profileInfo.textContent = "Missing member id";
    if (els.createForm) {
      els.createForm.style.display = "none";
    }
    if (els.profileForm) {
      els.profileForm.style.display = "none";
    }
    return;
  }

  const mine = currentUser && currentUser.uid === viewedUid;
  const name =
    profileData?.displayName ||
    (mine ? currentUser?.displayName : "") ||
    "";
  const label = name || viewedUid;

  els.profileInfo.innerHTML = mine
    ? `<b>${label || "You"}</b> (you)`
    : `Member: <b>${label}</b>`;

  if (els.createForm) {
    els.createForm.style.display = mine && !missingConfig ? "block" : "none";
  }
}

function renderProfileCard() {
  if (!els.profileAvatar) {
    return;
  }

  const mine = currentUser && currentUser.uid === viewedUid;
  const name =
    profileData?.displayName ||
    (mine ? currentUser?.displayName : "") ||
    "";
  const email =
    profileData?.email ||
    (mine ? currentUser?.email : "") ||
    "";
  const photo =
    profileData?.photoURL ||
    (mine ? currentUser?.photoURL : "") ||
    defaultAvatar;

  els.profileAvatar.src = photo;

  if (els.profileDisplayName) {
    const hasName = Boolean(name);
    els.profileDisplayName.textContent = hasName
      ? name
      : mine
      ? "(no display name yet)"
      : "(no display name)";
    els.profileDisplayName.classList.toggle("empty", !hasName);
  }

  if (els.profileEmail) {
    if (email) {
      els.profileEmail.textContent = email;
      els.profileEmail.style.display = "block";
    } else {
      els.profileEmail.textContent = "";
      els.profileEmail.style.display = "none";
    }
  }

  if (els.profileForm) {
    els.profileForm.style.display = mine && !missingConfig ? "block" : "none";
  }

  if (
    mine &&
    els.displayNameInput &&
    document.activeElement !== els.displayNameInput
  ) {
    els.displayNameInput.value = name || "";
  }

  if (!mine && els.profileStatus) {
    els.profileStatus.textContent = "";
    els.profileStatus.style.display = "none";
  }
}

function setProfileStatus(message, tone = "info") {
  if (!els.profileStatus) {
    return;
  }

  const mine = currentUser && currentUser.uid === viewedUid;
  if (!mine) {
    els.profileStatus.textContent = "";
    els.profileStatus.style.display = "none";
    return;
  }

  if (!message) {
    els.profileStatus.textContent = "";
    els.profileStatus.style.display = "none";
    return;
  }

  const colors = {
    success: "#8ddf8d",
    error: "#ffb3a9",
    info: "#F9A906",
  };

  els.profileStatus.textContent = message;
  els.profileStatus.style.display = "block";
  els.profileStatus.style.color = colors[tone] || colors.info;
}

function resizeImageTo64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Unable to process image"));
          return;
        }
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.clearRect(0, 0, 64, 64);
        ctx.drawImage(img, sx, sy, size, size, 0, 0, 64, 64);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Unable to resize image"));
          }
        }, "image/png");
      };
      img.onerror = () => reject(new Error("Unable to load image"));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Unable to read image"));
    reader.readAsDataURL(file);
  });
}

if (els.profileForm) {
  els.profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const mine = currentUser && currentUser.uid === viewedUid;
    if (!mine || missingConfig || !profileDocRef) {
      return;
    }

    const newName = (els.displayNameInput?.value || "").trim();
    if (!newName) {
      setProfileStatus("Display name cannot be empty.", "error");
      return;
    }
    if (newName.length > 40) {
      setProfileStatus("Display name must be 40 characters or fewer.", "error");
      return;
    }
    if (profileData?.displayName === newName) {
      setProfileStatus("That display name is already saved.", "info");
      return;
    }

    setProfileStatus("Saving display name...", "info");

    let authUpdateFailed = false;
    if (currentUser) {
      try {
        await updateProfile(currentUser, { displayName: newName });
      } catch (error) {
        authUpdateFailed = true;
        console.warn("Failed to update auth display name", error);
      }
    }

    try {
      await setDoc(
        profileDocRef,
        {
          displayName: newName,
          username: newName,
          usernameLower: newName.toLowerCase(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      profileData = {
        ...profileData,
        displayName: newName,
        username: newName,
        usernameLower: newName.toLowerCase(),
      };

      if (currentUser) {
        currentUser = auth.currentUser;
        header?.setUser(auth.currentUser);
      }

      renderProfileHeader();
      renderProfileCard();

      if (authUpdateFailed) {
        setProfileStatus(
          "Display name saved. Sign out and back in to refresh everywhere.",
          "info"
        );
      } else {
        setProfileStatus("Display name updated.", "success");
      }
    } catch (error) {
      console.error("Failed to update display name", error);
      setProfileStatus("Failed to update display name. Try again later.", "error");
    }
  });
}

if (els.avatarInput) {
  els.avatarInput.addEventListener("change", async (event) => {
    const input = event.target;
    const file = input.files && input.files[0];
    if (!file) {
      return;
    }

    const mine = currentUser && currentUser.uid === viewedUid;
    if (!mine || missingConfig || !profileDocRef) {
      input.value = "";
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      setProfileStatus("Please choose an image smaller than 5 MB.", "error");
      input.value = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      setProfileStatus("Please choose an image file.", "error");
      input.value = "";
      return;
    }

    setProfileStatus("Uploading thumbnail...", "info");

    const previousPhoto = els.profileAvatar?.src || "";
    let previewUrl = "";
    let authUpdateFailed = false;

    try {
      const resized = await resizeImageTo64(file);
      previewUrl = URL.createObjectURL(resized);
      if (els.profileAvatar) {
        els.profileAvatar.src = previewUrl;
      }

      const avatarRef = storageRef(
        storage,
        `thumbnails/${viewedUid}-${Date.now()}.png`
      );
      await uploadBytes(avatarRef, resized, { contentType: "image/png" });
      const downloadUrl = await getDownloadURL(avatarRef);

      if (currentUser) {
        try {
          await updateProfile(currentUser, { photoURL: downloadUrl });
        } catch (error) {
          authUpdateFailed = true;
          console.warn("Failed to update auth thumbnail", error);
        }
      }

      await setDoc(
        profileDocRef,
        { photoURL: downloadUrl, updatedAt: serverTimestamp() },
        { merge: true }
      );

      profileData = {
        ...profileData,
        photoURL: downloadUrl,
      };

      if (currentUser) {
        currentUser = auth.currentUser;
        header?.setUser(auth.currentUser);
      }

      renderProfileCard();

      if (authUpdateFailed) {
        setProfileStatus(
          "Thumbnail saved. Sign out and back in to refresh everywhere.",
          "info"
        );
      } else {
        setProfileStatus("Thumbnail updated.", "success");
      }
    } catch (error) {
      console.error("Failed to update thumbnail", error);
      setProfileStatus(
        "Couldn't update thumbnail. Please try a different image.",
        "error"
      );
      if (previousPhoto && els.profileAvatar) {
        els.profileAvatar.src = previousPhoto;
      }
    } finally {
      if (previewUrl) {
        setTimeout(() => URL.revokeObjectURL(previewUrl), 4000);
      }
      input.value = "";
    }
  });
}

function renderListMessage(container, message, tone = "info") {
  if (!container) {
    return;
  }
  const colors = {
    success: "#8ddf8d",
    error: "#ffb3a9",
    info: "#F9A906",
  };
  container.innerHTML = `<div class="smallfont" style="color:${colors[tone] || colors.info};">${message}</div>`;
}

function isPermissionDenied(error) {
  return error?.code === "permission-denied";
}

function handleListError(error) {
  console.error("Failed to load games", error);
  const message = isPermissionDenied(error)
    ? currentUser
      ? "You don't have permission to view games yet."
      : "Sign in to view games."
    : "We couldn't load games right now.";
  const tone = isPermissionDenied(error) ? "info" : "error";
  renderListMessage(els.gamesYouPlay, message, tone);
  renderListMessage(els.gamesYouOwn, message, tone);
}

async function loadLists() {
  if (missingConfig) {
    renderListMessage(
      els.gamesYouPlay,
      "Configure Firebase to load games.",
      "info"
    );
    renderListMessage(
      els.gamesYouOwn,
      "Configure Firebase to load games.",
      "info"
    );
    return;
  }
  els.gamesYouPlay.innerHTML = groupSectionSkeleton();
  els.gamesYouOwn.innerHTML = groupSectionSkeleton();

  try {
    const ownedQ = query(
      collection(db, "games"),
      where("ownerUserId", "==", viewedUid)
    );
    const ownedSnap = await getDocs(ownedQ);
    const owned = ownedSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderGrouped(els.gamesYouOwn, owned);
  } catch (error) {
    handleListError(error);
    return;
  }

  // Find games where players subdoc has uid == viewedUid
  let playersSnap;
  try {
    const playersCG = query(
      collectionGroup(db, "players"),
      where("uid", "==", viewedUid)
    );
    playersSnap = await getDocs(playersCG);
  } catch (error) {
    handleListError(error);
    return;
  }

  const gameIds = new Set();
  playersSnap.forEach((p) => {
    const gameRef = p.ref.parent.parent; // games/{id}
    if (gameRef) gameIds.add(gameRef.id);
  });
  const plays = [];
  for (const gid of gameIds) {
    try {
      const d = await getDoc(doc(db, "games", gid));
      if (d.exists()) {
        const data = d.data();
        if (data.ownerUserId === viewedUid) {
          continue;
        }
        plays.push({ id: gid, ...data });
      }
    } catch (error) {
      if (isPermissionDenied(error)) {
        handleListError(error);
        return;
      }
      console.warn("Failed to load game", gid, error);
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
  location.href = `/legacy/game.html?g=${newDoc.id}`;
});

