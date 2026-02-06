import { TFolder, normalizePath } from "obsidian";

import { ReceiveMessage, ReceiveMtimeMessage, ReceivePathMessage, SyncEndData, FolderSyncRenameMessage } from "./types";
import { hashContent, dump, isPathExcluded } from "./helps";
import type FastSync from "../main";


/**
 * 文件夹修改/创建事件处理
 */
export const folderModify = async function (folder: TFolder, plugin: FastSync, eventEnter: boolean = false) {
    if (plugin.settings.syncEnabled == false) return
    if (eventEnter && !plugin.getWatchEnabled()) return
    if (eventEnter && plugin.ignoredFiles.has(folder.path)) return
    if (isPathExcluded(folder.path, plugin)) return

    plugin.addIgnoredFile(folder.path)

    const data = {
        vault: plugin.settings.vault,
        ctime: 0, // 文件夹暂不支持 stat.ctime
        mtime: 0, // 文件夹暂不支持 stat.mtime
        path: folder.path,
        pathHash: hashContent(folder.path),
    }
    plugin.folderHashManager.setFolderHash(folder.path, hashContent(folder.path))
    plugin.websocket.SendMessage("FolderModify", data)
    dump(`Folder modify send`, data.path, data.pathHash)

    plugin.removeIgnoredFile(folder.path)
}

/**
 * 文件夹删除事件处理
 */
export const folderDelete = function (folder: TFolder, plugin: FastSync, eventEnter: boolean = false) {
    if (plugin.settings.syncEnabled == false) return
    if (eventEnter && !plugin.getWatchEnabled()) return
    if (eventEnter && plugin.ignoredFiles.has(folder.path)) return
    if (isPathExcluded(folder.path, plugin)) return

    plugin.addIgnoredFile(folder.path)

    const data = {
        vault: plugin.settings.vault,
        path: folder.path,
        pathHash: hashContent(folder.path),
    }
    plugin.folderHashManager.removeFolderHash(folder.path)
    plugin.websocket.SendMessage("FolderDelete", data)
    dump(`Folder delete send`, folder.path)

    plugin.removeIgnoredFile(folder.path)
}

/**
 * 文件夹重命名事件处理
 */
export const folderRename = async function (folder: TFolder, oldPath: string, plugin: FastSync, eventEnter: boolean = false) {
    if (plugin.settings.syncEnabled == false) return
    if (eventEnter && !plugin.getWatchEnabled()) return
    if (eventEnter && plugin.ignoredFiles.has(folder.path)) return
    if (isPathExcluded(folder.path, plugin)) return

    plugin.addIgnoredFile(folder.path)

    const data = {
        vault: plugin.settings.vault,
        path: folder.path,
        pathHash: hashContent(folder.path),
        oldPath: oldPath,
        oldPathHash: hashContent(oldPath),
    }
    plugin.folderHashManager.removeFolderHash(oldPath)
    plugin.folderHashManager.setFolderHash(folder.path, hashContent(folder.path))
    plugin.websocket.SendMessage("FolderRename", data)
    dump(`Folder rename send`, data.path, data.pathHash)

    plugin.removeIgnoredFile(folder.path)
}

/**
 * 接收服务端文件夹修改通知
 */
export const receiveFolderSyncModify = async function (data: any, plugin: FastSync) {
    if (plugin.settings.syncEnabled == false) return
    if (isPathExcluded(data.path, plugin)) return
    dump(`Receive folder modify:`, data.path, data.pathHash)

    const normalizedPath = normalizePath(data.path)
    plugin.addIgnoredFile(normalizedPath)

    const existingFolder = plugin.app.vault.getAbstractFileByPath(normalizedPath)
    if (!existingFolder) {
        await plugin.app.vault.createFolder(normalizedPath)
        plugin.folderHashManager.setFolderHash(normalizedPath, hashContent(normalizedPath))
        // 注意：Obsidian 文件夹不支持直接设置 stat.mtime/ctime，通常由系统管理
    }

    plugin.removeIgnoredFile(normalizedPath)
    plugin.folderSyncTasks.completed++
}

/**
 * 接收服务端文件夹删除通知
 */
export const receiveFolderSyncDelete = async function (data: any, plugin: FastSync) {
    if (plugin.settings.syncEnabled == false) return
    if (isPathExcluded(data.path, plugin)) return
    dump(`Receive folder delete:`, data.path, data.pathHash)

    const normalizedPath = normalizePath(data.path)
    const folder = plugin.app.vault.getAbstractFileByPath(normalizedPath)

    if (folder instanceof TFolder) {
        plugin.addIgnoredFile(normalizedPath)
        // 递归删除文件夹及其内容，或者只删除空文件夹？服务端通常是递归的。
        // Vault.delete(TAbstractFile, force)
        await plugin.app.vault.delete(folder, true)
        plugin.folderHashManager.removeFolderHash(normalizedPath)
        plugin.removeIgnoredFile(normalizedPath)
    }

    plugin.folderSyncTasks.completed++
}

/**
 * 接收服务端文件夹重命名通知
 */
export const receiveFolderSyncRename = async function (data: FolderSyncRenameMessage, plugin: FastSync) {
    if (plugin.settings.syncEnabled == false) return
    if (isPathExcluded(data.path, plugin)) return
    if (isPathExcluded(data.oldPath, plugin)) return

    dump(`Receive folder rename:`, data.oldPath, "->", data.path)

    const normalizedOldPath = normalizePath(data.oldPath)
    const normalizedNewPath = normalizePath(data.path)

    const folder = plugin.app.vault.getAbstractFileByPath(normalizedOldPath)
    if (folder instanceof TFolder) {
        plugin.addIgnoredFile(normalizedNewPath)
        plugin.addIgnoredFile(normalizedOldPath)

        const target = plugin.app.vault.getAbstractFileByPath(normalizedNewPath)
        if (target) {
            await plugin.app.vault.delete(target, true)
        }

        await plugin.app.vault.rename(folder, normalizedNewPath)
        plugin.folderHashManager.removeFolderHash(normalizedOldPath)
        plugin.folderHashManager.setFolderHash(normalizedNewPath, hashContent(normalizedNewPath))

        plugin.removeIgnoredFile(normalizedNewPath)
        plugin.removeIgnoredFile(normalizedOldPath)
    } else {
        // 如果本地找不到，可能需要创建新文件夹
        const target = plugin.app.vault.getAbstractFileByPath(normalizedNewPath)
        if (!target) {
            await plugin.app.vault.createFolder(normalizedNewPath)
            // 远端同步创建同样更新哈希表
            plugin.folderHashManager.setFolderHash(normalizedNewPath, hashContent(normalizedNewPath))
        }
    }

    plugin.folderSyncTasks.completed++
}

/**
 * 接收文件夹同步结束通知
 */
export const receiveFolderSyncEnd = async function (data: any, plugin: FastSync) {
    if (plugin.settings.syncEnabled == false) return
    dump(`Receive folder end:`, data)

    const syncData = data as SyncEndData
    plugin.localStorageManager.setMetadata("lastFolderSyncTime", syncData.lastTime)
    plugin.syncTypeCompleteCount++
}
