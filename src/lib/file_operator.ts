import { TFile, TAbstractFile, Notice, normalizePath, Platform } from "obsidian";

import { ReceiveMessage, ReceiveFileSyncUpdateMessage, FileUploadMessage, FileSyncChunkDownloadMessage, FileDownloadSession, ReceiveMtimeMessage, ReceivePathMessage, SyncEndData } from "./types";
import { hashContent, hashArrayBuffer, dump, sleep, dumpTable, isPathExcluded, getSafeCtime } from "./helps";
import { FileCloudPreview } from "./file_cloud_preview";
import { SyncLogManager } from "./sync_log_manager";
import { HttpApiService } from "./api";
import type FastSync from "../main";
import { $ } from "../i18n/lang";


// 下载内存缓冲控制 (20MB 阈值防止 OOM)
let currentDownloadBufferBytes = 0
const MAX_DOWNLOAD_BUFFER_BYTES = 20 * 1024 * 1024

// 上传中的文件追踪，用于删除时取消上传
const activeUploadsMap = new Map<string, { cancelled: boolean }>()

/**
 * 清理上传队列
 */
export const clearUploadQueue = () => {
}

export const BINARY_PREFIX_FILE_SYNC = "00"

/**
 * 文件（非笔记）修改事件处理
 */
export const fileModify = async function (file: TAbstractFile, plugin: FastSync, eventEnter: boolean = false) {
  if (plugin.settings.syncEnabled == false || plugin.settings.readonlySyncEnabled) return
  if (!(file instanceof TFile)) return
  if (file.path.endsWith(".md")) return
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
      let content: ArrayBuffer | null = null;

      if (contentHash !== null) {
        if (contentHash === baseHash && (lastSyncMtime !== undefined && lastSyncMtime === file.stat.mtime)) {
          dump(`File modify intercepted (cache match): ${file.path}`)
          return
        }
      } else {
        content = await plugin.app.vault.readBinary(file)
        contentHash = await hashArrayBuffer(content)
      }

      const data = {
        vault: plugin.settings.vault,
        path: file.path,
        pathHash: hashContent(file.path),
        contentHash: contentHash,
        mtime: file.stat.mtime,
        ctime: getSafeCtime(file.stat),
        size: file.stat.size,
        // 始终传递 baseHash 信息，如果不可用则标记 baseHashMissing
        ...(baseHash !== null ? { baseHash } : { baseHashMissing: true }),
      }
      // 将 hash 暂存到 pending map，等待服务端 FileUploadAck 后再写入 hashManager
      // Temporarily store hash in pending map, update hashManager only after server FileUploadAck
      // 新建操作覆盖删除意图，清除 pending 防止晚到的 Ack 错误删除新文件 hash
      // New upload supersedes delete intent; clear pending to prevent stale Ack from removing new hash
      plugin.pendingFileDeleteAcks.delete(file.path)
      plugin.pendingUploadHashes.set(file.path, contentHash)
      plugin.localStorageManager.savePending('pendingUploadHashes', plugin.pendingUploadHashes)
      await plugin.concurrencyManager.waitForSlot(file.path)
      plugin.websocket.SendMessage("FileUploadCheck", data)
      dump(`File modify check sent`, data.path, data.contentHash)
    } finally {
      plugin.removeIgnoredFile(file.path)
    }
  }, { maxRetries: 5, retryInterval: 50 });
}

/**
 * 文件删除事件处理
 */
export const fileDelete = async function (file: TAbstractFile, plugin: FastSync, eventEnter: boolean = false) {
  if (plugin.settings.syncEnabled == false || plugin.settings.readonlySyncEnabled) return
  if (!(file instanceof TFile)) return
  if (file.path.endsWith(".md")) return
  if (eventEnter && !plugin.getWatchEnabled()) return
  if (eventEnter && plugin.isIgnoredFile(file.path)) return
  if (isPathExcluded(file.path, plugin)) return

  // --- 新增：删除拦截 ---
  if (plugin.lastSyncPathDeleted.has(file.path)) {
    dump(`File delete intercepted: ${file.path}`)
    return
  }

  await plugin.lockManager.withLock(file.path, async () => {
    // 如果该文件正在上传或在队列中，则标记为取消，且不再发送服务端删除消息
    if (activeUploadsMap.has(file.path)) {
      activeUploadsMap.get(file.path)!.cancelled = true;
      dump(`Upload cancelled due to file deletion: ${file.path}`);
      // 仅清理本地状态
      plugin.fileHashManager.removeFileHash(file.path)
      plugin.pendingUploadHashes.delete(file.path)
      plugin.localStorageManager.savePending('pendingUploadHashes', plugin.pendingUploadHashes)
      return
    }

    // 清理可能存在的待确认上传记录，避免 pending map 内存泄漏
    // Clean up any pending upload record to avoid pending map memory leak
    plugin.pendingUploadHashes.delete(file.path)
    plugin.localStorageManager.savePending('pendingUploadHashes', plugin.pendingUploadHashes)

    plugin.addIgnoredFile(file.path)
    try {
      const data = {
        vault: plugin.settings.vault,
        path: file.path,
        pathHash: hashContent(file.path),
      }
      await plugin.concurrencyManager.waitForSlot(file.path)
      plugin.websocket.SendMessage("FileDelete", data, undefined, () => {
        // 消息真正写入 TCP 缓冲区后加入 pending set，等待 FileDeleteAck 再删 hash
        // Add to pending set only after message is actually buffered; remove hash only on FileDeleteAck
        plugin.pendingFileDeleteAcks.add(file.path)
      })
      dump(`File delete send`, file.path)
    } finally {
      plugin.removeIgnoredFile(file.path)
    }
  }, { maxRetries: 3, retryInterval: 50 });
}

