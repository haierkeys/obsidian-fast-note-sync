import { TFile, TAbstractFile, Notice, normalizePath } from "obsidian";

import { ReceiveMessage, ReceiveFileSyncUpdateMessage, FileUploadMessage, FileSyncChunkDownloadMessage, FileDownloadSession, ReceiveMtimeMessage, ReceivePathMessage, SyncEndData } from "./types";
import { hashContent, hashArrayBuffer, dump, sleep, dumpTable } from "./helps";
import type FastSync from "../main";
import { $ } from "../lang/lang";


// 上传并发控制
const MAX_CONCURRENT_UPLOADS = 100
let activeUploads = 0
const uploadQueue: (() => Promise<void>)[] = []

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
  if (eventEnter && plugin.ignoredFiles.has(file.path)) return

  plugin.addIgnoredFile(file.path)

  const content: ArrayBuffer = await plugin.app.vault.readBinary(file)
  const contentHash = hashArrayBuffer(content)
  const baseHash = plugin.fileHashManager.getPathHash(file.path)

  const data = {
    vault: plugin.settings.vault,
    path: file.path,
    pathHash: hashContent(file.path),
    contentHash: contentHash,
    mtime: file.stat.mtime,
    ctime: file.stat.ctime,
    size: file.stat.size,
    ...(baseHash !== contentHash && baseHash !== null ? { baseHash } : {}),
  }
  plugin.websocket.MsgSend("FileUploadCheck", data)
  dump(`File modify check sent`, data.path, data.contentHash)

  // WebSocket 消息发送后更新哈希表(使用内容哈希)
  plugin.fileHashManager.setFileHash(file.path, contentHash)

  plugin.removeIgnoredFile(file.path)
}

/**
 * 文件删除事件处理
 */
export const fileDelete = function (file: TAbstractFile, plugin: FastSync, eventEnter: boolean = false) {
  if (plugin.settings.syncEnabled == false) return
  if (!(file instanceof TFile)) return
  if (file.path.endsWith(".md")) return
  if (eventEnter && !plugin.getWatchEnabled()) return
  if (eventEnter && plugin.ignoredFiles.has(file.path)) return

  plugin.addIgnoredFile(file.path)
  handleFileDeleteByPath(file.path, plugin)
  dump(`File delete send`, file.path)

  // WebSocket 消息发送后从哈希表中删除
  plugin.fileHashManager.removeFileHash(file.path)

  plugin.removeIgnoredFile(file.path)
}

/**
 * 文件重命名事件处理
 */
export const fileRename = async function (file: TAbstractFile, oldfile: string, plugin: FastSync, eventEnter: boolean = false) {
  if (plugin.settings.syncEnabled == false) return
  if (file.path.endsWith(".md")) return
  if (!plugin.getWatchEnabled() && eventEnter) return
  if (plugin.ignoredFiles.has(file.path) && eventEnter) return
  if (!(file instanceof TFile)) return

  plugin.addIgnoredFile(file.path)
  await fileModify(file, plugin, false)
  dump(`File rename modify send`, file.path)
  handleFileDeleteByPath(oldfile, plugin)
  dump(`File rename delete send`, oldfile)

  // 删除旧路径,添加新路径(使用内容哈希)
  plugin.fileHashManager.removeFileHash(oldfile)
  const content: ArrayBuffer = await plugin.app.vault.readBinary(file)
  const newHash = hashArrayBuffer(content)
  plugin.fileHashManager.setFileHash(file.path, newHash)

  plugin.removeIgnoredFile(file.path)
}


/**
 * 接收服务端文件上传指令 (FileUpload)
 */
