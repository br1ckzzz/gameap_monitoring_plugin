//! HTTP route handlers for public monitoring and administrative endpoints.

use crate::assets::INDEX_HTML;
use crate::proto::HttpRequest;
use crate::servers_client::{fetch_all_servers, fetch_public_servers_with_opt, invalidate_public_cache};
use crate::service::PLUGIN_VERSION;
use crate::settings::{get_settings, save_settings};
use crate::types::{MonitoringResponse, PluginSettings, PublicServerDTO};
use serde::Serialize;
use std::collections::HashMap;

pub struct HTTPResponseData {
    pub status_code: i32,
    pub content_type: &'static str,
    pub body: Vec<u8>,
}

#[derive(Serialize)]
struct AdminSettingsResponse {
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
    pub servers: Vec<PublicServerDTO>,
    pub all_servers: Vec<PublicServerDTO>,
}

fn get_header_ignore_case<'a>(headers: &'a HashMap<String, String>, key: &str) -> Option<&'a String> {
    headers.iter().find_map(|(k, v)| {
        if k.eq_ignore_ascii_case(key) {
            Some(v)
        } else {
            None
        }
    })
}

fn extract_auth_token(req: &HttpRequest) -> Option<String> {
    if let Some(token) = get_header_ignore_case(&req.headers, "X-WebMon-Token") {
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
                "servers" | "admin_servers" | "all_servers" => return handle_servers(req),
                "settings" => return handle_settings(req),
                "diagnostic" => return handle_diagnostic(req),
                "click" | "stats/click" => return handle_click(req),
                "stats" => return handle_stats(req),
                "view" => return handle_view(),
                _ => {}
            }
        }
    }

    // Path suffix matching to support arbitrary GameAP mount prefixes
    if path == "/stats/click" || path.ends_with("/stats/click") {
        return handle_click(req);
    }
    if path == "/stats" || path.ends_with("/stats") {
        return handle_stats(req);
    }
    if path == "/settings" || path.ends_with("/settings") {
        return handle_settings(req);
    }
    if path == "/servers" || path.ends_with("/servers") || path.ends_with("/api/servers") || path.ends_with("/bot/servers") {
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
        };
    }

    // Handle root path routing
    if path.is_empty() || path == "/" {
        if req.method.eq_ignore_ascii_case("POST") {
            return handle_settings(req);
        }

        if let Some(accept) = req.headers.get("Accept") {
            if accept.contains("application/json") && !accept.contains("text/html") {
                return handle_servers(req);
            }
        }

        return handle_view();
    }

    HTTPResponseData {
        status_code: 404,
        content_type: "application/json",
        body: br#"{"error":"not found"}"#.to_vec(),
    }
}

