import { TFile, TAbstractFile, normalizePath } from "obsidian";

import { ReceiveMessage, ReceiveMtimeMessage, ReceivePathMessage, SyncEndData } from "./types";
import { hashContent, dump, isPathExcluded } from "./helps";
import type FastSync from "../main";


/**
 * 笔记修改事件处理
 */
export const noteModify = async function (file: TAbstractFile, plugin: FastSync, eventEnter: boolean = false) {
  if (plugin.settings.syncEnabled == false) return
  if (!(file instanceof TFile)) return
  if (!file.path.endsWith(".md")) return
  if (eventEnter && !plugin.getWatchEnabled()) return
  if (eventEnter && plugin.ignoredFiles.has(file.path)) return
  if (isPathExcluded(file.path, plugin)) return

  plugin.addIgnoredFile(file.path)

  const content: string = await plugin.app.vault.cachedRead(file)
  const contentHash = hashContent(content)
  const baseHash = plugin.fileHashManager.getPathHash(file.path)

  const data = {
    vault: plugin.settings.vault,
    ctime: file.stat.ctime,
    mtime: file.stat.mtime,
    path: file.path,
    pathHash: hashContent(file.path),
    content: content,
    contentHash: contentHash,
    // 始终传递 baseHash 信息，如果不可用则标记 baseHashMissing
    ...(baseHash !== null ? { baseHash } : { baseHashMissing: true }),
  }
  plugin.websocket.SendMessage("NoteModify", data)
  dump(`Note modify send`, data.path, data.contentHash, data.mtime, data.pathHash)

  // WebSocket 消息发送后更新哈希表(使用内容哈希)
  if (contentHash != baseHash) {
    plugin.fileHashManager.setFileHash(file.path, contentHash)
  }

  plugin.removeIgnoredFile(file.path)
}

/**
 * 笔记删除事件处理
 */
export const noteDelete = function (file: TAbstractFile, plugin: FastSync, eventEnter: boolean = false) {
  if (plugin.settings.syncEnabled == false) return
  if (!(file instanceof TFile)) return
  if (!file.path.endsWith(".md")) return
  if (eventEnter && !plugin.getWatchEnabled()) return
  if (eventEnter && plugin.ignoredFiles.has(file.path)) return
  if (isPathExcluded(file.path, plugin)) return

  plugin.addIgnoredFile(file.path)

  const data = {
    vault: plugin.settings.vault,
    path: file.path,
    pathHash: hashContent(file.path),
  }
  plugin.websocket.SendMessage("NoteDelete", data)

  dump(`Note delete send`, file.path)

  // WebSocket 消息发送后从哈希表中删除
  plugin.fileHashManager.removeFileHash(file.path)

  plugin.removeIgnoredFile(file.path)
}

/**
 * 笔记重命名事件处理
 */
export const noteRename = async function (file: TAbstractFile, oldfile: string, plugin: FastSync, eventEnter: boolean = false) {
  if (plugin.settings.syncEnabled == false) return
  if (!(file instanceof TFile)) return
  if (!file.path.endsWith(".md")) return
  if (eventEnter && !plugin.getWatchEnabled()) return
  if (eventEnter && plugin.ignoredFiles.has(file.path)) return
  if (isPathExcluded(file.path, plugin)) return

  plugin.addIgnoredFile(file.path)

  const content: string = await plugin.app.vault.cachedRead(file)
  const contentHash = hashContent(content)
  const baseHash = plugin.fileHashManager.getPathHash(file.path)

  const data = {
    vault: plugin.settings.vault,
    ctime: file.stat.ctime,
    mtime: file.stat.mtime,
    path: file.path,
    pathHash: hashContent(file.path),
    content: content,
    contentHash: contentHash,
    oldPath: oldfile,
    oldPathHash: hashContent(oldfile),
    // 始终传递 baseHash 信息，如果不可用则标记 baseHashMissing
    ...(baseHash !== null ? { baseHash } : { baseHashMissing: true }),
  }

  plugin.websocket.SendMessage("NoteRename", data)
  dump(`Note rename send`, data.path, data.contentHash, data.mtime, data.pathHash)

  // 删除旧路径,添加新路径(使用内容哈希)
  plugin.fileHashManager.removeFileHash(oldfile)
  plugin.fileHashManager.setFileHash(file.path, contentHash)

  plugin.removeIgnoredFile(file.path)
}

/**
 * 接收服务端笔记修改通知
 */
