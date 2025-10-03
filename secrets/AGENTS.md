# 1989 Puzzle Project Technical Conventions

This document details the vision, architecture, and development practices for the "1989" puzzle game anthology.

## Project Vision & Goals

-   **Project Name**: Reference this project simply as "1989" in prompts.
-   **Theme**: Each game is a "level" in an anthology, laddering from Level 50 down to Level 1.
-   **Inspiration**: Games should pair puzzle mechanics with thematic cues from 1989 cinema, using oblique titles that allude to the source material without repeating it.
-   **Structure**: All games are part of the "1989 Arcade" and should be playable in any order.

## Technical Architecture

The "1989" project is a modern, single-page application built with standard HTML, CSS, and vanilla ES6+ JavaScript. It does not use a major frontend framework like React or Vue.

-   **Codebase Location**: The primary codebase for the arcade and its games is located at `madia.new/public/secret/1989/`.
-   **Arcade Shell**: The core of the project is an "arcade shell" that acts as a launcher for the individual games.
    -   It dynamically renders a grid of game cards from a hardcoded array.
    -   Games are launched in an `<iframe>` overlay, allowing them to be self-contained experiences.
    -   It provides shared services, such as a high-score system (`arcade-scores.js`).

## How to Add a New Game

Follow these steps to create a new game and add it to the arcade.

### 1. Create the Game Directory

Create a new subdirectory for your game inside `madia.new/public/secret/1989/`. The directory name should be a short, hyphenated version of the game's title (e.g., `cooler-chaos`).

### 2. Create the Core Game Files

Inside your new directory, create the following three files:

-   **`index.html`**: The main HTML file for your game. It should contain the necessary semantic structure, including a header, instructions, the game canvas/grid, and any UI controls. It should link to the shared and game-specific CSS and JS files.
-   **`[game-name].css`**: A stylesheet for rules specific to your game.
-   **`[game-name].js`**: The JavaScript file containing all of your game's logic. It must be included in your `index.html` as a module (`<script type="module" ...>`).

### 3. Register the Game in the Arcade

Open `madia.new/public/secret/1989/1989.js` and add a new game object to the `games` array. This object defines the metadata for your game's card in the arcade.

-   **`id`**: A unique, hyphenated identifier. This should match your game's directory name.
-   **`name`**: The full, user-facing name of the game.
-   **`description`**: A brief, one-sentence summary of the gameplay.
-   **`url`**: The path to your game's `index.html` file (e.g., `./your-game-name/index.html`).
-   **`thumbnail`**: An inline SVG string that serves as the preview image on the game card.

**Thumbnail SVG Convention**:
The thumbnail must be a valid SVG string embedded in the JavaScript file. It should be designed to look good when programmatically pixelated by the arcade shell. Use the existing thumbnails as a template for style and complexity.

### 4. Styling and Shared Components

-   Leverage the shared stylesheet at `madia.new/public/secret/1989/common.css` for a consistent look and feel that matches the rest of the arcade.
-   Link to your game-specific stylesheet for any unique visual elements.
-   The arcade shell provides UI elements like headers, buttons, and status boards. Refer to existing games to see how to structure your HTML to take advantage of these shared styles.
-   Particle and celebration effects should reuse `madia.new/public/secret/1989/particles.js` (for example, `mountParticleField`) so ambient animations feel consistent across cabinets such as Augmentum and Speed Zone. Extend its palettes instead of introducing bespoke particle systems unless a level has extraordinary needs.

By following these conventions, your new game will integrate seamlessly into the 1989 Arcade.
