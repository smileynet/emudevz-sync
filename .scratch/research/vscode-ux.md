# VS Code Extension UX Patterns & Design Guidelines

## Summary

VS Code provides a comprehensive set of official UX guidelines for extension developers, centered around the principle of seamless integration with the native interface. The architecture divides the UI into **containers** (Activity Bar, Sidebars, Panel, Editor, Status Bar) and **items** (Views, Toolbars, Status Bar Items). Extensions should use native contribution points rather than custom webviews wherever possible, minimize notification frequency, and leverage the walkthrough system for onboarding. The golden rule: respect the user's attention and integrate with existing patterns rather than inventing new ones.

---

## Key UX Principles for Extensions

1. **Seamless integration** — Extensions should look and feel like native parts of VS Code. Use built-in UI contribution points (Tree Views, Status Bar, Quick Picks) rather than custom webviews whenever possible.

2. **Respect user attention** — Only interrupt the user when absolutely necessary. Most feedback should be passive (Status Bar, Output Channel) rather than active (notifications, modals).

3. **Minimize footprint** — Limit the number of Views, Status Bar items, and Activity Bar entries. Other extensions share the same space.

4. **Use native icons** — Prefer VS Code's built-in product icons (Codicons) over custom icons. They ensure consistency across themes.

5. **Theme compatibility** — All visual elements must work across light, dark, and high-contrast themes. Use Theme Color CSS variables for SVGs.

6. **Progressive disclosure** — Show essential information first; let users drill down for details. Don't overwhelm on first impression.

7. **Contextual placement** — Put information where users expect it:
   - Global/workspace state → left side of Status Bar
   - File-contextual state → right side of Status Bar
   - Hierarchical data → Tree Views in sidebar
   - Progress → within the relevant view, not globally

8. **Scaleable architecture** — Use an ExtensionController pattern to coordinate activation, manage lifecycle, and separate concerns between UI and business logic.

---

## Onboarding Patterns

### Walkthroughs (Primary Onboarding Mechanism)

Walkthroughs provide a consistent multi-step checklist experience for onboarding. Declared via `contributes.walkthroughs` in package.json.

