# Read MMDevices render properties (form factor, name)
$renderPath = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\MMDevices\Audio\Render'
$formFactors = @{
    0 = 'Unknown'
    1 = 'Speakers'
    3 = 'LineOut'
    4 = 'Headphones'
    5 = 'Headset'
    6 = 'Handset'
    7 = 'Microphone'
    8 = 'HeadsetNoMic'
    9 = 'Speakers'
    10 = 'Headphones'
    11 = 'Headset'
}

Get-ChildItem $renderPath -EA SilentlyContinue | ForEach-Object {
    $guid = $_.PSChildName
    $devPath = Join-Path $_.PSPath 'Properties'
    $props = @{}
    if (Test-Path $devPath) {
        Get-ChildItem $devPath -EA SilentlyContinue | ForEach-Object {
            $p = Get-ItemProperty $_.PSPath -EA SilentlyContinue
            $props[$_.PSChildName] = $p
        }
    }
    $base = Get-ItemProperty $_.PSPath -EA SilentlyContinue
    $name = $base.'{a45f254e-df1c-4efd-8020-67d146a850e0},2'
    if (-not $name) { $name = $base.'{a45c254e-df1c-4efd-8020-67d146a850e0},2' }
    $state = $base.'{f19f064d-0829-4bc6-9928-8c8b2a2b1a2b},7'
    $def = $base.'{f19f064d-0829-4bc6-9928-8c8b2a2b1a2b},7'

    # Form factor key {b3f8fa53-0004-438e-9003-51a46e139bfc},6
    $ffKey = '{b3f8fa53-0004-438e-9003-51a46e139bfc},6'
    $ff = $null
    $propSub = Join-Path $devPath $ffKey
    if (Test-Path $propSub) {
        $ff = (Get-ItemProperty $propSub -EA SilentlyContinue).$ffKey
    }

    [PSCustomObject]@{
        Name = $name
        Guid = $guid.Substring(0,8) + '...'
        Active = if ($state -eq 1) { 'YES' } else { 'no' }
        FormFactor = if ($null -ne $ff -and $formFactors[$ff]) { "$ff=$($formFactors[$ff])" } elseif ($null -ne $ff) { $ff } else { '?' }
    }
} | Format-Table -AutoSize

Write-Host "`nJack0 EndpointId from Realtek:"
(Get-ItemProperty 'HKLM:\SOFTWARE\Realtek\Audio\GUI_INFORMATION\JackInfomation\Jack0' -EA SilentlyContinue).EndpointId

Write-Host "`nRealtek service path:"
Get-ChildItem 'C:\WINDOWS\System32\DriverStore\FileRepository' -Filter 'RtkAudUService64.exe' -Recurse -EA SilentlyContinue |
  Select-Object -First 3 FullName

Write-Host "`nAppx Realtek:"
Get-AppxPackage -Name '*Realtek*' -EA SilentlyContinue | Select-Object Name, Version
