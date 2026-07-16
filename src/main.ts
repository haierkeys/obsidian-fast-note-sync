import { Plugin, Platform, addIcon } from "obsidian";

import { dump, dumpError, checkAndNotifyCaseConflict, setLogEnabled, isPathMatch, parseRules, stringifyRules, getPluginDir, showSyncNotice, loadApiToken, saveApiToken, loadApiUrl, saveApiUrl, loadVault, saveVault, loadAutoRedirect, saveAutoRedirect, loadWsPreProbe, saveWsPreProbe, obfuscateToken } from "./lib/utils/helpers";
import { clearAllTempChunks, abortAllFileOperations, resetFileOperations } from "./lib/sync/operator_file";
import { SettingTab, PluginSettings, DEFAULT_SETTINGS } from "./setting";
import { SyncLogView, SYNC_LOG_VIEW_TYPE } from "./views/sync-log-view";
import { ShareIndicatorManager } from "./lib/ui/share_indicator_manager";
import { FolderSnapshotManager } from "./lib/storage/folder_snapshot_manager";
import { AppWithInternal } from "./lib/utils/types";
import { LocalStorageManager } from "./lib/storage/local_storage_manager";
import { ConcurrencyLimiter } from "./lib/sync/concurrency_limiter";
import { ConfigHashManager } from "./lib/storage/config_hash_manager";
import { RecycleBinModal } from "./views/recycle-bin-modal";
import { FileCloudPreview } from "./lib/storage/file_cloud_preview";
import { FileHashManager } from "./lib/storage/file_hash_manager";
import { DebugLogManager } from "./lib/utils/debug_log_manager";
import { SyncLogManager } from "./lib/sync/sync_log_manager";
import { DebugLogModal } from "./views/debug-log-modal";
import { VersionManager } from "./lib/utils/version_manager";
import { ConfigManager } from "./lib/sync/config_manager";
import { EventManager } from "./lib/utils/events_manager";
import { WebSocketManager } from "./lib/sync/websocket_manager";
import { MenuManager } from "./lib/ui/menu_manager";
import { LockManager } from "./lib/sync/lock_manager";
import { handleSync, cancelSync } from "./lib/sync/operator";
import { cleanupConfigReloadTimer } from "./lib/sync/operator_config";
import { HttpApiService } from "./lib/api/http_api_service";
import { SyncState } from "./lib/sync/sync_state";
import { RuntimeConfig } from "./lib/sync/runtime_config";
import { $ } from "./i18n/lang";
import { SsoImportModal } from "./views/sso-import-modal";
import { StatusBarManager } from "./lib/ui/status_bar_manager";
import { SyncProgressTracker } from "./lib/sync/sync_progress_tracker";



interface LegacySettings extends Partial<PluginSettings> {
  apiToken?: string;
  api?: string;
  vault?: string;
  autoRedirectEnabled?: boolean;
  wsPreProbeEnabled?: boolean;
  syncExcludeFolders?: string;
  configExclude?: string;
  configExcludeWhitelist?: string;
  showSyncNotice?: boolean;
}


export default class FastSync extends Plugin {
  // ─── Obsidian Plugin lifecycle + Manager instances ───────────────────────────
  settingTab: SettingTab                           // 设置面板
  settings: PluginSettings                        // 插件设置
  api: HttpApiService                             // HTTP API 服务
  websocket: WebSocketManager                     // WebSocket 客户端
  versionManager: VersionManager                  // 版本提示与自动升级管理器
  configManager: ConfigManager                    // 配置管理器
  lockManager: LockManager                        // 锁管理器
  concurrencyLimiter: ConcurrencyLimiter          // 并发管理器
  eventManager: EventManager                      // 事件管理器
  menuManager: MenuManager                        // 菜单管理器
  shareIndicatorManager: ShareIndicatorManager    // 分享指示器管理器 / Share indicator manager
  fileHashManager: FileHashManager                // 文件哈希管理器
  configHashManager: ConfigHashManager            // 配置哈希管理器
  localStorageManager: LocalStorageManager        // 本地存储管理器
  fileCloudPreview: FileCloudPreview              // 云端文件预览管理器
  folderSnapshotManager: FolderSnapshotManager    // 文件夹快照管理器
  statusBarManager: StatusBarManager              // 状态栏管理器
  readonly progressTracker = new SyncProgressTracker() // 进度追踪器
  private menuManagerInitialized = false          // 防止 onLayoutReady 重复初始化 / Guard against duplicate onLayoutReady init

  // ─── Aggregated state objects (replaces 30+ scattered fields) ────────────────
  /** 同步会话运行时状态 / Sync-session runtime state */
  readonly syncState = new SyncState()

  // ─── Sync page state tracking ───────────────────────────────────────────────
  /**
   * 追踪每个同步类型的当前下载分页状态
   */
  readonly syncPageStateMap = new Map<string, {
    pageIndex: number;
    pageSize: number;
    totalCount: number;
    isLast: boolean;
    completedCount: number;
    context: string;
  }>();

  setupProgressTracker() {
    this.progressTracker.onPageComplete = (type, pageIndex) => {
      this.sendSyncPageAck(type, pageIndex);
    };
    this.progressTracker.onChange = (pct, detail, phase) => {
      this.statusBarManager?.render(pct, detail, phase);
    };
    this.progressTracker.onProgressChange = (pct, detail, phase) => {
      // Broadcast progress via workspace event bus to decouple plugin from view reference.
      // 通过 workspace 事件总线广播进度，解耦 plugin 与 view 的直接引用。
      (this.app.workspace as unknown as { trigger: (name: string, data: unknown) => void })
        .trigger('fns:sync-progress', { pct, detail, phase });
    };
    this.syncState.onCompletedChange = (type) => {
      // pageIndex 由 recordSyncCompleted() 通过 syncState 瞬时字段传入（见 sync_state.ts 注释），
      // 读取后立即清空；裸 `xxxSyncTasks.completed++` 调用点读到的会是 undefined，天然回退旧路径
      // pageIndex is smuggled in via the syncState transient field by recordSyncCompleted() (see
      // sync_state.ts comment); read and clear immediately. Bare `xxxSyncTasks.completed++` call
      // sites read undefined here, naturally falling back to the legacy path.
      const pageIndex = this.syncState.pendingCompletionPageIndex;
      this.syncState.pendingCompletionPageIndex = undefined;
      this.progressTracker.recordCompleted(type, pageIndex);
    };
  }

