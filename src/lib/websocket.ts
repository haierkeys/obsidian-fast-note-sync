import { moment, Platform } from "obsidian";

import { handleFileChunkDownload, BINARY_PREFIX_FILE_SYNC, clearUploadQueue } from "./file_operator";
import { receiveOperators, startupSync, startupFullSync, checkSyncCompletion } from "./operator";
import { dump, isWsUrl, addRandomParam, isPathExcluded, isVersionNew, showSyncNotice } from "./helps";
import { SyncLogManager } from "./sync_log_manager";
import type FastSync from "../main";
import { $ } from "../i18n/lang";


// 冲突相关错误码
const ERROR_SYNC_CONFLICT = 530




// WebSocket 连接常量
const RECONNECT_BASE_DELAY = 3000 // 重连基础延迟 (毫秒)
const CONNECTION_CHECK_INTERVAL = 3000 // 连接检查间隔 (毫秒)

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
  //同步全部文件时设置


  public isRegister: boolean = false
  private statusListeners: Set<(status: boolean) => void> = new Set();

  // Binary message handlers registry
  private binaryHandlers = new Map<string, (data: ArrayBuffer | Blob, plugin: FastSync) => void>();

  constructor(plugin: FastSync) {
    this.plugin = plugin

    // Load count from local storage
    const storageKey = getWsCountStorageKey(this.plugin);
    let storedCount = localStorage.getItem(storageKey);

    // 迁移逻辑：如果新键无值，尝试按顺序读取旧键
    if (storedCount === null) {
      const vaultName = this.plugin.app.vault.getName();
      // 1. 尝试上一个格式: fast-note-sync-[Vault]-wsCount
      const prevKey1 = `fast-note-sync-${vaultName}-wsCount`;
      let oldValue = localStorage.getItem(prevKey1);

      // 2. 尝试更早的格式: fast-note-sync-[Vault]-ws-count
      if (oldValue === null) {
        const prevKey2 = `fast-note-sync-${vaultName}-ws-count`;
        oldValue = localStorage.getItem(prevKey2);
      }

      // 3. 尝试最初始格式: fast-note-sync-ws-count
      if (oldValue === null) {
        const oldKey = "fast-note-sync-ws-count";
        oldValue = localStorage.getItem(oldKey);
      }

      if (oldValue !== null) {
        storedCount = oldValue;
        localStorage.setItem(storageKey, storedCount);
      }
    }

    this.count = storedCount ? parseInt(storedCount) : 0

    // Register default file sync handler
    this.registerBinaryHandler(BINARY_PREFIX_FILE_SYNC, (data, plugin) => handleFileChunkDownload(data, plugin));
  }

  public registerBinaryHandler(prefix: string, handler: (data: ArrayBuffer | Blob, plugin: FastSync) => void) {
    if (prefix.length !== 2) {
      console.error("Binary handler prefix must be exactly 2 characters");
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

  public isConnected(): boolean {
    return this.isOpen
  }

  public async register() {

    // Prevent duplicate connection if already connecting or open
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      dump("WebSocket already connecting or open, skipping register");
      return;
    }

    // Clean up existing closed socket if any
    if (this.ws) {
      this.cleanupWebSocket(this.ws);
    }

    this.isRegister = true

    // 每次 ws 连接 / 重连 前 必须 先 /api/health 请求成功之后再请求ws
    const isHealthy = await this.plugin.api.probeApiRedirect(this.plugin.runApi);
    if (!isHealthy) {
        dump("Health check failed before ws connect, scheduling reconnect...");
        this.isOpen = false;
        this.notifyStatusChange(false);
        this.checkReConnect();
        return;
    }

    if (isWsUrl(this.plugin.runWsApi)) {
      const wsUrl = addRandomParam(this.plugin.runWsApi + "/api/user/sync?lang=" + moment.locale() + "&count=" + this.count);
      this.ws = new WebSocket(wsUrl)
      this.count++
      localStorage.setItem(getWsCountStorageKey(this.plugin), this.count.toString())

      this.ws.onerror = (error) => {
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
        this.OnlineStatusCheck()
      }
      this.ws.onclose = (e) => {
        this.isAuth = false
        this.isOpen = false
        this.notifyStatusChange(false)
        window.clearInterval(this.checkConnection)

        dump("Service close details:", {
          timestamp: moment().format("YYYY-MM-DD HH:mm:ss.SSS"),
          code: e.code,
          reason: e.reason,
          wasClean: e.wasClean,
          timeConnect: this.timeConnect,
          isRegister: this.isRegister
        })

        if (e.reason == "AuthorizationFaild") {
          showSyncNotice("Remote Service Connection Closed: " + e.reason)
        } else if (e.reason == "ClientClose") {
          showSyncNotice("Remote Service Connection Closed: " + e.reason)
        }

        // Only reconnect if we differ intended to be registered
        if (this.isRegister && e.reason != "AuthorizationFaild" && e.reason != "ClientClose") {
          this.checkReConnect()
        }
        clearUploadQueue()
        this.plugin.concurrencyManager.clear()
        dump("Service close")
      }
      this.ws.onmessage = (event) => {
        // 处理二进制消息(文件分片下载)

        if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
          // Dynamic Binary Message Dispatch
          let binaryData: ArrayBuffer | Blob = event.data;
          let prefix = "";

          // Extract prefix (first 2 bytes)
          if (binaryData instanceof Blob) {
            if (binaryData.size < 2) return;
          }

          (async () => {
            let buf: ArrayBuffer;
            if (event.data instanceof Blob) {
              buf = await event.data.arrayBuffer();
            } else {
              buf = event.data;
            }

            if (buf.byteLength < 2) return;

            const prefixBytes = new Uint8Array(buf.slice(0, 2));
            const prefixStr = new TextDecoder().decode(prefixBytes);

            const handler = this.binaryHandlers.get(prefixStr);
            if (handler) {
              // Pass the rest of the data
              const rest = buf.slice(2);
              handler(rest, this.plugin);
            } else {
              dump("No handler for binary prefix:", prefixStr);
            }
          })();

          return
        }

        // 处理文本消息
        // 使用字符串 of indexOf 找到第一个分隔符的位置
        let msgData: string = event.data
        let msgAction: string = ""
        const index = event.data.indexOf("|")
        if (index !== -1) {
          msgData = event.data.slice(index + 1)
          msgAction = event.data.slice(0, index)
        }
        const data = JSON.parse(msgData)

        // 记录接收到的消息
        if (msgAction) {
          SyncLogManager.getInstance().logReceivedMessage(msgAction, data, this.plugin.currentSyncType);
        }


        if (msgAction == "Authorization") {
          if (data.code == 0 || data.code > 200) {
            showSyncNotice("Service Authorization Error: Code=" + data.code + " Msg=" + data.msg + data.details)
            return
          } else {
            this.isAuth = true
            if (data.data) {
              this.plugin.localStorageManager.setMetadata("serverVersion", data.data.version ?? this.plugin.localStorageManager.getMetadata("serverVersion"))
              this.plugin.localStorageManager.setMetadata("serverChangelog", data.data.changelog ?? this.plugin.localStorageManager.getMetadata("serverChangelog"))
            }
            dump("Service authorization success")
            this.notifyStatusChange(true)

            this.sendClientInfo()
            this.StartHandle()
          }
        }

        if (msgAction == "ClientInfo") {
          if (data.code == 0 || data.code > 200) {

            return
          } else {
            if (data.data) {
              // 针对服务端版本 (For server version)
              const serverCurrent = this.plugin.localStorageManager.getMetadata("serverVersion");
              const serverLatest = data.data.versionNewName || data.data.version;
              const serverIsNew = (data.data.versionIsNew ?? this.plugin.localStorageManager.getMetadata("serverVersionIsNew")) && isVersionNew(serverCurrent, serverLatest);
              this.plugin.localStorageManager.setMetadata("serverVersionIsNew", serverIsNew)

              this.plugin.localStorageManager.setMetadata("serverVersionNewName", data.data.versionNewName ?? this.plugin.localStorageManager.getMetadata("serverVersionNewName"))
              this.plugin.localStorageManager.setMetadata("serverVersionNewLink", data.data.versionNewLink ?? this.plugin.localStorageManager.getMetadata("serverVersionNewLink"))
              this.plugin.localStorageManager.setMetadata("serverVersionNewChangelogContent", data.data.versionNewChangelogContent ?? this.plugin.localStorageManager.getMetadata("serverVersionNewChangelogContent"))
              this.plugin.localStorageManager.setMetadata("serverVersionChangelogContent", data.data.versionChangelogContent ?? this.plugin.localStorageManager.getMetadata("serverVersionChangelogContent"))

              // 针对插件版本 (For plugin version)
              const pluginCurrent = this.plugin.manifest.version;
              const pluginLatest = data.data.pluginVersionNewName;
              const pluginIsNew = (data.data.pluginVersionIsNew ?? this.plugin.localStorageManager.getMetadata("pluginVersionIsNew")) && isVersionNew(pluginCurrent, pluginLatest);
              this.plugin.localStorageManager.setMetadata("pluginVersionIsNew", pluginIsNew)

              this.plugin.localStorageManager.setMetadata("pluginVersionNewName", data.data.pluginVersionNewName ?? this.plugin.localStorageManager.getMetadata("pluginVersionNewName"))
              this.plugin.localStorageManager.setMetadata("pluginVersionNewLink", data.data.pluginVersionNewLink ?? this.plugin.localStorageManager.getMetadata("pluginVersionNewLink"))
              this.plugin.localStorageManager.setMetadata("pluginVersionNewChangelogContent", data.data.pluginVersionNewChangelogContent ?? this.plugin.localStorageManager.getMetadata("pluginVersionNewChangelogContent"))
              this.plugin.localStorageManager.setMetadata("pluginVersionChangelogContent", data.data.pluginVersionChangelogContent ?? this.plugin.localStorageManager.getMetadata("pluginVersionChangelogContent"))
              this.plugin.menuManager?.refreshUpgradeBadge();
            }
          }
          return
        }

        if (data.code == 0 || data.code > 200) {
          // 处理冲突相关错误码
          if (data.code === ERROR_SYNC_CONFLICT) {
            this.handleConflictError(data)
          } else {
            showSyncNotice("Service Error: Code=" + data.code + " Message=" + data.message + " Details=" + data.details)
          }
        } else {

          if (typeof data === 'object' && 'vault' in data && data.vault != null && data.vault != this.plugin.settings.vault) {
            dump("Service vault " + data.vault + " not match " + this.plugin.settings.vault)
            return
          }
          if (data.code == "") {
            return
          }
          const handler = receiveOperators.get(msgAction)
          if (handler) {
            handler(data.data, this.plugin)
          }
        }
      }
    }
  }

  private cleanupWebSocket(ws: WebSocket) {
    if (!ws) return;

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
      console.error("Error closing WebSocket:", e);
    }
  }

  public unRegister() {
    window.clearInterval(this.checkConnection)
    window.clearTimeout(this.checkReConnectTimeout)
    this.timeConnect = 0
    this.isOpen = false
    this.isAuth = false
    this.isRegister = false

    if (this.ws) {
      // Use helper to cleanly close and remove listeners
      this.cleanupWebSocket(this.ws);
      this.ws = null as any; // Clear reference
    }

    clearUploadQueue()
    this.notifyStatusChange(false)
    dump("Service unregister")
  }

  //ddd
  public checkReConnect() {
    window.clearTimeout(this.checkReConnectTimeout)
    if (this.timeConnect > 15) {
      // Max attempts hardcoded or use constant
      return
    }
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
      this.timeConnect++
      // Exponential backoff: 3s, 6s, 12s, 24s...
      let delay = RECONNECT_BASE_DELAY * Math.pow(2, this.timeConnect - 1)

      // 调试地址回退逻辑
      const debugUrls = this.plugin.settings.debugRemoteUrls ? this.plugin.settings.debugRemoteUrls.split("\n").filter(u => u.trim() !== "") : []
      if (debugUrls.length > 0) {
        // 从第2次重试开始尝试调试地址
        if (this.timeConnect >= 2 && this.timeConnect < 2 + debugUrls.length) {
          const index = this.timeConnect - 2
          const url = debugUrls[index].trim()
          if (url) {
            dump(`Trying debug URL [${index + 1}/${debugUrls.length}]: ${url}`)
            // 更新运行时 API
            this.plugin.runApi = url.replace(/\/+$/, "")
            this.plugin.runWsApi = url.replace(/^http/, "ws").replace(/\/+$/, "")

            // 调试尝试使用较短延迟
            delay = 1000
            showSyncNotice(`[FastSync] 尝试连接调试地址: ${url}`)
          }
        } else if (this.timeConnect === 2 + debugUrls.length) {
          // 调试地址全部失败后，恢复配置的原始地址
          this.plugin.updateRuntimeApi(this.plugin.settings.api);
          dump(`Debug URLs failed, reverting to settings API`)
        }
      }

      dump(`Service waiting reconnect: ${this.timeConnect}, delay: ${delay}ms`)

      this.checkReConnectTimeout = window.setTimeout(() => {
        this.register()
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
    this.register()
  }

  public async StartHandle() {
    const handleId = ++this.currentStartHandleId
    dump(`Service start handle, id: ${handleId}`)

    if (this.plugin.settings.startupDelay > 0) {
      dump(`Startup delay: ${this.plugin.settings.startupDelay}ms`)
      await new Promise((resolve) => setTimeout(resolve, this.plugin.settings.startupDelay))
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
        await new Promise((resolve) => setTimeout(resolve, 100))
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

  public OnlineStatusCheck() {
    // 检查 WebSocket 连接是否打开
    this.checkConnection = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.isOpen = true
      } else {
        this.isOpen = false
      }
    }, CONNECTION_CHECK_INTERVAL)
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
      type: "ObsidianPlugin",
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
      await new Promise(resolve => setTimeout(resolve, 50))
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
