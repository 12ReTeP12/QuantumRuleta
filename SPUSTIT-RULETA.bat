@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo [V4] Sync + spustenie (vzdy aktualny index.html) ...
node scripts\sync-v4.cjs
if errorlevel 1 exit /b 1
echo.
echo Hladaj zeleny badge ZIVY UI a koleso v strede.
echo.
call npx --yes electron .
