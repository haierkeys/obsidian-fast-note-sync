import { TFolder, TFile, normalizePath } from "obsidian";

import { receiveFileUpload, receiveFileSyncUpdate, receiveFileSyncDelete, receiveFileSyncMtime, receiveFileSyncChunkDownload, receiveFileSyncEnd, checkAndUploadAttachments, receiveFileSyncRename, receiveFileRenameAck, receiveFileUploadAck, receiveFileDeleteAck, isPluginUnloading } from "./operator_file";
import { hashContent, hashContentAsync, dump, isPathExcluded, isFolderSyncPathExcluded, configIsPathExcluded, getConfigSyncCustomDirs, generateUUID, showSyncNotice, isLargeBinarySyncRisk, describeBinarySyncLimit, hashFileAsync, formatFileSize, yieldToMain } from "../utils/helpers";
import { receiveConfigSyncModify, receiveConfigUpload, receiveConfigSyncMtime, receiveConfigSyncDelete, receiveConfigSyncEnd, configAllPaths, receiveConfigSyncClear, receiveConfigModifyAck, receiveConfigDeleteAck } from "./operator_config";
import { receiveNoteSyncModify, receiveNoteUpload, receiveNoteSyncMtime, receiveNoteSyncDelete, receiveNoteSyncEnd, receiveNoteSyncRename, receiveNoteModifyAck, receiveNoteRenameAck, receiveNoteDeleteAck } from "./operator_note";
import { SyncMode, SnapFile, SnapFolder, SyncEndData, PathHashFile, NoteSyncData, FileSyncData, ConfigSyncData, FolderSyncData } from "../utils/types";
import { receiveFolderSyncModify, receiveFolderSyncDelete, receiveFolderSyncRename, receiveFolderSyncEnd } from "./operator_folder";
import { FileCloudPreview } from "../storage/file_cloud_preview";
import { SyncLogManager } from "./sync_log_manager";
import * as WSAction from "./websocket_action";
import type FastSync from "../../main";
import { $ } from "../../i18n/lang";
import { SyncType } from "./sync_progress_tracker";
import { ConfirmModal } from "../../views/confirm-modal";

// C9: 离线超墓碑期保护 — 默认与服务端 soft-delete-retention-time 默认值对应（90 天），
// 先硬编码常量；服务端墓碑物理清除窗口过后，长期离线设备重连若检测到"本地有服务端无"的
// 待上传文件，可能是已被服务端物理清除的删除墓碑被误判为本地新增而复活，需用户确认
// C9: Offline tombstone-retention guard — hardcoded default aligned with the server's
// soft-delete-retention-time default (90 days). After the server physically purges tombstones,
// a long-offline device reconnecting may misidentify already-deleted files (server-side purged)
// as "local-only new files" and revive them; require user confirmation before uploading.
const OFFLINE_TOMBSTONE_GUARD_MS = 90 * 24 * 60 * 60 * 1000;

function isOfflineTombstoneGuardDue(plugin: FastSync): boolean {
  const lastSuccess = Number(plugin.localStorageManager.getMetadata("lastSyncSuccessTime"));
  // 从无成功同步记录（首次使用）不触发 / Never synced successfully before (first use): do not trigger
  if (!lastSuccess) return false;
  return Date.now() - lastSuccess > OFFLINE_TOMBSTONE_GUARD_MS;
}

function confirmOfflineTombstoneUpload(plugin: FastSync, uploadCount: number): Promise<boolean> {
  return new Promise((resolve) => {
    new ConfirmModal(
      plugin.app,
      $("ui.offline_guard.title"),
      $("ui.offline_guard.message", { count: String(uploadCount) }),
      () => resolve(true),
      $("ui.offline_guard.confirm"),
      $("ui.button.cancel"),
      true,
      () => resolve(false)
    ).open();
  });
}


export const startupSync = (plugin: FastSync): void => {
  void handleSync(plugin, plugin.localStorageManager.getMetadata("isInitSync") as boolean);
};
export const startupFullSync = async (plugin: FastSync) => {
  void handleSync(plugin, false);
};

export const resetSettingSyncTime = async (plugin: FastSync, silent = false) => {
  plugin.localStorageManager.clearSyncTime();
  if (!silent) {
    showSyncNotice($("setting.debug.clear_time_success"));
  }
};

export const rebuildAllHashes = async (plugin: FastSync) => {
  await plugin.fileHashManager.rebuildHashMap();
  await plugin.configHashManager.rebuildHashMap();
};

export const clearAllHashes = async (plugin: FastSync) => {
  plugin.fileHashManager.clearAll();
  plugin.configHashManager.clearAll();
};



/**
 * 检查同步是否完成
 */
export function checkSyncCompletion(plugin: FastSync, intervalId?: number, syncStartTime?: number, ownerContext?: string) {
  // 会话归属守卫：本轮检测所属的 context 已被新会话取代，说明是旧会话的迟到定时器
  // （例如断线重连后旧会话的 BatchAck 超时才姗姗来迟），此时只清理自己的 interval，
  // 不再触碰任何共享同步状态，避免把新会话的进度/上下文误清掉
  // Ownership guard: if this check's context has been superseded by a newer sync
  // session (e.g. a stale timer from an old session after reconnect), only clean up
  // its own interval and leave shared sync state untouched to avoid clobbering the new session.
  if (ownerContext && plugin.syncState.activeSyncContext !== ownerContext) {
    if (intervalId) {
      window.clearInterval(intervalId);
      if (plugin.syncState.progressCheckIntervalId === intervalId) {
        plugin.syncState.progressCheckIntervalId = null;
      }
    }
    return;
  }
  // 超时保底：调大为 300s 以支持超大库（多批次）的分批同步，防止误判超时终止
  // Safety timeout: increased to 300s to support large vaults with many batches, preventing false timeout termination
  const SYNC_TIMEOUT_MS = 300000;
  if (syncStartTime && Date.now() - syncStartTime > SYNC_TIMEOUT_MS) {
    if (intervalId) {
      window.clearInterval(intervalId);
      if (plugin.syncState.progressCheckIntervalId === intervalId) {
        plugin.syncState.progressCheckIntervalId = null;
      }
    }
    dump(`Sync completion timeout after ${SYNC_TIMEOUT_MS}ms. Tasks: note=${JSON.stringify(plugin.noteSyncTasks)}, file=${JSON.stringify(plugin.fileSyncTasks)}, folder=${JSON.stringify(plugin.folderSyncTasks)}, config=${JSON.stringify(plugin.configSyncTasks)}`)
    plugin.syncState.activeSyncContext = null; // 同步超时，清空活跃的上下文 / Sync timeout, reset the active context
    plugin.syncTypeCompleteCount = 0;
    plugin.resetSyncTasks();
    plugin.syncPageStateMap.clear(); // 清空残留的页状态 / Clear stale page state map
    plugin.totalFilesToDownload = 0;
    plugin.downloadedFilesCount = 0;
    plugin.totalChunksToDownload = 0;
    plugin.downloadedChunksCount = 0;
    plugin.totalChunksToUpload = 0;
    plugin.uploadedChunksCount = 0;
    plugin.progressTracker.forceComplete();
    // 超时保底不代表真正完成：仍有下载会话未结束时，如实提示"部分未完成"，而非静默上报成功
    // A safety timeout does not mean genuine completion: if download sessions are still pending,
    // surface "partially incomplete" instead of silently reporting success
    if (plugin.fileDownloadSessions.size > 0) {
      dump(`Sync completion timeout with ${plugin.fileDownloadSessions.size} unfinished file download session(s), reporting partial completion.`);
      plugin.updateStatusBar($("ui.status.timeout_partial"));
    } else {
      plugin.updateStatusBar($("ui.status.completed"));
    }
    window.setTimeout(() => plugin.updateStatusBar(""), 10000);
    return;
  }

  const ws = plugin.websocket.ws;
  const bufferedAmount = ws && ws.readyState === WebSocket.OPEN ? ws.bufferedAmount : 0;

  // 模块进度的完成判定：使用新版基于 SyncPage 的 isTypeFullyDone 进行精确判断
  const noteSyncDone = plugin.progressTracker.isTypeFullyDone('note');
  const fileSyncDone = plugin.progressTracker.isTypeFullyDone('file');
  const configSyncDone = plugin.progressTracker.isTypeFullyDone('setting');
  const folderSyncDone = plugin.progressTracker.isTypeFullyDone('folder');

  const allSyncDone = (!plugin.settings.syncEnabled || (noteSyncDone && folderSyncDone && fileSyncDone)) &&
    (!plugin.settings.configSyncEnabled || configSyncDone);

  const allDownloadsComplete = plugin.fileDownloadSessions.size === 0;
  const bufferCleared = bufferedAmount === 0;

  // 计算整体权重进度
  const overallPercentage = plugin.progressTracker.getOverallPct();

  if (allSyncDone && allDownloadsComplete && bufferCleared && !plugin.isSyncRequesting) {
    if (intervalId) {
      window.clearInterval(intervalId);
      if (plugin.syncState.progressCheckIntervalId === intervalId) {
        plugin.syncState.progressCheckIntervalId = null;
      }
    }

    // 收集本轮同步的统计数据并生成小结日志
    // Collect stats of the current sync round and generate summary log
    const syncType = plugin.syncState.currentSyncType;
    const noteStats = {
      upload: plugin.noteSyncTasks.needUpload,
      modify: plugin.noteSyncTasks.needModify + plugin.noteSyncTasks.needSyncMtime,
      delete: plugin.noteSyncTasks.needDelete
    };
    const fileStats = {
      upload: plugin.fileSyncTasks.needUpload,
      modify: plugin.fileSyncTasks.needModify + plugin.fileSyncTasks.needSyncMtime,
      delete: plugin.fileSyncTasks.needDelete
    };
    const configStats = {
      upload: plugin.configSyncTasks.needUpload,
      modify: plugin.configSyncTasks.needModify + plugin.configSyncTasks.needSyncMtime,
      delete: plugin.configSyncTasks.needDelete
    };

    const hasChanges = (
      Object.values(noteStats).some(v => v > 0) ||
      Object.values(fileStats).some(v => v > 0) ||
      Object.values(configStats).some(v => v > 0)
    );

    // 汇总本轮写盘失败数：completed 仍然是"已处理数量"（成功+失败），驱动完成判定不变；
    // failed 是单独计数的失败子集，仅用于向用户如实展示"完成但有 N 项失败"，避免误报全部成功
    // Total write failures this round: completed still means "processed count" (success+failure)
    // and keeps driving completion detection unchanged; failed is a separate failure subset used
    // only to honestly surface "completed with N failures" instead of falsely reporting full success
    const totalFailed = plugin.noteSyncTasks.failed + plugin.fileSyncTasks.failed
      + plugin.configSyncTasks.failed + plugin.folderSyncTasks.failed;

    const summaryMessage = JSON.stringify({
      syncType,
      hasChanges,
      note: noteStats,
      file: fileStats,
      config: configStats,
      failed: totalFailed
    });

    SyncLogManager.getInstance().addOrUpdateLog({
      id: `summary-${Date.now()}`,
      type: 'info',
      action: 'SyncSummary',
      status: 'success',
      message: summaryMessage,
      timestamp: Date.now()
    });

    plugin.syncState.activeSyncContext = null; // 同步完成，清空活跃的上下文 / Sync completed, reset the active context
    plugin.syncTypeCompleteCount = 0;
    plugin.resetSyncTasks();
    plugin.syncPageStateMap.clear(); // 同步完成，清空残留的页状态 / Sync completed, clear page state map
    plugin.totalFilesToDownload = 0;
    plugin.downloadedFilesCount = 0;
    plugin.totalChunksToDownload = 0;
    plugin.downloadedChunksCount = 0;
    plugin.totalChunksToUpload = 0;
    plugin.uploadedChunksCount = 0;

    plugin.progressTracker.forceComplete();

    const completionText = totalFailed > 0
      ? $("ui.status.completed_with_failures", { count: String(totalFailed) })
      : $("ui.status.completed");
    if (plugin.settings.isShowNotice) {
      showSyncNotice(completionText);
    }
    plugin.updateStatusBar(completionText);

    if (plugin.expectedSyncCount > 0 && !plugin.localStorageManager.getMetadata("isInitSync")) {
      plugin.localStorageManager.setMetadata("isInitSync", true);
    }

    // C9: 记录每次同步成功完成的时间戳，供离线超墓碑期保护判断本机离线时长
    // C9: record the timestamp of every successful sync completion, used by the offline
    // tombstone-retention guard to judge how long this device has been offline
    plugin.localStorageManager.setMetadata("lastSyncSuccessTime", Date.now());

    // 如果开启了云预览，在首次同步后检查所有附件在服务端的状态
    if (plugin.settings.cloudPreviewEnabled) {
      void checkAndUploadAttachments(plugin);
    }

    // 同步完成后刷新分享指示器状态
    // Refresh share indicator state after sync completion
    void plugin.shareIndicatorManager?.syncWithServer();

    window.setTimeout(() => plugin.updateStatusBar(""), 10000);
  } else {
    // --- 强制完成逻辑与 90% 补偿 ---
    let statusText = $("ui.status.syncing");
    if (bufferedAmount > 0) {
      const bufferMB = (bufferedAmount / 1024 / 1024).toFixed(2);
      statusText = `${$("ui.status.syncing")} (缓冲区: ${bufferMB}MB)`;
    }

    const detailText = plugin.progressTracker.getDetailText();
    const finalStatusText = detailText ? `${statusText} · ${detailText}` : statusText;

    plugin.updateStatusBar(finalStatusText, overallPercentage, 100);
  }
}
/**
 * 消息接收调度
 */

