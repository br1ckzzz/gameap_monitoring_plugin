//! Client for querying GameAP host services (servers, games) via WebAssembly imports.

use crate::abi::{deallocate, read_proto, unpack_ptr_size, write_bytes};
use crate::address::{extract_metadata_string, extract_vars_map, resolve_server_address, sort_servers_by_order};
use crate::proto::{FindGamesRequest, FindGamesResponse, FindServersRequest, FindServersResponse, ServerProto};
use crate::settings::get_settings;
use crate::types::{MonitoringResponse, PluginSettings, PublicServerDTO};
use prost::Message;
use std::collections::HashMap;
use std::sync::Mutex;

#[link(wasm_import_module = "gameap-servers")]
extern "C" {
    #[link_name = "find_servers"]
    fn host_find_servers(ptr: u32, size: u32) -> u64;
}

#[link(wasm_import_module = "gameap-games")]
extern "C" {
    #[link_name = "find_games"]
    fn host_find_games(ptr: u32, size: u32) -> u64;
}

/// Helper function to perform a host call with protobuf request and response.
fn call_host<Req: Message, Resp: Message + Default>(
    req: &Req,
    host_fn: unsafe extern "C" fn(u32, u32) -> u64,
) -> Option<Resp> {
    let mut req_buf = Vec::with_capacity(req.encoded_len());
    req.encode(&mut req_buf).ok()?;

    let (req_ptr, req_size) = unpack_ptr_size(write_bytes(&req_buf));
    let res_packed = unsafe { host_fn(req_ptr, req_size) };
    deallocate(req_ptr, req_size);

    let (res_ptr, res_size) = unpack_ptr_size(res_packed);
    if res_ptr == 0 || res_size == 0 {
        return None;
    }

    let resp = read_proto::<Resp>(res_ptr, res_size).ok();
    deallocate(res_ptr, res_size);
    resp
}

pub fn format_game_name(code: &str) -> String {
    match code {
        "cstrike" => "Counter-Strike 1.6".to_string(),
        "csgo" => "Counter-Strike: Global Offensive".to_string(),
        "cs2" => "Counter-Strike 2".to_string(),
        "rust" => "Rust".to_string(),
        "minecraft" => "Minecraft".to_string(),
        "tf2" => "Team Fortress 2".to_string(),
        "samp" => "SA-MP".to_string(),
        "valheim" => "Valheim".to_string(),
        "ark" => "ARK: Survival Evolved".to_string(),
        "left4dead2" => "Left 4 Dead 2".to_string(),
        other => other.to_string(),
    }
}

pub fn is_steam_game(code: &str) -> bool {
    matches!(
        code,
        "cstrike" | "csgo" | "cs2" | "rust" | "tf2" | "valheim" | "ark" | "left4dead2" | "garrysmod" | "cssource" | "css"
    )
}

pub fn get_raw_servers_diagnostic() -> Vec<serde_json::Value> {
    let host_resp = call_host::<FindServersRequest, FindServersResponse>(
        &FindServersRequest {},
        host_find_servers,
    );
    let raw_servers = host_resp.map(|r| r.servers).unwrap_or_default();
    raw_servers
        .into_iter()
        .map(|s| {
            let meta_keys: Vec<String> = s.metadata.keys().cloned().collect();
            let vars_raw = s.vars.clone().unwrap_or_default();
            serde_json::json!({
                "id": s.id,
                "name": s.name,
                "game_id": s.game_id,
                "server_ip": s.server_ip,
                "server_port": s.server_port,
                "query_port": s.query_port,
                "process_active": s.process_active,
                "vars": vars_raw,
                "metadata_keys": meta_keys,
            })
        })
        .collect()
}