/**
 * 按路径字符串发送文件删除消息（用于无法获取 TFile 对象的场景，如 rename 后旧路径已不存在）
 * Send file delete message by path string (for scenarios where TFile object is unavailable, e.g., old path after rename)
 */
export const fileDeleteByPath = async function (filePath: string, plugin: FastSync) {
  if (plugin.settings.syncEnabled == false || plugin.settings.readonlySyncEnabled) return
  if (filePath.endsWith(".md")) return
  if (isPathExcluded(filePath, plugin)) return
  if (plugin.lastSyncPathDeleted.has(filePath)) return

  await plugin.lockManager.withLock(filePath, async () => {
    // 如果该文件正在上传或在队列中，则标记为取消，且不再发送服务端删除消息
    // If the file is being uploaded or in the queue, cancel and skip server delete
    if (activeUploadsMap.has(filePath)) {
      activeUploadsMap.get(filePath)!.cancelled = true;
      plugin.fileHashManager.removeFileHash(filePath)
      plugin.pendingUploadHashes.delete(filePath)
      plugin.localStorageManager.savePending('pendingUploadHashes', plugin.pendingUploadHashes)
      return
    }

    // 清理可能存在的待确认上传记录，避免 pending map 内存泄漏
    // Clean up any pending upload record to avoid pending map memory leak
    plugin.pendingUploadHashes.delete(filePath)
    plugin.localStorageManager.savePending('pendingUploadHashes', plugin.pendingUploadHashes)

    plugin.addIgnoredFile(filePath)
    try {
      await plugin.concurrencyManager.waitForSlot(filePath)
      plugin.websocket.SendMessage("FileDelete", {
        vault: plugin.settings.vault,
        path: filePath,
        pathHash: hashContent(filePath),
      }, undefined, () => {
        // 消息真正写入 TCP 缓冲区后加入 pending set，等待 FileDeleteAck 再删 hash
        // Add to pending set only after message is actually buffered; remove hash only on FileDeleteAck
        plugin.pendingFileDeleteAcks.add(filePath)
      })
      dump(`File delete by path send`, filePath)
    } finally {
      plugin.removeIgnoredFile(filePath)
    }
  }, { maxRetries: 3, retryInterval: 50 });
}

/**
 * 文件重命名事件处理
 */
export const fileRename = async function (file: TAbstractFile, oldfile: string, plugin: FastSync, eventEnter: boolean = false) {
  if (plugin.settings.syncEnabled == false || plugin.settings.readonlySyncEnabled) return
  if (file.path.endsWith(".md")) return
  if (!plugin.getWatchEnabled() && eventEnter) return
  if (plugin.isIgnoredFile(file.path) && eventEnter) return
  if (isPathExcluded(file.path, plugin)) return
  if (!(file instanceof TFile)) return

  // --- 新增：重命名拦截 ---
  if (plugin.lastSyncPathRenamed.has(file.path)) {
    dump(`File rename intercepted: ${file.path}`)
    return
  }

  await plugin.lockManager.withLock(file.path, async () => {
    plugin.addIgnoredFile(file.path)
    try {
      dump(`File rename`, oldfile, file.path)

      // 如果旧文件正在上传，则取消上传且不发送删除消息
      if (activeUploadsMap.has(oldfile)) {
        activeUploadsMap.get(oldfile)!.cancelled = true;
        // 重新上传
        fileModify(file, plugin)
        dump(`Upload cancelled due to file rename: ${oldfile}`);
      } else {

        let contentHash = plugin.fileHashManager.getPathHash(oldfile)
        if (contentHash == null) {
          // 尝试新路径哈希缓存 (Try new path cache)
          contentHash = plugin.fileHashManager.getValidHash(file.path, file.stat.mtime, file.stat.size);
          if (contentHash == null) {
            const content: ArrayBuffer = await plugin.app.vault.readBinary(file)
            contentHash = await hashArrayBuffer(content)
          }
        }

        const data = {
          vault: plugin.settings.vault,
          oldPath: oldfile,
          oldPathHash: hashContent(oldfile),
          path: file.path,
          pathHash: hashContent(file.path),
        }
        // 将重命名推入待确认队列，等待服务端 FileRenameAck 后再更新 hashManager
        // Push rename to pending queue; hashManager will be updated after server FileRenameAck
        plugin.pendingFileRenames.push({ oldPath: oldfile, newPath: file.path, contentHash })
        await plugin.concurrencyManager.waitForSlot(file.path, true)
        plugin.websocket.SendMessage("FileRename", data)
      }
    } finally {
      plugin.removeIgnoredFile(file.path)
    }
  }, { maxRetries: 5, retryInterval: 50 });
}


/**
 * 接收服务端文件上传指令 (FileUpload)
 */
