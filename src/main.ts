import { Plugin, Platform, addIcon } from "obsidian";

import { dump, setLogEnabled, isPathMatch, parseRules, stringifyRules, getPluginDir, showSyncNotice, loadApiToken, saveApiToken, loadApiUrl, saveApiUrl, loadVault, saveVault, loadAutoRedirect, saveAutoRedirect } from "./lib/helps";
import { SettingTab, PluginSettings, DEFAULT_SETTINGS } from "./setting";
import { SyncLogView, SYNC_LOG_VIEW_TYPE } from "./views/sync-log-view";
import { ShareIndicatorManager } from "./lib/share_indicator_manager";
import { FolderSnapshotManager } from "./lib/folder_snapshot_manager";
import { LocalStorageManager } from "./lib/local_storage_manager";
import { ConfigHashManager } from "./lib/config_hash_manager";
import { RecycleBinModal } from "./views/recycle-bin-modal";
import { FileCloudPreview } from "./lib/file_cloud_preview";
import { FileHashManager } from "./lib/file_hash_manager";
import { SyncLogManager } from "./lib/sync_log_manager";
import { ConfigManager } from "./lib/config_manager";
import { EventManager } from "./lib/events_manager";
import { WebSocketClient } from "./lib/websocket";
import { MenuManager } from "./lib/menu_manager";
import { LockManager } from "./lib/lock_manager";
import { ConcurrencyManager } from "./lib/concurrency_manager";
import { handleSync } from "./lib/operator";
import { HttpApiService } from "./lib/api";
import { clearAllTempChunks, abortAllFileOperations, resetFileOperations } from "./lib/file_operator";
import { $ } from "./i18n/lang";
import { FileDownloadSession, AppWithInternal } from "./lib/types";
import { DebugLogModal } from "./views/debug-log-modal";


interface LegacySettings extends Partial<PluginSettings> {
  apiToken?: string;
  api?: string;
  vault?: string;
  autoRedirectEnabled?: boolean;
  syncExcludeFolders?: string;
  configExclude?: string;
  configExcludeWhitelist?: string;
  showSyncNotice?: boolean;
}


export default class FastSync extends Plugin {
  settingTab: SettingTab // 设置面板
  wsSettingChange: boolean // WebSocket 配置变更标志
  settings: PluginSettings // 插件设置
  runApi: string // 运行时 API 地址
  runWsApi: string // 运行时 WebSocket API 地址
  api: HttpApiService // HTTP API 服务
  websocket: WebSocketClient // WebSocket 客户端
  configManager: ConfigManager // 配置管理器
  lockManager: LockManager // 锁管理器
  concurrencyManager: ConcurrencyManager // 并发管理器
  eventManager: EventManager // 事件管理器
  menuManager: MenuManager // 菜单管理器
  private menuManagerInitialized: boolean = false // 防止 onLayoutReady 重复初始化 / Guard against duplicate onLayoutReady init
  shareIndicatorManager: ShareIndicatorManager // 分享指示器管理器 / Share indicator manager
  fileHashManager: FileHashManager // 文件哈希管理器
  configHashManager: ConfigHashManager // 配置哈希管理器
  localStorageManager: LocalStorageManager // 本地存储管理器
  fileCloudPreview: FileCloudPreview // 云端文件预览管理器
  folderSnapshotManager: FolderSnapshotManager // 文件夹快照管理器

  clipboardReadTip: string = "" // 剪贴板读取提示信息

