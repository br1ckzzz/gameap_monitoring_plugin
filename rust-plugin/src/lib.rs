//! GameAP WebMonitoring: Ultra-lightweight WebAssembly Plugin.
//!
//! Provides public live monitoring endpoints, admin bundle, static assets,
//! and server event hooks with high-performance memory model and Anti-DoS caching.

pub mod abi;
pub mod assets;
pub mod cache;
pub mod handlers;
pub mod service;
pub mod settings;
pub mod types;

use abi::{pack_ptr_size, write_bytes};

/// Returns the supported plugin API version (GameAP Plugin API v1).
#[no_mangle]
pub extern "C" fn plugin_service_api_version() -> u64 {
    1
}

/// Returns plugin metadata: ID, Version, Name, Permissions.
#[no_mangle]
pub extern "C" fn plugin_service_get_info(_ptr: u32, _size: u32) -> u64 {
    // In final integration with prost, serialized PluginInfo proto message is returned.
    write_bytes(b"")
}

/// Initializes plugin resources upon loading.
#[no_mangle]
pub extern "C" fn plugin_service_initialize(_ptr: u32, _size: u32) -> u64 {
    // InitializeResponse { result: { success: true } }
    write_bytes(b"")
}

/// Cleanly flushes memory and shuts down plugin.
#[no_mangle]
pub extern "C" fn plugin_service_shutdown(_ptr: u32, _size: u32) -> u64 {
    cache::invalidate_cache();
    write_bytes(b"")
}

/// Declares subscribed lifecycle events.
#[no_mangle]
pub extern "C" fn plugin_service_get_subscribed_events(_ptr: u32, _size: u32) -> u64 {
    // Returns list of EventTypes: SERVER_POST_START, POST_STOP, POST_RESTART, CREATED, UPDATED, DELETED
    write_bytes(b"")
}

/// Handles incoming lifecycle events from GameAP daemon.
#[no_mangle]
pub extern "C" fn plugin_service_handle_event(_ptr: u32, _size: u32) -> u64 {
    cache::invalidate_cache();
    write_bytes(b"")
}

/// Returns the compiled frontend admin bundle (admin_bundle.js).
#[no_mangle]
pub extern "C" fn plugin_service_get_frontend_bundle(_ptr: u32, _size: u32) -> u64 {
    let bundle = service::get_admin_bundle();
    // Wrap in GetFrontendBundleResponse proto
    write_bytes(bundle)
}

/// Returns embedded static assets for public monitoring (HTML/CSS/JS).
#[no_mangle]
pub extern "C" fn plugin_service_get_assets(_ptr: u32, _size: u32) -> u64 {
    write_bytes(b"")
}

/// Declares supported HTTP route paths and methods.
#[no_mangle]
pub extern "C" fn plugin_service_get_http_routes(_ptr: u32, _size: u32) -> u64 {
    write_bytes(b"")
}

/// Dispatches incoming HTTP requests to handlers (/, /servers, /view, /settings, /diagnostic).
#[no_mangle]
pub extern "C" fn plugin_service_handle_http_request(_ptr: u32, _size: u32) -> u64 {
    write_bytes(b"")
}

/// Returns additional server permissions/abilities (empty for read-only monitoring).
#[no_mangle]
pub extern "C" fn plugin_service_get_server_abilities(_ptr: u32, _size: u32) -> u64 {
    write_bytes(b"")
}
