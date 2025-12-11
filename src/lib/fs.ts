import { TFile, TAbstractFile, Notice, Setting, requestUrl } from "obsidian";

import { hashContent, hashArrayBuffer, dump, isHttpUrl } from "./helps";
import FastSync from "../main";


/* -------------------------------- Note 推送相关 ------------------------------------------------ */

// NoteModify 消息推送
export const NoteModify = async function (file: TAbstractFile, plugin: FastSync, eventEnter: boolean = false) {
  if (!file.path.endsWith(".md")) return
  if (!plugin.getWatchEnabled() && eventEnter) {
    return
  }
  if (plugin.ignoredFiles.has(file.path) && eventEnter) {
    return
  }
  if (!(file instanceof TFile)) {
    return
  }

  plugin.addIgnoredFile(file.path)

  const content: string = await plugin.app.vault.cachedRead(file)
  const contentHash = hashContent(content)

  const data = {
    vault: plugin.settings.vault,
    ctime: file.stat.ctime,
    mtime: file.stat.mtime,
    path: file.path,
    pathHash: hashContent(file.path),
    content: content,
    contentHash: contentHash,
  }
  plugin.websocket.MsgSend("NoteModify", data)
  dump(`Note modify send`, data.path, data.contentHash, data.mtime, data.pathHash)
  plugin.removeIgnoredFile(file.path)


}


// NoteDelete 消息推送

export const NoteDelete = function (file: TAbstractFile, plugin: FastSync, eventEnter: boolean = false) {
  if (!file.path.endsWith(".md")) return
  if (!plugin.getWatchEnabled() && eventEnter) {
    return
  }
  if (plugin.ignoredFiles.has(file.path) && eventEnter) {
    return
  }
  if (!(file instanceof TFile)) {
    return
  }

  plugin.addIgnoredFile(file.path)

  NoteDeleteByPath(file.path, plugin)
  dump(`Note delete send`, file.path)

  plugin.removeIgnoredFile(file.path)
}

export const NoteRename = async function (file: TAbstractFile, oldfile: string, plugin: FastSync, eventEnter: boolean = false) {
  if (!file.path.endsWith(".md")) return
  if (!plugin.getWatchEnabled() && eventEnter) {
    return
  }
  if (plugin.ignoredFiles.has(file.path) && eventEnter) {
    return
  }
  if (!(file instanceof TFile)) {
    return
  }

  plugin.addIgnoredFile(file.path)

  const content: string = await plugin.app.vault.cachedRead(file)
  const contentHash = hashContent(content)

  const data = {
    vault: plugin.settings.vault,
    ctime: file.stat.ctime,
    mtime: file.stat.mtime,
    path: file.path,
    pathHash: hashContent(file.path),
    content: content,
    contentHash: contentHash,
  }

  plugin.websocket.MsgSend("NoteModify", data)
  dump(`Note rename modify send`, data.path, data.contentHash, data.mtime, data.pathHash)

  NoteDeleteByPath(oldfile, plugin)
  dump(`Note rename delete send`, oldfile)

  plugin.removeIgnoredFile(file.path)
}


export const NoteDeleteByPath = function (path: string, plugin: FastSync) {
  if (!path.endsWith(".md")) return
  const data = {
    vault: plugin.settings.vault,
    path: path,
    pathHash: hashContent(path),
  }
  plugin.websocket.MsgSend("NoteDelete", data)
}


/* -------------------------------- File 推送相关 ------------------------------------------------ */

export const FileModify = async function (file: TAbstractFile, plugin: FastSync, eventEnter: boolean = false) {
  if (file.path.endsWith(".md")) return
  if (!plugin.getWatchEnabled() && eventEnter) {
    return
  }
  if (plugin.ignoredFiles.has(file.path) && eventEnter) {
    return
  }
  if (!(file instanceof TFile)) {
    return
  }

  plugin.addIgnoredFile(file.path)

  const content: ArrayBuffer = await plugin.app.vault.readBinary(file)
  const contentHash = hashArrayBuffer(content)

  const data = {
    vault: plugin.settings.vault,
    path: file.path,
    pathHash: hashContent(file.path),
    contentHash: contentHash,
    mtime: file.stat.mtime,
    ctime: file.stat.ctime,
    size: file.stat.size
  }
  plugin.websocket.MsgSend("FileUploadCheck", data)
  dump(`File modify check sent`, data.path, data.contentHash)
  plugin.removeIgnoredFile(file.path)
}

export const FileDelete = function (file: TAbstractFile, plugin: FastSync, eventEnter: boolean = false) {
  if (file.path.endsWith(".md")) return
  if (!plugin.getWatchEnabled() && eventEnter) {
    return
  }
  if (plugin.ignoredFiles.has(file.path) && eventEnter) {
    return
  }
  if (!(file instanceof TFile)) {
    return
  }

  plugin.addIgnoredFile(file.path)

  FileDeleteByPath(file.path, plugin)
  dump(`File delete send`, file.path)

  plugin.removeIgnoredFile(file.path)
}

