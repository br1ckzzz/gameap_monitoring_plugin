//! In-memory Micro-Cache for Anti-DoS protection.
//!
//! Protects GameAP database and daemon instances by caching serialized server responses
//! for 3-5 seconds inside WASM memory.

use std::sync::Mutex;

struct CacheEntry {
    payload: Vec<u8>,
    timestamp_secs: i64,
}

static MICRO_CACHE: Mutex<Option<CacheEntry>> = Mutex::new(None);
const CACHE_TTL_SECS: i64 = 3;

/// Gets cached JSON payload if still valid within TTL window.
pub fn get_cached_response(now_secs: i64) -> Option<Vec<u8>> {
    if let Ok(guard) = MICRO_CACHE.lock() {
        if let Some(entry) = &*guard {
            if now_secs - entry.timestamp_secs < CACHE_TTL_SECS {
                return Some(entry.payload.clone());
            }
        }
    }
    None
}

/// Stores new JSON payload into micro-cache.
pub fn set_cached_response(payload: Vec<u8>, now_secs: i64) {
    if let Ok(mut guard) = MICRO_CACHE.lock() {
        *guard = Some(CacheEntry {
            payload,
            timestamp_secs: now_secs,
        });
    }
}

/// Invalidates micro-cache when server lifecycle events or settings change.
pub fn invalidate_cache() {
    if let Ok(mut guard) = MICRO_CACHE.lock() {
        *guard = None;
    }
}
