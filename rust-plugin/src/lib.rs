//! GameAP WebMonitoring: WebAssembly Plugin written in Rust.
//!
//! Provides public live monitoring endpoints, admin bundle, static assets,
//! and server event hooks with high-performance memory model and Anti-DoS caching.

pub mod abi;
pub mod address;
pub mod assets;
pub mod cache;
pub mod handlers;
pub mod proto;
pub mod servers_client;
pub mod service;
pub mod settings;
pub mod types;

use abi::{read_proto, write_proto};
use proto::*;
use servers_client::{convert_proto_server_to_dto, invalidate_public_cache};
use settings::{get_settings, save_settings};
use std::collections::HashMap;

/// Returns the supported plugin API version (GameAP Plugin API v1).
#[no_mangle]
pub extern "C" fn plugin_service_api_version() -> u64 {
    1
}

/// Returns plugin metadata: ID, Version, Name, Permissions.
#[no_mangle]
pub extern "C" fn plugin_service_get_info(_ptr: u32, _size: u32) -> u64 {
    let info = PluginInfo {
        id: service::PLUGIN_INFO.id.to_string(),
        name: service::PLUGIN_INFO.name.to_string(),
        version: service::PLUGIN_INFO.version.to_string(),
        description: service::PLUGIN_INFO.description.to_string(),
        author: service::PLUGIN_INFO.author.to_string(),
        license: "MIT".to_string(),
        homepage: "https://github.com/br1ckzzz/gameap_monitoring_plugin".to_string(),
        required_permissions: service::PLUGIN_INFO
            .required_permissions
            .iter()
            .map(|&s| s.to_string())
            .collect(),
        api_version: service::PLUGIN_INFO.api_version.to_string(),
    };
    write_proto(&info)
}

/// Initializes plugin resources upon loading.
#[no_mangle]
pub extern "C" fn plugin_service_initialize(_ptr: u32, _size: u32) -> u64 {
    let resp = InitializeResponse {
        result: Some(Result {
            success: true,
            error: None,
            error_code: None,
        }),
    };
    write_proto(&resp)
}

/// Cleanly flushes memory and shuts down plugin.
#[no_mangle]
pub extern "C" fn plugin_service_shutdown(_ptr: u32, _size: u32) -> u64 {
    invalidate_public_cache();
    let resp = ShutdownResponse {
        result: Some(Result {
            success: true,
            error: None,
            error_code: None,
        }),
    };
    write_proto(&resp)
}

/// Declares subscribed lifecycle events.
#[no_mangle]
pub extern "C" fn plugin_service_get_subscribed_events(_ptr: u32, _size: u32) -> u64 {
    let resp = GetSubscribedEventsResponse {
        events: vec![
            EVENT_TYPE_SERVER_POST_START,
            EVENT_TYPE_SERVER_POST_STOP,
            EVENT_TYPE_SERVER_POST_RESTART,
            EVENT_TYPE_SERVER_CREATED,
            EVENT_TYPE_SERVER_UPDATED,
            EVENT_TYPE_SERVER_DELETED,
        ],
    };
    write_proto(&resp)
}

