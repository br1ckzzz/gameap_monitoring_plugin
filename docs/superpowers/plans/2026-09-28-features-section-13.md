# Realization of Section 13 Ideas (13.1, 13.3, 13.5, 13.6, 13.7, 13.12) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement six high-priority plugin enhancements (Favorites, Announcement Bar, Server Clusters, Uptime Tracking, Smart Auto-Hide, Click Counter Analytics) with zero performance penalty on GameAP host and verify them via mock server and local build.

**Architecture:**

- Frontend client-side features (Favorites ⭐, Cluster Tabs, Announcement Countdown) in `frontend/app.js` and `frontend/styles.css`.
- Backend WASM plugin features (Uptime calculation, Click counter endpoint, Smart auto-hide filter, announcement & cluster settings) in `rust-plugin/src/`.
- Local emulation and validation in `mock_server.py` and `scripts/test_mock.py`.

**Tech Stack:** Rust (WASM `wasm32-wasip1`), Vanilla JavaScript (ES6+), CSS3, Python 3 (Mock Server & Test Suite).

**Spec:** `f:/GameAP_WebMonitoring/IDEAS.local.md#L464`

## Global Constraints

- Strictly zero UDP load on GameAP host.
- Maintain 100% backward compatibility for existing endpoints (`/servers`, `/view`, `/bot/servers`).
- Keep WASM binary lightweight and cleanly buildable with `cargo build --target wasm32-wasip1 --release`.
- All UI strings localized in Russian and English where appropriate.

## Review Focus

- Browser `localStorage` error handling (incognito mode/quota exceeded).
- Announcement deadline parsing robustness (invalid date/passed date).
- Missing telemetry graceful degradation for uptime and clusters.
- Atomic click counter thread safety and memory bounds.
- Auto-hide logic edge cases (servers with no ping history vs newly stopped servers).

---

### Task 1: 13.1 ⭐ «Избранные серверы» (Favorites / Pin) in LocalStorage

**Files:**

- Modify: `frontend/app.js`
- Modify: `frontend/styles.css`

- [x] Add `loadFavorites()` and `saveFavorites()` helpers with `localStorage` fallback in `frontend/app.js`.
- [x] Add star button (⭐ / ☆) to server card header in `frontend/app.js`.
- [x] Implement sorting logic: pinned favorite servers appear at top, or filtered via "⭐ Избранное" tab/filter.
- [x] Add CSS styling and micro-animations for active/hover star in `frontend/styles.css`.

---

### Task 2: 13.3 📢 Баннер анонсов с таймером обратного отсчёта (Announcement Bar)

**Files:**

- Modify: `rust-plugin/src/settings.rs`
- Modify: `frontend/app.js`
- Modify: `frontend/styles.css`
- Modify: `frontend/admin_bundle.js`

- [x] Add announcement settings fields: `announcement_enabled`, `announcement_text`, `announcement_link`, `announcement_type` (`info`, `warning`, `success`), `announcement_deadline` to `PluginSettings` in `rust-plugin/src/settings.rs`.
- [x] Expose announcement payload in public settings response.
- [x] Render responsive announcement bar with live countdown ticker (`01д 04ч 23м 10с`) above server list in `frontend/app.js`.
- [x] Style announcement banner for info/warning/success themes in `frontend/styles.css`.
- [x] Add admin settings inputs for announcement bar in `frontend/admin_bundle.js`.

---

### Task 3: 13.5 🗂️ Группировка серверов по категориям / кластерам (Clusters / Hubs)

**Files:**

- Modify: `rust-plugin/src/settings.rs`
- Modify: `rust-plugin/src/handlers.rs`
- Modify: `frontend/app.js`
- Modify: `frontend/styles.css`
- Modify: `frontend/admin_bundle.js`

- [x] Add `server_categories: HashMap<u32, String>` (or list of clusters) to `PluginSettings`.
- [x] Inject category tag into `/servers` JSON payload for each server in `rust-plugin/src/handlers.rs`.
- [x] Render category tabs / pill buttons in `frontend/app.js` for quick switching between server clusters.
- [x] Add category management fields in `frontend/admin_bundle.js`.

---

### Task 4: 13.7 🧹 Интеллектуальное авто-скрытие офлайн-серверов (Smart Auto-Hide)

**Files:**

- Modify: `rust-plugin/src/settings.rs`
- Modify: `rust-plugin/src/handlers.rs`
- Modify: `frontend/app.js`

- [x] Add `auto_hide_offline: bool` and `auto_hide_offline_minutes: u32` in `PluginSettings`.
- [x] Implement filtering in `handlers.rs`: exclude offline servers if auto-hide is enabled and threshold met (or tag them `is_hidden`).
- [x] Add frontend toggle button: "Показать скрытые офлайн-серверы (N)" in `frontend/app.js`.

---

### Task 5: 13.6 ⏱️ Uptime и Downtime трекер по событиям GameAP (`Event`)

**Files:**

- Modify: `rust-plugin/src/types.rs`
- Modify: `rust-plugin/src/handlers.rs`
- Modify: `frontend/app.js`
- Modify: `mock_server.py`

- [x] Add `uptime_seconds: Option<u64>` and `last_status_change: Option<String>` to server DTO in `types.rs`.
- [x] Compute uptime formatting in `frontend/app.js` (e.g. `⏱️ Uptime: 14д 06ч`).
- [x] Add mock support in `mock_server.py` for uptime fields and status change simulation.

---

### Task 6: 13.12 📊 Внутренняя анонимная аналитика кликов (Click Counter)

**Files:**

- Modify: `rust-plugin/src/handlers.rs`
- Modify: `frontend/app.js`
- Modify: `frontend/admin_bundle.js`
- Modify: `mock_server.py`

- [x] Add atomic in-memory click map `CLICK_COUNTERS: Mutex<HashMap<u32, u64>>` in `rust-plugin/src/handlers.rs`.
- [x] Implement `POST /api/plugins/monitoring/stats/click?server_id=X` endpoint in `handlers.rs`.
- [x] Implement `GET /api/plugins/monitoring/stats` (admin-only) to return click counts per server.
- [x] Send click beacon in `frontend/app.js` upon clicking "Connect" or "Copy IP".
- [x] Display click statistics table in `frontend/admin_bundle.js`.
- [x] Add mock handler in `mock_server.py`.

---

### Task 7: 🧪 Тестирование и локальная сборка WASM

**Files:**

- Modify: `scripts/test_mock.py`
- Modify: `mock_server.py`
- Build artifacts: `web_monitoring.wasm`

- [x] Update `mock_server.py` with mock data for announcement, clusters, uptime, and click endpoints.
- [x] Add comprehensive automated assertions in `scripts/test_mock.py` testing all new endpoints.
- [x] Run `python scripts/test_mock.py` to verify backend and frontend compatibility.
- [x] Compile Rust WASM binary via `cargo build --target wasm32-wasip1 --release`.
