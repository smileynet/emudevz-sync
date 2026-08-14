import * as vscode from "vscode";
import { EmuDevzFileSystemProvider } from "./filesystem";
import { StatusBar } from "./statusbar";
import { CDPBridge, BridgeState } from "./bridge";
import { FileWatcher } from "./watcher";
import * as log from "./logger";

let bridge: CDPBridge | undefined;
let statusBar: StatusBar | undefined;
let fsProvider: EmuDevzFileSystemProvider | undefined;
let watcher: FileWatcher | undefined;
let hasEverConnected = false;

export function activate(context: vscode.ExtensionContext): void {
  const config = vscode.workspace.getConfiguration("emudevz");
  const outputChannel = vscode.window.createOutputChannel("EmuDevz Sync");
  log.initLogger(outputChannel);

  statusBar = new StatusBar();
  bridge = new CDPBridge();
  fsProvider = new EmuDevzFileSystemProvider();
  watcher = new FileWatcher(
    config.get<number>("pollInterval") ?? 1000,
    config.get<string[]>("syncPaths") ?? ["/code"]
  );

  // Register the emudevz:// filesystem scheme
  context.subscriptions.push(
    vscode.workspace.registerFileSystemProvider("emudevz", fsProvider, {
      isCaseSensitive: true,
    })
  );

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand("emudevz.connect", () => connect()),
    vscode.commands.registerCommand("emudevz.disconnect", () => disconnect()),
    vscode.commands.registerCommand("emudevz.pullAll", () => pullAll()),
    vscode.commands.registerCommand("emudevz.pushAll", () => pushAll())
  );

  context.subscriptions.push(statusBar, watcher);

  // Bridge events → status bar + notifications
  bridge.on("stateChanged", (state: BridgeState) => {
    switch (state) {
      case "connecting":
        statusBar!.setConnecting();
        break;
      case "connected":
        statusBar!.setConnected();
        break;
      case "disconnected":
        statusBar!.setDisconnected();
        break;
    }
  });

  bridge.on("connected", () => {
    log.info("Connected to EmuDevz");
    fsProvider!.setBridge(bridge!);
    fsProvider!.setWatcher(watcher!);
    watcher!.start(bridge!);
    addWorkspaceFolder();
    // Only show notification on first manual connect, not auto-reconnects
    if (!hasEverConnected) {
      hasEverConnected = true;
      vscode.window.showInformationMessage(
        "EmuDevz: Connected! Game files are in the Explorer."
      );
    }
  });

  bridge.on("disconnected", () => {
    log.info("Disconnected from EmuDevz");
    watcher!.stop();
    // Silent — status bar shows the state. No notification for connection loss.
  });

  bridge.on("reconnecting", ({ attempt, delay }: { attempt: number; delay: number }) => {
    statusBar!.setConnecting();
    const delaySec = (delay / 1000).toFixed(1);
    statusBar!.setReconnecting(attempt, delaySec);
    log.debug(`Reconnect attempt ${attempt} (next in ${delaySec}s)`);
  });

  bridge.on("error", (err: Error) => {
    log.error(err.message);
    if (err.message.includes("Failed to reconnect")) {
      statusBar!.setError(err.message);
      vscode.window.showErrorMessage(
        `EmuDevz: ${err.message}`,
        "Retry"
      ).then((action) => {
        if (action === "Retry") connect();
      });
    }
  });

  // Watcher events → FileSystemProvider change notifications
  watcher.onDidChange((changes) => {
    fsProvider!.fireChanges(changes);
  });

  // Auto-connect if configured
  if (config.get<boolean>("autoConnect")) {
    connect();
  }
}

async function connect(): Promise<void> {
  if (!bridge || !statusBar) return;

  const config = vscode.workspace.getConfiguration("emudevz");
  const port = config.get<number>("port") ?? 9222;

  try {
    await bridge.connect(port);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    vscode.window.showErrorMessage(
      `EmuDevz: Cannot connect. ${msg}`,
      "Retry"
    ).then((action) => {
      if (action === "Retry") connect();
    });
  }
}

async function disconnect(): Promise<void> {
  if (!bridge || !statusBar) return;

  bridge.disconnect();
  watcher?.stop();
  fsProvider?.clearBridge();
}

async function pullAll(): Promise<void> {
  if (!bridge?.isConnected()) {
    vscode.window.showWarningMessage("EmuDevz: Not connected");
    return;
  }
  watcher?.reset();
  fsProvider?.fireFullRefresh();
  vscode.window.showInformationMessage("EmuDevz: Pulled all files");
}

async function pushAll(): Promise<void> {
  if (!bridge?.isConnected()) {
    vscode.window.showWarningMessage("EmuDevz: Not connected");
    return;
  }
  vscode.window.showInformationMessage(
    "EmuDevz: Files auto-sync on save. Use Pull All to refresh from game."
  );
}

function addWorkspaceFolder(): void {
  const folderUri = vscode.Uri.parse("emudevz:/");
  const existing = vscode.workspace.workspaceFolders?.find(
    (f) => f.uri.scheme === "emudevz"
  );
  if (!existing) {
    vscode.workspace.updateWorkspaceFolders(
      vscode.workspace.workspaceFolders?.length ?? 0,
      0,
      { uri: folderUri, name: "EmuDevz Game Files" }
    );
  }
}

export function deactivate(): void {
  watcher?.dispose();
  bridge?.disconnect();
}
