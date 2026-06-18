# Instalacia ulohy pri prihlaseni: prepina Reproduktory <-> Sluchadla podla jacku
# Vyzaduje raz spustit ako admin

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Start-Process powershell.exe -Verb RunAs -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File',$PSCommandPath
    exit 0
}

$scriptPath = Join-Path $PSScriptRoot 'fix-realtek-headphones.ps1'
$taskName = 'QuantumApp-RealtekJackLabel'

Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`" -WatchSeconds 5"
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest -Description 'Realtek jack: Sluchadla/Reproduktory label' | Out-Null

& $scriptPath
Write-Host "Uloha $taskName registrovana (pri prihlaseni + fix teraz)."
Write-Host "Log: $env:TEMP\realtek-audio-fix.log"
Read-Host 'Enter'
