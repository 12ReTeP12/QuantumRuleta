# Realtek jack fix v2 — blizko rebootu, bez rozbicia JackStatus
param([switch]$Quiet)

function Test-IsAdmin {
    $p = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-IsAdmin)) {
    $vbs = Join-Path (Split-Path $PSScriptRoot -Parent) 'ELEVATE-JACK-REFRESH.vbs'
    Start-Process 'wscript.exe' -ArgumentList "`"$vbs`""
    exit 0
}

$Log = Join-Path $env:TEMP 'realtek-jack-refresh.log'
function Log([string]$m) {
    $line = "$(Get-Date -Format 'HH:mm:ss') $m"
    Add-Content -Path $Log -Value $line -Encoding UTF8
    if (-not $Quiet) { Write-Host $m }
}

Clear-Content $Log -EA SilentlyContinue
Log '=== Realtek jack fix v2 ==='

$rtkDev = 'INTELAUDIO\FUNC_01&VEN_10EC&DEV_0236&SUBSYS_10280979\5&25123425&0&0001'
$realtekEndpoint = '{0.0.0.00000000}.{fed7cfc8-79fa-4f0c-a6b7-6f078a4b0d0b}'

function Get-JackInfo {
    Get-ItemProperty 'HKLM:\SOFTWARE\Realtek\Audio\GUI_INFORMATION\JackInfomation\Jack0' -EA SilentlyContinue
}

$j0 = Get-JackInfo
if ($j0) { Log "Jack pred: index=$($j0.JackListCurrSelectIndex) status=$($j0.JackStatus)" }

# 1) Zastav len Waves (Dell jack) — NEmat RtkAudUService64 rucne!
$wavesRun = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run' -EA SilentlyContinue).WavesSvc
if ($wavesRun -match '"([^"]+WavesSvc64\.exe)"') {
    $wavesExe = $Matches[1]
    Log "Waves restart: $wavesExe -Jack"
    Get-Process WavesSvc64 -EA SilentlyContinue | Stop-Process -Force -EA SilentlyContinue
    Start-Sleep -Seconds 2
    Start-Process -FilePath $wavesExe -ArgumentList '-Jack' -WindowStyle Hidden
    Start-Sleep -Seconds 3
}

# 2) Re-enumeracia Realtek zvukovej karty (ako cast rebootu)
Log 'pnputil restart-device Realtek...'
$pn = pnputil /restart-device $rtkDev 2>&1 | Out-String
Log ($pn.Trim() -replace '\s+', ' ')
Start-Sleep -Seconds 5

# 3) Restart Realtek Universal Service (jeden proces cez sluzbu)
Log 'Restart RtkAudioUniversalService...'
Restart-Service RtkAudioUniversalService -Force -EA SilentlyContinue
Start-Sleep -Seconds 4

$j1 = Get-JackInfo
if ($j1) { Log "Jack po: index=$($j1.JackListCurrSelectIndex) status=$($j1.JackStatus)" }

# 4) Predvoleny vystup = Realtek (nie monitor DELL)
try {
    Add-Type -TypeDefinition @'
using System.Runtime.InteropServices;
[ComImport, Guid("870af99c-171d-4f9e-af0d-e63df40c2bc9")]
public class CPolicyConfigClient { }
[Guid("f8679669-850a-4818-b5b2-13213948562d"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IPolicyConfigVista {
    int n1(); int n2(); int n3(); int n4();
    [PreserveSig] int SetDefaultEndpoint([MarshalAs(UnmanagedType.LPWStr)] string id, int role);
}
'@ -ErrorAction Stop
    $cfg = [System.Activator]::CreateInstance([CPolicyConfigClient]) -as [IPolicyConfigVista]
    if ($cfg) {
        $cfg.SetDefaultEndpoint($realtekEndpoint, 0) | Out-Null
        $cfg.SetDefaultEndpoint($realtekEndpoint, 1) | Out-Null
        Log "Predvoleny vystup: Realtek ($realtekEndpoint)"
    }
} catch {
    Log "SetDefaultEndpoint: $_"
}

Log 'Vystupy:'
Get-PnpDevice -Class AudioEndpoint -Status OK | ForEach-Object { Log "  $($_.FriendlyName)" }

if (-not $Quiet) {
    Write-Host ''
    Write-Host '============================================'
    Write-Host ' HOTOVÉ — v taskbare VYBER:'
    Write-Host '  >> Reproduktory (Realtek(R) Audio) <<'
    Write-Host '  (NIE DELL U2415 — to je monitor!)'
    Write-Host ''
    Write-Host ' Samostatne Sluchadla v zozname NEBUDU —'
    Write-Host ' zvuk ide do jacku cez Realtek vystup.'
    Write-Host " Log: $Log"
    Write-Host '============================================'
    Start-Process 'ms-settings:sound'
}
