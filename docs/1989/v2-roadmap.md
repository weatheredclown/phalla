# 1989 Arcade v2 Roadmap

## Current Architecture Snapshot
- **Arcade shell is fully data-bound to a monolithic `games` array.** All cabinet ids, blurbs, URLs, and inline SVG thumbnails live directly inside `1989.js`, and the launcher renders cards, score hooks, and the iframe overlay off this hard-coded manifest. 【F:madia.new/public/secret/1989/1989.js†L5-L3144】【F:madia.new/public/secret/1989/index.html†L10-L127】
- **The launcher provides rich affordances but no modular extension points.** Pixelated thumbnail rendering, attribution reveals, fullscreen toggles, restart wiring, and keyboard handling are implemented inline instead of as reusable helpers, which complicates reuse by future surfaces (site home, playlists, etc.). 【F:madia.new/public/secret/1989/1989.js†L2732-L3115】
- **Cabinet pages repeat the same shell with bespoke copies.** Each game recreates the header, briefing, simulator layout, and scanline styling by duplicating markup and CSS, leading to dozens of variant files that drift stylistically. 【F:madia.new/public/secret/1989/cooler-chaos/index.html†L1-L113】【F:madia.new/public/secret/1989/common.css†L1-L200】【F:madia.new/public/secret/1989/cooler-chaos/cooler-chaos.css†L1-L160】
- **Gameplay logic and scoring instrumentation are bespoke per cabinet.** Mechanics such as grid setup, timers, spawn rates, and event logs are embedded in individual scripts, with high-score registration relying on manual calls into the shared banner API. 【F:madia.new/public/secret/1989/cooler-chaos/cooler-chaos.js†L1-L200】
- **Shared systems stop at local storage.** The score widget sanitizes and persists personal bests in the browser and exposes subscription hooks, but there is no aggregation, remote sync, or telemetry stream to power ladders or meta-progression. 【F:madia.new/public/secret/1989/arcade-scores.js†L1-L198】【F:madia.new/public/secret/1989/score-config.js†L1-L156】

## V2 Experience Goals
1. **Catalog as a Service** – Transform the hard-coded manifest into a data-driven catalog that other experiences (homepage, collections, playlists) can consume without editing `1989.js`. 【F:madia.new/public/secret/1989/1989.js†L5-L3144】
2. **Shared Cabinet Framework** – Deliver a reusable game shell (HTML partial + component toolkit) that individual cabinets extend through configuration and content, eliminating copy/paste markup. 【F:madia.new/public/secret/1989/common.css†L1-L200】【F:madia.new/public/secret/1989/cooler-chaos/index.html†L1-L113】
3. **Progression & Telemetry Backbone** – Standardize lifecycle events, scoring schemas, and persistence so V2 can surface leaderboards, playlists, and the Level 50→1 ladder without touching every cabinet script. 【F:madia.new/public/secret/1989/arcade-scores.js†L1-L198】【F:madia.new/public/secret/1989/cooler-chaos/cooler-chaos.js†L1-L200】
4. **Live Ops & QA Tooling** – Introduce build metadata, cabinet health dashboards, and automated regression harnesses to keep the growing catalog stable. 【F:madia.new/public/secret/1989/index.html†L101-L127】【F:madia.new/public/secret/1989/1989.js†L2732-L2799】

## Strategic Workstreams

### 1. Platform & Catalog Modernization
- **External manifest service.** Migrate cabinet metadata into JSON (checked into `docs/1989` for local dev) and optionally a Firestore collection so the launcher, homepage, or future "challenge playlists" can query the same dataset. Keep a build step that inlines a static snapshot for offline hosting. 【F:madia.new/public/secret/1989/1989.js†L5-L3144】
- **Asset pipeline.** Replace inline SVG strings with referenced sprite sheets or prerendered PNG/WebP thumbnails, generated at build time for consistent pixelation and caching. Leverage the existing rasterization helper as the base for a Node build script. 【F:madia.new/public/secret/1989/1989.js†L2732-L2799】
- **Composable launcher widgets.** Refactor the overlay, scoring display, and attribution revealers into discrete modules (`overlay.js`, `score-tile.js`) exported from a shared package so the catalog view can recompose them per surface. 【F:madia.new/public/secret/1989/1989.js†L2840-L3115】
- **Search & filtering.** Extend the manifest schema with genre, mechanic, session length, and difficulty metadata, then layer search + filter controls above the grid without editing each card definition. 【F:madia.new/public/secret/1989/index.html†L10-L48】【F:madia.new/public/secret/1989/1989.js†L2802-L2839】

### 2. Shared Cabinet Framework
- **Game shell template.** Publish a `cabinet-shell.html` + `cabinet-shell.js` module that encapsulates the header, skip link, briefing columns, simulator controls, event log, and footer callouts now duplicated across cabinets. Each game injects content slots (copy, controls, HUD widgets) via data attributes or custom elements. 【F:madia.new/public/secret/1989/cooler-chaos/index.html†L1-L113】
- **Design token library.** Promote typography, spacing, focus, and scanline treatments into a single design token file (successor to `common.css`) and let cabinet CSS only override palette variables or bespoke mechanics visuals. 【F:madia.new/public/secret/1989/common.css†L1-L200】【F:madia.new/public/secret/1989/cooler-chaos/cooler-chaos.css†L1-L160】
- **Interaction primitives.** Extract reusable widgets (status tiles, virtual D-pad, key legends) into Web Components or template partials with accessible defaults, so cabinet scripts only wire mechanic-specific state. 【F:madia.new/public/secret/1989/cooler-chaos/index.html†L36-L94】【F:madia.new/public/secret/1989/cooler-chaos/cooler-chaos.js†L47-L200】
- **Responsive & input expansion.** Bake pointer, keyboard, and controller input shims into the framework so every cabinet inherits consistent handling instead of re-implementing event listeners. 【F:madia.new/public/secret/1989/cooler-chaos/cooler-chaos.js†L133-L175】

