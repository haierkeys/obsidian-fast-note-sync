import { Plugin, WorkspaceLeaf } from "obsidian";
import { Notice } from "obsidian";

import { SettingTab, PluginSettings, DEFAULT_SETTINGS } from "./setting";
import { SyncLogView, SYNC_LOG_VIEW_TYPE } from "./views/sync-log-view";
import { FolderSnapshotManager } from "./lib/folder_snapshot_manager";
import { LocalStorageManager } from "./lib/local_storage_manager";
import { dump, setLogEnabled, isPathMatch } from "./lib/helps";
import { ConfigHashManager } from "./lib/config_hash_manager";
import { FileCloudPreview } from "./lib/file_cloud_preview";
import { FileHashManager } from "./lib/file_hash_manager";
import { SyncLogManager } from "./lib/sync_log_manager";
import { ConfigManager } from "./lib/config_manager";
import { EventManager } from "./lib/events_manager";
import { WebSocketClient } from "./lib/websocket";
import { MenuManager } from "./lib/menu_manager";
import { handleSync } from "./lib/operator";
import { $ } from "./lang/lang";


export default class FastSync extends Plugin {
  settingTab: SettingTab // 设置面板
  wsSettingChange: boolean // WebSocket 配置变更标志
  settings: PluginSettings // 插件设置
  websocket: WebSocketClient // WebSocket 客户端
  configManager: ConfigManager // 配置管理器
  eventManager: EventManager // 事件管理器
  menuManager: MenuManager // 菜单管理器
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
  syncTimer: NodeJS.Timeout | null = null // 同步定时器

  public lastStatusBarPercentage: number = 0
  public currentSyncType: "full" | "incremental" = "incremental"
  noteSyncEnd: boolean = false // 笔记同步是否完成
  fileSyncEnd: boolean = false // 文件同步是否完成
  configSyncEnd: boolean = false // 配置同步是否完成
  folderSyncEnd: boolean = false // 文件夹同步是否完成
  isWaitClearSync: boolean = false // 是否正在等待清理确认以便后续同步

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
    this.menuManager.updateStatusBar(text, current, total)
  }

  async onload() {
    this.manifest.description = $("fns.desc")
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
    this.websocket = new WebSocketClient(this)

    // 注册同步日志视图
    SyncLogManager.getInstance().init(this)
    this.registerView(SYNC_LOG_VIEW_TYPE, (leaf) => new SyncLogView(leaf, this))



    // 初始化 菜单/状态栏/命令 等 UI 入口
    this.menuManager = new MenuManager(this)
    this.menuManager.init()

    // 初始化云端文件预览功能
    this.fileCloudPreview = new FileCloudPreview(this)

    // 初始化文件哈希管理器(必须在事件管理器之前)
    this.fileHashManager = new FileHashManager(this)

    // 初始化配置哈希管理器
    this.configHashManager = new ConfigHashManager(this)

    // 初始化文件夹快照管理器
    this.folderSnapshotManager = new FolderSnapshotManager(this)

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
        //this.settingTab.display()
        new Notice($("ui.status.config_imported"), 5000)
      }
    })

    // 等待 workspace 布局准备就绪后再初始化文件哈希映射
    // 这样可以确保 vault 文件索引已经完全加载
    this.app.workspace.onLayoutReady(async () => {
      await this.fileHashManager.initialize()

      // 如果启用了配置同步,初始化配置哈希管理器
      if (this.settings.configSyncEnabled) {
        await this.configHashManager.initialize()
      }

      // 初始化文件夹快照管理器
      await this.folderSnapshotManager.initialize()

      // 只有在哈希表初始化完成后才注册事件
      if (this.fileHashManager.isReady()) {
        this.eventManager = new EventManager(this)
        this.eventManager.registerEvents()
      }
    })

    this.configManager = new ConfigManager(this)
    this.configManager = new ConfigManager(this)

    this.refreshRuntime()
  }

  onunload() {
    this.localStorageManager?.stopWatch()
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
    // 仅在首次运行或该设置项不存在时才设置默认值
    if (!data || data.configExclude === undefined) {
      this.settings.configExclude = `plugins/${this.manifest.id}`
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
      this.settings.wsApi = this.settings.api.replace(/^http/, "ws").replace(/\/+$/, "") // 去除尾部斜杠
    }
    this.refreshRuntime(true, setItem)
    this.fileHashManager.cleanupExcludedHashes()
    this.configHashManager.cleanupExcludedHashes()
    // 文件夹暂未实现 cleanupExcludedHashes，但 FolderHashManager 初始化时会自动过滤
    await this.saveData(this.settings)
  }

  refreshRuntime(forceRegister: boolean = true, setItem: string = "") {
    if (forceRegister && this.settings.api && this.settings.apiToken) {
      if (this.wsSettingChange) {
        this.websocket.unRegister()
        this.wsSettingChange = false
      }

      this.websocket.register((status) => this.updateRibbonIcon(status))

      if (this.syncTimer) {
        clearTimeout(this.syncTimer)
      }
      // 用于首次同步测试
      if (this.isFirstSync && this.websocket.isAuth) {
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
      this.fileDownloadSessions = new Map<string, any>()
    } else {
      this.websocket.unRegister()
      this.isWatchEnabled = false
      this.ignoredFiles = new Set()
      this.ignoredConfigFiles = new Set()
      this.fileDownloadSessions.clear()
      this.updateStatusBar("")
    }

    setLogEnabled(this.settings.logEnabled)
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
