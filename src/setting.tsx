import { App, PluginSettingTab, Setting, Platform, SearchComponent, MarkdownRenderer, Component } from "obsidian";
import { createRoot, Root } from "react-dom/client";

import { parseRules, SyncRule, getPluginDir, debounce, showSyncNotice, encryptString, decryptString } from "./lib/helps";
import { handleSync, resetSettingSyncTime, rebuildAllHashes, clearAllHashes } from "./lib/operator";
import { SettingsView, SupportView } from "./views/settings-view";
import { RuleEditorModal } from "./views/rule-editor-modal";
import { ConfirmModal } from "./views/confirm-modal";
import { RuleEditor } from "./views/rule-editor";
import { $ } from "./i18n/lang";
import FastSync from "./main";


export interface PluginSettings {
  /** 是否启用同步（自动上传/下载） */
  syncEnabled: boolean
  /** 是否开启插件配置项同步 */
  configSyncEnabled: boolean
  /** 是否开启日志记录 */
  logEnabled: boolean
  /** API 基础地址 */
  api: string
  /** API 访问令牌 */
  apiToken: string
  /** 库（Vault）标识名称 */
  vault: string
  /** 启动同步延迟时间（毫秒），避免刚启动时大量 IO 冲突 */
  startupDelay: number
  /** 离线同步策略（如 newTimeMerge, ignoreTimeMerge 等） */
  offlineSyncStrategy: string
  /** 笔记/文件同步排除文件夹（每行一个） */
  syncExcludeFolders: string
  /** 笔记/文件同步排除扩展名（如 .tmp, .log） */
  syncExcludeExtensions: string
  /** 笔记/文件同步排除白名单（即使在排除文件夹内也强制同步） */
  syncExcludeWhitelist: string
  /** 是否启用 PDF 状态同步 */
  pdfSyncEnabled: boolean
  /** 是否启用云端预览功能（减少本地存储占用） */
  cloudPreviewEnabled: boolean
  /** 是否限制云端预览的文件类型 */
  cloudPreviewTypeRestricted: boolean
  /** 云端预览远程资源地址模板 */
  cloudPreviewRemoteUrl: string
  /** 云端预览上传后是否自动删除本地文件 */
  cloudPreviewAutoDeleteLocal: boolean
  /** 是否启用离线删除同步（本地删除后同步到服务端） */
  offlineDeleteSyncEnabled: boolean
  /** 同步更新延迟（毫秒），用于防抖处理 */
  syncUpdateDelay: number
  /** 是否在同步完成后显示通知 */
  isShowNotice: boolean
  /** 是否启用手动同步模式（禁用自动触发） */
  manualSyncEnabled: boolean
  /** 是否启用只读同步模式（不上传本地修改） */
  readonlySyncEnabled: boolean
  /** 远程服务调试地址（多行） */
  debugRemoteUrls: string
  /** 是否在菜单中显示版本信息 */
  showVersionInfo: boolean
  /** 配置同步 - 增加目录同步（多行） */
  configSyncOtherDirs: string
  /** 网络请求库类型 */
  networkLibrary: 'fetch' | 'requestUrl'
  /** 最小化自动暂停同步 */
  autoPauseMinimized: boolean
  /** 分享中的笔记路径缓存（vault-relative 格式）
   * Cache of actively shared note paths (vault-relative format) */
  sharedPaths: string[]
  /** 是否显示分享图标（原生文件管理器 & Notebook Navigator）
   * Whether to show share icon (native file explorer & Notebook Navigator) */
  showShareIcon: boolean
  /** 插件更新源 */
  updateSource: 'github' | 'cnb'
  /** 手机端状态点位置 */
  mobileStatusDotPosition: 'hidden' | 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'menu-bar'
  /** 是否显示更新红点提示（侧边栏及图标） */
  showUpgradeBadge: boolean
}



/**
 *

![这是图片](https://markdown.com.cn/assets/img/philly-magic-garden.9c0b4415.jpg)

 */

// 默认插件设置
export const DEFAULT_SETTINGS: PluginSettings = {
  // 是否自动上传
  syncEnabled: true,
  configSyncEnabled: false,
  logEnabled: false,
  // API 网关地址
  api: "",
  // API 令牌
  apiToken: "",
  vault: "",
  startupDelay: 500,
  offlineSyncStrategy: "",
  syncExcludeFolders: "",
  syncExcludeExtensions: "",
  syncExcludeWhitelist: "",
  pdfSyncEnabled: true,
  cloudPreviewEnabled: false,
  cloudPreviewTypeRestricted: true,
  cloudPreviewRemoteUrl: "",
  cloudPreviewAutoDeleteLocal: false,
  offlineDeleteSyncEnabled: false,
  syncUpdateDelay: 0,
  isShowNotice: true,
  manualSyncEnabled: false,
  readonlySyncEnabled: false,
  debugRemoteUrls: "",
  showVersionInfo: false,
  configSyncOtherDirs: "",
  networkLibrary: "requestUrl",
  autoPauseMinimized: false,
  sharedPaths: [],
  showShareIcon: true,
  updateSource: "github",
  mobileStatusDotPosition: "menu-bar",
  showUpgradeBadge: true,
}



export type TabId = "GENERAL" | "DISPLAY" | "SHORTCUT" | "REMOTE" | "SYNC" | "CLOUD" | "DEBUG";

export class SettingTab extends PluginSettingTab {
  plugin: FastSync
  roots: Root[] = []

  // 设置当前活动选项卡，默认为通用
  activeTab: TabId = "GENERAL"
  searchQuery: string = ""
  headerScrollLeft: number = 0

  // 缓存结构，避免频繁重绘导致卡顿
  private contentEl: HTMLElement | null = null
  private searchComponent: SearchComponent | null = null
  private lastViewMode: string = "" // 用于记录上次渲染的模式 (TabId 或 "SEARCH")

  constructor(app: App, plugin: FastSync) {
    super(app, plugin)
    this.plugin = plugin
  }

  hide(): void {
    this.roots.forEach((root) => root.unmount())
    this.roots = []
  }