export type OperatorHandler = (data: unknown, plugin: FastSync) => Promise<void> | void;
export const receiveOperators: Map<WSAction.WSReceiveAction, OperatorHandler> = new Map([
  [WSAction.NoteSyncModify, receiveNoteSyncModify],
  [WSAction.NoteSyncNeedPush, receiveNoteUpload],
  [WSAction.NoteSyncMtime, receiveNoteSyncMtime],
  [WSAction.NoteSyncDelete, receiveNoteSyncDelete],
  [WSAction.NoteSyncRename, receiveNoteSyncRename],
  [WSAction.NoteModifyAck, (data, plugin) => receiveNoteModifyAck(data as { lastTime?: number; path?: string }, plugin)],
  [WSAction.NoteRenameAck, (data, plugin) => receiveNoteRenameAck(data as { lastTime?: number; path?: string }, plugin)],
  [WSAction.NoteDeleteAck, (data, plugin) => receiveNoteDeleteAck(data as { lastTime?: number; path?: string }, plugin)],
  [WSAction.NoteSyncEnd, (data, plugin) => receiveSyncEndWrapper(data, plugin, "note")],
  [WSAction.FileUpload, receiveFileUpload],
  [WSAction.FileSyncUpdate, receiveFileSyncUpdate],
  [WSAction.FileSyncChunkDownload, receiveFileSyncChunkDownload],
  [WSAction.FileSyncDelete, receiveFileSyncDelete],
  [WSAction.FileSyncRename, receiveFileSyncRename],
  [WSAction.FileSyncMtime, receiveFileSyncMtime],
  [WSAction.FileSyncEnd, (data, plugin) => receiveSyncEndWrapper(data, plugin, "file")],
  [WSAction.FileRenameAck, receiveFileRenameAck],
  [WSAction.FileUploadAck, receiveFileUploadAck],
  [WSAction.FileDeleteAck, (data, plugin) => receiveFileDeleteAck(data as { lastTime?: number; path?: string }, plugin)],
  [WSAction.SettingSyncModify, receiveConfigSyncModify],
  [WSAction.SettingSyncNeedUpload, receiveConfigUpload],
  [WSAction.SettingSyncMtime, receiveConfigSyncMtime],
  [WSAction.SettingSyncDelete, receiveConfigSyncDelete],
  [WSAction.SettingSyncEnd, (data, plugin) => receiveSyncEndWrapper(data, plugin, "config")],
  [WSAction.SettingSyncClear, receiveConfigSyncClear],
  [WSAction.SettingModifyAck, receiveConfigModifyAck],
  [WSAction.SettingDeleteAck, receiveConfigDeleteAck],
  [WSAction.FolderSyncModify, receiveFolderSyncModify],
  [WSAction.FolderSyncDelete, receiveFolderSyncDelete],
  [WSAction.FolderSyncRename, receiveFolderSyncRename],
  [WSAction.FolderSyncEnd, (data, plugin) => receiveSyncEndWrapper(data, plugin, "folder")],
  // --- 分批同步确认 BatchAck handlers ---
  // Each handler emits the event on the websocket bus so sendInBatches can unblock the await.
  [WSAction.NoteSyncBatchAck, (data, plugin) => { plugin.websocket.emit("NoteSyncBatchAck", data); }],
  [WSAction.FileSyncBatchAck, (data, plugin) => { plugin.websocket.emit("FileSyncBatchAck", data); }],
  [WSAction.SettingSyncBatchAck, (data, plugin) => { plugin.websocket.emit("SettingSyncBatchAck", data); }],
  [WSAction.FolderSyncBatchAck, (data, plugin) => { plugin.websocket.emit("FolderSyncBatchAck", data); }],
  [WSAction.ShareSyncRefresh, receiveShareSyncRefresh],
  [WSAction.FolderSyncPage, (data, plugin) => handleSyncPage(data, plugin, "folder")],
  [WSAction.NoteSyncPage, (data, plugin) => handleSyncPage(data, plugin, "note")],
  [WSAction.FileSyncPage, (data, plugin) => handleSyncPage(data, plugin, "file")],
  [WSAction.SettingSyncPage, (data, plugin) => handleSyncPage(data, plugin, "setting")],
] as [WSAction.WSReceiveAction, OperatorHandler][]);

/**
 * 统一处理分页控制消息
 */
async function handleSyncPage(data: unknown, plugin: FastSync, type: "note" | "file" | "setting" | "folder"): Promise<void> {
  const pageMsg = data as {
    pageIndex: number;
    pageSize: number;
    totalCount: number;
    isLast: boolean;
    context: string;
  };

  dump(`[PageSync] Received page info for ${type}, pageIndex: ${pageMsg.pageIndex}, totalCount: ${pageMsg.totalCount}, isLast: ${pageMsg.isLast}, context: ${pageMsg.context}`);

  // 通知进度追踪器
  plugin.progressTracker.recordPageProgress(type, pageMsg.pageIndex, pageMsg.totalCount, pageMsg.isLast);

  // 登记当前下载分页状态 (Register page metadata)
  plugin.syncPageStateMap.set(type, {
    pageIndex: pageMsg.pageIndex,
    pageSize: pageMsg.pageSize,
    totalCount: pageMsg.totalCount,
    isLast: pageMsg.isLast,
    completedCount: 0,
    context: pageMsg.context
  });

  if (pageMsg.totalCount === 0) {
    dump(`[PageSync] Page ${pageMsg.pageIndex} for ${type} is empty. Sending ACK immediately.`);
    // 如果是最后一页，无需发送确认 ACK (已由服务端主动销毁缓存)
    // If it's the last page, no need to send confirmation ACK (cache cleared by server)
    if (pageMsg.isLast) {
      dump(`[PageSync] Page ${pageMsg.pageIndex} for ${type} is the last page and empty. Skipping ACK.`);
    } else if (plugin.syncState.pipelineWindowDown > 0) {
      // 新旧路径选路点：协商下行窗口 W_down>0 时可能有多页在途，空页也要遵守 ack 水位线顺序，
      // 不能无条件立即发（可能因为前面的页还没完成而应暂缓）——交给 pages Map 水位线机制判定
      // Route selection point: with a negotiated download window W_down>0, multiple pages may be
      // in flight, so even an empty page must respect ack-watermark ordering (may need to hold
      // back if an earlier page isn't done yet) — defer to the pages-Map watermark mechanism
      plugin.progressTracker.tryAckEmptyPage(type, pageMsg.pageIndex);
    } else {
      // W_down==0（旧服务端未协商 / 回滚开关）：同一时刻只有一页在途，立即触发与现状完全一致
      // W_down==0 (pre-negotiation server / rollback switch): only one page is ever in flight at a
      // time, so firing immediately is exactly equivalent to the current behavior
      plugin.progressTracker.onPageComplete?.(type, pageMsg.pageIndex);
    }
    return;
  }
}