  /**
   * 记录一条下行同步条目完成（设计稿 §4.3 C3）。pageIndex 有值时归账到对应下载页（多页在途场景，
   * 供 ack 水位线推进）；undefined 时走 progressTracker 的旧路径（单页全局计数），语义与改造前一致。
   * Record completion of one downstream sync item (design §4.3, C3). When pageIndex is provided,
   * it's attributed to that download page (multi-page-in-flight case, drives the ack watermark);
   * undefined falls back to progressTracker's legacy path (single-page global count), unchanged.
   */
  recordSyncCompleted(type: "note" | "file" | "setting" | "folder", pageIndex?: number): void {
    this.syncState.pendingCompletionPageIndex = pageIndex;
    const tasks = type === "note" ? this.noteSyncTasks : type === "file" ? this.fileSyncTasks : type === "setting" ? this.configSyncTasks : this.folderSyncTasks;
    tasks.completed++;
  }

  sendSyncPageAck(type: "note" | "file" | "setting" | "folder", pageIndex: number) {
    let action = "";
    if (type === "note") action = "NoteSyncPageAck";
    else if (type === "file") action = "FileSyncPageAck";
    else if (type === "setting") action = "SettingSyncPageAck";
    else if (type === "folder") action = "FolderSyncPageAck";

    if (!action) return;

    // 如果是首拉 ACK 信号 (pageIndex === -1)，强行忽略可能残留的 pageState，强制使用当前的 activeSyncContext
    // If it's the initial ACK signal (pageIndex === -1), ignore any stale pageState and force activeSyncContext
    const pageState = pageIndex === -1 ? undefined : this.syncPageStateMap.get(type);
    const msgContext = pageState?.context || this.syncState.activeSyncContext || "";

    dump(`[sendSyncPageAck] Sending ACK for type: ${type}, action: ${action}, pageIndex: ${pageIndex}, context: ${msgContext}`);

    this.websocket.Send(action, {
      context: msgContext,
      vault: this.settings.vault,
      pageIndex: pageIndex
    });

    // 只有当存在真正的 pageState 且非首拉时，才在发送后删除对应状态
    // Only delete from the map if we used a real pageState and it's not the initial ACK
    if (pageIndex !== -1) {
      this.syncPageStateMap.delete(type);
    }
  }
  /** 运行时 API 配置 / Runtime API configuration */
  readonly runtimeConfig = new RuntimeConfig()

  // ─── Misc plugin-level fields ────────────────────────────────────────────────
  clipboardReadTip = "" // 剪贴板读取提示信息

  // ─── Compatibility getters/setters ───────────────────────────────────────────
  // All sub-modules continue to use `plugin.xxx` without any modification.
  // 所有子模块继续使用 `plugin.xxx`，无需任何修改。

  // RuntimeConfig proxies
  get runApi() { return this.runtimeConfig.runApi }
  set runApi(v: string) { this.runtimeConfig.runApi = v }
  get runWsApi() { return this.runtimeConfig.runWsApi }
  set runWsApi(v: string) { this.runtimeConfig.runWsApi = v }
  get wsSettingChange() { return this.runtimeConfig.wsSettingChange }
  set wsSettingChange(v: boolean) { this.runtimeConfig.wsSettingChange = v }

  // SyncState — control flags
  get isSyncing() { return this.syncState.isSyncing }
  set isSyncing(v: boolean) { this.syncState.isSyncing = v }
  get isSyncRequesting() { return this.syncState.isSyncRequesting }
  set isSyncRequesting(v: boolean) { this.syncState.isSyncRequesting = v }
  get isFirstSync() { return this.syncState.isFirstSync }
  set isFirstSync(v: boolean) { this.syncState.isFirstSync = v }
  get isWaitClearSync() { return this.syncState.isWaitClearSync }
  set isWaitClearSync(v: boolean) { this.syncState.isWaitClearSync = v }
  get currentSyncType() { return this.syncState.currentSyncType }
  set currentSyncType(v: "full" | "incremental") { this.syncState.currentSyncType = v }

  // SyncState — task stats
  get noteSyncTasks() { return this.syncState.noteSyncTasks }
  set noteSyncTasks(v: SyncState["noteSyncTasks"]) { this.syncState.noteSyncTasks = v }
  get fileSyncTasks() { return this.syncState.fileSyncTasks }
  set fileSyncTasks(v: SyncState["fileSyncTasks"]) { this.syncState.fileSyncTasks = v }
  get configSyncTasks() { return this.syncState.configSyncTasks }
  set configSyncTasks(v: SyncState["configSyncTasks"]) { this.syncState.configSyncTasks = v }
  get folderSyncTasks() { return this.syncState.folderSyncTasks }
  set folderSyncTasks(v: SyncState["folderSyncTasks"]) { this.syncState.folderSyncTasks = v }

  // SyncState — progress counters
  get syncTypeCompleteCount() { return this.syncState.syncTypeCompleteCount }
  set syncTypeCompleteCount(v: number) { this.syncState.syncTypeCompleteCount = v }
  get expectedSyncCount() { return this.syncState.expectedSyncCount }
  set expectedSyncCount(v: number) { this.syncState.expectedSyncCount = v }
  get totalFilesToDownload() { return this.syncState.totalFilesToDownload }
  set totalFilesToDownload(v: number) { this.syncState.totalFilesToDownload = v }
  get downloadedFilesCount() { return this.syncState.downloadedFilesCount }
  set downloadedFilesCount(v: number) { this.syncState.downloadedFilesCount = v }
  get totalChunksToDownload() { return this.syncState.totalChunksToDownload }
  set totalChunksToDownload(v: number) { this.syncState.totalChunksToDownload = v }
  get downloadedChunksCount() { return this.syncState.downloadedChunksCount }
  set downloadedChunksCount(v: number) { this.syncState.downloadedChunksCount = v }
  get totalChunksToUpload() { return this.syncState.totalChunksToUpload }
  set totalChunksToUpload(v: number) { this.syncState.totalChunksToUpload = v }
  get uploadedChunksCount() { return this.syncState.uploadedChunksCount }
  set uploadedChunksCount(v: number) { this.syncState.uploadedChunksCount = v }

