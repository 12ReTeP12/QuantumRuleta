# Read-only Realtek audio diagnostics (no admin)
Write-Host "=== Realtek Jack0 ==="
$p = 'HKLM:\SOFTWARE\Realtek\Audio\GUI_INFORMATION\JackInfomation\Jack0'
if (Test-Path $p) { Get-ItemProperty $p | Format-List * }

Write-Host "=== RtkAudUService General ==="
$p2 = 'HKLM:\SOFTWARE\Realtek\Audio\RtkAudUService\General'
if (Test-Path $p2) { Get-ItemProperty $p2 | Format-List * }

Write-Host "=== RtkAudUService Others ==="
$p3 = 'HKLM:\SOFTWARE\Realtek\Audio\RtkAudUService\Others'
if (Test-Path $p3) { Get-ItemProperty $p3 | Format-List * }

Write-Host "=== Render endpoints ==="
$renderPath = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\MMDevices\Audio\Render'
Get-ChildItem $renderPath -EA SilentlyContinue | ForEach-Object {
    $props = Get-ItemProperty $_.PSPath -EA SilentlyContinue
    $name = $props.'{a45c254e-df1c-4efd-8020-67d146a850e0},2'
    if ($name) { Write-Host $name }
}

Write-Host "`n=== Realtek/Dell audio apps ==="
$apps = @(
    "${env:ProgramFiles}\Realtek\Audio\HDA\RtkNGUI64.exe",
    "${env:ProgramFiles}\Realtek\Audio\HDA\RAVCpl64.exe",
    "${env:ProgramFiles(x86)}\Realtek\Audio\HDA\RtkNGUI64.exe",
    "${env:ProgramFiles}\Dell\DellOptimizer\DellOptimizer.exe",
    "${env:ProgramFiles}\Waves\MaxxAudio\WavesSvc64.exe"
)
foreach ($a in $apps) { if (Test-Path $a) { Write-Host "FOUND: $a" } else { Write-Host "missing: $a" } }

Write-Host "`n=== Driver ==="
Get-CimInstance Win32_PnPSignedDriver | Where-Object { $_.DeviceName -like '*Realtek*Audio*' } |
  Select-Object DeviceName, DriverVersion, InfName | Format-List