export const receiveFileUpload = async function (data: FileUploadMessage, plugin: FastSync) {
  if (plugin.settings.syncEnabled == false) return
  if (plugin.settings.readonlySyncEnabled) {
    dump(`Read-only mode: Intercepted file upload request for ${data.path}`)
    plugin.fileSyncTasks.completed++
    return
  }
  if (isPathExcluded(data.path, plugin)) {
    plugin.fileSyncTasks.completed++
    return
  }
  dump(`Receive file need upload (queued): `, data.path, data.sessionId)

  const file = plugin.app.vault.getFileByPath(normalizePath(data.path))
  if (!file) {
    dump(`File not found for upload: ${data.path} `)
    plugin.fileSyncTasks.completed++
    return
  }

  const chunkSize = data.chunkSize || 1024 * 1024

  const runUpload = async () => {
    // 标记该路径进入活跃上传状态
    activeUploadsMap.set(data.path, { cancelled: false });
    await plugin.concurrencyManager.waitForSlot(data.path, false, 10) // 优先级设为 10，优先处理上传

    try {
      // 延迟到任务排到时才读取文件内容, 减少内存积压
      let content: ArrayBuffer | null = null;
      try {
        content = await plugin.app.vault.readBinary(file)
      } catch (e) {
        dump(`Failed to read file for upload: ${data.path}`, e)
      }
      if (!content) {
        plugin.concurrencyManager.releaseSlot(data.path)
        return;
      }

      const contentHash = await hashArrayBuffer(content)
      // 将 hash 暂存到 pending map，等待服务端 FileUploadAck 后再写入 hashManager
      // Temporarily store hash in pending map, update hashManager only after server FileUploadAck
      plugin.pendingUploadHashes.set(data.path, contentHash)
      plugin.localStorageManager.savePending('pendingUploadHashes', plugin.pendingUploadHashes)
      // 记录当前文件的 mtime/size 到缓存，以便后续利用
      plugin.fileHashManager.setFileHash(data.path, contentHash, file.stat.mtime, file.stat.size)

      // 如果是空文件，强制设置分片数量为 1，发送一个空分片以通知服务端上传完成
      const actualTotalChunks = content.byteLength === 0 ? 1 : Math.ceil(content.byteLength / chunkSize)

      // 仅在非同步期间(实时监听时)手动增加分片计数。同步期间由 SyncEnd 包装器统一预估
      if (plugin.getWatchEnabled()) {
        plugin.totalChunksToUpload += actualTotalChunks
      }

      // 打印上传信息表格
      dumpTable([
        {
          操作: "文件上传",
          路径: data.path,
          文件大小: `${(content.byteLength / 1024 / 1024).toFixed(2)} MB`,
          分片大小: `${(chunkSize / 1024).toFixed(0)} KB`,
          分片数量: actualTotalChunks,
          SessionID: data.sessionId.substring(0, 8) + "...",
        },
      ])

      const sleepTime = Platform.isMobile ? 10 : 2;

      for (let i = 0; i < actualTotalChunks; i++) {
        const start = i * chunkSize
        const end = Math.min(start + chunkSize, content.byteLength)
        const length = end - start;

        // 使用 Uint8Array 视图代替 slice 拷贝，减少内存翻倍
        const chunk = new Uint8Array(content, start, length)

        const sessionIdBytes = new TextEncoder().encode(data.sessionId)
        const chunkIndexBytes = new Uint8Array(4)
        const view = new DataView(chunkIndexBytes.buffer)
        view.setUint32(0, i, false)

        const frame = new Uint8Array(36 + 4 + chunk.byteLength)
        frame.set(sessionIdBytes, 0)
        frame.set(chunkIndexBytes, 36)
        frame.set(chunk, 40)

        // 在 before 回调中检查是否已被取消,这样可以在数据真正进入 WebSocket 缓冲区之前拦截
        const cancelled = await plugin.websocket.SendBinary(
          frame,
          BINARY_PREFIX_FILE_SYNC,
          () => {
            // before: 检查是否已被取消(例如由于文件在上传过程中被删除)
            if (activeUploadsMap.get(data.path)?.cancelled) {
              dump(`Upload aborted for ${data.path} (cancelled before send)`);
              return true; // 返回 true 表示应该取消发送
            }
            return false;
          },
          () => {
            // after: 发送成功后更新计数和日志
            plugin.uploadedChunksCount++
            const currentProgress = Math.floor(((i + 1) / actualTotalChunks) * 100);
            const isLastChunk = (i + 1) === actualTotalChunks;

            // 更新日志进度
            SyncLogManager.getInstance().addOrUpdateLog({
              id: data.sessionId,
              type: 'send',
              action: 'FileUpload',
              path: data.path,
              status: isLastChunk ? 'success' : 'pending',
              progress: currentProgress
            });
          }
        )

        // 如果被取消,立即退出循环并释放槽位
        if (cancelled) {
          plugin.concurrencyManager.releaseSlot(data.path)
          return;
        }

        // 让出主线程，手机端给更多呼吸时间
        await sleep(sleepTime)
      }

      // 手动置空辅助 GC
      content = null;

      // 上传完成后，如果开启了附件云预览 - 上传后删除，则删除本地附件
      if (plugin.settings.cloudPreviewEnabled && plugin.settings.cloudPreviewAutoDeleteLocal) {
        const ext = file.path.substring(file.path.lastIndexOf(".")).toLowerCase();
        const isRestricted = FileCloudPreview.isRestrictedType(ext);

        // 如果开启了类型限制，则仅删除受限类型 (图片/音频/视频/PDF)
        // 如果未开启类型限制，则全部删除
        if (plugin.settings.cloudPreviewTypeRestricted && !isRestricted) {
          return;
        }

        setTimeout(async () => {
          try {
            const apiService = new HttpApiService(plugin);
            const res = await apiService.getFileInfo(file.path);

            if (res && res.status && res.data) {
              const serverInfo = res.data;
              // 核对 path、size、mtime 是否一致
              if (serverInfo.path === file.path &&
                serverInfo.size === file.stat.size &&
                serverInfo.mtime === file.stat.mtime) {
                dump(`Cloud Preview: Auto delete verified file: ${file.path}`);
                plugin.addIgnoredFile(file.path);
                try {
                  await plugin.app.vault.delete(file);
                  plugin.fileHashManager.removeFileHash(file.path);
                } finally {
                  plugin.removeIgnoredFile(file.path);
                }
              } else {
                dump(`Cloud Preview: Auto delete skip, info mismatch for ${file.path}`, { server: serverInfo, local: file.stat });
              }
            }
          } catch (e) {
            dump(`Cloud Preview: Auto delete failed to fetch info for ${file.path}`, e);
          }
        }, 2000);
      }
    } catch (e) {
      dump(`Upload process error for ${data.path}`, e);
      plugin.concurrencyManager.releaseSlot(data.path);
    } finally {
      // 任务结束（完成或取消/失败），移除活跃标记
      activeUploadsMap.delete(data.path);
    }
  }

  // 任务立即执行，受外部 ConcurrencyManager 控制
  runUpload()
}

