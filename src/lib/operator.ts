import { TFolder, Notice, normalizePath } from "obsidian";

import { receiveConfigSyncModify, receiveConfigUpload, receiveConfigSyncMtime, receiveConfigSyncDelete, receiveConfigSyncEnd, configAllPaths, configIsPathExcluded } from "./config_operator";
import { receiveFileUpload, receiveFileSyncUpdate, receiveFileSyncDelete, receiveFileSyncMtime, receiveFileSyncChunkDownload, receiveFileSyncEnd } from "./file_operator";
import { receiveNoteSyncModify, receiveNoteUpload, receiveNoteSyncMtime, receiveNoteSyncDelete, receiveNoteSyncEnd } from "./note_operator";
import { SyncMode, SnapFile, ReceiveMessage, SyncEndData } from "./types";
import { hashContent, hashArrayBuffer, dump } from "./helps";
import type FastSync from "../main";
import { $ } from "../lang/lang";


export const startupSync = (plugin: FastSync): void => {
  void handleSync(plugin);
};
export const startupFullSync = async (plugin: FastSync) => {
  void handleSync(plugin);
  await vaultEmptyFoldersClean(plugin);
};

export const resetSettingSyncTime = async (plugin: FastSync) => {
  plugin.settings.lastFileSyncTime = 0;
  plugin.settings.lastNoteSyncTime = 0;
  plugin.settings.lastConfigSyncTime = 0;
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
  const totalTasks = plugin.getTotalTasks();
  const completedTasks = plugin.getCompletedTasks();

  // 检查 WebSocket 缓冲区状态
  const ws = plugin.websocket.ws;
  const bufferedAmount = ws && ws.readyState === WebSocket.OPEN ? ws.bufferedAmount : 0;

  // 计算综合进度(包含任务和分片传输)
  // 任务权重 70%,分片传输权重 30%
  let overallProgress = 0;
  let overallTotal = 100;

  if (totalTasks > 0) {
    const taskProgress = (completedTasks / totalTasks) * 70;
    overallProgress += taskProgress;
  } else {
    overallProgress += 70; // 如果没有任务,任务部分算完成
  }

  // 计算分片传输进度
  const totalChunks = plugin.totalChunksToUpload + plugin.totalChunksToDownload;
  const completedChunks = plugin.uploadedChunksCount + plugin.downloadedChunksCount;

  if (totalChunks > 0) {
    const chunkProgress = (completedChunks / totalChunks) * 30;
    overallProgress += chunkProgress;
  } else {
    overallProgress += 30; // 如果没有分片传输,分片部分算完成
  }


  // 检查是否所有 SyncEnd 消息都已收到
  const allSyncEndReceived = plugin.syncTypeCompleteCount >= plugin.expectedSyncCount;

  // 检查是否所有任务都已完成
  const allTasksCompleted = totalTasks === 0 || completedTasks >= totalTasks;

  // 检查是否所有分片传输都已完成
  const allChunksCompleted = totalChunks === 0 || completedChunks >= totalChunks;

  // 检查是否所有文件下载会话都已完成
  const allDownloadsComplete = plugin.fileDownloadSessions.size === 0;

  // 检查 WebSocket 发送缓冲区是否已清空
  const bufferCleared = bufferedAmount === 0;


  // 修复:移除 allTasksCompleted 检查
  // 原因:任务计数存在时序问题 - SyncEnd 消息设置 totalTasks,但任务可能在此之前已完成
  // 解决方案:只依赖 SyncEnd 消息(服务端确认)+ 分块传输 + 下载会话 + 缓冲区状态
  if (allSyncEndReceived && allChunksCompleted && allDownloadsComplete && bufferCleared) {
    // 清除进度检测定时器
    if (intervalId) {
      clearInterval(intervalId);
    }

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
    setTimeout(() => plugin.updateStatusBar(""), 5000);
  } else {
    // 实时计算准确进度
    let statusText = $("同步中");
    let displayProgress = 0;
    let displayTotal = 100;

    // 基于分片计数和缓冲区状态计算实时进度
    if (totalChunks > 0) {
      // 估算缓冲区中的分片数(假设平均分片大小 512KB)
      const avgChunkSize = 512 * 1024;
      const bufferChunks = Math.ceil(bufferedAmount / avgChunkSize);

      // 实际完成的分片 = 已提交 - 缓冲区中的估算值
      const actualCompletedChunks = Math.max(0, completedChunks - bufferChunks);

      displayProgress = actualCompletedChunks;
      displayTotal = totalChunks;

      if (bufferedAmount > 0) {
        const bufferMB = (bufferedAmount / 1024 / 1024).toFixed(2);
        statusText = `${$("同步中")} (缓冲区: ${bufferMB}MB)`;
      }
    } else if (totalTasks > 0) {
      // 没有分片传输,使用任务进度
      displayProgress = completedTasks;
      displayTotal = totalTasks;
    }

    // 统一更新状态栏(所有进度更新都在这里)
    plugin.updateStatusBar(statusText, displayProgress, displayTotal);
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
  if (type === "note") await receiveNoteSyncEnd(data, plugin);
  else if (type === "file") await receiveFileSyncEnd(data, plugin);
  else if (type === "config") await receiveConfigSyncEnd(data, plugin);

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
          ...(baseHash !== contentHash && baseHash !== null ? { baseHash } : {}),
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
          ...(baseHash !== contentHash && baseHash !== null ? { baseHash } : {}),
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
