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
  setButtonLoading,
  setError,
  setSubmitting,
  show,
  validateSignup,
} from "./auth-helpers.js";

export function initLegacyHeader({ containerId = "legacyHeader" } = {}) {
  const container = document.getElementById(containerId);
  if (!container) {
    return null;
  }

  container.innerHTML = `
    <!-- logo -->
    <a name="top"></a>
    <table
      border="0"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      align="center"
      style="background-image:url(/images/head_back.gif)"
    >
      <tr>
        <td align="left" valign="top" width="90%">
          <a href="http://www.penny-arcade.com/" style="border:none;text-decoration:none;">&nbsp;</a>
        </td>
        <td
          nowrap="nowrap"
          valign="top"
          style="padding-top:15px;padding-right:15px;position:relative;"
        >
          <div class="smallfont">
            <span id="legacyHeaderWelcome" style="display:none;">
              <strong>
                Welcome, <a href="#" id="legacyHeaderProfile"></a>.
                (<a href="#" id="legacyHeaderLogout">Log Out</a>)
              </strong>
            </span>
            <span id="legacyHeaderAnon">
              <button id="legacyHeaderTrigger" class="button">Sign in / Sign up</button>
            </span>
          </div>
          <div id="legacyHeaderAuthPanel" class="legacy-auth-panel" style="display:none;">
            <button
              type="button"
              id="legacyHeaderClosePanel"
              class="legacy-auth-close"
              aria-label="Close sign-in form"
            >
              &times;
            </button>
            <div
              id="legacyHeaderConfigWarning"
              class="smallfont legacy-auth-warning"
              style="display:none;"
            ></div>
            <div class="legacy-auth-tabs smallfont">
              <button type="button" id="legacyHeaderShowLogin" class="legacy-auth-tab active">
                Log in
              </button>
              <button type="button" id="legacyHeaderShowSignup" class="legacy-auth-tab">
                Sign up
              </button>
            </div>
            <div id="legacyHeaderLoginSection" class="legacy-auth-section">
              <div
                id="legacyHeaderLoginError"
                class="smallfont legacy-auth-error"
                style="display:none;"
              ></div>
              <form id="legacyHeaderLoginForm">
                <label class="smallfont" for="legacyHeaderLoginUsername">Username or Email</label>
                <input
                  type="text"
                  id="legacyHeaderLoginUsername"
                  class="bginput"
                  autocomplete="username"
                />
                <label class="smallfont" for="legacyHeaderLoginPassword">Password</label>
                <input
                  type="password"
                  id="legacyHeaderLoginPassword"
                  class="bginput"
                  autocomplete="current-password"
                />
                <label class="smallfont legacy-auth-remember">
                  <input type="checkbox" id="legacyHeaderLoginRemember" checked />
                  remember me
                </label>
                <input
                  type="submit"
                  id="legacyHeaderLoginSubmit"
                  class="button"
                  value="Log in"
                />
              </form>
              <button id="legacyHeaderGoogleButton" class="button legacy-auth-google">
                Sign in with Google
              </button>
            </div>
            <div
              id="legacyHeaderSignupSection"
              class="legacy-auth-section"
              style="display:none;"
            >
              <div
                id="legacyHeaderSignupError"
                class="smallfont legacy-auth-error"
                style="display:none;"
              ></div>
              <form id="legacyHeaderSignupForm">
                <label class="smallfont" for="legacyHeaderSignupUsername">Username</label>
                <input
                  type="text"
                  id="legacyHeaderSignupUsername"
                  class="bginput"
                  autocomplete="nickname"
                />
                <label class="smallfont" for="legacyHeaderSignupEmail">Email address</label>
                <input
                  type="email"
                  id="legacyHeaderSignupEmail"
                  class="bginput"
                  autocomplete="email"
                />
                <label class="smallfont" for="legacyHeaderSignupPassword">Password</label>
                <input
                  type="password"
                  id="legacyHeaderSignupPassword"
                  class="bginput"
                  autocomplete="new-password"
                />
                <label class="smallfont" for="legacyHeaderSignupConfirm">Confirm password</label>
                <input
                  type="password"
                  id="legacyHeaderSignupConfirm"
                  class="bginput"
                  autocomplete="new-password"
                />
                <div class="smallfont" style="margin:6px 0;">
                  Email is required for account recovery and multi-login support.
                </div>
                <input
                  type="submit"
                  id="legacyHeaderSignupSubmit"
                  class="button"
                  value="Sign up"
                />
              </form>
            </div>
          </div>
        </td>
      </tr>
    </table>
    <!-- /logo -->
    <table
      width="100%"
      style="background-image:url(/images/nav_back.gif)"
      align="center"
      border="0"
      cellpadding="0"
      cellspacing="0"
    >
      <tr>
        <td align="left" valign="middle" height="48">
          <table width="100%" align="left" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td align="left" valign="middle" width="192" height="48">&nbsp;</td>
              <td align="left" valign="middle" class="smallfont" id="legacyHeaderNav" style="padding-left:12px;">
                &nbsp;
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  const els = {
    welcome: container.querySelector("#legacyHeaderWelcome"),
    anon: container.querySelector("#legacyHeaderAnon"),
    profileLink: container.querySelector("#legacyHeaderProfile"),
    signOutLink: container.querySelector("#legacyHeaderLogout"),
    trigger: container.querySelector("#legacyHeaderTrigger"),
    panel: container.querySelector("#legacyHeaderAuthPanel"),
    closePanel: container.querySelector("#legacyHeaderClosePanel"),
    configWarning: container.querySelector("#legacyHeaderConfigWarning"),
    loginSection: container.querySelector("#legacyHeaderLoginSection"),
    loginForm: container.querySelector("#legacyHeaderLoginForm"),
    loginError: container.querySelector("#legacyHeaderLoginError"),
    loginUsername: container.querySelector("#legacyHeaderLoginUsername"),
    loginPassword: container.querySelector("#legacyHeaderLoginPassword"),
    loginRemember: container.querySelector("#legacyHeaderLoginRemember"),
    loginSubmit: container.querySelector("#legacyHeaderLoginSubmit"),
    googleButton: container.querySelector("#legacyHeaderGoogleButton"),
    signupSection: container.querySelector("#legacyHeaderSignupSection"),
    signupForm: container.querySelector("#legacyHeaderSignupForm"),
    signupError: container.querySelector("#legacyHeaderSignupError"),
    signupUsername: container.querySelector("#legacyHeaderSignupUsername"),
    signupEmail: container.querySelector("#legacyHeaderSignupEmail"),
    signupPassword: container.querySelector("#legacyHeaderSignupPassword"),
    signupConfirm: container.querySelector("#legacyHeaderSignupConfirm"),
    signupSubmit: container.querySelector("#legacyHeaderSignupSubmit"),
    showLogin: container.querySelector("#legacyHeaderShowLogin"),
    showSignup: container.querySelector("#legacyHeaderShowSignup"),
    nav: container.querySelector("#legacyHeaderNav"),
  };

  function escapeHtml(value) {
    if (value === null || value === undefined) {
      return "";
    }
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setNavLinks(links = []) {
    if (!els.nav) {
      return;
    }
    if (!Array.isArray(links) || !links.length) {
      els.nav.innerHTML = "&nbsp;";
      return;
    }
    const parts = [];
    links.forEach((link, index) => {
      if (!link || typeof link !== "object") {
        return;
      }
      const separator = index === 0 ? "" : " &raquo; ";
      const label = escapeHtml(link.label || "");
      if (link.current) {
        const italicized = link.italic ? `<i>${label}</i>` : label;
        parts.push(`${separator}<strong>${italicized}</strong>`);
        return;
      }
      if (link.href) {
        parts.push(
          `${separator}<span class="navbar"><a href="${escapeHtml(link.href)}">${label}</a></span>`
        );
        return;
      }
      parts.push(`${separator}<span class="navbar">${label}</span>`);
    });
    if (!parts.length) {
      els.nav.innerHTML = "&nbsp;";
      return;
    }
    els.nav.innerHTML = parts.join("");
  }

  let currentMode = "login";
  let panelVisible = false;

  function updateUser(user) {
    if (user) {
      show(els.welcome);
      hide(els.anon);
      if (els.profileLink) {
        const label = user.displayName || user.email || "profile";
        els.profileLink.textContent = label;
        els.profileLink.href = `/legacy/member.html?u=${encodeURIComponent(user.uid)}`;
      }
      closePanel();
    } else {
      hide(els.welcome);
      show(els.anon);
    }
  }

  function setMode(mode) {
    currentMode = mode;
    if (mode === "signup") {
      hide(els.loginSection);
      show(els.signupSection);
      els.showSignup?.classList.add("active");
      els.showLogin?.classList.remove("active");
    } else {
      show(els.loginSection);
      hide(els.signupSection);
      els.showLogin?.classList.add("active");
      els.showSignup?.classList.remove("active");
    }
  }

  function openPanel(mode = currentMode) {
    setMode(mode);
    if (!panelVisible) {
      els.panel?.setAttribute("aria-hidden", "false");
      show(els.panel);
      panelVisible = true;
      const focusTarget =
        mode === "signup" ? els.signupUsername : els.loginUsername;
      focusTarget?.focus();
    }
  }

  function closePanel() {
    if (!panelVisible) return;
    hide(els.panel);
    els.panel?.setAttribute("aria-hidden", "true");
    panelVisible = false;
  }

  function togglePanel(event, mode) {
    event?.preventDefault();
    event?.stopPropagation();
    if (panelVisible && mode === currentMode) {
      closePanel();
    } else {
      openPanel(mode);
    }
  }

  function outsideClickListener(event) {
    if (!panelVisible) return;
    if (!els.panel?.contains(event.target) && event.target !== els.trigger) {
      closePanel();
    }
  }

  document.addEventListener("click", outsideClickListener);

  els.trigger?.addEventListener("click", (event) => togglePanel(event, currentMode));
  els.closePanel?.addEventListener("click", (event) => {
    event.preventDefault();
    closePanel();
  });
  els.showLogin?.addEventListener("click", (event) => {
    event.preventDefault();
    openPanel("login");
  });
  els.showSignup?.addEventListener("click", (event) => {
    event.preventDefault();
    openPanel("signup");
  });

  if (els.signOutLink) {
    els.signOutLink.addEventListener("click", async (event) => {
      event.preventDefault();
      await signOut(auth);
    });
  }

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
        await applyPersistence(auth, remember);
        const email = await resolveIdentifier(db, identifier);
        const credential = await signInWithEmailAndPassword(auth, email, password);
        await ensureUserDocument(credential.user);
        closePanel();
      } catch (error) {
        setError(els.loginError, describeAuthError(error));
      } finally {
        setSubmitting(els.loginForm, els.loginSubmit, false, "Log in");
      }
    });
  }

  if (els.googleButton) {
    els.googleButton.addEventListener("click", async (event) => {
      event.preventDefault();
      if (missingConfig) return;

      setError(els.loginError, "");
      setButtonLoading(els.googleButton, true, "Signing in...");
      try {
        await applyPersistence(auth, true);
        const credential = await signInWithPopup(auth, provider);
        await ensureUserDocument(credential.user);
        closePanel();
      } catch (error) {
        setError(els.loginError, describeAuthError(error));
      } finally {
        setButtonLoading(els.googleButton, false, "Sign in with Google");
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
      const confirm = els.signupConfirm?.value || "";

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
        closePanel();
      } catch (error) {
        setError(els.signupError, describeAuthError(error));
      } finally {
        setSubmitting(els.signupForm, els.signupSubmit, false, "Sign up");
      }
    });
  }

  if (missingConfig) {
    show(els.configWarning);
    els.configWarning.textContent =
      "Firebase configuration required. Update public/legacy/firebase.js before signing in.";
    disableSection(els.loginSection);
    disableSection(els.signupSection);
    if (els.googleButton) {
      els.googleButton.disabled = true;
    }
  }

  onAuthStateChanged(auth, (user) => {
    updateUser(user);
  });

  setNavLinks([
    { label: "List of Games", href: "/legacy/index.html", current: true },
  ]);

  function disableSection(section) {
    if (!section) return;
    section.style.opacity = "0.5";
    const controls = section.querySelectorAll("input, button");
    controls.forEach((control) => {
      control.disabled = true;
    });
  }

  function destroy() {
    document.removeEventListener("click", outsideClickListener);
  }

  return {
    container,
    openAuthPanel: openPanel,
    closeAuthPanel: closePanel,
    profileLink: els.profileLink,
    setUser: updateUser,
    setNavLinks,
    destroy,
  };
}
