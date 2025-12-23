import { TFile, TAbstractFile, TFolder, Notice } from "obsidian";

import { getAllConfigPaths, configWatcherHandlers, readConfigFile, writeConfigFile, updateConfigFileTime, removeConfigFile, cleanEmptyConfigFolders, isConfigPathExcluded, reloadConfig } from "./config_watcher";
import { hashContent, hashArrayBuffer, dump } from "./helps";
import { $ } from "../lang/lang";
import FastSync from "../main";


export type SyncMode = "auto" | "note" | "config"

/* -------------------------------- Note 推送相关 ------------------------------------------------ */

export const BINARY_PREFIX_FILE_SYNC = "00"

// NoteModify 消息推送
/**
 * 笔记修改事件处理
 * 当本地笔记发生修改时，计算哈希并向服务端推送 NoteModify 消息
 * @param file - 发生变化的文件对象
 * @param plugin - 插件实例
 * @param eventEnter - 是否由事件触发（用于忽略检查）
 */
export const NoteModify = async function (file: TAbstractFile, plugin: FastSync, eventEnter: boolean = false) {
  if (!file.path.endsWith(".md")) return
  if ((!plugin.getWatchEnabled() || !plugin.settings.syncEnabled) && eventEnter) {
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
/**
 * 笔记删除事件处理
 * 当本地笔记被删除时，向服务端推送 NoteDelete 消息
 */
export const NoteDelete = function (file: TAbstractFile, plugin: FastSync, eventEnter: boolean = false) {
  if (!file.path.endsWith(".md")) return
  if ((!plugin.getWatchEnabled() || !plugin.settings.syncEnabled) && eventEnter) {
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

/**
 * 笔记重命名事件处理
 * 视为旧文件删除和新文件修改两个操作
 */
export const NoteRename = async function (file: TAbstractFile, oldfile: string, plugin: FastSync, eventEnter: boolean = false) {
  if (!file.path.endsWith(".md")) return
  if ((!plugin.getWatchEnabled() || !plugin.settings.syncEnabled) && eventEnter) {
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

/**
 * 根据路径发送笔记删除消息
 */
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

/**
 * 文件（非笔记）修改事件处理
 * 计算文件哈希并发送 FileUploadCheck 消息，等待服务端确认是否需要上传
 */
export const FileModify = async function (file: TAbstractFile, plugin: FastSync, eventEnter: boolean = false) {
  if (file.path.endsWith(".md")) return
  if ((!plugin.getWatchEnabled() || !plugin.settings.syncEnabled) && eventEnter) {
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
    size: file.stat.size,
  }
  plugin.websocket.MsgSend("FileUploadCheck", data)
  dump(`File modify check sent`, data.path, data.contentHash)
  plugin.removeIgnoredFile(file.path)
}

/**
 * 文件删除事件处理
 */
export const FileDelete = function (file: TAbstractFile, plugin: FastSync, eventEnter: boolean = false) {
  if (file.path.endsWith(".md")) return
  if ((!plugin.getWatchEnabled() || !plugin.settings.syncEnabled) && eventEnter) {
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

/**
 * 文件重命名事件处理
 */
export const FileRename = async function (file: TAbstractFile, oldfile: string, plugin: FastSync, eventEnter: boolean = false) {
  if (file.path.endsWith(".md")) return
  if ((!plugin.getWatchEnabled() || !plugin.settings.syncEnabled) && eventEnter) {
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

/**
 * 根据路径发送文件删除消息
 */
export const FileDeleteByPath = function (path: string, plugin: FastSync) {
  if (path.endsWith(".md")) return
  const data = {
    vault: plugin.settings.vault,
    path: path,
    pathHash: hashContent(path),
  }
  plugin.websocket.MsgSend("FileDelete", data)
}

/* -------------------------------- Config 推送相关 ------------------------------------------------ */

/**
 * 配置文件修改事件处理
 */
export const ConfigModify = async function (path: string, plugin: FastSync, eventEnter: boolean = false) {

  if (!path.endsWith(".json") && !path.endsWith(".css") && !path.endsWith(".js")) return
  if ((!plugin.getWatchEnabled() || !plugin.settings.configSyncEnabled) && eventEnter) return
  if (isConfigPathExcluded(path, plugin)) return
  if (plugin.ignoredConfigFiles.has(path) && eventEnter) return

  plugin.addIgnoredConfigFile(path)

  const { content, stat } = await readConfigFile(path, plugin)
  if (!stat) return
  const contentHash = hashContent(content)
  const data = {
    vault: plugin.settings.vault,
    path: path, // 这里的 path 是相对于 .obsidian/ 的相对路径
    pathHash: hashContent(path),
    content: content,
    contentHash: contentHash,
    mtime: stat.mtime,
    ctime: stat.ctime,
  }

  // 读取内容
  plugin.websocket.MsgSend("SettingModify", data)

  plugin.removeIgnoredConfigFile(path)

  dump(`SettingModify send`, data)
}

/**
 * 配置文件删除事件处理
 */
export const ConfigDelete = function (path: string, plugin: FastSync, eventEnter: boolean = false) {
  if (!path.endsWith(".json") && !path.endsWith(".css") && !path.endsWith(".js")) return
  if ((!plugin.getWatchEnabled() || !plugin.settings.configSyncEnabled) && eventEnter) return
  if (isConfigPathExcluded(path, plugin)) return
  if (plugin.ignoredConfigFiles.has(path) && eventEnter) return

  plugin.addIgnoredConfigFile(path)

  const data = {
    vault: plugin.settings.vault,
    path: path,
    pathHash: hashContent(path),
  }

  plugin.websocket.MsgSend("SettingDelete", data)

  plugin.removeIgnoredConfigFile(path)

  dump(`SettingDelete send`, path)
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

/**
 * 发送同步请求
 * 将本地文件快照（Notes 和 Files）发送给服务端进行差异比对
 */
export const SyncRequestSend = function (plugin: FastSync, noteLastTime: number, fileLastTime: number, configLastTime: number, notes: SnapFile[] = [], files: SnapFile[] = [], configs: SnapFile[] = [], syncMode: SyncMode = "auto") {
  const shouldSyncNotes = syncMode === "auto" || syncMode === "note"
  const shouldSyncConfigs = syncMode === "auto" || syncMode === "config"

  if (plugin.settings.syncEnabled && shouldSyncNotes) {
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
      files: files,
    }
    plugin.websocket.MsgSend("FileSync", fileSyncData)
    dump("FileSync", fileSyncData)
  }

  if (plugin.settings.configSyncEnabled && shouldSyncConfigs) {
    const configSyncData = {
      vault: plugin.settings.vault,
      lastTime: configLastTime,
      settings: configs,
      cover: plugin.settings.lastConfigSyncTime == 0,
    }
    plugin.websocket.MsgSend("SettingSync", configSyncData)
    dump("ConfigSync", configSyncData)
  }
}

/**
 * 收集本地文件信息，并调用 SyncRequestSend 发送同步请求
 * @param plugin 插件实例
 * @param isLoadLastTime 是否加载上次同步时间（增量同步）
 * @param syncMode 同步模式 "auto" | "note" | "config"
 */
export const StartSync = async function (plugin: FastSync, isLoadLastTime: boolean = false, syncMode: SyncMode = "auto") {
  if (!plugin.ribbonIconStatus) {
    new Notice($("服务已断开"))
    return
  }
  while (!plugin.getWatchEnabled()) {
    new Notice("上一次的全部同步尚未完成，请耐心等待或检查服务端状态")
    return
  }

  plugin.syncTypeCompleteCount = 0
  plugin.totalFilesToDownload = 0
  plugin.downloadedFilesCount = 0
  plugin.totalChunksToDownload = 0
  plugin.downloadedChunksCount = 0
  plugin.disableWatch()

  new Notice($("开始同步"))

  const notes: SnapFile[] = [],
    files: SnapFile[] = [],
    configs: SnapFile[] = []

  const shouldSyncNotes = syncMode === "auto" || syncMode === "note"
  const shouldSyncConfigs = syncMode === "auto" || syncMode === "config"

  let expectedCount = 0
  if (plugin.settings.syncEnabled && shouldSyncNotes) {
    expectedCount += 2
  }
  if (plugin.settings.configSyncEnabled && shouldSyncConfigs) {
    expectedCount += 1
  }
  plugin.expectedSyncCount = expectedCount
  dump("StartSync expectedCount:", expectedCount, "syncMode:", syncMode)

  if (plugin.settings.syncEnabled && shouldSyncNotes) {
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
  }

  // 同步配置
  const configPaths = plugin.settings.configSyncEnabled && shouldSyncConfigs ? await getAllConfigPaths(plugin) : []
  for (const path of configPaths) {
    if (isConfigPathExcluded(path, plugin)) continue

    const fullPath = `${plugin.app.vault.configDir}/${path}`
    const stat = await plugin.app.vault.adapter.stat(fullPath)
    if (!stat) continue

    if (isLoadLastTime && stat.mtime < Number(plugin.settings.lastConfigSyncTime)) {
      continue
    }

    let contentHash: string
    if (path.endsWith(".json") || path.endsWith(".css") || path.endsWith(".js")) {
      const content = await plugin.app.vault.adapter.read(fullPath)
      contentHash = hashContent(content)
    } else {
      continue
    }

    configs.push({
      path: path,
      pathHash: hashContent(path),
      contentHash: contentHash,
      mtime: stat.mtime,
    })
  }

  let fileLastTime = 0,
    noteLastTime = 0,
    configLastTime = 0
  if (isLoadLastTime) {
    fileLastTime = Number(plugin.settings.lastFileSyncTime)
    noteLastTime = Number(plugin.settings.lastNoteSyncTime)
    configLastTime = Number(plugin.settings.lastConfigSyncTime)
  }

  SyncRequestSend(plugin, noteLastTime, fileLastTime, configLastTime, notes, files, configs, syncMode)
}

/**
 * 启动时同步（增量同步）
 */
export const StartupSync = (plugin: FastSync): void => {
  void StartSync(plugin, true)
}

/**
 * 启动全量同步
 * 先清理空文件夹，然后进行全量同步
 */
export const StartupFullSync = async (plugin: FastSync) => {
  void StartSync(plugin)
  dump("Starting clean empty folders...")
  await cleanEmptyFolders(plugin)
  dump("Clean empty folders done.")
}

export const CleanLocalSyncTime = async (plugin: FastSync) => {
  plugin.settings.lastFileSyncTime = 0
  plugin.settings.lastNoteSyncTime = 0
  plugin.settings.lastConfigSyncTime = 0
  plugin.saveSettings()
}
/**
 * 递归清理空文件夹
 */
const cleanEmptyFolders = async (plugin: FastSync) => {
  const clean = async (folder: TFolder): Promise<boolean> => {
    let isEmpty = true
    for (const child of [...folder.children]) {
      if (child instanceof TFolder) {
        const isChildEmpty = await clean(child)
        if (!isChildEmpty) {
          isEmpty = false
        }
      } else {
        isEmpty = false
      }
    }

    if (isEmpty && folder.path !== "/") {
      try {
        await plugin.app.vault.delete(folder)
        dump(`Deleted empty folder: ${folder.path}`)
        return true
      } catch (e) {
        dump(`Failed to delete empty folder: ${folder.path}`, e)
      }
    }
    return isEmpty
  }

  const root = plugin.app.vault.getRoot()
  for (const child of root.children) {
    if (child instanceof TFolder) {
      await clean(child)
    }
  }
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

interface FileSyncChunkDownloadMessage {
  path: string
  ctime: number
  mtime: number
  sessionId: string
  chunkSize: number
  totalChunks: number
  size: number
}

interface FileDownloadSession {
  path: string
  ctime: number
  mtime: number
  lastTime: number
  sessionId: string
  totalChunks: number
  size: number
  chunks: Map<number, ArrayBuffer>
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
/**
 * 接收服务端笔记修改通知
 * 更新本地笔记内容
 */
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
  if (plugin.settings.lastNoteSyncTime < data.lastTime) {
    plugin.settings.lastNoteSyncTime = data.lastTime
    await plugin.saveData(plugin.settings)
  }
  plugin.removeIgnoredFile(data.path)
}

// ReceiveNoteSyncNeed 接收处理需要上传需求
/**
 * 接收服务端请求上传笔记
 * 当服务端发现缺少该笔记或内容不一致时触发，客户端需重新推送该笔记
 */
export const ReceiveNoteSyncNeedPush = async function (data: ReceivePathMessage, plugin: FastSync) {
  dump(`Receive note need push:`, data.path)
  const file = plugin.app.vault.getFileByPath(data.path)
  if (file) {
    await NoteModify(file, plugin, false)
  }
}

// ReceiveNoteSyncNeedMtime 接收需求修改mtime
/**
 * 接收服务端笔记元数据(mtime)更新通知
 * 仅更新本地文件的修改时间，不修改内容
 */
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

/**
 * 接收服务端笔记删除通知
 * 删除本地对应的笔记
 */
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
/**
 * 接收服务端文件上传请求 (FileNeedUpload)
 * 服务端请求客户端上传特定文件的元数据检查 (FileUploadCheck)
 */
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
/**
 * 接收服务端文件上传指令 (FileUpload)
 * 服务端确认需要文件内容，客户端读取文件并分片发送二进制数据
 */
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
    plugin.websocket.SendBinary(frame, BINARY_PREFIX_FILE_SYNC)
  }
}

// ReceiveFileSyncUpdate 接收更新(下载) - 使用 WebSocket 分片下载
/**
 * 接收服务端文件更新通知 (FileSyncUpdate)
 * 准备下载文件：创建临时会话并发送下载请求 (FileChunkDownload)
 */
export const ReceiveFileSyncUpdate = async function (data: ReceiveFileSyncUpdateMessage, plugin: FastSync) {
  dump(`Receive file sync update (download):`, data.path)

  // 使用临时 key (path) 存储文件元数据,等待 FileSyncChunkDownload 响应
  const tempKey = `temp_${data.path}`
  const tempSession = {
    path: data.path,
    ctime: data.ctime,
    mtime: data.mtime,
    lastTime: data.lastTime,
    sessionId: "", // 将在 FileSyncChunkDownload 中设置
    totalChunks: 0,
    size: data.size,
    chunks: new Map<number, ArrayBuffer>(),
  }

  plugin.fileDownloadSessions.set(tempKey, tempSession)

  // 发送 FileChunkDownload 请求
  const requestData = {
    vault: plugin.settings.vault,
    path: data.path,
    pathHash: data.pathHash,
  }
  plugin.websocket.MsgSend("FileChunkDownload", requestData)
  dump(`File chunk download request sent:`, requestData)

  plugin.totalFilesToDownload++
}

// ReceiveFileSyncDelete 接收文件删除
/**
 * 接收服务端文件删除通知
 * 删除本地对应的文件
 */
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
/**
 * 接收服务端文件元数据(mtime)更新通知
 */
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

// ReceiveFileSyncChunkDownload 接收分片下载响应
/**
 * 接收服务端分片下载响应 (FileSyncChunkDownload)
 * 初始化或迁移下载会话，准备接收二进制分片
 */
export const ReceiveFileSyncChunkDownload = async function (data: FileSyncChunkDownloadMessage, plugin: FastSync) {
  dump(`Receive file chunk download:`, data.path, data.sessionId, `totalChunks: ${data.totalChunks}`)

  // 查找临时会话
  const tempKey = `temp_${data.path}`
  const tempSession = plugin.fileDownloadSessions.get(tempKey)

  if (tempSession) {
    // 从临时会话迁移到正式会话
    const session: FileDownloadSession = {
      path: data.path,
      ctime: data.ctime,
      mtime: data.mtime,
      lastTime: tempSession.lastTime, // 使用 FileSyncUpdate 中的 lastTime
      sessionId: data.sessionId,
      totalChunks: data.totalChunks,
      size: data.size,
      chunks: new Map<number, ArrayBuffer>(),
    }
    plugin.fileDownloadSessions.set(data.sessionId, session)
    plugin.fileDownloadSessions.delete(tempKey) // 删除临时会话
    dump(`Download session migrated from temp to ${data.sessionId}`)
  } else {
    // 如果没有临时会话,直接创建新会话
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
    dump(`Download session created directly: ${data.sessionId}`)
  }

  plugin.totalChunksToDownload += data.totalChunks
  plugin.updateStatusBar($("同步中"), plugin.downloadedChunksCount, plugin.totalChunksToDownload)

  dump(`Download session initialized:`, data.path, `expecting ${data.totalChunks} chunks`)
}

// HandleFileDownloadChunk 处理二进制分片

/**
 * 检查同步是否完成
 */
function CheckSyncCompletion(plugin: FastSync) {
  dump(`CheckSyncCompletion:`, plugin.syncTypeCompleteCount, "/", plugin.expectedSyncCount, "Sessions:", plugin.fileDownloadSessions.size)
  if (plugin.syncTypeCompleteCount >= plugin.expectedSyncCount && plugin.fileDownloadSessions.size === 0) {
    plugin.enableWatch()
    plugin.syncTypeCompleteCount = 0
    plugin.totalFilesToDownload = 0
    plugin.downloadedFilesCount = 0
    plugin.totalChunksToDownload = 0
    plugin.downloadedChunksCount = 0
    new Notice($("同步完成"))
    plugin.updateStatusBar($("同步完成"))
    setTimeout(() => {
      plugin.updateStatusBar("")
    }, 5000)
  }
}

/**
 * 处理接收到的二进制文件分片
 */
export const HandleFileDownloadChunk = async function (buf: ArrayBuffer | Blob, plugin: FastSync) {
  const binaryData = buf instanceof Blob ? await buf.arrayBuffer() : buf

  // 解析二进制帧: [SessionID (36)] [ChunkIndex (4)] [ChunkData]
  if (binaryData.byteLength < 40) {
    dump("Binary frame too short:", binaryData.byteLength)
    return
  }

  const sessionIdBytes = new Uint8Array(binaryData, 0, 36)
  const sessionId = new TextDecoder().decode(sessionIdBytes)

  const chunkIndexBytes = new Uint8Array(binaryData, 36, 4)
  const view = new DataView(chunkIndexBytes.buffer, chunkIndexBytes.byteOffset, 4)
  const chunkIndex = view.getUint32(0, false) // BigEndian

  const chunkData = binaryData.slice(40)

  dump(`Received chunk ${chunkIndex} for session ${sessionId}, size: ${chunkData.byteLength}`)

  // 查找会话
  const session = plugin.fileDownloadSessions.get(sessionId)
  if (!session) {
    dump(`Session not found: ${sessionId}`)
    return
  }

  // 存储分片
  session.chunks.set(chunkIndex, chunkData)

  plugin.downloadedChunksCount++
  plugin.updateStatusBar($("同步中"), plugin.downloadedChunksCount, plugin.totalChunksToDownload)

  // 检查是否接收完所有分片
  if (session.chunks.size === session.totalChunks) {
    dump(`All chunks received for ${session.path}, completing download`)
    await CompleteFileDownload(session, plugin)
  } else {
    dump(`Progress: ${session.chunks.size}/${session.totalChunks} chunks for ${session.path}`)
  }
}

// CompleteFileDownload 重组并保存文件
/**
 * 完成文件下载
 * 组装所有分片，验证大小，并写入本地文件
 */
async function CompleteFileDownload(session: FileDownloadSession, plugin: FastSync) {
  try {
    // 按 chunkIndex 顺序合并分片
    const chunks: ArrayBuffer[] = []
    for (let i = 0; i < session.totalChunks; i++) {
      const chunk = session.chunks.get(i)
      if (!chunk) {
        dump(`Missing chunk ${i} for ${session.path}`)
        new Notice(`File download incomplete: ${session.path}`)
        plugin.fileDownloadSessions.delete(session.sessionId)
        return
      }
      chunks.push(chunk)
    }

    // 合并所有分片
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
    const completeFile = new Uint8Array(totalSize)
    let offset = 0
    for (const chunk of chunks) {
      completeFile.set(new Uint8Array(chunk), offset)
      offset += chunk.byteLength
    }

    // 验证文件大小
    if (completeFile.byteLength !== session.size) {
      dump(`File size mismatch: expected ${session.size}, got ${completeFile.byteLength}`)
      new Notice(`File download size mismatch: ${session.path}`)
      plugin.fileDownloadSessions.delete(session.sessionId)
      return
    }

    dump(`File assembled: ${session.path}, size: ${completeFile.byteLength}`)

    // 保存文件到 Vault
    plugin.addIgnoredFile(session.path)
    const file = plugin.app.vault.getFileByPath(session.path)
    if (file) {
      await plugin.app.vault.modifyBinary(file, completeFile.buffer, { ctime: session.ctime, mtime: session.mtime })
    } else {
      const folder = session.path.split("/").slice(0, -1).join("/")
      if (folder != "") {
        const dirExists = plugin.app.vault.getFolderByPath(folder)
        if (dirExists == null) await plugin.app.vault.createFolder(folder)
      }
      await plugin.app.vault.createBinary(session.path, completeFile.buffer, { ctime: session.ctime, mtime: session.mtime })
    }
    plugin.removeIgnoredFile(session.path)

    // 更新同步时间
    if (plugin.settings.lastFileSyncTime < session.lastTime) {
      plugin.settings.lastFileSyncTime = session.lastTime
      await plugin.saveData(plugin.settings)
    }

    dump(`File download completed: ${session.path}`)

    // 清理会话
    plugin.fileDownloadSessions.delete(session.sessionId)

    plugin.downloadedFilesCount++
    CheckSyncCompletion(plugin)
  } catch (e) {
    dump("File download error:", e)
    new Notice(`File download failed: ${session.path}`)
    plugin.fileDownloadSessions.delete(session.sessionId)
    CheckSyncCompletion(plugin)
  }
}

// ReceiveFileSyncEnd 接收结束
/**
 * 接收文件同步结束通知
 * 更新最后同步时间，并检查是否所有同步步骤都已完成
 */
export const ReceiveFileSyncEnd = async function (data: ReceiveMessage, plugin: FastSync) {
  dump(`Receive file sync end:`, data.vault, data.lastTime)
  plugin.settings.lastFileSyncTime = data.lastTime
  await plugin.saveData(plugin.settings)

  plugin.syncTypeCompleteCount++

  CheckSyncCompletion(plugin)
}

/**
 * 接收笔记同步结束通知
 * 更新最后同步时间，并检查是否所有同步步骤都已完成
 */
export const ReceiveNoteSyncEnd = async function (data: ReceiveMessage, plugin: FastSync) {
  dump(`Receive note end:`, data.vault, data, data.lastTime)
  plugin.settings.lastNoteSyncTime = data.lastTime
  await plugin.saveData(plugin.settings)
  plugin.syncTypeCompleteCount++

  CheckSyncCompletion(plugin)
}

/* -------------------------------- Config 接收操作方法 ------------------------------------------------ */

/**
 * 接收服务端配置文件修改通知
 */
export const ReceiveConfigSyncModify = async function (data: ReceiveMessage, plugin: FastSync) {
  if (!plugin.settings.configSyncEnabled) return
  if (isConfigPathExcluded(data.path, plugin)) return
  if (plugin.ignoredConfigFiles.has(data.path)) return

  plugin.addIgnoredConfigFile(data.path)
  dump(`Receive config modify:`, data.path, data.contentHash)

  await writeConfigFile(data.path, data.content, data, plugin)
  await reloadConfig(data.path, data.content, plugin)

  plugin.removeIgnoredConfigFile(data.path)

  if (plugin.settings.lastConfigSyncTime < data.lastTime) {
    plugin.settings.lastConfigSyncTime = data.lastTime
    await plugin.saveData(plugin.settings)
  }
}

/**
 * 接收服务端请求上传配置文件
 */
export const ReceiveConfigSyncNeedUpload = async function (data: ReceivePathMessage, plugin: FastSync) {
  dump(`Receive config need upload:`, data.path)
  if (!plugin.settings.configSyncEnabled) return
  if (isConfigPathExcluded(data.path, plugin)) return
  if (plugin.ignoredConfigFiles.has(data.path)) return

  await ConfigModify(data.path, plugin, false)
}

/**
 * 接收服务端配置文件元数据更新通知
 */
export const ReceiveConfigSyncMtime = async function (data: ReceiveMtimeMessage, plugin: FastSync) {
  if (!plugin.settings.configSyncEnabled) return
  if (isConfigPathExcluded(data.path, plugin)) return
  if (plugin.ignoredConfigFiles.has(data.path)) return

  plugin.addIgnoredConfigFile(data.path)

  dump(`Receive config sync mtime:`, data.path, data.mtime)
  await updateConfigFileTime(data.path, data, plugin)

  plugin.removeIgnoredConfigFile(data.path)
}

/**
 * 接收服务端配置文件删除通知
 */
export const ReceiveConfigSyncDelete = async function (data: ReceiveMessage, plugin: FastSync) {
  if (!plugin.settings.configSyncEnabled) return
  if (isConfigPathExcluded(data.path, plugin)) return
  if (plugin.ignoredConfigFiles.has(data.path)) return

  dump(`Receive config delete:`, data.path)
  const fullPath = `${plugin.app.vault.configDir}/${data.path}`
  if (await plugin.app.vault.adapter.exists(fullPath)) {
    await plugin.app.vault.adapter.remove(fullPath)
  }
}

/**
 * 接收配置同步结束通知
 */
export const ReceiveConfigSyncEnd = async function (data: ReceiveMessage, plugin: FastSync) {
  dump(`Receive config sync end:`, data.lastTime)
  plugin.settings.lastConfigSyncTime = data.lastTime
  await plugin.saveData(plugin.settings)
  plugin.syncTypeCompleteCount++
  CheckSyncCompletion(plugin)
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
  ["FileSyncChunkDownload", ReceiveFileSyncChunkDownload],
  ["FileSyncDelete", ReceiveFileSyncDelete],
  ["FileSyncMtime", ReceiveFileSyncMtime],
  ["FileSyncEnd", ReceiveFileSyncEnd],
  ["SettingSyncModify", ReceiveConfigSyncModify],
  ["SettingSyncNeedUpload", ReceiveConfigSyncNeedUpload],
  ["SettingSyncMtime", ReceiveConfigSyncMtime],
  ["SettingSyncDelete", ReceiveConfigSyncDelete],
  ["SettingSyncEnd", ReceiveConfigSyncEnd],
])