### 3. Gameplay Systems & Progression
- **Configurable difficulty ladders.** Define a cabinet schema (e.g., JSON per level) describing spawn tables, timers, resource caps, and scoring curves; have each game load the schema to drive Level 50→1 scaling without editing logic. 【F:madia.new/public/secret/1989/cooler-chaos/cooler-chaos.js†L21-L126】
- **Unified scoring contracts.** Expand `score-config.js` to describe metric types (time, percentage, resource) and unit metadata, then generate HUD labels and end-of-run summaries automatically. 【F:madia.new/public/secret/1989/score-config.js†L1-L156】
- **Telemetry hooks.** Standardize lifecycle events (`game:start`, `game:reset`, `run:complete`, `score:submit`) emitted from each cabinet; forward them to both the local banner and future cloud analytics for leaderboards or daily challenges. 【F:madia.new/public/secret/1989/arcade-scores.js†L84-L198】【F:madia.new/public/secret/1989/cooler-chaos/cooler-chaos.js†L178-L200】
- **Session persistence.** Introduce optional save-state snapshots (board layout, timers, inventory) for longer experiences, stored via IndexedDB or cloud sync so players can resume mid-run. Build atop the existing storage abstraction in `arcade-scores.js`. 【F:madia.new/public/secret/1989/arcade-scores.js†L1-L49】

### 4. Live Ops, QA, and Tooling
- **Build provenance.** Expand `build-info.json` generation to capture Git SHA, manifest hash, and cabinet compatibility versions so support can correlate bug reports with exact builds. 【F:madia.new/public/secret/1989/index.html†L101-L127】
- **Authoring CLI.** Provide a `yarn arcade:new <slug>` script that scaffolds cabinet directories (HTML, CSS, JS, config stub) and registers metadata, preventing manual copy/paste drift. 【F:madia.new/public/secret/1989/1989.js†L5-L3144】【F:madia.new/public/secret/1989/cooler-chaos/index.html†L1-L113】
- **Automated regression harness.** Stand up Playwright smoke tests that launch representative cabinets, trigger key actions, and assert score submissions/events so refactors in the shared framework don’t silently break mechanics. 【F:madia.new/public/secret/1989/1989.js†L3030-L3091】【F:madia.new/public/secret/1989/cooler-chaos/cooler-chaos.js†L133-L200】
- **Debug overlay.** Build a shared HUD toggled by a query param that visualizes timers, RNG seeds, and event queues for balancing, using the feedback utilities already shared across cabinets. 【F:madia.new/public/secret/1989/feedback.js†L1-L120】

## Phased Delivery Plan
1. **Phase 0 – Discovery & Schema Design (1 sprint).** Inventory cabinet metadata, define the manifest schema, and prototype JSON→launcher rendering while maintaining the current UI. Deliver the authoring CLI skeleton and document migration steps. 【F:madia.new/public/secret/1989/1989.js†L5-L2900】
2. **Phase 1 – Framework Extraction (1–2 sprints).** Ship the shared cabinet shell, design tokens, and interaction primitives; migrate 3 flagship cabinets (Cooler Chaos, Amore Express, Velvet Syncopation) to validate the approach. 【F:madia.new/public/secret/1989/cooler-chaos/index.html†L1-L113】【F:madia.new/public/secret/1989/common.css†L1-L200】
3. **Phase 2 – Catalog Enhancements (1 sprint).** Integrate manifest-driven filters/search, modular overlay controls, and improved score tiles; backfill metadata for the remaining cabinets. 【F:madia.new/public/secret/1989/index.html†L10-L96】【F:madia.new/public/secret/1989/1989.js†L2840-L3115】
4. **Phase 3 – Progression & Telemetry (2 sprints).** Implement difficulty schemas, lifecycle event emitters, and optional save states; connect analytics sinks for leaderboard groundwork. Retrofit at least five diverse mechanics to the new config model. 【F:madia.new/public/secret/1989/cooler-chaos/cooler-chaos.js†L21-L200】【F:madia.new/public/secret/1989/arcade-scores.js†L84-L198】
5. **Phase 4 – Live Ops & QA Hardening (1 sprint).** Automate build provenance, finalize the debug overlay, add regression tests, and document the release checklist for future cabinet drops. 【F:madia.new/public/secret/1989/index.html†L101-L127】【F:madia.new/public/secret/1989/feedback.js†L1-L120】

## Success Metrics
- Manifest-driven launcher supports dynamic playlists without code edits and renders within 200 ms on first paint.
- 100% of cabinets adopt the shared shell and design tokens, reducing per-cabinet CSS by ≥40%.
- Telemetry events captured for every cabinet run, enabling aggregated leaderboards and daily challenge rotation.
- Regression suite runs under 10 minutes and blocks deploys on failure, ensuring cabinet fidelity as content expands.
