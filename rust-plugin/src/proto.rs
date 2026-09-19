//! Protobuf message definitions for GameAP Plugin ABI.
//!
//! Handcrafted pure `prost` message definitions with EXACT wire tags
//! matching official GameAP protobuf specifications.

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
pub struct AnyProto {
    #[prost(string, tag = "1")]
    pub type_url: String,
    #[prost(bytes = "vec", tag = "2")]
    pub value: Vec<u8>,
}

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
    pub uuid: String,
    #[prost(string, tag = "3")]
    pub uuid_short: String,
    #[prost(bool, tag = "4")]
    pub enabled: bool,
    #[prost(int32, tag = "5")]
    pub installed: i32,
    #[prost(bool, tag = "6")]
    pub blocked: bool,
    #[prost(string, tag = "7")]
    pub name: String,
    #[prost(string, tag = "8")]
    pub game_id: String,
    #[prost(uint64, tag = "9")]
    pub ds_id: u64,
    #[prost(uint64, tag = "10")]
    pub game_mod_id: u64,
    #[prost(string, tag = "12")]
    pub server_ip: String,
    #[prost(int32, tag = "13")]
    pub server_port: i32,
    #[prost(int32, optional, tag = "14")]
    pub query_port: Option<i32>,
    #[prost(int32, optional, tag = "15")]
    pub rcon_port: Option<i32>,
    #[prost(bool, tag = "26")]
    pub process_active: bool,
    #[prost(string, optional, tag = "28")]
    pub vars: Option<String>,
    #[prost(map = "string, message", tag = "32")]
    pub metadata: HashMap<String, AnyProto>,
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
pub struct QueryParamValues {
    #[prost(string, repeated, tag = "1")]
    pub values: Vec<String>,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct HttpRequest {
    #[prost(message, optional, tag = "1")]
    pub context: Option<PluginContext>,
    #[prost(string, tag = "2")]
    pub method: String,
    #[prost(string, tag = "3")]
    pub path: String,
    #[prost(map = "string, string", tag = "4")]
    pub headers: HashMap<String, String>,
    #[prost(map = "string, string", tag = "5")]
    pub path_params: HashMap<String, String>,
    #[prost(map = "string, message", tag = "6")]
    pub query_params: HashMap<String, QueryParamValues>,
    #[prost(bytes = "vec", tag = "9")]
    pub body: Vec<u8>,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct HttpResponse {
    #[prost(int32, tag = "1")]
    pub status_code: i32,
    #[prost(map = "string, string", tag = "2")]
    pub headers: HashMap<String, String>,
    #[prost(bytes = "vec", tag = "3")]
    pub body: Vec<u8>,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct GetFrontendBundleRequest {}

#[derive(Clone, PartialEq, prost::Message)]
pub struct GetFrontendBundleResponse {
    #[prost(bytes = "vec", tag = "1")]
    pub bundle: Vec<u8>,
    #[prost(bool, tag = "2")]
    pub has_bundle: bool,
    #[prost(bytes = "vec", tag = "3")]
    pub styles: Vec<u8>,
    #[prost(bool, tag = "4")]
    pub has_styles: bool,
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
    pub i18n_files: Vec<AssetFile>,
    #[prost(message, repeated, tag = "2")]
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

// ===============================
// Host SDK Services
// ===============================

// gameap-storage
#[derive(Clone, PartialEq, prost::Message)]
pub struct StorageGetRequest {
    #[prost(string, tag = "1")]
    pub key: String,
    #[prost(int32, optional, tag = "2")]
    pub entity_type: Option<i32>,
    #[prost(uint64, optional, tag = "3")]
    pub entity_id: Option<u64>,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct StorageGetResponse {
    #[prost(bytes = "vec", optional, tag = "1")]
    pub payload: Option<Vec<u8>>,
    #[prost(bool, tag = "2")]
    pub found: bool,
    #[prost(string, optional, tag = "3")]
    pub error: Option<String>,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct StorageSetRequest {
    #[prost(string, tag = "1")]
    pub key: String,
    #[prost(int32, optional, tag = "2")]
    pub entity_type: Option<i32>,
    #[prost(uint64, optional, tag = "3")]
    pub entity_id: Option<u64>,
    #[prost(bytes = "vec", tag = "4")]
    pub payload: Vec<u8>,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct StorageSetResponse {
    #[prost(bool, tag = "1")]
    pub success: bool,
    #[prost(string, optional, tag = "2")]
    pub error: Option<String>,
}

// gameap-servers
#[derive(Clone, PartialEq, prost::Message)]
pub struct FindServersRequest {}

#[derive(Clone, PartialEq, prost::Message)]
pub struct FindServersResponse {
    #[prost(message, repeated, tag = "1")]
    pub servers: Vec<ServerProto>,
    #[prost(int32, tag = "2")]
    pub total: i32,
}

// gameap-games
#[derive(Clone, PartialEq, prost::Message)]
pub struct GameProto {
    #[prost(string, tag = "1")]
    pub code: String,
    #[prost(string, tag = "2")]
    pub name: String,
    #[prost(string, tag = "3")]
    pub engine: String,
    #[prost(string, tag = "4")]
    pub engine_version: String,
    #[prost(bool, tag = "10")]
    pub enabled: bool,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct FindGamesRequest {}

#[derive(Clone, PartialEq, prost::Message)]
pub struct FindGamesResponse {
    #[prost(message, repeated, tag = "1")]
    pub games: Vec<GameProto>,
    #[prost(int32, tag = "2")]
    pub total: i32,
}