  // SyncState — sync-end flags
  get noteSyncEnd() { return this.syncState.noteSyncEnd }
  set noteSyncEnd(v: boolean) { this.syncState.noteSyncEnd = v }
  get fileSyncEnd() { return this.syncState.fileSyncEnd }
  set fileSyncEnd(v: boolean) { this.syncState.fileSyncEnd = v }
  get configSyncEnd() { return this.syncState.configSyncEnd }
  set configSyncEnd(v: boolean) { this.syncState.configSyncEnd = v }
  get folderSyncEnd() { return this.syncState.folderSyncEnd }
  set folderSyncEnd(v: boolean) { this.syncState.folderSyncEnd = v }

  // SyncState — pending queues
  get pendingFileRenames(): SyncState["pendingFileRenames"] { return this.syncState.pendingFileRenames }
  set pendingFileRenames(v: SyncState["pendingFileRenames"]) { this.syncState.pendingFileRenames = v }
  get pendingNoteRenames(): SyncState["pendingNoteRenames"] { return this.syncState.pendingNoteRenames }
  set pendingNoteRenames(v: SyncState["pendingNoteRenames"]) { this.syncState.pendingNoteRenames = v }
  get pendingUploadHashes() { return this.syncState.pendingUploadHashes }
  set pendingUploadHashes(v: Map<string, string>) { this.syncState.pendingUploadHashes = v }
  get pendingNoteModifies() { return this.syncState.pendingNoteModifies }
  set pendingNoteModifies(v: Map<string, string>) { this.syncState.pendingNoteModifies = v }
  get pendingNoteDeleteAcks() { return this.syncState.pendingNoteDeleteAcks }
  set pendingNoteDeleteAcks(v: Set<string>) { this.syncState.pendingNoteDeleteAcks = v }
  get pendingFileDeleteAcks() { return this.syncState.pendingFileDeleteAcks }
  set pendingFileDeleteAcks(v: Set<string>) { this.syncState.pendingFileDeleteAcks = v }
  get pendingConfigDeleteAcks() { return this.syncState.pendingConfigDeleteAcks }
  set pendingConfigDeleteAcks(v: Set<string>) { this.syncState.pendingConfigDeleteAcks = v }
  get pendingConfigModifies() { return this.syncState.pendingConfigModifies }
  set pendingConfigModifies(v: Map<string, string>) { this.syncState.pendingConfigModifies = v }
  get pendingDeleteNotePaths() { return this.syncState.pendingDeleteNotePaths }
  set pendingDeleteNotePaths(v: Set<string>) { this.syncState.pendingDeleteNotePaths = v }
  get pendingDeleteFilePaths() { return this.syncState.pendingDeleteFilePaths }
  set pendingDeleteFilePaths(v: Set<string>) { this.syncState.pendingDeleteFilePaths = v }
  get pendingDeleteFolderPaths() { return this.syncState.pendingDeleteFolderPaths }
  set pendingDeleteFolderPaths(v: Set<string>) { this.syncState.pendingDeleteFolderPaths = v }
  get pendingDeleteConfigPaths() { return this.syncState.pendingDeleteConfigPaths }
  set pendingDeleteConfigPaths(v: Set<string>) { this.syncState.pendingDeleteConfigPaths = v }

  // SyncState — scanned hash caches
  get scannedNoteHashes() { return this.syncState.scannedNoteHashes }
  get scannedFileHashes() { return this.syncState.scannedFileHashes }
  get scannedConfigHashes() { return this.syncState.scannedConfigHashes }

  // SyncState — watch / tracking sets
  get ignoredFiles() { return this.syncState.ignoredFiles }
  set ignoredFiles(v: Set<string>) { this.syncState.ignoredFiles = v }
  get ignoredConfigFiles() { return this.syncState.ignoredConfigFiles }
  set ignoredConfigFiles(v: Set<string>) { this.syncState.ignoredConfigFiles = v }
  get lastSyncMtime() { return this.syncState.lastSyncMtime }
  set lastSyncMtime(v: Map<string, number>) { this.syncState.lastSyncMtime = v }
  get lastSyncPathDeleted() { return this.syncState.lastSyncPathDeleted }
  set lastSyncPathDeleted(v: Set<string>) { this.syncState.lastSyncPathDeleted = v }
  get lastSyncPathRenamed() { return this.syncState.lastSyncPathRenamed }
  set lastSyncPathRenamed(v: Set<string>) { this.syncState.lastSyncPathRenamed = v }
  get syncTimer() { return this.syncState.syncTimer }
  set syncTimer(v: number | null) { this.syncState.syncTimer = v }
  get fileDownloadSessions() { return this.syncState.fileDownloadSessions }
  set fileDownloadSessions(v: SyncState["fileDownloadSessions"]) { this.syncState.fileDownloadSessions = v }

  // ─── Delegated helpers (keep API surface unchanged) ──────────────────────────

  /** 重置所有任务统计 / Reset all per-session task statistics */
  resetSyncTasks() {
    this.syncState.resetSession()
  }

  /** 计算总任务数 / Calculate total task count */
  getTotalTasks() {
    return this.syncState.getTotalTasks()
  }

  /** 计算已完成任务数 / Calculate completed task count */
  getCompletedTasks() {
    return this.syncState.getCompletedTasks()
  }

  /**
   * 获取统一的客户端名称
   * 格式: [自定义名称] [平台标识] (例如: "我的测试 Mac")
   */
  getClientName(): string {
    let platformName = "";
    if (Platform.isDesktopApp && Platform.isMacOS) {
      platformName = "Mac";
    } else if (Platform.isDesktopApp && Platform.isWin) {
      platformName = "Win";
    } else if (Platform.isDesktopApp && Platform.isLinux) {
      platformName = "Linux";
    } else if (Platform.isIosApp && Platform.isTablet) {
      platformName = "iPad";
    } else if (Platform.isIosApp && Platform.isPhone) {
      platformName = "iPhone";
    } else if (Platform.isAndroidApp && Platform.isTablet) {
      platformName = "Android";
    } else if (Platform.isAndroidApp && Platform.isPhone) {
      platformName = "Android";
    }

    const clientMetadata = (this.localStorageManager.getMetadata("clientName") as string) || "";
    return clientMetadata + (clientMetadata !== "" && platformName !== "" ? " " + platformName : platformName);
  }

  addIgnoredFile(path: string) {
    this.ignoredFiles.add(path)
  }

