# Lawnmower Labyrinth Design Brief

## Elevator Pitch
Lawnmower Labyrinth is a top-down survival stealth game inspired by *Honey, I Shrunk the Kids*. Players, shrunk to ant-size, must cross a sprawling backyard while a relentless lawnmower patrols in a predictable sweep. The experience focuses on timing, environmental cover, and daring dashes to reach safety.

## Gameplay Structure
1. **Setup Phase**
   - Session opens with the player character dropped into towering grass. The distant rumble of an engine primes the threat.
   - Tutorial prompts introduce basic movement, dash controls, and the importance of cover before the mower begins its route.
2. **Survival Phase**
   - The lawnmower operates as a moving wall of instant death, tracing deliberate back-and-forth lanes across the yard.
   - Players weave through environmental cover—grass clusters, toys, forgotten household objects—to stay out of sight and avoid the mower's path.
   - Sprinting across exposed turf is faster but magnifies risk; the mower's route and audio cues telegraph safe windows.
3. **Safe Zone Arrival**
   - Reaching the tree-root "Safe Zone" ends the run and locks in survival time and bonus pickups.

## Zone Progression
- **Zone 1 – The Open Lawn**
  - Pure mower avoidance in mostly flat terrain with sparse cover.
  - Encourages players to learn mower cadence and line-of-sight rules.
- **Zone 2 – Sprinkler Alley**
  - Adds periodic sprinkler bursts that drop large water globes.
  - Droplets linger briefly as area-of-effect hazards; getting hit staggers the player and risks mower overlap.
- Future zones can escalate with new threats (e.g., roaming pets, falling acorns) while maintaining clear counterplay.

## Core Mechanics
- **Movement & Dash**
  - Standard movement is stealthy but slow; the dash triples speed for a short burst while preventing quick turns.
  - Dash has a brief cooldown displayed on the HUD.
- **Cover System**
  - Tall grass and objects block line of sight. Entering cover dampens footstep audio and slows proximity alert buildup.
  - Camera subtly tilts to showcase occlusion and emphasize scale.
- **Lawnmower AI**
  - Follows a deterministic sweep route per zone with slight jitter to keep tension high.
  - Emits positional audio (engine drone, blade whine) with dynamic volume and stereo panning.
  - Screen shake intensity scales with proximity and mower speed.
- **Sprinkler Hazards (Zone 2)**
  - Sprinklers telegraph with rhythmic clicks before firing.
  - Water impacts create slippery puddles that temporarily reduce traction.

## Scoring & Risk/Reward
- **Primary Metric: Survival Time**
  - Timer starts once the mower activates and stops when the safe zone is reached or the player dies.
- **Bonus Collectibles**
  - Cookie crumbs, LEGO bricks, and shiny coins appear in exposed areas.
  - Collecting items adds to a bonus multiplier that rewards daring routes.
- **Stealth Grade**
  - Optional grading system based on number of close calls, time spent detected, and dash usage.

## Audio-Visual Direction
- **Scale & Atmosphere**
  - Grass blades tower like trees; depth-of-field blur accentuates miniature perspective.
  - Ambient insect hum and distant house noises ground the world.
- **Threat Feedback**
  - Engine drone intensity drives the proximity alert color from green to yellow to red.
  - Passing mower produces heavy motion blur, debris trails, and full-screen rumble.
  - Capture events cut to black with a sharp metallic "SLICE!" and a stinger chord.
- **Environmental Storytelling**
  - Scattered objects (juice boxes, baseballs, bottle caps) hint at backyard life and provide varied cover silhouettes.

## HUD & UX
- Minimalist overlay featuring:
  - Survival timer.
  - Proximity alert ring pulsing faster and shifting from green to red as the mower nears.
  - Dash cooldown indicator.
  - Collectible counter and multiplier.
- Run summary screen highlights survival time, collectibles, and notable moments (e.g., "3 Close Calls Survived").

## Failure & Replay
- Lawn mower contact results in immediate failure with a black screen cut and "SLICE!" audio cue.
- Leaderboards encourage speedrunning and collectible mastery.
- Daily challenges remix mower patterns and collectible placements to extend longevity.

