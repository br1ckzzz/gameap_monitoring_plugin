//! HTTP route handlers for public monitoring and administrative endpoints.

use crate::assets::INDEX_HTML;
use crate::proto::HttpRequest;
use crate::servers_client::{
    fetch_all_nodes, fetch_all_servers, fetch_public_servers_with_opt, invalidate_public_cache,
};
use crate::service::PLUGIN_VERSION;
use crate::settings::{get_settings, save_settings};
use crate::types::{MonitoringResponse, PluginSettings, PublicServerDTO};
use serde::Serialize;
use std::collections::HashMap;

pub struct HTTPResponseData {
    pub status_code: i32,
    pub content_type: &'static str,
    pub body: Vec<u8>,
    pub etag: Option<String>,
    pub cache_control: Option<&'static str>,
}

fn compute_etag(body: &[u8]) -> String {
    let mut hash: u64 = 0xcbf29ce484222325;
    for &byte in body {
        hash ^= byte as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    format!("\"wm-{:x}-{:x}\"", body.len(), hash)
}

fn etag_matches(if_none_match: &str, etag: &str) -> bool {
    let raw_req = if_none_match
        .trim()
        .trim_start_matches("W/")
        .trim_matches('"');
    let raw_etag = etag.trim().trim_start_matches("W/").trim_matches('"');
    raw_req == "*" || raw_req == raw_etag
}

#[derive(Serialize)]
struct AdminSettingsResponse {
    pub version: &'static str,
    pub title: String,
    pub subtitle: String,
    pub theme: String,
    pub refresh_interval: u32,
    pub custom_css: String,
    pub custom_header_html: String,
    pub hidden_servers: Vec<u64>,
    pub cached_servers: Vec<PublicServerDTO>,
    pub address_key: String,
    pub server_address_overrides: HashMap<u64, String>,
    pub server_order: Vec<u64>,
    pub logo_url: String,
    pub favicon_url: String,
    pub bot_api_enabled: bool,
    pub bot_api_token: String,
    pub announcement_enabled: bool,
    pub announcement_text: String,
    pub announcement_link: String,
    pub announcement_type: String,
    pub announcement_deadline: String,
    pub server_categories: HashMap<u64, String>,
    pub auto_hide_offline: bool,
    pub auto_hide_offline_minutes: u32,
    pub click_stats: HashMap<u64, u64>,
    pub open_sections: HashMap<String, bool>,
    pub promo: crate::types::PromoConfig,
    pub storage_status: crate::types::StorageDiagnostics,
    pub servers: Vec<PublicServerDTO>,
    pub all_servers: Vec<PublicServerDTO>,
}

fn get_header_ignore_case<'a>(
    headers: &'a HashMap<String, String>,
    key: &str,
) -> Option<&'a String> {
    headers.iter().find_map(|(k, v)| {
        if k.eq_ignore_ascii_case(key) {
            Some(v)
        } else {
            None
        }
    })
}

fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut diff: u8 = 0;
    for (&x, &y) in a.iter().zip(b.iter()) {
        diff |= x ^ y;
    }
    diff == 0
}

fn verify_bot_token(settings: &PluginSettings, provided: Option<&str>) -> bool {
    if !settings.bot_api_enabled || settings.bot_api_token.is_empty() {
        return false;
    }
    match provided {
        Some(token) => constant_time_eq(token.as_bytes(), settings.bot_api_token.as_bytes()),
        None => false,
    }
}

fn require_admin(req: &HttpRequest) -> Option<HTTPResponseData> {
    let Some(ref ctx) = req.context else {
        return Some(HTTPResponseData {
            status_code: 401,
            content_type: "application/json; charset=utf-8",
            body: br#"{"success":false,"error":"Unauthorized: admin authentication required"}"#
                .to_vec(),
            etag: None,
            cache_control: None,
        });
    };

    if ctx.user_id.unwrap_or(0) == 0 {
        return Some(HTTPResponseData {
            status_code: 401,
            content_type: "application/json; charset=utf-8",
            body: br#"{"success":false,"error":"Unauthorized: authenticated user required"}"#
                .to_vec(),
            etag: None,
            cache_control: None,
        });
    }

    if !ctx.permissions.is_empty()
        && !ctx.permissions.iter().any(|p| {
            p.eq_ignore_ascii_case("admin") || p == "*" || p.eq_ignore_ascii_case("admin_only")
        })
    {
        return Some(HTTPResponseData {
            status_code: 403,
            content_type: "application/json; charset=utf-8",
            body: br#"{"success":false,"error":"Forbidden: admin permissions required"}"#.to_vec(),
            etag: None,
            cache_control: None,
        });
    }

    None
}

fn mask_token(token: &str) -> String {
    if token.is_empty() {
        String::new()
    } else {
        "***".to_string()
    }
}

fn extract_auth_token(req: &HttpRequest) -> Option<String> {
    if let Some(token) = get_header_ignore_case(&req.headers, "X-WebMon-Token")
        .or_else(|| get_header_ignore_case(&req.headers, "X-Api-Token"))
    {
        let trimmed = token.trim();
        if !trimmed.is_empty() {
            return Some(trimmed.to_string());
        }
    }
    if let Some(auth) = get_header_ignore_case(&req.headers, "Authorization") {
        if let Some(stripped) = auth.strip_prefix("Bearer ") {
            let trimmed = stripped.trim();
            if !trimmed.is_empty() {
                return Some(trimmed.to_string());
            }
        }
    }
    if let Some(vals) = req.query_params.get("token") {
        if let Some(first) = vals.values.first() {
            let trimmed = first.trim();
            if !trimmed.is_empty() {
                return Some(trimmed.to_string());
            }
        }
    }
    if let Some(vals) = req.query_params.get("api_token") {
        if let Some(first) = vals.values.first() {
            let trimmed = first.trim();
            if !trimmed.is_empty() {
                return Some(trimmed.to_string());
            }
        }
    }
    None
}