/**
 * 接收服务端文件更新通知 (FileSyncUpdate)
 */
export const receiveFileSyncUpdate = async function (data: ReceiveFileSyncUpdateMessage, plugin: FastSync) {
  if (plugin.settings.syncEnabled == false) return
  // 服务端推送说明该路径已有新内容，清除可能残留的 deleteAck pending 防止 Ack 删除新 hash
  // Server push means path has new content; clear stale deleteAck pending to protect newly-written hash
  plugin.pendingFileDeleteAcks.delete(data.path)
  if (isPathExcluded(data.path, plugin)) {
    plugin.fileSyncTasks.completed++;
    return
  }

  // 如果开启了云预览，且是初始化同步阶段，由于云预览可以按需加载，跳过所有附件下载
  if (plugin.localStorageManager.getMetadata("isInitSync") && plugin.settings.cloudPreviewEnabled) {
    if (plugin.settings.cloudPreviewTypeRestricted) {
      // 开启了类型限制：仅跳过受限类型 (图片、视频、音频、PDF)
      const ext = data.path.substring(data.path.lastIndexOf(".")).toLowerCase();
      if (FileCloudPreview.isRestrictedType(ext)) {
        dump(`Cloud Preview: Skipping restricted file download: ${data.path}`);
        plugin.fileSyncTasks.completed++;
        return;
      }
    } else {
      // 未开启类型限制：由于启用了云预览，跳过所有附件下载
      dump(`Cloud Preview: Skipping all file downloads: ${data.path}`);
      plugin.fileSyncTasks.completed++;
      return;
    }
  }

  // 等待并发槽位，防止大量并发下载导致内存耗尽
  const slotKey = `download_${data.path}`
  await plugin.concurrencyManager.waitForSlot(slotKey, false, -10) // 优先级设为 -10，延后处理下载

  try {
    // 下载内存缓冲控制：如果当前内存中待写盘的分块过多，由于下载是异步触发的，此处等待
    while (currentDownloadBufferBytes > MAX_DOWNLOAD_BUFFER_BYTES) {
      await sleep(200);
    }

    dump(`Receive file sync update(download): `, data.path)
  const tempKey = `temp_${data.path}`
  const tempSession = {
    path: data.path,
    ctime: data.ctime,
    mtime: data.mtime,
    lastTime: data.lastTime,
    sessionId: "",
    totalChunks: 0,
    size: data.size,
    chunks: new Map<number, ArrayBuffer>(),
  }
  plugin.fileDownloadSessions.set(tempKey, tempSession)

  const requestData = {
    vault: plugin.settings.vault,
    path: data.path,
    pathHash: data.pathHash,
  }
  plugin.websocket.SendMessage("FileChunkDownload", requestData)
  plugin.totalFilesToDownload++

    // 更新同步时间
    // Update sync time
    if (data.lastTime && data.lastTime > Number(plugin.localStorageManager.getMetadata("lastFileSyncTime"))) {
      plugin.localStorageManager.setMetadata("lastFileSyncTime", data.lastTime)
    }

    plugin.fileSyncTasks.completed++
  } catch (e) {
    plugin.concurrencyManager.releaseSlot(slotKey)
    throw e;
  }
}

/**
 * 接收服务端文件删除通知
 */
