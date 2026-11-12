import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const userProfile = process.env.USERPROFILE || 'C:\\Users\\gotlu';
const targetExe = 'D:\\sharief\\smart-board\\release-v4\\win-unpacked\\ThunderBoard v4.exe';

const desktopLocations = [
  path.join(userProfile, 'OneDrive', 'Desktop'),
  path.join(userProfile, 'Desktop'),
  'C:\\Users\\Public\\Desktop'
];

let scriptBody = `$WshShell = New-Object -ComObject WScript.Shell\n`;

desktopLocations.forEach((desktopDir) => {
  if (fs.existsSync(desktopDir)) {
    const shortcutPath = path.join(desktopDir, 'ThunderBoard v4.lnk');
    scriptBody += `
$Shortcut = $WshShell.CreateShortcut("${shortcutPath.replace(/\\/g, '\\\\')}")
$Shortcut.TargetPath = "${targetExe.replace(/\\/g, '\\\\')}"
$Shortcut.WorkingDirectory = "D:\\\\sharief\\\\smart-board\\\\release-v4\\\\win-unpacked"
$Shortcut.Description = "ThunderBoard v4 - Digital Teaching Whiteboard & Code Canvas"
$Shortcut.Save()
Write-Host "Created shortcut at ${shortcutPath.replace(/\\/g, '\\\\')}"
`;
  }
});

fs.writeFileSync('create-shortcut.ps1', scriptBody, 'utf8');
execSync('powershell -ExecutionPolicy Bypass -File create-shortcut.ps1', { stdio: 'inherit' });
fs.unlinkSync('create-shortcut.ps1');
