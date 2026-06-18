# Admin: dump MMDevices property format + test write
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-NoExit','-File',$PSCommandPath
    exit
}

$Render = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\MMDevices\Audio\Render'
$SpGuid = '{fed7cfc8-79fa-4f0c-a6b7-6f078a4b0d0b}'
$NameKey = '{a45c254e-df1c-4efd-8020-67d146a850e0},2'
$path = Join-Path $Render "$SpGuid\Properties\$NameKey"

Write-Host "Path: $path"
Write-Host "Exists:" (Test-Path $path)

if (Test-Path $path) {
    $item = Get-ItemProperty -LiteralPath $path
    $def = $item.'(default)'
    Write-Host "Default type:" $def.GetType().FullName
    Write-Host "Default value:" $def
    if ($def -is [byte[]]) {
        Write-Host "Bytes:" ([BitConverter]::ToString($def))
    }
}

# Try PROPVARIANT-style UTF-16 for device name (VT_LPWSTR = 0x1F)
function Set-MmDeviceName {
    param([string]$Guid, [string]$Label)
    $propPath = Join-Path $Render "$Guid\Properties\$NameKey"
    if (-not (Test-Path $propPath)) { New-Item -Path $propPath -Force | Out-Null }
    $utf = [System.Text.Encoding]::Unicode.GetBytes($Label + [char]0)
    $bytes = [byte[]](0x1f,0,0,0,0,0,0,0,0,0,0,0) + $utf
    Set-ItemProperty -LiteralPath $propPath -Name '(Default)' -Value $bytes -Type Binary -Force
    Write-Host "Written binary name for $Guid : $Label"
}

Set-MmDeviceName -Guid $SpGuid -Label 'Sluchadla (Realtek(R) Audio)'

Restart-Service AudioEndpointBuilder -Force
Restart-Service Audiosrv -Force
Start-Sleep 3

Write-Host "`nPnP:"
Get-PnpDevice -Class AudioEndpoint | Select FriendlyName, Status