export const FileRename = async function (file: TAbstractFile, oldfile: string, plugin: FastSync, eventEnter: boolean = false) {
  if (file.path.endsWith(".md")) return
  if (!plugin.getWatchEnabled() && eventEnter) {
    return
  }
  if (plugin.ignoredFiles.has(file.path) && eventEnter) {
    return
  }
  if (!(file instanceof TFile)) {
    return
  }

  plugin.addIgnoredFile(file.path)

  await FileModify(file, plugin, false)
  dump(`File rename modify send`, file.path)

  FileDeleteByPath(oldfile, plugin)
  dump(`File rename delete send`, oldfile)

  plugin.removeIgnoredFile(file.path)
}

export const FileDeleteByPath = function (path: string, plugin: FastSync) {
  if (path.endsWith(".md")) return
  const data = {
    vault: plugin.settings.vault,
    path: path,
    pathHash: hashContent(path),
  }
  plugin.websocket.MsgSend("FileDelete", data)
}





/**
  本地文件快照数据
 */

interface SnapFile {
  path: string
  pathHash: string
  contentHash: string
  mtime: number
}

export const SyncRequestSend = function (plugin: FastSync, noteLastTime: number, fileLastTime: number, notes: SnapFile[] = [], files: SnapFile[] = []) {

  const noteSyncData = {
    vault: plugin.settings.vault,
    lastTime: noteLastTime,
    notes: notes,
  }
  plugin.websocket.MsgSend("NoteSync", noteSyncData)
  dump("Notesync", noteSyncData)

  const fileSyncData = {
    vault: plugin.settings.vault,
    lastTime: fileLastTime,
    files: files
  }
  plugin.websocket.MsgSend("FileSync", fileSyncData)
  dump("FileSync", fileSyncData)

}

export const StartSync = async function (plugin: FastSync, isLoadLastTime: boolean = false) {
  while (!plugin.getWatchEnabled()) {
    new Notice("上一次的全部同步尚未完成，请耐心等待或检查服务端状态")
    return
  }

  plugin.syncTypeCompleteCount = 0
  plugin.disableWatch()

  const notes: SnapFile[] = [], files: SnapFile[] = [];
  const list = plugin.app.vault.getFiles()
  for (const file of list) {

    if (file.extension === "md") {
      // 同步笔记
      if (isLoadLastTime && file.stat.mtime < Number(plugin.settings.lastNoteSyncTime)) {
        continue
      }
      const content: string = await plugin.app.vault.cachedRead(file)
      notes.push({
        path: file.path,
        pathHash: hashContent(file.path),
        contentHash: hashContent(content),
        mtime: file.stat.mtime,
      })
    } else {
      // 同步文件
      if (isLoadLastTime && file.stat.mtime < Number(plugin.settings.lastFileSyncTime)) {
        continue
      }
      const content: ArrayBuffer = await plugin.app.vault.readBinary(file)
      files.push({
        path: file.path,
        pathHash: hashContent(file.path),
        contentHash: hashArrayBuffer(content),
        mtime: file.stat.mtime,
      })
    }
  }
  let fileLastTime = 0, noteLastTime = 0
  if (isLoadLastTime) {
    fileLastTime = Number(plugin.settings.lastFileSyncTime)
    noteLastTime = Number(plugin.settings.lastNoteSyncTime)
  }
  SyncRequestSend(plugin, noteLastTime, fileLastTime, notes, files)
}


// 同步
export const StartupSync = (plugin: FastSync): void => {
  void StartSync(plugin, true)
}

// 忽略上一次同步时间，强制同步
export const StartupFullSync = (plugin: FastSync): void => {
  void StartSync(plugin)
}
//

/* -------------------------------- 消息接收操作方法  Message receiving methods ------------------------------------------------ */


interface ReceiveMessage {
  vault: string
  path: string
  pathHash: string
  action: string
  content: string
  contentHash: string
  ctime: number
  mtime: number
  lastTime: number
}
interface ReceiveFileSyncUpdateMessage {
  path: string
  vault: string
  pathHash: string
  contentHash: string
  savePath: string
  size: number
  mtime: number
  ctime: number
  lastTime: number
}

interface FileUploadMessage {
  path: string
  ctime: number
  mtime: number
  sessionId: string
  chunkSize: number
}


interface ReceiveMtimeMessage {
  path: string
  ctime: number
  mtime: number
}

interface ReceivePathMessage {
  path: string
}




