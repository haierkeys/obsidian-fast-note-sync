import { TFolder, TFile, normalizePath } from "obsidian";

import { receiveFileUpload, receiveFileSyncUpdate, receiveFileSyncDelete, receiveFileSyncMtime, receiveFileSyncChunkDownload, receiveFileSyncEnd, checkAndUploadAttachments, receiveFileSyncRename, receiveFileRenameAck, receiveFileUploadAck, receiveFileDeleteAck, isPluginUnloading } from "./file_operator";
import { hashContent, hashContentAsync, dump, isPathExcluded, configIsPathExcluded, getConfigSyncCustomDirs, generateUUID, showSyncNotice, isLargeBinarySyncRisk, describeBinarySyncLimit, logMemorySnapshot, hashFileAsync, formatFileSize } from "./helps";
import { receiveConfigSyncModify, receiveConfigUpload, receiveConfigSyncMtime, receiveConfigSyncDelete, receiveConfigSyncEnd, configAllPaths, receiveConfigSyncClear, receiveConfigModifyAck, receiveConfigDeleteAck } from "./config_operator";
import { receiveNoteSyncModify, receiveNoteUpload, receiveNoteSyncMtime, receiveNoteSyncDelete, receiveNoteSyncEnd, receiveNoteSyncRename, receiveNoteModifyAck, receiveNoteRenameAck, receiveNoteDeleteAck } from "./note_operator";
import { SyncMode, SnapFile, SnapFolder, SyncEndData, PathHashFile, NoteSyncData, FileSyncData, ConfigSyncData, FolderSyncData } from "./types";
import { receiveFolderSyncModify, receiveFolderSyncDelete, receiveFolderSyncRename, receiveFolderSyncEnd } from "./folder_operator";
import { FileCloudPreview } from "./file_cloud_preview";
import { SyncLogManager } from "./sync_log_manager";
import type FastSync from "../main";
import { $ } from "../i18n/lang";


export const startupSync = (plugin: FastSync): void => {
  void handleSync(plugin, plugin.localStorageManager.getMetadata("isInitSync") as boolean);
};
export const startupFullSync = async (plugin: FastSync) => {
  void handleSync(plugin, false);
};