export const receiveFileSyncDelete = async function (data: ReceivePathMessage, plugin: FastSync) {
  if (plugin.settings.syncEnabled == false) return
  if (isPathExcluded(data.path, plugin)) {
    plugin.fileSyncTasks.completed++;
    return
  }

  if (plugin.localStorageManager.getMetadata("isInitSync") && plugin.settings.cloudPreviewEnabled) {
    if (plugin.settings.cloudPreviewTypeRestricted) {
      const ext = data.path.substring(data.path.lastIndexOf(".")).toLowerCase();
      if (FileCloudPreview.isRestrictedType(ext)) {
        dump(`Cloud Preview: Skipping restricted file delete: ${data.path}`);
        plugin.fileSyncTasks.completed++;
        return;
      }
    } else {
      dump(`Cloud Preview: Skipping all file deletes: ${data.path}`);
      plugin.fileSyncTasks.completed++;
      return;
    }
  }

  dump(`Receive file delete: `, data.path)
  const normalizedPath = normalizePath(data.path)

  await plugin.lockManager.withLock(normalizedPath, async () => {
    const file = plugin.app.vault.getFileByPath(normalizedPath)
    if (file instanceof TFile) {
      plugin.addIgnoredFile(normalizedPath)
      // 记录待删除路径
      plugin.lastSyncPathDeleted.add(normalizedPath)
      try {
        await plugin.app.vault.delete(file)
        // 服务端推送删除,从哈希表中移除
        plugin.fileHashManager.removeFileHash(normalizedPath)
        plugin.lastSyncMtime.delete(normalizedPath)
        // 更新同步时间
        if (data.lastTime && data.lastTime > Number(plugin.localStorageManager.getMetadata("lastFileSyncTime"))) {
          plugin.localStorageManager.setMetadata("lastFileSyncTime", data.lastTime)
        }
      } finally {
        // 延时 500ms 清理
        setTimeout(() => {
          plugin.removeIgnoredFile(normalizedPath)
          plugin.lastSyncPathDeleted.delete(normalizedPath)
        }, 500);
      }
    }
  }, { maxRetries: 5, retryInterval: 100 });

  plugin.fileSyncTasks.completed++
}

/**
 * 接收服务端文件元数据(mtime)更新通知
 */
export const receiveFileSyncMtime = async function (data: ReceiveMtimeMessage, plugin: FastSync) {
  if (plugin.settings.syncEnabled == false) return
  if (isPathExcluded(data.path, plugin)) {
    plugin.fileSyncTasks.completed++;
    return
  }

  if (plugin.localStorageManager.getMetadata("isInitSync") && plugin.settings.cloudPreviewEnabled) {
    if (plugin.settings.cloudPreviewTypeRestricted) {
      const ext = data.path.substring(data.path.lastIndexOf(".")).toLowerCase();
      if (FileCloudPreview.isRestrictedType(ext)) {
        dump(`Cloud Preview: Skipping restricted file mtime update: ${data.path}`);
        plugin.fileSyncTasks.completed++;
        return;
      }
    } else {
      dump(`Cloud Preview: Skipping all file mtime updates: ${data.path}`);
      plugin.fileSyncTasks.completed++;
      return;
    }
  }

  dump(`Receive file sync mtime: `, data.path, data.mtime)
  const normalizedPath = normalizePath(data.path)

  await plugin.lockManager.withLock(normalizedPath, async () => {
    const file = plugin.app.vault.getFileByPath(normalizedPath)
    if (file) {
      const content = await plugin.app.vault.readBinary(file)
      plugin.addIgnoredFile(normalizedPath)
      try {
        await plugin.app.vault.modifyBinary(file, content, { ...(data.ctime > 0 && { ctime: data.ctime }), ...(data.mtime > 0 && { mtime: data.mtime }) })
        // 记录 mtime
        plugin.lastSyncMtime.set(data.path, data.mtime)
        // 更新同步时间
        if (data.lastTime && data.lastTime > Number(plugin.localStorageManager.getMetadata("lastFileSyncTime"))) {
          plugin.localStorageManager.setMetadata("lastFileSyncTime", data.lastTime)
        }
      } finally {
        setTimeout(() => {
          plugin.removeIgnoredFile(normalizedPath)
        }, 500);
      }
    }
  }, { maxRetries: 5, retryInterval: 100 });

  plugin.fileSyncTasks.completed++
}

/**
 * 接收服务端分片下载响应 (FileSyncChunkDownload)
 */