/**
 * 收到分享状态变更通知，全量刷新分享路径
 * Received share state change notification, full refresh share paths
 */
function receiveShareSyncRefresh(_data: unknown, plugin: FastSync): void {
  dump("Receive ShareSyncRefresh, triggering share indicator sync");
  void plugin.shareIndicatorManager?.syncWithServer();
}

/**
 * 统一处理 SyncEnd 消息的装饰器
 */
async function receiveSyncEndWrapper(data: unknown, plugin: FastSync, type: "note" | "file" | "config" | "folder") {
  const syncData = data as SyncEndData;
  dump(`Receive ${type} sync end (wrapper):`, syncData.context, syncData);

  // SyncEnd 隐式全 ack（设计稿 §3.2）：本类型上行批发送若仍有窗口会话存活（W>0 时可能仍有在途 timer），
  // 视为全部批已确认，清空 timer 并结束会话；W==0/旧路径下没有会话注册，no-op
  const batchAckEventByType: Record<"note" | "file" | "config" | "folder", string> = {
    note: "NoteSyncBatchAck",
    file: "FileSyncBatchAck",
    config: "SettingSyncBatchAck",
    folder: "FolderSyncBatchAck",
  };
  settleBatchSendSessionOnSyncEnd(batchAckEventByType[type]);

  // 1. 基础任务计数解析
  const tasks = type === "note" ? plugin.noteSyncTasks : type === "file" ? plugin.fileSyncTasks : type === "config" ? plugin.configSyncTasks : plugin.folderSyncTasks;
  tasks.needUpload = syncData.needUploadCount || 0;
  tasks.needModify = syncData.needModifyCount || 0;
  tasks.needSyncMtime = syncData.needSyncMtimeCount || 0;
  tasks.needDelete = syncData.needDeleteCount || 0;

  // C9: 离线超墓碑期保护 — 本类型即将上传"本地有服务端无"的文件，且本机已长期离线超过墓碑
  // 保留期，先弹窗确认；取消则本轮跳过该类型同步（上传/修改/删除/时间戳一并推迟到下次），
  // 其余同步类型（笔记/文件互不影响，文件夹/配置独立同步）不受影响正常继续
  // C9: Offline tombstone-retention guard — this type is about to upload "local-only" files and
  // the device has been offline past the tombstone retention window; confirm first. Cancelling
  // skips this type's sync round entirely (upload/modify/delete/mtime all deferred to next round);
  // other sync types are unaffected and proceed normally.
  let offlineGuardSkipped = false;
  if ((type === "note" || type === "file") && tasks.needUpload > 0 && isOfflineTombstoneGuardDue(plugin)) {
    const proceed = await confirmOfflineTombstoneUpload(plugin, tasks.needUpload);
    if (!proceed) {
      offlineGuardSkipped = true;
      tasks.needUpload = 0;
      tasks.needModify = 0;
      tasks.needSyncMtime = 0;
      tasks.needDelete = 0;
    }
  }

  const trueTotal = tasks.needUpload + tasks.needModify + tasks.needSyncMtime + tasks.needDelete;
  const trackerType: SyncType = type === "config" ? "setting" : type;
  plugin.progressTracker.setDownloadTotal(trackerType, trueTotal, plugin.syncState.syncDownChunkNum);
  plugin.progressTracker.recordUploadComplete(trackerType, tasks.completed);

  // 1.1 注意：v1.1 协议中 End 消息不再携带 messages 列表。
  // 排除项的处理将依赖于后端是否推送相关通知。

  // 2. SyncEnd 到达说明服务端已处理本轮同步（含删除），将 pending 删除路径从 hashManager 移除
  // SyncEnd means server processed this sync round (including deletes); remove pending delete paths from hashManager
  if (type === "note") {
    plugin.fileHashManager.removeFileHashes(plugin.pendingDeleteNotePaths)
    plugin.pendingDeleteNotePaths.clear()
    // 同步结束，提交本轮同步中可能产生的待确认上传 hash
    plugin.fileHashManager.setFileHashes(plugin.pendingNoteModifies, (path) => plugin.app.vault.getFileByPath(path)?.stat)
    plugin.pendingNoteModifies.clear()
    plugin.localStorageManager.clearPending('pendingNoteModifies')
    // 同步结束，提交扫描阶段计算出的哈希 (Commit hashes calculated during scan)
    if (plugin.scannedNoteHashes.size > 0) {
      plugin.fileHashManager.bulkSetFromScanned(plugin.scannedNoteHashes);
      plugin.scannedNoteHashes.clear();
    }
    // 同步结束，强制落盘本轮防抖累积的哈希写入
    plugin.fileHashManager.flush();
  } else if (type === "file") {
    plugin.fileHashManager.removeFileHashes(plugin.pendingDeleteFilePaths)
    plugin.pendingDeleteFilePaths.clear()
    // 同步结束，提交本轮同步中可能产生的待确认上传 hash
    plugin.fileHashManager.setFileHashes(plugin.pendingUploadHashes, (path) => plugin.app.vault.getFileByPath(path)?.stat)
    plugin.pendingUploadHashes.clear()
    plugin.localStorageManager.clearPending('pendingUploadHashes')
    // 同步结束，提交扫描阶段计算出的哈希 (Commit hashes calculated during scan)
    if (plugin.scannedFileHashes.size > 0) {
      plugin.fileHashManager.bulkSetFromScanned(plugin.scannedFileHashes);
      plugin.scannedFileHashes.clear();
    }
    // 同步结束，强制落盘本轮防抖累积的哈希写入
    plugin.fileHashManager.flush();
  } else if (type === "folder") {
    plugin.folderSnapshotManager.removeFolders(plugin.pendingDeleteFolderPaths);
    plugin.pendingDeleteFolderPaths.clear()
    // 同步结束，强制落盘本轮防抖累积的快照写入
    plugin.folderSnapshotManager.flush();
  } else if (type === "config") {
    if (plugin.configHashManager && plugin.configHashManager.isReady()) {
      plugin.configHashManager.removeFileHashes(plugin.pendingDeleteConfigPaths)
      // 同步结束，提交本轮同步中可能产生的待确认上传 hash
      await plugin.configHashManager.setFileHashes(plugin.pendingConfigModifies, async (path) => {
        const isVirtual = path.startsWith(plugin.localStorageManager.syncPathPrefix)
        if (isVirtual) return { mtime: Date.now(), size: plugin.localStorageManager.getItemValue(plugin.localStorageManager.pathToKey(path) || "")?.length || 0 }
        try {
          return await plugin.app.vault.adapter.stat(normalizePath(path))
        } catch {
          return null
        }
      })
    }
    plugin.pendingDeleteConfigPaths.clear()
    plugin.pendingConfigModifies.clear()
    plugin.localStorageManager.clearPending('pendingConfigModifies')
    // 同步结束，提交扫描阶段计算出的哈希 (Commit hashes calculated during scan)
    if (plugin.scannedConfigHashes.size > 0) {
      plugin.configHashManager.bulkSetFromScanned(plugin.scannedConfigHashes);
      plugin.scannedConfigHashes.clear();
    }
    // 同步结束，强制落盘本轮防抖累积的哈希写入
    plugin.configHashManager.flush();
  }

  //dddd

  // 3. 调用原始 End 处理函数 (更新时间戳等)
  if (type === "note") {
    await receiveNoteSyncEnd(data, plugin);
    plugin.noteSyncEnd = true;
  } else if (type === "file") {
    await receiveFileSyncEnd(data, plugin);
    plugin.fileSyncEnd = true;
  } else if (type === "config") {
    await receiveConfigSyncEnd(data, plugin);
    plugin.configSyncEnd = true;
  } else if (type === "folder") {
    await receiveFolderSyncEnd(data, plugin);
    plugin.folderSyncEnd = true;
  }

  // 原始 End 处理函数会从原始 syncData 无条件重置 needUpload 等统计字段（用于展示进度条），
  // 离线守护取消后需要再次清零，避免同步小结日志误报"仍有 N 项待上传"
  // The original End handler unconditionally resets needUpload/etc. stats from raw syncData
  // (for progress display); re-zero them after an offline-guard cancellation so the sync summary
  // log doesn't falsely report "N items still pending upload"
  if (offlineGuardSkipped) {
    tasks.needUpload = 0;
    tasks.needModify = 0;
    tasks.needSyncMtime = 0;
    tasks.needDelete = 0;
  }

  // 4. 针对已就绪的本模块，如果存在服务端待下载任务，且尚未发送过首拉，则立即触发首拉 Ack 信号
  // 4. For the ready module, if there are pending tasks to download and initial ACK is not sent, trigger it immediately
  const taskTotal = plugin.progressTracker.getTypeTaskTotal(trackerType);
  if (taskTotal > 0 && !plugin.progressTracker.isInitialAckSent(trackerType)) {
    dump(`[Sync] Triggering initial ACK for type: ${trackerType}, total tasks: ${taskTotal}`);
    plugin.progressTracker.setInitialAckSent(trackerType, true);
    plugin.sendSyncPageAck(trackerType, -1);
  } else {
    dump(`[Sync] Skipping initial ACK for type: ${trackerType} because total tasks is 0 or initial ACK already sent`);
  }
}

/**
 * 统一分发子任务消息
 */



/**
 * 启动全量/增量同步
 */
