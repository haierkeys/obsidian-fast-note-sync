import { TFile, TAbstractFile, Notice } from "obsidian";

import { hashContent, dump } from "./helps";
import FastSync from "../main";


/**
 消息推送操作方法 Message Push Operation Method
 */

export const NoteModify = async function (file: TAbstractFile, plugin: FastSync) {
  if (!file.path.endsWith(".md")) return
  if (!(file instanceof TFile)) {
    return
  }
  const content: string = await plugin.app.vault.cachedRead(file)
  const contentHash = hashContent(content)

  if (plugin.syncSkipFiles[file.path] && plugin.syncSkipFiles[file.path] == contentHash) {
    dump(`Note modify skip`, file.path, contentHash)
    return
  }

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
  plugin.syncSkipFiles[file.path] = data.contentHash

  dump(`Note modify send`, data.path, data.contentHash, data.mtime, data.pathHash)
}


export const NoteDelete = async function (file: TAbstractFile, plugin: FastSync) {
  if (!file.path.endsWith(".md")) return
  if (!(file instanceof TFile)) {
    return
  }
  if (plugin.syncSkipDelFiles[file.path]) {
    delete plugin.syncSkipDelFiles[file.path]
    return
  }
  NoteDeleteByPath(file.path, plugin)
  dump(`Note delete send`, file.path)
}

export const NoteRename = async function (file: TAbstractFile, oldfile: string, plugin: FastSync) {
  if (!file.path.endsWith(".md")) return
  if (!(file instanceof TFile)) {
    return
  }
  NoteDeleteByPath(oldfile, plugin)
  await NoteModify(file, plugin)
  dump(`Note rename send`, file, oldfile)
}


