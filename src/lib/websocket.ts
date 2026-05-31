import { moment, Platform } from "obsidian";

import { dump, dumpError, isWsUrl, addRandomParam, showSyncNotice, safeStringify } from "./helps";
import { handleFileChunkDownload, BINARY_PREFIX_FILE_SYNC, clearUploadQueue } from "./file_operator";
import { receiveOperators, startupSync } from "./operator";
import { SyncLogManager } from "./sync_log_manager";
import { CLIENT_TYPE } from "./types";
import type FastSync from "../main";
import { $ } from "../i18n/lang";


// 冲突相关错误码
const ERROR_SYNC_CONFLICT = 530

const AUTH_ERROR_REIMPORT_CODES = new Set([307, 308, 309, 310])

const AUTH_ERROR_FALLBACK_MESSAGES: Record<number, string> = {
  307: "Authorization token is missing",
  308: "Session expired or token has been revoked",
  309: "Authorization token is invalid or incomplete",
  310: "Authorization token has expired",
  312: "Authorization token is restricted by IP",
  313: "Authorization token is restricted by user agent",
  314: "Authorization token is restricted by client",
  315: "Authorization token scope is restricted",
}

function normalizeNoticeValue(value: unknown): string {
  if (value == null) return ""
  if (Array.isArray(value)) {
    return value
      .map(item => normalizeNoticeValue(item))
      .filter(Boolean)
      .join(", ")
  }

  const text = safeStringify(value).trim()
  return text === "undefined" ? "" : text
}

export function formatAuthorizationError(data: { code: number; message?: unknown; details?: unknown }): string {
  const message = normalizeNoticeValue(data.message) || AUTH_ERROR_FALLBACK_MESSAGES[data.code] || "Authorization failed"
  const details = normalizeNoticeValue(data.details)
  const detailsText = details ? " Details=" + details : ""
  const authFailureText = (message + " " + details).toLowerCase()
  const needsReimportHint = AUTH_ERROR_REIMPORT_CODES.has(data.code) ||
    authFailureText.includes("rotated") ||
    authFailureText.includes("revoked") ||
    authFailureText.includes("no longer exists") ||
    authFailureText.includes("missing")
  const hint = needsReimportHint ? " Hint=Please re-import the API configuration from the management console." : ""

  return "Service Authorization Error: Code=" + data.code + " Msg=" + message + detailsText + hint
}

// WebSocket 连接常量
const RECONNECT_BASE_DELAY = 1000 // 重连基础延迟 (毫秒)
const NON_RECONNECT_REASONS = new Set([
  "AuthorizationFaild",
  "ClientClose",
  "kicked by admin",
  "TokenRotatedOrRevoked",
  "broadcast failed"
])

function getWsCountStorageKey(plugin: FastSync): string {
  const vaultName = plugin.app.vault.getName();
  return `fns-${vaultName}-wsCount`;
}

export class WebSocketClient {
  public ws: WebSocket
  private plugin: FastSync
  public isOpen: boolean = false
  public isAuth: boolean = false
  public checkConnection: number
  public checkReConnectTimeout: number
  public timeConnect = 0
  public count = 0
  private currentStartHandleId: number = 0
  // 防并发锁：确保同一时间只有一个 register() 在执行，避免多个 health check 互相干扰
  // Concurrency lock: ensures only one register() runs at a time, preventing concurrent health check interference
  private registerPromise: Promise<void> | null = null
  //同步全部文件时设置


  public isRegister: boolean = true
  private statusListeners: Set<(status: boolean) => void> = new Set();

  // Binary message handlers registry
  private binaryHandlers = new Map<string, (data: ArrayBuffer | Blob, plugin: FastSync) => void>();

