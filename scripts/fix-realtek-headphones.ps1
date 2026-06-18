# Realtek jack -> Sluchadla v zozname Windows (vyzaduje admin)
param([switch]$Watch, [int]$WatchSeconds = 0)

function Test-IsAdmin {
    $p = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-IsAdmin)) {
    $vbs = Join-Path (Split-Path $PSScriptRoot -Parent) 'ELEVATE-AUDIO-FIX.vbs'
    if (Test-Path $vbs) { Start-Process 'wscript.exe' -ArgumentList "`"$vbs`""; exit 0 }
    Start-Process powershell.exe -Verb RunAs -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-NoExit','-File',$PSCommandPath)
    exit 0
}

$ErrorActionPreference = 'Continue'
$LogFile = Join-Path $env:TEMP 'realtek-audio-fix.log'
$Render = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\MMDevices\Audio\Render'
$HpGuid = '{3b0bed20-757e-4707-b394-f2a2f1727f3c}'
$SpGuid = '{fed7cfc8-79fa-4f0c-a6b7-6f078a4b0d0b}'
$NameKey = '{a45c254e-df1c-4efd-8020-67d146a850e0},2'
$StateKey = '{f19f064d-0829-4bc6-9928-8c8b2a2b1a2b},7'
$FormKey = '{b3f8fa53-0004-438e-9003-51a46e139bfc},6'

function Write-Log([string]$Msg) {
    $line = "$(Get-Date -Format 'HH:mm:ss') $Msg"
    Add-Content -Path $LogFile -Value $line -Encoding UTF8
    Write-Host $Msg
}

function Get-JackMode {
    $j = Get-ItemProperty 'HKLM:\SOFTWARE\Realtek\Audio\GUI_INFORMATION\JackInfomation\Jack0' -EA SilentlyContinue
    if (-not $j) { return 'unknown' }
    $idx = [int]$j.JackListCurrSelectIndex
    if ($idx -eq 2) { return 'headphones' }
    if ($idx -eq 0) { return 'speakers' }
    if ($idx -gt 0) { return 'headphones' }
    return 'speakers'
}

function Set-EndpointProp {
    param([string]$Guid, [string]$PropSubKey, [object]$Value, [string]$Type = 'String')
    $path = Join-Path $Render "$Guid\Properties\$PropSubKey"
    $dir = Split-Path $path -Parent
    if (-not (Test-Path $dir)) { New-Item -Path $dir -Force | Out-Null }
    if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
    Set-ItemProperty -LiteralPath $path -Name '(Default)' -Value $Value -Type $Type -Force
}

function Get-EndpointProp {
    param([string]$Guid, [string]$PropSubKey)
    $path = Join-Path $Render "$Guid\Properties\$PropSubKey"
    if (-not (Test-Path $path)) { return $null }
    return (Get-ItemProperty -LiteralPath $path -EA SilentlyContinue).'(default)'
}

function Apply-JackFix {
    param([string]$Mode)

    if ($Mode -eq 'headphones') {
        $label = 'Sluchadla (Realtek(R) Audio)'
        $activeGuid = $HpGuid
        $idleGuid = $SpGuid
        $form = 4
    } else {
        $label = 'Reproduktory (Realtek(R) Audio)'
        $activeGuid = $SpGuid
        $idleGuid = $HpGuid
        $form = 9
    }

    Write-Log "Rezim: $Mode -> $label"

    # 1) Premenuj oba endpointy (Realtek ma 2 GUID v registry)
    Set-EndpointProp -Guid $HpGuid -PropSubKey $NameKey -Value 'Sluchadla (Realtek(R) Audio)' -Type String
    Set-EndpointProp -Guid $SpGuid -PropSubKey $NameKey -Value 'Reproduktory (Realtek(R) Audio)' -Type String

    # 2) Aktivny endpoint = ten co Realtek pouziva pri jacku
    Set-EndpointProp -Guid $activeGuid -PropSubKey $StateKey -Value 1 -Type DWord
    Set-EndpointProp -Guid $activeGuid -PropSubKey $FormKey -Value $form -Type DWord
    Set-EndpointProp -Guid $activeGuid -PropSubKey $NameKey -Value $label -Type String

    # 3) Druhy endpoint skry (NOTPRESENT) - Windows ukaze jeden spravny nazov
    Set-EndpointProp -Guid $idleGuid -PropSubKey $StateKey -Value 4 -Type DWord

    Write-Log "State HP=$($HpGuid.Substring(1,8)):$((Get-EndpointProp $HpGuid $StateKey)) SP=$($SpGuid.Substring(1,8)):$((Get-EndpointProp $SpGuid $StateKey))"
}

function Restart-Audio {
    Restart-Service AudioEndpointBuilder -Force -EA SilentlyContinue
    Restart-Service Audiosrv -Force -EA SilentlyContinue
    Start-Sleep -Seconds 3
}

function Set-DefaultRealtek {
    # Nastav Realtek (aktivny jack endpoint) ako predvoleny playback
    $mode = Get-JackMode
    $guid = if ($mode -eq 'headphones') { $HpGuid.Trim('{}') } else { $SpGuid.Trim('{}') }
    $id = "{0.0.0.00000000}.{$guid}"
    try {
        $policy = [audio]::PolicyConfig
    } catch {
        Add-Type -TypeDefinition @'
using System.Runtime.InteropServices;
[Guid("870af99c-171d-4f9e-af0d-e63df40c2bc9")]
public class PolicyConfigClient { }
[Guid("f8679669-850a-4818-b5b2-13213948562d"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IPolicyConfig {
    void unused(); void unused2(); void unused3(); void unused4();
    [PreserveSig] int SetDefaultEndpoint([MarshalAs(UnmanagedType.LPWStr)] string deviceId, [MarshalAs(UnmanagedType.U4)] int role);
}
public static class Audio {
    public static IPolicyConfig PolicyConfig {
        get { return (IPolicyConfig)new PolicyConfigClient(); }
    }
}
'@ -ErrorAction SilentlyContinue
    }
    try {
        [Audio]::PolicyConfig.SetDefaultEndpoint($id, 0) | Out-Null  # eConsole
        [Audio]::PolicyConfig.SetDefaultEndpoint($id, 1) | Out-Null  # eMultimedia
        Write-Log "Predvoleny vystup nastaveny: $id"
    } catch {
        Write-Log "SetDefaultEndpoint skip: $_"
    }
}

Clear-Content $LogFile -EA SilentlyContinue
Write-Log '=== Realtek jack fix (admin) ==='
$mode = Get-JackMode
Write-Log "Jack index mode: $mode"
Apply-JackFix -Mode $mode
Restart-Audio
Set-DefaultRealtek

Write-Log '--- Vystupy po oprave ---'
Get-PnpDevice -Class AudioEndpoint | ForEach-Object { Write-Log "$($_.Status) $($_.FriendlyName)" }

Write-Host ''
Write-Host '========================================'
Write-Host ' HOTOVO. V taskbare klikni na ZVUK.'
Write-Host ' Mal by si vidiet: Sluchadla (Realtek(R) Audio)'
Write-Host ' NIE DELL U2415 (monitor)!'
Write-Host " Log: $LogFile"
Write-Host '========================================'
Write-Host ''

if ($Watch -or $WatchSeconds -gt 0) {
    $sec = if ($WatchSeconds -gt 0) { $WatchSeconds } else { 4 }
    $last = $mode
    while ($true) {
        Start-Sleep -Seconds $sec
        $m = Get-JackMode
        if ($m -ne $last -and $m -ne 'unknown') {
            Apply-JackFix -Mode $m
            Restart-Audio
            Set-DefaultRealtek
            $last = $m
            Write-Log "Jack zmena -> $m"
        }
    }
}