/// Dispatches HTTP requests matching Go's `HandleHTTPRequest` router.
pub fn handle_http_request(req: &HttpRequest) -> HTTPResponseData {
    let path = req.path.trim_end_matches('/');

    // Global query parameter action dispatch (regardless of base path)
    if let Some(action_vals) = req.query_params.get("action") {
        if let Some(action) = action_vals.values.first() {
            match action.as_str() {
                "query-update" | "query_update" => return handle_query_update(req),
                "servers" | "admin_servers" | "all_servers" => return handle_servers(req),
                "settings" => return handle_settings(req),
                "diagnostic" => return handle_diagnostic(req),
                "click" | "stats/click" => return handle_click(req),
                "stats" => return handle_stats(req),
                "games" | "games.json" => return handle_games_json(),
                "view" => return handle_view(),
                _ => {}
            }
        }
    }

    // Path suffix matching to support arbitrary GameAP mount prefixes
    if path == "/servers/query-update"
        || path.ends_with("/servers/query-update")
        || path.ends_with("/query-update")
        || path.contains("query-update")
    {
        return handle_query_update(req);
    }
    if path == "/stats/click" || path.ends_with("/stats/click") {
        return handle_click(req);
    }
    if path == "/stats" || path.ends_with("/stats") {
        return handle_stats(req);
    }
    if path == "/settings" || path.ends_with("/settings") {
        return handle_settings(req);
    }
    if path == "/servers"
        || path.ends_with("/servers")
        || path.ends_with("/api/servers")
        || path.ends_with("/bot/servers")
    {
        if req.method.eq_ignore_ascii_case("POST") {
            return handle_query_update(req);
        }
        return handle_servers(req);
    }
    if path == "/view" || path.ends_with("/view") {
        return handle_view();
    }
    if path == "/diagnostic" || path.ends_with("/diagnostic") {
        return handle_diagnostic(req);
    }
    if path == "/icon.png" || path.ends_with("/icon.png") {
        return HTTPResponseData {
            status_code: 200,
            content_type: "image/png",
            body: crate::assets::ICON_PNG.to_vec(),
            etag: None,
            cache_control: Some("public, max-age=86400"),
        };
    }
    if path == "/games"
        || path.ends_with("/games")
        || path == "/games.json"
        || path.ends_with("/games.json")
    {
        return handle_games_json();
    }

    // Handle root path routing
    if path.is_empty() || path == "/" {
        if req.method.eq_ignore_ascii_case("POST") {
            // Check if body is telemetry query update:
            if let Ok(json) = serde_json::from_slice::<serde_json::Value>(&req.body) {
                if json.get("servers").map(|v| v.is_object()).unwrap_or(false)
                    && json.get("theme").is_none()
                    && json.get("refresh_interval").is_none()
                {
                    return handle_query_update(req);
                }
            }
            return handle_settings(req);
        }

        let is_json = get_header_ignore_case(&req.headers, "Accept")
            .map(|a| a.contains("application/json") && !a.contains("text/html"))
            .unwrap_or(false);
        let has_token = extract_auth_token(req).is_some();
        let is_bot_ua = get_header_ignore_case(&req.headers, "User-Agent")
            .map(|ua| ua.contains("Bot") || ua.contains("bot") || ua.contains("WebMon"))
            .unwrap_or(false);

        if is_json || has_token || is_bot_ua {
            return handle_servers(req);
        }

        return handle_view();
    }

    HTTPResponseData {
        status_code: 404,
        content_type: "application/json",
        body: br#"{"error":"not found"}"#.to_vec(),
        etag: None,
        cache_control: None,
    }
}

/// Helper to flexibly parse incoming telemetry payload (supports map, array, top-level objects).
fn parse_telemetry_payload(body: &[u8]) -> Result<crate::types::QueryTelemetryPayload, String> {
    let root: serde_json::Value = serde_json::from_slice(body).map_err(|e| e.to_string())?;
    let mut servers_map = std::collections::HashMap::new();

    let parse_server_entry = |val: &serde_json::Value| -> Option<crate::types::ServerTelemetryDTO> {
        serde_json::from_value::<crate::types::ServerTelemetryDTO>(val.clone()).ok()
    };

    if let Some(servers_val) = root.get("servers") {
        if let Some(obj) = servers_val.as_object() {
            for (k, v) in obj {
                if let Ok(id) = k.parse::<u64>() {
                    if let Some(dto) = parse_server_entry(v) {
                        servers_map.insert(id, dto);
                    }
                }
            }
        } else if let Some(arr) = servers_val.as_array() {
            for item in arr {
                let id_opt = item.get("id").and_then(|v| {
                    v.as_u64()
                        .or_else(|| v.as_str().and_then(|s| s.parse::<u64>().ok()))
                });
                if let Some(id) = id_opt {
                    if let Some(dto) = parse_server_entry(item) {
                        servers_map.insert(id, dto);
                    }
                }
            }
        }
    } else if let Some(arr) = root.as_array() {
        for item in arr {
            let id_opt = item.get("id").and_then(|v| {
                v.as_u64()
                    .or_else(|| v.as_str().and_then(|s| s.parse::<u64>().ok()))
            });
            if let Some(id) = id_opt {
                if let Some(dto) = parse_server_entry(item) {
                    servers_map.insert(id, dto);
                }
            }
        }
    } else if let Some(obj) = root.as_object() {
        for (k, v) in obj {
            if let Ok(id) = k.parse::<u64>() {
                if let Some(dto) = parse_server_entry(v) {
                    servers_map.insert(id, dto);
                }
            }
        }
    }

    if servers_map.is_empty() && !root.is_null() {
        if let Ok(p) = serde_json::from_slice::<crate::types::QueryTelemetryPayload>(body) {
            return Ok(p);
        }
    }

    Ok(crate::types::QueryTelemetryPayload {
        servers: servers_map,
    })
}

/// Ingests live telemetry from companion bot or external query daemon.
fn handle_query_update(req: &HttpRequest) -> HTTPResponseData {
    let settings = get_settings();
    if !settings.bot_api_enabled || settings.bot_api_token.is_empty() {
        return HTTPResponseData {
            status_code: 403,
            content_type: "application/json; charset=utf-8",
            body: br#"{"success":false,"error":"Bot API is disabled or not configured"}"#.to_vec(),
            etag: None,
            cache_control: None,
        };
    }

    let provided_token = extract_auth_token(req);
    if !verify_bot_token(&settings, provided_token.as_deref()) {
        return HTTPResponseData {
            status_code: 401,
            content_type: "application/json; charset=utf-8",
            body: br#"{"success":false,"error":"Unauthorized: invalid or missing Bot API token"}"#
                .to_vec(),
            etag: None,
            cache_control: None,
        };
    }

    match parse_telemetry_payload(&req.body) {
        Ok(payload) => {
            let count = crate::servers_client::update_live_telemetry(payload);
            let resp_json = format!("{{\"success\":true,\"updated_servers\":{}}}", count);
            HTTPResponseData {
                status_code: 200,
                content_type: "application/json; charset=utf-8",
                body: resp_json.into_bytes(),
                etag: None,
                cache_control: None,
            }
        }
        Err(e) => {
            let err_json = serde_json::json!({
                "success": false,
                "error": format!("Invalid telemetry JSON: {}", e),
            });
            HTTPResponseData {
                status_code: 400,
                content_type: "application/json; charset=utf-8",
                body: serde_json::to_vec(&err_json).unwrap_or_default(),
                etag: None,
                cache_control: None,
            }
        }
    }
}

