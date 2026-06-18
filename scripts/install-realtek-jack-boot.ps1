# Uloha pri STARTE Windows (nie len prihlaseni) — jack sync
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Start-Process powershell.exe -Verb RunAs -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-NoExit','-File',$PSCommandPath
    exit 0
}

$scriptPath = Join-Path $PSScriptRoot 'realtek-jack-refresh.ps1'
$taskName = 'RealtekJackFixAtStartup'

Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`" -Quiet"
$trigger = New-ScheduledTaskTrigger -AtStartup
$trigger.Delay = 'PT30S'
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 5)
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest -User 'SYSTEM' -Description 'Realtek+Waves jack fix 30s po starte Windows' | Out-Null

Write-Host "Uloha '$taskName' registrovana (30s po starte Windows, SYSTEM)."
Write-Host 'Spustam fix teraz...'
& $scriptPath
Read-Host 'Enter'
