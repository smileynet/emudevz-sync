# Prior Art UX Review: VS Code Extensions That Sync with External Apps

## Summary

Three major categories of VS Code extensions sync local files with running external applications: game script syncing (Bitburner, Screeps), enterprise platform syncing (ServiceNow ScriptSync), and VS Code's own remote filesystem providers. The most successful extensions share common patterns: WebSocket-based real-time sync, clear connection status indicators, auto-sync on save, and bidirectional file transfer. The biggest UX failures involve connection reliability, confusing setup procedures, and lack of feedback when sync fails silently.

---

## 1. Bitburner VS Code Extensions

### Extensions Reviewed
- **Bitburner VSCode Integration** (official, 22K installs, archived/deprecated)
- **Bitburner File Sync Plugin** (community, 266 installs, actively maintained)

### What Works Well
- **Auto-sync on save** — files push to the game automatically, no manual step needed
- **Status bar indicator** — shows connection state (stopped/waiting/connected) at a glance
- **WebSocket connection** — real-time, low-latency push via Remote File API
- **Type definitions auto-download** — `NetscriptDefinitions.d.ts` downloaded automatically for full autocomplete
- **Configurable file extensions** — users choose which file types to sync
- **Bidirectional sync** — can pull files FROM the game as well as push TO it
- **First-connect reconciliation** — on first connection, offers to download server scripts or push local scripts

### What Users Complain About
- **Connection refused errors** — WebSocket connection issues are the #1 reported problem (GitHub issues)
- **Deprecated extension confusion** — the official extension was deprecated in v3, replaced by a different Remote API approach, causing widespread confusion
- **Complex setup** — requires enabling Remote API in game settings, configuring ports, sometimes Steam launch options
- **No conflict resolution** — when both local and remote have changes, unclear what wins
- **"Early WIP" disclaimer** — the official extension shipped with prominent warnings about instability, eroding trust
- **Breaking changes across versions** — v3 broke the entire VS Code extension workflow, forcing users to Discord for migration help

### Common Feature Requests
- Pull individual files (not just all-or-nothing)
- Better error messages when connection fails
- Auto-reconnect on connection drop
- Glob-pattern-based selective sync

### Sources
- https://marketplace.visualstudio.com/items?itemName=bitburner.bitburner-vscode-integration
- https://marketplace.visualstudio.com/items?itemName=FicocelliGuy.bitburner-file-sync-plugin
- https://github.com/bitburner-official/bitburner-src/issues/2148
- https://github.com/Nezrahm/bitburner-sync/issues/1

---

## 2. Screeps VS Code Workflow

### What Works Well
- **GitHub integration** — Screeps natively syncs from GitHub repos, enabling standard git workflows
- **Local folder sync** (Steam client) — can point to local folders directly via Gulp/build tools
- **Community tooling** — multiple approaches (direct folder, GitHub, API) let users choose their workflow

### What Users Complain About
- **No official VS Code extension** — users must cobble together autocomplete, sync, and deployment separately
- **Autocomplete is fragile** — TypeScript definitions require manual `/// <reference>` paths that break easily
- **Guides are outdated** — most guides reference Visual Studio (not VS Code) or obsolete toolchains
- **Steep setup curve** — requires understanding Gulp, npm, git hooks, or the Screeps API to get external editing working
- **No real-time sync** — changes require manual commit/push or running a build script

### Common Feature Requests
- Official VS Code extension with integrated sync
- Live preview of code changes in-game
- Better TypeScript/autocomplete support out of the box

### Sources
- https://docs.screeps.com/commit.html
- https://github.com/pokemane/screeps-vscode
- https://github.com/Garethp/ScreepsAutocomplete/issues/44

---

## 3. ServiceNow ScriptSync (sn-scriptsync)

### Overview
32K installs, 24 ratings. The most mature and feature-rich extension in this category. Syncs ServiceNow platform scripts to local VS Code workspace via browser extension bridge.

