import { TFile, TAbstractFile, Notice } from "obsidian";

import { timestampToDate, hashContent, stringToDate, dump } from "./helps";
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

  if (plugin.SyncSkipFiles[file.path] && plugin.SyncSkipFiles[file.path] == contentHash) {
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
  plugin.websocket.MsgSend("NoteModify", data, "json")
  plugin.SyncSkipFiles[file.path] = data.contentHash

  dump(`NoteModify Send`, data.path, data.contentHash, data.mtime, data.pathHash)
}

export const FileContentModify = async function (file: TAbstractFile, content: string, plugin: FastSync) {
  if (!file.path.endsWith(".md")) return

  if (!(file instanceof TFile)) {
    return
  }

  const contentHash = hashContent(content)
  if (plugin.SyncSkipFiles[file.path] && plugin.SyncSkipFiles[file.path] == contentHash) {
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
  plugin.websocket.MsgSend("NoteContentModify", data, "json")
  plugin.SyncSkipFiles[file.path] = data.contentHash

  dump(`FileContentModify Send`, data.path, data.contentHash, data.mtime, data.pathHash)
}

export const NoteDelete = async function (file: TAbstractFile, plugin: FastSync) {
  if (!file.path.endsWith(".md")) return
  if (!(file instanceof TFile)) {
    return
  }
  if (plugin.SyncSkipDelFiles[file.path]) {
    delete plugin.SyncSkipDelFiles[file.path]
    return
  }
  NoteDeleteByPath(file.path, plugin)
}

export const NoteDeleteByPath = async function (path: string, plugin: FastSync) {
  if (!path.endsWith(".md")) return
  const data = {
    vault: plugin.settings.vault,
    path: path,
    pathHash: hashContent(path),
  }
  plugin.websocket.MsgSend("NoteDelete", data, "json")
  dump(`Send NoteDelete`, data.path, data.path, data.pathHash)
}

export const FileRename = async function (file: TAbstractFile, oldfile: string, plugin: FastSync) {
  if (!file.path.endsWith(".md")) return
  if (!(file instanceof TFile)) {
    return
  }
  NoteDeleteByPath(oldfile, plugin)
  NoteModify(file, plugin)
  dump("rename", file, oldfile)
}

/**
  调用动作操作方法  Invoke action operation method
 */

// 强制文件同步
export const OverrideRemoteAllFiles = async function (plugin: FastSync) {
  if (plugin.websocket.isSyncAllFilesInProgress) {
    new Notice("上一次的全部笔记同步尚未完成，请耐心等待或检查服务端状态")
    return
  }

  plugin.websocket.isSyncAllFilesInProgress = true
  const files = plugin.app.vault.getMarkdownFiles()
  for (const file of files) {
    const content: string = await plugin.app.vault.cachedRead(file)
    const data = {
      vault: plugin.settings.vault,
      ctime: file.stat.ctime,
      mtime: file.stat.mtime,
      path: file.path,
      pathHash: hashContent(file.path),
      content: content,
      contentHash: hashContent(content),
    }
    plugin.websocket.MsgSend("NoteModifyOverride", data, "json")
  }
  plugin.websocket.isSyncAllFilesInProgress = false
  plugin.settings.lastSyncTime = 0
  await plugin.saveData(plugin.settings)
  NoteSync(plugin)
}

export const SyncAllFiles = async function (plugin: FastSync) {
  if (plugin.websocket.isSyncAllFilesInProgress) {
    new Notice("上一次的全部笔记同步尚未完成，请耐心等待或检查服务端状态")
    return
  }
  //发送同步请求
  await NoteSync(plugin)
  //等待接收结束信号
  while (plugin.websocket.isSyncAllFilesInProgress) {
    dump("Waiting For ReceiveNoteSyncEnd.")
    if (!plugin.websocket.isRegister) {
      dump("plugin.websocket.isUnRegister, return.")
      return
    }
    dump("Loop, Waiting...")
    await sleep(2000) // 每隔一秒重试一次
  }

  const files = await plugin.app.vault.getMarkdownFiles()
  for (const file of files) {
    const content: string = await plugin.app.vault.cachedRead(file)
    const data = {
      vault: plugin.settings.vault,
      ctime: file.stat.ctime,
      mtime: file.stat.mtime,
      path: file.path,
      pathHash: hashContent(file.path),
      content: content,
      contentHash: hashContent(content),
    }

    dump(`NoteSync NoteModify Send`, data.path, data.contentHash, data.mtime, data.pathHash)
    await plugin.websocket.MsgSend("NoteModify", data, "json", true)
  }
  plugin.websocket.isSyncAllFilesInProgress = false
  plugin.settings.lastSyncTime = 0
  await plugin.saveData(plugin.settings)
  console.log("SyncAllFiles")
  await NoteSync(plugin)
}

export const NoteSync = async function (plugin: FastSync) {
  while (plugin.websocket.isSyncAllFilesInProgress) {
    new Notice("上一次的全部笔记同步尚未完成，请耐心等待或检查服务端状态")
    return
    // if (!plugin.websocket.isRegister) {
    //   return
    // }
    // new Notice("上次的完整笔记同步任务尚未完成, 请耐心等待或者检查服务端是否正常服务")
    // dump("SyncAllFiles, Waiting...")
    // await sleep(2000) // 每隔一秒重试一次
  }

  const data = {
    vault: plugin.settings.vault,
    lastTime: Number(plugin.settings.lastSyncTime),
  }
  plugin.websocket.MsgSend("NoteSync", data, "json")
  dump("NoteSync", data)
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

// ReceiveNoteModify 接收文件修改
export const ReceiveNoteModify = async function (data: any, plugin: FastSync) {
  if (plugin.SyncSkipFiles[data.path] && plugin.SyncSkipFiles[data.path] == data.contentHash) {
    return
  }
  dump(`ReceiveNoteSyncModify:`, data.action, data.path, data.contentHash, data.mtime, data.pathHash)

  const fileExists = await plugin.app.vault.adapter.exists(data.path)

  if (fileExists) {
    const file = plugin.app.vault.getFileByPath(data.path)
    if (file && data.contentHash != hashContent(await plugin.app.vault.cachedRead(file))) {
      plugin.SyncSkipFiles[data.path] = data.contentHash
      await plugin.app.vault.modify(file, data.content, { ctime: data.ctime, mtime: data.mtime })
    }
  } else {
    const folder = data.path.split("/").slice(0, -1).join("/")
    if (folder != "") {
      const dirExists = await plugin.app.vault.adapter.exists(folder)
      if (!dirExists) await plugin.app.vault.createFolder(folder)
    }
    plugin.SyncSkipFiles[data.path] = data.contentHash
    await plugin.app.vault.create(data.path, data.content, { ctime: data.ctime, mtime: data.mtime })
  }
}

export const ReceiveNoteDelete = async function (data: any, plugin: FastSync) {
  dump(`ReceiveNoteSyncDelete:`, data.action, data.path, data.mtime, data.pathHash)
  const file = plugin.app.vault.getFileByPath(data.path)
  if (file instanceof TFile) {
    plugin.SyncSkipDelFiles[data.path] = "{ReceiveNoteSyncDelete}"
    plugin.app.vault.delete(file)
    //await plugin.app.vault.delete(file)s
  }
}

export const ReceiveNoteEnd = async function (data: any, plugin: FastSync) {
  dump(`ReceiveNoteSyncEnd:`, data.vault, data, data.lastTime)
  plugin.settings.lastSyncTime = data.lastTime
  await plugin.saveData(plugin.settings)
  plugin.websocket.isSyncAllFilesInProgress = false
}

type ReceiveSyncMethod = (data: any, plugin: FastSync) => void

export const syncReceiveMethodHandlers: Map<string, ReceiveSyncMethod> = new Map([
  ["NoteSyncModify", ReceiveNoteModify],
  ["NoteSyncDelete", ReceiveNoteDelete],
  ["NoteSyncEnd", ReceiveNoteEnd],
])
