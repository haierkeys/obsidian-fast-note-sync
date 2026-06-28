import type { FileDownloadSession } from "../utils/types";

/**
 * Stats for a single sync type (notes / files / configs / folders).
 * 单类同步任务的统计数据（笔记 / 文件 / 配置 / 文件夹）。
 */
export interface SyncTaskStats {
  needUpload: number;   // 需要上传 / Need to upload
  needModify: number;   // 需要修改 / Need to modify
  needSyncMtime: number; // 需要同步时间戳 / Need to sync mtime
  needDelete: number;   // 需要删除 / Need to delete
  completed: number;    // 已完成数量 / Completed count
  chunksReceived?: number; // 已接收的块数量 / Received chunks count
  totalChunks?: number;    // 总块数量 / Total chunks count
}

/**
 * Centralised container for all runtime sync-session state.
 * Eliminates the need to scatter 30+ fields across the FastSync plugin class.
 *
 * 集中管理同步会话的运行时状态，避免在 FastSync 插件类中散落 30+ 个字段。
 */
export class SyncState {
  // ─── Sync-session control flags ──────────────────────────────────────────────
  /** 是否正在执行同步流程 / Whether sync process is running */
  isSyncing = false;
  /** 是否正在发起同步请求 / Whether sync request is being initiated */
  isSyncRequesting = false;
  /** 是否为首次同步 / Whether this is the first sync */
  isFirstSync = false;
  /** 是否启用文件监听 / Whether file watching is enabled */
  isWatchEnabled = true;
  /** 是否正在等待清理确认以便后续同步 / Whether waiting for clear-sync confirmation */
  isWaitClearSync = false;
  /** 当前同步类型 / Current sync type */
  currentSyncType: "full" | "incremental" = "incremental";
  /** 当前活跃的同步上下文 UUID / Current active sync context UUID */
  activeSyncContext: string | null = null;
  /** 用户通过 ribbon 手动触发的待执行同步类型（断开时暂存，重连成功后执行）
   *  Pending sync type triggered manually via ribbon (stored when disconnected, executed after reconnect) */
  pendingSyncType: 'incremental' | 'full' | null = null;

  // ─── Per-type sync task statistics ───────────────────────────────────────────
  noteSyncTasks: SyncTaskStats = { needUpload: 0, needModify: 0, needSyncMtime: 0, needDelete: 0, completed: 0 };
  fileSyncTasks: SyncTaskStats = { needUpload: 0, needModify: 0, needSyncMtime: 0, needDelete: 0, completed: 0 };
  configSyncTasks: SyncTaskStats = { needUpload: 0, needModify: 0, needSyncMtime: 0, needDelete: 0, completed: 0 };
  folderSyncTasks: SyncTaskStats = { needUpload: 0, needModify: 0, needSyncMtime: 0, needDelete: 0, completed: 0 };

  // ─── Overall progress counters ────────────────────────────────────────────────
  syncTypeCompleteCount = 0;  // 已完成同步的类型计数 / Completed sync type count
  expectedSyncCount = 0;      // 预期的同步类型计数 / Expected sync type count
  totalFilesToDownload = 0;   // 待下载文件总数 / Total files to download
  downloadedFilesCount = 0;   // 已下载文件计数 / Downloaded files count
  totalChunksToDownload = 0;  // 待下载分片总数 / Total chunks to download
  downloadedChunksCount = 0;  // 已下载分片计数 / Downloaded chunks count
  totalChunksToUpload = 0;    // 待上传分片总数 / Total chunks to upload
  uploadedChunksCount = 0;    // 已上传分片计数 / Uploaded chunks count
  lastStatusBarPercentage = 0; // 上次状态栏进度百分比 / Last status bar percentage

  // ─── Per-type sync-end flags ─────────────────────────────────────────────────
  noteSyncEnd = false;    // 笔记同步是否完成 / Note sync completed
  fileSyncEnd = false;    // 文件同步是否完成 / File sync completed
  configSyncEnd = false;  // 配置同步是否完成 / Config sync completed
  folderSyncEnd = false;  // 文件夹同步是否完成 / Folder sync completed