export const handleSync = async function (plugin: FastSync, isLoadLastTime: boolean = true, syncMode: SyncMode = "auto") {
  if (plugin.isSyncing) {
    dump("Sync already in progress, skipping");
    return;
  }
  plugin.isSyncing = true;
  // 提到 try 外部，使 catch/finally 也能引用本次会话的 context 做归属判断
  // Hoisted outside try so catch/finally can reference this session's context for ownership checks
  let context = "";
  try {
    context = generateUUID();
    plugin.syncState.activeSyncContext = context; // 记录活跃的同步上下文 / Record the active sync context
    dump(`Sync context generated: ${context}`);
    if (!plugin.menuManager.ribbonIconStatus) {
      // WebSocket 处于断开/退避状态，立即触发重连，连接成功后自动执行同步
      // WebSocket is disconnected/in backoff, trigger immediate reconnect and auto-sync on connect
      plugin.syncState.pendingSyncType = isLoadLastTime ? 'incremental' : 'full';
      plugin.websocket.triggerReconnect();
      showSyncNotice($("ui.menu.reconnecting"));
      plugin.syncState.activeSyncContext = null; // 早期退出，清空上下文 / Early return, reset the context
      return;
    }

    if (plugin.settings.readonlySyncEnabled) {
      dump("Read-only mode: Proceeding with state gathering for remote-to-local sync.");
    }

    plugin.currentSyncType = isLoadLastTime ? 'incremental' : 'full';
    plugin.syncTypeCompleteCount = 0;
    plugin.resetSyncTasks();

    const shouldSyncNotes = syncMode === "auto" || syncMode === "note";
    const shouldSyncConfigs = syncMode === "auto" || syncMode === "config";

    const activeTypes: SyncType[] = [];
    if (plugin.settings.syncEnabled && shouldSyncNotes) {
      activeTypes.push('note', 'folder');
      if (!plugin.settings.cloudPreviewEnabled || plugin.settings.cloudPreviewTypeRestricted) {
        activeTypes.push('file');
      }
    }
    if (plugin.settings.configSyncEnabled && shouldSyncConfigs) {
      activeTypes.push('setting');
    }
    plugin.progressTracker.reset(activeTypes);
    plugin.syncPageStateMap.clear(); // 开始新一轮同步，清空上一轮的页状态残留，防 Context 错乱 / Start new sync, clear stale page states
    plugin.totalFilesToDownload = 0;
    plugin.downloadedFilesCount = 0;
    plugin.totalChunksToDownload = 0;
    plugin.downloadedChunksCount = 0;
    plugin.totalChunksToUpload = 0;
    plugin.uploadedChunksCount = 0;
    // 清空上一次连接的未完成 rename 队列，由 hashManager 旧路径进 delFiles 自然处理
    // Clear pending renames from previous connection; old paths in hashManager will naturally go into delFiles
    plugin.pendingFileRenames = []
    // 清空上一次连接的未完成笔记 rename 队列，由 hashManager 旧路径进 delNotes 自然处理
    // Clear pending note renames from previous connection; old paths in hashManager will naturally go into delNotes
    plugin.pendingNoteRenames = new Map()
    // 清空 pending 删除路径集合，避免旧 of pending 条目干扰本次同步
    // Clear pending delete path sets to avoid stale entries interfering with this sync
    plugin.pendingDeleteNotePaths.clear()
    plugin.pendingDeleteFilePaths.clear()
    plugin.pendingDeleteFolderPaths.clear()
    plugin.pendingDeleteConfigPaths.clear()
    // 重连时清空 pending Ack 集合；路径保留在 hashManager，将自然进入 delNotes
    // On reconnect clear pending Ack sets; paths remain in hashManager and flow into delNotes naturally
    plugin.pendingNoteDeleteAcks.clear()
    plugin.pendingFileDeleteAcks.clear()
    plugin.pendingConfigDeleteAcks.clear()
    // 清空上一轮 NeedPush→Ack 页归属查找表（C3，见 sync_state.ts 注释），避免残留条目误归账到新一轮的页
    // Clear the previous round's NeedPush->Ack page-attribution lookup maps (C3, see sync_state.ts
    // comment), preventing stale entries from misattributing completions in the new round
    plugin.syncState.pendingNotePushPageIndex.clear()
    plugin.syncState.pendingFilePushPageIndex.clear()
    plugin.syncState.pendingConfigPushPageIndex.clear()
    // 注意：不清空 pendingConfigModifies，与 pendingNoteModifies 对齐——
    // 该集合记录扫描期间用户本地新改动的配置路径，需保留到扫描阶段用于跳过判断，
    // 由 receiveSyncEndWrapper (config SyncEnd) 或 cancelSync 负责清空
    // Note: do NOT clear pendingConfigModifies here, mirroring pendingNoteModifies —
    // it tracks configs locally modified since last scan and must survive into the
    // scan filter below; cleared by receiveSyncEndWrapper (config SyncEnd) or cancelSync

    let expectedCount = 0;
    if (plugin.settings.syncEnabled && shouldSyncNotes) {
      expectedCount += 1; // NoteSync
      expectedCount += 1; // FolderSync
      if (!plugin.settings.cloudPreviewEnabled || plugin.settings.cloudPreviewTypeRestricted) {
        expectedCount += 1; // FileSync
      }
    }
    if (plugin.settings.configSyncEnabled && shouldSyncConfigs) expectedCount += 1;
    plugin.expectedSyncCount = expectedCount;
    if (expectedCount === 0) {
      plugin.updateStatusBar("");
      plugin.syncState.activeSyncContext = null; // 无同步任务，清空上下文 / No tasks, reset the context
      return;
    }

    if (plugin.settings.isShowNotice && (plugin.settings.syncEnabled || plugin.settings.configSyncEnabled)) {
      showSyncNotice($("ui.status.starting"));
    }
    plugin.updateStatusBar($("ui.status.syncing"), 0, 1);

    // --- 新增：初始化哈希扫描日志 ---
    const hashingLogId = `hashing-${context}`;
    if (plugin.settings.syncEnabled || plugin.settings.configSyncEnabled) {
      SyncLogManager.getInstance().addOrUpdateLog({
        id: hashingLogId,
        type: 'info',
        action: `VaultScanning_${plugin.currentSyncType}`,
        status: 'pending',
        progress: 0,
        message: plugin.currentSyncType === 'full' ? '正在进行全量哈希计算...' : '正在进行增量哈希计算...'
      });
    }

    const notes: SnapFile[] = [], files: SnapFile[] = [], configs: SnapFile[] = [], folders: SnapFolder[] = [];
    const delNotes: PathHashFile[] = [], delFiles: PathHashFile[] = [], delConfigs: PathHashFile[] = [], delFolders: PathHashFile[] = [];
    const missingNotes: PathHashFile[] = [], missingFiles: PathHashFile[] = [], missingConfigs: PathHashFile[] = [], missingFolders: PathHashFile[] = [];

    // 预先标记未参与本次同步的模块为已结束，避免 checkSyncCompletion 永远等待它们
    // Pre-mark modules not participating in this sync as ended to prevent checkSyncCompletion from waiting forever
    if (!(plugin.settings.syncEnabled && shouldSyncNotes)) {
      plugin.noteSyncEnd = true;
      plugin.fileSyncEnd = true;
      plugin.folderSyncEnd = true;
    } else if (plugin.settings.cloudPreviewEnabled && !plugin.settings.cloudPreviewTypeRestricted) {
      plugin.fileSyncEnd = true;
    }
    if (!(plugin.settings.configSyncEnabled && shouldSyncConfigs)) {
      plugin.configSyncEnd = true;
    }

    if (plugin.settings.syncEnabled && shouldSyncNotes) {
      const list = plugin.app.vault.getAllLoadedFiles();
      let processedCount = 0;
      const totalFiles = list.length;
      // 简单预估配置数量，用于合并进度条
      const estimatedConfigCount = plugin.settings.configSyncEnabled ? 100 : 0;
      const totalToProcess = totalFiles + estimatedConfigCount;

      // --- PERF: Limit hash computations per sync cycle ---
      // Prevents V8 heap exhaustion on first full scan of large vaults.
      const MAX_HASH_PER_CYCLE = plugin.settings.hashSyncLimitEnabled !== false ? (plugin.settings.hashSyncLimit ?? 20000) : Infinity;
      let hashComputeCount = 0;

      // --- PERF: bounded concurrency for cache-miss hash computation ---
      // 哈希缓存未命中的文件原先完全串行 read+hash，大库首次/全量扫描时很慢；
      // 改为有限并发（6 路）：结果 push 顺序对 notes/files 数组无影响（下游按 path 分批处理），
      // hashComputeCount 的自增仍在主循环同步完成，MAX_HASH_PER_CYCLE 预算不受并发影响。
      // Cache-miss read+hash used to run fully serially, which is slow on large vaults' first/full
      // scan; switched to bounded concurrency (6-way). Result push order doesn't matter (downstream
      // batches by path). hashComputeCount is still incremented synchronously in the main loop, so
      // the MAX_HASH_PER_CYCLE budget is unaffected by concurrency.
      const MAX_CONCURRENT_HASH = 6;
      const hashInFlight = new Set<Promise<void>>();
      const scheduleHashTask = async (task: () => Promise<void>) => {
        let p: Promise<void>;
        p = task().finally(() => hashInFlight.delete(p));
        hashInFlight.add(p);
        if (hashInFlight.size >= MAX_CONCURRENT_HASH) {
          await Promise.race(hashInFlight);
        }
      };

      for (const file of list) {
        if (++processedCount % 20 === 0) {
          await yieldToMain();
          if (isPluginUnloading) {
            plugin.syncState.activeSyncContext = null;
            return;
          }
          const pct = Math.floor((processedCount / totalToProcess) * 100);
          plugin.progressTracker.recordHashProgress(pct);
          if (processedCount % 100 === 0) {
            SyncLogManager.getInstance().addOrUpdateLog({
              id: hashingLogId,
              type: 'info',
              action: `VaultScanning_${plugin.currentSyncType}`,
              status: 'pending',
              progress: pct,
              message: `${plugin.currentSyncType === 'full' ? '🔍 正在全量扫描' : '🔍 正在增量扫描'}... (${processedCount}/${totalFiles})`
            });
          }
        }

        try {
          if (file instanceof TFolder) {
            if (file.path === "/") continue;
            if (isFolderSyncPathExcluded(file.path, plugin)) continue;
            let mtime = plugin.folderSnapshotManager.getMtime(file.path) || Date.now();
            if (isLoadLastTime && mtime < Number(plugin.localStorageManager.getMetadata("lastFolderSyncTime")) && plugin.folderSnapshotManager.getMtime(file.path) !== undefined) continue;
            folders.push({
              path: file.path,
              pathHash: hashContent(file.path),
            });
            continue;
          }

          if (file instanceof TFile) {
            if (isPathExcluded(file.path, plugin)) continue;
            if (file.extension === "md") {
              if (isLoadLastTime
                && file.stat.mtime < Number(plugin.localStorageManager.getMetadata("lastNoteSyncTime"))
                && plugin.fileHashManager.getPathHash(file.path) !== null
                && !plugin.pendingNoteModifies.has(file.path)) continue;

              // Skip excessively large .md files (>noteSyncLimit MB)
              const noteLimit = (plugin.settings.noteSyncLimit ?? 20) * 1024 * 1024;
              if (file.stat.size > noteLimit) continue;

              const cachedNoteHash = plugin.fileHashManager.getValidHash(file.path, file.stat.mtime, file.stat.size);
              if (cachedNoteHash !== null) {
                const baseHash = plugin.fileHashManager.getPathHash(file.path);
                notes.push({
                  path: file.path,
                  pathHash: hashContent(file.path),
                  contentHash: cachedNoteHash,
                  mtime: file.stat.mtime,
                  ctime: file.stat.ctime,
                  size: file.stat.size,
                  ...(baseHash !== null ? { baseHash } : { baseHashMissing: true }),
                });
              } else {
                if (hashComputeCount >= MAX_HASH_PER_CYCLE) continue;
                hashComputeCount++;
                const notePath = file.path, noteMtime = file.stat.mtime, noteCtime = file.stat.ctime, noteSize = file.stat.size;
                await scheduleHashTask(async () => {
                  try {
                    const contentHash = await Promise.race([
                      hashContentAsync(await plugin.app.vault.read(file)),
                      new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error(`Hash timeout`)), 15000))
                    ]);
                    plugin.scannedNoteHashes.set(notePath, { hash: contentHash, mtime: noteMtime, size: noteSize });
                    const baseHash = plugin.fileHashManager.getPathHash(notePath);
                    notes.push({
                      path: notePath,
                      pathHash: hashContent(notePath),
                      contentHash: contentHash,
                      mtime: noteMtime,
                      ctime: noteCtime,
                      size: noteSize,
                      ...(baseHash !== null ? { baseHash } : { baseHashMissing: true }),
                    });
                  } catch {
                    // 哈希失败或超时，跳过该文件，不计入本轮同步 / Skip file on hash failure or timeout
                  }
                });
              }
            } else {
              if (isLargeBinarySyncRisk(file.stat.size, plugin)) continue;
              const attachmentLimit = (plugin.settings.attachmentSyncLimit ?? 50) * 1024 * 1024;
              if (file.stat.size > attachmentLimit) continue;
              const skipSync = plugin.settings.cloudPreviewEnabled && (!plugin.settings.cloudPreviewTypeRestricted || FileCloudPreview.isRestrictedType("." + file.extension));
              if (skipSync) continue;

              if (isLoadLastTime
                && file.stat.mtime < Number(plugin.localStorageManager.getMetadata("lastFileSyncTime"))
                && plugin.fileHashManager.getPathHash(file.path) !== null
                && !plugin.pendingUploadHashes.has(file.path)) continue;

              const cachedFileHash = plugin.fileHashManager.getValidHash(file.path, file.stat.mtime, file.stat.size);
              if (cachedFileHash !== null) {
                const baseHash = plugin.fileHashManager.getPathHash(file.path);
                files.push({
                  path: file.path,
                  pathHash: hashContent(file.path),
                  contentHash: cachedFileHash,
                  mtime: file.stat.mtime,
                  ctime: file.stat.ctime,
                  size: file.stat.size,
                  ...(baseHash !== null ? { baseHash } : { baseHashMissing: true }),
                });
              } else {
                if (hashComputeCount >= MAX_HASH_PER_CYCLE) continue;
                hashComputeCount++;
                const attPath = file.path, attMtime = file.stat.mtime, attCtime = file.stat.ctime, attSize = file.stat.size;
                await scheduleHashTask(async () => {
                  try {
                    const contentHash = await Promise.race([
                      hashFileAsync(plugin.app, attPath),
                      new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error(`Hash timeout`)), 15000))
                    ]);
                    plugin.scannedFileHashes.set(attPath, { hash: contentHash, mtime: attMtime, size: attSize });
                    const baseHash = plugin.fileHashManager.getPathHash(attPath);
                    files.push({
                      path: attPath,
                      pathHash: hashContent(attPath),
                      contentHash: contentHash,
                      mtime: attMtime,
                      ctime: attCtime,
                      size: attSize,
                      ...(baseHash !== null ? { baseHash } : { baseHashMissing: true }),
                    });
                  } catch {
                    // 哈希失败或超时，跳过该文件，不计入本轮同步 / Skip file on hash failure or timeout
                  }
                });
              }
            }
          }
        } catch {
          continue;
        }
      }

      // 等待所有并发哈希任务收尾，确保后续的落盘/统计基于完整结果
      // Drain remaining in-flight concurrent hash tasks before persisting/reporting stats
      if (hashInFlight.size > 0) {
        await Promise.all(Array.from(hashInFlight));
      }

      // Persist any newly computed hashes (breaks the Catch-22)
      if (plugin.scannedNoteHashes.size > 0) {
        plugin.fileHashManager.bulkSetFromScanned(plugin.scannedNoteHashes);
        plugin.scannedNoteHashes.clear();
      }
      if (plugin.scannedFileHashes.size > 0) {
        plugin.fileHashManager.bulkSetFromScanned(plugin.scannedFileHashes);
        plugin.scannedFileHashes.clear();
      }
      dump(`[ScanPerf] Scan done: ${hashComputeCount}/${MAX_HASH_PER_CYCLE} hashes computed, notes=${notes.length}, files=${files.length}, folders=${folders.length}`);

      // 检测被删除的文件 (对比哈希表和本地 Vault)
      if (plugin.settings.offlineDeleteSyncEnabled) {
        const trackedPaths = plugin.fileHashManager.getAllPaths();
        const localPathsSet = new Set(list.map(f => f.path)); // 优化：使用 Set 提高查找效率
        let delCount = 0;
        for (const path of trackedPaths) {
          if (++delCount % 100 === 0) await yieldToMain();
          if (isPathExcluded(path, plugin)) continue;
          if (!localPathsSet.has(path)) {
            const item = { path: path, pathHash: hashContent(path) };
            if (path.endsWith(".md")) {
              delNotes.push(item);
            } else {
              delFiles.push(item);
            }
          }
        }

        // 检测被删除的文件夹
        if (plugin.folderSnapshotManager && plugin.folderSnapshotManager.isReady()) {
          const trackedFolderPaths = plugin.folderSnapshotManager.getAllPaths();
          const localFolderPathsSet = new Set(list.filter(f => f instanceof TFolder).map(f => f.path));
          let folderCount = 0;
          for (const path of trackedFolderPaths) {
            if (++folderCount % 100 === 0) await yieldToMain();
            if (isFolderSyncPathExcluded(path, plugin)) continue;
            if (!localFolderPathsSet.has(path)) {
              delFolders.push({ path: path, pathHash: hashContent(path) });
            }
          }
        }
      } else if (isLoadLastTime) {
        // 增量同步且未开启离线删除同步：检测缺失的文件（哈希表中有但本地不存在）
        const trackedPaths = plugin.fileHashManager.getAllPaths();
        const localPathsSet = new Set(list.map(f => f.path));
        let missingCount = 0;
        for (const path of trackedPaths) {
          if (++missingCount % 100 === 0) await yieldToMain();
          if (isPathExcluded(path, plugin)) continue;
          if (!localPathsSet.has(path)) {
            const item = { path: path, pathHash: hashContent(path) };
            if (path.endsWith(".md")) {
              missingNotes.push(item);
            } else {
              missingFiles.push(item);
            }
          }
        }

        // 检测缺失的文件夹
        if (plugin.folderSnapshotManager && plugin.folderSnapshotManager.isReady()) {
          const trackedFolderPaths = plugin.folderSnapshotManager.getAllPaths();
          const localFolderPathsSet = new Set(list.filter(f => f instanceof TFolder).map(f => f.path));
          let folderCount = 0;
          for (const path of trackedFolderPaths) {
            if (++folderCount % 100 === 0) await yieldToMain();
            if (isFolderSyncPathExcluded(path, plugin)) continue;
            if (!localFolderPathsSet.has(path)) {
              missingFolders.push({ path: path, pathHash: hashContent(path) });
            }
          }
        }
      }
    }

    const configDirs = [plugin.app.vault.configDir, ...getConfigSyncCustomDirs(plugin)]
    const configPaths = plugin.settings.configSyncEnabled && shouldSyncConfigs ? await configAllPaths(configDirs, plugin) : [];

    let configCount = 0;
    const totalConfigs = configPaths.length;
    // 获取已处理的基础文件数，用于连续进度条
    const baseProcessedCount = plugin.settings.syncEnabled ? plugin.app.vault.getAllLoadedFiles().length : 0;
    const overallTotal = baseProcessedCount + totalConfigs;

    for (const path of configPaths) {
      if (++configCount % 20 === 0) { // 已将 50 优化为 20
        await sleep(0);
        if (isPluginUnloading) {
          plugin.syncState.activeSyncContext = null; // 插件卸载中，清空上下文 / Plugin unloading, reset the context
          return;
        }
        const pct = overallTotal > 0 ? Math.floor(((baseProcessedCount + configCount) / overallTotal) * 100) : 100;
        plugin.progressTracker.recordHashProgress(pct);
        SyncLogManager.getInstance().addOrUpdateLog({
          id: hashingLogId,
          type: 'info',
          action: `VaultScanning_${plugin.currentSyncType}`,
          status: 'pending',
          progress: pct,
          message: `${plugin.currentSyncType === 'full' ? '⚙️ 正在全量扫描配置' : '⚙️ 正在增量扫描配置'}... (${configCount}/${totalConfigs})`
        });
      }

      try {
        if (configIsPathExcluded(path, plugin)) continue;
        const fullPath = normalizePath(path);
        const stat = await plugin.app.vault.adapter.stat(fullPath);
        if (!stat) continue;
        if (isLargeBinarySyncRisk(stat.size, plugin)) {
          dump(`Skip scanning large config file (${describeBinarySyncLimit(plugin)} limit): ${path}`, stat.size);
          continue;
        }
        if (isLoadLastTime
          && stat.mtime < Number(plugin.localStorageManager.getMetadata("lastConfigSyncTime"))
          && !plugin.pendingConfigModifies.has(path)) continue;

        // 处理大配置文件时更新消息
        if (stat.size > 2 * 1024 * 1024) {
          SyncLogManager.getInstance().addOrUpdateLog({
            id: hashingLogId,
            type: 'info',
            action: `VaultScanning_${plugin.currentSyncType}`,
            message: `⚙️ 正在哈希配置: ${path.split('/').pop()} (${formatFileSize(stat.size)})`
          });
        }

        // 尝试从缓存获取有效的哈希 (Try to get valid hash from cache)
        let contentHash = plugin.configHashManager.getValidHash(path, stat.mtime, stat.size);
        if (contentHash === null) {
          try {
            contentHash = await hashFileAsync(plugin.app, path);
            // 暂存哈希，待同步结束时统一存入 (Temporarily store hash, commit on sync end)
            plugin.scannedConfigHashes.set(path, { hash: contentHash, mtime: stat.mtime, size: stat.size });
            // 注意：hashFileAsync 内部已经带了 [Calc] 类型的 dump
          } catch (e) {
            console.warn(`[FastNoteSync] 哈希配置失败，跳过: ${path}`, e);
            continue;
          }
        } else {
          dump(`[HashConfig] [Cache] path=${path} size=${formatFileSize(stat.size)} hash=${contentHash}`)
        }

        configs.push({
          path: path,
          pathHash: hashContent(path),
          contentHash: contentHash,
          mtime: stat.mtime,
          ctime: stat.ctime,
          size: stat.size
        });
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        console.warn(`[FastNoteSync] 跳过异常配置文件 ${path}: ${errorMsg}`);
        dump(`Error processing config file ${path}:`, e);
      }
    }

    // 加入 LocalStorage 同步项
    if (plugin.settings.configSyncEnabled && shouldSyncConfigs) {
      const storageConfigs = await plugin.localStorageManager.getStorageConfigs();
      for (const sc of storageConfigs) {
        configs.push(sc);
      }
    }

    // 检测被删除的配置文件 (对比哈希表和本地配置)
    if (plugin.settings.configSyncEnabled && shouldSyncConfigs && plugin.settings.offlineDeleteSyncEnabled) {
      if (plugin.configHashManager && plugin.configHashManager.isReady()) {
        const trackedConfigPaths = plugin.configHashManager.getAllPaths();
        const localConfigPathsSet = new Set(configPaths);

        // 添加 LocalStorage 虚拟路径
        const storageConfigs = await plugin.localStorageManager.getStorageConfigs();
        for (const sc of storageConfigs) {
          localConfigPathsSet.add(sc.path);
        }

        for (const path of trackedConfigPaths) {
          if (configIsPathExcluded(path, plugin)) continue;
          if (!localConfigPathsSet.has(path)) {
            delConfigs.push({ path: path, pathHash: hashContent(path) });
          }
        }
      }
    } else if (plugin.settings.configSyncEnabled && shouldSyncConfigs && isLoadLastTime) {
      // 增量同步且未开启离线删除同步：检测缺失的配置文件
      if (plugin.configHashManager && plugin.configHashManager.isReady()) {
        const trackedConfigPaths = plugin.configHashManager.getAllPaths();
        const localConfigPathsSet = new Set(configPaths);

        // 添加 LocalStorage 虚拟路径
        const storageConfigs = await plugin.localStorageManager.getStorageConfigs();
        for (const sc of storageConfigs) {
          localConfigPathsSet.add(sc.path);
        }

        for (const path of trackedConfigPaths) {
          if (configIsPathExcluded(path, plugin)) continue;
          if (!localConfigPathsSet.has(path)) {
            missingConfigs.push({ path: path, pathHash: hashContent(path) });
          }
        }
      }
    }

    let fileTime = 0, noteTime = 0, configTime = 0, folderTime = 0;
    if (isLoadLastTime) {
      fileTime = Number(plugin.localStorageManager.getMetadata("lastFileSyncTime"));
      noteTime = Number(plugin.localStorageManager.getMetadata("lastNoteSyncTime"));
      configTime = Number(plugin.localStorageManager.getMetadata("lastConfigSyncTime"));
      folderTime = Number(plugin.localStorageManager.getMetadata("lastFolderSyncTime"));
    }

    // 分批发送方案替代原截断方案：不再对 sync 数组截断，所有数据通过 sendInBatches 分批发送
    // Replaced truncation with batch-send: arrays are no longer capped; sendInBatches handles chunking
    dump(`[Sync] Arrays ready: notes=${notes.length}, files=${files.length}, folders=${folders.length}, configs=${configs.length}`);

    const noteData: NoteSyncData = { lastTime: noteTime, notes, delNotes, missingNotes };
    const fileData: FileSyncData = { lastTime: fileTime, files, delFiles, missingFiles };
    const configData: ConfigSyncData = { lastTime: configTime, configs, delConfigs, missingConfigs };
    const folderData: FolderSyncData = { lastTime: folderTime, folders, delFolders, missingFolders };

    noteData.context = context;
    fileData.context = context;
    configData.context = context;
    folderData.context = context;

    // --- 结束哈希扫描日志 ---
    if (plugin.settings.syncEnabled || plugin.settings.configSyncEnabled) {
      SyncLogManager.getInstance().addOrUpdateLog({
        id: hashingLogId,
        type: 'info',
        action: `VaultScanning_${plugin.currentSyncType}`,
        status: 'success',
        progress: 100,
        message: `✅ ${plugin.currentSyncType === 'full' ? '全量' : '增量'}扫描完成 | 笔记: ${notes.length} | 附件: ${files.length} | 配置: ${configs.length} | 文件夹: ${folders.length}`
      });
    }

    plugin.progressTracker.recordHashProgress(100);

    // Yield to let the 100% progress message render before entering WebSocket send phase
    await sleep(0);

    // 设置发起请求状态位，防止 checkSyncCompletion 过早判定结束 (Set requesting flag to prevent premature completion detection)
    plugin.isSyncRequesting = true;

    try {
      await handleRequestSend(plugin, syncMode, noteData, fileData, configData, folderData);
    } finally {
      plugin.isSyncRequesting = false;
    }

    // 启动进度检测循环,每 100ms 检测一次(更频繁以获得更平滑的进度更新)
    // 同时记录开始时间，用于超时保底
    const syncStartTime = Date.now();
    const progressCheckInterval = window.setInterval(() => {
      checkSyncCompletion(plugin, progressCheckInterval, syncStartTime, context);
    }, 100);
    plugin.syncState.progressCheckIntervalId = progressCheckInterval;
  } catch (error) {
    dump("Sync failed with error: " + error);
    // 归属判断：只有当前活跃上下文仍是本次会话时才清空/重置，防止旧会话的迟到异常
    // （例如断线重连后旧会话 BatchAck 15s 超时才抛出）把已经在跑的新会话状态清掉
    // Ownership guard: only clear/reset when the active context still belongs to this
    // invocation, so a late exception from a superseded (stale) sync session cannot
    // clobber a newer session that has already taken over.
    if (plugin.syncState.activeSyncContext === context) {
      plugin.syncState.activeSyncContext = null; // 同步失败，清空上下文 / Sync failed, reset the context
      plugin.updateStatusBar($("ui.status.failed") || "Sync Failed");
      window.setTimeout(() => plugin.updateStatusBar(""), 3000);
    } else {
      dump(`[SyncContext] Stale sync session (context=${context}) failed after being superseded; skip clobbering active state.`);
    }
  } finally {
    // 同上：仅当自己仍是活跃会话（或已无活跃会话）时才重置 isSyncing，
    // 避免旧会话迟到的 finally 打断已经在跑的新会话
    // Same guard: only reset isSyncing when this invocation still owns the active
    // session (or no session is active), so a stale session cannot interrupt a running new one.
    if (plugin.syncState.activeSyncContext === context || plugin.syncState.activeSyncContext === null) {
      plugin.isSyncing = false;
    }
  }
};

