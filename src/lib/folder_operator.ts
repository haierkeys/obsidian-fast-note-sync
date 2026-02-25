import { TFolder, normalizePath } from "obsidian";

import { ReceiveMessage, ReceiveMtimeMessage, ReceivePathMessage, SyncEndData, FolderSyncRenameMessage } from "./types";
import { hashContent, dump, isPathExcluded, waitForFolderEmpty } from "./helps";
import type FastSync from "../main";


/**
 * 文件夹修改/创建事件处理
 */
export const folderModify = async function (folder: TFolder, plugin: FastSync, eventEnter: boolean = false) {
    if (plugin.settings.syncEnabled == false) return
    if (eventEnter && !plugin.getWatchEnabled()) return
    if (eventEnter && plugin.isIgnoredFile(folder.path)) return
    if (isPathExcluded(folder.path, plugin)) return

    await plugin.lockManager.withLock(folder.path, async () => {
        plugin.addIgnoredFile(folder.path)
        try {
            const now = Date.now();
            const data = {
                vault: plugin.settings.vault,
                path: folder.path,
                pathHash: hashContent(folder.path),
            }
            plugin.folderSnapshotManager.setFolderMtime(folder.path, now)
            plugin.websocket.SendMessage("FolderModify", data)
            dump(`Folder modify send`, data.path, data.pathHash)
        } finally {
            plugin.removeIgnoredFile(folder.path)
        }
    }, { maxRetries: 3, retryInterval: 50 });
}

/**
 * 文件夹删除事件处理
 */
export const folderDelete = async function (folder: TFolder, plugin: FastSync, eventEnter: boolean = false) {
    if (plugin.settings.syncEnabled == false) return
    if (eventEnter && !plugin.getWatchEnabled()) return
    if (eventEnter && plugin.isIgnoredFile(folder.path)) return
    if (isPathExcluded(folder.path, plugin)) return

    await plugin.lockManager.withLock(folder.path, async () => {
        plugin.addIgnoredFile(folder.path)
        try {
            const data = {
                vault: plugin.settings.vault,
                path: folder.path,
                pathHash: hashContent(folder.path),
            }
            plugin.folderSnapshotManager.removeFolder(folder.path)
            plugin.websocket.SendMessage("FolderDelete", data)
            dump(`Folder delete send`, folder.path)
        } finally {
            plugin.removeIgnoredFile(folder.path)
        }
    }, { maxRetries: 3, retryInterval: 50 });
}

/**
 * 文件夹重命名事件处理
 */
export const folderRename = async function (folder: TFolder, oldPath: string, plugin: FastSync, eventEnter: boolean = false) {
    if (plugin.settings.syncEnabled == false) return
    if (eventEnter && !plugin.getWatchEnabled()) return
    if (eventEnter && plugin.isIgnoredFile(folder.path)) return
    if (isPathExcluded(folder.path, plugin)) return

    await plugin.lockManager.withLock(folder.path, async () => {
        plugin.addIgnoredFile(folder.path)
        try {
            const now = Date.now();
            const data = {
                vault: plugin.settings.vault,
                path: folder.path,
                pathHash: hashContent(folder.path),
                oldPath: oldPath,
                oldPathHash: hashContent(oldPath),
            }
            plugin.folderSnapshotManager.removeFolder(oldPath)
            plugin.folderSnapshotManager.setFolderMtime(folder.path, now)
            plugin.websocket.SendMessage("FolderRename", data)
            dump(`Folder rename send`, data.path, data.pathHash)
        } finally {
            plugin.removeIgnoredFile(folder.path)
        }
    }, { maxRetries: 5, retryInterval: 50 });
}

/**
 * 接收服务端文件夹修改通知
 */
export const receiveFolderSyncModify = async function (data: any, plugin: FastSync) {
    if (plugin.settings.syncEnabled == false) return
    if (isPathExcluded(data.path, plugin)) {
        plugin.folderSyncTasks.completed++
        return
    }
    dump(`Receive folder modify:`, data.path, data.pathHash)

    const normalizedPath = normalizePath(data.path)

    await plugin.lockManager.withLock(normalizedPath, async () => {
        plugin.addIgnoredFile(normalizedPath)
        try {
            const existingFolder = plugin.app.vault.getAbstractFileByPath(normalizedPath)
            if (!existingFolder) {
                await plugin.app.vault.createFolder(normalizedPath)
            }
            plugin.folderSnapshotManager.setFolderMtime(normalizedPath, data.mtime || Date.now())
        } finally {
            plugin.removeIgnoredFile(normalizedPath)
        }
    }, { maxRetries: 5, retryInterval: 100 });

    plugin.folderSyncTasks.completed++
}

/**
 * 接收服务端文件夹删除通知
 */
export const receiveFolderSyncDelete = async function (data: any, plugin: FastSync) {
    if (plugin.settings.syncEnabled == false) return
    if (isPathExcluded(data.path, plugin)) {
        plugin.folderSyncTasks.completed++
        return
    }
    dump(`Receive folder delete:`, data.path, data.pathHash)

    const normalizedPath = normalizePath(data.path)

    await plugin.lockManager.withLock(normalizedPath, async () => {
        const folder = plugin.app.vault.getAbstractFileByPath(normalizedPath)
        if (folder instanceof TFolder) {
            plugin.addIgnoredFile(normalizedPath)
            try {
                // 必须检测并等到 目录里的所有文件数量 为 0 之后再执行
                await waitForFolderEmpty(normalizedPath, plugin);
                await plugin.app.vault.delete(folder, true)
                plugin.folderSnapshotManager.removeFolder(normalizedPath)
            } finally {
                plugin.removeIgnoredFile(normalizedPath)
            }
        }
    }, { maxRetries: 10, retryInterval: 200 });

    plugin.folderSyncTasks.completed++
}

/**
 * 接收服务端文件夹重命名通知
 */
export const receiveFolderSyncRename = async function (data: FolderSyncRenameMessage, plugin: FastSync) {
    if (plugin.settings.syncEnabled == false) return
    if (isPathExcluded(data.path, plugin) || isPathExcluded(data.oldPath, plugin)) {
        plugin.folderSyncTasks.completed++
        return
    }

    dump(`Receive folder rename:`, data.oldPath, "->", data.path)

    const normalizedOldPath = normalizePath(data.oldPath)
    const normalizedNewPath = normalizePath(data.path)

    await plugin.lockManager.withLock(normalizedNewPath, async () => {
        const folder = plugin.app.vault.getAbstractFileByPath(normalizedOldPath)
        if (folder instanceof TFolder) {
            plugin.addIgnoredFile(normalizedNewPath)
            plugin.addIgnoredFile(normalizedOldPath)

            try {
                const target = plugin.app.vault.getAbstractFileByPath(normalizedNewPath)
                if (target) {
                    await plugin.app.vault.delete(target, true)
                }

                await plugin.app.vault.rename(folder, normalizedNewPath)
                plugin.folderSnapshotManager.removeFolder(normalizedOldPath)
                plugin.folderSnapshotManager.setFolderMtime(normalizedNewPath, data.mtime || Date.now())
            } finally {
                plugin.removeIgnoredFile(normalizedNewPath)
                plugin.removeIgnoredFile(normalizedOldPath)
            }
        } else {
            const target = plugin.app.vault.getAbstractFileByPath(normalizedNewPath)
            if (!target) {
                await plugin.app.vault.createFolder(normalizedNewPath)
                plugin.folderSnapshotManager.setFolderMtime(normalizedNewPath, data.mtime || Date.now())
            }
        }
    }, { maxRetries: 10, retryInterval: 100 });

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
