# Mafia Classic ASP Logic Audit

This document summarizes the custom server-side logic implemented in each `mafia.old/*.asp` page and captures whether that behavior has already been carried forward to the modern Firebase experience in `madia.new/`.

## Legend
- ✅ Ported: feature has an equivalent in `madia.new`.
- ⚠️ Partial: some behavior exists, but notable gaps remain.
- ❌ Not ported: no direct replacement identified.

## Status overview
| Legacy ASP file | Key legacy logic | Port status | Modern implementation |
| --- | --- | --- | --- |
| `default.asp` | Redirects visitors to the games list. | ✅ | Meta refresh redirect in `public/index.html`. |
| `daysummary.asp` | GM-only day summary, renaming, reset/close/delete controls. | ✅ | `legacy/daysummary.html` + `daysummary.js` owner tools and action log. |
| `editpost.asp` | Loads a post for editing when a user is signed in. | ✅ | Inline edit buttons in `legacy/game.js`. |
| `gamedisplay.asp` | Core thread view: posting, role/admin controls, vote + action handling. | ✅ | `legacy/game.html` + `game.js` cover posting, moderation, actions, and render the inline day vote tally table. |
| `games.asp` | Lists games grouped by status with last-post metadata. | ✅ | `legacy/index.html` + `legacy.js` live game list. |
| `helloworld.asp` | Test page opening a DB connection and printing "hello world". | ❌ | No equivalent debug page in `madia.new`. |
| `login.asp` | Handles username/password sign-in, cookie persistence, and registration. | ✅ | Firebase auth flows in `legacy/login.html` + `login.js` and the shared header. |
| `member.asp` | Profile view/edit, avatar field, and create-game workflow. | ✅ | `legacy/member.html` + `member.js` profile editor and game creation. |
| `mygame.asp` | Player private view: submit private/vote/claim/notebook actions and review outcomes. | ✅ | `legacy/game.js` now adds a per-day action history table summarizing recorded actions and statuses. |
| `newplayercomment.asp` | Notebook comment modal tied to action type 17. | ✅ | Notebook form embedded in `legacy/game.html` handled by `game.js`. |
| `playerlist.asp` | Dumps game roster with hidden roles. | ✅ | `legacy/playerlist.html` + `playerlist.js` roster view. |
| `replaceplayer.asp` | Owner flow to swap a player slot to a different user. | ✅ | Moderator panel replace workflow in `legacy/game.js`. |
| `sha256.asp` | Classic VBScript SHA-256 implementation. | ❌ | Authentication now handled by Firebase; hashing utility dropped. |
| `sitesummary.asp` | Site-wide latest posts/players/users dashboard. | ✅ | `legacy/sitesummary.html` + `sitesummary.js` Firestore-driven summary. |
| `sqltest.asp` | Executes arbitrary SQL submitted via query string. | ❌ | No raw SQL executor in `madia.new`. |
| `testsql.asp` | Runs ad-hoc SQL and renders tabular results. | ❌ | No ad-hoc SQL UI in `madia.new`. |
| `uploader.asp` | Avatar upload via custom multipart parser writing to disk. | ✅ | Avatar uploads handled through Firebase Storage in `legacy/member.js`. |
| `userlist.asp` | Lists registered users with avatars and signup dates. | ✅ | `legacy/userlist.html` + `userlist.js`. |
| `logo.asp` | Header banner with login state / quick login form. | ✅ | Shared legacy header rendered by `legacy/header.js`. |
## File-by-file notes

### `default.asp`
- **Legacy behavior:** Immediately issues a `Response.Redirect` to `games.asp`, ensuring the games list is the landing experience.
- **Port notes:** `madia.new/public/index.html` performs an equivalent meta refresh to `/legacy/index.html`, keeping the legacy games list as the homepage.

### `daysummary.asp`
- **Legacy behavior:** Restricts access to the game owner, surfaces a per-day action log, and exposes controls to rename, reset, mark over, clear posts, or delete the game.
- **Port notes:** `legacy/daysummary.html` and `daysummary.js` replicate the owner-only guard, render recorded actions from Firestore, and provide rename/reset/game-over/clear/delete forms wired to Firestore updates.

### `editpost.asp`
- **Legacy behavior:** Requires an authenticated session, loads the selected post, and serves an edit form that posts back to `gamedisplay.asp`.
- **Port notes:** In `legacy/game.js`, owners and authors see "Edit Post" buttons that prompt for new title/body and persist updates back to the Firestore post document.

