//! Client for querying GameAP host services (servers, games) via WebAssembly imports.

use crate::abi::{deallocate, read_proto, unpack_ptr_size, write_bytes};
use crate::address::{resolve_server_address, sort_servers_by_order};
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
        "cstrike" | "csgo" | "cs2" | "rust" | "tf2" | "valheim" | "ark" | "left4dead2" | "garrysmod"
    )
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
    }
}

/// Fetches all servers from GameAP host, matching game names and applying settings.
pub fn fetch_all_servers() -> Vec<PublicServerDTO> {
    let raw_servers: Vec<ServerProto> = call_host::<FindServersRequest, FindServersResponse>(
        &FindServersRequest {},
        host_find_servers,
    )
    .map(|r| r.servers)
    .unwrap_or_default();

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

    // Fallback to cached_servers if host returned empty list
    if list.is_empty() && !settings.cached_servers.is_empty() {
        list.extend(settings.cached_servers.clone());
    }

    // Apply manual server ordering
    if !settings.server_order.is_empty() {
        list = sort_servers_by_order(list, &settings.server_order);
    }

    list
}

static CACHED_PUBLIC_BYTES: Mutex<Option<Vec<u8>>> = Mutex::new(None);

pub fn invalidate_public_cache() {
    if let Ok(mut g) = CACHED_PUBLIC_BYTES.lock() {
        *g = None;
    }
}

/// Fetches public servers filtered by visibility and cached for 4 seconds (Anti-DoS).
pub fn fetch_public_servers() -> Vec<u8> {
    // Check in-memory micro-cache
    if let Ok(g) = CACHED_PUBLIC_BYTES.lock() {
        if let Some(ref bytes) = *g {
            return bytes.clone();
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

    let resp = MonitoringResponse {
        success: true,
        total_servers: list.len(),
        online_count,
        servers: list,
        timestamp: 0,
    };

    let bytes = serde_json::to_vec(&resp).unwrap_or_default();
    if let Ok(mut g) = CACHED_PUBLIC_BYTES.lock() {
        *g = Some(bytes.clone());
    }

    bytes
}
