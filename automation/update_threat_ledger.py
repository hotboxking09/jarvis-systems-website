#!/usr/bin/env python3
"""Publish a strictly sanitized hourly snapshot only when real events change."""

from __future__ import annotations

import hashlib
import json
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


ENDPOINT = (
    "https://jarvis-threat-observatory.jarvis-system-live.workers.dev"
    "/v1/public/attacks"
)
TARGET = Path("data/hourly-threat-ledger.json")
SOURCE_ALIAS = re.compile(r"^SRC-[A-F0-9]{12}$")
COUNTRY = re.compile(r"^[A-Z]{2}$")
SEVERITIES = {"info", "low", "medium", "high"}
OUTCOMES = {
    "observed",
    "session_closed",
    "emulated_authentication",
    "contained_in_emulator",
    "client_fingerprint_observed",
}
FORBIDDEN_KEYS = {
    "ip",
    "src_ip",
    "source_ip",
    "destination_ip",
    "password",
    "username",
    "command",
    "input",
    "payload",
    "url",
    "hostname",
}


def fail(message: str) -> None:
    raise SystemExit(f"threat ledger rejected: {message}")


def contains_forbidden_key(value: object) -> bool:
    if isinstance(value, dict):
        for key, child in value.items():
            normalized = str(key).lower()
            if normalized in FORBIDDEN_KEYS or normalized.endswith("_ip"):
                return True
            if contains_forbidden_key(child):
                return True
    elif isinstance(value, list):
        return any(contains_forbidden_key(child) for child in value)
    return False


def validate_event(event: object) -> dict:
    if not isinstance(event, dict):
        fail("event is not an object")
    allowed = {
        "source_alias",
        "country",
        "asn",
        "type",
        "label",
        "severity",
        "outcome",
        "time_window",
        "count",
        "verified_direct_sensor_event",
        "host_compromised",
    }
    if set(event) != allowed:
        fail("event fields do not match the public contract")
    if not SOURCE_ALIAS.fullmatch(str(event["source_alias"])):
        fail("invalid source alias")
    if event["country"] is not None and not COUNTRY.fullmatch(str(event["country"])):
        fail("invalid country")
    if event["asn"] is not None and (
        not isinstance(event["asn"], int) or not 1 <= event["asn"] <= 4_294_967_295
    ):
        fail("invalid ASN")
    if event["severity"] not in SEVERITIES:
        fail("invalid severity")
    if event["outcome"] not in OUTCOMES:
        fail("invalid outcome")
    if event["verified_direct_sensor_event"] is not True:
        fail("unverified direct event")
    if event["host_compromised"] is not False:
        fail("unsafe compromise claim")
    if not isinstance(event["count"], int) or not 1 <= event["count"] <= 100_000:
        fail("invalid event count")
    try:
        datetime.fromisoformat(str(event["time_window"]).replace("Z", "+00:00"))
    except ValueError:
        fail("invalid event time")
    for key in ("type", "label", "outcome"):
        if not isinstance(event[key], str) or not 1 <= len(event[key]) <= 64:
            fail(f"invalid {key}")
    return {key: event[key] for key in sorted(event)}


def main() -> None:
    request = urllib.request.Request(
        ENDPOINT,
        headers={"Accept": "application/json", "User-Agent": "JARVIS-Hourly-Ledger/1.0"},
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        if response.status != 200:
            fail(f"receiver returned HTTP {response.status}")
        raw = response.read(256_001)
    if len(raw) > 256_000:
        fail("receiver response is too large")
    source = json.loads(raw)
    if contains_forbidden_key(source):
        fail("forbidden raw-data field detected")
    if source.get("schema") != 1:
        fail("unknown receiver schema")
    events_raw = source.get("events")
    if not isinstance(events_raw, list) or len(events_raw) > 40:
        fail("invalid event ledger")
    events = [validate_event(event) for event in events_raw]
    counts = source.get("counts")
    if not isinstance(counts, dict):
        fail("invalid counts")
    for key in ("direct_events_24h", "direct_events_7d"):
        if not isinstance(counts.get(key), int) or counts[key] < 0:
            fail(f"invalid {key}")
    if not isinstance(counts.get("by_type_24h"), dict):
        fail("invalid type counts")

    semantic = {
        "counts": counts,
        "last_direct_event": source.get("last_direct_event"),
        "events": events,
    }
    fingerprint = hashlib.sha256(
        json.dumps(semantic, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    if TARGET.exists():
        previous = json.loads(TARGET.read_text(encoding="utf-8"))
        if previous.get("source_fingerprint") == fingerprint:
            print("No new authenticated sensor events; ledger unchanged.")
            return

    sensor = source.get("sensor") if isinstance(source.get("sensor"), dict) else {}
    result = {
        "schema": 1,
        "updated_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace(
            "+00:00", "Z"
        ),
        "source": ENDPOINT,
        "window": "rolling-24h-events-with-7d-total",
        "sensor": {
            "state_at_update": sensor.get("state", "unknown"),
            "label": "JARVIS HONEYPOT",
            "region": "CENTRAL EUROPE // APPROXIMATE",
        },
        **semantic,
        "privacy": "daily-rotating-source-aliases-no-raw-identifiers",
        "identity_warning": "A network source alias is not a person identity.",
        "host_compromise_claim": False,
        "source_fingerprint": fingerprint,
    }
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    temporary = TARGET.with_suffix(".tmp")
    temporary.write_text(
        json.dumps(result, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    temporary.replace(TARGET)
    print(f"Updated sanitized ledger: {len(events)} aggregate rows.")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, json.JSONDecodeError) as error:
        fail(type(error).__name__)
