# Madia Firebase Application

This folder contains a modern Firebase implementation of the legacy `mafia.old/default.asp` forum and Mafia game helper. The new single-page app uses Firebase Authentication, Firestore, and Hosting to deliver a collaborative experience for players.

## Features

- **Threaded discussion board** with real-time updates backed by Cloud Firestore.
- **Integrated Mafia game dashboard** to track player votes and notes.
- **Google sign-in** via Firebase Authentication with guards around write operations.
- **Firebase Hosting configuration** that deploys the static assets in `public/`.
- **Emulator Suite support** for local development with Auth, Firestore, and Hosting.

## Project structure

```
madia.new/
├── .firebaserc          # Placeholder project alias mapping
├── firebase.json        # Hosting + emulator configuration
├── README.md            # This file with setup and deployment guidance
└── public/
    ├── index.html       # Application shell
    ├── script.js        # Firebase-backed forum logic
    └── styles.css       # Modernized styling
```

## Prerequisites

- Node.js 18+ (for the Firebase CLI)
- A Google account with access to the Google Cloud Console
- The [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`)

## 1. Create and configure the Firebase project

1. Navigate to the [Firebase console](https://console.firebase.google.com/) and click **Add project**.
2. Choose (or create) a Google Cloud project name, enable Google Analytics if desired, and finish the wizard.
3. In the project dashboard:
   - Go to **Build → Authentication → Sign-in method** and enable **Google**. Configure an authorized domain if you plan to use a custom domain.
   - Go to **Build → Firestore Database** and create a database in production mode. Choose a region close to your players.
   - (Optional) Under **Build → Storage**, create a Cloud Storage bucket if you plan to add media uploads later.
4. Create a **Web app** registration (`</>` icon) to obtain the Firebase configuration snippet. Copy the settings (apiKey, authDomain, etc.).
5. Update `public/script.js` with the copied configuration values (replace the `YOUR_*` placeholders).
6. Update `.firebaserc` to set the default project ID: replace `YOUR_FIREBASE_PROJECT_ID` with the project ID shown in the Firebase console.

### Recommended Firestore security rules

In the Firebase console under **Build → Firestore Database → Rules**, replace the default rules with a stricter set:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /games/{gameId} {
      allow read: if true;
      allow create: if request.auth != null && request.resource.data.ownerUserId == request.auth.uid;
      allow update, delete: if request.auth != null && resource.data.ownerUserId == request.auth.uid;

      match /players/{playerId} {
        allow read: if true;
        allow create, delete: if request.auth != null && request.auth.uid == playerId;
      }

      match /posts/{postId} {
        allow read: if true;
        allow create: if request.auth != null
          && exists(/databases/$(database)/documents/games/$(gameId)/players/$(request.auth.uid));
      }
    }

    match /threads/{threadId} {
      allow read: if true;
      allow create: if request.auth != null && request.resource.data.createdBy == request.auth.uid;
      allow update, delete: if request.auth != null && resource.data.createdBy == request.auth.uid;

      match /posts/{postId} {
        allow read: if true;
        allow create: if request.auth != null && request.resource.data.author == request.auth.uid;
      }
    }

    match /votes/{voteId} {
      allow read: if true;
      allow create: if request.auth != null && request.resource.data.recordedBy == request.auth.uid;
      allow delete: if request.auth != null && resource.data.recordedBy == request.auth.uid;
    }

    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

These rules cover every collection the modern and legacy UIs touch (games, players, posts, threads, votes, and user profiles) and prevent anonymous writes.

## 2. Install and authenticate the Firebase CLI

1. Install the CLI (if not already):

   ```bash
   npm install -g firebase-tools
   ```

2. Authenticate with your Google account:

   ```bash
   firebase login
   ```

   This opens a browser window for OAuth consent.

3. Verify the CLI can see your project:

   ```bash
   firebase projects:list
   ```

## 3. Initialize local development

1. From the repository root, navigate into this directory and install any local tooling if desired (no dependencies are required for the static app):

   ```bash
   cd madia.new
   ```

2. (Optional) Connect additional Firebase resources if you extend the project:

   ```bash
   firebase use YOUR_FIREBASE_PROJECT_ID
   ```

3. Start the Emulator Suite for local testing:

   ```bash
   firebase emulators:start
   ```

   - Hosting will serve the app at `http://localhost:5000`.
   - Firestore is available at `localhost:8080` and Auth at `localhost:9099`.
   - The CLI prints a UI URL where you can inspect emulator data.

4. When using emulators, override the SDK configuration at the top of `public/script.js` to point to the emulators:

   ```js
   import { connectAuthEmulator } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
   import { connectFirestoreEmulator } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

   connectAuthEmulator(auth, 'http://localhost:9099');
   connectFirestoreEmulator(db, 'localhost', 8080);
   ```

   (Wrap these calls with a development-only flag or environment check.)

## 4. Deploy to Firebase Hosting

1. Build/prepare static assets. This project is already static, so no additional build step is required.
2. Run a preview deploy to inspect the result without affecting production:

   ```bash
   firebase hosting:channel:deploy preview
   ```

3. GitHub Actions can automatically run the preview deploy for any pull request or push that touches `madia.new/**`. Configure a repository secret named `FIREBASE_TOKEN` (generated with `firebase login:ci`) so the workflow can authenticate, and the deploy job will output the preview channel URL.

4. When satisfied, deploy to production:

   ```bash
   firebase deploy --only hosting
   ```

   The CLI prints the live URL (e.g., `https://<project-id>.web.app`).

5. (Optional) In the Firebase console under **Build → Hosting**, connect a custom domain and follow the DNS verification steps.

## 5. Monitor and maintain

- Use the [Google Cloud Console](https://console.cloud.google.com/) for project-wide settings, IAM roles, and usage metrics.
- Set up alerts in **Google Cloud Monitoring** for Firestore and Hosting quotas if you anticipate heavy traffic.
- Regularly review the **Authentication** user list to prune inactive accounts and update provider settings.
- Export Firestore data using the [Managed Export and Import service](https://firebase.google.com/docs/firestore/manage-data/export-import) for backups.

## 6. Next steps and customization ideas

- Add Cloud Functions for scheduled tasks (e.g., nightly vote summaries).
- Integrate push notifications with Firebase Cloud Messaging for day/night cycle alerts.
- Replace the dialog-based forms with richer editors or markdown support.
- Add role management (villager/mafia/host) by extending user profiles in Firestore.

With this foundation you can gradually migrate content and users from the legacy ASP application into a scalable Firebase-backed solution.
