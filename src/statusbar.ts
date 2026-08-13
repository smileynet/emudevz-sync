import * as vscode from "vscode";

export class StatusBar implements vscode.Disposable {
  private item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.setDisconnected();
    this.item.show();
  }

  setConnecting(): void {
    this.item.text = "$(sync~spin) EmuDevz: Connecting...";
    this.item.tooltip = "Connecting to EmuDevz via CDP";
    this.item.command = "emudevz.disconnect";
    this.item.backgroundColor = undefined;
  }

  setConnected(): void {
    this.item.text = "$(vm-running) EmuDevz: Connected";
    this.item.tooltip = "Connected to EmuDevz. Click to disconnect.";
    this.item.command = "emudevz.disconnect";
    this.item.backgroundColor = undefined;
  }

  setDisconnected(): void {
    this.item.text = "$(debug-disconnect) EmuDevz: Disconnected";
    this.item.tooltip =
      "Click to connect. Launch EmuDevz with --remote-debugging-port=9222";
    this.item.command = "emudevz.connect";
    this.item.backgroundColor = undefined;
  }

  setReconnecting(attempt: number, delaySec: string): void {
    this.item.text = `$(sync~spin) EmuDevz: Reconnecting (${attempt})...`;
    this.item.tooltip = `Reconnect attempt ${attempt}. Next retry in ${delaySec}s. Click to cancel.`;
    this.item.command = "emudevz.disconnect";
    this.item.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.warningBackground"
    );
  }

  setError(message: string): void {
    this.item.text = "$(error) EmuDevz: Error";
    this.item.tooltip = message;
    this.item.command = "emudevz.connect";
    this.item.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.errorBackground"
    );
  }

  dispose(): void {
    this.item.dispose();
  }
}
