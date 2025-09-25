const templateHtml = `
  <div class="legacy-header">
    <div class="legacy-header-nav smallfont" data-role="nav"></div>
    <div class="legacy-header-auth smallfont" data-role="auth">
      <span data-role="user-name" class="legacy-header-user"></span>
      <button class="button" data-role="sign-in">Sign in</button>
      <button class="button" data-role="sign-out" style="display:none;">Sign out</button>
    </div>
  </div>
`;

export function injectLegacyHeader({ mountId = "legacyHeaderMount", navHtml = "" } = {}) {
  const mount = document.getElementById(mountId);
  if (!mount) {
    throw new Error(`Legacy header mount "${mountId}" not found`);
  }

  const tpl = document.createElement("template");
  tpl.innerHTML = templateHtml.trim();
  const headerEl = tpl.content.firstElementChild.cloneNode(true);

  mount.innerHTML = "";
  mount.appendChild(headerEl);

  const nav = headerEl.querySelector('[data-role="nav"]');
  if (typeof navHtml === "string") {
    nav.innerHTML = navHtml;
  } else if (navHtml && typeof Node !== "undefined" && navHtml instanceof Node) {
    nav.appendChild(navHtml);
  }

  const signIn = headerEl.querySelector('[data-role="sign-in"]');
  const signOut = headerEl.querySelector('[data-role="sign-out"]');
  const userName = headerEl.querySelector('[data-role="user-name"]');

  return {
    container: headerEl,
    nav,
    signIn,
    signOut,
    userName,
    profileLink: nav.querySelector("#profileLink") || null,
  };
}
