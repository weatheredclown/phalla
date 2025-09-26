import {
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  collection,
  getDocs,
  limit,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export function sanitizeRedirect(value, { fallback = "/legacy/index.html" } = {}) {
  if (!value) return fallback;
  try {
    const url = new URL(value, location.origin);
    if (url.origin !== location.origin) {
      return fallback;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export async function resolveIdentifier(db, identifier) {
  if (!identifier) {
    throw new Error("Enter your username or email and password.");
  }
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

export async function ensureUsernameAvailable(db, username) {
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

export function validateSignup({ username, email, password, confirm }) {
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

export async function applyPersistence(auth, remember) {
  const persistence = remember
    ? browserLocalPersistence
    : browserSessionPersistence;
  await setPersistence(auth, persistence);
}

export function setError(element, message) {
  if (!element) return;
  if (message) {
    element.textContent = message;
    element.style.display = "block";
  } else {
    element.textContent = "";
    element.style.display = "none";
  }
}

export function setSubmitting(form, submitEl, submitting, label) {
  if (submitEl) {
    if (submitEl.tagName === "BUTTON") {
      submitEl.textContent = label;
    } else {
      submitEl.value = label;
    }
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

export function setButtonLoading(button, loading, label) {
  if (!button) return;
  if (button.tagName === "BUTTON") {
    button.textContent = label;
  } else {
    button.value = label;
  }
  button.disabled = loading;
}

export function show(element) {
  if (!element) return;
  element.style.display = "block";
}

export function hide(element) {
  if (!element) return;
  element.style.display = "none";
}

export function describeAuthError(error) {
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