  // ─── Pending queues (waiting for server ACK) ──────────────────────────────────
  /**
   * 待确认的文件重命名队列，等待服务端 FileRenameAck 后再更新 hashManager
   * Pending file rename queue, wait for server FileRenameAck before updating hashManager
   */
  pendingFileRenames: { oldPath: string; newPath: string; contentHash: string }[] = [];
  /**
   * 待确认的笔记重命名队列，等待服务端 NoteRenameAck 后再更新 hashManager（FIFO）
   * Pending note rename FIFO queue, update hashManager only after server NoteRenameAck
   */
  pendingNoteRenames: { oldPath: string; newPath: string; contentHash: string }[] = [];
  /**
   * 待确认的文件上传 hash 映射，等待服务端 FileUploadAck 后再写入 hashManager
   * Pending upload hash map, update hashManager only after server FileUploadAck
   */
  pendingUploadHashes = new Map<string, string>();
  /**
   * 待确认的笔记上传 hash 映射，等待服务端 NoteModifyAck 后再写入 hashManager
   * Pending note upload hash map, update hashManager only after server NoteModifyAck
   */
  pendingNoteModifies = new Map<string, string>();
  /** 待服务端 NoteDeleteAck 确认的路径集合 / Paths pending NoteDeleteAck */
  pendingNoteDeleteAcks = new Set<string>();
  /** 待服务端 FileDeleteAck 确认的路径集合 / Paths pending FileDeleteAck */
  pendingFileDeleteAcks = new Set<string>();
  /** 待服务端 SettingDeleteAck 确认的路径集合 / Paths pending SettingDeleteAck */
  pendingConfigDeleteAcks = new Set<string>();
  /**
   * 待确认的配置上传 hash 映射，等待服务端 SettingModifyAck 后再写入 configHashManager
   * Pending config upload hash map, update configHashManager only after server SettingModifyAck
   */
  pendingConfigModifies = new Map<string, string>();

  // ─── Pending delete path sets (cleared on SyncEnd) ───────────────────────────
  /**
   * 待服务端确认删除的路径集合，SyncEnd 到达后再从 hashManager/snapshotManager 移除
   * Pending delete path sets, remove from hashManager/snapshotManager only after SyncEnd
   */
  pendingDeleteNotePaths = new Set<string>();
  pendingDeleteFilePaths = new Set<string>();
  pendingDeleteFolderPaths = new Set<string>();
  pendingDeleteConfigPaths = new Set<string>();

  // ─── Scanned hash caches (committed to HashManager on SyncEnd) ───────────────
  /**
   * 暂存本轮同步扫描过程中新计算出的哈希，待同步结束（SyncEnd）时统一持久化到 HashManager
   * Temporarily store newly calculated hashes during scan, commit to HashManager on SyncEnd
   */
  scannedNoteHashes = new Map<string, { hash: string; mtime: number; size: number }>();
  scannedFileHashes = new Map<string, { hash: string; mtime: number; size: number }>();
  scannedConfigHashes = new Map<string, { hash: string; mtime: number; size: number }>();

  // ─── Watch / tracking sets ────────────────────────────────────────────────────
  /** 忽略的文件集合 / Ignored files set */
  ignoredFiles = new Set<string>();
  /** 忽略的配置文件集合 / Ignored config files set */
  ignoredConfigFiles = new Set<string>();
  /** 最后同步的修改时间 / Last sync mtime map */
  lastSyncMtime = new Map<string, number>();
  /** 通过同步删除的路径 / Paths deleted via sync */
  lastSyncPathDeleted = new Set<string>();
  /** 通过同步重命名的路径 / Paths renamed via sync */
  lastSyncPathRenamed = new Set<string>();
  /** 自动同步定时器 / Auto-sync timer */
  syncTimer: number | null = null;
  /** 文件下载会话管理 / File download session map */
  fileDownloadSessions = new Map<string, FileDownloadSession>();

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * 重置所有任务统计与本轮会话状态
   * Reset all per-session task statistics and sync-end flags
   */
  resetSession() {
    this.noteSyncTasks = { needUpload: 0, needModify: 0, needSyncMtime: 0, needDelete: 0, completed: 0, chunksReceived: 0, totalChunks: 0 };
    this.fileSyncTasks = { needUpload: 0, needModify: 0, needSyncMtime: 0, needDelete: 0, completed: 0, chunksReceived: 0, totalChunks: 0 };
    this.configSyncTasks = { needUpload: 0, needModify: 0, needSyncMtime: 0, needDelete: 0, completed: 0, chunksReceived: 0, totalChunks: 0 };
    this.folderSyncTasks = { needUpload: 0, needModify: 0, needSyncMtime: 0, needDelete: 0, completed: 0, chunksReceived: 0, totalChunks: 0 };
    this.lastStatusBarPercentage = 0;
    this.noteSyncEnd = false;
    this.fileSyncEnd = false;
    this.configSyncEnd = false;
    this.folderSyncEnd = false;
    this.scannedNoteHashes.clear();
    this.scannedFileHashes.clear();
    this.scannedConfigHashes.clear();
  }

  /**
   * 计算总任务数 / Calculate total task count
   */
  getTotalTasks(): number {
    const sum = (t: SyncTaskStats) => t.needUpload + t.needModify + t.needSyncMtime + t.needDelete;
    return sum(this.noteSyncTasks) + sum(this.fileSyncTasks) + sum(this.configSyncTasks) + sum(this.folderSyncTasks);
  }

  /**
   * 计算已完成任务数 / Calculate completed task count
   */
  getCompletedTasks(): number {
    return this.noteSyncTasks.completed + this.fileSyncTasks.completed
      + this.configSyncTasks.completed + this.folderSyncTasks.completed;
  }
}
