import { TFile, TAbstractFile, normalizePath } from "obsidian";

import { ReceiveMessage, ReceiveMtimeMessage, ReceivePathMessage, SyncEndData } from "./types";
import { hashContent, dump, isPathExcluded, getSafeCtime } from "./helps";
import type FastSync from "../main";


/**
 * 笔记修改事件处理
 */
export const noteModify = async function (file: TAbstractFile, plugin: FastSync, eventEnter: boolean = false) {
  if (plugin.settings.syncEnabled == false || plugin.settings.readonlySyncEnabled) return
  if (!(file instanceof TFile)) return
  if (!file.path.endsWith(".md")) return
  if (eventEnter && !plugin.getWatchEnabled()) return
  if (eventEnter && plugin.isIgnoredFile(file.path)) return
  if (isPathExcluded(file.path, plugin)) return

  await plugin.lockManager.withLock(file.path, async () => {
    plugin.addIgnoredFile(file.path)

    try {
      const baseHash = plugin.fileHashManager.getPathHash(file.path)
      const lastSyncMtime = plugin.lastSyncMtime.get(file.path)

      // --- 优化：先尝试从缓存获取有效哈希 ---
      let contentHash = plugin.fileHashManager.getValidHash(file.path, file.stat.mtime, file.stat.size);
      let content: string | null = null;

      if (contentHash !== null) {
        // 如果哈希有效，且与 baseHash 和最后同步时间一致，则拦截
        if (contentHash === baseHash && (lastSyncMtime !== undefined && lastSyncMtime === file.stat.mtime)) {
          dump(`Note modify intercepted (cache match): ${file.path}`)
          return
        }
      } else {
        // 缓存失效或不存在，计算新哈希
        content = await plugin.app.vault.read(file)
        contentHash = hashContent(content)
      }

      if (content === null) content = await plugin.app.vault.read(file)

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
      // 将 hash 暂存到 pending map，等待服务端 NoteModifyAck 后再写入 hashManager
      // Temporarily store hash in pending map, update hashManager only after server NoteModifyAck
      if (contentHash != baseHash) {
        // 新建操作覆盖删除意图，清除 pending 防止晚到的 Ack 错误删除新文件 hash
        // New create supersedes delete intent; clear pending to prevent stale Ack from removing new hash
        plugin.pendingNoteDeleteAcks.delete(file.path)
        plugin.pendingNoteModifies.set(file.path, contentHash)
      }
      await plugin.concurrencyManager.waitForSlot(file.path)
      plugin.websocket.SendMessage("NoteModify", data)
      dump(`Note modify send`, data.path, data.contentHash, data.mtime, data.pathHash)
    } finally {
      plugin.removeIgnoredFile(file.path)
    }
  }, { maxRetries: 5, retryInterval: 50 });
}

/**
 * 笔记删除事件处理
 */
export const noteDelete = async function (file: TAbstractFile, plugin: FastSync, eventEnter: boolean = false) {
  if (plugin.settings.syncEnabled == false || plugin.settings.readonlySyncEnabled) return
  if (!(file instanceof TFile)) return
  if (!file.path.endsWith(".md")) return
  if (eventEnter && !plugin.getWatchEnabled()) return
  if (eventEnter && plugin.isIgnoredFile(file.path)) return
  if (isPathExcluded(file.path, plugin)) return

  // --- 新增：删除拦截 ---
  if (plugin.lastSyncPathDeleted.has(file.path)) {
    dump(`Note delete intercepted: ${file.path}`)
    return
  }

  await plugin.lockManager.withLock(file.path, async () => {
    // 清理可能存在的待确认上传记录，避免 pending map 内存泄漏
    // Clean up any pending note modify record to avoid memory leak
    plugin.pendingNoteModifies.delete(file.path)
    plugin.addIgnoredFile(file.path)
    try {
      const data = {
        vault: plugin.settings.vault,
        path: file.path,
        pathHash: hashContent(file.path),
      }
      await plugin.concurrencyManager.waitForSlot(file.path)
      plugin.websocket.SendMessage("NoteDelete", data, undefined, () => {
        // 消息真正写入 TCP 缓冲区后加入 pending set，等待 NoteDeleteAck 再删 hash
        // Add to pending set only after message is actually buffered; remove hash only on NoteDeleteAck
        plugin.pendingNoteDeleteAcks.add(file.path)
      })

      dump(`Note delete send`, file.path)
    } finally {
      plugin.removeIgnoredFile(file.path)
    }
  }, { maxRetries: 3, retryInterval: 50 });
}

