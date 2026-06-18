Get-Service *Rtk*,*Realtek* -EA SilentlyContinue | Format-Table Name,DisplayName,Status,StartType -AutoSize
Get-CimInstance Win32_Service | Where-Object { $_.Name -like '*Rtk*' -or $_.DisplayName -like '*Realtek*' } | Select Name,DisplayName,State,StartMode,PathName
Get-Process *Rtk* -EA SilentlyContinue | Select Name,Id,Path
Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run' -EA SilentlyContinue | Format-List
Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -EA SilentlyContinue | Format-List
