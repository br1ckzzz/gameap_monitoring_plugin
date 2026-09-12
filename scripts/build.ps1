# PowerShell build script for GameAP WebMonitoring Plugin
$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $PSScriptRoot
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Building GameAP WebMonitoring WASM Plugin" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Sync assets
Write-Host "-> Syncing and bundling frontend assets..." -ForegroundColor Yellow
$AssetsDir = Join-Path $RootDir "plugin\assets"
if (-not (Test-Path $AssetsDir)) {
    New-Item -ItemType Directory -Path $AssetsDir -Force | Out-Null
}
# Keep assets clean and external (CSP in GameAP blocks inline scripts)
Copy-Item (Join-Path $RootDir "frontend\*") $AssetsDir -Force

# 2. Check for Go
$goCmd = Get-Command go -ErrorAction SilentlyContinue
if (-not $goCmd -and (Test-Path "C:\Program Files\Go\bin\go.exe")) {
    $goCmd = "C:\Program Files\Go\bin\go.exe"
}

if ($goCmd) {
    Write-Host "-> Compiling Go to wasip1/wasm using $goCmd..." -ForegroundColor Green
    Push-Location (Join-Path $RootDir "plugin")
    $env:GOOS = "wasip1"
    $env:GOARCH = "wasm"
    & $goCmd build -buildmode=c-shared -trimpath -ldflags="-s -w" -o (Join-Path $RootDir "web_monitoring.wasm") .
    Pop-Location
    Write-Host "[OK] Build successful: $RootDir\web_monitoring.wasm" -ForegroundColor Green
}
elseif (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "-> Go not found locally, compiling with Docker..." -ForegroundColor Yellow
    Push-Location $RootDir
    docker build -t gameap-web-monitoring-builder -f Dockerfile .
    $containerId = docker create gameap-web-monitoring-builder
    docker cp "${containerId}:/web_monitoring.wasm" (Join-Path $RootDir "web_monitoring.wasm")
    docker rm $containerId
    Pop-Location
    Write-Host "[OK] Build successful via Docker: $RootDir\web_monitoring.wasm" -ForegroundColor Green
}
else {
    Write-Host "[ERROR] Neither 'go' nor 'docker' is installed in your PATH." -ForegroundColor Red
    Write-Host "You can install Go with: winget install GoLang.Go" -ForegroundColor Yellow
    exit 1
}
