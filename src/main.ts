import { Plugin, setIcon } from "obsidian";

import { NoteModify, NoteDelete, NoteRename, StartupSync, StartupFullSync, FileModify, FileDelete, FileRename } from "./lib/fs";
import { SettingTab, PluginSettings, DEFAULT_SETTINGS } from "./setting";
import { WebSocketClient } from "./lib/websocket";
import { dump, setLogEnabled } from "./lib/helps";
import { $ } from "./lang/lang";


export default class FastSync extends Plugin {
  settingTab: SettingTab
  wsSettingChange: boolean
  settings: PluginSettings
  websocket: WebSocketClient
  clipboardReadTip: string = ""

  ribbonIcon: HTMLElement
  ribbonIconStatus: boolean = false

  isWatchEnabled: boolean = false
  ignoredFiles: Set<string> = new Set()

  syncTypeCompleteCount: number = 0

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


  async onload() {

    await this.loadSettings()
    this.settingTab = new SettingTab(this.app, this)
    // 注册设置选项
    this.addSettingTab(this.settingTab)
    this.websocket = new WebSocketClient(this)

    // Create Ribbon Icon once
    this.ribbonIcon = this.addRibbonIcon("loader-circle", "Fast Sync: " + $("同步全部笔记"), () => {
      StartupSync(this)
    })

    if (this.settings.syncEnabled && this.settings.api && this.settings.apiToken) {
      this.websocket.register((status) => this.updateRibbonIcon(status))
      this.isWatchEnabled = true
      this.ignoredFiles = new Set()
      setLogEnabled(this.settings.logEnabled)
    } else {
      this.websocket.unRegister()
      this.isWatchEnabled = false
      this.ignoredFiles = new Set()
    }
    //
    this.registerEvent(this.app.vault.on("create", (file) => {
      NoteModify(file, this, true)
      FileModify(file, this, true)
    }))
    this.registerEvent(this.app.vault.on("modify", (file) => {
      NoteModify(file, this, true)
      FileModify(file, this, true)
    }))
    this.registerEvent(this.app.vault.on("delete", (file) => {
      NoteDelete(file, this, true)
      FileDelete(file, this, true)
    }))
    this.registerEvent(this.app.vault.on("rename", (file, oldfile) => {
      NoteRename(file, oldfile, this, true)
      FileRename(file, oldfile, this, true)
    }))

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

  }

  onunload() {
    // 取消注册文件事件
    this.websocket.unRegister()
    this.ignoredFiles = new Set()
    this.isWatchEnabled = false
    this.fileDownloadSessions.clear()
  }

  updateRibbonIcon(status: boolean) {
    if (status) {
      setIcon(this.ribbonIcon, "rotate-cw")
      this.ribbonIcon.setAttribute("aria-label", "Fast Sync: " + $("同步全部笔记") + " (Connected)")
    } else {
      setIcon(this.ribbonIcon, "loader-circle")
      this.ribbonIcon.setAttribute("aria-label", "Fast Sync: " + $("同步全部笔记") + " (Disconnected)")
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
  }

  async saveSettings() {

    if (this.settings.api && this.settings.apiToken) {
      this.settings.api = this.settings.api
        .replace(/\/+$/, '') // 去除尾部斜杠

      this.settings.wsApi = this.settings.api
        .replace(/^http/, "ws")
        .replace(/\/+$/, '') // 去除尾部斜杠
    }
    dump("settings", this.settings)

    if (this.settings.syncEnabled && this.settings.api && this.settings.apiToken) {
      this.websocket.register((status) => this.updateRibbonIcon(status))
      this.isWatchEnabled = true
      this.ignoredFiles = new Set()
      setLogEnabled(this.settings.logEnabled)
    } else {
      this.websocket.unRegister()
      this.isWatchEnabled = false
      this.ignoredFiles = new Set()
    }

    await this.saveData(this.settings)
  }
}
