import { TFolder, TFile, Notice, normalizePath } from "obsidian";

import { receiveFileUpload, receiveFileSyncUpdate, receiveFileSyncDelete, receiveFileSyncMtime, receiveFileSyncChunkDownload, receiveFileSyncEnd, checkAndUploadAttachments, receiveFileSyncRename } from "./file_operator";
import { receiveConfigSyncModify, receiveConfigUpload, receiveConfigSyncMtime, receiveConfigSyncDelete, receiveConfigSyncEnd, configAllPaths, receiveConfigSyncClear } from "./config_operator";
import { receiveNoteSyncModify, receiveNoteUpload, receiveNoteSyncMtime, receiveNoteSyncDelete, receiveNoteSyncEnd, receiveNoteSyncRename } from "./note_operator";
import { SyncMode, SnapFile, SnapFolder, SyncEndData, PathHashFile, NoteSyncData, FileSyncData, ConfigSyncData, FolderSyncData } from "./types";
import { receiveFolderSyncModify, receiveFolderSyncDelete, receiveFolderSyncRename, receiveFolderSyncEnd } from "./folder_operator";
import { hashContent, hashArrayBuffer, dump, isPathExcluded, configIsPathExcluded, getConfigSyncCustomDirs } from "./helps";
import type FastSync from "../main";
import { $ } from "../lang/lang";


export const startupSync = (plugin: FastSync): void => {
  void handleSync(plugin, plugin.localStorageManager.getMetadata("isInitSync"));
};
export const startupFullSync = async (plugin: FastSync) => {
  void handleSync(plugin);
};

export const resetSettingSyncTime = async (plugin: FastSync) => {
  plugin.localStorageManager.setMetadata("lastFileSyncTime", 0);
  plugin.localStorageManager.setMetadata("lastNoteSyncTime", 0);
  plugin.localStorageManager.setMetadata("lastConfigSyncTime", 0);
  plugin.localStorageManager.setMetadata("lastFolderSyncTime", 0);
  plugin.localStorageManager.setMetadata("isInitSync", false);
};



/**
 * 检查同步是否完成
 */
