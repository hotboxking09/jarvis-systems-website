#!/usr/bin/env python3

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock


MODULE_PATH = Path(__file__).with_name("threat_v2_discord_digest.py")
SPEC = importlib.util.spec_from_file_location("threat_v2_digest", MODULE_PATH)
assert SPEC and SPEC.loader
digest = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(digest)


def snapshot():
    return {
        "schema": 2,
        "generated_at": "2026-08-06T21:00:00Z",
        "window_hours": 24,
        "truth": (
            "Authenticated direct sensor aggregates with privacy projection; "
            "no raw IPs, credentials, commands, URLs, payloads or attribution claims."
        ),
        "sensor": {"state": "online"},
        "counts": {
            "direct_events_24h": 20,
            "direct_events_7d": 20,
            "by_behavior_24h": {
                "password_guessing": 4,
                "session_lifecycle": 9,
            },
        },
        "proof": {
            "chain_head_sequence": 20,
            "chain_head_hash": "a" * 64,
            "receiver_fresh": True,
            "event_contract": "jarvis.sensor.event/v2",
            "privacy_projection": "jarvis.public.sensor/v2",
            "transport": "HMAC-SHA256",
        },
        "events": [
            {"verified_direct_sensor_event": True, "host_compromised": False}
        ],
    }


class ThreatDigestTests(unittest.TestCase):
    def test_validate_and_payload_are_silent_and_bilingual(self):
        value = digest.validate_snapshot(snapshot())
        payload = digest.build_payload(value, "2026-08-06")
        self.assertEqual(payload["allowed_mentions"], {"parse": []})
        self.assertEqual(payload["content"], "")
        self.assertEqual(len(payload["embeds"]), 2)
        self.assertEqual(
            payload["avatar_url"],
            "https://jarvisserver.org/assets/jarvis-core-head.png",
        )
        encoded = json.dumps(payload, ensure_ascii=False)
        self.assertIn("Echte", encoded)
        self.assertIn("Real sensor events", encoded)
        self.assertIn("RECEIPT #20", encoded)
        self.assertIn("THREAT DNA", encoded)
        self.assertIn("PUBLIC RAW DATA", encoded)

    def test_raw_identifier_field_is_rejected(self):
        value = snapshot()
        value["events"][0]["source_ip"] = "192.0.2.1"
        with self.assertRaises(SystemExit):
            digest.validate_snapshot(value)

    def test_prepare_is_once_per_day(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            state = root / "state.json"
            payload = root / "payload.json"
            metadata = root / "metadata.json"
            with mock.patch.object(
                digest, "fetch_snapshot", return_value=snapshot()
            ), mock.patch.object(digest, "_utc_day", return_value="2026-08-06"):
                self.assertTrue(digest.prepare(state, payload, metadata))
                state.write_text(json.dumps({"delivered_day": "2026-08-06"}))
                self.assertFalse(digest.prepare(state, payload, metadata))

    def test_record_keeps_only_hashed_receipt(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            metadata = root / "metadata.json"
            receipt = root / "receipt.json"
            state = root / "state.json"
            metadata.write_text(
                json.dumps(
                    {"day": "2026-08-06", "notice_id": "x", "sequence": 20}
                )
            )
            receipt.write_text(json.dumps({"receipt_sha256": "b" * 64}))
            digest.record(state, metadata, receipt)
            saved = json.loads(state.read_text())
            self.assertEqual(saved["source_sequence"], 20)
            self.assertNotIn("message_id", saved)


if __name__ == "__main__":
    unittest.main()