  removeIgnoredFile(path: string) {
    this.ignoredFiles.delete(path)
  }

  isIgnoredFile(path: string): boolean {
    if (this.ignoredFiles.has(path)) return true
    for (const ignoredPath of this.ignoredFiles) {
      if (isPathMatch(path, ignoredPath)) return true
    }
    return false
  }

  addIgnoredConfigFile(path: string) {
    this.ignoredConfigFiles.add(path)
  }

  removeIgnoredConfigFile(path: string) {
    this.ignoredConfigFiles.delete(path)
  }

  updateRibbonIcon(status: boolean) {
    this.menuManager.updateRibbonIcon(status)
  }

  updateStatusBar(text: string, current?: number, total?: number) {
    if (this.statusBarManager) {
      this.statusBarManager.update(text, current, total);
    }
  }

  /**
   * 将 mobileToastTop 设置注入为 CSS 变量，覆盖 .fns-mobile-toast 的 top 值。
   * Inject mobileToastTop as CSS variable to override .fns-mobile-toast top.
   */
  applyMobileToastTop() {
    if (!Platform.isMobile) return
    activeDocument.body.style.setProperty("--fns-toast-top", `${this.settings.mobileToastTop}px`)
  }

  async onload() {
    (window as Window & {
      FastSyncDebug?: {
        dumpError: typeof dumpError;
        checkAndNotifyCaseConflict: typeof checkAndNotifyCaseConflict;
        DebugLogManager: typeof DebugLogManager;
      };
    }).FastSyncDebug = {
      dumpError,
      checkAndNotifyCaseConflict,
      DebugLogManager
    };

    // 注册自定义颜色图标 / Register custom colored icons
    resetFileOperations()
    const colors = {
      'note': '#08b94e',
      'attachment': '#7C4DFF',
      'folder': '#1E88E5',
      'config': '#FF8A33',
      'other': '#6367FF',
      'send': '#FF8C00',
      'receive': '#007BFF'
    };

    Object.entries(colors).forEach(([key, color]) => {
      // Obsidian addIcon 默认 viewBox 是 0 0 100 100，因此居中需要 50, 50
      // Default viewBox for addIcon is 0 0 100 100, so 50, 50 is the center
      addIcon(`fns-dot-${key}`, `<circle cx="50" cy="50" r="30" fill="${color}" />`);
    });

    this.setupProgressTracker();
    this.localStorageManager = new LocalStorageManager(this)
    this.api = new HttpApiService(this)
    this.websocket = new WebSocketManager(this)

    await this.loadSettings()

    // Initialize VersionManager after settings are loaded to avoid reading undefined 'settings.vault'
    // 在加载设置后初始化 VersionManager，避免在 settings 未加载时访问 settings.vault
    this.versionManager = new VersionManager(this)

    this.settingTab = new SettingTab(this.app, this)
    // 注册设置选项
    this.addSettingTab(this.settingTab)

    // 启动监听 (必须在依赖组件实例化后)
    this.localStorageManager.startWatch()

    // 初始化锁管理器 (必须在事件管理器和操作模块之前)
    this.lockManager = new LockManager()

    // 初始化并发管理器
    this.concurrencyLimiter = new ConcurrencyLimiter(this)


    // 注册协议处理器 (核心功能)
    const ssoAction = "fast-note-sync/sso";
    try {
      this.registerObsidianProtocolHandler(ssoAction, async (data: Record<string, string>) => {
        if (data?.pushApi) {
          const getDomainOrHost = (urlStr: string): string => {
            if (!urlStr) return "";
            try {
              let formattedUrl = urlStr.trim();
              if (!/^[a-zA-Z]+:\/\//.test(formattedUrl)) {
                formattedUrl = "http://" + formattedUrl;
              }
              return new URL(formattedUrl).hostname || "";
            } catch {
              let host = urlStr.trim();
              host = host.replace(/^(https?:\/\/|wss?:\/\/)/i, "");
              return host.split("/")[0].split(":")[0] || "";
            }
          };

          const currentApi = (this.settings.api || "").trim();
          const currentToken = (this.settings.apiToken || "").trim();
          const isCurrentEmpty = !currentApi && !currentToken;

          const importApi = (data.pushApi || "").trim();
          const isSameOrSameDomain = !!currentApi && (
            currentApi === importApi ||
            getDomainOrHost(currentApi) === getDomainOrHost(importApi)
          );

          const isHighRisk = !(isCurrentEmpty || isSameOrSameDomain);

          new SsoImportModal(
            this.app,
            {
              pushApi: data.pushApi,
              pushApiToken: data.pushApiToken,
              pushVault: data.pushVault,
            },
            () => {
              void (async () => {
                this.settings.api = data.pushApi;
                this.settings.apiToken = data.pushApiToken;
                if (data?.pushVault) {
                  this.settings.vault = data.pushVault;
                }
                this.wsSettingChange = true;
                this.localStorageManager.clearSyncTime();
                await this.saveSettings();
                showSyncNotice($("ui.status.config_imported"), 5000);
                void this.reloadServices();
              })();
            },
            isHighRisk
          ).open();
        }
      });
    } catch (e) {
      console.warn(`Fast Note Sync: Protocol handler ${ssoAction} registration skipped or already exists. / 协议处理器注册跳过或已存在:`, e);
    }

    // 提前创建 MenuManager 并初始化 ribbon，必须在 onLayoutReady 之前完成，
    // 这样 Obsidian 应用保存的 ribbon 排序配置时按钮已存在，用户调整的位置才能被正确恢复。
    // Create MenuManager and init ribbon before onLayoutReady so that when Obsidian
    // applies the saved ribbon order config, the button already exists and its position is preserved.
    this.statusBarManager = new StatusBarManager(this)
    this.statusBarManager.init()
    this.menuManager = new MenuManager(this)
    this.menuManager.statusBarManager = this.statusBarManager
    this.menuManager.initRibbon()

    // 大部分初始化逻辑移动到 onLayoutReady 之后，避免阻塞 Obsidian 启动
    this.app.workspace.onLayoutReady(async () => {
      // 防止重复初始化 (Prevent duplicate initialization)
      if (this.menuManagerInitialized) return;
      this.menuManagerInitialized = true

      // 校验与清洗陈旧的版本元数据标记 (Validate and clean up redundant version badges)1
      this.versionManager.validateAndRefreshTags();

      // 0. 清理残留的临时下载目录 (Cleanup residual temp download dirs)
      void clearAllTempChunks(this)

      // 1. 初始化统计和日志 (UI)
      void SyncLogManager.getInstance().init(this)
      this.registerView(SYNC_LOG_VIEW_TYPE, (leaf) => new SyncLogView(leaf, this))

      // 2. 注册命令
      this.addCommand({
        id: "open-recycle-bin",
        name: $("ui.recycle_bin.title"),
        callback: () => {
          new RecycleBinModal(this.app, this).open();
        },
      });

      this.addCommand({
        id: "open-debug-log",
        name: $("ui.log.debug_title"),
        callback: () => {
          new DebugLogModal(this.app).open();
        },
      });

      // 3. 初始化 UI 管理器（ribbon 已在 onLayoutReady 之前创建，这里只完成其余初始化）
      // UI manager: ribbon was already created before onLayoutReady; finish the rest here
      this.menuManager.init()

      // 注册 WebSocket 状态监听 (Register WebSocket status listener)
      this.websocket.addStatusListener((status: boolean) => this.updateRibbonIcon(status))

      // 注册 WebSocket 数据传输活动监听 — 任何数据收发时显示同步指示器 / Register data transfer activity listener
      let activityTimer: number | null = null;
      this.websocket.addActivityListener(() => {
        this.menuManager.setSyncStatus(true);
        if (activityTimer) window.clearTimeout(activityTimer);
        activityTimer = window.setTimeout(() => {
          this.menuManager.setSyncStatus(false);
        }, 1000);
      });

      // 初始化分享指示器管理器 / Initialize share indicator manager
      this.shareIndicatorManager = new ShareIndicatorManager(this)
      void this.shareIndicatorManager.initialize()

      // 4. 初始化功能管理器 (实例化)
      this.fileCloudPreview = new FileCloudPreview(this)
      this.fileHashManager = new FileHashManager(this)
      this.configHashManager = new ConfigHashManager(this)
      this.folderSnapshotManager = new FolderSnapshotManager(this)
      this.configManager = new ConfigManager(this)

      // 5. 并行初始化哈希和快照 (耗时任务)
      const initPromises: Promise<void>[] = [
        this.fileHashManager.initialize(),
        this.folderSnapshotManager.initialize()
      ]
      if (this.settings.configSyncEnabled) {
        initPromises.push(this.configHashManager.initialize())
      }
      await Promise.all(initPromises)

      // 崩溃恢复：从 localStorage 恢复持久化的 pending Map，过滤本地已不存在的路径
      // Crash recovery: restore persisted pending Maps, filtering out paths that no longer exist locally
      const allFiles = this.app.vault.getAllLoadedFiles()
      const existingPaths = new Set(allFiles.map(f => f.path))

      const restoredNoteModifies = this.localStorageManager.loadPending('pendingNoteModifies')
      for (const [path] of restoredNoteModifies) {
        if (!existingPaths.has(path)) restoredNoteModifies.delete(path)
      }
      if (restoredNoteModifies.size > 0) {
        this.pendingNoteModifies = restoredNoteModifies
        dump(`[Crash Recovery] Restored ${restoredNoteModifies.size} pendingNoteModifies`)
      } else {
        this.localStorageManager.clearPending('pendingNoteModifies')
      }

      const restoredUploadHashes = this.localStorageManager.loadPending('pendingUploadHashes')
      for (const [path] of restoredUploadHashes) {
        if (!existingPaths.has(path)) restoredUploadHashes.delete(path)
      }
      if (restoredUploadHashes.size > 0) {
        this.pendingUploadHashes = restoredUploadHashes
        dump(`[Crash Recovery] Restored ${restoredUploadHashes.size} pendingUploadHashes`)
      } else {
        this.localStorageManager.clearPending('pendingUploadHashes')
      }

      const restoredConfigModifies = this.localStorageManager.loadPending('pendingConfigModifies')
      // 配置文件不过滤路径：getAllLoadedFiles 不含 .obsidian/ 路径，且 configModify 发送前会重新读文件，文件不存在时自动跳过
      // Config paths not filtered: getAllLoadedFiles excludes .obsidian/ paths; configModify re-reads files before sending and skips missing ones
      if (restoredConfigModifies.size > 0) {
        this.pendingConfigModifies = restoredConfigModifies
        dump(`[Crash Recovery] Restored ${restoredConfigModifies.size} pendingConfigModifies`)
      } else {
        this.localStorageManager.clearPending('pendingConfigModifies')
      }

      // 清理过期的断点续传 checkpoint（超过 20 分钟即视为过期，与服务端 session 超时一致）
      // Clean up expired upload resume checkpoints (>20 min matches server session timeout)
      const uploadCheckpointPrefix = `fns-${this.app.vault.getName()}-uploadSession-`
      const anyUploadCheckpointPattern = /^fns-.+-uploadSession-/
      const expireMs = 20 * 60 * 1000
      const now = Date.now()

      // 注意：这里需要清理的是 localStorage 中的项，由于 app.loadLocalStorage 不支持遍历，
      // 我们只能继续使用 window.localStorage，但仅限于清理。
      for (let i = window.localStorage.length - 1; i >= 0; i--) {
        const key = window.localStorage.key(i)
        if (key && (key.startsWith(uploadCheckpointPrefix) || anyUploadCheckpointPattern.test(key))) {
          try {
            const data = window.localStorage.getItem(key)
            const cp = JSON.parse(data || '{}') as { timestamp?: number }
            if (!cp.timestamp || now - cp.timestamp > expireMs) {
              window.localStorage.removeItem(key)
            }
          } catch {
            window.localStorage.removeItem(key)
          }
        }
      }

      if (this.fileHashManager.isReady()) {
        this.eventManager = new EventManager(this)
        void this.eventManager.registerEvents()
      }

      // 7. 刷新运行时设置 (包含网络探测，不阻塞主流程)
      void this.reloadServices()

      // 8. 监听外观变更 (Listen for CSS/Theme changes)
      this.registerEvent(
        this.app.workspace.on("css-change", () => {
          this.menuManager?.refreshUpgradeBadge()
          this.shareIndicatorManager?.regenerateCss()
        })
      )

      // 应用移动端 toast 高度 CSS 变量 / Apply mobile toast top CSS variable on startup
      this.applyMobileToastTop()

      // 从本地存储还原当前处于手动合并冲突锁定状态的文件路径
      this.syncState.conflictedPaths = this.localStorageManager.getConflictedPaths()
    })
  }

