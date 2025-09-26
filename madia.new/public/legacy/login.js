import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  collection,
  getDocs,
  limit,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  auth,
  db,
  ensureUserDocument,
  missingConfig,
  provider,
} from "./firebase.js";

const els = {
  configWarning: document.getElementById("configWarning"),
  loginSection: document.getElementById("loginSection"),
  loginForm: document.getElementById("loginForm"),
  loginUsername: document.getElementById("loginUsername"),
  loginPassword: document.getElementById("loginPassword"),
  loginRemember: document.getElementById("loginRemember"),
  loginError: document.getElementById("loginError"),
  loginSubmit: document.getElementById("loginSubmit"),
  googleSignIn: document.getElementById("googleSignIn"),
  signupSection: document.getElementById("signupSection"),
  signupForm: document.getElementById("signupForm"),
  signupUsername: document.getElementById("signupUsername"),
  signupPassword: document.getElementById("signupPassword"),
  signupConfirmPassword: document.getElementById("signupConfirmPassword"),
  signupEmail: document.getElementById("signupEmail"),
  signupError: document.getElementById("signupError"),
  signupSubmit: document.getElementById("signupSubmit"),
  signedInNotice: document.getElementById("signedInNotice"),
  signedInName: document.getElementById("signedInName"),
  continueButton: document.getElementById("continueButton"),
  signOutButton: document.getElementById("signOutButton"),
};

const params = new URLSearchParams(location.search);
const redirectTarget = sanitizeRedirect(params.get("redirect"));
const wantsSignup = location.hash.toLowerCase() === "#signup";
let focusApplied = false;

if (els.continueButton) {
  els.continueButton.addEventListener("click", (event) => {
    event.preventDefault();
    location.href = redirectTarget;
  });
}

if (els.signOutButton) {
  els.signOutButton.addEventListener("click", async (event) => {
    event.preventDefault();
    await signOut(auth);
  });
}

if (missingConfig) {
  showConfigWarning(
    "Firebase configuration required. Update public/legacy/firebase.js before using authentication."
  );
  disableSection(els.loginSection);
  disableSection(els.signupSection);
  if (els.googleSignIn) els.googleSignIn.disabled = true;
} else {
  hide(els.configWarning);
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    await ensureUserDocument(user);
    if (els.signedInName) {
      els.signedInName.textContent = user.displayName || user.email || user.uid;
    }
    show(els.signedInNotice);
    hide(els.loginSection);
    hide(els.signupSection);
    focusApplied = false;
  } else {
    hide(els.signedInNotice);
    if (!missingConfig) {
      show(els.loginSection);
      show(els.signupSection);
      if (!focusApplied) {
        focusApplied = true;
        if (wantsSignup) {
          els.signupSection?.scrollIntoView({ behavior: "smooth", block: "start" });
          els.signupUsername?.focus();
        } else {
          els.loginUsername?.focus();
        }
      }
    }
  }
});

if (els.loginForm) {
  els.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (missingConfig) return;

    const identifier = (els.loginUsername?.value || "").trim();
    const password = els.loginPassword?.value || "";
    const remember = Boolean(els.loginRemember?.checked);

    setError(els.loginError, "");
    setSubmitting(els.loginForm, els.loginSubmit, true, "Logging in...");

    try {
      if (!identifier || !password) {
        throw new Error("Enter your username or email and password.");
      }

      await applyPersistence(remember);
      const email = await resolveIdentifier(identifier);
      const credential = await signInWithEmailAndPassword(auth, email, password);
      await ensureUserDocument(credential.user);
      location.href = redirectTarget;
    } catch (error) {
      setError(els.loginError, describeAuthError(error));
    } finally {
      setSubmitting(els.loginForm, els.loginSubmit, false, "Log in");
    }
  });
}

if (els.googleSignIn) {
  els.googleSignIn.addEventListener("click", async (event) => {
    event.preventDefault();
    if (missingConfig) return;

    setError(els.loginError, "");
    setButtonLoading(els.googleSignIn, true, "Signing in...");
    try {
      await setPersistence(auth, browserLocalPersistence);
      const credential = await signInWithPopup(auth, provider);
      await ensureUserDocument(credential.user);
      location.href = redirectTarget;
    } catch (error) {
      setError(els.loginError, describeAuthError(error));
    } finally {
      setButtonLoading(els.googleSignIn, false, "Sign in with Google");
    }
  });
}

