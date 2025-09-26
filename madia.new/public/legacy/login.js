import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { auth, db, ensureUserDocument, missingConfig, provider } from "./firebase.js";
import {
  applyPersistence,
  describeAuthError,
  ensureUsernameAvailable,
  hide,
  resolveIdentifier,
  sanitizeRedirect,
  setButtonLoading,
  setError,
  setSubmitting,
  show,
  validateSignup,
} from "./auth-helpers.js";

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

      await applyPersistence(auth, remember);
      const email = await resolveIdentifier(db, identifier);
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
      await applyPersistence(auth, true);
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
      await ensureUsernameAvailable(db, username);

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
