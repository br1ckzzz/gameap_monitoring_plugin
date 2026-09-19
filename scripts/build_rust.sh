#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
RUST_DIR="$ROOT_DIR/rust-plugin"
TARGET="wasm32-wasip1"

echo "=========================================="
echo " Building GameAP WebMonitoring (RUST WASM)"
echo "=========================================="

if command -v cargo &> /dev/null; then
    cd "$RUST_DIR"
    echo "-> Compiling Rust crate to $TARGET (Release mode)..."
    cargo build --target "$TARGET" --release

    ARTIFACT="$RUST_DIR/target/$TARGET/release/gameap_web_monitoring.wasm"
    OUTPUT="$ROOT_DIR/web_monitoring.wasm"

    if [ -f "$ARTIFACT" ]; then
        if command -v wasm-opt &> /dev/null; then
            echo "-> Optimizing with wasm-opt -Oz..."
            wasm-opt -Oz "$ARTIFACT" -o "$OUTPUT"
        else
            cp "$ARTIFACT" "$OUTPUT"
        fi

        echo "Build successful! Output: $OUTPUT"
    fi
elif command -v docker &> /dev/null; then
    echo "-> Local Cargo not detected. Compiling inside rust:alpine container..."
    # Future Docker builder support
    echo "Docker builder will be executed when ready."
else
    echo "Error: Neither 'cargo' nor 'docker' is installed."
    echo "Please install Rust (https://rustup.rs) with target $TARGET."
    exit 1
fi
