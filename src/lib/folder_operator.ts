import { TFolder, normalizePath } from "obsidian";

import { SyncEndData, FolderSyncRenameMessage } from "./types";
import { hashContent, dump, dumpError, isPathExcluded, waitForFolderEmpty, vaultDelete, checkAndNotifyCaseConflict } from "./helps";
import { SyncLogManager } from "./sync_log_manager";
import type FastSync from "../main";


/**
 * 文件夹修改/创建事件处理
 */
export const folderModify = async function (folder: TFolder, plugin: FastSync, eventEnter: boolean = false) {
    if (plugin.settings.syncEnabled == false || plugin.settings.readonlySyncEnabled) return
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
            void plugin.websocket.SendMessage("FolderModify", data, undefined, () => {
                plugin.folderSnapshotManager.setFolderMtime(folder.path, now)
            })
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
    if (plugin.settings.syncEnabled == false || plugin.settings.readonlySyncEnabled) return
    if (eventEnter && !plugin.getWatchEnabled()) return
    if (eventEnter && plugin.isIgnoredFile(folder.path)) return
    if (isPathExcluded(folder.path, plugin)) return

    // --- 新增：删除拦截 ---
    if (plugin.lastSyncPathDeleted.has(folder.path)) {
        dump(`Folder delete intercepted: ${folder.path}`)
        return
    }

    await plugin.lockManager.withLock(folder.path, async () => {
        plugin.addIgnoredFile(folder.path)
        try {
            const data = {
                vault: plugin.settings.vault,
                path: folder.path,
                pathHash: hashContent(folder.path),
            }
            void plugin.websocket.SendMessage("FolderDelete", data, undefined, () => {
                plugin.folderSnapshotManager.removeFolder(folder.path)
            })
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
    if (plugin.settings.syncEnabled == false || plugin.settings.readonlySyncEnabled) return
    if (eventEnter && !plugin.getWatchEnabled()) return
    if (eventEnter && plugin.isIgnoredFile(folder.path)) return
    if (isPathExcluded(folder.path, plugin)) return

    // --- 新增：重命名拦截 ---
    if (plugin.lastSyncPathRenamed.has(folder.path)) {
        dump(`Folder rename intercepted: ${folder.path}`)
        return
    }

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
            void plugin.websocket.SendMessage("FolderRename", data, undefined, () => {
                plugin.folderSnapshotManager.removeFolder(oldPath)
                plugin.folderSnapshotManager.setFolderMtime(folder.path, now)
            })
            dump(`Folder rename send`, data.path, data.pathHash)
        } finally {
            plugin.removeIgnoredFile(folder.path)
        }
    }, { maxRetries: 5, retryInterval: 50 });
}

/**
 * 接收服务端文件夹修改通知
 */
export const receiveFolderSyncModify = async function (data: { path: string, mtime?: number, lastTime?: number, pathHash?: string }, plugin: FastSync) {
    if (plugin.settings.syncEnabled == false) return
    if (isPathExcluded(data.path, plugin)) {
        plugin.folderSyncTasks.completed++
        return
    }
    dump(`Receive folder modify:`, data.path, data.pathHash)

    const normalizedPath = normalizePath(data.path)

    try {
        await plugin.lockManager.withLock(normalizedPath, async () => {
            plugin.addIgnoredFile(normalizedPath)
            try {
                const existingFolder = plugin.app.vault.getAbstractFileByPath(normalizedPath)
                if (!existingFolder) {
                    try {
                        await plugin.app.vault.createFolder(normalizedPath)
                    } catch (e) {
                        if (!checkAndNotifyCaseConflict(e, data.path, plugin, 'FolderModify')) {
                            // 文件夹可能因并发创建已存在（Linux 上会抛 "Folder already exists"），忽略此错误
                            // Folder may already exist due to concurrent creation (Linux throws "Folder already exists"), ignore
                            dump(`Folder create ignored (may already exist): ${normalizedPath}`, e)
                        }
                    }
                }
                plugin.folderSnapshotManager.setFolderMtime(normalizedPath, data.mtime || Date.now())
            } finally {
                window.setTimeout(() => {
                    plugin.removeIgnoredFile(normalizedPath)
                }, 500);
            }
        }, { maxRetries: 5, retryInterval: 100 });
    } catch (e) {
        dumpError(`[FastSync] Failed to receiveFolderSyncModify: ${normalizedPath}`, e);
        if (!checkAndNotifyCaseConflict(e, data.path, plugin, 'FolderModify')) {
            SyncLogManager.getInstance().addLog('receive', 'FolderModify', e instanceof Error ? e.message : String(e), 'error', data.path);
        }
    } finally {
        // 实时更新同步时间戳，与 note 端保持一致
        // Update sync timestamp in real time, consistent with note side
        if (data.lastTime && data.lastTime > Number(plugin.localStorageManager.getMetadata("lastFolderSyncTime"))) {
            plugin.localStorageManager.setMetadata("lastFolderSyncTime", data.lastTime)
        }
        plugin.folderSyncTasks.completed++
    }
}

/**
 * 接收服务端文件夹删除通知
 */
