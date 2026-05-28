# Vytvorí odkaz RULETA na ploche (ako VS Code / Cursor)
$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$GameExe = Join-Path $Root 'app\RULETA.exe'
$WorkDir = Join-Path $Root 'app'

if (-not (Test-Path $GameExe)) {
  Write-Host ''
  Write-Host 'CHYBA: Nenajdena hra app\RULETA.exe' -ForegroundColor Red
  Write-Host 'Najprv spust v QuantumApp:  npm run dist' -ForegroundColor Yellow
  Write-Host ''
  exit 1
}

$Desktop = [Environment]::GetFolderPath('Desktop')
$LnkName = 'RULETA.lnk'
$LnkPath = Join-Path $Desktop $LnkName

$Wsh = New-Object -ComObject WScript.Shell
$Sc = $Wsh.CreateShortcut($LnkPath)
$Sc.TargetPath = $GameExe
$Sc.WorkingDirectory = $WorkDir
$Sc.Description = 'Kvantova ruleta PRO V4'
$Sc.IconLocation = "$GameExe,0"
$Sc.Save()

Write-Host ''
Write-Host 'Hotovo — na ploche je odkaz:' -ForegroundColor Green
Write-Host "  $LnkPath" -ForegroundColor Cyan
Write-Host ''
Write-Host 'Spustenie: dvojklik RULETA na ploche (rovnake ako app\RULETA.exe).' -ForegroundColor White
Write-Host ''
