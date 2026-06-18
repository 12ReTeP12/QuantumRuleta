# Hlboka diagnostika Realtek + vsetky audio endpointy (enabled/disabled)
Write-Host "=== Jack0 ==="
Get-ItemProperty 'HKLM:\SOFTWARE\Realtek\Audio\GUI_INFORMATION\JackInfomation\Jack0' -EA SilentlyContinue | Format-List JackStatus,JackListCurrSelectIndex,JackListName,EndpointId

Write-Host "=== Vsetky AudioEndpoint (OK + Error + Unknown) ==="
Get-PnpDevice -Class AudioEndpoint | Select-Object FriendlyName, Status, InstanceId | Format-Table -Wrap

Write-Host "=== Render GUIDs v registry ==="
$render = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\MMDevices\Audio\Render'
Get-ChildItem $render -EA SilentlyContinue | ForEach-Object {
    $guid = $_.PSChildName
    $nameKey = Join-Path $_.PSPath "Properties\{a45c254e-df1c-4efd-8020-67d146a850e0},2"
    $name = $null
    if (Test-Path $nameKey) {
        $name = (Get-ItemProperty -LiteralPath $nameKey -EA SilentlyContinue).'(default)'
    }
    $stateKey = Join-Path $_.PSPath 'Properties\{f19f064d-0829-4bc6-9928-8c8b2a2b1a2b},7'
    $state = $null
    if (Test-Path $stateKey) {
        $state = (Get-ItemProperty -LiteralPath $stateKey -EA SilentlyContinue).'(default)'
    }
    [PSCustomObject]@{ Guid = $guid.Substring(0,13)+'...'; Name = $name; State = $state }
} | Format-Table -Wrap

Write-Host "=== Fix log ==="
$log = Join-Path $env:TEMP 'realtek-audio-fix.log'
if (Test-Path $log) { Get-Content $log -Tail 15 } else { Write-Host '(log neexistuje - admin fix este nebehal)' }

Write-Host "=== Realtek INF / multi-stream kluce ==="
Get-ChildItem 'HKLM:\SOFTWARE\Realtek\Audio' -Recurse -EA SilentlyContinue |
  Where-Object { $_.PSChildName -match 'Multi|Jack|Stream|Separate|Panel' } |
  Select-Object -First 30 PSPath