export function checkSyncCompletion(plugin: FastSync, intervalId?: ReturnType<typeof setTimeout>) {
  const ws = plugin.websocket.ws;
  const bufferedAmount = ws && ws.readyState === WebSocket.OPEN ? ws.bufferedAmount : 0;

  // 检查是否满足所有完成条件
  const allSyncEndReceived = plugin.syncTypeCompleteCount >= plugin.expectedSyncCount;
  const totalChunks = plugin.totalChunksToUpload + plugin.totalChunksToDownload;
  const completedChunks = plugin.uploadedChunksCount + plugin.downloadedChunksCount;
  const allChunksCompleted = totalChunks === 0 || completedChunks >= totalChunks;
  const allDownloadsComplete = plugin.fileDownloadSessions.size === 0;
  const bufferCleared = bufferedAmount === 0;

  if (allSyncEndReceived && allChunksCompleted && allDownloadsComplete && bufferCleared) {
    if (intervalId) clearInterval(intervalId);

    plugin.enableWatch();
    plugin.syncTypeCompleteCount = 0;
    plugin.resetSyncTasks();
    plugin.totalFilesToDownload = 0;
    plugin.downloadedFilesCount = 0;
    plugin.totalChunksToDownload = 0;
    plugin.downloadedChunksCount = 0;
    plugin.totalChunksToUpload = 0;
    plugin.uploadedChunksCount = 0;

    if (plugin.settings.showSyncNotice) {
      new Notice($("ui.status.completed"));
    }
    plugin.updateStatusBar($("ui.status.completed"));

    if (plugin.expectedSyncCount > 0 && !plugin.localStorageManager.getMetadata("isInitSync")) {
      plugin.localStorageManager.setMetadata("isInitSync", true);
    }

    // 如果开启了云预览，在首次同步后检查所有附件在服务端的状态
    if (plugin.settings.cloudPreviewEnabled) {
      checkAndUploadAttachments(plugin);
    }

    setTimeout(() => plugin.updateStatusBar(""), 3000);
  } else {
    // 实时计算加权进度，防止由于任务总数突增导致的百分比回跳
    let totalProgressSum = 0;
    const expectedCount = Math.max(1, plugin.expectedSyncCount);

    // 1. 笔记同步进度
    if (plugin.settings.syncEnabled) {
      const noteTasks = plugin.noteSyncTasks;
      const total = noteTasks.needUpload + noteTasks.needModify + noteTasks.needSyncMtime + noteTasks.needDelete;
      if (!plugin.noteSyncEnd) {
        totalProgressSum += 0; // 尚未收到结束通知，该项进度为 0
      } else {
        totalProgressSum += total > 0 ? noteTasks.completed / total : 1;
      }
    }

    // 2. 文件同步进度 (包含分片和缓冲区)
    if (plugin.settings.syncEnabled) {
      const fileTasks = plugin.fileSyncTasks;
      const taskTotal = fileTasks.needUpload + fileTasks.needModify + fileTasks.needSyncMtime + fileTasks.needDelete;
      if (!plugin.fileSyncEnd) {
        totalProgressSum += 0;
      } else {
        // 计算分片进度，考虑缓冲区
        const avgChunkSize = 512 * 1024;
        const bufferChunks = Math.ceil(bufferedAmount / avgChunkSize);
        const actualUploadedChunks = Math.max(0, plugin.uploadedChunksCount - bufferChunks);
        const doneChunks = actualUploadedChunks + plugin.downloadedChunksCount;

        const unitsTotal = taskTotal + totalChunks;
        const unitsDone = fileTasks.completed + doneChunks;
        totalProgressSum += unitsTotal > 0 ? unitsDone / unitsTotal : 1;
      }
    }

    // 3. 配置同步进度
    if (plugin.settings.configSyncEnabled) {
      const configTasks = plugin.configSyncTasks;
      const total = configTasks.needUpload + configTasks.needModify + configTasks.needSyncMtime + configTasks.needDelete;
      if (!plugin.configSyncEnd) {
        totalProgressSum += 0;
      } else {
        totalProgressSum += total > 0 ? configTasks.completed / total : 1;
      }
    }

    // 4. 文件夹同步进度
    if (plugin.settings.syncEnabled) {
      const folderTasks = plugin.folderSyncTasks;
      const total = folderTasks.needUpload + folderTasks.needModify + folderTasks.needSyncMtime + folderTasks.needDelete;
      if (!plugin.folderSyncEnd) {
        totalProgressSum += 0;
      } else {
        totalProgressSum += total > 0 ? folderTasks.completed / total : 1;
      }
    }

    const overallPercentage = (totalProgressSum / expectedCount) * 100;

    let statusText = $("ui.status.syncing");
    if (bufferedAmount > 0) {
      const bufferMB = (bufferedAmount / 1024 / 1024).toFixed(2);
      statusText = `${$("ui.status.syncing")} (缓冲区: ${bufferMB}MB)`;
    }

    // 使用 100 做分母，overallPercentage 做分子
    plugin.updateStatusBar(statusText, Math.floor(overallPercentage), 100);
  }
}
/**
 * 消息接收调度
 */