/**
 * 取消当前正在进行的同步，并重置所有运行时状态。
 * Cancel the current sync and reset all runtime states.
 */
export function cancelSync(plugin: FastSync): void {
  if (plugin.syncState.progressCheckIntervalId !== null) {
    window.clearInterval(plugin.syncState.progressCheckIntervalId);
    plugin.syncState.progressCheckIntervalId = null;
  }

  plugin.syncState.activeSyncContext = null;
  plugin.syncTypeCompleteCount = 0;
  plugin.resetSyncTasks();
  plugin.syncPageStateMap.clear();
  plugin.totalFilesToDownload = 0;
  plugin.downloadedFilesCount = 0;
  plugin.totalChunksToDownload = 0;
  plugin.downloadedChunksCount = 0;
  plugin.totalChunksToUpload = 0;
  plugin.uploadedChunksCount = 0;

  // 清理待确认与重命名队列 / Clear pending queues and renames
  plugin.pendingFileRenames = [];
  plugin.pendingNoteRenames = new Map();
  plugin.pendingDeleteNotePaths.clear();
  plugin.pendingDeleteFilePaths.clear();
  plugin.pendingDeleteFolderPaths.clear();
  plugin.pendingDeleteConfigPaths.clear();
  plugin.pendingNoteDeleteAcks.clear();
  plugin.pendingFileDeleteAcks.clear();
  plugin.pendingConfigDeleteAcks.clear();
  plugin.syncState.pendingNotePushPageIndex.clear();
  plugin.syncState.pendingFilePushPageIndex.clear();
  plugin.syncState.pendingConfigPushPageIndex.clear();
  plugin.pendingConfigModifies.clear();
  plugin.localStorageManager.clearPending('pendingConfigModifies');
  plugin.pendingNoteModifies.clear();
  plugin.localStorageManager.clearPending('pendingNoteModifies');
  plugin.pendingUploadHashes.clear();
  plugin.localStorageManager.clearPending('pendingUploadHashes');

  plugin.progressTracker.forceComplete();
  plugin.updateStatusBar($("ui.status.cancelled") || "Sync Cancelled");
  window.setTimeout(() => plugin.updateStatusBar(""), 3000);

  // 记录一条“同步取消”的小结日志，供同步日志视图渲染卡片 / Record a "Sync Cancelled" summary log for rendering in the Sync Log View
  const syncType = plugin.syncState.currentSyncType;
  const summaryMessage = JSON.stringify({
    syncType,
    hasChanges: false
  });

  SyncLogManager.getInstance().addOrUpdateLog({
    id: `summary-${Date.now()}`,
    type: 'info',
    action: 'SyncSummary',
    status: 'cancelled',
    message: summaryMessage,
    timestamp: Date.now()
  });

  // 确保重置同步状态标志 / Ensure sync state flag is reset
  plugin.isSyncing = false;

  dump("Sync cancelled by user");
}


