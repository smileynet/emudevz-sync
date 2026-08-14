# Jobs-To-Be-Done Analysis: EmuDevz VS Code Sync Extension

## Summary

Developers playing EmuDevz — a browser-based game about building NES emulators — want to use VS Code instead of the game's built-in code editor. The primary job is replacing a constrained in-game editor with a full professional IDE while maintaining the tight feedback loop the game provides. Research into comparable tools (Bitburner, Screeps, Roblox Script Sync) reveals a consistent pattern: users tolerate moderate setup friction if the daily workflow is seamless, but silently abandon tools where connection state is ambiguous or sync conflicts destroy work. The extension must be invisible when working and unmistakably clear when broken.

---

## Primary JTBD

**Core job statement:** "When I'm playing EmuDevz and writing 6502 assembly or emulator code, I want to use my full VS Code setup (keybindings, extensions, Copilot, snippets, split panes) so I can write better code faster without fighting the in-game editor's limitations."

### Functional sub-jobs:
1. **Write code in VS Code** and have it appear in the game immediately (push)
2. **Pull existing code** from the game into VS Code when starting or resuming a session
3. **See the game react** to my code changes in near real-time (tight feedback loop)
4. **Not lose work** — edits in VS Code are the source of truth; game state never silently overwrites local files
5. **Use VS Code tooling** — IntelliSense, linting, type checking, git versioning, AI code assist

### Emotional jobs:
- Feel like a "real developer" working on a real project, not constrained by a toy editor
- Maintain the fun game-flow without being punished by tooling complexity
- Confidence that the connection is working (no silent failures)

### Social jobs:
- Share code via git with others playing the game
- Use familiar workflow when streaming or creating content about the game

---

## User Personas and Contexts

### Persona 1: The Hobbyist Developer
- Has VS Code installed with basic setup
- Plays EmuDevz casually (30-60 min sessions)
- Moderate programming skill, learning about NES/6502 through the game
- **Context:** Plays in browser, wants "just works" setup, low tolerance for config
- **Key need:** Zero-config connection, immediate gratification on first use

### Persona 2: The Power Developer
- Advanced VS Code user with extensive extensions (Copilot, custom snippets, vim bindings)
- Plays EmuDevz specifically because they want to learn low-level emulation
- Likely to write TypeScript/JavaScript CPU implementations
- **Context:** Multi-monitor setup, game on one screen, VS Code on another
- **Key need:** File watcher auto-push, git integration, full language server support

### Persona 3: The Completionist/Speedrunner
- Wants to blast through game challenges efficiently
- Values rapid iteration — write, push, test, fix cycle
- May reference external documentation heavily
- **Context:** Tight feedback loops, switches between coding and testing rapidly
- **Key need:** Sub-second push latency, clear test result feedback, minimal context switching

### Persona 4: The Free Mode User
- Uses EmuDevz's "Free Mode" to develop emulators for other systems
- Treating it as a development environment, not a game
- May have large codebases spanning multiple files
- **Context:** Long sessions, many files, project-level organization
- **Key need:** Full project sync, directory structure support, bulk operations

---

## Key Moments

### First Use (Onboarding)
**What happens:** User installs the extension, needs to connect to their running game instance.

**Critical success factors:**
- Connection established in < 3 steps (install → open game → click connect)
- Immediate visual confirmation that it works (status bar shows "Connected")
- First file push succeeds on the initial attempt
- Game visibly updates with the pushed code

**Lessons from Bitburner:** Requires copying an auth token from game → VS Code settings. Users report this as the #1 friction point. Many community forks exist specifically to simplify this step.

**Lessons from Roblox Script Sync:** Beta launch taught that "enable in Studio + enable in VS Code" two-step activation with clear UI in both places works well.

**Ideal for EmuDevz:** Game shows a connection code/URL; extension auto-discovers or prompts for localhost port. No manual token copying.

### Daily Workflow (Steady State)
**What happens:** User opens VS Code with their EmuDevz project, game is already running in browser.

**Critical success factors:**
- Auto-reconnect when game tab is opened/refreshed
- File watcher pushes on save (not on every keystroke)
- Status bar clearly shows: connected/disconnected/syncing
- No interruptions during flow state — no modals, no forced confirmations

**Pattern from Bitburner:** File Watcher (disabled by default, enable via command palette) watches a configured `scriptRoot` directory. Saves push automatically. Push notifications optional (off by default — good choice).

**Pattern from Screeps:** Uses Grunt/Rollup build step → API upload. Heavier but allows TypeScript compilation. The "compile then upload" model works for complex projects.

**Ideal for EmuDevz:** Save triggers push. Optional "build step" for users who want TypeScript→JS compilation. Status bar shows last push timestamp.

### Debugging / Test Failure
**What happens:** User pushes code, game runs unit/video/audio tests, tests fail.

**Critical success factors:**
- Test results visible somewhere accessible from VS Code (output panel, notification, or webview)
- Error messages include line numbers that map to VS Code file positions
- Quick iteration: fix → save → auto-push → see new results without manual steps

**Ideal for EmuDevz:** Game test results appear in VS Code's Problems panel or a dedicated output channel. Clicking an error navigates to the correct file:line.

