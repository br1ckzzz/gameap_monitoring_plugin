//! Plugin settings persistence via GameAP storage host interface.

#[cfg(target_arch = "wasm32")]
use crate::abi::{deallocate, read_proto, unpack_ptr_size, write_bytes};
use crate::proto::{StorageGetRequest, StorageGetResponse, StorageSetRequest, StorageSetResponse};
use crate::types::{PluginSettings, StorageDiagnostics};
#[cfg(target_arch = "wasm32")]
use prost::Message;
use std::sync::Mutex;

static CURRENT_SETTINGS: Mutex<Option<PluginSettings>> = Mutex::new(None);
static STORAGE_DIAGNOSTICS: Mutex<Option<StorageDiagnostics>> = Mutex::new(None);

#[cfg(target_arch = "wasm32")]
#[link(wasm_import_module = "gameap-storage")]
extern "C" {
    #[link_name = "get"]
    fn host_storage_get(ptr: u32, size: u32) -> u64;

    #[link_name = "set"]
    fn host_storage_set(ptr: u32, size: u32) -> u64;
}


#[cfg(not(target_arch = "wasm32"))]
fn call_storage_get(_req: &StorageGetRequest) -> Option<StorageGetResponse> {
    None
}

#[cfg(target_arch = "wasm32")]
fn call_storage_get(req: &StorageGetRequest) -> Option<StorageGetResponse> {
    let mut buf = Vec::with_capacity(req.encoded_len());
    req.encode(&mut buf).ok()?;
    let (req_ptr, req_size) = unpack_ptr_size(write_bytes(&buf));
    let res_packed = unsafe { host_storage_get(req_ptr, req_size) };
    deallocate(req_ptr, req_size);

    let (res_ptr, res_size) = unpack_ptr_size(res_packed);
    if res_ptr == 0 || res_size == 0 {
        return None;
    }
    let resp = read_proto::<StorageGetResponse>(res_ptr, res_size).ok();
    deallocate(res_ptr, res_size);
    resp
}

#[cfg(not(target_arch = "wasm32"))]
fn call_storage_set(_req: &StorageSetRequest) -> Option<StorageSetResponse> {
    None
}

#[cfg(target_arch = "wasm32")]
fn call_storage_set(req: &StorageSetRequest) -> Option<StorageSetResponse> {
    let mut buf = Vec::with_capacity(req.encoded_len());
    req.encode(&mut buf).ok()?;
    let (req_ptr, req_size) = unpack_ptr_size(write_bytes(&buf));
    let res_packed = unsafe { host_storage_set(req_ptr, req_size) };
    deallocate(req_ptr, req_size);

    let (res_ptr, res_size) = unpack_ptr_size(res_packed);
    if res_ptr == 0 || res_size == 0 {
        return None;
    }
    let resp = read_proto::<StorageSetResponse>(res_ptr, res_size).ok();
    deallocate(res_ptr, res_size);
    resp
}

/// Returns current storage diagnostic telemetry.
pub fn get_storage_diagnostics() -> StorageDiagnostics {
    if let Ok(guard) = STORAGE_DIAGNOSTICS.lock() {
        if let Some(ref d) = *guard {
            return d.clone();
        }
    }
    StorageDiagnostics {
        db_saved: false,
        last_error: None,
        source: "unknown".to_string(),
        found: false,
        payload_bytes: 0,
        key: "settings".to_string(),
    }
}

#[cfg(test)]
pub(crate) fn set_test_settings(s: PluginSettings) {
    if let Ok(mut guard) = CURRENT_SETTINGS.lock() {
        *guard = Some(s);
    }
}

