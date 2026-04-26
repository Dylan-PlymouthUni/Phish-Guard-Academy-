#!/usr/bin/env python3
"""Minimal QoL launcher for reproducible dissertation runs.

This wrapper keeps canonical behavior by delegating to scripts/run_experiment.py,
then records a tiny pointer file to the newest run for easy retrieval.
The pointer file includes the run_id, seed, manifest path, and metrics summary path,
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path


def build_run_id(prefix: str) -> str:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"{prefix}_{ts}"


def main() -> int:
    parser = argparse.ArgumentParser(description="Run canonical experiment with QoL metadata")
    parser.add_argument("--seed", type=int, default=42, help="Deterministic seed (default: 42)")
    parser.add_argument(
        "--prefix",
        default="qol_experiment",
        help="Run ID prefix (default: qol_experiment)",
    )
    parser.add_argument(
        "--save-dataset-snapshot",
        action="store_true",
        help="Pass through to canonical runner",
    )
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    run_id = build_run_id(args.prefix)

    cmd = [
        sys.executable,
        str(root / "scripts" / "run_experiment.py"),
        "--seed",
        str(args.seed),
        "--run_id",
        run_id,
    ]
    if args.save_dataset_snapshot:
        cmd.append("--save_dataset_snapshot")

    print(f"[qol-run] Starting canonical experiment: run_id={run_id}")
    proc = subprocess.run(cmd, cwd=root)
    if proc.returncode != 0:
        return proc.returncode

    run_dir = root / "artifacts" / "runs" / run_id
    manifest_path = run_dir / "run_manifest.json"
    metrics_path = run_dir / "eval" / "metrics_summary.json"

    summary = {
        "run_id": run_id,
        "seed": args.seed,
        "started_via": "scripts/qol_run.py",
        "run_manifest": str(manifest_path),
        "metrics_summary": str(metrics_path),
        "timestamp": datetime.now().isoformat(),
    }

    latest_pointer = root / "artifacts" / "runs" / "latest_qol_run.json"
    latest_pointer.parent.mkdir(parents=True, exist_ok=True)
    latest_pointer.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    print(f"[qol-run] Completed. Manifest: {manifest_path}")
    print(f"[qol-run] Pointer written: {latest_pointer}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
