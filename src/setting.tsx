import { App, PluginSettingTab, Notice, Setting, Platform } from "obsidian";
import { createRoot, Root } from "react-dom/client";

import { SettingsView, SupportView } from "./views/settings-view";
import { ConfirmModal } from "./views/confirm-modal";
import { handleSync } from "./lib/operator";
import { $ } from "./lang/lang";
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
  /** WebSocket API 地址（根据 api 自动生成） */
  wsApi: string
  /** API 访问令牌 */
  apiToken: string
  /** 库（Vault）标识名称 */
  vault: string

  /** 配置文件同步排除项（通常包含本插件自身的配置路径） */
  configExclude: string
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
  /** 配置文件同步排除白名单 */
  configExcludeWhitelist: string
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
  showSyncNotice: boolean
  /** 是否启用手动同步模式（禁用自动触发） */
  manualSyncEnabled: boolean
  /** 是否启用只读同步模式（不上传本地修改） */
  readonlySyncEnabled: boolean
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
  wsApi: "",
  // API 令牌
  apiToken: "",
  vault: "",

  configExclude: "",
  startupDelay: 500,
  offlineSyncStrategy: "",
  syncExcludeFolders: "",
  syncExcludeExtensions: "",
  syncExcludeWhitelist: "",
  configExcludeWhitelist: "",
  pdfSyncEnabled: true,
  cloudPreviewEnabled: false,
  cloudPreviewTypeRestricted: true,
  cloudPreviewRemoteUrl: "",
  cloudPreviewAutoDeleteLocal: false,
  offlineDeleteSyncEnabled: false,
  syncUpdateDelay: 0,
  showSyncNotice: true,
  manualSyncEnabled: false,
  readonlySyncEnabled: false,
}

export class SettingTab extends PluginSettingTab {
  plugin: FastSync
  root: Root | null = null

  constructor(app: App, plugin: FastSync) {
    super(app, plugin)
    this.plugin = plugin
  }

  hide(): void {
    if (this.root) {
      this.root.unmount()
      this.root = null
    }
  }

  display(): void {
    const { containerEl: set } = this

    set.empty()

    new Setting(set)
      .setName("| " + $("setting.remote.title"))
      .setHeading()
      .setClass("fast-note-sync-settings-tag")

    const apiSet = set.createDiv()
    apiSet.addClass("fast-note-sync-settings")

    this.root = createRoot(apiSet)
    this.root.render(<SettingsView plugin={this.plugin} />)

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

    new Setting(set)
      .setName("| " + $("setting.sync.title"))
      .setHeading()
      .setClass("fast-note-sync-settings-tag")
    // new Setting(set).setName("Fast Note Sync").setDesc($("Fast sync")).setHeading()

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
        ).open();
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

    new Setting(set).setName($("setting.sync.show_notice")).addToggle((toggle) =>
      toggle.setValue(this.plugin.settings.showSyncNotice).onChange(async (value) => {
        if (value != this.plugin.settings.showSyncNotice) {
          this.plugin.settings.showSyncNotice = value
          await this.plugin.saveSettings()
        }
      }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.sync.show_notice_desc"))


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

    new Setting(set).setName($("setting.sync.config_exclude")).addTextArea((text) =>
      text
        .setPlaceholder($("setting.sync.config_exclude_placeholder"))
        .setValue(this.plugin.settings.configExclude)
        .onChange(async (value) => {
          if (value != this.plugin.settings.configExclude) {
            this.plugin.settings.configExclude = value
            await this.plugin.saveSettings()
          }
        }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.sync.config_exclude_desc"))

    new Setting(set).setName($("setting.sync.config_exclude_whitelist")).addTextArea((text) =>
      text
        .setPlaceholder($("setting.sync.config_exclude_placeholder"))
        .setValue(this.plugin.settings.configExcludeWhitelist)
        .onChange(async (value) => {
          if (value != this.plugin.settings.configExcludeWhitelist) {
            this.plugin.settings.configExcludeWhitelist = value
            await this.plugin.saveSettings()
          }
        }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.sync.config_exclude_whitelist_desc"))

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
          // 立即发送 ClientInfo 到服务端，使设置立即生效
          this.plugin.websocket.sendClientInfo()
        }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.sync.merge_strategy_desc"))

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

    new Setting(set)
      .setName("| " + $("setting.support.title"))
      .setHeading()
      .setClass("fast-note-sync-settings-tag")

    const supportSet = set.createDiv()
    const supportRoot = createRoot(supportSet)
    supportRoot.render(<SupportView plugin={this.plugin} />)
    new Setting(set).setName($("setting.support.log")).addToggle((toggle) =>
      toggle.setValue(this.plugin.settings.logEnabled).onChange(async (value) => {
        this.plugin.settings.logEnabled = value
        await this.plugin.saveSettings()
      }),
    )
    this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.support.log_desc"))
    const debugDiv = set.createDiv()
    debugDiv.addClass("fast-note-sync-settings-debug")

    const debugButton = debugDiv.createEl("button")

    debugButton.setText($("setting.support.debug_copy"))
    debugButton.onclick = async () => {
      const maskValue = (val: string) => {
        if (!val) return ""
        const parts = val.split("://")
        const protocol = parts.length > 1 ? parts[0] + "://" : ""
        const address = parts.length > 1 ? parts[1] : parts[0]

        // 处理端口号
        const lastColonIndex = address.lastIndexOf(":")
        let port = ""
        let host = address
        if (lastColonIndex !== -1 && !address.includes("/", lastColonIndex)) {
          host = address.slice(0, lastColonIndex)
          port = address.slice(lastColonIndex)
        }

        // 脱敏 Host 部分
        let maskedHost = host
        if (host.length > 4) {
          maskedHost = host[0] + "***" + host.slice(-1)
        } else if (host.length > 0) {
          maskedHost = host[0] + "***"
        }

        return protocol + maskedHost + port
      }

      await window.navigator.clipboard.writeText(
        JSON.stringify(
          {
            settings: {
              ...this.plugin.settings,
              api: maskValue(this.plugin.settings.api),
              wsApi: maskValue(this.plugin.settings.wsApi),
              apiToken: this.plugin.settings.apiToken ? "***HIDDEN***" : "",
              lastNoteSyncTime: this.plugin.localStorageManager.getMetadata("lastNoteSyncTime"),
              lastFileSyncTime: this.plugin.localStorageManager.getMetadata("lastFileSyncTime"),
              lastConfigSyncTime: this.plugin.localStorageManager.getMetadata("lastConfigSyncTime"),
              clientName: this.plugin.localStorageManager.getMetadata("clientName"),
              isInitSync: this.plugin.localStorageManager.getMetadata("isInitSync"),
              serverVersion: this.plugin.localStorageManager.getMetadata("serverVersion"),
              serverVersionIsNew: this.plugin.localStorageManager.getMetadata("serverVersionIsNew"),
              pluginVersionIsNew: this.plugin.localStorageManager.getMetadata("pluginVersionIsNew"),
            },
            pluginVersion: this.plugin.manifest.version,
          },
          null,
          4,
        ),
      )
      new Notice($("setting.support.debug_desc"))
    }

    const feedbackButton = debugDiv.createEl("button")
    feedbackButton.setText($("setting.support.feedback"))
    feedbackButton.onclick = () => {
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
      this.plugin.activateLogView();
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
          // 处理表格行
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
            // 检查是否为对齐行 (如 | --- | --- |)
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
          // 退出表格模式
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
