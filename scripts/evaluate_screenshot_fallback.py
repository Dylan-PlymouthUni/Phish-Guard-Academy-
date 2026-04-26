#!/usr/bin/env python3
"""Evaluate fallback screenshot scoring with optional holdout validation."""

from __future__ import annotations

import argparse
import random
from pathlib import Path
from typing import Dict, List, Tuple
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from ml.api_screenshot_fix import analyze_screenshot_content


def load_samples(base: Path) -> List[Tuple[str, int, int]]:
    """Load samples."""
    rows: List[Tuple[str, int, int]] = []
    for label_name, y in [("legitimate", 0), ("phishing", 1)]:
        for p in (base / label_name).rglob("*"):
            if not p.is_file() or p.suffix.lower() not in {".png", ".jpg", ".jpeg", ".bmp", ".webp"}:
                continue
            risk = analyze_screenshot_content(p.read_bytes())["risk"]
            rows.append((str(p), y, int(risk)))
    return rows


def metrics(rows: List[Tuple[str, int, int]], threshold: int):
    """Run metrics."""
    tp = fp = tn = fn = 0
    for _, y, r in rows:
        pred = 1 if r >= threshold else 0
        if pred == 1 and y == 1:
            tp += 1
        elif pred == 1 and y == 0:
            fp += 1
        elif pred == 0 and y == 0:
            tn += 1
        else:
            fn += 1

    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) else 0.0
    acc = (tp + tn) / len(rows) if rows else 0.0
    return tp, fp, tn, fn, precision, recall, f1, acc


def pick_best_threshold(rows: List[Tuple[str, int, int]], candidates: List[int]) -> Tuple[int, Dict[str, float]]:
    """Pick best threshold."""
    best_threshold = candidates[0]
    best_stats = None
    for t in candidates:
        tp, fp, tn, fn, precision, recall, f1, acc = metrics(rows, t)
        stats = {
            "tp": tp,
            "fp": fp,
            "tn": tn,
            "fn": fn,
            "precision": precision,
            "recall": recall,
            "f1": f1,
            "acc": acc,
        }
        if best_stats is None or stats["f1"] > best_stats["f1"] or (
            stats["f1"] == best_stats["f1"] and stats["acc"] > best_stats["acc"]
        ):
            best_threshold = t
            best_stats = stats
    return best_threshold, best_stats


def stratified_holdout(
    rows: List[Tuple[str, int, int]],
    holdout_ratio: float,
    seed: int,
) -> Tuple[List[Tuple[str, int, int]], List[Tuple[str, int, int]]]:
    """Run stratified holdout."""
    legit = [r for r in rows if r[1] == 0]
    phish = [r for r in rows if r[1] == 1]

    rng = random.Random(seed)
    rng.shuffle(legit)
    rng.shuffle(phish)

    legit_holdout = max(1, int(round(len(legit) * holdout_ratio)))
    phish_holdout = max(1, int(round(len(phish) * holdout_ratio)))

    holdout = legit[:legit_holdout] + phish[:phish_holdout]
    train = legit[legit_holdout:] + phish[phish_holdout:]
    return train, holdout


def main():
    """Run the main CLI workflow for this module."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--threshold", type=int, default=None, help="Fixed threshold to evaluate")
    parser.add_argument("--min-f1", type=float, default=None, help="Fail if holdout F1 is below this")
    parser.add_argument("--min-precision", type=float, default=None, help="Fail if holdout precision is below this")
    parser.add_argument("--min-recall", type=float, default=None, help="Fail if holdout recall is below this")
    parser.add_argument("--holdout-ratio", type=float, default=0.25, help="Holdout ratio for validation")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for split")
    args = parser.parse_args()

    base = Path("data/screenshots")
    rows = load_samples(base)

    print(f"samples={len(rows)}")
    if not rows:
        return

    candidates = [30, 35, 40, 45, 50, 55, 60, 65, 70]
    train_rows, holdout_rows = stratified_holdout(rows, args.holdout_ratio, args.seed)

    print(f"train_samples={len(train_rows)} holdout_samples={len(holdout_rows)} seed={args.seed}")

    threshold = args.threshold
    if threshold is None:
        threshold, train_best = pick_best_threshold(train_rows, candidates)
        print(
            f"train_best threshold={threshold} f1={train_best['f1']:.3f} "
            f"precision={train_best['precision']:.3f} recall={train_best['recall']:.3f} acc={train_best['acc']:.3f}"
        )
    else:
        print(f"using_fixed_threshold={threshold}")

    for t in candidates:
        tp, fp, tn, fn, precision, recall, f1, acc = metrics(rows, t)
        print(
            f"global t={t:>2} tp={tp:>2} fp={fp:>2} tn={tn:>2} fn={fn:>2} "
            f"precision={precision:.3f} recall={recall:.3f} f1={f1:.3f} acc={acc:.3f}"
        )

    h_tp, h_fp, h_tn, h_fn, h_precision, h_recall, h_f1, h_acc = metrics(holdout_rows, threshold)
    print(
        f"holdout threshold={threshold} tp={h_tp} fp={h_fp} tn={h_tn} fn={h_fn} "
        f"precision={h_precision:.3f} recall={h_recall:.3f} f1={h_f1:.3f} acc={h_acc:.3f}"
    )

    if args.min_f1 is not None and h_f1 < args.min_f1:
        raise SystemExit(f"Holdout F1 {h_f1:.3f} below min {args.min_f1:.3f}")
    if args.min_precision is not None and h_precision < args.min_precision:
        raise SystemExit(f"Holdout precision {h_precision:.3f} below min {args.min_precision:.3f}")
    if args.min_recall is not None and h_recall < args.min_recall:
        raise SystemExit(f"Holdout recall {h_recall:.3f} below min {args.min_recall:.3f}")


if __name__ == "__main__":
    main()