---

## Pain Points the Extension Must Avoid

### 1. Silent Sync Failures (CRITICAL)
Users in Bitburner and Roblox communities report this as the worst experience: you edit code, save, assume it pushed, then wonder why the game isn't responding to changes. The connection died silently.

**Mitigation:** Aggressive status bar updates. If push fails, show an error notification immediately. Never let the user wonder.

### 2. Overwriting Local Work
If bidirectional sync exists (pull from game), the game must never overwrite uncommitted VS Code changes without explicit user consent.

**Mitigation:** VS Code files are always source of truth. Pull is an explicit user action, never automatic. If conflict detected, show a diff.

### 3. Complex First-Time Setup
Bitburner requires: install extension + install Node.js + clone template + configure auth token + enable file watcher + configure script root. Each step loses users.

**Mitigation:** Extension installs, auto-discovers game on localhost, one-click connect. No template repo required. No separate build tools for basic usage.

### 4. Connection Instability on Browser Refresh
Browser games refresh/reload frequently. Each refresh breaks WebSocket connections.

**Mitigation:** Auto-reconnect with exponential backoff. Status bar shows "Reconnecting..." state. Queue pushes during disconnection, flush on reconnect.

### 5. Path/Filename Mapping Confusion
Bitburner users struggle with how local file paths map to in-game paths (scriptRoot configuration). Files outside the root silently fail to push.

**Mitigation:** Clear workspace structure. Show in-game path in file decorations or hover. Warn if a file won't sync (outside workspace, wrong extension).

### 6. No Feedback on What Changed in Game
After pushing code, users have no idea if the game accepted it, compiled it, or ran tests.

**Mitigation:** Acknowledge push receipt from game. Show "Push accepted" / "Compilation error" / "Tests: 3/5 passing" feedback.

### 7. Zombie Connections
Roblox Script Sync users report the sync appearing connected but actually stale (data not flowing).

**Mitigation:** Heartbeat mechanism. If no heartbeat response within timeout, mark disconnected and begin reconnect.

---

## Delight Opportunities

### 1. Game-Aware IntelliSense
Provide type definitions for EmuDevz's API (memory addresses, register names, PPU constants). Auto-completion for 6502 opcodes and NES memory maps.

### 2. Inline Test Results
Show test pass/fail status inline in the editor gutter (like test runners do). Green/red icons next to test-relevant code sections.

### 3. Memory Viewer Integration
If the game exposes memory state, show it in a VS Code webview panel — a hex viewer synced with the running emulator.

### 4. Progress Tracking
Show game progression (which chapters/challenges are complete) in a sidebar tree view. Click a challenge → opens relevant code file.

### 5. Snippet Library
Pre-built snippets for common 6502 patterns, NES register writes, PPU operations. Triggered by the game's current chapter context.

### 6. "It Just Works" Auto-Discovery
When game is running on localhost, the extension auto-connects without any configuration. Like how the Chrome DevTools just find the running browser.

### 7. Push-on-Save with Debounce
Smart debouncing: don't push on every rapid save during refactoring, but do push promptly when the user pauses. Configurable delay (default: 300ms after last save).

### 8. Session Resume
When VS Code reopens, auto-pull current game state if it's newer than local files (with user confirmation). Never lose progress from either side.

---

## Comparison with Similar Tools

### Bitburner VS Code Integration
| Aspect | Implementation | Lesson |
|--------|---------------|--------|
| Connection | WebSocket to game's Remote File API | Works well, but auth token setup is friction |
| Sync direction | Push only (VS Code → Game) | Simpler model, fewer conflicts |
| File watcher | Optional, watches configured scriptRoot | Good default-off choice, power users enable |
| Notifications | Push success notifications off by default | Correct — reduce noise in steady state |
| Pain point | Token setup, path mapping confusion | Simplify onboarding, make paths visible |
| Installs | 22,636 on VS Code Marketplace | Validates demand for game→editor sync |

### Screeps External Tools
| Aspect | Implementation | Lesson |
|--------|---------------|--------|
| Connection | REST API (POST/GET to screeps.com/api/user/code) | Not real-time, batch upload model |
| Sync direction | Bidirectional (push and pull) | Pull is useful for starting on new machines |
| Build step | Grunt/Rollup/Webpack → upload | Supports TypeScript, but adds complexity |
| Auth | Auth tokens via account settings | Better than user/pass, still manual |
| Pain point | API rate limits, compile-then-upload latency | Real-time WebSocket beats REST for games |
| Ecosystem | Many community tools (screeps-multimeter, etc.) | Fragmentation when official tooling is weak |

### Roblox Script Sync / Rojo / Yeet
| Aspect | Implementation | Lesson |
|--------|---------------|--------|
| Connection | File system sync (Studio ↔ local disk) | Bidirectional, real-time |
| Sync direction | True bidirectional | Complex but necessary for Studio-first devs |
| Discovery | Beta feature flag in Studio + VS Code plugin | Two-step activation is acceptable |
| Pain point | Sync breaks with certain instance hierarchies | Document limitations clearly |
| Pain point | Disconnections during long sessions (Rojo) | Heartbeat + auto-reconnect essential |
| Delight | "Yeet" tool: edit in VS Code, see in Studio instantly | Real-time visual feedback is magical |
| Ecosystem | Official (Script Sync) + community (Rojo, Yeet, Azul) | Official support matters for trust |