/// Serves public server list with Anti-DoS micro-cache or all servers for admin / bot API.
fn handle_servers(req: &HttpRequest) -> HTTPResponseData {
    let settings = get_settings();
    let path = req.path.trim_end_matches('/');
    let is_explicit_bot_endpoint = path.ends_with("/api/servers") || path.ends_with("/bot/servers");
    let provided_token = extract_auth_token(req);

    // Validate bot API authentication if requested on explicit bot endpoints or with token
    let token_matches = verify_bot_token(&settings, provided_token.as_deref());

    if is_explicit_bot_endpoint {
        if !settings.bot_api_enabled || settings.bot_api_token.is_empty() {
            return HTTPResponseData {
                status_code: 403,
                content_type: "application/json; charset=utf-8",
                body: br#"{"success":false,"error":"Bot API is disabled or not configured"}"#
                    .to_vec(),
                etag: None,
                cache_control: None,
            };
        }
        if !token_matches {
            return HTTPResponseData {
                status_code: 401,
                content_type: "application/json; charset=utf-8",
                body:
                    br#"{"success":false,"error":"Unauthorized: invalid or missing Bot API token"}"#
                        .to_vec(),
                etag: None,
                cache_control: None,
            };
        }
    } else if let Some(ref token) = provided_token {
        // On generic /servers or root endpoints, reject only if a token was configured and provided token doesn't match
        if !settings.bot_api_token.is_empty()
            && !constant_time_eq(token.as_bytes(), settings.bot_api_token.as_bytes())
        {
            return HTTPResponseData {
                status_code: 401,
                content_type: "application/json; charset=utf-8",
                body: br#"{"success":false,"error":"Unauthorized: invalid Bot API token"}"#
                    .to_vec(),
                etag: None,
                cache_control: None,
            };
        }
    }

    let show_all = token_matches || require_admin(req).is_none();

    let force_refresh = req.query_params.get("refresh").is_some()
        || req.query_params.get("nocache").is_some()
        || req.query_params.get("_t").is_some();

    if show_all {
        if force_refresh {
            invalidate_public_cache();
        }
        let all_servers = fetch_all_servers();
        let online_count = all_servers.iter().filter(|s| s.status == "online").count();
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        let announcement =
            if settings.announcement_enabled && !settings.announcement_text.is_empty() {
                Some(crate::types::AnnouncementDTO {
                    text: settings.announcement_text.clone(),
                    link: if settings.announcement_link.is_empty() {
                        None
                    } else {
                        Some(settings.announcement_link.clone())
                    },
                    banner_type: settings.announcement_type.clone(),
                    deadline: if settings.announcement_deadline.is_empty() {
                        None
                    } else {
                        Some(settings.announcement_deadline.clone())
                    },
                })
            } else {
                None
            };
        let promo = if settings.promo.enabled {
            Some(settings.promo.clone())
        } else {
            None
        };
        let resp = MonitoringResponse {
            success: true,
            total_servers: all_servers.len(),
            online_count,
            servers: all_servers,
            nodes: fetch_all_nodes(),
            timestamp: now as i64,
            refresh_interval: settings.refresh_interval,
            announcement,
            promo,
        };
        let body = serde_json::to_vec(&resp).unwrap_or_default();
        let etag = compute_etag(&body);
        if !force_refresh {
            if let Some(inm) = get_header_ignore_case(&req.headers, "If-None-Match") {
                if etag_matches(inm, &etag) {
                    return HTTPResponseData {
                        status_code: 304,
                        content_type: "application/json; charset=utf-8",
                        body: Vec::new(),
                        etag: Some(etag),
                        cache_control: Some("no-cache"),
                    };
                }
            }
        }
        return HTTPResponseData {
            status_code: 200,
            content_type: "application/json; charset=utf-8",
            body,
            etag: Some(etag),
            cache_control: Some("no-cache"),
        };
    }

    let body = fetch_public_servers_with_opt(force_refresh);
    let etag = compute_etag(&body);
    if !force_refresh {
        if let Some(inm) = get_header_ignore_case(&req.headers, "If-None-Match") {
            if etag_matches(inm, &etag) {
                return HTTPResponseData {
                    status_code: 304,
                    content_type: "application/json; charset=utf-8",
                    body: Vec::new(),
                    etag: Some(etag),
                    cache_control: Some("public, max-age=3, stale-while-revalidate=10"),
                };
            }
        }
    }

    HTTPResponseData {
        status_code: 200,
        content_type: "application/json; charset=utf-8",
        body,
        etag: Some(etag),
        cache_control: Some("public, max-age=3, stale-while-revalidate=10"),
    }
}

fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

fn escape_json_for_script(json: &str) -> String {
    json.replace('<', r"\u003c").replace('>', r"\u003e")
}

fn escape_css_for_style(css: &str) -> String {
    let lower = css.to_ascii_lowercase();
    let needle = "</style";
    let mut out = String::with_capacity(css.len());
    let mut last = 0;
    while let Some(rel_idx) = lower[last..].find(needle) {
        let idx = last + rel_idx;
        out.push_str(&css[last..idx]);
        out.push_str(r"\3c /style");
        last = idx + needle.len();
    }
    out.push_str(&css[last..]);
    out
}

