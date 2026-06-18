# Diagnostika zvukových výstupov Windows
Write-Host "=== PnP audio zariadenia ==="
Get-PnpDevice -Class Media,AudioEndpoint -Status OK -ErrorAction SilentlyContinue |
  Select-Object FriendlyName, Class, Status |
  Format-Table -AutoSize

Write-Host "`n=== Sound devices (CIM) ==="
Get-CimInstance Win32_SoundDevice -ErrorAction SilentlyContinue |
  Select-Object Name, Status, Manufacturer |
  Format-Table -AutoSize

Write-Host "`n=== Audio render endpoints (registry friendly names) ==="
$renderPath = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\MMDevices\Audio\Render'
if (Test-Path $renderPath) {
  Get-ChildItem $renderPath | ForEach-Object {
    $props = Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue
    $name = $props.'{a45c254e-df1c-4efd-8020-67d146a850e0},2'
    if ($name) {
      $def = $props.'{f19f064d-0829-4bc6-9928-8c8b2a2b1a2b},7'
      [PSCustomObject]@{
        Name = $name
        Default = if ($def -eq 1) { 'YES' } else { '' }
        Id = $_.PSChildName.Substring(0, 8) + '...'
      }
    }
  } | Format-Table -AutoSize
}

Write-Host "`n=== PowerShell Audio (AudioDeviceCmdlets module) ==="
if (Get-Module -ListAvailable -Name AudioDeviceCmdlets) {
  Import-Module AudioDeviceCmdlets -ErrorAction SilentlyContinue
  Get-AudioDevice -List | Format-Table -AutoSize
  Write-Host "Default playback:" (Get-AudioDevice -Playback).Name
} else {
  Write-Host "Modul AudioDeviceCmdlets nie je nainstalovaný (voliteľné)."
}

Write-Host "`n=== Poznámka ==="
Write-Host "Na Dell/Realtek je normalne ze vystup sa vola 'Reproduktory' aj pri sluchadlach v 3.5mm jacku."
Write-Host "Realtek prepina vnutorne; Windows nemusi zmenit nazov na 'Sluchadla'."
