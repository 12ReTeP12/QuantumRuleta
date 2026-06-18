@echo off
chcp 65001 >nul
title QuantumApp - zaloha na GitHub
cd /d "%~dp0"

echo.
echo === ZALOHA NA GITHUB ===
echo.

git add .
git -c user.email="12ReTeP12@users.noreply.github.com" -c user.name="12ReTeP12" commit -m "Zaloha %date% %time%"
if errorlevel 1 (
  echo Nic nove na ulozenie - skusam push existujuceho stavu...
)

git push origin master
if errorlevel 1 (
  echo.
  echo PUSH zlyhal - prihlas sa tokenom ^(heslo uctu nie^).
  echo GitHub - Settings - Developer settings - Personal access tokens
  echo.
  pause
  exit /b 1
)

echo.
echo HOTOVО - zaloha je na GitHub: 12ReTeP12/QuantumRuleta
echo.
pause
