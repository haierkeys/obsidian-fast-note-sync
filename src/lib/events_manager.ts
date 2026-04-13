import { TAbstractFile, Platform, TFile, TFolder, Menu, MenuItem, normalizePath } from "obsidian";

import { folderModify, folderDelete, folderRename } from "./folder_operator";
import { NoteHistoryModal } from "../views/note-history/history-modal";
import { noteModify, noteDelete, noteRename, noteDeleteByPath } from "./note_operator";
import { fileModify, fileDelete, fileRename, fileDeleteByPath } from "./file_operator";
import { dump, isPathInConfigSyncDirs } from "./helps";
import type FastSync from "../main";
import { $ } from "../i18n/lang";
import { ShareModal } from "../views/share-modal"

export class EventManager {
  private plugin: FastSync
  private rawEventTimers: Map<string, any> = new Map()
  //保存待处理的重命名文件的路径，用于跳过同时触发的 modify 事件
  private pendingRenamePaths: Set<string> = new Set()

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
      dump("EventManager: cleaning up")
      this.stop() // 清除所有待处理任务定时器 (Clear all pending task timers)
      window.removeEventListener("focus", this.onWindowFocus)
      window.removeEventListener("blur", this.onWindowBlur)
      window.removeEventListener("visibilitychange", this.onVisibilityChange)
      window.removeEventListener("online", this.onOnline)
      window.removeEventListener("offline", this.onOffline)
    })
  }

  /**
   * 停止所有定时器并清除任务状态
   * Stop all timers and clear task status
   */
  public stop() {
    this.rawEventTimers.forEach(timer => clearTimeout(timer))
    this.rawEventTimers.clear()
    this.pendingRenamePaths.clear()
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
      if (this.plugin.settings.autoPauseMinimized) {
        dump("Obsidian 已最小化，自动暂停同步")
        this.plugin.disableWatch()
      }
    } else {
      if (this.plugin.settings.autoPauseMinimized) {
        dump("Obsidian 已从最小化恢复，恢复同步")
        this.plugin.enableWatch()
      } else {
        // 如果未开启自动暂停，确保恢复时监听也是开启的（增强鲁棒性）
        this.plugin.enableWatch()
      }
      // 恢复前台时刷新分享状态（覆盖短暂后台期间其他设备变更分享的场景）
      // Refresh share state on foreground resume (covers share changes by other devices during brief background)
      this.plugin.shareIndicatorManager?.syncWithServer()
    }
  }

  private watchModify = (file: TAbstractFile, ctx?: any) => {
    // 检查 WebSocket 认证状态
    if (!this.plugin.websocket || !this.plugin.websocket.isAuth) {
      return
    }
    if (this.plugin.settings.manualSyncEnabled || this.plugin.settings.readonlySyncEnabled) return

    // 重命名会同时触发 rename 和 modify 事件，但只需要发送 rename 消息即可完成处理，因此跳过 modify 事件
    if (this.pendingRenamePaths.has(file.path)) {
      dump(`Modify skipped due to pending rename: ${file.path}`)
      return
    }

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

    // 清除旧路径上可能存在的 modify/delete 定时器
    // 因为旧路径已经被重命名，这些操作已无意义
    this.clearTimer(oldFile)

    // 将新路径加入待处理的重命名任务，用于跳过同时触发的 modify 事件
    this.pendingRenamePaths.add(file.path)

    // 直接使用延迟执行，不走 runWithDelay 的加锁逻辑
    // 因为 noteRename/fileRename 内部已经有锁机制，避免嵌套锁导致死锁
    let delay = this.plugin.settings.syncUpdateDelay || 0

    const executeRename = async () => {
      try {
        if (file instanceof TFile) {
          //对比新文件名和旧文件名后缀是否一致，如果不一致，则认为是文件类型变更，需要发送文件删除和文件创建消息
          const oldExt = oldFile.match(/\.([^.]+)$/)?.[1] ?? ''
          let isDiffFileType = file.extension !== oldExt
          if (isDiffFileType) {
            // 修复：rename 完成后旧路径的 TFile 已不存在，直接使用路径字符串避免空指针崩溃
            // Fix: TFile of old path no longer exists after rename completes, use path string to avoid null pointer crash
            this.runWithDelay(oldFile, () => {
              if (oldFile.endsWith(".md"))
                noteDeleteByPath(oldFile, this.plugin)
              else
                fileDeleteByPath(oldFile, this.plugin)
            }, 0)

            this.runWithDelay(file.path, () => {
              //如果新文件是markdown文件，则发送笔记创建消息，否则发送文件创建消息
              if (file.path.endsWith(".md"))
                noteModify(file, this.plugin, true)
              else
                fileModify(file, this.plugin, true)
            }, 0)
          }
          else{
            if (file.path.endsWith(".md")) {
              await noteRename(file, oldFile, this.plugin, true)
            } else {
              await fileRename(file, oldFile, this.plugin, true)
            }            
          }
        }
         else if (file instanceof TFolder) {
          await folderRename(file, oldFile, this.plugin, true)
        }
      } finally {
        // 重命名任务完成后，移除待处理标志
        this.pendingRenamePaths.delete(file.path)
      }
    }

    if (delay <= 0) {
      executeRename()
    } else {
      const timer = setTimeout(() => {
        this.rawEventTimers.delete(file.path)
        executeRename()
      }, delay)
      this.rawEventTimers.set(file.path, timer)
    }
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
   * 清除指定 key 的定时器
   * @param key 定时器的 key（文件路径）
   */
  private clearTimer(key: string) {
    if (this.rawEventTimers.has(key)) {
      clearTimeout(this.rawEventTimers.get(key))
      this.rawEventTimers.delete(key)
    }
  }

  /**
   * 延迟执行同步任务，引入 Atomics 保证原子性
   * @param key 任务唯一标识（通常是文件路径）
   * @param task 待执行的任务（支持 async）
   * @param delayset 额外延迟时间
   */
  private runWithDelay(key: string, task: () => void | Promise<void>, delayset: number = 0) {
    // 如果已有相同 key 的定时器，先清除
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
        await task()
      }, { maxRetries: 3, retryInterval: 50 })
      return
    }

    const timer = setTimeout(async () => {
      this.rawEventTimers.delete(key)

      // 执行任务时加锁，并带重试逻辑
      // 这里的重试是为了应对可能正好有远程同步在写该文件的情况
      await this.plugin.lockManager.withLock(key, async () => {
        await task()
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

    menu.addItem((item: MenuItem) => {
      item
        .setTitle($("ui.share.title"))
        .setIcon("share-2")
        .onClick(() => {
          new ShareModal(this.plugin.app, this.plugin, file.path).open()
        })
    })
  }
}