### `gamedisplay.asp`
- **Legacy behavior:** Central hub combining public thread reading/posting, player roster with live vote tallies, GM tools (lock game, advance day, assign roles, kick/replace players), and quick forms to record votes, claims, trusts, and notebook notes.
- **Port notes:** `legacy/game.html` and `game.js` reimplement joining/leaving, posting with UBB helpers, moderator role/lock/day controls, replace/kick, and player private action forms. The modern page links to a separate roster view but does not yet surface the old inline vote tally table, so automated vote visualization is still outstanding.

### `games.asp`
- **Legacy behavior:** Groups games into Open/Running/Game Over buckets, shows last post metadata, and indicates whether the viewer has joined.
- **Port notes:** `legacy/index.html` rendered via `legacy.js` streams games from Firestore, builds the same status sections, iconography, last-post preview, post/player counts, and join status.

### `helloworld.asp`
- **Legacy behavior:** Development stub that instantiates an `ADODB.Connection` and prints "hello world".
- **Port notes:** No comparable debug/testing page exists in `madia.new`, which focuses on production-ready routes.

### `login.asp`
- **Legacy behavior:** Supports password login, persistent cookies, account creation, and logout by clearing session/cookies.
- **Port notes:** Authentication moved to Firebase; `legacy/login.html` + `login.js` deliver username/email sign-in, Google auth, remember-me persistence, and signup, while `legacy/header.js` provides the always-visible header login widget.

### `member.asp`
- **Legacy behavior:** Displays user profile information, lets the owner edit contact info/avatar/title/signature, shows played/owned games, and allows creating a new game.
- **Port notes:** `legacy/member.html` + `member.js` fetch profile data from Firestore, allow editing display name/avatar (uploading to Firebase Storage), and expose a create-game form that seeds a Firestore `games` doc and auto-enrolls the owner.

### `mygame.asp`
- **Legacy behavior:** Player-only console with per-day action history, resolution feedback (e.g., seer/tracker results), and forms to submit private abilities, votes, claims, trusts, and notebook notes.
- **Port notes:** `legacy/game.js` retains the private action/vote/claim/notebook forms and invalidation rules, feeding into the shared actions collection. However, the rich per-day results table and trust/seer/tracker resolution display have not been recreated yet.

### `newplayercomment.asp`
- **Legacy behavior:** Modal helper to review and overwrite notebook comments (action type 17) for a specific player/day.
- **Port notes:** Notebook entry capture now lives inline on the game page; `game.js` populates player dropdowns and records notebook actions with deduplication, removing the need for a separate popup.

### `playerlist.asp`
- **Legacy behavior:** Outputs the current roster for a game with hidden role information (wrapped in HTML comments).
- **Port notes:** `legacy/playerlist.html` + `playerlist.js` load the game roster from Firestore, flag alive/dead players with icons, and surface role text when available.

### `replaceplayer.asp`
- **Legacy behavior:** Restricts to the game owner, finds eligible substitute users, and updates the `players` table to hand off a slot.
- **Port notes:** The moderator panel in `legacy/game.js` adds "Replace" actions that prompt for a user identifier, validate membership, and atomically swap the player doc while updating historical actions.

### `sha256.asp`
- **Legacy behavior:** Provides a VBScript SHA-256 implementation for hashing (unused by default login flow).
- **Port notes:** Firebase Authentication manages credential hashing and verification, so the standalone hashing script was not carried forward.

### `sitesummary.asp`
- **Legacy behavior:** Generates three data tables: latest posts, latest new players, and latest users.
- **Port notes:** `legacy/sitesummary.html` + `sitesummary.js` recreate the same overview by querying Firestore collections, with graceful messaging when Firestore is unconfigured or permissions deny access.

### `sqltest.asp`
- **Legacy behavior:** Executes arbitrary SQL submitted via a query string, primarily for debugging.
- **Port notes:** No equivalent tooling exists in `madia.new`, which avoids exposing raw database access for security reasons.

### `testsql.asp`
- **Legacy behavior:** Allows submitting multi-line SQL, then renders result sets in a table for inspection.
- **Port notes:** Also intentionally omitted in the Firebase app to keep the hosted experience locked down.

### `uploader.asp`
- **Legacy behavior:** Implements a custom multipart parser to save avatars to the web server and update `users.image`.
- **Port notes:** `legacy/member.js` switches avatar uploads to Firebase Storage, resizing and saving the file, then updating the Firestore profile with the hosted URL.

### `userlist.asp`
- **Legacy behavior:** Lists all registered users alphabetically, displaying avatars and signup dates.
- **Port notes:** `legacy/userlist.html` + `userlist.js` render the same grid using Firestore user docs.

### `logo.asp`
- **Legacy behavior:** Draws the top banner, conditionally shows welcome/logout links for signed-in users, and embeds the login form for anonymous visitors.
- **Port notes:** `legacy/header.js` ships a reusable header component with an integrated sign-in/sign-up dialog, mirroring the classic look while talking to Firebase auth.