export const resetSettingSyncTime = async (plugin: FastSync) => {
  plugin.localStorageManager.clearSyncTime();
  showSyncNotice($("setting.debug.clear_time_success"));
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
export function checkSyncCompletion(plugin: FastSync, intervalId?: number, syncStartTime?: number) {
  // 超时保底：如果同步超过 30 秒仍未完成，强制结束并恢复 watch，防止因任务计数异常导致永远无法发送
  // Safety timeout: if sync exceeds 30s, force completion and re-enable watch to prevent permanent send blockage
  const SYNC_TIMEOUT_MS = 30000;
  if (syncStartTime && Date.now() - syncStartTime > SYNC_TIMEOUT_MS) {
    if (intervalId) window.clearInterval(intervalId);
    dump(`Sync completion timeout after ${SYNC_TIMEOUT_MS}ms, force enabling watch. Tasks: note=${JSON.stringify(plugin.noteSyncTasks)}, file=${JSON.stringify(plugin.fileSyncTasks)}, folder=${JSON.stringify(plugin.folderSyncTasks)}, config=${JSON.stringify(plugin.configSyncTasks)}`)
    plugin.enableWatch();
    plugin.syncTypeCompleteCount = 0;
    plugin.resetSyncTasks();
    plugin.totalFilesToDownload = 0;
    plugin.downloadedFilesCount = 0;
    plugin.totalChunksToDownload = 0;
    plugin.downloadedChunksCount = 0;
    plugin.totalChunksToUpload = 0;
    plugin.uploadedChunksCount = 0;
    plugin.updateStatusBar($("ui.status.completed"));
    window.setTimeout(() => plugin.updateStatusBar(""), 3000);
    return;
  }

  const ws = plugin.websocket.ws;
  const bufferedAmount = ws && ws.readyState === WebSocket.OPEN ? ws.bufferedAmount : 0;

  // 模块进度的完成判定：已处理的明细数达到需处理总数（即使未收到 End 消息，只要完成数达标也视为结束，增强网络容错）
  const noteTasksTotal = plugin.noteSyncTasks.needUpload + plugin.noteSyncTasks.needModify + plugin.noteSyncTasks.needSyncMtime + plugin.noteSyncTasks.needDelete;
  const noteSyncDone = (plugin.noteSyncEnd || plugin.noteSyncTasks.completed >= noteTasksTotal) && plugin.noteSyncTasks.completed >= noteTasksTotal;

  const fileTasksTotal = plugin.fileSyncTasks.needUpload + plugin.fileSyncTasks.needModify + plugin.fileSyncTasks.needSyncMtime + plugin.fileSyncTasks.needDelete;
  const fileSyncDone = (plugin.fileSyncEnd || plugin.fileSyncTasks.completed >= fileTasksTotal) && plugin.fileSyncTasks.completed >= fileTasksTotal;

  const configTasksTotal = plugin.configSyncTasks.needUpload + plugin.configSyncTasks.needModify + plugin.configSyncTasks.needSyncMtime + plugin.configSyncTasks.needDelete;
  const configSyncDone = (plugin.configSyncEnd || plugin.configSyncTasks.completed >= configTasksTotal) && plugin.configSyncTasks.completed >= configTasksTotal;

  const folderTasksTotal = plugin.folderSyncTasks.needUpload + plugin.folderSyncTasks.needModify + plugin.folderSyncTasks.needSyncMtime + plugin.folderSyncTasks.needDelete;
  const folderSyncDone = (plugin.folderSyncEnd || plugin.folderSyncTasks.completed >= folderTasksTotal) && plugin.folderSyncTasks.completed >= folderTasksTotal;

  const allSyncDone = (!plugin.settings.syncEnabled || (noteSyncDone && folderSyncDone && (plugin.settings.cloudPreviewEnabled || fileSyncDone))) &&
    (!plugin.settings.configSyncEnabled || configSyncDone);

  const totalChunks = plugin.totalChunksToUpload + plugin.totalChunksToDownload;
  const completedChunks = plugin.uploadedChunksCount + plugin.downloadedChunksCount;
  const allChunksCompleted = totalChunks === 0 || completedChunks >= totalChunks;
  const allDownloadsComplete = plugin.fileDownloadSessions.size === 0;
  const bufferCleared = bufferedAmount === 0;

  // 计算整体权重进度
  let totalProgressSum = 0;
  let activeModuleCount = 0;

  // 1. 笔记同步进度
  if (plugin.settings.syncEnabled) {
    activeModuleCount++;
    const noteTasks = plugin.noteSyncTasks;
    const total = noteTasks.needUpload + noteTasks.needModify + noteTasks.needSyncMtime + noteTasks.needDelete;
    if (plugin.noteSyncEnd) {
      totalProgressSum += Math.min(1, total > 0 ? noteTasks.completed / total : 1);
    }
  }

  // 2. 文件同步进度
  if (plugin.settings.syncEnabled && !plugin.settings.cloudPreviewEnabled) {
    activeModuleCount++;
    const fileTasks = plugin.fileSyncTasks;
    const taskTotal = fileTasks.needUpload + fileTasks.needModify + fileTasks.needSyncMtime + fileTasks.needDelete;
    if (plugin.fileSyncEnd) {
      const avgChunkSize = 512 * 1024;
      const bufferChunks = Math.ceil(bufferedAmount / avgChunkSize);
      const actualUploadedChunks = Math.max(0, plugin.uploadedChunksCount - bufferChunks);
      const doneChunks = actualUploadedChunks + plugin.downloadedChunksCount;

      const unitsTotal = taskTotal + totalChunks;
      const unitsDone = fileTasks.completed + doneChunks;
      totalProgressSum += Math.min(1, unitsTotal > 0 ? unitsDone / unitsTotal : 1);
    }
  }

  // 3. 配置同步进度
  if (plugin.settings.configSyncEnabled) {
    activeModuleCount++;
    const configTasks = plugin.configSyncTasks;
    const total = configTasks.needUpload + configTasks.needModify + configTasks.needSyncMtime + configTasks.needDelete;
    if (plugin.configSyncEnd) {
      totalProgressSum += Math.min(1, total > 0 ? configTasks.completed / total : 1);
    }
  }

  // 4. 文件夹同步进度
  if (plugin.settings.syncEnabled) {
    activeModuleCount++;
    const folderTasks = plugin.folderSyncTasks;
    const total = folderTasks.needUpload + folderTasks.needModify + folderTasks.needSyncMtime + folderTasks.needDelete;
    if (plugin.folderSyncEnd) {
      totalProgressSum += Math.min(1, total > 0 ? folderTasks.completed / total : 1);
    }
  }

  // 使用动态计算的活跃模块数，避免 handleSync 中的静态计数同步延迟或错误导致的分母偏差
  const divisor = Math.max(1, activeModuleCount);
  const overallPercentage = (totalProgressSum / divisor) * 100;

  // 判断是否强制完成：进度到 100% 且网络空闲，所有模块都标记了 Done，且所有请求已发出
  const isProgressComplete = overallPercentage >= 100 && bufferCleared && allDownloadsComplete && !plugin.isSyncRequesting;

  if (((allSyncDone && allChunksCompleted && allDownloadsComplete && bufferCleared) || isProgressComplete) && !plugin.isSyncRequesting) {
    if (intervalId) window.clearInterval(intervalId);

    plugin.enableWatch();
    plugin.syncTypeCompleteCount = 0;
    plugin.resetSyncTasks();
    plugin.totalFilesToDownload = 0;
    plugin.downloadedFilesCount = 0;
    plugin.totalChunksToDownload = 0;
    plugin.downloadedChunksCount = 0;
    plugin.totalChunksToUpload = 0;
    plugin.uploadedChunksCount = 0;

    if (plugin.settings.isShowNotice) {
      showSyncNotice($("ui.status.completed"));
    }
    plugin.updateStatusBar($("ui.status.completed"));

    if (plugin.expectedSyncCount > 0 && !plugin.localStorageManager.getMetadata("isInitSync")) {
      plugin.localStorageManager.setMetadata("isInitSync", true);
    }

    // 如果开启了云预览，在首次同步后检查所有附件在服务端的状态
    if (plugin.settings.cloudPreviewEnabled) {
      void checkAndUploadAttachments(plugin);
    }

    // 同步完成后刷新分享指示器状态
    // Refresh share indicator state after sync completion
    void plugin.shareIndicatorManager?.syncWithServer();

    window.setTimeout(() => plugin.updateStatusBar(""), 3000);
  } else {
    // --- 强制完成逻辑与 90% 补偿 ---
    const allEndReceived = (!plugin.settings.syncEnabled || (plugin.noteSyncEnd && plugin.folderSyncEnd && (plugin.settings.cloudPreviewEnabled || plugin.fileSyncEnd))) &&
      (!plugin.settings.configSyncEnabled || plugin.configSyncEnd);

    let finalPercentage = overallPercentage;
    if (allEndReceived && bufferCleared && allDownloadsComplete && allChunksCompleted) {
      if (overallPercentage > 90) {
        finalPercentage = 100;
        if (plugin.settings.syncEnabled) {
          plugin.noteSyncTasks.completed = plugin.noteSyncTasks.needUpload + plugin.noteSyncTasks.needModify + plugin.noteSyncTasks.needSyncMtime + plugin.noteSyncTasks.needDelete;
          plugin.folderSyncTasks.completed = plugin.folderSyncTasks.needUpload + plugin.folderSyncTasks.needModify + plugin.folderSyncTasks.needSyncMtime + plugin.folderSyncTasks.needDelete;
          plugin.fileSyncTasks.completed = plugin.fileSyncTasks.needUpload + plugin.fileSyncTasks.needModify + plugin.fileSyncTasks.needSyncMtime + plugin.fileSyncTasks.needDelete;
        }
        if (plugin.settings.configSyncEnabled) {
          plugin.configSyncTasks.completed = plugin.configSyncTasks.needUpload + plugin.configSyncTasks.needModify + plugin.configSyncTasks.needSyncMtime + plugin.configSyncTasks.needDelete;
        }
      }
    }

    let statusText = $("ui.status.syncing");
    if (bufferedAmount > 0) {
      const bufferMB = (bufferedAmount / 1024 / 1024).toFixed(2);
      statusText = `${$("ui.status.syncing")} (缓冲区: ${bufferMB}MB)`;
    }

    plugin.updateStatusBar(statusText, Math.min(100, Math.floor(finalPercentage)), 100);
  }
}
/**
 * 消息接收调度
 */

export type OperatorHandler = (data: unknown, plugin: FastSync) => Promise<void> | void;
export const receiveOperators: Map<string, OperatorHandler> = new Map([
  ["NoteSyncModify", receiveNoteSyncModify],
  ["NoteSyncNeedPush", receiveNoteUpload],
  ["NoteSyncMtime", receiveNoteSyncMtime],
  ["NoteSyncDelete", receiveNoteSyncDelete],
  ["NoteSyncRename", receiveNoteSyncRename],
  ["NoteModifyAck", (data, plugin) => receiveNoteModifyAck(data as { lastTime?: number; path?: string }, plugin)],
  ["NoteRenameAck", (data, plugin) => receiveNoteRenameAck(data as { lastTime?: number }, plugin)],
  ["NoteDeleteAck", (data, plugin) => receiveNoteDeleteAck(data as { lastTime?: number; path?: string }, plugin)],
  ["NoteSyncEnd", (data, plugin) => receiveSyncEndWrapper(data, plugin, "note")],
  ["FileUpload", receiveFileUpload],
  ["FileSyncUpdate", receiveFileSyncUpdate],
  ["FileSyncChunkDownload", receiveFileSyncChunkDownload],
  ["FileSyncDelete", receiveFileSyncDelete],
  ["FileSyncRename", receiveFileSyncRename],
  ["FileSyncMtime", receiveFileSyncMtime],
  ["FileSyncEnd", (data, plugin) => receiveSyncEndWrapper(data, plugin, "file")],
  ["FileRenameAck", receiveFileRenameAck],
  ["FileUploadAck", receiveFileUploadAck],
  ["FileDeleteAck", (data, plugin) => receiveFileDeleteAck(data as { lastTime?: number; path?: string }, plugin)],
  ["SettingSyncModify", receiveConfigSyncModify],
  ["SettingSyncNeedUpload", receiveConfigUpload],
  ["SettingSyncMtime", receiveConfigSyncMtime],
  ["SettingSyncDelete", receiveConfigSyncDelete],
  ["SettingSyncEnd", (data, plugin) => receiveSyncEndWrapper(data, plugin, "config")],
  ["SettingSyncClear", receiveConfigSyncClear],
  ["SettingModifyAck", receiveConfigModifyAck],
  ["SettingDeleteAck", receiveConfigDeleteAck],
  ["FolderSyncModify", receiveFolderSyncModify],
  ["FolderSyncDelete", receiveFolderSyncDelete],
  ["FolderSyncRename", receiveFolderSyncRename],
  ["FolderSyncEnd", (data, plugin) => receiveSyncEndWrapper(data, plugin, "folder")],
  ["ShareSyncRefresh", receiveShareSyncRefresh],
] as [string, OperatorHandler][]);

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

  // 1. 基础任务计数解析
  const tasks = type === "note" ? plugin.noteSyncTasks : type === "file" ? plugin.fileSyncTasks : type === "config" ? plugin.configSyncTasks : plugin.folderSyncTasks;
  tasks.needUpload = syncData.needUploadCount || 0;
  tasks.needModify = syncData.needModifyCount || 0;
  tasks.needSyncMtime = syncData.needSyncMtimeCount || 0;
  tasks.needDelete = syncData.needDeleteCount || 0;

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
    for (const [path, cache] of plugin.scannedNoteHashes) {
      const hashMap = (plugin.fileHashManager as unknown as { hashMap: Map<string, { mtime: number }> }).hashMap;
      const existing = hashMap.get(path)
      if (!existing || existing.mtime <= cache.mtime) {
        plugin.fileHashManager.setFileHash(path, cache.hash, cache.mtime, cache.size)
      }
    }
    plugin.scannedNoteHashes.clear()
  } else if (type === "file") {
    plugin.fileHashManager.removeFileHashes(plugin.pendingDeleteFilePaths)
    plugin.pendingDeleteFilePaths.clear()
    // 同步结束，提交本轮同步中可能产生的待确认上传 hash
    plugin.fileHashManager.setFileHashes(plugin.pendingUploadHashes, (path) => plugin.app.vault.getFileByPath(path)?.stat)
    plugin.pendingUploadHashes.clear()
    plugin.localStorageManager.clearPending('pendingUploadHashes')
    // 同步结束，提交扫描阶段计算出的哈希 (Commit hashes calculated during scan)
    for (const [path, cache] of plugin.scannedFileHashes) {
      const hashMap = (plugin.fileHashManager as unknown as { hashMap: Map<string, { mtime: number }> }).hashMap;
      const existing = hashMap.get(path)
      if (!existing || existing.mtime <= cache.mtime) {
        plugin.fileHashManager.setFileHash(path, cache.hash, cache.mtime, cache.size)
      }
    }
    plugin.scannedFileHashes.clear()
  } else if (type === "folder") {
    for (const path of plugin.pendingDeleteFolderPaths) plugin.folderSnapshotManager.removeFolder(path)
    plugin.pendingDeleteFolderPaths.clear()
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
    for (const [path, cache] of plugin.scannedConfigHashes) {
      const hashMap = (plugin.configHashManager as unknown as { hashMap: Map<string, { mtime: number }> }).hashMap;
      const existing = hashMap.get(path)
      if (!existing || existing.mtime <= cache.mtime) {
        plugin.configHashManager.setFileHash(path, cache.hash, cache.mtime, cache.size)
      }
    }
    plugin.scannedConfigHashes.clear()
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
  try {
    const context = generateUUID();
    dump(`Sync context generated: ${context}`);
    if (!plugin.menuManager.ribbonIconStatus) {
      showSyncNotice($("setting.remote.disconnected"));
      return;
    }
    if (!plugin.getWatchEnabled()) {
      showSyncNotice($("ui.status.last_sync_not_completed"), 4000);
      return;
    }

    if (plugin.settings.readonlySyncEnabled) {
      dump("Read-only mode: Proceeding with state gathering for remote-to-local sync.");
    }

    plugin.currentSyncType = isLoadLastTime ? 'incremental' : 'full';
    plugin.syncTypeCompleteCount = 0;
    plugin.resetSyncTasks();
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
    plugin.pendingNoteRenames = []
    // 清空 pending 删除路径集合，避免旧的 pending 条目干扰本次同步
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
    plugin.pendingConfigModifies.clear()
    plugin.localStorageManager.clearPending('pendingConfigModifies')
    plugin.disableWatch();

    const shouldSyncNotes = syncMode === "auto" || syncMode === "note";
    const shouldSyncConfigs = syncMode === "auto" || syncMode === "config";

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
      plugin.enableWatch();
      plugin.updateStatusBar("");
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

      for (const file of list) {
        // 每处理 20 个文件让出一次主线程，防止 UI 卡死 (已将 100 优化为 20)
        if (++processedCount % 20 === 0) {
          await sleep(0);
          if (isPluginUnloading) return;
          // 更新扫描进度
          SyncLogManager.getInstance().addOrUpdateLog({
            id: hashingLogId,
            type: 'info',
            action: `VaultScanning_${plugin.currentSyncType}`,
            status: 'pending',
            progress: Math.floor((processedCount / totalToProcess) * 100),
            message: `${plugin.currentSyncType === 'full' ? '🔍 正在全量扫描' : '🔍 正在增量扫描'}... (${processedCount}/${totalFiles})`
          });
        }

        try {
          if (isPathExcluded(file.path, plugin)) continue;
          if (file instanceof TFolder) {
            if (file.path === "/") continue;

            // 使用虚拟化 mtime：优先从快照读取，若是新路径则用当前时间
            let mtime = plugin.folderSnapshotManager.getMtime(file.path) || Date.now();

            // 优化增量同步过滤：仅在文件已追踪且 mtime 未超过上次同步时间时跳过
            if (isLoadLastTime && mtime < Number(plugin.localStorageManager.getMetadata("lastFolderSyncTime")) && plugin.folderSnapshotManager.getMtime(file.path) !== undefined) continue;

            folders.push({
              path: file.path,
              pathHash: hashContent(file.path),
            });
            continue;
          }

          if (file instanceof TFile) {
            if (file.extension === "md") {
              // 优化增量同步过滤：仅在文件已追踪且 mtime 未超过上次同步时间，且无待确认上传时跳过
              if (isLoadLastTime
                && file.stat.mtime < Number(plugin.localStorageManager.getMetadata("lastNoteSyncTime"))
                && plugin.fileHashManager.getPathHash(file.path) !== null
                && !plugin.pendingNoteModifies.has(file.path)) continue;

              // 如果文件较大，更新日志消息让用户感知进度 (Update log for large files)
              if (file.stat.size > 2 * 1024 * 1024) {
                SyncLogManager.getInstance().addOrUpdateLog({
                  id: hashingLogId,
                  type: 'info',
                  action: `VaultScanning_${plugin.currentSyncType}`,
                  message: `🔍 正在哈希笔记: ${file.name} (${formatFileSize(file.stat.size)})`
                });
              }

              const baseHash = plugin.fileHashManager.getPathHash(file.path);
              let contentHash = plugin.fileHashManager.getValidHash(file.path, file.stat.mtime, file.stat.size);
              if (contentHash === null) {
                try {
                  contentHash = await hashContentAsync(await plugin.app.vault.read(file));
                  // 暂存哈希，待同步结束时统一存入 (Temporarily store hash, commit on sync end)
                  plugin.scannedNoteHashes.set(file.path, { hash: contentHash, mtime: file.stat.mtime, size: file.stat.size });
                  dump(`[HashNote] [Calc] path=${file.path} size=${formatFileSize(file.stat.size)} hash=${contentHash}`)
                } catch (e) {
                  console.warn(`[FastNoteSync] 哈希笔记失败，跳过: ${file.path}`, e);
                  continue;
                }
              } else {
                dump(`[HashNote] [Cache] path=${file.path} size=${formatFileSize(file.stat.size)} hash=${contentHash}`)
              }

              let item = {
                path: file.path,
                pathHash: hashContent(file.path),
                contentHash: contentHash,
                mtime: file.stat.mtime,
                ctime: file.stat.ctime,
                size: file.stat.size,
                ...(baseHash !== null ? { baseHash } : { baseHashMissing: true }),
              }
              notes.push(item);
            } else {
              if (isLargeBinarySyncRisk(file.stat.size, plugin)) {
                dump(`Skip scanning large attachment (${describeBinarySyncLimit()} limit): ${file.path}`, file.stat.size);
                continue;
              }
              const skipSync = plugin.settings.cloudPreviewEnabled && (!plugin.settings.cloudPreviewTypeRestricted || FileCloudPreview.isRestrictedType("." + file.extension));
              if (skipSync) continue;

              if (isLoadLastTime
                && file.stat.mtime < Number(plugin.localStorageManager.getMetadata("lastFileSyncTime"))
                && plugin.fileHashManager.getPathHash(file.path) !== null
                && !plugin.pendingUploadHashes.has(file.path)) continue;

              // 处理大附件时实时显示文件名，避免假死感 (Update message for large attachments)
              if (file.stat.size > 5 * 1024 * 1024) {
                SyncLogManager.getInstance().addOrUpdateLog({
                  id: hashingLogId,
                  type: 'info',
                  action: `VaultScanning_${plugin.currentSyncType}`,
                  message: `🔍 正在哈希附件: ${file.name} (${formatFileSize(file.stat.size)})`
                });
              }

              const baseHash = plugin.fileHashManager.getPathHash(file.path);
              let contentHash = plugin.fileHashManager.getValidHash(file.path, file.stat.mtime, file.stat.size);
              if (contentHash === null) {
                try {
                  contentHash = await hashFileAsync(plugin.app, file.path);
                  // 暂存哈希，待同步结束时统一存入 (Temporarily store hash, commit on sync end)
                  plugin.scannedFileHashes.set(file.path, { hash: contentHash, mtime: file.stat.mtime, size: file.stat.size });
                  logMemorySnapshot(`after scan hash ${file.path}`);
                  // 注意：hashFileAsync 内部已经带了 [Calc] 类型的 dump，此处不再重复
                } catch (e) {
                  console.warn(`[FastNoteSync] 哈希附件失败，跳过: ${file.path}`, e);
                  continue;
                }
              } else {
                dump(`[HashFile] [Cache] path=${file.path} size=${formatFileSize(file.stat.size)} hash=${contentHash}`)
              }

              let item = {
                path: file.path,
                pathHash: hashContent(file.path),
                contentHash: contentHash,
                mtime: file.stat.mtime,
                ctime: file.stat.ctime,
                size: file.stat.size,
                ...(baseHash !== null ? { baseHash } : { baseHashMissing: true }),
              }
              files.push(item);
            }
          }
        } catch (e) {
          // 单个文件处理失败不应中断整个同步流程
          const errorMsg = e instanceof Error ? e.message : String(e);
          console.warn(`[FastNoteSync] 跳过异常文件 ${file.path}: ${errorMsg}`);
          dump(`Error processing file ${file.path}:`, e);
        }
      }

      // 检测被删除的文件 (对比哈希表和本地 Vault)
      if (plugin.settings.offlineDeleteSyncEnabled) {
        const trackedPaths = plugin.fileHashManager.getAllPaths();
        const localPathsSet = new Set(list.map(f => f.path)); // 优化：使用 Set 提高查找效率
        let delCount = 0;
        for (const path of trackedPaths) {
          if (++delCount % 100 === 0) await sleep(0);
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
            if (++folderCount % 100 === 0) await sleep(0);
            if (isPathExcluded(path, plugin)) continue;
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
          if (++missingCount % 100 === 0) await sleep(0);
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
            if (++folderCount % 100 === 0) await sleep(0);
            if (isPathExcluded(path, plugin)) continue;
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
        if (isPluginUnloading) return;
        SyncLogManager.getInstance().addOrUpdateLog({
          id: hashingLogId,
          type: 'info',
          action: `VaultScanning_${plugin.currentSyncType}`,
          status: 'pending',
          progress: overallTotal > 0 ? Math.floor(((baseProcessedCount + configCount) / overallTotal) * 100) : 100,
          message: `${plugin.currentSyncType === 'full' ? '⚙️ 正在全量扫描配置' : '⚙️ 正在增量扫描配置'}... (${configCount}/${totalConfigs})`
        });
      }

      try {
        if (configIsPathExcluded(path, plugin)) continue;
        const fullPath = normalizePath(path);
        const stat = await plugin.app.vault.adapter.stat(fullPath);
        if (!stat) continue;
        if (isLargeBinarySyncRisk(stat.size, plugin)) {
          dump(`Skip scanning large config file (${describeBinarySyncLimit()} limit): ${path}`, stat.size);
          continue;
        }
        if (isLoadLastTime && stat.mtime < Number(plugin.localStorageManager.getMetadata("lastConfigSyncTime"))) continue;

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
        message: `✅ ${plugin.currentSyncType === 'full' ? '全量' : '增量'}扫描完成 | 笔记: ${notes.length} | 附件: ${files.length} | 配置: ${configs.length}`
      });
    }

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
      checkSyncCompletion(plugin, progressCheckInterval, syncStartTime);
    }, 100);
  } catch (error) {
    dump("Sync failed with error: " + error);
    plugin.enableWatch();
    plugin.updateStatusBar($("ui.status.failed") || "Sync Failed");
    window.setTimeout(() => plugin.updateStatusBar(""), 3000);
  } finally {
    // 确保 isSyncing 在所有退出路径（正常完成、early return、异常）下都被重置
    // Ensure isSyncing is reset on all exit paths: normal completion, early return, or exception
    plugin.isSyncing = false;
  }
};


