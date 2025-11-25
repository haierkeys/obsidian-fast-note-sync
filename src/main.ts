import { Plugin, setIcon } from "obsidian";

import { NoteModify, NoteDelete, NoteRename, OverrideRemoteAllFiles, SyncAllFiles } from "./lib/fs";
import { SettingTab, PluginSettings, DEFAULT_SETTINGS } from "./setting";
import { WebSocketClient } from "./lib/websocket";
import { $ } from "./lang/lang";


interface SyncSkipFiles {
  [key: string]: string
}
interface EditorChangeTimeout {
  [key: string]: unknown
}

export default class FastSync extends Plugin {
  settingTab: SettingTab
  wsSettingChange: boolean
  settings: PluginSettings
  websocket: WebSocketClient
  syncSkipFiles: SyncSkipFiles = {}
  syncSkipDelFiles: SyncSkipFiles = {}
  syncSkipModifyFiles: SyncSkipFiles = {}
  clipboardReadTip: string = ""

  editorChangeTimeout: EditorChangeTimeout = {}

  ribbonIcon: HTMLElement
  ribbonIconStatus: boolean = false


  async onload() {
    this.syncSkipFiles = {}

    await this.loadSettings()
    this.settingTab = new SettingTab(this.app, this)
    // 注册设置选项
    this.addSettingTab(this.settingTab)
    this.websocket = new WebSocketClient(this)

    // Create Ribbon Icon once
    this.ribbonIcon = this.addRibbonIcon("loader-circle", "Fast Sync: " + $("同步全部笔记"), () => {
      SyncAllFiles(this)
    })

    this.websocket.isSyncAllFilesInProgress = false
    if (this.settings.syncEnabled && this.settings.api && this.settings.apiToken) {
      this.websocket.register((status) => this.updateRibbonIcon(status))
    } else {
      this.websocket.unRegister()
    }

    // 注册文件事件
    this.registerEvent(this.app.vault.on("create", (file) => NoteModify(file, this)))
    this.registerEvent(this.app.vault.on("modify", (file) => NoteModify(file, this)))
    this.registerEvent(this.app.vault.on("delete", (file) => NoteDelete(file, this)))
    this.registerEvent(this.app.vault.on("rename", (file, oldfile) => NoteRename(file, oldfile, this)))

    // 注册命令
    this.addCommand({
      id: "init-all-files",
      name: $("同步全部笔记(覆盖远端)"),
      callback: () => OverrideRemoteAllFiles(this),
    })

    this.addCommand({
      id: "sync-all-files",
      name: $("同步全部笔记"),
      callback: () => SyncAllFiles(this),
    })
  }

  onunload() {
    // 取消注册文件事件
    this.websocket.isSyncAllFilesInProgress = false
    this.websocket.unRegister()
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
    this.websocket.isSyncAllFilesInProgress = false
    if (this.settings.api && this.settings.apiToken) {
      this.settings.wsApi = this.settings.api
        .replace(/^http/, "ws")
        .replace(/\/+$/, '') // 去除尾部斜杠
    }
    this.websocket.unRegister()
    if (this.settings.syncEnabled) {
      if (this.wsSettingChange) {
        this.websocket.unRegister()
        this.websocket.register((status) => this.updateRibbonIcon(status))
        this.wsSettingChange = false
      }

    } else {
      this.websocket.unRegister()
    }
    await this.saveData(this.settings)
  }
}
