#!/usr/bin/env python3
"""Queue ComfyUI jobs for the 1989 anthology assets."""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, Iterable, List

DEFAULT_SERVER = "http://127.0.0.1:8188"


class WorkflowDefaults:
    """Convenience wrapper for reading the exported workflow template."""

    def __init__(self, workflow: Dict[str, Any]):
        nodes = {node["id"]: node for node in workflow.get("nodes", [])}
        try:
            self.checkpoint = nodes[1]
            self.positive = nodes[2]
            self.negative = nodes[3]
            self.latent = nodes[4]
            self.sampler = nodes[5]
            self.vae_decode = nodes[6]
            self.metadata = nodes[7]
            self.save = nodes[8]
        except KeyError as exc:
            raise KeyError("workflow_1989_assets.json is missing an expected node") from exc

        self.model_name = self._widget_value(self.checkpoint, 0)
        self.vae_name = self._widget_value(self.checkpoint, 1)
        self.clip_name = self._widget_value(self.checkpoint, 2)
        self.positive_prompt = self._widget_value(self.positive, 0)
        self.negative_prompt = self._widget_value(self.negative, 0)
        self.width = self._widget_value(self.latent, 0)
        self.height = self._widget_value(self.latent, 1)
        self.batch_size = self._widget_value(self.latent, 2, 1)
        self.seed = self._widget_value(self.sampler, 0)
        self.steps = self._widget_value(self.sampler, 1)
        self.cfg = self._widget_value(self.sampler, 2)
        self.sampler_name = self._widget_value(self.sampler, 3)
        self.scheduler = self._widget_value(self.sampler, 4)
        self.denoise = self._widget_value(self.sampler, 5, 1)
        self.metadata_key = self._widget_value(self.metadata, 0, "asset_id")
        self.metadata_value = self._widget_value(self.metadata, 1, "{id}")
        self.output_prefix = self._widget_value(self.save, 0)

    @staticmethod
    def _widget_value(node: Dict[str, Any], index: int, fallback: Any | None = None) -> Any:
        values: List[Any] = node.get("widgets_values", [])
        if index < len(values):
            return values[index]
        if fallback is not None:
            return fallback
        raise IndexError(f"Node {node.get('id')} is missing widget index {index}")


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def build_prompt(asset: Dict[str, Any], defaults: WorkflowDefaults) -> Dict[str, Any]:
    asset_id = asset.get("id")
    if not asset_id:
        raise ValueError("Every asset object must include an 'id' field")

    positive = asset.get("positive", defaults.positive_prompt)
    negative = asset.get("negative", defaults.negative_prompt)
    width = int(asset.get("width", defaults.width))
    height = int(asset.get("height", defaults.height))
    seed = int(asset.get("seed", defaults.seed))
    steps = int(asset.get("steps", defaults.steps))
    cfg = float(asset.get("cfg", defaults.cfg))
    sampler_name = asset.get("sampler", defaults.sampler_name)
    scheduler = asset.get("scheduler", defaults.scheduler)
    model_name = asset.get("model", defaults.model_name)
    vae_name = asset.get("vae", defaults.vae_name)

    prefix_base = asset.get("output_prefix")
    if prefix_base:
        filename_prefix = prefix_base
    else:
        filename_prefix = f"{defaults.output_prefix}/{asset_id}"

    metadata_value = defaults.metadata_value.replace("{id}", asset_id)

    prompt = {
        "1": {
            "inputs": {
                "ckpt_name": model_name,
                "vae_name": vae_name,
                "clip_name": defaults.clip_name,
            },
            "class_type": "CheckpointLoaderSimple",
        },
        "2": {
            "inputs": {
                "text": positive,
                "clip": ["1", 1],
            },
            "class_type": "CLIPTextEncode",
        },
        "3": {
            "inputs": {
                "text": negative,
                "clip": ["1", 1],
            },
            "class_type": "CLIPTextEncode",
        },
        "4": {
            "inputs": {
                "width": width,
                "height": height,
                "batch_size": defaults.batch_size,
            },
            "class_type": "EmptyLatentImage",
        },
        "5": {
            "inputs": {
                "seed": seed,
                "steps": steps,
                "cfg": cfg,
                "sampler_name": sampler_name,
                "scheduler": scheduler,
                "denoise": defaults.denoise,
                "model": ["1", 0],
                "positive": ["2", 0],
                "negative": ["3", 0],
                "latent_image": ["4", 0],
            },
            "class_type": "KSampler",
        },
        "6": {
            "inputs": {
                "samples": ["5", 0],
                "vae": ["1", 2],
            },
            "class_type": "VAEDecode",
        },
        "7": {
            "inputs": {
                "images": ["6", 0],
                "field_name": defaults.metadata_key,
                "field_value": metadata_value,
            },
            "class_type": "SetMetadata",
        },
        "8": {
            "inputs": {
                "images": ["7", 0],
                "filename_prefix": filename_prefix,
                "filename_suffix": "",
            },
            "class_type": "SaveImage",
        },
    }

    # Prune empty vae_name so ComfyUI uses the checkpoint default.
    if not vae_name:
        prompt["1"]["inputs"].pop("vae_name", None)

    return prompt


def queue_prompt(server: str, prompt: Dict[str, Any], client_id: str) -> Dict[str, Any]:
    payload = json.dumps({"prompt": prompt, "client_id": client_id}).encode("utf-8")
    request = urllib.request.Request(
        url=f"{server.rstrip('/')}/prompt",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request) as response:
        return json.load(response)


def iter_assets(path: Path) -> Iterable[Dict[str, Any]]:
    data = load_json(path)
    if not isinstance(data, list):
        raise ValueError("Asset spec must be a JSON array")
    for entry in data:
        if not isinstance(entry, dict):
            raise ValueError("Each asset entry must be a JSON object")
        yield entry


def main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workflow", required=True, type=Path, help="Path to workflow_1989_assets.json")
    parser.add_argument("--json", required=True, type=Path, help="Asset specification JSON file")
    parser.add_argument("--server", default=DEFAULT_SERVER, help="ComfyUI server URL (default: %(default)s)")
    parser.add_argument("--dry-run", action="store_true", help="Print prompts instead of queuing them")

    args = parser.parse_args(argv)

    workflow_data = load_json(args.workflow)
    defaults = WorkflowDefaults(workflow_data)

    try:
        assets = list(iter_assets(args.json))
    except ValueError as exc:
        parser.error(str(exc))

    if not assets:
        parser.error("No assets found in the specification file")

    for asset in assets:
        prompt = build_prompt(asset, defaults)
        client_id = asset.get("id", "1989")
        if args.dry_run:
            json.dump({"prompt": prompt, "client_id": client_id}, sys.stdout, indent=2)
            sys.stdout.write("\n")
            continue

        try:
            result = queue_prompt(args.server, prompt, client_id)
        except urllib.error.URLError as exc:
            parser.error(f"Failed to reach ComfyUI at {args.server}: {exc}")
        else:
            queue_id = result.get("prompt_id", "<unknown>")
            print(f"Queued {asset['id']} as prompt {queue_id}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
