import json
import os
import re
import shutil
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

GAMES_JSON_PATHS = [
    r"f:\GameAP_WebMonitoring\frontend\games.json",
    r"f:\GameAP_WebMonitoring\rust-plugin\assets\games.json",
    r"f:\GameAP_WebMonBot\internal\catalog\games.json",
    r"f:\GameAP_WebMonBot\assets\games.json",
]

APP_JS_PATHS = [
    r"f:\GameAP_WebMonitoring\frontend\app.js",
    r"f:\GameAP_WebMonitoring\rust-plugin\assets\app.js",
]

STUB_BANNER = "https://raw.githubusercontent.com/br1ckzzz/gameap_monitoring_plugin/main/icon.png?v=1.0.0"

# Games with verified real Steam App IDs and tested working banners
UPDATES = {
    "svencoop": {"steam_appid": 225840, "banner": "https://cdn.cloudflare.steamstatic.com/steam/apps/225840/header.jpg"},
    "dayofdragons": {"steam_appid": 1088090, "banner": "https://cdn.cloudflare.steamstatic.com/steam/apps/1088090/header.jpg"},
    "front": {"steam_appid": 2285150, "banner": "https://cdn.cloudflare.steamstatic.com/steam/apps/2285150/header.jpg"},
    "had2": {"steam_appid": 703320, "banner": "https://cdn.cloudflare.steamstatic.com/steam/apps/703320/header.jpg"},
    "humanitz": {"steam_appid": 1766060, "banner": "https://cdn.cloudflare.steamstatic.com/steam/apps/1766060/header.jpg"},
    "iosoccer": {"steam_appid": 673560, "banner": "https://cdn.cloudflare.steamstatic.com/steam/apps/673560/header.jpg"},
    "jbep3": {"steam_appid": 869480, "banner": "https://cdn.cloudflare.steamstatic.com/steam/apps/869480/header.jpg"},
    "jc3mp": {"steam_appid": 619910, "banner": "https://cdn.cloudflare.steamstatic.com/steam/apps/619910/header.jpg"},
    "kzmod": {"steam_appid": 626680, "banner": "https://cdn.cloudflare.steamstatic.com/steam/apps/626680/header.jpg"},
    "moh2010": {"steam_appid": 47790, "banner": "https://cdn.cloudflare.steamstatic.com/steam/apps/47790/header.jpg"},
    "mordhau": {"steam_appid": 629760, "banner": "https://cdn.cloudflare.steamstatic.com/steam/apps/629760/header.jpg"},
    "nos": {"steam_appid": 1963370, "banner": "https://cdn.cloudflare.steamstatic.com/steam/apps/1963370/header.jpg"},
    "notd": {"steam_appid": 1377380, "banner": "https://cdn.cloudflare.steamstatic.com/steam/apps/1377380/header.jpg"},
    "operationharsh": {"steam_appid": 736590, "banner": "https://cdn.cloudflare.steamstatic.com/steam/apps/736590/header.jpg"},
    "quake4": {"steam_appid": 2210, "banner": "https://cdn.cloudflare.steamstatic.com/steam/apps/2210/header.jpg"},
    "shogo": {"steam_appid": 610860, "banner": "https://cdn.cloudflare.steamstatic.com/steam/apps/610860/header.jpg"},
    "toxikk_lan": {"steam_appid": 324810, "banner": "https://cdn.cloudflare.steamstatic.com/steam/apps/324810/header.jpg"},
    "tmnf": {"steam_appid": 11020, "banner": "https://cdn.cloudflare.steamstatic.com/steam/apps/11020/header.jpg"},
    "7d2d": {"steam_appid": 251570, "banner": "https://cdn.cloudflare.steamstatic.com/steam/apps/251570/header.jpg"},
    "bf3": {"steam_appid": 1238820, "banner": "https://cdn.cloudflare.steamstatic.com/steam/apps/1238820/header.jpg"},
    "halo2": {"steam_appid": 1064270, "banner": "https://cdn.cloudflare.steamstatic.com/steam/apps/1064270/header.jpg"},
    "samp": {"steam_appid": 12120, "banner": "https://cdn.cloudflare.steamstatic.com/steam/apps/12120/header.jpg"},
    "mtasa": {"steam_appid": 12120, "banner": "https://cdn.cloudflare.steamstatic.com/steam/apps/12120/header.jpg"},
    "ut2004": {"steam_appid": 13230, "banner": "https://cdn.cloudflare.steamstatic.com/steam/apps/13230/header.jpg"},
    "r6ravenshield": {"steam_appid": 19830, "banner": "https://cdn.cloudflare.steamstatic.com/steam/apps/19830/header.jpg"},
}

# Games with missing/broken images or delisted from Steam -> set stub placeholder and remove invalid steam_appid
STUB_GAMES = ["ges", "breach", "etqw", "exfil", "redline", "rune"]

def apply_games_json():
    with open(GAMES_JSON_PATHS[0], "r", encoding="utf-8") as f:
        data = json.load(f)

    modified_count = 0
    for g in data["games"]:
        gid = g["id"]
        if gid in UPDATES:
            g["steam_appid"] = UPDATES[gid]["steam_appid"]
            g["banner"] = UPDATES[gid]["banner"]
            modified_count += 1
            print(f"  [UPDATED] {gid} -> AppID {g['steam_appid']}, Banner: {g['banner']}")
        elif gid in STUB_GAMES:
            if "steam_appid" in g:
                del g["steam_appid"]
            g["banner"] = STUB_BANNER
            modified_count += 1
            print(f"  [STUBBED] {gid} -> Banner set to stub placeholder, steam_appid removed")

    # Save to all games.json targets
    for p in GAMES_JSON_PATHS:
        if os.path.exists(os.path.dirname(p)):
            with open(p, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"Saved {modified_count} game updates to {p}")

def apply_app_js():
    for p in APP_JS_PATHS:
        if not os.path.exists(p):
            continue
        with open(p, "r", encoding="utf-8") as f:
            content = f.read()

        # Fix svencoop AppID in STEAM_APP_MAP
        new_content = re.sub(r"svencoop:\s*225300,", "svencoop: 225840,", content)
        if new_content != content:
            with open(p, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"Updated STEAM_APP_MAP in {p}")

def verify_all_banners():
    with open(GAMES_JSON_PATHS[0], "r", encoding="utf-8") as f:
        data = json.load(f)

    games = data["games"]
    print(f"\nVerifying all {len(games)} banners across the entire catalog...")

    def check(g):
        url = g.get("banner", "")
        if not url:
            return (g["id"], "NO_URL")
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=6) as resp:
                return (g["id"], resp.getcode())
        except urllib.error.HTTPError as e:
            return (g["id"], f"HTTP_{e.code}")
        except Exception as e:
            return (g["id"], f"ERR_{type(e).__name__}")

    with ThreadPoolExecutor(max_workers=20) as ex:
        results = list(ex.map(check, games))

    failed = [r for r in results if r[1] != 200]
    print(f"Banner verification results: {len(results)-len(failed)}/{len(results)} passed.")
    if failed:
        print("FAILURES:")
        for f in failed:
            print("  ", f)
    else:
        print("SUCCESS: 100% of game banners returned HTTP 200 OK!")

if __name__ == "__main__":
    print("--- STEP 1: Updating games.json ---")
    apply_games_json()
    print("\n--- STEP 2: Updating app.js STEAM_APP_MAP ---")
    apply_app_js()
    print("\n--- STEP 3: Verifying all banners ---")
    verify_all_banners()
