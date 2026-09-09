Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "d:\sharief\smart-board"
WshShell.Run "cmd /c npm run electron:dev", 0, False
