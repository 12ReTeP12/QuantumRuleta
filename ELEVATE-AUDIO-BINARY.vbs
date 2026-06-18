Set sh = CreateObject("Shell.Application")
root = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
ps1 = root & "\scripts\fix-audio-binary-name.ps1"
sh.ShellExecute "powershell.exe", "-NoProfile -ExecutionPolicy Bypass -NoExit -File """ & ps1 & """", root, "runas", 1
