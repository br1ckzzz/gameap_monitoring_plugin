//! HTTP route handlers for public monitoring and administrative endpoints.

use crate::assets::INDEX_HTML;
use crate::cache::{get_cached_response, set_cached_response};
use crate::settings::{get_settings, save_settings};
use crate::types::{MonitoringResponse, PluginSettings, PublicServerDTO};

pub struct HTTPResponseData {
    pub status_code: u32,
    pub content_type: &'static str,
    pub body: Vec<u8>,
}

/// Routes an incoming HTTP request path and method to the appropriate handler.
pub fn handle_route(path: &str, method: &str, body: &[u8]) -> HTTPResponseData {
    match path.trim_end_matches('/') {
        "" | "/view" => handle_index(),
        "/servers" => handle_servers(),
        "/settings" => handle_settings(method, body),
        "/diagnostic" => handle_diagnostic(),
        _ => HTTPResponseData {
            status_code: 404,
            content_type: "application/json",
            body: br#"{"error":"Not Found"}"#.to_vec(),
        },
    }
}

/// Serves the public HTML web monitoring page.
fn handle_index() -> HTTPResponseData {
    let settings = get_settings();
    let mut html = String::from_utf8_lossy(INDEX_HTML).to_string();

    // Inject customization if present
    if !settings.title.is_empty() {
        html = html.replace("<title>GameAP Servers</title>", &format!("<title>{}</title>", settings.title));
    }
    if !settings.custom_css.is_empty() {
        let tag = format!("<style>{}</style></head>", settings.custom_css);
        html = html.replace("</head>", &tag);
    }
    if !settings.custom_header_html.is_empty() {
        let tag = format!("{}</body>", settings.custom_header_html);
        html = html.replace("</body>", &tag);
    }

    HTTPResponseData {
        status_code: 200,
        content_type: "text/html; charset=utf-8",
        body: html.into_bytes(),
    }
}

/// Serves public server list with Anti-DoS micro-cache.
fn handle_servers() -> HTTPResponseData {
    let now = 0; // Timestamp or host clock
    if let Some(cached) = get_cached_response(now) {
        return HTTPResponseData {
            status_code: 200,
            content_type: "application/json; charset=utf-8",
            body: cached,
        };
    }

    let settings = get_settings();
    let mut visible_servers: Vec<PublicServerDTO> = settings
        .cached_servers
        .into_iter()
        .filter(|s| !settings.hidden_servers.contains(&s.id))
        .collect();

    // Reorder according to server_order if set
    if !settings.server_order.is_empty() {
        visible_servers.sort_by_key(|s| {
            settings
                .server_order
                .iter()
                .position(|&id| id == s.id)
                .unwrap_or(usize::MAX)
        });
    }

    let online_count = visible_servers.iter().filter(|s| s.status == "online").count();
    let total = visible_servers.len();

    let resp = MonitoringResponse {
        success: true,
        total_servers: total,
        online_count,
        servers: visible_servers,
        timestamp: now,
    };

    let serialized = serde_json::to_vec(&resp).unwrap_or_default();
    set_cached_response(serialized.clone(), now);

    HTTPResponseData {
        status_code: 200,
        content_type: "application/json; charset=utf-8",
        body: serialized,
    }
}

/// Administrative settings management (GET/POST).
fn handle_settings(method: &str, body: &[u8]) -> HTTPResponseData {
    if method.eq_ignore_ascii_case("POST") {
        if let Ok(new_settings) = serde_json::from_slice::<PluginSettings>(body) {
            save_settings(new_settings);
            return HTTPResponseData {
                status_code: 200,
                content_type: "application/json",
                body: br#"{"success":true,"message":"Settings updated"}"#.to_vec(),
            };
        } else {
            return HTTPResponseData {
                status_code: 400,
                content_type: "application/json",
                body: br#"{"success":false,"error":"Invalid settings JSON"}"#.to_vec(),
            };
        }
    }

    // GET: Return current settings
    let settings = get_settings();
    let payload = serde_json::to_vec(&settings).unwrap_or_default();
    HTTPResponseData {
        status_code: 200,
        content_type: "application/json; charset=utf-8",
        body: payload,
    }
}

/// Returns internal diagnostics.
fn handle_diagnostic() -> HTTPResponseData {
    let body = format!(
        r#"{{"status":"ok","plugin":"monitoring","version":"1.0.5","engine":"rust-wasm"}}"#
    );
    HTTPResponseData {
        status_code: 200,
        content_type: "application/json",
        body: body.into_bytes(),
    }
}
