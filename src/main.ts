import { Plugin, WorkspaceLeaf, Platform } from "obsidian";
import { Notice } from "obsidian";

import { dump, setLogEnabled, isPathMatch, parseRules, stringifyRules, getPluginDir } from "./lib/helps";
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
import { handleSync } from "./lib/operator";
import { HttpApiService } from "./lib/api";
import { $ } from "./i18n/lang";


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

    const clientMetadata = this.localStorageManager.getMetadata("clientName") || "";
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
    this.menuManager?.updateStatusBar(text, current, total)
  }

  async onload() {
    this.localStorageManager = new LocalStorageManager(this)
    this.localStorageManager.startWatch()

    await this.loadSettings()
    this.menuManager?.refreshUpgradeBadge()

    this.settingTab = new SettingTab(this.app, this)
    // 注册设置选项
    this.addSettingTab(this.settingTab)
    this.api = new HttpApiService(this)
    this.websocket = new WebSocketClient(this)

    // 初始化锁管理器 (必须在事件管理器和操作模块之前)
    this.lockManager = new LockManager()


    // 注册协议处理器 (核心功能)
    const ssoAction = "fast-note-sync/sso";
    try {
      this.registerObsidianProtocolHandler(ssoAction, async (data) => {
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

      // 3. 初始化 UI 管理器（ribbon 已在 onLayoutReady 之前创建，这里只完成其余初始化）
      // UI manager: ribbon was already created before onLayoutReady; finish the rest here
      this.menuManager.init()

      // 注册 WebSocket 状态监听 (Register WebSocket status listener)
      this.websocket.addStatusListener((status) => this.updateRibbonIcon(status))

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

      // 8. 监听外观变更 (Listen for CSS/Theme changes)
      this.registerEvent(
        this.app.workspace.on("css-change", () => {
          this.menuManager?.refreshUpgradeBadge()
          this.shareIndicatorManager?.regenerateCss()
        })
      )
    })
  }

  onunload() {
    this.localStorageManager?.stopWatch()
    this.shareIndicatorManager?.unload()
    this.menuManager?.unload()
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
    const pluginSelfDir = getPluginDir(this);

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

      this.websocket?.register()

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
   * 获取命令当前的快捷键字符串 (Linkage with system hotkeys)
   */
  getCommandHotkey(commandId: string): string {
    const fullId = `${this.manifest.id}:${commandId}`;
    const hotkeyManager = (this.app as any).hotkeyManager;
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
    const modifiers = parts.filter(p => ["Mod", "Ctrl", "Alt", "Shift", "Meta"].includes(p)) as any[];
    const key = parts.find(p => !["Mod", "Ctrl", "Alt", "Shift", "Meta"].includes(p));

    const hotkey = { modifiers, key: key || "" };
    await (this.app as any).hotkeyManager?.setHotkeys(fullId, [hotkey]);
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
      if (leaf === workspace.activeLeaf || (leaf as any).view?.containerEl?.isShown()) {
        leaf.detach()
        return
      }
      // 否则显示它
      workspace.revealLeaf(leaf)
    } else {
      // 否则创建新的
      const leaf = workspace.getRightLeaf(false)
      await leaf?.setViewState({ type: SYNC_LOG_VIEW_TYPE, active: true })
      if (leaf) {
        workspace.revealLeaf(leaf)
      }
    }
  }

}
