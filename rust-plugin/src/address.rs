//! Intelligent server public address resolution and sorting.
//!
//! Ported directly from `plugin/address.go` with 100% parity.

use crate::proto::{AnyProto, ServerProto};
use crate::types::{PluginSettings, PublicServerDTO};
use std::collections::HashMap;

/// Validates if a string is a valid IPv4, IPv6 or domain name hostname.
pub fn is_valid_ip_or_hostname(value: &str) -> bool {
    let value = value.trim();
    if value.is_empty() || value.len() > 253 {
        return false;
    }

    if value == "localhost" {
        return true;
    }

    // IP check
    if value.parse::<std::net::IpAddr>().is_ok() {
        return true;
    }

    // If it looks like broken IP, reject
    if value.chars().all(|c| c.is_ascii_digit() || c == '.') {
        return false;
    }

    // Basic domain check: labels separated by dots
    let parts: Vec<&str> = value.split('.').collect();
    if parts.len() < 2 {
        return false;
    }
    for part in parts {
        if part.is_empty() || part.len() > 63 {
            return false;
        }
        if !part.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
            return false;
        }
        if part.starts_with('-') || part.ends_with('-') {
            return false;
        }
    }
    true
}

/// Checks if an address is a public address (hostname or non-private IP).
pub fn is_public_address(addr: &str) -> bool {
    if let Ok(ip) = addr.parse::<std::net::IpAddr>() {
        match ip {
            std::net::IpAddr::V4(ipv4) => {
                !ipv4.is_private()
                    && !ipv4.is_loopback()
                    && !ipv4.is_unspecified()
                    && !ipv4.is_link_local()
            }
            std::net::IpAddr::V6(ipv6) => {
                !ipv6.is_loopback() && !ipv6.is_unspecified()
            }
        }
    } else {
        // Valid hostname is assumed public
        true
    }
}

/// Cleans a single candidate address by stripping schemes and ports.
pub fn clean_single_address(mut raw: &str) -> String {
    raw = raw.trim();
    if raw.is_empty() {
        return String::new();
    }

    // Strip scheme
    if let Some(pos) = raw.find("://") {
        raw = &raw[pos + 3..];
    }

    // Strip path
    if let Some(pos) = raw.find('/') {
        raw = &raw[..pos];
    }

    // Strip port
    let mut host = raw;
    if host.starts_with('[') && host.contains(']') {
        if let Some(end) = host.find(']') {
            host = &host[1..end];
        }
    } else if host.matches(':').count() == 1 {
        if let Some(pos) = host.find(':') {
            host = &host[..pos];
        }
    }

    let host = host.trim();
    if is_valid_ip_or_hostname(host) {
        host.to_string()
    } else {
        String::new()
    }
}

/// Sanitizes an address candidate or multi-address list (comma/semicolon).
pub fn clean_and_validate_address(raw: &str) -> String {
    let raw = raw.trim();
    if raw.is_empty() {
        return String::new();
    }

    if raw.contains(',') || raw.contains(';') {
        let parts = raw.split(|c| c == ',' || c == ';');
        let mut fallback = String::new();
        for part in parts {
            let cleaned = clean_single_address(part);
            if !cleaned.is_empty() {
                if is_public_address(&cleaned) {
                    return cleaned;
                }
                if fallback.is_empty() {
                    fallback = cleaned;
                }
            }
        }
        return fallback;
    }

    clean_single_address(raw)
}

/// Extracts a string from a Protobuf Any value (wrapperspb.StringValue or raw bytes).
pub fn extract_metadata_string(any_val: &AnyProto) -> String {
    let val = &any_val.value;
    if val.is_empty() {
        return String::new();
    }

    // Fallback: protobuf StringValue wire unpack: field 1 (0x0a), length varint, string bytes
    if val[0] == 0x0a && val.len() > 1 {
        let mut idx = 1;
        let mut len: usize = 0;
        let mut shift = 0;
        while idx < val.len() {
            let b = val[idx];
            idx += 1;
            len |= ((b & 0x7F) as usize) << shift;
            if b & 0x80 == 0 {
                break;
            }
            shift += 7;
        }
        if idx + len <= val.len() {
            if let Ok(s) = std::str::from_utf8(&val[idx..idx + len]) {
                return s.trim().to_string();
            }
        }
    }

    if let Ok(s) = std::str::from_utf8(val) {
        s.trim().to_string()
    } else {
        String::new()
    }
}

/// Parses Server.vars JSON string into key-value map.
pub fn extract_vars_map(vars_str: Option<&str>) -> HashMap<String, String> {
    let mut map = HashMap::new();
    if let Some(s) = vars_str {
        if !s.is_empty() {
            if let Ok(json_map) = serde_json::from_str::<HashMap<String, serde_json::Value>>(s) {
                for (k, v) in json_map {
                    if let Some(str_val) = v.as_str() {
                        map.insert(k, str_val.to_string());
                    } else {
                        map.insert(k, v.to_string());
                    }
                }
            }
        }
    }
    map
}

const DEFAULT_ADDRESS_KEYS: &[&str] = &[
    "public_ip",
    "public_address",
    "domain",
    "hostname",
    "server_domain",
    "external_ip",
    "public_host",
    "host",
];

/// Resolves server public IP or hostname using 6-tier prioritization rules.
pub fn resolve_server_address(s: &ServerProto, settings: &PluginSettings) -> String {
    // 1. Manual per-server override in settings
    if let Some(override_val) = settings.server_address_overrides.get(&s.id) {
        if !override_val.is_empty() {
            let clean = clean_and_validate_address(override_val);
            if !clean.is_empty() {
                return clean;
            }
        }
    }

    let vars_map = extract_vars_map(s.vars.as_deref());

    // 2. Custom AddressKey(s) configured in settings
    if let Some(ref custom_keys) = settings.address_key {
        if !custom_keys.is_empty() {
            for key in custom_keys.split(|c| c == ',' || c == ';').map(|k| k.trim()) {
                if let Some(any_val) = s.metadata.get(key) {
                    let clean = clean_and_validate_address(&extract_metadata_string(any_val));
                    if !clean.is_empty() {
                        return clean;
                    }
                }
                if let Some(val) = vars_map.get(key) {
                    let clean = clean_and_validate_address(val);
                    if !clean.is_empty() {
                        return clean;
                    }
                }
            }
        }
    }

    // 3 & 4. Standard candidate keys in Metadata
    for &key in DEFAULT_ADDRESS_KEYS {
        if let Some(any_val) = s.metadata.get(key) {
            let clean = clean_and_validate_address(&extract_metadata_string(any_val));
            if !clean.is_empty() {
                return clean;
            }
        }
    }

    // 5. Standard candidate keys in Server Vars
    for &key in DEFAULT_ADDRESS_KEYS {
        if let Some(val) = vars_map.get(key) {
            let clean = clean_and_validate_address(val);
            if !clean.is_empty() {
                return clean;
            }
        }
    }

    // 6. Fallback to ServerIp
    let clean = clean_and_validate_address(&s.server_ip);
    if !clean.is_empty() {
        clean
    } else {
        s.server_ip.clone()
    }
}

/// Sorts servers based on user-defined server_order list.
pub fn sort_servers_by_order(mut list: Vec<PublicServerDTO>, order: &[u64]) -> Vec<PublicServerDTO> {
    if order.is_empty() {
        return list;
    }
    let order_map: HashMap<u64, usize> = order.iter().enumerate().map(|(i, &id)| (id, i)).collect();
    list.sort_by_key(|s| order_map.get(&s.id).copied().unwrap_or(usize::MAX));
    list
}
