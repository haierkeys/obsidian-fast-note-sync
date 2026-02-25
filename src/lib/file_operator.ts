import { TFile, TAbstractFile, Notice, normalizePath, Platform } from "obsidian";

import { ReceiveMessage, ReceiveFileSyncUpdateMessage, FileUploadMessage, FileSyncChunkDownloadMessage, FileDownloadSession, ReceiveMtimeMessage, ReceivePathMessage, SyncEndData } from "./types";
import { hashContent, hashArrayBuffer, dump, sleep, dumpTable, isPathExcluded, getSafeCtime } from "./helps";
import { FileCloudPreview } from "./file_cloud_preview";
import { SyncLogManager } from "./sync_log_manager";
import { HttpApiService } from "./api";
import type FastSync from "../main";
import { $ } from "../i18n/lang";


// 上传并发控制 - 手机端严格限制，电脑端适度放开
const MAX_CONCURRENT_UPLOADS = Platform.isMobile ? 2 : 20
let activeUploads = 0
const uploadQueue: (() => Promise<void>)[] = []

// 下载内存缓冲控制 (20MB 阈值防止 OOM)
let currentDownloadBufferBytes = 0
const MAX_DOWNLOAD_BUFFER_BYTES = 20 * 1024 * 1024

// 上传中的文件追踪，用于删除时取消上传
const activeUploadsMap = new Map<string, { cancelled: boolean }>()

/**
 * 清理上传队列
 */
export const clearUploadQueue = () => {
  uploadQueue.length = 0
  activeUploads = 0
}

export const BINARY_PREFIX_FILE_SYNC = "00"

/**
 * 文件（非笔记）修改事件处理
 */
export const fileModify = async function (file: TAbstractFile, plugin: FastSync, eventEnter: boolean = false) {
  if (plugin.settings.syncEnabled == false) return
  if (!(file instanceof TFile)) return
  if (file.path.endsWith(".md")) return
  if (eventEnter && !plugin.getWatchEnabled()) return
  if (eventEnter && plugin.isIgnoredFile(file.path)) return
  if (isPathExcluded(file.path, plugin)) return

  await plugin.lockManager.withLock(file.path, async () => {
    plugin.addIgnoredFile(file.path)
    try {
      const content: ArrayBuffer = await plugin.app.vault.readBinary(file)
      const contentHash = hashArrayBuffer(content)
      const baseHash = plugin.fileHashManager.getPathHash(file.path)

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
      plugin.websocket.SendMessage("FileUploadCheck", data)
      dump(`File modify check sent`, data.path, data.contentHash)

      // WebSocket 消息发送后更新哈希表(使用内容哈希)
      plugin.fileHashManager.setFileHash(file.path, contentHash)
    } finally {
      plugin.removeIgnoredFile(file.path)
    }
  }, { maxRetries: 5, retryInterval: 50 });
}

/**
 * 文件删除事件处理
 */
export const fileDelete = async function (file: TAbstractFile, plugin: FastSync, eventEnter: boolean = false) {
  if (plugin.settings.syncEnabled == false) return
  if (!(file instanceof TFile)) return
  if (file.path.endsWith(".md")) return
  if (eventEnter && !plugin.getWatchEnabled()) return
  if (eventEnter && plugin.isIgnoredFile(file.path)) return
  if (isPathExcluded(file.path, plugin)) return

  await plugin.lockManager.withLock(file.path, async () => {
    // 如果该文件正在上传或在队列中，则标记为取消，且不再发送服务端删除消息
    if (activeUploadsMap.has(file.path)) {
      activeUploadsMap.get(file.path)!.cancelled = true;
      dump(`Upload cancelled due to file deletion: ${file.path}`);
      // 仅清理本地状态
      plugin.fileHashManager.removeFileHash(file.path)
      return
    }

    plugin.addIgnoredFile(file.path)
    try {
      const data = {
        vault: plugin.settings.vault,
        path: file.path,
        pathHash: hashContent(file.path),
      }
      plugin.websocket.SendMessage("FileDelete", data)
      dump(`File delete send`, file.path)

      // WebSocket 消息发送后从哈希表中删除
      plugin.fileHashManager.removeFileHash(file.path)
    } finally {
      plugin.removeIgnoredFile(file.path)
    }
  }, { maxRetries: 3, retryInterval: 50 });
}

