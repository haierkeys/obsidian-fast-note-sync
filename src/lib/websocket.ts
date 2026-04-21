import { Notice, moment } from "obsidian";

import { syncReceiveMethodHandlers, StartupFullNotesSync } from "./fs";
import { dump, isWsUrl } from "./helps";
import FastSync from "../main";


// WebSocket 连接常量
const RECONNECT_BASE_DELAY = 3000 // 重连基础延迟 (毫秒)
const CONNECTION_CHECK_INTERVAL = 3000 // 连接检查间隔 (毫秒)


export class WebSocketClient {
  private ws: WebSocket
  private wsApi: string
  private plugin: FastSync
  public isOpen: boolean = false
  public isAuth: boolean = false
  public checkConnection: number
  public checkReConnectTimeout: number
  public timeConnect = 0
  public count = 0
  //同步全部文件时设置
  public isSyncAllFilesInProgress: boolean = false
  public isRegister: boolean = false
  private messageQueue: { action: string; data: object | string }[] = []
  private onStatusChange?: (status: boolean) => void

  constructor(plugin: FastSync) {
    this.plugin = plugin
    this.wsApi = plugin.settings.wsApi
      .replace(/^http/, "ws")
      .replace(/\/+$/, '') // 去除尾部斜杠
  }

  public isConnected(): boolean {
    return this.isOpen
  }

  public register(onStatusChange?: (status: boolean) => void) {
    if (onStatusChange) this.onStatusChange = onStatusChange

    if ((!this.ws || this.ws.readyState !== WebSocket.OPEN) && isWsUrl(this.wsApi)) {
      this.isRegister = true
      this.ws = new WebSocket(this.wsApi + "/api/user/sync?lang=" + moment.locale() + "&count=" + this.count)
      this.count++
      this.ws.onerror = (error) => {
        dump("WebSocket error:", error)
        if (this.onStatusChange) this.onStatusChange(false)
      }
      this.ws.onopen = (e: Event): void => {
        this.timeConnect = 0
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
        if (this.isRegister && (e.reason != "AuthorizationFaild" && e.reason != "ClientClose")) {
          this.checkReConnect()
        }
        dump("Service close")
      }
      this.ws.onmessage = (event) => {
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
            dump("Service authorization success")
            this.FlushQueue()
            this.StartHandle()
          }
        }
        if (data.code == 0 || data.code > 200) {
          new Notice("Service Error: Code=" + data.code + " Msg=" + data.msg + data.details)
        } else {
          const handler = syncReceiveMethodHandlers.get(msgAction)
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
    dump("Service unregister")
  }

  //ddd
  public checkReConnect() {
    window.clearTimeout(this.checkReConnectTimeout)
    if (this.timeConnect > 15) { // Max attempts hardcoded or use constant
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
  public StartHandle() {
    StartupFullNotesSync(this.plugin)
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

  public MsgSend(action: string, data: object | string, isSync: boolean = false) {
    if (!this.isAuth || (this.isSyncAllFilesInProgress && !isSync)) {
      dump(`Service not ready or sync in progress, queuing message: ${action}`)
      this.messageQueue.push({ action, data })
      return
    }
    this.Send(action, data)
  }

  public Send(action: string, data: object | string) {
    if (this.ws.readyState !== WebSocket.OPEN) {
      dump(`Service not connected, queuing message: ${action}`)
      this.messageQueue.push({ action, data })
      return
    }

    dump(`Sending message: ${action}`)
    if (typeof data === "string") {
      this.ws.send(action + "|" + data)
    } else {
      this.ws.send(action + "|" + JSON.stringify(data))
    }
  }

  public FlushQueue() {
    if (this.messageQueue.length === 0) return

    dump(`Flushing ${this.messageQueue.length} queued messages`)
    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift()
      dump(`Flushing message: `, msg)
      if (msg) {
        this.Send(msg.action, msg.data)
      }
    }
  }
}