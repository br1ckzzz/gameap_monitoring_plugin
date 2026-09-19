//! Protobuf message definitions for GameAP Plugin ABI.
//!
//! Generated with pure `prost` derive macros to avoid external `protoc` dependencies.

use std::collections::HashMap;

// ===============================
// Events
// ===============================

pub const EVENT_TYPE_UNSPECIFIED: i32 = 0;
pub const EVENT_TYPE_SERVER_PRE_START: i32 = 100;
pub const EVENT_TYPE_SERVER_POST_START: i32 = 101;
pub const EVENT_TYPE_SERVER_PRE_STOP: i32 = 102;
pub const EVENT_TYPE_SERVER_POST_STOP: i32 = 103;
pub const EVENT_TYPE_SERVER_PRE_RESTART: i32 = 104;
pub const EVENT_TYPE_SERVER_POST_RESTART: i32 = 105;
pub const EVENT_TYPE_SERVER_CREATED: i32 = 120;
pub const EVENT_TYPE_SERVER_UPDATED: i32 = 121;
pub const EVENT_TYPE_SERVER_DELETED: i32 = 122;

#[derive(Clone, PartialEq, prost::Message)]
pub struct PluginContext {
    #[prost(string, tag = "1")]
    pub plugin_id: String,
    #[prost(string, tag = "2")]
    pub request_id: String,
    #[prost(uint64, optional, tag = "3")]
    pub user_id: Option<u64>,
    #[prost(string, repeated, tag = "4")]
    pub permissions: Vec<String>,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct ServerProto {
    #[prost(uint64, tag = "1")]
    pub id: u64,
    #[prost(string, tag = "2")]
    pub name: String,
    #[prost(string, tag = "3")]
    pub game_id: String,
    #[prost(string, tag = "4")]
    pub ip: String,
    #[prost(string, tag = "5")]
    pub server_ip: String,
    #[prost(int32, tag = "6")]
    pub server_port: i32,
    #[prost(int32, tag = "7")]
    pub query_port: i32,
    #[prost(int32, tag = "8")]
    pub rcon_port: i32,
    #[prost(string, tag = "9")]
    pub status: String,
    #[prost(int32, tag = "10")]
    pub installed: i32,
    #[prost(int32, tag = "11")]
    pub blocked: i32,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct ServerEventPayload {
    #[prost(message, optional, tag = "1")]
    pub server: Option<ServerProto>,
    #[prost(map = "string, string", tag = "2")]
    pub extra_data: HashMap<String, String>,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct Event {
    #[prost(int32, tag = "1")]
    pub r#type: i32,
    #[prost(message, optional, tag = "2")]
    pub context: Option<PluginContext>,
    #[prost(int64, tag = "3")]
    pub timestamp: i64,
    #[prost(message, optional, tag = "10")]
    pub server_event: Option<ServerEventPayload>,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct EventResult {
    #[prost(bool, tag = "1")]
    pub handled: bool,
    #[prost(bool, tag = "2")]
    pub should_cancel: bool,
    #[prost(string, optional, tag = "3")]
    pub message: Option<String>,
    #[prost(map = "string, string", tag = "4")]
    pub modified_data: HashMap<String, String>,
}

// ===============================
// Plugin Lifecycle & Metadata
// ===============================

#[derive(Clone, PartialEq, prost::Message)]
pub struct Result {
    #[prost(bool, tag = "1")]
    pub success: bool,
    #[prost(string, optional, tag = "2")]
    pub error: Option<String>,
    #[prost(string, optional, tag = "3")]
    pub error_code: Option<String>,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct PluginInfo {
    #[prost(string, tag = "1")]
    pub id: String,
    #[prost(string, tag = "2")]
    pub name: String,
    #[prost(string, tag = "3")]
    pub version: String,
    #[prost(string, tag = "4")]
    pub description: String,
    #[prost(string, tag = "5")]
    pub author: String,
    #[prost(string, tag = "6")]
    pub license: String,
    #[prost(string, tag = "7")]
    pub homepage: String,
    #[prost(string, repeated, tag = "8")]
    pub required_permissions: Vec<String>,
    #[prost(string, tag = "9")]
    pub api_version: String,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct GetInfoRequest {}

#[derive(Clone, PartialEq, prost::Message)]
pub struct InitializeRequest {
    #[prost(message, optional, tag = "1")]
    pub context: Option<PluginContext>,
    #[prost(map = "string, string", tag = "2")]
    pub config: HashMap<String, String>,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct InitializeResponse {
    #[prost(message, optional, tag = "1")]
    pub result: Option<Result>,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct ShutdownRequest {
    #[prost(message, optional, tag = "1")]
    pub context: Option<PluginContext>,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct ShutdownResponse {
    #[prost(message, optional, tag = "1")]
    pub result: Option<Result>,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct GetSubscribedEventsRequest {}

#[derive(Clone, PartialEq, prost::Message)]
pub struct GetSubscribedEventsResponse {
    #[prost(int32, repeated, tag = "1")]
    pub events: Vec<i32>,
}

// ===============================
// HTTP & Frontend Assets
// ===============================

#[derive(Clone, PartialEq, prost::Message)]
pub struct HttpRoute {
    #[prost(string, tag = "1")]
    pub path: String,
    #[prost(string, repeated, tag = "2")]
    pub methods: Vec<String>,
    #[prost(bool, tag = "3")]
    pub requires_auth: bool,
    #[prost(bool, tag = "4")]
    pub admin_only: bool,
    #[prost(string, tag = "5")]
    pub description: String,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct GetHttpRoutesRequest {}

#[derive(Clone, PartialEq, prost::Message)]
pub struct GetHttpRoutesResponse {
    #[prost(message, repeated, tag = "1")]
    pub routes: Vec<HttpRoute>,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct HttpRequest {
    #[prost(string, tag = "1")]
    pub path: String,
    #[prost(string, tag = "2")]
    pub method: String,
    #[prost(map = "string, string", tag = "3")]
    pub headers: HashMap<String, String>,
    #[prost(map = "string, string", tag = "4")]
    pub query_params: HashMap<String, String>,
    #[prost(bytes = "vec", tag = "5")]
    pub body: Vec<u8>,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct HttpResponse {
    #[prost(uint32, tag = "1")]
    pub status_code: u32,
    #[prost(map = "string, string", tag = "2")]
    pub headers: HashMap<String, String>,
    #[prost(bytes = "vec", tag = "3")]
    pub body: Vec<u8>,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct GetFrontendBundleRequest {}

#[derive(Clone, PartialEq, prost::Message)]
pub struct GetFrontendBundleResponse {
    #[prost(bool, tag = "1")]
    pub has_bundle: bool,
    #[prost(bytes = "vec", tag = "2")]
    pub bundle: Vec<u8>,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct AssetFile {
    #[prost(string, tag = "1")]
    pub path: String,
    #[prost(bytes = "vec", tag = "2")]
    pub content: Vec<u8>,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct GetAssetsRequest {}

#[derive(Clone, PartialEq, prost::Message)]
pub struct GetAssetsResponse {
    #[prost(message, repeated, tag = "1")]
    pub frontend_files: Vec<AssetFile>,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct ServerAbility {
    #[prost(string, tag = "1")]
    pub name: String,
    #[prost(string, tag = "2")]
    pub description: String,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct GetServerAbilitiesRequest {}

#[derive(Clone, PartialEq, prost::Message)]
pub struct GetServerAbilitiesResponse {
    #[prost(message, repeated, tag = "1")]
    pub abilities: Vec<ServerAbility>,
}
