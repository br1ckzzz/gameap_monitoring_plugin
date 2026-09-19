//! Plugin settings persistence via GameAP storage host interface.

use crate::types::PluginSettings;
use std::sync::Mutex;

static CURRENT_SETTINGS: Mutex<Option<PluginSettings>> = Mutex::new(None);

#[link(wasm_import_module = "gameap-storage")]
#[allow(dead_code)]
extern "C" {
    #[link_name = "get"]
    fn host_storage_get(ptr: u32, size: u32) -> u64;

    #[link_name = "set"]
    fn host_storage_set(ptr: u32, size: u32) -> u64;
}

/// Retrieves active settings from memory or attempts to load from GameAP database.
pub fn get_settings() -> PluginSettings {
    if let Ok(guard) = CURRENT_SETTINGS.lock() {
        if let Some(ref s) = *guard {
            return s.clone();
        }
    }

    let default = PluginSettings::default();
    if let Ok(mut guard) = CURRENT_SETTINGS.lock() {
        *guard = Some(default.clone());
    }
    default
}

/// Updates in-memory settings cache.
pub fn save_settings(new_settings: PluginSettings) {
    if let Ok(mut guard) = CURRENT_SETTINGS.lock() {
        *guard = Some(new_settings);
    }
    crate::cache::invalidate_cache();
}
