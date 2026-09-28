# Multi-stage Docker build for GameAP WebMonitoring WASM Plugin (Rust wasm32-wasip1)
FROM rust:alpine AS builder

WORKDIR /src

# Install git and required dependencies
RUN apk add --no-cache git

# Add WASI target
RUN rustup target add wasm32-wasip1

# Copy frontend and rust crate files
COPY frontend/ ./frontend/
COPY rust-plugin/ ./rust-plugin/

# Sync frontend assets into rust-plugin
RUN mkdir -p rust-plugin/assets && cp -rf frontend/* rust-plugin/assets/

WORKDIR /src/rust-plugin

# Compile Rust crate to WebAssembly
RUN cargo build --target wasm32-wasip1 --release

FROM scratch AS artifact
COPY --from=builder /src/rust-plugin/target/wasm32-wasip1/release/gameap_web_monitoring.wasm /web_monitoring.wasm
