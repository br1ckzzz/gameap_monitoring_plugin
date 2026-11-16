//! Data Transfer Objects (DTO) and settings representations for GameAP WebMonitoring.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

fn default_true() -> bool {
    true
}

fn default_offline_status() -> String {
    "offline".to_string()
}

pub fn deserialize_bool_lenient<'de, D>(deserializer: D) -> Result<bool, D::Error>
where
    D: serde::Deserializer<'de>,
{
    use serde::de::Visitor;
    struct BoolVisitor;
    impl<'de> Visitor<'de> for BoolVisitor {
        type Value = bool;
        fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
            formatter.write_str("a boolean or integer 0/1")
        }
        fn visit_bool<E>(self, v: bool) -> Result<bool, E> {
            Ok(v)
        }
        fn visit_i64<E>(self, v: i64) -> Result<bool, E> {
            Ok(v != 0)
        }
        fn visit_u64<E>(self, v: u64) -> Result<bool, E> {
            Ok(v != 0)
        }
        fn visit_str<E>(self, v: &str) -> Result<bool, E> {
            Ok(v == "1" || v.eq_ignore_ascii_case("true"))
        }
        fn visit_none<E>(self) -> Result<bool, E> {
            Ok(false)
        }
        fn visit_unit<E>(self) -> Result<bool, E> {
            Ok(false)
        }
    }
    deserializer.deserialize_any(BoolVisitor)
}

pub fn deserialize_installed_lenient<'de, D>(deserializer: D) -> Result<bool, D::Error>
where
    D: serde::Deserializer<'de>,
{
    use serde::de::Visitor;
    struct InstalledVisitor;
    impl<'de> Visitor<'de> for InstalledVisitor {
        type Value = bool;
        fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
            formatter.write_str("a boolean or integer 0/1 for installed")
        }
        fn visit_bool<E>(self, v: bool) -> Result<bool, E> {
            Ok(v)
        }
        fn visit_i64<E>(self, v: i64) -> Result<bool, E> {
            Ok(v != 0)
        }
        fn visit_u64<E>(self, v: u64) -> Result<bool, E> {
            Ok(v != 0)
        }
        fn visit_str<E>(self, v: &str) -> Result<bool, E> {
            Ok(v == "1" || v.eq_ignore_ascii_case("true"))
        }
        fn visit_none<E>(self) -> Result<bool, E> {
            Ok(true)
        }
        fn visit_unit<E>(self) -> Result<bool, E> {
            Ok(true)
        }
    }
    deserializer.deserialize_any(InstalledVisitor)
}

/// Telemetry detailing GameAP host storage database persistence state.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct StorageDiagnostics {
    pub db_saved: bool,
    pub last_error: Option<String>,
    pub source: String, // "storage", "storage_recovered", "memory", "default"
    pub found: bool,
    pub payload_bytes: usize,
    pub key: String,
}

/// Safe, public server representation exposed to web visitors and Discord bots.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PublicServerDTO {
    #[serde(default)]
    pub id: u64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub node_id: Option<u64>,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub game_code: String,
    #[serde(default)]
    pub game_name: String,
    #[serde(default)]
    pub address: String,
    #[serde(default)]
    pub port: i32,
    #[serde(default = "default_offline_status")]
    pub status: String, // "online" or "offline"
    #[serde(default = "default_true", deserialize_with = "deserialize_installed_lenient")]
    pub installed: bool,
    #[serde(default, deserialize_with = "deserialize_bool_lenient")]
    pub blocked: bool,
    #[serde(default)]
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

/// Live query telemetry ingested from Companion Bot or external worker.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ServerTelemetryDTO {
    #[serde(default)]
    pub online: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub map: Option<String>,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        alias = "players_num",
        alias = "online_players",
        alias = "clients"
    )]
    pub players: Option<i32>,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        alias = "maxplayers",
        alias = "slots",
        alias = "max_clients",
        alias = "max_slots"
    )]
    pub max_players: Option<i32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ping: Option<i32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

/// Ingestion request payload for POST /servers/query-update.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct QueryTelemetryPayload {
    #[serde(default)]
    pub servers: HashMap<u64, ServerTelemetryDTO>,
}

