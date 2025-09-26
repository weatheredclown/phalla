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

## Shared include files
| Legacy include | Key legacy logic | Port status | Modern implementation |
| --- | --- | --- | --- |
| `Char.inc` | Escapes HTML and expands UBB/BBCode tags (spoilers, quotes, colors, embeds). | ⚠️ | `legacy/ubb.js` renders a curated UBB subset with safer escaping but omits advanced tags like Flash and inline attachments. |
| `getuserid.inc` | Restores the signed-in user from session/cookie values when the ASP session is empty. | ✅ | `legacy/header.js` listens to Firebase auth state, updates the header UI, and persists "remember me" selections. |
| `googletrack.inc` | Injects the classic Google Analytics tracker script. | ❌ | No analytics snippet ships with the Firebase app. |
| `login_form.inc` | Renders the inline username/password form embedded in the site header. | ✅ | `legacy/header.js` supplies the sign-in/sign-up panel with email/username, remember-me, and Google auth flows. |
| `posts.inc` | Generates the main thread view: alternating post chrome, avatars, action callouts (votes/claims), and edit/delete links. | ⚠️ | `legacy/game.js` rebuilds post rendering from Firestore but lacks the legacy inline action badges and vote annotations. |
| `profile.inc` | Loads a user's profile, avatar, and last activity into the profile summary header. | ✅ | `legacy/member.html` + `member.js` pull profile docs from Firestore, surface avatar/display name/email, and gate edit/create controls. |
| `quickreply.inc` | Provides the quick-reply form, seeded title/body, and public action checkboxes/dropdowns for votes/claims. | ⚠️ | `legacy/game.html` + `game.js` expose reply posting and private/moderator action forms, but public action toggles tied to posts are still pending. |
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

### `Char.inc`
- **Legacy behavior:** Supplies `unHtml` and `ubb` helpers to escape content while expanding an expansive set of BBCode tags, including spoilers, colors, alignment, Flash embeds, and emoticons. 【F:Char.inc†L2-L200】
- **Port notes:** `legacy/ubb.js` now performs HTML escaping and converts a safer subset of tags (bold/italic/underline, quotes, spoilers, colors, links, and images), deliberately dropping risky constructs like Flash or arbitrary HTML. 【F:madia.new/public/legacy/ubb.js†L1-L69】

### `getuserid.inc`
- **Legacy behavior:** When no ASP session is present it back-fills `Session("userid")` and `Session("username")` from authentication cookies so returning visitors stay signed in. 【F:getuserid.inc†L2-L8】
- **Port notes:** Firebase handles persistence; `legacy/header.js` wires the login panel, applies session vs. local persistence based on "remember me", and reacts to `onAuthStateChanged` to update header links. 【F:madia.new/public/legacy/header.js†L225-L356】【F:madia.new/public/legacy/header.js†L404-L428】

### `googletrack.inc`
- **Legacy behavior:** Emits the GA.js snippet with property `UA-4404725-3` to track page views. 【F:googletrack.inc†L1-L8】
- **Port notes:** Analytics is intentionally omitted from the Firebase-hosted app; no equivalent script is loaded. 

### `login_form.inc`
- **Legacy behavior:** Outputs the compact username/password/remember form that lived in the site chrome. 【F:login_form.inc†L1-L20】
- **Port notes:** The modern header replaces this with a modal-style sign-in/sign-up experience, supporting username lookups, email auth, remember-me persistence, and Google sign-in. 【F:madia.new/public/legacy/header.js†L225-L356】

### `posts.inc`
- **Legacy behavior:** Queries `fullposts`, alternates row styling, prints avatars/sigs, and injects contextual callouts for votes, claims, and other action types alongside edit/delete controls. 【F:posts.inc†L49-L227】
- **Port notes:** `legacy/game.js` now streams Firestore posts, renders them with alternating chrome and edit/delete buttons, and converts bodies/sigs through the new UBB renderer. Action recap badges tied to posts remain unimplemented. 【F:madia.new/public/legacy/game.js†L170-L225】【F:madia.new/public/legacy/game.js†L400-L470】

### `profile.inc`
- **Legacy behavior:** Pulls user rows from `users`, shows avatar/name, and adds a last-post timestamp fetched from `posts`. 【F:profile.inc†L2-L44】
- **Port notes:** `legacy/member.html` with `member.js` loads the viewed user's Firestore profile, displays avatar/display name/email, and conditionally exposes edit/create game tools for the signed-in owner. 【F:madia.new/public/legacy/member.html†L24-L105】【F:madia.new/public/legacy/member.js†L63-L155】

### `quickreply.inc`
- **Legacy behavior:** Hosts the quick-reply textarea, seeds title/body, and lists available public actions (vote/claim/etc.) with target dropdowns for immediate logging. 【F:quickreply.inc†L1-L140】
- **Port notes:** `legacy/game.html` keeps a reply form plus dedicated player tools for private actions, votes, claims, and notebook entries; action toggles integrated directly into the posting flow are still on the backlog. 【F:madia.new/public/legacy/game.html†L40-L109】【F:madia.new/public/legacy/game.js†L400-L579】