### PlayCanvas VS Code Extension
| Aspect | Implementation | Lesson |
|--------|---------------|--------|
| Connection | Cloud sync with realtime collaboration | Heavy infrastructure, overkill for local game |
| Sync model | Git-style Pull/Push with collaborators | Mental model users already understand |
| Lesson | "Edits sync by default, or on demand" | Give users control over when sync happens |

---

## What Users Expect from the Connection Lifecycle

### Mental Model
Users expect the connection to behave like a "live reload" dev server:
1. Start the game → start VS Code → they find each other
2. Edit → Save → See result (< 1 second)
3. If something breaks, it recovers automatically
4. If it can't recover, it tells me clearly what to do

### Expected States (and how to communicate them)

| State | Status Bar | User Expectation |
|-------|-----------|-----------------|
| Disconnected (game not running) | `$(debug-disconnect) EmuDevz: Not Connected` | Click to see "start your game" guidance |
| Connecting | `$(sync~spin) EmuDevz: Connecting...` | Brief, auto-resolves |
| Connected | `$(check) EmuDevz: Connected` | Green, steady, trustworthy |
| Syncing | `$(sync~spin) EmuDevz: Pushing...` | Brief flash during push |
| Error | `$(error) EmuDevz: Sync Failed` | Red, click for details |
| Reconnecting | `$(warning) EmuDevz: Reconnecting...` | Yellow, user knows it's trying |

### Connection Recovery Expectations
- **Browser refresh:** Auto-reconnect within 2-3 seconds, no user action
- **Game closed and reopened:** Auto-reconnect when game starts, queue preserved
- **Network hiccup:** Silent recovery if < 5 seconds, notification if longer
- **VS Code restart:** Reconnect on activation if game is running
- **Laptop sleep/wake:** Reconnect automatically

### What Users Do NOT Want
- Manual reconnect buttons they have to click every session
- Modal dialogs interrupting their coding flow
- "Connection lost" spam when they're just reloading the game
- Having to restart VS Code to fix connection issues
- Separate terminal processes they need to keep running

---

## Sources

1. **Bitburner VSCode Integration** — VS Code Marketplace (22,636 installs)
   https://marketplace.visualstudio.com/items?itemName=bitburner.bitburner-vscode-integration

2. **Bitburner File Sync Plugin** — Alternative community extension
   https://marketplace.visualstudio.com/items?itemName=FicocelliGuy.bitburner-file-sync-plugin

3. **Bitburner VS Code Template** — Official starter workspace
   https://github.com/bitburner-official/vscode-template

4. **Screeps: Committing scripts using external tools** — Official docs
   https://docs.screeps.com/commit.html

5. **Roblox Studio Script Sync (Full Release)** — Official announcement
   https://devforum.roblox.com/t/full-release-studio-script-sync/4688454

6. **Roblox Script Sync Documentation** — GitHub source
   https://github.com/Roblox/creator-docs/blob/main/content/en-us/scripting/sync.md

7. **Yeet — Bidirectional sync between Roblox Studio and VS Code** — Community tool
   https://devforum.roblox.com/t/yeet-bidirectional-sync-between-roblox-studio-and-vs-code-antigravity/4622547

8. **VS Code UX Guidelines: Status Bar** — Official Microsoft docs
   https://code.visualstudio.com/api/ux-guidelines/status-bar

9. **VS Code Extension API: Custom Editors** — Official docs
   https://code.visualstudio.com/api/extension-guides/custom-editors

10. **Harvard Business School: Jobs to Be Done Framework** — JTBD theory
    https://online.hbs.edu/blog/post/jobs-to-be-done-examples

11. **UXCrush: A UX Practitioner's Guide to JTBD (2026)** — Applied JTBD methodology
    https://uxcrush.com/jobs-to-be-done-framework

12. **SketchUp Developer: Jobs to Be Done** — JTBD applied to extension development
    https://developer.sketchup.com/jobstobedone

13. **WebSocket Reconnection Patterns** — Stack Overflow best practices
    https://stackoverflow.com/a/23176223

14. **PlayCanvas VS Code Extension** — Sync model reference
    https://marketplace.visualstudio.com/items?itemName=playcanvas.playcanvas

---

## Open Questions

1. **Does EmuDevz expose a Remote API?** Need to verify what communication channel exists between the browser game and external tools (WebSocket? postMessage? File system via Electron?)
2. **Steam vs. Web version differences:** The Electron/Steam version may support file system sync directly, while the web version would need WebSocket. Should the extension support both?
3. **What is the game's file format?** Are game scripts plain JavaScript/6502 assembly text files, or a proprietary format that needs transformation?
4. **Test result format:** How does the game report test pass/fail? Is there a structured output we can parse?
5. **Multi-file projects:** Does the game support importing between files? If so, the extension needs to understand dependency graphs for proper push ordering.
