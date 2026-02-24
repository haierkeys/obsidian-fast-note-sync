import { TFile, TAbstractFile, normalizePath } from "obsidian";

import { ReceiveMessage, ReceiveMtimeMessage, ReceivePathMessage, SyncEndData } from "./types";
import { hashContent, dump, isPathExcluded, getSafeCtime } from "./helps";
import type FastSync from "../main";


/**
 * 笔记修改事件处理
 */
export const noteModify = async function (file: TAbstractFile, plugin: FastSync, eventEnter: boolean = false) {
  if (plugin.settings.syncEnabled == false) return
  if (!(file instanceof TFile)) return
  if (!file.path.endsWith(".md")) return
  if (eventEnter && !plugin.getWatchEnabled()) return
  if (eventEnter && plugin.isIgnoredFile(file.path)) return
  if (isPathExcluded(file.path, plugin)) return

  await plugin.lockManager.withLock(file.path, async () => {
    plugin.addIgnoredFile(file.path)

    try {
      const content: string = await plugin.app.vault.cachedRead(file)
      const contentHash = hashContent(content)
      const baseHash = plugin.fileHashManager.getPathHash(file.path)

      const data = {
        vault: plugin.settings.vault,
        ctime: getSafeCtime(file.stat),
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
    } finally {
      plugin.removeIgnoredFile(file.path)
    }
  }, { maxRetries: 5, retryInterval: 50 });
}

/**
 * 笔记删除事件处理
 */
export const noteDelete = async function (file: TAbstractFile, plugin: FastSync, eventEnter: boolean = false) {
  if (plugin.settings.syncEnabled == false) return
  if (!(file instanceof TFile)) return
  if (!file.path.endsWith(".md")) return
  if (eventEnter && !plugin.getWatchEnabled()) return
  if (eventEnter && plugin.isIgnoredFile(file.path)) return
  if (isPathExcluded(file.path, plugin)) return

  await plugin.lockManager.withLock(file.path, async () => {
    plugin.addIgnoredFile(file.path)
    try {
      const data = {
        vault: plugin.settings.vault,
        path: file.path,
        pathHash: hashContent(file.path),
      }
      plugin.websocket.SendMessage("NoteDelete", data)

      dump(`Note delete send`, file.path)

      // WebSocket 消息发送后从哈希表中删除
      plugin.fileHashManager.removeFileHash(file.path)
    } finally {
      plugin.removeIgnoredFile(file.path)
    }
  }, { maxRetries: 3, retryInterval: 50 });
}

/**
 * 笔记重命名事件处理
 */
export const noteRename = async function (file: TAbstractFile, oldfile: string, plugin: FastSync, eventEnter: boolean = false) {
  if (plugin.settings.syncEnabled == false) return
  if (!(file instanceof TFile)) return
  if (!file.path.endsWith(".md")) return
  if (eventEnter && !plugin.getWatchEnabled()) return
  if (eventEnter && plugin.isIgnoredFile(file.path)) return
  if (isPathExcluded(file.path, plugin)) return

  // 重命名涉及两个路径，我们锁定新路径，旧路径由调用方或原子性保证
  await plugin.lockManager.withLock(file.path, async () => {
    plugin.addIgnoredFile(file.path)
    try {
      let contentHash = plugin.fileHashManager.getPathHash(oldfile)
      if (contentHash == null) {
        const content: string = await plugin.app.vault.cachedRead(file)
        contentHash = hashContent(content)
      }

      const data = {
        vault: plugin.settings.vault,
        path: file.path,
        pathHash: hashContent(file.path),
        oldPath: oldfile,
        oldPathHash: hashContent(oldfile),
      }

      plugin.websocket.SendMessage("NoteRename", data)
      dump(`Note rename send`, data.path, data.pathHash)

      // 删除旧路径,添加新路径(使用内容哈希)
      plugin.fileHashManager.removeFileHash(oldfile)
      plugin.fileHashManager.setFileHash(file.path, contentHash)
    } finally {
      plugin.removeIgnoredFile(file.path)
    }
  }, { maxRetries: 5, retryInterval: 50 });
}

/**
 * 接收服务端笔记修改通知
 */
export const receiveNoteSyncModify = async function (data: ReceiveMessage, plugin: FastSync) {
  if (plugin.settings.syncEnabled == false) return
  if (isPathExcluded(data.path, plugin)) return
  dump(`Receive note modify:`, data.path, data.contentHash, data.mtime, data.pathHash)

  const normalizedPath = normalizePath(data.path)

  await plugin.lockManager.withLock(normalizedPath, async () => {
    const file = plugin.app.vault.getFileByPath(normalizedPath)
    plugin.addIgnoredFile(normalizedPath)
    try {
      if (file) {
        await plugin.app.vault.modify(file, data.content, { ...(data.ctime > 0 && { ctime: data.ctime }), ...(data.mtime > 0 && { mtime: data.mtime }) })
      } else {
        const folder = normalizedPath.split("/").slice(0, -1).join("/")
        if (folder != "") {
          const dirExists = plugin.app.vault.getFolderByPath(folder)
          if (dirExists == null) await plugin.app.vault.createFolder(folder)
        }
        await plugin.app.vault.create(normalizedPath, data.content, { ...(data.ctime > 0 && { ctime: data.ctime }), ...(data.mtime > 0 && { mtime: data.mtime }) })
      }
      if (Number(plugin.localStorageManager.getMetadata("lastNoteSyncTime")) < data.lastTime) {
        plugin.localStorageManager.setMetadata("lastNoteSyncTime", data.lastTime)
      }

      // 服务端推送笔记更新,更新哈希表(使用内容哈希)
      plugin.fileHashManager.setFileHash(data.path, data.contentHash)
    } finally {
      plugin.removeIgnoredFile(normalizedPath)
    }
  }, { maxRetries: 5, retryInterval: 100 });

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
    ctime: getSafeCtime(file.stat),
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

  await plugin.lockManager.withLock(normalizedPath, async () => {
    const file = plugin.app.vault.getFileByPath(normalizedPath)
    if (file) {
      const content: string = await plugin.app.vault.cachedRead(file)
      plugin.addIgnoredFile(normalizedPath)
      try {
        await plugin.app.vault.modify(file, content, { ...(data.ctime > 0 && { ctime: data.ctime }), ...(data.mtime > 0 && { mtime: data.mtime }) })
      } finally {
        plugin.removeIgnoredFile(normalizedPath)
      }
    }
  }, { maxRetries: 5, retryInterval: 100 });

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

  await plugin.lockManager.withLock(normalizedPath, async () => {
    const file = plugin.app.vault.getFileByPath(normalizedPath)
    if (file instanceof TFile) {
      plugin.addIgnoredFile(normalizedPath)
      try {
        await plugin.app.vault.delete(file)
        // 服务端推送删除,从哈希表中移除
        plugin.fileHashManager.removeFileHash(normalizedPath)
      } finally {
        plugin.removeIgnoredFile(normalizedPath)
      }
    }
  }, { maxRetries: 5, retryInterval: 100 });

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

/**
 * 接收服务端笔记重命名通知
 */
export const receiveNoteSyncRename = async function (data: any, plugin: FastSync) {
  if (plugin.settings.syncEnabled == false) return
  if (isPathExcluded(data.path, plugin)) return
  if (isPathExcluded(data.oldPath, plugin)) return

  dump(`Receive note rename:`, data.oldPath, "->", data.path)

  const normalizedOldPath = normalizePath(data.oldPath)
  const normalizedNewPath = normalizePath(data.path)

  // 对于重命名，我们需要确新路径不被占用。旧路径通常正在被移动，所以锁定新路径。
  await plugin.lockManager.withLock(normalizedNewPath, async () => {
    const file = plugin.app.vault.getFileByPath(normalizedOldPath)
    if (file instanceof TFile) {
      plugin.addIgnoredFile(normalizedNewPath)
      plugin.addIgnoredFile(normalizedOldPath)

      try {
        // 如果目标路径已存在文件，先尝试删除
        const targetFile = plugin.app.vault.getFileByPath(normalizedNewPath)
        if (targetFile) {
          await plugin.app.vault.delete(targetFile)
        }

        await plugin.app.vault.rename(file, normalizedNewPath)

        // 更新元数据
        if (data.mtime) {
          const renamedFile = plugin.app.vault.getFileByPath(normalizedNewPath)
          if (renamedFile instanceof TFile) {
            const content = await plugin.app.vault.cachedRead(renamedFile)
            await plugin.app.vault.modify(renamedFile, content, { ...(data.ctime > 0 && { ctime: data.ctime }), ...(data.mtime > 0 && { mtime: data.mtime }) })
          }
        }

        // 更新哈希表：移除旧路径，添加新路径
        plugin.fileHashManager.removeFileHash(data.oldPath)
        plugin.fileHashManager.setFileHash(data.path, data.contentHash)
      } finally {
        plugin.removeIgnoredFile(normalizedNewPath)
        plugin.removeIgnoredFile(normalizedOldPath)
      }
    } else {
      // 找不到旧文件...
      const targetFile = plugin.app.vault.getFileByPath(normalizedNewPath)
      if (targetFile instanceof TFile) {
        const content = await plugin.app.vault.cachedRead(targetFile)
        const localContentHash = hashContent(content)
        if (localContentHash === data.contentHash) {
          dump(`Target file already exists and matches hash, skipping rename: ${data.path}`)
          plugin.fileHashManager.setFileHash(data.path, data.contentHash)
          return
        }
      }

      dump(`Local file not found for rename, requesting RePush: ${data.oldPath} -> ${data.path}`)
      const rePushData = {
        vault: plugin.settings.vault,
        path: data.path,
        pathHash: data.pathHash,
      }
      plugin.websocket.SendMessage("NoteRePush", rePushData)
      plugin.fileHashManager.setFileHash(data.path, data.contentHash)
    }
  }, { maxRetries: 10, retryInterval: 100 });

  plugin.noteSyncTasks.completed++
}
