@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo ============================================
echo   Deal or No Deal - local development
echo ============================================

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js not found. Install Node.js 20+ first.
  pause
  exit /b 1
)

if not exist node_modules (
  echo [1/2] Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
) else (
  echo [1/2] Dependencies already installed.
)

echo [2/2] Starting Vite dev server...
echo Open the URL printed below (usually http://localhost:5173).
call npm run dev
if errorlevel 1 (
  echo [ERROR] Dev server exited with an error.
  pause
  exit /b 1
)

endlocal