pub fn convert_proto_server_to_dto(
    s: &ServerProto,
    game_name: &str,
    settings: &PluginSettings,
) -> PublicServerDTO {
    let g_name = if !game_name.is_empty() {
        game_name.to_string()
    } else {
        format_game_name(&s.game_id)
    };

    let status = if s.process_active {
        "online".to_string()
    } else {
        "offline".to_string()
    };

    let resolved_address = resolve_server_address(s, settings);

    let connect_url = if is_steam_game(&s.game_id) && !resolved_address.is_empty() && s.server_port > 0 {
        format!("steam://connect/{}:{}", resolved_address, s.server_port)
    } else {
        String::new()
    };

    let vars_map = extract_vars_map(s.vars.as_deref());

    let map = s.metadata.get("map")
        .or_else(|| s.metadata.get("default_map"))
        .map(extract_metadata_string)
        .filter(|v| !v.is_empty())
        .or_else(|| vars_map.get("default_map").cloned())
        .or_else(|| vars_map.get("map").cloned());

    let max_players = s.metadata.get("max_players")
        .or_else(|| s.metadata.get("maxplayers"))
        .or_else(|| s.metadata.get("slots"))
        .map(extract_metadata_string)
        .and_then(|v| v.parse::<i32>().ok())
        .or_else(|| vars_map.get("max_players").and_then(|v| v.parse::<i32>().ok()))
        .or_else(|| vars_map.get("maxplayers").and_then(|v| v.parse::<i32>().ok()))
        .or_else(|| vars_map.get("slots").and_then(|v| v.parse::<i32>().ok()));

    let players = s.metadata.get("players")
        .or_else(|| s.metadata.get("players_num"))
        .map(extract_metadata_string)
        .and_then(|v| v.parse::<i32>().ok())
        .or_else(|| vars_map.get("players").and_then(|v| v.parse::<i32>().ok()))
        .or_else(|| vars_map.get("players_num").and_then(|v| v.parse::<i32>().ok()));

    let ping = s.metadata.get("ping")
        .map(extract_metadata_string)
        .and_then(|v| v.parse::<i32>().ok())
        .or_else(|| vars_map.get("ping").and_then(|v| v.parse::<i32>().ok()));

    let version = s.metadata.get("version")
        .or_else(|| s.metadata.get("game_version"))
        .map(extract_metadata_string)
        .filter(|v| !v.is_empty())
        .or_else(|| vars_map.get("version").cloned())
        .or_else(|| vars_map.get("game_version").cloned());

    let build_id = s.metadata.get("build_id")
        .map(extract_metadata_string)
        .filter(|v| !v.is_empty())
        .or_else(|| vars_map.get("build_id").cloned());

    let category = settings.server_categories.get(&s.id).cloned()
        .or_else(|| s.metadata.get("category").map(extract_metadata_string).filter(|v| !v.is_empty()))
        .or_else(|| vars_map.get("category").cloned());

    let uptime_seconds = s.metadata.get("uptime_seconds")
        .or_else(|| s.metadata.get("uptime"))
        .map(extract_metadata_string)
        .and_then(|v| v.parse::<u64>().ok())
        .or_else(|| vars_map.get("uptime_seconds").and_then(|v| v.parse::<u64>().ok()))
        .or_else(|| vars_map.get("uptime").and_then(|v| v.parse::<u64>().ok()));

    let is_hidden_offline = if settings.auto_hide_offline && status != "online" {
        Some(true)
    } else {
        None
    };

    PublicServerDTO {
        id: s.id,
        name: s.name.clone(),
        game_code: s.game_id.clone(),
        game_name: g_name,
        address: resolved_address,
        port: s.server_port,
        status,
        installed: s.installed == 1,
        blocked: s.blocked,
        connect_url,
        map,
        players,
        max_players,
        ping,
        version,
        build_id,
        category,
        uptime_seconds,
        is_hidden_offline,
    }
}

/// Fetches all servers from GameAP host, matching game names and applying settings.
pub fn fetch_all_servers() -> Vec<PublicServerDTO> {
    let host_resp = call_host::<FindServersRequest, FindServersResponse>(
        &FindServersRequest {},
        host_find_servers,
    );
    let host_succeeded = host_resp.is_some();
    let raw_servers: Vec<ServerProto> = host_resp.map(|r| r.servers).unwrap_or_default();

    let mut game_names = HashMap::new();
    if let Some(games_resp) = call_host::<FindGamesRequest, FindGamesResponse>(
        &FindGamesRequest {},
        host_find_games,
    ) {
        for g in games_resp.games {
            if !g.code.is_empty() && !g.name.is_empty() {
                game_names.insert(g.code, g.name);
            }
        }
    }

    let settings = get_settings();
    let mut list = Vec::new();

    for s in &raw_servers {
        let g_name = game_names.get(&s.game_id).cloned().unwrap_or_default();
        let dto = convert_proto_server_to_dto(s, &g_name, &settings);
        list.push(dto);
    }

    // Fallback to cached_servers ONLY if host call failed (error / unreachable)
    if !host_succeeded && list.is_empty() && !settings.cached_servers.is_empty() {
        list.extend(settings.cached_servers.clone());
    }

    // Apply manual server ordering
    if !settings.server_order.is_empty() {
        list = sort_servers_by_order(list, &settings.server_order);
    }

    list
}

struct CacheEntry {
    payload: Vec<u8>,
    timestamp_secs: u64,
}

static CACHED_PUBLIC_ENTRY: Mutex<Option<CacheEntry>> = Mutex::new(None);
const MICRO_CACHE_TTL_SECS: u64 = 3;

fn get_current_timestamp_secs() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

pub fn invalidate_public_cache() {
    if let Ok(mut g) = CACHED_PUBLIC_ENTRY.lock() {
        *g = None;
    }
}

/// Fetches public servers filtered by visibility and cached for up to 3 seconds (Anti-DoS).
/// When `force_refresh` is true, bypasses the micro-cache completely and re-queries live state.
pub fn fetch_public_servers_with_opt(force_refresh: bool) -> Vec<u8> {
    let now = get_current_timestamp_secs();

    // Check in-memory micro-cache only if not forcing refresh and wall-clock is functional (>0)
    if !force_refresh && now > 0 {
        if let Ok(g) = CACHED_PUBLIC_ENTRY.lock() {
            if let Some(ref entry) = *g {
                if now.saturating_sub(entry.timestamp_secs) < MICRO_CACHE_TTL_SECS {
                    return entry.payload.clone();
                }
            }
        }
    }

    let all = fetch_all_servers();
    let settings = get_settings();

    let mut list = Vec::new();
    let mut online_count = 0;

    for s in all {
        if s.blocked || settings.hidden_servers.contains(&s.id) {
            continue;
        }
        if s.status == "online" {
            online_count += 1;
        }
        list.push(s);
    }

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
        total_servers: list.len(),
        online_count,
        servers: list,
        timestamp: now as i64,
        refresh_interval: settings.refresh_interval,
        announcement,
    };

    let bytes = serde_json::to_vec(&resp).unwrap_or_default();
    if now > 0 {
        if let Ok(mut g) = CACHED_PUBLIC_ENTRY.lock() {
            *g = Some(CacheEntry {
                payload: bytes.clone(),
                timestamp_secs: now,
            });
        }
    }

    bytes
}

pub fn fetch_public_servers() -> Vec<u8> {
    fetch_public_servers_with_opt(false)
}