export const receiveFileUpload = async function (data: FileUploadMessage, plugin: FastSync) {
  if (plugin.settings.syncEnabled == false) return
  dump(`Receive file need upload (queued): `, data.path, data.sessionId)

  const file = plugin.app.vault.getFileByPath(normalizePath(data.path))
  if (!file) {
    dump(`File not found for upload: ${data.path} `)
    return
  }

  const chunkSize = data.chunkSize || 1024 * 1024

  const runUpload = async () => {
    // 先读取文件内容,获取实际大小
    const content: ArrayBuffer = await plugin.app.vault.readBinary(file)
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

    for (let i = 0; i < actualTotalChunks; i++) {
      const start = i * chunkSize
      const end = Math.min(start + chunkSize, content.byteLength)
      const chunk = content.slice(start, end)

      const sessionIdBytes = new TextEncoder().encode(data.sessionId)
      const chunkIndexBytes = new Uint8Array(4)
      const view = new DataView(chunkIndexBytes.buffer)
      view.setUint32(0, i, false)

      const frame = new Uint8Array(36 + 4 + chunk.byteLength)
      frame.set(sessionIdBytes, 0)
      frame.set(chunkIndexBytes, 36)
      frame.set(new Uint8Array(chunk), 40)

      plugin.websocket.SendBinary(frame, BINARY_PREFIX_FILE_SYNC, () => {
        plugin.uploadedChunksCount++
      })

      // 每发送一个分块，让出主线程，防止阻塞 WebSocket 心跳 (Ping/Pong)
      await sleep(2)
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
  dump(`Receive file sync update(download): `, data.path)
  const tempKey = `temp_${data.path} `
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
  plugin.websocket.MsgSend("FileChunkDownload", requestData)
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
  dump(`Receive file delete: `, data.path)
  const normalizedPath = normalizePath(data.path)
  const file = plugin.app.vault.getFileByPath(normalizedPath)
  if (file instanceof TFile) {
    plugin.addIgnoredFile(normalizedPath)
    await plugin.app.vault.delete(file)
    plugin.removeIgnoredFile(normalizedPath)

    // 服务端推送删除,从哈希表中移除
    plugin.fileHashManager.removeFileHash(normalizedPath)
  }

  plugin.fileSyncTasks.completed++
}

/**
 * 接收服务端文件元数据(mtime)更新通知
 */
export const receiveFileSyncMtime = async function (data: ReceiveMtimeMessage, plugin: FastSync) {
  if (plugin.settings.syncEnabled == false) return
  dump(`Receive file sync mtime: `, data.path, data.mtime)
  const normalizedPath = normalizePath(data.path)
  const file = plugin.app.vault.getFileByPath(normalizedPath)
  if (file) {
    const content = await plugin.app.vault.readBinary(file)
    plugin.addIgnoredFile(normalizedPath)
    await plugin.app.vault.modifyBinary(file, content, { ctime: data.ctime, mtime: data.mtime })
    plugin.removeIgnoredFile(normalizedPath)
  }

  plugin.fileSyncTasks.completed++
}

/**
 * 接收服务端分片下载响应 (FileSyncChunkDownload)
 */
export const receiveFileSyncChunkDownload = async function (data: FileSyncChunkDownloadMessage, plugin: FastSync) {
  if (plugin.settings.syncEnabled == false) return
  dump(`Receive file chunk download: `, data.path, data.sessionId, `totalChunks: ${data.totalChunks} `)

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

  const tempKey = `temp_${data.path} `
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
}

/**
 * 接收文件同步结束通知
 */
export const receiveFileSyncEnd = async function (data: any, plugin: FastSync) {
  if (plugin.settings.syncEnabled == false) return
  dump(`Receive file sync end:`, data)

  // 从 data 对象中提取任务统计信息
  const syncData = data as SyncEndData
  plugin.settings.lastFileSyncTime = syncData.lastTime
  await plugin.saveData(plugin.settings)
  plugin.syncTypeCompleteCount++
}

/**
 * 根据路径发送文件删除消息
 */
const handleFileDeleteByPath = function (path: string, plugin: FastSync) {
  if (plugin.settings.syncEnabled == false) return
  if (path.endsWith(".md")) return
  const data = {
    vault: plugin.settings.vault,
    path: path,
    pathHash: hashContent(path),
  }
  plugin.websocket.MsgSend("FileDelete", data)
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
  plugin.downloadedChunksCount++

  if (session.chunks.size === session.totalChunks) {
    await handleFileChunkDownloadComplete(session, plugin)
  }
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
    plugin.addIgnoredFile(normalizedPath)
    const file = plugin.app.vault.getFileByPath(normalizedPath)
    if (file) {
      await plugin.app.vault.modifyBinary(file, completeFile.buffer, { ctime: session.ctime, mtime: session.mtime })
    } else {
      const folder = normalizedPath.split("/").slice(0, -1).join("/")
      if (folder != "") {
        const dirExists = plugin.app.vault.getFolderByPath(folder)
        if (dirExists == null) await plugin.app.vault.createFolder(folder)
      }
      await plugin.app.vault.createBinary(normalizedPath, completeFile.buffer, { ctime: session.ctime, mtime: session.mtime })
    }
    plugin.removeIgnoredFile(normalizedPath)

    if (plugin.settings.lastFileSyncTime < session.lastTime) {
      plugin.settings.lastFileSyncTime = session.lastTime
      await plugin.saveData(plugin.settings)
    }

    plugin.fileDownloadSessions.delete(session.sessionId)
    plugin.downloadedFilesCount++
  } catch (e) {
    plugin.fileDownloadSessions.delete(session.sessionId)
  }
}
