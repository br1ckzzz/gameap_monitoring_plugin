# Multi-stage Docker build for GameAP WebMonitoring WASM Plugin
FROM golang:1.23-alpine AS builder

WORKDIR /src

# Install git and build tools
RUN apk add --no-cache git make

# Copy go module definitions
COPY plugin/go.mod plugin/go.sum ./plugin/
WORKDIR /src/plugin

# Copy source code and frontend assets
WORKDIR /src
COPY frontend/ ./frontend/
COPY plugin/ ./plugin/
RUN mkdir -p ./plugin/assets && cp -r ./frontend/* ./plugin/assets/

WORKDIR /src/plugin

# Compile Go code to WebAssembly WASI target
ENV GOOS=wasip1
ENV GOARCH=wasm

RUN go build -buildmode=c-shared -trimpath -ldflags="-s -w" -o /out/web_monitoring.wasm .

FROM scratch AS artifact
COPY --from=builder /out/web_monitoring.wasm /web_monitoring.wasm
