#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo " Building GameAP WebMonitoring WASM Plugin"
echo "=========================================="

# 1. Sync frontend to plugin assets
echo "-> Syncing frontend assets..."
mkdir -p "$ROOT_DIR/plugin/assets"
cp -r "$ROOT_DIR/frontend/"* "$ROOT_DIR/plugin/assets/"

# 2. Build WASM
cd "$ROOT_DIR/plugin"
echo "-> Compiling Go to wasip1/wasm..."

if command -v go &> /dev/null; then
    GOOS=wasip1 GOARCH=wasm go build -buildmode=c-shared -trimpath -ldflags="-s -w" -o "$ROOT_DIR/web_monitoring.wasm" .
    echo "✓ Build successful: $ROOT_DIR/web_monitoring.wasm"
elif command -v docker &> /dev/null; then
    echo "-> Go not found locally, compiling with Docker..."
    cd "$ROOT_DIR"
    docker build -t gameap-web-monitoring-builder -f Dockerfile .
    CONTAINER_ID=$(docker create gameap-web-monitoring-builder)
    docker cp "$CONTAINER_ID:/web_monitoring.wasm" "$ROOT_DIR/web_monitoring.wasm"
    docker rm "$CONTAINER_ID"
    echo "✓ Build successful via Docker: $ROOT_DIR/web_monitoring.wasm"
else
    echo "❌ Error: Neither 'go' nor 'docker' is installed."
    echo "Please install Go (https://go.dev) or Docker to compile the WASM plugin."
    exit 1
fi