  onunload() {
    // 取消当前正在进行的同步，重置运行时状态
    cancelSync(this)
    abortAllFileOperations()
    this.localStorageManager?.stopWatch()
    this.shareIndicatorManager?.unload()
    this.menuManager?.unload()
    // 清理配置重载模块级计时器，避免插件卸载后仍触发回调
    cleanupConfigReloadTimer()
    // 卸载前强制落盘防抖累积的哈希/快照写入，避免丢失
    this.fileHashManager?.flush()
    this.configHashManager?.flush()
    this.folderSnapshotManager?.flush()
    // 取消注册文件事件
    void this.reloadServices(false)
    this.updateStatusBar("")
  }

  async loadSettings() {
    const data = await this.loadData() as LegacySettings | null
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data)

    let hasMigration = false

    // 注意加载顺序：先 vault，再 api/token。getMetadata 的历史键迁移会用到 this.settings.vault
    // （远端库名）来回溯旧键，因此必须先把 vault 装载好，否则 token 的迁移兜底拿不到远端库名。

    // 1. 处理 Vault (LocalStorage 缓存 > data.json 兜底)
    const vault = await loadVault(this.app, this, data?.vault);
    this.settings.vault = vault || this.app.vault.getName();

    // 2. 处理 API URL (LocalStorage 缓存 > data.json 兜底)
    const api = await loadApiUrl(this.app, this, data?.api);
    this.settings.api = api;
    this.runApi = api;
    this.runWsApi = api ? api.replace(/^http/, "ws") : "";