  constructor(plugin: FastSync) {
    this.plugin = plugin

    // Load count from local storage
    const storageKey = getWsCountStorageKey(this.plugin);
    let storedCount = this.plugin.app.loadLocalStorage(storageKey) as string | null;

    // 迁移逻辑：如果新键无值，尝试按顺序读取旧键
    if (storedCount === null) {
      const vaultName = this.plugin.app.vault.getName();
      // 1. 尝试上一个格式: fast-note-sync-[Vault]-wsCount
      const prevKey1 = `fast-note-sync-${vaultName}-wsCount`;
      let oldValue = this.plugin.app.loadLocalStorage(prevKey1) as string | null;

      // 2. 尝试更早的格式: fast-note-sync-[Vault]-ws-count
      if (oldValue === null) {
        const prevKey2 = `fast-note-sync-${vaultName}-ws-count`;
        oldValue = this.plugin.app.loadLocalStorage(prevKey2) as string | null;
      }

      // 3. 尝试最初始格式: fast-note-sync-ws-count
      if (oldValue === null) {
        const oldKey = "fast-note-sync-ws-count";
        oldValue = this.plugin.app.loadLocalStorage(oldKey) as string | null;
      }

      if (oldValue !== null) {
        storedCount = oldValue;
        this.plugin.app.saveLocalStorage(storageKey, storedCount);
      }
    }

    this.count = storedCount ? parseInt(storedCount) : 0

    // Register default file sync handler
    this.registerBinaryHandler(BINARY_PREFIX_FILE_SYNC, (data, plugin) => { void handleFileChunkDownload(data, plugin); });
  }

  public registerBinaryHandler(prefix: string, handler: (data: ArrayBuffer | Blob, plugin: FastSync) => void) {
    if (prefix.length !== 2) {
      dumpError("Binary handler prefix must be exactly 2 characters");
      return;
    }
    this.binaryHandlers.set(prefix, handler);
  }

  public addStatusListener(listener: (status: boolean) => void) {
    this.statusListeners.add(listener);
    // Notify immediately of current state if already registered
    if (this.isRegister) {
      listener(this.isOpen);
    }
  }

  public removeStatusListener(listener: (status: boolean) => void) {
    this.statusListeners.delete(listener);
  }

  private notifyStatusChange(status: boolean) {
    this.statusListeners.forEach(listener => listener(status));
  }

  /** 数据传输活动监听器 / Data transfer activity listeners */
  private activityListeners: Set<() => void> = new Set();

  public addActivityListener(listener: () => void) {
    this.activityListeners.add(listener);
  }

  private notifyActivity() {
    this.activityListeners.forEach(fn => fn());
  }

  public isConnected(): boolean {
    return this.isOpen
  }

  public async register() {

    // Prevent duplicate connection if already connecting or open
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      dump("WebSocket already connecting or open, skipping register");
      return;
    }

    // 防并发锁：确保同一时间只有一个 register 在执行
    // Concurrency lock: waits for any in-flight register to complete
    if (this.registerPromise) {
      await this.registerPromise;
      return;
    }

