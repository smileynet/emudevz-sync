import * as vscode from "vscode";
import { CDPBridge, FileEntry } from "./bridge";
import * as log from "./logger";

export interface FileChange {
  type: vscode.FileChangeType;
  path: string;
}

/**
 * Polls the game's filesystem for changes and emits VS Code file change events.
 * Since CDP doesn't support push notifications for file changes, we poll
 * the file tree periodically and compare against cached state.
 */
export class FileWatcher implements vscode.Disposable {
  private bridge: CDPBridge | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private cache = new Map<string, number>(); // path → size
  private intervalMs: number;
  private watchPaths: string[];
  private paused = false;
  private recentWrites = new Set<string>(); // paths we wrote — suppress echo
  private _onDidChange = new vscode.EventEmitter<FileChange[]>();

  readonly onDidChange: vscode.Event<FileChange[]> = this._onDidChange.event;

  constructor(intervalMs = 1000, watchPaths = ["/code"]) {
    this.intervalMs = intervalMs;
    this.watchPaths = watchPaths;
  }

  /**
   * Mark a path as recently written by us. The next poll will update the cache
   * for this path but won't emit a change event (preventing echo).
   */
  suppressNextChange(path: string): void {
    this.recentWrites.add(path);
    // Auto-clear after 2 poll intervals to avoid permanent suppression
    setTimeout(() => this.recentWrites.delete(path), this.intervalMs * 2);
  }

  start(bridge: CDPBridge): void {
    this.bridge = bridge;
    this.stop();

    // Initialize cache on first poll
    this.poll().catch(() => {
      // Swallow first-poll errors; bridge events handle connectivity
    });

    this.timer = setInterval(() => {
      if (!this.paused && this.bridge?.isConnected()) {
        this.poll().catch(() => {
          // Connection lost — bridge handles reconnect
        });
      }
    }, this.intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Pause polling temporarily (e.g., during our own writes to avoid echo) */
  pause(): void {
    this.paused = true;
  }

  /** Resume polling after a pause */
  resume(): void {
    this.paused = false;
  }

  /** Pause for a duration then auto-resume (debounce after writes) */
  pauseFor(ms: number): void {
    this.pause();
    setTimeout(() => this.resume(), ms);
  }

  /** Reset cache — forces next poll to treat everything as new */
  reset(): void {
    this.cache.clear();
  }

  dispose(): void {
    this.stop();
    this._onDidChange.dispose();
  }

  private async poll(): Promise<void> {
    if (!this.bridge?.isConnected()) return;

    const currentTree = new Map<string, number>();

    for (const watchPath of this.watchPaths) {
      try {
        const files = await this.bridge.listFiles(watchPath);
        for (const file of files) {
          if (!file.isDirectory) {
            currentTree.set(file.path, file.size);
          }
        }
      } catch {
        // Path might not exist yet — skip
      }
    }

    // First poll — just populate cache, don't emit changes
    if (this.cache.size === 0 && currentTree.size > 0) {
      log.debug(`Watcher: initial scan found ${currentTree.size} files`);
      this.cache = currentTree;
      return;
    }

    const changes: FileChange[] = [];

    // Detect added and modified files
    for (const [path, size] of currentTree) {
      const cachedSize = this.cache.get(path);
      if (this.recentWrites.has(path)) {
        // We wrote this file — don't emit, but update cache
        this.recentWrites.delete(path);
      } else if (cachedSize === undefined) {
        changes.push({ type: vscode.FileChangeType.Created, path });
      } else if (cachedSize !== size) {
        changes.push({ type: vscode.FileChangeType.Changed, path });
      }
    }

    // Detect deleted files
    for (const [path] of this.cache) {
      if (!currentTree.has(path)) {
        changes.push({ type: vscode.FileChangeType.Deleted, path });
      }
    }

    // Update cache
    this.cache = currentTree;

    // Emit if there are changes
    if (changes.length > 0) {
      log.debug(`Watcher: ${changes.length} change(s) detected`);
      this._onDidChange.fire(changes);
    }
  }
}
