# EmuDevz Code Sync

A VS Code extension that lets you edit [EmuDevz](https://afska.github.io/emudevz) game code files directly in VS Code with live sync to the running game.

## How It Works

The extension connects to a running EmuDevz instance via Chrome DevTools Protocol (CDP) and calls the game's filesystem API (`window.FS`) directly. Edits in VS Code appear in-game instantly, and in-game changes sync back to VS Code within ~1 second.

## Setup

1. **Launch EmuDevz** with the debug flag:
   - Steam → EmuDevz → Properties → Launch Options: `--remote-debugging-port=9222`
   - Or run directly: `EmuDevz.exe --remote-debugging-port=9222`

2. **Install the extension** (from VSIX or marketplace)

3. **Connect**: Run command `EmuDevz: Connect` (or it auto-connects on startup)

4. **Edit**: The game's file tree appears as a workspace folder — edit and save normally

## Features

- Live bidirectional sync (VS Code ↔ game)
- Full filesystem operations (create, rename, delete files/folders)
- Auto-reconnect on connection loss
- Configurable polling interval for change detection
- Status bar showing connection state

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `emudevz.port` | `9222` | CDP port for connecting to EmuDevz |
| `emudevz.autoConnect` | `true` | Auto-connect when VS Code opens |
| `emudevz.syncPaths` | `["/code", "/docs", "/lib", "/roms", "/tmpl"]` | Paths to show from the game |
| `emudevz.pollInterval` | `1000` | Polling interval (ms) for detecting in-game changes |

## Development

```bash
npm install
npm run compile    # or: npm run watch
# Press F5 in VS Code to launch Extension Development Host
```

## License

MIT
