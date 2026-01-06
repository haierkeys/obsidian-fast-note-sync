import { Notice, moment, Platform } from "obsidian";

import { handleFileChunkDownload, BINARY_PREFIX_FILE_SYNC, clearUploadQueue } from "./file_operator";
import { receiveOperators, startupSync, startupFullSync, checkSyncCompletion } from "./operator";
import { dump, isWsUrl, addRandomParam } from "./helps";
import type FastSync from "../main";


// WebSocket 连接常量
const RECONNECT_BASE_DELAY = 3000 // 重连基础延迟 (毫秒)
const CONNECTION_CHECK_INTERVAL = 3000 // 连接检查间隔 (毫秒)
const WS_COUNT_STORAGE_KEY = "fast-note-sync-ws-count"

export class WebSocketClient {
  public ws: WebSocket
  private wsApi: string
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
  private onStatusChange?: (status: boolean) => void

  // Binary message handlers registry
  private binaryHandlers = new Map<string, (data: ArrayBuffer | Blob, plugin: FastSync) => void>();

  constructor(plugin: FastSync) {
    this.plugin = plugin
    this.wsApi = plugin.settings.wsApi.replace(/^http/, "ws").replace(/\/+$/, "") // 去除尾部斜杠

    // Load count from local storage
    const storedCount = localStorage.getItem(WS_COUNT_STORAGE_KEY)
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

  public isConnected(): boolean {
    return this.isOpen
  }

  public register(onStatusChange?: (status: boolean) => void) {
    this.wsApi = this.plugin.settings.api.replace(/^http/, "ws").replace(/\/+$/, "") // 去除尾部斜杠

    if (onStatusChange) this.onStatusChange = onStatusChange

    if ((!this.ws || this.ws.readyState !== WebSocket.OPEN) && isWsUrl(this.wsApi)) {
      this.isRegister = true
      const url = addRandomParam(this.wsApi + "/api/user/sync?lang=" + moment.locale() + "&count=" + this.count)
      this.ws = new WebSocket(url)
      this.count++
      localStorage.setItem(WS_COUNT_STORAGE_KEY, this.count.toString())
      this.ws.onerror = (error) => {
        dump("WebSocket error:", error)
        if (this.onStatusChange) this.onStatusChange(false)
      }
      this.ws.onopen = (e: Event): void => {
        this.timeConnect = 0
        this.isAuth = false
        this.isOpen = true
        dump("Service connected")
        if (this.onStatusChange) this.onStatusChange(true)
        this.Send("Authorization", this.plugin.settings.apiToken)
        dump("Service authorization")
        this.OnlineStatusCheck()
      }
      this.ws.onclose = (e) => {
        this.isAuth = false
        this.isOpen = false
        if (this.onStatusChange) this.onStatusChange(false)
        window.clearInterval(this.checkConnection)
        if (e.reason == "AuthorizationFaild") {
          new Notice("Remote Service Connection Closed: " + e.reason)
        } else if (e.reason == "ClientClose") {
          new Notice("Remote Service Connection Closed: " + e.reason)
        }
        if (this.isRegister && e.reason != "AuthorizationFaild" && e.reason != "ClientClose") {
          this.checkReConnect()
        }
        clearUploadQueue()
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
        // 使用字符串的 indexOf 找到第一个分隔符的位置
        let msgData: string = event.data
        let msgAction: string = ""
        const index = event.data.indexOf("|")
        if (index !== -1) {
          msgData = event.data.slice(index + 1)
          msgAction = event.data.slice(0, index)
        }
        const data = JSON.parse(msgData)
        if (msgAction == "Authorization") {
          if (data.code == 0 || data.code > 200) {
            new Notice("Service Authorization Error: Code=" + data.code + " Msg=" + data.msg + data.details)
            return
          } else {
            this.isAuth = true
            this.plugin.settings.apiVersion = data.data.version
            this.plugin.saveSettings()
            dump("Service authorization success")

            let clientName = ""
            if (Platform.isDesktopApp && Platform.isMacOS) {
              clientName += "Mac"
            } else if (Platform.isDesktopApp && Platform.isWin) {
              clientName += "Win"
            } else if (Platform.isDesktopApp && Platform.isLinux) {
              clientName += "Linux"
            } else if (Platform.isIosApp && Platform.isTablet) {
              clientName += "iPad"
            } else if (Platform.isIosApp && Platform.isPhone) {
              clientName += "iPhone"
            } else if (Platform.isAndroidApp && Platform.isTablet) {
              clientName += "Android"
            } else if (Platform.isAndroidApp && Platform.isPhone) {
              clientName += "Android"
            }
            clientName = this.plugin.settings.clientName + (this.plugin.settings.clientName != "" ? " " + clientName : clientName)

            this.Send("ClientInfo", JSON.stringify({ name: clientName, version: this.plugin.settings.apiVersion }))
            this.StartHandle()
          }
        }
        if (data.code == 0 || data.code > 200) {
          new Notice("Service Error: Code=" + data.code + " Message=" + data.message + " Details=" + data.details)
        } else {

          if (typeof data === 'object' && 'vault' in data && data.vault != null && data.vault != this.plugin.settings.vault) {
            dump("Service vault " + data.vault + " not match " + this.plugin.settings.vault)
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
  public unRegister() {
    window.clearInterval(this.checkConnection)
    window.clearTimeout(this.checkReConnectTimeout)
    this.isOpen = false
    this.isAuth = false
    this.isRegister = false
    if (this.ws) {
      this.ws.close(1000, "unRegister")
    }
    clearUploadQueue()
    dump("Service unregister")
  }

  //ddd
  public checkReConnect() {
    window.clearTimeout(this.checkReConnectTimeout)
    if (this.timeConnect > 15) {
      // Max attempts hardcoded or use constant
      return
    }
    if (this.ws && this.ws.readyState === WebSocket.CLOSED) {
      this.timeConnect++
      // Exponential backoff: 3s, 6s, 12s, 24s...
      const delay = RECONNECT_BASE_DELAY * Math.pow(2, this.timeConnect - 1)
      dump(`Service waiting reconnect: ${this.timeConnect}, delay: ${delay}ms`)

      this.checkReConnectTimeout = window.setTimeout(() => {
        this.register()
      }, delay)
    }
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
          new Notice("文件哈希管理器初始化超时,同步可能不稳定")
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
   * 等待发送缓冲区清空
   * @param maxBufferSize 最大缓冲区大小(字节),默认 1MB
   */
  private async waitForBufferDrain(maxBufferSize: number = 5 * 1024 * 1024): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    while (this.ws.bufferedAmount > maxBufferSize) {
      await new Promise(resolve => setTimeout(resolve, 400))
    }
  }

  public async MsgSend(action: string, data: object | string, defer?: () => void) {
    if (!this.isAuth || !this.plugin.isFirstSync) {
      return
    }

    // 等待缓冲区有足够空间
    await this.waitForBufferDrain()
    this.Send(action, data)

    defer?.()
  }

  public Send(action: string, data: object | string) {
    if (this.ws.readyState !== WebSocket.OPEN) {
      dump(`Service not connected, queuing message: ${action}`)
      return
    }
    if (typeof data === "string") {
      this.ws.send(action + "|" + data)
    } else {
      this.ws.send(action + "|" + JSON.stringify(data))
    }
  }

  public async SendBinary(data: ArrayBuffer | Uint8Array, prefix: string, defer?: () => void) {
    if (this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    if (!prefix || prefix.length !== 2) {
      return;
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
    defer?.()
  }
}
