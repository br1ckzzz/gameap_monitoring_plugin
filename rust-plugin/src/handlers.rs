//! HTTP route handlers for public monitoring and administrative endpoints.

use crate::assets::INDEX_HTML;
use crate::proto::HttpRequest;
use crate::servers_client::{fetch_all_servers, fetch_public_servers, invalidate_public_cache};
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
    pub servers: Vec<PublicServerDTO>,
    pub all_servers: Vec<PublicServerDTO>,
}

/// Dispatches HTTP requests matching Go's `HandleHTTPRequest` router.
pub fn handle_http_request(req: &HttpRequest) -> HTTPResponseData {
    let path = req.path.trim_end_matches('/');

    // Handle root path routing
    if path.is_empty() || path == "/" {
        if let Some(action_vals) = req.query_params.get("action") {
            if let Some(action) = action_vals.values.first() {
                match action.as_str() {
                    "servers" | "admin_servers" | "all_servers" => return handle_servers(req),
                    "settings" => return handle_settings(req),
                    "diagnostic" => return handle_diagnostic(req),
                    "view" => return handle_view(),
                    _ => {}
                }
            }
        }

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

    match path {
        "/servers" => handle_servers(req),
        "/view" => handle_view(),
        "/settings" => handle_settings(req),
        "/diagnostic" => handle_diagnostic(req),
        _ => HTTPResponseData {
            status_code: 404,
            content_type: "application/json",
            body: br#"{"error":"not found"}"#.to_vec(),
        },
    }
}

/// Serves public server list with Anti-DoS micro-cache or all servers for admin.
fn handle_servers(req: &HttpRequest) -> HTTPResponseData {
    let mut show_all = false;
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

    if show_all {
        let all_servers = fetch_all_servers();
        let online_count = all_servers.iter().filter(|s| s.status == "online").count();
        let resp = MonitoringResponse {
            success: true,
            total_servers: all_servers.len(),
            online_count,
            servers: all_servers,
            timestamp: 0,
        };
        let body = serde_json::to_vec(&resp).unwrap_or_default();
        return HTTPResponseData {
            status_code: 200,
            content_type: "application/json; charset=utf-8",
            body,
        };
    }

    let body = fetch_public_servers();
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

    // Preload servers into HTML for instant 0ms first render (no spinner)
    let pub_bytes = fetch_public_servers();
    if !pub_bytes.is_empty() {
        if let Ok(pub_str) = std::str::from_utf8(&pub_bytes) {
            let preloaded = format!("<script>window.INITIAL_DATA = {};</script>\n</head>", pub_str);
            page_content = page_content.replace("</head>", &preloaded);
        }
    }

    page_content = page_content.replace("v1.0.0", &format!("v{}", PLUGIN_VERSION));

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
                status_code: 200,
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

    let resp = serde_json::json!({
        "status": "ok",
        "plugin": "monitoring",
        "version": PLUGIN_VERSION,
        "engine": "rust-wasm",
        "client_ip": client_ip,
        "servers_count": all_servers.len(),
        "settings": settings,
    });

    let body = serde_json::to_vec_pretty(&resp).unwrap_or_default();
    HTTPResponseData {
        status_code: 200,
        content_type: "application/json",
        body,
    }
}
