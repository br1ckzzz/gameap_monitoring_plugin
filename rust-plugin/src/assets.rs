//! Embedded assets compiled directly into the WASM binary.
//!
//! Autonomous self-contained assets with zero runtime disk reads.

pub const INDEX_HTML: &[u8] = include_bytes!("../assets/index.html");
pub const STYLES_CSS: &[u8] = include_bytes!("../assets/styles.css");
pub const APP_JS: &[u8] = include_bytes!("../assets/app.js");
pub const ADMIN_BUNDLE_JS: &[u8] = include_bytes!("../assets/admin_bundle.js");
pub const ICON_PNG: &[u8] = include_bytes!("../assets/icon.png");

/// Represents an asset file contributed to GameAP static routes.
pub struct AssetFile {
    pub path: &'static str,
    pub content: &'static [u8],
}

/// Returns the collection of static assets exposed to web visitors.
pub fn get_frontend_assets() -> [AssetFile; 4] {
    [
        AssetFile {
            path: "plugins/web-monitoring/index.html",
            content: INDEX_HTML,
        },
        AssetFile {
            path: "plugins/web-monitoring/styles.css",
            content: STYLES_CSS,
        },
        AssetFile {
            path: "plugins/web-monitoring/app.js",
            content: APP_JS,
        },
        AssetFile {
            path: "plugins/web-monitoring/icon.png",
            content: ICON_PNG,
        },
    ]
}
