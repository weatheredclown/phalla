# Net Operations Arcade Guidelines

- Reference this project as "Net" when discussing it in future prompts.
- Each minigame lives in its own directory under this folder and is registered in `net.js` so it shows up in the launcher grid.
- Keep the fiction anchored in circa-1996 intranet/early-internet culture: modem tones, beige towers, ISPs, and sysadmin bulletin boards.
- Favor neon-green on dark terminal palettes blended with midnight blues and amber indicator lights.
- When posting completion status back to the launcher, use the message type `net:level-complete` and include a `{ score, status }` payload.
- Keep HTML semantics accessible: labels for inputs, `aria-live` regions for status, and buttons for interactive actions.
- CSS indentation is 2 spaces; JS indentation is 2 spaces; files should be UTF-8 encoded.
