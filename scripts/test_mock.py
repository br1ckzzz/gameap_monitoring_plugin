#!/usr/bin/env python3
"""
Integration test suite for GameAP WebMonitoring mock server & bot API endpoints.
"""

import sys
import threading
import socketserver
import urllib.request
import urllib.error
import json
import time
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from mock_server import MockMonitoringHandler, SETTINGS_CACHE

TEST_PORT = 8059

def run_tests():
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(("127.0.0.1", TEST_PORT), MockMonitoringHandler)
    server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    server_thread.start()
    time.sleep(0.3)

    base_url = f"http://127.0.0.1:{TEST_PORT}"
    tests_passed = 0
    total_tests = 0

    def assert_test(name, condition, details=""):
        nonlocal tests_passed, total_tests
        total_tests += 1
        if condition:
            tests_passed += 1
            print(f"[PASS] {name}")
        else:
            print(f"[FAIL] {name}: {details}")

    try:
        # 1. Public monitoring view
        req = urllib.request.Request(f"{base_url}/")
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            assert_test("Public monitoring view 200 OK with v1.0.8 & INITIAL_DATA",
                        resp.status == 200 and "1.0.8" in content and "window.INITIAL_DATA" in content)

        # 2. Diagnostic endpoint
        req = urllib.request.Request(f"{base_url}/plugins/web-monitoring/diagnostic")
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            assert_test("Diagnostic endpoint 200 OK with version 1.0.8",
                        resp.status == 200 and data.get("version") == "1.0.8")

        # 3. Servers endpoint
        req = urllib.request.Request(f"{base_url}/plugins/web-monitoring/servers")
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            assert_test("Servers API returns list of servers",
                        resp.status == 200 and len(data.get("servers", [])) > 0)

        # 4. Bot endpoint default (no token required)
        SETTINGS_CACHE["bot_api_token"] = ""
        SETTINGS_CACHE["bot_api_enabled"] = True
        req = urllib.request.Request(f"{base_url}/bot/servers")
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            assert_test("/bot/servers endpoint 200 OK (no token required)",
                        resp.status == 200 and len(data.get("servers", [])) > 0)

        # 5. Settings update
        payload = json.dumps({"bot_api_token": "secret123", "bot_api_enabled": True}).encode("utf-8")
        req = urllib.request.Request(f"{base_url}/plugins/web-monitoring/settings", data=payload, method="POST")
        req.add_header("Content-Type", "application/json")
        with urllib.request.urlopen(req) as resp:
            res_data = json.loads(resp.read().decode("utf-8"))
            assert_test("POST /settings updated token successfully",
                        res_data.get("settings", {}).get("bot_api_token") == "secret123")

        # 6. Unauthorized access
        try:
            req = urllib.request.Request(f"{base_url}/bot/servers")
            urllib.request.urlopen(req)
            assert_test("/bot/servers without token returned 401 Unauthorized", False, "Expected 401")
        except urllib.error.HTTPError as e:
            assert_test("/bot/servers without token returned 401 Unauthorized", e.code == 401)

        # 7. Authorized via X-WebMon-Token
        req = urllib.request.Request(f"{base_url}/bot/servers")
        req.add_header("X-WebMon-Token", "secret123")
        with urllib.request.urlopen(req) as resp:
            assert_test("/bot/servers with X-WebMon-Token returned 200 OK", resp.status == 200)

        # 8. Authorized via Bearer token
        req = urllib.request.Request(f"{base_url}/bot/servers")
        req.add_header("Authorization", "Bearer secret123")
        with urllib.request.urlopen(req) as resp:
            assert_test("/bot/servers with Bearer token returned 200 OK", resp.status == 200)

        # 9. Authorized via query param
        req = urllib.request.Request(f"{base_url}/bot/servers?token=secret123")
        with urllib.request.urlopen(req) as resp:
            assert_test("/bot/servers?token=secret123 returned 200 OK", resp.status == 200)

        # 10. Bot API disabled -> 403
        SETTINGS_CACHE["bot_api_enabled"] = False
        try:
            req = urllib.request.Request(f"{base_url}/bot/servers")
            req.add_header("Authorization", "Bearer secret123")
            urllib.request.urlopen(req)
            assert_test("/bot/servers when bot_api_enabled=False returned 403 Forbidden", False, "Expected 403")
        except urllib.error.HTTPError as e:
            assert_test("/bot/servers when bot_api_enabled=False returned 403 Forbidden", e.code == 403)

        # 11. 13.3 Announcement payload in servers response
        SETTINGS_CACHE["bot_api_enabled"] = True
        SETTINGS_CACHE["bot_api_token"] = ""
        req = urllib.request.Request(f"{base_url}/plugins/web-monitoring/servers")
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            announcement = data.get("announcement")
            assert_test("13.3 Announcement banner present in /servers payload",
                        announcement is not None and "🔥" in announcement.get("text", ""))

        # 12. 13.5 Server Clusters / Categories
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            servers = data.get("servers", [])
            has_categories = any(s.get("category") for s in servers)
            assert_test("13.5 Server categories populated from settings", has_categories)

        # 13. 13.6 Uptime tracking field
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            servers = data.get("servers", [])
            has_uptime = any(s.get("uptime_seconds", 0) > 0 for s in servers if s.get("status") == "online")
            assert_test("13.6 Uptime seconds present for online servers", has_uptime)

        # 14. 13.12 Click Analytics (POST /stats/click & GET /stats)
        click_req = urllib.request.Request(f"{base_url}/api/plugins/monitoring/stats/click?server_id=1", data=b"", method="POST")
        with urllib.request.urlopen(click_req) as resp:
            assert_test("13.12 POST /stats/click returns 200 OK", resp.status == 200)

        stats_req = urllib.request.Request(f"{base_url}/api/plugins/monitoring/stats")
        with urllib.request.urlopen(stats_req) as resp:
            stats_data = json.loads(resp.read().decode("utf-8"))
            clicks = stats_data.get("clicks", {})
            assert_test("13.12 GET /stats returns tracked click for server 1", clicks.get("1", 0) >= 1)

        # 15. 13.7 Smart Auto-Hide Offline Servers
        SETTINGS_CACHE["auto_hide_offline"] = True
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            offline_servers = [s for s in data.get("servers", []) if s.get("status") == "offline"]
            all_marked = all(s.get("is_hidden_offline") is True for s in offline_servers)
            assert_test("13.7 Auto-hide marks offline servers as is_hidden_offline", all_marked and len(offline_servers) > 0)
        SETTINGS_CACHE["auto_hide_offline"] = False

    finally:
        httpd.shutdown()
        httpd.server_close()

    print(f"\nResults: {tests_passed}/{total_tests} passed.")
    if tests_passed == total_tests:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    run_tests()