export const receiveNoteSyncModify = async function (data: ReceiveMessage, plugin: FastSync) {
  if (plugin.settings.syncEnabled == false) return
  if (isPathExcluded(data.path, plugin)) return
  dump(`Receive note modify:`, data.path, data.contentHash, data.mtime, data.pathHash)

  const normalizedPath = normalizePath(data.path)
  const file = plugin.app.vault.getFileByPath(normalizedPath)
  plugin.addIgnoredFile(normalizedPath)
  if (file) {
    await plugin.app.vault.modify(file, data.content, { ctime: data.ctime, mtime: data.mtime })
  } else {
    const folder = normalizedPath.split("/").slice(0, -1).join("/")
    if (folder != "") {
      const dirExists = plugin.app.vault.getFolderByPath(folder)
      if (dirExists == null) await plugin.app.vault.createFolder(folder)
    }
    await plugin.app.vault.create(normalizedPath, data.content, { ctime: data.ctime, mtime: data.mtime })
  }
  if (Number(plugin.localStorageManager.getMetadata("lastNoteSyncTime")) < data.lastTime) {
    plugin.localStorageManager.setMetadata("lastNoteSyncTime", data.lastTime)
  }
  plugin.removeIgnoredFile(normalizedPath)

  // 服务端推送笔记更新,更新哈希表(使用内容哈希)
  plugin.fileHashManager.setFileHash(data.path, data.contentHash)

  plugin.noteSyncTasks.completed++
}

/**
 * 接收服务端请求上传笔记
 */
export const receiveNoteUpload = async function (data: ReceivePathMessage, plugin: FastSync) {
  if (plugin.settings.syncEnabled == false) return
  if (plugin.settings.readonlySyncEnabled) {
    dump(`Read-only mode: Intercepted note upload request for ${data.path}`)
    plugin.noteSyncTasks.completed++
    return
  }
  if (isPathExcluded(data.path, plugin)) return
  dump(`Receive note need push:`, data.path)
  if (!data.path.endsWith(".md")) return
  const file = plugin.app.vault.getFileByPath(normalizePath(data.path))
  if (!file) return

  plugin.addIgnoredFile(file.path)

  const content: string = await plugin.app.vault.cachedRead(file)
  const contentHash = hashContent(content)
  const baseHash = plugin.fileHashManager.getPathHash(file.path)

  const sendData = {
    vault: plugin.settings.vault,
    ctime: file.stat.ctime,
    mtime: file.stat.mtime,
    path: file.path,
    pathHash: hashContent(file.path),
    content: content,
    contentHash: contentHash,
    // 始终传递 baseHash 信息，如果不可用则标记 baseHashMissing
    ...(baseHash !== null ? { baseHash } : { baseHashMissing: true }),
  }
  plugin.websocket.SendMessage("NoteModify", sendData, undefined, () => {
    plugin.fileHashManager.setFileHash(file.path, contentHash)
    plugin.removeIgnoredFile(file.path)
    plugin.noteSyncTasks.completed++
  })
  dump(`Note modify send`, sendData.path, sendData.contentHash, sendData.mtime, sendData.pathHash)
}

/**
 * 接收服务端笔记元数据(mtime)更新通知
 */
export const receiveNoteSyncMtime = async function (data: ReceiveMtimeMessage, plugin: FastSync) {
  if (plugin.settings.syncEnabled == false) return
  if (isPathExcluded(data.path, plugin)) return
  dump(`Receive note sync mtime:`, data.path, data.mtime)

  const normalizedPath = normalizePath(data.path)
  const file = plugin.app.vault.getFileByPath(normalizedPath)
  if (file) {
    const content: string = await plugin.app.vault.cachedRead(file)
    plugin.addIgnoredFile(normalizedPath)
    await plugin.app.vault.modify(file, content, { ctime: data.ctime, mtime: data.mtime })
    plugin.removeIgnoredFile(normalizedPath)
  }

  plugin.noteSyncTasks.completed++
}

/**
 * 接收服务端笔记删除通知
 */
export const receiveNoteSyncDelete = async function (data: ReceiveMessage, plugin: FastSync) {
  if (plugin.settings.syncEnabled == false) return
  if (isPathExcluded(data.path, plugin)) return
  dump(`Receive note delete:`, data.path, data.mtime, data.pathHash)
  const normalizedPath = normalizePath(data.path)

  const file = plugin.app.vault.getFileByPath(normalizedPath)
  console.table({ normalizedPath, file })
  if (file instanceof TFile) {
    plugin.addIgnoredFile(normalizedPath)
    await plugin.app.vault.delete(file)
    plugin.removeIgnoredFile(normalizedPath)

    // 服务端推送删除,从哈希表中移除
    plugin.fileHashManager.removeFileHash(normalizedPath)
  }

  plugin.noteSyncTasks.completed++
}

/**
 * 接收笔记同步结束通知
 */
export const receiveNoteSyncEnd = async function (data: any, plugin: FastSync) {
  if (plugin.settings.syncEnabled == false) return
  dump(`Receive note end:`, data)

  // 从 data 对象中提取任务统计信息
  const syncData = data as SyncEndData
  plugin.localStorageManager.setMetadata("lastNoteSyncTime", syncData.lastTime)
  plugin.syncTypeCompleteCount++
}