/// Retrieves active settings from memory cache or database storage.
pub fn get_settings() -> PluginSettings {
    // If in-memory settings are already loaded/saved, return directly
    if let Ok(guard) = CURRENT_SETTINGS.lock() {
        if let Some(ref s) = *guard {
            return s.clone();
        }
    }

    let mut diag = StorageDiagnostics {
        db_saved: false,
        last_error: None,
        source: "storage".to_string(),
        found: false,
        payload_bytes: 0,
        key: "settings".to_string(),
    };

    // Try reading persistent settings from GameAP storage database
    let req = StorageGetRequest {
        key: "settings".to_string(),
        entity_type: None,
        entity_id: None,
    };

    if let Some(resp) = call_storage_get(&req) {
        diag.found = resp.found;
        if let Some(ref err) = resp.error {
            diag.last_error = Some(err.clone());
        }

        if resp.found {
            if let Some(payload) = resp.payload {
                diag.payload_bytes = payload.len();
                if !payload.is_empty() {
                    // 1. Try standard typed deserialization
                    match serde_json::from_slice::<PluginSettings>(&payload) {
                        Ok(loaded) => {
                            diag.db_saved = true;
                            diag.source = "storage".to_string();
                            if let Ok(mut d_guard) = STORAGE_DIAGNOSTICS.lock() {
                                *d_guard = Some(diag);
                            }
                            if let Ok(mut guard) = CURRENT_SETTINGS.lock() {
                                *guard = Some(loaded.clone());
                            }
                            return loaded;
                        }
                        Err(err) => {
                            diag.last_error = Some(format!("serde decode failed: {}", err));
                            // 2. Resilient fallback: parse into Value and extract critical settings
                            if let Ok(val) = serde_json::from_slice::<serde_json::Value>(&payload) {
                                let mut recovered = PluginSettings::default();
                                if let Some(t) = val.get("title").and_then(|v| v.as_str()) {
                                    recovered.title = t.to_string();
                                }
                                if let Some(st) = val.get("subtitle").and_then(|v| v.as_str()) {
                                    recovered.subtitle = st.to_string();
                                }
                                if let Some(th) = val.get("theme").and_then(|v| v.as_str()) {
                                    recovered.theme = th.to_string();
                                }
                                if let Some(ri) = val.get("refresh_interval").and_then(|v| v.as_u64()) {
                                    recovered.refresh_interval = ri as u32;
                                }
                                if let Some(css) = val.get("custom_css").and_then(|v| v.as_str()) {
                                    recovered.custom_css = css.to_string();
                                }
                                if let Some(html) = val.get("custom_header_html").and_then(|v| v.as_str()) {
                                    recovered.custom_header_html = html.to_string();
                                }
                                if let Some(token) = val.get("bot_api_token").and_then(|v| v.as_str()) {
                                    recovered.bot_api_token = token.to_string();
                                }
                                if let Some(enabled) = val.get("bot_api_enabled").and_then(|v| v.as_bool()) {
                                    recovered.bot_api_enabled = enabled;
                                }
                                if let Some(ae) = val.get("announcement_enabled").and_then(|v| v.as_bool()) {
                                    recovered.announcement_enabled = ae;
                                }
                                if let Some(at) = val.get("announcement_text").and_then(|v| v.as_str()) {
                                    recovered.announcement_text = at.to_string();
                                }
                                if let Some(al) = val.get("announcement_link").and_then(|v| v.as_str()) {
                                    recovered.announcement_link = al.to_string();
                                }
                                if let Some(atype) = val.get("announcement_type").and_then(|v| v.as_str()) {
                                    recovered.announcement_type = atype.to_string();
                                }
                                if let Some(ad) = val.get("announcement_deadline").and_then(|v| v.as_str()) {
                                    recovered.announcement_deadline = ad.to_string();
                                }
                                if let Some(aho) = val.get("auto_hide_offline").and_then(|v| v.as_bool()) {
                                    recovered.auto_hide_offline = aho;
                                }
                                if let Some(ahom) = val.get("auto_hide_offline_minutes").and_then(|v| v.as_u64()) {
                                    recovered.auto_hide_offline_minutes = ahom as u32;
                                }
                                diag.db_saved = true;
                                diag.source = "storage_recovered".to_string();
                                if let Ok(mut d_guard) = STORAGE_DIAGNOSTICS.lock() {
                                    *d_guard = Some(diag);
                                }
                                if let Ok(mut guard) = CURRENT_SETTINGS.lock() {
                                    *guard = Some(recovered.clone());
                                }
                                return recovered;
                            }
                        }
                    }
                }
            }
        }
    } else {
        diag.last_error = Some("call_storage_get returned None (host call failed)".to_string());
    }

    diag.source = "default".to_string();
    if let Ok(mut d_guard) = STORAGE_DIAGNOSTICS.lock() {
        *d_guard = Some(diag);
    }

    let default = PluginSettings::default();
    if let Ok(mut guard) = CURRENT_SETTINGS.lock() {
        *guard = Some(default.clone());
    }
    default
}

/// Updates memory cache and persists settings to GameAP database storage.
/// Returns a tuple `(db_saved, error_message)`.
pub fn save_settings(s: PluginSettings) -> (bool, Option<String>) {
    save_settings_inner(s, true)
}

