//! Plugin settings persistence via GameAP storage host interface.

use crate::abi::{deallocate, read_proto, unpack_ptr_size, write_bytes};
use crate::proto::{StorageGetRequest, StorageGetResponse, StorageSetRequest, StorageSetResponse};
use crate::types::PluginSettings;
use prost::Message;
use std::sync::Mutex;

static CURRENT_SETTINGS: Mutex<Option<PluginSettings>> = Mutex::new(None);

#[link(wasm_import_module = "gameap-storage")]
extern "C" {
    #[link_name = "get"]
    fn host_storage_get(ptr: u32, size: u32) -> u64;

    #[link_name = "set"]
    fn host_storage_set(ptr: u32, size: u32) -> u64;
}

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

/// Retrieves active settings from memory cache or database storage.
pub fn get_settings() -> PluginSettings {
    // If in-memory settings has cached servers, return it directly
    if let Ok(guard) = CURRENT_SETTINGS.lock() {
        if let Some(ref s) = *guard {
            if !s.cached_servers.is_empty() {
                return s.clone();
            }
        }
    }

    // Try reading persistent settings from GameAP storage database
    let req = StorageGetRequest {
        key: "settings".to_string(),
        entity_type: None,
        entity_id: None,
    };

    if let Some(resp) = call_storage_get(&req) {
        if resp.found {
            if let Some(payload) = resp.payload {
                if let Ok(loaded) = serde_json::from_slice::<PluginSettings>(&payload) {
                    if let Ok(mut guard) = CURRENT_SETTINGS.lock() {
                        *guard = Some(loaded.clone());
                    }
                    return loaded;
                }
            }
        }
    }

    let default = PluginSettings::default();
    if let Ok(mut guard) = CURRENT_SETTINGS.lock() {
        *guard = Some(default.clone());
    }
    default
}

/// Updates memory cache and persists settings to GameAP database storage.
pub fn save_settings(mut s: PluginSettings) {
    if s.refresh_interval == 0 {
        s.refresh_interval = 15;
    }
    if s.theme.is_empty() {
        s.theme = "dark".to_string();
    }

    // Persist to GameAP database storage
    if let Ok(payload) = serde_json::to_vec(&s) {
        let req = StorageSetRequest {
            key: "settings".to_string(),
            entity_type: None,
            entity_id: None,
            payload,
        };
        let _ = call_storage_set(&req);
    }

    if let Ok(mut guard) = CURRENT_SETTINGS.lock() {
        *guard = Some(s);
    }
    crate::servers_client::invalidate_public_cache();
}