**Do:**
- Use helpful images to add context to each step
- Ensure images work across color themes (use SVGs with Theme Color variables)
- Provide actionable steps with verbs (e.g., "View all Commands", "Configure Settings")
- Use the [Visual Studio Code Color Mapper](https://www.figma.com/community/plugin/1218260433851630449) Figma plugin for themed SVGs

**Don't:**
- Add excessive steps in a single walkthrough
- Add multiple walkthroughs unless absolutely necessary

**Implementation:**
```json
{
  "contributes": {
    "walkthroughs": [{
      "id": "myExtension.welcome",
      "title": "Get Started with My Extension",
      "steps": [
        {
          "id": "openView",
          "title": "Open the Explorer",
          "description": "Click the icon in the Activity Bar to open...",
          "media": { "svg": "media/step1.svg" },
          "completionEvents": ["onView:myView"]
        }
      ]
    }]
  }
}
```

### Welcome Views (In-Context Onboarding)

When a Tree View is empty, use Welcome Views to guide users on how to get started. Declared via `contributes.viewsWelcome`.

**Do:**
- Use only when the view has no content to display
- Use links instead of buttons when possible
- Use buttons only for primary actions
- Provide clear link text indicating the destination
- Keep content brief

**Don't:**
- Use buttons unnecessarily
- Use Welcome Views for promotions
- Use generic "read more" text

**Example:** Show one primary action button + a documentation link when the view has no items.

### First-Run Experience Strategy

1. Walkthrough opens automatically on first install (VS Code handles this)
2. Welcome Views in your sidebar show guidance when empty
3. Avoid notification-based onboarding — don't ask for feedback on first install
4. Let the user discover features through contextual hints

---

## Status Communication

### Status Bar

The Status Bar sits at the bottom and shows workspace/file information. Two zones:
- **Left (Primary):** Workspace-scoped items (sync status, connection state, global errors)
- **Right (Secondary):** File-scoped/contextual items (language, encoding, line ending)

**Do:**
- Use short text labels
- Use icons only for clear metaphors
- Place global items on the left, contextual on the right
- Use loading icon with spin animation for background progress
- Reserve warning/error background colors for critical blocking issues only

**Don't:**
- Add custom colors
- Add more than one icon per item (unless necessary)
- Add more than one Status Bar item (unless necessary)

**Progress pattern:** For background operations, show a spinning icon in the Status Bar. Only escalate to a progress notification if the user needs to be aware.

**Error/Warning states:** `StatusBarItem` supports `backgroundColor` with `statusBarItem.errorBackground` and `statusBarItem.warningBackground`. Use as last resort for blocking issues.

### Notifications

Three types: Information, Warning, Error. Use sparingly.

**Decision tree (from VS Code docs):**
1. Multi-step user input needed immediately? → Quick Pick (multi-step)
2. Single user input needed immediately? → Modal dialog
3. Low-priority progress? → Status Bar progress
4. User-triggered interaction? → Find the right moment, then show notification
5. Multiple notifications to show? → Combine into one
6. User doesn't really need to know? → **Don't show anything**

**Do:**
- Add "Do not show again" option to every notification
- Show one notification at a time
- Respect the user's attention

**Don't:**
- Send repeated notifications
- Use for promotion
- Ask for feedback on first install
- Show actions if there aren't any

### Progress Notifications

For indeterminate-length operations (environment setup, remote connections):

**Do:**
- Show a link to see more details (e.g., output logs)
- Show status as it progresses ("Initializing...", "Building...")
- Provide a cancel action if applicable
- Add timeout handling

**Don't:**
- Leave a progress notification running indefinitely

### Output Channels

Best for verbose/non-critical logging. Extensions should create dedicated output channels for:
- Detailed operation logs
- External process output
- Debug/diagnostic information

Pattern: Show a brief notification with a "Show Output" action that reveals the Output Channel for details.

### Diagnostics (Problems Panel)

Use `DiagnosticCollection` for file-level issues (lint errors, type errors, warnings). These appear in:
- The Problems panel
- Inline in the editor (squiggles)
- The file explorer (error decorations)

Best for: persistent issues tied to specific file locations.

---

## TreeView vs FileSystemProvider UX

### TreeView (TreeDataProvider)

**Use when:**
- Displaying hierarchical or flat data that isn't file-system based
- Showing custom item types (tests, dependencies, bookmarks, tasks)
- Data has actions beyond open/edit (custom commands on click)
- You want to control the rendering (icons, descriptions, tooltips)
- Items may or may not correspond to actual files

**UX characteristics:**
- Lives in a sidebar View
- Supports expand/collapse, icons, descriptions, tooltips
- Supports inline actions and context menus per item
- Can show Welcome Views when empty
- Can show progress state
- Users can rearrange/move the view

**Best practices:**
- Use descriptive labels
- Use product icons to distinguish item types
- Limit to 3 actions per item
- Avoid deep nesting (2-3 levels is comfortable)
- Don't use tree items as buttons (fire-on-click single-action items)

### FileSystemProvider

**Use when:**
- Presenting remote/virtual files that should behave like real files
- Files should be editable in VS Code's native editor
- You want full integration with VS Code's file operations (search, diff, save)
- The data model IS a filesystem (FTP, cloud storage, in-memory FS)
- Users expect standard file operations (rename, delete, copy)

**UX characteristics:**
- Files appear in the Explorer like native files
- Full editor integration (syntax highlighting, language services)
- Standard file operations work (save, diff, search across files)
- Registered via a URI scheme (`memfs://`, `ftp://`)

**Key distinction:** FileSystemProvider makes virtual content act as files. TreeDataProvider shows structured data in a custom view. If users need to *edit* content in the standard editor, use FileSystemProvider. If users need to *browse and act on* structured data, use TreeView.

---

## Error Handling UX

### Escalation Ladder (least intrusive first)

1. **Output Channel** — Detailed logs for debugging. User opts in to view.
2. **Diagnostics/Problems** — File-specific issues shown inline and in Problems panel.
3. **Status Bar** — Brief indicator of error state (with warning/error background for critical).
4. **Notification (Information)** — Recoverable issues with suggested action.
5. **Notification (Warning)** — Issues requiring user attention with resolution actions.
6. **Notification (Error)** — Failures with clear action to resolve.
7. **Modal Dialog** — Only when immediate user input is required to proceed.

### Best Practices

- **Always provide an action:** Error notifications should include at least one resolution action (Retry, Open Settings, Show Logs).
- **Don't auto-focus Output Channel on every error:** This is a common annoyance. Let users click through to logs.
- **Use error/warning Status Bar items for persistent state issues** (e.g., missing configuration, disconnected server).
- **Combine multiple errors** into a single notification when possible ("3 files failed to sync" with a "Show Details" action).
- **Graceful degradation:** If a feature can't work, disable it visibly (gray out tree items, show Welcome View with explanation) rather than showing repeated error notifications.
- **Typed errors with user-friendly messages:** Internal errors should be translated to actionable user messages. Don't expose stack traces in notifications.

### Pattern: Error → Action → Recovery

```typescript
try {
  await riskyOperation();
} catch (err) {
  const action = await vscode.window.showErrorMessage(
    'Failed to connect to server.',
    'Retry', 'Open Settings'
  );
  if (action === 'Retry') { /* retry */ }
  if (action === 'Open Settings') {
    vscode.commands.executeCommand('workbench.action.openSettings', 'myExt.serverUrl');
  }
}
```

---

## Configuration Discoverability

### Settings UX

**Do:**
- Add sensible default values to every setting
- Write clear, concise descriptions
- Link to documentation for complex settings
- Link to related settings
- Use the setting ID to deep-link users to specific settings
- Group related settings with a common prefix (`myExtension.sync.interval`, `myExtension.sync.enabled`)

**Don't:**
- Create a custom settings page or webview
- Write long descriptions
- Require configuration before the extension provides any value (progressive defaults)

### Discoverability Techniques

1. **Deep-link to settings** from notifications and Welcome Views:
   ```typescript
   vscode.commands.executeCommand('workbench.action.openSettings', 'myExtension.serverUrl');
   ```

2. **Use `markdownDescription`** in configuration contribution points for rich formatting:
   ```json
   {
     "myExtension.endpoint": {
       "type": "string",
       "markdownDescription": "The API endpoint. See [docs](https://...) for details."
     }
   }
   ```

3. **When clause contexts** to show/hide commands based on configuration state.

4. **Walkthrough steps** that include a "Configure" action linking to settings.

5. **Status Bar item** that indicates unconfigured state and clicks through to settings.

---

## When to Use Notifications vs Silent Updates

### Use Notifications When:

| Scenario | Notification Type |
|----------|------------------|
| User-initiated action completed with notable result | Information |
| Action completed but with warnings | Warning |
| Action failed and user can take corrective action | Error |
| Breaking change in extension update (one-time) | Information with "Learn More" |
| Required configuration missing (blocking) | Warning with "Open Settings" |
| External service disconnected (user needs to reconnect) | Error with "Reconnect" |

### Use Silent Updates (No Notification) When:

| Scenario | Alternative |
|----------|-------------|
| Background sync completed successfully | Status Bar icon briefly animates |
| File watcher detected changes and updated view | Tree View refreshes silently |
| Extension activated normally | No feedback needed |
| Configuration reloaded | Status Bar reflects new state |
| Non-critical background operation completed | Output Channel log entry |
| Incremental progress on user-initiated task | Progress in Status Bar |
| Language server restarted after crash | Status Bar loading indicator |

### The Golden Rule

> "If the user would say 'I know, stop telling me' after the third time — it shouldn't be a notification."

- User-triggered actions → notification justified (but keep brief)
- System-triggered updates → silent (Status Bar, view refresh, Output Channel)
- One-time important messages → notification with "Don't show again"
- Repeated routine operations → never notify

---

## Sources

| Source | URL |
|--------|-----|
| VS Code UX Guidelines - Overview | https://code.visualstudio.com/api/ux-guidelines/overview |
| VS Code UX Guidelines - Notifications | https://code.visualstudio.com/api/ux-guidelines/notifications |
| VS Code UX Guidelines - Views | https://code.visualstudio.com/api/ux-guidelines/views |
| VS Code UX Guidelines - Walkthroughs | https://code.visualstudio.com/api/ux-guidelines/walkthroughs |
| VS Code UX Guidelines - Settings | https://code.visualstudio.com/api/ux-guidelines/settings |
| VS Code UX Guidelines - Status Bar | https://code.visualstudio.com/api/ux-guidelines/status-bar |
| VS Code Tree View API Guide | https://code.visualstudio.com/api/extension-guides/tree-view |
| VS Code Virtual Documents (FileSystemProvider) | https://code.visualstudio.com/api/extension-guides/virtual-documents |
| VS Code Contribution Points Reference | https://code.visualstudio.com/api/references/contribution-points |
| stateful/vscode-awesome-ux (best practices template) | https://github.com/stateful/vscode-awesome-ux |
| VS Code Extension Samples (Microsoft) | https://github.com/microsoft/vscode-extension-samples |
| Webview UI Toolkit for VS Code | https://code.visualstudio.com/blogs/2021/10/11/webview-ui-toolkit |

---

## Open Questions

- VS Code's notification decision tree image references a flow that recommends "relax" (do nothing) as the default — but there's no programmatic way to detect notification fatigue. Extension authors must self-regulate.
- The official docs don't provide explicit guidance on notification rate-limiting or batching across multiple operations.
- FileSystemProvider integration with search and language services for virtual file systems requires additional configuration (scheme registration) that isn't well-documented for complex scenarios.
- The walkthrough API doesn't support conditional steps or branching paths — workaround is using `when` clauses on `completionEvents`.