/// Increments click count for a validated server ID and persists without invalidating public cache.
pub fn save_click_stats(server_id: u64) -> (bool, Option<String>) {
    let mut settings = get_settings();
    *settings.click_stats.entry(server_id).or_insert(0) += 1;
    save_settings_inner(settings, false)
}

fn save_settings_inner(mut s: PluginSettings, invalidate_cache: bool) -> (bool, Option<String>) {
    if s.refresh_interval == 0 {
        s.refresh_interval = 15;
    }
    if s.theme.is_empty() {
        s.theme = "modern".to_string();
    }
    // Allow explicit clearing via clear_bot_api_token; otherwise preserve existing token if omitted/masked
    if s.clear_bot_api_token {
        s.bot_api_token.clear();
        s.clear_bot_api_token = false;
    } else if s.bot_api_token.trim().is_empty() || s.bot_api_token.trim() == "***" {
        let current = get_settings();
        if !current.bot_api_token.is_empty() {
            s.bot_api_token = current.bot_api_token;
        }
    }

    let mut db_saved = false;
    let mut err_msg = None;

    match serde_json::to_vec(&s) {
        Ok(payload) => {
            let bytes_len = payload.len();
            let req = StorageSetRequest {
                key: "settings".to_string(),
                entity_type: None,
                entity_id: None,
                payload,
            };
            match call_storage_set(&req) {
                Some(resp) => {
                    db_saved = resp.success;
                    if !resp.success {
                        err_msg = resp.error.clone().or_else(|| Some("storage set returned success=false".to_string()));
                    }
                    if let Ok(mut d_guard) = STORAGE_DIAGNOSTICS.lock() {
                        *d_guard = Some(StorageDiagnostics {
                            db_saved,
                            last_error: err_msg.clone(),
                            source: "storage".to_string(),
                            found: true,
                            payload_bytes: bytes_len,
                            key: "settings".to_string(),
                        });
                    }
                }
                None => {
                    err_msg = Some("call_storage_set returned None (host call error or null pointer)".to_string());
                    if let Ok(mut d_guard) = STORAGE_DIAGNOSTICS.lock() {
                        *d_guard = Some(StorageDiagnostics {
                            db_saved: false,
                            last_error: err_msg.clone(),
                            source: "memory".to_string(),
                            found: false,
                            payload_bytes: bytes_len,
                            key: "settings".to_string(),
                        });
                    }
                }
            }
        }
        Err(e) => {
            err_msg = Some(format!("serde_json::to_vec failed: {}", e));
        }
    }

    if let Ok(mut guard) = CURRENT_SETTINGS.lock() {
        *guard = Some(s);
    }
    if invalidate_cache {
        crate::servers_client::invalidate_public_cache();
    }
    (db_saved, err_msg)
}

#[cfg(test)]
pub(crate) static TEST_SETTINGS_LOCK: Mutex<()> = Mutex::new(());

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_save_settings_allows_disabling_bot_api() {
        let _guard = TEST_SETTINGS_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let mut initial = PluginSettings::default();
        initial.bot_api_token = "secret-bot-token".to_string();
        initial.bot_api_enabled = true;
        set_test_settings(initial);

        // 1. Disabling bot_api_enabled with non-empty token must persist false
        let mut disabled = get_settings();
        disabled.bot_api_enabled = false;
        let _ = save_settings(disabled);
        let after = get_settings();
        assert!(!after.bot_api_enabled, "bot_api_enabled should stay false even when bot_api_token is non-empty");
        assert_eq!(after.bot_api_token, "secret-bot-token");

        // 2. Saving with masked/empty token must preserve existing token AND respect bot_api_enabled = false
        let mut masked = PluginSettings::default();
        masked.bot_api_token = "***".to_string();
        masked.bot_api_enabled = false;
        let _ = save_settings(masked);
        let after_masked = get_settings();
        assert!(!after_masked.bot_api_enabled, "bot_api_enabled should stay false when token is masked");
        assert_eq!(after_masked.bot_api_token, "secret-bot-token");

        // 3. Explicit clear_bot_api_token clears token without forcing bot_api_enabled
        let mut cleared = PluginSettings::default();
        cleared.clear_bot_api_token = true;
        cleared.bot_api_enabled = false;
        let _ = save_settings(cleared);
        let after_cleared = get_settings();
        assert!(after_cleared.bot_api_token.is_empty(), "clear_bot_api_token should clear token");
        assert!(!after_cleared.bot_api_enabled);
    }
}