/// Serves public server list with Anti-DoS micro-cache or all servers for admin / bot API.
fn handle_servers(req: &HttpRequest) -> HTTPResponseData {
    let settings = get_settings();
    let path = req.path.trim_end_matches('/');
    let is_explicit_bot_endpoint = path.ends_with("/api/servers") || path.ends_with("/bot/servers");
    let provided_token = extract_auth_token(req);

    // Validate bot API authentication if requested on bot endpoints or with token
    if is_explicit_bot_endpoint || provided_token.is_some() {
        if !settings.bot_api_enabled {
            return HTTPResponseData {
                status_code: 403,
                content_type: "application/json; charset=utf-8",
                body: br#"{"success":false,"error":"Bot API is disabled in plugin settings"}"#.to_vec(),
            };
        }

        if !settings.bot_api_token.is_empty() {
            match provided_token {
                Some(ref token) if token == &settings.bot_api_token => {},
                _ => {
                    return HTTPResponseData {
                        status_code: 401,
                        content_type: "application/json; charset=utf-8",
                        body: br#"{"success":false,"error":"Unauthorized: invalid or missing Bot API token"}"#.to_vec(),
                    };
                }
            }
        }
    }

    let mut show_all = is_explicit_bot_endpoint || provided_token.is_some();
    if let Some(vals) = req.query_params.get("all") {
        if let Some(first) = vals.values.first() {
            if first == "1" || first == "true" {
                show_all = true;
            }
        }
    }
    if let Some(vals) = req.query_params.get("action") {
        if let Some(first) = vals.values.first() {
            if first == "admin_servers" || first == "all_servers" {
                show_all = true;
            }
        }
    }

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
        let announcement = if settings.announcement_enabled && !settings.announcement_text.is_empty() {
            Some(crate::types::AnnouncementDTO {
                text: settings.announcement_text.clone(),
                link: if settings.announcement_link.is_empty() { None } else { Some(settings.announcement_link.clone()) },
                banner_type: settings.announcement_type.clone(),
                deadline: if settings.announcement_deadline.is_empty() { None } else { Some(settings.announcement_deadline.clone()) },
            })
        } else {
            None
        };
        let resp = MonitoringResponse {
            success: true,
            total_servers: all_servers.len(),
            online_count,
            servers: all_servers,
            timestamp: now as i64,
            refresh_interval: settings.refresh_interval,
            announcement,
        };
        let body = serde_json::to_vec(&resp).unwrap_or_default();
        return HTTPResponseData {
            status_code: 200,
            content_type: "application/json; charset=utf-8",
            body,
        };
    }

    let body = fetch_public_servers_with_opt(force_refresh);
    HTTPResponseData {
        status_code: 200,
        content_type: "application/json; charset=utf-8",
        body,
    }
}

fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

