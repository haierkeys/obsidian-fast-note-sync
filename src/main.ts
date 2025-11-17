import { Plugin } from "obsidian";

import { NoteModify, NoteDelete, FileRename, FileContentModify, OverrideRemoteAllFiles, SyncAllFiles } from "./lib/fs";
import { SettingTab, PluginSettings, DEFAULT_SETTINGS } from "./setting";
import { WebSocketClient } from "./lib/websocket";
import { AddRibbonIcon } from "./lib/menu";
import { isWsUrl } from "./lib/helps";
import { $ } from "./lang/lang";


interface SyncSkipFiles {
  [key: string]: string
}
interface EditorChangeTimeout {
  [key: string]: any
}

export default class FastSync extends Plugin {
  settingTab: SettingTab
  wsSettingChange: boolean
  settings: PluginSettings
  websocket: WebSocketClient
  SyncSkipFiles: SyncSkipFiles = {}
  SyncSkipDelFiles: SyncSkipFiles = {}
  SyncSkipModifyiles: SyncSkipFiles = {}
  clipboardReadTip :string = ""

  editorChangeTimeout: EditorChangeTimeout = {}

  ribbonIcon: HTMLElement
  ribbonIconInterval: any
  ribbonIconStatus: boolean = false


  async onload() {
    this.SyncSkipFiles = {}

    await this.loadSettings()
    this.settingTab = new SettingTab(this.app, this)
    // 注册设置选项
    this.addSettingTab(this.settingTab)
    this.websocket = new WebSocketClient(this)

    this.websocket.isSyncAllFilesInProgress = false
    if (this.settings.syncEnabled && this.settings.api && this.settings.apiToken) {
      this.websocket.register()
    } else {
      this.websocket.unRegister()
    }

    // 注册文件事件
    this.registerEvent(this.app.vault.on("create", (file) => NoteModify(file, this)))
    this.registerEvent(this.app.vault.on("modify", (file) => NoteModify(file, this)))
    this.registerEvent(this.app.vault.on("delete", (file) => NoteDelete(file, this)))
    this.registerEvent(this.app.vault.on("rename", (file, oldfile) => FileRename(file, oldfile, this)))

    // 注册编译器事件 // 不监听编辑器内容变化 因为 存在缓存 导致mtime 不准确
    // this.registerEvent(
    //   this.app.workspace.on("editor-change", async (editor, mdFile) => {
    //     if (mdFile.file == null) return
    //     const content = editor.getValue()
    //     this.SyncSkipModifyiles[mdFile.file.path] = mdFile.file.path
    //     clearTimeout(this.editorChangeTimeout[mdFile.file.path])
    //     this.editorChangeTimeout[mdFile.file.path] = setTimeout(() => {
    //       if (mdFile.file == null) return
    //       FileContentModify(mdFile.file, content, this)
    //       delete this.SyncSkipModifyiles[mdFile.file.path]
    //     }, 3000)
    //   })
    // )

    // 注册命令
    this.addCommand({
      id: "init-all-files",
      name: $("同步全部笔记(覆盖远端)"),
      callback: async () => OverrideRemoteAllFiles(this),
    })

    this.addCommand({
      id: "sync-all-files",
      name: $("同步全部笔记"),
      callback: async () => SyncAllFiles(this),
    })

    // this.addRibbonIcon("loader-circle", "Fast Note Sync: " + "ssssss", async () => {
    //   console.log(await this.app.vault.adapter.stat("未命名.md"))
    // })

    AddRibbonIcon(this)
  }

  onunload() {
    // 取消注册文件事件
    this.websocket.isSyncAllFilesInProgress = false
    clearInterval(this.ribbonIconInterval)
    this.websocket.unRegister()
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
  }

  async saveSettings() {
    this.websocket.isSyncAllFilesInProgress = false
    if (this.settings.api && this.settings.apiToken) {
      this.settings.wsApi = this.settings.api.replace(/^http/, "ws")
    }
    this.websocket.unRegister()
    if (this.settings.syncEnabled) {
      if (this.wsSettingChange) {
        this.websocket.unRegister()
        this.websocket.register()
        this.wsSettingChange = false
      }

    } else {
      this.websocket.unRegister()
    }
    await this.saveData(this.settings)
  }
}
