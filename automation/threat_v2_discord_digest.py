#!/usr/bin/env python3
"""Prepare and publish one privacy-bounded Threat Observatory V2 digest/day.

The command has three explicit phases so a delivery receipt is only persisted
after Discord has accepted the message. The webhook is supplied exclusively
through the workflow secret environment and is never written to disk.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


ENDPOINT = (
    "https://jarvis-threat-observatory.jarvis-system-live.workers.dev"
    "/v1/public/attacks?schema=2&hours=24"
)
MAX_SOURCE_BYTES = 256 * 1024
MAX_DISCORD_BYTES = 64 * 1024
SAFE_BEHAVIORS = {
    "session_lifecycle",
    "automated_scan_candidate",
    "password_guessing",
    "system_discovery",
    "download_intent",
    "persistence_intent",
    "privilege_escalation_intent",
    "cryptomining_intent",
    "interactive_shell_behavior",
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
    "cookie",
    "token",
}
HASH = re.compile(r"^[a-f0-9]{64}$")


def fail(message: str) -> None:
    raise SystemExit(f"threat V2 digest rejected: {message}")


def _contains_forbidden_key(value: object) -> bool:
    if isinstance(value, dict):
        return any(
            str(key).lower() in FORBIDDEN_KEYS
            or str(key).lower().endswith("_ip")
            or _contains_forbidden_key(child)
            for key, child in value.items()
        )
    if isinstance(value, list):
        return any(_contains_forbidden_key(child) for child in value)
    return False


def _bounded_count(value: Any) -> int:
    if (
        isinstance(value, bool)
        or not isinstance(value, int)
        or not 0 <= value <= 10_000_000
    ):
        fail("invalid aggregate count")
    return value


def validate_snapshot(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict) or value.get("schema") != 2:
        fail("schema is not V2")
    if _contains_forbidden_key(value):
        fail("forbidden raw-data field detected")
    if value.get("truth") != (
        "Authenticated direct sensor aggregates with privacy projection; "
        "no raw IPs, credentials, commands, URLs, payloads or attribution claims."
    ):
        fail("truth contract rejected")
    sensor = value.get("sensor")
    counts = value.get("counts")
    proof = value.get("proof")
    events = value.get("events")
    if not isinstance(sensor, dict) or sensor.get("state") not in {
        "online",
        "offline",
        "staged",
        "pending",
    }:
        fail("invalid sensor state")
    if not isinstance(counts, dict) or not isinstance(proof, dict):
        fail("missing aggregate or proof")
    if not isinstance(events, list) or len(events) > 40:
        fail("invalid bounded event list")
    _bounded_count(counts.get("direct_events_24h"))
    _bounded_count(counts.get("direct_events_7d"))
    behaviors = counts.get("by_behavior_24h")
    if not isinstance(behaviors, dict) or any(
        key not in SAFE_BEHAVIORS for key in behaviors
    ):
        fail("unknown behavior aggregate")
    for count in behaviors.values():
        _bounded_count(count)
    sequence = proof.get("chain_head_sequence")
    chain_hash = proof.get("chain_head_hash")
    if (
        not isinstance(sequence, int)
        or sequence < 1
        or not isinstance(chain_hash, str)
        or not HASH.fullmatch(chain_hash)
    ):
        fail("invalid integrity receipt")
    if proof.get("receiver_fresh") is not True:
        fail("receiver is not fresh")
    if (
        proof.get("event_contract") != "jarvis.sensor.event/v2"
        or proof.get("privacy_projection") != "jarvis.public.sensor/v2"
        or proof.get("transport") != "HMAC-SHA256"
    ):
        fail("receiver proof contract rejected")
    for event in events:
        if not isinstance(event, dict):
            fail("invalid event")
        if (
            event.get("verified_direct_sensor_event") is not True
            or event.get("host_compromised") is not False
        ):
            fail("event truth claim rejected")
    return value


def fetch_snapshot() -> dict[str, Any]:
    request = urllib.request.Request(
        ENDPOINT,
        headers={
            "Accept": "application/json",
            "User-Agent": "JARVIS-Daily-Threat-V2/1.0",
        },
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        if response.status != 200 or response.geturl() != ENDPOINT:
            fail("unexpected receiver response")
        raw = response.read(MAX_SOURCE_BYTES + 1)
    if not raw or len(raw) > MAX_SOURCE_BYTES:
        fail("receiver response size rejected")
    try:
        return validate_snapshot(json.loads(raw))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        fail(type(error).__name__)


def _utc_day(value: dict[str, Any]) -> str:
    generated = value.get("generated_at")
    if not isinstance(generated, str):
        fail("missing generation time")
    try:
        parsed = datetime.fromisoformat(generated.replace("Z", "+00:00"))
    except ValueError:
        fail("invalid generation time")
    if parsed.tzinfo is None:
        fail("generation time is not timezone-aware")
    now = datetime.now(UTC)
    if abs((now - parsed.astimezone(UTC)).total_seconds()) > 900:
        fail("snapshot is stale")
    return now.date().isoformat()


def build_payload(snapshot: dict[str, Any], day: str) -> dict[str, Any]:
    counts = snapshot["counts"]
    proof = snapshot["proof"]
    behaviors = sorted(
        (
            (key, _bounded_count(value))
            for key, value in counts["by_behavior_24h"].items()
        ),
        key=lambda item: (-item[1], item[0]),
    )[:3]
    maximum_behavior = max((count for _name, count in behaviors), default=1)
    behavior_text = "\n".join(
        "`{:<30}` {:>5}  {}".format(
            name.replace("_", " ").upper()[:30],
            count,
            "▰" * max(1, round(count / maximum_behavior * 8)),
        )
        for name, count in behaviors
    ) or "`NO CLASSIFIED ACTIVITY`"
    state = str(snapshot["sensor"]["state"]).upper()
    direct = _bounded_count(counts["direct_events_24h"])
    weekly = _bounded_count(counts["direct_events_7d"])
    sequence = proof["chain_head_sequence"]
    generated_at = str(snapshot["generated_at"])
    brand_icon = "https://jarvisserver.org/assets/jarvis-core-head.png"
    observatory = "https://jarvisserver.org/threat-observatory/"
    return {
        "username": "JARVIS AEGIS // Threat Observatory",
        "avatar_url": brand_icon,
        "content": "",
        "allowed_mentions": {"parse": []},
        "embeds": [
            {
                "author": {
                    "name": "JARVIS SYSTEM // AEGIS NETWORK",
                    "url": observatory,
                    "icon_url": brand_icon,
                },
                "title": "◈ GLOBAL THREAT INTERCEPT // 24H",
                "description": (
                    "```text\n"
                    "AEGIS SENSOR LINK       " + state.ljust(16)[:16] + "\n"
                    f"DIRECT SIGNALS / 24H   {direct:>8}\n"
                    f"DIRECT SIGNALS / 7D    {weekly:>8}\n"
                    f"CHAIN RECEIPT           #{sequence:<7}\n"
                    "PUBLIC RAW DATA         BLOCKED\n"
                    "```\n"
                    "**Echte Sensorereignisse. Keine Demo. Keine Simulation.**\n"
                    "Real sensor events. No demo. No simulation."
                ),
                "url": observatory,
                "color": 5240063,
                "thumbnail": {"url": brand_icon},
                "fields": [
                    {
                        "name": "◉ LIVE PIPELINE",
                        "value": (
                            "`ISOLATED SENSOR` → `SIGNED RECEIVER` → "
                            "`PRIVACY PROJECTION` → `PUBLIC MAP`"
                        ),
                        "inline": False,
                    },
                    {
                        "name": "↗ LIVE OBSERVATORY",
                        "value": "[Interaktive Weltkarte öffnen / Open live globe](https://jarvisserver.org/threat-observatory/)",
                        "inline": False,
                    },
                ],
            },
            {
                "title": "THREAT DNA // BEHAVIOR MATRIX",
                "description": (
                    "Relative Verteilung der klassifizierten, datensparsamen "
                    "24H-Signale.\nRelative distribution of classified, "
                    "privacy-bounded 24H signals."
                ),
                "color": 16724281,
                "fields": [
                    {
                        "name": "SIGNAL CLASSES",
                        "value": f"```text\n{behavior_text}\n```",
                        "inline": False,
                    },
                    {
                        "name": "✓ INTEGRITY",
                        "value": (
                            f"`CHAIN VERIFIED`  `RECEIPT #{sequence}`  "
                            "`RECEIVER FRESH`"
                        ),
                        "inline": False,
                    },
                    {
                        "name": "⚿ TRUTH BOUNDARY",
                        "value": (
                            "Keine Roh-IP, Zugangsdaten, Befehle, URLs oder Payloads. "
                            "Keine Personenattribution und kein behaupteter Host-Kompromiss.\n"
                            "No raw IPs, credentials, commands, URLs or payloads. "
                            "No person attribution and no claimed host compromise."
                        ),
                        "inline": False,
                    },
                ],
                "timestamp": generated_at,
                "footer": {
                    "text": f"JARVIS AEGIS // {day} UTC // AUTHENTIC DATA // SILENT DIGEST",
                    "icon_url": brand_icon,
                },
            }
        ],
    }


def prepare(state_path: Path, payload_path: Path, metadata_path: Path) -> bool:
    snapshot = fetch_snapshot()
    day = _utc_day(snapshot)
    previous: dict[str, Any] = {}
    if state_path.exists():
        try:
            loaded = json.loads(state_path.read_text(encoding="utf-8"))
            previous = loaded if isinstance(loaded, dict) else {}
        except json.JSONDecodeError:
            fail("delivery state is invalid")
    if previous.get("delivered_day") == day:
        print("Daily V2 digest already has a persisted receipt; no delivery due.")
        return False
    sequence = snapshot["proof"]["chain_head_sequence"]
    notice_id = f"threat-v2-daily-{day}"
    payload_path.write_text(
        json.dumps(build_payload(snapshot, day)), encoding="utf-8"
    )
    metadata_path.write_text(
        json.dumps({"day": day, "notice_id": notice_id, "sequence": sequence}),
        encoding="utf-8",
    )
    print(
        f"Prepared privacy-bounded daily V2 digest for {day} "
        f"at receipt sequence {sequence}."
    )
    return True


def _webhook_wait_url(secret_url: str) -> str:
    parsed = urllib.parse.urlsplit(secret_url)
    if parsed.scheme != "https" or parsed.hostname not in {
        "discord.com",
        "discordapp.com",
    }:
        fail("webhook endpoint rejected")
    if not parsed.path.startswith("/api/webhooks/"):
        fail("webhook path rejected")
    query = urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)
    query = [(key, value) for key, value in query if key != "wait"] + [
        ("wait", "true")
    ]
    return urllib.parse.urlunsplit(
        (parsed.scheme, parsed.netloc, parsed.path, urllib.parse.urlencode(query), "")
    )


def send(payload_path: Path, receipt_path: Path) -> None:
    secret = os.environ.get("DISCORD_WEBHOOK_URL", "")
    if not secret:
        fail("Discord webhook secret is not configured")
    payload = json.loads(payload_path.read_text(encoding="utf-8"))
    if payload.get("allowed_mentions") != {"parse": []} or payload.get("content"):
        fail("unsafe Discord mention contract")
    request = urllib.request.Request(
        _webhook_wait_url(secret),
        data=json.dumps(payload).encode(),
        headers={
            "Content-Type": "application/json",
            "User-Agent": "JARVIS-Daily-Threat-V2/1.0",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        if response.status != 200:
            fail(f"Discord returned HTTP {response.status}")
        raw = response.read(MAX_DISCORD_BYTES + 1)
    if not raw or len(raw) > MAX_DISCORD_BYTES:
        fail("Discord receipt size rejected")
    receipt = json.loads(raw)
    message_id = receipt.get("id") if isinstance(receipt, dict) else None
    if not isinstance(message_id, str) or not message_id.isdigit():
        fail("Discord returned no valid message receipt")
    receipt_path.write_text(
        json.dumps(
            {"receipt_sha256": hashlib.sha256(message_id.encode()).hexdigest()}
        ),
        encoding="utf-8",
    )
    print("Discord accepted the silent V2 digest and returned a valid receipt.")


def record(state_path: Path, metadata_path: Path, receipt_path: Path) -> None:
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
    expected = {"day", "notice_id", "sequence"}
    if not isinstance(metadata, dict) or set(metadata) != expected:
        fail("invalid delivery metadata")
    receipt_hash = receipt.get("receipt_sha256") if isinstance(receipt, dict) else None
    if not isinstance(receipt_hash, str) or not HASH.fullmatch(receipt_hash):
        fail("invalid delivery receipt")
    state = {
        "schema": 1,
        "delivered_day": metadata["day"],
        "notice_id": metadata["notice_id"],
        "source_sequence": metadata["sequence"],
        "receipt_sha256": receipt_hash,
        "privacy": "no-webhook-no-message-id-no-raw-identifiers",
    }
    state_path.parent.mkdir(parents=True, exist_ok=True)
    temporary = state_path.with_suffix(".tmp")
    temporary.write_text(
        json.dumps(state, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    temporary.replace(state_path)
    print("Persisted the privacy-bounded Discord delivery receipt.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("phase", choices=("prepare", "send", "record"))
    parser.add_argument(
        "--state", type=Path, default=Path(".github/state/threat-v2-discord.json")
    )
    parser.add_argument(
        "--payload", type=Path, default=Path("/tmp/jarvis-threat-v2-payload.json")
    )
    parser.add_argument(
        "--metadata", type=Path, default=Path("/tmp/jarvis-threat-v2-metadata.json")
    )
    parser.add_argument(
        "--receipt", type=Path, default=Path("/tmp/jarvis-threat-v2-receipt.json")
    )
    args = parser.parse_args()
    if args.phase == "prepare":
        due = prepare(args.state, args.payload, args.metadata)
        output = os.environ.get("GITHUB_OUTPUT")
        if output:
            with open(output, "a", encoding="utf-8") as handle:
                handle.write(f"due={'true' if due else 'false'}\n")
    elif args.phase == "send":
        send(args.payload, args.receipt)
    else:
        record(args.state, args.metadata, args.receipt)


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, json.JSONDecodeError, urllib.error.URLError) as error:
        fail(type(error).__name__)
