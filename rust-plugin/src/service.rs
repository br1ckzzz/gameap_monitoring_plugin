//! Core GameAP WebMonitoring Plugin Service business logic.

use crate::assets::{get_frontend_assets, ADMIN_BUNDLE_JS};

pub const PLUGIN_VERSION: &str = "1.0.5";

/// Plugin metadata descriptor for GameAP.
pub struct PluginInfoDescriptor {
    pub id: &'static str,
    pub name: &'static str,
    pub version: &'static str,
    pub description: &'static str,
    pub author: &'static str,
    pub api_version: &'static str,
    pub required_permissions: &'static [&'static str],
}

pub const PLUGIN_INFO: PluginInfoDescriptor = PluginInfoDescriptor {
    id: "monitoring",
    name: "GameAP WebMonitoring",
    version: PLUGIN_VERSION,
    description: "Публичная страница для отображения работающих серверов",
    author: "GameAP Community",
    api_version: "1",
    required_permissions: &["listen_events"],
};

/// Route definition exposed to GameAP HTTP routing subsystem.
pub struct HTTPRouteDescriptor {
    pub path: &'static str,
    pub methods: &'static [&'static str],
    pub requires_auth: bool,
    pub admin_only: bool,
    pub description: &'static str,
}

pub const HTTP_ROUTES: &[HTTPRouteDescriptor] = &[
    HTTPRouteDescriptor {
        path: "/",
        methods: &["GET", "POST"],
        requires_auth: false,
        admin_only: false,
        description: "Canonical short public monitoring route (/api/plugins/monitoring)",
    },
    HTTPRouteDescriptor {
        path: "/servers",
        methods: &["GET"],
        requires_auth: false,
        admin_only: false,
        description: "Get public list of active servers",
    },
    HTTPRouteDescriptor {
        path: "/view",
        methods: &["GET"],
        requires_auth: false,
        admin_only: false,
        description: "Public web monitoring page (legacy compatibility alias)",
    },
    HTTPRouteDescriptor {
        path: "/settings",
        methods: &["GET", "POST"],
        requires_auth: false,
        admin_only: false,
        description: "Web monitoring settings and customization",
    },
    HTTPRouteDescriptor {
        path: "/diagnostic",
        methods: &["GET"],
        requires_auth: false,
        admin_only: false,
        description: "Diagnostic information about host GameAP services",
    },
];

/// Returns admin SPA bundle bytes.
pub fn get_admin_bundle() -> &'static [u8] {
    ADMIN_BUNDLE_JS
}

/// Returns static frontend assets.
pub fn get_assets_list() -> [crate::assets::AssetFile; 3] {
    get_frontend_assets()
}
