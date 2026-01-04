import { TFolder, Notice, normalizePath } from "obsidian";

import { receiveConfigSyncModify, receiveConfigUpload, receiveConfigSyncMtime, receiveConfigSyncDelete, receiveConfigSyncEnd, configAllPaths, configIsPathExcluded } from "./config_operator";
import { receiveFileUpload, receiveFileSyncUpdate, receiveFileSyncDelete, receiveFileSyncMtime, receiveFileSyncChunkDownload, receiveFileSyncEnd } from "./file_operator";
import { receiveNoteSyncModify, receiveNoteUpload, receiveNoteSyncMtime, receiveNoteSyncDelete, receiveNoteSyncEnd } from "./note_operator";
import { SyncMode, SnapFile, ReceiveMessage } from "./types";
import { hashContent, hashArrayBuffer, dump } from "./helps";
import type FastSync from "../main";
import { $ } from "../lang/lang";


export const startupSync = (plugin: FastSync): void => { void handleSync(plugin); };
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
export function checkSyncCompletion(plugin: FastSync) {
  if (plugin.syncTypeCompleteCount >= plugin.expectedSyncCount && plugin.fileDownloadSessions.size === 0) {
    plugin.enableWatch();
    plugin.syncTypeCompleteCount = 0;
    plugin.totalFilesToDownload = 0;
    plugin.downloadedFilesCount = 0;
    plugin.totalChunksToDownload = 0;
    plugin.downloadedChunksCount = 0;
    new Notice($("同步完成"));
    plugin.updateStatusBar($("同步完成"));
    setTimeout(() => plugin.updateStatusBar(""), 5000);
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
  ["NoteSyncEnd", (data: ReceiveMessage, plugin: FastSync) => receiveNoteSyncEnd(data, plugin, checkSyncCompletion)],
  ["FileUpload", receiveFileUpload],
  ["FileSyncUpdate", receiveFileSyncUpdate],
  ["FileSyncChunkDownload", receiveFileSyncChunkDownload],
  ["FileSyncDelete", receiveFileSyncDelete],
  ["FileSyncMtime", receiveFileSyncMtime],
  ["FileSyncEnd", (data: ReceiveMessage, plugin: FastSync) => receiveFileSyncEnd(data, plugin, checkSyncCompletion)],
  ["SettingSyncModify", receiveConfigSyncModify],
  ["SettingSyncNeedUpload", receiveConfigUpload],
  ["SettingSyncMtime", receiveConfigSyncMtime],
  ["SettingSyncDelete", receiveConfigSyncDelete],
  ["SettingSyncEnd", (data: ReceiveMessage, plugin: FastSync) => receiveConfigSyncEnd(data, plugin, checkSyncCompletion)],
]);



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
  plugin.totalFilesToDownload = 0;
  plugin.downloadedFilesCount = 0;
  plugin.totalChunksToDownload = 0;
  plugin.downloadedChunksCount = 0;
  plugin.totalChunksToUpload = 0;
  plugin.uploadedChunksCount = 0;
  plugin.disableWatch();

  new Notice($("开始同步"));

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

        console.log(baseHash === contentHash, baseHash, contentHash, item);
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
