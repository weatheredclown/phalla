# Firebase Setup (Retro UI)

The retro UI in `public/legacy/` shares the same Firebase project as the
modern single-page app documented in [README.md](./README.md). Follow
that guide for project creation, CLI installation, emulator usage,
Firestore rules, and deployment. This document only captures the
additional steps and data requirements that are unique to the retro
experience.

## Configure retro client SDKs

- After registering your Firebase Web app, paste the configuration
  snippet into `public/legacy/legacy.js`, `public/legacy/game.js`, and
  `public/legacy/login.js`.
- Keep the values in sync with `public/script.js` so both experiences
  point at the same project.
- When running emulators, call `connectAuthEmulator` and
  `connectFirestoreEmulator` in these files (mirroring the modern UI)
  and guard the calls behind a development flag.

## Data shape expectations

The retro UI expects the following Firestore schema. Seed a small data
set through the emulator UI or the Firebase console before inviting
players:

- `games/{gameId}` documents: `gamename` (string), `description`
  (string), `ownerUserId` (string), `ownerName` (string), `active`
  (bool), `open` (bool), `day` (number), `updatedAt` (timestamp).
- `games/{gameId}/players/{uid}` documents for each participant. The
  retro moderator tools expect `postsLeft` (number) and `active`
  (boolean) fields when you reset a game, but they default to `-1` and
  `true` respectively if you omit them.
- `games/{gameId}/posts/{postId}` documents: `title` (string), `body`
  (UBB), `authorId` (string), `authorName` (string), `avatar` (string,
  optional), `sig` (string, optional), `createdAt` (timestamp),
  `updatedAt` (timestamp, optional), `editedBy` (string, optional),
  `editedByName` (string, optional).
- `games/{gameId}/actions/{actionId}` documents capture private
  actions and vote history recorded from the legacy UI. Each entry
  stores `playerId` (string), `username` (string), `actionName`
  (string), `targetName` (string), `notes` (string), `category`
  (string, either `private` or `vote`), `day` (number), `valid`
  (boolean), plus `createdAt`/`updatedAt` timestamps.
- `users/{uid}` documents: `displayName`, `username`, `usernameLower`
  (all strings), `email` (string), `photoURL` (optional string), and
  timestamps (`createdAt`, `lastLoginAt`). The login page looks up
  `usernameLower` to support username-based sign-in.

The retro login experience lives at `/legacy/login.html` and mimics the
classic ASP form. Ensure the Firebase Authentication Email/Password
provider is enabled so the form can create and authenticate local
accounts alongside Google sign-in.

## Required indexes

Create a composite index to support the Games list query:

- Collection: `games`
- Fields: `active` desc, `open` desc, `gamename` asc

If the index is missing, Firestore will prompt you with a one-click link
after the first query.

## Emulator and hosting paths

- Modern SPA: `http://localhost:5000/`
- Retro UI: `http://localhost:5000/legacy/index.html`

Deploying with `firebase deploy --only hosting` publishes both UIs under
the same Hosting site.

## Troubleshooting tips

- Ensure authenticated users exist in the emulator or production project
  before testing posts or votes—anonymous users cannot write.
- Keep Firestore rules in sync with the version documented in
  `README.md` so both interfaces enforce the same access patterns.
- If you refactor collection names or document shapes, update both the
  modern and retro clients to avoid runtime errors.