/// Handles incoming lifecycle events from GameAP daemon, updating cached servers in real-time.
#[no_mangle]
pub extern "C" fn plugin_service_handle_event(ptr: u32, size: u32) -> u64 {
    invalidate_public_cache();

    if let Ok(event) = read_proto::<Event>(ptr, size) {
        if let Some(payload) = event.server_event {
            if let Some(s) = payload.server {
                let mut current = get_settings();
                let mut changed = false;

                match event.r#type {
                    EVENT_TYPE_SERVER_CREATED => {
                        if let Some(pos) = current.cached_servers.iter().position(|e| e.id == s.id) {
                            current.cached_servers[pos] = convert_proto_server_to_dto(&s, "", &current);
                        } else {
                            current.cached_servers.push(convert_proto_server_to_dto(&s, "", &current));
                        }
                        changed = true;
                    }
                    EVENT_TYPE_SERVER_UPDATED => {
                        if let Some(pos) = current.cached_servers.iter().position(|e| e.id == s.id) {
                            let g_name = current.cached_servers[pos].game_name.clone();
                            current.cached_servers[pos] = convert_proto_server_to_dto(&s, &g_name, &current);
                            changed = true;
                        }
                    }
                    EVENT_TYPE_SERVER_DELETED => {
                        let prev_len = current.cached_servers.len();
                        current.cached_servers.retain(|existing| existing.id != s.id);
                        if current.cached_servers.len() != prev_len {
                            changed = true;
                        }
                    }
                    EVENT_TYPE_SERVER_POST_START | EVENT_TYPE_SERVER_POST_RESTART => {
                        for existing in &mut current.cached_servers {
                            if existing.id == s.id {
                                existing.status = "online".to_string();
                                changed = true;
                                break;
                            }
                        }
                    }
                    EVENT_TYPE_SERVER_POST_STOP => {
                        for existing in &mut current.cached_servers {
                            if existing.id == s.id {
                                existing.status = "offline".to_string();
                                changed = true;
                                break;
                            }
                        }
                    }
                    _ => {}
                }

                if changed {
                    save_settings(current);
                }
            }
        }
    }

    let res = EventResult {
        handled: true,
        should_cancel: false,
        message: None,
        modified_data: HashMap::new(),
    };
    write_proto(&res)
}

/// Returns the compiled frontend admin bundle (admin_bundle.js).
#[no_mangle]
pub extern "C" fn plugin_service_get_frontend_bundle(_ptr: u32, _size: u32) -> u64 {
    let resp = GetFrontendBundleResponse {
        bundle: assets::ADMIN_BUNDLE_JS.to_vec(),
        has_bundle: true,
        styles: Vec::new(),
        has_styles: false,
    };
    write_proto(&resp)
}

/// Returns embedded static assets for public monitoring (HTML/CSS/JS).
#[no_mangle]
pub extern "C" fn plugin_service_get_assets(_ptr: u32, _size: u32) -> u64 {
    let files: Vec<AssetFile> = assets::get_frontend_assets()
        .iter()
        .map(|a| AssetFile {
            path: a.path.to_string(),
            content: a.content.to_vec(),
        })
        .collect();

    let resp = GetAssetsResponse {
        i18n_files: Vec::new(),
        frontend_files: files,
    };
    write_proto(&resp)
}

/// Declares supported HTTP route paths and methods.
#[no_mangle]
pub extern "C" fn plugin_service_get_http_routes(_ptr: u32, _size: u32) -> u64 {
    let routes: Vec<HttpRoute> = service::HTTP_ROUTES
        .iter()
        .map(|r| HttpRoute {
            path: r.path.to_string(),
            methods: r.methods.iter().map(|&m| m.to_string()).collect(),
            requires_auth: r.requires_auth,
            admin_only: r.admin_only,
            description: r.description.to_string(),
        })
        .collect();

    let resp = GetHttpRoutesResponse { routes };
    write_proto(&resp)
}

/// Dispatches incoming HTTP requests to handlers (/, /servers, /view, /settings, /diagnostic).
#[no_mangle]
pub extern "C" fn plugin_service_handle_http_request(ptr: u32, size: u32) -> u64 {
    let req = read_proto::<HttpRequest>(ptr, size).unwrap_or(HttpRequest {
        context: None,
        path: "/".to_string(),
        method: "GET".to_string(),
        headers: HashMap::new(),
        path_params: HashMap::new(),
        query_params: HashMap::new(),
        body: Vec::new(),
    });

    let res_data = handlers::handle_http_request(&req);

    let mut headers = HashMap::new();
    headers.insert("Content-Type".to_string(), res_data.content_type.to_string());
    headers.insert("Access-Control-Allow-Origin".to_string(), "*".to_string());
    headers.insert(
        "Cache-Control".to_string(),
        "no-cache, no-store, must-revalidate".to_string(),
    );

    let resp = HttpResponse {
        status_code: res_data.status_code,
        headers,
        body: res_data.body,
    };
    write_proto(&resp)
}

/// Returns additional server permissions/abilities (empty for read-only monitoring).
#[no_mangle]
pub extern "C" fn plugin_service_get_server_abilities(_ptr: u32, _size: u32) -> u64 {
    let resp = GetServerAbilitiesResponse {
        abilities: Vec::new(),
    };
    write_proto(&resp)
}