    // 3. 处理 API Token (LocalStorage 缓存 > data.json 兜底；data.json 里为混淆形式)
    const apiToken = await loadApiToken(this.app, this, data?.apiToken);
    this.settings.apiToken = apiToken;

    // 4. 处理自动重定向设置 (LocalStorage > data.json)
    const autoRedirect = await loadAutoRedirect(this.app, this, data?.autoRedirectEnabled);
    this.settings.autoRedirectEnabled = autoRedirect;

    // 4.1 处理 WS 前探测设置 (LocalStorage > data.json)
    const wsPreProbe = await loadWsPreProbe(this.app, this, data?.wsPreProbeEnabled);
    this.settings.wsPreProbeEnabled = wsPreProbe;

    // 触发一次保存的场景：
    // - data.json 仍留有需迁出的旧字段（autoRedirect/wsPreProbe 仍走 LocalStorage，不再写 data.json）
    // - 连接配置已在内存/LocalStorage 但 data.json 尚未持久兜底（首次升级到「data.json 混淆兜底 + LocalStorage 缓存」双写）
    const dataMissingConn =
      (!!this.settings.apiToken && data?.apiToken !== obfuscateToken(this.app, this.settings.apiToken)) ||
      (!!this.settings.api && data?.api !== this.settings.api) ||
      (!!this.settings.vault && data?.vault !== this.settings.vault);
    if (data && (data.autoRedirectEnabled !== undefined || data.wsPreProbeEnabled !== undefined)) {
      hasMigration = true;
    }
    if (dataMissingConn) {
      hasMigration = true;
    }

    // 数据迁移与清理：统一规则格式为 JSON

    // 1. 处理同步排除文件夹 (syncExcludeFolders)
    const pluginSelfDir = getPluginDir(this);
    const internalExcludes = this.localStorageManager.getInternalExcludes();
    const folderRules = parseRules(this.settings.syncExcludeFolders)
    const initialFolderRulesStr = this.settings.syncExcludeFolders;

    // 迁移：如果 data.json 中包含插件目录规则，则移动到 LocalStorage
    if (data && data.syncExcludeFolders) {
      const rawRules = parseRules(data.syncExcludeFolders);
      const toMove = rawRules.filter(r => isPathMatch(r.pattern, pluginSelfDir));
      if (toMove.length > 0) {
        toMove.forEach(rule => {
          if (!internalExcludes.some(ir => ir.pattern === rule.pattern)) {
            internalExcludes.push(rule);
          }
        });
        this.localStorageManager.setInternalExcludes(internalExcludes);
        hasMigration = true;
      }
    }

    // 迁移旧版配置排除 (configExclude)
    if (data && data.configExclude) {
      const oldConfigRules = parseRules(data.configExclude)
      oldConfigRules.forEach(oldRule => {
        if (!folderRules.some(r => r.pattern === oldRule.pattern)) {
          folderRules.push(oldRule)
        }
      })
      delete (this.settings as PluginSettings & { configExclude?: unknown }).configExclude
      hasMigration = true
    }

    // 仅在首次安装（无旧数据）时自动添加插件自身目录及核心配置排除
    // Automatically add this plugin's own directory and core config exclusions only during clean install (no legacy data)
    if (!data) {
      const defaultExcludes = [
        `${pluginSelfDir}/data.json`,
        `${pluginSelfDir}/configHashMap.json`,
        `${pluginSelfDir}/fileHashMap.json`,
        `${pluginSelfDir}/folderSnapshot.json`,
        `${this.app.vault.configDir}/community-plugins.json`,
      ];
      defaultExcludes.forEach(pattern => {
        if (!folderRules.some(r => r.pattern === pattern)) {
          folderRules.push({ pattern: pattern, caseSensitive: false });
        }
      });
    }

    // 确保运行时始终包含内部排除规则，并计算最终规则字符串
    const externalRules = folderRules.filter(r => !isPathMatch(r.pattern, pluginSelfDir));
    const mergedRules = [...externalRules, ...internalExcludes];
    const finalFolderRulesStr = stringifyRules(mergedRules);

    // 变更检测：规则内容变化 或 需要格式迁移 (非空且不以 [ 开头)
    const needsFolderFormatMigration = initialFolderRulesStr && !initialFolderRulesStr.startsWith("[");
    if (finalFolderRulesStr !== initialFolderRulesStr || needsFolderFormatMigration) {
      this.settings.syncExcludeFolders = finalFolderRulesStr;
      hasMigration = true;
    }

    // 2. 处理同步白名单 (syncExcludeWhitelist)
    const whitelistRules = parseRules(this.settings.syncExcludeWhitelist)
    const initialWhitelistStr = this.settings.syncExcludeWhitelist;