  display(): void {
    const { containerEl: set } = this

    // 1. 初始化基础布局结构 (仅在首次或容器被清空时)
    const headerEl = set.querySelector(".fns-setting-tab-header") as HTMLElement
    const hasSearch = set.querySelector(".fns-setting-search-container")
    this.contentEl = set.querySelector(".fns-setting-tab-content") as HTMLElement

    if (!headerEl || !hasSearch || !this.contentEl) {
      set.empty()
      this.unmountRoots()
      this.renderSearch(set)
      this.renderHeader(set)
      this.contentEl = set.createDiv("fns-setting-tab-content")
      this.lastViewMode = "" // 重置模式以强制重新渲染内容
    } else {
      // 如果结构已存在，则同步更新 Header 的选中状态 (避免 Tab 无法切换的视觉错觉)
      this.updateHeaderSelection(headerEl)
    }

    const contentEl = this.contentEl!

    // 2. 移动端滑动监听 (如果 contentEl 是新建的，需要重新挂载)
    if (Platform.isMobile && !contentEl.hasAttribute("data-swipe-init")) {
      contentEl.setAttribute("data-swipe-init", "true")
      let touchStartX = 0
      let touchStartY = 0
      contentEl.addEventListener("touchstart", (e) => {
        touchStartX = e.changedTouches[0].screenX
        touchStartY = e.changedTouches[0].screenY
      }, { passive: true })

      contentEl.addEventListener("touchend", (e) => {
        const touchEndX = e.changedTouches[0].screenX
        const touchEndY = e.changedTouches[0].screenY
        this.handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY)
      }, { passive: true })
    }

    // 3. 根据搜索状态或标签页渲染内容
    const currentMode = this.searchQuery ? "SEARCH" : this.activeTab

    // 关键修正：每次 display 时都清空并重新渲染，除非是在极高频的搜索过滤中
    // 之前因为判断 lastViewMode 导致重新打开窗口时内容为空
    contentEl.empty()
    this.unmountRoots()

    if (this.searchQuery) {
      this.renderAllSettings(contentEl)
    } else {
      switch (this.activeTab) {
        case "GENERAL": this.renderGeneralSettings(contentEl); break
        case "DEBUG": this.renderDebugSettings(contentEl); break
        case "REMOTE": this.renderRemoteSettings(contentEl); break
        case "SYNC": this.renderSyncSettings(contentEl); break
        case "CLOUD": this.renderCloudSettings(contentEl); break
        case "DISPLAY": this.renderDisplaySettings(contentEl); break
        case "SHORTCUT": this.renderShortcutSettings(contentEl); break
      }
    }
    this.lastViewMode = currentMode

