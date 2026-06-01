# Výnimka Avast pre QuantumApp — spusti: npm run avast
$ErrorActionPreference = 'SilentlyContinue'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$AppDir = Join-Path $Root 'app'
$GameExe = Join-Path $AppDir 'RULETA.exe'

$paths = @($Root)
if (Test-Path $AppDir) { $paths += $AppDir }
if (Test-Path $GameExe) { $paths += $GameExe }

Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' RULETA — vylúčenie z Avast' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

try {
  foreach ($p in $paths) {
    Add-MpPreference -ExclusionPath $p -ErrorAction Stop
    Write-Host '[OK] Defender vylúčenie:' $p -ForegroundColor Green
  }
} catch {
  Write-Host '[--] Defender preskočený' -ForegroundColor DarkGray
}

Set-Clipboard -Value ($paths -join "`r`n")
Write-Host 'Cesty skopírované do schránky.' -ForegroundColor Green
Write-Host ''
Write-Host 'AVAST (menu v slovenčine):' -ForegroundColor White
Write-Host '1. Avast -> Nastavenia -> Všeobecné -> Výnimky'
Write-Host '2. Pridaj výnimku typu PRIEČINOK:'
Write-Host "   $Root" -ForegroundColor Cyan
Write-Host '3. Ulož. Reštartuj RULETA.'
Write-Host ''
Write-Host 'Spúšťaj len:  app\RULETA.exe' -ForegroundColor Yellow
Write-Host 'Nepoužívaj starý portable RULETA.exe v koreni!' -ForegroundColor Yellow
Write-Host ''

$avastUi = @(
  "${env:ProgramFiles}\Avast Software\Avast\AvastUI.exe",
  "${env:ProgramFiles(x86)}\Avast Software\Avast\AvastUI.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($avastUi) { Start-Process $avastUi }

Write-Host 'Hotovo.' -ForegroundColor Green
