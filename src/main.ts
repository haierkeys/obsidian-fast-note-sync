import { Plugin, setIcon, Menu, MenuItem, Notice } from 'obsidian';

import { startupSync, startupFullSync, resetSettingSyncTime, handleSync } from "./lib/operator";
import { SettingTab, PluginSettings, DEFAULT_SETTINGS } from "./setting";
import { NoteHistoryModal } from './views/note-history/history-modal';
import { ConfigManager } from "./lib/config_manager";
import { EventManager } from "./lib/events_manager";
import { WebSocketClient } from "./lib/websocket";
import { dump, setLogEnabled } from "./lib/helps";
import { $ } from "./lang/lang";


export default class FastSync extends Plugin {
  settingTab: SettingTab
  wsSettingChange: boolean
  settings: PluginSettings
  websocket: WebSocketClient
  configManager: ConfigManager
  eventManager: EventManager

  ribbonIcon: HTMLElement
  ribbonIconStatus: boolean = false
  statusBarItem: HTMLElement
  historyStatusBarItem: HTMLElement

  clipboardReadTip: string = ""

  isWatchEnabled: boolean = false
  ignoredFiles: Set<string> = new Set()
  ignoredConfigFiles: Set<string> = new Set()

  syncTypeCompleteCount: number = 0
  expectedSyncCount: number = 0

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
    this.manifest.description = $("fast-node-sync-desc")
    await this.loadSettings()
    this.settingTab = new SettingTab(this.app, this)
    // 注册设置选项
    this.addSettingTab(this.settingTab)
    this.websocket = new WebSocketClient(this)
    this.statusBarItem = this.addStatusBarItem()
    // Create Ribbon Icon once
    this.ribbonIcon = this.addRibbonIcon("wifi", "Fast Note Sync:" + $("同步全部笔记"), (event: MouseEvent) => {
      this.showRibbonMenu(event);
    })
    setIcon(this.ribbonIcon, "wifi-off")

    // 初始化 笔记历史 状态栏入口
    this.historyStatusBarItem = this.addStatusBarItem();
    this.historyStatusBarItem.addClass("mod-clickable");
    setIcon(this.historyStatusBarItem, "history");
    this.historyStatusBarItem.setAttribute("aria-label", $("笔记历史"));
    this.historyStatusBarItem.addEventListener("click", () => {
      const activeFile = this.app.workspace.getActiveFile();
      if (activeFile && activeFile.extension === "md") {
        new NoteHistoryModal(this.app, this, activeFile.path).open();
      } else {
        new Notice($("仅支持 Markdown 文件"));
      }
    });

    // 初始化并注册事件层
    this.eventManager = new EventManager(this)
    this.eventManager.registerEvents()

    // 注册命令
    this.addCommand({
      id: "start-sync",
      name: $("同步全部笔记"),
      callback: () => startupSync(this),
    })

    this.addCommand({
      id: "start-full-sync",
      name: $("同步全部笔记(完整比对)"),
      callback: () => startupFullSync(this),
    })

    this.addCommand({
      id: "clean-local-sync-time",
      name: $("清理本地同步时间"),
      callback: () => resetSettingSyncTime(this),
    })

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
      this.isWatchEnabled = true
      if (this.websocket.isAuth) {
        if (setItem == "syncEnabled") {
          handleSync(this, true, "note")
        } else if (setItem == "configSyncEnabled") {
          handleSync(this, true, "config")
        }
      }

      this.fileDownloadSessions = new Map<string, any>()
    }

    setLogEnabled(this.settings.logEnabled)
  }

  showRibbonMenu(event: MouseEvent) {
    const menu = new Menu();

    if (this.settings.syncEnabled) {
      menu.addItem((item: MenuItem) => {
        item
          .setIcon("pause")
          .setTitle($("关闭自动同步"))
          .onClick(async () => {
            this.settings.syncEnabled = false
            await this.saveSettings()
            new Notice($("启用笔记自动同步描述"))
          })
      })
    } else {
      menu.addItem((item: MenuItem) => {
        item
          .setIcon("play")
          .setTitle($("启动自动同步"))
          .onClick(async () => {
            this.settings.syncEnabled = true
            await this.saveSettings()
            new Notice($("启动自动同步"))
          })
      })
    }
    menu.addSeparator()

    menu.addItem((item: MenuItem) => {
      item
        .setIcon("cloud")
        .setTitle($("同步全部笔记"))
        .onClick(async () => {
          startupSync(this)
        })
    })
    menu.addSeparator()
    menu.addItem((item: MenuItem) => {
      item
        .setIcon("cloudy")
        .setTitle($("同步全部笔记(完整比对)"))
        .onClick(async () => {
          startupFullSync(this)
        })
    })

    if (this.settings.apiVersion) {
      menu.addSeparator()
      menu.addItem((item: MenuItem) => {
        item
          .setTitle($("服务端版本") + ": v" + this.settings.apiVersion)
          .setDisabled(true)
      })
    }

    menu.showAtMouseEvent(event);
  }
}
