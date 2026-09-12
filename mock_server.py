#!/usr/bin/env python3
"""
GameAP WebMonitoring Local Test & Preview Server
Emulates GameAP WASM plugin endpoint and serves frontend for live browser testing.
"""

import http.server
import json
import os
import socketserver
import time

PORT = 8050
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "frontend")

MOCK_SERVERS = [
    {
        "id": 1,
        "name": "★ CyberZone CS2 | Mirage 24/7 [128 Tick]",
        "game_code": "cs2",
        "game_name": "Counter-Strike 2",
        "address": "198.51.100.10",
        "port": 27015,
        "status": "online",
        "installed": True,
        "blocked": False,
        "connect_url": "steam://connect/198.51.100.10:27015"
    },
    {
        "id": 2,
        "name": "Public Classic CS 1.6 #1 [FastDL | EAC]",
        "game_code": "cstrike",
        "game_name": "Counter-Strike 1.6",
        "address": "198.51.100.10",
        "port": 27016,
        "status": "online",
        "installed": True,
        "blocked": False,
        "connect_url": "steam://connect/198.51.100.10:27016"
    },
    {
        "id": 3,
        "name": "⛏️ Hardcore Survival 1.21 [No-Dupes]",
        "game_code": "minecraft",
        "game_name": "Minecraft",
        "address": "198.51.100.10",
        "port": 25565,
        "status": "online",
        "installed": True,
        "blocked": False,
        "connect_url": ""
    },
    {
        "id": 4,
        "name": "☢️ Rust Max 3 | 2x Gather [Friday Wipe]",
        "game_code": "rust",
        "game_name": "Rust",
        "address": "198.51.100.10",
        "port": 28015,
        "status": "offline",
        "installed": True,
        "blocked": False,
        "connect_url": "steam://connect/198.51.100.10:28015"
    },
    {
        "id": 5,
        "name": "⚡ Team Fortress 2 | Orange & Payload",
        "game_code": "tf2",
        "game_name": "Team Fortress 2",
        "address": "198.51.100.10",
        "port": 27020,
        "status": "online",
        "installed": True,
        "blocked": False,
        "connect_url": "steam://connect/198.51.100.10:27020"
    }
]

class MockMonitoringHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def do_GET(self):
        clean_path = self.path.split("?")[0].rstrip("/")
        
        # Emulate GameAP Plugin API route
        if clean_path == "/plugins/web-monitoring/servers":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            
            online_count = sum(1 for s in MOCK_SERVERS if s["status"] == "online")
            payload = {
                "success": True,
                "total_servers": len(MOCK_SERVERS),
                "online_count": online_count,
                "servers": MOCK_SERVERS,
                "timestamp": int(time.time())
            }
            self.wfile.write(json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8"))
            return

        # Default static file serving from frontend directory
        return super().do_GET()

def run():
    import sys
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    
    print("==================================================")
    print("GameAP WebMonitoring Local Test Server running!")
    print(f"Open in browser: http://localhost:{PORT}")
    print(f"API Endpoint:    http://localhost:{PORT}/plugins/web-monitoring/servers")
    print("==================================================")
    
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), MockMonitoringHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")

if __name__ == "__main__":
    run()