type ReceiveOperator = (data: any, plugin: FastSync) => void | Promise<void>;
export const receiveOperators: Map<string, ReceiveOperator> = new Map([
  ["NoteSyncModify", receiveNoteSyncModify],
  ["NoteSyncNeedPush", receiveNoteUpload],
  ["NoteSyncMtime", receiveNoteSyncMtime],
  ["NoteSyncDelete", receiveNoteSyncDelete],
  ["NoteSyncRename", receiveNoteSyncRename],
  ["NoteSyncEnd", (data, plugin) => receiveSyncEndWrapper(data, plugin, "note")],
  ["FileUpload", receiveFileUpload],
  ["FileSyncUpdate", receiveFileSyncUpdate],
  ["FileSyncChunkDownload", receiveFileSyncChunkDownload],
  ["FileSyncDelete", receiveFileSyncDelete],
  ["FileSyncRename", receiveFileSyncRename],
  ["FileSyncMtime", receiveFileSyncMtime],
  ["FileSyncEnd", (data, plugin) => receiveSyncEndWrapper(data, plugin, "file")],
  ["SettingSyncModify", receiveConfigSyncModify],
  ["SettingSyncNeedUpload", receiveConfigUpload],
  ["SettingSyncMtime", receiveConfigSyncMtime],
  ["SettingSyncDelete", receiveConfigSyncDelete],
  ["SettingSyncEnd", (data, plugin) => receiveSyncEndWrapper(data, plugin, "config")],
  ["SettingSyncClear", receiveConfigSyncClear],
  ["FolderSyncModify", receiveFolderSyncModify],
  ["FolderSyncDelete", receiveFolderSyncDelete],
  ["FolderSyncRename", receiveFolderSyncRename],
  ["FolderSyncEnd", (data, plugin) => receiveSyncEndWrapper(data, plugin, "folder")],
]);

/**
 * 统一处理 SyncEnd 消息的装饰器
 */
async function receiveSyncEndWrapper(data: any, plugin: FastSync, type: "note" | "file" | "config" | "folder") {
  const syncData = data as SyncEndData;
  dump(`Receive ${type} sync end (wrapper):`, syncData);

  // 1. 基础任务计数解析
  const tasks = type === "note" ? plugin.noteSyncTasks : type === "file" ? plugin.fileSyncTasks : type === "config" ? plugin.configSyncTasks : plugin.folderSyncTasks;
  tasks.needUpload = syncData.needUploadCount || 0;
  tasks.needModify = syncData.needModifyCount || 0;
  tasks.needSyncMtime = syncData.needSyncMtimeCount || 0;
  tasks.needDelete = syncData.needDeleteCount || 0;

  // 2. 详细消息解析与分块统计预估 (仅针对 file 同步)
  if (syncData.messages && syncData.messages.length > 0) {
    for (const msg of syncData.messages) {
      if (msg.action === "FileSyncUpdate") {
        const d = msg.data;
        // 如果开启了云端预览并且是受限类型，不需要下载它，但在计算总量时暂不排除
        // 因为 receiveFileSyncUpdate 会根据 setting 处理下载动作
        const totalChunks = Math.ceil(d.size / (d.chunkSize || 1024 * 1024));
        plugin.totalChunksToDownload += totalChunks;
      } else if (msg.action === "FileUpload") {
        const d = msg.data;
        const file = plugin.app.vault.getFileByPath(normalizePath(d.path));
        if (file) {
          const totalChunks = Math.ceil(file.stat.size / (d.chunkSize || 1024 * 1024));
          plugin.totalChunksToUpload += totalChunks;
        }
      }
    }
  }

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

  // 4. 异步启动子任务处理
  if (syncData.messages && syncData.messages.length > 0) {
    processSyncMessages(syncData.messages, plugin);
  }
}

/**
 * 统一分发子任务消息
 */
async function processSyncMessages(messages: any[], plugin: FastSync) {
  for (const msg of messages) {
    const handler = receiveOperators.get(msg.action);
    if (handler) {
      await handler(msg.data, plugin);
      await sleep(2)
    }
  }
}



/**
 * 启动全量/增量同步
 */
