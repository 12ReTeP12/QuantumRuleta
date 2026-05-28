@echo off
chcp 65001 >nul
cd /d "%~dp0.."
echo Mazem stare build priečinky (spust po reštarte PC ak bol zamknuty)...
for /d %%D in (dist-* .build-* *-ZMaz-*) do (
  if exist "%%D" (
    echo   %%D
    rd /s /q "%%D" 2>nul
  )
)
echo Hotovo. V koreni ma byt len RULETA.exe + HTML + scripts + node_modules.
pause
