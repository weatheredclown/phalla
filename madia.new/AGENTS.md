# Repository Guidelines

## Project Structure & Modules
- Root: `firebase.json` (hosting/emulators), `README.md` (setup), optional `.firebaserc`.
- App code: `public/` — `index.html` (shell), `script.js` (Auth/Firestore logic), `styles.css` (UI).
- No build system or server; static hosting on Firebase.

## Build, Run, and Deploy
- Local emulators: `firebase emulators:start`
  - Serves at `http://localhost:5000` and spins up Firestore/Auth emulators.
- Preview deploy: `firebase hosting:channel:deploy preview`
  - Generates a temporary URL for QA.
- Production deploy: `firebase deploy --only hosting`
  - Publishes the `public/` directory.
- Lightweight static serve (no Firebase features): from `public/`, run `python -m http.server 5000`.

## Coding Style & Naming
- Indentation: 2 spaces; UTF‑8; ESM modules in `script.js`.
- JavaScript: lowerCamelCase for variables/functions; PascalCase for classes.
- Files/IDs/CSS classes: kebab-case (e.g., `vote-button`, `thread-list`).
- Firestore: collection names are plural kebab-case (e.g., `threads`, `posts`, `votes`).
- Keep DOM queries and side-effects localized; prefer small, pure helpers.

## Testing Guidelines
- No formal test suite yet. Validate by:
  - Running emulators, exercising sign-in, posting, and voting flows.
  - Checking browser console and Emulator UI for errors.
- If adding tests, prefer Playwright for E2E and colocate specs under `tests/` with `*.spec.js`.

## Commit & Pull Requests
- Commits: imperative, concise. Recommended Conventional Commits (`feat:`, `fix:`, `docs:`).
- Branches: `feature/<short-name>`, `fix/<issue-id>`.
- PRs must include:
  - Clear description and rationale; link related issues.
  - Screenshots or a preview URL (from `hosting:channel`) showing UI changes.
  - Notes on Firestore rules or data model changes.
  - Updates to documentation covering any Firebase Console setup when introducing new database reads.

## Security & Configuration Tips
- Do not commit service account keys. Client Firebase config in `script.js` is public; rely on Firestore rules for protection.
- When using emulators, guard emulator connection code behind a dev flag to avoid deploying it to production.
- Review and test Firestore rules alongside any feature that changes write paths.

