import { App, PluginSettingTab, Notice, Setting, Platform, SearchComponent } from "obsidian";
import { createRoot, Root } from "react-dom/client";

import { handleSync, resetSettingSyncTime, rebuildAllHashes } from "./lib/operator";
import { SettingsView, SupportView } from "./views/settings-view";
import { ConfirmModal } from "./views/confirm-modal";
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
}



export type TabId = "GENERAL" | "DEBUG" | "REMOTE" | "SYNC" | "CLOUD";

export class SettingTab extends PluginSettingTab {
  plugin: FastSync
  roots: Root[] = []

  // 设置当前活动选项卡，默认为通用
  activeTab: TabId = "GENERAL"
  searchQuery: string = ""

  private headerScrollLeft: number = 0
  private touchStartX: number = 0
  private touchStartY: number = 0

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

    const oldHeader = set.querySelector(".fns-setting-tab-header")
    if (oldHeader) {
      this.headerScrollLeft = oldHeader.scrollLeft
    }

    set.empty()
    this.roots.forEach((root) => root.unmount())
    this.roots = []

    // 渲染搜索框
    this.renderSearch(set)

    // 渲染选项卡头部导航
    this.renderHeader(set)

    const contentEl = set.createDiv("fns-setting-tab-content")

    if (Platform.isMobile) {
      contentEl.addEventListener("touchstart", (e) => {
        this.touchStartX = e.changedTouches[0].screenX
        this.touchStartY = e.changedTouches[0].screenY
      }, { passive: true })

      contentEl.addEventListener("touchend", (e) => {
        const touchEndX = e.changedTouches[0].screenX
        const touchEndY = e.changedTouches[0].screenY
        this.handleSwipe(this.touchStartX, this.touchStartY, touchEndX, touchEndY)
      }, { passive: true })
    }

