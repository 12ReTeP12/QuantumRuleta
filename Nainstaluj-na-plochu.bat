@echo off
chcp 65001 >nul
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\nainstaluj-odkaz-na-plochu.ps1"
echo.
pause