/**
 * 按路径字符串发送笔记删除消息（用于无法获取 TFile 对象的场景，如 rename 后旧路径已不存在）
 * Send note delete message by path string (for scenarios where TFile object is unavailable, e.g., old path after rename)
 */
export const noteDeleteByPath = async function (filePath: string, plugin: FastSync) {
  if (plugin.settings.syncEnabled == false || plugin.settings.readonlySyncEnabled) return
  if (!filePath.endsWith(".md")) return
  if (isPathExcluded(filePath, plugin)) return
  if (plugin.lastSyncPathDeleted.has(filePath)) return

  await plugin.lockManager.withLock(filePath, async () => {
    // 清理可能存在的待确认上传记录，避免 pending map 内存泄漏
    // Clean up any pending note modify record to avoid memory leak
    plugin.pendingNoteModifies.delete(filePath)
    plugin.addIgnoredFile(filePath)
    try {
      await plugin.concurrencyManager.waitForSlot(filePath)
      plugin.websocket.SendMessage("NoteDelete", {
        vault: plugin.settings.vault,
        path: filePath,
        pathHash: hashContent(filePath),
      }, undefined, () => {
        // 消息真正写入 TCP 缓冲区后加入 pending set，等待 NoteDeleteAck 再删 hash
        // Add to pending set only after message is actually buffered; remove hash only on NoteDeleteAck
        plugin.pendingNoteDeleteAcks.add(filePath)
      })
      dump(`Note delete by path send`, filePath)
    } finally {
      plugin.removeIgnoredFile(filePath)
    }
  }, { maxRetries: 3, retryInterval: 50 });
}

/**
 * 笔记重命名事件处理
 */
