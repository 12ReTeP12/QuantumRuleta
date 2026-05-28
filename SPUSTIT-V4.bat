@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo [V4] Sync index-NOVY-V4.html -^> index.html ...
node scripts\sync-v4.cjs
if errorlevel 1 exit /b 1
echo.
echo [V4] Spustam aktualny UI (npm start) ...
echo      V hornom riadku musi byt zeleny badge: ZIVY UI
echo.
npm start