export const receiveFolderSyncDelete = async function (data: { path: string, lastTime?: number, pathHash?: string }, plugin: FastSync) {
    if (plugin.settings.syncEnabled == false) return
    if (isPathExcluded(data.path, plugin)) {
        plugin.folderSyncTasks.completed++
        return
    }
    dump(`Receive folder delete:`, data.path, data.pathHash)

    const normalizedPath = normalizePath(data.path)

    try {
        await plugin.lockManager.withLock(normalizedPath, async () => {
            const folder = plugin.app.vault.getAbstractFileByPath(normalizedPath)
            if (folder instanceof TFolder) {
                plugin.addIgnoredFile(normalizedPath)
                try {
                    // 必须检测并等到 目录里的所有文件数量 为 0 之后再执行
                    await waitForFolderEmpty(normalizedPath, plugin);
                    // 记录待删除路径
                    plugin.lastSyncPathDeleted.add(normalizedPath)
                    await vaultDelete(plugin.app.vault, folder, true)
                    plugin.folderSnapshotManager.removeFolder(normalizedPath)
                } finally {
                    window.setTimeout(() => {
                        plugin.removeIgnoredFile(normalizedPath)
                        plugin.lastSyncPathDeleted.delete(normalizedPath)
                    }, 500);
                }
            }
        }, { maxRetries: 10, retryInterval: 200 });
    } catch (e) {
        dumpError(`[FastSync] Failed to receiveFolderSyncDelete: ${normalizedPath}`, e);
        SyncLogManager.getInstance().addLog('receive', 'FolderDelete', e instanceof Error ? e.message : String(e), 'error', data.path);
    } finally {
        // 实时更新同步时间戳，与 note 端保持一致
        // Update sync timestamp in real time, consistent with note side
        if (data.lastTime && data.lastTime > Number(plugin.localStorageManager.getMetadata("lastFolderSyncTime"))) {
            plugin.localStorageManager.setMetadata("lastFolderSyncTime", data.lastTime)
        }
        plugin.folderSyncTasks.completed++
    }
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

    try {
        await plugin.lockManager.withLock(normalizedNewPath, async () => {
            const folder = plugin.app.vault.getAbstractFileByPath(normalizedOldPath)
            if (folder instanceof TFolder) {
                plugin.addIgnoredFile(normalizedNewPath)
                plugin.addIgnoredFile(normalizedOldPath)

                // 记录新路径
                plugin.lastSyncPathRenamed.add(normalizedNewPath)

                try {
                    const target = plugin.app.vault.getAbstractFileByPath(normalizedNewPath)
                    if (target) {
                        await vaultDelete(plugin.app.vault, target, true)
                    }

                    await plugin.app.vault.rename(folder, normalizedNewPath)
                    plugin.folderSnapshotManager.removeFolder(normalizedOldPath)
                    plugin.folderSnapshotManager.setFolderMtime(normalizedNewPath, data.mtime || Date.now())
                } finally {
                    window.setTimeout(() => {
                        plugin.removeIgnoredFile(normalizedNewPath)
                        plugin.removeIgnoredFile(normalizedOldPath)
                        plugin.lastSyncPathRenamed.delete(normalizedNewPath)
                    }, 500);
                }
            } else {
                const target = plugin.app.vault.getAbstractFileByPath(normalizedNewPath)
                if (!target) {
                    try {
                        await plugin.app.vault.createFolder(normalizedNewPath)
                    } catch (e) {
                        if (!checkAndNotifyCaseConflict(e, data.path, plugin, 'FolderRename')) {
                            dump(`Folder create ignored (may already exist): ${normalizedNewPath}`, e)
                        }
                    }
                    plugin.folderSnapshotManager.setFolderMtime(normalizedNewPath, data.mtime || Date.now())
                }
            }
        }, { maxRetries: 10, retryInterval: 100 });
    } catch (e) {
        dumpError(`[FastSync] Failed to receiveFolderSyncRename: ${normalizedOldPath} -> ${normalizedNewPath}`, e);
        if (!checkAndNotifyCaseConflict(e, data.path, plugin, 'FolderRename')) {
            SyncLogManager.getInstance().addLog('receive', 'FolderRename', e instanceof Error ? e.message : String(e), 'error', data.path);
        }
    } finally {
        // 实时更新同步时间戳，与 note 端保持一致
        // Update sync timestamp in real time, consistent with note side
        if (data.lastTime && data.lastTime > Number(plugin.localStorageManager.getMetadata("lastFolderSyncTime"))) {
            plugin.localStorageManager.setMetadata("lastFolderSyncTime", data.lastTime)
        }
        plugin.folderSyncTasks.completed++
    }
}

/**
 * 接收文件夹同步结束通知
 */
export const receiveFolderSyncEnd = async function (data: unknown, plugin: FastSync) {
    if (plugin.settings.syncEnabled == false) return
    dump(`Receive folder end:`, data)

    const syncData = data as SyncEndData
    // 更新任务统计信息，用于进度条计算 (Update task stats for progress bar)
    plugin.folderSyncTasks.needUpload = syncData.needUploadCount || 0
    plugin.folderSyncTasks.needModify = syncData.needModifyCount || 0
    plugin.folderSyncTasks.needSyncMtime = syncData.needSyncMtimeCount || 0
    plugin.folderSyncTasks.needDelete = syncData.needDeleteCount || 0

    // 无条件更新 lastFolderSyncTime，确保包含服务端本轮同步后的所有异步操作（如 SyncResourceFID）
    // Unconditionally update lastFolderSyncTime to cover all async server-side ops after this sync round (e.g., SyncResourceFID)
    plugin.localStorageManager.setMetadata("lastFolderSyncTime", syncData.lastTime)
    plugin.syncTypeCompleteCount++
}
