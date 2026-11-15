@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22 or newer is required.
  pause
  exit /b 1
)

for /f "tokens=1 delims=." %%V in ('node -p "process.versions.node"') do set NODE_MAJOR=%%V
if %NODE_MAJOR% LSS 22 (
  echo Node.js 22 or newer is required. Current version:
  node --version
  pause
  exit /b 1
)

if not exist config.json (
  copy config.example.json config.json >nul
  echo Created config.json from config.example.json.
)

echo.
echo Starting the M-AI local bridge and chat brain...
echo Keep both terminal windows open while playing Minecraft.
echo Ollama must be running with the model configured in config.json.
echo.

start "M-AI Bridge" /D "%~dp0" cmd /k node src\bridge-server.js
timeout /t 2 /nobreak >nul
start "M-AI Chat Brain" /D "%~dp0" cmd /k node src\bridge-brain.js

echo Started. You can now launch Minecraft Java 26.3 with the M-AI Fabric mod.
echo Send a normal message in Minecraft chat to talk to M-AI.
pause
