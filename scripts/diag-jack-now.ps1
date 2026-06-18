Write-Host "=== Jack ==="
Get-ItemProperty 'HKLM:\SOFTWARE\Realtek\Audio\GUI_INFORMATION\JackInfomation\Jack0' -EA SilentlyContinue | Format-List *
Write-Host "=== JackPlug HKCU ==="
Get-ItemProperty 'HKCU:\Software\Realtek\Audio\RtkAudUService\JackPlug' -EA SilentlyContinue | Format-List *
Write-Host "=== Services ==="
Get-Service RtkAudioUniversalService,Audiosrv | Format-Table Name,Status -AutoSize
Get-Process RtkAudUService64,WavesSvc64 -EA SilentlyContinue | Format-Table Name,Id -AutoSize
Write-Host "=== All AudioEndpoint ==="
Get-PnpDevice -Class AudioEndpoint | Format-Table FriendlyName,Status,InstanceId -Wrap
Write-Host "=== Realtek PnP ==="
Get-PnpDevice | Where-Object { $_.FriendlyName -like '*Realtek*' } | Format-Table FriendlyName,Status,InstanceId -Wrap
Write-Host "=== Waves registry ==="
Get-ChildItem 'HKLM:\SOFTWARE\Waves' -Recurse -Depth 3 -EA SilentlyContinue | Select-Object -First 15 PSPath
Write-Host "=== Last refresh log ==="
$log = Join-Path $env:TEMP 'realtek-jack-refresh.log'
if (Test-Path $log) { Get-Content $log -Tail 20 }