    this.registerPromise = this._doRegister();
    try {
      await this.registerPromise;
    } finally {
      this.registerPromise = null;
    }
  }

  private async _doRegister() {

    // Clean up existing closed socket if any
    if (this.ws) {
      this.cleanupWebSocket(this.ws);
    }

    this.isRegister = true

    // 每次 ws 连接 / 重连 前 必须 先 /api/health 请求成功之后再请求ws
    const needProbe = this.plugin.settings.autoRedirectEnabled || this.plugin.settings.wsPreProbeEnabled;
    let isHealthy = true;
    if (needProbe) {
        isHealthy = await this.plugin.api.probeApiRedirect(this.plugin.runApi);
    }
    if (!isHealthy) {
        dump("Health check failed before ws connect, scheduling reconnect...");
        if (this.plugin.settings.autoRedirectEnabled) {
            dump("Tip: If you are on mobile or using a proxy, try disabling 'Auto Detect API Redirect' in settings.");
        }
        this.isOpen = false;
        this.notifyStatusChange(false);
        this.checkReConnect();
        return;
    }

    if (isWsUrl(this.plugin.runWsApi)) {
      const client = CLIENT_TYPE;
      const clientName = encodeURIComponent(this.plugin.getClientName());
      const clientVersion = this.plugin.manifest.version || "";
      const wsUrl = addRandomParam(this.plugin.runWsApi + "/api/user/sync?lang=" + moment.locale() + "&count=" + this.count + "&client=" + client + "&clientName=" + clientName + "&clientVersion=" + clientVersion);
      this.ws = new WebSocket(wsUrl)
      this.ws.binaryType = "arraybuffer"
      this.count++
      this.plugin.app.saveLocalStorage(getWsCountStorageKey(this.plugin), this.count.toString())

      this.ws.onerror = (error: Event) => {
        dump("WebSocket error:", {
          timestamp: moment().format("YYYY-MM-DD HH:mm:ss.SSS"),
          url: wsUrl,
          readyState: this.ws.readyState,
          error: error
        })
        this.notifyStatusChange(false)
      }

      this.ws.onopen = (e: Event): void => {
        this.timeConnect = 0
        this.isAuth = false
        this.isOpen = true
        dump("Service connected", {
          timestamp: moment().format("YYYY-MM-DD HH:mm:ss.SSS"),
          url: wsUrl
        })
        // this.notifyStatusChange(true) // 移至授权成功后通知 / Moved to notification after authorization success
        if (this.plugin.runApi !== this.plugin.settings.api) {
          if (this.plugin.settings.isShowNotice) {
            showSyncNotice($("ui.status.api_connected", { url: this.plugin.runApi }), 5000)
          }
        }
        this.Send("Authorization", this.plugin.settings.apiToken)
        dump("Service authorization")
      }
      this.ws.onclose = (e: CloseEvent) => {
        this.isAuth = false
        this.isOpen = false
        this.notifyStatusChange(false)

        dump("Service close details:", {
          timestamp: moment().format("YYYY-MM-DD HH:mm:ss.SSS"),
          code: e.code,
          reason: e.reason,
          wasClean: e.wasClean,
          timeConnect: this.timeConnect,
          isRegister: this.isRegister
        })

        if (NON_RECONNECT_REASONS.has(e.reason)) {
          showSyncNotice("Remote Service Connection Closed: " + e.reason)
          this.isRegister = false
        }

        // Only reconnect if we differ intended to be registered
        if (this.isRegister && !NON_RECONNECT_REASONS.has(e.reason)) {
          // 断连时立即重置 isSyncing，避免重连后 handleSync 被守卫拦截
          // Reset isSyncing on disconnect to unblock handleSync after reconnect
          if (this.plugin.isSyncing) {
            this.plugin.isSyncing = false
            this.plugin.isSyncRequesting = false
          }
          this.checkReConnect()
        }
        clearUploadQueue()
        this.plugin.concurrencyManager.clear()
        dump("Service close")
      }
      this.ws.onmessage = (event: MessageEvent) => {
        // 处理二进制消息(文件分片下载)

        if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
          // Dynamic Binary Message Dispatch
          let binaryData: ArrayBuffer | Blob = event.data;

          // Extract prefix (first 2 bytes)
          if (binaryData instanceof Blob) {
            if (binaryData.size < 2) return;
          }

          void (async () => {
            let buf: ArrayBuffer;
            if (event.data instanceof Blob) {
              buf = await event.data.arrayBuffer();
            } else {
              buf = event.data as ArrayBuffer;
            }
            if (buf.byteLength < 2) return;

            const prefixBytes = new Uint8Array(buf.slice(0, 2));
            const prefixStr = new TextDecoder().decode(prefixBytes);

            const handler = this.binaryHandlers.get(prefixStr);
            if (handler) {
              // Pass the rest of the data
              const rest = buf.slice(2);
              handler(rest, this.plugin);
              this.notifyActivity();
            } else {
              dump("No handler for binary prefix:", prefixStr);
            }
          })();

          return
        }

        // 处理文本消息
        // 使用字符串 of indexOf 找到第一个分隔符的位置
        const fullMsg = event.data as string
        let msgData: string = fullMsg
        let msgAction: string = ""
        const index = fullMsg.indexOf("|")
        if (index !== -1) {
          msgData = fullMsg.slice(index + 1)
          msgAction = fullMsg.slice(0, index)
        }
        const data = JSON.parse(msgData) as {
          code: number;
          message?: string;
          details?: string;
          data?: Record<string, unknown>; // data 内部仍可能有多变结构
          vault?: string;
        }

        // 记录接收到的消息
        if (msgAction) {
          SyncLogManager.getInstance().logReceivedMessage(msgAction, data, this.plugin.currentSyncType);
        }


        if (msgAction == "Authorization") {
          if (data.code <= 0 || data.code >= 300) {
            showSyncNotice(formatAuthorizationError(data), 6000)
            return
          } else {
            this.isAuth = true
            const paths = (data.data?.paths as string[]) || [];
            this.plugin.shareIndicatorManager?.updateSharedPaths(paths);
            if (data.data) {
              this.plugin.localStorageManager.setMetadata("serverVersion", data.data.version ?? this.plugin.localStorageManager.getMetadata("serverVersion"))
              this.plugin.localStorageManager.setMetadata("serverChangelog", data.data.changelog ?? this.plugin.localStorageManager.getMetadata("serverChangelog"))
            }
            dump("Service authorization success")
            this.notifyStatusChange(true)

            this.sendClientInfo()
            void this.StartHandle()
          }
        }

        if (msgAction == "ClientInfo") {
          if (data.code <= 0 || data.code >= 300) {
            return
          } else {
            if (data.data) {
              this.plugin.versionManager.updateFromClientInfo(data.data);
            }
          }
          return
        }

        if (data.code <= 0 || data.code >= 300) {
          // 处理冲突相关错误码
          if (data.code === ERROR_SYNC_CONFLICT) {
            this.handleConflictError(data)
          } else {
            const errorMsg = data.message || "";
            const errorDetails = data.details ? " Details=" + data.details : "";
            showSyncNotice("Service Error: Code=" + data.code + " Message=" + errorMsg + errorDetails)
          }
        } else {

          if (typeof data === 'object' && 'vault' in data && data.vault != null && data.vault != this.plugin.settings.vault) {
            dump("Service vault " + data.vault + " not match " + this.plugin.settings.vault)
            return
          }
          const handler = receiveOperators.get(msgAction)
          if (handler) {
            void handler(data.data, this.plugin)
            this.notifyActivity()
          }
        }
      }
    }
  }

  private cleanupWebSocket(ws: WebSocket) {
    if (!ws) return;

    // 清理残留并发槽位 / Clear stale concurrency slots
    this.plugin.concurrencyManager.clear();

    // Remove listeners to prevent "ghost" events
    ws.onopen = null;
    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;

    try {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close(1000, "Cleanup");
      }
    } catch (e) {
      dumpError("Error closing WebSocket:", e);
    }
  }

  public unRegister(setUnregistered: boolean = false) {
    window.clearTimeout(this.checkReConnectTimeout)
    this.timeConnect = 0
    this.isOpen = false
    this.isAuth = false
    if (setUnregistered) {
      this.isRegister = false
    }

    if (this.ws) {
      // Use helper to cleanly close and remove listeners
      this.cleanupWebSocket(this.ws);
      this.ws = null as unknown as WebSocket; // Clear reference
    }

    clearUploadQueue()
    this.notifyStatusChange(false)
    dump("Service unregister")
  }

  //ddd
  public checkReConnect() {
    // 后台暂停期间不重连，避免无意义 health check 和退避计数增长
    // Skip reconnect when watch is disabled, avoids pointless health checks and backoff inflation in background
    if (!this.plugin.isWatchEnabled) {
      dump("Watch disabled, skipping reconnect")
      return
    }
    window.clearTimeout(this.checkReConnectTimeout)
    if (this.timeConnect > 15) {
      return
    }
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
      this.timeConnect++
      // 前 3 次固定 1s，之后指数增长，最大 30min: 1s, 1s, 1s, 2s, 4s, 8s, 16s, 32s, 64s, 128s, 256s, 512s, 1024s, 1800s, 1800s...
      let delay = this.timeConnect <= 3
        ? RECONNECT_BASE_DELAY
        : Math.min(RECONNECT_BASE_DELAY * Math.pow(2, this.timeConnect - 3), 1800000)

      // 调试地址回退逻辑（预热 3 次后再尝试）
      const debugUrls = this.plugin.settings.debugRemoteUrls ? this.plugin.settings.debugRemoteUrls.split("\n").filter(u => u.trim() !== "") : []
      if (debugUrls.length > 0) {
        if (this.timeConnect >= 4 && this.timeConnect < 4 + debugUrls.length) {
          const index = this.timeConnect - 4
          const url = debugUrls[index].trim()
          if (url) {
            dump(`Trying debug URL [${index + 1}/${debugUrls.length}]: ${url}`)
            this.plugin.runApi = url.replace(/\/+$/, "")
            this.plugin.runWsApi = url.replace(/^http/, "ws").replace(/\/+$/, "")

            delay = 1000
            showSyncNotice(`[FastSync] 尝试连接调试地址: ${url}`)
          }
        } else if (this.timeConnect === 4 + debugUrls.length) {
          this.plugin.updateRuntimeApi(this.plugin.settings.api);
          dump(`Debug URLs failed, reverting to settings API`)
        }
      }

      dump(`Service waiting reconnect: ${this.timeConnect}, delay: ${delay}ms`)

      this.checkReConnectTimeout = window.setTimeout(() => {
        void this.register()
      }, delay)
    }
  }

  public triggerReconnect() {
    dump("Triggering manual reconnect due to network change")
    // Reset connection time to allow immediate retry
    this.timeConnect = 0
    // Clear any existing reconnect timers
    window.clearTimeout(this.checkReConnectTimeout)
    // Force register
    void this.register();
  }

  public async StartHandle() {
    const handleId = ++this.currentStartHandleId
    dump(`Service start handle, id: ${handleId}`)

    if (this.plugin.settings.startupDelay > 0) {
      dump(`Startup delay: ${this.plugin.settings.startupDelay}ms`)
      await new Promise((resolve) => window.setTimeout(resolve, this.plugin.settings.startupDelay))
    }

    if (handleId !== this.currentStartHandleId) {
      dump(`Service start handle cancelled, id: ${handleId}`)
      return
    }

    // 等待 fileHashManager 初始化完成
    if (!this.plugin.fileHashManager || !this.plugin.fileHashManager.isReady()) {
      dump(`Waiting for fileHashManager to be ready...`)

      // 最多等待 30 秒
      const maxWaitTime = 30000
      const startTime = Date.now()

      while (!this.plugin.fileHashManager || !this.plugin.fileHashManager.isReady()) {
        if (Date.now() - startTime > maxWaitTime) {
          dump(`FileHashManager initialization timeout after ${maxWaitTime}ms`)
          showSyncNotice("文件哈希管理器初始化超时,同步可能不稳定")
          break
        }
        await new Promise((resolve) => window.setTimeout(resolve, 100))
      }

      if (this.plugin.fileHashManager && this.plugin.fileHashManager.isReady()) {
        dump(`FileHashManager is ready, proceeding with sync`)
      }
    }

    this.plugin.isFirstSync = true
    this.plugin.isWatchEnabled = true

    if (this.plugin.settings.manualSyncEnabled) {
      dump("Full Manual Sync Mode enabled, skipping startup sync")
      return
    }

    startupSync(this.plugin)
  }





  /**
   * 发送客户端信息到服务端
   * 用于更新客户端名称、版本、离线同步策略等信息
   */
  public sendClientInfo() {
    if (!this.isAuth) {
      return
    }

    const clientName = this.plugin.getClientName();

    this.Send("ClientInfo", JSON.stringify({
      name: clientName,
      version: this.plugin.manifest.version,
      type: CLIENT_TYPE,
      isDesktop: Platform.isDesktop,
      isMobile: Platform.isMobile,
      isPhone: Platform.isPhone,
      isTablet: Platform.isTablet,
      isMacOS: Platform.isMacOS,
      isWin: Platform.isWin,
      isLinux: Platform.isLinux,
      offlineSyncStrategy: this.plugin.settings.offlineSyncStrategy
    }))
  }
  /**
    * 等待发送缓冲区清空
    * @param maxBufferSize 最大缓冲区大小(字节),默认 1MB
    */
  private async waitForBufferDrain(maxBufferSize: number = 5 * 1024 * 1024): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    while (this.ws.bufferedAmount > maxBufferSize) {
      await new Promise(resolve => window.setTimeout(resolve, 50))
    }
  }

  public async SendMessage(action: string, data: object | string, before?: () => boolean, after?: () => void) {
    if (!this.isAuth || !this.plugin.isFirstSync) {
      return
    }

    // 在发送前执行 before 回调,如果返回 true 则取消发送
    if (before && before()) {
      return true; // 返回 true 表示被取消
    }

    // 等待缓冲区有足够空间
    await this.waitForBufferDrain()

    this.Send(action, data, () => {
      SyncLogManager.getInstance().logSentMessage(action, data, this.plugin.currentSyncType);
      after?.()
      this.notifyActivity()
    })

  }


  public Send(action: string, data: object | string, after?: () => void) {
    if (this.ws.readyState !== WebSocket.OPEN) {
      dump(`Service not connected, queuing message: ${action}`)
      return
    }
    if (typeof data === "string") {
      this.ws.send(action + "|" + data)
    } else {
      this.ws.send(action + "|" + JSON.stringify(data))
    }
    after?.()

  }


  public async SendBinary(data: ArrayBuffer | Uint8Array, prefix: string, before?: () => boolean, after?: () => void): Promise<boolean> {
    if (this.ws.readyState !== WebSocket.OPEN) {
      return false
    }

    if (!prefix || prefix.length !== 2) {
      return false;
    }

    // 在发送前执行 before 回调,如果返回 true 则取消发送
    if (before && before()) {
      return true; // 返回 true 表示被取消
    }

    // 等待缓冲区有足够空间
    await this.waitForBufferDrain()

    // 增加二进制消息管理层: 增加前两位字符
    const prefixBytes = new TextEncoder().encode(prefix);
    let dataToSend: Uint8Array;

    if (data instanceof Uint8Array) {
      dataToSend = new Uint8Array(prefixBytes.length + data.length);
      dataToSend.set(prefixBytes);
      dataToSend.set(data, prefixBytes.length);
    } else {
      // ArrayBuffer
      const dataView = new Uint8Array(data);
      dataToSend = new Uint8Array(prefixBytes.length + dataView.length);
      dataToSend.set(prefixBytes);
      dataToSend.set(dataView, prefixBytes.length);
    }

    this.ws.send(dataToSend)
    after?.()
    this.notifyActivity()
    return false; // 返回 false 表示正常发送
  }



  /**
   * 处理冲突相关错误
   * 当服务端检测到合并冲突或创建冲突文件时调用
   */
  private handleConflictError(data: { code: number; data?: { Path?: string }; message?: string; }) {
    const path = data.data?.Path


    dump("Conflict detected:", { code: data.code, Path: path, message: data.message })

    if (data.code === ERROR_SYNC_CONFLICT && path) {
      // 冲突文件已创建，显示详细通知
      showSyncNotice($("ui.status.conflict", { path: path }), 10000)
    }
  }
}