  isFirstSync: boolean = false // 是否为首次同步
  isWatchEnabled: boolean = false // 是否启用文件监听
  ignoredFiles: Set<string> = new Set() // 忽略的文件集合
  ignoredConfigFiles: Set<string> = new Set() // 忽略的配置文件集合
  lastSyncMtime: Map<string, number> = new Map() // 最后同步的修改时间
  lastSyncPathDeleted: Set<string> = new Set() // 通过同步删除的路径
  lastSyncPathRenamed: Set<string> = new Set() // 通过同步重命名的路径
  // 待确认的文件重命名队列，等待服务端 FileRenameAck 后再更新 hashManager
  // Pending file rename queue, wait for server FileRenameAck before updating hashManager
  pendingFileRenames: { oldPath: string; newPath: string; contentHash: string }[] = []
  // 待确认的文件上传 hash 映射，等待服务端 FileUploadAck 后再写入 hashManager
  // Pending upload hash map, update hashManager only after server FileUploadAck
  pendingUploadHashes: Map<string, string> = new Map()
  // 待确认的笔记上传 hash 映射，等待服务端 NoteModifyAck 后再写入 hashManager
  // Pending note upload hash map, update hashManager only after server NoteModifyAck
  pendingNoteModifies: Map<string, string> = new Map()
  // 待确认的笔记重命名队列，等待服务端 NoteRenameAck 后再更新 hashManager（FIFO）
  // Pending note rename FIFO queue, update hashManager only after server NoteRenameAck
  pendingNoteRenames: { oldPath: string; newPath: string; contentHash: string }[] = []
  // 待服务端确认删除的路径集合，SyncEnd 到达后再从 hashManager/snapshotManager 移除
  // Pending delete path sets, remove from hashManager/snapshotManager only after SyncEnd arrives
  pendingDeleteNotePaths: Set<string> = new Set()
  pendingDeleteFilePaths: Set<string> = new Set()
  pendingDeleteFolderPaths: Set<string> = new Set()
  pendingDeleteConfigPaths: Set<string> = new Set()
  // 待服务端 NoteDeleteAck 确认的路径集合，Ack 到达后才从 hashManager 移除
  // Paths pending NoteDeleteAck; remove from hashManager only after server confirms deletion
  pendingNoteDeleteAcks: Set<string> = new Set()
  // 待服务端 FileDeleteAck 确认的路径集合，Ack 到达后才从 hashManager 移除
  // Paths pending FileDeleteAck; remove from hashManager only after server confirms deletion
  pendingFileDeleteAcks: Set<string> = new Set()
  // 待服务端 SettingDeleteAck 确认的路径集合，Ack 到达后才从 hashManager 移除
  // Paths pending SettingDeleteAck; remove from hashManager only after server confirms deletion
  pendingConfigDeleteAcks: Set<string> = new Set()
  // 待确认的配置上传 hash 映射，等待服务端 SettingModifyAck 后再写入 configHashManager
  // Pending config upload hash map, update configHashManager only after server SettingModifyAck
  pendingConfigModifies: Map<string, string> = new Map()

  // 暂存本轮同步扫描过程中新计算出的哈希，待同步结束（SyncEnd）时统一持久化到 HashManager
  // Temporarily store newly calculated hashes during scan, commit to HashManager on SyncEnd
  scannedNoteHashes: Map<string, { hash: string; mtime: number; size: number }> = new Map()
  scannedFileHashes: Map<string, { hash: string; mtime: number; size: number }> = new Map()
  scannedConfigHashes: Map<string, { hash: string; mtime: number; size: number }> = new Map()

  syncTypeCompleteCount: number = 0 // 已完成同步的类型计数
  expectedSyncCount: number = 0 // 预期的同步类型计数

  totalFilesToDownload: number = 0 // 待下载文件总数
  downloadedFilesCount: number = 0 // 已下载文件计数
  totalChunksToDownload: number = 0 // 待下载分片总数
  downloadedChunksCount: number = 0 // 已下载分片计数

  totalChunksToUpload: number = 0 // 待上传分片总数
  uploadedChunksCount: number = 0 // 已上传分片计数

  // 文件下载会话管理
  fileDownloadSessions: Map<string, FileDownloadSession> = new Map()
  syncTimer: number | null = null // 自动同步定时器

