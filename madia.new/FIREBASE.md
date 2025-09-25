# Firebase Setup (Retro UI)

This project uses Firebase Hosting, Authentication (Google), and Firestore. Follow these steps to configure your project and run locally or deploy.

## 1) Create Firebase project
- In Firebase Console: Add project (production mode is fine).
- Enable products:
  - Firestore Database: Create database (choose a region close to your users).
  - Authentication: Enable Google provider.
  - Hosting: Will serve the `public/` folder.

## 2) Configure client SDK
- Copy your web app config from Console → Project settings → Your apps → Web.
- Paste the config into both files (or refactor to a shared loader):
  - `public/legacy/legacy.js`
  - `public/legacy/game.js`
- Optional (local dev): Connect emulators instead of production.

## 3) Firestore rules (minimum secure defaults)
Use rules that allow authenticated users to create posts and only owners to modify game settings.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /games/{gameId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && request.resource.data.ownerUserId == request.auth.uid;

      match /players/{uid} {
        allow read: if true;
        allow write: if request.auth != null && request.auth.uid == uid;
      }

      match /posts/{postId} {
        allow read: if true;
        allow create: if request.auth != null;
        allow update, delete: if false; // immutable posts (adjust if needed)
      }
    }
  }
}
```

## 4) Indexes
Create a composite index for the Games list query:
- Collection: `games`
- Fields: `active` desc, `open` desc, `gamename` asc
(Visit the games list once; Firestore will provide a one-click link if missing.)

## 5) Seed minimal data
- Create a `games/{gameId}` doc with fields:
  - `gamename` (string), `description` (string), `ownerUserId` (string), `ownerName` (string), `active` (bool), `open` (bool), `day` (number)
- Add `games/{gameId}/players/{uid}` for participants.
- Add `games/{gameId}/posts/{postId}` with:
  - `title` (string), `body` (UBB), `authorId` (string), `authorName` (string), `avatar` (string, optional), `sig` (string, optional), `createdAt` (timestamp)

## 6) Run locally / deploy
- Local: `firebase emulators:start` → open `http://localhost:5000/legacy/index.html`
- Deploy: `firebase deploy --only hosting`

Notes: This UI expects the `games/*` schema above. Authentication is required to join games and post. Adjust rules to your policy. 