/**
 * [保留] 原 stop-and-wait 逐批发送实现，一字未改。
 * W==0（旧服务端未协商 / 后台配置窗口=0 回滚开关）或 totalBatches<=1 快速路径时，
 * sendSyncInBatches 分发到这里，行为与 2.2.x 现状完全一致。
 *
 * [Preserved] Original stop-and-wait per-batch send implementation, unchanged.
 * sendSyncInBatches dispatches here when W==0 (pre-negotiation server, or the runtime
 * window=0 rollback switch) or the totalBatches<=1 fast path — behavior identical to 2.2.x.
 */
async function sendSyncInBatchesLegacy<T1, T2, T3>(
  plugin: FastSync,
  action: string,
  batchAckEvent: string,
  context: string | undefined,
  mainItems: T1[],
  delItems: T2[],
  missingItems: T3[],
  buildPayload: (
    mainChunk: T1[],
    delChunk: T2[],
    missingChunk: T3[],
    batchIndex: number,
    totalBatches: number
  ) => Record<string, unknown>,
  onLastBatchAcked?: () => void,
  syncUpChunkNum = plugin.syncState.syncUpChunkNum
): Promise<void> {
  const maxLen = Math.max(mainItems.length, delItems.length, missingItems.length);
  const totalBatches = Math.max(1, Math.ceil(maxLen / syncUpChunkNum));

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const start = batchIndex * syncUpChunkNum;
    const end = start + syncUpChunkNum;

    const mainChunk = mainItems.slice(start, end);
    const delChunk = delItems.slice(start, end);
    const missingChunk = missingItems.slice(start, end);

    const isLast = batchIndex === totalBatches - 1;
    const payload = buildPayload(mainChunk, delChunk, missingChunk, batchIndex, totalBatches);

    if (!isLast) {
      // 非最后批：发送并阻塞等待服务端 BatchAck，超时则抛出异常
      // Non-final batch: send and await server BatchAck; throw on timeout
      await new Promise<void>((resolve, reject) => {
        const ackHandler = (data: unknown) => {
          const d = data as { context?: string; batchIndex?: number };
          if (d.context === context && d.batchIndex === batchIndex) {
            plugin.websocket.off(batchAckEvent, ackHandler);
            resolve();
          }
        };
        plugin.websocket.on(batchAckEvent, ackHandler);
        void plugin.websocket.SendMessage(action, payload);

        window.setTimeout(() => {
          plugin.websocket.off(batchAckEvent, ackHandler);
          reject(new Error(`[BatchSync] ${action} batch ${batchIndex}/${totalBatches} ack timeout (15s)`));
        }, 15000);
      });
    } else {
      // 最后批：发送后调用回调，交由原有 SyncEnd 流程完成
      // Final batch: send then invoke callback; existing SyncEnd flow handles completion
      void plugin.websocket.SendMessage(action, payload, undefined, () => {
        onLastBatchAcked?.();
      });
    }
  }
}