// ReceiveNoteModify 接收文件修改
export const ReceiveNoteSyncModify = async function (data: ReceiveMessage, plugin: FastSync) {
  dump(`Receive note modify:`, data.path, data.contentHash, data.mtime, data.pathHash)

  const file = plugin.app.vault.getFileByPath(data.path)
  plugin.addIgnoredFile(data.path)
  if (file) {
    await plugin.app.vault.modify(file, data.content, { ctime: data.ctime, mtime: data.mtime })
  } else {
    const folder = data.path.split("/").slice(0, -1).join("/")
    if (folder != "") {
      const dirExists = plugin.app.vault.getFolderByPath(folder)
      if (dirExists == null) await plugin.app.vault.createFolder(folder)
    }
    await plugin.app.vault.create(data.path, data.content, { ctime: data.ctime, mtime: data.mtime })
  }
  plugin.settings.lastNoteSyncTime = data.lastTime
  await plugin.saveData(plugin.settings)
  plugin.removeIgnoredFile(data.path)
}

// ReceiveNoteSyncNeed 接收处理需要上传需求
export const ReceiveNoteSyncNeedPush = async function (data: ReceivePathMessage, plugin: FastSync) {
  dump(`Receive note need push:`, data.path)
  const file = plugin.app.vault.getFileByPath(data.path)
  if (file) {
    await NoteModify(file, plugin, false)
  }
}

// ReceiveNoteSyncNeedMtime 接收需求修改mtime
export const ReceiveNoteSyncMtime = async function (data: ReceiveMtimeMessage, plugin: FastSync) {
  dump(`Receive note sync mtime:`, data.path, data.mtime)

  const file = plugin.app.vault.getFileByPath(data.path)
  if (file) {
    const content: string = await plugin.app.vault.cachedRead(file)
    plugin.addIgnoredFile(data.path)
    await plugin.app.vault.modify(file, content, { ctime: data.ctime, mtime: data.mtime })
    plugin.removeIgnoredFile(data.path)
  }
}

// 接收文件删除任务
export const ReceiveNoteSyncDelete = async function (data: ReceiveMessage, plugin: FastSync) {
  dump(`Receive note delete:`, data.action, data.path, data.mtime, data.pathHash)
  const file = plugin.app.vault.getFileByPath(data.path)
  if (file instanceof TFile) {
    plugin.addIgnoredFile(data.path)
    await plugin.app.vault.delete(file)
    plugin.removeIgnoredFile(data.path)
  }
}


// ReceiveFileNeedUpload 接收处理文件上传需求
export const ReceiveFileNeedUpload = async function (data: ReceivePathMessage, plugin: FastSync) {
  dump(`Receive file need upload:`, data.path)
  const file = plugin.app.vault.getFileByPath(data.path)
  if (!file) {
    dump(`File not found for upload: ${data.path}`)
    return
  }
  FileModify(file, plugin, false)
}
// ReceiveFileNeedUpload 接收处理文件上传需求
export const ReceiveFileUpload = async function (data: FileUploadMessage, plugin: FastSync) {
  dump(`Receive file need upload:`, data.path, data.sessionId)
  const file = plugin.app.vault.getFileByPath(data.path)
  if (!file) {
    dump(`File not found for upload: ${data.path}`)
    return
  }

  const content: ArrayBuffer = await plugin.app.vault.readBinary(file)
  const chunkSize = data.chunkSize || 1024 * 1024 // Default 1MB
  const totalChunks = Math.ceil(content.byteLength / chunkSize)

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize
    const end = Math.min(start + chunkSize, content.byteLength)
    const chunk = content.slice(start, end)

    // Construct Binary Frame: [SessionID (36)] [ChunkIndex (4)] [Content]
    // SessionID is string, needs to be bytes?
    // Doc says: [SessionID (36 bytes)] [ChunkIndex (4 bytes BigEndian)] [Content (N bytes)]
    // Usually SessionID is UUID string (36 chars). ASCII bytes checking.

    const sessionIdBytes = new TextEncoder().encode(data.sessionId)
    // Check if sessionIdBytes is 36 bytes. UUID string is 36 bytes.
    if (sessionIdBytes.length !== 36) {
      dump("Session ID length error", sessionIdBytes.length)
      // Handle error? Just proceed or error out.
    }

    const chunkIndexBytes = new Uint8Array(4)
    const view = new DataView(chunkIndexBytes.buffer)
    view.setUint32(0, i, false) // BigEndian

    const frame = new Uint8Array(36 + 4 + chunk.byteLength)
    frame.set(sessionIdBytes, 0)
    frame.set(chunkIndexBytes, 36)
    frame.set(new Uint8Array(chunk), 40)

    plugin.websocket.SendBinary(frame)
  }
}

