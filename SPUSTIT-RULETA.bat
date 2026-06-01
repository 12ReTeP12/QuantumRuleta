@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo [V2] Sync index-NOVY-V2.html -^> index.html ...
node scripts\sync-v2.cjs
if errorlevel 1 exit /b 1
echo.
echo Spustam Electron (V2 cez index.html) ...
echo.
call npx --yes electron .