/**
 * 单个上行批发送会话的滑动窗口状态机（设计稿 §3.2）。
 * nextToSend/inFlight(Map)/acked(Set) 三态；重传 timer 在 SendMessage 真正写入 socket 后启动，
 * 10s 超时 × 最多 3 次重传；SyncEnd 到达视为全部批隐式 ack（settleFromSyncEnd）；
 * 连接断开由 websocket_manager onClose 现有清理处统一调用 settleFromClose 清空 timer。
 *
 * Sliding-window state machine for a single upload batch-send session (design §3.2).
 * nextToSend/inFlight(Map)/acked(Set); retransmit timer starts only after SendMessage actually
 * writes to the socket; 10s timeout x up to 3 retries; SyncEnd implies all-batches-acked
 * (settleFromSyncEnd); connection close is handled by websocket_manager's existing onClose cleanup
 * calling settleFromClose to clear all pending timers.
 */
class BatchSendSession {
  private nextToSend = 0;
  private readonly inFlight = new Map<number, { payload: Record<string, unknown>; retries: number; timer: number | null }>();
  private readonly acked = new Set<number>();
  private settled = false;
  private resolveFn!: () => void;
  private rejectFn!: (e: Error) => void;
  public readonly promise: Promise<void>;
  private readonly ackHandler: (...args: unknown[]) => void;

  constructor(
    private readonly plugin: FastSync,
    private readonly action: string,
    private readonly batchAckEvent: string,
    private readonly context: string | undefined,
    private readonly totalBatches: number,
    private readonly window: number,
    private readonly buildPayloadForIndex: (batchIndex: number) => Record<string, unknown>,
    private readonly onLastBatchSent?: () => void,
  ) {
    this.promise = new Promise<void>((resolve, reject) => {
      this.resolveFn = resolve;
      this.rejectFn = reject;
    });
    this.ackHandler = (data: unknown) => this.onAck(data);
    this.plugin.websocket.on(this.batchAckEvent, this.ackHandler);
    activeBatchSendSessions.set(this.batchAckEvent, this);
    void this.pump();
  }

  private cleanup(): void {
    if (this.settled) return;
    this.settled = true;
    this.plugin.websocket.off(this.batchAckEvent, this.ackHandler);
    for (const entry of this.inFlight.values()) {
      if (entry.timer !== null) window.clearTimeout(entry.timer);
    }
    this.inFlight.clear();
    if (activeBatchSendSessions.get(this.batchAckEvent) === this) {
      activeBatchSendSessions.delete(this.batchAckEvent);
    }
  }

  private async pump(): Promise<void> {
    while (!this.settled && this.nextToSend < this.totalBatches && this.inFlight.size < this.window) {
      const idx = this.nextToSend++;
      await this.sendBatch(idx);
      if (this.settled) return;
      if (idx === this.totalBatches - 1) {
        // 最后一批 send 后调用回调，语义与现状（stop-and-wait 最后批直接发出后调用 onLastBatchAcked）一致
        // Invoke callback right after the final batch is sent, matching the existing
        // stop-and-wait semantics (final batch fires the callback immediately on send, not on ack)
        this.onLastBatchSent?.();
      }
    }
  }

  private async sendBatch(idx: number, isRetry = false): Promise<void> {
    const payload = isRetry ? this.inFlight.get(idx)?.payload : this.buildPayloadForIndex(idx);
    if (!payload) return;
    await this.plugin.websocket.SendMessage(this.action, payload);
    if (this.settled) return;
    // 重传 timer 从 SendMessage 实际写入 socket 后起算（而非发起时），避免 bufferedAmount 背压
    // 导致 drain 等待期间就被误判超时（设计稿 §3.5 异常路径表）
    // Retransmit timer starts only after SendMessage actually writes to the socket (not when
    // issued), so time spent waiting on bufferedAmount drain doesn't get misjudged as a timeout
    const timer = window.setTimeout(() => this.onTimeout(idx), 10000);
    const entry = this.inFlight.get(idx);
    if (entry) {
      entry.timer = timer;
    } else {
      this.inFlight.set(idx, { payload, retries: 0, timer });
    }
  }

  private onAck(data: unknown): void {
    if (this.settled) return;
    const d = data as { context?: string; batchIndex?: number };
    if (d.context !== this.context || typeof d.batchIndex !== "number") return;
    const entry = this.inFlight.get(d.batchIndex);
    if (!entry) return; // 已确认过或非本会话在途批次，幂等忽略 / already acked or unknown index, idempotent no-op
    if (entry.timer !== null) window.clearTimeout(entry.timer);
    this.inFlight.delete(d.batchIndex);
    this.acked.add(d.batchIndex);

    if (this.acked.size >= this.totalBatches) {
      this.cleanup();
      this.resolveFn();
      return;
    }
    void this.pump();
  }

  private onTimeout(idx: number): void {
    if (this.settled) return;
    const entry = this.inFlight.get(idx);
    if (!entry) return;
    if (entry.retries >= 3) {
      this.cleanup();
      this.rejectFn(new Error(`[BatchSync] ${this.action} batch ${idx}/${this.totalBatches} ack timeout after 3 retries (10s each)`));
      return;
    }
    entry.retries++;
    entry.timer = null;
    dump(`[BatchSync] ${this.action} batch ${idx} ack timeout, retry ${entry.retries}/3`);
    void this.sendBatch(idx, true);
  }

  /** SyncEnd 到达：视为本类型全部批隐式 ack，清空 timer 并成功结束会话 */
  public settleFromSyncEnd(): void {
    if (this.settled) return;
    this.cleanup();
    this.resolveFn();
  }

  /** 连接断开：清空全部 timer，会话直接终止（不再重传，交由重连后新 context 整轮重启） */
  public settleFromClose(): void {
    if (this.settled) return;
    this.cleanup();
    this.rejectFn(new Error(`[BatchSync] ${this.action} session aborted: connection closed`));
  }
}

/** 当前存活的窗口发送会话，按 batchAckEvent（如 "NoteSyncBatchAck"）索引，供 SyncEnd/onClose 钩子定位 */
const activeBatchSendSessions = new Map<string, BatchSendSession>();

/**
 * SyncEnd 到达时隐式结束对应类型的在途批发送会话（设计稿 §3.2）。W==0/旧路径下没有会话注册，no-op。
 */
function settleBatchSendSessionOnSyncEnd(batchAckEvent: string): void {
  activeBatchSendSessions.get(batchAckEvent)?.settleFromSyncEnd();
}

