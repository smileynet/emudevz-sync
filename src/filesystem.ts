import * as vscode from "vscode";
import { CDPBridge } from "./bridge";
import { FileChange, FileWatcher } from "./watcher";

export class EmuDevzFileSystemProvider implements vscode.FileSystemProvider {
  private bridge: CDPBridge | null = null;
  private watcher: FileWatcher | null = null;
  private readOnlyCheck: ((path: string) => boolean) | null = null;
  private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();

  readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> =
    this._emitter.event;

  setBridge(bridge: CDPBridge): void {
    this.bridge = bridge;
  }

  clearBridge(): void {
    this.bridge = null;
  }

  setWatcher(watcher: FileWatcher): void {
    this.watcher = watcher;
  }

  setReadOnlyCheck(check: (path: string) => boolean): void {
    this.readOnlyCheck = check;
  }

  fireFullRefresh(): void {
    this._emitter.fire([
      {
        type: vscode.FileChangeType.Changed,
        uri: vscode.Uri.parse("emudevz:/"),
      },
    ]);
  }

  fireChanges(changes: FileChange[]): void {
    this._emitter.fire(
      changes.map((c) => ({
        type: c.type,
        uri: vscode.Uri.parse(`emudevz:${c.path}`),
      }))
    );
  }

  // --- FileSystemProvider interface ---

  watch(): vscode.Disposable {
    return new vscode.Disposable(() => {});
  }

  async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
    this.ensureConnected();

    const gamePath = this.toGamePath(uri);

    if (gamePath === "/" || gamePath === "") {
      return {
        type: vscode.FileType.Directory,
        ctime: 0,
        mtime: Date.now(),
        size: 0,
      };
    }

    try {
      const info = await this.bridge!.stat(gamePath);
      return {
        type: info.isDirectory
          ? vscode.FileType.Directory
          : vscode.FileType.File,
        ctime: 0,
        mtime: Date.now(),
        size: info.size,
      };
    } catch {
      throw vscode.FileSystemError.FileNotFound(uri);
    }
  }

  async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
    this.ensureConnected();

    const gamePath = this.toGamePath(uri);
    const path = gamePath === "" ? "/" : gamePath;

    if (path === "/") {
      const config = vscode.workspace.getConfiguration("emudevz");
      const syncPaths = config.get<string[]>("syncPaths") ?? ["/code"];
      const entries: [string, vscode.FileType][] = [];
      for (const sp of syncPaths) {
        const name = sp.replace(/^\//, "");
        try {
          const exists = await this.bridge!.exists(sp);
          if (exists) {
            entries.push([name, vscode.FileType.Directory]);
          }
        } catch {
          // Skip paths that error
        }
      }
      return entries;
    }

    try {
      const entries = await this.bridge!.listDirectory(path);
      return entries.map((e) => [
        e.name,
        e.isDirectory ? vscode.FileType.Directory : vscode.FileType.File,
      ]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("ENOENT") || msg.includes("not found")) {
        throw vscode.FileSystemError.FileNotFound(uri);
      }
      throw e;
    }
  }

  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    this.ensureConnected();

    const gamePath = this.toGamePath(uri);
    try {
      const content = await this.bridge!.readFile(gamePath);
      return new TextEncoder().encode(content);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("ENOENT") || msg.includes("not found")) {
        throw vscode.FileSystemError.FileNotFound(uri);
      }
      throw e;
    }
  }

  async writeFile(
    uri: vscode.Uri,
    content: Uint8Array,
    _options: { create: boolean; overwrite: boolean }
  ): Promise<void> {
    this.ensureConnected();

    const gamePath = this.toGamePath(uri);

    if (this.readOnlyCheck?.(gamePath)) {
      throw vscode.FileSystemError.NoPermissions(uri);
    }

    const text = new TextDecoder().decode(content);

    // Suppress echo — tell watcher to ignore the next change for this path
    this.watcher?.suppressNextChange(gamePath);

    try {
      await this.bridge!.writeFile(gamePath, text);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("read-only") || msg.includes("READONLY")) {
        throw vscode.FileSystemError.NoPermissions(uri);
      }
      throw e;
    }

    this._emitter.fire([{ type: vscode.FileChangeType.Changed, uri }]);
  }

  async rename(
    oldUri: vscode.Uri,
    newUri: vscode.Uri,
    _options: { overwrite: boolean }
  ): Promise<void> {
    this.ensureConnected();

    const oldPath = this.toGamePath(oldUri);
    const newPath = this.toGamePath(newUri);

    if (this.readOnlyCheck?.(oldPath) || this.readOnlyCheck?.(newPath)) {
      throw vscode.FileSystemError.NoPermissions(oldUri);
    }

    await this.bridge!.rename(oldPath, newPath);

    this._emitter.fire([
      { type: vscode.FileChangeType.Deleted, uri: oldUri },
      { type: vscode.FileChangeType.Created, uri: newUri },
    ]);
  }

  async delete(uri: vscode.Uri, options: { recursive: boolean }): Promise<void> {
    this.ensureConnected();

    const gamePath = this.toGamePath(uri);

    if (this.readOnlyCheck?.(gamePath)) {
      throw vscode.FileSystemError.NoPermissions(uri);
    }

    try {
      const info = await this.bridge!.stat(gamePath);
      if (info.isDirectory) {
        await this.bridge!.deleteDirectory(gamePath);
      } else {
        await this.bridge!.deleteFile(gamePath);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("ENOENT")) {
        throw vscode.FileSystemError.FileNotFound(uri);
      }
      throw e;
    }

    this._emitter.fire([{ type: vscode.FileChangeType.Deleted, uri }]);
  }

  async createDirectory(uri: vscode.Uri): Promise<void> {
    this.ensureConnected();

    const gamePath = this.toGamePath(uri);

    if (this.readOnlyCheck?.(gamePath)) {
      throw vscode.FileSystemError.NoPermissions(uri);
    }

    await this.bridge!.mkdir(gamePath);

    this._emitter.fire([{ type: vscode.FileChangeType.Created, uri }]);
  }

  // --- Helpers ---

  private toGamePath(uri: vscode.Uri): string {
    let path = uri.path;
    if (!path.startsWith("/")) path = "/" + path;
    return path;
  }

  private ensureConnected(): void {
    if (!this.bridge || !this.bridge.isConnected()) {
      throw vscode.FileSystemError.Unavailable(
        "EmuDevz: Not connected. Run 'EmuDevz: Connect' command."
      );
    }
  }
}
