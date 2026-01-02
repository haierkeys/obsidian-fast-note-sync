import { Plugin } from "obsidian";

import { startupSync, startupFullSync, resetSettingSyncTime, handleSync } from "./lib/operator";
import { SettingTab, PluginSettings, DEFAULT_SETTINGS } from "./setting";
import { ConfigManager } from "./lib/config_manager";
import { EventManager } from "./lib/events_manager";
import { WebSocketClient } from "./lib/websocket";
import { dump, setLogEnabled } from "./lib/helps";
import { MenuManager } from "./lib/menu_manager";
import { $ } from "./lang/lang";


export default class FastSync extends Plugin {
  settingTab: SettingTab
  wsSettingChange: boolean
  settings: PluginSettings
  websocket: WebSocketClient
  configManager: ConfigManager
  eventManager: EventManager
  menuManager: MenuManager

  clipboardReadTip: string = ""

  isFirstSync: boolean = false
  isWatchEnabled: boolean = false
  ignoredFiles: Set<string> = new Set()
  ignoredConfigFiles: Set<string> = new Set()

  syncTypeCompleteCount: number = 0
  expectedSyncCount: number = 0

  totalFilesToDownload: number = 0
  downloadedFilesCount: number = 0
  totalChunksToDownload: number = 0
  downloadedChunksCount: number = 0

  totalChunksToUpload: number = 0
  uploadedChunksCount: number = 0

  // 文件下载会话管理
  fileDownloadSessions: Map<string, any> = new Map()
  syncTimer: NodeJS.Timeout | null = null

  getWatchEnabled(): boolean {
    return this.isWatchEnabled
  }

  enableWatch() {
    this.isWatchEnabled = true
  }

  disableWatch() {
    this.isWatchEnabled = false
  }

  addIgnoredFile(path: string) {
    this.ignoredFiles.add(path)
  }

  removeIgnoredFile(path: string) {
    this.ignoredFiles.delete(path)
  }

  addIgnoredConfigFile(path: string) {
    this.ignoredConfigFiles.add(path)
  }

  removeIgnoredConfigFile(path: string) {
    this.ignoredConfigFiles.delete(path)
  }

  updateRibbonIcon(status: boolean) {
    this.menuManager.updateRibbonIcon(status)
  }

  updateStatusBar(text: string, current?: number, total?: number) {
    this.menuManager.updateStatusBar(text, current, total)
  }

  async onload() {
    this.manifest.description = $("fast-node-sync-desc")
    await this.loadSettings()
    this.settingTab = new SettingTab(this.app, this)
    // 注册设置选项
    this.addSettingTab(this.settingTab)
    this.websocket = new WebSocketClient(this)

    // 初始化 菜单/状态栏/命令 等 UI 入口
    this.menuManager = new MenuManager(this)
    this.menuManager.init()

    // 初始化并注册事件层
    this.eventManager = new EventManager(this)
    this.eventManager.registerEvents()

    this.configManager = new ConfigManager(this)
    this.refreshRuntime()
  }

  onunload() {
    // 取消注册文件事件
    this.refreshRuntime(false)
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
  }

  async onExternalSettingsChange() {
    dump("onExternalSettingsChange")
    await this.loadSettings()
    if (this.settings.api && this.settings.apiToken) {
      this.settings.api = this.settings.api.replace(/\/+$/, "") // 去除尾部斜杠
      this.settings.wsApi = this.settings.api.replace(/^http/, "ws").replace(/\/+$/, "") // 去除尾部斜杠
    }
    this.refreshRuntime(true)
  }

  async saveSettings(setItem: string = "") {
    if (this.settings.api && this.settings.apiToken) {
      this.settings.api = this.settings.api.replace(/\/+$/, "") // 去除尾部斜杠
      this.settings.wsApi = this.settings.api.replace(/^http/, "ws").replace(/\/+$/, "") // 去除尾部斜杠
    }
    this.refreshRuntime(true, setItem)
    await this.saveData(this.settings)
  }

  refreshRuntime(forceRegister: boolean = true, setItem: string = "") {
    if (forceRegister && (this.settings.syncEnabled || this.settings.configSyncEnabled) && this.settings.api && this.settings.apiToken) {
      this.websocket.register((status) => this.updateRibbonIcon(status))

      if (this.syncTimer) {
        clearTimeout(this.syncTimer)
      }

      if (this.isFirstSync && this.websocket.isAuth) {
        this.syncTimer = setTimeout(() => {
          if (setItem == "syncEnabled" && this.settings.syncEnabled) {
            handleSync(this, true, "note")
          } else if (setItem == "configSyncEnabled" && this.settings.configSyncEnabled) {
            handleSync(this, true, "config")
          }
          this.syncTimer = null
        }, 2000)
      }
      this.ignoredFiles = new Set()
      this.ignoredConfigFiles = new Set()
      this.fileDownloadSessions = new Map<string, any>()
    } else {
      this.websocket.unRegister()
      this.isWatchEnabled = false
      this.ignoredFiles = new Set()
      this.ignoredConfigFiles = new Set()
      this.fileDownloadSessions.clear()
    }

    setLogEnabled(this.settings.logEnabled)
  }
}
