# Madia Firebase Application

This directory contains a modern Firebase implementation of the legacy
`mafia.old/default.asp` forum alongside a “retro” UI that mirrors the
original look. Both experiences share the same Firebase project, making
it easy to iterate on the single-page app while keeping long-time
players comfortable.

## Features

- **Threaded discussion board** with real-time updates backed by Cloud
  Firestore.
- **Integrated Mafia game dashboard** to track player votes and notes.
- **Google and email/password sign-in** via Firebase Authentication with
  guards around write operations and legacy-inspired forms.
- **Firebase Hosting configuration** that deploys the static assets in
  `public/`.
- **Emulator Suite support** for local development with Auth,
  Firestore, and Hosting.

## Project structure

```
madia.new/
├── .firebaserc          # Project alias mapping
├── firebase.json        # Hosting + emulator configuration
├── README.md            # Shared setup and deployment guidance
├── FIREBASE.md          # Retro UI specifics (supplements this guide)
└── public/
    ├── images/          # Shared imagery
    ├── index.html       # Modern application shell
    ├── legacy/          # Retro UI assets
    │   ├── game.js
    │   └── legacy.js
    ├── script.js        # Firebase-backed forum logic (modern UI)
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
   - Go to **Build → Authentication → Sign-in method** and enable both **Google** *and* **Email/Password** providers. The retro login page mirrors the classic ASP form and relies on the Email/Password provider for site-specific credentials.
   - Still within the Authentication section, review the **Authorized domains** list and add any custom domains you intend to serve from Firebase Hosting.
   - Go to **Build → Firestore Database** and create a database in production mode. Choose a region close to your players.
   - (Optional) Under **Build → Storage**, create a Cloud Storage bucket if you plan to add media uploads later.
4. Create a **Web app** registration (`</>` icon) to obtain the Firebase configuration snippet. Copy the settings (apiKey, authDomain, etc.).
5. Update all client entry points with the copied configuration values:
   - `public/script.js` for the modern single-page app.
   - `public/legacy/legacy.js` and `public/legacy/game.js` for the retro UI.
   - `public/legacy/login.js` for the legacy-styled authentication flow.
6. Update `.firebaserc` to set the default project ID: replace `YOUR_FIREBASE_PROJECT_ID` with the project ID shown in the Firebase console.
7. (Optional) Customize the password reset and verification emails under **Authentication → Templates** if you plan to support account recovery for the Email/Password provider.

### Username-backed sign-in

The legacy login page (served at `/legacy/login.html`) allows players to sign in with either their email address or their site-specific username. Email/Password accounts are stored in Firebase Authentication, while profile metadata (display name, username, and lowercase username) lives in Firestore under `users/{uid}`. When migrating existing data, ensure each document includes a `usernameLower` field so the login form can resolve usernames to email addresses. The helper logic in `public/legacy/login.js` will maintain these fields automatically for new and returning users.

## 2. Recommended Firestore security rules

Apply the following rules under **Build → Firestore Database → Rules** to cover every collection the modern and legacy UIs touch (games, players, posts, threads, votes, and user profiles) while preventing anonymous writes:

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

## 3. Install and authenticate the Firebase CLI

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

## 4. Initialize local development

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

   - Hosting will serve the modern app at `http://localhost:5000/`.
   - Visit `http://localhost:5000/legacy/index.html` for the retro UI.
   - Firestore is available at `localhost:8080` and Auth at `localhost:9099`.
   - The CLI prints a UI URL where you can inspect emulator data.

4. When using emulators, override the SDK configuration at the top of `public/script.js`, `public/legacy/legacy.js`, and `public/legacy/game.js` to point to the emulators. Wrap these calls with a development-only flag or environment check.

## 5. Deploy to Firebase Hosting

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

## 6. Monitor and maintain

- Use the [Google Cloud Console](https://console.cloud.google.com/) for project-wide settings, IAM roles, and usage metrics.
- Set up alerts in **Google Cloud Monitoring** for Firestore and Hosting quotas if you anticipate heavy traffic.
- Regularly review the **Authentication** user list to prune inactive accounts and update provider settings.
- Export Firestore data using the [Managed Export and Import service](https://firebase.google.com/docs/firestore/manage-data/export-import) for backups.

## 7. Legacy UI specifics

Refer to [FIREBASE.md](./FIREBASE.md) for data seeding tips, required indexes, and other retro UI notes that supplement this shared guide.

## 8. Next steps and customization ideas

- Add Cloud Functions for scheduled tasks (e.g., nightly vote summaries).
- Integrate push notifications with Firebase Cloud Messaging for day/night cycle alerts.
- Replace the dialog-based forms with richer editors or markdown support.
- Add role management (villager/mafia/host) by extending user profiles in Firestore.

With this foundation you can gradually migrate content and users from the legacy ASP application into a scalable Firebase-backed solution.