  public lastStatusBarPercentage: number = 0
  public currentSyncType: "full" | "incremental" = "incremental"
  noteSyncEnd: boolean = false // 笔记同步是否完成
  fileSyncEnd: boolean = false // 文件同步是否完成
  configSyncEnd: boolean = false // 配置同步是否完成
  folderSyncEnd: boolean = false // 文件夹同步是否完成
  isWaitClearSync: boolean = false // 是否正在等待清理确认以便后续同步
  isSyncing: boolean = false // 是否正在执行同步流程 (Whether sync process is running)
  isSyncRequesting: boolean = false // 是否正在发起同步请求 (Whether sync request is being initiated)

  // 任务统计
  noteSyncTasks = {
    needUpload: 0, // 需要上传
    needModify: 0, // 需要修改
    needSyncMtime: 0, // 需要同步时间戳
    needDelete: 0, // 需要删除
    completed: 0, // 已完成数量
  }

  fileSyncTasks = {
    needUpload: 0, // 需要上传
    needModify: 0, // 需要修改
    needSyncMtime: 0, // 需要同步时间戳
    needDelete: 0, // 需要删除
    completed: 0, // 已完成数量
  }

  configSyncTasks = {
    needUpload: 0, // 需要上传
    needModify: 0, // 需要修改
    needSyncMtime: 0, // 需要同步时间戳
    needDelete: 0, // 需要删除
    completed: 0, // 已完成数量
  }

  folderSyncTasks = {
    needUpload: 0, // 需要上传
    needModify: 0, // 需要修改
    needSyncMtime: 0, // 需要同步时间戳
    needDelete: 0, // 需要删除
    completed: 0, // 已完成数量
  }

  // 重置所有任务统计
  resetSyncTasks() {
    this.noteSyncTasks = { needUpload: 0, needModify: 0, needSyncMtime: 0, needDelete: 0, completed: 0 }
    this.fileSyncTasks = { needUpload: 0, needModify: 0, needSyncMtime: 0, needDelete: 0, completed: 0 }
    this.configSyncTasks = { needUpload: 0, needModify: 0, needSyncMtime: 0, needDelete: 0, completed: 0 }
    this.folderSyncTasks = { needUpload: 0, needModify: 0, needSyncMtime: 0, needDelete: 0, completed: 0 }
    this.lastStatusBarPercentage = 0
    this.noteSyncEnd = false
    this.fileSyncEnd = false
    this.configSyncEnd = false
    this.folderSyncEnd = false
    this.scannedNoteHashes.clear()
    this.scannedFileHashes.clear()
    this.scannedConfigHashes.clear()
  }

  // 计算总任务数
  getTotalTasks() {
    const noteTotal = this.noteSyncTasks.needUpload + this.noteSyncTasks.needModify + this.noteSyncTasks.needSyncMtime + this.noteSyncTasks.needDelete
    const fileTotal = this.fileSyncTasks.needUpload + this.fileSyncTasks.needModify + this.fileSyncTasks.needSyncMtime + this.fileSyncTasks.needDelete
    const configTotal = this.configSyncTasks.needUpload + this.configSyncTasks.needModify + this.configSyncTasks.needSyncMtime + this.configSyncTasks.needDelete
    const folderTotal = this.folderSyncTasks.needUpload + this.folderSyncTasks.needModify + this.folderSyncTasks.needSyncMtime + this.folderSyncTasks.needDelete
    return noteTotal + fileTotal + configTotal + folderTotal
  }

  // 计算已完成任务数
  getCompletedTasks() {
    return this.noteSyncTasks.completed + this.fileSyncTasks.completed + this.configSyncTasks.completed + this.folderSyncTasks.completed
  }

  getWatchEnabled(): boolean {
    return this.isWatchEnabled
  }

  enableWatch() {
    this.isWatchEnabled = true
  }

