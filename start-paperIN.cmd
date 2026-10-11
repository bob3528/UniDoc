@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22 LTS or newer first, then run this file again.
  pause
  exit /b 1
)
if not exist node_modules (
  call npm ci
  if errorlevel 1 goto :failed
)
call npm run build
if errorlevel 1 goto :failed
for /f "delims=" %%U in ('node --import tsx scripts/start-url.ts') do start "" "%%U"
call npm start
if errorlevel 1 goto :failed
exit /b 0
:failed
echo paperIN could not start. Read the error above and README.md.
pause
exit /b 1
