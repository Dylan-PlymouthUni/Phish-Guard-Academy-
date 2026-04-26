#!/usr/bin/env python3
"""Lightweight API smoke checks for local/demo use.
This script performs basic health checks on the PhishGuard API by sending test requests to the health and analyze endpoints.
It verifies that the API is responsive and returns expected fields in the analysis response.
This is intended for quick local testing and demonstration purposes, not for comprehensive validation."""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request


SAMPLE_TEXT = "URGENT: verify your account now to avoid suspension."
SAMPLE_URL = "http://security-check-account.example.com/login"


def get_json(url: str, timeout: int) -> dict:
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        body = resp.read().decode("utf-8")
        return json.loads(body)


def post_json(url: str, payload: dict, timeout: int) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        body = resp.read().decode("utf-8")
        return json.loads(body)


def main() -> int:
    parser = argparse.ArgumentParser(description="PhishGuard API smoke check")
    parser.add_argument("--base-url", default="http://localhost:8000", help="API base URL")
    parser.add_argument("--timeout", type=int, default=20, help="Request timeout seconds")
    args = parser.parse_args()

    health_url = f"{args.base_url.rstrip('/')}/api/health"
    analyze_url = f"{args.base_url.rstrip('/')}/api/analyze"

    try:
        health = get_json(health_url, args.timeout)
        if health.get("ok") is not True:
            print(f"[smoke] FAIL health payload: {health}")
            return 2

        result = post_json(
            analyze_url,
            {"text": SAMPLE_TEXT, "url": SAMPLE_URL},
            args.timeout,
        )

        required_keys = {"risk", "risk_label", "risk_summary", "findings"}
        missing = sorted(k for k in required_keys if k not in result)
        if missing:
            print(f"[smoke] FAIL missing keys: {missing}; payload={result}")
            return 3

        print("[smoke] PASS health and analyze endpoint")
        print(f"[smoke] risk={result.get('risk')} label={result.get('risk_label')} findings={len(result.get('findings', []))}")
        return 0

    except urllib.error.HTTPError as exc:
        payload = exc.read().decode("utf-8", errors="replace")
        print(f"[smoke] FAIL HTTP {exc.code}: {payload}")
        return 4
    except Exception as exc:
        print(f"[smoke] FAIL exception: {exc}")
        return 5


if __name__ == "__main__":
    raise SystemExit(main())