/// Safe, public node representation exposed to web visitors and Discord bots.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NodeDTO {
    #[serde(default)]
    pub id: u64,
    #[serde(default)]
    pub name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub location: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cpu_model: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cpu_percent: Option<i32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ram_percent: Option<i32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub protection: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub os: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub gdaemon_host: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub gdaemon_port: Option<i32>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub ips: Vec<String>,
    #[serde(default = "default_true")]
    pub enabled: bool,
}

/// JSON payload returned by `/servers` endpoint.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitoringResponse {
    pub success: bool,
    pub total_servers: usize,
    pub online_count: usize,
    pub servers: Vec<PublicServerDTO>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub nodes: Vec<NodeDTO>,
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
    "modern".to_string()
}

/// Customizable plugin settings persisted in GameAP storage.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginSettings {
    #[serde(default = "default_title")]
    pub title: String,
    #[serde(default = "default_subtitle")]
    pub subtitle: String,
    #[serde(default = "default_theme")]
    pub theme: String, // "modern", "dark", or "light"
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
    #[serde(default, skip_serializing)]
    pub clear_bot_api_token: bool,

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
            theme: "modern".to_string(),
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
            clear_bot_api_token: false,
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_node_dto_serde_defaults() {
        let json = r#"{"id": 1, "name": "Node-Moscow"}"#;
        let node: NodeDTO = serde_json::from_str(json).expect("should deserialize NodeDTO");
        assert_eq!(node.id, 1);
        assert_eq!(node.name, "Node-Moscow");
        assert!(node.enabled); // default_true
        assert!(node.ips.is_empty());
        assert_eq!(node.location, None);
    }

    #[test]
    fn test_monitoring_response_nodes_omitted_when_empty() {
        let resp = MonitoringResponse {
            success: true,
            total_servers: 0,
            online_count: 0,
            servers: Vec::new(),
            nodes: Vec::new(),
            timestamp: 123456789,
            refresh_interval: 15,
            announcement: None,
        };
        let serialized = serde_json::to_string(&resp).expect("serialize");
        assert!(!serialized.contains("\"nodes\""));

        let deserialized: MonitoringResponse = serde_json::from_str(&serialized).expect("deserialize");
        assert!(deserialized.nodes.is_empty());
    }

    #[test]
    fn test_monitoring_response_nodes_serialized_when_present() {
        let node = NodeDTO {
            id: 2,
            name: "[RU] Moscow Core".to_string(),
            location: Some("Moscow, Russia".to_string()),
            provider: Some("Selectel".to_string()),
            cpu_model: Some("AMD Ryzen 9 7950X3D".to_string()),
            cpu_percent: Some(25),
            ram_percent: Some(40),
            protection: Some("DDoS-Guard".to_string()),
            os: Some("Linux".to_string()),
            gdaemon_host: Some("185.123.45.67".to_string()),
            gdaemon_port: Some(31717),
            ips: vec!["185.123.45.67".to_string()],
            enabled: true,
        };
        let resp = MonitoringResponse {
            success: true,
            total_servers: 0,
            online_count: 0,
            servers: Vec::new(),
            nodes: vec![node],
            timestamp: 123456789,
            refresh_interval: 15,
            announcement: None,
        };
        let serialized = serde_json::to_string(&resp).expect("serialize");
        assert!(serialized.contains("\"nodes\""));
        assert!(serialized.contains("Moscow Core"));

        let deserialized: MonitoringResponse = serde_json::from_str(&serialized).expect("deserialize");
        assert_eq!(deserialized.nodes.len(), 1);
        assert_eq!(deserialized.nodes[0].name, "[RU] Moscow Core");
        assert_eq!(deserialized.nodes[0].cpu_percent, Some(25));
    }

    #[test]
    fn test_server_telemetry_dto_aliases_and_zero_players() {
        let json = r#"{"online": true, "players": 0, "max_players": 16, "ping": 15}"#;
        let dto: ServerTelemetryDTO = serde_json::from_str(json).expect("should parse telemetry");
        assert!(dto.online);
        assert_eq!(dto.players, Some(0));
        assert_eq!(dto.max_players, Some(16));
        assert_eq!(dto.ping, Some(15));

        // Test with aliases (e.g. slots, players_num)
        let json_aliases = r#"{"online": true, "players_num": 3, "slots": 32}"#;
        let dto2: ServerTelemetryDTO = serde_json::from_str(json_aliases).expect("should parse aliases");
        assert_eq!(dto2.players, Some(3));
        assert_eq!(dto2.max_players, Some(32));
    }
}
