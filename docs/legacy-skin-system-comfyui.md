# Legacy Skin System Audit & ComfyUI Skin Generator Workflow

This guide inventories the legacy "PA Style" skin recreated in `madia.new/public/legacy/` and explains how to generate themed replacements with a reusable ComfyUI workflow. Use it whenever you need to hand off a bespoke visual skin that still respects the retro layout of the classic ASP implementation.

---

## 1. Legacy skin architecture

### 1.1 CSS surfaces & palette
`madia.new/public/legacy/phalla.css` centralizes the look and feel. Key surfaces, color pairs, and typography choices to preserve:

| Surface | Source selectors | Palette notes |
| --- | --- | --- |
| Global background & text | `body`, `.page` | Warm grey shell (`#999999`) with white text, Verdana stack, zero margins. 【F:madia.new/public/legacy/phalla.css†L1-L33】 |
| Primary panels | `.alt1`, `.panel`, `.vbmenu_popup` | Deep navy backgrounds (`#092655`, `#092655`) with light cyan copy for readability. 【F:madia.new/public/legacy/phalla.css†L67-L118】【F:madia.new/public/legacy/phalla.css†L214-L238】 |
| Alternating rows | `.alt2`, `.alt3` | Charcoal greys to differentiate table rows without new graphics. 【F:madia.new/public/legacy/phalla.css†L108-L150】【F:madia.new/public/legacy/phalla.css†L277-L282】 |
| Action badges & buttons | `.action-badge-*`, `.button` | Accent oranges (`#F9A906`), mint highlights, and metallic greys on buttons to signal interactivity. 【F:madia.new/public/legacy/phalla.css†L188-L216】【F:madia.new/public/legacy/phalla.css†L154-L187】 |
| Auth overlay | `.legacy-auth-panel` family | Semi-opaque navy glassmorphism that sits above header art; keep high contrast text. 【F:madia.new/public/legacy/phalla.css†L301-L360】 |

Typography stays at 11–12px Verdana/Geneva to match the original forum aesthetic, with `.bigusername` lifting display names to 13px.【F:madia.new/public/legacy/phalla.css†L266-L275】

### 1.2 Image assets & structural chrome
Two repeating images supply most of the chrome, both wired directly in `header.js`:

```html
<table style="background-image:url(/images/head_back.gif)">
...
<table style="background-image:url(/images/nav_back.gif)">
```
【F:madia.new/public/legacy/header.js†L31-L119】【F:madia.new/public/legacy/header.js†L175-L196】

Additional glyphs come from `/images/*.gif` (status icons) and `/images/avatars/*.jpg|gif` for profile stand-ins. Inventory these before replacing so you keep 16×16 icon silhouettes and 150×150 avatars consistent.【F:madia.new/public/legacy/legacy.js†L77-L117】【F:madia.new/public/images†L1-L11】

---

## 2. Planning a new skin

1. **Collect style direction** – Capture keywords (e.g., "art deco noir"), reference imagery, and a palette swatch before touching ComfyUI.
2. **Define palette constraints** – Map at least three tonal tiers that correspond to `body`, `.alt1`, `.alt2`, plus accent colors for `.button` and `.action-badge-*`.
3. **List assets to replace**:
   - Header background (`head_back.gif`)
   - Navigation ribbon (`nav_back.gif`)
   - Optional: inline icons (`active_game.gif`, `inactive_game.gif`, etc.) if the theme calls for new pictograms
   - Optional: default avatar set (maintain original dimensions)
4. **Decide texture characteristics** – Looping textures on header/nav should tile horizontally; buttons/icons can be single renders with manual post-processing.
5. **Note accessibility targets** – Aim for WCAG AA contrast on primary text surfaces even if the palette shifts dramatically.

---

## 3. ComfyUI workflow overview

Import `docs/workflows/legacy_skin_generator.json` into ComfyUI to get a three-output pipeline tuned for the assets above. The workflow creates coordinated textures for header, navigation, and button chrome from a shared prompt and negative prompt.

### 3.1 Node layout