### What Works Well
- **Zero configuration** — "easy integration without any configuration" is their tagline
- **Structured file layout** — `instance/scope/table/recordname.field.extension` is intuitive and predictable
- **Live SCSS preview** — CSS changes preview immediately in browser
- **Smart batching** — multiple field changes on same record combined into single API call
- **Pending saves queue** — tree view showing files waiting to sync, with pause/resume/sync-now controls
- **File watcher for external changes** — detects changes from AI agents, git, or other tools automatically
- **AI agent support** — generates `agentinstructions.md` for AI coding assistants, provides HTTP API for programmatic access
- **Configurable sync delay** — monitor-only (queue changes, manual push) vs. auto-sync with delay
- **Context menu visibility management** — hide/show commands per file type, only when server is running
- **Security-conscious** — workspace boundary enforcement, path traversal protection, token auth
- **Forensic audit logging** — NDJSON audit trail for debugging sync issues

### What Users Complain About
- **Browser helper tab required** — must keep a browser tab open as communication channel (annoying)
- **Connection depends on browser extension** — if browser extension is outdated or disabled, VS Code extension fails
- **Auto-sync risk** — changes sync directly to ServiceNow instance; accidental saves can break production
- **Safari/Brave compatibility** — specific browser restrictions require workarounds
- **Script tag escaping** — `<script>` tags in widget HTML get escaped during sync (requires system property change)

### Common Feature Requests
- Eliminate browser helper tab requirement (HTTP API in v4.3 addresses this)
- Better offline/disconnected state handling
- Merge/diff view for conflicts

### Sources
- https://marketplace.visualstudio.com/items?itemName=arnoudkooicom.sn-scriptsync
- https://www.servicenow.com/community/developer-articles/vs-code-setup-for-servicenow/ta-p/2324907

---

## 4. VS Code Remote Filesystem Extensions (General)

### What Works Well
- **Virtual workspace API** — VS Code provides official patterns for remote filesystem providers
- **Transparent file operations** — when working, users can't tell files are remote

### What Users Complain About
- **Extensions break in virtual workspaces** — many extensions assume disk access and fail silently
- **Extremely slow IO** — file saving on remote frequently fails or hangs
- **Stale port files** — discovery files (like `.vscode/sn-agent-port.json`) go stale when synced by iCloud/OneDrive/git
- **No graceful degradation** — when connection drops, operations hang rather than failing fast with clear errors

### Sources
- https://code.visualstudio.com/api/extension-guides/virtual-workspaces
- https://github.com/microsoft/vscode/issues/146688
- https://github.com/microsoft/vscode/issues/178748

---

## Patterns to Adopt

1. **Status bar indicator** — always show connection state (disconnected/connecting/connected/error)
2. **Auto-sync on save** — push files automatically when saved, with option to disable
3. **Structured file layout** — predictable mapping between local paths and remote paths
4. **First-connect reconciliation** — on initial connection, offer to pull remote state or push local state
5. **Pending sync queue with UI** — show what's waiting to sync, allow pause/resume/force-sync
6. **Configurable sync delay** — support both immediate-on-save and debounced/manual modes
7. **File watcher for external changes** — detect changes from AI tools, git, build scripts
8. **Clear error messages** — when sync fails, tell users exactly what went wrong and how to fix it
9. **Bidirectional sync** — support both push-to-app and pull-from-app operations
10. **Exclude patterns** — let users skip files/folders from sync (node_modules, build artifacts, etc.)

## Anti-Patterns to Avoid

1. **Silent sync failures** — never swallow errors; always surface them to the user
2. **Requiring browser tabs/helpers** — avoid external dependencies for the sync channel
3. **Breaking changes without migration** — Bitburner's v3 transition was devastating for users
4. **"Early WIP" disclaimers** — erodes trust even when the extension works fine
5. **Complex multi-step setup** — every manual step is a drop-off point
6. **All-or-nothing sync** — always support granular file-level operations
7. **No conflict handling** — when both sides change, the user must be informed and choose
8. **Polling-based sync** — use WebSocket/event-driven push, not periodic polling
9. **No file size limits** — sync should refuse obviously wrong files (build artifacts, binaries) with clear explanation
10. **Stale connection state** — always verify connection is live before trusting cached state; implement health checks

---

## Key Takeaway for EmuDevz Sync

The most successful extensions in this space (SN ScriptSync at 32K installs) succeed by being **zero-config to start, transparent in operation, and explicit about failures**. The Bitburner ecosystem shows what happens when setup is complex and breaking changes aren't handled gracefully. For a game-development sync tool, the sweet spot is: auto-sync on save + clear status indicator + graceful error handling + bidirectional pull/push capability.
