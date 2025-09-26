import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDLVQ_ncruYo7Xd0tCzh8RIvlmzhrQYt_8",
  authDomain: "mafia-c37ad.firebaseapp.com",
  projectId: "mafia-c37ad",
  storageBucket: "mafia-c37ad.firebasestorage.app",
  messagingSenderId: "7209477847",
  appId: "1:7209477847:web:19dd92af0e42324b62f292",
};

const missingConfig = Object.values(firebaseConfig).some(
  (value) => typeof value === "string" && value.startsWith("YOUR_")
);

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

async function ensureUserDocument(user, overrides = {}) {
  if (!user || missingConfig) {
    return;
  }

  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef).catch(() => null);

  const displayName =
    overrides.displayName ?? overrides.username ?? user.displayName ?? "";
  const username = overrides.username ?? displayName;
  const email = overrides.email ?? user.email ?? "";

  const profile = {
    lastLoginAt: serverTimestamp(),
  };

  if (displayName) {
    profile.displayName = displayName;
  }
  if (email) {
    profile.email = email;
  }
  if (user.photoURL) {
    profile.photoURL = user.photoURL;
  }
  if (username) {
    profile.username = username;
    profile.usernameLower = username.toLowerCase();
  }

  if (!snapshot || !snapshot.exists()) {
    await setDoc(
      userRef,
      {
        ...profile,
        createdAt: serverTimestamp(),
      }
    );
    return;
  }

  await setDoc(userRef, profile, { merge: true });
}

export {
  app,
  auth,
  db,
  provider,
  firebaseConfig,
  missingConfig,
  ensureUserDocument,
};