  disableWatch() {
    this.isWatchEnabled = false
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
    if (this.menuManager) {
      this.menuManager.updateStatusBar(text, current, total);
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
    // 注册自定义颜色图标 / Register custom colored icons
    resetFileOperations()
    const colors = {
      'note': '#08b94e',
      'attachment': '#7C4DFF',
      'folder': '#1E88E5',
      'config': '#FF8A33',
      'other': '#999999',
      'send': '#FF8C00',
      'receive': '#007BFF'
    };

    Object.entries(colors).forEach(([key, color]) => {
      // Obsidian addIcon 默认 viewBox 是 0 0 100 100，因此居中需要 50, 50
      // Default viewBox for addIcon is 0 0 100 100, so 50, 50 is the center
      addIcon(`fns-dot-${key}`, `<circle cx="50" cy="50" r="30" fill="${color}" />`);
    });

    this.localStorageManager = new LocalStorageManager(this)
    this.api = new HttpApiService(this)
    this.websocket = new WebSocketClient(this)

    await this.loadSettings()

    this.settingTab = new SettingTab(this.app, this)
    // 注册设置选项
    this.addSettingTab(this.settingTab)

    // 启动监听 (必须在依赖组件实例化后)
    this.localStorageManager.startWatch()

    // 初始化锁管理器 (必须在事件管理器和操作模块之前)
    this.lockManager = new LockManager()

    // 初始化并发管理器
    this.concurrencyManager = new ConcurrencyManager(this)


    // 注册协议处理器 (核心功能)
    const ssoAction = "fast-note-sync/sso";
    try {
      this.registerObsidianProtocolHandler(ssoAction, async (data: Record<string, string>) => {
        if (data?.pushApi) {
          this.settings.api = data.pushApi
          this.settings.apiToken = data.pushApiToken
          if (data?.pushVault) {
            this.settings.vault = data.pushVault
          }
          this.wsSettingChange = true
          this.localStorageManager.clearSyncTime()
          await this.saveSettings()
          showSyncNotice($("ui.status.config_imported"), 5000)
        }
      })
    } catch (e) {
      console.warn(`Fast Note Sync: Protocol handler ${ssoAction} registration skipped or already exists. / 协议处理器注册跳过或已存在:`, e);
    }

    // 提前创建 MenuManager 并初始化 ribbon，必须在 onLayoutReady 之前完成，
    // 这样 Obsidian 应用保存的 ribbon 排序配置时按钮已存在，用户调整的位置才能被正确恢复。
    // Create MenuManager and init ribbon before onLayoutReady so that when Obsidian
    // applies the saved ribbon order config, the button already exists and its position is preserved.
    this.menuManager = new MenuManager(this)
    this.menuManager.initRibbon()

    // 大部分初始化逻辑移动到 onLayoutReady 之后，避免阻塞 Obsidian 启动
    this.app.workspace.onLayoutReady(async () => {
      // 防止重复初始化 (Prevent duplicate initialization)
      if (this.menuManagerInitialized) return;
      this.menuManagerInitialized = true

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
      void this.refreshRuntime()

      // 8. 监听外观变更 (Listen for CSS/Theme changes)
      this.registerEvent(
        this.app.workspace.on("css-change", () => {
          this.menuManager?.refreshUpgradeBadge()
          this.shareIndicatorManager?.regenerateCss()
        })
      )

      // 应用移动端 toast 高度 CSS 变量 / Apply mobile toast top CSS variable on startup
      this.applyMobileToastTop()
    })
  }

  onunload() {
    abortAllFileOperations()
    this.localStorageManager?.stopWatch()
    this.shareIndicatorManager?.unload()
    this.menuManager?.unload()
    // 取消注册文件事件
    void this.refreshRuntime(false)
    this.updateStatusBar("")
  }

  async loadSettings() {
    const data = await this.loadData() as LegacySettings | null
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data)

    let hasMigration = false

    // 1. 处理 API Token (多级存储支持：SecretStorage > LocalStorage > data.json)
    const apiToken = await loadApiToken(this.app, this, data?.apiToken);
    this.settings.apiToken = apiToken;

    // 2. 处理 API URL 和 Vault (LocalStorage > data.json)
    const api = await loadApiUrl(this.app, this, data?.api);
    this.settings.api = api;

    const vault = await loadVault(this.app, this, data?.vault);
    this.settings.vault = vault || this.app.vault.getName();

    // 3. 处理自动重定向设置 (LocalStorage > data.json)
    const autoRedirect = await loadAutoRedirect(this.app, this, data?.autoRedirectEnabled);
    this.settings.autoRedirectEnabled = autoRedirect;

    // 如果原始 data.json 中存有敏感信息或环境特定信息，标记迁移以触发后续的清理保存
    if (data && (data.apiToken || data.api || data.vault || data.autoRedirectEnabled !== undefined)) {
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
    if (!data) {
      const defaultExcludes = [
        `${pluginSelfDir}/data.json`,
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

  async saveSettings(setItem: string = "") {
    if (this.settings.api && this.settings.apiToken) {
      this.settings.api = this.settings.api.replace(/\/+$/, "") // 去除尾部斜杠
    }
    await this.refreshRuntime(true, setItem)
    this.fileHashManager?.cleanupExcludedHashes()
    this.configHashManager?.cleanupExcludedHashes()
    // 文件夹暂未实现 cleanupExcludedHashes，但 FolderHashManager 初始化时会自动过滤

    // 拆分规则：将匹配插件自身目录的规则存入 LocalStorage，其余存入 data.json
    const pluginSelfDir = getPluginDir(this);
    const allRules = parseRules(this.settings.syncExcludeFolders);
    const internalRules = allRules.filter(r => isPathMatch(r.pattern, pluginSelfDir));
    const externalRules = allRules.filter(r => !isPathMatch(r.pattern, pluginSelfDir));

    this.localStorageManager.setInternalExcludes(internalRules);

    // 从 settings 副本中移除 apiToken, api, vault, autoRedirectEnabled，确保其不被存入 data.json
    const { apiToken, api, vault, autoRedirectEnabled, ...restSettings } = this.settings;

    const settingsToSave = {
      ...restSettings,
      syncExcludeFolders: stringifyRules(externalRules)
    };

    // 将敏感/环境特定设置存入 LocalStorage
    await saveApiToken(this.app, this, apiToken || "");
    await saveApiUrl(this.app, this, api || "");
    await saveVault(this.app, this, vault || "");
    await saveAutoRedirect(this.app, this, autoRedirectEnabled || false);

    await this.saveData(settingsToSave)
  }

  async refreshRuntime(forceRegister: boolean = true, setItem: string = "") {
    if (forceRegister && this.settings.api && this.settings.apiToken) {
      if (this.settings.manualSyncEnabled) {
        dump("Manual sync mode enabled, skipping automatic WebSocket registration")
        this.websocket?.unRegister()
        this.isWatchEnabled = false
        this.updateStatusBar("")
        return
      }
      // 1. 前置探测跳转，更新 runApi
      await this.api?.probeApiRedirect()

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
      this.ignoredFiles = new Set()
      this.ignoredConfigFiles = new Set()
      this.lastSyncMtime = new Map()
      this.lastSyncPathDeleted = new Set()
      this.lastSyncPathRenamed = new Set()
      this.fileDownloadSessions = new Map<string, FileDownloadSession>()
    } else {
      this.websocket?.unRegister()
      this.isWatchEnabled = false
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

  async activateLogView() {
    const { workspace } = this.app

    const leaves = workspace.getLeavesOfType(SYNC_LOG_VIEW_TYPE)

    if (leaves.length > 0) {
      const leaf = leaves[0]
      // 如果已经打开，判断是否处于当前视图且可见，如果是则关闭
      const containerEl = leaf.view.containerEl as HTMLElement & { isShown(): boolean };
      if (leaf === workspace.getMostRecentLeaf() || containerEl.isShown()) {
        leaf.detach()
        return
      }
      // 否则显示它
      void workspace.revealLeaf(leaf)
    } else {
      // 否则创建新的
      const leaf = workspace.getRightLeaf(false)
      await leaf?.setViewState({ type: SYNC_LOG_VIEW_TYPE, active: true })
      if (leaf) {
        void workspace.revealLeaf(leaf)
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
