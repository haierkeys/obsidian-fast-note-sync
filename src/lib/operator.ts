import { TFolder, Notice, normalizePath } from "obsidian";

import { receiveConfigSyncModify, receiveConfigUpload, receiveConfigSyncMtime, receiveConfigSyncDelete, receiveConfigSyncEnd, configAllPaths, configIsPathExcluded } from "./config_operator";
import { receiveFileUpload, receiveFileSyncUpdate, receiveFileSyncDelete, receiveFileSyncMtime, receiveFileSyncChunkDownload, receiveFileSyncEnd } from "./file_operator";
import { receiveNoteSyncModify, receiveNoteUpload, receiveNoteSyncMtime, receiveNoteSyncDelete, receiveNoteSyncEnd } from "./note_operator";
import { hashContent, hashArrayBuffer, dump, isPathExcluded } from "./helps";
import { SyncMode, SnapFile, ReceiveMessage, SyncEndData } from "./types";
import type FastSync from "../main";
import { $ } from "../lang/lang";


export const startupSync = (plugin: FastSync): void => {
  void handleSync(plugin, plugin.settings.isInitSync);
};
export const startupFullSync = async (plugin: FastSync) => {
  void handleSync(plugin);
  await vaultEmptyFoldersClean(plugin);
};

export const resetSettingSyncTime = async (plugin: FastSync) => {
  plugin.settings.lastFileSyncTime = 0;
  plugin.settings.lastNoteSyncTime = 0;
  plugin.settings.lastConfigSyncTime = 0;
  plugin.settings.isInitSync = false;
  plugin.saveSettings();
};

const vaultEmptyFoldersClean = async (plugin: FastSync) => {
  const clean = async (folder: TFolder): Promise<boolean> => {
    let isEmpty = true;
    for (const child of [...folder.children]) {
      if (child instanceof TFolder) {
        if (!(await clean(child))) isEmpty = false;
      } else {
        isEmpty = false;
      }
    }
    if (isEmpty && folder.path !== "/") {
      try {
        await plugin.app.vault.delete(folder);
        return true;
      } catch (e) { }
    }
    return isEmpty;
  };
  const root = plugin.app.vault.getRoot();
  for (const child of root.children) if (child instanceof TFolder) await clean(child);
};

/**
 * 检查同步是否完成
 */
export function checkSyncCompletion(plugin: FastSync, intervalId?: NodeJS.Timeout) {
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

    new Notice($("同步完成"));
    plugin.updateStatusBar($("同步完成"));

    if (plugin.expectedSyncCount > 0 && !plugin.settings.isInitSync) {
      plugin.settings.isInitSync = true;
      plugin.saveSettings();
    }

    setTimeout(() => plugin.updateStatusBar(""), 5000);
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

    const overallPercentage = (totalProgressSum / expectedCount) * 100;

    let statusText = $("同步中");
    if (bufferedAmount > 0) {
      const bufferMB = (bufferedAmount / 1024 / 1024).toFixed(2);
      statusText = `${$("同步中")} (缓冲区: ${bufferMB}MB)`;
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
  ["NoteSyncEnd", (data, plugin) => receiveSyncEndWrapper(data, plugin, "note")],
  ["FileUpload", receiveFileUpload],
  ["FileSyncUpdate", receiveFileSyncUpdate],
  ["FileSyncChunkDownload", receiveFileSyncChunkDownload],
  ["FileSyncDelete", receiveFileSyncDelete],
  ["FileSyncMtime", receiveFileSyncMtime],
  ["FileSyncEnd", (data, plugin) => receiveSyncEndWrapper(data, plugin, "file")],
  ["SettingSyncModify", receiveConfigSyncModify],
  ["SettingSyncNeedUpload", receiveConfigUpload],
  ["SettingSyncMtime", receiveConfigSyncMtime],
  ["SettingSyncDelete", receiveConfigSyncDelete],
  ["SettingSyncEnd", (data, plugin) => receiveSyncEndWrapper(data, plugin, "config")],
]);

/**
 * 统一处理 SyncEnd 消息的装饰器
 */
