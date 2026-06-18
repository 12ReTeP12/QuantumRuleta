# Nastavi Realtek ako predvoleny vystup + otvori zvukove nastavenia
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
[ComImport, Guid("870af99c-171d-4f9e-af0d-e63df40c2bc9")]
public class PolicyConfigClient { }
[Guid("f8679669-850a-4818-b5b2-13213948562d"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IPolicyConfig {
    void a(); void b(); void c(); void d();
    [PreserveSig] int SetDefaultEndpoint([MarshalAs(UnmanagedType.LPWStr)] string id, [MarshalAs(UnmanagedType.U4)] int role);
}
'@

$realtekId = '{0.0.0.00000000}.{fed7cfc8-79fa-4f0c-a6b7-6f078a4b0d0b}'
$pc = [System.Activator]::CreateInstance([PolicyConfigClient]) -as [IPolicyConfig]
if ($pc) {
    $pc.SetDefaultEndpoint($realtekId, 0) | Out-Null
    $pc.SetDefaultEndpoint($realtekId, 1) | Out-Null
    Write-Host "Predvoleny vystup: Reproduktory/Sluchadla (Realtek)"
} else {
    Write-Host "COM PolicyConfig nedostupny - vyber Realtek rucne."
}

Write-Host "`nAktualne zariadenia:"
Get-PnpDevice -Class AudioEndpoint -Status OK | ForEach-Object { Write-Host "  - $($_.FriendlyName)" }

$jack = Get-ItemProperty 'HKLM:\SOFTWARE\Realtek\Audio\GUI_INFORMATION\JackInfomation\Jack0' -EA SilentlyContinue
if ($jack -and [int]$jack.JackListCurrSelectIndex -eq 2) {
    Write-Host "`nRealtek DETEGUJE sluchadla v jacku (index 2)."
}

Start-Process 'mmsys.cpl'
Start-Process 'ms-settings:sound'

Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.MessageBox]::Show(
@'
DÔLEŽITÉ — Dell + Realtek:

1) V zozname NIE je samostatná položka „Slúchadlá“.
   Jack a repro používajú JEDEN výstup:
   „Reproduktory (Realtek(R) Audio)“.

2) Keď máš slúchadlá v jacku, zvuk ide do nich
   cez tento Realtek výstup (Realtek to prepína vnútorne).

3) NEVYBERAJ „DELL U2415“ — to je zvuk z MONITORA!

4) Vyber: Reproduktory (Realtek(R) Audio)

5) Ak stále nič nepočuješ vo slúchadlách:
   stiahni z dell.com ovládač Realtek Audio (setup.exe)
   a z Microsoft Store „Realtek Audio Console“.
'@,
'Zvuk — Realtek jack',
'OK',
'Information'
) | Out-Null
