# UX & Publishing Recommendations

## Core Principle

> The extension must be **invisible when working** and **unmistakably clear when broken**.

Users hire this extension for one job: "Use my full VS Code setup to write emulator code faster without fighting the in-game editor." Every design decision flows from this.

---

## Immediate Actions (Pre-Publish)

### 1. Onboarding Walkthrough

Add a `contributes.walkthroughs` entry that guides first-time users through:
1. "Launch EmuDevz with debug port" — explain the Steam launch option
2. "Connect to the game" — trigger the connect command
3. "Edit your first file" — open a file from the game

This is the #1 UX pattern VS Code recommends for new extension onboarding.

### 2. Connection UX (Critical Path)

Based on Bitburner's #1 complaint (connection failures), we must nail this:

- **Status bar states:** 
  - `$(vm-running) EmuDevz` — connected (green, no extra text needed)
  - `$(sync~spin) EmuDevz: Connecting...` — attempting
  - `$(debug-disconnect) EmuDevz` — disconnected (click to connect)
  - `$(warning) EmuDevz: Reconnecting (3)...` — auto-reconnecting
- **Never show a modal for connection failure** — use a single notification with "Retry" action
- **Auto-reconnect is already implemented** — good. Make sure it's silent (no notification per attempt)
- **Only notify on final failure** (after all retries exhausted)

### 3. First-Connection Experience

When connecting for the first time (no cached file tree):
- Show a brief information message: "Connected to EmuDevz! Game files are in the Explorer."
- Don't show this on subsequent auto-reconnects

### 4. Suppress Noisy Notifications

Current behavior shows notifications for connect/disconnect. Change to:
- **Connect:** Only show on first manual connect (not auto-reconnect)
- **Disconnect:** Only show if user explicitly disconnected (not on connection loss)
- **Reconnecting:** Silent — status bar only
- **Error:** Only show after exhausting retries

### 5. Icon & Branding

- Need a 256×256 PNG icon (no SVG allowed on marketplace)
- Use a game controller / sync symbol mashup 
- Gallery banner: dark theme, color matching the game's retro aesthetic

### 6. Bundling

Add esbuild bundling before publish. The marketplace warns about unbundled extensions:
```json
"scripts": {
  "vscode:prepublish": "npm run bundle",
  "bundle": "esbuild src/extension.ts --bundle --outfile=out/extension.js --external:vscode --format=cjs --platform=node"
}
```

### 7. Keywords & Category

```json
"categories": ["Other"],
"keywords": ["emudevz", "emulator", "game", "sync", "nes", "6502", "live-reload", "file-sync"]
```

---

## UX Improvements (Next Iteration)

### 8. Welcome View When Disconnected

When the `emudevz://` workspace folder exists but is disconnected, show a welcome view:
> "EmuDevz is not connected. [Connect Now](command:emudevz.connect)
> 
> Make sure the game is running with `--remote-debugging-port=9222`"

### 9. Output Channel for Diagnostics

Create an "EmuDevz Sync" output channel for verbose logging:
- Connection attempts, target URL, errors
- File operations (only when verbose mode enabled)
- Users can check this when troubleshooting instead of filing issues

### 10. Game-Aware File Decorations

Mark read-only directories (`/docs`, `/lib`, `/roms`) with a lock icon using `FileDecorationProvider`:
- Makes it clear why saves fail on those paths
- No surprise error messages

### 11. "Run Tests" Integration

The game has a built-in test runner (`test` command). Add:
- Command: "EmuDevz: Run Tests"
- Execute via CDP: trigger the game's test command
- Show results in VS Code's Test Explorer or Output Channel

---

## Anti-Patterns to Avoid (from Prior Art)

| Anti-Pattern | Source | Our Prevention |
|---|---|---|
| Silent sync failure | Bitburner #1 issue | Status bar always shows state |
| Complex first-run setup | Bitburner token copying | One flag in Steam launch options |
| No conflict resolution | General | VS Code is source of truth; game changes trigger refresh, not overwrite |
| Deprecation confusion | Bitburner official vs community | Single maintained extension |
| Breaking API changes | Screeps, Bitburner v3 | CDP + window.FS is stable (game's own API) |
| Excessive notifications | General | Status bar for state, notifications only for errors |
| Zombie connections | Enterprise FS extensions | Heartbeat via periodic poll already built in |

---

## Publishing Checklist

Before first marketplace publish:

- [ ] Icon: 256×256 PNG
- [ ] Gallery banner color + theme in package.json
- [ ] Screenshots: 1280×720, showing connected state with game visible
- [ ] README with setup instructions, features, screenshots
- [ ] CHANGELOG.md
- [ ] Bundle with esbuild (reduces package from ~300 files to 1)
- [ ] `publisher` field set in package.json
- [ ] Test on fresh VS Code profile (no other extensions)
- [ ] Verify `--remote-debugging-port` works with Steam launch options
- [ ] Test auto-reconnect (close game, reopen, verify extension recovers)

---

## User Personas Summary

| Persona | Key Need | Implication |
|---|---|---|
| Hobbyist | Zero-config, just works | Auto-connect, walkthrough, clear errors |
| Power Dev | Full IDE integration | File watcher, git-friendly, IntelliSense |
| Completionist | Fast iteration | Sub-second push, test results in VS Code |
| Free Mode User | Project-level sync | Multi-directory, bulk ops, large trees |

---

## Connection Lifecycle (What Users Expect)

| Scenario | Expected Behavior |
|---|---|
| Extension starts, game running | Auto-connect, show files |
| Extension starts, game not running | Status bar shows disconnected, no error popup |
| Game closes while connected | Auto-reconnect attempts, silent |
| Game reopens | Auto-reconnect succeeds, files refresh |
| User saves in VS Code | Instant push (<50ms), no notification |
| User edits in-game | VS Code refreshes within poll interval |
| Connection drops mid-save | Retry the write, notify only if retry fails |
