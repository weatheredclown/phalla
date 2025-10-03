this is the set of arcade games based on movies from 1989
each game gets its own directory, then is added to the 1989 menu of games so that it is playable

Reference this project simply as "1989" in future prompts (e.g., "here's another 1989 game").
Each level should ladder upward from Level 50 to Level 1, pairing puzzle mechanics with thematic cues from 1989 cinema.
Use oblique level titles that allude to, but do not repeat, the exact film names.
games should be added to the 1989 arcade so that they can be played/replayed in any order

Shared animation/particle conventions:
- Use `particles.js` via `mountParticleField` for ambient cabinet effects when you need celebratory bursts (see `augmentum` and other neon-heavy stages).
- Keep palettes within the synthwave/neon spectrum defined in `particles.js` unless a level demands a bespoke theme; prefer extending the palette rather than writing new particle systems.

## Code comments for level registries

- When adding items to the shared arrays that register levels (e.g., the arrays of `scoreConfigs` and `const games`), place a `// Level ##` comment on the first line where the element is added and repeat the same comment on the closing `},` line of that element. This symmetry prevents merge conflicts when multiple levels land simultaneously.
## 1989 Arcade Polish Rules

Study the strongest cabinet builds (e.g., "Speed Zone", "Second Star Flight", "Velvet Syncopation") and apply these shared rules to every new level so it instantly feels at home in the arcade:

- **Score clarity**
  - Surface the scoring goal immediately in the header or a persistent HUD, echoing the high-score banner pattern provided by `arcade-scores.js`.
  - Use one primary score value that updates with each meaningful action; secondary meters are fine, but never hide the route to victory.
  - Announce threshold moments (new personal bests, combo tiers, bonus unlocks) with copy and color pops so players understand their performance.
- **Progress & pacing**
  - Break the experience into clearly labeled phases (setup ➜ rounds ➜ finale) or a visible track of objectives; show what is completed and what comes next.
  - Deliver a gentle on-ramp: the first interaction should be low stakes, with later turns layering additional systems, hazards, or multipliers.
  - Tie difficulty ramps to player mastery cues—introduce new obstacles only after the prior mechanic has been successfully exercised.
- **Decision pressure & risk/reward**
  - Present at least two competing options on every turn (safer route vs. high-payoff gamble, resource spend vs. saving for later) with explicit consequences in the copy.
  - Track persistent resources (fuel, crew morale, time, etc.) and show how each choice alters those meters so the gamble is transparent.
  - Reward calculated risks with escalating multipliers, rare FX, or access to hidden routes that the cautious path never reveals.
- **Feedback, animation, and FX**
  - Use the shared particle system (`particles.js`) or bespoke CSS transitions to punctuate victories, damage, and state changes within 200 ms of the action.
  - Reserve palette shifts, screen shakes, or audio stingers for milestone moments so the cabinet feels alive without becoming noisy.
  - Ensure every interactive element highlights on hover/focus and provides tactile button states that mirror other top-performing cabinets.
- **Session wrap-up**
  - End each run with a concise recap panel summarizing score, key decisions, and unlocked bonuses before prompting a replay.
  - Pipe the final score into the arcade leaderboard helper and offer a rematch button so the feedback loop stays tight.

Treat these as non-negotiable guardrails—the arcade thrives when every cabinet broadcasts progress, stakes, and spectacle the moment the lights turn on.
