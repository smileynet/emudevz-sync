import * as vscode from "vscode";

/**
 * Decorates files in read-only paths with a lock badge in the explorer.
 * Read-only paths are configured via emudevz.readOnlyPaths setting.
 */
export class ReadOnlyDecorationProvider
  implements vscode.FileDecorationProvider
{
  private _onDidChangeFileDecorations =
    new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();
  readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

  private readOnlyPaths: string[] = [];

  constructor() {
    this.loadConfig();
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("emudevz.readOnlyPaths")) {
        this.loadConfig();
        this._onDidChangeFileDecorations.fire(undefined);
      }
    });
  }

  private loadConfig(): void {
    this.readOnlyPaths =
      vscode.workspace
        .getConfiguration("emudevz")
        .get<string[]>("readOnlyPaths") ?? ["/docs", "/lib", "/roms"];
  }

  provideFileDecoration(
    uri: vscode.Uri
  ): vscode.FileDecoration | undefined {
    if (uri.scheme !== "emudevz") return undefined;

    if (this.isReadOnly(uri.path)) {
      return {
        badge: "🔒",
        tooltip: "Read-only (game reference file)",
        color: new vscode.ThemeColor("disabledForeground"),
      };
    }
    return undefined;
  }

  isReadOnly(gamePath: string): boolean {
    const normalized = gamePath.startsWith("/") ? gamePath : "/" + gamePath;
    return this.readOnlyPaths.some(
      (ro) => normalized === ro || normalized.startsWith(ro + "/")
    );
  }

  dispose(): void {
    this._onDidChangeFileDecorations.dispose();
  }
}
