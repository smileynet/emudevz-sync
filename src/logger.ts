import * as vscode from "vscode";

type LogLevel = "info" | "warn" | "error" | "debug";

let channel: vscode.OutputChannel;
let verbose = false;

export function initLogger(outputChannel: vscode.OutputChannel): void {
  channel = outputChannel;
  verbose = vscode.workspace.getConfiguration("emudevz").get<boolean>("verbose") ?? false;

  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("emudevz.verbose")) {
      verbose = vscode.workspace.getConfiguration("emudevz").get<boolean>("verbose") ?? false;
      info("Verbose logging " + (verbose ? "enabled" : "disabled"));
    }
  });
}

function timestamp(): string {
  return new Date().toLocaleTimeString();
}

function write(level: LogLevel, msg: string): void {
  if (!channel) return;
  const prefix = level === "info" ? "" : `[${level.toUpperCase()}] `;
  channel.appendLine(`[${timestamp()}] ${prefix}${msg}`);
}

export function info(msg: string): void {
  write("info", msg);
}

export function warn(msg: string): void {
  write("warn", msg);
}

export function error(msg: string): void {
  write("error", msg);
}

export function debug(msg: string): void {
  if (verbose) write("debug", msg);
}
