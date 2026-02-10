@echo off
echo Starting API server...
cd /d %~dp0api
set DOTENV_PATH=%~dp0api\.env.local.api
node server.cjs
pause