/**
 * 文件重命名事件处理
 */
export const fileRename = async function (file: TAbstractFile, oldfile: string, plugin: FastSync, eventEnter: boolean = false) {
  if (plugin.settings.syncEnabled == false) return
  if (file.path.endsWith(".md")) return
  if (!plugin.getWatchEnabled() && eventEnter) return
  if (plugin.isIgnoredFile(file.path) && eventEnter) return
  if (isPathExcluded(file.path, plugin)) return
  if (!(file instanceof TFile)) return

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
          const content: ArrayBuffer = await plugin.app.vault.readBinary(file)
          contentHash = hashArrayBuffer(content)
        }

        const data = {
          vault: plugin.settings.vault,
          oldPath: oldfile,
          oldPathHash: hashContent(oldfile),
          path: file.path,
          pathHash: hashContent(file.path),
        }
        plugin.websocket.SendMessage("FileRename", data)
        plugin.fileHashManager.setFileHash(file.path, contentHash)
      }

      plugin.fileHashManager.removeFileHash(oldfile)
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
  if (isPathExcluded(data.path, plugin)) return
  dump(`Receive file need upload (queued): `, data.path, data.sessionId)

  const file = plugin.app.vault.getFileByPath(normalizePath(data.path))
  if (!file) {
    dump(`File not found for upload: ${data.path} `)
    return
  }

  const chunkSize = data.chunkSize || 1024 * 1024

  const runUpload = async () => {
    // 标记该路径进入活跃上传状态
    activeUploadsMap.set(data.path, { cancelled: false });

    try {
      // 延迟到任务排到时才读取文件内容, 减少内存积压
      let content: ArrayBuffer | null = await plugin.app.vault.readBinary(file)
      if (!content) return;

      const actualTotalChunks = Math.ceil(content.byteLength / chunkSize)

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

        // 如果被取消,立即退出循环
        if (cancelled) {
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
    } finally {
      // 任务结束（完成或取消/失败），移除活跃标记
      activeUploadsMap.delete(data.path);
    }
  }

  // 并发控制逻辑
  const processQueue = async () => {
    while (activeUploads < MAX_CONCURRENT_UPLOADS && uploadQueue.length > 0) {
      activeUploads++
      const task = uploadQueue.shift()
      if (task) {
        ; (async () => {
          try {
            await task()
          } finally {
            activeUploads--
            processQueue()
          }
        })()
      } else {
        activeUploads--
      }
    }
  }

  uploadQueue.push(runUpload)
  processQueue()
}

/**
 * 接收服务端文件更新通知 (FileSyncUpdate)
 */
export const receiveFileSyncUpdate = async function (data: ReceiveFileSyncUpdateMessage, plugin: FastSync) {
  if (plugin.settings.syncEnabled == false) return
  if (isPathExcluded(data.path, plugin)) return

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

  // 服务端推送文件更新,更新哈希表(使用内容哈希)
  plugin.fileHashManager.setFileHash(data.path, data.contentHash)

  plugin.fileSyncTasks.completed++
}

/**
 * 接收服务端文件删除通知
 */
