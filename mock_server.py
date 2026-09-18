#!/usr/bin/env python3
"""
GameAP WebMonitoring Local Test & Preview Server
Emulates GameAP WASM plugin endpoint and serves frontend for live browser testing.
Includes /admin emulator with GameAP Light/Dark theme switcher.
"""

import http.server
import json
import os
import socketserver
import time
import urllib.parse

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

SETTINGS_CACHE = {
    "title": "GameAP Servers",
    "subtitle": "Онлайн мониторинг игровых серверов",
    "theme": "dark",
    "refresh_interval": 15,
    "custom_css": "",
    "custom_header_html": "",
    "hidden_servers": [],
    "cached_servers": MOCK_SERVERS,
    "servers": MOCK_SERVERS,
    "all_servers": MOCK_SERVERS
}

ADMIN_HTML = """<!DOCTYPE html>
<html lang="ru" class="dark">
<head>
  <meta charset="UTF-8">
  <title>GameAP Panel - WebMonitoring Admin Preview</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    /* Simulated GameAP panel base styles & theme tokens */
    :root {
      --gameap-surface: #ffffff;
      --gameap-surface-hover: #f5f5f4;
      --gameap-stone-100: #f5f5f4;
      --gameap-stone-900: #1c1917;
      --gameap-border: #e7e5e4;
      --gameap-border-strong: #d6d3d1;
      --gameap-text: #1c1917;
      --gameap-text-secondary: #57534e;
      --gameap-text-muted: #78716c;
      --gameap-primary: #84cc16;
      --gameap-primary-hover: #65a30d;
      --gameap-primary-soft: #f7fee7;
      --gameap-primary-soft-text: #4d7c0f;
      --gameap-danger: #ef4444;
      --gameap-danger-soft: #fef2f2;
      --gameap-danger-soft-text: #b91c1c;
      --gameap-info: #0ea5e9;
      --gameap-info-hover: #0284c7;
      --gameap-chrome: #1c1917;
    }
    html.dark {
      --gameap-surface: #292524;
      --gameap-surface-hover: #262322;
      --gameap-stone-100: #f5f5f4;
      --gameap-stone-900: #1c1917;
      --gameap-border: #44403c;
      --gameap-border-strong: #57534e;
      --gameap-text: #ffffff;
      --gameap-text-secondary: #d6d3d1;
      --gameap-text-muted: #a8a29e;
      --gameap-primary: #84cc16;
      --gameap-primary-hover: #65a30d;
      --gameap-primary-soft: rgba(132, 204, 22, 0.15);
      --gameap-primary-soft-text: #bef264;
      --gameap-danger: #ef4444;
      --gameap-danger-soft: rgba(239, 68, 68, 0.15);
      --gameap-danger-soft-text: #fca5a5;
      --gameap-info: #0ea5e9;
      --gameap-info-hover: #0284c7;
      --gameap-chrome: #0c0a09;
    }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: var(--gameap-surface-hover);
      color: var(--gameap-text);
      transition: background 0.2s, color 0.2s;
    }
    .gameap-navbar {
      background: var(--gameap-chrome);
      color: #ffffff;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .gameap-logo {
      font-weight: 700;
      font-size: 16px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .theme-toggle-btn {
      background: #84cc16;
      color: #0c0a09;
      border: none;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .theme-toggle-btn:hover {
      background: #a3e635;
    }
  </style>
  <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
</head>
<body>
  <div class="gameap-navbar">
    <div class="gameap-logo">
      <i class="fas fa-gamepad" style="color: #84cc16;"></i>
      <span>GameAP Control Panel [Admin Emulator]</span>
    </div>
    <div>
      <button id="theme-btn" class="theme-toggle-btn" onclick="toggleGameApTheme()">
        <i class="fas fa-adjust"></i> Переключить тему GameAP (Dark / Light)
      </button>
    </div>
  </div>

  <div id="app"></div>

  <script type="module">
    import { webMonitoringPlugin } from '/admin_bundle.js';

    window.toggleGameApTheme = function() {
      const html = document.documentElement;
      if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        html.classList.add('light');
        document.body.style.background = '#f5f5f4';
      } else {
        html.classList.remove('light');
        html.classList.add('dark');
        document.body.style.background = '#1c1917';
      }
    };

    const App = {
      setup() {
        const routeComp = webMonitoringPlugin.routes[0].component;
        return () => Vue.h(routeComp);
      }
    };

    Vue.createApp(App).mount('#app');
  </script>
</body>
</html>
"""

class MockMonitoringHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        clean_path = parsed_url.path.rstrip("/")
        query_str = parsed_url.query
        parsed_query = urllib.parse.parse_qs(query_str)
        action = parsed_query.get("action", [""])[0]

        # DoS / Rate-limit simulation for testing backoff behavior
        if "simulate_busy=1" in query_str:
            self.send_response(503)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Retry-After", "5")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(b'{"error":"plugin is busy (simulated)"}')
            return

        if "simulate_ratelimit=1" in query_str:
            self.send_response(429)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Retry-After", "8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(b'{"error":"too many requests (simulated rate-limit)"}')
            return

        # Serve static assets requested via GameAP plugin prefix /plugins/web-monitoring/
        if clean_path.startswith("/plugins/web-monitoring/"):
            rel_name = clean_path[len("/plugins/web-monitoring/"):].lstrip("/")
            if rel_name and rel_name not in ("servers", "settings", "diagnostic"):
                file_path = os.path.join(FRONTEND_DIR, rel_name)
                if os.path.isfile(file_path):
                    content_type = "application/octet-stream"
                    if rel_name.endswith(".js"):
                        content_type = "application/javascript; charset=utf-8"
                    elif rel_name.endswith(".css"):
                        content_type = "text/css; charset=utf-8"
                    elif rel_name.endswith(".svg"):
                        content_type = "image/svg+xml; charset=utf-8"
                    elif rel_name.endswith(".json"):
                        content_type = "application/json; charset=utf-8"
                    elif rel_name.endswith(".html"):
                        content_type = "text/html; charset=utf-8"

                    with open(file_path, "rb") as f:
                        data = f.read()
                    self.send_response(200)
                    self.send_header("Content-Type", content_type)
                    self.send_header("Cache-Control", "no-cache")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    self.wfile.write(data)
                    return

        # Diagnostic endpoint emulation
        is_diag_route = (
            action == "diagnostic"
            or clean_path in (
                "/diagnostic",
                "/api/plugins/monitoring/diagnostic",
                "/api/plugins/monitorine/diagnostic",
                "/plugins/web-monitoring/diagnostic"
            )
        )

        if is_diag_route:
            client_ip = self.headers.get("X-Gameap-Client-Ip") or self.headers.get("X-Forwarded-For") or self.client_address[0]
            diag = {
                "plugin_id": "monitoring",
                "version": "1.0.5",
                "client_ip": client_ip,
                "trusted_header_detected": bool(self.headers.get("X-Gameap-Client-Ip")),
                "servers_count": len(MOCK_SERVERS),
                "settings": SETTINGS_CACHE
            }
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(diag, ensure_ascii=False, indent=2).encode("utf-8"))
            return

        # Emulate GameAP Plugin API route for servers
        is_servers_route = (
            action == "servers"
            or clean_path in (
                "/plugins/web-monitoring/servers",
                "/api/plugins/monitoring/servers",
                "/api/plugins/monitorine/servers",
                "/api/plugins/bwbwb26fs5eje/servers"
            )
        )

        if is_servers_route:
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
                "all_servers": MOCK_SERVERS,
                "timestamp": int(time.time())
            }
            self.wfile.write(json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8"))
            return

        # Emulate GameAP native API route for servers (/api/servers)
        if clean_path == "/api/servers":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()

            payload = {
                "current_page": 1,
                "data": [
                    {
                        "id": s["id"],
                        "name": s["name"],
                        "game_id": s["game_code"],
                        "server_ip": s["address"],
                        "server_port": s["port"],
                        "process_active": (s["status"] == "online"),
                        "online": (s["status"] == "online"),
                        "installed": 1,
                        "blocked": False,
                        "game": {"name": s["game_name"]},
                        "metadata": {"public_ip": s["address"]}
                    }
                    for s in MOCK_SERVERS
                ],
                "from": 1,
                "last_page": 1,
                "per_page": 100,
                "total": len(MOCK_SERVERS)
            }
            self.wfile.write(json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8"))
            return

        # Emulate GameAP Plugin settings endpoint
        is_settings_route = (
            action == "settings"
            or clean_path in (
                "/api/plugins/monitoring/settings",
                "/api/plugins/monitorine/settings",
                "/api/plugins/bwbwb26fs5eje/settings",
                "/plugins/web-monitoring/settings"
            )
        )

        if is_settings_route:
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(SETTINGS_CACHE, ensure_ascii=False).encode("utf-8"))
            return

        # Emulate GameAP Admin Panel test page
        if clean_path == "/admin":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(ADMIN_HTML.encode("utf-8"))
            return

        # Serve public monitoring page directly at canonical short URL, legacy /view or root
        if clean_path in ("", "/", "/index.html", "/api/plugins/monitoring", "/api/plugins/monitoring/view", "/api/plugins/monitorine", "/api/plugins/monitorine/view"):
            index_file = os.path.join(FRONTEND_DIR, "index.html")
            with open(index_file, "r", encoding="utf-8") as f:
                content = f.read()

            initial_data = {
                "servers": MOCK_SERVERS,
                "version": "1.0.5"
            }
            injection = f"<script>window.INITIAL_DATA = {json.dumps(initial_data, ensure_ascii=False)};</script></head>"
            content = content.replace("</head>", injection)

            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(content.encode("utf-8"))
            return

        # Default static file serving from frontend directory
        return super().do_GET()

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        clean_path = parsed_url.path.rstrip("/")
        query_str = parsed_url.query
        parsed_query = urllib.parse.parse_qs(query_str)
        action = parsed_query.get("action", [""])[0]

        is_settings_route = (
            action == "settings"
            or clean_path in (
                "/api/plugins/monitoring/settings",
                "/api/plugins/monitorine/settings",
                "/api/plugins/bwbwb26fs5eje/settings",
                "/plugins/web-monitoring/settings"
            )
        )

        if is_settings_route:
            content_length = int(self.headers.get("Content-Length", 0))
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode("utf-8"))
                SETTINGS_CACHE.update(data)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "settings": SETTINGS_CACHE}).encode("utf-8"))
                return
            except Exception as e:
                self.send_response(400)
                self.end_headers()
                return

        self.send_response(404)
        self.end_headers()

def run():
    import sys
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    
    print("==================================================")
    print("GameAP WebMonitoring Local Test Server running!")
    print(f"Public Monitoring: http://localhost:{PORT}")
    print(f"Admin Panel View:  http://localhost:{PORT}/admin")
    print(f"API Endpoint:      http://localhost:{PORT}/plugins/web-monitoring/servers")
    print("==================================================")
    
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), MockMonitoringHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")

if __name__ == "__main__":
    run()