/// Serves public HTML page with instant preload and administrative customizations.
fn handle_view() -> HTTPResponseData {
    let settings = get_settings();
    let mut page_content = String::from_utf8_lossy(INDEX_HTML).to_string();

    let v_tag = format!("v{}", PLUGIN_VERSION);
    let q_ver = format!("?v={}", PLUGIN_VERSION);
    page_content = page_content.replace("?v=1.1.0", &q_ver);
    for old_v in [
        "v1.0.0", "v1.0.9", "v1.0.10", "v1.0.11", "v1.0.12", "v1.1.0",
    ] {
        page_content = page_content.replacen(old_v, &v_tag, 1);
    }
    page_content = page_content.replacen(">15с<", &format!(">{}с<", settings.refresh_interval), 1);
    page_content = page_content.replacen(">15s<", &format!(">{}s<", settings.refresh_interval), 1);

    if settings.theme == "light" {
        page_content = page_content.replacen(
            "<html lang=\"ru\">",
            "<html lang=\"ru\" data-theme=\"light\">",
            1,
        );
    } else if settings.theme == "modern" {
        page_content = page_content.replacen(
            "<html lang=\"ru\">",
            "<html lang=\"ru\" data-theme-style=\"modern\">",
            1,
        );
    }

    if !settings.title.is_empty() {
        let escaped = html_escape(&settings.title);
        page_content = page_content.replacen(
            "<title>GameAP | Servers Monitoring</title>",
            &format!("<title>{} | GameAP</title>", escaped),
            1,
        );
        page_content = page_content.replacen(
            "<title>Мониторинг игровых серверов | GameAP</title>",
            &format!("<title>{} | GameAP</title>", escaped),
            1,
        );
        page_content =
            page_content.replacen(">GameAP Servers</h1>", &format!(">{}</h1>", escaped), 1);
    }

    if !settings.subtitle.is_empty() {
        let escaped = html_escape(&settings.subtitle);
        page_content = page_content.replacen(
            ">Онлайн мониторинг игровых серверов</p>",
            &format!(">{}</p>", escaped),
            1,
        );
    }

    if !settings.custom_css.is_empty() {
        let safe_css = escape_css_for_style(&settings.custom_css);
        let tag = format!(
            "<style id=\"admin-custom-css\">\n{}\n</style>\n</head>",
            safe_css
        );
        page_content = page_content.replacen("</head>", &tag, 1);
    }

    if let Some(ref favicon) = settings.favicon_url {
        if !favicon.is_empty() {
            let tag = format!(
                "<link rel=\"icon\" href=\"{}\">\n</head>",
                html_escape(favicon)
            );
            page_content = page_content.replacen("</head>", &tag, 1);
        }
    }

    if let Some(ref logo) = settings.logo_url {
        if !logo.is_empty() {
            let tag = format!(
                "<img src=\"{}\" alt=\"Logo\" class=\"brand-logo\">",
                html_escape(logo)
            );
            page_content = page_content.replacen("<div class=\"brand-icon\">🎮</div>", &tag, 1);
        }
    }

    // Preload servers and configuration into HTML for instant 0ms first render (no spinner)
    let pub_bytes = fetch_public_servers_with_opt(false);
    let mut initial_data = if !pub_bytes.is_empty() {
        serde_json::from_slice::<serde_json::Value>(&pub_bytes)
            .unwrap_or_else(|_| serde_json::json!({ "servers": [] }))
    } else {
        serde_json::json!({ "servers": [] })
    };

    if let Some(obj) = initial_data.as_object_mut() {
        obj.insert("version".to_string(), serde_json::json!(PLUGIN_VERSION));
        obj.insert(
            "repo_url".to_string(),
            serde_json::json!(crate::service::PLUGIN_REPO_URL),
        );
        obj.insert(
            "refresh_interval".to_string(),
            serde_json::json!(settings.refresh_interval),
        );
        obj.insert("theme".to_string(), serde_json::json!(settings.theme));
        if !settings.title.is_empty() {
            obj.insert("title".to_string(), serde_json::json!(settings.title));
        }
        if !settings.subtitle.is_empty() {
            obj.insert("subtitle".to_string(), serde_json::json!(settings.subtitle));
        }
        if let Some(ref logo) = settings.logo_url {
            obj.insert("logo_url".to_string(), serde_json::json!(logo));
        }
        if let Some(ref fav) = settings.favicon_url {
            obj.insert("favicon_url".to_string(), serde_json::json!(fav));
        }
        if settings.promo.enabled {
            if let Ok(pv) = serde_json::to_value(&settings.promo) {
                obj.insert("promo".to_string(), pv);
            }
        } else {
            obj.insert("promo".to_string(), serde_json::Value::Null);
        }
        if settings.announcement_enabled && !settings.announcement_text.is_empty() {
            obj.insert("announcement".to_string(), serde_json::json!({
                "text": settings.announcement_text,
                "link": if settings.announcement_link.is_empty() { None } else { Some(settings.announcement_link.clone()) },
                "banner_type": settings.announcement_type,
                "deadline": if settings.announcement_deadline.is_empty() { None } else { Some(settings.announcement_deadline.clone()) }
            }));
        } else {
            obj.insert("announcement".to_string(), serde_json::Value::Null);
        }
    }
    if let Ok(initial_json) = serde_json::to_string(&initial_data) {
        let safe_json = escape_json_for_script(&initial_json);
        let preloaded = format!(
            "<script>window.INITIAL_DATA = {};</script>\n</head>",
            safe_json
        );
        page_content = page_content.replacen("</head>", &preloaded, 1);
    }

    if !settings.custom_header_html.is_empty() {
        page_content =
            page_content.replacen("<!-- CUSTOM_HEADER -->", &settings.custom_header_html, 1);
    }

    HTTPResponseData {
        status_code: 200,
        content_type: "text/html; charset=utf-8",
        body: page_content.into_bytes(),
        etag: None,
        cache_control: None,
    }
}

