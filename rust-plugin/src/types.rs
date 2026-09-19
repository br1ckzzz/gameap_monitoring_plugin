//! Data Transfer Objects (DTO) and settings representations for GameAP WebMonitoring.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Safe, public server representation exposed to web visitors and Discord bots.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PublicServerDTO {
    pub id: u64,
    pub name: String,
    pub game_code: String,
    pub game_name: String,
    pub address: String,
    pub port: i32,
    pub status: String, // "online" or "offline"
    pub installed: bool,
    pub blocked: bool,
    pub connect_url: String,
}

/// JSON payload returned by `/servers` endpoint.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitoringResponse {
    pub success: bool,
    pub total_servers: usize,
    pub online_count: usize,
    pub servers: Vec<PublicServerDTO>,
    pub timestamp: i64,
}

/// Customizable plugin settings persisted in GameAP storage.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginSettings {
    pub title: String,
    pub subtitle: String,
    pub theme: String, // "dark" or "light"
    pub refresh_interval: u32,
    #[serde(default)]
    pub custom_css: String,
    #[serde(default)]
    pub custom_header_html: String,
    #[serde(default)]
    pub hidden_servers: Vec<u64>,
    #[serde(default)]
    pub cached_servers: Vec<PublicServerDTO>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub address_key: Option<String>,
    #[serde(default, skip_serializing_if = "HashMap::is_empty")]
    pub server_address_overrides: HashMap<u64, String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub server_order: Vec<u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub logo_url: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub favicon_url: Option<String>,
}

impl Default for PluginSettings {
    fn default() -> Self {
        Self {
            title: "GameAP Servers".to_string(),
            subtitle: "Онлайн мониторинг игровых серверов".to_string(),
            theme: "dark".to_string(),
            refresh_interval: 15,
            custom_css: String::new(),
            custom_header_html: String::new(),
            hidden_servers: Vec::new(),
            cached_servers: Vec::new(),
            address_key: None,
            server_address_overrides: HashMap::new(),
            server_order: Vec::new(),
            logo_url: None,
            favicon_url: None,
        }
    }
}