export const receiveFileSyncChunkDownload = async function (data: FileSyncChunkDownloadMessage, plugin: FastSync) {
  if (plugin.settings.syncEnabled == false) return
  dump(`Receive file chunk download: `, data.path, data.sessionId, `totalChunks: ${data.totalChunks}`)

  // 打印下载信息表格
  dumpTable([
    {
      操作: "文件下载",
      路径: data.path,
      文件大小: `${(data.size / 1024 / 1024).toFixed(2)} MB`,
      分片大小: `${(data.chunkSize / 1024).toFixed(0)} KB`,
      分片数量: data.totalChunks,
      SessionID: data.sessionId.substring(0, 8) + "...",
    },
  ])

  const tempKey = `temp_${data.path}`
  const tempSession = plugin.fileDownloadSessions.get(tempKey)

  if (tempSession) {
    const session: FileDownloadSession = {
      path: data.path,
      ctime: data.ctime,
      mtime: data.mtime,
      lastTime: tempSession.lastTime,
      sessionId: data.sessionId,
      totalChunks: data.totalChunks,
      size: data.size,
      chunks: new Map<number, ArrayBuffer>(),
    }
    plugin.fileDownloadSessions.set(data.sessionId, session)
    plugin.fileDownloadSessions.delete(tempKey)
  } else {
    const session: FileDownloadSession = {
      path: data.path,
      ctime: data.ctime,
      mtime: data.mtime,
      lastTime: 0,
      sessionId: data.sessionId,
      totalChunks: data.totalChunks,
      size: data.size,
      chunks: new Map<number, ArrayBuffer>(),
    }
    plugin.fileDownloadSessions.set(data.sessionId, session)
  }

  // 仅在非同步期间(实时监听时)手动增加分片计数。同步期间由 SyncEnd 包装器统一预估
  if (plugin.getWatchEnabled()) {
    plugin.totalChunksToDownload += data.totalChunks
  }

  // 创建初始日志记录
  const isTotalChunksZero = data.totalChunks === 0
  SyncLogManager.getInstance().addOrUpdateLog({
    id: data.sessionId,
    type: 'receive',
    action: 'FileDownload',
    path: data.path,
    status: isTotalChunksZero ? 'success' : 'pending',
    progress: isTotalChunksZero ? 100 : 0
  });

  // 如果分片数为 0（空文件），立即触发完成逻辑1
  if (data.totalChunks === 0) {
    const finalSession = plugin.fileDownloadSessions.get(data.sessionId);
    if (finalSession) {
      await handleFileChunkDownloadComplete(finalSession, plugin);
    }
  }
}



/**
 * 接收文件同步结束通知
 */
export const receiveFileSyncEnd = async function (data: any, plugin: FastSync) {
  if (plugin.settings.syncEnabled == false) return
  dump(`Receive file sync end:`, data)

  const syncData = data as SyncEndData
  // 更新任务统计信息，用于进度条计算 (Update task stats for progress bar)
  plugin.fileSyncTasks.needUpload = syncData.needUploadCount || 0
  plugin.fileSyncTasks.needModify = syncData.needModifyCount || 0
  plugin.fileSyncTasks.needSyncMtime = syncData.needSyncMtimeCount || 0
  plugin.fileSyncTasks.needDelete = syncData.needDeleteCount || 0

  // 无条件更新 lastFileSyncTime，确保包含服务端本轮同步后的所有异步操作（如 SyncResourceFID）
  // Unconditionally update lastFileSyncTime to cover all async server-side ops after this sync round (e.g., SyncResourceFID)
  plugin.localStorageManager.setMetadata("lastFileSyncTime", syncData.lastTime)
  plugin.syncTypeCompleteCount++
}

/**
 * 检查并上传附件 (用于开启云预览后的首次同步后)
 */
export const checkAndUploadAttachments = async function (plugin: FastSync) {
  if (!plugin.settings.cloudPreviewEnabled || plugin.settings.readonlySyncEnabled) return;

  const apiService = new HttpApiService(plugin);
  const files = plugin.app.vault.getFiles();

  dump(`Cloud Preview: Start checking ${files.length} files for server status...`);

  let checkedCount = 0;
  let uploadCount = 0;

  for (const file of files) {
    if (file.extension === "md") continue;
    if (isPathExcluded(file.path, plugin)) continue;

    checkedCount++;
    try {
      const res = await apiService.getFileInfo(file.path);

      // 如果服务端返回状态为 false，或者没有数据，说明服务端不存在
      if (!res || !res.status || !res.data) {
        dump(`Cloud Preview: File missing on server, starting upload: ${file.path}`);
        await fileModify(file, plugin, false);
        uploadCount++;
      }
    } catch (e) {
      dump(`Cloud Preview: Failed to check file status for ${file.path}`, e);
    }

    // 适当延迟，避免接口频率过高
    if (checkedCount % 10 === 0) {
      await sleep(50);
    }
  }

  dump(`Cloud Preview: Check complete. Total attachment files: ${checkedCount}, Uploaded: ${uploadCount}`);
}

/**
 * 处理接收到的二进制文件分片
 */
export const handleFileChunkDownload = async function (buf: ArrayBuffer | Blob, plugin: FastSync) {
  if (plugin.settings.syncEnabled == false) return
  const binaryData = buf instanceof Blob ? await buf.arrayBuffer() : buf
  if (binaryData.byteLength < 40) return

  const sessionIdBytes = new Uint8Array(binaryData, 0, 36)
  const sessionId = new TextDecoder().decode(sessionIdBytes)
  const chunkIndexBytes = new Uint8Array(binaryData, 36, 4)
  const view = new DataView(chunkIndexBytes.buffer, chunkIndexBytes.byteOffset, 4)
  const chunkIndex = view.getUint32(0, false)
  const chunkData = binaryData.slice(40)

  const session = plugin.fileDownloadSessions.get(sessionId)
  if (!session) return

  session.chunks.set(chunkIndex, chunkData)
  currentDownloadBufferBytes += chunkData.byteLength // 增加内存缓冲区计数
  plugin.downloadedChunksCount++

  // 更新日志进度
  SyncLogManager.getInstance().addOrUpdateLog({
    id: sessionId,
    type: 'receive',
    action: 'FileDownload',
    path: session.path,
    status: session.chunks.size === session.totalChunks ? 'success' : 'pending',
    progress: session.totalChunks === 0 ? 100 : Math.floor((session.chunks.size / session.totalChunks) * 100)
  });


  if (session.chunks.size === session.totalChunks) {
    await handleFileChunkDownloadComplete(session, plugin)
  }
}