    // 迁移旧版白名单 (configExcludeWhitelist)
    if (data && data.configExcludeWhitelist) {
      const oldWhitelistRules = parseRules(data.configExcludeWhitelist)
      oldWhitelistRules.forEach(oldRule => {
        if (!whitelistRules.some(r => r.pattern === oldRule.pattern)) {
          whitelistRules.push(oldRule)
        }
      })
      delete (this.settings as PluginSettings & { configExcludeWhitelist?: unknown }).configExcludeWhitelist
      hasMigration = true
    }

    const finalWhitelistStr = stringifyRules(whitelistRules);
    const needsWhitelistFormatMigration = initialWhitelistStr && !initialWhitelistStr.startsWith("[");
    if (finalWhitelistStr !== initialWhitelistStr || needsWhitelistFormatMigration) {
      this.settings.syncExcludeWhitelist = finalWhitelistStr;
      hasMigration = true;
    }

    // 3. 处理扩展名排除 (syncExcludeExtensions) - 确保格式统一
    const initialExtStr = this.settings.syncExcludeExtensions;
    if (initialExtStr && !initialExtStr.startsWith("[")) {
      const extRules = parseRules(initialExtStr)
      this.settings.syncExcludeExtensions = stringifyRules(extRules)
      hasMigration = true
    }

    // 4. 迁移旧版通知设置 (showSyncNotice)
    if (data && data.showSyncNotice !== undefined) {
      if (data.isShowNotice === undefined) {
        this.settings.isShowNotice = data.showSyncNotice
      }
      delete (this.settings as PluginSettings & { showSyncNotice?: unknown }).showSyncNotice
      hasMigration = true
    }

    // 5. 处理日志设置迁移 (Migration for log setting)
    if (data && typeof data.logEnabled === "boolean") {
      this.settings.logEnabled = data.logEnabled ? "console" : "off"
      hasMigration = true
    }

