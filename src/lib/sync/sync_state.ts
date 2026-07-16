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
  completed: number;    // 已处理数量（含成功与失败，驱动完成判定/翻页 ACK，语义不变） / Processed count (success + failure; drives completion detection / page ACK, semantics unchanged)
  failed: number;       // 其中处理失败的数量，仅用于统计展示，不参与完成判定 / Subset that failed; stats-only, does not affect completion detection
}

/**
 * Centralised container for all runtime sync-session state.
 * Eliminates the need to scatter 30+ fields across the FastSync plugin class.
 *
 * 集中管理同步会话的运行时状态，避免在 FastSync 插件类中散落 30+ 个字段。
 */
export class SyncState {
  /** 发生冲突且等待手动解决的笔记路径集合，用于在解决前抑制重复上传和弹窗 / Paths with pending conflict resolution */
  public conflictedPaths: Set<string> = new Set();

  // ─── Chunk size settings from server ─────────────────────────────────────────
  /** 上传分片数量 / Upload chunk size from server */
  syncUpChunkNum = 100;
  /** 下载分片数量 / Download chunk size from server */
  syncDownChunkNum = 50;
  /** 上行流水线窗口（协商值），0 = stop-and-wait（默认关闭，等 auth 协商块覆盖） / Upload pipeline window (negotiated), 0 = stop-and-wait */
  pipelineWindowUp = 0;
  /** 下行流水线窗口（协商值），0 = stop-and-wait（默认关闭，等 auth 协商块覆盖） / Download pipeline window (negotiated), 0 = stop-and-wait */
  pipelineWindowDown = 0;
  /** 本次连接是否已完成 pv2 协商（auth 响应携带协商块）/ Whether this connection completed pv2 negotiation (auth response carried a negotiation block) */
  negotiated = false;

  // ─── C3 多页在途归属：completed 计数的 pageIndex 透传通道 ─────────────────────
  /**
   * 瞬时字段：FastSync.recordSyncCompleted() 在自增 xxxSyncTasks.completed 前写入，
   * 由 onCompletedChange（同一同步调用栈内触发，无 await 间隙）读取后立即清空，
   * 用于把 pageIndex 从调用点"смuggle"到 Proxy 的 set trap 回调里，无需改动 Proxy 签名。
   * Transient field: FastSync.recordSyncCompleted() writes it right before incrementing
   * xxxSyncTasks.completed; onCompletedChange (fired synchronously in the same call stack, no
   * await in between) reads and clears it immediately. Smuggles pageIndex from the call site into
   * the Proxy's set-trap callback without changing the Proxy's signature.
   */
  pendingCompletionPageIndex: number | undefined = undefined;

  /**
   * NeedPush 驱动的上传-回执往返（NoteSyncNeedPush/FileUpload/SettingSyncNeedUpload → 对应 Ack）
   * 中，Ack 消息本身不携带 pageIndex（它是响应客户端自己发起的上传请求，不是服务端下行页推送）。
   * 在 NeedPush 明细到达时按 path 记下其所属 pageIndex，等对应 Ack 到达时查表消费，
   * 从而把该条目的完成正确归账到发起它的下载页（供 ack 水位线正确推进）。
   * 查不到（本地用户自发编辑触发的 Ack，非服务端 NeedPush 驱动）时退回不带 pageIndex 的旧路径，
   * 语义正确（这类条目本就不属于任何页）。
   *
   * In the NeedPush-driven upload/ack round trip, the Ack message itself carries no pageIndex (it
   * responds to the client's own upload request, not a server-side page push). Record the
   * originating pageIndex by path when the NeedPush detail arrives; consume it when the matching
   * Ack arrives, so the completion is attributed to the correct download page (needed for the ack
   * watermark to advance correctly). A miss (Ack from a local user-initiated edit, not server
   * NeedPush) correctly falls back to the pageIndex-less legacy path — such items never belonged to
   * a page in the first place.
   */
  pendingNotePushPageIndex = new Map<string, number>();
  pendingFilePushPageIndex = new Map<string, number>();
  pendingConfigPushPageIndex = new Map<string, number>();

  // ─── Sync-session control flags ──────────────────────────────────────────────
  /** 是否正在执行同步流程 / Whether sync process is running */
  isSyncing = false;
  /** 是否正在发起同步请求 / Whether sync request is being initiated */
  isSyncRequesting = false;
  /** 是否为首次同步 / Whether this is the first sync */
  isFirstSync = false;
  /** 是否正在等待清理确认以便后续同步 / Whether waiting for clear-sync confirmation */
  isWaitClearSync = false;
  /** 当前同步类型 / Current sync type */
  currentSyncType: "full" | "incremental" = "incremental";
  /** 当前活跃的同步上下文 UUID / Current active sync context UUID */
  activeSyncContext: string | null = null;
  /** 用户通过 ribbon 手动触发的待执行同步类型（断开时暂存，重连成功后执行）
   *  Pending sync type triggered manually via ribbon (stored when disconnected, executed after reconnect) */
  pendingSyncType: 'incremental' | 'full' | null = null;
  /**
   * C9: 本轮同步中是否有类型被离线超墓碑期保护拦截（用户点击「取消」）。
   * checkSyncCompletion 需据此判断本轮是否可信地"完成"，避免无条件刷新 lastSyncSuccessTime
   * 导致离线时长被清零、下一轮保护形同虚设。
   * C9: whether any type was intercepted by the offline tombstone-retention guard this round
   * (user clicked "Cancel"). checkSyncCompletion uses this to decide whether the round can be
   * trusted as genuinely "complete", so it doesn't unconditionally refresh lastSyncSuccessTime and
   * silently reset the offline duration, defeating the guard on the very next round.
   */
  offlineGuardSkippedThisRound = false;