/**
 * 接收服务端文件重命名通知
 */
export const receiveFileSyncRename = async function (data: any, plugin: FastSync) {
  if (plugin.settings.syncEnabled == false) return
  if (isPathExcluded(data.path, plugin) || isPathExcluded(data.oldPath, plugin)) {
    plugin.fileSyncTasks.completed++;
    return
  }

  dump(`Receive file rename:`, data.oldPath, "->", data.path)

  const normalizedOldPath = normalizePath(data.oldPath)
  const normalizedNewPath = normalizePath(data.path)

  await plugin.lockManager.withLock(normalizedNewPath, async () => {
    const file = plugin.app.vault.getFileByPath(normalizedOldPath)
    if (file instanceof TFile) {
      plugin.addIgnoredFile(normalizedNewPath)
      plugin.addIgnoredFile(normalizedOldPath)

      // 记录新路径
      plugin.lastSyncPathRenamed.add(normalizedNewPath)

      try {
        const targetFile = plugin.app.vault.getFileByPath(normalizedNewPath)
        if (targetFile) {
          await plugin.app.vault.delete(targetFile)
        }

        await plugin.app.vault.rename(file, normalizedNewPath)

        if (data.mtime) {
          const renamedFile = plugin.app.vault.getFileByPath(normalizedNewPath)
          if (renamedFile instanceof TFile) {
            const content = await plugin.app.vault.readBinary(renamedFile)
            await plugin.app.vault.modifyBinary(renamedFile, content, { ...(data.ctime > 0 && { ctime: data.ctime }), ...(data.mtime > 0 && { mtime: data.mtime }) })
          }
        }

        plugin.fileHashManager.removeFileHash(data.oldPath)
        const renamedFile = plugin.app.vault.getFileByPath(normalizedNewPath)
        plugin.fileHashManager.setFileHash(data.path, data.contentHash, renamedFile instanceof TFile ? renamedFile.stat.mtime : 0, renamedFile instanceof TFile ? renamedFile.stat.size : 0)

        // 更新同步时间
        if (data.lastTime && data.lastTime > Number(plugin.localStorageManager.getMetadata("lastFileSyncTime"))) {
          plugin.localStorageManager.setMetadata("lastFileSyncTime", data.lastTime)
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
        const sizeMatch = data.size === undefined || targetFile.stat.size === data.size
        if (sizeMatch) {
          const content = await plugin.app.vault.readBinary(targetFile)
          const localContentHash = await hashArrayBuffer(content)
          if (localContentHash === data.contentHash) {
            dump(`Target attachment already exists and matches hash, skipping rename: ${data.path}`)
            plugin.fileHashManager.setFileHash(data.path, data.contentHash, targetFile.stat.mtime, targetFile.stat.size)
            plugin.fileSyncTasks.completed++
            return
          }
        }
      }

      dump(`Local attachment not found for rename, requesting RePush: ${data.oldPath} -> ${data.path}`)
      const rePushData = {
        vault: plugin.settings.vault,
        path: data.path,
        pathHash: data.pathHash,
      }
      plugin.websocket.SendMessage("FileRePush", rePushData)
      if (data.contentHash) {
        const targetFile = plugin.app.vault.getFileByPath(normalizePath(data.path))
        plugin.fileHashManager.setFileHash(data.path, data.contentHash, targetFile instanceof TFile ? targetFile.stat.mtime : 0, targetFile instanceof TFile ? targetFile.stat.size : 0)
      }
    }
  }, { maxRetries: 10, retryInterval: 100 });

  plugin.fileSyncTasks.completed++
}

/**
 * 完成文件下载
 */
const handleFileChunkDownloadComplete = async function (session: FileDownloadSession, plugin: FastSync) {
  const slotKey = `download_${session.path}`;
  try {
    const chunks: ArrayBuffer[] = []
    for (let i = 0; i < session.totalChunks; i++) {
      const chunk = session.chunks.get(i)
      if (!chunk) {
        plugin.fileDownloadSessions.delete(session.sessionId)
        return
      }
      chunks.push(chunk)
    }

    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
    const completeFile = new Uint8Array(totalSize)
    let offset = 0
    for (const chunk of chunks) {
      completeFile.set(new Uint8Array(chunk), offset)
      offset += chunk.byteLength
    }

    if (completeFile.byteLength !== session.size) {
      plugin.fileDownloadSessions.delete(session.sessionId)
      return
    }

    const normalizedPath = normalizePath(session.path)
    await plugin.lockManager.withLock(normalizedPath, async () => {
      plugin.addIgnoredFile(normalizedPath)
      try {
        const file = plugin.app.vault.getFileByPath(normalizedPath)
        if (file) {
          await plugin.app.vault.modifyBinary(file, completeFile.buffer, { ...(session.ctime > 0 && { ctime: session.ctime }), ...(session.mtime > 0 && { mtime: session.mtime }) })
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
          await plugin.app.vault.createBinary(normalizedPath, completeFile.buffer, { ...(session.ctime > 0 && { ctime: session.ctime }), ...(session.mtime > 0 && { mtime: session.mtime }) })
        }
      } finally {
        setTimeout(() => {
          plugin.removeIgnoredFile(normalizedPath)
        }, 500);
      }

      if (Number(plugin.localStorageManager.getMetadata("lastFileSyncTime")) < session.lastTime) {
        plugin.localStorageManager.setMetadata("lastFileSyncTime", session.lastTime)
      }

      // 下载完成后自动计算哈希并更新缓存
      const contentHash = await hashArrayBuffer(completeFile.buffer)
      plugin.fileHashManager.setFileHash(session.path, contentHash, session.mtime, session.size)
      // 记录同步后的 mtime
      plugin.lastSyncMtime.set(session.path, session.mtime)
      dump(`Download complete and hash updated for: ${session.path}`, contentHash)
    }, { maxRetries: 5, retryInterval: 100 });

    // 释放内存计数
    const sessionSize = Array.from(session.chunks.values()).reduce((sum, c) => sum + c.byteLength, 0)
    currentDownloadBufferBytes -= sessionSize

    plugin.fileDownloadSessions.delete(session.sessionId)
    plugin.downloadedFilesCount++
  } catch (e) {
    dump(`Error completing file download for ${session.path}`, e)
    const sessionSize = Array.from(session.chunks.values()).reduce((sum, c) => sum + c.byteLength, 0)
    currentDownloadBufferBytes -= sessionSize
    plugin.fileDownloadSessions.delete(session.sessionId)
  } finally {
    plugin.concurrencyManager.releaseSlot(slotKey)
  }
}

// 收到 FileRenameAck，服务端确认后更新 hashManager（FIFO 出队）并更新 lastFileSyncTime
// Receive FileRenameAck, update hashManager after server confirmation (FIFO dequeue) and update lastFileSyncTime
export const receiveFileRenameAck = function (data: { lastTime?: number }, plugin: FastSync) {
  // 服务端确认重命名成功，FIFO 出队并更新 hashManager
  // Server confirmed rename success, dequeue FIFO and update hashManager
  const pending = plugin.pendingFileRenames.shift()
  if (pending) {
    const file = plugin.app.vault.getFileByPath(normalizePath(pending.newPath))
    plugin.fileHashManager.setFileHash(pending.newPath, pending.contentHash, file?.stat.mtime || 0, file?.stat.size || 0)
    plugin.fileHashManager.removeFileHash(pending.oldPath)
  }
  if (data.lastTime && data.lastTime > Number(plugin.localStorageManager.getMetadata("lastFileSyncTime"))) {
    plugin.localStorageManager.setMetadata("lastFileSyncTime", data.lastTime)
    dump(`FileRenameAck: lastFileSyncTime updated to`, data.lastTime)
  }
  plugin.concurrencyManager.releaseFifoSlot()
}

// 收到 FileUploadAck，将 pending hash 转移到正式 hashManager 并更新 lastFileSyncTime
// Receive FileUploadAck, move pending hash to formal hashManager and update lastFileSyncTime
export const receiveFileUploadAck = function (data: { lastTime?: number; path?: string }, plugin: FastSync) {
  // 服务端确认上传成功，将 pending hash 转移到正式 hashManager
  // Server confirmed upload success, move pending hash to formal hashManager
  if (data.path) {
    const contentHash = plugin.pendingUploadHashes.get(data.path)
    if (contentHash !== undefined) {
      const file = plugin.app.vault.getFileByPath(normalizePath(data.path))
      plugin.fileHashManager.setFileHash(data.path, contentHash, file?.stat.mtime || 0, file?.stat.size || 0)
      plugin.pendingUploadHashes.delete(data.path)
      plugin.localStorageManager.savePending('pendingUploadHashes', plugin.pendingUploadHashes)
    }
  }
  if (data.lastTime && data.lastTime > Number(plugin.localStorageManager.getMetadata("lastFileSyncTime"))) {
    plugin.localStorageManager.setMetadata("lastFileSyncTime", data.lastTime)
    dump(`FileUploadAck: lastFileSyncTime updated to`, data.lastTime)
  }
  if (data.path) {
    plugin.concurrencyManager.releaseSlot(data.path)
  }
}

// 收到 FileDeleteAck，仅当路径仍在 pending set 中时才从 hashManager 移除
// Receive FileDeleteAck; only remove from hashManager if path is still pending
export const receiveFileDeleteAck = function (data: { lastTime?: number; path?: string }, plugin: FastSync) {
  if (data.path && plugin.pendingFileDeleteAcks.has(data.path)) {
    plugin.fileHashManager.removeFileHash(data.path)
    plugin.pendingFileDeleteAcks.delete(data.path)
  }
  if (data.lastTime && data.lastTime > Number(plugin.localStorageManager.getMetadata("lastFileSyncTime"))) {
    plugin.localStorageManager.setMetadata("lastFileSyncTime", data.lastTime)
  }
  if (data.path) {
    plugin.concurrencyManager.releaseSlot(data.path)
  }
}

