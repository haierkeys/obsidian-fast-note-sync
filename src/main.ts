import { Plugin, setIcon, Menu, Setting } from "obsidian";

import { NoteModify, NoteDelete, NoteRename, StartupSync, StartupFullSync, FileModify, FileDelete, FileRename } from "./lib/fs";
import { SettingTab, PluginSettings, DEFAULT_SETTINGS } from "./setting";
import { dump, setLogEnabled, RibbonMenu } from "./lib/helps";
import { ConfigWatcher } from "./lib/config_watcher";
import { WebSocketClient } from "./lib/websocket";
import { $ } from "./lang/lang";


export default class FastSync extends Plugin {
  settingTab: SettingTab
  wsSettingChange: boolean
  settings: PluginSettings
  websocket: WebSocketClient
  configWatcher: ConfigWatcher

  ribbonIcon: HTMLElement
  ribbonIconStatus: boolean = false
  statusBarItem: HTMLElement

  clipboardReadTip: string = ""

  isWatchEnabled: boolean = false
  ignoredFiles: Set<string> = new Set()

  isWatchConfigEnabled: boolean = false
  ignoredConfigFiles: Set<string> = new Set()

  syncTypeCompleteCount: number = 0

  totalFilesToDownload: number = 0
  downloadedFilesCount: number = 0
  totalChunksToDownload: number = 0
  downloadedChunksCount: number = 0

  // 文件下载会话管理
  fileDownloadSessions: Map<string, any> = new Map()

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

  getConfigWatchEnabled(): boolean {
    return this.isWatchConfigEnabled
  }

  enableConfigWatch() {
    this.isWatchConfigEnabled = true
  }

  disableConfigWatch() {
    this.isWatchConfigEnabled = false
  }

  addIgnoredConfigFile(path: string) {
    this.ignoredConfigFiles.add(path)
  }

  removeIgnoredConfigFile(path: string) {
    this.ignoredConfigFiles.delete(path)
  }

  updateRibbonIcon(status: boolean) {
    this.ribbonIconStatus = status
    if (!this.ribbonIcon) return
    if (status) {
      setIcon(this.ribbonIcon, "wifi")
      this.ribbonIcon.setAttribute("aria-label", "Fast Note Sync: " + $("同步全部笔记") + " (" + $("服务已连接") + ")")
    } else {
      setIcon(this.ribbonIcon, "wifi-off")
      this.ribbonIcon.setAttribute("aria-label", "Fast Note Sync: " + $("同步全部笔记") + " (" + $("服务已断开") + ")")
    }
  }

  statusBarText: HTMLElement
  statusBarFill: HTMLElement
  statusBarProgressBar: HTMLElement

  updateStatusBar(text: string, current?: number, total?: number) {
    if (!this.statusBarText) {
      this.statusBarItem.addClass("fast-note-sync-status-bar-progress")

      this.statusBarProgressBar = this.statusBarItem.createDiv("fast-note-sync-progress-bar")
      this.statusBarFill = this.statusBarProgressBar.createDiv("fast-note-sync-progress-fill")

      this.statusBarText = this.statusBarItem.createDiv("fast-note-sync-progress-text")
    }

    if (current !== undefined && total !== undefined && total > 0) {
      this.statusBarItem.style.display = "flex"
      this.statusBarProgressBar.style.display = "block"

      const percentage = Math.min(100, Math.round((current / total) * 100))
      this.statusBarFill.style.width = `${percentage}%`
      this.statusBarText.setText(`${percentage}%`)
      this.statusBarItem.setAttribute("aria-label", text)
    } else {
      if (text) {
        // Show full progress bar when text is present (e.g. "Sync Complete")
        this.statusBarItem.style.display = "flex"
        this.statusBarProgressBar.style.display = "block"
        this.statusBarFill.style.width = "100%"
        this.statusBarText.setText(text)
      } else {
        this.statusBarItem.style.display = "none"
        this.statusBarText.setText("")
      }
    }
  }

  async onload() {
    await this.loadSettings()
    this.settingTab = new SettingTab(this.app, this)
    // 注册设置选项
    this.addSettingTab(this.settingTab)
    this.websocket = new WebSocketClient(this)
    this.statusBarItem = this.addStatusBarItem()
    // Create Ribbon Icon once
    this.ribbonIcon = this.addRibbonIcon("wifi", "Fast Note Sync:" + $("同步全部笔记"), (event: MouseEvent) => {
      const menu = new Menu()
      RibbonMenu(menu, this)
      menu.showAtMouseEvent(event)
      // StartupSync(this)
    })
    setIcon(this.ribbonIcon, "wifi-off")

    //
    this.registerEvent(
      this.app.vault.on("create", (file) => {
        NoteModify(file, this, true)
        FileModify(file, this, true)
      })
    )
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        NoteModify(file, this, true)
        FileModify(file, this, true)
      })
    )
    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        NoteDelete(file, this, true)
        FileDelete(file, this, true)
      })
    )
    this.registerEvent(
      this.app.vault.on("rename", (file, oldfile) => {
        NoteRename(file, oldfile, this, true)
        FileRename(file, oldfile, this, true)
      })
    )

    // 注册命令
    this.addCommand({
      id: "start-sync",
      name: $("同步全部笔记"),
      callback: () => StartupSync(this),
    })

    this.addCommand({
      id: "start-full-sync",
      name: $("同步全部笔记(完整比对)"),
      callback: () => StartupFullSync(this),
    })

    this.configWatcher = new ConfigWatcher(this)
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
    this.loadSettings()
  }

  async saveSettings(setItem: string = "") {
    if (this.settings.api && this.settings.apiToken) {
      this.settings.api = this.settings.api.replace(/\/+$/, "") // 去除尾部斜杠
      this.settings.wsApi = this.settings.api.replace(/^http/, "ws").replace(/\/+$/, "") // 去除尾部斜杠
    }
    this.refreshRuntime()
    await this.saveData(this.settings)
  }

  refreshRuntime(forceRegister: boolean = true, setItem: string = "") {
    if (forceRegister && this.settings.api && this.settings.apiToken) {
      this.isWatchConfigEnabled = this.settings.configSyncEnabled
    } else {
      this.isWatchConfigEnabled = false
    }

    if (forceRegister && (this.settings.syncEnabled || this.settings.configSyncEnabled) && this.settings.api && this.settings.apiToken) {
      this.websocket.register((status) => this.updateRibbonIcon(status))
      this.isWatchEnabled = true
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

    console.log("配置文件监听", this.isWatchConfigEnabled)
    if (this.isWatchConfigEnabled) {
      console.log("开始配置文件监听")
      this.configWatcher.start()
    } else {
      console.log("停止配置文件监听")
      this.configWatcher.stop()
    }

    setLogEnabled(this.settings.logEnabled)
  }
}
