# Screenshot Capture Guide

All screenshots should be **1280×720 PNG** files. Use VS Code's Dark+ theme (default dark) for consistency.

## Prerequisites

1. Launch EmuDevz with debug port:
   ```
   "D:\SteamLibrary\steamapps\common\EmuDevz\EmuDevz.exe" --remote-debugging-port=9222
   ```
2. Run the extension in dev mode (F5) or install the VSIX
3. Connect to the game (`EmuDevz: Connect`)
4. Set `emudevz.verbose` to `true` in settings (for screenshot 3)

## Screenshot 1: file-explorer.png

**Shows:** The game file tree in VS Code with read-only decorations.

**Steps:**
1. Open the Explorer sidebar (Ctrl+Shift+E)
2. Expand "EmuDevz Game Files" workspace folder
3. Expand `/code` to show several .js files (cpu.js, ppu.js, etc.)
4. Keep `/docs` and `/lib` collapsed — their lock badges should be visible
5. Make sure no editor tab is stealing focus from the tree
6. Window size: maximize VS Code to fill 1280×720 area
7. Crop to exactly 1280×720 (no Windows taskbar, no title bar chrome)

**Key elements visible:**
- Explorer heading "EMUDEVZ GAME FILES"
- Expanded code directory with real files
- Lock badges (🔒) on /docs, /lib, /roms
- Sidebar width ~300px to show full file names

## Screenshot 2: live-editing.png

**Shows:** A code file open in the editor with the game running alongside.

**Steps:**
1. Open a game code file (e.g., `/code/cpu.js` or whichever has interesting content)
2. Position the game window visible in the background, or use a split-screen layout
3. The status bar should show "EmuDevz: Connected" (bottom-left area)
4. Have syntax highlighting visible (the file should have meaningful code)
5. Capture the full VS Code window at 1280×720

**Key elements visible:**
- Code in the editor with syntax highlighting
- File tab showing `cpu.js` (or similar)
- Status bar showing connected state
- Game visible (even partially) in background — or use VS Code as full window if game isn't easily positioned

**Alternative (if game can't be positioned):** Just show the editor with a code file open. The file tree in the sidebar showing the game origin is enough context.

## Screenshot 3: status-connected.png

**Shows:** The output channel with diagnostic logs and the status bar indicator.

**Steps:**
1. Open the Output panel (Ctrl+Shift+U)
2. Select "EmuDevz Sync" from the channel dropdown
3. Make sure there are several log lines visible:
   - "Connected to EmuDevz"
   - A few file operation debug lines (read/write paths)
   - Watcher scan lines
4. The status bar at the bottom should show the connected indicator
5. Capture at 1280×720

**Generating log lines:** With `emudevz.verbose: true`, open and close a few files in the explorer. Each action generates debug output.

**Key elements visible:**
- Output panel with "EmuDevz Sync" channel selected
- Timestamped log lines showing real operations
- Status bar connected indicator

## Cropping Tips

- **Windows:** Use Win+Shift+S (Snip & Sketch), select region at exactly 1280×720
- **Exact sizing:** Set VS Code window to 1280×720 with a tool like [Sizer](http://www.brianapps.net/sizer4/) or via PowerShell:
  ```powershell
  # Resize VS Code window to exact dimensions
  Add-Type @"
  using System; using System.Runtime.InteropServices;
  public class Win32 { [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr h, int x, int y, int w, int h2, bool r); }
  "@
  $vscode = (Get-Process Code | Select-Object -First 1).MainWindowHandle
  [Win32]::MoveWindow($vscode, 0, 0, 1280, 720, $true)
  ```
- **Or:** Take a larger screenshot and resize with `magick input.png -resize 1280x720! output.png`

## After Capture

Drop the PNGs here:
```
media/screenshots/file-explorer.png
media/screenshots/live-editing.png
media/screenshots/status-connected.png
```

Then run `npm run bundle` to verify nothing broke, and commit.