/**
 * 连接断开时清空所有在途批发送会话的 timer（设计稿 §3.2 异常路径表，挂在 websocket_manager onClose 现有清理处）。
 */
export function settleAllBatchSendSessionsOnClose(): void {
  for (const session of Array.from(activeBatchSendSessions.values())) {
    session.settleFromClose();
  }
}

/**
 * 串行分批发送 WebSocket 同步消息的通用辅助函数，支持同时对主项目、删除项目和缺失项目进行分片对齐发送。
 * W = min(syncState.pipelineWindowUp, 32)：W>0 走滑动窗口状态机（不等 ack 连发最多 W 批在途）；
 * W==0（旧服务端未协商 / 回滚开关）或 totalBatches<=1 快速路径，分发到保留的原 stop-and-wait 实现。
 *
 * Generic helper for serial batch-sending WebSocket sync messages, aligned-slicing main, delete, and missing arrays.
 * W = min(syncState.pipelineWindowUp, 32): W>0 uses the sliding-window state machine (up to W
 * batches in flight without waiting for acks); W==0 (pre-negotiation server / rollback switch) or
 * the totalBatches<=1 fast path dispatches to the preserved original stop-and-wait implementation.
 */
async function sendSyncInBatches<T1, T2, T3>(
  plugin: FastSync,
  action: string,
  batchAckEvent: string,
  context: string | undefined,
  mainItems: T1[],
  delItems: T2[],
  missingItems: T3[],
  buildPayload: (
    mainChunk: T1[],
    delChunk: T2[],
    missingChunk: T3[],
    batchIndex: number,
    totalBatches: number
  ) => Record<string, unknown>,
  onLastBatchAcked?: () => void,
  syncUpChunkNum = plugin.syncState.syncUpChunkNum
): Promise<void> {
  const maxLen = Math.max(mainItems.length, delItems.length, missingItems.length);
  const totalBatches = Math.max(1, Math.ceil(maxLen / syncUpChunkNum));
  const W = Math.min(plugin.syncState.pipelineWindowUp, 32);

  // 新旧路径选路点：W<=0（含旧服务端/协商窗口关闭）或单批快速路径 → 保留的原 stop-and-wait 分支
  // Route selection point: W<=0 (incl. pre-negotiation server / window disabled) or the
  // single-batch fast path -> preserved original stop-and-wait branch
  if (W <= 0 || totalBatches <= 1) {
    return sendSyncInBatchesLegacy(plugin, action, batchAckEvent, context, mainItems, delItems, missingItems, buildPayload, onLastBatchAcked, syncUpChunkNum);
  }

  const buildPayloadForIndex = (batchIndex: number): Record<string, unknown> => {
    const start = batchIndex * syncUpChunkNum;
    const end = start + syncUpChunkNum;
    return buildPayload(mainItems.slice(start, end), delItems.slice(start, end), missingItems.slice(start, end), batchIndex, totalBatches);
  };

  const session = new BatchSendSession(plugin, action, batchAckEvent, context, totalBatches, W, buildPayloadForIndex, onLastBatchAcked);
  return session.promise;
}

/**
 * 发送同步请求
 * folder/note/file/setting 四类清单并发发出（不再串行等待 folder 屏障）；
 * 并发下的 createFolder 竞态由各消息处理器的惰性建目录兜底承接（设计稿 §6.2）
 * Send sync requests
 * The four batch types (folder/note/file/setting) are dispatched concurrently (folder barrier removed);
 * concurrent createFolder races are absorbed by each handler's lazy folder-creation fallback (design §6.2)
 */
export const handleRequestSend = async function (plugin: FastSync, syncMode: SyncMode, noteData: NoteSyncData, fileData: FileSyncData, configData: ConfigSyncData, folderData: FolderSyncData) {
  const shouldSyncNotes = syncMode === "auto" || syncMode === "note";
  const shouldSyncConfigs = syncMode === "auto" || syncMode === "config";

  const jobs: Promise<void>[] = [];

  if (plugin.settings.syncEnabled && shouldSyncNotes) {

    // 并发分批发送 FolderSync / NoteSync / FileSync
    // Concurrently batch-send FolderSync / NoteSync / FileSync
    dump(`[Sync] Starting batch send: ${folderData.folders.length} folders, ${noteData.notes.length} notes, ${fileData.files.length} files`);
    jobs.push(sendSyncInBatches(
      plugin,
      "FolderSync",
      "FolderSyncBatchAck",
      folderData.context,
      folderData.folders,
      plugin.settings.offlineDeleteSyncEnabled ? folderData.delFolders : [],
      folderData.missingFolders,
      (mainChunk, delChunk, missingChunk, batchIndex, totalBatches) => ({
        vault: plugin.settings.vault,
        lastTime: folderData.lastTime,
        folders: mainChunk,
        context: folderData.context,
        batchIndex,
        totalBatches,
        ...(plugin.settings.offlineDeleteSyncEnabled ? { delFolders: delChunk } : {}),
        ...(missingChunk.length > 0 ? { missingFolders: missingChunk } : {}),
      }),
      () => {
        const paths = folderData.folders.map(f => f.path);
        plugin.folderSnapshotManager.setFolderMtimes(paths, Date.now());
      }
    ));

    jobs.push(sendSyncInBatches(
      plugin,
      "NoteSync",
      "NoteSyncBatchAck",
      noteData.context,
      noteData.notes,
      plugin.settings.offlineDeleteSyncEnabled ? noteData.delNotes : [],
      noteData.missingNotes,
      (mainChunk, delChunk, missingChunk, batchIndex, totalBatches) => ({
        vault: plugin.settings.vault,
        lastTime: noteData.lastTime,
        notes: mainChunk,
        context: noteData.context,
        batchIndex,
        totalBatches,
        ...(plugin.settings.offlineDeleteSyncEnabled ? { delNotes: delChunk } : {}),
        ...(missingChunk.length > 0 ? { missingNotes: missingChunk } : {}),
      }),
      () => {
        for (const note of noteData.notes) {
          plugin.pendingNoteModifies.set(note.path, note.contentHash);
        }
        plugin.localStorageManager.savePending('pendingNoteModifies', plugin.pendingNoteModifies);
      }
    ));

    // 云预览模式且未开启类型限制时跳过 FileSync
    // Skip FileSync when cloud-preview is on without type restriction
    if (!plugin.settings.cloudPreviewEnabled || plugin.settings.cloudPreviewTypeRestricted) {
      jobs.push(sendSyncInBatches(
        plugin,
        "FileSync",
        "FileSyncBatchAck",
        fileData.context,
        fileData.files,
        plugin.settings.offlineDeleteSyncEnabled ? fileData.delFiles : [],
        fileData.missingFiles,
        (mainChunk, delChunk, missingChunk, batchIndex, totalBatches) => ({
          vault: plugin.settings.vault,
          lastTime: fileData.lastTime,
          files: mainChunk,
          context: fileData.context,
          batchIndex,
          totalBatches,
          ...(plugin.settings.offlineDeleteSyncEnabled ? { delFiles: delChunk } : {}),
          ...(missingChunk.length > 0 ? { missingFiles: missingChunk } : {}),
        })
      ));
    }
  }

  if (plugin.settings.configSyncEnabled && shouldSyncConfigs) {
    // 分批发送 SettingSync（配置同步），与上方三类并发发出
    // Batch-send SettingSync (config sync), dispatched concurrently with the three types above
    // 注意：客户端发送字段名为 settings / delSettings / missingSettings（非 configs）
    // Note: client sends field names 'settings' / 'delSettings' / 'missingSettings' (not 'configs')
    const isCover = Number(plugin.localStorageManager.getMetadata("lastConfigSyncTime")) === 0;
    jobs.push(sendSyncInBatches(
      plugin,
      "SettingSync",
      "SettingSyncBatchAck",
      configData.context,
      configData.configs,
      plugin.settings.offlineDeleteSyncEnabled ? configData.delConfigs : [],
      configData.missingConfigs,
      (mainChunk, delChunk, missingChunk, batchIndex, totalBatches) => ({
        vault: plugin.settings.vault,
        lastTime: configData.lastTime,
        settings: mainChunk,
        cover: isCover,
        context: configData.context,
        batchIndex,
        totalBatches,
        ...(plugin.settings.offlineDeleteSyncEnabled ? { delSettings: delChunk } : {}),
        ...(missingChunk.length > 0 ? { missingSettings: missingChunk } : {}),
      }),
      () => {
        for (const config of configData.configs) {
          plugin.pendingConfigModifies.set(config.path, config.contentHash);
        }
        plugin.localStorageManager.savePending('pendingConfigModifies', plugin.pendingConfigModifies);
      }
    ));
  }

  // 任一类失败不阻断其他类；失败类由 300s 总兜底（checkSyncCompletion）复位
  // A failure in any single type does not block the others; a failed type is reset by the 300s overall fallback (checkSyncCompletion)
  await Promise.allSettled(jobs);

  if (plugin.settings.syncEnabled && shouldSyncNotes) {
    // 将已删除路径加入 pending set，等待 SyncEnd 确认服务端已处理后再从 hashManager 移除
    // Populate pending delete sets; remove from hashManager only after SyncEnd confirms server processed
    if (plugin.settings.offlineDeleteSyncEnabled) {
      plugin.pendingDeleteNotePaths = new Set(noteData.delNotes.map(i => i.path));
      plugin.pendingDeleteFilePaths = new Set(fileData.delFiles.map(i => i.path));
      plugin.pendingDeleteFolderPaths = new Set(folderData.delFolders.map(i => i.path));
    }
  }

  if (plugin.settings.configSyncEnabled && shouldSyncConfigs) {
    // 将已删除配置路径加入 pending set，等待 SettingSyncEnd 确认服务端已处理后再移除
    // Populate pending config delete set; remove from hashManager only after SettingSyncEnd
    if (plugin.settings.offlineDeleteSyncEnabled && plugin.configHashManager && plugin.configHashManager.isReady()) {
      plugin.pendingDeleteConfigPaths = new Set(configData.delConfigs.map(i => i.path));
    }
  }
};