    // 4. 执行搜索过滤 (如果是搜索模式)
    if (this.searchQuery) {
      this.applySearchFilter(contentEl)
    }
  }

  private updateHeaderSelection(headerEl: HTMLElement) {
    const tabs = headerEl.querySelectorAll(".fns-setting-tab-item")
    tabs.forEach((tabEl) => {
      const el = tabEl as HTMLElement
      if (el.dataset.tabId === this.activeTab && !this.searchQuery) {
        el.addClass("is-active")
        // 确保选中的 Tab 可见
        el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
      } else {
        el.removeClass("is-active")
      }
    })
  }

  private unmountRoots() {
    this.roots.forEach((root) => {
      try { root.unmount() } catch (e) { /* ignore */ }
    })
    this.roots = []
  }

  private handleSwipe(startX: number, startY: number, endX: number, endY: number) {
    const deltaX = endX - startX
    const deltaY = endY - startY
    const threshold = 50

    if (Math.abs(deltaX) > threshold && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      const tabs: TabId[] = ["GENERAL", "DISPLAY", "REMOTE", "SYNC", "SHORTCUT", "CLOUD", "DEBUG"]
      const currentIndex = tabs.indexOf(this.activeTab)

      if (deltaX > 0) {
        // Swipe right -> Previous tab
        if (currentIndex > 0) {
          this.activeTab = tabs[currentIndex - 1]
          this.display()
        }
      } else {
        // Swipe left -> Next tab
        if (currentIndex < tabs.length - 1) {
          this.activeTab = tabs[currentIndex + 1]
          this.display()
        }
      }
    }
  }

  private renderSearch(containerEl: HTMLElement) {
    const searchContainer = containerEl.createDiv("fns-setting-search-container")
    const search = new SearchComponent(searchContainer)
      .setPlaceholder($("setting.search.placeholder"))
      .setValue(this.searchQuery)

    this.searchComponent = search

    // 优化：使用防抖减少重绘，并提高响应速度 (从 500ms 默认降低到 150ms)
    const debouncedApply = debounce(() => {
      this.display()
    }, 150)

    search.onChange((value) => {
      this.searchQuery = value
      debouncedApply()
    })
  }

  private renderAllSettings(contentEl: HTMLElement) {
    this.renderGeneralSettings(contentEl)
    this.renderDisplaySettings(contentEl)
    this.renderRemoteSettings(contentEl)
    this.renderSyncSettings(contentEl)
    this.renderShortcutSettings(contentEl)
    this.renderCloudSettings(contentEl)
    this.renderDebugSettings(contentEl)
  }

  private applySearchFilter(containerEl: HTMLElement) {
    const query = this.searchQuery.toLowerCase()
    const children = Array.from(containerEl.children) as HTMLElement[]
    let hasVisibleItem = false

    // 1. 第一阶段：处理所有非标题项的显示隐藏
    children.forEach((item) => {
      // 标题栏在第二阶段处理
      if (item.classList.contains("setting-item-heading")) return

      // 对于普通的 setting-item，检查名称和描述
      const name = item.querySelector(".setting-item-name")?.textContent?.toLowerCase() || ""
      const desc = item.querySelector(".setting-item-description")?.textContent?.toLowerCase() || ""
      // 对于其他 div (如 React 渲染的容器)，检查其整体文本内容
      const otherText = item.classList.contains("setting-item") ? "" : (item.textContent?.toLowerCase() || "")

      if (name.includes(query) || desc.includes(query) || otherText.includes(query)) {
        item.style.display = ""
        hasVisibleItem = true
      } else {
        item.style.display = "none"
      }
    })

    // 2. 第二阶段：根据后续项的显示状态来决定标题栏是否显示
    children.forEach((item, index) => {
      if (!item.classList.contains("setting-item-heading")) return

      let shouldShow = false
      // 向后搜索，直到遇到下一个标题栏或容器末尾
      for (let i = index + 1; i < children.length; i++) {
        const next = children[i]
        if (next.classList.contains("setting-item-heading")) break
        if (next.style.display !== "none") {
          shouldShow = true
          break
        }
      }
      item.style.display = shouldShow ? "" : "none"
    })

    // 3. 处理 "No results" 消息
    containerEl.querySelectorAll(".fns-setting-no-results").forEach((el) => el.remove())

    if (!hasVisibleItem) {
      containerEl.createDiv("fns-setting-no-results").setText("No results found.")
    }
  }

  private renderHeader(containerEl: HTMLElement) {
    const headerEl = containerEl.createDiv("fns-setting-tab-header")

    const tabs: { id: TabId; label: string }[] = [
      { id: "GENERAL", label: $("setting.tab.general") },
      { id: "DISPLAY", label: $("setting.tab.display") },
      { id: "REMOTE", label: $("setting.tab.remote") },
      { id: "SYNC", label: $("setting.tab.sync") },
      { id: "SHORTCUT", label: $("setting.tab.shortcut") },
      { id: "CLOUD", label: $("setting.tab.cloud") },
      { id: "DEBUG", label: $("setting.tab.debug") },
    ]

    let activeTabEl: HTMLElement | null = null

    tabs.forEach((tab) => {
      const tabEl = headerEl.createDiv("fns-setting-tab-item")
      tabEl.setText(tab.label)
      tabEl.dataset.tabId = tab.id // 设置标识用于后续更新状态
      if (this.activeTab === tab.id) {
        tabEl.addClass("is-active")
        activeTabEl = tabEl
      }
      tabEl.onclick = () => {
        this.searchQuery = "" // 切换标签时清空搜索
        if (this.searchComponent) this.searchComponent.setValue("")
        this.activeTab = tab.id
        this.display()
      }
    })

    headerEl.scrollLeft = this.headerScrollLeft
    headerEl.onscroll = () => {
      this.headerScrollLeft = headerEl.scrollLeft
    }

    if (activeTabEl) {
      requestAnimationFrame(() => {
        if (!activeTabEl) return
        activeTabEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
      })
    }
  }

  private renderGeneralSettings(set: HTMLElement) {
    new Setting(set).setName($("setting.sync.startup_delay")).addText((text) =>
      text
        .setPlaceholder($("setting.sync.startup_delay_placeholder"))
        .setValue(this.plugin.settings.startupDelay.toString())
        .onChange(async (value) => {
          const numValue = parseInt(value)
          if (!isNaN(numValue) && numValue >= 0) {
            this.plugin.settings.startupDelay = numValue
            await this.plugin.saveSettings()
          }
        }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.sync.startup_delay_desc"))

    new Setting(set).setName($("setting.debug.update_source")).addDropdown((dropdown) =>
      dropdown
        .addOption("github", "GitHub")
        .addOption("cnb", "腾讯 CNB")
        .setValue(this.plugin.settings.updateSource || "github")
        .onChange(async (value: 'github' | 'cnb') => {
          this.plugin.settings.updateSource = value
          await this.plugin.saveSettings()
        }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.debug.update_source_desc"))

    new Setting(set)
      .setName($("setting.support.title"))
      .setHeading()
      .setClass("fast-note-sync-settings-tag")

    const supportSet = set.createDiv()
    const root = createRoot(supportSet)
    this.roots.push(root)
    root.render(<SupportView plugin={this.plugin} />)

    this.renderDebugTools(set, true)
  }

  private getDebugInfo(): string {
    const maskValue = (val: string) => {
      if (!val) return ""
      const parts = val.split("://")
      const protocol = parts.length > 1 ? parts[0] + "://" : ""
      const address = parts.length > 1 ? parts[1] : parts[0]

      const lastColonIndex = address.lastIndexOf(":")
      let port = ""
      let host = address
      if (lastColonIndex !== -1 && !address.includes("/", lastColonIndex)) {
        host = address.slice(0, lastColonIndex)
        port = address.slice(lastColonIndex)
      }

      let maskedHost = host
      if (host.length > 4) {
        maskedHost = host[0] + "***" + host.slice(-1)
      } else if (host.length > 0) {
        maskedHost = host[0] + "***"
      }

      return protocol + maskedHost + port
    }

    return JSON.stringify(
      {
        settings: {
          ...this.plugin.settings,
          api: maskValue(this.plugin.settings.api),
          apiToken: this.plugin.settings.apiToken ? "***HIDDEN***" : "",
        },
        runtimeInfo: {
          runApi: maskValue(this.plugin.runApi),
          runWsApi: maskValue(this.plugin.runWsApi),
          isInitSync: this.plugin.localStorageManager.getMetadata("isInitSync"),
          lastNoteSyncTime: this.plugin.localStorageManager.getMetadata("lastNoteSyncTime"),
          lastFileSyncTime: this.plugin.localStorageManager.getMetadata("lastFileSyncTime"),
          lastConfigSyncTime: this.plugin.localStorageManager.getMetadata("lastConfigSyncTime"),
          clientName: this.plugin.localStorageManager.getMetadata("clientName"),

          serverConnectionStatus: this.plugin.websocket.isConnected() ? "connected" : "disconnected",
          ...(this.plugin.websocket.isConnected() ? {
            serverVersion: this.plugin.localStorageManager.getMetadata("serverVersion"),
          } : {
            serverLastConnectVersion: this.plugin.localStorageManager.getMetadata("serverVersion"),
          }),

          serverVersionIsNew: this.plugin.localStorageManager.getMetadata("serverVersionIsNew"),
          pluginVersionIsNew: this.plugin.localStorageManager.getMetadata("pluginVersionIsNew"),
        },
        systemInfo: {
          isDesktop: Platform.isDesktopApp,
          isMobile: Platform.isMobile,
          isTablet: Platform.isTablet,
          platform: typeof process !== "undefined" ? process.platform : "unknown",
          arch: typeof process !== "undefined" ? process.arch : "unknown",
          userAgent: navigator.userAgent,
          versions: typeof process !== "undefined" ? {
            node: process.versions.node,
            electron: process.versions.electron,
            chrome: process.versions.chrome,
            v8: process.versions.v8,
          } : {},
          capacitor: (window as any).Capacitor ? {
            platform: (window as any).Capacitor.getPlatform(),
            isNative: (window as any).Capacitor.isNative,
          } : "not found",
          obsidianVersion: (this.app as any).version || (navigator.userAgent.match(/obsidian\/([\d.]+)/)?.[1]) || "unknown",
        },
        pluginVersion: this.plugin.manifest.version,
      },
      null,
      4,
    )
  }

  private renderDebugTools(set: HTMLElement, isHomePage: boolean = false) {
    const debugItem = set.createDiv("setting-item")
    const info = debugItem.createDiv("setting-item-info")
    const desc = info.createDiv("setting-item-description")

    const debugDiv = desc.createDiv("fast-note-sync-settings-debug")

    const debugButton = debugDiv.createEl("button")
    debugButton.setText($("setting.support.debug_copy"))
    debugButton.onclick = async () => {
      await window.navigator.clipboard.writeText(this.getDebugInfo())
      showSyncNotice($("setting.support.debug_desc"))
    }

    if (isHomePage) {
      const issueButton = debugDiv.createEl("button")
      issueButton.setText($("setting.support.issue"))
      issueButton.onclick = async () => {
        await window.navigator.clipboard.writeText(this.getDebugInfo())
        new ConfirmModal(
          this.app,
          $("ui.title.notice"),
          $("setting.support.issue_notice"),
          () => {
            window.open("https://github.com/haierkeys/obsidian-fast-note-sync/issues", "_blank")
          },
          $("ui.button.goto_feedback"),
          $("ui.button.cancel"),
          false
        ).open()
      }

      const featureButton = debugDiv.createEl("button")
      featureButton.setText($("setting.support.feature"))
      featureButton.onclick = () => {
        window.open("https://github.com/haierkeys/obsidian-fast-note-sync/issues", "_blank")
      }

      const telegramButton = debugDiv.createEl("button")
      telegramButton.setText($("setting.support.telegram"))
      telegramButton.onclick = () => {
        window.open("https://t.me/obsidian_users", "_blank")
      }

      const logViewButton = debugDiv.createEl("button")
      logViewButton.setText($("ui.log.view_log"))
      logViewButton.onclick = () => {
        this.plugin.activateLogView()
      }
    } else {
      const clearTimeButton = debugDiv.createEl("button")
      clearTimeButton.setText($("ui.menu.clear_time"))
      clearTimeButton.onclick = () => {
        new ConfirmModal(
          this.app,
          $("ui.title.notice"),
          $("setting.debug.clear_time_desc"),
          async () => {
            await resetSettingSyncTime(this.plugin);
          },
          $("ui.button.confirm"),
          $("ui.button.cancel"),
          false
        ).open()
      }

      const clearOnlyHashButton = debugDiv.createEl("button")
      clearOnlyHashButton.setText($("ui.menu.clear_hash"))
      clearOnlyHashButton.onclick = () => {
        new ConfirmModal(
          this.app,
          $("ui.title.notice"),
          $("setting.debug.clear_hash_only_desc"),
          async () => {
            await clearAllHashes(this.plugin);
          },
          $("ui.button.confirm"),
          $("ui.button.cancel"),
          false
        ).open()
      }

      const clearHashButton = debugDiv.createEl("button")
      clearHashButton.setText($("ui.menu.rebuild_hash"))
      clearHashButton.onclick = () => {
        new ConfirmModal(
          this.app,
          $("ui.title.notice"),
          $("setting.debug.clear_hash_desc"),
          async () => {
            await rebuildAllHashes(this.plugin);
          },
          $("ui.button.confirm"),
          $("ui.button.cancel"),
          false
        ).open()
      }

      const resetAllButton = debugDiv.createEl("button")
      resetAllButton.addClass("mod-cta")
      resetAllButton.style.color = "white"
      resetAllButton.setText($("setting.debug.reset_all"))
      resetAllButton.onclick = () => {
        new ConfirmModal(
          this.app,
          $("setting.debug.reset_all"),
          $("setting.debug.reset_all_desc"),
          async () => {
            // 先运行远端配置清理逻辑
            if (this.plugin.settings.configSyncEnabled) {
              this.plugin.isWaitClearSync = true
            }
            this.plugin.websocket.SendMessage("SettingClear", {
              vault: this.plugin.settings.vault
            })

            // 备份需要保留的远端核心配置
            const backup = {
              api: this.plugin.settings.api,
              apiToken: this.plugin.settings.apiToken,
              vault: this.plugin.settings.vault,
              debugRemoteUrls: this.plugin.settings.debugRemoteUrls,
              networkLibrary: this.plugin.settings.networkLibrary,
            }
            // 备份客户端名称（元数据）
            const clientNameBackup = this.plugin.localStorageManager.getMetadata("clientName")

            // 重置 settings 为默认值
            this.plugin.settings = Object.assign({}, DEFAULT_SETTINGS)

            // 恢复备份的远端设置
            this.plugin.settings.api = backup.api
            this.plugin.settings.apiToken = backup.apiToken
            this.plugin.settings.vault = backup.vault
            this.plugin.settings.debugRemoteUrls = backup.debugRemoteUrls
            this.plugin.settings.networkLibrary = backup.networkLibrary

            // 重新初始化某些依赖库路径的动态默认值
            const defaultExcludes = [
              `${getPluginDir(this.plugin)}/data.json`,
              `${this.app.vault.configDir}/community-plugins.json`,
            ];
            this.plugin.settings.syncExcludeFolders = JSON.stringify(defaultExcludes.map(pattern => ({ pattern, caseSensitive: false })));

            // 确保客户端名称不被重置
            if (clientNameBackup) {
              this.plugin.localStorageManager.setMetadata("clientName", clientNameBackup)
            }

            // 深度清理：同步时间记录 + 哈希表
            await resetSettingSyncTime(this.plugin)
            await rebuildAllHashes(this.plugin)

            // 保存设置
            await this.plugin.saveSettings()

            showSyncNotice($("setting.debug.reset_all_success"))

            // 重新渲染设置页面以展示变化
            this.display()
          },
          $("ui.button.confirm"),
          $("ui.button.cancel"),
          false
        ).open()
      }
    }

    if (Platform.isDesktopApp) {
      const info = debugDiv.createDiv()
      info.setText($("setting.support.console_tip"))

      const keys = debugDiv.createDiv()
      keys.addClass("custom-shortcuts")
      if (Platform.isMacOS === true) {
        keys.createEl("kbd", { text: $("setting.support.console_mac") })
      } else {
        keys.createEl("kbd", { text: $("setting.support.console_win") })
      }
    }
  }

  private renderDebugSettings(set: HTMLElement) {


    new Setting(set).setName($("setting.support.log")).addToggle((toggle) =>
      toggle.setValue(this.plugin.settings.logEnabled).onChange(async (value) => {
        this.plugin.settings.logEnabled = value
        await this.plugin.saveSettings()
      }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.support.log_desc"))

    new Setting(set).setName($("setting.debug.network_library")).addDropdown((dropdown) =>
      dropdown
        .addOption("fetch", "fetch")
        .addOption("requestUrl", "requestUrl")
        .setValue(this.plugin.settings.networkLibrary)
        .onChange(async (value: 'fetch' | 'requestUrl') => {
          this.plugin.settings.networkLibrary = value
          await this.plugin.saveSettings()
        }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.debug.network_library_desc"))

    new Setting(set).setName($("setting.support.debug_url")).addTextArea((text) =>
      text
        .setPlaceholder("http://192.168.1.100:8080\nhttp://debug.example.com")
        .setValue(this.plugin.settings.debugRemoteUrls)
        .onChange(async (value) => {
          this.plugin.settings.debugRemoteUrls = value
          await this.plugin.saveSettings()
        }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.support.debug_url_desc"))

    this.renderDebugTools(set, false)
  }

  private renderDisplaySettings(set: HTMLElement) {


    new Setting(set).setName($("setting.general.show_notice")).addToggle((toggle) =>
      toggle.setValue(this.plugin.settings.isShowNotice).onChange(async (value) => {
        if (value != this.plugin.settings.isShowNotice) {
          this.plugin.settings.isShowNotice = value
          await this.plugin.saveSettings()
        }
      }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.general.show_notice_desc"))

    new Setting(set).setName($("setting.general.show_share_icon")).addToggle((toggle) =>
      toggle.setValue(this.plugin.settings.showShareIcon).onChange(async (value) => {
        if (value != this.plugin.settings.showShareIcon) {
          this.plugin.settings.showShareIcon = value
          await this.plugin.saveSettings()
          this.plugin.shareIndicatorManager.regenerateCss()
        }
      }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.general.show_share_icon_desc"))

    new Setting(set).setName($("setting.general.show_upgrade_badge")).addToggle((toggle) =>
      toggle.setValue(this.plugin.settings.showUpgradeBadge).onChange(async (value) => {
        if (value != this.plugin.settings.showUpgradeBadge) {
          this.plugin.settings.showUpgradeBadge = value;
          await this.plugin.saveSettings();
          this.plugin.menuManager?.refreshUpgradeBadge();
          // 触发设置变更事件以通知 React 视图 / Trigger settings change event to notify React views
          (this.app.workspace as any).trigger('fns:settings-change');
        }
      }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.general.show_upgrade_badge_desc"))

    new Setting(set).setName($("setting.debug.show_version")).addToggle((toggle) =>
      toggle.setValue(this.plugin.settings.showVersionInfo).onChange(async (value) => {
        this.plugin.settings.showVersionInfo = value
        await this.plugin.saveSettings()
      }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.debug.show_version_desc"))

    new Setting(set).setName($("setting.remote.mobile_status_dot_pos")).addDropdown((dropdown) =>
      dropdown
        .addOption("hidden", $("setting.remote.mobile_status_dot_pos_hidden"))
        .addOption("top-right", $("setting.remote.mobile_status_dot_pos_tr"))
        .addOption("top-left", $("setting.remote.mobile_status_dot_pos_tl"))
        .addOption("bottom-right", $("setting.remote.mobile_status_dot_pos_br"))
        .addOption("bottom-left", $("setting.remote.mobile_status_dot_pos_bl"))
        .addOption("menu-bar", $("setting.remote.mobile_status_dot_pos_menu"))
        .setValue(this.plugin.settings.mobileStatusDotPosition || "top-right")
        .setDisabled(!Platform.isMobile)
        .onChange(async (value: any) => {
          this.plugin.settings.mobileStatusDotPosition = value
          await this.plugin.saveSettings()
          this.plugin.menuManager?.updateRibbonIcon(this.plugin.websocket.isAuth)
        }),
    )
    let posDesc = $("setting.remote.mobile_status_dot_pos_desc")
    if (!Platform.isMobile) {
      posDesc += "\n\n" + $("setting.remote.mobile_status_dot_pos_hint")
    }
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, posDesc)
  }

  private renderRemoteSettings(set: HTMLElement) {


    new Setting(set)
    .setDesc($("setting.remote.setup_desc"))
    .setHeading()
      .setClass("fast-note-sync-settings-tag-desc")

    const apiSet = set.createDiv()
    apiSet.addClass("fast-note-sync-settings")

    const root = createRoot(apiSet)
    this.roots.push(root)
    // 预设一个小文本，防止被搜索逻辑判定为“空元素”而隐藏
    apiSet.setText(" ") 
    setTimeout(() => {
      root.render(<SettingsView plugin={this.plugin} />)
    }, 50)

    new Setting(set).setName($("setting.remote.api_url")).addText((text) =>
      text
        .setPlaceholder($("setting.remote.api_url_placeholder"))
        .setValue(this.plugin.settings.api)
        .onChange(async (value) => {
          if (value != this.plugin.settings.api) {
            this.plugin.wsSettingChange = true
            this.plugin.settings.api = value
            this.plugin.localStorageManager.setMetadata("isInitSync", false)
            await this.plugin.saveSettings()
          }
        }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.remote.api_url_desc"))

    new Setting(set).setName($("setting.remote.api_token")).addText((text) =>
      text
        .setPlaceholder($("setting.remote.api_token_placeholder"))
        .setValue(this.plugin.settings.apiToken)
        .onChange(async (value) => {
          if (value != this.plugin.settings.apiToken) {
            this.plugin.wsSettingChange = true
            this.plugin.settings.apiToken = value
            this.plugin.localStorageManager.setMetadata("isInitSync", false)
            await this.plugin.saveSettings()
          }
        }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.remote.api_token_desc"))

    new Setting(set).setName($("setting.remote.vault_name")).addText((text) =>
      text
        .setPlaceholder($("setting.remote.vault_name"))
        .setValue(this.plugin.settings.vault)
        .onChange(async (value) => {
          this.plugin.wsSettingChange = true
          this.plugin.settings.vault = value
          this.plugin.localStorageManager.setMetadata("isInitSync", false)
          await this.plugin.saveSettings()
        }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.remote.vault_name"))

    new Setting(set).setName($("setting.remote.client_name")).addText((text) =>
      text
        .setPlaceholder($("setting.remote.client_name_placeholder"))
        .setValue(this.plugin.localStorageManager.getMetadata("clientName"))
        .onChange(async (value) => {
          const trimmedValue = value.trim()
          if (trimmedValue != this.plugin.localStorageManager.getMetadata("clientName")) {
            this.plugin.localStorageManager.setMetadata("clientName", trimmedValue)
          }
        }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.remote.client_name_desc"))
  }

  private renderShortcutSettings(set: HTMLElement) {
    new Setting(set)
      .setDesc($("setting.shortcut.title_desc"))
      .setHeading()
      .setClass("fast-note-sync-settings-tag-desc")

    const shortcutSetting = new Setting(set)
      .setName($("setting.shortcut.open_log"))
      .setDesc($("setting.shortcut.open_log_desc"))

    const displayShortcut = (val: string) => {
      if (!val) return ""
      let display = val
      if (Platform.isMacOS) {
        display = display.replace(/Mod/g, "Cmd").replace(/Ctrl/g, "Control")
      } else {
        display = display.replace(/Mod/g, "Ctrl")
      }
      return display
    }

    shortcutSetting.addText((text) => {
      text
        .setPlaceholder("Ctrl+Shift+Q")
        .setValue(displayShortcut(this.plugin.getCommandHotkey("open-sync-log")))

      text.inputEl.addEventListener("keydown", async (e: KeyboardEvent) => {
        e.preventDefault()
        e.stopPropagation()

        const modifiers = []
        if (e.ctrlKey) modifiers.push(Platform.isMacOS ? "Control" : "Ctrl")
        if (e.metaKey) modifiers.push(Platform.isMacOS ? "Cmd" : "Meta")
        if (e.altKey) modifiers.push("Alt")
        if (e.shiftKey) modifiers.push("Shift")

        let key = e.key
        if (["Control", "Meta", "Alt", "Shift"].includes(key)) {
          key = ""
        }

        if (modifiers.length > 0 || key) {
          let shortcutStr = modifiers.join("+")
          if (key) {
            if (shortcutStr) shortcutStr += "+"
            shortcutStr += key.toUpperCase()
          }

          let storageStr = shortcutStr
          if (Platform.isMacOS) {
            storageStr = storageStr.replace(/Cmd/g, "Mod").replace(/Control/g, "Ctrl")
          } else {
            storageStr = storageStr.replace(/Ctrl/g, "Mod")
          }

          text.setValue(shortcutStr)
          await this.plugin.setCommandHotkey("open-sync-log", storageStr)
        }
      })
    })

    shortcutSetting.addButton((btn) => {
      btn.setButtonText($("ui.button.reset")).onClick(async () => {
        await this.plugin.setCommandHotkey("open-sync-log", "Ctrl+Shift+Q")
        this.lastViewMode = "" // 强制重新渲染内容
        this.display()
      })
    })

    const menuShortcutSetting = new Setting(set)
      .setName($("setting.shortcut.open_menu"))
      .setDesc($("setting.shortcut.open_menu_desc"))

    menuShortcutSetting.addText((text) => {
      text
        .setPlaceholder("Ctrl+Shift+W")
        .setValue(displayShortcut(this.plugin.getCommandHotkey("open-sync-menu")))

      text.inputEl.addEventListener("keydown", async (e: KeyboardEvent) => {
        e.preventDefault()
        e.stopPropagation()

        const modifiers = []
        if (e.ctrlKey) modifiers.push(Platform.isMacOS ? "Control" : "Ctrl")
        if (e.metaKey) modifiers.push(Platform.isMacOS ? "Cmd" : "Meta")
        if (e.altKey) modifiers.push("Alt")
        if (e.shiftKey) modifiers.push("Shift")

        let key = e.key
        if (["Control", "Meta", "Alt", "Shift"].includes(key)) {
          key = ""
        }

        if (modifiers.length > 0 || key) {
          let shortcutStr = modifiers.join("+")
          if (key) {
            if (shortcutStr) shortcutStr += "+"
            shortcutStr += key.toUpperCase()
          }

          let storageStr = shortcutStr
          if (Platform.isMacOS) {
            storageStr = storageStr.replace(/Cmd/g, "Mod").replace(/Control/g, "Ctrl")
          } else {
            storageStr = storageStr.replace(/Ctrl/g, "Mod")
          }

          text.setValue(shortcutStr)
          await this.plugin.setCommandHotkey("open-sync-menu", storageStr)
        }
      })
    })

    menuShortcutSetting.addButton((btn) => {
      btn.setButtonText($("ui.button.reset")).onClick(async () => {
        await this.plugin.setCommandHotkey("open-sync-menu", "Ctrl+Shift+W")
        this.lastViewMode = "" // 强制重新渲染内容
        this.display()
      })
    })

    const settingShortcutSetting = new Setting(set)
      .setName($("setting.shortcut.open_settings"))
      .setDesc($("setting.shortcut.open_settings_desc"))

    settingShortcutSetting.addText((text) => {
      text
        .setPlaceholder("Ctrl+Shift+S")
        .setValue(displayShortcut(this.plugin.getCommandHotkey("open-settings")))

      text.inputEl.addEventListener("keydown", async (e: KeyboardEvent) => {
        e.preventDefault()
        e.stopPropagation()

        const modifiers = []
        if (e.ctrlKey) modifiers.push(Platform.isMacOS ? "Control" : "Ctrl")
        if (e.metaKey) modifiers.push(Platform.isMacOS ? "Cmd" : "Meta")
        if (e.altKey) modifiers.push("Alt")
        if (e.shiftKey) modifiers.push("Shift")

        let key = e.key
        if (["Control", "Meta", "Alt", "Shift"].includes(key)) {
          key = ""
        }

        if (modifiers.length > 0 || key) {
          let shortcutStr = modifiers.join("+")
          if (key) {
            if (shortcutStr) shortcutStr += "+"
            shortcutStr += key.toUpperCase()
          }

          let storageStr = shortcutStr
          if (Platform.isMacOS) {
            storageStr = storageStr.replace(/Cmd/g, "Mod").replace(/Control/g, "Ctrl")
          } else {
            storageStr = storageStr.replace(/Ctrl/g, "Mod")
          }

          text.setValue(shortcutStr)
          await this.plugin.setCommandHotkey("open-settings", storageStr)
        }
      })
    })

    settingShortcutSetting.addButton((btn) => {
      btn.setButtonText($("ui.button.reset")).onClick(async () => {
        await this.plugin.setCommandHotkey("open-settings", "Ctrl+Shift+S")
        this.lastViewMode = "" // 强制重新渲染内容
        this.display()
      })
    })
  }

  private renderSyncSettings(set: HTMLElement) {

    new Setting(set).setName($("setting.sync.auto_note")).addToggle((toggle) =>
      toggle.setValue(this.plugin.settings.syncEnabled).onChange(async (value) => {
        if (value != this.plugin.settings.syncEnabled) {
          this.plugin.settings.syncEnabled = value
          this.display()
          await this.plugin.saveSettings("syncEnabled")
        }
      }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.sync.auto_note_desc"))

    new Setting(set).setName($("setting.sync.auto_config")).addToggle((toggle) =>
      toggle.setValue(this.plugin.settings.configSyncEnabled).onChange(async (value) => {
        if (value != this.plugin.settings.configSyncEnabled) {
          this.plugin.settings.configSyncEnabled = value
          await this.plugin.saveSettings("configSyncEnabled")
        }
      }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.sync.auto_config_desc"))

    new Setting(set).setName($("setting.sync.clear_remote")).setDesc($("setting.sync.clear_remote_desc")).addButton((btn) => {
      btn.setWarning().setButtonText($("setting.sync.clear_remote")).onClick(async () => {
        new ConfirmModal(
          this.app,
          $("setting.sync.clear_remote"),
          $("setting.sync.clear_remote_confirm"),
          () => {
            if (this.plugin.settings.configSyncEnabled) {
              this.plugin.isWaitClearSync = true
            }
            this.plugin.websocket.SendMessage("SettingClear", {
              vault: this.plugin.settings.vault
            })

            btn.setDisabled(true)
            btn.setIcon("check")
            setTimeout(() => {
              btn.setDisabled(false)
              btn.setIcon("")
              btn.setButtonText($("setting.sync.clear_remote"))
            }, 5000)
          }
        ).open()
      })
    })

    new Setting(set).setName($("setting.sync.pdf_state")).addToggle((toggle) =>
      toggle.setValue(this.plugin.settings.pdfSyncEnabled).onChange(async (value) => {
        if (value != this.plugin.settings.pdfSyncEnabled) {
          this.plugin.settings.pdfSyncEnabled = value
          await this.plugin.saveSettings()
        }
      }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.sync.pdf_state_desc"))

    new Setting(set).setName($("setting.sync.offline_delete")).addToggle((toggle) =>
      toggle.setValue(this.plugin.settings.offlineDeleteSyncEnabled).onChange(async (value) => {
        if (value != this.plugin.settings.offlineDeleteSyncEnabled) {
          this.plugin.settings.offlineDeleteSyncEnabled = value
          await this.plugin.saveSettings()
        }
      }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.sync.offline_delete_desc"))

    new Setting(set).setName($("setting.sync.manual_sync")).addToggle((toggle) =>
      toggle.setValue(this.plugin.settings.manualSyncEnabled).onChange(async (value) => {
        if (value != this.plugin.settings.manualSyncEnabled) {
          this.plugin.settings.manualSyncEnabled = value
          await this.plugin.saveSettings()
        }
      }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.sync.manual_sync_desc"))

    new Setting(set).setName($("setting.sync.readonly_sync")).addToggle((toggle) =>
      toggle.setValue(this.plugin.settings.readonlySyncEnabled).onChange(async (value) => {
        if (value != this.plugin.settings.readonlySyncEnabled) {
          this.plugin.settings.readonlySyncEnabled = value
          await this.plugin.saveSettings()
        }
      }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.sync.readonly_sync_desc"))

    new Setting(set).setName($("setting.sync.auto_pause_minimized")).addToggle((toggle) =>
      toggle.setValue(this.plugin.settings.autoPauseMinimized).onChange(async (value) => {
        if (value != this.plugin.settings.autoPauseMinimized) {
          this.plugin.settings.autoPauseMinimized = value
          await this.plugin.saveSettings()
        }
      }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.sync.auto_pause_minimized_desc"))



    this.addRuleSetting(
      set,
      $("setting.sync.exclude"),
      $("setting.sync.exclude_desc"),
      () => parseRules(this.plugin.settings.syncExcludeFolders),
      async (rules) => {
        this.plugin.settings.syncExcludeFolders = JSON.stringify(rules);
        await this.plugin.saveSettings();
      },
      true,
      $("ui.button.add_rule"),
      $("setting.sync.exclude_placeholder"),
      $("ui.button.edit_exclude"),
      true
    );

    this.addRuleSetting(
      set,
      $("setting.sync.exclude_extensions"),
      $("setting.sync.exclude_extensions_desc"),
      () => parseRules(this.plugin.settings.syncExcludeExtensions),
      async (rules) => {
        this.plugin.settings.syncExcludeExtensions = JSON.stringify(rules);
        await this.plugin.saveSettings();
      },
      false,
      $("ui.button.add_rule"),
      $("setting.sync.exclude_extensions_placeholder"),
      $("ui.button.edit_extension")
    );

    this.addRuleSetting(
      set,
      $("setting.sync.exclude_whitelist"),
      $("setting.sync.exclude_whitelist_desc"),
      () => parseRules(this.plugin.settings.syncExcludeWhitelist),
      async (rules) => {
        this.plugin.settings.syncExcludeWhitelist = JSON.stringify(rules);
        await this.plugin.saveSettings();
      },
      true,
      $("ui.button.add_rule"),
      $("setting.sync.exclude_placeholder"),
      $("ui.button.edit_whitelist"),
      true
    );

    this.addRuleSetting(
      set,
      $("setting.sync.config_dirs"),
      $("setting.sync.config_dirs_desc"),
      () => parseRules(this.plugin.settings.configSyncOtherDirs),
      async (rules) => {
        this.plugin.settings.configSyncOtherDirs = JSON.stringify(rules);
        await this.plugin.saveSettings();
      },
      false,
      $("ui.button.add_dir"),
      $("setting.sync.config_dirs_placeholder"),
      $("ui.button.edit_dir"),
      true,
      { onlyFolders: true, onlyHidden: true, excludeConfigDir: true }
    );


    new Setting(set).setName($("setting.sync.sync_delay")).addText((text) =>
      text
        .setPlaceholder("0")
        .setValue(this.plugin.settings.syncUpdateDelay.toString())
        .onChange(async (value) => {
          const numValue = parseInt(value)
          if (!isNaN(numValue) && numValue >= 0) {
            this.plugin.settings.syncUpdateDelay = numValue
            await this.plugin.saveSettings()
          }
        }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.sync.sync_delay_desc"))


    new Setting(set)
      .setName($("setting.sync.merge_strategy"))
      .setClass("fns-setting-item-vertical")
      .addDropdown((dropdown) =>
      dropdown
        .addOption("", $("setting.sync.strategy_default"))
        .addOption("newTimeMerge", $("setting.sync.strategy_new"))
        .addOption("ignoreTimeMerge", $("setting.sync.strategy_force"))
        .setValue(this.plugin.settings.offlineSyncStrategy || "")
        .onChange(async (value) => {
          this.plugin.settings.offlineSyncStrategy = value
          await this.plugin.saveSettings("offlineSyncStrategy")
          this.plugin.websocket.sendClientInfo()
        }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.sync.merge_strategy_desc"))
  }

  private renderCloudSettings(set: HTMLElement) {


    new Setting(set).setName($("setting.cloud.title")).addToggle((toggle) =>
      toggle.setValue(this.plugin.settings.cloudPreviewEnabled).onChange(async (value) => {
        if (value != this.plugin.settings.cloudPreviewEnabled) {
          this.plugin.settings.cloudPreviewEnabled = value
          await this.plugin.saveSettings()
          this.display()
        }
      }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.cloud.desc"))

    if (this.plugin.settings.cloudPreviewEnabled) {
      new Setting(set).setName($("setting.cloud.type_limit")).addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.cloudPreviewTypeRestricted).onChange(async (value) => {
          if (value != this.plugin.settings.cloudPreviewTypeRestricted) {
            this.plugin.settings.cloudPreviewTypeRestricted = value
            await this.plugin.saveSettings()
          }
        }),
      )
      this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.cloud.type_limit_desc"))

      new Setting(set).setName($("setting.cloud.remote_source")).addTextArea((text) =>
        text
          .setPlaceholder("prefix@.jpg$.png#http://domain.com/{path}")
          .setValue(this.plugin.settings.cloudPreviewRemoteUrl)
          .onChange(async (value) => {
            if (value != this.plugin.settings.cloudPreviewRemoteUrl) {
              this.plugin.settings.cloudPreviewRemoteUrl = value
              await this.plugin.saveSettings()
            }
          })
          .inputEl.addClass("fast-note-sync-remote-url-area"),
      )
      const remoteUrlSetting = set.lastElementChild as HTMLElement
      remoteUrlSetting.addClass("fast-note-sync-remote-url-setting")
      this.setDescWithBreaks(remoteUrlSetting, $("setting.cloud.remote_source_desc"))

      new Setting(set).setName($("setting.cloud.delete_after_upload")).addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.cloudPreviewAutoDeleteLocal).onChange(async (value) => {
          if (value != this.plugin.settings.cloudPreviewAutoDeleteLocal) {
            this.plugin.settings.cloudPreviewAutoDeleteLocal = value
            await this.plugin.saveSettings()
          }
        }),
      )
      this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.cloud.delete_after_upload_desc"))
    }
  }

  private setDescWithBreaks(el: HTMLElement, desc: string) {
    const descEl = el.querySelector(".setting-item-description") as HTMLElement;
    if (descEl) {
      descEl.empty();
      descEl.addClass("fns-setting-desc-markdown");
      MarkdownRenderer.render(this.app, desc, descEl, "", this.plugin);
    }
  }

  private addRuleSetting(
    set: HTMLElement,
    name: string,
    desc: string,
    getRules: () => SyncRule[],
    onSave: (rules: SyncRule[]) => Promise<void>,
    showCaseSensitive: boolean = true,
    addButtonText?: string,
    inputPlaceholder?: string,
    editButtonText?: string,
    usePathSuggest: boolean = false,
    pathSuggestOptions: any = {}
  ) {
    const setting = new Setting(set).setName(name).setClass("fns-setting-item-vertical");
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, desc);

    const inlineContainer = setting.settingEl.createDiv("fns-rule-editor-inline");
    inlineContainer.hide();

    const defaultEditBtnText = editButtonText || $("ui.button.edit_rule");

    setting.addButton((btn) => {
      btn.setButtonText(defaultEditBtnText).onClick(() => {
        if (Platform.isMobile) {
          if (inlineContainer.isShown()) {
            inlineContainer.hide();
            btn.setButtonText(defaultEditBtnText);
            inlineContainer.empty();
          } else {
            inlineContainer.show();
            btn.setButtonText($("ui.button.collapse") || "收起");
            const editor = new RuleEditor(
              inlineContainer,
              this.app,
              name,
              "",
              getRules(),
              onSave,
              showCaseSensitive,
              addButtonText,
              inputPlaceholder,
              usePathSuggest,
              pathSuggestOptions
            );
            editor.load();
            editor.render();
          }
        } else {
          new RuleEditorModal(
            this.app,
            name,
            desc,
            getRules(),
            onSave,
            showCaseSensitive,
            addButtonText,
            inputPlaceholder,
            usePathSuggest,
            pathSuggestOptions
          ).open();
        }
      });
    });
  }
}
