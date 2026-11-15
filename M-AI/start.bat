@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22 or newer is required.
  echo Install Node.js, then run this file again.
  pause
  exit /b 1
)

if not exist config.json (
  copy config.example.json config.json >nul
  echo Created config.json. Review it before connecting.
)

if not exist node_modules (
  echo Installing M-AI dependencies...
  call npm install
  if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)

call npm start
pause