/// Administrative settings handler (GET and POST).
fn handle_settings(req: &HttpRequest) -> HTTPResponseData {
    if let Some(err_resp) = require_admin(req) {
        return err_resp;
    }

    if req.method.eq_ignore_ascii_case("POST") {
        if let Ok(val) = serde_json::from_slice::<serde_json::Value>(&req.body) {
            // Safety guard: if this payload is telemetry, route to handle_query_update
            if val.get("servers").map(|v| v.is_object()).unwrap_or(false)
                && val.get("theme").is_none()
                && val.get("refresh_interval").is_none()
            {
                return handle_query_update(req);
            }

            // Ensure this payload actually contains settings keys to prevent wiping settings
            let has_settings_keys = val.get("title").is_some()
                || val.get("theme").is_some()
                || val.get("refresh_interval").is_some()
                || val.get("bot_api_token").is_some()
                || val.get("bot_api_enabled").is_some()
                || val.get("announcement_text").is_some()
                || val.get("promo").is_some();

            if !has_settings_keys {
                return HTTPResponseData {
                    status_code: 400,
                    content_type: "application/json",
                    body: br#"{"success":false,"error":"Invalid settings JSON: missing settings keys"}"#.to_vec(),
                    etag: None,
                    cache_control: None,
                };
            }

            if let Ok(new_settings) = serde_json::from_value::<PluginSettings>(val) {
                let (db_saved, err_msg) = save_settings(new_settings);
                invalidate_public_cache();
                let resp_json = serde_json::json!({
                    "success": db_saved,
                    "db_saved": db_saved,
                    "error": err_msg
                });
                let body = serde_json::to_vec(&resp_json)
                    .unwrap_or_else(|_| br#"{"success":true}"#.to_vec());
                return HTTPResponseData {
                    status_code: 200,
                    content_type: "application/json",
                    body,
                    etag: None,
                    cache_control: None,
                };
            }
        }

        return HTTPResponseData {
            status_code: 400,
            content_type: "application/json",
            body: br#"{"success":false,"error":"Invalid settings JSON"}"#.to_vec(),
            etag: None,
            cache_control: None,
        };
    }

    // GET /settings: return complete admin payload expected by admin_bundle.js Vue component
    let settings = get_settings();
    let all_servers = fetch_all_servers();
    let cached = if !all_servers.is_empty() {
        all_servers.clone()
    } else {
        settings.cached_servers.clone()
    };
    let storage_status = crate::settings::get_storage_diagnostics();

    let resp = AdminSettingsResponse {
        version: PLUGIN_VERSION,
        title: settings.title,
        subtitle: settings.subtitle,
        theme: settings.theme,
        refresh_interval: settings.refresh_interval,
        custom_css: settings.custom_css,
        custom_header_html: settings.custom_header_html,
        hidden_servers: settings.hidden_servers,
        cached_servers: cached,
        address_key: settings.address_key.unwrap_or_default(),
        server_address_overrides: settings.server_address_overrides,
        server_order: settings.server_order,
        logo_url: settings.logo_url.unwrap_or_default(),
        favicon_url: settings.favicon_url.unwrap_or_default(),
        bot_api_enabled: settings.bot_api_enabled,
        bot_api_token: settings.bot_api_token,
        announcement_enabled: settings.announcement_enabled,
        announcement_text: settings.announcement_text,
        announcement_link: settings.announcement_link,
        announcement_type: settings.announcement_type,
        announcement_deadline: settings.announcement_deadline,
        server_categories: settings.server_categories,
        auto_hide_offline: settings.auto_hide_offline,
        auto_hide_offline_minutes: settings.auto_hide_offline_minutes,
        click_stats: settings.click_stats,
        open_sections: settings.open_sections,
        promo: settings.promo,
        storage_status,
        servers: all_servers.clone(),
        all_servers,
    };

    let body = serde_json::to_vec(&resp).unwrap_or_default();
    HTTPResponseData {
        status_code: 200,
        content_type: "application/json; charset=utf-8",
        body,
        etag: None,
        cache_control: None,
    }
}

/// Diagnostic endpoint.
fn handle_diagnostic(req: &HttpRequest) -> HTTPResponseData {
    if let Some(err_resp) = require_admin(req) {
        return err_resp;
    }

    let client_ip = get_header_ignore_case(&req.headers, "X-Gameap-Client-Ip")
        .or_else(|| get_header_ignore_case(&req.headers, "X-Forwarded-For"))
        .or_else(|| get_header_ignore_case(&req.headers, "X-Real-IP"))
        .cloned()
        .unwrap_or_default();

    let all_servers = fetch_all_servers();
    let mut settings = get_settings();
    let token_configured = !settings.bot_api_token.is_empty();
    settings.bot_api_token = mask_token(&settings.bot_api_token);
    let storage_diag = crate::settings::get_storage_diagnostics();

    let raw_diagnostic = crate::servers_client::get_raw_servers_diagnostic();

    let resp = serde_json::json!({
        "status": "ok",
        "plugin": "monitoring",
        "version": PLUGIN_VERSION,
        "engine": "rust-wasm",
        "client_ip": client_ip,
        "servers_count": all_servers.len(),
        "storage": storage_diag,
        "raw_servers": raw_diagnostic,
        "bot_api_token_configured": token_configured,
        "settings": settings,
    });

    let body = serde_json::to_vec_pretty(&resp).unwrap_or_default();
    HTTPResponseData {
        status_code: 200,
        content_type: "application/json",
        body,
        etag: None,
        cache_control: None,
    }
}

/// Handles click beacon tracking (POST /stats/click?server_id=X or ?action=click&server_id=X).
fn handle_click(req: &HttpRequest) -> HTTPResponseData {
    let mut server_id = None;
    if let Some(vals) = req.query_params.get("server_id") {
        if let Some(first) = vals.values.first() {
            server_id = first.parse::<u64>().ok();
        }
    }
    if server_id.is_none() {
        if let Some(pos) = req.path.find("server_id=") {
            let slice = &req.path[pos + "server_id=".len()..];
            let end = slice.find('&').unwrap_or(slice.len());
            server_id = slice[..end].parse::<u64>().ok();
        }
    }
    if server_id.is_none() && !req.body.is_empty() {
        if let Ok(json) = serde_json::from_slice::<serde_json::Value>(&req.body) {
            if let Some(id) = json.get("server_id").and_then(|v| v.as_u64()) {
                server_id = Some(id);
            } else if let Some(s) = json.get("server_id").and_then(|v| v.as_str()) {
                server_id = s.parse::<u64>().ok();
            }
        } else if let Ok(s) = std::str::from_utf8(&req.body) {
            if let Some(pos) = s.find("server_id=") {
                let slice = &s[pos + "server_id=".len()..];
                let end = slice.find('&').unwrap_or(slice.len());
                server_id = slice[..end].parse::<u64>().ok();
            } else {
                server_id = s.trim().parse::<u64>().ok();
            }
        }
    }

    let Some(id) = server_id else {
        return HTTPResponseData {
            status_code: 400,
            content_type: "application/json; charset=utf-8",
            body: br#"{"success":false,"error":"Missing or invalid server_id"}"#.to_vec(),
            etag: None,
            cache_control: None,
        };
    };

    let known_servers = fetch_all_servers();
    if !known_servers.iter().any(|s| s.id == id) {
        return HTTPResponseData {
            status_code: 404,
            content_type: "application/json; charset=utf-8",
            body: br#"{"success":false,"error":"Unknown server_id"}"#.to_vec(),
            etag: None,
            cache_control: None,
        };
    }

    let _ = crate::settings::save_click_stats(id);

    HTTPResponseData {
        status_code: 200,
        content_type: "application/json; charset=utf-8",
        body: br#"{"success":true}"#.to_vec(),
        etag: None,
        cache_control: None,
    }
}

/// Serves embedded game catalog metadata JSON (`/games.json` or `?action=games.json`).
fn handle_games_json() -> HTTPResponseData {
    HTTPResponseData {
        status_code: 200,
        content_type: "application/json; charset=utf-8",
        body: crate::assets::GAMES_JSON.to_vec(),
        etag: None,
        cache_control: Some("public, max-age=300"),
    }
}

/// Returns aggregated click analytics (GET /stats or ?action=stats).
fn handle_stats(_req: &HttpRequest) -> HTTPResponseData {
    let settings = get_settings();
    let body = serde_json::to_vec(&serde_json::json!({
        "success": true,
        "clicks": settings.click_stats,
    }))
    .unwrap_or_default();

    HTTPResponseData {
        status_code: 200,
        content_type: "application/json; charset=utf-8",
        body,
        etag: None,
        cache_control: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::proto::PluginContext;
    use crate::settings::{set_test_settings, TEST_SETTINGS_LOCK as TEST_LOCK};

    fn make_request(method: &str, path: &str, context: Option<PluginContext>) -> HttpRequest {
        HttpRequest {
            context,
            method: method.to_string(),
            path: path.to_string(),
            headers: HashMap::new(),
            path_params: HashMap::new(),
            query_params: HashMap::new(),
            body: Vec::new(),
        }
    }

    fn admin_context() -> PluginContext {
        PluginContext {
            plugin_id: "monitoring".to_string(),
            request_id: "req-1".to_string(),
            user_id: Some(1),
            permissions: vec!["admin".to_string()],
        }
    }

    #[test]
    fn test_settings_requires_admin_context() {
        let _guard = TEST_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        set_test_settings(PluginSettings::default());

        let get_unauth = handle_settings(&make_request("GET", "/settings", None));
        assert!(
            get_unauth.status_code == 401 || get_unauth.status_code == 403,
            "expected 401/403 for unauthenticated GET /settings, got {}",
            get_unauth.status_code
        );

        let mut post_req = make_request("POST", "/settings", None);
        post_req.body = br#"{"title":"Hacked"}"#.to_vec();
        let post_unauth = handle_settings(&post_req);
        assert!(
            post_unauth.status_code == 401 || post_unauth.status_code == 403,
            "expected 401/403 for unauthenticated POST /settings, got {}",
            post_unauth.status_code
        );

        let non_admin_ctx = PluginContext {
            plugin_id: "monitoring".to_string(),
            request_id: "req-2".to_string(),
            user_id: Some(2),
            permissions: vec!["user".to_string()],
        };
        let get_non_admin = handle_settings(&make_request("GET", "/settings", Some(non_admin_ctx)));
        assert!(
            get_non_admin.status_code == 401 || get_non_admin.status_code == 403,
            "expected 401/403 for non-admin GET /settings, got {}",
            get_non_admin.status_code
        );
    }

    #[test]
    fn test_diagnostic_requires_admin_context_and_masks_token() {
        let _guard = TEST_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let mut settings = PluginSettings::default();
        settings.bot_api_enabled = true;
        settings.bot_api_token = "super-secret-bot-token".to_string();
        set_test_settings(settings);

        let unauth = handle_diagnostic(&make_request("GET", "/diagnostic", None));
        assert!(
            unauth.status_code == 401 || unauth.status_code == 403,
            "expected 401/403 for unauthenticated GET /diagnostic, got {}",
            unauth.status_code
        );

        let authed = handle_diagnostic(&make_request("GET", "/diagnostic", Some(admin_context())));
        assert_eq!(authed.status_code, 200);
        let body_str = String::from_utf8(authed.body).unwrap();
        assert!(
            !body_str.contains("super-secret-bot-token"),
            "diagnostic response must not leak raw bot_api_token: {}",
            body_str
        );
        let json: serde_json::Value = serde_json::from_str(&body_str).unwrap();
        assert_eq!(json["settings"]["bot_api_token"], "***");
    }

    #[test]
    fn test_query_update_rejects_empty_token_or_disabled_bot_api() {
        let _guard = TEST_LOCK.lock().unwrap_or_else(|e| e.into_inner());

        // Case 1: bot_api_enabled = false, token configured, no header
        let mut s_disabled = PluginSettings::default();
        s_disabled.bot_api_enabled = false;
        s_disabled.bot_api_token = "valid-token".to_string();
        set_test_settings(s_disabled);

        let mut req = make_request("POST", "/servers/query-update", None);
        req.body = br#"{"1":{"online":true,"players":5}}"#.to_vec();
        let resp_disabled = handle_query_update(&req);
        assert!(
            resp_disabled.status_code == 401 || resp_disabled.status_code == 403,
            "expected 401/403 when bot_api_enabled is false, got {}",
            resp_disabled.status_code
        );

        // Case 2: bot_api_enabled = true, token empty, no header
        let mut s_empty = PluginSettings::default();
        s_empty.bot_api_enabled = true;
        s_empty.bot_api_token = String::new();
        set_test_settings(s_empty);

        let resp_empty = handle_query_update(&req);
        assert!(
            resp_empty.status_code == 401 || resp_empty.status_code == 403,
            "expected 401/403 when bot_api_token is empty, got {}",
            resp_empty.status_code
        );
    }

    fn make_server_dto(id: u64, name: &str, blocked: bool) -> PublicServerDTO {
        PublicServerDTO {
            id,
            node_id: Some(1),
            name: name.to_string(),
            game_code: "cs2".to_string(),
            game_name: "Counter-Strike 2".to_string(),
            address: "1.2.3.4".to_string(),
            port: 27015,
            status: "online".to_string(),
            installed: true,
            blocked,
            connect_url: String::new(),
            map: None,
            players: None,
            max_players: None,
            ping: None,
            version: None,
            build_id: None,
            category: None,
            uptime_seconds: None,
            is_hidden_offline: None,
        }
    }

    #[test]
    fn test_public_servers_ignores_all_param_and_user_agent() {
        let _guard = TEST_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let mut settings = PluginSettings::default();
        settings.bot_api_enabled = true;
        settings.bot_api_token = "secret-bot-token".to_string();
        settings.hidden_servers = vec![2];
        settings.cached_servers = vec![
            make_server_dto(1, "Public Server", false),
            make_server_dto(2, "Hidden Server", false),
            make_server_dto(3, "Blocked Server", true),
        ];
        set_test_settings(settings.clone());
        invalidate_public_cache();

        // 1. ?all=1 without auth must NOT return hidden/blocked servers
        let mut req_all = make_request("GET", "/servers", None);
        req_all.query_params.insert(
            "all".to_string(),
            crate::proto::QueryParamValues {
                values: vec!["1".to_string()],
            },
        );
        let resp_all = handle_servers(&req_all);
        assert_eq!(resp_all.status_code, 200);
        let json_all: serde_json::Value = serde_json::from_slice(&resp_all.body).unwrap();
        let ids_all: Vec<u64> = json_all["servers"]
            .as_array()
            .unwrap()
            .iter()
            .map(|s| s["id"].as_u64().unwrap())
            .collect();
        assert_eq!(
            ids_all,
            vec![1],
            "?all=1 leaked hidden/blocked servers: {:?}",
            ids_all
        );

        // 2. ?action=admin_servers without auth must NOT return hidden/blocked servers
        let mut req_admin_action = make_request("GET", "/servers", None);
        req_admin_action.query_params.insert(
            "action".to_string(),
            crate::proto::QueryParamValues {
                values: vec!["admin_servers".to_string()],
            },
        );
        let resp_admin_action = handle_servers(&req_admin_action);
        assert_eq!(resp_admin_action.status_code, 200);
        let json_admin_action: serde_json::Value =
            serde_json::from_slice(&resp_admin_action.body).unwrap();
        let ids_admin_action: Vec<u64> = json_admin_action["servers"]
            .as_array()
            .unwrap()
            .iter()
            .map(|s| s["id"].as_u64().unwrap())
            .collect();
        assert_eq!(
            ids_admin_action,
            vec![1],
            "?action=admin_servers leaked hidden/blocked servers: {:?}",
            ids_admin_action
        );

        // 3. User-Agent: WebMonBot without valid token must NOT return hidden/blocked servers
        let mut req_ua = make_request("GET", "/servers", None);
        req_ua
            .headers
            .insert("User-Agent".to_string(), "WebMonBot/1.0".to_string());
        let resp_ua = handle_servers(&req_ua);
        assert_eq!(resp_ua.status_code, 200);
        let json_ua: serde_json::Value = serde_json::from_slice(&resp_ua.body).unwrap();
        let ids_ua: Vec<u64> = json_ua["servers"]
            .as_array()
            .unwrap()
            .iter()
            .map(|s| s["id"].as_u64().unwrap())
            .collect();
        assert_eq!(
            ids_ua,
            vec![1],
            "User-Agent: WebMonBot leaked hidden/blocked servers: {:?}",
            ids_ua
        );

        // 4. User-Agent: WebMonBot even when bot_api_token is empty must NOT return hidden/blocked servers
        let mut settings_empty_tok = settings.clone();
        settings_empty_tok.bot_api_token = String::new();
        set_test_settings(settings_empty_tok);
        invalidate_public_cache();
        let resp_ua_empty = handle_servers(&req_ua);
        assert_eq!(resp_ua_empty.status_code, 200);
        let json_ua_empty: serde_json::Value = serde_json::from_slice(&resp_ua_empty.body).unwrap();
        let ids_ua_empty: Vec<u64> = json_ua_empty["servers"]
            .as_array()
            .unwrap()
            .iter()
            .map(|s| s["id"].as_u64().unwrap())
            .collect();
        assert_eq!(
            ids_ua_empty,
            vec![1],
            "User-Agent: WebMonBot with empty token leaked hidden/blocked servers: {:?}",
            ids_ua_empty
        );

        // 5. Positive control: valid bot token or admin context DOES receive all servers
        set_test_settings(settings);
        invalidate_public_cache();
        let mut req_bot = make_request("GET", "/servers", None);
        req_bot
            .headers
            .insert("X-WebMon-Token".to_string(), "secret-bot-token".to_string());
        let resp_bot = handle_servers(&req_bot);
        assert_eq!(resp_bot.status_code, 200);
        let json_bot: serde_json::Value = serde_json::from_slice(&resp_bot.body).unwrap();
        assert_eq!(json_bot["servers"].as_array().unwrap().len(), 3);

        let resp_admin = handle_servers(&make_request("GET", "/servers", Some(admin_context())));
        assert_eq!(resp_admin.status_code, 200);
        let json_admin: serde_json::Value = serde_json::from_slice(&resp_admin.body).unwrap();
        assert_eq!(json_admin["servers"].as_array().unwrap().len(), 3);
    }

    #[test]
    fn test_public_servers_strips_node_internal_ips() {
        let _guard = TEST_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let mut settings = PluginSettings::default();
        settings.bot_api_enabled = true;
        settings.bot_api_token = "secret-bot-token".to_string();
        set_test_settings(settings);
        crate::servers_client::set_test_nodes(Some(vec![crate::proto::NodeProto {
            id: 1,
            enabled: true,
            name: "Moscow Node".to_string(),
            location: "Moscow".to_string(),
            gdaemon_host: "10.0.0.5".to_string(),
            gdaemon_port: 31717,
            ips: vec!["10.0.0.5".to_string(), "192.168.1.10".to_string()],
            ..Default::default()
        }]));
        invalidate_public_cache();

        // Public /servers must NOT expose gdaemon_host, gdaemon_port, or raw ips
        let resp_pub = handle_servers(&make_request("GET", "/servers", None));
        assert_eq!(resp_pub.status_code, 200);
        let body_pub = String::from_utf8(resp_pub.body).unwrap();
        assert!(
            !body_pub.contains("gdaemon_host"),
            "public /servers leaked gdaemon_host: {}",
            body_pub
        );
        assert!(
            !body_pub.contains("gdaemon_port"),
            "public /servers leaked gdaemon_port: {}",
            body_pub
        );
        assert!(
            !body_pub.contains("10.0.0.5"),
            "public /servers leaked internal IP: {}",
            body_pub
        );
        assert!(
            !body_pub.contains("192.168.1.10"),
            "public /servers leaked raw node IP: {}",
            body_pub
        );
        assert!(
            !body_pub.contains("31717"),
            "public /servers leaked gdaemon_port value: {}",
            body_pub
        );

        // Authenticated /bot/servers MUST still receive full node info
        let mut req_bot = make_request("GET", "/bot/servers", None);
        req_bot
            .headers
            .insert("X-WebMon-Token".to_string(), "secret-bot-token".to_string());
        let resp_bot = handle_servers(&req_bot);
        assert_eq!(resp_bot.status_code, 200);
        let body_bot = String::from_utf8(resp_bot.body).unwrap();
        assert!(
            body_bot.contains("10.0.0.5"),
            "authenticated /bot/servers should include node gdaemon_host"
        );
        assert!(
            body_bot.contains("31717"),
            "authenticated /bot/servers should include node gdaemon_port"
        );
        assert!(
            body_bot.contains("192.168.1.10"),
            "authenticated /bot/servers should include node ips"
        );

        crate::servers_client::set_test_nodes(None);
        invalidate_public_cache();
    }

    #[test]
    fn test_handle_view_escapes_script_and_style_breakouts() {
        let _guard = TEST_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let mut settings = PluginSettings::default();
        settings.title = "My GameAP Servers </head>".to_string();
        settings.custom_css =
            "body { color: red; } </style><script>alert(1)</script> </STYLE>".to_string();
        let mut srv = make_server_dto(1, "Evil</script><script>alert(1)</script>", false);
        srv.map = Some("de_dust2</script><img src=x onerror=alert(2)>".to_string());
        settings.cached_servers = vec![srv];
        set_test_settings(settings);
        invalidate_public_cache();

        let resp = handle_view();
        assert_eq!(resp.status_code, 200);
        let html = String::from_utf8(resp.body).unwrap();

        // 1. INITIAL_DATA must escape < and > as \u003c and \u003e so </script> cannot break out
        assert!(
            !html.contains("</script><script>alert(1)"),
            "handle_view leaked unescaped </script> breakout in INITIAL_DATA"
        );
        assert!(
            !html.contains("de_dust2</script>"),
            "handle_view leaked unescaped </script> in map name"
        );
        assert!(
            html.contains(r"\u003c/script\u003e\u003cscript\u003ealert(1)\u003c/script\u003e"),
            "handle_view did not escape < and > as \\u003c and \\u003e in INITIAL_DATA"
        );

        // 2. custom_css must escape </style (case-insensitive) so it cannot break out of <style>
        assert!(
            !html.to_lowercase().contains("</style><script>alert(1)"),
            "handle_view leaked unescaped </style> breakout in custom_css"
        );
        assert!(
            !html.contains("</STYLE>"),
            "handle_view leaked unescaped uppercase </STYLE> in custom_css"
        );

        // 3. settings.title containing "GameAP Servers" or "</head>" must not corrupt template
        assert!(
            !html.contains("My My GameAP Servers"),
            "handle_view corrupted <title> via global replace of 'GameAP Servers'"
        );
        assert!(
            html.contains("<title>My GameAP Servers &lt;/head&gt; | GameAP</title>"),
            "handle_view did not properly set <title> without corruption"
        );
        assert_eq!(
            html.matches("</head>").count(),
            1,
            "handle_view should have exactly one </head> closing tag"
        );

        invalidate_public_cache();
    }

    #[test]
    fn test_http_routes_have_no_invalid_dot_characters() {
        for route in crate::service::HTTP_ROUTES {
            assert!(
                !route.path.contains('.'),
                "GameAP rejects dots in HTTP_ROUTES path: {}",
                route.path
            );
        }
    }

    #[test]
    fn test_games_json_route_returns_200() {
        let _guard = TEST_LOCK.lock().unwrap_or_else(|e| e.into_inner());

        for req in [
            make_request("GET", "/games", None),
            make_request("GET", "/api/plugins/monitoring/games", None),
            make_request("GET", "/games.json", None),
            make_request("GET", "/api/plugins/monitoring/games.json", None),
        ] {
            let resp = handle_http_request(&req);
            assert_eq!(resp.status_code, 200, "expected 200 for {}", req.path);
            assert!(
                resp.content_type.contains("application/json"),
                "expected application/json for {}, got {}",
                req.path,
                resp.content_type
            );
            assert_eq!(resp.body, crate::assets::GAMES_JSON);
        }

        for action in ["games", "games.json"] {
            let mut action_req = make_request("GET", "/api/plugins/monitoring", None);
            action_req.query_params.insert(
                "action".to_string(),
                crate::proto::QueryParamValues {
                    values: vec![action.to_string()],
                },
            );
            let action_resp = handle_http_request(&action_req);
            assert_eq!(action_resp.status_code, 200, "action={}", action);
            assert!(action_resp.content_type.contains("application/json"));
            assert_eq!(action_resp.body, crate::assets::GAMES_JSON);
        }
    }

    #[test]
    fn test_click_rejects_unknown_server_id() {
        let _guard = TEST_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let mut settings = PluginSettings::default();
        settings.cached_servers = vec![make_server_dto(1, "Known Server", false)];
        set_test_settings(settings);
        invalidate_public_cache();

        // Populate public micro-cache
        let _ = crate::servers_client::fetch_public_servers_with_opt(false);
        assert!(crate::servers_client::has_public_cache());

        // Unknown server_id must be rejected (404 or 400) and not stored in click_stats
        let mut unknown_req = make_request("POST", "/stats/click", None);
        unknown_req.query_params.insert(
            "server_id".to_string(),
            crate::proto::QueryParamValues {
                values: vec!["999999".to_string()],
            },
        );
        let unknown_resp = handle_click(&unknown_req);
        assert!(
            unknown_resp.status_code == 404 || unknown_resp.status_code == 400,
            "expected 404/400 for unknown server_id, got {}",
            unknown_resp.status_code
        );
        assert!(
            get_settings().click_stats.get(&999999).is_none(),
            "unknown server_id must not be recorded in click_stats"
        );

        // Known server_id must succeed and must NOT invalidate the public micro-cache
        let mut known_req = make_request("POST", "/stats/click", None);
        known_req.query_params.insert(
            "server_id".to_string(),
            crate::proto::QueryParamValues {
                values: vec!["1".to_string()],
            },
        );
        let known_resp = handle_click(&known_req);
        assert_eq!(known_resp.status_code, 200);
        assert_eq!(get_settings().click_stats.get(&1), Some(&1));
        assert!(
            crate::servers_client::has_public_cache(),
            "handle_click must not invalidate public micro-cache on every click"
        );

        invalidate_public_cache();
    }

    #[test]
    fn test_promo_config_sanitization_and_public_exposure() {
        let _guard = TEST_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let mut settings = PluginSettings::default();
        settings.promo = crate::types::PromoConfig {
            enabled: true,
            position: "invalid_pos".to_string(),
            style: "invalid_style".to_string(),
            accent_color: "not_a_hex".to_string(),
            title: "Host Promo".to_string(),
            cards: vec![Default::default(); 6],
            ..Default::default()
        };
        let _ = crate::settings::save_settings(settings);

        let saved = crate::settings::get_settings();
        assert_eq!(saved.promo.position, "top");
        assert_eq!(saved.promo.style, "glass");
        assert_eq!(saved.promo.accent_color, "#00f0ff");
        assert_eq!(saved.promo.cards.len(), 4);

        let view_resp = handle_http_request(&make_request("GET", "/", None));
        assert_eq!(view_resp.status_code, 200);
        let html = String::from_utf8_lossy(&view_resp.body);
        assert!(html.contains("Host Promo"));

        crate::settings::set_test_settings(PluginSettings::default());
    }
}
