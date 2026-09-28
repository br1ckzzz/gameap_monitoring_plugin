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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub map: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub players: Option<i32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_players: Option<i32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ping: Option<i32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub build_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub category: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub uptime_seconds: Option<u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub is_hidden_offline: Option<bool>,
}

/// Announcement payload for public monitoring banner.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnnouncementDTO {
    pub text: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub link: Option<String>,
    #[serde(default)]
    pub banner_type: String, // "info", "warning", "success"
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub deadline: Option<String>,
}

/// JSON payload returned by `/servers` endpoint.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitoringResponse {
    pub success: bool,
    pub total_servers: usize,
    pub online_count: usize,
    pub servers: Vec<PublicServerDTO>,
    pub timestamp: i64,
    #[serde(default = "default_refresh_interval")]
    pub refresh_interval: u32,
    #[serde(default)]
    pub announcement: Option<AnnouncementDTO>,
}

fn default_refresh_interval() -> u32 {
    15
}

fn default_title() -> String {
    "GameAP Servers".to_string()
}

fn default_subtitle() -> String {
    "Онлайн мониторинг игровых серверов".to_string()
}

fn default_theme() -> String {
    "dark".to_string()
}

/// Customizable plugin settings persisted in GameAP storage.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginSettings {
    #[serde(default = "default_title")]
    pub title: String,
    #[serde(default = "default_subtitle")]
    pub subtitle: String,
    #[serde(default = "default_theme")]
    pub theme: String, // "dark" or "light"
    #[serde(default = "default_refresh_interval")]
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
    #[serde(default)]
    pub bot_api_enabled: bool,
    #[serde(default)]
    pub bot_api_token: String,

    // 13.3 Announcement Bar
    #[serde(default)]
    pub announcement_enabled: bool,
    #[serde(default)]
    pub announcement_text: String,
    #[serde(default)]
    pub announcement_link: String,
    #[serde(default)]
    pub announcement_type: String, // "info", "warning", "success"
    #[serde(default)]
    pub announcement_deadline: String,

    // 13.5 Server Clusters / Categories
    #[serde(default, skip_serializing_if = "HashMap::is_empty")]
    pub server_categories: HashMap<u64, String>,

    // 13.7 Smart Auto-Hide Offline Servers
    #[serde(default)]
    pub auto_hide_offline: bool,
    #[serde(default)]
    pub auto_hide_offline_minutes: u32,

    // Click analytics persisted
    #[serde(default, skip_serializing_if = "HashMap::is_empty")]
    pub click_stats: HashMap<u64, u64>,

    // Admin UI accordion open/closed state persisted
    #[serde(default, skip_serializing_if = "HashMap::is_empty")]
    pub open_sections: HashMap<String, bool>,
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
            bot_api_enabled: false,
            bot_api_token: String::new(),
            announcement_enabled: false,
            announcement_text: String::new(),
            announcement_link: String::new(),
            announcement_type: "info".to_string(),
            announcement_deadline: String::new(),
            server_categories: HashMap::new(),
            auto_hide_offline: false,
            auto_hide_offline_minutes: 0,
            click_stats: HashMap::new(),
            open_sections: HashMap::new(),
        }
    }
}
