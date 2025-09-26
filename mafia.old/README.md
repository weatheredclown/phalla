# Legacy database mutations

The table below catalogues every classic ASP page under `mafia.old/` that issues write queries against `phalla.mdb`.  Each row highlights the legacy operation and whether an equivalent capability exists in the Firebase rewrite (`madia.new/`).  A checked box (`[x]`) indicates feature parity today, while an empty box (`[ ]`) calls out functionality that still needs to be ported.

| File | Legacy operation | Ported |
| --- | --- | --- |
| `login.asp` | Register a new user record in `users` during signup. | [x] |
| `member.asp` | Update the signed-in member's email, signature, avatar path, location, and title in `users`. | [x] |
| `member.asp` | Insert a new entry in `games` when the owner creates a game from their profile. | [x] |
| `daysummary.asp` | Rename the game by updating `games.gamename`. | [x] |
| `daysummary.asp` | Delete a game (and all `players` rows) when the owner confirms removal. | [x] |
| `daysummary.asp` | Reset a game to Day 0 (toggle `games` flags, wipe `actions`, create a reset post, reset `players.postsleft`). | [x] |
| `daysummary.asp` | Mark a game as over (set `games.active/open` and add a "GAME ENDED!" post). | [x] |
| `daysummary.asp` | Clear all forum posts for a game by deleting from `posts`. | [x] |
| `mygame.asp` | Record private actions (invalidate prior `actions` rows and insert the new action). | [x] |
| `mygame.asp` | Cast or change a vote (invalidate prior vote `actions` and insert the latest choice). | [x] |
| `mygame.asp` | Post a new message to the game thread (`posts` insert). | [x] |
| `mygame.asp` | Edit an existing game post (`posts` update). | [x] |
| `mygame.asp` | Reduce `players.postsleft` when a player exhausts their daily posts. | [x] |
| `mygame.asp` | Advance to the next day (`games.day` increment and day marker post). | [x] |
| `gamedisplay.asp` | Assign roles or update alive status/post counts for players. | [x] |
| `gamedisplay.asp` | Manage public votes, claims, and notebook entries via the `actions` table. | [x] |
| `gamedisplay.asp` | Publish a new thread post (including quick replies). | [x] |
| `gamedisplay.asp` | Edit an existing post in place. | [x] |
| `gamedisplay.asp` | Join the game by inserting a `players` row. | [x] |
| `gamedisplay.asp` | Delete a post (owner / admin moderation). | [x] |
| `gamedisplay.asp` | Kick a player (delete from `actions`/`players`). | [x] |
| `gamedisplay.asp` | Toggle lock status or progress to the next day (`games` updates). | [x] |
| `replaceplayer.asp` | Swap an existing player with another user by updating `players.userid`. | [x] |
| `uploader.asp` | Upload an avatar image and update the member's `users.image` path. | [x] |

## Porting notes

- User registration and profile editing (display name + avatar) are implemented through Firebase Auth and Firestore/Storage in the modern app, but the legacy-only fields (location, title, signature) remain outstanding.
- Game lifecycle management in the Firebase client now covers creation, joining/leaving, posting, owner controls (open/active toggles, next day), and moderator workflows including resets, deletions, and player replacements.
