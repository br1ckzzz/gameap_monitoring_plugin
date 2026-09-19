use std::path::PathBuf;

fn main() {
    let proto_dir = PathBuf::from("proto");
    
    let protos = [
        proto_dir.join("plugin/proto/plugin.proto"),
        proto_dir.join("plugin/sdk/servers/servers.proto"),
        proto_dir.join("plugin/sdk/storage/storage.proto"),
        proto_dir.join("plugin/sdk/games/games.proto"),
        proto_dir.join("plugin/sdk/log/log.proto"),
        proto_dir.join("proto/server.proto"),
        proto_dir.join("proto/game.proto"),
    ];

    let mut config = prost_build::Config::new();
    config.default_package_filename("gameap_proto");
    
    // Only compile if proto files exist
    let existing_protos: Vec<PathBuf> = protos
        .iter()
        .filter(|p| p.exists())
        .cloned()
        .collect();

    if !existing_protos.is_empty() {
        if let Err(err) = config.compile_protos(&existing_protos, &[proto_dir]) {
            println!("cargo:warning=Failed to compile proto files: {err}");
        }
    }

    // Re-run if proto directory or frontend assets change
    println!("cargo:rerun-if-changed=proto");
    println!("cargo:rerun-if-changed=../frontend");
}
