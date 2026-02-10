# 启动后端 API 服务器
$ErrorActionPreference = "Continue"

Write-Host "Starting API server..." -ForegroundColor Green
Write-Host "Working directory: $PSScriptRoot\api" -ForegroundColor Yellow

# 切换到 api 目录
Set-Location "$PSScriptRoot\api"

# 设置环境变量路径
$env:DOTENV_PATH = "$PSScriptRoot\api\.env.local.api"

# 检查环境文件是否存在
if (-not (Test-Path "$env:DOTENV_PATH")) {
    Write-Host "ERROR: Environment file not found at $env:DOTENV_PATH" -ForegroundColor Red
    Write-Host "Please create .env.local.api file in the api directory" -ForegroundColor Yellow
    exit 1
}

Write-Host "Environment file found: $env:DOTENV_PATH" -ForegroundColor Green

# 启动服务器
Write-Host "Starting server on port 8787..." -ForegroundColor Cyan
node server.cjs