    if (this.searchQuery) {
      this.renderAllSettings(contentEl)
      this.applySearchFilter(contentEl)
    } else {
      // 根据活动选项卡渲染内容
      switch (this.activeTab) {
        case "GENERAL":
          this.renderGeneralSettings(contentEl)
          break
        case "DEBUG":
          this.renderDebugSettings(contentEl)
          break
        case "REMOTE":
          this.renderRemoteSettings(contentEl)
          break
        case "SYNC":
          this.renderSyncSettings(contentEl)
          break
        case "CLOUD":
          this.renderCloudSettings(contentEl)
          break
      }
    }
  }

  private handleSwipe(startX: number, startY: number, endX: number, endY: number) {
    const deltaX = endX - startX
    const deltaY = endY - startY
    const threshold = 50

    if (Math.abs(deltaX) > threshold && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      const tabs: TabId[] = ["GENERAL", "REMOTE", "SYNC", "CLOUD", "DEBUG"]
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
    new SearchComponent(searchContainer)
      .setPlaceholder($("setting.search.placeholder"))
      .setValue(this.searchQuery)
      .onChange((value) => {
        this.searchQuery = value
        this.display()
      })
  }

  private renderAllSettings(contentEl: HTMLElement) {
    this.renderGeneralSettings(contentEl)
    this.renderRemoteSettings(contentEl)
    this.renderSyncSettings(contentEl)
    this.renderCloudSettings(contentEl)
    this.renderDebugSettings(contentEl)
  }

  private applySearchFilter(containerEl: HTMLElement) {
    const query = this.searchQuery.toLowerCase()
    const children = containerEl.querySelectorAll(".setting-item")
    let hasVisibleItem = false

    children.forEach((child) => {
      const item = child as HTMLElement
      const name = item.querySelector(".setting-item-name")?.textContent?.toLowerCase() || ""
      const desc = item.querySelector(".setting-item-description")?.textContent?.toLowerCase() || ""

      if (name.includes(query) || desc.includes(query)) {
        item.style.display = ""
        hasVisibleItem = true
      } else {
        item.style.display = "none"
      }
    })

    // 隐藏空的标题栏
    const headings = containerEl.querySelectorAll(".setting-item-heading")
    headings.forEach((heading) => {
      let next = heading.nextElementSibling
      let shouldShow = false
      while (next && !next.classList.contains("setting-item-heading")) {
        if ((next as HTMLElement).style.display !== "none") {
          shouldShow = true
          break
        }
        next = next.nextElementSibling
      }
      ; (heading as HTMLElement).style.display = shouldShow ? "" : "none"
    })

    if (!hasVisibleItem) {
      containerEl.createDiv("fns-setting-no-results").setText("No results found.")
    }
  }

  private renderHeader(containerEl: HTMLElement) {
    const headerEl = containerEl.createDiv("fns-setting-tab-header")

    const tabs: { id: TabId; label: string }[] = [
      { id: "GENERAL", label: $("setting.tab.general") },
      { id: "REMOTE", label: $("setting.tab.remote") },
      { id: "SYNC", label: $("setting.tab.sync") },
      { id: "CLOUD", label: $("setting.tab.cloud") },
      { id: "DEBUG", label: $("setting.tab.debug") },
    ]

    let activeTabEl: HTMLElement | null = null

    tabs.forEach((tab) => {
      const tabEl = headerEl.createDiv("fns-setting-tab-item")
      tabEl.setText(tab.label)
      if (this.activeTab === tab.id) {
        tabEl.addClass("is-active")
        activeTabEl = tabEl
      }
      tabEl.onclick = () => {
        this.activeTab = tab.id
        this.display()
      }
    })

    headerEl.scrollLeft = this.headerScrollLeft

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

    new Setting(set)
      .setName("| " + $("setting.support.title"))
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
      new Notice($("setting.support.debug_desc"))
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
            this.plugin.settings.configExclude = `${this.app.vault.configDir}/plugins/${this.plugin.manifest.id}`

            // 确保客户端名称不被重置
            if (clientNameBackup) {
              this.plugin.localStorageManager.setMetadata("clientName", clientNameBackup)
            }

            // 深度清理：同步时间记录 + 哈希表
            await resetSettingSyncTime(this.plugin)
            await rebuildAllHashes(this.plugin)

            // 保存设置
            await this.plugin.saveSettings()

            new Notice($("setting.debug.reset_all_success"))

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
    new Setting(set)
      .setName("| " + $("setting.tab.debug"))
      .setHeading()
      .setClass("fast-note-sync-settings-tag")

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

    new Setting(set).setName($("setting.debug.show_version")).addToggle((toggle) =>
      toggle.setValue(this.plugin.settings.showVersionInfo).onChange(async (value) => {
        this.plugin.settings.showVersionInfo = value
        await this.plugin.saveSettings()
      }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.debug.show_version_desc"))

    this.renderDebugTools(set, false)
  }

  private renderRemoteSettings(set: HTMLElement) {
    new Setting(set)
      .setName("| " + $("setting.remote.title"))
      .setHeading()
      .setClass("fast-note-sync-settings-tag")

    const apiSet = set.createDiv()
    apiSet.addClass("fast-note-sync-settings")

    const root = createRoot(apiSet)
    this.roots.push(root)
    root.render(<SettingsView plugin={this.plugin} />)

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

  private renderSyncSettings(set: HTMLElement) {
    new Setting(set)
      .setName("| " + $("setting.sync.title"))
      .setHeading()
      .setClass("fast-note-sync-settings-tag")

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



    new Setting(set).setName($("setting.sync.exclude")).addTextArea((text) =>
      text
        .setPlaceholder($("setting.sync.exclude_placeholder"))
        .setValue(this.plugin.settings.syncExcludeFolders)
        .onChange(async (value) => {
          if (value != this.plugin.settings.syncExcludeFolders) {
            this.plugin.settings.syncExcludeFolders = value
            await this.plugin.saveSettings()
          }
        }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.sync.exclude_desc"))

    new Setting(set).setName($("setting.sync.exclude_extensions")).addTextArea((text) =>
      text
        .setPlaceholder(".tmp\n.log")
        .setValue(this.plugin.settings.syncExcludeExtensions)
        .onChange(async (value) => {
          if (value != this.plugin.settings.syncExcludeExtensions) {
            this.plugin.settings.syncExcludeExtensions = value
            await this.plugin.saveSettings()
          }
        }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.sync.exclude_extensions_desc"))

    new Setting(set).setName($("setting.sync.exclude_whitelist")).addTextArea((text) =>
      text
        .setPlaceholder($("setting.sync.exclude_placeholder"))
        .setValue(this.plugin.settings.syncExcludeWhitelist)
        .onChange(async (value) => {
          if (value != this.plugin.settings.syncExcludeWhitelist) {
            this.plugin.settings.syncExcludeWhitelist = value
            await this.plugin.saveSettings()
          }
        }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.sync.exclude_whitelist_desc"))

    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.sync.exclude_whitelist_desc"))

    new Setting(set).setName($("setting.sync.config_dirs")).addTextArea((text) =>
      text
        .setPlaceholder($("setting.sync.config_dirs_placeholder"))
        .setValue(this.plugin.settings.configSyncOtherDirs)
        .onChange(async (value) => {
          const lines = value.split(/\r?\n/).map(l => l.trim()).filter(l => l !== "");
          // 逻辑反转：必须以 . 开头
          const hasInvalid = lines.some(l => !l.startsWith("."));

          if (hasInvalid) {
            new Notice($("setting.sync.config_dirs_must_start_with_dot_warning"));
            const filteredValue = lines.filter(l => l.startsWith(".")).join("\n");
            this.plugin.settings.configSyncOtherDirs = filteredValue;
            text.setValue(filteredValue);
          } else {
            this.plugin.settings.configSyncOtherDirs = value;
          }
          await this.plugin.saveSettings();
        }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.sync.config_dirs_desc"))


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


    new Setting(set).setName($("setting.sync.merge_strategy")).addDropdown((dropdown) =>
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
    new Setting(set)
      .setName("| " + $("setting.cloud.title"))
      .setHeading()
      .setClass("fast-note-sync-settings-tag")

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
    const descEl = el.querySelector(".setting-item-description")
    if (descEl) {
      descEl.empty()
      const fragment = document.createDocumentFragment()
      const lines = desc.split("\n")

      let inTable = false
      let table: HTMLTableElement | null = null
      let tbody: HTMLTableSectionElement | null = null

      lines.forEach((line) => {
        const trimmedLine = line.trim()
        if (trimmedLine.startsWith("|") && trimmedLine.endsWith("|")) {
          const parts = trimmedLine
            .split("|")
            .filter((p, i, arr) => i > 0 && i < arr.length - 1)
            .map((p) => p.trim())

          if (!inTable) {
            inTable = true
            table = document.createElement("table")
            table.addClass("fast-note-sync-desc-table")
            const thead = table.createEl("thead")
            const tr = thead.createEl("tr")
            parts.forEach((p) => {
              const th = tr.createEl("th")
              th.innerHTML = p
            })
            tbody = table.createEl("tbody")
            fragment.appendChild(table)
          } else {
            if (parts.every((p) => p.match(/^-+$/))) {
              return
            }
            if (tbody) {
              const tr = tbody.createEl("tr")
              parts.forEach((p) => {
                const td = tr.createEl("td")
                td.innerHTML = p
              })
            }
          }
        } else {
          inTable = false
          const lineSpan = document.createElement("span")
          lineSpan.innerHTML = line
          fragment.appendChild(lineSpan)
          fragment.appendChild(document.createElement("br"))
        }
      })
      descEl.appendChild(fragment)
    }
  }
}
