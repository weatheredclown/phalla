# 1989 ComfyUI Batch Asset Workflow

This guide explains how to turn the AI-authored art directions for the 1989 games into actual pixel assets by batching them through ComfyUI.  The package contains:

- `workflow_1989_assets.json` — a reusable text-to-image workflow that exposes every setting we need for the anthology sprites.
- `queue_1989_assets.py` — a helper that reads an asset spec JSON file and queues the workflow once for each entry.
- `example_asset_spec.json` — a starter prompt set for smoke testing the pipeline.

Follow the steps below to plug the generator straight into your local ComfyUI install.

## 1. Prepare ComfyUI

1. Install the base project by following the [official quick-start](https://github.com/comfyanonymous/ComfyUI#installation).  Start ComfyUI and make sure you can open `http://127.0.0.1:8188` in a browser.
2. Drop any Stable Diffusion checkpoints, VAEs, LoRA files, or custom embeddings you plan to use into the standard `ComfyUI/models/...` folders so the workflow can locate them.
3. (Optional) Install the [ComfyUI Manager](https://github.com/ltdrdata/ComfyUI-Manager) to simplify updating nodes and downloading new models.

## 2. Understand the asset spec format

The helper script expects a JSON array.  Each object describes the look, framing, and file naming for one sprite:

```json
[
  {
    "id": "level_50_title",
    "positive": "isometric pixel art trophy cabinet, brushed metal, 32 color palette, cinematic rim light",
    "negative": "low detail, photo, text watermark",
    "model": "sdxl_base_1.0.safetensors",
    "vae": "sdxl_vae.safetensors",
    "sampler": "dpmpp_2m_sde",
    "scheduler": "karras",
    "steps": 30,
    "cfg": 6.5,
    "seed": 19890001,
    "width": 512,
    "height": 512,
    "output_prefix": "1989/level_50/title"
  }
]
```

| Field | Purpose | Notes |
| --- | --- | --- |
| `id` | Human-friendly name stored in the render metadata. | Required, must be unique per file. |
| `positive` | Prompt describing what the sprite should look like. | Required. |
| `negative` | Optional safety filter prompt. | Defaults to the workflow value when omitted. |
| `model` | Exact filename of the checkpoint in `ComfyUI/models/checkpoints`. | Falls back to the workflow default if missing. |
| `vae` | Optional explicit VAE filename. | Leave blank to use the checkpoint's default VAE. |
| `sampler` & `scheduler` | Any sampler/scheduler pair supported by your ComfyUI build. | Both fields are optional; omit to use the workflow defaults. |
| `steps`, `cfg`, `seed` | Diffusion parameters. | `seed` of `-1` tells ComfyUI to randomize. |
| `width`, `height` | Canvas size for the sprite. | Must be multiples of 8. |
| `output_prefix` | Subdirectory-friendly name inserted before the numeric filename. | If absent the script uses the `id`. |

## 3. Import the workflow

1. Start ComfyUI and open the web UI.
2. Choose **Load** → **Import Workflow** and select `workflow_1989_assets.json` from this repo.
3. Verify that the `Checkpoint Loader`, `CLIPTextEncode` nodes, and `Save Image` node have sensible defaults for your machine (model paths, output folders, etc.).  Adjust and then save the workflow once so ComfyUI remembers your preferred defaults.

The workflow sticks closely to the [ComfyUI basics tutorial](https://docs.comfy.org/tutorials/basic/text-to-image): it loads a checkpoint, encodes positive/negative prompts, runs a sampler, decodes with the VAE, and writes files.  The only customization is that the save nodes use `{id}` placeholders so the helper script can format filenames and metadata deterministically.

## 4. Queue renders from JSON

Use the helper script to read an asset spec file and queue prompts via ComfyUI's REST API.

```bash
python docs/1989/comfyui/queue_1989_assets.py \
  --workflow docs/1989/comfyui/workflow_1989_assets.json \
  --json docs/1989/comfyui/example_asset_spec.json \
  --server http://127.0.0.1:8188
```

The script will:

1. Load the workflow template.
2. Read every asset object in the JSON array.
3. Merge the per-asset overrides into the workflow inputs.
4. Queue the finished prompt with the `/prompt` endpoint and print the queue ID.

Because each asset submission is independent you can keep ComfyUI open, tweak nodes, or cancel individual jobs through the UI without touching the rest of the batch.
Run with `--dry-run` to inspect the generated payloads before you start the queue.

## 5. Tips for the 1989 anthology

- Keep palette and pixel dimensions tight (32×32, 64×64, 128×128) when recreating NES-era sprites.  Oversample at 2× size if you want to manually downscale after export.
- Capture the film inspiration through props, costumes, or lighting cues instead of literal title drops, per the anthology rules.
- Store the JSON files alongside their puzzle design docs so that future revisions are traceable.

## 6. Troubleshooting

| Symptom | Fix |
| --- | --- |
| Images save to an unexpected directory. | Update the `output_path` widget on the `Save Image` node before queuing jobs. |
| ComfyUI throws `Cannot find model`. | Confirm the `model` field in JSON matches a file inside `ComfyUI/models/checkpoints`. |
| `queue_1989_assets.py` hangs. | Ensure ComfyUI is running and that the `--server` URL is reachable. |
| Rendered size is wrong. | Check that `width`/`height` exist for that asset and that they are divisible by 8. |

Once set up, you can duplicate JSON files per game and re-run the helper to rebuild art whenever prompts change.