// ReceiveFileSyncUpdate 接收更新（下载）
export const ReceiveFileSyncUpdate = async function (data: ReceiveFileSyncUpdateMessage, plugin: FastSync) {
  dump(`Receive file sync update (download):`, data.path, data.savePath)

  let downloadUrl = data.savePath
  if (!isHttpUrl(downloadUrl)) {
    // Construct URL from settings.api which might be ws://...
    // Need http://...
    let baseUrl = plugin.settings.api.replace(/\/+$/, '')
    // Ensure slash
    if (!downloadUrl.startsWith("/")) {
      baseUrl += "/"
    }
    downloadUrl = baseUrl + downloadUrl
  }

  dump("Download URL:", downloadUrl)

  // Use fetch to download
  try {
    const response = await requestUrl(downloadUrl)
    const arrayBuffer = response.arrayBuffer

    plugin.addIgnoredFile(data.path)
    const file = plugin.app.vault.getFileByPath(data.path)
    if (file) {
      await plugin.app.vault.modifyBinary(file, arrayBuffer, { ctime: data.ctime, mtime: data.mtime })
    } else {
      const folder = data.path.split("/").slice(0, -1).join("/")
      if (folder != "") {
        const dirExists = plugin.app.vault.getFolderByPath(folder)
        if (dirExists == null) await plugin.app.vault.createFolder(folder)
      }
      await plugin.app.vault.createBinary(data.path, arrayBuffer, { ctime: data.ctime, mtime: data.mtime })
    }
    plugin.removeIgnoredFile(data.path)
  } catch (e) {
    dump("Download error", e)
    new Notice(`File download failed: ${data.path}`)
  }
  plugin.settings.lastFileSyncTime = data.lastTime
  await plugin.saveData(plugin.settings)
}

// ReceiveFileSyncDelete 接收文件删除
export const ReceiveFileSyncDelete = async function (data: ReceivePathMessage, plugin: FastSync) {
  dump(`Receive file delete:`, data.path)
  const file = plugin.app.vault.getFileByPath(data.path)
  if (file instanceof TFile) {
    plugin.addIgnoredFile(data.path)
    await plugin.app.vault.delete(file)
    plugin.removeIgnoredFile(data.path)
  }
}

// ReceiveFileSyncMtime 接收 mtime 更新
export const ReceiveFileSyncMtime = async function (data: ReceiveMtimeMessage, plugin: FastSync) {
  dump(`Receive file sync mtime:`, data.path, data.mtime)
  const file = plugin.app.vault.getFileByPath(data.path)
  if (file) {
    // modifyBinary to same content just for mtime?
    // process is: read, write same content, update mtime.
    const content = await plugin.app.vault.readBinary(file)
    plugin.addIgnoredFile(data.path)
    await plugin.app.vault.modifyBinary(file, content, { ctime: data.ctime, mtime: data.mtime })
    plugin.removeIgnoredFile(data.path)
  }
}

// ReceiveFileSyncEnd 接收结束
export const ReceiveFileSyncEnd = async function (data: ReceiveMessage, plugin: FastSync) {
  dump(`Receive file sync end:`, data.vault, data.lastTime)
  plugin.settings.lastFileSyncTime = data.lastTime
  await plugin.saveData(plugin.settings)

  plugin.syncTypeCompleteCount++

  if (plugin.syncTypeCompleteCount === 2) {
    plugin.enableWatch()
    plugin.syncTypeCompleteCount = 0
  }
}




//接收同步结束消息
export const ReceiveNoteSyncEnd = async function (data: ReceiveMessage, plugin: FastSync) {
  dump(`Receive note end:`, data.vault, data, data.lastTime)
  plugin.settings.lastNoteSyncTime = data.lastTime
  await plugin.saveData(plugin.settings)
  plugin.syncTypeCompleteCount++

  if (plugin.syncTypeCompleteCount === 2) {
    plugin.enableWatch()
    plugin.syncTypeCompleteCount = 0
  }

}


type ReceiveSyncMethod = (data: unknown, plugin: FastSync) => void
export const syncReceiveMethodHandlers: Map<string, ReceiveSyncMethod> = new Map([
  ["NoteSyncModify", ReceiveNoteSyncModify],
  ["NoteSyncNeedPush", ReceiveNoteSyncNeedPush],
  ["NoteSyncMtime", ReceiveNoteSyncMtime],
  ["NoteSyncDelete", ReceiveNoteSyncDelete],
  ["NoteSyncEnd", ReceiveNoteSyncEnd],
  ["FileNeedUpload", ReceiveFileNeedUpload],
  ["FileUpload", ReceiveFileUpload],
  ["FileSyncUpdate", ReceiveFileSyncUpdate],
  ["FileSyncDelete", ReceiveFileSyncDelete],
  ["FileSyncMtime", ReceiveFileSyncMtime],
  ["FileSyncEnd", ReceiveFileSyncEnd],
])