    if (hasMigration) {
      await this.saveSettings()
    }
  }

  async onExternalSettingsChange() {
    dump("onExternalSettingsChange")
    await this.loadSettings()
    await this.saveSettings()
  }

  async saveSettings() {
    if (this.settings.api && this.settings.apiToken) {
      this.settings.api = this.settings.api.replace(/\/+$/, "") // 去除尾部斜杠
    }
    this.fileHashManager?.cleanupExcludedHashes()
    this.configHashManager?.cleanupExcludedHashes()
    // 文件夹暂未实现 cleanupExcludedHashes，但 FolderHashManager 初始化时会自动过滤

    // 拆分规则：将匹配插件自身目录的规则存入 LocalStorage，其余存入 data.json
    const pluginSelfDir = getPluginDir(this);
    const allRules = parseRules(this.settings.syncExcludeFolders);
    const internalRules = allRules.filter(r => isPathMatch(r.pattern, pluginSelfDir));
    const externalRules = allRules.filter(r => !isPathMatch(r.pattern, pluginSelfDir));

    this.localStorageManager.setInternalExcludes(internalRules);

    // autoRedirectEnabled / wsPreProbeEnabled 仍只走 LocalStorage，不入 data.json
    const { apiToken, api, vault, autoRedirectEnabled, wsPreProbeEnabled, ...restSettings } = this.settings;

    // --- 连接配置持久化：LocalStorage(缓存) + data.json(持久兜底) 双写 ---
    // iOS 上 Obsidian 的 LocalStorage 是 webview 存储，系统在存储压力下会清掉；连接配置若只存这里，
    // 被清后 api/token/vault 同时消失且无处恢复 → 手机端「配好、用一阵、同步设置全丢、无法同步」。
    // 因此同时把连接配置写进 data.json（随库文件持久、不被 iOS 清、可跨设备），token 以混淆形式落盘（不明文）。
    // 空值兜底：saveSettings 会被 onExternalSettingsChange 及每次无关开关触发，一旦此刻内存值因偶发读空为空，
    // 沿用存储中已有的非空值，绝不用空覆盖好值（重置按钮走独立备份/恢复流程，不受影响）。
    const storedTokenEnc = (this.localStorageManager.getMetadata("apiToken") as string) || "";
    const storedApi = (this.localStorageManager.getMetadata("apiUrl") as string) || "";
    const storedVault = (this.localStorageManager.getMetadata("vault") as string) || "";

    // 1) 写 LocalStorage 缓存（内存值为空且存储已有非空值时跳过）
    if (apiToken || !storedTokenEnc) {
      await saveApiToken(this.app, this, apiToken || "");
    }
    if (api || !storedApi) {
      await saveApiUrl(this.app, this, api || "");
    }
    if (vault || !storedVault) {
      await saveVault(this.app, this, vault || "");
    }
    await saveAutoRedirect(this.app, this, autoRedirectEnabled || false);
    await saveWsPreProbe(this.app, this, wsPreProbeEnabled !== false);

    // 2) 计算 data.json 兜底值：优先用内存有效值，否则沿用 LocalStorage 里已有的（token 存混淆串）
    //    三者同时为空才会写空——此时 LocalStorage 与内存皆空，说明确实无配置，不构成误删。
    const persistTokenEnc = apiToken ? obfuscateToken(this.app, apiToken) : storedTokenEnc;
    const persistApi = api || storedApi;
    const persistVault = vault || storedVault;

    const settingsToSave = {
      ...restSettings,
      syncExcludeFolders: stringifyRules(externalRules),
      apiToken: persistTokenEnc,
      api: persistApi,
      vault: persistVault,
    };

    await this.saveData(settingsToSave)
  }

  async saveAndReloadServices(setItem: string = "") {
    await this.saveSettings()
    this.reloadServices(true, setItem)
  }

  reloadServices(forceRegister: boolean = true, setItem: string = "") {
    if (setItem === "api" || !this.runApi) {
      this.runApi = this.settings.api;
      this.runWsApi = this.settings.api ? this.settings.api.replace(/^http/, "ws") : "";
    }

    if (forceRegister && this.settings.api && this.settings.apiToken) {
      const runRegister = () => {
        if (this.wsSettingChange) {
          this.websocket?.unRegister()
          this.wsSettingChange = false
        }

        if (this.websocket?.isRegister) {
          void this.websocket?.register()
        }

        if (this.syncTimer) {
          window.clearTimeout(this.syncTimer)
        }
        // 用于首次同步测试
        if (this.isFirstSync && this.websocket?.isAuth) {
          this.syncTimer = window.setTimeout(() => {
            if (setItem == "syncEnabled" && this.settings.syncEnabled) {
              void handleSync(this, false, "note")
            } else if (setItem == "configSyncEnabled" && this.settings.configSyncEnabled) {
              void handleSync(this, false, "config")
            }
            this.syncTimer = null
          }, 2000)
        }
      };

      const needProbe = this.settings.autoRedirectEnabled || this.settings.wsPreProbeEnabled;
      if (needProbe) {
        // 1. 前置探测跳转，更新 runApi (后台异步执行)
        this.api?.probeApiRedirect().then(() => {
          runRegister();
        }).catch(e => {
          dumpError("Fast Note Sync: Background API probe failed", e)
        })
      } else {
        runRegister();
      }
      this.ignoredFiles = new Set()
      this.ignoredConfigFiles = new Set()
      this.lastSyncMtime = new Map()
      this.lastSyncPathDeleted = new Set()
      this.lastSyncPathRenamed = new Set()
      this.fileDownloadSessions = new Map()
    } else {
      this.websocket?.unRegister()
      this.ignoredFiles = new Set()
      this.ignoredConfigFiles = new Set()
      this.lastSyncMtime.clear()
      this.lastSyncPathDeleted.clear()
      this.lastSyncPathRenamed.clear()
      this.fileDownloadSessions.clear()
      this.updateStatusBar("")
    }

    setLogEnabled(this.settings.logEnabled || "off")
  }

  /**
   * 获取命令当前的快捷键字符串 (Linkage with system hotkeys)
   */
  getCommandHotkey(commandId: string): string {
    const fullId = `${this.manifest.id}:${commandId}`;
    const hotkeyManager = (this.app as unknown as { hotkeyManager?: { getHotkeys(id: string): { modifiers: string[]; key: string }[]; getDefaultHotkeys(id: string): { modifiers: string[]; key: string }[] } }).hotkeyManager;
    let hotkeys = hotkeyManager?.getHotkeys(fullId);

    // 如果没有自定义热键，尝试获取默认热键
    if (!hotkeys || hotkeys.length === 0) {
      hotkeys = hotkeyManager?.getDefaultHotkeys(fullId);
    }

    if (hotkeys && hotkeys.length > 0) {
      const { modifiers, key } = hotkeys[0];
      const parts = [...modifiers];
      if (key) parts.push(key.toUpperCase());
      return parts.join("+");
    }
    return "";
  }

  /**
   * 设置命令的快捷键 (Linkage with system hotkeys)
   */
  async setCommandHotkey(commandId: string, shortcutStr: string) {
    const fullId = `${this.manifest.id}:${commandId}`;
    const parts = shortcutStr.split("+");
    const modifiers = parts.filter(p => ["Mod", "Ctrl", "Alt", "Shift", "Meta"].includes(p));
    const key = parts.find(p => !["Mod", "Ctrl", "Alt", "Shift", "Meta"].includes(p));

    const hotkey = { modifiers, key: key || "" };
    const hotkeyManager = (this.app as unknown as { hotkeyManager?: { setHotkeys(id: string, hotkeys: { modifiers: string[]; key: string }[]): Promise<void> } }).hotkeyManager;
    await hotkeyManager?.setHotkeys(fullId, [hotkey]);
  }

  /**
   * 更新运行时 API 地址
   * 当检测到 301/302 重定向时调用
   * @param newBaseUrl 新的基准地址（http/https）
   */
  updateRuntimeApi(newBaseUrl: string) {
    const cleanUrl = newBaseUrl.replace(/\/+$/, "");
    if (this.runApi === cleanUrl) return;

    dump(`Updating runtime API due to redirect: ${this.runApi} -> ${cleanUrl}`);
    this.runApi = cleanUrl;
    // 同步更新 WS 地址
    this.runWsApi = cleanUrl.replace(/^http/, "ws");

  }

  async activateLogView(onlyFailed?: boolean) {
    const { workspace } = this.app;
    const rightSplit = workspace.rightSplit;
    const leaves = workspace.getLeavesOfType(SYNC_LOG_VIEW_TYPE);

    if (onlyFailed) {
      // 供尚未挂载的新日志视图在 onOpen 时消费一次；已挂载的视图则靠下方的 workspace 事件即时切换
      // Consumed once by a freshly-mounted log view on open; an already-mounted view switches
      // immediately via the workspace event triggered below
      SyncLogManager.getInstance().requestOnlyFailedFilter();
      workspace.trigger('fns:log-view-set-only-failed');
    }

    if (leaves.length > 0) {
      const leaf = leaves[0];
      // 检查当前日志面板是否处于完全可见状态：1. 右侧边栏未折叠 2. 日志视图的容器元素在 DOM 中是显示状态
      // Check if the current log panel is fully visible: 1. Right sidebar is not collapsed 2. The log view's container element is shown in the DOM
      const isVisible = !rightSplit.collapsed && leaf.view.containerEl.isShown();

      if (isVisible) {
        // 如果已经显示且处于活动状态，则折叠右侧栏以“隐藏”它，避免销毁视图保留 React 状态
        // If already visible and active, collapse the right sidebar to "hide" it, keeping React state without destroying the view
        rightSplit.collapse();
      } else {
        // 如果被遮挡或右侧栏已折叠，则重新激活并展开右侧栏
        // If hidden by other tabs or the right sidebar is collapsed, reveal it and expand right sidebar
        void workspace.revealLeaf(leaf);
        rightSplit.expand();
      }
    } else {
      // 否则创建新的叶子节点，设置视图状态，并展开右侧栏
      // Otherwise, create a new leaf, set view state, and expand the right sidebar
      const leaf = workspace.getRightLeaf(false);
      await leaf?.setViewState({ type: SYNC_LOG_VIEW_TYPE, active: true });
      if (leaf) {
        void workspace.revealLeaf(leaf);
        rightSplit.expand();
      }
    }
  }

  async activateRecycleBinView() {
    new RecycleBinModal(this.app, this).open();
  }

  activateSettings() {
    const appWithInternal = this.app as AppWithInternal;
    if (appWithInternal.setting) {
      appWithInternal.setting.open();
      appWithInternal.setting.openTabById(this.manifest.id);
    }
  }

}
