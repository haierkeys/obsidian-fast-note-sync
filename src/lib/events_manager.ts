import { TAbstractFile, Platform, TFile, TFolder, Menu, MenuItem, normalizePath } from "obsidian";

import { folderModify, folderDelete, folderRename } from "./folder_operator";
import { NoteHistoryModal } from "../views/note-history/history-modal";
import { noteModify, noteDelete, noteRename } from "./note_operator";
import { fileModify, fileDelete, fileRename } from "./file_operator";
import { dump, isPathInConfigSyncDirs } from "./helps";
import type FastSync from "../main";
import { $ } from "../i18n/lang";


export class EventManager {
  private plugin: FastSync
  private rawEventTimers: Map<string, any> = new Map()

  constructor(plugin: FastSync) {
    this.plugin = plugin
  }

  public registerEvents() {
    // 添加哈希表就绪检查
    if (!this.plugin.fileHashManager || !this.plugin.fileHashManager.isReady()) {
      dump("EventManager: 文件哈希管理器未就绪,跳过事件注册")
      return
    }

    const { app } = this.plugin

    // --- Vault Events ---
    this.plugin.registerEvent(app.vault.on("create", this.watchModify))
    this.plugin.registerEvent(app.vault.on("modify", this.watchModify))
    this.plugin.registerEvent(app.vault.on("delete", this.watchDelete))
    this.plugin.registerEvent(app.vault.on("rename", this.watchRename))
    //@ts-ignore Internal RAW API
    this.plugin.registerEvent(app.vault.on("raw", this.watchRaw))

    // --- Workspace Events ---
    this.plugin.registerEvent(app.workspace.on("file-menu", this.watchFileMenu))

    // --- Window Events ---
    window.addEventListener("focus", this.onWindowFocus)
    window.addEventListener("blur", this.onWindowBlur)
    window.addEventListener("visibilitychange", this.onVisibilityChange)
    window.addEventListener("online", this.onOnline)
    window.addEventListener("offline", this.onOffline)

    // 注册插件卸载时的清理逻辑
    this.plugin.register(() => {
      dump("EventManager: removing window event listeners")
      window.removeEventListener("focus", this.onWindowFocus)
      window.removeEventListener("blur", this.onWindowBlur)
      window.removeEventListener("visibilitychange", this.onVisibilityChange)
      window.removeEventListener("online", this.onOnline)
      window.removeEventListener("offline", this.onOffline)
    })
  }

  private onOnline = () => {
    dump(`Network restored (Event).`)
    if (this.plugin.websocket) {
      this.plugin.websocket.triggerReconnect()
    }
  }

  private onOffline = () => {
    dump(`Network lost (Event).`)
    if (this.plugin.websocket) {
      this.plugin.websocket.unRegister()
    }
  }

  private onWindowFocus = () => {
    if (Platform.isMobile) {
      dump("Obsidian Mobile Focus")
      this.plugin.enableWatch()
    }
  }

  private onWindowBlur = () => {
    if (Platform.isMobile) {
      dump("Obsidian Mobile Blur")
      this.plugin.disableWatch()
    }
  }

  private onVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      dump("Obsidian 已最小化")
      this.plugin.disableWatch()
    } else {
      dump("Obsidian 已从最小化恢复")
      this.plugin.enableWatch()
    }
  }

  private watchModify = (file: TAbstractFile, ctx?: any) => {
    // 检查 WebSocket 认证状态
    if (!this.plugin.websocket || !this.plugin.websocket.isAuth) {
      return
    }
    if (this.plugin.settings.manualSyncEnabled || this.plugin.settings.readonlySyncEnabled) return

    this.runWithDelay(file.path, () => {
      if (file instanceof TFile) {
        if (file.path.endsWith(".md")) {
          noteModify(file, this.plugin, true)
        } else {
          fileModify(file, this.plugin, true)
        }
      } else if (file instanceof TFolder) {
        folderModify(file, this.plugin, true)
      }
    })
  }

  private watchDelete = (file: TAbstractFile, ctx?: any) => {
    // 检查 WebSocket 认证状态
    if (!this.plugin.websocket || !this.plugin.websocket.isAuth) {
      return
    }
    if (this.plugin.settings.manualSyncEnabled || this.plugin.settings.readonlySyncEnabled) return

    this.runWithDelay(file.path, () => {
      if (file instanceof TFile) {
        if (file.path.endsWith(".md")) {
          noteDelete(file, this.plugin, true)
        } else {
          fileDelete(file, this.plugin, true)
        }
      } else if (file instanceof TFolder) {
        folderDelete(file, this.plugin, true)
      }
    })
  }

  private watchRename = (file: TAbstractFile, oldFile: string, ctx?: any) => {
    // 检查 WebSocket 认证状态
    if (!this.plugin.websocket || !this.plugin.websocket.isAuth) {
      return
    }
    if (this.plugin.settings.manualSyncEnabled || this.plugin.settings.readonlySyncEnabled) return

    // 重命名操作可能涉及两个路径，我们为新路径设置延迟
    this.runWithDelay(file.path, () => {
      if (file instanceof TFile) {
        if (file.path.endsWith(".md")) {
          noteRename(file, oldFile, this.plugin, true)
        } else {
          fileRename(file, oldFile, this.plugin, true)
        }
      } else if (file instanceof TFolder) {
        folderRename(file, oldFile, this.plugin, true)
      }
    })
  }

  private watchRaw = (path: string, ctx?: any) => {

    if (!path) return

    // 检查 WebSocket 认证状态
    if (!this.plugin.websocket || !this.plugin.websocket.isAuth) {
      return
    }
    if (this.plugin.settings.manualSyncEnabled || this.plugin.settings.readonlySyncEnabled) return

    // 路径安全性校验
    if (!isPathInConfigSyncDirs(path, this.plugin)) return

    this.runWithDelay(path, () => {
      this.plugin.configManager.handleRawEvent(normalizePath(path), true)
    }, 300)
  }

  /**
   * 延迟执行同步任务，引入 Atomics 保证原子性
   * @param key 任务唯一标识（通常是文件路径）
   * @param task 待执行的任务
   */
  private runWithDelay(key: string, task: () => void, delayset: number = 0) {
    // 如果已有定时器，先清除
    if (this.rawEventTimers.has(key)) {
      clearTimeout(this.rawEventTimers.get(key))
      this.rawEventTimers.delete(key)
    }

    let delay = this.plugin.settings.syncUpdateDelay || 0
    delay = delay + delayset

    if (delay <= 0) {
      // 立即执行也需要加锁，以防与其他异步任务冲突
      // 如果获取锁失败，尝试重试 3 次，每次 50ms
      this.plugin.lockManager.withLock(key, async () => {
        task()
      }, { maxRetries: 3, retryInterval: 50 })
      return
    }

    const timer = setTimeout(async () => {
      this.rawEventTimers.delete(key)

      // 执行任务时加锁，并带重试逻辑
      // 这里的重试是为了应对可能正好有远程同步在写该文件的情况
      await this.plugin.lockManager.withLock(key, async () => {
        task()
      }, { maxRetries: 5, retryInterval: 100 })
    }, delay)

    this.rawEventTimers.set(key, timer)
  }

  private watchFileMenu = (menu: Menu, file: TAbstractFile) => {
    if (!(file instanceof TFile) || !file.path.endsWith(".md")) return

    menu.addItem((item: MenuItem) => {
      item
        .setTitle($("ui.history.title"))
        .setIcon("history")
        .onClick(() => {
          new NoteHistoryModal(this.plugin.app, this.plugin, file.path).open()
        })
    })
  }
}
