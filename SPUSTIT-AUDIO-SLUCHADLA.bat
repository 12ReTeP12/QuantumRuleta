@echo off
chcp 65001 >nul
title Sluchadla Realtek — oprava bez restartu PC
cd /d "%~dp0"
echo.
echo ==========================================
echo  SLUCHADLA — oprava (bez restartu PC)
echo ==========================================
echo.
echo 1) Potvrd UAC (Spustit ako spravca)
echo 2) Po ~20 s v taskbare VYBER:
echo    ^>^> Sluchadla (Realtek(R) Audio) ^<^<
echo    NIE DELL U2415 (monitor)
echo    NIE Reproduktory (vstavane)
echo.
start "" wscript.exe "%~dp0ELEVATE-JACK-REFRESH.vbs"
echo.
echo AUTOMAT po kazdom starte Windows (raz, admin):
echo   scripts\install-realtek-jack-boot.ps1
echo.
pause
