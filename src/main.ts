import { Plugin, WorkspaceLeaf } from "obsidian";
import { Notice } from "obsidian";

import { SettingTab, PluginSettings, DEFAULT_SETTINGS } from "./setting";
import { SyncLogView, SYNC_LOG_VIEW_TYPE } from "./views/sync-log-view";
import { FolderSnapshotManager } from "./lib/folder_snapshot_manager";
import { LocalStorageManager } from "./lib/local_storage_manager";
import { dump, setLogEnabled, isPathMatch, parseRules, stringifyRules } from "./lib/helps";
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
import { handleSync } from "./lib/operator";
import { HttpApiService } from "./lib/api";
import { $ } from "./i18n/lang"
import { ShareIndicatorManager } from "./lib/share_indicator_manager";


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
  eventManager: EventManager // 事件管理器
  menuManager: MenuManager // 菜单管理器
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

  syncTypeCompleteCount: number = 0 // 已完成同步的类型计数
  expectedSyncCount: number = 0 // 预期的同步类型计数

  totalFilesToDownload: number = 0 // 待下载文件总数
  downloadedFilesCount: number = 0 // 已下载文件计数
  totalChunksToDownload: number = 0 // 待下载分片总数
  downloadedChunksCount: number = 0 // 已下载分片计数

  totalChunksToUpload: number = 0 // 待上传分片总数
  uploadedChunksCount: number = 0 // 已上传分片计数

  // 文件下载会话管理
  fileDownloadSessions: Map<string, any> = new Map()
  syncTimer: ReturnType<typeof setTimeout> | null = null // 同步定时器

  public lastStatusBarPercentage: number = 0
  public currentSyncType: "full" | "incremental" = "incremental"
  noteSyncEnd: boolean = false // 笔记同步是否完成
  fileSyncEnd: boolean = false // 文件同步是否完成
  configSyncEnd: boolean = false // 配置同步是否完成
  folderSyncEnd: boolean = false // 文件夹同步是否完成
  isWaitClearSync: boolean = false // 是否正在等待清理确认以便后续同步
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
    this.menuManager?.updateStatusBar(text, current, total)
  }

  async onload() {
    this.localStorageManager = new LocalStorageManager(this)
    this.localStorageManager.startWatch()

    await this.loadSettings()
    this.localStorageManager.setMetadata("serverVersionIsNew", false)
    this.localStorageManager.setMetadata("serverVersionNewLink", "")
    this.localStorageManager.setMetadata("pluginVersionIsNew", false)
    this.localStorageManager.setMetadata("pluginVersionNewLink", "")

    this.settingTab = new SettingTab(this.app, this)
    // 注册设置选项
    this.addSettingTab(this.settingTab)
    this.api = new HttpApiService(this)
    this.websocket = new WebSocketClient(this)

    // 初始化锁管理器 (必须在事件管理器和操作模块之前)
    this.lockManager = new LockManager()

    // 注册协议处理器 (核心功能)
    this.registerObsidianProtocolHandler("fast-note-sync/sso", async (data) => {
      if (data?.pushApi) {
        this.settings.api = data.pushApi
        this.settings.apiToken = data.pushApiToken
        if (data?.pushVault) {
          this.settings.vault = data.pushVault
        }
        this.wsSettingChange = true
        this.localStorageManager.setMetadata("isInitSync", false)
        await this.saveSettings()
        new Notice($("ui.status.config_imported"), 5000)
      }
    })

    // 大部分初始化逻辑移动到 onLayoutReady 之后，避免阻塞 Obsidian 启动
    this.app.workspace.onLayoutReady(async () => {
      // 1. 初始化统计和日志 (UI)
      SyncLogManager.getInstance().init(this)
      this.registerView(SYNC_LOG_VIEW_TYPE, (leaf) => new SyncLogView(leaf, this))

      // 2. 注册命令
      this.addCommand({
        id: "open-recycle-bin",
        name: $("ui.recycle_bin.title"),
        callback: () => {
          new RecycleBinModal(this.app, this).open();
        },
      });

      // 3. 初始化 UI 管理器
      this.menuManager = new MenuManager(this)
      this.menuManager.init()

      // 初始化分享指示器管理器 / Initialize share indicator manager
      this.shareIndicatorManager = new ShareIndicatorManager(this)
      this.shareIndicatorManager.initialize()

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

      // 6. 注册事件监听 (依赖哈希管理器)
      if (this.fileHashManager.isReady()) {
        this.eventManager = new EventManager(this)
        this.eventManager.registerEvents()
      }

      // 7. 刷新运行时设置 (包含网络探测，不阻塞主流程)
      this.refreshRuntime()
    })
  }

  onunload() {
    this.localStorageManager?.stopWatch()
    this.shareIndicatorManager?.unload()
    // 取消注册文件事件
    this.refreshRuntime(false)
    this.updateStatusBar("")
  }

  async loadSettings() {
    const data = await this.loadData()
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data)

    if (!this.settings.vault) {
      this.settings.vault = this.app.vault.getName()
    }

    // 数据迁移与清理：统一规则格式为 JSON
    let hasMigration = false
    const pluginSelfDir = `${this.app.vault.configDir}/plugins/${this.manifest.id}`

    // 1. 处理同步排除文件夹 (syncExcludeFolders)
    const folderRules = parseRules(this.settings.syncExcludeFolders)
    const initialFolderRulesCount = folderRules.length

    // 迁移旧版配置排除 (configExclude)
    if (data && data.configExclude) {
      const oldConfigRules = parseRules(data.configExclude)
      oldConfigRules.forEach(oldRule => {
        if (!folderRules.some(r => r.pattern === oldRule.pattern)) {
          folderRules.push(oldRule)
        }
      })
    }

    // 强制添加插件自身目录排除
    if (!folderRules.some(r => r.pattern === pluginSelfDir)) {
      folderRules.push({ pattern: pluginSelfDir, caseSensitive: false })
    }

    if (folderRules.length !== initialFolderRulesCount || !this.settings.syncExcludeFolders.startsWith("[")) {
      this.settings.syncExcludeFolders = stringifyRules(folderRules)
      hasMigration = true
    }

    // 2. 处理同步白名单 (syncExcludeWhitelist)
    const whitelistRules = parseRules(this.settings.syncExcludeWhitelist)
    const initialWhitelistCount = whitelistRules.length

    // 迁移旧版白名单 (configExcludeWhitelist)
    if (data && data.configExcludeWhitelist) {
      const oldWhitelistRules = parseRules(data.configExcludeWhitelist)
      oldWhitelistRules.forEach(oldRule => {
        if (!whitelistRules.some(r => r.pattern === oldRule.pattern)) {
          whitelistRules.push(oldRule)
        }
      })
    }

    if (whitelistRules.length !== initialWhitelistCount || (this.settings.syncExcludeWhitelist && !this.settings.syncExcludeWhitelist.startsWith("["))) {
      this.settings.syncExcludeWhitelist = stringifyRules(whitelistRules)
      hasMigration = true
    }

    // 3. 处理扩展名排除 (syncExcludeExtensions) - 确保格式统一
    if (this.settings.syncExcludeExtensions && !this.settings.syncExcludeExtensions.startsWith("[")) {
      const extRules = parseRules(this.settings.syncExcludeExtensions)
      this.settings.syncExcludeExtensions = stringifyRules(extRules)
      hasMigration = true
    }

    if (hasMigration) {
      await this.saveSettings()
    }
  }

  async onExternalSettingsChange() {
    dump("onExternalSettingsChange")
    await this.loadSettings()
    this.saveSettings()
  }

  async saveSettings(setItem: string = "") {
    if (this.settings.api && this.settings.apiToken) {
      this.settings.api = this.settings.api.replace(/\/+$/, "") // 去除尾部斜杠
    }
    await this.refreshRuntime(true, setItem)
    this.fileHashManager?.cleanupExcludedHashes()
    this.configHashManager?.cleanupExcludedHashes()
    // 文件夹暂未实现 cleanupExcludedHashes，但 FolderHashManager 初始化时会自动过滤
    await this.saveData(this.settings)
  }

  async refreshRuntime(forceRegister: boolean = true, setItem: string = "") {
    if (forceRegister && this.settings.api && this.settings.apiToken) {
      // 1. 前置探测跳转，更新 runApi
      await this.api?.probeApiRedirect()

      if (this.wsSettingChange) {
        this.websocket?.unRegister()
        this.wsSettingChange = false
      }

      this.websocket?.register((status) => this.updateRibbonIcon(status))

      if (this.syncTimer) {
        clearTimeout(this.syncTimer)
      }
      // 用于首次同步测试
      if (this.isFirstSync && this.websocket?.isAuth) {
        this.syncTimer = setTimeout(() => {
          if (setItem == "syncEnabled" && this.settings.syncEnabled) {
            handleSync(this, false, "note")
          } else if (setItem == "configSyncEnabled" && this.settings.configSyncEnabled) {
            handleSync(this, false, "config")
          }
          this.syncTimer = null
        }, 2000)
      }
      this.ignoredFiles = new Set()
      this.ignoredConfigFiles = new Set()
      this.lastSyncMtime = new Map()
      this.lastSyncPathDeleted = new Set()
      this.lastSyncPathRenamed = new Set()
      this.fileDownloadSessions = new Map<string, any>()
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

    setLogEnabled(this.settings.logEnabled)
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

    let leaf: WorkspaceLeaf | null = null
    const leaves = workspace.getLeavesOfType(SYNC_LOG_VIEW_TYPE)

    if (leaves.length > 0) {
      leaf = leaves[0]
    } else {
      leaf = workspace.getRightLeaf(false)
      await leaf?.setViewState({ type: SYNC_LOG_VIEW_TYPE, active: true })
    }

    if (leaf) {
      workspace.revealLeaf(leaf)
    }
  }
}