export const receiveFileSyncDelete = async function (data: ReceivePathMessage, plugin: FastSync) {
  if (plugin.settings.syncEnabled == false) return
  if (isPathExcluded(data.path, plugin)) return

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
      try {
        await plugin.app.vault.delete(file)
        // 服务端推送删除,从哈希表中移除
        plugin.fileHashManager.removeFileHash(normalizedPath)
      } finally {
        plugin.removeIgnoredFile(normalizedPath)
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
  if (isPathExcluded(data.path, plugin)) return

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
      } finally {
        plugin.removeIgnoredFile(normalizedPath)
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

  // 创建初始日志记录,状态为 pending,进度为 0
  SyncLogManager.getInstance().addOrUpdateLog({
    id: data.sessionId,
    type: 'receive',
    action: 'FileDownload',
    path: data.path,
    status: 'pending',
    progress: 0
  });
}



/**
 * 接收文件同步结束通知
 */
export const receiveFileSyncEnd = async function (data: any, plugin: FastSync) {
  if (plugin.settings.syncEnabled == false) return
  dump(`Receive file sync end:`, data)

  // 从 data 对象中提取任务统计信息
  const syncData = data as SyncEndData
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
    progress: Math.floor((session.chunks.size / session.totalChunks) * 100)
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
  if (isPathExcluded(data.path, plugin)) return
  if (isPathExcluded(data.oldPath, plugin)) return

  dump(`Receive file rename:`, data.oldPath, "->", data.path)

  const normalizedOldPath = normalizePath(data.oldPath)
  const normalizedNewPath = normalizePath(data.path)

  await plugin.lockManager.withLock(normalizedNewPath, async () => {
    const file = plugin.app.vault.getFileByPath(normalizedOldPath)
    if (file instanceof TFile) {
      plugin.addIgnoredFile(normalizedNewPath)
      plugin.addIgnoredFile(normalizedOldPath)

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
        plugin.fileHashManager.setFileHash(data.path, data.contentHash)
      } finally {
        plugin.removeIgnoredFile(normalizedNewPath)
        plugin.removeIgnoredFile(normalizedOldPath)
      }
    } else {
      // 找不到旧文件...
      const targetFile = plugin.app.vault.getFileByPath(normalizedNewPath)
      if (targetFile instanceof TFile) {
        const sizeMatch = data.size === undefined || targetFile.stat.size === data.size
        if (sizeMatch) {
          const content = await plugin.app.vault.readBinary(targetFile)
          const localContentHash = hashArrayBuffer(content)
          if (localContentHash === data.contentHash) {
            dump(`Target attachment already exists and matches hash, skipping rename: ${data.path}`)
            plugin.fileHashManager.setFileHash(data.path, data.contentHash)
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
        plugin.fileHashManager.setFileHash(data.path, data.contentHash)
      }
    }
  }, { maxRetries: 10, retryInterval: 100 });

  plugin.fileSyncTasks.completed++
}

/**
 * 完成文件下载
 */
const handleFileChunkDownloadComplete = async function (session: FileDownloadSession, plugin: FastSync) {
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
            if (dirExists == null) await plugin.app.vault.createFolder(folder)
          }
          await plugin.app.vault.createBinary(normalizedPath, completeFile.buffer, { ...(session.ctime > 0 && { ctime: session.ctime }), ...(session.mtime > 0 && { mtime: session.mtime }) })
        }
      } finally {
        plugin.removeIgnoredFile(normalizedPath)
      }

      if (Number(plugin.localStorageManager.getMetadata("lastFileSyncTime")) < session.lastTime) {
        plugin.localStorageManager.setMetadata("lastFileSyncTime", session.lastTime)
      }

      // 下载完成后自动计算哈希并更新缓存
      const contentHash = hashArrayBuffer(completeFile.buffer)
      plugin.fileHashManager.setFileHash(session.path, contentHash)
      dump(`Download complete and hash updated for: ${session.path}`, contentHash)
    }, { maxRetries: 5, retryInterval: 100 });

    // 释放内存计数
    const sessionSize = Array.from(session.chunks.values()).reduce((sum, c) => sum + c.byteLength, 0)
    currentDownloadBufferBytes -= sessionSize

    plugin.fileDownloadSessions.delete(session.sessionId)
    plugin.downloadedFilesCount++
  } catch (e) {
    const sessionSize = Array.from(session.chunks.values()).reduce((sum, c) => sum + c.byteLength, 0)
    currentDownloadBufferBytes -= sessionSize
    plugin.fileDownloadSessions.delete(session.sessionId)
  }
}

