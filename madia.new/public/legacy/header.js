export function initLegacyHeader({ containerId = "legacyHeader" } = {}) {
  const container = document.getElementById(containerId);
  if (!container) {
    return null;
  }

  container.innerHTML = `
    <!-- logo -->
    <a name="top"></a>
    <table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="background-image:url(/images/head_back.gif)">
      <tr>
        <td align="left" valign="top" width="90%">
          <a href="http://www.penny-arcade.com/" style="border:none;text-decoration:none;">&nbsp;</a>
        </td>
        <td nowrap="nowrap" valign="top" style="padding-top:15px;padding-right:15px;">
          <div class="smallfont">
            <span id="legacyHeaderWelcome" style="display:none;">
              <strong>
                Welcome, <a href="#" id="legacyHeaderProfile"></a>.
                (<a href="#" id="legacyHeaderLogout">Log Out</a>)
              </strong>
            </span>
            <span id="legacyHeaderAnon">
              <button id="legacyHeaderSignIn" class="button">Sign in with Google</button>
            </span>
          </div>
        </td>
      </tr>
    </table>
    <!-- /logo -->
    <table width="100%" style="background-image:url(/images/nav_back.gif)" align="center" border="0" cellpadding="0" cellspacing="0">
      <tr>
        <td align="left" valign="top" height="48">
          <table width="50%" align="left" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td align="left" valign="top" width="192" height="48">&nbsp;</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  const signInButton = container.querySelector("#legacyHeaderSignIn");
  const signOutLink = container.querySelector("#legacyHeaderLogout");
  const welcome = container.querySelector("#legacyHeaderWelcome");
  const anon = container.querySelector("#legacyHeaderAnon");
  const profileLink = container.querySelector("#legacyHeaderProfile");

  function setUser(user) {
    if (!welcome || !anon) return;
    if (user) {
      welcome.style.display = "block";
      anon.style.display = "none";
      if (profileLink) {
        const label = user.displayName || user.email || "profile";
        profileLink.textContent = label;
        profileLink.href = `/legacy/member.html?u=${encodeURIComponent(user.uid)}`;
      }
    } else {
      welcome.style.display = "none";
      anon.style.display = "block";
    }
  }

  return {
    container,
    signInButton,
    signOutLink,
    profileLink,
    setUser,
  };
}