export const NoteContentModify = function (file: TAbstractFile, content: string, plugin: FastSync) {
  if (!file.path.endsWith(".md")) return

  if (!(file instanceof TFile)) {
    return
  }

  const contentHash = hashContent(content)
  if (plugin.syncSkipFiles[file.path] && plugin.syncSkipFiles[file.path] == contentHash) {
    return
  }

  // 异步读取文件内容
  const data = {
    vault: plugin.settings.vault,
    ctime: file.stat.ctime,
    mtime: file.stat.mtime,
    path: file.path,
    pathHash: hashContent(file.path),
    content: content,
    contentHash: hashContent(content),
  }
  plugin.websocket.MsgSend("NoteContentModify", data)
  plugin.syncSkipFiles[file.path] = data.contentHash

  dump(`Note content modify send`, data.path, data.contentHash, data.mtime, data.pathHash)
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


/**
  调用动作操作方法  Invoke action operation method
 */

// 异步实现：保留原始逻辑，返回 Promise<void>
export async function overrideRemoteAllFilesImpl(plugin: FastSync): Promise<void> {
  if (plugin.websocket.isSyncAllFilesInProgress) {
    // Notice 文本使用 sentence case
    new Notice("上一次的全部笔记同步尚未完成，请耐心等待或检查服务端状态")
    return
  }

  const localNotes: NoteSyncCheck[] = []
  const files = plugin.app.vault.getMarkdownFiles()
  for (const file of files) {
    const content: string = await plugin.app.vault.cachedRead(file)
    localNotes.push({
      path: file.path,
      pathHash: hashContent(file.path),
      contentHash: hashContent(content),
      mtime: file.stat.mtime,
    })
  }
  plugin.settings.lastSyncTime = 0
  await plugin.saveData(plugin.settings)
  NoteSync(plugin, localNotes)
}

// 同步包装：供 addCommand 使用，返回 void（命令回调类型安全）
export const OverrideRemoteAllFiles = (plugin: FastSync): void => {
  void overrideRemoteAllFilesImpl(plugin)
}

// 异步实现：保留原始逻辑，返回 Promise<void>
export async function syncAllFilesImpl(plugin: FastSync): Promise<void> {
  if (plugin.websocket.isSyncAllFilesInProgress) {
    new Notice("上一次的全部笔记同步尚未完成，请耐心等待或检查服务端状态")
    return
  }
  // 发送同步请求
  NoteSync(plugin)
  // 等待接收结束信号
  while (plugin.websocket.isSyncAllFilesInProgress) {
    // 这些 dump 是调试输出，若会展示给用户请改为 sentence case 的用户提示或移除
    dump("Waiting for receive notesync end.")
    if (!plugin.websocket.isRegister) {
      dump("Plugin websocket is not register, return.")
      return
    }
    dump("Loop, waiting...")
    await sleep(2000) // 每隔两秒重试一次
  }
  const localNotes: NoteSyncCheck[] = []
  const files = plugin.app.vault.getMarkdownFiles()
  for (const file of files) {
    const content: string = await plugin.app.vault.cachedRead(file)
    localNotes.push({
      path: file.path,
      pathHash: hashContent(file.path),
      contentHash: hashContent(content),
      mtime: file.stat.mtime,
    })
  }
  plugin.settings.lastSyncTime = 0
  await plugin.saveData(plugin.settings)
  NoteSync(plugin, localNotes)
}

// 同步包装：供 addCommand 使用，返回 void（命令回调类型安全）
export const SyncAllFiles = (plugin: FastSync): void => {
  void syncAllFilesImpl(plugin)
}

interface NoteSyncCheck {
  path: string
  pathHash: string
  contentHash: string
  mtime: number
}

export const NoteSync = function (plugin: FastSync, notes: NoteSyncCheck[] = []) {
  while (plugin.websocket.isSyncAllFilesInProgress) {
    new Notice("上一次的全部笔记同步尚未完成，请耐心等待或检查服务端状态")
    return
  }

  const data = {
    vault: plugin.settings.vault,
    lastTime: Number(plugin.settings.lastSyncTime),
    notes: notes
  }
  plugin.websocket.MsgSend("NoteSync", data)
  dump("Notesync", data)
  plugin.websocket.isSyncAllFilesInProgress = true
}

/**
  消息接收操作方法  Message receiving methods
 */

interface ReceiveData {
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

interface ReceiveCheckData {
  path: string
  ctime: number
  mtime: number
}

// ReceiveNoteModify 接收文件修改
export const ReceiveNoteSyncModify = async function (data: ReceiveData, plugin: FastSync) {
  if (plugin.syncSkipFiles[data.path] && plugin.syncSkipFiles[data.path] == data.contentHash) {
    return
  }
  dump(`Receive note modify:`, data.action, data.path, data.contentHash, data.mtime, data.pathHash)

  const file = plugin.app.vault.getFileByPath(data.path)
  if (file) {
    if (data.contentHash != hashContent(await plugin.app.vault.cachedRead(file))) {
      plugin.syncSkipFiles[data.path] = data.contentHash
      await plugin.app.vault.modify(file, data.content, { ctime: data.ctime, mtime: data.mtime })
    }
  } else {
    const folder = data.path.split("/").slice(0, -1).join("/")
    if (folder != "") {
      const dirExists = plugin.app.vault.getFolderByPath(folder)
      if (dirExists == null) await plugin.app.vault.createFolder(folder)
    }
    plugin.syncSkipFiles[data.path] = data.contentHash
    await plugin.app.vault.create(data.path, data.content, { ctime: data.ctime, mtime: data.mtime })
  }
}

// ReceiveNoteSyncNeed 接收处理需要上传需求
export const ReceiveNoteSyncNeedPush = async function (data: ReceiveCheckData, plugin: FastSync) {
  dump(`Receive note need push:`, data.path, data.mtime)
  const file = plugin.app.vault.getFileByPath(data.path)
  if (file) {
    delete plugin.syncSkipFiles[file.path]
    await NoteModify(file, plugin)
  }
}

// ReceiveNoteSyncNeedMtime 接收需求修改mtime
export const ReceiveNoteSyncMtime = async function (data: ReceiveCheckData, plugin: FastSync) {
  dump(`Receive note sync mtime:`, data.path, data.mtime)

  const file = plugin.app.vault.getFileByPath(data.path)
  if (file) {
    const content: string = await plugin.app.vault.cachedRead(file)
    await plugin.app.vault.modify(file, content, { ctime: data.ctime, mtime: data.mtime })
  }
}

// 接收文件删除任务
export const ReceiveNoteSyncDelete = async function (data: ReceiveData, plugin: FastSync) {
  dump(`Receive note delete:`, data.action, data.path, data.mtime, data.pathHash)
  const file = plugin.app.vault.getFileByPath(data.path)
  if (file instanceof TFile) {
    plugin.syncSkipDelFiles[data.path] = "{ReceiveNoteSyncDelete}"
    await plugin.app.vault.delete(file)
    //await plugin.app.vault.delete(file)s
  }
}

//接收同步结束消息
export const ReceiveNoteSyncEnd = async function (data: ReceiveData, plugin: FastSync) {
  dump(`Receive note end:`, data.vault, data, data.lastTime)
  plugin.settings.lastSyncTime = data.lastTime
  await plugin.saveData(plugin.settings)
  plugin.websocket.isSyncAllFilesInProgress = false
  plugin.websocket.FlushQueue()
}

type ReceiveSyncMethod = (data: unknown, plugin: FastSync) => void

export const syncReceiveMethodHandlers: Map<string, ReceiveSyncMethod> = new Map([
  ["NoteSyncModify", ReceiveNoteSyncModify],
  ["NoteSyncNeedPush", ReceiveNoteSyncNeedPush],
  ["NoteSyncMtime", ReceiveNoteSyncMtime],
  ["NoteSyncDelete", ReceiveNoteSyncDelete],
  ["NoteSyncEnd", ReceiveNoteSyncEnd],
])