export const noteRename = async function (file: TAbstractFile, oldfile: string, plugin: FastSync, eventEnter: boolean = false) {
  if (plugin.settings.syncEnabled == false || plugin.settings.readonlySyncEnabled) return
  if (!(file instanceof TFile)) return
  if (!file.path.endsWith(".md")) return
  if (eventEnter && !plugin.getWatchEnabled()) return
  if (eventEnter && plugin.isIgnoredFile(file.path)) return
  if (isPathExcluded(file.path, plugin)) return

  // --- 新增：重命名拦截 ---
  if (plugin.lastSyncPathRenamed.has(file.path)) {
    dump(`Note rename intercepted: ${file.path}`)
    return
  }

  // 重命名涉及两个路径，我们锁定新路径，旧路径由调用方或原子性保证
  await plugin.lockManager.withLock(file.path, async () => {
    plugin.addIgnoredFile(file.path)
    try {
      let contentHash = plugin.fileHashManager.getPathHash(oldfile)
      if (contentHash == null) {
        const content: string = await plugin.app.vault.read(file)
        contentHash = hashContent(content)
      }

      const data = {
        vault: plugin.settings.vault,
        path: file.path,
        pathHash: hashContent(file.path),
        oldPath: oldfile,
        oldPathHash: hashContent(oldfile),
      }

      // 将重命名信息推入 FIFO 队列，等待服务端 NoteRenameAck 后再更新 hashManager
      // Push rename info to FIFO queue, update hashManager only after server NoteRenameAck
      plugin.pendingNoteRenames.push({ oldPath: oldfile, newPath: file.path, contentHash })
      await plugin.concurrencyManager.waitForSlot(file.path, true)
      plugin.websocket.SendMessage("NoteRename", data)
      dump(`Note rename send`, data.path, data.pathHash)
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
  if (isPathExcluded(data.path, plugin)) {
    plugin.noteSyncTasks.completed++
    return
  }
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
          if (dirExists == null) {
            try {
              await plugin.app.vault.createFolder(folder)
            } catch (e) {
              // 并发竞争时只有一个调用成功，另一方忽略"已存在"错误
              // In concurrent race only one call succeeds; ignore "already exists" error
              if (!plugin.app.vault.getFolderByPath(folder)) throw e
            }
          }
        }
        await plugin.app.vault.create(normalizedPath, data.content, { ...(data.ctime > 0 && { ctime: data.ctime }), ...(data.mtime > 0 && { mtime: data.mtime }) })
      }
      if (data.lastTime && data.lastTime > Number(plugin.localStorageManager.getMetadata("lastNoteSyncTime"))) {
        plugin.localStorageManager.setMetadata("lastNoteSyncTime", data.lastTime)
      }

      // 服务端推送笔记更新,更新哈希表(使用内容哈希)
      // 注意：由于是服务端推送，我们信任服务端返回的 mtime，并尝试获取本地文件大小
      const updatedFile = plugin.app.vault.getFileByPath(normalizedPath);
      plugin.fileHashManager.setFileHash(data.path, data.contentHash, data.mtime, updatedFile?.stat.size || 0)
      // 记录同步后的 mtime 用于拦截
      plugin.lastSyncMtime.set(data.path, data.mtime)
      // 服务端版本已覆盖本地，清理 pending 避免增量过滤器旁路导致该笔记无限重传
      // Server version overrides local; clear pending to avoid incremental filter bypass loop
      plugin.pendingNoteModifies.delete(data.path)
      // 服务端推送新内容说明该路径已被创建/更新，清理可能残留的 deleteAck pending
      // Server push means path was created/updated; clear any stale deleteAck pending
      plugin.pendingNoteDeleteAcks.delete(data.path)
    } finally {
      setTimeout(() => {
        plugin.removeIgnoredFile(normalizedPath)
      }, 500);
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
  if (isPathExcluded(data.path, plugin)) {
    plugin.noteSyncTasks.completed++
    return
  }
  dump(`Receive note need push:`, data.path)
  if (!data.path.endsWith(".md")) {
    plugin.noteSyncTasks.completed++
    return
  }
  const file = plugin.app.vault.getFileByPath(normalizePath(data.path))
  if (!file) {
    plugin.noteSyncTasks.completed++
    return
  }

  plugin.addIgnoredFile(file.path)

  const baseHash = plugin.fileHashManager.getPathHash(file.path)
  // 尝试从缓存获取 (Try to get from cache)
  let contentHash = plugin.fileHashManager.getValidHash(file.path, file.stat.mtime, file.stat.size);
  const content = await plugin.app.vault.read(file);
  if (contentHash === null) contentHash = hashContent(content);

  if (content.length === 0) {
    dump(`Empty note upload: ${data.path}`);
  }

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
  // 将 hash 写入 pending map，等待 NoteModifyAck 确认后再写 hashManager
  // 若此路径已有旧 pending（来自中断的 noteModify），覆盖为最新 hash
  // Store hash in pending map; hashManager is written only after NoteModifyAck arrives.
  // Overwrites any stale pending entry left by a previously interrupted noteModify.
  plugin.pendingNoteModifies.set(file.path, contentHash)
  await plugin.concurrencyManager.waitForSlot(file.path)
  plugin.websocket.SendMessage("NoteModify", sendData, undefined, () => {
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
  if (isPathExcluded(data.path, plugin)) {
    plugin.noteSyncTasks.completed++
    return
  }
  dump(`Receive note sync mtime:`, data.path, data.mtime)

  const normalizedPath = normalizePath(data.path)

  await plugin.lockManager.withLock(normalizedPath, async () => {
    const file = plugin.app.vault.getFileByPath(normalizedPath)
    if (file) {
      const content: string = await plugin.app.vault.read(file)
      plugin.addIgnoredFile(normalizedPath)
      try {
        await plugin.app.vault.modify(file, content, { ...(data.ctime > 0 && { ctime: data.ctime }), ...(data.mtime > 0 && { mtime: data.mtime }) })
        // 记录 mtime
        plugin.lastSyncMtime.set(data.path, data.mtime)
        // 服务端走 UpdateMtime 说明内容 hash 与客户端发送的一致，提交 pending hash 到 hashManager
        // Server UpdateMtime means content hash matches what client sent; commit pending hash to hashManager
        const pendingHash = plugin.pendingNoteModifies.get(data.path)
        if (pendingHash !== undefined) {
          plugin.fileHashManager.setFileHash(data.path, pendingHash, data.mtime, file.stat.size)
          plugin.pendingNoteModifies.delete(data.path)
        }
        // 更新同步时间
        if (data.lastTime && data.lastTime > Number(plugin.localStorageManager.getMetadata("lastNoteSyncTime"))) {
          plugin.localStorageManager.setMetadata("lastNoteSyncTime", data.lastTime)
        }
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
  if (isPathExcluded(data.path, plugin)) {
    plugin.noteSyncTasks.completed++
    return
  }
  dump(`Receive note delete:`, data.path, data.mtime, data.pathHash)
  const normalizedPath = normalizePath(data.path)

  await plugin.lockManager.withLock(normalizedPath, async () => {
    const file = plugin.app.vault.getFileByPath(normalizedPath)
    if (file instanceof TFile) {
      plugin.addIgnoredFile(normalizedPath)
      // 记录待删除路径，用于拦截本地删除事件
      plugin.lastSyncPathDeleted.add(normalizedPath)
      try {
        await plugin.app.vault.delete(file)
        // 服务端推送删除,从哈希表中移除
        plugin.fileHashManager.removeFileHash(normalizedPath)
        plugin.lastSyncMtime.delete(normalizedPath)
        // 清理 pending，避免已删除路径的 pending 条目泄漏
        // Clean up pending to prevent memory leak for deleted path
        plugin.pendingNoteModifies.delete(normalizedPath)
        // 更新同步时间
        if (data.lastTime && data.lastTime > Number(plugin.localStorageManager.getMetadata("lastNoteSyncTime"))) {
          plugin.localStorageManager.setMetadata("lastNoteSyncTime", data.lastTime)
        }
      } finally {
        // 延时 500ms 清理拦截集合，确保本地事件已被处理
        setTimeout(() => {
          plugin.removeIgnoredFile(normalizedPath)
          plugin.lastSyncPathDeleted.delete(normalizedPath)
        }, 500);
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

  const syncData = data as SyncEndData
  // 更新任务统计信息，用于进度条计算 (Update task stats for progress bar)
  plugin.noteSyncTasks.needUpload = syncData.needUploadCount || 0
  plugin.noteSyncTasks.needModify = syncData.needModifyCount || 0
  plugin.noteSyncTasks.needSyncMtime = syncData.needSyncMtimeCount || 0
  plugin.noteSyncTasks.needDelete = syncData.needDeleteCount || 0

  // 无条件更新 lastNoteSyncTime，确保包含服务端本轮同步后的所有异步操作（如 SyncResourceFID）
  // Unconditionally update lastNoteSyncTime to cover all async server-side ops after this sync round (e.g., SyncResourceFID)
  plugin.localStorageManager.setMetadata("lastNoteSyncTime", syncData.lastTime)
  plugin.syncTypeCompleteCount++
}

/**
 * 接收服务端笔记重命名通知
 */
export const receiveNoteSyncRename = async function (data: any, plugin: FastSync) {
  if (plugin.settings.syncEnabled == false) return
  if (isPathExcluded(data.path, plugin) || isPathExcluded(data.oldPath, plugin)) {
    plugin.noteSyncTasks.completed++
    return
  }

  dump(`Receive note rename:`, data.oldPath, "->", data.path)

  const normalizedOldPath = normalizePath(data.oldPath)
  const normalizedNewPath = normalizePath(data.path)

  // 对于重命名，我们需要确新路径不被占用。旧路径通常正在被移动，所以锁定新路径。
  await plugin.lockManager.withLock(normalizedNewPath, async () => {
    const file = plugin.app.vault.getFileByPath(normalizedOldPath)
    if (file instanceof TFile) {
      plugin.addIgnoredFile(normalizedNewPath)
      plugin.addIgnoredFile(normalizedOldPath)

      // 记录重命名后的新路径，用于拦截本地事件
      plugin.lastSyncPathRenamed.add(normalizedNewPath)

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
            const content = await plugin.app.vault.read(renamedFile)
            await plugin.app.vault.modify(renamedFile, content, { ...(data.ctime > 0 && { ctime: data.ctime }), ...(data.mtime > 0 && { mtime: data.mtime }) })
          }
        }

        // 更新哈希表：移除旧路径，添加新路径
        plugin.fileHashManager.removeFileHash(data.oldPath)
        const renamedFile = plugin.app.vault.getFileByPath(normalizedNewPath)
        plugin.fileHashManager.setFileHash(data.path, data.contentHash, data.mtime || (renamedFile instanceof TFile ? renamedFile.stat.mtime : 0), renamedFile instanceof TFile ? renamedFile.stat.size : 0)

        // 更新同步时间
        if (data.lastTime && data.lastTime > Number(plugin.localStorageManager.getMetadata("lastNoteSyncTime"))) {
          plugin.localStorageManager.setMetadata("lastNoteSyncTime", data.lastTime)
        }
      } finally {
        setTimeout(() => {
          plugin.removeIgnoredFile(normalizedNewPath)
          plugin.removeIgnoredFile(normalizedOldPath)
          plugin.lastSyncPathRenamed.delete(normalizedNewPath)
        }, 500);
      }
    } else {
      // 找不到旧文件...
      const targetFile = plugin.app.vault.getFileByPath(normalizedNewPath)
      if (targetFile instanceof TFile) {
        const content = await plugin.app.vault.read(targetFile)
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
      if (targetFile instanceof TFile) {
        plugin.fileHashManager.setFileHash(data.path, data.contentHash, targetFile.stat.mtime, targetFile.stat.size)
      } else {
        plugin.fileHashManager.setFileHash(data.path, data.contentHash)
      }
    }
  }, { maxRetries: 10, retryInterval: 100 });

  plugin.noteSyncTasks.completed++
}

// 收到 NoteModifyAck，将 pending hash 转移到正式 hashManager 并更新 lastNoteSyncTime
// Receive NoteModifyAck, move pending hash to formal hashManager and update lastNoteSyncTime
export const receiveNoteModifyAck = function (data: { lastTime?: number; path?: string }, plugin: FastSync) {
  // 服务端确认笔记写入成功，将 pending hash 转移到正式 hashManager
  // Server confirmed note write success, move pending hash to formal hashManager
  if (data.path) {
    const contentHash = plugin.pendingNoteModifies.get(data.path)
    if (contentHash !== undefined) {
      // 尝试获取本地文件信息以存入缓存
      const file = plugin.app.vault.getFileByPath(normalizePath(data.path))
      plugin.fileHashManager.setFileHash(data.path, contentHash, file?.stat.mtime || 0, file?.stat.size || 0)
      plugin.pendingNoteModifies.delete(data.path)
    } else {
      dump(`NoteModifyAck received for non-pending path: ${data.path}`)
    }
  }
  if (data.lastTime && data.lastTime > Number(plugin.localStorageManager.getMetadata("lastNoteSyncTime"))) {
    plugin.localStorageManager.setMetadata("lastNoteSyncTime", data.lastTime)
  }
  if (data.path) {
    plugin.concurrencyManager.releaseSlot(data.path)
  }
}

// 收到 NoteRenameAck，从 FIFO 队列取出待确认条目并更新 hashManager
// Receive NoteRenameAck, shift from FIFO queue and update hashManager
export const receiveNoteRenameAck = function (data: { lastTime?: number }, plugin: FastSync) {
  // TCP 保证有序，FIFO 匹配正确
  // TCP guarantees ordering, FIFO matching is correct
  const pending = plugin.pendingNoteRenames.shift()
  if (pending) {
    plugin.fileHashManager.removeFileHash(pending.oldPath)
    // 重命名 Ack 时，内容哈希未变，尝试获取新路径的文件信息
    const file = plugin.app.vault.getFileByPath(normalizePath(pending.newPath))
    plugin.fileHashManager.setFileHash(pending.newPath, pending.contentHash, file?.stat.mtime || 0, file?.stat.size || 0)
  }
  if (data.lastTime && data.lastTime > Number(plugin.localStorageManager.getMetadata("lastNoteSyncTime"))) {
    plugin.localStorageManager.setMetadata("lastNoteSyncTime", data.lastTime)
  }
  plugin.concurrencyManager.releaseFifoSlot()
}

// 收到 NoteDeleteAck，仅当路径仍在 pending set 中时才从 hashManager 移除
// Receive NoteDeleteAck; only remove from hashManager if path is still pending
export const receiveNoteDeleteAck = function (data: { lastTime?: number; path?: string }, plugin: FastSync) {
  if (data.path && plugin.pendingNoteDeleteAcks.has(data.path)) {
    plugin.fileHashManager.removeFileHash(data.path)
    plugin.pendingNoteDeleteAcks.delete(data.path)
    plugin.concurrencyManager.releaseSlot(data.path)
  }
  if (data.lastTime && data.lastTime > Number(plugin.localStorageManager.getMetadata("lastNoteSyncTime"))) {
    plugin.localStorageManager.setMetadata("lastNoteSyncTime", data.lastTime)
  }
}