async function receiveSyncEndWrapper(data: any, plugin: FastSync, type: "note" | "file" | "config") {
  const syncData = data as SyncEndData;
  dump(`Receive ${type} sync end (wrapper):`, syncData);

  // 1. 基础任务计数解析
  const tasks = type === "note" ? plugin.noteSyncTasks : type === "file" ? plugin.fileSyncTasks : plugin.configSyncTasks;
  tasks.needUpload = syncData.needUploadCount || 0;
  tasks.needModify = syncData.needModifyCount || 0;
  tasks.needSyncMtime = syncData.needSyncMtimeCount || 0;
  tasks.needDelete = syncData.needDeleteCount || 0;

  // 2. 详细消息解析与分块统计预估 (仅针对 file 同步)
  if (syncData.messages && syncData.messages.length > 0) {
    for (const msg of syncData.messages) {
      if (msg.action === "FileSyncUpdate") {
        const d = msg.data;
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
    new Notice($("服务已断开"));
    return;
  }
  if (!plugin.getWatchEnabled()) {
    new Notice("上一次的全部同步尚未完成，请耐心等待或检查服务端状态");
    return;
  }

  plugin.syncTypeCompleteCount = 0;
  plugin.resetSyncTasks();
  plugin.totalFilesToDownload = 0;
  plugin.downloadedFilesCount = 0;
  plugin.totalChunksToDownload = 0;
  plugin.downloadedChunksCount = 0;
  plugin.totalChunksToUpload = 0;
  plugin.uploadedChunksCount = 0;
  plugin.disableWatch();

  new Notice($("开始同步"));
  plugin.updateStatusBar($("同步中"), 0, 1);

  const notes: SnapFile[] = [], files: SnapFile[] = [], configs: SnapFile[] = [];
  const shouldSyncNotes = syncMode === "auto" || syncMode === "note";
  const shouldSyncConfigs = syncMode === "auto" || syncMode === "config";

  let expectedCount = 0;
  if (plugin.settings.syncEnabled && shouldSyncNotes) expectedCount += 2;
  if (plugin.settings.configSyncEnabled && shouldSyncConfigs) expectedCount += 1;
  plugin.expectedSyncCount = expectedCount;

  if (plugin.settings.syncEnabled && shouldSyncNotes) {
    const list = plugin.app.vault.getFiles();
    for (const file of list) {
      if (isPathExcluded(file.path, plugin)) continue;
      if (file.extension === "md") {
        if (isLoadLastTime && file.stat.mtime < Number(plugin.settings.lastNoteSyncTime)) continue;
        const contentHash = hashContent(await plugin.app.vault.cachedRead(file));
        const baseHash = plugin.fileHashManager.getPathHash(file.path);
        let item = {
          path: file.path,
          pathHash: hashContent(file.path),
          contentHash: contentHash,
          mtime: file.stat.mtime,
          size: file.stat.size,
          // 始终传递 baseHash 信息，如果不可用则标记 baseHashMissing
          ...(baseHash !== null ? { baseHash } : { baseHashMissing: true }),
        }

        notes.push(item);
      } else {
        if (isLoadLastTime && file.stat.mtime < Number(plugin.settings.lastFileSyncTime)) continue;
        const contentHash = hashArrayBuffer(await plugin.app.vault.readBinary(file));
        const baseHash = plugin.fileHashManager.getPathHash(file.path);
        let item = {
          path: file.path,
          pathHash: hashContent(file.path),
          contentHash: contentHash,
          mtime: file.stat.mtime,
          size: file.stat.size,
          // 始终传递 baseHash 信息，如果不可用则标记 baseHashMissing
          ...(baseHash !== null ? { baseHash } : { baseHashMissing: true }),
        }
        files.push(item);
      }
    }
  }

  const configPaths = plugin.settings.configSyncEnabled && shouldSyncConfigs ? await configAllPaths(plugin.app.vault.configDir, plugin) : [];
  for (const path of configPaths) {
    if (configIsPathExcluded(path, plugin)) continue;
    const fullPath = normalizePath(`${plugin.app.vault.configDir}/${path}`);
    const stat = await plugin.app.vault.adapter.stat(fullPath);
    if (!stat) continue;
    if (isLoadLastTime && stat.mtime < Number(plugin.settings.lastConfigSyncTime)) continue;

    if (path.endsWith(".json") || path.endsWith(".css") || path.endsWith(".js")) {
      configs.push({
        path: path,
        pathHash: hashContent(path),
        contentHash: hashArrayBuffer(await plugin.app.vault.adapter.readBinary(fullPath)),
        mtime: stat.mtime,
        size: stat.size
      });
    }
  }

  // 加入 LocalStorage 同步项
  if (plugin.settings.configSyncEnabled && shouldSyncConfigs) {
    const storageConfigs = await plugin.localStorageManager.getStorageConfigs();
    for (const sc of storageConfigs) {
      configs.push(sc);
    }
  }

  let fileTime = 0, noteTime = 0, configTime = 0;
  if (isLoadLastTime) {
    fileTime = Number(plugin.settings.lastFileSyncTime);
    noteTime = Number(plugin.settings.lastNoteSyncTime);
    configTime = Number(plugin.settings.lastConfigSyncTime);
  }
  handleRequestSend(plugin, noteTime, fileTime, configTime, notes, files, configs, syncMode);

  // 启动进度检测循环,每 100ms 检测一次(更频繁以获得更平滑的进度更新)
  const progressCheckInterval = setInterval(() => {
    checkSyncCompletion(plugin, progressCheckInterval);
  }, 100);
};



/**
 * 发送同步请求
 */
export const handleRequestSend = function (plugin: FastSync, noteLastTime: number, fileLastTime: number, configLastTime: number, notes: SnapFile[] = [], files: SnapFile[] = [], configs: SnapFile[] = [], syncMode: SyncMode = "auto") {
  const shouldSyncNotes = syncMode === "auto" || syncMode === "note";
  const shouldSyncConfigs = syncMode === "auto" || syncMode === "config";

  if (plugin.settings.syncEnabled && shouldSyncNotes) {
    const noteSyncData = {
      vault: plugin.settings.vault,
      lastTime: noteLastTime,
      notes: notes,
    };
    plugin.websocket.MsgSend("NoteSync", noteSyncData);

    const fileSyncData = {
      vault: plugin.settings.vault,
      lastTime: fileLastTime,
      files: files,
    };
    plugin.websocket.MsgSend("FileSync", fileSyncData);
  }

  if (plugin.settings.configSyncEnabled && shouldSyncConfigs) {
    const configSyncData = {
      vault: plugin.settings.vault,
      lastTime: configLastTime,
      settings: configs,
      cover: plugin.settings.lastConfigSyncTime == 0,
    };
    plugin.websocket.MsgSend("SettingSync", configSyncData);
  }
};