  // ─── Per-type sync task statistics ───────────────────────────────────────────
  onCompletedChange?: (type: "note" | "file" | "setting" | "folder") => void;

  private createStatsProxy(type: "note" | "file" | "setting" | "folder", initVal: SyncTaskStats): SyncTaskStats {
    return new Proxy(initVal, {
      set: (target, prop, value, receiver) => {
        const oldVal = Reflect.get(target, prop, receiver) as number;
        const success = Reflect.set(target, prop, value, receiver);
        if (success && prop === "completed" && value !== oldVal) {
          if (this.onCompletedChange) {
            this.onCompletedChange(type);
          }
        }
        return success;
      }
    });
  }

  private _noteSyncTasks = this.createStatsProxy("note", { needUpload: 0, needModify: 0, needSyncMtime: 0, needDelete: 0, completed: 0, failed: 0 });
  get noteSyncTasks() { return this._noteSyncTasks; }
  set noteSyncTasks(v: SyncTaskStats) { this._noteSyncTasks = this.createStatsProxy("note", v); }

  private _fileSyncTasks = this.createStatsProxy("file", { needUpload: 0, needModify: 0, needSyncMtime: 0, needDelete: 0, completed: 0, failed: 0 });
  get fileSyncTasks() { return this._fileSyncTasks; }
  set fileSyncTasks(v: SyncTaskStats) { this._fileSyncTasks = this.createStatsProxy("file", v); }

  private _configSyncTasks = this.createStatsProxy("setting", { needUpload: 0, needModify: 0, needSyncMtime: 0, needDelete: 0, completed: 0, failed: 0 });
  get configSyncTasks() { return this._configSyncTasks; }
  set configSyncTasks(v: SyncTaskStats) { this._configSyncTasks = this.createStatsProxy("setting", v); }

  private _folderSyncTasks = this.createStatsProxy("folder", { needUpload: 0, needModify: 0, needSyncMtime: 0, needDelete: 0, completed: 0, failed: 0 });
  get folderSyncTasks() { return this._folderSyncTasks; }
  set folderSyncTasks(v: SyncTaskStats) { this._folderSyncTasks = this.createStatsProxy("folder", v); }

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
   * 待确认的笔记重命名映射，key 为 newPath，等待服务端 NoteRenameAck（按 path 精确匹配）后再更新 hashManager；
   * 老服务端不下发 path 时回退 FIFO（按 Map 插入顺序取首个）
   * Pending note rename map keyed by newPath, update hashManager only after server NoteRenameAck
   * (matched precisely by path); falls back to FIFO (first inserted entry) when legacy server omits path
   */
  pendingNoteRenames: Map<string, { oldPath: string; newPath: string; contentHash: string }> = new Map();
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
  /** 进度检测定时器 ID，供取消同步时使用 / Progress check interval ID for sync cancellation */
  progressCheckIntervalId: number | null = null;
  /** 文件下载会话管理 / File download session map */
  fileDownloadSessions = new Map<string, FileDownloadSession>();

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * 重置所有任务统计与本轮会话状态
   * Reset all per-session task statistics and sync-end flags
   */
  resetSession() {
    if (this.progressCheckIntervalId !== null) {
      window.clearInterval(this.progressCheckIntervalId);
      this.progressCheckIntervalId = null;
    }
    this.noteSyncTasks = { needUpload: 0, needModify: 0, needSyncMtime: 0, needDelete: 0, completed: 0, failed: 0 };
    this.fileSyncTasks = { needUpload: 0, needModify: 0, needSyncMtime: 0, needDelete: 0, completed: 0, failed: 0 };
    this.configSyncTasks = { needUpload: 0, needModify: 0, needSyncMtime: 0, needDelete: 0, completed: 0, failed: 0 };
    this.folderSyncTasks = { needUpload: 0, needModify: 0, needSyncMtime: 0, needDelete: 0, completed: 0, failed: 0 };
    this.lastStatusBarPercentage = 0;
    this.noteSyncEnd = false;
    this.fileSyncEnd = false;
    this.configSyncEnd = false;
    this.folderSyncEnd = false;
    this.offlineGuardSkippedThisRound = false;
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
