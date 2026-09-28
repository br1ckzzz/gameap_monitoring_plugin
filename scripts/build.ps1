# ==========================================================
# Build GameAP WebMonitoring WASM Plugin (Rust wasm32-wasip1)
# ==========================================================
$ErrorActionPreference = "Stop"

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ROOT_DIR = Split-Path -Parent $SCRIPT_DIR
$RUST_DIR = Join-Path $ROOT_DIR "rust-plugin"
$TARGET = "wasm32-wasip1"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Building GameAP WebMonitoring (RUST WASM)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$CARGO_CMD = "cargo"
if (-not (Get-Command "cargo" -ErrorAction SilentlyContinue)) {
    $USER_CARGO = Join-Path $env:USERPROFILE ".cargo\bin\cargo.exe"
    if (Test-Path $USER_CARGO) {
        $CARGO_CMD = $USER_CARGO
    }
}
$FRONTEND_DIR = Join-Path $ROOT_DIR "frontend"
$ASSETS_DIR = Join-Path $RUST_DIR "assets"
if (Test-Path $FRONTEND_DIR) {
    Copy-Item -Path (Join-Path $FRONTEND_DIR "*") -Destination $ASSETS_DIR -Recurse -Force
    $ASSETS_RS = Join-Path $RUST_DIR "src\assets.rs"
    if (Test-Path $ASSETS_RS) {
        (Get-Item $ASSETS_RS).LastWriteTime = Get-Date
    }
}

if (Get-Command $CARGO_CMD -ErrorAction SilentlyContinue) {
    Push-Location $RUST_DIR
    try {
        Write-Host "-> Compiling Rust crate to $TARGET (Release mode)..." -ForegroundColor Yellow

        $TOOLCHAIN_ARGS = @()
        if (Get-Command "rustup" -ErrorAction SilentlyContinue) {
            $installedToolchains = rustup toolchain list
            if ($installedToolchains -match "stable-x86_64-pc-windows-gnu") {
                $TOOLCHAIN_ARGS = @("+stable-x86_64-pc-windows-gnu")
            }
        }

        & $CARGO_CMD @TOOLCHAIN_ARGS build --target $TARGET --release
        if ($LASTEXITCODE -ne 0) {
            throw "Cargo build failed with exit code $LASTEXITCODE"
        }

        $ARTIFACT = Join-Path $RUST_DIR "target\$TARGET\release\gameap_web_monitoring.wasm"
        $OUTPUT = Join-Path $ROOT_DIR "web_monitoring.wasm"

        if (Test-Path $ARTIFACT) {
            if (Get-Command "wasm-opt" -ErrorAction SilentlyContinue) {
                Write-Host "-> Optimizing with wasm-opt -Oz..." -ForegroundColor Yellow
                wasm-opt -Oz $ARTIFACT -o $OUTPUT
            } else {
                Copy-Item -Path $ARTIFACT -Destination $OUTPUT -Force
            }

            Write-Host ("Build successful! Output: {0}" -f $OUTPUT) -ForegroundColor Green
        }
    } finally {
        Pop-Location
    }
} elseif (Get-Command "docker" -ErrorAction SilentlyContinue) {
    Write-Host "-> Local Cargo not detected. Compiling inside rust:alpine container..." -ForegroundColor Yellow
    # Future Docker builder support
    Write-Host "Docker builder will be executed when ready."
} else {
    Write-Host "Neither 'cargo' nor 'docker' found. Install Rust (https://rustup.rs) with target $TARGET." -ForegroundColor Red
}