/**
 * 发送同步请求
 * 先发 FolderSync 并等待文件夹结构在本地落地，再发 NoteSync/FileSync，消除并发 createFolder 竞争
 * Send FolderSync first and wait for folder structure to be created locally before sending NoteSync/FileSync,
 * eliminating concurrent createFolder race conditions
 */
export const handleRequestSend = async function (plugin: FastSync, syncMode: SyncMode, noteData: NoteSyncData, fileData: FileSyncData, configData: ConfigSyncData, folderData: FolderSyncData) {
  const shouldSyncNotes = syncMode === "auto" || syncMode === "note";
  const shouldSyncConfigs = syncMode === "auto" || syncMode === "config";

  if (plugin.settings.syncEnabled && shouldSyncNotes) {


    const noteSyncData = {
      vault: plugin.settings.vault,
      lastTime: noteData.lastTime,
      notes: noteData.notes,
      context: noteData.context,
      ...(plugin.settings.offlineDeleteSyncEnabled ? { delNotes: noteData.delNotes } : {}),
      ...(noteData.missingNotes.length > 0 ? { missingNotes: noteData.missingNotes } : {}),
    };

    const fileSyncData = {
      vault: plugin.settings.vault,
      lastTime: fileData.lastTime,
      files: fileData.files,
      context: fileData.context,
      ...(plugin.settings.offlineDeleteSyncEnabled ? { delFiles: fileData.delFiles } : {}),
      ...(fileData.missingFiles.length > 0 ? { missingFiles: fileData.missingFiles } : {}),
    };

    const folderSyncData = {
      vault: plugin.settings.vault,
      lastTime: folderData.lastTime,
      folders: folderData.folders,
      context: folderData.context,
      ...(plugin.settings.offlineDeleteSyncEnabled ? { delFolders: folderData.delFolders } : {}),
      ...(folderData.missingFolders.length > 0 ? { missingFolders: folderData.missingFolders } : {}),
    };

    // 第一步：先发 FolderSync，确保文件夹结构先于笔记/附件在本地建立
    // Step 1: Send FolderSync first to ensure folder structure is created before notes/files
    void plugin.websocket.SendMessage("FolderSync", folderSyncData, undefined, () => {
      for (const folder of folderSyncData.folders) {
        plugin.folderSnapshotManager.setFolderMtime(folder.path, Date.now());
      }
    });

    // 第二步：等待 folderSyncDone（FolderSyncEnd 已收到且所有文件夹任务已完成）
    // 超时兜底：10s 后无论如何继续，避免网络异常时挂起
    // Step 2: Wait for folderSyncDone (FolderSyncEnd received and all folder tasks completed)
    // Fallback timeout: continue after 10s regardless, to avoid hanging on network errors
    await new Promise<void>((resolve) => {
      const timeout = window.setTimeout(resolve, 10000)
      const checkInterval = window.setInterval(() => {
        if (!plugin.websocket?.isAuth) {
          window.clearInterval(checkInterval)
          window.clearTimeout(timeout)
          resolve()
          return
        }
        const folderSyncDone = plugin.folderSyncEnd && plugin.folderSyncTasks.completed >= (plugin.folderSyncTasks.needUpload + plugin.folderSyncTasks.needModify + plugin.folderSyncTasks.needSyncMtime + plugin.folderSyncTasks.needDelete)
        if (folderSyncDone) {
          window.clearInterval(checkInterval)
          window.clearTimeout(timeout)
          resolve()
        }
      }, 50)
    })

    // 第三步：文件夹结构已就绪，发 NoteSync 和 FileSync
    // Step 3: Folder structure is ready, now send NoteSync and FileSync
    void plugin.websocket.SendMessage("NoteSync", noteSyncData, undefined, () => {
      for (const note of noteSyncData.notes) {
        plugin.pendingNoteModifies.set(note.path, note.contentHash);
      }
      plugin.localStorageManager.savePending('pendingNoteModifies', plugin.pendingNoteModifies)
    });

    // 如果启用了云预览且未开启类型限制，则不发送 FileSync 请求，从而关闭启动时的 file 同步
    // 若开启了类型限制，则需要发送以同步不受限类型的附件1
    if (!plugin.settings.cloudPreviewEnabled || plugin.settings.cloudPreviewTypeRestricted) {
      void plugin.websocket.SendMessage("FileSync", fileSyncData);
    }

    // 将已删除路径加入 pending set，等待 SyncEnd 确认服务端已处理后再从 hashManager 移除
    // Populate pending delete sets; remove from hashManager only after SyncEnd confirms server processed
    if (plugin.settings.offlineDeleteSyncEnabled) {
      plugin.pendingDeleteNotePaths = new Set(noteData.delNotes.map(i => i.path))
      plugin.pendingDeleteFilePaths = new Set(fileData.delFiles.map(i => i.path))
      plugin.pendingDeleteFolderPaths = new Set(folderData.delFolders.map(i => i.path))
    }
  }

  if (plugin.settings.configSyncEnabled && shouldSyncConfigs) {
    const configSyncData = {
      vault: plugin.settings.vault,
      lastTime: configData.lastTime,
      settings: configData.configs,
      cover: Number(plugin.localStorageManager.getMetadata("lastConfigSyncTime")) == 0,
      context: configData.context,
      ...(plugin.settings.offlineDeleteSyncEnabled ? { delSettings: configData.delConfigs } : {}),
      ...(configData.missingConfigs.length > 0 ? { missingSettings: configData.missingConfigs } : {}),
    };
    void plugin.websocket.SendMessage("SettingSync", configSyncData, undefined, () => {
      for (const config of configSyncData.settings) {
        plugin.pendingConfigModifies.set(config.path, config.contentHash);
      }
      plugin.localStorageManager.savePending('pendingConfigModifies', plugin.pendingConfigModifies)
    });

    // 将已删除配置路径加入 pending set，等待 SettingSyncEnd 确认服务端已处理后再移除
    // Populate pending config delete set; remove from hashManager only after SettingSyncEnd
    if (plugin.settings.offlineDeleteSyncEnabled && plugin.configHashManager && plugin.configHashManager.isReady()) {
      plugin.pendingDeleteConfigPaths = new Set(configData.delConfigs.map(i => i.path))
    }
  }
};