| Section | Purpose | Default values | What to customize |
| --- | --- | --- | --- |
| **Checkpoint Loader** | Loads the base diffusion checkpoint (`CheckpointLoaderSimple`). | `sd_xl_base_1.0.safetensors` placeholder. | Swap in your preferred base model or style LoRAs before running. |
| **Positive prompt encoder** | `CLIPTextEncode` node seeded with a scaffold: `retro forum interface, {style keywords}, tileable texture, ui chrome`. | Includes `<style_prompt>` token for easy editing. | Replace `<style_prompt>` with the user's descriptive keywords; append palette hints like `teal and brass`, `soft gradient`, etc. |
| **Negative prompt encoder** | Blocks UI-hostile traits (`low contrast`, `text`, `watermark`). | Provided baseline. | Add or remove traits depending on model behavior. |
| **Header stream** | `EmptyLatentImage` (1536×512) → `KSampler` → `VAEDecode` → `SaveImage` (`skin_header_*`). | Euler sampler, 30 steps, CFG 6.5. | Adjust resolution to match desired export size; tweak CFG for bolder vs. muted styles. |
| **Nav stream** | `EmptyLatentImage` (1024×256) branch replicating the sampler configuration, saving to `skin_nav_*`. | Same as header. | Ideal for tiling strips; drop height for thinner ribbons. |
| **Button stream** | `EmptyLatentImage` (512×512) for emblem/button plates, saved as `skin_button_*`. | Same as header. | Swap to square or circular aspect ratios as needed; use LoRAs here if you need icons instead of texture plates. |

Shared conditioning ensures all three outputs harmonize chromatically even after manual edits.

### 3.2 Optional enhancements
- **Palette reinforcement** – Chain a `TiledStyleAdapter` or `Palette ControlNet` node between the positive conditioning and each sampler if you want strict adherence to a color swatch.
- **Icon batch** – Duplicate the button branch with a smaller `EmptyLatentImage` (128×128) and tighter CFG to quickly prototype icon backgrounds.
- **LoRA slots** – Insert `LoraLoader` nodes after the checkpoint to mix in style packs; keep weights low (≤0.8) so UI affordances remain legible.

---

## 4. Using the workflow

1. **Import** – In ComfyUI, choose *Load* → select `docs/workflows/legacy_skin_generator.json`.
2. **Edit prompts** – Open the positive prompt node and replace `<style_prompt>` with the user's requested vibe (e.g., `sleek neon vaporwave`, `cozy art nouveau mahogany`). Add material cues such as `brushed metal`, `woven fabric` if relevant.
3. **Run a test pass** – Execute the workflow once to generate baseline assets. Inspect each output and note adjustments.
4. **Iterate** – Adjust CFG, steps, or add LoRAs until the textures feel cohesive. Re-run as needed.
5. **Export** – Grab PNG outputs from `ComfyUI/output/`.

For iconography, branch off the button sampler with custom prompts like `pixel art mafia icon silhouette` to stay on theme with status markers.

---

## 5. Integrating generated assets

1. **Post-process** – Convert PNGs to GIF to match the legacy file types and reduce palette depth if you want authentic dithering:
   ```bash
   magick skin_header_00001.png -colors 64 head_back.gif
   magick skin_nav_00001.png -resize 1024x120\! -colors 32 nav_back.gif
   ```
2. **Swap files** – Replace the originals under `madia.new/public/images/`. Keep filenames identical so `header.js` continues referencing them automatically.【F:madia.new/public/images†L1-L11】【F:madia.new/public/legacy/header.js†L31-L119】
3. **Update CSS colors** – Edit `phalla.css` to map new palette values (body, `.alt1`, `.alt2`, `.button`, `.action-badge-*`). Maintain clear contrast with text.【F:madia.new/public/legacy/phalla.css†L1-L216】
4. **Check layout** – Load `/legacy/index.html` and `/legacy/game.html` to ensure tiling backgrounds align and text remains legible across alternating rows.
5. **Version the palette** – Record color hex codes and asset seeds in your design notes so future runs can recreate the skin.

---

## 6. Supporting user-specified styles

When a host or community member requests a new look:

1. **Create a prompt brief** capturing the requested style, palette, and any banned motifs.
2. **Update the workflow prompts** with that brief; optionally load a matching LoRA.
3. **Generate and review** outputs with the requester, tweaking prompt adjectives for clarity.
4. **Document the final settings** (prompt text, CFG, seed, palette) alongside the exported assets to make future revisions painless.

Repeat the process for each requested style—the shared workflow keeps production predictable while allowing infinite thematic variation.
