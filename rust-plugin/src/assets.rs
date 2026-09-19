//! Embedded frontend assets compiled directly into the WASM binary.
//!
//! Replaces runtime disk reads with zero-copy binary static slices.

pub const INDEX_HTML: &[u8] = include_bytes!("../../frontend/index.html");
pub const STYLES_CSS: &[u8] = include_bytes!("../../frontend/styles.css");
pub const APP_JS: &[u8] = include_bytes!("../../frontend/app.js");
pub const ADMIN_BUNDLE_JS: &[u8] = include_bytes!("../../frontend/admin_bundle.js");

/// Represents an asset file contributed to GameAP static routes.
pub struct AssetFile {
    pub path: &'static str,
    pub content: &'static [u8],
}

/// Returns the collection of static assets exposed to web visitors.
pub fn get_frontend_assets() -> [AssetFile; 3] {
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
    ]
}
