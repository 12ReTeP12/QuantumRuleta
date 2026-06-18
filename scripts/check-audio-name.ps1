Get-PnpDevice -Class AudioEndpoint -Status OK | Select-Object FriendlyName
$jack = Get-ItemProperty 'HKLM:\SOFTWARE\Realtek\Audio\GUI_INFORMATION\JackInfomation\Jack0' -EA SilentlyContinue
Write-Host "Jack index:" $jack.JackListCurrSelectIndex
$p = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\MMDevices\Audio\Render\{fed7cfc8-79fa-4f0c-a6b7-6f078a4b0d0b}\Properties\{a45c254e-df1c-4efd-8020-67d146a850e0},2'
if (Test-Path $p) {
    $v = (Get-ItemProperty $p -EA SilentlyContinue).'{a45c254e-df1c-4efd-8020-67d146a850e0},2'
    Write-Host "Registry name:" $v
} else {
    Write-Host "Registry name path: not accessible"
}
