import WebSocket from "ws";
import { EventEmitter } from "events";
import * as log from "./logger";

interface CDPMessage {
  id: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: { message: string };
}

interface CDPTarget {
  id: string;
  title: string;
  type: string;
  url: string;
  webSocketDebuggerUrl: string;
}

export interface FileStat {
  isDirectory: boolean;
  size: number;
}

export interface FileEntry {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
}

export type BridgeState = "disconnected" | "connecting" | "connected";

export class CDPBridge extends EventEmitter {
  private ws: WebSocket | null = null;
  private msgId = 0;
  private pending = new Map<
    number,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >();
  private state: BridgeState = "disconnected";
  private port = 9222;
  private host = "127.0.0.1";
  private autoReconnect = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 10;
  private readonly BASE_DELAY_MS = 1000;
  private intentionalDisconnect = false;

  async connect(port: number, host = "127.0.0.1"): Promise<void> {
    this.port = port;
    this.host = host;
    this.autoReconnect = true;
    this.intentionalDisconnect = false;
    this.reconnectAttempts = 0;
    await this.doConnect();
  }

  private async doConnect(): Promise<void> {
    this.setState("connecting");

    let target: CDPTarget;
    try {
      target = await this.findPageTarget(this.port, this.host);
    } catch (e: unknown) {
      this.setState("disconnected");
      const msg = e instanceof Error ? e.message : String(e);
      if (this.autoReconnect && !this.intentionalDisconnect) {
        this.scheduleReconnect();
        this.emit("error", new Error(`Cannot reach game: ${msg}. Will retry...`));
        return;
      }
      throw e;
    }

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(target.webSocketDebuggerUrl);

      const timeout = setTimeout(() => {
        this.ws?.close();
        const err = new Error("Connection timeout");
        if (this.autoReconnect && !this.intentionalDisconnect) {
          this.scheduleReconnect();
          this.emit("error", err);
        } else {
          reject(err);
        }
      }, 5000);

      this.ws.on("open", () => {
        clearTimeout(timeout);
        log.debug(`CDP: WebSocket connected to ${target.webSocketDebuggerUrl}`);
        this.setState("connected");
        this.reconnectAttempts = 0;
        this.emit("connected");
        resolve();
      });

      this.ws.on("message", (data: WebSocket.Data) => {
        const msg: CDPMessage = JSON.parse(data.toString());
        if (msg.id !== undefined && this.pending.has(msg.id)) {
          const handler = this.pending.get(msg.id)!;
          this.pending.delete(msg.id);
          if (msg.error) handler.reject(new Error(msg.error.message));
          else handler.resolve(msg.result);
        }
      });

      this.ws.on("error", (e) => {
        clearTimeout(timeout);
        if (this.state === "connecting") {
          this.setState("disconnected");
          if (this.autoReconnect && !this.intentionalDisconnect) {
            this.scheduleReconnect();
            this.emit("error", e);
          } else {
            reject(e);
          }
        }
      });

      this.ws.on("close", () => {
        log.debug("CDP: WebSocket closed");
        const wasConnected = this.state === "connected";
        this.setState("disconnected");
        this.rejectAllPending("Connection lost");

        if (wasConnected) {
          this.emit("disconnected");
          if (this.autoReconnect && !this.intentionalDisconnect) {
            this.scheduleReconnect();
          }
        }
      });
    });
  }

  disconnect(): void {
    this.intentionalDisconnect = true;
    this.autoReconnect = false;
    this.cancelReconnect();
    this.rejectAllPending("Disconnected");

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setState("disconnected");
  }

  isConnected(): boolean {
    return this.state === "connected";
  }

  getState(): BridgeState {
    return this.state;
  }

  // --- File operations via window.FS ---

  async listFiles(path: string): Promise<FileEntry[]> {
    this.ensureConnected();
    log.debug(`FS: listFiles ${path}`);
    const result = await this.evaluate(`
      (() => {
        try {
          return window.FS.lsr("${this.escapePath(path)}").map(f => ({
            name: f.name,
            path: f.filePath,
            size: f.size || 0,
            isDirectory: f.isDirectory || false
          }));
        } catch (e) { return { error: e.message }; }
      })()
    `);
    if (result?.error) throw this.fileError(result.error, path);
    return result ?? [];
  }

  async listDirectory(path: string): Promise<FileEntry[]> {
    this.ensureConnected();
    log.debug(`FS: listDirectory ${path}`);
    const result = await this.evaluate(`
      (() => {
        try {
          return window.FS.ls("${this.escapePath(path)}").map(f => ({
            name: f.name,
            path: f.filePath,
            size: f.size || 0,
            isDirectory: f.isDirectory || false
          }));
        } catch (e) { return { error: e.message }; }
      })()
    `);
    if (result?.error) throw this.fileError(result.error, path);
    return result ?? [];
  }

  async readFile(path: string): Promise<string> {
    this.ensureConnected();
    log.debug(`FS: read ${path}`);
    const result = await this.evaluate(`
      (() => {
        try { return window.FS.read("${this.escapePath(path)}"); }
        catch (e) { return { error: e.message }; }
      })()
    `);
    if (result?.error) throw this.fileError(result.error, path);
    return result ?? "";
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.ensureConnected();
    log.debug(`FS: write ${path} (${content.length} chars)`);
    const escaped = content
      .replace(/\\/g, "\\\\")
      .replace(/`/g, "\\`")
      .replace(/\$/g, "\\$");

    const result = await this.evaluate(`
      (() => {
        try {
          window.FS.write("${this.escapePath(path)}", \`${escaped}\`);
          return { success: true };
        } catch (e) { return { error: e.message }; }
      })()
    `);
    if (result?.error) throw this.fileError(result.error, path);
  }

  async stat(path: string): Promise<FileStat> {
    this.ensureConnected();
    const result = await this.evaluate(`
      (() => {
        try { return window.FS.stat("${this.escapePath(path)}"); }
        catch (e) { return { error: e.message }; }
      })()
    `);
    if (result?.error) throw this.fileError(result.error, path);
    return result ?? { isDirectory: false, size: 0 };
  }

  async exists(path: string): Promise<boolean> {
    this.ensureConnected();
    return (await this.evaluate(
      `window.FS.exists("${this.escapePath(path)}")`
    )) as boolean;
  }

  async mkdir(path: string): Promise<void> {
    this.ensureConnected();
    log.debug(`FS: mkdir ${path}`);
    const result = await this.evaluate(`
      (() => {
        try { window.FS.mkdirp("${this.escapePath(path)}"); return { success: true }; }
        catch (e) { return { error: e.message }; }
      })()
    `);
    if (result?.error) throw this.fileError(result.error, path);
  }

  async deleteFile(path: string): Promise<void> {
    this.ensureConnected();
    log.debug(`FS: delete ${path}`);
    const result = await this.evaluate(`
      (() => {
        try { window.FS.rm("${this.escapePath(path)}"); return { success: true }; }
        catch (e) { return { error: e.message }; }
      })()
    `);
    if (result?.error) throw this.fileError(result.error, path);
  }

  async deleteDirectory(path: string): Promise<void> {
    this.ensureConnected();
    log.debug(`FS: rmdir ${path}`);
    const result = await this.evaluate(`
      (() => {
        try { window.FS.rmrf("${this.escapePath(path)}"); return { success: true }; }
        catch (e) { return { error: e.message }; }
      })()
    `);
    if (result?.error) throw this.fileError(result.error, path);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    this.ensureConnected();
    log.debug(`FS: rename ${oldPath} → ${newPath}`);
    const result = await this.evaluate(`
      (() => {
        try {
          window.FS.mv("${this.escapePath(oldPath)}", "${this.escapePath(newPath)}");
          return { success: true };
        } catch (e) { return { error: e.message }; }
      })()
    `);
    if (result?.error) throw this.fileError(result.error, oldPath);
  }

  // --- Private ---

  private setState(state: BridgeState): void {
    if (this.state !== state) {
      this.state = state;
      this.emit("stateChanged", state);
    }
  }

  private scheduleReconnect(): void {
    this.cancelReconnect();
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      this.emit(
        "error",
        new Error(
          `Failed to reconnect after ${this.MAX_RECONNECT_ATTEMPTS} attempts`
        )
      );
      this.autoReconnect = false;
      return;
    }

    const delay = Math.min(
      this.BASE_DELAY_MS * Math.pow(2, this.reconnectAttempts),
      30000
    );
    this.reconnectAttempts++;
    this.emit("reconnecting", { attempt: this.reconnectAttempts, delay });

    this.reconnectTimer = setTimeout(() => {
      this.doConnect().catch(() => {
        // Error already emitted via event
      });
    }, delay);
  }

  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private rejectAllPending(reason: string): void {
    for (const [, handler] of this.pending) {
      handler.reject(new Error(reason));
    }
    this.pending.clear();
  }

  private ensureConnected(): void {
    if (!this.isConnected()) {
      throw new Error("Not connected to EmuDevz");
    }
  }

  private fileError(message: string, path: string): Error {
    return new Error(`${message} (${path})`);
  }

  private async evaluate(expression: string): Promise<any> {
    const start = Date.now();
    const response = (await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: false,
      returnByValue: true,
    })) as any;

    if (response?.exceptionDetails) {
      throw new Error(
        response.exceptionDetails.exception?.description ??
          response.exceptionDetails.text
      );
    }

    log.debug(`CDP: evaluate (${Date.now() - start}ms)`);
    return response?.result?.value;
  }

  private send(
    method: string,
    params: Record<string, unknown> = {}
  ): Promise<unknown> {
    if (!this.ws || !this.isConnected()) {
      return Promise.reject(new Error("Not connected"));
    }

    const id = ++this.msgId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws!.send(JSON.stringify({ id, method, params }));
    });
  }

  private async findPageTarget(port: number, host: string): Promise<CDPTarget> {
    const url = `http://${host}:${port}/json`;
    let res: Response;
    try {
      res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    } catch {
      throw new Error(
        `Cannot connect to CDP at ${url}. Is EmuDevz running with --remote-debugging-port=${port}?`
      );
    }
    if (!res.ok) {
      throw new Error(`CDP returned status ${res.status}`);
    }
    const targets = (await res.json()) as CDPTarget[];
    const page = targets.find(
      (t) => t.type === "page" && !t.url.includes("devtools://")
    );
    log.debug(`CDP: found ${targets.length} targets, selected: ${page?.title ?? "none"}`);
    if (!page) {
      throw new Error("No page target found. Is EmuDevz loaded?");
    }
    return page;
  }

  private escapePath(path: string): string {
    return path.replace(/\\/g, "/").replace(/"/g, '\\"');
  }
}