export const handleSync = async function (plugin: FastSync, isLoadLastTime: boolean = false, syncMode: SyncMode = "auto") {
  if (!plugin.menuManager.ribbonIconStatus) {
    new Notice($("setting.remote.disconnected"));
    return;
  }
  if (!plugin.getWatchEnabled()) {
    new Notice($("ui.status.last_sync_not_completed"));
    return;
  }

  if (plugin.settings.readonlySyncEnabled) {
    dump("Read-only mode enabled, skipping sync preparation.");
    return;
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
  plugin.disableWatch();

  if (plugin.settings.showSyncNotice && (plugin.settings.syncEnabled || plugin.settings.configSyncEnabled)) {
    new Notice($("ui.status.starting"));
  }
  plugin.updateStatusBar($("ui.status.syncing"), 0, 1);

  const notes: SnapFile[] = [], files: SnapFile[] = [], configs: SnapFile[] = [], folders: SnapFolder[] = [];
  const delNotes: PathHashFile[] = [], delFiles: PathHashFile[] = [], delConfigs: PathHashFile[] = [], delFolders: PathHashFile[] = [];
  const missingNotes: PathHashFile[] = [], missingFiles: PathHashFile[] = [], missingConfigs: PathHashFile[] = [], missingFolders: PathHashFile[] = [];
  const shouldSyncNotes = syncMode === "auto" || syncMode === "note";
  const shouldSyncConfigs = syncMode === "auto" || syncMode === "config";

  let expectedCount = 0;
  if (plugin.settings.syncEnabled && shouldSyncNotes) {
    expectedCount += 1; // NoteSync
    expectedCount += 1; // FolderSync
    // 如果启用了云预览，FileSync 请求不发送，因此不计入预期计数
    if (!plugin.settings.cloudPreviewEnabled) {
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

  if (plugin.settings.syncEnabled && shouldSyncNotes) {
    const list = plugin.app.vault.getAllLoadedFiles();
    for (const file of list) {
      if (isPathExcluded(file.path, plugin)) continue;
      if (file instanceof TFolder) {
        if (file.path === "/") continue;

        // 使用虚拟化 mtime：优先从快照读取，若是新路径则用当前时间
        let mtime = plugin.folderSnapshotManager.getMtime(file.path) || Date.now();

        if (isLoadLastTime && mtime < Number(plugin.localStorageManager.getMetadata("lastFolderSyncTime"))) continue;

        folders.push({
          path: file.path,
          pathHash: hashContent(file.path),
        });
        continue;
      }

      if (file instanceof TFile) {
        if (file.extension === "md") {
          if (isLoadLastTime && file.stat.mtime < Number(plugin.localStorageManager.getMetadata("lastNoteSyncTime"))) continue;
          const contentHash = hashContent(await plugin.app.vault.cachedRead(file));
          const baseHash = plugin.fileHashManager.getPathHash(file.path);
          let item = {
            path: file.path,
            pathHash: hashContent(file.path),
            contentHash: contentHash,
            mtime: file.stat.mtime,
            ctime: file.stat.ctime,
            size: file.stat.size,
            // 始终传递 baseHash 信息，如果不可用则标记 baseHashMissing
            ...(baseHash !== null ? { baseHash } : { baseHashMissing: true }),
          }

          notes.push(item);
        } else {
          if (isLoadLastTime && file.stat.mtime < Number(plugin.localStorageManager.getMetadata("lastFileSyncTime"))) continue;
          const contentHash = hashArrayBuffer(await plugin.app.vault.readBinary(file));
          const baseHash = plugin.fileHashManager.getPathHash(file.path);
          let item = {
            path: file.path,
            pathHash: hashContent(file.path),
            contentHash: contentHash,
            mtime: file.stat.mtime,
            ctime: file.stat.ctime,
            size: file.stat.size,
            // 始终传递 baseHash 信息，如果不可用则标记 baseHashMissing
            ...(baseHash !== null ? { baseHash } : { baseHashMissing: true }),
          }
          files.push(item);
        }
      }
    }

    // 检测被删除的文件 (对比哈希表和本地 Vault)
    if (plugin.settings.offlineDeleteSyncEnabled) {
      const trackedPaths = plugin.fileHashManager.getAllPaths();
      const localPathsSet = new Set(list.map(f => f.path)); // 优化：使用 Set 提高查找效率
      for (const path of trackedPaths) {
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
        for (const path of trackedFolderPaths) {
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
      for (const path of trackedPaths) {
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
        for (const path of trackedFolderPaths) {
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

  //测试
  for (const path of configPaths) {
    if (configIsPathExcluded(path, plugin)) continue;
    const fullPath = normalizePath(path);
    const stat = await plugin.app.vault.adapter.stat(fullPath);
    if (!stat) continue;
    if (isLoadLastTime && stat.mtime < Number(plugin.localStorageManager.getMetadata("lastConfigSyncTime"))) continue;
    configs.push({
      path: path,
      pathHash: hashContent(path),
      contentHash: hashArrayBuffer(await plugin.app.vault.adapter.readBinary(fullPath)),
      mtime: stat.mtime,
      ctime: stat.ctime,
      size: stat.size
    });
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

  handleRequestSend(plugin, syncMode, noteData, fileData, configData, folderData);

  // 启动进度检测循环,每 100ms 检测一次(更频繁以获得更平滑的进度更新)
  const progressCheckInterval = setInterval(() => {
    checkSyncCompletion(plugin, progressCheckInterval);
  }, 100);
};


/**
 * 发送同步请求
 */
export const handleRequestSend = function (plugin: FastSync, syncMode: SyncMode, noteData: NoteSyncData, fileData: FileSyncData, configData: ConfigSyncData, folderData: FolderSyncData) {
  const shouldSyncNotes = syncMode === "auto" || syncMode === "note";
  const shouldSyncConfigs = syncMode === "auto" || syncMode === "config";

  if (plugin.settings.syncEnabled && shouldSyncNotes) {


    const noteSyncData = {
      vault: plugin.settings.vault,
      lastTime: noteData.lastTime,
      notes: noteData.notes,
      ...(plugin.settings.offlineDeleteSyncEnabled ? { delNotes: noteData.delNotes } : {}),
      ...(noteData.missingNotes.length > 0 ? { missingNotes: noteData.missingNotes } : {}),
    };
    plugin.websocket.SendMessage("NoteSync", noteSyncData);

    const fileSyncData = {
      vault: plugin.settings.vault,
      lastTime: fileData.lastTime,
      files: fileData.files,
      ...(plugin.settings.offlineDeleteSyncEnabled ? { delFiles: fileData.delFiles } : {}),
      ...(fileData.missingFiles.length > 0 ? { missingFiles: fileData.missingFiles } : {}),
    };
    // 如果启用了云预览,则不发送 FileSync 请求,从而关闭启动时的 file 同步
    if (!plugin.settings.cloudPreviewEnabled) {
      plugin.websocket.SendMessage("FileSync", fileSyncData);
    }

    const folderSyncData = {
      vault: plugin.settings.vault,
      lastTime: folderData.lastTime,
      folders: folderData.folders,
      ...(plugin.settings.offlineDeleteSyncEnabled ? { delFolders: folderData.delFolders } : {}),
      ...(folderData.missingFolders.length > 0 ? { missingFolders: folderData.missingFolders } : {}),
    };
    plugin.websocket.SendMessage("FolderSync", folderSyncData);

    // 清理已删除文件的本地哈希数据,防止重复检测
    if (plugin.settings.offlineDeleteSyncEnabled) {
      for (const item of noteData.delNotes) plugin.fileHashManager.removeFileHash(item.path);
      for (const item of fileData.delFiles) plugin.fileHashManager.removeFileHash(item.path);
      for (const item of folderData.delFolders) plugin.folderSnapshotManager.removeFolder(item.path);
    }
  }

  if (plugin.settings.configSyncEnabled && shouldSyncConfigs) {
    const configSyncData = {
      vault: plugin.settings.vault,
      lastTime: configData.lastTime,
      settings: configData.configs,
      cover: Number(plugin.localStorageManager.getMetadata("lastConfigSyncTime")) == 0,
      ...(plugin.settings.offlineDeleteSyncEnabled ? { delSettings: configData.delConfigs } : {}),
      ...(configData.missingConfigs.length > 0 ? { missingSettings: configData.missingConfigs } : {}),
    };
    plugin.websocket.SendMessage("SettingSync", configSyncData);

    // 清理已删除配置的本地哈希数据,防止重复检测
    if (plugin.settings.offlineDeleteSyncEnabled && plugin.configHashManager && plugin.configHashManager.isReady()) {
      for (const item of configData.delConfigs) plugin.configHashManager.removeFileHash(item.path);
    }
  }
};