/// Serves public HTML page with instant preload and administrative customizations.
fn handle_view() -> HTTPResponseData {
    let settings = get_settings();
    let mut page_content = String::from_utf8_lossy(INDEX_HTML).to_string();

    if !settings.title.is_empty() {
        let escaped = html_escape(&settings.title);
        page_content = page_content.replace(
            "<title>GameAP | Servers Monitoring</title>",
            &format!("<title>{} | GameAP</title>", escaped),
        );
        page_content = page_content.replace(
            "<title>Мониторинг игровых серверов | GameAP</title>",
            &format!("<title>{} | GameAP</title>", escaped),
        );
        page_content = page_content.replace("GameAP Servers", &escaped);
    }

    if !settings.subtitle.is_empty() {
        let escaped = html_escape(&settings.subtitle);
        page_content = page_content.replace("Онлайн мониторинг игровых серверов", &escaped);
    }

    if !settings.custom_header_html.is_empty() {
        page_content = page_content.replace("<!-- CUSTOM_HEADER -->", &settings.custom_header_html);
    }

    if !settings.custom_css.is_empty() {
        let tag = format!(
            "<style id=\"admin-custom-css\">\n{}\n</style>\n</head>",
            settings.custom_css
        );
        page_content = page_content.replace("</head>", &tag);
    }

    if settings.theme == "light" {
        page_content = page_content.replace("<html lang=\"ru\">", "<html lang=\"ru\" data-theme=\"light\">");
    }

    if let Some(ref favicon) = settings.favicon_url {
        if !favicon.is_empty() {
            let tag = format!("<link rel=\"icon\" href=\"{}\">\n</head>", html_escape(favicon));
            page_content = page_content.replace("</head>", &tag);
        }
    }

    if let Some(ref logo) = settings.logo_url {
        if !logo.is_empty() {
            let tag = format!("<img src=\"{}\" alt=\"Logo\" class=\"brand-logo\">", html_escape(logo));
            page_content = page_content.replace("<div class=\"brand-icon\">🎮</div>", &tag);
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
        obj.insert("repo_url".to_string(), serde_json::json!(crate::service::PLUGIN_REPO_URL));
        obj.insert("refresh_interval".to_string(), serde_json::json!(settings.refresh_interval));
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
        if settings.announcement_enabled && !settings.announcement_text.is_empty() {
            obj.insert("announcement".to_string(), serde_json::json!({
                "text": settings.announcement_text,
                "link": if settings.announcement_link.is_empty() { None } else { Some(settings.announcement_link.clone()) },
                "banner_type": settings.announcement_type,
                "deadline": if settings.announcement_deadline.is_empty() { None } else { Some(settings.announcement_deadline.clone()) }
            }));
        }
    }
    if let Ok(initial_json) = serde_json::to_string(&initial_data) {
        let preloaded = format!("<script>window.INITIAL_DATA = {};</script>\n</head>", initial_json);
        page_content = page_content.replace("</head>", &preloaded);
    }

    page_content = page_content.replace("v1.0.0", &format!("v{}", PLUGIN_VERSION));
    page_content = page_content.replace(">15с<", &format!(">{}с<", settings.refresh_interval));
    page_content = page_content.replace(">15s<", &format!(">{}s<", settings.refresh_interval));

    HTTPResponseData {
        status_code: 200,
        content_type: "text/html; charset=utf-8",
        body: page_content.into_bytes(),
    }
}

/// Administrative settings handler (GET and POST).
fn handle_settings(req: &HttpRequest) -> HTTPResponseData {
    if req.method.eq_ignore_ascii_case("POST") {
        if let Ok(new_settings) = serde_json::from_slice::<PluginSettings>(&req.body) {
            save_settings(new_settings);
            invalidate_public_cache();
            return HTTPResponseData {
                status_code: 200,
                content_type: "application/json",
                body: br#"{"success":true}"#.to_vec(),
            };
        } else {
            return HTTPResponseData {
                status_code: 400,
                content_type: "application/json",
                body: br#"{"success":false,"error":"Invalid settings JSON"}"#.to_vec(),
            };
        }
    }

    // GET /settings: return complete admin payload expected by admin_bundle.js Vue component
    let settings = get_settings();
    let all_servers = fetch_all_servers();
    let cached = if !all_servers.is_empty() {
        all_servers.clone()
    } else {
        settings.cached_servers.clone()
    };

    let resp = AdminSettingsResponse {
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
        servers: all_servers.clone(),
        all_servers,
    };

    let body = serde_json::to_vec(&resp).unwrap_or_default();
    HTTPResponseData {
        status_code: 200,
        content_type: "application/json; charset=utf-8",
        body,
    }
}

/// Diagnostic endpoint.
fn handle_diagnostic(req: &HttpRequest) -> HTTPResponseData {
    let client_ip = req
        .headers
        .get("X-Gameap-Client-Ip")
        .or_else(|| req.headers.get("X-Forwarded-For"))
        .or_else(|| req.headers.get("X-Real-IP"))
        .cloned()
        .unwrap_or_default();

    let all_servers = fetch_all_servers();
    let settings = get_settings();

    let raw_diagnostic = crate::servers_client::get_raw_servers_diagnostic();

    let resp = serde_json::json!({
        "status": "ok",
        "plugin": "monitoring",
        "version": PLUGIN_VERSION,
        "engine": "rust-wasm",
        "client_ip": client_ip,
        "servers_count": all_servers.len(),
        "raw_servers": raw_diagnostic,
        "settings": settings,
    });

    let body = serde_json::to_vec_pretty(&resp).unwrap_or_default();
    HTTPResponseData {
        status_code: 200,
        content_type: "application/json",
        body,
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

    if let Some(id) = server_id {
        let mut settings = get_settings();
        *settings.click_stats.entry(id).or_insert(0) += 1;
        save_settings(settings);
    }

    HTTPResponseData {
        status_code: 200,
        content_type: "application/json; charset=utf-8",
        body: br#"{"success":true}"#.to_vec(),
    }
}

/// Returns aggregated click analytics (GET /stats or ?action=stats).
fn handle_stats(_req: &HttpRequest) -> HTTPResponseData {
    let settings = get_settings();
    let body = serde_json::to_vec(&serde_json::json!({
        "success": true,
        "clicks": settings.click_stats,
    })).unwrap_or_default();

    HTTPResponseData {
        status_code: 200,
        content_type: "application/json; charset=utf-8",
        body,
    }
}