if (els.signupForm) {
  els.signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (missingConfig) return;

    const username = (els.signupUsername?.value || "").trim();
    const email = (els.signupEmail?.value || "").trim();
    const password = els.signupPassword?.value || "";
    const confirm = els.signupConfirmPassword?.value || "";

    setError(els.signupError, "");
    setSubmitting(els.signupForm, els.signupSubmit, true, "Signing up...");

    try {
      validateSignup({ username, email, password, confirm });
      await ensureUsernameAvailable(username);

      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName: username });
      await ensureUserDocument(credential.user, {
        username,
        email,
        displayName: username,
      });
      location.href = redirectTarget;
    } catch (error) {
      setError(els.signupError, describeAuthError(error));
    } finally {
      setSubmitting(els.signupForm, els.signupSubmit, false, "Sign Up!");
    }
  });
}

function sanitizeRedirect(value) {
  if (!value) return "/legacy/index.html";
  try {
    const url = new URL(value, location.origin);
    if (url.origin !== location.origin) {
      return "/legacy/index.html";
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/legacy/index.html";
  }
}

async function resolveIdentifier(identifier) {
  if (identifier.includes("@")) {
    return identifier.toLowerCase();
  }
  const usernameLower = identifier.toLowerCase();
  const q = query(
    collection(db, "users"),
    where("usernameLower", "==", usernameLower),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    throw new Error("No account matches that username.");
  }
  const data = snapshot.docs[0].data();
  if (!data.email) {
    throw new Error("This account does not have an email on file. Use email to sign in.");
  }
  return data.email;
}

async function ensureUsernameAvailable(username) {
  const q = query(
    collection(db, "users"),
    where("usernameLower", "==", username.toLowerCase()),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    throw new Error("Username already in use.");
  }
}

function validateSignup({ username, email, password, confirm }) {
  if (!username) {
    throw new Error("Choose a username.");
  }
  if (!email) {
    throw new Error("Enter an email address.");
  }
  if (!password) {
    throw new Error("Enter a password.");
  }
  if (password.length < 6) {
    throw new Error("Choose a password with at least 6 characters.");
  }
  if (password !== confirm) {
    throw new Error("Passwords do not match.");
  }
}

async function applyPersistence(remember) {
  const persistence = remember
    ? browserLocalPersistence
    : browserSessionPersistence;
  await setPersistence(auth, persistence);
}

function setError(element, message) {
  if (!element) return;
  if (message) {
    element.textContent = message;
    element.style.display = "block";
  } else {
    element.textContent = "";
    element.style.display = "none";
  }
}

function setSubmitting(form, submitEl, submitting, label) {
  if (submitEl) {
    submitEl.value = label;
    submitEl.disabled = submitting;
  }
  if (form) {
    Array.from(form.elements).forEach((el) => {
      if (el !== submitEl) {
        el.disabled = submitting;
      }
    });
  }
}

function setButtonLoading(button, loading, label) {
  if (!button) return;
  button.textContent = label;
  button.disabled = loading;
}

function showConfigWarning(message) {
  if (!els.configWarning) return;
  els.configWarning.textContent = message;
  els.configWarning.style.display = "block";
}

function disableSection(section) {
  if (!section) return;
  section.style.opacity = "0.5";
  const controls = section.querySelectorAll("input, button");
  controls.forEach((el) => {
    el.disabled = true;
  });
}

function show(element) {
  if (!element) return;
  element.style.display = "block";
}

function hide(element) {
  if (!element) return;
  element.style.display = "none";
}

function describeAuthError(error) {
  if (!error) {
    return "An unknown error occurred.";
  }
  if (typeof error === "string") {
    return error;
  }
  switch (error.code) {
    case "auth/user-not-found":
      return "No account found with that email.";
    case "auth/wrong-password":
      return "Incorrect password.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/email-already-in-use":
      return "That email address is already in use.";
    case "auth/weak-password":
      return "Choose a stronger password (6+ characters).";
    case "auth/account-exists-with-different-credential":
      return "That email is linked to another sign-in method.";
    case "auth/credential-already-in-use":
      return "That credential is already linked to another account.";
    case "auth/popup-closed-by-user":
      return "Google sign-in was cancelled.";
    case "auth/popup-blocked":
      return "Allow popups to sign in with Google.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again later.";
    default:
      return error.message || "An unknown error occurred.";
  }
}
